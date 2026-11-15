import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Command,
  Download,
  History,
  LayoutTemplate,
  Loader2,
  Moon,
  Redo2,
  Share2,
  Sparkles,
  Sun,
  Undo2,
} from 'lucide-react';
import { BrandBriefGrid } from './components/BrandBriefGrid';
import { BrandKitView } from './components/BrandKitView';
import { TracedSymbolPayload } from './components/AiMagicPanel';
import { ClientPreviewView } from './components/ClientPreviewView';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { EditorLeftSidebar, UploadedSvgEntry } from './components/EditorLeftSidebar';
import { ExportModal } from './components/ExportModal';
import { LandingView } from './components/LandingView';
import {
  CanvasToolMode,
  LogoCanvasEditor,
  ViewportCommandHandle,
} from './components/LogoCanvasEditor';
import { LogoWizardModal } from './components/LogoWizardModal';
import { MockupPreviewView } from './components/MockupPreviewView';
import { ProjectsDashboard } from './components/ProjectsDashboard';
import { RightLayersDrawer } from './components/RightLayersDrawer';
import { ShareClientModal } from './components/ShareClientModal';
import { TemplateLibraryModal } from './components/TemplateLibraryModal';
import { UpdateLogModal } from './components/UpdateLogModal';
import { VariationsModal } from './components/VariationsModal';
import { VisitingCardAtelier } from './components/VisitingCardAtelier';
import { StudioLogoProvider } from './context/StudioLogoContext';
import {
  DEFAULT_BRAND_BRIEF,
  VECTOR_ICONS,
} from './data/logoLibrary';
import {
  ArtboardPresetKind,
  BrandBrief,
  BrandColorTokenId,
  BrandFontTokenId,
  BrandTokens,
  ColorPalette,
  CustomSvgLayer,
  DividerKind,
  FontOption,
  FontPairing,
  IndustryCategory,
  LayoutArchetype,
  LogoConcept,
  LogoDocument,
  LogoLayer,
  LogoProject,
  LogoStylePreset,
  SavedBrandKit,
  ShapeKind,
  StudioViewMode,
  SurfaceTextureConfig,
  TextLayer,
} from './types/logo';
import { PlanTier } from './types/monetization';
import { AiBrandBrainstormItem } from './utils/aiApi';
import {
  applyColorTokenToArtboards,
  applyFontTokenToArtboards,
  applyPaletteToAllArtboards,
  createDefaultBrandTokens,
  linkDocumentToBrandTokens,
  tokensToPalette,
} from './utils/brandTokens';
import {
  generateFourLogoVariations,
  LogoVariationEntry,
  magicRecolorDocument,
} from './utils/brandTools';
import {
  buildResponsiveLockupArtboard,
  resetArtboardPositions,
} from './utils/multiArtboard';
import { loadGoogleFont } from './utils/googleFonts';
import {
  buildDocumentForArchetype,
  extractBrandVariants,
  generateTwelveLogoConcepts,
  nextLayerId,
  resolveFont,
  resolvePalette,
} from './utils/logoGenerator';
import {
  cloneDocumentForProject,
  loadActiveSession,
  loadSavedProjects,
  persistActiveSession,
  persistSavedProjects,
} from './utils/projectStorage';
import {
  BooleanOpKind,
  combineVectorLayers,
  createClippingMaskFromSelection,
  isCombinableVectorLayer,
} from './utils/booleanOps';
import { StudioCommandItem } from './utils/commandRegistry';
import {
  auditDocumentPrintGamut,
  simulateCmykProofColor,
  snapDocumentToPrintGamut,
} from './utils/printPrepress';
import { ClientSharePayload, parseClientShareFromSearch } from './utils/clientShare';
import { parseUploadedSvgToLayer } from './utils/svgExport';
import { buildDocumentFromTemplate, ProTemplateSpec } from './utils/templateLibrary';
import { extractLayerPathInArtboardSpace } from './utils/pathGeometry';
import { convertTextLayerToPath } from './utils/textToPath';

const BRAND_KITS_KEY = 'forma-logo-brand-kits-v1';

interface WorkspaceState {
  artboards: LogoDocument[];
  activeArtboardIndex: number;
  tokens: BrandTokens;
}

interface HistoryState {
  past: WorkspaceState[];
  present: WorkspaceState;
  future: WorkspaceState[];
}

function buildInitialWorkspace(
  session: ReturnType<typeof loadActiveSession>
): WorkspaceState {
  const b = session?.brief ?? DEFAULT_BRAND_BRIEF;
  const pal = resolvePalette(b.paletteId);
  const pFont = resolveFont(b.primaryFontId);
  const sFont = resolveFont(b.secondaryFontId);
  const rawList =
    session?.artboards && session.artboards.length > 0
      ? session.artboards
      : [session?.document ?? buildDocumentForArchetype(b, 'icon-left')];
  const baseDoc = rawList[0];
  const tokens: BrandTokens =
    session?.brandTokens ??
    createDefaultBrandTokens(
      { ...pal, background: baseDoc.backgroundColor || pal.background },
      pFont,
      sFont
    );
  const artboards: LogoDocument[] = rawList.map((ab, idx) => {
    const linked = linkDocumentToBrandTokens(ab, tokens);
    return idx === 0 && !linked.artboardRole
      ? { ...linked, artboardRole: 'primary-horizontal' as ArtboardPresetKind }
      : linked;
  });
  const idx = Math.min(
    Math.max(0, session?.activeArtboardIndex ?? 0),
    Math.max(0, artboards.length - 1)
  );
  return { artboards, activeArtboardIndex: idx, tokens };
}

