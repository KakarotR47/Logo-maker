import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, Link2, Plus, RotateCw, Trash2, Unlink } from 'lucide-react';
import {
  BrandTokens,
  ColorPalette,
  GradientStop,
  LayerGradient,
  LayerPatternFill,
  LogoLayer,
  PatternPresetKind,
} from '../types/logo';
import { BRAND_COLOR_TOKEN_ORDER } from '../utils/brandTokens';

export type FillTabMode = 'solid' | 'linear' | 'radial' | 'pattern';

interface CuratedGradientPreset {
  id: string;
  name: string;
  category: 'Brand' | 'Metallic' | 'Luxury' | 'Neon';
  angle: number;
  stops: Array<{ offset: number; color: string }>;
}

const PATTERN_PRESETS: Array<{
  kind: PatternPresetKind;
  label: string;
  previewPath: string;
}> = [
  { kind: 'diagonal-stripes', label: 'Stripes', previewPath: 'M-2,6 l8,-8 M0,16 l16,-16 M10,18 l8,-8' },
  { kind: 'halftone-dots', label: 'Halftone', previewPath: 'M4,4 h0.1 M12,12 h0.1 M12,4 h0.1 M4,12 h0.1' },
  { kind: 'grid-mesh', label: 'Grid', previewPath: 'M8,0 V16 M0,8 H16' },
  { kind: 'chevron-wave', label: 'Chevron', previewPath: 'M0,11 L8,4 L16,11' },
  { kind: 'crosshatch', label: 'Hatch', previewPath: 'M0,0 L16,16 M16,0 L0,16' },
  { kind: 'terrazzo-geo', label: 'Terrazzo', previewPath: 'M2,3 L7,2 L5,7 Z M10,8 L15,10 L11,14 Z' },
  { kind: 'concentric-rings', label: 'Rings', previewPath: 'M8,8 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0' },
];

export function normalizeGradientStops(grad: LayerGradient): GradientStop[] {
  if (grad.stops && grad.stops.length >= 2) {
    return [...grad.stops].sort((a, b) => a.offset - b.offset);
  }
  const stops: GradientStop[] = [
    { id: 'st-0', offset: 0, color: grad.startColor || '#1B4332' },
  ];
  if (grad.midColor) {
    stops.push({ id: 'st-1', offset: 50, color: grad.midColor });
  }
  stops.push({ id: 'st-2', offset: 100, color: grad.endColor || '#C9963B' });
  return stops;
}

export function buildGradientCss(grad: LayerGradient): string {
  const stops = normalizeGradientStops(grad);
  const stopStr = stops.map((s) => `${s.color} ${s.offset}%`).join(', ');
  if (grad.type === 'radial') {
    const cx = grad.radialCx ?? 50;
    const cy = grad.radialCy ?? 50;
    return `radial-gradient(circle at ${cx}% ${cy}%, ${stopStr})`;
  }
  return `linear-gradient(${grad.angle ?? 135}deg, ${stopStr})`;
}

function toSafeHex(color?: string, fallback = '#141413'): string {
  if (!color) return fallback;
  const c = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
  if (/^#[0-9a-fA-F]{3}$/.test(c)) {
    return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
  }
  return fallback;
}

interface GradientPatternPickerProps {
  layer: LogoLayer;
  activePalette: ColorPalette;
  quickSwatches: string[];
  isText: boolean;
  brandTokens?: BrandTokens;
  onUpdate: (patch: Partial<LogoLayer>) => void;
}

