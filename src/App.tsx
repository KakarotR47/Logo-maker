import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
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
import { EditorLeftSidebar, UploadedSvgEntry } from './components/EditorLeftSidebar';
import { ExportModal } from './components/ExportModal';
import { LandingView } from './components/LandingView';
import { CanvasToolMode, LogoCanvasEditor } from './components/LogoCanvasEditor';
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
  BrandBrief,
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
  generateFourLogoVariations,
  LogoVariationEntry,
  magicRecolorDocument,
} from './utils/brandTools';
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
import { ClientSharePayload, parseClientShareFromSearch } from './utils/clientShare';
import { parseUploadedSvgToLayer } from './utils/svgExport';
import { buildDocumentFromTemplate, ProTemplateSpec } from './utils/templateLibrary';
import { extractLayerPathInArtboardSpace } from './utils/pathGeometry';
import { convertTextLayerToPath } from './utils/textToPath';

const BRAND_KITS_KEY = 'forma-logo-brand-kits-v1';

interface HistoryState {
  past: LogoDocument[];
  present: LogoDocument;
  future: LogoDocument[];
}

export default function App() {
  const initialSessionRef = useRef<ReturnType<typeof loadActiveSession> | undefined>(
    undefined
  );
  if (initialSessionRef.current === undefined) {
    initialSessionRef.current = loadActiveSession();
  }
  const initialSession = initialSessionRef.current;

  const [viewMode, setViewMode] = useState<StudioViewMode>('landing');
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
    present:
      initialSession?.document ??
      buildDocumentForArchetype(DEFAULT_BRAND_BRIEF, 'icon-left'),
    future: [],
  }));

  const [pages, setPages] = useState<LogoDocument[]>(() => [history.present]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
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
  const noticeTimerRef = useRef<number | null>(null);

  // Detect standalone ?client=... share link on startup
  useEffect(() => {
    if (typeof window === 'undefined' || !window.location.search) return;
    let active = true;
    void parseClientShareFromSearch(window.location.search).then((res) => {
      if (!active || !res) return;
      setBrief(res.payload.brief);
      setHistory({ past: [], present: res.payload.doc, future: [] });
      setPages([res.payload.doc]);
      setActivePageIndex(0);
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

  const [customPalette, setCustomPalette] = useState<ColorPalette | null>(null);
  const activeDoc = history.present;
  const activePalette = useMemo(
    () =>
      customPalette && customPalette.id === brief.paletteId
        ? customPalette
        : resolvePalette(brief.paletteId),
    [brief.paletteId, customPalette]
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
      present: { ...prev.present, title: trimmed },
    }));
    if (activeProjectId) {
      handleRenameProject(activeProjectId, trimmed);
    }
  };

  // Memoize active font signature so pointer drags don't re-run font loading
  const activeFontSignature = useMemo(
    () =>
      activeDoc.layers
        .filter((l): l is TextLayer => l.type === 'text')
        .map((l) => `${l.fontFamily}::${l.fontWeight}`)
        .join('|'),
    [activeDoc.layers]
  );

  // Dynamically ensure every Google Font used on the active canvas is loaded
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
    projects,
  });
  latestAutosaveRef.current = {
    activeProjectId,
    brief,
    activeDoc,
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
      const { activeProjectId: pid, brief: b, activeDoc: doc, projects: list } =
        latestAutosaveRef.current;
      const now = new Date().toISOString();

      persistActiveSession({
        activeProjectId: pid,
        brief: b,
        document: doc,
        updatedAt: now,
      });

      if (pid && list.some((p) => p.id === pid)) {
        const nextProjects = list.map((p) =>
          p.id === pid
            ? {
                ...p,
                brief: b,
                document: doc,
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
  }, [brief, activeDoc, activeProjectId]);

  // Flush current session synchronously when backgrounding or closing tab
  useEffect(() => {
    const flushNow = () => {
      const { activeProjectId: pid, brief: b, activeDoc: doc, projects: list } =
        latestAutosaveRef.current;
      const now = new Date().toISOString();
      persistActiveSession({
        activeProjectId: pid,
        brief: b,
        document: doc,
        updatedAt: now,
      });
      if (pid && list.some((p) => p.id === pid)) {
        const nextProjects = list.map((p) =>
          p.id === pid ? { ...p, brief: b, document: doc, updatedAt: now } : p
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

  const commitDocument = (nextDoc: LogoDocument) => {
    setHistory((prev) => ({
      past: [...prev.past.slice(-49), prev.present],
      present: nextDoc,
      future: [],
    }));
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
    setHistory((prev) => ({
      ...prev,
      present: {
        ...prev.present,
        layers: prev.present.layers.map((l) => layersMap[l.id] ?? l),
      },
    }));
  };

  const handleCommitLayersChange = (
    beforeMap: Record<string, LogoLayer>,
    afterMap: Record<string, LogoLayer>
  ) => {
    setHistory((prev) => {
      const docWithBefore: LogoDocument = {
        ...prev.present,
        layers: prev.present.layers.map((l) => beforeMap[l.id] ?? l),
      };
      const docWithAfter: LogoDocument = {
        ...prev.present,
        layers: prev.present.layers.map((l) => afterMap[l.id] ?? l),
      };
      return {
        past: [...prev.past.slice(-49), docWithBefore],
        present: docWithAfter,
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
    commitDocument(concept.document);
    setPages([concept.document]);
    setActivePageIndex(0);
    setSelectedLayerIds(concept.document.layers[0] ? [concept.document.layers[0].id] : []);
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
      accentFill: activePalette.accent,
      secondaryFill: activePalette.secondary,
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
      fill: shapeKind === 'ring' || shapeKind === 'frame' ? 'transparent' : activePalette.secondary,
      stroke: shapeKind === 'ring' || shapeKind === 'frame' ? activePalette.primary : 'none',
      strokeWidth: shapeKind === 'ring' || shapeKind === 'frame' ? 5 : 0,
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
    commitDocument({ ...activeDoc, layers: [...activeDoc.layers, layer] });
    setSelectedLayerIds([layer.id]);
  };

  const handleSwitchPage = (index: number) => {
    if (index === activePageIndex || index < 0 || index >= pages.length) return;
    const syncedPages = pages.map((p, i) => (i === activePageIndex ? activeDoc : p));
    const targetDoc = syncedPages[index];
    setPages(syncedPages);
    setActivePageIndex(index);
    setHistory({ past: [], present: targetDoc, future: [] });
    setSelectedLayerIds([]);
  };

  const handleAddPage = () => {
    const syncedPages = pages.map((p, i) => (i === activePageIndex ? activeDoc : p));
    const nextNum = syncedPages.length + 1;
    const copyDoc = cloneDocumentForProject(activeDoc, `${activeDoc.title} · Page ${nextNum}`);
    copyDoc.id = nextLayerId('doc');
    const nextPages = [...syncedPages, copyDoc];
    setPages(nextPages);
    setActivePageIndex(nextPages.length - 1);
    setHistory({ past: [], present: copyDoc, future: [] });
    setSelectedLayerIds([]);
  };

  const handleRemovePage = (index: number) => {
    if (pages.length <= 1) return;
    const syncedPages = pages.map((p, i) => (i === activePageIndex ? activeDoc : p));
    const nextPages = syncedPages.filter((_, i) => i !== index);
    const nextIndex = Math.min(activePageIndex, nextPages.length - 1);
    setPages(nextPages);
    setActivePageIndex(nextIndex);
    setHistory({ past: [], present: nextPages[nextIndex], future: [] });
    setSelectedLayerIds([]);
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
        ? resolveFont(brief.secondaryFontId)
        : resolveFont(brief.primaryFontId);

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
    setBrief((b) => ({
      ...b,
      primaryFontId: pFont.id,
      secondaryFontId: sFont.id,
    }));

    const textLayers = activeDoc.layers.filter((l): l is TextLayer => l.type === 'text');
    if (textLayers.length === 0) return;

    const largestId = textLayers.reduce((best, cur) =>
      cur.fontSize >= best.fontSize ? cur : best
    ).id;

    commitDocument({
      ...activeDoc,
      layers: activeDoc.layers.map((l) => {
        if (l.type !== 'text') return l;
        const chosen = l.id === largestId ? pFont : sFont;
        return { ...l, fontId: chosen.id, fontFamily: chosen.cssFamily };
      }),
    });
  };

  const handleApplyFontToSelectedOrPrimary = (font: FontOption) => {
    const selectedTexts = selectedLayers.filter((l): l is TextLayer => l.type === 'text');
    if (selectedTexts.length > 0) {
      const targetIds = new Set(selectedTexts.map((t) => t.id));
      commitDocument({
        ...activeDoc,
        layers: activeDoc.layers.map((l) =>
          targetIds.has(l.id) && l.type === 'text'
            ? { ...l, fontId: font.id, fontFamily: font.cssFamily }
            : l
        ),
      });
      return;
    }

    const firstText = activeDoc.layers.find((l): l is TextLayer => l.type === 'text');
    if (firstText) {
      commitDocument({
        ...activeDoc,
        layers: activeDoc.layers.map((l) =>
          l.id === firstText.id && l.type === 'text'
            ? { ...l, fontId: font.id, fontFamily: font.cssFamily }
            : l
        ),
      });
      setSelectedLayerIds([firstText.id]);
    }
  };

  const handleApplyPalette = (pal: ColorPalette, targetDoc: LogoDocument = activeDoc) => {
    setCustomPalette(pal);
    setBrief((b) => ({ ...b, paletteId: pal.id }));
    commitDocument({
      ...targetDoc,
      backgroundColor: pal.background,
      layers: targetDoc.layers.map((l, idx) => {
        if (l.type === 'icon') {
          const onDarkShape = targetDoc.layers.some(
            (s) => s.type === 'shape' && s.fill !== 'transparent' && s.fill !== targetDoc.backgroundColor
          );
          return {
            ...l,
            fill: onDarkShape ? pal.background : pal.primary,
            accentFill: pal.accent,
            secondaryFill: pal.secondary,
          };
        }
        if (l.type === 'shape') {
          if (l.fill === 'transparent') {
            return { ...l, stroke: idx === 0 ? pal.primary : pal.accent };
          }
          return {
            ...l,
            fill: idx === 0 ? pal.primary : pal.secondary,
            stroke: l.strokeWidth > 0 ? pal.primary : 'none',
          };
        }
        if (l.type === 'divider') {
          return { ...l, fill: pal.accent };
        }
        if (l.type === 'text' || l.type === 'path') {
          const isSmallTagline = l.type === 'text' && l.fontSize <= 22;
          return { ...l, fill: isSmallTagline ? pal.accent : pal.text };
        }
        return { ...l, fill: pal.primary };
      }),
    });
  };

  const handleApplyRemixedDocument = (remixedDoc: LogoDocument, pal: ColorPalette) => {
    setCustomPalette(pal);
    setBrief((b) => ({ ...b, paletteId: pal.id }));
    commitDocument(remixedDoc);
    setSelectedLayerIds([]);
    showEditorNotice(`Applied remix: ${remixedDoc.title}`);
  };

  const handleApplyBrandBrainstorm = (item: AiBrandBrainstormItem) => {
    setCustomPalette(item.palette);
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
    commitDocument(kit.primaryDocument);
    setPages([kit.primaryDocument]);
    setActivePageIndex(0);
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
    };

    const next = [newProject, ...projects];
    setProjects(next);
    setActiveProjectId(newProject.id);
    persistSavedProjects(next);
    persistActiveSession({
      activeProjectId: newProject.id,
      brief: newProject.brief,
      document: newProject.document,
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
    const blankDoc: LogoDocument = {
      id: nextLayerId('doc'),
      title: 'New Blank Logo',
      width: 800,
      height: 600,
      backgroundColor: '#FAF9F6',
      transparentBackground: false,
      layers: [],
    };
    setActiveProjectId(null);
    setBrief(blankBrief);
    setHistory({ past: [], present: blankDoc, future: [] });
    setPages([blankDoc]);
    setActivePageIndex(0);
    setSelectedLayerIds([]);
    setViewMode('editor');
  };

  const handleOpenProject = (project: LogoProject) => {
    setBrief(project.brief);
    setHistory({
      past: [],
      present: project.document,
      future: [],
    });
    setPages([project.document]);
    setActivePageIndex(0);
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
        present: { ...prev.present, title: trimmed },
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
    setBrief(project.brief);
    setHistory({
      past: [],
      present: project.document,
      future: [],
    });
    setActiveProjectId(project.id);
    setSelectedLayerIds([]);
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
      commitDocument(nextConcepts[0].document);
    }
    setSelectedLayerIds([]);
    setViewMode('concepts');
  };

  const handleOpenSampleFromLanding = (sampleBrief: BrandBrief, sampleDoc: LogoDocument) => {
    setActiveProjectId(null);
    setBrief(sampleBrief);
    setConcepts(generateTwelveLogoConcepts(sampleBrief));
    commitDocument(sampleDoc);
    setPages([sampleDoc]);
    setActivePageIndex(0);
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
              onUpdateDocBackground={(backgroundColor, transparentBackground) => {
                if (activeDoc.backgroundLocked) return;
                commitDocument({ ...activeDoc, backgroundColor, transparentBackground });
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
              pages={pages.map((p, idx) => ({
                id: p.id,
                title: idx === activePageIndex ? activeDoc.title : p.title,
              }))}
              activePageIndex={activePageIndex}
              onSwitchPage={handleSwitchPage}
              onAddPage={handleAddPage}
              onRemovePage={handleRemovePage}
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
    </StudioLogoProvider>
  );
}