export default function App() {
  const initialSessionRef = useRef<ReturnType<typeof loadActiveSession> | undefined>(
    undefined
  );
  if (initialSessionRef.current === undefined) {
    initialSessionRef.current = loadActiveSession();
  }
  const initialSession = initialSessionRef.current;

  const [viewMode, setViewMode] = useState<StudioViewMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1' && !params.get('client')) {
        return 'editor';
      }
    }
    return 'landing';
  });
  const [studioTheme, setStudioTheme] = useState<'light' | 'dark'>(() => {
    try {
      return localStorage.getItem('forma-studio-theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [planTier, setPlanTier] = useState<PlanTier>('pro');
  const [brief, setBrief] = useState<BrandBrief>(
    () => initialSession?.brief ?? DEFAULT_BRAND_BRIEF
  );
  const [concepts, setConcepts] = useState<LogoConcept[]>(() =>
    generateTwelveLogoConcepts(initialSession?.brief ?? DEFAULT_BRAND_BRIEF)
  );

  const [history, setHistory] = useState<HistoryState>(() => ({
    past: [],
    present: buildInitialWorkspace(initialSession),
    future: [],
  }));

  const [uploadedSvgs, setUploadedSvgs] = useState<UploadedSvgEntry[]>([]);

  const [projects, setProjects] = useState<LogoProject[]>(() => loadSavedProjects());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    () => initialSession?.activeProjectId ?? null
  );
  const [autoSaveState, setAutoSaveState] = useState<'saved' | 'saving'>('saved');

  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [exportOpen, setExportOpen] = useState<boolean>(false);
  const [shareOpen, setShareOpen] = useState<boolean>(false);
  const [wizardOpen, setWizardOpen] = useState<boolean>(false);
  const [variationsOpen, setVariationsOpen] = useState<boolean>(false);
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState<boolean>(false);
  const [updateLogOpen, setUpdateLogOpen] = useState<boolean>(false);
  const [clientPreviewSession, setClientPreviewSession] = useState<{
    payload: ClientSharePayload;
    token: string;
    fromStudio: boolean;
  } | null>(null);
  const [generatedVariations, setGeneratedVariations] = useState<LogoVariationEntry[]>([]);
  const [recolorStep, setRecolorStep] = useState<number>(0);
  const [incomingLogoNonce, setIncomingLogoNonce] = useState<number>(0);
  const [editorNotice, setEditorNotice] = useState<string | null>(null);
  const [canvasToolMode, setCanvasToolMode] = useState<CanvasToolMode>('select');
  const [penAttachTextId, setPenAttachTextId] = useState<string | null>(null);
  const [printProofCmyk, setPrintProofCmyk] = useState<boolean>(false);
  const [showCropMarks, setShowCropMarks] = useState<boolean>(false);
  const [showBleed, setShowBleed] = useState<boolean>(false);
  const [showClearSpace, setShowClearSpace] = useState<boolean>(false);
  const [showSafeZone, setShowSafeZone] = useState<boolean>(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const viewportCommandRef = useRef<ViewportCommandHandle | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const onGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setCommandPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', onGlobalKeyDown, true);
  }, []);

  // Detect standalone ?client=... share link on startup
  useEffect(() => {
    if (typeof window === 'undefined' || !window.location.search) return;
    let active = true;
    void parseClientShareFromSearch(window.location.search).then((res) => {
      if (!active || !res) return;
      const pal = resolvePalette(res.payload.brief.paletteId);
      const pFont = resolveFont(res.payload.brief.primaryFontId);
      const sFont = resolveFont(res.payload.brief.secondaryFontId);
      const tokens = createDefaultBrandTokens(pal, pFont, sFont);
      const linked = linkDocumentToBrandTokens(res.payload.doc, tokens);
      setBrief(res.payload.brief);
      setHistory({
        past: [],
        present: { artboards: [linked], activeArtboardIndex: 0, tokens },
        future: [],
      });
      setClientPreviewSession({
        payload: res.payload,
        token: res.token,
        fromStudio: false,
      });
      setViewMode('client-preview');
    });
    return () => {
      active = false;
    };
  }, []);

  const [savedKits, setSavedKits] = useState<SavedBrandKit[]>(() => {
    try {
      const raw = localStorage.getItem(BRAND_KITS_KEY);
      return raw ? (JSON.parse(raw) as SavedBrandKit[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', studioTheme === 'dark');
    try {
      localStorage.setItem('forma-studio-theme', studioTheme);
    } catch {
      // Ignore storage errors
    }
  }, [studioTheme]);

  const workspace = history.present;
  const artboards = workspace.artboards;
  const activeArtboardIndex = Math.min(
    workspace.activeArtboardIndex,
    Math.max(0, artboards.length - 1)
  );
  const brandTokens = workspace.tokens;
  const activeDoc = artboards[activeArtboardIndex] ?? artboards[0];
  const activePalette = useMemo(
    () => tokensToPalette(brandTokens, resolvePalette(brief.paletteId)),
    [brandTokens, brief.paletteId]
  );
  const selectedLayers = useMemo(
    () => activeDoc.layers.filter((l) => selectedLayerIds.includes(l.id)),
    [activeDoc.layers, selectedLayerIds]
  );

  // Keep canvas tool mode aligned with active selection
  useEffect(() => {
    const single = selectedLayers.length === 1 ? selectedLayers[0] : null;
    if (canvasToolMode === 'nodes' && single?.type !== 'path') {
      setCanvasToolMode('select');
    } else if (canvasToolMode === 'per-letter' && single?.type !== 'text') {
      setCanvasToolMode('select');
    }
  }, [canvasToolMode, selectedLayers]);
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const [titleDraft, setTitleDraft] = useState<string>(
    () => activeDoc.title || activeProject?.name || 'Untitled Brand'
  );

  useEffect(() => {
    setTitleDraft(activeDoc.title || activeProject?.name || 'Untitled Brand');
  }, [activeDoc.id, activeDoc.title, activeProject?.name]);

  const commitHeaderProjectTitle = () => {
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      setTitleDraft(activeDoc.title || activeProject?.name || 'Untitled Brand');
      return;
    }
    if (trimmed === activeDoc.title) return;
    setHistory((prev) => ({
      ...prev,
      present: {
        ...prev.present,
        artboards: prev.present.artboards.map((ab, idx) =>
          idx === prev.present.activeArtboardIndex ? { ...ab, title: trimmed } : ab
        ),
      },
    }));
    if (activeProjectId) {
      handleRenameProject(activeProjectId, trimmed);
    }
  };

  // Memoize active font signature across all artboards so pointer drags don't re-run font loading
  const activeFontSignature = useMemo(
    () =>
      artboards
        .flatMap((ab) => ab.layers)
        .filter((l): l is TextLayer => l.type === 'text')
        .map((l) => `${l.fontFamily}::${l.fontWeight}`)
        .join('|'),
    [artboards]
  );

  // Dynamically ensure every Google Font used across all artboards is loaded
  useEffect(() => {
    if (!activeFontSignature) return;
    activeFontSignature.split('|').forEach((entry) => {
      const [fontFamily, rawWeight] = entry.split('::');
      const family = fontFamily?.split(',')[0]?.replace(/['"]/g, '').trim();
      const weight = Number(rawWeight) || 400;
      if (family) {
        void loadGoogleFont(family, [weight, 400, 700]);
      }
    });
  }, [activeFontSignature]);

  // Debounced auto-save for active session + active project (if opened)
  const latestAutosaveRef = useRef({
    activeProjectId,
    brief,
    activeDoc,
    artboards,
    activeArtboardIndex,
    brandTokens,
    projects,
  });
  latestAutosaveRef.current = {
    activeProjectId,
    brief,
    activeDoc,
    artboards,
    activeArtboardIndex,
    brandTokens,
    projects,
  };
  const hasHydratedAutosaveRef = useRef(false);

  useEffect(() => {
    if (!hasHydratedAutosaveRef.current) {
      hasHydratedAutosaveRef.current = true;
      return;
    }

    setAutoSaveState('saving');
    const timer = window.setTimeout(() => {
      const {
        activeProjectId: pid,
        brief: b,
        activeDoc: doc,
        artboards: abs,
        activeArtboardIndex: abIdx,
        brandTokens: toks,
        projects: list,
      } = latestAutosaveRef.current;
      const now = new Date().toISOString();

      persistActiveSession({
        activeProjectId: pid,
        brief: b,
        document: doc,
        artboards: abs,
        activeArtboardIndex: abIdx,
        brandTokens: toks,
        updatedAt: now,
      });

      if (pid && list.some((p) => p.id === pid)) {
        const nextProjects = list.map((p) =>
          p.id === pid
            ? {
                ...p,
                brief: b,
                document: doc,
                artboards: abs,
                activeArtboardIndex: abIdx,
                brandTokens: toks,
                updatedAt: now,
              }
            : p
        );
        setProjects(nextProjects);
        persistSavedProjects(nextProjects);
      }

      setAutoSaveState('saved');
    }, 450);

    return () => window.clearTimeout(timer);
  }, [brief, workspace, activeProjectId]);

  // Flush current session synchronously when backgrounding or closing tab
  useEffect(() => {
    const flushNow = () => {
      const {
        activeProjectId: pid,
        brief: b,
        activeDoc: doc,
        artboards: abs,
        activeArtboardIndex: abIdx,
        brandTokens: toks,
        projects: list,
      } = latestAutosaveRef.current;
      const now = new Date().toISOString();
      persistActiveSession({
        activeProjectId: pid,
        brief: b,
        document: doc,
        artboards: abs,
        activeArtboardIndex: abIdx,
        brandTokens: toks,
        updatedAt: now,
      });
      if (pid && list.some((p) => p.id === pid)) {
        const nextProjects = list.map((p) =>
          p.id === pid
            ? {
                ...p,
                brief: b,
                document: doc,
                artboards: abs,
                activeArtboardIndex: abIdx,
                brandTokens: toks,
                updatedAt: now,
              }
            : p
        );
        persistSavedProjects(nextProjects);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flushNow();
      }
    };

    window.addEventListener('pagehide', flushNow);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('pagehide', flushNow);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const commitWorkspace = (nextState: WorkspaceState) => {
    setHistory((prev) => ({
      past: [...prev.past.slice(-49), prev.present],
      present: nextState,
      future: [],
    }));
  };

  const commitDocument = (nextDoc: LogoDocument) => {
    setHistory((prev) => ({
      past: [...prev.past.slice(-49), prev.present],
      present: {
        ...prev.present,
        artboards: prev.present.artboards.map((ab, idx) =>
          idx === prev.present.activeArtboardIndex ? nextDoc : ab
        ),
      },
      future: [],
    }));
  };

  const resetHistoryWithDoc = (rawDoc: LogoDocument, tokensOverride?: BrandTokens) => {
    const nextTokens = tokensOverride ?? brandTokens;
    const linked = linkDocumentToBrandTokens(rawDoc, nextTokens);
    const first: LogoDocument = linked.artboardRole
      ? linked
      : { ...linked, artboardRole: 'primary-horizontal' };
    setHistory({
      past: [],
      present: { artboards: [first], activeArtboardIndex: 0, tokens: nextTokens },
      future: [],
    });
  };

  const handleUndo = () => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      return {
        past: prev.past.slice(0, -1),
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  };

  const handleRedo = () => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: prev.future.slice(1),
      };
    });
  };

  const handlePreviewLayersChange = (layersMap: Record<string, LogoLayer>) => {
    setHistory((prev) => {
      const idx = prev.present.activeArtboardIndex;
      return {
        ...prev,
        present: {
          ...prev.present,
          artboards: prev.present.artboards.map((ab, i) =>
            i === idx
              ? { ...ab, layers: ab.layers.map((l) => layersMap[l.id] ?? l) }
              : ab
          ),
        },
      };
    });
  };

  const handleCommitLayersChange = (
    beforeMap: Record<string, LogoLayer>,
    afterMap: Record<string, LogoLayer>
  ) => {
    setHistory((prev) => {
      const idx = prev.present.activeArtboardIndex;
      const beforeWs: WorkspaceState = {
        ...prev.present,
        artboards: prev.present.artboards.map((ab, i) =>
          i === idx
            ? { ...ab, layers: ab.layers.map((l) => beforeMap[l.id] ?? l) }
            : ab
        ),
      };
      const afterWs: WorkspaceState = {
        ...prev.present,
        artboards: prev.present.artboards.map((ab, i) =>
          i === idx
            ? { ...ab, layers: ab.layers.map((l) => afterMap[l.id] ?? l) }
            : ab
        ),
      };
      return {
        past: [...prev.past.slice(-49), beforeWs],
        present: afterWs,
        future: [],
      };
    });
  };

  const handleUpdateLayer = (updated: LogoLayer) => {
    commitDocument({
      ...activeDoc,
      layers: activeDoc.layers.map((l) => (l.id === updated.id ? updated : l)),
    });
  };

  const handleUpdateTextLive = (layerId: string, text: string) => {
    commitDocument({
      ...activeDoc,
      layers: activeDoc.layers.map((l) =>
        l.id === layerId && l.type === 'text' ? { ...l, text } : l
      ),
    });
  };

  const handleResizeArtboard = (width: number, height: number) => {
    const dx = (width - activeDoc.width) / 2;
    const dy = (height - activeDoc.height) / 2;
    commitDocument({
      ...activeDoc,
      width,
      height,
      layers: activeDoc.layers.map((l) => ({
        ...l,
        x: Math.round(l.x + dx),
        y: Math.round(l.y + dy),
      })),
    });
  };

  const handleRegenerateConcepts = () => {
    const next = generateTwelveLogoConcepts(brief);
    setConcepts(next);
  };

  const handleWizardGenerate = () => {
    const next = generateTwelveLogoConcepts(brief);
    setConcepts(next);
    setViewMode('concepts');
  };

  const handleOpenConceptInEditor = (concept: LogoConcept) => {
    const pal = resolvePalette(brief.paletteId);
    const pFont = resolveFont(brief.primaryFontId);
    const sFont = resolveFont(brief.secondaryFontId);
    const nextTokens = createDefaultBrandTokens(
      { ...pal, background: concept.document.backgroundColor || pal.background },
      pFont,
      sFont
    );
    const linked = linkDocumentToBrandTokens(concept.document, nextTokens);
    commitWorkspace({
      artboards: [{ ...linked, artboardRole: 'primary-horizontal' }],
      activeArtboardIndex: 0,
      tokens: nextTokens,
    });
    setSelectedLayerIds(linked.layers[0] ? [linked.layers[0].id] : []);
    setViewMode('editor');
  };

  const handleAddIcon = (iconId: string) => {
    const iconDef = VECTOR_ICONS.find((i) => i.id === iconId);
    const layer: LogoLayer = {
      id: nextLayerId('ico'),
      name: iconDef?.name ?? 'Vector Icon',
      type: 'icon',
      iconId,
      x: Math.round(activeDoc.width / 2 - 60),
      y: Math.round(activeDoc.height / 2 - 60),
      width: 120,
      height: 120,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      fill: activePalette.primary,
      fillToken: 'primary',
      accentFill: activePalette.accent,
      accentFillToken: 'accent',
      secondaryFill: activePalette.secondary,
      secondaryFillToken: 'secondary',
      stroke: 'none',
      strokeWidth: 0,
      shadow: {
        enabled: false,
        color: 'rgba(17, 24, 39, 0.18)',
        blur: 10,
        offsetX: 0,
        offsetY: 6,
      },
    };
    commitDocument({ ...activeDoc, layers: [...activeDoc.layers, layer] });
    setSelectedLayerIds([layer.id]);
  };

  const handleAddShape = (shapeKind: ShapeKind) => {
    const isHollow = shapeKind === 'ring' || shapeKind === 'frame';
    const layer: LogoLayer = {
      id: nextLayerId('shp'),
      name: `Shape (${shapeKind})`,
      type: 'shape',
      shapeKind,
      cornerRadius: 20,
      x: Math.round(activeDoc.width / 2 - 80),
      y: Math.round(activeDoc.height / 2 - 80),
      width: 160,
      height: 160,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      fill: isHollow ? 'transparent' : activePalette.secondary,
      fillToken: isHollow ? undefined : 'secondary',
      stroke: isHollow ? activePalette.primary : 'none',
      strokeToken: isHollow ? 'primary' : undefined,
      strokeWidth: isHollow ? 5 : 0,
      shadow: {
        enabled: false,
        color: 'rgba(17, 24, 39, 0.18)',
        blur: 10,
        offsetX: 0,
        offsetY: 6,
      },
    };
    commitDocument({ ...activeDoc, layers: [...activeDoc.layers, layer] });
    setSelectedLayerIds([layer.id]);
  };

  const handleAddDivider = (dividerKind: DividerKind) => {
    const layer: LogoLayer = {
      id: nextLayerId('div'),
      name: `Divider (${dividerKind})`,
      type: 'divider',
      dividerKind,
      x: Math.round(activeDoc.width / 2 - 140),
      y: Math.round(activeDoc.height / 2 - 8),
      width: 280,
      height: 16,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      fill: activePalette.accent,
      fillToken: 'accent',
      stroke: 'none',
      strokeWidth: 0,
      shadow: {
        enabled: false,
        color: 'rgba(17, 24, 39, 0.18)',
        blur: 10,
        offsetX: 0,
        offsetY: 6,
      },
    };
    commitDocument({ ...activeDoc, layers: [...activeDoc.layers, layer] });
    setSelectedLayerIds([layer.id]);
  };

  const handleUploadCustomSvg = (svgText: string, fileName: string, recordUpload = true) => {
    if (recordUpload) {
      setUploadedSvgs((prev) => [
        {
          id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          name: fileName.replace(/\.svg$/i, '') || 'Uploaded SVG',
          svgText,
          addedAt: new Date().toISOString(),
        },
        ...prev.slice(0, 19),
      ]);
    }
    const layer = parseUploadedSvgToLayer(svgText, fileName, activePalette.primary, {
      x: activeDoc.width / 2,
      y: activeDoc.height / 2,
    });
    commitDocument({
      ...activeDoc,
      layers: [...activeDoc.layers, { ...layer, fillToken: 'primary' }],
    });
    setSelectedLayerIds([layer.id]);
  };

  const handleSwitchArtboard = (index: number, selectIds: string[] = []) => {
    if (index < 0 || index >= artboards.length) return;
    if (index !== activeArtboardIndex) {
      setHistory((prev) => ({
        ...prev,
        present: {
          ...prev.present,
          activeArtboardIndex: index,
        },
      }));
    }
    setSelectedLayerIds(selectIds);
  };

  const handleAddResponsiveArtboard = (preset: ArtboardPresetKind) => {
    const created = buildResponsiveLockupArtboard(
      preset,
      brief,
      brandTokens,
      activeDoc
    );
    const linked = linkDocumentToBrandTokens(created, brandTokens);
    const nextArtboards = [...artboards, linked];
    commitWorkspace({
      ...workspace,
      artboards: nextArtboards,
      activeArtboardIndex: nextArtboards.length - 1,
    });
    setSelectedLayerIds([]);
    showEditorNotice(`Added ${linked.title} side-by-side · Linked to Global Brand Tokens`);
  };

  const handleRemoveArtboard = (index: number) => {
    if (artboards.length <= 1) return;
    const nextArtboards = artboards.filter((_, i) => i !== index);
    const nextIndex = Math.min(activeArtboardIndex, nextArtboards.length - 1);
    commitWorkspace({
      ...workspace,
      artboards: nextArtboards,
      activeArtboardIndex: nextIndex,
    });
    setSelectedLayerIds([]);
  };

  const handleArrangeArtboards = () => {
    const arranged = resetArtboardPositions(artboards);
    commitWorkspace({
      ...workspace,
      artboards: arranged,
    });
  };

  const handleUpdateColorToken = (tokenId: BrandColorTokenId, hex: string) => {
    const { tokens: nextTokens, artboards: nextArtboards } =
      applyColorTokenToArtboards(artboards, brandTokens, tokenId, hex);
    commitWorkspace({
      ...workspace,
      tokens: nextTokens,
      artboards: nextArtboards,
    });
  };

  const handleUpdateFontToken = (tokenId: BrandFontTokenId, font: FontOption) => {
    void loadGoogleFont(font.name, font.weights);
    const { tokens: nextTokens, artboards: nextArtboards } =
      applyFontTokenToArtboards(artboards, brandTokens, tokenId, font);
    setBrief((b) => ({
      ...b,
      primaryFontId: tokenId === 'display' ? font.id : b.primaryFontId,
      secondaryFontId: tokenId === 'tagline' ? font.id : b.secondaryFontId,
    }));
    commitWorkspace({
      ...workspace,
      tokens: nextTokens,
      artboards: nextArtboards,
    });
  };

  const handleSyncAllTokens = () => {
    const nextArtboards = artboards.map((ab) =>
      linkDocumentToBrandTokens(ab, brandTokens)
    );
    commitWorkspace({
      ...workspace,
      artboards: nextArtboards,
    });
    showEditorNotice(
      `Synced all ${nextArtboards.length} artboard${nextArtboards.length > 1 ? 's' : ''} to Global Brand Tokens`
    );
  };

  const handleInsertTracedSymbol = (payload: TracedSymbolPayload) => {
    const size = 160;
    const layer: CustomSvgLayer = {
      id: nextLayerId('aisvg'),
      name: payload.name,
      type: 'custom-svg',
      x: Math.round(activeDoc.width / 2 - size / 2),
      y: Math.round(activeDoc.height / 2 - size / 2),
      width: size,
      height: size,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      fill: activePalette.primary,
      stroke: 'none',
      strokeWidth: 0,
      shadow: {
        enabled: false,
        color: 'rgba(17, 24, 39, 0.18)',
        blur: 10,
        offsetX: 0,
        offsetY: 6,
      },
      paths: payload.paths,
      viewBox: payload.viewBox,
      preserveOriginalColors: payload.preserveOriginalColors,
    };
    commitDocument({ ...activeDoc, layers: [...activeDoc.layers, layer] });
    setSelectedLayerIds([layer.id]);
    setViewMode('editor');
  };

  const handleWizardGenerateWithAiSymbol = (payload: TracedSymbolPayload) => {
    const baseConcepts = generateTwelveLogoConcepts(brief);
    const enriched = baseConcepts.map((concept) => {
      const hasIcon = concept.document.layers.some((l) => l.type === 'icon');
      if (!hasIcon) return concept;
      return {
        ...concept,
        document: {
          ...concept.document,
          layers: concept.document.layers.map((layer) => {
            if (layer.type !== 'icon') return layer;
            const replaced: CustomSvgLayer = {
              id: nextLayerId('aisvg'),
              name: payload.name,
              type: 'custom-svg',
              x: layer.x,
              y: layer.y,
              width: layer.width,
              height: layer.height,
              rotation: layer.rotation,
              opacity: layer.opacity,
              visible: layer.visible,
              locked: false,
              fill: layer.fill,
              fillGradient: layer.fillGradient,
              stroke: layer.stroke,
              strokeWidth: layer.strokeWidth,
              shadow: layer.shadow,
              paths: payload.paths,
              viewBox: payload.viewBox,
              preserveOriginalColors: payload.preserveOriginalColors,
            };
            return replaced;
          }),
        },
      };
    });
    setConcepts(enriched);
    setViewMode('concepts');
  };

  const handleAddText = (preset: 'heading' | 'tagline' | 'curved') => {
    const font =
      preset === 'tagline'
        ? resolveFont(brandTokens.fonts.tagline.fontId)
        : resolveFont(brandTokens.fonts.display.fontId);

    const layer: TextLayer = {
      id: nextLayerId('txt'),
      name:
        preset === 'heading'
          ? 'Brand Wordmark'
          : preset === 'curved'
            ? 'Curved Arc Text'
            : 'Brand Tagline',
      type: 'text',
      text:
        preset === 'tagline'
          ? brief.tagline || 'BRAND TAGLINE'
          : brief.businessName || 'BRAND NAME',
      x: Math.round(activeDoc.width / 2 - 220),
      y: preset === 'curved' ? Math.round(activeDoc.height / 2 - 160) : Math.round(activeDoc.height / 2 - 30),
      width: 440,
      height: preset === 'tagline' ? 40 : 72,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      fill: preset === 'tagline' ? activePalette.accent : activePalette.text,
      fillToken: preset === 'tagline' ? 'accent' : 'text',
      stroke: 'none',
      strokeWidth: 0,
      shadow: {
        enabled: false,
        color: 'rgba(17, 24, 39, 0.18)',
        blur: 10,
        offsetX: 0,
        offsetY: 6,
      },
      fontFamily: font.cssFamily,
      fontId: font.id,
      fontToken: preset === 'tagline' ? 'tagline' : 'display',
      fontWeight: preset === 'tagline' ? 600 : 700,
      fontStyle: 'normal',
      fontSize: preset === 'tagline' ? 18 : preset === 'curved' ? 32 : 52,
      letterSpacing: preset === 'tagline' ? 0.16 : 0.04,
      lineHeight: 1.1,
      textAlign: 'center',
      uppercase: preset !== 'heading',
      curveRadius: preset === 'curved' ? 130 : 0,
    };

    commitDocument({ ...activeDoc, layers: [...activeDoc.layers, layer] });
    setSelectedLayerIds([layer.id]);
  };

  const handleInsertMonogram = (layers: LogoLayer[], mode: 'add' | 'replace') => {
    const cxOffset = activeDoc.width / 2 - 400;
    const cyOffset = activeDoc.height / 2 - 300;
    const stamped = layers.map((layer) => ({
      ...layer,
      id: nextLayerId(layer.type === 'text' ? 'mtxt' : layer.type === 'shape' ? 'mshp' : 'msvg'),
      x: Math.round(layer.x + cxOffset),
      y: Math.round(layer.y + cyOffset),
    }));

    const nextLayers = mode === 'replace' ? stamped : [...activeDoc.layers, ...stamped];
    commitDocument({ ...activeDoc, layers: nextLayers });
    setSelectedLayerIds(stamped.map((l) => l.id));
    setViewMode('editor');
  };

  const handleApplyFontPairing = (pairing: FontPairing) => {
    const pFont = resolveFont(pairing.primaryFontId);
    const sFont = resolveFont(pairing.secondaryFontId);
    void loadGoogleFont(pFont.name, pFont.weights);
    void loadGoogleFont(sFont.name, sFont.weights);
    setBrief((b) => ({
      ...b,
      primaryFontId: pFont.id,
      secondaryFontId: sFont.id,
    }));

    const step1 = applyFontTokenToArtboards(artboards, brandTokens, 'display', pFont);
    const step2 = applyFontTokenToArtboards(step1.artboards, step1.tokens, 'tagline', sFont);
    commitWorkspace({
      ...workspace,
      tokens: step2.tokens,
      artboards: step2.artboards,
    });
  };

  const handleApplyFontToSelectedOrPrimary = (font: FontOption) => {
    void loadGoogleFont(font.name, font.weights);
    const selectedTexts = selectedLayers.filter((l): l is TextLayer => l.type === 'text');
    if (selectedTexts.length > 0) {
      const targetIds = new Set(selectedTexts.map((t) => t.id));
      commitDocument({
        ...activeDoc,
        layers: activeDoc.layers.map((l) =>
          targetIds.has(l.id) && l.type === 'text'
            ? { ...l, fontId: font.id, fontFamily: font.cssFamily, fontToken: undefined }
            : l
        ),
      });
      return;
    }

    handleUpdateFontToken('display', font);
  };

  const handleApplyPalette = (pal: ColorPalette, targetDoc?: LogoDocument) => {
    setBrief((b) => ({ ...b, paletteId: pal.id }));
    const workingArtboards = targetDoc
      ? artboards.map((ab, idx) => (idx === activeArtboardIndex ? targetDoc : ab))
      : artboards;
    const { tokens: nextTokens, artboards: nextArtboards } = applyPaletteToAllArtboards(
      workingArtboards,
      brandTokens,
      pal
    );
    commitWorkspace({
      ...workspace,
      tokens: nextTokens,
      artboards: nextArtboards,
    });
  };

  const handleApplyRemixedDocument = (remixedDoc: LogoDocument, pal: ColorPalette) => {
    setBrief((b) => ({ ...b, paletteId: pal.id }));
    const pFont = resolveFont(brief.primaryFontId);
    const sFont = resolveFont(brief.secondaryFontId);
    const nextTokens = createDefaultBrandTokens(pal, pFont, sFont);
    const linked = linkDocumentToBrandTokens(remixedDoc, nextTokens);
    commitWorkspace({
      ...workspace,
      tokens: nextTokens,
      artboards: artboards.map((ab, idx) => (idx === activeArtboardIndex ? linked : ab)),
    });
    setSelectedLayerIds([]);
    showEditorNotice(`Applied remix: ${remixedDoc.title}`);
  };

  const handleApplyBrandBrainstorm = (item: AiBrandBrainstormItem) => {
    setBrief((b) => ({
      ...b,
      businessName: item.brandName,
      tagline: item.tagline,
      symbolIdea: item.symbolPrompt,
      style: item.style,
      paletteId: item.palette.id,
    }));

    const textLayersSorted = activeDoc.layers
      .filter((l): l is TextLayer => l.type === 'text')
      .sort((a, b) => b.fontSize - a.fontSize);
    const primaryTextId = textLayersSorted[0]?.id;
    const secondaryTextId = textLayersSorted[1]?.id;

    const updatedDoc: LogoDocument = {
      ...activeDoc,
      title: item.brandName,
      layers: activeDoc.layers.map((l) => {
        if (l.type === 'text' && l.id === primaryTextId) {
          return { ...l, text: item.brandName };
        }
        if (l.type === 'text' && l.id === secondaryTextId) {
          return { ...l, text: item.tagline };
        }
        return l;
      }),
    };

    handleApplyPalette(item.palette, updatedDoc);
    showEditorNotice(`Applied "${item.brandName}" + ${item.psychologyMood} palette.`);
  };

  const handleMagicRecolor = () => {
    const nextStep = recolorStep + 1;
    setRecolorStep(nextStep);
    const recolored = magicRecolorDocument(activeDoc, activePalette, nextStep);
    commitDocument(recolored);
  };

  const handleOpenVariations = () => {
    const list = generateFourLogoVariations(activeDoc, brief, activePalette);
    setGeneratedVariations(list);
    setVariationsOpen(true);
  };

  const handleSaveFourVariationsToProjects = (variations: LogoVariationEntry[]) => {
    const now = new Date().toISOString();
    const batch: LogoProject[] = variations.map((entry, idx) => ({
      id: `proj-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      name: entry.document.title,
      createdAt: now,
      updatedAt: now,
      brief: { ...brief },
      document: cloneDocumentForProject(entry.document, entry.document.title),
    }));
    const next = [...batch, ...projects];
    setProjects(next);
    persistSavedProjects(next);
  };

  const handleFixTextContrast = (layerId: string, suggestedHex: string) => {
    commitDocument({
      ...activeDoc,
      layers: activeDoc.layers.map((l) =>
        l.id === layerId
          ? {
              ...l,
              fill: suggestedHex,
              fillGradient: l.fillGradient?.enabled
                ? { ...l.fillGradient, enabled: false }
                : l.fillGradient,
            }
          : l
      ),
    });
  };

  const handleSwitchLayout = (archetype: LayoutArchetype) => {
    const iconLayer = activeDoc.layers.find((l) => l.type === 'icon');
    const nextDoc = buildDocumentForArchetype(
      brief,
      archetype,
      brief.style,
      iconLayer?.type === 'icon' ? iconLayer.iconId : undefined
    );
    commitDocument(nextDoc);
    setSelectedLayerIds([]);
  };

  const handleSwitchStyle = (style: LogoStylePreset) => {
    setBrief((b) => ({ ...b, style }));
    const nextDoc = buildDocumentForArchetype(brief, 'icon-left', style);
    commitDocument(nextDoc);
    setSelectedLayerIds([]);
  };

  const handleToggleLayerVisible = (id: string) => {
    commitDocument({
      ...activeDoc,
      layers: activeDoc.layers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l
      ),
    });
  };

  const handleToggleLayerLock = (id: string) => {
    commitDocument({
      ...activeDoc,
      layers: activeDoc.layers.map((l) =>
        l.id === id ? { ...l, locked: !l.locked } : l
      ),
    });
  };

  const handleReorderLayer = (id: string, dir: 'up' | 'down') => {
    const idx = activeDoc.layers.findIndex((l) => l.id === id);
    if (idx === -1) return;
    const targetIdx = dir === 'up' ? idx + 1 : idx - 1;
    if (targetIdx < 0 || targetIdx >= activeDoc.layers.length) return;
    const next = [...activeDoc.layers];
    const [item] = next.splice(idx, 1);
    next.splice(targetIdx, 0, item);
    commitDocument({ ...activeDoc, layers: next });
  };

  const handleReorderLayerToIndex = (layerId: string, targetIndex: number) => {
    const fromIdx = activeDoc.layers.findIndex((l) => l.id === layerId);
    if (fromIdx === -1) return;
    const bounded = Math.max(0, Math.min(activeDoc.layers.length - 1, targetIndex));
    if (bounded === fromIdx) return;
    const next = [...activeDoc.layers];
    const [item] = next.splice(fromIdx, 1);
    next.splice(bounded, 0, item);
    commitDocument({ ...activeDoc, layers: next });
  };

  const handleRenameLayer = (layerId: string, nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed) return;
    commitDocument({
      ...activeDoc,
      layers: activeDoc.layers.map((l) => (l.id === layerId ? { ...l, name: trimmed } : l)),
    });
  };

  const handleGroupSelected = () => {
    const groupTargets = activeDoc.layers.filter(
      (l) => selectedLayerIds.includes(l.id) && l.visible
    );
    if (groupTargets.length < 2) return;
    const existingGroups = activeDoc.groups ?? [];
    const newGroupId = nextLayerId('grp');
    const targetSet = new Set(groupTargets.map((l) => l.id));

    const updatedLayers = activeDoc.layers.map((l) =>
      targetSet.has(l.id) ? { ...l, groupId: newGroupId } : l
    );
    const activeGroupIds = new Set(
      updatedLayers.map((l) => l.groupId).filter((g): g is string => Boolean(g))
    );
    const prunedGroups = existingGroups.filter((g) => activeGroupIds.has(g.id));
    const nextGroup = {
      id: newGroupId,
      name: `Group ${prunedGroups.length + 1}`,
      collapsed: false,
    };

    commitDocument({
      ...activeDoc,
      groups: [...prunedGroups, nextGroup],
      layers: updatedLayers,
    });
  };

  const handleUngroupSelected = (explicitGroupId?: string) => {
    const targetGroupIds = new Set<string>();
    if (explicitGroupId) {
      targetGroupIds.add(explicitGroupId);
    } else {
      activeDoc.layers.forEach((l) => {
        if (selectedLayerIds.includes(l.id) && l.groupId) {
          targetGroupIds.add(l.groupId);
        }
      });
    }
    if (targetGroupIds.size === 0) return;

    const updatedLayers = activeDoc.layers.map((l) =>
      l.groupId && targetGroupIds.has(l.groupId) ? { ...l, groupId: undefined } : l
    );
    const remainingGroups = (activeDoc.groups ?? []).filter(
      (g) => !targetGroupIds.has(g.id)
    );
    commitDocument({
      ...activeDoc,
      groups: remainingGroups,
      layers: updatedLayers,
    });
  };

  const handleRenameGroup = (groupId: string, nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed) return;
    const existing = activeDoc.groups ?? [];
    const exists = existing.some((g) => g.id === groupId);
    const nextGroups = exists
      ? existing.map((g) => (g.id === groupId ? { ...g, name: trimmed } : g))
      : [...existing, { id: groupId, name: trimmed, collapsed: false }];
    commitDocument({ ...activeDoc, groups: nextGroups });
  };

  const handleToggleGroupCollapsed = (groupId: string) => {
    const existing = activeDoc.groups ?? [];
    const exists = existing.some((g) => g.id === groupId);
    const nextGroups = exists
      ? existing.map((g) => (g.id === groupId ? { ...g, collapsed: !g.collapsed } : g))
      : [...existing, { id: groupId, name: 'Group', collapsed: true }];
    commitDocument({ ...activeDoc, groups: nextGroups });
  };

  const handleToggleGroupVisible = (groupId: string) => {
    const children = activeDoc.layers.filter((l) => l.groupId === groupId);
    if (children.length === 0) return;
    const allHidden = children.every((l) => !l.visible);
    commitDocument({
      ...activeDoc,
      layers: activeDoc.layers.map((l) =>
        l.groupId === groupId ? { ...l, visible: allHidden } : l
      ),
    });
  };

  const handleToggleGroupLock = (groupId: string) => {
    const children = activeDoc.layers.filter((l) => l.groupId === groupId);
    if (children.length === 0) return;
    const allLocked = children.every((l) => l.locked);
    commitDocument({
      ...activeDoc,
      layers: activeDoc.layers.map((l) =>
        l.groupId === groupId ? { ...l, locked: !allLocked } : l
      ),
    });
  };

  const handleToggleBackgroundLock = () => {
    commitDocument({
      ...activeDoc,
      backgroundLocked: !activeDoc.backgroundLocked,
    });
  };

  const handleSelectProTemplate = (spec: ProTemplateSpec, applyCustomBrand: boolean) => {
    const tplDoc = buildDocumentFromTemplate(spec, {
      customBrandName: applyCustomBrand ? brief.businessName : undefined,
      customTagline: applyCustomBrand ? brief.tagline : undefined,
    });
    commitDocument(tplDoc);
    setSelectedLayerIds(tplDoc.layers[0] ? [tplDoc.layers[0].id] : []);
    setViewMode('editor');
  };

  const handleDuplicateLayer = (id: string) => {
    const found = activeDoc.layers.find((l) => l.id === id);
    if (!found) return;
    const clone: LogoLayer = {
      ...found,
      id: nextLayerId(found.type),
      name: `${found.name} Copy`,
      x: found.x + 24,
      y: found.y + 24,
      locked: false,
    };
    commitDocument({ ...activeDoc, layers: [...activeDoc.layers, clone] });
    setSelectedLayerIds([clone.id]);
  };

  const handleDeleteLayer = (id: string) => {
    const target = activeDoc.layers.find((l) => l.id === id);
    if (!target || target.locked) return;
    commitDocument({
      ...activeDoc,
      layers: activeDoc.layers.filter((l) => l.id !== id),
    });
    setSelectedLayerIds((prev) => prev.filter((sid) => sid !== id));
  };

  const handleDuplicateSelected = () => {
    if (selectedLayers.length === 0) return;
    const clones: LogoLayer[] = selectedLayers.map((layer) => ({
      ...layer,
      id: nextLayerId(layer.type),
      name: `${layer.name} Copy`,
      x: layer.x + 24,
      y: layer.y + 24,
      locked: false,
    }));
    commitDocument({ ...activeDoc, layers: [...activeDoc.layers, ...clones] });
    setSelectedLayerIds(clones.map((c) => c.id));
  };

  const handleDeleteSelected = () => {
    const deletableIds = new Set(
      selectedLayers.filter((l) => !l.locked).map((l) => l.id)
    );
    if (deletableIds.size === 0) return;
    commitDocument({
      ...activeDoc,
      layers: activeDoc.layers.filter((l) => !deletableIds.has(l.id)),
    });
    setSelectedLayerIds((prev) => prev.filter((id) => !deletableIds.has(id)));
  };

  const handleNudgeSelected = (dx: number, dy: number) => {
    const unlockedIds = new Set(
      selectedLayers.filter((l) => !l.locked).map((l) => l.id)
    );
    if (unlockedIds.size === 0) return;
    commitDocument({
      ...activeDoc,
      layers: activeDoc.layers.map((l) =>
        unlockedIds.has(l.id) ? { ...l, x: l.x + dx, y: l.y + dy } : l
      ),
    });
  };

  const handleAlignSelectedLayers = (
    mode: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom'
  ) => {
    const unlocked = selectedLayers.filter((l) => !l.locked);
    if (unlocked.length === 0) return;
    const unlockedIds = new Set(unlocked.map((l) => l.id));

    // Single selection aligns to artboard bounds; multi-selection aligns relative to group box
    const refLeft =
      unlocked.length === 1 ? 0 : Math.min(...unlocked.map((l) => l.x));
    const refRight =
      unlocked.length === 1
        ? activeDoc.width
        : Math.max(...unlocked.map((l) => l.x + l.width));
    const refTop =
      unlocked.length === 1 ? 0 : Math.min(...unlocked.map((l) => l.y));
    const refBottom =
      unlocked.length === 1
        ? activeDoc.height
        : Math.max(...unlocked.map((l) => l.y + l.height));
    const refMidX = (refLeft + refRight) / 2;
    const refMidY = (refTop + refBottom) / 2;

    commitDocument({
      ...activeDoc,
      layers: activeDoc.layers.map((l) => {
        if (!unlockedIds.has(l.id)) return l;
        if (mode === 'left') return { ...l, x: Math.round(refLeft) };
        if (mode === 'center-h') return { ...l, x: Math.round(refMidX - l.width / 2) };
        if (mode === 'right') return { ...l, x: Math.round(refRight - l.width) };
        if (mode === 'top') return { ...l, y: Math.round(refTop) };
        if (mode === 'center-v') return { ...l, y: Math.round(refMidY - l.height / 2) };
        if (mode === 'bottom') return { ...l, y: Math.round(refBottom - l.height) };
        return l;
      }),
    });
  };

  const handleBatchUpdateSelected = (patch: Partial<LogoLayer>) => {
    const unlockedIds = new Set(
      selectedLayers.filter((l) => !l.locked).map((l) => l.id)
    );
    if (unlockedIds.size === 0) return;
    commitDocument({
      ...activeDoc,
      layers: activeDoc.layers.map((l) =>
        unlockedIds.has(l.id) ? ({ ...l, ...patch } as LogoLayer) : l
      ),
    });
  };

  const showEditorNotice = (message: string) => {
    setEditorNotice(message);
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setEditorNotice(null);
      noticeTimerRef.current = null;
    }, 3200);
  };

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  const handleConvertTextToPath = async (layer: TextLayer) => {
    const pathLayer = await convertTextLayerToPath(layer, activeDoc.layers);
    commitDocument({
      ...activeDoc,
      layers: activeDoc.layers.map((l) => (l.id === layer.id ? pathLayer : l)),
    });
    setSelectedLayerIds([pathLayer.id]);
    setPenAttachTextId(null);
    setCanvasToolMode('nodes');
    showEditorNotice(
      'Converted to outlines · Drag anchor nodes & handles to sculpt letter serifs'
    );
  };

  const handleTogglePenTool = () => {
    setPenAttachTextId(null);
    setCanvasToolMode((m) => (m === 'pen' ? 'select' : 'pen'));
  };

  const handleStartPenForText = (textLayerId: string) => {
    setSelectedLayerIds([textLayerId]);
    setPenAttachTextId(textLayerId);
    setCanvasToolMode('pen');
    showEditorNotice('Click points & drag handles on canvas to draw a custom Bezier curve');
  };

  const handleTogglePerLetterMode = () => {
    setPenAttachTextId(null);
    setCanvasToolMode((m) => (m === 'per-letter' ? 'select' : 'per-letter'));
  };

  const handleCreateLayerFromEditor = (
    newLayer: LogoLayer,
    attachToTextId?: string | null
  ) => {
    let nextLayers = [...activeDoc.layers, newLayer];
    let nextSelected = [newLayer.id];

    if (attachToTextId) {
      const artboardPathD = extractLayerPathInArtboardSpace(newLayer) ?? undefined;
      nextLayers = nextLayers.map((l) => {
        if (l.id !== attachToTextId || l.type !== 'text') return l;
        return {
          ...l,
          textWarp: undefined,
          curveRadius: 0,
          textPath: {
            mode: 'layer',
            targetLayerId: newLayer.id,
            customPathD: artboardPathD,
            startOffset: 50,
            flipSide: false,
            baselineShift: -12,
          },
        };
      });
      nextSelected = [attachToTextId];
      showEditorNotice('Text attached to your custom Bezier curve!');
    }

    commitDocument({ ...activeDoc, layers: nextLayers });
    setSelectedLayerIds(nextSelected);
    setPenAttachTextId(null);
    setCanvasToolMode('select');
  };

  const handleBooleanCombine = (op: BooleanOpKind) => {
    const ordered = activeDoc.layers.filter(
      (l) => selectedLayerIds.includes(l.id) && l.visible && !l.locked
    );
    const combinable = ordered.filter(isCombinableVectorLayer);
    const res = combineVectorLayers(combinable, op);
    if (!res.ok) {
      showEditorNotice(res.reason);
      return;
    }

    const consumedIds = new Set(combinable.map((l) => l.id));
    let insertAt = 0;
    let lastConsumedIndex = -1;
    activeDoc.layers.forEach((l, i) => {
      if (consumedIds.has(l.id)) lastConsumedIndex = i;
    });
    for (let i = 0; i <= lastConsumedIndex; i++) {
      if (!consumedIds.has(activeDoc.layers[i].id)) {
        insertAt += 1;
      }
    }

    const remaining = activeDoc.layers.filter((l) => !consumedIds.has(l.id));
    remaining.splice(insertAt, 0, res.layer);
    commitDocument({ ...activeDoc, layers: remaining });
    setSelectedLayerIds([res.layer.id]);
  };

  const handleCreateClippingMask = async () => {
    const ordered = activeDoc.layers.filter(
      (l) => selectedLayerIds.includes(l.id) && l.visible && !l.locked
    );
    const res = await createClippingMaskFromSelection(ordered);
    if (!res.ok) {
      showEditorNotice(res.reason);
      return;
    }

    const consumedSet = new Set(res.consumedLayerIds);
    const nextLayers = activeDoc.layers
      .filter((l) => !consumedSet.has(l.id))
      .map((l) => (l.id === res.clippedLayer.id ? res.clippedLayer : l));

    commitDocument({ ...activeDoc, layers: nextLayers });
    setSelectedLayerIds([res.clippedLayer.id]);
  };

  const handleKnockoutSelected = () => {
    const ordered = activeDoc.layers.filter(
      (l) => selectedLayerIds.includes(l.id) && l.visible
    );
    if (ordered.length < 2) {
      showEditorNotice('Select 2+ overlapping layers to punch a Knockout / Cutout hole.');
      return;
    }
    const target = ordered[0];
    const cutterIds = new Set(ordered.slice(1).map((l) => l.id));
    const allCuttersAlreadyActive = ordered
      .slice(1)
      .every((l) => l.isKnockout && l.knockoutTargetId === target.id);

    const nextLayers = activeDoc.layers.map((l) => {
      if (l.id === target.id && l.isKnockout) {
        return { ...l, isKnockout: false, knockoutTargetId: undefined };
      }
      if (!cutterIds.has(l.id)) return l;
      if (allCuttersAlreadyActive) {
        return { ...l, isKnockout: false, knockoutTargetId: undefined };
      }
      return { ...l, isKnockout: true, knockoutTargetId: target.id };
    });

    commitDocument({ ...activeDoc, layers: nextLayers });
    if (allCuttersAlreadyActive) {
      showEditorNotice('Knockout cutout released back to solid layers.');
    } else {
      const topCutter = ordered[ordered.length - 1];
      setSelectedLayerIds([topCutter.id]);
      showEditorNotice(`Knockout active — "${topCutter.name}" now punches through "${target.name}".`);
    }
  };

  const handleUpdateSurfaceTexture = (nextTexture: SurfaceTextureConfig) => {
    commitDocument({ ...activeDoc, surfaceTexture: nextTexture });
  };

  const handleSaveBrandKit = () => {
    const variants = extractBrandVariants(activeDoc, brief, activePalette);
    const kit: SavedBrandKit = {
      id: `kit-${Date.now()}`,
      name: brief.businessName || 'Untitled Brand',
      savedAt: new Date().toISOString(),
      brief,
      palette: activePalette,
      primaryDocument: variants.primaryDocument,
      markOnlyDocument: variants.markOnlyDocument,
      wordmarkDocument: variants.wordmarkDocument,
    };
    const next = [kit, ...savedKits];
    setSavedKits(next);
    try {
      localStorage.setItem(BRAND_KITS_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota errors
    }
  };

  const handleLoadKit = (kit: SavedBrandKit) => {
    setBrief(kit.brief);
    const pFont = resolveFont(kit.brief.primaryFontId);
    const sFont = resolveFont(kit.brief.secondaryFontId);
    const nextTokens = createDefaultBrandTokens(kit.palette, pFont, sFont);
    const linked = linkDocumentToBrandTokens(kit.primaryDocument, nextTokens);
    commitWorkspace({
      artboards: [{ ...linked, artboardRole: 'primary-horizontal' }],
      activeArtboardIndex: 0,
      tokens: nextTokens,
    });
    setSelectedLayerIds([]);
    setViewMode('editor');
  };

  const handleDeleteKit = (id: string) => {
    const next = savedKits.filter((k) => k.id !== id);
    setSavedKits(next);
    try {
      localStorage.setItem(BRAND_KITS_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota errors
    }
  };

  const handleSaveCurrentAsProject = (customName?: string) => {
    const now = new Date().toISOString();
    const resolvedName =
      customName?.trim() ||
      activeProject?.name ||
      brief.businessName?.trim() ||
      activeDoc.title?.trim() ||
      `Logo Project ${projects.length + 1}`;

    const newProject: LogoProject = {
      id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: resolvedName,
      createdAt: now,
      updatedAt: now,
      brief: { ...brief },
      document: { ...activeDoc, title: resolvedName },
      artboards,
      activeArtboardIndex,
      brandTokens,
    };

    const next = [newProject, ...projects];
    setProjects(next);
    setActiveProjectId(newProject.id);
    persistSavedProjects(next);
    persistActiveSession({
      activeProjectId: newProject.id,
      brief: newProject.brief,
      document: newProject.document,
      artboards,
      activeArtboardIndex,
      brandTokens,
      updatedAt: now,
    });
    setAutoSaveState('saved');
  };

  const handleNewBlankProject = () => {
    const blankBrief: BrandBrief = {
      ...DEFAULT_BRAND_BRIEF,
      businessName: 'New Brand',
      tagline: 'DESIGN STUDIO',
    };
    const pal = resolvePalette(blankBrief.paletteId);
    const pFont = resolveFont(blankBrief.primaryFontId);
    const sFont = resolveFont(blankBrief.secondaryFontId);
    const blankTokens = createDefaultBrandTokens(
      { ...pal, background: '#FAF9F6' },
      pFont,
      sFont
    );
    const blankDoc: LogoDocument = {
      id: nextLayerId('doc'),
      title: 'New Blank Logo',
      artboardRole: 'primary-horizontal',
      width: 800,
      height: 600,
      backgroundColor: '#FAF9F6',
      backgroundToken: 'background',
      transparentBackground: false,
      layers: [],
    };
    setActiveProjectId(null);
    setBrief(blankBrief);
    setHistory({
      past: [],
      present: { artboards: [blankDoc], activeArtboardIndex: 0, tokens: blankTokens },
      future: [],
    });
    setSelectedLayerIds([]);
    setViewMode('editor');
  };

  const handleOpenProject = (project: LogoProject) => {
    const pal = resolvePalette(project.brief.paletteId);
    const pFont = resolveFont(project.brief.primaryFontId);
    const sFont = resolveFont(project.brief.secondaryFontId);
    const nextTokens =
      project.brandTokens ??
      createDefaultBrandTokens(
        { ...pal, background: project.document.backgroundColor || pal.background },
        pFont,
        sFont
      );
    const rawList =
      project.artboards && project.artboards.length > 0
        ? project.artboards
        : [project.document];
    const nextArtboards = rawList.map((ab) => linkDocumentToBrandTokens(ab, nextTokens));
    const nextIdx = Math.min(
      Math.max(0, project.activeArtboardIndex ?? 0),
      Math.max(0, nextArtboards.length - 1)
    );
    setBrief(project.brief);
    setHistory({
      past: [],
      present: {
        artboards: nextArtboards,
        activeArtboardIndex: nextIdx,
        tokens: nextTokens,
      },
      future: [],
    });
    setActiveProjectId(project.id);
    setSelectedLayerIds([]);
    setViewMode('editor');
  };

  const handleRenameProject = (id: string, nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    const next = projects.map((p) =>
      p.id === id
        ? {
            ...p,
            name: trimmed,
            updatedAt: now,
            document: { ...p.document, title: trimmed },
          }
        : p
    );
    setProjects(next);
    persistSavedProjects(next);
    if (activeProjectId === id) {
      setHistory((prev) => ({
        ...prev,
        present: {
          ...prev.present,
          artboards: prev.present.artboards.map((ab, idx) =>
            idx === prev.present.activeArtboardIndex ? { ...ab, title: trimmed } : ab
          ),
        },
      }));
    }
  };

  const handleDuplicateProject = (id: string) => {
    const source = projects.find((p) => p.id === id);
    if (!source) return;
    const now = new Date().toISOString();
    const copyName = `${source.name} Copy`;
    const copy: LogoProject = {
      id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: copyName,
      createdAt: now,
      updatedAt: now,
      brief: { ...source.brief },
      document: cloneDocumentForProject(source.document, copyName),
      artboards: source.artboards?.map((ab) => cloneDocumentForProject(ab, ab.title)),
      activeArtboardIndex: source.activeArtboardIndex,
      brandTokens: source.brandTokens,
    };
    const next = [copy, ...projects];
    setProjects(next);
    persistSavedProjects(next);
  };

  const handleDeleteProject = (id: string) => {
    const next = projects.filter((p) => p.id !== id);
    setProjects(next);
    persistSavedProjects(next);
    if (activeProjectId === id) {
      setActiveProjectId(null);
    }
  };

  const handleExportProject = (project: LogoProject) => {
    handleOpenProject(project);
    setExportOpen(true);
  };

  const handleStartFromLanding = (brandName: string, industry: IndustryCategory) => {
    const nextBrief: BrandBrief = {
      ...brief,
      businessName: brandName,
      industry,
    };
    setBrief(nextBrief);
    const nextConcepts = generateTwelveLogoConcepts(nextBrief);
    setConcepts(nextConcepts);
    if (nextConcepts[0]) {
      setActiveProjectId(null);
      const pal = resolvePalette(nextBrief.paletteId);
      const pFont = resolveFont(nextBrief.primaryFontId);
      const sFont = resolveFont(nextBrief.secondaryFontId);
      const nextTokens = createDefaultBrandTokens(pal, pFont, sFont);
      resetHistoryWithDoc(nextConcepts[0].document, nextTokens);
    }
    setSelectedLayerIds([]);
    setViewMode('concepts');
  };

  const handleOpenSampleFromLanding = (sampleBrief: BrandBrief, sampleDoc: LogoDocument) => {
    setActiveProjectId(null);
    setBrief(sampleBrief);
    setConcepts(generateTwelveLogoConcepts(sampleBrief));
    const pal = resolvePalette(sampleBrief.paletteId);
    const pFont = resolveFont(sampleBrief.primaryFontId);
    const sFont = resolveFont(sampleBrief.secondaryFontId);
    const nextTokens = createDefaultBrandTokens(
      { ...pal, background: sampleDoc.backgroundColor || pal.background },
      pFont,
      sFont
    );
    resetHistoryWithDoc(sampleDoc, nextTokens);
    setSelectedLayerIds([]);
    setViewMode('editor');
  };

  const handleUpdateCanvasBrandMeta = (patch: {
    brandName?: string;
    tagline?: string;
    primaryColor?: string;
  }) => {
    setBrief((prev) => ({
      ...prev,
      businessName: patch.brandName !== undefined ? patch.brandName : prev.businessName,
      tagline: patch.tagline !== undefined ? patch.tagline : prev.tagline,
    }));

    const textLayers = activeDoc.layers
      .filter((l): l is TextLayer => l.type === 'text' && l.visible)
      .sort((a, b) => b.fontSize - a.fontSize);
    const primaryTextId = textLayers[0]?.id;
    const secondaryTextId = textLayers[1]?.id;

    commitDocument({
      ...activeDoc,
      layers: activeDoc.layers.map((l) => {
        if (l.type === 'text') {
          if (l.id === primaryTextId && patch.brandName !== undefined) {
            return { ...l, text: patch.brandName };
          }
          if (l.id === secondaryTextId && patch.tagline !== undefined) {
            return { ...l, text: patch.tagline };
          }
        }
        if (patch.primaryColor && (l.type === 'icon' || l.type === 'custom-svg')) {
          return { ...l, fill: patch.primaryColor };
        }
        return l;
      }),
    });
  };

  const activeGamutReport = useMemo(
    () => auditDocumentPrintGamut(activeDoc),
    [activeDoc]
  );

  const handleSnapToPrintGamut = (onlySourceHex?: string) => {
    const nextArtboards = artboards.map((ab) =>
      snapDocumentToPrintGamut(ab, onlySourceHex)
    );
    const nextColors = { ...brandTokens.colors };
    (['primary', 'secondary', 'accent', 'text', 'background'] as BrandColorTokenId[]).forEach(
      (tokenId) => {
        const curHex = nextColors[tokenId].hex;
        if (onlySourceHex && curHex.toUpperCase() !== onlySourceHex.toUpperCase()) return;
        const proof = simulateCmykProofColor(curHex);
        if (proof.isOutOfGamut) {
          let safeHex = proof.proofHex;
          for (let i = 0; i < 5; i++) {
            const check = simulateCmykProofColor(safeHex);
            if (!check.isOutOfGamut) break;
            safeHex = check.proofHex;
          }
          nextColors[tokenId] = { ...nextColors[tokenId], hex: safeHex };
        }
      }
    );
    commitWorkspace({
      ...workspace,
      artboards: nextArtboards,
      tokens: {
        ...brandTokens,
        colors: nextColors,
      },
    });
    showEditorNotice(
      onlySourceHex
        ? `Snapped ${onlySourceHex} to printable CMYK gamut`
        : 'Snapped all out-of-gamut colors to printable CMYK equivalents'
    );
  };

  const studioCommands: StudioCommandItem[] = useMemo(() => {
    const hasSel = selectedLayerIds.length > 0;
    const singleSel = selectedLayerIds.length === 1
      ? activeDoc.layers.find((l) => l.id === selectedLayerIds[0])
      : undefined;
    const singleText = singleSel?.type === 'text' ? singleSel : undefined;

    return [
      {
        id: 'proof-cmyk',
        title: 'Toggle Print Proof (CMYK)',
        subtitle: 'Simulate CMYK ink dulling & flag out-of-gamut neon colors',
        category: 'Print & Pre-Press',
        active: printProofCmyk,
        badge:
          activeGamutReport.hasOutOfGamut
            ? `${activeGamutReport.outOfGamutSwatches.length} Out-of-Gamut`
            : undefined,
        keywords: ['cmyk', 'print', 'proof', 'soft proof', 'gamut', 'ink', 'neon'],
        run: () => {
          setViewMode('editor');
          setPrintProofCmyk((v) => !v);
        },
      },
      {
        id: 'snap-cmyk-gamut',
        title: 'Snap Out-of-Gamut Colors to CMYK',
        subtitle: activeGamutReport.hasOutOfGamut
          ? `Convert ${activeGamutReport.outOfGamutSwatches.length} neon color(s) to printable CMYK`
          : 'All colors already within coated CMYK gamut',
        category: 'Print & Pre-Press',
        disabled: !activeGamutReport.hasOutOfGamut,
        keywords: ['snap', 'fix', 'cmyk', 'gamut', 'print', 'convert'],
        run: () => handleSnapToPrintGamut(),
      },
      {
        id: 'toggle-crop-marks',
        title: 'Toggle Crop Marks & Registration',
        subtitle: 'Show exterior corner trim marks & CMYK registration targets',
        category: 'Print & Pre-Press',
        active: showCropMarks,
        keywords: ['crop', 'trim', 'marks', 'registration', 'prepress', 'print'],
        run: () => {
          setViewMode('editor');
          setShowCropMarks((v) => !v);
        },
      },
      {
        id: 'toggle-bleed-guides',
        title: 'Toggle 3mm Bleed Guides',
        subtitle: 'Show 3mm (12px) print bleed frame',
        category: 'Print & Pre-Press',
        active: showBleed,
        keywords: ['bleed', '3mm', 'trim', 'print', 'prepress'],
        run: () => {
          setViewMode('editor');
          setShowBleed((v) => !v);
        },
      },
      {
        id: 'toggle-clear-space',
        title: 'Toggle 1x Clear-Space Margin Box',
        subtitle: 'Display dynamic 1x brand exclusion zone around logo artwork',
        category: 'Print & Pre-Press',
        active: showClearSpace,
        keywords: ['clear', 'space', '1x', 'margin', 'exclusion', 'guideline'],
        run: () => {
          setViewMode('editor');
          setShowClearSpace((v) => !v);
        },
      },
      {
        id: 'toggle-safe-margin',
        title: 'Toggle 8% Safe Zone Margin',
        subtitle: 'Check layer clipping near artboard edges',
        category: 'Print & Pre-Press',
        active: showSafeZone,
        keywords: ['safe', 'zone', 'margin', 'inset', 'clipping'],
        run: () => {
          setViewMode('editor');
          setShowSafeZone((v) => !v);
        },
      },
      {
        id: 'align-center-h',
        title: 'Align Center Horizontally',
        subtitle: hasSel ? 'Center selected layer(s) horizontally' : 'Select a layer first',
        category: 'Align & Transform',
        disabled: !hasSel,
        keywords: ['align', 'center', 'horizontal', 'middle'],
        run: () => handleAlignSelectedLayers('center-h'),
      },
      {
        id: 'align-center-v',
        title: 'Align Center Vertically',
        subtitle: hasSel ? 'Center selected layer(s) vertically' : 'Select a layer first',
        category: 'Align & Transform',
        disabled: !hasSel,
        keywords: ['align', 'center', 'vertical', 'middle'],
        run: () => handleAlignSelectedLayers('center-v'),
      },
      {
        id: 'align-left',
        title: 'Align Left',
        category: 'Align & Transform',
        disabled: !hasSel,
        keywords: ['align', 'left'],
        run: () => handleAlignSelectedLayers('left'),
      },
      {
        id: 'align-right',
        title: 'Align Right',
        category: 'Align & Transform',
        disabled: !hasSel,
        keywords: ['align', 'right'],
        run: () => handleAlignSelectedLayers('right'),
      },
      {
        id: 'align-top',
        title: 'Align Top',
        category: 'Align & Transform',
        disabled: !hasSel,
        keywords: ['align', 'top'],
        run: () => handleAlignSelectedLayers('top'),
      },
      {
        id: 'align-bottom',
        title: 'Align Bottom',
        category: 'Align & Transform',
        disabled: !hasSel,
        keywords: ['align', 'bottom'],
        run: () => handleAlignSelectedLayers('bottom'),
      },
      {
        id: 'duplicate-selected',
        title: 'Duplicate Selected Layers',
        category: 'Layers & Vector',
        shortcut: 'Ctrl+D',
        disabled: !hasSel,
        keywords: ['duplicate', 'copy', 'clone', 'layer'],
        run: () => handleDuplicateSelected(),
      },
      {
        id: 'delete-selected',
        title: 'Delete Selected Layers',
        category: 'Layers & Vector',
        shortcut: 'Del',
        disabled: !hasSel,
        keywords: ['delete', 'remove', 'trash', 'layer'],
        run: () => handleDeleteSelected(),
      },
      {
        id: 'group-selected',
        title: 'Group Selected Layers',
        category: 'Layers & Vector',
        shortcut: 'Ctrl+G',
        disabled: selectedLayerIds.length < 2,
        keywords: ['group', 'combine', 'layers'],
        run: () => handleGroupSelected(),
      },
      {
        id: 'ungroup-selected',
        title: 'Ungroup Selected Group',
        category: 'Layers & Vector',
        shortcut: 'Ctrl+Shift+G',
        disabled: !hasSel,
        keywords: ['ungroup', 'split', 'layers'],
        run: () => handleUngroupSelected(),
      },
      {
        id: 'knockout-cutout',
        title: 'Punch Knockout / Cutout Mask',
        category: 'Layers & Vector',
        disabled: !hasSel,
        keywords: ['knockout', 'cutout', 'mask', 'punch', 'hole'],
        run: () => handleKnockoutSelected(),
      },
      {
        id: 'convert-text-outlines',
        title: 'Convert Text to Vector Outlines',
        category: 'Layers & Vector',
        disabled: !singleText,
        keywords: ['convert', 'outlines', 'text', 'path', 'vectorize'],
        run: () => {
          if (singleText) void handleConvertTextToPath(singleText);
        },
      },
      {
        id: 'toggle-pen-tool',
        title: 'Toggle Bezier Pen Tool',
        category: 'Layers & Vector',
        active: canvasToolMode === 'pen',
        keywords: ['pen', 'bezier', 'draw', 'curve', 'path'],
        run: () => {
          setViewMode('editor');
          handleTogglePenTool();
        },
      },
      {
        id: 'toggle-per-letter',
        title: 'Toggle Per-Letter Type Edit Mode',
        category: 'Layers & Vector',
        active: canvasToolMode === 'per-letter',
        keywords: ['per-letter', 'kerning', 'glyph', 'typography'],
        run: () => {
          setViewMode('editor');
          handleTogglePerLetterMode();
        },
      },
      {
        id: 'magic-recolor',
        title: 'Magic Recolor Palette',
        category: 'Layers & Vector',
        keywords: ['magic', 'recolor', 'palette', 'colors'],
        run: () => handleMagicRecolor(),
      },
      {
        id: 'fit-active-artboard',
        title: 'Fit Active Artboard in View',
        category: 'Canvas & Artboards',
        keywords: ['fit', 'zoom', 'center', 'artboard'],
        run: () => {
          setViewMode('editor');
          viewportCommandRef.current?.fitActive();
        },
      },
      {
        id: 'fit-all-artboards',
        title: 'Fit All Lockup Artboards in View',
        category: 'Canvas & Artboards',
        keywords: ['fit all', 'zoom', 'artboards', 'lockups', 'overview'],
        run: () => {
          setViewMode('editor');
          viewportCommandRef.current?.fitAll();
        },
      },
      {
        id: 'arrange-artboards',
        title: 'Arrange Artboards Side-by-Side',
        category: 'Canvas & Artboards',
        disabled: artboards.length <= 1,
        keywords: ['arrange', 'align', 'artboards', 'tidy'],
        run: () => {
          setViewMode('editor');
          handleArrangeArtboards();
        },
      },
      {
        id: 'add-stacked-badge',
        title: 'Add Stacked Badge Artboard (800×800)',
        category: 'Canvas & Artboards',
        keywords: ['add', 'artboard', 'stacked', 'badge', 'lockup'],
        run: () => {
          setViewMode('editor');
          handleAddResponsiveArtboard('stacked-badge');
        },
      },
      {
        id: 'add-app-icon',
        title: 'Add App Icon / Favicon Artboard (512×512)',
        category: 'Canvas & Artboards',
        keywords: ['add', 'artboard', 'app icon', 'favicon', 'square'],
        run: () => {
          setViewMode('editor');
          handleAddResponsiveArtboard('app-icon');
        },
      },
      {
        id: 'add-social-banner',
        title: 'Add Social Banner Artboard (1200×400)',
        category: 'Canvas & Artboards',
        keywords: ['add', 'artboard', 'social', 'banner', 'cover'],
        run: () => {
          setViewMode('editor');
          handleAddResponsiveArtboard('social-banner');
        },
      },
      {
        id: 'cycle-grid',
        title: 'Cycle Canvas Grid (Square / 3rds / Golden φ / Off)',
        category: 'Canvas & Artboards',
        keywords: ['grid', 'golden', 'thirds', 'square', 'guides'],
        run: () => {
          setViewMode('editor');
          viewportCommandRef.current?.cycleGrid();
        },
      },
      {
        id: 'cycle-rulers',
        title: 'Cycle Workspace Rulers (px / mm / Off)',
        category: 'Canvas & Artboards',
        keywords: ['ruler', 'mm', 'px', 'measure'],
        run: () => {
          setViewMode('editor');
          viewportCommandRef.current?.cycleRuler();
        },
      },
      {
        id: 'toggle-pan-tool',
        title: 'Toggle Hand Pan Tool (Spacebar + Drag)',
        category: 'Canvas & Artboards',
        keywords: ['hand', 'pan', 'drag', 'move', 'canvas'],
        run: () => {
          setViewMode('editor');
          viewportCommandRef.current?.togglePan();
        },
      },
      {
        id: 'open-export',
        title: 'Open Export Studio (SVG / PNG / PDF / Favicon)',
        category: 'Export & Studio',
        keywords: ['export', 'download', 'svg', 'png', 'pdf', 'favicon', 'zip'],
        run: () => setExportOpen(true),
      },
      {
        id: 'open-templates',
        title: 'Browse Pro Logo Templates',
        category: 'Export & Studio',
        keywords: ['templates', 'gallery', 'presets'],
        run: () => setTemplateGalleryOpen(true),
      },
      {
        id: 'open-wizard',
        title: 'Open 6-Concept Logo Wizard',
        category: 'Export & Studio',
        keywords: ['wizard', 'generate', 'concepts', 'ai'],
        run: () => setWizardOpen(true),
      },
      {
        id: 'open-variations',
        title: 'Generate 4 Logo Variations',
        category: 'Export & Studio',
        keywords: ['variations', 'variants', 'dark', 'monochrome'],
        run: () => handleOpenVariations(),
      },
      {
        id: 'switch-mockups',
        title: 'View Brand Mockups',
        category: 'Export & Studio',
        keywords: ['mockups', 'tshirt', 'signage', 'bottle', 'preview'],
        run: () => setViewMode('mockups'),
      },
      {
        id: 'switch-brandkit',
        title: 'Open Brand Kit & Style Sheet',
        category: 'Export & Studio',
        keywords: ['brand kit', 'colors', 'typography', 'guidelines'],
        run: () => setViewMode('brandkit'),
      },
      {
        id: 'switch-cards',
        title: 'Open Visiting Card Atelier',
        category: 'Export & Studio',
        keywords: ['visiting card', 'business card', 'print'],
        run: () => {
          setIncomingLogoNonce((n) => n + 1);
          setViewMode('cards');
        },
      },
      {
        id: 'share-client',
        title: 'Share Read-Only Client Preview',
        category: 'Export & Studio',
        keywords: ['share', 'client', 'link', 'presentation'],
        run: () => setShareOpen(true),
      },
      {
        id: 'toggle-theme',
        title:
          studioTheme === 'light'
            ? 'Switch to Dark Studio Theme'
            : 'Switch to Light Studio Theme',
        category: 'Export & Studio',
        keywords: ['theme', 'dark', 'light', 'mode'],
        run: () => setStudioTheme((t) => (t === 'light' ? 'dark' : 'light')),
      },
      {
        id: 'undo-action',
        title: 'Undo Last Action',
        category: 'Export & Studio',
        shortcut: 'Ctrl+Z',
        disabled: history.past.length === 0,
        keywords: ['undo', 'revert', 'history'],
        run: () => handleUndo(),
      },
      {
        id: 'redo-action',
        title: 'Redo Action',
        category: 'Export & Studio',
        shortcut: 'Ctrl+Shift+Z',
        disabled: history.future.length === 0,
        keywords: ['redo', 'history'],
        run: () => handleRedo(),
      },
    ];
  }, [
    selectedLayerIds,
    activeDoc.layers,
    printProofCmyk,
    showCropMarks,
    showBleed,
    showClearSpace,
    showSafeZone,
    activeGamutReport,
    canvasToolMode,
    artboards.length,
    studioTheme,
    history.past.length,
    history.future.length,
  ]);

  return (
    <StudioLogoProvider
      activeDoc={activeDoc}
      brief={brief}
      activePalette={activePalette}
      onJumpToLogoEditor={() => setViewMode('editor')}
      onUpdateCanvasBrandMeta={handleUpdateCanvasBrandMeta}
    >
      {viewMode === 'client-preview' && clientPreviewSession ? (
        <ClientPreviewView
          payload={clientPreviewSession.payload}
          shareToken={clientPreviewSession.token}
          isFromStudioSession={clientPreviewSession.fromStudio}
          onExitPreview={() => {
            if (typeof window !== 'undefined' && window.location.search.includes('client=')) {
              const url = new URL(window.location.href);
              url.searchParams.delete('client');
              window.history.replaceState({}, '', url.toString());
            }
            setClientPreviewSession(null);
            setViewMode('editor');
          }}
        />
      ) : viewMode === 'landing' ? (
        <>
          <LandingView
            initialBrandName={brief.businessName === DEFAULT_BRAND_BRIEF.businessName ? '' : brief.businessName}
            savedProjectsCount={projects.length}
            onStartWithBrandName={handleStartFromLanding}
            onOpenBlankEditor={() => setViewMode('editor')}
            onOpenSampleInEditor={handleOpenSampleFromLanding}
            onOpenProjects={() => setViewMode('projects')}
            onOpenUpdateLog={() => setUpdateLogOpen(true)}
          />
          <LogoWizardModal
            isOpen={wizardOpen}
            onClose={() => setWizardOpen(false)}
            brief={brief}
            setBrief={setBrief}
            activePalette={activePalette}
            onGenerate={handleWizardGenerate}
            onInsertTracedSymbol={handleInsertTracedSymbol}
            onGenerateWithAiSymbol={handleWizardGenerateWithAiSymbol}
          />
        </>
      ) : (
        <div className="min-h-screen flex flex-col bg-[#F1F3F6] dark:bg-[#0F1117] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Zone 1: Top Glass Header (56px desktop) */}
      <header className="sticky top-0 z-40 border-b border-[#E2E8F0] dark:border-[#2A2F3D] bg-white/85 dark:bg-[#181B23]/88 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:h-14 md:items-center md:justify-between gap-2 px-3 sm:px-4 py-2 md:py-0">
          {/* Left: App Logo + Editable Project Title + Workspace Views */}
          <div className="flex items-center justify-between md:justify-start gap-2.5 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setViewMode('landing')}
                title="Return to Forma Studio Home"
                className="group inline-flex items-center gap-2 rounded-lg px-1.5 py-1 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#6366F1,#8B5CF6)] text-white shadow-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-bold tracking-tight">Forma</span>
              </button>

              <span className="hidden sm:block h-4 w-px bg-[#E2E8F0] dark:bg-[#2A2F3D] shrink-0" aria-hidden="true" />

              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitHeaderProjectTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    commitHeaderProjectTitle();
                    (e.target as HTMLInputElement).blur();
                  } else if (e.key === 'Escape') {
                    setTitleDraft(activeDoc.title || activeProject?.name || 'Untitled Brand');
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                aria-label="Project title"
                title="Click to rename project"
                className="w-28 sm:w-36 md:w-40 truncate rounded-lg border border-transparent hover:border-[#E2E8F0] dark:hover:border-[#2A2F3D] focus:border-indigo-500 dark:focus:border-indigo-400 bg-transparent focus:bg-white dark:focus:bg-[#0F1117] px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none transition-colors"
              />
            </div>

            <nav className="hidden lg:flex items-center gap-0.5 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-[#F1F3F6] dark:bg-[#0F1117] p-0.5 ml-1">
              {(
                [
                  { id: 'editor', label: 'Editor' },
                  { id: 'concepts', label: 'Concepts' },
                  {
                    id: 'projects',
                    label: projects.length > 0 ? `Projects (${projects.length})` : 'Projects',
                  },
                  { id: 'mockups', label: 'Mockups' },
                  { id: 'brandkit', label: 'Brand Kit' },
                  { id: 'cards', label: 'Cards' },
                ] as const
              ).map((item) => {
                const active = viewMode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setViewMode(item.id)}
                    className={`rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer active:scale-95 ${
                      active
                        ? 'bg-white dark:bg-[#181B23] text-indigo-600 dark:text-indigo-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Center: Undo / Redo & Save Status Badge */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            <div className="inline-flex items-center gap-0.5 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-[#F1F3F6]/70 dark:bg-[#0F1117]/80 p-0.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.past.length === 0}
                title="Undo (Ctrl/Cmd+Z)"
                aria-label="Undo"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-[#181B23] disabled:opacity-35 active:scale-95 transition-all cursor-pointer"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={history.future.length === 0}
                title="Redo (Ctrl/Cmd+Shift+Z)"
                aria-label="Redo"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-[#181B23] disabled:opacity-35 active:scale-95 transition-all cursor-pointer"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <span
              className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#181B23] px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap"
              title="All edits auto-save locally"
            >
              {autoSaveState === 'saving' ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 text-emerald-500" />
                  <span>Saved</span>
                </>
              )}
            </span>
          </div>

          {/* Right: Quick Utilities, Theme Toggle, Share & Gradient Export CTA */}
          <div className="flex items-center justify-between md:justify-end gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="command-palette-trigger"
                onClick={() => setCommandPaletteOpen(true)}
                title="Quick Command Palette (Ctrl+K / Cmd+K)"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#181B23] px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-400/70 dark:hover:border-indigo-500/60 active:scale-95 transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Command className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                <span className="hidden 2xl:inline">Commands</span>
                <kbd className="rounded border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#0F1117] px-1 py-0.5 font-mono-num text-[9.5px] font-bold text-slate-500 dark:text-slate-400">
                  ⌘K
                </kbd>
              </button>

              <button
                type="button"
                onClick={() => setTemplateGalleryOpen(true)}
                title="Browse 49+ Categorized Pro Templates"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#181B23] px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-400/70 dark:hover:border-indigo-500/60 dark:hover:shadow-[0_0_12px_rgba(99,102,241,0.2)] active:scale-95 transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LayoutTemplate className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                <span className="hidden xl:inline">Templates</span>
              </button>

              <button
                type="button"
                onClick={() => setUpdateLogOpen(true)}
                title="Build Changelog & Update Log"
                aria-label="Update Log"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#181B23] text-slate-700 dark:text-slate-200 hover:border-indigo-400/70 dark:hover:border-indigo-500/60 active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                <History className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setStudioTheme((t) => (t === 'light' ? 'dark' : 'light'))}
                title={
                  studioTheme === 'light'
                    ? 'Switch to Adobe Sleek Dark Theme'
                    : 'Switch to Canva Clean Light Theme'
                }
                aria-label="Toggle Light/Dark Studio Theme"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#181B23] text-slate-700 dark:text-slate-200 hover:border-indigo-400/70 dark:hover:border-indigo-500/60 dark:hover:shadow-[0_0_12px_rgba(99,102,241,0.2)] active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                {studioTheme === 'light' ? (
                  <Moon className="h-3.5 w-3.5 text-indigo-600" />
                ) : (
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                title="Share Read-Only Client Presentation Link"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#181B23] px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-400/70 dark:hover:border-indigo-500/60 dark:hover:shadow-[0_0_12px_rgba(99,102,241,0.2)] active:scale-95 transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                <span className="hidden sm:inline">Share</span>
              </button>

              <button
                type="button"
                onClick={() => setExportOpen(true)}
                title="Export SVG, PNG, PDF Brand Book & Favicons"
                className="studio-gradient-btn inline-flex h-8 items-center gap-1.5 rounded-full px-4 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Mobile/Tablet Horizontal View Switcher */}
          <nav className="flex lg:hidden items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 overflow-x-auto pb-0.5">
            {(
              [
                { id: 'editor', label: 'Editor' },
                { id: 'concepts', label: 'Concepts' },
                {
                  id: 'projects',
                  label: projects.length > 0 ? `Projects (${projects.length})` : 'Projects',
                },
                { id: 'mockups', label: 'Mockups' },
                { id: 'brandkit', label: 'Brand Kit' },
                { id: 'cards', label: 'Cards' },
              ] as const
            ).map((item) => {
              const active = viewMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setViewMode(item.id)}
                  className={`rounded-lg px-2.5 py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300'
                      : 'hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Workspace */}
      {viewMode === 'editor' && (
        <main className="flex flex-1 flex-col lg:flex-row min-h-0 overflow-hidden">
          <EditorLeftSidebar
            doc={activeDoc}
            brief={brief}
            brandName={brief.businessName}
            activePalette={activePalette}
            activeStyle={brief.style}
            selectedLayerIds={selectedLayerIds}
            uploadedSvgs={uploadedSvgs}
            artboards={artboards}
            brandTokens={brandTokens}
            onUpdateColorToken={handleUpdateColorToken}
            onUpdateFontToken={handleUpdateFontToken}
            onSyncAllTokens={handleSyncAllTokens}
            onSelectLayers={setSelectedLayerIds}
            onAddIcon={handleAddIcon}
            onAddShape={handleAddShape}
            onAddDivider={handleAddDivider}
            onUploadCustomSvg={handleUploadCustomSvg}
            onInsertTracedSymbol={handleInsertTracedSymbol}
            onApplyRemixedDocument={handleApplyRemixedDocument}
            onApplyBrandBrainstorm={handleApplyBrandBrainstorm}
            onAddText={handleAddText}
            onUpdateLayer={handleUpdateLayer}
            onInsertMonogram={handleInsertMonogram}
            onConvertTextToPath={handleConvertTextToPath}
            onApplyFontPairing={handleApplyFontPairing}
            onApplyFontToSelectedOrPrimary={handleApplyFontToSelectedOrPrimary}
            onApplyPalette={handleApplyPalette}
            onMagicRecolor={handleMagicRecolor}
            onOpenVariations={handleOpenVariations}
            onSelectProTemplate={handleSelectProTemplate}
            onOpenTemplateGallery={() => setTemplateGalleryOpen(true)}
            onSwitchLayout={handleSwitchLayout}
            onSwitchStyle={handleSwitchStyle}
            onToggleLayerVisible={handleToggleLayerVisible}
            onToggleLayerLock={handleToggleLayerLock}
            onReorderLayer={handleReorderLayer}
            onDuplicateLayer={handleDuplicateLayer}
            onDeleteLayer={handleDeleteLayer}
            onUpdateSurfaceTexture={handleUpdateSurfaceTexture}
            penMode={canvasToolMode === 'pen'}
            perLetterMode={canvasToolMode === 'per-letter'}
            onTogglePenTool={handleTogglePenTool}
            onStartPenForText={handleStartPenForText}
            onTogglePerLetterMode={handleTogglePerLetterMode}
          />

          <div className="flex-1 flex flex-col min-w-0 min-h-[420px] lg:min-h-0">
            <LogoCanvasEditor
              doc={activeDoc}
              activePalette={activePalette}
              selectedLayerIds={selectedLayerIds}
              onSelectLayers={setSelectedLayerIds}
              onPreviewLayersChange={handlePreviewLayersChange}
              onCommitLayersChange={handleCommitLayersChange}
              onUpdateTextLive={handleUpdateTextLive}
              onUpdateLayer={handleUpdateLayer}
              onAlignSelectedLayers={handleAlignSelectedLayers}
              onBatchUpdateSelected={handleBatchUpdateSelected}
              onBooleanCombine={handleBooleanCombine}
              onCreateClippingMask={handleCreateClippingMask}
              onKnockoutSelected={handleKnockoutSelected}
              onUpdateSurfaceTexture={handleUpdateSurfaceTexture}
              editorNotice={editorNotice}
              onApplyFontPairing={handleApplyFontPairing}
              onReorderLayer={handleReorderLayer}
              onConvertTextToPath={handleConvertTextToPath}
              onUpdateDocBackground={(backgroundColor, transparentBackground, tokenId) => {
                if (activeDoc.backgroundLocked) return;
                commitDocument({
                  ...activeDoc,
                  backgroundColor,
                  transparentBackground,
                  backgroundToken: tokenId === null ? undefined : tokenId ?? activeDoc.backgroundToken,
                });
              }}
              onResizeArtboard={handleResizeArtboard}
              canUndo={history.past.length > 0}
              canRedo={history.future.length > 0}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onDeleteSelected={handleDeleteSelected}
              onDuplicateSelected={handleDuplicateSelected}
              onNudgeSelected={handleNudgeSelected}
              onSendToVisitingCard={() => {
                setIncomingLogoNonce((n) => n + 1);
                setViewMode('cards');
              }}
              onOpenWizard={() => setWizardOpen(true)}
              onSaveProject={() => handleSaveCurrentAsProject()}
              onMagicRecolor={handleMagicRecolor}
              onOpenVariations={handleOpenVariations}
              onFixTextContrast={handleFixTextContrast}
              onGroupSelected={handleGroupSelected}
              onUngroupSelected={() => handleUngroupSelected()}
              onToggleBackgroundLock={handleToggleBackgroundLock}
              activeProjectName={activeProject?.name ?? null}
              autoSaveState={autoSaveState}
              artboards={artboards}
              activeArtboardIndex={activeArtboardIndex}
              brandTokens={brandTokens}
              onSwitchArtboard={handleSwitchArtboard}
              onAddResponsiveArtboard={handleAddResponsiveArtboard}
              onRemoveArtboard={handleRemoveArtboard}
              onArrangeArtboards={handleArrangeArtboards}
              pages={artboards.map((p, idx) => ({
                id: p.id,
                title: idx === activeArtboardIndex ? activeDoc.title : p.title,
              }))}
              activePageIndex={activeArtboardIndex}
              onSwitchPage={(idx) => handleSwitchArtboard(idx)}
              onAddPage={() => handleAddResponsiveArtboard('custom')}
              onRemovePage={handleRemoveArtboard}
              onOpenMockups={() => setViewMode('mockups')}
              canvasToolMode={canvasToolMode}
              onChangeToolMode={(mode) => {
                if (mode !== 'pen') setPenAttachTextId(null);
                setCanvasToolMode(mode);
              }}
              penAttachTextId={penAttachTextId}
              onTogglePenTool={handleTogglePenTool}
              onStartPenForText={handleStartPenForText}
              onCreateLayer={handleCreateLayerFromEditor}
              printProofCmyk={printProofCmyk}
              onTogglePrintProof={() => setPrintProofCmyk((v) => !v)}
              showCropMarks={showCropMarks}
              onToggleCropMarks={() => setShowCropMarks((v) => !v)}
              showBleed={showBleed}
              onToggleBleed={() => setShowBleed((v) => !v)}
              showClearSpace={showClearSpace}
              onToggleClearSpace={() => setShowClearSpace((v) => !v)}
              showSafeZone={showSafeZone}
              onToggleSafeZone={() => setShowSafeZone((v) => !v)}
              onSnapToPrintGamut={handleSnapToPrintGamut}
              viewportCommandRef={viewportCommandRef}
            />
          </div>

          <RightLayersDrawer
            doc={activeDoc}
            selectedLayerIds={selectedLayerIds}
            onSelectLayers={setSelectedLayerIds}
            onReorderLayerToIndex={handleReorderLayerToIndex}
            onRenameLayer={handleRenameLayer}
            onGroupSelected={handleGroupSelected}
            onUngroupSelected={handleUngroupSelected}
            onRenameGroup={handleRenameGroup}
            onToggleGroupCollapsed={handleToggleGroupCollapsed}
            onToggleGroupVisible={handleToggleGroupVisible}
            onToggleGroupLock={handleToggleGroupLock}
            onToggleLayerVisible={handleToggleLayerVisible}
            onToggleLayerLock={handleToggleLayerLock}
            onDuplicateLayer={handleDuplicateLayer}
            onDeleteLayer={handleDeleteLayer}
            onToggleBackgroundLock={handleToggleBackgroundLock}
            onUpdateDocBackground={(backgroundColor, transparentBackground) => {
              if (activeDoc.backgroundLocked) return;
              commitDocument({ ...activeDoc, backgroundColor, transparentBackground });
            }}
          />
        </main>
      )}

      {viewMode === 'concepts' && (
        <main className="flex-1">
          <BrandBriefGrid
            brief={brief}
            setBrief={setBrief}
            concepts={concepts}
            onRegenerate={handleRegenerateConcepts}
            onOpenWizard={() => setWizardOpen(true)}
            onOpenInEditor={handleOpenConceptInEditor}
          />
        </main>
      )}

      {viewMode === 'projects' && (
        <main className="flex-1">
          <ProjectsDashboard
            projects={projects}
            activeProjectId={activeProjectId}
            activeDoc={activeDoc}
            activePalette={activePalette}
            brief={brief}
            autoSaveState={autoSaveState}
            onSaveCurrentAsProject={handleSaveCurrentAsProject}
            onNewBlankProject={handleNewBlankProject}
            onOpenWizard={() => setWizardOpen(true)}
            onOpenProject={handleOpenProject}
            onRenameProject={handleRenameProject}
            onDuplicateProject={handleDuplicateProject}
            onDeleteProject={handleDeleteProject}
            onExportProject={handleExportProject}
          />
        </main>
      )}

      {viewMode === 'mockups' && (
        <main className="flex-1">
          <MockupPreviewView
            activeDoc={activeDoc}
            brief={brief}
            palette={activePalette}
            onBackToEditor={() => setViewMode('editor')}
            onOpenBrandKit={() => setViewMode('brandkit')}
            onOpenShare={() => setShareOpen(true)}
          />
        </main>
      )}

      {viewMode === 'brandkit' && (
        <main className="flex-1">
          <BrandKitView
            activeDoc={activeDoc}
            brief={brief}
            palette={activePalette}
            savedKits={savedKits}
            onSaveKit={handleSaveBrandKit}
            onLoadKit={handleLoadKit}
            onDeleteKit={handleDeleteKit}
            onOpenDocInEditor={(doc) => {
              commitDocument(doc);
              setSelectedLayerIds([]);
              setViewMode('editor');
            }}
          />
        </main>
      )}

      {viewMode === 'cards' && (
        <main className="flex-1">
          <VisitingCardAtelier incomingLogoNonce={incomingLogoNonce} />
        </main>
      )}

      <LogoWizardModal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        brief={brief}
        setBrief={setBrief}
        activePalette={activePalette}
        onGenerate={handleWizardGenerate}
        onInsertTracedSymbol={handleInsertTracedSymbol}
        onGenerateWithAiSymbol={handleWizardGenerateWithAiSymbol}
      />

      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        doc={activeDoc}
        brief={brief}
        palette={activePalette}
        planTier={planTier}
        onChangePlanTier={setPlanTier}
        onOpenShareModal={() => setShareOpen(true)}
      />

      <ShareClientModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        doc={activeDoc}
        brief={brief}
        palette={activePalette}
        onOpenClientPreview={(payload, token) => {
          setClientPreviewSession({ payload, token, fromStudio: true });
          setViewMode('client-preview');
        }}
      />

      <VariationsModal
        isOpen={variationsOpen}
        variations={generatedVariations}
        palette={activePalette}
        onClose={() => setVariationsOpen(false)}
        onOpenInEditor={(variationDoc) => {
          commitDocument(variationDoc);
          setSelectedLayerIds([]);
          setViewMode('editor');
        }}
        onSaveAllToProjects={handleSaveFourVariationsToProjects}
      />
        </div>
      )}

      <TemplateLibraryModal
        isOpen={templateGalleryOpen}
        onClose={() => setTemplateGalleryOpen(false)}
        brandName={brief.businessName}
        tagline={brief.tagline}
        onSelectTemplate={handleSelectProTemplate}
      />

      <UpdateLogModal
        isOpen={updateLogOpen}
        onClose={() => setUpdateLogOpen(false)}
      />

      <CommandPaletteModal
        isOpen={commandPaletteOpen}
        commands={studioCommands}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </StudioLogoProvider>
  );
}
