import React, { useEffect, useMemo, useState } from 'react';
import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignLeft,
  AlignRight,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Copy,
  Lock,
  Plus,
  Search,
  Sparkles,
  Spline,
  Trash2,
  Unlock,
} from 'lucide-react';
import { FONT_OPTIONS, FONT_PAIRINGS, VECTOR_ICONS } from '../data/logoLibrary';
import {
  ColorPalette,
  FontOption,
  FontPairing,
  LayerGradient,
  LogoDocument,
  LogoLayer,
  TextLayer,
} from '../types/logo';
import {
  batchLoadGoogleFonts,
  createDynamicGoogleFontOption,
  ensureFontOptionLoaded,
  loadGoogleFont,
} from '../utils/googleFonts';

interface EditorInspectorProps {
  doc: LogoDocument;
  activePalette: ColorPalette;
  selectedLayers: LogoLayer[];
  onUpdateLayer: (updated: LogoLayer) => void;
  onAlignSelectedLayers: (mode: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => void;
  onBatchUpdateSelected: (patch: Partial<LogoLayer>) => void;
  onApplyFontPairing: (pairing: FontPairing) => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onUpdateDocBackground: (bg: string, transparent: boolean) => void;
  onReorderLayer: (id: string, dir: 'up' | 'down') => void;
  onConvertTextToPath: (layer: TextLayer) => Promise<void>;
}

const FONT_CATEGORY_FILTERS = [
  'All',
  'Sans',
  'Serif',
  'Display',
  'Script',
  'Mono',
] as const;

const WEIGHT_LABELS: Record<number, string> = {
  300: '300 · Light',
  400: '400 · Regular',
  500: '500 · Medium',
  600: '600 · SemiBold',
  700: '700 · Bold',
  800: '800 · ExtraBold',
  900: '900 · Black',
};

function curveRadiusToBend(radius: number): number {
  if (Math.abs(radius) < 20) return 0;
  const clampedR = Math.min(320, Math.max(45, Math.abs(radius)));
  const mag = Math.round(1 + ((320 - clampedR) / 275) * 99);
  return radius > 0 ? mag : -mag;
}

function bendToCurveRadius(bend: number): number {
  if (bend === 0) return 0;
  const mag = Math.min(100, Math.max(1, Math.abs(bend)));
  const r = Math.round(320 - ((mag - 1) / 99) * 275);
  return bend > 0 ? r : -r;
}

function extractFontNameFromCss(cssFamily: string): string {
  const first = cssFamily.split(',')[0] ?? '';
  return first.replace(/['"]/g, '').trim();
}

function toInputColorHex(color?: string, fallback = '#141413'): string {
  if (!color) return fallback;
  const c = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
  if (/^#[0-9a-fA-F]{3}$/.test(c)) {
    return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
  }
  return fallback;
}

export const EditorInspector: React.FC<EditorInspectorProps> = ({
  doc,
  activePalette,
  selectedLayers,
  onUpdateLayer,
  onAlignSelectedLayers,
  onBatchUpdateSelected,
  onApplyFontPairing,
  onDuplicateSelected,
  onDeleteSelected,
  onUpdateDocBackground,
  onReorderLayer,
  onConvertTextToPath,
}) => {
  const [convertingPath, setConvertingPath] = useState(false);
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [fontSearch, setFontSearch] = useState('');
  const [fontCategory, setFontCategory] =
    useState<(typeof FONT_CATEGORY_FILTERS)[number]>('All');
  const [pairingsOpen, setPairingsOpen] = useState(false);
  const [customFonts, setCustomFonts] = useState<FontOption[]>([]);
  const [loadingCustomFont, setLoadingCustomFont] = useState(false);

  const allFonts = useMemo(
    () => [...customFonts, ...FONT_OPTIONS],
    [customFonts]
  );

  useEffect(() => {
    if (fontPickerOpen || pairingsOpen) {
      batchLoadGoogleFonts(allFonts);
    }
  }, [fontPickerOpen, pairingsOpen, allFonts]);

  const filteredFonts = useMemo(() => {
    const q = fontSearch.trim().toLowerCase();
    return allFonts.filter((f) => {
      if (fontCategory === 'Sans' && !f.category.includes('Sans') && f.category !== 'Condensed') {
        return false;
      }
      if (fontCategory === 'Serif' && f.category !== 'Editorial Serif') return false;
      if (fontCategory === 'Display' && f.category !== 'Display') return false;
      if (fontCategory === 'Script' && f.category !== 'Script') return false;
      if (fontCategory === 'Mono' && f.category !== 'Monospace') return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
      );
    });
  }, [allFonts, fontSearch, fontCategory]);

  const quickSwatches = Array.from(
    new Set([
      activePalette.primary,
      activePalette.accent,
      activePalette.secondary,
      activePalette.text,
      '#141413',
      '#FFFFFF',
    ])
  );

  const gradientPresets: Array<{
    name: string;
    startColor: string;
    endColor: string;
    midColor?: string;
    angle: number;
  }> = [
    {
      name: 'Brand Duo',
      startColor: activePalette.primary,
      endColor: activePalette.accent,
      angle: 135,
    },
    {
      name: 'Champagne Gold',
      startColor: '#8B651D',
      midColor: '#F3DC96',
      endColor: '#B8872C',
      angle: 120,
    },
    {
      name: 'Silver Chrome',
      startColor: '#525866',
      midColor: '#EAECEF',
      endColor: '#767D8C',
      angle: 135,
    },
    {
      name: 'Ember Sunset',
      startColor: '#B44B31',
      endColor: '#E89B4C',
      angle: 90,
    },
  ];

  // NO LAYER SELECTED -> ARTBOARD INSPECTOR
  if (selectedLayers.length === 0) {
    return (
      <aside className="w-full lg:w-[308px] shrink-0 border-t lg:border-t-0 lg:border-l border-[#DCD9D0] bg-[#FAF9F6] p-4 space-y-5 overflow-y-auto lg:max-h-[calc(100vh-110px)]">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5C5951]">
            Artboard Canvas
          </h2>
          <p className="mt-1 text-xs text-[#6B675E]">
            Click any layer or drag a marquee box across multiple objects to inspect typography, curved arcs, gradients, outlines, and shadows.
          </p>
        </div>

        <div className="space-y-3 border-t border-[#E6E3DA] pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#141413]">Background Color</span>
            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3F3E39] cursor-pointer">
              <input
                type="checkbox"
                checked={doc.transparentBackground}
                onChange={(e) => onUpdateDocBackground(doc.backgroundColor, e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-[#141413]"
              />
              Transparent
            </label>
          </div>

          {!doc.transparentBackground && (
            <div className="flex flex-wrap items-center gap-2">
              {quickSwatches.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => onUpdateDocBackground(hex, false)}
                  className={`h-7 w-7 rounded-md border cursor-pointer ${
                    doc.backgroundColor.toLowerCase() === hex.toLowerCase()
                      ? 'ring-2 ring-[#141413] ring-offset-1 border-black/30'
                      : 'border-black/15'
                  }`}
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
              <input
                type="color"
                value={doc.backgroundColor}
                onChange={(e) => onUpdateDocBackground(e.target.value, false)}
                aria-label="Custom artboard background color"
                className="h-7 w-8 cursor-pointer rounded border border-[#DCD9D0] bg-white p-0.5"
              />
            </div>
          )}
        </div>

        <div className="border-t border-[#E6E3DA] pt-4 text-xs text-[#5C5951] space-y-1.5">
          <div className="flex justify-between">
            <span>Canvas Size</span>
            <span className="font-mono-num font-semibold text-[#141413]">
              {doc.width} × {doc.height} px
            </span>
          </div>
          <div className="flex justify-between">
            <span>Active Layers</span>
            <span className="font-mono-num font-semibold text-[#141413]">{doc.layers.length}</span>
          </div>
        </div>
      </aside>
    );
  }

  // MULTIPLE LAYERS SELECTED -> MULTI-SELECT GROUP INSPECTOR
  if (selectedLayers.length > 1) {
    return (
      <aside className="w-full lg:w-[308px] shrink-0 border-t lg:border-t-0 lg:border-l border-[#DCD9D0] bg-[#FAF9F6] p-4 space-y-5 overflow-y-auto lg:max-h-[calc(100vh-110px)]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1B4332]">
              Multi-Select Group
            </p>
            <h2 className="text-sm font-bold text-[#141413]">
              {selectedLayers.length} Layers Selected
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onDuplicateSelected}
              className="rounded-md border border-[#DCD9D0] bg-white p-1.5 text-[#3F3E39] hover:bg-[#EFECE4] cursor-pointer"
              title="Duplicate all selected (Ctrl+D)"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDeleteSelected}
              className="rounded-md border border-[#DCD9D0] bg-white p-1.5 text-[#3F3E39] hover:bg-red-50 hover:text-red-700 cursor-pointer"
              title="Delete all selected"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-2 border-t border-[#E6E3DA] pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5C5951]">
            Align Selection
          </p>
          <div className="grid grid-cols-6 gap-1">
            <button
              type="button"
              onClick={() => onAlignSelectedLayers('left')}
              className="flex items-center justify-center rounded border border-[#DCD9D0] bg-white py-1.5 hover:bg-[#EFECE4] cursor-pointer"
              title="Align Left"
            >
              <AlignStartVertical className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onAlignSelectedLayers('center-h')}
              className="flex items-center justify-center rounded border border-[#DCD9D0] bg-white py-1.5 hover:bg-[#EFECE4] cursor-pointer"
              title="Align Center Horizontal"
            >
              <AlignCenterVertical className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onAlignSelectedLayers('right')}
              className="flex items-center justify-center rounded border border-[#DCD9D0] bg-white py-1.5 hover:bg-[#EFECE4] cursor-pointer"
              title="Align Right"
            >
              <AlignEndVertical className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onAlignSelectedLayers('top')}
              className="flex items-center justify-center rounded border border-[#DCD9D0] bg-white py-1.5 hover:bg-[#EFECE4] cursor-pointer"
              title="Align Top"
            >
              <AlignStartHorizontal className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onAlignSelectedLayers('center-v')}
              className="flex items-center justify-center rounded border border-[#DCD9D0] bg-white py-1.5 hover:bg-[#EFECE4] cursor-pointer"
              title="Align Center Vertical"
            >
              <AlignCenterHorizontal className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onAlignSelectedLayers('bottom')}
              className="flex items-center justify-center rounded border border-[#DCD9D0] bg-white py-1.5 hover:bg-[#EFECE4] cursor-pointer"
              title="Align Bottom"
            >
              <AlignEndHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-3 border-t border-[#E6E3DA] pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5C5951]">
            Batch Fill Color &amp; Opacity
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {quickSwatches.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => onBatchUpdateSelected({ fill: hex })}
                className="h-6 w-6 rounded border border-black/15 cursor-pointer"
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
            <input
              type="color"
              defaultValue={activePalette.primary}
              onChange={(e) => onBatchUpdateSelected({ fill: e.target.value })}
              className="h-6 w-7 cursor-pointer rounded border border-[#DCD9D0] bg-white p-0.5"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-medium text-[#4A4740]">
              <span>Group Opacity</span>
              <span className="font-mono-num">
                {Math.round((selectedLayers[0]?.opacity ?? 1) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={selectedLayers[0]?.opacity ?? 1}
              onChange={(e) => onBatchUpdateSelected({ opacity: Number(e.target.value) })}
              className="mt-1 w-full accent-[#141413] cursor-pointer"
            />
          </div>
        </div>
      </aside>
    );
  }

  // SINGLE LAYER INSPECTOR
  const selectedLayer = selectedLayers[0];
  const update = (patch: Partial<LogoLayer>) => {
    onUpdateLayer({ ...selectedLayer, ...patch } as LogoLayer);
  };

  const activeGradient: LayerGradient = selectedLayer.fillGradient ?? {
    enabled: false,
    type: 'linear',
    angle: 135,
    startColor: selectedLayer.fill === 'transparent' ? activePalette.primary : selectedLayer.fill,
    endColor: activePalette.accent,
  };

  const handleApplyFont = async (font: FontOption) => {
    if (selectedLayer.type !== 'text') return;
    await ensureFontOptionLoaded(font);
    const nextWeight = font.weights.includes(selectedLayer.fontWeight)
      ? selectedLayer.fontWeight
      : font.weights[font.weights.length - 1] ?? 700;
    update({
      fontId: font.id,
      fontFamily: font.cssFamily,
      fontWeight: nextWeight,
    });
    setFontPickerOpen(false);
  };

  const handleLoadCustomGoogleFont = async () => {
    const clean = fontSearch.trim();
    if (!clean || selectedLayer.type !== 'text') return;
    setLoadingCustomFont(true);
    try {
      const opt = createDynamicGoogleFontOption(clean);
      await loadGoogleFont(opt.name, opt.weights);
      setCustomFonts((prev) =>
        prev.some((p) => p.id === opt.id) ? prev : [opt, ...prev]
      );
      update({ fontId: opt.id, fontFamily: opt.cssFamily });
      setFontPickerOpen(false);
    } finally {
      setLoadingCustomFont(false);
    }
  };

  const handleConvertPath = async () => {
    if (selectedLayer.type !== 'text') return;
    setConvertingPath(true);
    try {
      await onConvertTextToPath(selectedLayer);
    } finally {
      setConvertingPath(false);
    }
  };

  const currentFontMeta =
    selectedLayer.type === 'text'
      ? allFonts.find((f) => f.id === selectedLayer.fontId) ?? {
          id: selectedLayer.fontId,
          name: extractFontNameFromCss(selectedLayer.fontFamily) || 'Custom Font',
          cssFamily: selectedLayer.fontFamily,
          category: 'Display' as const,
          weights: [400, 500, 600, 700, 800],
          ttfUrl: '',
        }
      : null;

  const bendPercent =
    selectedLayer.type === 'text' ? curveRadiusToBend(selectedLayer.curveRadius) : 0;

  return (
    <aside className="w-full lg:w-[308px] shrink-0 border-t lg:border-t-0 lg:border-l border-[#DCD9D0] bg-[#FAF9F6] p-4 space-y-5 overflow-y-auto lg:max-h-[calc(100vh-110px)]">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B675E]">
              {selectedLayer.type} layer
            </p>
            <h2 className="truncate text-sm font-bold text-[#141413]">{selectedLayer.name}</h2>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => update({ locked: !selectedLayer.locked })}
              className="rounded-md border border-[#DCD9D0] bg-white p-1.5 text-[#3F3E39] hover:bg-[#EFECE4] cursor-pointer"
              title={selectedLayer.locked ? 'Unlock' : 'Lock'}
            >
              {selectedLayer.locked ? (
                <Lock className="h-3.5 w-3.5 text-amber-700" />
              ) : (
                <Unlock className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={onDuplicateSelected}
              className="rounded-md border border-[#DCD9D0] bg-white p-1.5 text-[#3F3E39] hover:bg-[#EFECE4] cursor-pointer"
              title="Duplicate"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDeleteSelected}
              className="rounded-md border border-[#DCD9D0] bg-white p-1.5 text-[#3F3E39] hover:bg-red-50 hover:text-red-700 cursor-pointer"
              title="Delete layer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => onAlignSelectedLayers('center-h')}
            className="flex items-center justify-center rounded border border-[#DCD9D0] bg-white py-1.5 text-[#141413] hover:bg-[#EFECE4] cursor-pointer"
            title="Center Horizontally on Artboard"
          >
            <AlignCenterVertical className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onAlignSelectedLayers('center-v')}
            className="flex items-center justify-center rounded border border-[#DCD9D0] bg-white py-1.5 text-[#141413] hover:bg-[#EFECE4] cursor-pointer"
            title="Center Vertically on Artboard"
          >
            <AlignCenterHorizontal className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onReorderLayer(selectedLayer.id, 'up')}
            className="flex items-center justify-center rounded border border-[#DCD9D0] bg-white py-1.5 text-[#141413] hover:bg-[#EFECE4] cursor-pointer"
            title="Bring Forward"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onReorderLayer(selectedLayer.id, 'down')}
            className="flex items-center justify-center rounded border border-[#DCD9D0] bg-white py-1.5 text-[#141413] hover:bg-[#EFECE4] cursor-pointer"
            title="Send Backward"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* PHASE 2: ADVANCED TYPOGRAPHY PROPERTIES PANEL */}
      {selectedLayer.type === 'text' && currentFontMeta && (
        <div className="space-y-3.5 border-t border-[#E6E3DA] pt-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5C5951]">
              Typography Properties
            </p>
            <span className="text-[10px] text-[#7A756B]">Google Fonts Live</span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#4A4740]">Text Content</label>
            <textarea
              rows={2}
              value={selectedLayer.text}
              onChange={(e) => update({ text: e.target.value })}
              className="mt-1 w-full resize-none rounded-lg border border-[#DCD9D0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#141413] focus:border-[#141413] focus:outline-none"
            />
          </div>

          {/* LIVE-PREVIEW FONT FAMILY SELECTOR */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-[#4A4740]">
              Font Family
            </label>
            <button
              type="button"
              onClick={() => {
                setFontPickerOpen((o) => !o);
                setPairingsOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-[#DCD9D0] bg-white px-2.5 py-2 text-left hover:border-[#141413] cursor-pointer"
            >
              <div className="min-w-0">
                <p
                  className="truncate text-sm font-semibold text-[#141413]"
                  style={{ fontFamily: currentFontMeta.cssFamily }}
                >
                  {currentFontMeta.name}
                </p>
                <p className="text-[10px] text-[#6B675E]">{currentFontMeta.category}</p>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[#5C5951] transition-transform ${
                  fontPickerOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {fontPickerOpen && (
              <div className="rounded-lg border border-[#DCD9D0] bg-white p-2.5 space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-[#7A756B]" />
                  <input
                    type="text"
                    value={fontSearch}
                    onChange={(e) => setFontSearch(e.target.value)}
                    placeholder="Search or type any Google Font..."
                    className="w-full rounded-md border border-[#DCD9D0] bg-[#FAF9F6] pl-7 pr-2 py-1 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap gap-1">
                  {FONT_CATEGORY_FILTERS.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFontCategory(cat)}
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
                        fontCategory === cat
                          ? 'bg-[#141413] text-white'
                          : 'bg-[#F3F1EB] text-[#4A4740] hover:bg-[#E7E4DC]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {fontSearch.trim().length >= 2 &&
                  !allFonts.some(
                    (f) => f.name.toLowerCase() === fontSearch.trim().toLowerCase()
                  ) && (
                    <button
                      type="button"
                      onClick={handleLoadCustomGoogleFont}
                      disabled={loadingCustomFont}
                      className="flex w-full items-center justify-between gap-2 rounded-md border border-[#1B4332]/30 bg-[#1B4332]/5 px-2.5 py-1.5 text-left text-[11px] font-semibold text-[#1B4332] hover:bg-[#1B4332]/10 cursor-pointer"
                    >
                      <span className="truncate">
                        {loadingCustomFont
                          ? 'Loading Google Font...'
                          : `Load Google Font "${fontSearch.trim()}"`}
                      </span>
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                    </button>
                  )}

                <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5">
                  {filteredFonts.map((f) => {
                    const active = f.id === selectedLayer.fontId;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => void handleApplyFont(f)}
                        className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#141413] text-white'
                            : 'hover:bg-[#F3F1EB] text-[#141413]'
                        }`}
                      >
                        <span
                          className="truncate text-sm font-semibold"
                          style={{ fontFamily: f.cssFamily }}
                        >
                          {f.name}
                        </span>
                        <span
                          className={`text-[10px] shrink-0 ${
                            active ? 'text-white/75' : 'text-[#7A756B]'
                          }`}
                        >
                          {f.category.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                  {filteredFonts.length === 0 && (
                    <p className="py-2 text-center text-[11px] text-[#7A756B]">
                      No preset match — use the button above to load "{fontSearch.trim()}" from Google Fonts.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* CURATED FONT-PAIRING SUGGESTIONS */}
            <button
              type="button"
              onClick={() => {
                setPairingsOpen((p) => !p);
                setFontPickerOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-md border border-[#E2DFD7] bg-[#F3F1EB] px-2.5 py-1.5 text-[11px] font-semibold text-[#141413] hover:bg-[#EAE7DF] cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-[#1B4332]" />
                Curated Font-Pairing Suggestions
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  pairingsOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {pairingsOpen && (
              <div className="rounded-lg border border-[#DCD9D0] bg-white p-2 space-y-1.5 max-h-48 overflow-y-auto">
                {FONT_PAIRINGS.map((pair) => {
                  const pFont = FONT_OPTIONS.find((f) => f.id === pair.primaryFontId);
                  const sFont = FONT_OPTIONS.find((f) => f.id === pair.secondaryFontId);
                  return (
                    <button
                      key={pair.id}
                      type="button"
                      onClick={() => {
                        if (pFont) void ensureFontOptionLoaded(pFont);
                        if (sFont) void ensureFontOptionLoaded(sFont);
                        onApplyFontPairing(pair);
                      }}
                      className="flex w-full flex-col rounded-md border border-[#E6E3DA] bg-[#FAF9F6] px-2.5 py-1.5 text-left hover:border-[#141413] hover:bg-white cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-xs font-bold text-[#141413] truncate"
                          style={{ fontFamily: pFont?.cssFamily }}
                        >
                          {pair.name}
                        </span>
                        <span className="text-[10px] text-[#6B675E] shrink-0">Apply pair</span>
                      </div>
                      <span
                        className="text-[10.5px] text-[#5C5951] truncate"
                        style={{ fontFamily: sFont?.cssFamily }}
                      >
                        {pair.note}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* WEIGHT & ALIGNMENT */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-[#4A4740]">Weight</label>
              <select
                value={selectedLayer.fontWeight}
                onChange={(e) => {
                  const w = Number(e.target.value);
                  void loadGoogleFont(currentFontMeta.name, [w]);
                  update({ fontWeight: w });
                }}
                className="mt-1 w-full rounded-lg border border-[#DCD9D0] bg-white px-2 py-1.5 text-xs font-mono-num text-[#141413] focus:border-[#141413] focus:outline-none"
              >
                {[300, 400, 500, 600, 700, 800, 900].map((w) => (
                  <option key={w} value={w}>
                    {WEIGHT_LABELS[w] ?? w}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#4A4740]">Align &amp; Case</label>
              <div className="mt-1 grid grid-cols-5 gap-1">
                <button
                  type="button"
                  onClick={() => update({ textAlign: 'left' })}
                  className={`flex items-center justify-center rounded border py-1.5 cursor-pointer ${
                    selectedLayer.textAlign === 'left'
                      ? 'border-[#141413] bg-[#141413] text-white'
                      : 'border-[#DCD9D0] bg-white text-[#3F3E39]'
                  }`}
                  title="Align Left"
                >
                  <AlignLeft className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => update({ textAlign: 'center' })}
                  className={`flex items-center justify-center rounded border py-1.5 cursor-pointer ${
                    selectedLayer.textAlign === 'center'
                      ? 'border-[#141413] bg-[#141413] text-white'
                      : 'border-[#DCD9D0] bg-white text-[#3F3E39]'
                  }`}
                  title="Align Center"
                >
                  <AlignCenter className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => update({ textAlign: 'right' })}
                  className={`flex items-center justify-center rounded border py-1.5 cursor-pointer ${
                    selectedLayer.textAlign === 'right'
                      ? 'border-[#141413] bg-[#141413] text-white'
                      : 'border-[#DCD9D0] bg-white text-[#3F3E39]'
                  }`}
                  title="Align Right"
                >
                  <AlignRight className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => update({ uppercase: !selectedLayer.uppercase })}
                  className={`rounded border py-1 text-[10px] font-semibold cursor-pointer ${
                    selectedLayer.uppercase
                      ? 'border-[#141413] bg-[#141413] text-white'
                      : 'border-[#DCD9D0] bg-white text-[#3F3E39]'
                  }`}
                  title="Toggle Uppercase"
                >
                  AA
                </button>
                <button
                  type="button"
                  onClick={() =>
                    update({
                      fontStyle: selectedLayer.fontStyle === 'italic' ? 'normal' : 'italic',
                    })
                  }
                  className={`rounded border py-1 text-[10px] font-semibold italic cursor-pointer ${
                    selectedLayer.fontStyle === 'italic'
                      ? 'border-[#141413] bg-[#141413] text-white'
                      : 'border-[#DCD9D0] bg-white text-[#3F3E39]'
                  }`}
                  title="Toggle Italic"
                >
                  I
                </button>
              </div>
            </div>
          </div>

          {/* SIZE, TRACKING, LINE HEIGHT */}
          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-[11px] font-medium text-[#4A4740]">
                <span>Font Size</span>
                <span className="font-mono-num">{selectedLayer.fontSize}px</span>
              </div>
              <input
                type="range"
                min={10}
                max={160}
                value={selectedLayer.fontSize}
                onChange={(e) => update({ fontSize: Number(e.target.value) })}
                className="mt-1 w-full accent-[#141413] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-medium text-[#4A4740]">
                <span>Letter Spacing (Tracking)</span>
                <span className="font-mono-num">{selectedLayer.letterSpacing.toFixed(2)}em</span>
              </div>
              <input
                type="range"
                min={-0.08}
                max={0.5}
                step={0.01}
                value={selectedLayer.letterSpacing}
                onChange={(e) => update({ letterSpacing: Number(e.target.value) })}
                className="mt-1 w-full accent-[#141413] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-medium text-[#4A4740]">
                <span>Line Height</span>
                <span className="font-mono-num">{selectedLayer.lineHeight.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.8}
                max={2.0}
                step={0.05}
                value={selectedLayer.lineHeight}
                onChange={(e) => update({ lineHeight: Number(e.target.value) })}
                className="mt-1 w-full accent-[#141413] cursor-pointer"
              />
            </div>
          </div>

          {/* CURVED / ARC TEXT BEND SLIDER FOR BADGES & EMBLEMS */}
          <div className="rounded-lg border border-[#E2DFD7] bg-white p-2.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#141413]">
              <span>Curve / Arc Bend</span>
              <span className="font-mono-num text-[#5C5951]">
                {bendPercent === 0
                  ? 'Straight'
                  : `${bendPercent > 0 ? '+' : ''}${bendPercent}% (R=${Math.abs(selectedLayer.curveRadius)}px)`}
              </span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              step={2}
              value={bendPercent}
              onChange={(e) => {
                const nextBend = Number(e.target.value);
                update({ curveRadius: bendToCurveRadius(nextBend) });
              }}
              className="w-full accent-[#141413] cursor-pointer"
            />
            <div className="grid grid-cols-5 gap-1">
              <button
                type="button"
                onClick={() => update({ curveRadius: 85 })}
                className="rounded border border-[#DCD9D0] py-1 text-[9.5px] font-medium hover:bg-[#F3F1EB] cursor-pointer"
                title="Tight top badge arc"
              >
                Ring+
              </button>
              <button
                type="button"
                onClick={() => update({ curveRadius: 150 })}
                className="rounded border border-[#DCD9D0] py-1 text-[9.5px] font-medium hover:bg-[#F3F1EB] cursor-pointer"
              >
                Arch
              </button>
              <button
                type="button"
                onClick={() => update({ curveRadius: 0 })}
                className="rounded border border-[#DCD9D0] py-1 text-[9.5px] font-medium hover:bg-[#F3F1EB] cursor-pointer"
              >
                Flat
              </button>
              <button
                type="button"
                onClick={() => update({ curveRadius: -150 })}
                className="rounded border border-[#DCD9D0] py-1 text-[9.5px] font-medium hover:bg-[#F3F1EB] cursor-pointer"
              >
                Smile
              </button>
              <button
                type="button"
                onClick={() => update({ curveRadius: -85 })}
                className="rounded border border-[#DCD9D0] py-1 text-[9.5px] font-medium hover:bg-[#F3F1EB] cursor-pointer"
                title="Tight bottom badge arc"
              >
                Ring-
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConvertPath}
            disabled={convertingPath}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#141413] bg-white px-3 py-2 text-xs font-semibold text-[#141413] hover:bg-[#141413] hover:text-white transition-colors disabled:opacity-60 cursor-pointer"
          >
            <Spline className="h-3.5 w-3.5" />
            {convertingPath ? 'Outlining Glyphs...' : 'Convert Text to Vector Path'}
          </button>
        </div>
      )}

      {/* FILL COLOR & GRADIENT FILL CONTROLS */}
      <div className="space-y-3 border-t border-[#E6E3DA] pt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5C5951]">
            Fill &amp; Gradient
          </p>
          <div className="inline-flex rounded-md border border-[#DCD9D0] bg-[#F3F1EB] p-0.5 text-[10px] font-semibold">
            <button
              type="button"
              onClick={() =>
                update({ fillGradient: { ...activeGradient, enabled: false } })
              }
              className={`rounded px-2 py-0.5 cursor-pointer ${
                !activeGradient.enabled ? 'bg-white text-[#141413]' : 'text-[#5C5951]'
              }`}
            >
              Solid
            </button>
            <button
              type="button"
              onClick={() =>
                update({ fillGradient: { ...activeGradient, enabled: true } })
              }
              className={`rounded px-2 py-0.5 cursor-pointer ${
                activeGradient.enabled ? 'bg-white text-[#141413]' : 'text-[#5C5951]'
              }`}
            >
              Gradient
            </button>
          </div>
        </div>

        {!activeGradient.enabled ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {quickSwatches.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => update({ fill: hex })}
                className={`h-6 w-6 rounded border cursor-pointer ${
                  selectedLayer.fill.toLowerCase() === hex.toLowerCase()
                    ? 'ring-2 ring-[#141413] ring-offset-1 border-black/30'
                    : 'border-black/15'
                }`}
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
            <input
              type="color"
              value={selectedLayer.fill === 'transparent' ? '#141413' : selectedLayer.fill}
              onChange={(e) => update({ fill: e.target.value })}
              aria-label="Primary fill color"
              className="h-6 w-7 cursor-pointer rounded border border-[#DCD9D0] bg-white p-0.5"
            />
            <span className="ml-auto font-mono-num text-[10px] text-[#6B675E] uppercase">
              {selectedLayer.fill}
            </span>
          </div>
        ) : (
          <div className="rounded-lg border border-[#E2DFD7] bg-white p-2.5 space-y-2.5">
            <div className="grid grid-cols-2 gap-1.5">
              {(['linear', 'radial'] as const).map((gType) => (
                <button
                  key={gType}
                  type="button"
                  onClick={() =>
                    update({
                      fillGradient: { ...activeGradient, enabled: true, type: gType },
                    })
                  }
                  className={`rounded border py-1 text-[10px] font-semibold capitalize cursor-pointer ${
                    activeGradient.type === gType
                      ? 'border-[#141413] bg-[#141413] text-white'
                      : 'border-[#DCD9D0] bg-[#FAF9F6] text-[#3F3E39]'
                  }`}
                >
                  {gType} Gradient
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center justify-between rounded border border-[#DCD9D0] bg-[#FAF9F6] px-2 py-1 text-[10.5px] font-medium text-[#3F3E39]">
                <span>Start</span>
                <input
                  type="color"
                  value={activeGradient.startColor}
                  onChange={(e) =>
                    update({
                      fillGradient: {
                        ...activeGradient,
                        enabled: true,
                        startColor: e.target.value,
                      },
                    })
                  }
                  className="h-4 w-5 cursor-pointer border-0 bg-transparent p-0"
                />
              </label>
              <label className="flex items-center justify-between rounded border border-[#DCD9D0] bg-[#FAF9F6] px-2 py-1 text-[10.5px] font-medium text-[#3F3E39]">
                <span>End</span>
                <input
                  type="color"
                  value={activeGradient.endColor}
                  onChange={(e) =>
                    update({
                      fillGradient: {
                        ...activeGradient,
                        enabled: true,
                        endColor: e.target.value,
                      },
                    })
                  }
                  className="h-4 w-5 cursor-pointer border-0 bg-transparent p-0"
                />
              </label>
            </div>

            {activeGradient.type === 'linear' && (
              <div>
                <div className="flex justify-between text-[10.5px] font-medium text-[#4A4740]">
                  <span>Gradient Angle</span>
                  <span className="font-mono-num">{activeGradient.angle}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={15}
                  value={activeGradient.angle}
                  onChange={(e) =>
                    update({
                      fillGradient: {
                        ...activeGradient,
                        enabled: true,
                        angle: Number(e.target.value),
                      },
                    })
                  }
                  className="mt-0.5 w-full accent-[#141413] cursor-pointer"
                />
              </div>
            )}

            <div className="grid grid-cols-4 gap-1.5 pt-0.5">
              {gradientPresets.map((gp) => (
                <button
                  key={gp.name}
                  type="button"
                  onClick={() =>
                    update({
                      fillGradient: {
                        enabled: true,
                        type: 'linear',
                        angle: gp.angle,
                        startColor: gp.startColor,
                        midColor: gp.midColor,
                        endColor: gp.endColor,
                      },
                    })
                  }
                  title={gp.name}
                  className="h-6 rounded border border-black/15 cursor-pointer"
                  style={{
                    backgroundImage: gp.midColor
                      ? `linear-gradient(${gp.angle}deg, ${gp.startColor}, ${gp.midColor}, ${gp.endColor})`
                      : `linear-gradient(${gp.angle}deg, ${gp.startColor}, ${gp.endColor})`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {selectedLayer.type === 'icon' && (
          <div className="space-y-2.5 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center justify-between rounded-lg border border-[#DCD9D0] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#3F3E39]">
                <span>Accent</span>
                <input
                  type="color"
                  value={toInputColorHex(selectedLayer.accentFill, activePalette.accent)}
                  onChange={(e) => update({ accentFill: e.target.value })}
                  className="h-4 w-5 cursor-pointer border-0 bg-transparent p-0"
                />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-[#DCD9D0] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#3F3E39]">
                <span>Secondary</span>
                <input
                  type="color"
                  value={toInputColorHex(selectedLayer.secondaryFill, activePalette.secondary)}
                  onChange={(e) => update({ secondaryFill: e.target.value })}
                  className="h-4 w-5 cursor-pointer border-0 bg-transparent p-0"
                />
              </label>
            </div>

            {(() => {
              const iconDef = VECTOR_ICONS.find((ic) => ic.id === selectedLayer.iconId);
              if (!iconDef || iconDef.paths.length === 0) return null;
              return (
                <div className="rounded-lg border border-[#E2DFD7] bg-white p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#141413]">
                      SVG Paths Detected ({iconDef.paths.length})
                    </span>
                    {selectedLayer.partColors && selectedLayer.partColors.length > 0 && (
                      <button
                        type="button"
                        onClick={() => update({ partColors: undefined })}
                        className="text-[10px] font-semibold text-[#5C5951] hover:text-[#141413] cursor-pointer"
                      >
                        Reset Parts
                      </button>
                    )}
                  </div>
                  <div className="max-h-52 space-y-1.5 overflow-y-auto pr-0.5">
                    {iconDef.paths.map((p, idx) => {
                      const roleFallback =
                        p.role === 'primary'
                          ? selectedLayer.fill
                          : p.role === 'accent'
                            ? selectedLayer.accentFill
                            : p.role === 'secondary'
                              ? selectedLayer.secondaryFill
                              : '#FFFFFF';
                      const currentPartColor = selectedLayer.partColors?.[idx] || roleFallback;
                      const safeHex = toInputColorHex(currentPartColor, activePalette.primary);

                      const handleChangePart = (nextHex: string) => {
                        const base = iconDef.paths.map((defP, i) => {
                          const fb =
                            defP.role === 'primary'
                              ? selectedLayer.fill
                              : defP.role === 'accent'
                                ? selectedLayer.accentFill
                                : defP.role === 'secondary'
                                  ? selectedLayer.secondaryFill
                                  : '#FFFFFF';
                          return selectedLayer.partColors?.[i] || fb;
                        });
                        base[idx] = nextHex;
                        update({ partColors: base });
                      };

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 rounded-md border border-[#EAE7DF] bg-[#FAF9F6] px-2 py-1.5"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <svg
                              viewBox="0 0 100 100"
                              className="h-6 w-6 shrink-0 rounded border border-black/10 bg-white p-0.5"
                            >
                              {p.strokeOnly ? (
                                <path
                                  d={p.d}
                                  fill="none"
                                  stroke={currentPartColor}
                                  strokeWidth={p.strokeWidth ?? 6}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              ) : (
                                <path d={p.d} fill={currentPartColor} />
                              )}
                            </svg>
                            <div className="min-w-0">
                              <p className="truncate text-[10.5px] font-semibold text-[#141413]">
                                Part {idx + 1} · {p.role}
                              </p>
                              <p className="font-mono-num text-[9.5px] uppercase text-[#6B675E]">
                                {currentPartColor}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {[activePalette.primary, activePalette.accent, activePalette.secondary].map(
                              (sw) => (
                                <button
                                  key={sw}
                                  type="button"
                                  onClick={() => handleChangePart(sw)}
                                  className="h-4 w-4 rounded-sm border border-black/15 cursor-pointer"
                                  style={{ backgroundColor: sw }}
                                  title={`Set Part ${idx + 1} to ${sw}`}
                                />
                              )
                            )}
                            <input
                              type="color"
                              value={safeHex}
                              onChange={(e) => handleChangePart(e.target.value)}
                              aria-label={`Color for part ${idx + 1}`}
                              className="h-5 w-6 cursor-pointer rounded border border-[#DCD9D0] bg-white p-0"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {selectedLayer.type === 'shape' && selectedLayer.shapeKind === 'rounded-rect' && (
          <div>
            <div className="flex justify-between text-[11px] font-medium text-[#4A4740]">
              <span>Corner Radius</span>
              <span className="font-mono-num">{selectedLayer.cornerRadius}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={64}
              value={selectedLayer.cornerRadius}
              onChange={(e) => update({ cornerRadius: Number(e.target.value) })}
              className="mt-1 w-full accent-[#141413] cursor-pointer"
            />
          </div>
        )}

        {selectedLayer.type === 'custom-svg' && (
          <div className="space-y-2.5 pt-1">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-[#141413] cursor-pointer">
              <input
                type="checkbox"
                checked={selectedLayer.preserveOriginalColors}
                onChange={(e) => update({ preserveOriginalColors: e.target.checked })}
                className="h-3.5 w-3.5 rounded accent-[#141413]"
              />
              Enable Per-Part SVG Colors
            </label>

            <div className="rounded-lg border border-[#E2DFD7] bg-white p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[#141413]">
                  Detected SVG Parts ({selectedLayer.paths.length})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    update({
                      preserveOriginalColors: true,
                      paths: selectedLayer.paths.map((pt) => {
                        const isStroke = pt.fill === 'none';
                        return isStroke
                          ? { ...pt, stroke: selectedLayer.fill }
                          : { ...pt, fill: selectedLayer.fill };
                      }),
                    })
                  }
                  className="text-[10px] font-semibold text-[#5C5951] hover:text-[#141413] cursor-pointer"
                >
                  Apply Primary
                </button>
              </div>

              <div className="max-h-56 space-y-1.5 overflow-y-auto pr-0.5">
                {selectedLayer.paths.map((p, idx) => {
                  const isStrokePart = p.fill === 'none';
                  const activePartColor = selectedLayer.preserveOriginalColors
                    ? isStrokePart
                      ? p.stroke || selectedLayer.fill
                      : p.fill || selectedLayer.fill
                    : selectedLayer.fill;
                  const safeHex = toInputColorHex(activePartColor, activePalette.primary);

                  const handleRecolorPart = (nextHex: string) => {
                    const nextPaths = selectedLayer.paths.map((item, i) => {
                      if (i !== idx) return item;
                      if (item.fill === 'none') {
                        return { ...item, stroke: nextHex };
                      }
                      return {
                        ...item,
                        fill: nextHex,
                        stroke: item.stroke && item.stroke !== 'none' ? nextHex : item.stroke,
                      };
                    });
                    update({ preserveOriginalColors: true, paths: nextPaths });
                  };

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 rounded-md border border-[#EAE7DF] bg-[#FAF9F6] px-2 py-1.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <svg
                          viewBox={selectedLayer.viewBox}
                          className="h-6 w-6 shrink-0 rounded border border-black/10 bg-white p-0.5"
                        >
                          <path
                            d={p.d}
                            fill={isStrokePart ? 'none' : activePartColor}
                            stroke={
                              isStrokePart
                                ? activePartColor
                                : p.stroke && p.stroke !== 'none'
                                  ? p.stroke
                                  : undefined
                            }
                            strokeWidth={isStrokePart ? 2 : p.strokeWidth ? 1.5 : undefined}
                            vectorEffect="non-scaling-stroke"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="min-w-0">
                          <p className="truncate text-[10.5px] font-semibold text-[#141413]">
                            {p.label ?? `Part ${idx + 1}`} · {isStrokePart ? 'Stroke' : 'Fill'}
                          </p>
                          <p className="font-mono-num text-[9.5px] uppercase text-[#6B675E]">
                            {activePartColor}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {[activePalette.primary, activePalette.accent, activePalette.secondary].map(
                          (sw) => (
                            <button
                              key={sw}
                              type="button"
                              onClick={() => handleRecolorPart(sw)}
                              className="h-4 w-4 rounded-sm border border-black/15 cursor-pointer"
                              style={{ backgroundColor: sw }}
                              title={`Set ${p.label ?? `Part ${idx + 1}`} to ${sw}`}
                            />
                          )
                        )}
                        <input
                          type="color"
                          value={safeHex}
                          onChange={(e) => handleRecolorPart(e.target.value)}
                          aria-label={`Color for ${p.label ?? `Part ${idx + 1}`}`}
                          className="h-5 w-6 cursor-pointer rounded border border-[#DCD9D0] bg-white p-0"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* OPACITY, OUTLINE / STROKE & DROP SHADOW */}
      <div className="space-y-3 border-t border-[#E6E3DA] pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5C5951]">
          Opacity, Outline &amp; Shadow
        </p>

        <div>
          <div className="flex justify-between text-[11px] font-medium text-[#4A4740]">
            <span>Opacity</span>
            <span className="font-mono-num">{Math.round(selectedLayer.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={selectedLayer.opacity}
            onChange={(e) => update({ opacity: Number(e.target.value) })}
            className="mt-1 w-full accent-[#141413] cursor-pointer"
          />
        </div>

        <div className="rounded-lg border border-[#E2DFD7] bg-white p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <div className="flex justify-between text-[11px] font-medium text-[#4A4740]">
                <span>Outline / Stroke</span>
                <span className="font-mono-num">{selectedLayer.strokeWidth}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={16}
                step={0.5}
                value={selectedLayer.strokeWidth}
                onChange={(e) =>
                  update({
                    strokeWidth: Number(e.target.value),
                    stroke:
                      selectedLayer.stroke === 'none'
                        ? activePalette.primary
                        : selectedLayer.stroke,
                  })
                }
                className="mt-1 w-full accent-[#141413] cursor-pointer"
              />
            </div>
            <input
              type="color"
              value={
                selectedLayer.stroke === 'none'
                  ? activePalette.primary
                  : selectedLayer.stroke
              }
              onChange={(e) =>
                update({
                  stroke: e.target.value,
                  strokeWidth: selectedLayer.strokeWidth === 0 ? 2 : selectedLayer.strokeWidth,
                })
              }
              aria-label="Outline stroke color"
              className="mt-3 h-7 w-8 cursor-pointer rounded border border-[#DCD9D0] bg-white p-0.5"
            />
          </div>
          {selectedLayer.strokeWidth > 0 && (
            <button
              type="button"
              onClick={() => update({ strokeWidth: 0, stroke: 'none' })}
              className="text-[10px] font-semibold text-[#5C5951] hover:text-[#141413] cursor-pointer"
            >
              Remove outline
            </button>
          )}
        </div>

        <div className="rounded-lg border border-[#E2DFD7] bg-white p-2.5 space-y-2">
          <label className="flex items-center justify-between text-xs font-semibold text-[#141413] cursor-pointer">
            <span>Drop Shadow</span>
            <input
              type="checkbox"
              checked={selectedLayer.shadow.enabled}
              onChange={(e) =>
                update({ shadow: { ...selectedLayer.shadow, enabled: e.target.checked } })
              }
              className="h-3.5 w-3.5 rounded accent-[#141413]"
            />
          </label>

          {selectedLayer.shadow.enabled && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-[10.5px] font-medium text-[#5C5951]">
                  <span>Color</span>
                  <input
                    type="color"
                    value={
                      selectedLayer.shadow.color.startsWith('#')
                        ? selectedLayer.shadow.color
                        : '#111827'
                    }
                    onChange={(e) =>
                      update({
                        shadow: { ...selectedLayer.shadow, color: e.target.value },
                      })
                    }
                    aria-label="Drop shadow color"
                    className="h-5 w-7 cursor-pointer rounded border border-[#DCD9D0] bg-white p-0.5"
                  />
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      update({
                        shadow: {
                          enabled: true,
                          color: 'rgba(17, 24, 39, 0.24)',
                          blur: 10,
                          offsetX: 0,
                          offsetY: 5,
                        },
                      })
                    }
                    className="rounded border border-[#DCD9D0] px-1.5 py-0.5 text-[9.5px] font-medium hover:bg-[#F3F1EB] cursor-pointer"
                  >
                    Soft
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      update({
                        shadow: {
                          enabled: true,
                          color: '#141413',
                          blur: 0,
                          offsetX: 3,
                          offsetY: 3,
                        },
                      })
                    }
                    className="rounded border border-[#DCD9D0] px-1.5 py-0.5 text-[9.5px] font-medium hover:bg-[#F3F1EB] cursor-pointer"
                  >
                    Crisp
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <label className="text-[10px] text-[#5C5951]">
                  Blur
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={selectedLayer.shadow.blur}
                    onChange={(e) =>
                      update({
                        shadow: { ...selectedLayer.shadow, blur: Number(e.target.value) || 0 },
                      })
                    }
                    className="font-mono-num mt-0.5 w-full rounded border border-[#DCD9D0] px-1.5 py-1 text-xs text-[#141413]"
                  />
                </label>
                <label className="text-[10px] text-[#5C5951]">
                  Offset X
                  <input
                    type="number"
                    min={-30}
                    max={30}
                    value={selectedLayer.shadow.offsetX}
                    onChange={(e) =>
                      update({
                        shadow: {
                          ...selectedLayer.shadow,
                          offsetX: Number(e.target.value) || 0,
                        },
                      })
                    }
                    className="font-mono-num mt-0.5 w-full rounded border border-[#DCD9D0] px-1.5 py-1 text-xs text-[#141413]"
                  />
                </label>
                <label className="text-[10px] text-[#5C5951]">
                  Offset Y
                  <input
                    type="number"
                    min={-30}
                    max={30}
                    value={selectedLayer.shadow.offsetY}
                    onChange={(e) =>
                      update({
                        shadow: {
                          ...selectedLayer.shadow,
                          offsetY: Number(e.target.value) || 0,
                        },
                      })
                    }
                    className="font-mono-num mt-0.5 w-full rounded border border-[#DCD9D0] px-1.5 py-1 text-xs text-[#141413]"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TRANSFORM COORDINATES */}
      <div className="space-y-2 border-t border-[#E6E3DA] pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5C5951]">
          Transform
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ['X', 'x'],
              ['Y', 'y'],
              ['Rot°', 'rotation'],
              ['W', 'width'],
              ['H', 'height'],
            ] as const
          ).map(([label, key]) => (
            <label key={key} className="text-[10px] font-medium text-[#5C5951]">
              {label}
              <input
                type="number"
                value={Math.round(selectedLayer[key])}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (Number.isFinite(val)) {
                    update({
                      [key]: key === 'width' || key === 'height' ? Math.max(12, val) : val,
                    });
                  }
                }}
                className="font-mono-num mt-0.5 w-full rounded border border-[#DCD9D0] bg-white px-2 py-1 text-xs text-[#141413]"
              />
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
};
