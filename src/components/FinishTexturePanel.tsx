import React from 'react';
import { RefreshCw, RotateCcw, Sparkles } from 'lucide-react';
import { SurfaceTextureConfig, SurfaceTexturePreset } from '../types/logo';
import {
  DEFAULT_SURFACE_TEXTURE,
  SURFACE_TEXTURE_PRESETS,
} from '../utils/surfaceTextures';

interface FinishTexturePanelProps {
  texture?: SurfaceTextureConfig;
  onChange: (next: SurfaceTextureConfig) => void;
  compact?: boolean;
}

function TexturePreviewSwatch({ preset }: { preset: SurfaceTexturePreset }) {
  if (preset === 'none') {
    return (
      <svg viewBox="0 0 48 32" className="h-7 w-11 rounded-md border border-black/10 dark:border-white/15 shrink-0">
        <rect width={48} height={32} fill="#1E293B" />
        <circle cx={24} cy={16} r={9} fill="#6366F1" />
      </svg>
    );
  }
  if (preset === 'vintage-grit') {
    return (
      <svg viewBox="0 0 48 32" className="h-7 w-11 rounded-md border border-black/10 dark:border-white/15 shrink-0">
        <rect width={48} height={32} fill="#FAF9F6" />
        <rect x={4} y={4} width={40} height={24} rx={4} fill="#1E293B" />
        <circle cx={11} cy={10} r={1.2} fill="#FAF9F6" />
        <circle cx={19} cy={18} r={1.5} fill="#FAF9F6" />
        <circle cx={31} cy={11} r={1.1} fill="#FAF9F6" />
        <circle cx={38} cy={22} r={1.4} fill="#FAF9F6" />
        <rect x={23} y={8} width={6} height={1.2} rx={0.6} fill="#FAF9F6" transform="rotate(-15 23 8)" />
        <rect x={12} y={22} width={8} height={1.1} rx={0.5} fill="#FAF9F6" transform="rotate(11 12 22)" />
      </svg>
    );
  }
  if (preset === 'halftone-dots') {
    return (
      <svg viewBox="0 0 48 32" className="h-7 w-11 rounded-md border border-black/10 dark:border-white/15 shrink-0">
        <rect width={48} height={32} fill="#FAF9F6" />
        <rect x={4} y={4} width={40} height={24} rx={4} fill="#4F46E5" />
        {[10, 18, 26, 34].map((x) =>
          [10, 17, 23].map((y, yi) => (
            <circle
              key={`${x}-${y}`}
              cx={x + (yi % 2) * 3}
              cy={y}
              r={1.6}
              fill="#FAF9F6"
              opacity={0.85}
            />
          ))
        )}
      </svg>
    );
  }
  if (preset === 'brushed-metal') {
    return (
      <svg viewBox="0 0 48 32" className="h-7 w-11 rounded-md border border-black/10 dark:border-white/15 shrink-0">
        <defs>
          <linearGradient id="swatch-metal" x1="0" y1="0" x2="1" y2="0.6">
            <stop offset="0%" stopColor="#64748B" />
            <stop offset="45%" stopColor="#E2E8F0" />
            <stop offset="70%" stopColor="#475569" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>
        </defs>
        <rect width={48} height={32} fill="url(#swatch-metal)" />
        <line x1={2} y1={8} x2={46} y2={8} stroke="#FFFFFF" strokeWidth={0.7} opacity={0.55} />
        <line x1={2} y1={14} x2={46} y2={14} stroke="#0F172A" strokeWidth={0.6} opacity={0.35} />
        <line x1={2} y1={21} x2={46} y2={21} stroke="#FFFFFF" strokeWidth={0.7} opacity={0.5} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 32" className="h-7 w-11 rounded-md border border-black/10 dark:border-white/15 shrink-0">
      <rect width={48} height={32} fill="#F4F1EA" />
      <line x1={8} y1={9} x2={13} y2={12} stroke="#94A3B8" strokeWidth={0.9} />
      <line x1={24} y1={7} x2={28} y2={11} stroke="#64748B" strokeWidth={0.8} />
      <line x1={34} y1={21} x2={40} y2={19} stroke="#94A3B8" strokeWidth={0.9} />
      <circle cx={17} cy={23} r={0.9} fill="#64748B" />
      <circle cx={30} cy={16} r={0.8} fill="#94A3B8" />
    </svg>
  );
}

export const FinishTexturePanel: React.FC<FinishTexturePanelProps> = ({
  texture,
  onChange,
  compact = false,
}) => {
  const current: SurfaceTextureConfig = texture ?? DEFAULT_SURFACE_TEXTURE;
  const activePreset = current.enabled ? current.preset : 'none';
  const activeMeta =
    SURFACE_TEXTURE_PRESETS.find((m) => m.preset === activePreset) ??
    SURFACE_TEXTURE_PRESETS[0];

  const selectPreset = (preset: SurfaceTexturePreset) => {
    if (preset === 'none') {
      onChange({
        ...current,
        enabled: false,
        preset: 'none',
      });
      return;
    }
    const meta =
      SURFACE_TEXTURE_PRESETS.find((m) => m.preset === preset) ??
      SURFACE_TEXTURE_PRESETS[1];
    onChange({
      enabled: true,
      preset,
      intensity: meta.defaultIntensity,
      scale: meta.defaultScale,
      angle: meta.defaultAngle,
      seed: current.seed ?? 42,
      mode: meta.defaultMode,
      inverted: false,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Finish &amp; Surface Texture
          </span>
        </div>
        {current.enabled && current.preset !== 'none' && (
          <button
            type="button"
            onClick={() => selectPreset('none')}
            className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {!compact && (
        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          Non-destructive vector distress masks, halftone dot screens, metallic foil sheen, and cotton paper grain that export cleanly in SVG, PNG &amp; PDF.
        </p>
      )}

      {/* Preset Selector List */}
      <div className={compact ? 'grid grid-cols-1 gap-1.5' : 'space-y-1.5'}>
        {SURFACE_TEXTURE_PRESETS.map((meta) => {
          const isSelected = activePreset === meta.preset;
          return (
            <button
              key={meta.preset}
              type="button"
              onClick={() => selectPreset(meta.preset)}
              className={`flex w-full items-center gap-2.5 rounded-xl border p-2 text-left transition-all active:scale-[0.99] cursor-pointer ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-500/15 ring-1 ring-indigo-500/40'
                  : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#1E222D] hover:border-indigo-300 dark:hover:border-indigo-500/50'
              }`}
            >
              <TexturePreviewSwatch preset={meta.preset} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-tight text-slate-900 dark:text-slate-100">
                  {meta.label}
                </p>
                <p className="truncate text-[10.5px] text-slate-500 dark:text-slate-400">
                  {meta.subtitle}
                </p>
              </div>
              {isSelected && (
                <span className="rounded-md bg-indigo-600 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white shrink-0">
                  On
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Parameter Sliders when Texture Active */}
      {current.enabled && current.preset !== 'none' && (
        <div className="space-y-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#0F1117] p-2.5">
          {/* Application Mode */}
          <div>
            <p className="text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Finish Application
            </p>
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  { id: 'distress', label: 'Distress Hole' },
                  { id: 'overlay', label: 'Art Sheen' },
                  { id: 'canvas', label: 'Print Sheet' },
                ] as const
              ).map((m) => {
                const modeActive = (current.mode ?? activeMeta.defaultMode) === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onChange({ ...current, mode: m.id })}
                    className={`rounded-lg border py-1 text-[10px] font-semibold cursor-pointer transition-colors ${
                      modeActive
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#181B23] text-slate-700 dark:text-slate-200 hover:border-indigo-400'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Intensity Slider */}
          <div>
            <div className="flex justify-between text-[10.5px] font-medium text-slate-700 dark:text-slate-200">
              <span>Intensity</span>
              <span className="font-mono-num text-indigo-600 dark:text-indigo-400">
                {Math.round(current.intensity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={current.intensity}
              onChange={(e) =>
                onChange({ ...current, intensity: Number(e.target.value) })
              }
              className="mt-1 w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
            />
          </div>

          {/* Texture Scale */}
          <div>
            <div className="flex justify-between text-[10.5px] font-medium text-slate-700 dark:text-slate-200">
              <span>Texture Grain Scale</span>
              <span className="font-mono-num text-indigo-600 dark:text-indigo-400">
                {Math.round(current.scale * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.4}
              max={2.4}
              step={0.05}
              value={current.scale}
              onChange={(e) =>
                onChange({ ...current, scale: Number(e.target.value) })
              }
              className="mt-1 w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
            />
          </div>

          {/* Angle Slider */}
          <div>
            <div className="flex justify-between text-[10.5px] font-medium text-slate-700 dark:text-slate-200">
              <span>Pattern Angle</span>
              <span className="font-mono-num text-indigo-600 dark:text-indigo-400">
                {Math.round(current.angle ?? activeMeta.defaultAngle)}°
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={180}
              step={3}
              value={current.angle ?? activeMeta.defaultAngle}
              onChange={(e) =>
                onChange({ ...current, angle: Number(e.target.value) })
              }
              className="mt-1 w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
            />
          </div>

          {/* Distress Invert & Reseed Controls */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            {(current.mode ?? activeMeta.defaultMode) === 'distress' ? (
              <label className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(current.inverted)}
                  onChange={(e) =>
                    onChange({ ...current, inverted: e.target.checked })
                  }
                  className="h-3.5 w-3.5 rounded accent-indigo-600"
                />
                <span>Invert Mask</span>
              </label>
            ) : (
              <span className="text-[10px] text-slate-400">Non-destructive vector</span>
            )}

            {current.preset !== 'halftone-dots' && (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...current,
                    seed: ((current.seed ?? 42) * 13 + 7) % 9999,
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#181B23] px-2 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-400 cursor-pointer active:scale-95 transition-all"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Shuffle Grain</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
