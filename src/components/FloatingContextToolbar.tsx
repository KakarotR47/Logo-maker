import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Bold,
  ChevronDown,
  Copy,
  CreditCard,
  Crop,
  FlipHorizontal2,
  FlipVertical2,
  Italic,
  Layers,
  Lock,
  Minus,
  Paintbrush,
  Palette,
  PenTool,
  Plus,
  Redo2,
  Search,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Spline,
  Trash2,
  Type,
  Undo2,
  Unlock,
  Wand2,
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

type ContextPopoverId =
  | 'canvas-bg'
  | 'text-edit'
  | 'font'
  | 'fill'
  | 'stroke'
  | 'flip'
  | 'crop'
  | 'opacity'
  | 'effects'
  | 'position'
  | 'multi-align'
  | 'multi-fill'
  | 'multi-opacity';

interface FloatingContextToolbarProps {
  doc: LogoDocument;
  activePalette: ColorPalette;
  selectedLayers: LogoLayer[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onUpdateLayer: (updated: LogoLayer) => void;
  onAlignSelectedLayers: (mode: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => void;
  onBatchUpdateSelected: (patch: Partial<LogoLayer>) => void;
  onApplyFontPairing: (pairing: FontPairing) => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onUpdateDocBackground: (bg: string, transparent: boolean) => void;
  onResizeArtboard: (width: number, height: number) => void;
  onReorderLayer: (id: string, dir: 'up' | 'down') => void;
  onConvertTextToPath: (layer: TextLayer) => Promise<void>;
  onMagicRecolor?: () => void;
  onOpenVariations?: () => void;
  onOpenWizard?: () => void;
  onSendToVisitingCard?: () => void;
}

const FONT_CATEGORY_FILTERS = ['All', 'Sans', 'Serif', 'Display', 'Script', 'Mono'] as const;

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

export const FloatingContextToolbar: React.FC<FloatingContextToolbarProps> = ({
  doc,
  activePalette,
  selectedLayers,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onUpdateLayer,
  onAlignSelectedLayers,
  onBatchUpdateSelected,
  onApplyFontPairing,
  onDuplicateSelected,
  onDeleteSelected,
  onUpdateDocBackground,
  onResizeArtboard,
  onReorderLayer,
  onConvertTextToPath,
  onMagicRecolor,
  onOpenVariations,
  onOpenWizard,
  onSendToVisitingCard,
}) => {
  const [openPopover, setOpenPopover] = useState<ContextPopoverId | null>(null);
  const [convertingPath, setConvertingPath] = useState(false);
  const [fontSearch, setFontSearch] = useState('');
  const [fontCategory, setFontCategory] =
    useState<(typeof FONT_CATEGORY_FILTERS)[number]>('All');
  const [showPairingsInFont, setShowPairingsInFont] = useState(false);
  const [customFonts, setCustomFonts] = useState<FontOption[]>([]);
  const [loadingCustomFont, setLoadingCustomFont] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const selectionSignature = selectedLayers.map((l) => l.id).join(',');

  // Reset open popover if selected layer changes completely
  useEffect(() => {
    setOpenPopover(null);
  }, [selectionSignature]);

  // Close open popover when clicking outside toolbar or pressing Escape
  useEffect(() => {
    if (!openPopover) return;
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenPopover(null);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPopover(null);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [openPopover]);

  const allFonts = useMemo(() => [...customFonts, ...FONT_OPTIONS], [customFonts]);

  useEffect(() => {
    if (openPopover === 'font') {
      batchLoadGoogleFonts(allFonts);
    }
  }, [openPopover, allFonts]);

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
      return f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q);
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

  const togglePopover = (id: ContextPopoverId) => {
    setOpenPopover((prev) => (prev === id ? null : id));
  };

  const singleLayer = selectedLayers.length === 1 ? selectedLayers[0] : null;
  const isText = singleLayer?.type === 'text';

  const toolBtnBase =
    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0';
  const toolBtnDefault =
    'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#252836]';
  const toolBtnActive =
    'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white';
  const dividerClass = 'h-5 w-px bg-[#E2E8F0] dark:bg-[#2A2D3D] shrink-0';
  const popoverClass =
    'absolute left-0 top-full mt-2 z-50 rounded-2xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#181A24] p-3.5 shadow-xl text-slate-900 dark:text-slate-100 max-w-[calc(100vw-24px)]';

  const renderUndoRedo = (
    <div className="flex items-center gap-0.5 shrink-0">
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl/Cmd+Z)"
        className="rounded-lg p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#252836] disabled:opacity-35 cursor-pointer"
        aria-label="Undo"
      >
        <Undo2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl/Cmd+Shift+Z)"
        className="rounded-lg p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#252836] disabled:opacity-35 cursor-pointer"
        aria-label="Redo"
      >
        <Redo2 className="h-4 w-4" />
      </button>
    </div>
  );