export const GradientPatternPicker: React.FC<GradientPatternPickerProps> = ({
  layer,
  activePalette,
  quickSwatches,
  isText,
  brandTokens,
  onUpdate,
}) => {
  const activeGradient: LayerGradient = useMemo(
    () =>
      layer.fillGradient ?? {
        enabled: false,
        type: 'linear',
        angle: 135,
        startColor: layer.fill === 'transparent' ? activePalette.primary : layer.fill,
        endColor: activePalette.accent,
      },
    [layer.fillGradient, layer.fill, activePalette]
  );

  const activePattern: LayerPatternFill = useMemo(
    () =>
      layer.fillPattern ?? {
        enabled: false,
        preset: 'diagonal-stripes',
        foregroundColor: activePalette.primary,
        backgroundColor: activePalette.secondary,
        scale: 1,
        rotation: 0,
      },
    [layer.fillPattern, activePalette]
  );

  const currentTab: FillTabMode = activePattern.enabled
    ? 'pattern'
    : activeGradient.enabled
      ? activeGradient.type
      : 'solid';

  const stops = useMemo(() => normalizeGradientStops(activeGradient), [activeGradient]);
  const [selectedStopId, setSelectedStopId] = useState<string>(() => stops[0]?.id ?? 'st-0');
  const [presetCategory, setPresetCategory] = useState<'All' | 'Metallic' | 'Luxury' | 'Neon' | 'Brand'>('All');
  const [draggingStopId, setDraggingStopId] = useState<string | null>(null);
  const [draggingDial, setDraggingDial] = useState<boolean>(false);
  const [draggingFocal, setDraggingFocal] = useState<boolean>(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const dialRef = useRef<SVGSVGElement>(null);
  const focalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stops.some((s) => s.id === selectedStopId)) {
      setSelectedStopId(stops[0]?.id ?? 'st-0');
    }
  }, [stops, selectedStopId]);

  const curatedPresets: CuratedGradientPreset[] = useMemo(
    () => [
      {
        id: 'brand-duo',
        name: 'Brand Duo',
        category: 'Brand',
        angle: 135,
        stops: [
          { offset: 0, color: activePalette.primary },
          { offset: 100, color: activePalette.accent },
        ],
      },
      {
        id: 'brand-triad',
        name: 'Brand Triad',
        category: 'Brand',
        angle: 120,
        stops: [
          { offset: 0, color: activePalette.primary },
          { offset: 52, color: activePalette.accent },
          { offset: 100, color: activePalette.secondary },
        ],
      },
      {
        id: 'champagne-gold',
        name: 'Champagne Gold',
        category: 'Metallic',
        angle: 125,
        stops: [
          { offset: 0, color: '#7A5413' },
          { offset: 32, color: '#E8C56E' },
          { offset: 55, color: '#FFF0B8' },
          { offset: 100, color: '#A67822' },
        ],
      },
      {
        id: 'rose-gold',
        name: 'Rose Gold',
        category: 'Metallic',
        angle: 135,
        stops: [
          { offset: 0, color: '#8A4A43' },
          { offset: 45, color: '#F3B8AE' },
          { offset: 70, color: '#FDE0D9' },
          { offset: 100, color: '#B56E65' },
        ],
      },
      {
        id: 'brushed-platinum',
        name: 'Platinum Chrome',
        category: 'Metallic',
        angle: 140,
        stops: [
          { offset: 0, color: '#4A5160' },
          { offset: 38, color: '#D6DBE3' },
          { offset: 58, color: '#FFFFFF' },
          { offset: 100, color: '#6E7585' },
        ],
      },
      {
        id: 'copper-bronze',
        name: 'Copper Bronze',
        category: 'Metallic',
        angle: 120,
        stops: [
          { offset: 0, color: '#5D2E18' },
          { offset: 48, color: '#D98555' },
          { offset: 100, color: '#8D4927' },
        ],
      },
      {
        id: 'emerald-velvet',
        name: 'Emerald Velvet',
        category: 'Luxury',
        angle: 135,
        stops: [
          { offset: 0, color: '#0B281E' },
          { offset: 55, color: '#1B4332' },
          { offset: 100, color: '#52B788' },
        ],
      },
      {
        id: 'midnight-sapphire',
        name: 'Midnight Sapphire',
        category: 'Luxury',
        angle: 145,
        stops: [
          { offset: 0, color: '#0B132B' },
          { offset: 50, color: '#1D3557' },
          { offset: 100, color: '#457B9D' },
        ],
      },
      {
        id: 'royal-amethyst',
        name: 'Royal Amethyst',
        category: 'Luxury',
        angle: 130,
        stops: [
          { offset: 0, color: '#240046' },
          { offset: 52, color: '#5A189A' },
          { offset: 100, color: '#E0AAFF' },
        ],
      },
      {
        id: 'cyber-neon',
        name: 'Cyber Neon',
        category: 'Neon',
        angle: 135,
        stops: [
          { offset: 0, color: '#00F5D4' },
          { offset: 50, color: '#3A86FF' },
          { offset: 100, color: '#FF006E' },
        ],
      },
      {
        id: 'sunset-synth',
        name: 'Sunset Synth',
        category: 'Neon',
        angle: 120,
        stops: [
          { offset: 0, color: '#FFBE0B' },
          { offset: 50, color: '#FB5607' },
          { offset: 100, color: '#FF006E' },
        ],
      },
      {
        id: 'electric-lime',
        name: 'Electric Lime',
        category: 'Neon',
        angle: 135,
        stops: [
          { offset: 0, color: '#00BBF9' },
          { offset: 55, color: '#00F5D4' },
          { offset: 100, color: '#B5E48C' },
        ],
      },
    ],
    [activePalette]
  );

  const visiblePresets = useMemo(
    () =>
      presetCategory === 'All'
        ? curatedPresets
        : curatedPresets.filter((p) => p.category === presetCategory),
    [curatedPresets, presetCategory]
  );

  const commitGradient = (nextGrad: Partial<LayerGradient>, nextStops?: GradientStop[]) => {
    const mergedStops = nextStops ?? stops;
    const sorted = [...mergedStops].sort((a, b) => a.offset - b.offset);
    onUpdate({
      fillPattern: activePattern.enabled ? { ...activePattern, enabled: false } : layer.fillPattern,
      fillGradient: {
        ...activeGradient,
        ...nextGrad,
        enabled: true,
        stops: sorted,
        startColor: sorted[0]?.color ?? activeGradient.startColor,
        midColor: sorted.length === 3 ? sorted[1]?.color : undefined,
        endColor: sorted[sorted.length - 1]?.color ?? activeGradient.endColor,
      },
    });
  };

  const commitPattern = (patch: Partial<LayerPatternFill>) => {
    onUpdate({
      fillGradient: activeGradient.enabled ? { ...activeGradient, enabled: false } : layer.fillGradient,
      fillPattern: {
        ...activePattern,
        ...patch,
        enabled: true,
      },
    });
  };

  const switchTab = (tab: FillTabMode) => {
    if (tab === 'solid') {
      onUpdate({
        fillGradient: { ...activeGradient, enabled: false },
        fillPattern: { ...activePattern, enabled: false },
      });
    } else if (tab === 'linear' || tab === 'radial') {
      commitGradient({ type: tab });
    } else {
      commitPattern({});
    }
  };

  // Dragging color stop handle along track
  useEffect(() => {
    if (!draggingStopId) return;
    const onMove = (e: PointerEvent) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pct = Math.round(
        Math.max(0, Math.min(100, ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100))
      );
      const nextStops = stops.map((s) =>
        s.id === draggingStopId ? { ...s, offset: pct } : s
      );
      commitGradient({}, nextStops);
    };
    const onUp = () => setDraggingStopId(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  });

  // Dragging Angle Dial
  useEffect(() => {
    if (!draggingDial) return;
    const onMove = (e: PointerEvent) => {
      const svg = dialRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let deg = Math.round((Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI);
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      const normalized = ((deg % 360) + 360) % 360;
      commitGradient({ angle: normalized });
    };
    const onUp = () => setDraggingDial(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  });

  // Dragging Radial Focal Point
  useEffect(() => {
    if (!draggingFocal) return;
    const onMove = (e: PointerEvent) => {
      const el = focalRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100)));
      const cy = Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100)));
      commitGradient({ radialCx: cx, radialCy: cy });
    };
    const onUp = () => setDraggingFocal(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  });

  const selectedStop = stops.find((s) => s.id === selectedStopId) ?? stops[0];

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).dataset.stopHandle === 'true') return;
    if (stops.length >= 6) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offset = Math.round(
      Math.max(0, Math.min(100, ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100))
    );
    const newStop: GradientStop = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      offset,
      color: selectedStop?.color ?? activePalette.accent,
    };
    setSelectedStopId(newStop.id);
    commitGradient({}, [...stops, newStop]);
  };

  const handleAddStop = () => {
    if (stops.length >= 6) return;
    const newStop: GradientStop = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      offset: 50,
      color: activePalette.accent,
    };
    setSelectedStopId(newStop.id);
    commitGradient({}, [...stops, newStop]);
  };

  const handleDeleteStop = (id: string) => {
    if (stops.length <= 2) return;
    const next = stops.filter((s) => s.id !== id);
    setSelectedStopId(next[0].id);
    commitGradient({}, next);
  };

  const handleReverseStops = () => {
    const reversed = stops.map((s) => ({ ...s, offset: 100 - s.offset }));
    commitGradient({}, reversed);
  };

  const dialAngleRad = ((activeGradient.angle ?? 135) * Math.PI) / 180;
  const knobX = 24 + Math.cos(dialAngleRad) * 16;
  const knobY = 24 + Math.sin(dialAngleRad) * 16;

  return (
    <div className="space-y-3">
      {/* Mode Tabs: Solid · Linear · Radial · Pattern */}
      <div className="grid grid-cols-4 gap-1 rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-100 dark:bg-[#1E222D] p-0.5 text-[10.5px] font-semibold">
        {(
          [
            ['solid', 'Solid'],
            ['linear', 'Linear'],
            ['radial', 'Radial'],
            ['pattern', 'Pattern'],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => switchTab(mode)}
            className={`rounded-lg py-1 transition-colors cursor-pointer ${
              currentTab === mode
                ? 'bg-white dark:bg-[#2A2F3D] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 1. SOLID TAB */}
      {currentTab === 'solid' && (
        <div className="space-y-2.5">
          {brandTokens && (
            <div className="rounded-lg border border-indigo-200/80 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/20 p-2 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                <span className="inline-flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  {layer.fillToken
                    ? `Linked: ${brandTokens.colors[layer.fillToken].label}`
                    : 'Global Brand Tokens'}
                </span>
                {layer.fillToken && (
                  <button
                    type="button"
                    onClick={() => onUpdate({ fillToken: undefined })}
                    className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9.5px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <Unlink className="h-2.5 w-2.5" />
                    Unlink
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {BRAND_COLOR_TOKEN_ORDER.map((tid) => {
                  const tok = brandTokens.colors[tid];
                  const isLinked = layer.fillToken === tid;
                  return (
                    <button
                      key={tid}
                      type="button"
                      onClick={() => onUpdate({ fill: tok.hex, fillToken: tid })}
                      title={`Link to ${tok.label} (${tok.hex})`}
                      className={`relative h-6 flex-1 rounded-md border cursor-pointer transition-transform active:scale-95 ${
                        isLinked
                          ? 'ring-2 ring-indigo-600 dark:ring-indigo-400 ring-offset-1 border-black/30'
                          : 'border-black/15 dark:border-white/20 hover:scale-105'
                      }`}
                      style={{ backgroundColor: tok.hex }}
                    >
                      {isLinked && (
                        <span className="sr-only">Linked to {tok.label}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            {quickSwatches.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => onUpdate({ fill: hex, fillToken: undefined })}
                className={`h-7 w-7 rounded-lg border cursor-pointer ${
                  !layer.fillToken && layer.fill.toLowerCase() === hex.toLowerCase()
                    ? 'ring-2 ring-indigo-500 ring-offset-1 border-black/30'
                    : 'border-black/15 dark:border-white/15'
                }`}
                style={{ backgroundColor: hex }}
                title={`${hex} (Custom unlinked swatch)`}
              />
            ))}
            <input
              type="color"
              value={toSafeHex(layer.fill === 'transparent' ? '#141413' : layer.fill)}
              onChange={(e) => onUpdate({ fill: e.target.value, fillToken: undefined })}
              aria-label="Primary fill color"
              className="h-7 w-8 cursor-pointer rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-transparent p-0.5"
            />
            {!isText && (
              <button
                type="button"
                onClick={() => onUpdate({ fill: 'transparent', fillToken: undefined })}
                className="rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] px-2 py-1 text-[10px] font-semibold hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
              >
                None
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2 & 3. LINEAR / RADIAL MULTI-STOP GRADIENT BUILDER */}
      {(currentTab === 'linear' || currentTab === 'radial') && (
        <div className="space-y-3">
          {/* Interactive Multi-Stop Track */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10.5px] font-semibold text-slate-600 dark:text-slate-300">
              <span>Color Stops ({stops.length}/6)</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleReverseStops}
                  title="Reverse gradient stops"
                  className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] dark:border-[#2A2F3D] px-1.5 py-0.5 text-[10px] hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
                >
                  <ArrowLeftRight className="h-2.5 w-2.5" />
                  Flip
                </button>
                <button
                  type="button"
                  onClick={handleAddStop}
                  disabled={stops.length >= 6}
                  title="Add gradient color stop"
                  className="inline-flex items-center gap-0.5 rounded-md border border-[#E2E8F0] dark:border-[#2A2F3D] px-1.5 py-0.5 text-[10px] hover:bg-slate-100 dark:hover:bg-[#252836] disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="h-2.5 w-2.5" />
                  Stop
                </button>
              </div>
            </div>

            <div className="relative pt-1 pb-2">
              <div
                ref={trackRef}
                onClick={handleTrackClick}
                title="Click track to add a stop · Drag handles to reposition"
                className="relative h-6 w-full rounded-lg border border-black/15 dark:border-white/15 cursor-crosshair shadow-inner"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${stops
                    .map((s) => `${s.color} ${s.offset}%`)
                    .join(', ')})`,
                }}
              >
                {stops.map((stop) => {
                  const active = stop.id === selectedStop?.id;
                  return (
                    <button
                      key={stop.id}
                      type="button"
                      data-stop-handle="true"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelectedStopId(stop.id);
                        setDraggingStopId(stop.id);
                      }}
                      title={`${stop.color.toUpperCase()} @ ${stop.offset}%`}
                      className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-3.5 rounded-full border-2 shadow-md transition-transform cursor-ew-resize ${
                        active
                          ? 'scale-115 border-slate-900 dark:border-white ring-2 ring-indigo-500/70 z-10'
                          : 'border-white dark:border-slate-200 hover:scale-105'
                      }`}
                      style={{
                        left: `${stop.offset}%`,
                        backgroundColor: stop.color,
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Active Stop Editor */}
            {selectedStop && (
              <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#1E222D] px-2.5 py-1.5">
                <input
                  type="color"
                  value={toSafeHex(selectedStop.color)}
                  onChange={(e) => {
                    const next = stops.map((s) =>
                      s.id === selectedStop.id ? { ...s, color: e.target.value } : s
                    );
                    commitGradient({}, next);
                  }}
                  aria-label="Selected stop color"
                  className="h-6 w-7 shrink-0 cursor-pointer rounded border border-black/15 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={selectedStop.color.toUpperCase()}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                      const next = stops.map((s) =>
                        s.id === selectedStop.id ? { ...s, color: v } : s
                      );
                      commitGradient({}, next);
                    }
                  }}
                  className="font-mono-num w-20 rounded-md border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117] px-1.5 py-0.5 text-[11px]"
                />
                <div className="flex items-center gap-1 ml-auto">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={selectedStop.offset}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                      const next = stops.map((s) =>
                        s.id === selectedStop.id ? { ...s, offset: val } : s
                      );
                      commitGradient({}, next);
                    }}
                    className="font-mono-num w-11 rounded-md border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117] px-1 py-0.5 text-right text-[11px]"
                  />
                  <span className="text-[10px] text-slate-400">%</span>
                  <button
                    type="button"
                    disabled={stops.length <= 2}
                    onClick={() => handleDeleteStop(selectedStop.id)}
                    title="Remove color stop"
                    className="rounded p-1 text-slate-400 hover:text-red-500 disabled:opacity-30 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Angle Dial (Linear) OR Focal Pad + Radius (Radial) */}
          {currentTab === 'linear' ? (
            <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#1E222D] p-2.5">
              <svg
                ref={dialRef}
                viewBox="0 0 48 48"
                onPointerDown={(e) => {
                  e.preventDefault();
                  setDraggingDial(true);
                }}
                className="h-12 w-12 shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
              >
                <title>Drag dial to set gradient angle (hold Shift for 15° snap)</title>
                <circle
                  cx={24}
                  cy={24}
                  r={21}
                  fill="none"
                  stroke="currentColor"
                  className="text-slate-300 dark:text-slate-600"
                  strokeWidth={2}
                />
                <line
                  x1={24}
                  y1={24}
                  x2={knobX}
                  y2={knobY}
                  stroke="#6366F1"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <circle cx={24} cy={24} r={2.5} fill="#64748B" />
                <circle cx={knobX} cy={knobY} r={4.5} fill="#4F46E5" stroke="#FFFFFF" strokeWidth={1.5} />
              </svg>

              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span>Angle</span>
                  <span className="font-mono-num text-indigo-600 dark:text-indigo-400">
                    {activeGradient.angle}°
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[0, 45, 90, 135, 180].map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => commitGradient({ angle: deg })}
                      className={`rounded-lg border py-0.5 text-[10px] font-mono-num active:scale-95 transition-transform cursor-pointer ${
                        activeGradient.angle === deg
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117]'
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#1E222D] p-2.5">
              <div
                ref={focalRef}
                onPointerDown={(e) => {
                  e.preventDefault();
                  setDraggingFocal(true);
                }}
                title="Drag to move radial focal highlight"
                className="relative h-12 w-12 shrink-0 rounded-lg border border-black/15 dark:border-white/15 cursor-crosshair overflow-hidden touch-none"
                style={{ backgroundImage: buildGradientCss(activeGradient) }}
              >
                <span
                  className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-900 shadow"
                  style={{
                    left: `${activeGradient.radialCx ?? 50}%`,
                    top: `${activeGradient.radialCy ?? 50}%`,
                  }}
                />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-[10.5px] font-semibold">
                  <span>Spread Radius</span>
                  <span className="font-mono-num">{activeGradient.radialR ?? 60}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={120}
                  value={activeGradient.radialR ?? 60}
                  onChange={(e) => commitGradient({ radialR: Number(e.target.value) })}
                  className="w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Curated Metallic / Luxury / Neon / Brand Presets */}
          <div className="space-y-1.5 border-t border-[#E2E8F0] dark:border-[#2A2F3D] pt-2">
            <div className="flex items-center justify-between gap-1">
              {(['All', 'Metallic', 'Luxury', 'Neon', 'Brand'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setPresetCategory(cat)}
                  className={`rounded-full px-2 py-0.5 text-[9.5px] font-semibold cursor-pointer ${
                    presetCategory === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-[#1E222D] text-slate-500 dark:text-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-1.5 max-h-24 overflow-y-auto pr-0.5">
              {visiblePresets.map((gp) => {
                const css = `linear-gradient(${gp.angle}deg, ${gp.stops
                  .map((s) => `${s.color} ${s.offset}%`)
                  .join(', ')})`;
                return (
                  <button
                    key={gp.id}
                    type="button"
                    onClick={() => {
                      const nextStops: GradientStop[] = gp.stops.map((s, idx) => ({
                        id: `pst-${gp.id}-${idx}`,
                        offset: s.offset,
                        color: s.color,
                      }));
                      setSelectedStopId(nextStops[0].id);
                      commitGradient(
                        {
                          type: currentTab,
                          angle: gp.angle,
                        },
                        nextStops
                      );
                    }}
                    title={`${gp.category}: ${gp.name}`}
                    className="group relative h-7 rounded-lg border border-black/15 dark:border-white/15 cursor-pointer overflow-hidden"
                    style={{ backgroundImage: css }}
                  >
                    <span className="sr-only">{gp.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. PATTERN TAB (Clipped cleanly inside Text or Shape!) */}
      {currentTab === 'pattern' && (
        <div className="space-y-2.5">
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
            Pattern fills clip directly inside {isText ? 'letterforms' : 'the shape contour'}.
          </p>

          <div className="grid grid-cols-4 gap-1.5">
            {PATTERN_PRESETS.map((pat) => {
              const active = activePattern.preset === pat.kind;
              return (
                <button
                  key={pat.kind}
                  type="button"
                  onClick={() => commitPattern({ preset: pat.kind })}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-1.5 text-[9.5px] font-semibold active:scale-95 transition-transform cursor-pointer ${
                    active
                      ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                      : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#1E222D] text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <svg viewBox="0 0 16 16" className="h-5 w-5 rounded border border-black/10 bg-white">
                    <path
                      d={pat.previewPath}
                      fill={pat.kind === 'terrazzo-geo' ? activePattern.foregroundColor : 'none'}
                      stroke={activePattern.foregroundColor}
                      strokeWidth={pat.kind === 'halftone-dots' ? 2.5 : 1.6}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="truncate w-full text-center">{pat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center justify-between rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#1E222D] px-2 py-1 text-[11px] font-medium">
              <span>Ink</span>
              <input
                type="color"
                value={toSafeHex(activePattern.foregroundColor, activePalette.primary)}
                onChange={(e) => commitPattern({ foregroundColor: e.target.value })}
                className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
              />
            </label>
            <div className="flex items-center justify-between rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#1E222D] px-2 py-1 text-[11px] font-medium">
              <span>Backdrop</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    commitPattern({
                      backgroundColor:
                        activePattern.backgroundColor === 'transparent'
                          ? activePalette.secondary
                          : 'transparent',
                    })
                  }
                  title="Toggle transparent pattern backdrop"
                  className="rounded border border-[#E2E8F0] dark:border-[#2A2F3D] px-1 text-[9px] font-semibold cursor-pointer"
                >
                  {activePattern.backgroundColor === 'transparent' ? 'None' : 'Clear'}
                </button>
                <input
                  type="color"
                  value={toSafeHex(
                    activePattern.backgroundColor === 'transparent'
                      ? '#FFFFFF'
                      : activePattern.backgroundColor,
                    '#FFFFFF'
                  )}
                  onChange={(e) => commitPattern({ backgroundColor: e.target.value })}
                  className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between text-[10px] font-medium text-slate-500 dark:text-slate-400">
                <span>Scale</span>
                <span className="font-mono-num">{activePattern.scale.toFixed(1)}×</span>
              </div>
              <input
                type="range"
                min={0.4}
                max={2.4}
                step={0.1}
                value={activePattern.scale}
                onChange={(e) => commitPattern({ scale: Number(e.target.value) })}
                className="w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-medium text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-0.5">
                  <RotateCw className="h-2.5 w-2.5" /> Angle
                </span>
                <span className="font-mono-num">{activePattern.rotation}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                step={15}
                value={activePattern.rotation}
                onChange={(e) => commitPattern({ rotation: Number(e.target.value) })}
                className="w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
