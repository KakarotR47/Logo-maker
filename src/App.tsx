import React, { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { BrandBriefGrid } from './components/BrandBriefGrid';
import { BrandKitView } from './components/BrandKitView';
import { EditorInspector } from './components/EditorInspector';
import { EditorLeftSidebar } from './components/EditorLeftSidebar';
import { ExportModal } from './components/ExportModal';
import { LogoCanvasEditor } from './components/LogoCanvasEditor';
import { LogoWizardModal } from './components/LogoWizardModal';
import { MockupPreviewView } from './components/MockupPreviewView';
import { VisitingCardAtelier } from './components/VisitingCardAtelier';
import {
  DEFAULT_BRAND_BRIEF,
  VECTOR_ICONS,
} from './data/logoLibrary';
import {
  BrandBrief,
  ColorPalette,
  DividerKind,
  FontOption,
  FontPairing,
  LayoutArchetype,
  LogoConcept,
  LogoDocument,
  LogoLayer,
  LogoStylePreset,
  SavedBrandKit,
  ShapeKind,
  StudioViewMode,
  TextLayer,
} from './types/logo';
import { loadGoogleFont } from './utils/googleFonts';
import {
  buildDocumentForArchetype,
  extractBrandVariants,
  generateTwelveLogoConcepts,
  nextLayerId,
  resolveFont,
  resolvePalette,
} from './utils/logoGenerator';
import { parseUploadedSvgToLayer } from './utils/svgExport';
import { convertTextLayerToPath } from './utils/textToPath';

const BRAND_KITS_KEY = 'forma-logo-brand-kits-v1';

interface HistoryState {
  past: LogoDocument[];
  present: LogoDocument;
  future: LogoDocument[];
}

export default function App() {
  const [viewMode, setViewMode] = useState<StudioViewMode>('editor');
  const [brief, setBrief] = useState<BrandBrief>(DEFAULT_BRAND_BRIEF);
  const [concepts, setConcepts] = useState<LogoConcept[]>(() =>
    generateTwelveLogoConcepts(DEFAULT_BRAND_BRIEF)
  );

  const [history, setHistory] = useState<HistoryState>(() => ({
    past: [],
    present: buildDocumentForArchetype(DEFAULT_BRAND_BRIEF, 'icon-left'),
    future: [],
  }));

  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [exportOpen, setExportOpen] = useState<boolean>(false);
  const [wizardOpen, setWizardOpen] = useState<boolean>(false);
  const [incomingLogoNonce, setIncomingLogoNonce] = useState<number>(0);

  const [savedKits, setSavedKits] = useState<SavedBrandKit[]>(() => {
    try {
      const raw = localStorage.getItem(BRAND_KITS_KEY);
      return raw ? (JSON.parse(raw) as SavedBrandKit[]) : [];
    } catch {
      return [];
    }
  });

  const activeDoc = history.present;
  const activePalette = useMemo(() => resolvePalette(brief.paletteId), [brief.paletteId]);
  const selectedLayers = useMemo(
    () => activeDoc.layers.filter((l) => selectedLayerIds.includes(l.id)),
    [activeDoc.layers, selectedLayerIds]
  );

  // Dynamically ensure every Google Font used on the active canvas is loaded
  useEffect(() => {
    activeDoc.layers.forEach((layer) => {
      if (layer.type === 'text') {
        const family = layer.fontFamily.split(',')[0]?.replace(/['"]/g, '').trim();
        if (family) {
          void loadGoogleFont(family, [layer.fontWeight, 400, 700]);
        }
      }
    });
  }, [activeDoc.layers]);

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

  const handleUploadCustomSvg = (svgText: string, fileName: string) => {
    const layer = parseUploadedSvgToLayer(svgText, fileName, activePalette.primary, {
      x: activeDoc.width / 2,
      y: activeDoc.height / 2,
    });
    commitDocument({ ...activeDoc, layers: [...activeDoc.layers, layer] });
    setSelectedLayerIds([layer.id]);
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

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F3EF] text-[#141413]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="border-b border-[#DCD9D0] bg-[#FAF9F6]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-4 sm:px-6 py-3">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setViewMode('editor')}
            className="font-display text-xl font-bold tracking-tight text-[#141413] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Forma Studio
          </button>

          {/* Zone 2: Concise Navigation Links */}
          <nav className="flex items-center gap-5 sm:gap-6 text-xs sm:text-sm font-medium text-[#55524B] overflow-x-auto">
            {(
              [
                { id: 'editor', label: 'Canvas Editor' },
                { id: 'concepts', label: 'Logo Generator' },
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
                      ? 'border-[#141413] font-semibold text-[#141413]'
                      : 'border-transparent hover:text-[#141413]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action CTA */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#141413] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2A2926] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Export Logo
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      {viewMode === 'editor' && (
        <main className="flex flex-1 flex-col lg:flex-row min-h-0">
          <EditorLeftSidebar
            doc={activeDoc}
            activePalette={activePalette}
            activeStyle={brief.style}
            selectedLayerIds={selectedLayerIds}
            onSelectLayers={setSelectedLayerIds}
            onAddIcon={handleAddIcon}
            onAddShape={handleAddShape}
            onAddDivider={handleAddDivider}
            onUploadCustomSvg={handleUploadCustomSvg}
            onAddText={handleAddText}
            onApplyFontPairing={handleApplyFontPairing}
            onApplyFontToSelectedOrPrimary={handleApplyFontToSelectedOrPrimary}
            onApplyPalette={handleApplyPalette}
            onSwitchLayout={handleSwitchLayout}
            onSwitchStyle={handleSwitchStyle}
            onToggleLayerVisible={handleToggleLayerVisible}
            onToggleLayerLock={handleToggleLayerLock}
            onReorderLayer={handleReorderLayer}
            onDuplicateLayer={handleDuplicateLayer}
            onDeleteLayer={handleDeleteLayer}
          />

          <LogoCanvasEditor
            doc={activeDoc}
            activePalette={activePalette}
            selectedLayerIds={selectedLayerIds}
            onSelectLayers={setSelectedLayerIds}
            onPreviewLayersChange={handlePreviewLayersChange}
            onCommitLayersChange={handleCommitLayersChange}
            onUpdateTextLive={handleUpdateTextLive}
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
          />

          <EditorInspector
            doc={activeDoc}
            activePalette={activePalette}
            selectedLayers={selectedLayers}
            onUpdateLayer={handleUpdateLayer}
            onAlignSelectedLayers={handleAlignSelectedLayers}
            onBatchUpdateSelected={handleBatchUpdateSelected}
            onApplyFontPairing={handleApplyFontPairing}
            onDuplicateSelected={handleDuplicateSelected}
            onDeleteSelected={handleDeleteSelected}
            onUpdateDocBackground={(backgroundColor, transparentBackground) =>
              commitDocument({ ...activeDoc, backgroundColor, transparentBackground })
            }
            onReorderLayer={handleReorderLayer}
            onConvertTextToPath={handleConvertTextToPath}
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
          <VisitingCardAtelier
            activeCanvasDoc={activeDoc}
            incomingLogoNonce={incomingLogoNonce}
          />
        </main>
      )}

      <LogoWizardModal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        brief={brief}
        setBrief={setBrief}
        onGenerate={handleWizardGenerate}
      />

      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        doc={activeDoc}
        brief={brief}
        palette={activePalette}
      />
    </div>
  );
}