  // =========================================================================
  // STATE 1: NO LAYER SELECTED -> ARTBOARD CONTEXT BAR
  // =========================================================================
  if (selectedLayers.length === 0) {
    return (
      <div
        ref={containerRef}
        className="relative z-30 mx-auto flex w-fit max-w-full flex-wrap items-center gap-1.5 rounded-2xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white/95 dark:bg-[#181A24]/95 px-2.5 py-1.5 shadow-sm backdrop-blur-md"
      >
        {renderUndoRedo}
        <span className={dividerClass} aria-hidden="true" />

        {/* Canvas Background Swatch Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => togglePopover('canvas-bg')}
            className={`${toolBtnBase} ${
              openPopover === 'canvas-bg' ? toolBtnActive : toolBtnDefault
            }`}
            title="Canvas Background Color"
          >
            <span
              className="h-4 w-4 rounded-full border border-black/20 dark:border-white/25 shrink-0"
              style={{
                backgroundImage: doc.transparentBackground
                  ? 'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)'
                  : 'none',
                backgroundSize: doc.transparentBackground ? '8px 8px' : 'auto',
                backgroundPosition: doc.transparentBackground
                  ? '0 0, 0 4px, 4px -4px, -4px 0'
                  : '0 0',
                backgroundColor: doc.transparentBackground ? '#ffffff' : doc.backgroundColor,
              }}
            />
            <span>Background</span>
          </button>

          {openPopover === 'canvas-bg' && (
            <div className={`${popoverClass} w-64 space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Artboard Background</span>
                <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={doc.transparentBackground}
                    onChange={(e) => onUpdateDocBackground(doc.backgroundColor, e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-[#1B4332]"
                  />
                  Transparent
                </label>
              </div>
              {!doc.transparentBackground && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {quickSwatches.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => onUpdateDocBackground(hex, false)}
                      className={`h-7 w-7 rounded-lg border cursor-pointer ${
                        doc.backgroundColor.toLowerCase() === hex.toLowerCase()
                          ? 'ring-2 ring-emerald-600 ring-offset-1 border-black/30'
                          : 'border-black/15 dark:border-white/15'
                      }`}
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                  <input
                    type="color"
                    value={doc.backgroundColor}
                    onChange={(e) => onUpdateDocBackground(e.target.value, false)}
                    aria-label="Custom background hex"
                    className="h-7 w-8 cursor-pointer rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] bg-transparent p-0.5"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Artboard Size */}
        <select
          value={`${doc.width}x${doc.height}`}
          onChange={(e) => {
            const [w, h] = e.target.value.split('x').map(Number);
            onResizeArtboard(w, h);
          }}
          aria-label="Artboard size preset"
          className="rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] px-2 py-1 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer"
        >
          <option value="800x600">800×600 Logo</option>
          <option value="800x800">800×800 Square</option>
          <option value="1050x600">1050×600 Card</option>
        </select>

        <span className={dividerClass} aria-hidden="true" />

        {onMagicRecolor && (
          <button
            type="button"
            onClick={onMagicRecolor}
            title={`Shuffle ${activePalette.name} across shapes, icons & text`}
            className={`${toolBtnBase} ${toolBtnDefault}`}
          >
            <Shuffle className="h-3.5 w-3.5 text-[#1B4332] dark:text-emerald-400" />
            <span>Magic Recolor</span>
          </button>
        )}

        {onOpenVariations && (
          <button
            type="button"
            onClick={onOpenVariations}
            title="Duplicate into Full Color, All-White, Monochrome & Icon-Only"
            className={`${toolBtnBase} ${toolBtnDefault}`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>4 Variations</span>
          </button>
        )}

        {onOpenWizard && (
          <button
            type="button"
            onClick={onOpenWizard}
            className={`${toolBtnBase} ${toolBtnDefault}`}
          >
            <Wand2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logo Wizard</span>
          </button>
        )}

        {onSendToVisitingCard && (
          <button
            type="button"
            onClick={onSendToVisitingCard}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-110 cursor-pointer whitespace-nowrap shrink-0"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Put Logo on Card</span>
            <span className="sm:hidden">Card</span>
          </button>
        )}
      </div>
    );
  }

  // =========================================================================
  // STATE 2: MULTI-SELECT CONTEXT BAR
  // =========================================================================
  if (selectedLayers.length > 1) {
    return (
      <div
        ref={containerRef}
        className="relative z-30 mx-auto flex w-fit max-w-full flex-wrap items-center gap-1.5 rounded-2xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white/95 dark:bg-[#181A24]/95 px-2.5 py-1.5 shadow-sm backdrop-blur-md"
      >
        {renderUndoRedo}
        <span className={dividerClass} aria-hidden="true" />

        <span className="px-2 py-1 text-xs font-semibold text-[#1B4332] dark:text-emerald-400">
          {selectedLayers.length} layers
        </span>

        {/* Batch Fill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => togglePopover('multi-fill')}
            className={`${toolBtnBase} ${
              openPopover === 'multi-fill' ? toolBtnActive : toolBtnDefault
            }`}
          >
            <Palette className="h-3.5 w-3.5" />
            <span>Batch Color</span>
          </button>
          {openPopover === 'multi-fill' && (
            <div className={`${popoverClass} w-60 space-y-2.5`}>
              <p className="text-xs font-semibold">Recolor Selected Layers</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {quickSwatches.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => onBatchUpdateSelected({ fill: hex })}
                    className="h-7 w-7 rounded-lg border border-black/15 cursor-pointer"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
                <input
                  type="color"
                  defaultValue={activePalette.primary}
                  onChange={(e) => onBatchUpdateSelected({ fill: e.target.value })}
                  className="h-7 w-8 cursor-pointer rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] p-0.5"
                />
              </div>
            </div>
          )}
        </div>

        {/* Multi Align */}
        <div className="relative">
          <button
            type="button"
            onClick={() => togglePopover('multi-align')}
            className={`${toolBtnBase} ${
              openPopover === 'multi-align' ? toolBtnActive : toolBtnDefault
            }`}
          >
            <AlignCenterVertical className="h-3.5 w-3.5" />
            <span>Align</span>
          </button>
          {openPopover === 'multi-align' && (
            <div className={`${popoverClass} w-60 space-y-2`}>
              <p className="text-xs font-semibold">Align Selection</p>
              <div className="grid grid-cols-6 gap-1">
                {(
                  [
                    ['left', AlignStartVertical, 'Align Left'],
                    ['center-h', AlignCenterVertical, 'Center H'],
                    ['right', AlignEndVertical, 'Align Right'],
                    ['top', AlignStartHorizontal, 'Align Top'],
                    ['center-v', AlignCenterHorizontal, 'Center V'],
                    ['bottom', AlignEndHorizontal, 'Align Bottom'],
                  ] as const
                ).map(([mode, Icon, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onAlignSelectedLayers(mode)}
                    title={label}
                    className="flex items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] py-1.5 hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Group Opacity */}
        <div className="relative">
          <button
            type="button"
            onClick={() => togglePopover('multi-opacity')}
            className={`${toolBtnBase} ${
              openPopover === 'multi-opacity' ? toolBtnActive : toolBtnDefault
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{Math.round((selectedLayers[0]?.opacity ?? 1) * 100)}%</span>
          </button>
          {openPopover === 'multi-opacity' && (
            <div className={`${popoverClass} w-56 space-y-2`}>
              <div className="flex justify-between text-xs font-medium">
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
                className="w-full accent-[#1B4332] dark:accent-emerald-500 cursor-pointer"
              />
            </div>
          )}
        </div>

        <span className={dividerClass} aria-hidden="true" />

        <button
          type="button"
          onClick={onDuplicateSelected}
          title="Duplicate selected (Ctrl/Cmd+D)"
          className={`${toolBtnBase} ${toolBtnDefault}`}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDeleteSelected}
          title="Delete selected"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // =========================================================================
  // STATE 3: SINGLE LAYER SELECTED (TEXT vs SHAPE/ICON/CUSTOM-SVG/DIVIDER/PATH)
  // =========================================================================
  if (!singleLayer) return null;

  const update = (patch: Partial<LogoLayer>) => {
    onUpdateLayer({ ...singleLayer, ...patch } as LogoLayer);
  };

  const activeGradient: LayerGradient = singleLayer.fillGradient ?? {
    enabled: false,
    type: 'linear',
    angle: 135,
    startColor: singleLayer.fill === 'transparent' ? activePalette.primary : singleLayer.fill,
    endColor: activePalette.accent,
  };

  const handleApplyFont = async (font: FontOption) => {
    if (singleLayer.type !== 'text') return;
    await ensureFontOptionLoaded(font);
    const nextWeight = font.weights.includes(singleLayer.fontWeight)
      ? singleLayer.fontWeight
      : font.weights[font.weights.length - 1] ?? 700;
    update({
      fontId: font.id,
      fontFamily: font.cssFamily,
      fontWeight: nextWeight,
    });
    setOpenPopover(null);
  };

  const handleLoadCustomGoogleFont = async () => {
    const clean = fontSearch.trim();
    if (!clean || singleLayer.type !== 'text') return;
    setLoadingCustomFont(true);
    try {
      const opt = createDynamicGoogleFontOption(clean);
      await loadGoogleFont(opt.name, opt.weights);
      setCustomFonts((prev) =>
        prev.some((p) => p.id === opt.id) ? prev : [opt, ...prev]
      );
      update({ fontId: opt.id, fontFamily: opt.cssFamily });
      setOpenPopover(null);
    } finally {
      setLoadingCustomFont(false);
    }
  };

  const handleConvertPath = async () => {
    if (singleLayer.type !== 'text') return;
    setConvertingPath(true);
    try {
      await onConvertTextToPath(singleLayer);
      setOpenPopover(null);
    } finally {
      setConvertingPath(false);
    }
  };

  const currentFontMeta =
    singleLayer.type === 'text'
      ? allFonts.find((f) => f.id === singleLayer.fontId) ?? {
          id: singleLayer.fontId,
          name: extractFontNameFromCss(singleLayer.fontFamily) || 'Custom Font',
          cssFamily: singleLayer.fontFamily,
          category: 'Display' as const,
          weights: [400, 500, 600, 700, 800],
          ttfUrl: '',
        }
      : null;

  const bendPercent =
    singleLayer.type === 'text' ? curveRadiusToBend(singleLayer.curveRadius) : 0;

  const applyAspectCrop = (ratioW: number, ratioH: number) => {
    const cx = singleLayer.x + singleLayer.width / 2;
    const cy = singleLayer.y + singleLayer.height / 2;
    const nextW = singleLayer.width;
    const nextH = Math.max(20, Math.round((nextW * ratioH) / ratioW));
    update({
      width: nextW,
      height: nextH,
      x: Math.round(cx - nextW / 2),
      y: Math.round(cy - nextH / 2),
    });
  };

  const fitIntoSafeZone = () => {
    const mx = doc.width * 0.08;
    const my = doc.height * 0.08;
    const maxW = doc.width - mx * 2;
    const maxH = doc.height - my * 2;
    let w = singleLayer.width;
    let h = singleLayer.height;
    if (w > maxW || h > maxH) {
      const scale = Math.min(maxW / Math.max(1, w), maxH / Math.max(1, h));
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    const clampedX = Math.max(mx, Math.min(doc.width - mx - w, singleLayer.x));
    const clampedY = Math.max(my, Math.min(doc.height - my - h, singleLayer.y));
    update({
      x: Math.round(clampedX),
      y: Math.round(clampedY),
      width: w,
      height: h,
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative z-30 mx-auto flex w-fit max-w-full flex-wrap items-center gap-1 rounded-2xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white/95 dark:bg-[#181A24]/95 px-2.5 py-1.5 shadow-sm backdrop-blur-md"
    >
      {renderUndoRedo}
      <span className={dividerClass} aria-hidden="true" />

      {/* ================================================================= */}
      {/* TEXT CONTEXTUAL CONTROLS: Font, Size, Color, Bold, Italic, Effects */}
      {/* ================================================================= */}
      {isText && singleLayer.type === 'text' && currentFontMeta && (
        <>
          {/* Edit Text Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => togglePopover('text-edit')}
              className={`${toolBtnBase} ${
                openPopover === 'text-edit' ? toolBtnActive : toolBtnDefault
              }`}
              title="Edit text content & alignment"
            >
              <Type className="h-3.5 w-3.5" />
              <span className="max-w-[90px] truncate">{singleLayer.text || 'Edit Text'}</span>
            </button>

            {openPopover === 'text-edit' && (
              <div className={`${popoverClass} w-72 space-y-3`}>
                <p className="text-xs font-semibold">Edit Text Copy</p>
                <textarea
                  rows={2}
                  value={singleLayer.text}
                  onChange={(e) => update({ text: e.target.value })}
                  className="w-full resize-none rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] px-2.5 py-1.5 text-xs font-medium focus:border-emerald-600 focus:outline-none"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Alignment
                  </span>
                  <div className="flex items-center gap-1">
                    {(
                      [
                        ['left', AlignLeft],
                        ['center', AlignCenter],
                        ['right', AlignRight],
                      ] as const
                    ).map(([al, Icon]) => (
                      <button
                        key={al}
                        type="button"
                        onClick={() => update({ textAlign: al })}
                        className={`rounded-lg border p-1.5 cursor-pointer ${
                          singleLayer.textAlign === al
                            ? 'border-slate-900 bg-slate-900 text-white dark:border-emerald-500 dark:bg-emerald-600'
                            : 'border-[#E2E8F0] dark:border-[#2A2D3D] hover:bg-slate-100 dark:hover:bg-[#252836]'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Font Family Picker Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => togglePopover('font')}
              className={`${toolBtnBase} border border-[#E2E8F0] dark:border-[#2A2D3D] ${
                openPopover === 'font'
                  ? toolBtnActive
                  : 'bg-slate-50 dark:bg-[#1E202B] text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#252836]'
              }`}
              title="Choose Font Family & Pairing"
            >
              <span
                className="max-w-[115px] truncate font-semibold"
                style={{ fontFamily: currentFontMeta.cssFamily }}
              >
                {currentFontMeta.name}
              </span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>

            {openPopover === 'font' && (
              <div className={`${popoverClass} w-80 space-y-2.5`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">Font Library</span>
                  <button
                    type="button"
                    onClick={() => setShowPairingsInFont((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] dark:border-[#2A2D3D] px-2.5 py-0.5 text-[10.5px] font-semibold hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3 text-[#1B4332] dark:text-emerald-400" />
                    {showPairingsInFont ? 'All Fonts' : 'Font Pairings'}
                  </button>
                </div>

                {!showPairingsInFont ? (
                  <>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={fontSearch}
                        onChange={(e) => setFontSearch(e.target.value)}
                        placeholder="Search or load any Google Font..."
                        className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] pl-8 pr-2.5 py-1.5 text-xs focus:border-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {FONT_CATEGORY_FILTERS.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFontCategory(cat)}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${
                            fontCategory === cat
                              ? 'bg-slate-900 dark:bg-emerald-600 text-white'
                              : 'bg-slate-100 dark:bg-[#252836] text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div>
                      <select
                        value={singleLayer.fontWeight}
                        onChange={(e) => {
                          const w = Number(e.target.value);
                          void loadGoogleFont(currentFontMeta.name, [w]);
                          update({ fontWeight: w });
                        }}
                        aria-label="Font Weight"
                        className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] px-2.5 py-1.5 text-xs font-mono-num"
                      >
                        {[300, 400, 500, 600, 700, 800, 900].map((w) => (
                          <option key={w} value={w}>
                            {WEIGHT_LABELS[w] ?? w}
                          </option>
                        ))}
                      </select>
                    </div>

                    {fontSearch.trim().length >= 2 &&
                      !allFonts.some(
                        (f) => f.name.toLowerCase() === fontSearch.trim().toLowerCase()
                      ) && (
                        <button
                          type="button"
                          onClick={handleLoadCustomGoogleFont}
                          disabled={loadingCustomFont}
                          className="flex w-full items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-left text-[11px] font-semibold text-[#1B4332] dark:text-emerald-300 cursor-pointer"
                        >
                          <span className="truncate">
                            {loadingCustomFont
                              ? 'Loading Google Font...'
                              : `Load Google Font "${fontSearch.trim()}"`}
                          </span>
                          <Plus className="h-3.5 w-3.5 shrink-0" />
                        </button>
                      )}

                    <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
                      {filteredFonts.map((f) => {
                        const active = f.id === singleLayer.fontId;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => void handleApplyFont(f)}
                            className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
                              active
                                ? 'bg-slate-900 dark:bg-emerald-600 text-white'
                                : 'hover:bg-slate-100 dark:hover:bg-[#252836]'
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
                                active ? 'text-white/75' : 'text-slate-400'
                              }`}
                            >
                              {f.category.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-0.5">
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
                            setOpenPopover(null);
                          }}
                          className="flex w-full flex-col rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] p-2.5 text-left hover:border-slate-400 dark:hover:border-slate-500 cursor-pointer"
                        >
                          <span
                            className="text-xs font-bold truncate"
                            style={{ fontFamily: pFont?.cssFamily }}
                          >
                            {pair.name}
                          </span>
                          <span
                            className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate"
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
            )}
          </div>

          {/* Font Size Stepper */}
          <div className="inline-flex items-center rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] shrink-0">
            <button
              type="button"
              onClick={() => update({ fontSize: Math.max(10, singleLayer.fontSize - 2) })}
              className="px-1.5 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-[#2A2D3D] rounded-l-lg cursor-pointer"
              title="Decrease font size"
              aria-label="Decrease font size"
            >
              <Minus className="h-3 w-3" />
            </button>
            <input
              type="number"
              min={10}
              max={160}
              value={Math.round(singleLayer.fontSize)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) {
                  update({ fontSize: Math.min(160, Math.max(10, v)) });
                }
              }}
              aria-label="Font size"
              className="font-mono-num w-10 bg-transparent text-center text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => update({ fontSize: Math.min(160, singleLayer.fontSize + 2) })}
              className="px-1.5 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-[#2A2D3D] rounded-r-lg cursor-pointer"
              title="Increase font size"
              aria-label="Increase font size"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </>
      )}

      {/* ================================================================= */}
      {/* SHARED FILL & GRADIENT COLOR POPOVER (Text + Shapes/Icons/SVGs)   */}
      {/* ================================================================= */}
      <div className="relative">
        <button
          type="button"
          onClick={() => togglePopover('fill')}
          className={`${toolBtnBase} ${openPopover === 'fill' ? toolBtnActive : toolBtnDefault}`}
          title={isText ? 'Text Color & Gradient' : 'Fill Color, Gradient & SVG Parts'}
        >
          <span
            className="h-4 w-4 rounded-full border border-black/20 dark:border-white/25 shrink-0"
            style={{
              backgroundImage: activeGradient.enabled
                ? `linear-gradient(${activeGradient.angle}deg, ${activeGradient.startColor}, ${activeGradient.endColor})`
                : singleLayer.fill === 'transparent'
                  ? 'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)'
                  : 'none',
              backgroundSize:
                !activeGradient.enabled && singleLayer.fill === 'transparent'
                  ? '8px 8px'
                  : 'auto',
              backgroundColor:
                !activeGradient.enabled && singleLayer.fill !== 'transparent'
                  ? singleLayer.fill
                  : '#ffffff',
            }}
          />
          <span>{isText ? 'Color' : 'Fill'}</span>
        </button>

        {openPopover === 'fill' && (
          <div className={`${popoverClass} w-80 space-y-3`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">Fill &amp; Gradient</span>
              <div className="inline-flex rounded-full border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-100 dark:bg-[#1E202B] p-0.5 text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() =>
                    update({ fillGradient: { ...activeGradient, enabled: false } })
                  }
                  className={`rounded-full px-2.5 py-0.5 cursor-pointer ${
                    !activeGradient.enabled
                      ? 'bg-white dark:bg-[#2A2D3D] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Solid
                </button>
                <button
                  type="button"
                  onClick={() =>
                    update({ fillGradient: { ...activeGradient, enabled: true } })
                  }
                  className={`rounded-full px-2.5 py-0.5 cursor-pointer ${
                    activeGradient.enabled
                      ? 'bg-white dark:bg-[#2A2D3D] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
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
                    className={`h-7 w-7 rounded-lg border cursor-pointer ${
                      singleLayer.fill.toLowerCase() === hex.toLowerCase()
                        ? 'ring-2 ring-emerald-600 ring-offset-1 border-black/30'
                        : 'border-black/15 dark:border-white/15'
                    }`}
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
                <input
                  type="color"
                  value={singleLayer.fill === 'transparent' ? '#141413' : singleLayer.fill}
                  onChange={(e) => update({ fill: e.target.value })}
                  aria-label="Primary fill color"
                  className="h-7 w-8 cursor-pointer rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] bg-transparent p-0.5"
                />
                {!isText && (
                  <button
                    type="button"
                    onClick={() => update({ fill: 'transparent' })}
                    className="rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] px-2 py-1 text-[10px] font-semibold hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
                  >
                    None
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
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
                      className={`rounded-lg border py-1 text-[10.5px] font-semibold capitalize cursor-pointer ${
                        activeGradient.type === gType
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-emerald-500 dark:bg-emerald-600'
                          : 'border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B]'
                      }`}
                    >
                      {gType}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center justify-between rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] px-2 py-1 text-[11px] font-medium">
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
                      className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] px-2 py-1 text-[11px] font-medium">
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
                      className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
                    />
                  </label>
                </div>
                {activeGradient.type === 'linear' && (
                  <div>
                    <div className="flex justify-between text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                      <span>Angle</span>
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
                      className="mt-0.5 w-full accent-[#1B4332] dark:accent-emerald-500 cursor-pointer"
                    />
                  </div>
                )}
                <div className="grid grid-cols-4 gap-1.5">
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
                      className="h-6 rounded-lg border border-black/15 cursor-pointer"
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

            {/* Icon multi-tone & SVG Part overrides */}
            {singleLayer.type === 'icon' && (
              <div className="space-y-2 border-t border-[#E2E8F0] dark:border-[#2A2D3D] pt-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center justify-between rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] px-2 py-1 text-[11px] font-medium">
                    <span>Accent</span>
                    <input
                      type="color"
                      value={toInputColorHex(singleLayer.accentFill, activePalette.accent)}
                      onChange={(e) => update({ accentFill: e.target.value })}
                      className="h-4 w-5 cursor-pointer border-0 bg-transparent p-0"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] px-2 py-1 text-[11px] font-medium">
                    <span>Secondary</span>
                    <input
                      type="color"
                      value={toInputColorHex(singleLayer.secondaryFill, activePalette.secondary)}
                      onChange={(e) => update({ secondaryFill: e.target.value })}
                      className="h-4 w-5 cursor-pointer border-0 bg-transparent p-0"
                    />
                  </label>
                </div>

                {(() => {
                  const iconDef = VECTOR_ICONS.find((ic) => ic.id === singleLayer.iconId);
                  if (!iconDef || iconDef.paths.length <= 1) return null;
                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">
                          Parts ({iconDef.paths.length})
                        </span>
                        {singleLayer.partColors && (
                          <button
                            type="button"
                            onClick={() => update({ partColors: undefined })}
                            className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 cursor-pointer"
                          >
                            Reset Parts
                          </button>
                        )}
                      </div>
                      <div className="max-h-36 space-y-1 overflow-y-auto pr-0.5">
                        {iconDef.paths.map((p, idx) => {
                          const roleFallback =
                            p.role === 'primary'
                              ? singleLayer.fill
                              : p.role === 'accent'
                                ? singleLayer.accentFill
                                : p.role === 'secondary'
                                  ? singleLayer.secondaryFill
                                  : '#FFFFFF';
                          const curHex = toInputColorHex(
                            singleLayer.partColors?.[idx] || roleFallback,
                            activePalette.primary
                          );
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] px-2 py-1 text-[10.5px]"
                            >
                              <span className="truncate font-medium">
                                Part {idx + 1} · {p.role}
                              </span>
                              <input
                                type="color"
                                value={curHex}
                                onChange={(e) => {
                                  const nextParts = iconDef.paths.map((dp, i) => {
                                    const fb =
                                      dp.role === 'primary'
                                        ? singleLayer.fill
                                        : dp.role === 'accent'
                                          ? singleLayer.accentFill
                                          : dp.role === 'secondary'
                                            ? singleLayer.secondaryFill
                                            : '#FFFFFF';
                                    return singleLayer.partColors?.[i] || fb;
                                  });
                                  nextParts[idx] = e.target.value;
                                  update({ partColors: nextParts });
                                }}
                                className="h-5 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Custom SVG Per-Part Colors */}
            {singleLayer.type === 'custom-svg' && (
              <div className="space-y-2 border-t border-[#E2E8F0] dark:border-[#2A2D3D] pt-2.5">
                <label className="inline-flex items-center gap-2 text-[11px] font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={singleLayer.preserveOriginalColors}
                    onChange={(e) => update({ preserveOriginalColors: e.target.checked })}
                    className="h-3.5 w-3.5 rounded accent-[#1B4332]"
                  />
                  Per-Part SVG Colors ({singleLayer.paths.length})
                </label>
                <div className="max-h-40 space-y-1 overflow-y-auto pr-0.5">
                  {singleLayer.paths.map((p, idx) => {
                    const isStrokePart = p.fill === 'none';
                    const activePartColor = singleLayer.preserveOriginalColors
                      ? isStrokePart
                        ? p.stroke || singleLayer.fill
                        : p.fill || singleLayer.fill
                      : singleLayer.fill;
                    const safeHex = toInputColorHex(activePartColor, activePalette.primary);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] px-2 py-1 text-[10.5px]"
                      >
                        <span className="truncate font-medium">
                          {p.label ?? `Part ${idx + 1}`}
                        </span>
                        <input
                          type="color"
                          value={safeHex}
                          onChange={(e) => {
                            const nextPaths = singleLayer.paths.map((item, i) => {
                              if (i !== idx) return item;
                              if (item.fill === 'none') return { ...item, stroke: e.target.value };
                              return {
                                ...item,
                                fill: e.target.value,
                                stroke:
                                  item.stroke && item.stroke !== 'none'
                                    ? e.target.value
                                    : item.stroke,
                              };
                            });
                            update({ preserveOriginalColors: true, paths: nextPaths });
                          }}
                          className="h-5 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* TEXT QUICK TOGGLES (Bold, Italic, Uppercase) OR VECTOR STROKE     */}
      {/* ================================================================= */}
      {isText && singleLayer.type === 'text' ? (
        <>
          <button
            type="button"
            onClick={() =>
              update({ fontWeight: singleLayer.fontWeight >= 700 ? 400 : 700 })
            }
            className={`${toolBtnBase} px-2 ${
              singleLayer.fontWeight >= 700 ? toolBtnActive : toolBtnDefault
            }`}
            title="Toggle Bold"
            aria-label="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() =>
              update({
                fontStyle: singleLayer.fontStyle === 'italic' ? 'normal' : 'italic',
              })
            }
            className={`${toolBtnBase} px-2 ${
              singleLayer.fontStyle === 'italic' ? toolBtnActive : toolBtnDefault
            }`}
            title="Toggle Italic"
            aria-label="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => update({ uppercase: !singleLayer.uppercase })}
            className={`${toolBtnBase} px-2 text-[11px] font-bold ${
              singleLayer.uppercase ? toolBtnActive : toolBtnDefault
            }`}
            title="Toggle Uppercase"
          >
            AA
          </button>
        </>
      ) : (
        <>
          {/* Stroke Popover for Shapes / Icons / SVGs / Paths */}
          <div className="relative">
            <button
              type="button"
              onClick={() => togglePopover('stroke')}
              className={`${toolBtnBase} ${
                openPopover === 'stroke' ? toolBtnActive : toolBtnDefault
              }`}
              title="Outline / Stroke"
            >
              <PenTool className="h-3.5 w-3.5" />
              <span>Stroke</span>
              {singleLayer.strokeWidth > 0 && (
                <span className="font-mono-num text-[10px] opacity-75">
                  {singleLayer.strokeWidth}px
                </span>
              )}
            </button>

            {openPopover === 'stroke' && (
              <div className={`${popoverClass} w-64 space-y-2.5`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Outline / Stroke</span>
                  {singleLayer.strokeWidth > 0 && (
                    <button
                      type="button"
                      onClick={() => update({ strokeWidth: 0, stroke: 'none' })}
                      className="text-[10.5px] font-semibold text-red-600 dark:text-red-400 cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <input
                    type="range"
                    min={0}
                    max={16}
                    step={0.5}
                    value={singleLayer.strokeWidth}
                    onChange={(e) =>
                      update({
                        strokeWidth: Number(e.target.value),
                        stroke:
                          singleLayer.stroke === 'none'
                            ? activePalette.primary
                            : singleLayer.stroke,
                      })
                    }
                    className="flex-1 accent-[#1B4332] dark:accent-emerald-500 cursor-pointer"
                  />
                  <span className="font-mono-num w-9 text-right text-xs">
                    {singleLayer.strokeWidth}px
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Stroke Color
                  </span>
                  <input
                    type="color"
                    value={
                      singleLayer.stroke === 'none'
                        ? activePalette.primary
                        : singleLayer.stroke
                    }
                    onChange={(e) =>
                      update({
                        stroke: e.target.value,
                        strokeWidth:
                          singleLayer.strokeWidth === 0 ? 2 : singleLayer.strokeWidth,
                      })
                    }
                    className="h-6 w-8 cursor-pointer rounded border border-[#E2E8F0] dark:border-[#2A2D3D] p-0.5"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Flip Horizontal / Vertical Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => togglePopover('flip')}
              className={`${toolBtnBase} ${
                openPopover === 'flip' || singleLayer.flipX || singleLayer.flipY
                  ? toolBtnActive
                  : toolBtnDefault
              }`}
              title="Flip Horizontal or Vertical"
            >
              <FlipHorizontal2 className="h-3.5 w-3.5" />
              <span>Flip</span>
            </button>

            {openPopover === 'flip' && (
              <div className={`${popoverClass} w-52 space-y-1.5`}>
                <p className="text-xs font-semibold mb-1">Flip Element</p>
                <button
                  type="button"
                  onClick={() => update({ flipX: !singleLayer.flipX })}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-medium cursor-pointer ${
                    singleLayer.flipX
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                      : 'border-[#E2E8F0] dark:border-[#2A2D3D] hover:bg-slate-50 dark:hover:bg-[#252836]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <FlipHorizontal2 className="h-3.5 w-3.5" />
                    Flip Horizontal
                  </span>
                  {singleLayer.flipX && <span className="text-[10px] font-bold">ON</span>}
                </button>
                <button
                  type="button"
                  onClick={() => update({ flipY: !singleLayer.flipY })}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-medium cursor-pointer ${
                    singleLayer.flipY
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                      : 'border-[#E2E8F0] dark:border-[#2A2D3D] hover:bg-slate-50 dark:hover:bg-[#252836]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <FlipVertical2 className="h-3.5 w-3.5" />
                    Flip Vertical
                  </span>
                  {singleLayer.flipY && <span className="text-[10px] font-bold">ON</span>}
                </button>
              </div>
            )}
          </div>

          {/* Crop / Aspect & Bounds Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => togglePopover('crop')}
              className={`${toolBtnBase} ${
                openPopover === 'crop' ? toolBtnActive : toolBtnDefault
              }`}
              title="Crop Aspect, Corner Radius & Bounds"
            >
              <Crop className="h-3.5 w-3.5" />
              <span>Crop</span>
            </button>

            {openPopover === 'crop' && (
              <div className={`${popoverClass} w-64 space-y-3`}>
                <p className="text-xs font-semibold">Aspect Frame &amp; Bounds</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      ['1:1', 1, 1],
                      ['4:3', 4, 3],
                      ['16:9', 16, 9],
                      ['3:4', 3, 4],
                    ] as const
                  ).map(([label, rw, rh]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => applyAspectCrop(rw, rh)}
                      className="rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] py-1.5 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {singleLayer.type === 'shape' && singleLayer.shapeKind === 'rounded-rect' && (
                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      <span>Corner Radius</span>
                      <span className="font-mono-num">{singleLayer.cornerRadius}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={64}
                      value={singleLayer.cornerRadius}
                      onChange={(e) => update({ cornerRadius: Number(e.target.value) })}
                      className="mt-1 w-full accent-[#1B4332] dark:accent-emerald-500 cursor-pointer"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={fitIntoSafeZone}
                  className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] py-1.5 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
                >
                  Fit Inside 8% Safe Zone
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ================================================================= */}
      {/* OPACITY + TRANSFORM POPOVER                                       */}
      {/* ================================================================= */}
      <div className="relative">
        <button
          type="button"
          onClick={() => togglePopover('opacity')}
          className={`${toolBtnBase} ${
            openPopover === 'opacity' ? toolBtnActive : toolBtnDefault
          }`}
          title="Opacity & Transform Dimensions"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="font-mono-num">{Math.round(singleLayer.opacity * 100)}%</span>
        </button>

        {openPopover === 'opacity' && (
          <div className={`${popoverClass} w-64 space-y-3`}>
            <div>
              <div className="flex justify-between text-xs font-semibold">
                <span>Opacity</span>
                <span className="font-mono-num">{Math.round(singleLayer.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={singleLayer.opacity}
                onChange={(e) => update({ opacity: Number(e.target.value) })}
                className="mt-1.5 w-full accent-[#1B4332] dark:accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="border-t border-[#E2E8F0] dark:border-[#2A2D3D] pt-2.5">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                Coordinates &amp; Size
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    ['X', 'x'],
                    ['Y', 'y'],
                    ['Rot°', 'rotation'],
                    ['W', 'width'],
                    ['H', 'height'],
                  ] as const
                ).map(([label, key]) => (
                  <label
                    key={key}
                    className="text-[10px] font-medium text-slate-500 dark:text-slate-400"
                  >
                    {label}
                    <input
                      type="number"
                      value={Math.round(singleLayer[key])}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (Number.isFinite(val)) {
                          update({
                            [key]: key === 'width' || key === 'height' ? Math.max(12, val) : val,
                          });
                        }
                      }}
                      className="font-mono-num mt-0.5 w-full rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] px-1.5 py-1 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* EFFECTS POPOVER (Curved Text, Tracking, Shadow, Text-to-Path)     */}
      {/* ================================================================= */}
      <div className="relative">
        <button
          type="button"
          onClick={() => togglePopover('effects')}
          className={`${toolBtnBase} ${
            openPopover === 'effects' ? toolBtnActive : toolBtnDefault
          }`}
          title={
            isText
              ? 'Curve Arc, Tracking, Outline, Drop Shadow & Text-to-Path'
              : 'Drop Shadow & Effects'
          }
        >
          <Paintbrush className="h-3.5 w-3.5" />
          <span>Effects</span>
        </button>

        {openPopover === 'effects' && (
          <div className={`${popoverClass} w-80 space-y-3`}>
            {isText && singleLayer.type === 'text' && (
              <>
                <div className="space-y-2 rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] p-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Curve / Arc Bend</span>
                    <span className="font-mono-num text-[11px] text-slate-500 dark:text-slate-400">
                      {bendPercent === 0
                        ? 'Flat'
                        : `${bendPercent > 0 ? '+' : ''}${bendPercent}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    step={2}
                    value={bendPercent}
                    onChange={(e) =>
                      update({ curveRadius: bendToCurveRadius(Number(e.target.value)) })
                    }
                    className="w-full accent-[#1B4332] dark:accent-emerald-500 cursor-pointer"
                  />
                  <div className="grid grid-cols-5 gap-1">
                    {(
                      [
                        ['Ring+', 85],
                        ['Arch', 150],
                        ['Flat', 0],
                        ['Smile', -150],
                        ['Ring-', -85],
                      ] as const
                    ).map(([label, r]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => update({ curveRadius: r })}
                        className="rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#181A24] py-1 text-[10px] font-medium hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      <span>Tracking</span>
                      <span className="font-mono-num">
                        {singleLayer.letterSpacing.toFixed(2)}em
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-0.08}
                      max={0.5}
                      step={0.01}
                      value={singleLayer.letterSpacing}
                      onChange={(e) => update({ letterSpacing: Number(e.target.value) })}
                      className="mt-1 w-full accent-[#1B4332] dark:accent-emerald-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      <span>Line Height</span>
                      <span className="font-mono-num">
                        {singleLayer.lineHeight.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.8}
                      max={2.0}
                      step={0.05}
                      value={singleLayer.lineHeight}
                      onChange={(e) => update({ lineHeight: Number(e.target.value) })}
                      className="mt-1 w-full accent-[#1B4332] dark:accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Text Stroke */}
                <div className="flex items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] px-2.5 py-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] font-medium">
                      <span>Text Outline</span>
                      <span className="font-mono-num">{singleLayer.strokeWidth}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={12}
                      step={0.5}
                      value={singleLayer.strokeWidth}
                      onChange={(e) =>
                        update({
                          strokeWidth: Number(e.target.value),
                          stroke:
                            singleLayer.stroke === 'none'
                              ? activePalette.primary
                              : singleLayer.stroke,
                        })
                      }
                      className="mt-0.5 w-full accent-[#1B4332] dark:accent-emerald-500 cursor-pointer"
                    />
                  </div>
                  <input
                    type="color"
                    value={
                      singleLayer.stroke === 'none'
                        ? activePalette.primary
                        : singleLayer.stroke
                    }
                    onChange={(e) =>
                      update({
                        stroke: e.target.value,
                        strokeWidth:
                          singleLayer.strokeWidth === 0 ? 2 : singleLayer.strokeWidth,
                      })
                    }
                    className="h-6 w-7 cursor-pointer rounded border border-[#E2E8F0] dark:border-[#2A2D3D] p-0.5"
                  />
                </div>
              </>
            )}

            {/* Drop Shadow Controls */}
            <div className="space-y-2 rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] p-2.5">
              <label className="flex items-center justify-between text-xs font-semibold cursor-pointer">
                <span>Drop Shadow</span>
                <input
                  type="checkbox"
                  checked={singleLayer.shadow.enabled}
                  onChange={(e) =>
                    update({
                      shadow: { ...singleLayer.shadow, enabled: e.target.checked },
                    })
                  }
                  className="h-3.5 w-3.5 rounded accent-[#1B4332]"
                />
              </label>

              {singleLayer.shadow.enabled && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="color"
                      value={
                        singleLayer.shadow.color.startsWith('#')
                          ? singleLayer.shadow.color
                          : '#111827'
                      }
                      onChange={(e) =>
                        update({
                          shadow: { ...singleLayer.shadow, color: e.target.value },
                        })
                      }
                      className="h-6 w-8 cursor-pointer rounded border border-[#E2E8F0] dark:border-[#2A2D3D] p-0.5"
                    />
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
                        className="rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] px-2 py-0.5 text-[10px] font-medium cursor-pointer"
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
                        className="rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] px-2 py-0.5 text-[10px] font-medium cursor-pointer"
                      >
                        Crisp
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400">
                      Blur
                      <input
                        type="number"
                        min={0}
                        max={40}
                        value={singleLayer.shadow.blur}
                        onChange={(e) =>
                          update({
                            shadow: {
                              ...singleLayer.shadow,
                              blur: Number(e.target.value) || 0,
                            },
                          })
                        }
                        className="font-mono-num mt-0.5 w-full rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] px-1.5 py-1 text-xs text-slate-900 dark:text-slate-100"
                      />
                    </label>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400">
                      X
                      <input
                        type="number"
                        min={-30}
                        max={30}
                        value={singleLayer.shadow.offsetX}
                        onChange={(e) =>
                          update({
                            shadow: {
                              ...singleLayer.shadow,
                              offsetX: Number(e.target.value) || 0,
                            },
                          })
                        }
                        className="font-mono-num mt-0.5 w-full rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] px-1.5 py-1 text-xs text-slate-900 dark:text-slate-100"
                      />
                    </label>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400">
                      Y
                      <input
                        type="number"
                        min={-30}
                        max={30}
                        value={singleLayer.shadow.offsetY}
                        onChange={(e) =>
                          update({
                            shadow: {
                              ...singleLayer.shadow,
                              offsetY: Number(e.target.value) || 0,
                            },
                          })
                        }
                        className="font-mono-num mt-0.5 w-full rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] px-1.5 py-1 text-xs text-slate-900 dark:text-slate-100"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {isText && (
              <button
                type="button"
                onClick={() => void handleConvertPath()}
                disabled={convertingPath}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-900 dark:bg-slate-100 px-3 py-2 text-xs font-semibold text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-60 cursor-pointer"
              >
                <Spline className="h-3.5 w-3.5" />
                {convertingPath ? 'Outlining Glyphs...' : 'Convert Text to Vector Path'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* POSITION / ARRANGE POPOVER (Align + Z-Order)                      */}
      {/* ================================================================= */}
      <div className="relative">
        <button
          type="button"
          onClick={() => togglePopover('position')}
          className={`${toolBtnBase} ${
            openPopover === 'position' ? toolBtnActive : toolBtnDefault
          }`}
          title="Align & Layer Order"
        >
          <span>Position</span>
        </button>

        {openPopover === 'position' && (
          <div className={`${popoverClass} w-60 space-y-3`}>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                Align to Artboard
              </p>
              <div className="grid grid-cols-6 gap-1">
                {(
                  [
                    ['left', AlignStartVertical, 'Left'],
                    ['center-h', AlignCenterVertical, 'Center H'],
                    ['right', AlignEndVertical, 'Right'],
                    ['top', AlignStartHorizontal, 'Top'],
                    ['center-v', AlignCenterHorizontal, 'Middle V'],
                    ['bottom', AlignEndHorizontal, 'Bottom'],
                  ] as const
                ).map(([mode, Icon, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onAlignSelectedLayers(mode)}
                    title={label}
                    className="flex items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] py-1.5 hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-[#E2E8F0] dark:border-[#2A2D3D] pt-2.5 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onReorderLayer(singleLayer.id, 'up')}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] py-1.5 text-xs font-medium hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
              >
                <ArrowUp className="h-3.5 w-3.5" />
                Forward
              </button>
              <button
                type="button"
                onClick={() => onReorderLayer(singleLayer.id, 'down')}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] py-1.5 text-xs font-medium hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
              >
                <ArrowDown className="h-3.5 w-3.5" />
                Backward
              </button>
            </div>
          </div>
        )}
      </div>

      <span className={dividerClass} aria-hidden="true" />

      {/* Lock, Duplicate, Delete */}
      <button
        type="button"
        onClick={() => update({ locked: !singleLayer.locked })}
        title={singleLayer.locked ? 'Unlock layer' : 'Lock layer'}
        className={`${toolBtnBase} px-2 ${
          singleLayer.locked
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            : toolBtnDefault
        }`}
      >
        {singleLayer.locked ? (
          <Lock className="h-3.5 w-3.5" />
        ) : (
          <Unlock className="h-3.5 w-3.5" />
        )}
      </button>

      <button
        type="button"
        onClick={onDuplicateSelected}
        title="Duplicate (Ctrl/Cmd+D)"
        className={`${toolBtnBase} px-2 ${toolBtnDefault}`}
      >
        <Copy className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={onDeleteSelected}
        title="Delete layer"
        className="inline-flex items-center rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer shrink-0"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
