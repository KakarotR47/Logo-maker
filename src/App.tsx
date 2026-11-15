import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Moon, Sun } from 'lucide-react';
import { BrandBriefGrid } from './components/BrandBriefGrid';
import { BrandKitView } from './components/BrandKitView';
import { TracedSymbolPayload } from './components/AiMagicPanel';
import { EditorLeftSidebar, UploadedSvgEntry } from './components/EditorLeftSidebar';
import { ExportModal } from './components/ExportModal';
import { LandingView } from './components/LandingView';
import { LogoCanvasEditor } from './components/LogoCanvasEditor';
import { LogoWizardModal } from './components/LogoWizardModal';
import { MockupPreviewView } from './components/MockupPreviewView';
import { ProjectsDashboard } from './components/ProjectsDashboard';
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
  TextLayer,
} from './types/logo';
import { PlanTier } from './types/monetization';
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
import { parseUploadedSvgToLayer } from './utils/svgExport';
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
  const [wizardOpen, setWizardOpen] = useState<boolean>(false);
  const [variationsOpen, setVariationsOpen] = useState<boolean>(false);
  const [generatedVariations, setGeneratedVariations] = useState<LogoVariationEntry[]>([]);
  const [recolorStep, setRecolorStep] = useState<number>(0);
  const [incomingLogoNonce, setIncomingLogoNonce] = useState<number>(0);

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

  const activeDoc = history.present;
  const activePalette = useMemo(() => resolvePalette(brief.paletteId), [brief.paletteId]);
  const selectedLayers = useMemo(
    () => activeDoc.layers.filter((l) => selectedLayerIds.includes(l.id)),
    [activeDoc.layers, selectedLayerIds]
  );
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

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

  const handleApplyPalette = (pal: ColorPalette) => {
    setBrief((b) => ({ ...b, paletteId: pal.id }));
    commitDocument({
      ...activeDoc,
      backgroundColor: pal.background,
      layers: activeDoc.layers.map((l, idx) => {
        if (l.type === 'icon') {
          const onDarkShape = activeDoc.layers.some(
            (s) => s.type === 'shape' && s.fill !== 'transparent' && s.fill !== activeDoc.backgroundColor
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

  const handleConvertTextToPath = async (layer: TextLayer) => {
    const pathLayer = await convertTextLayerToPath(layer);
    commitDocument({
      ...activeDoc,
      layers: activeDoc.layers.map((l) => (l.id === layer.id ? pathLayer : l)),
    });
    setSelectedLayerIds([pathLayer.id]);
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
      {viewMode === 'landing' ? (
        <>
          <LandingView
            initialBrandName={brief.businessName === DEFAULT_BRAND_BRIEF.businessName ? '' : brief.businessName}
            savedProjectsCount={projects.length}
            onStartWithBrandName={handleStartFromLanding}
            onOpenBlankEditor={() => setViewMode('editor')}
            onOpenSampleInEditor={handleOpenSampleFromLanding}
            onOpenProjects={() => setViewMode('projects')}
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
        <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#0F1117] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Sleek Studio Top Navigation Header */}
      <header className="border-b border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#161822]">
        <div className="mx-auto flex max-w-[1600px] flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-5 px-4 sm:px-5 py-2.5">
          <div className="flex items-center justify-between gap-3 md:contents">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setViewMode('landing')}
                title="Return to Forma Studio Home"
                className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                Forma Studio
              </button>
              <span
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] px-2.5 py-0.5 text-[10.5px] font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap"
                title="Changes auto-save locally to your browser"
              >
                {autoSaveState === 'saving' ? 'Saving…' : 'Saved'}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0 md:order-3">
              <button
                type="button"
                onClick={() => setStudioTheme((t) => (t === 'light' ? 'dark' : 'light'))}
                title={studioTheme === 'light' ? 'Switch to Dark Studio Theme' : 'Switch to Light Studio Theme'}
                aria-label="Toggle Light/Dark Studio Theme"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 shadow-xs transition-colors cursor-pointer"
              >
                {studioTheme === 'light' ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#1B4332] via-[#245942] to-[#2D6A4F] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-110 transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Export Logo
              </button>
            </div>
          </div>

          <nav className="flex items-center gap-4 sm:gap-5 lg:gap-6 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 overflow-x-auto pb-0.5 md:pb-0 md:order-2">
            {(
              [
                { id: 'editor', label: 'Canvas Editor' },
                { id: 'concepts', label: 'Logo Generator' },
                {
                  id: 'projects',
                  label: projects.length > 0 ? `My Projects (${projects.length})` : 'My Projects',
                },
                { id: 'mockups', label: 'Preview Mockups' },
                { id: 'brandkit', label: 'Brand Kit' },
                { id: 'cards', label: 'Visiting Cards DB' },
              ] as const
            ).map((item) => {
              const active = viewMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setViewMode(item.id)}
                  className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'border-[#1B4332] dark:border-emerald-400 font-semibold text-slate-900 dark:text-white'
                      : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
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
            onAddText={handleAddText}
            onApplyFontPairing={handleApplyFontPairing}
            onApplyFontToSelectedOrPrimary={handleApplyFontToSelectedOrPrimary}
            onApplyPalette={handleApplyPalette}
            onMagicRecolor={handleMagicRecolor}
            onOpenVariations={handleOpenVariations}
            onSwitchLayout={handleSwitchLayout}
            onSwitchStyle={handleSwitchStyle}
            onToggleLayerVisible={handleToggleLayerVisible}
            onToggleLayerLock={handleToggleLayerLock}
            onReorderLayer={handleReorderLayer}
            onDuplicateLayer={handleDuplicateLayer}
            onDeleteLayer={handleDeleteLayer}
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
              onApplyFontPairing={handleApplyFontPairing}
              onReorderLayer={handleReorderLayer}
              onConvertTextToPath={handleConvertTextToPath}
              onUpdateDocBackground={(backgroundColor, transparentBackground) =>
                commitDocument({ ...activeDoc, backgroundColor, transparentBackground })
              }
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
            />
          </div>
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
    </StudioLogoProvider>
  );
}
