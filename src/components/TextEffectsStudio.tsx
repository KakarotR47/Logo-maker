import React, { useState } from 'react';
import { RotateCcw, Spline } from 'lucide-react';
import {
  ColorPalette,
  TextEffectConfig,
  TextEffectStyleKind,
  TextLayer,
  TextWarpMode,
} from '../types/logo';
import { resolveEffectiveTextWarp } from './CanvasLayerRenderer';

interface TextEffectsStudioProps {
  layer: TextLayer;
  activePalette: ColorPalette;
  onChange: (patch: Partial<TextLayer>) => void;
  onConvertTextToPath?: () => Promise<void>;
  convertingPath?: boolean;
  compact?: boolean;
}

type StudioSubTab = 'styles' | 'warp' | 'finetune';

const EFFECT_STYLE_CARDS: Array<{
  id: TextEffectStyleKind;
  label: string;
  desc: string;
}> = [
  { id: 'none', label: 'Clean', desc: 'Solid fill' },
  { id: 'hollow', label: 'Hollow', desc: 'Crisp outline' },
  { id: 'splice', label: 'Splice', desc: 'Offset layer' },
  { id: 'neon', label: 'Neon', desc: 'Luminous glow' },
  { id: 'extrude', label: '3D Block', desc: 'Stacked depth' },
  { id: 'glitch', label: 'Glitch', desc: 'RGB split' },
  { id: 'foil', label: 'Foil', desc: 'Metallic sheen' },
];

const FOIL_PRESETS: Array<{
  label: string;
  primary: string;
  secondary: string;
}> = [
  { label: 'Gold', primary: '#FFF3B0', secondary: '#B45309' },
  { label: 'Chrome', primary: '#F8FAFC', secondary: '#475569' },
  { label: 'Copper', primary: '#FED7AA', secondary: '#9A3412' },
  { label: 'Emerald', primary: '#A7F3D0', secondary: '#065F46' },
];

const NEON_SWATCHES = ['#22D3EE', '#EC4899', '#10B981', '#F59E0B', '#A855F7'];

const WARP_CARDS: Array<{
  id: TextWarpMode;
  label: string;
}> = [
  { id: 'none', label: 'Flat' },
  { id: 'arc-up', label: 'Arc Up' },
  { id: 'arc-down', label: 'Arc Down' },
  { id: 'circle', label: 'Circle Ring' },
  { id: 'wave', label: 'Wave' },
  { id: 'slant', label: 'Perspective' },
];

function strengthToCurveRadius(mode: TextWarpMode, strength: number): number {
  const clamped = Math.max(8, Math.min(100, strength));
  const radius = Math.round(260 - (clamped / 100) * 200);
  if (mode === 'arc-down') return -radius;
  if (mode === 'arc-up') return radius;
  if (mode === 'circle') return 72;
  return 0;
}

export const TextEffectsStudio: React.FC<TextEffectsStudioProps> = ({
  layer,
  activePalette,
  onChange,
  onConvertTextToPath,
  convertingPath = false,
  compact = false,
}) => {
  const [subTab, setSubTab] = useState<StudioSubTab>('styles');

  const currentEffect: TextEffectConfig = layer.textEffect ?? { style: 'none' };
  const effectiveWarp = resolveEffectiveTextWarp(layer);

  const selectEffectStyle = (style: TextEffectStyleKind) => {
    if (style === 'none') {
      onChange({
        textEffect: { style: 'none' },
      });
      return;
    }

    const defaults: Record<Exclude<TextEffectStyleKind, 'none'>, TextEffectConfig> = {
      hollow: {
        style: 'hollow',
        offset: 2.5,
        primaryColor: layer.fill || activePalette.primary,
      },
      splice: {
        style: 'splice',
        offset: 5,
        angle: 45,
        primaryColor: activePalette.accent || '#E09F3E',
        secondaryColor: layer.fill || activePalette.primary,
      },
      neon: {
        style: 'neon',
        intensity: 1.2,
        primaryColor: '#22D3EE',
      },
      extrude: {
        style: 'extrude',
        offset: 7,
        angle: 48,
        primaryColor: '#1E293B',
      },
      glitch: {
        style: 'glitch',
        offset: 4,
        primaryColor: '#06B6D4',
        secondaryColor: '#EC4899',
      },
      foil: {
        style: 'foil',
        intensity: 1,
        primaryColor: '#FFF3B0',
        secondaryColor: '#B45309',
      },
    };

    onChange({
      textEffect: defaults[style],
    });
  };

  const patchEffect = (patch: Partial<TextEffectConfig>) => {
    onChange({
      textEffect: {
        ...currentEffect,
        ...patch,
      },
    });
  };

  const selectWarpMode = (mode: TextWarpMode) => {
    if (mode === 'none') {
      onChange({
        curveRadius: 0,
        textWarp: {
          mode: 'none',
          strength: 0,
          slant: 0,
          perspective: 0,
        },
      });
      return;
    }

    if (mode === 'slant') {
      onChange({
        curveRadius: 0,
        textWarp: {
          mode: 'slant',
          strength: 0,
          slant: effectiveWarp.slant !== 0 ? effectiveWarp.slant : -14,
          perspective: effectiveWarp.perspective !== 0 ? effectiveWarp.perspective : -6,
        },
      });
      return;
    }

    const nextStrength = effectiveWarp.strength > 0 ? effectiveWarp.strength : 52;
    onChange({
      curveRadius: strengthToCurveRadius(mode, nextStrength),
      textWarp: {
        mode,
        strength: nextStrength,
        slant: effectiveWarp.slant,
        perspective: effectiveWarp.perspective,
      },
    });
  };

  const updateWarpValues = (patch: Partial<{ strength: number; slant: number; perspective: number }>) => {
    const nextStrength = patch.strength ?? (effectiveWarp.strength || 50);
    const nextSlant = patch.slant ?? effectiveWarp.slant;
    const nextPerspective = patch.perspective ?? effectiveWarp.perspective;
    const nextMode =
      effectiveWarp.mode === 'none' && (nextSlant !== 0 || nextPerspective !== 0)
        ? 'slant'
        : effectiveWarp.mode;

    onChange({
      curveRadius:
        nextMode === 'arc-up' || nextMode === 'arc-down' || nextMode === 'circle'
          ? strengthToCurveRadius(nextMode, nextStrength)
          : 0,
      textWarp: {
        mode: nextMode,
        strength: nextStrength,
        slant: nextSlant,
        perspective: nextPerspective,
      },
    });
  };

  const renderEffectSpecimen = (style: TextEffectStyleKind) => {
    const ink = layer.fill && layer.fill !== 'transparent' ? layer.fill : activePalette.primary;
    switch (style) {
      case 'none':
        return (
          <svg viewBox="0 0 64 36" className="h-9 w-full">
            <text
              x={32}
              y={25}
              textAnchor="middle"
              fontSize={22}
              fontWeight={800}
              fill={ink}
            >
              Aa
            </text>
          </svg>
        );
      case 'hollow':
        return (
          <svg viewBox="0 0 64 36" className="h-9 w-full">
            <text
              x={32}
              y={25}
              textAnchor="middle"
              fontSize={22}
              fontWeight={800}
              fill="none"
              stroke={ink}
              strokeWidth={1.8}
            >
              Aa
            </text>
          </svg>
        );
      case 'splice':
        return (
          <svg viewBox="0 0 64 36" className="h-9 w-full">
            <text
              x={35}
              y={28}
              textAnchor="middle"
              fontSize={22}
              fontWeight={800}
              fill={activePalette.accent || '#E09F3E'}
            >
              Aa
            </text>
            <text
              x={31}
              y={24}
              textAnchor="middle"
              fontSize={22}
              fontWeight={800}
              fill="none"
              stroke={ink}
              strokeWidth={1.6}
            >
              Aa
            </text>
          </svg>
        );
      case 'neon':
        return (
          <svg viewBox="0 0 64 36" className="h-9 w-full rounded bg-[#0F172A]">
            <text
              x={32}
              y={25}
              textAnchor="middle"
              fontSize={22}
              fontWeight={800}
              fill="#E0F2FE"
              stroke="#22D3EE"
              strokeWidth={2.6}
              opacity={0.4}
            >
              Aa
            </text>
            <text
              x={32}
              y={25}
              textAnchor="middle"
              fontSize={22}
              fontWeight={800}
              fill="#FFFFFF"
            >
              Aa
            </text>
          </svg>
        );
      case 'extrude':
        return (
          <svg viewBox="0 0 64 36" className="h-9 w-full">
            {[4, 3, 2, 1].map((d) => (
              <text
                key={d}
                x={31 + d}
                y={24 + d}
                textAnchor="middle"
                fontSize={22}
                fontWeight={800}
                fill="#334155"
              >
                Aa
              </text>
            ))}
            <text
              x={31}
              y={24}
              textAnchor="middle"
              fontSize={22}
              fontWeight={800}
              fill={activePalette.accent || '#2563EB'}
            >
              Aa
            </text>
          </svg>
        );
      case 'glitch':
        return (
          <svg viewBox="0 0 64 36" className="h-9 w-full">
            <text
              x={29}
              y={25}
              textAnchor="middle"
              fontSize={22}
              fontWeight={800}
              fill="#06B6D4"
              opacity={0.85}
            >
              Aa
            </text>
            <text
              x={35}
              y={25}
              textAnchor="middle"
              fontSize={22}
              fontWeight={800}
              fill="#EC4899"
              opacity={0.85}
            >
              Aa
            </text>
            <text
              x={32}
              y={25}
              textAnchor="middle"
              fontSize={22}
              fontWeight={800}
              fill="#0F172A"
            >
              Aa
            </text>
          </svg>
        );
      case 'foil':
        return (
          <svg viewBox="0 0 64 36" className="h-9 w-full">
            <defs>
              <linearGradient id="specimen-foil-preview" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#92400E" />
                <stop offset="45%" stopColor="#FFF3B0" />
                <stop offset="65%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#78350F" />
              </linearGradient>
            </defs>
            <text
              x={32}
              y={25}
              textAnchor="middle"
              fontSize={22}
              fontWeight={800}
              fill="url(#specimen-foil-preview)"
              stroke="#78350F"
              strokeWidth={0.6}
            >
              Aa
            </text>
          </svg>
        );
    }
  };

  const renderWarpIcon = (mode: TextWarpMode) => {
    switch (mode) {
      case 'none':
        return (
          <svg viewBox="0 0 48 24" className="h-5 w-10">
            <line x1={6} y1={14} x2={42} y2={14} stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
          </svg>
        );
      case 'arc-up':
        return (
          <svg viewBox="0 0 48 24" className="h-5 w-10">
            <path d="M 6 18 Q 24 4 42 18" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
          </svg>
        );
      case 'arc-down':
        return (
          <svg viewBox="0 0 48 24" className="h-5 w-10">
            <path d="M 6 6 Q 24 20 42 6" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
          </svg>
        );
      case 'circle':
        return (
          <svg viewBox="0 0 48 24" className="h-5 w-10">
            <circle cx={24} cy={12} r={8} fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="34 10" />
          </svg>
        );
      case 'wave':
        return (
          <svg viewBox="0 0 48 24" className="h-5 w-10">
            <path d="M 5 12 C 13 3, 19 3, 24 12 C 29 21, 35 21, 43 12" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
          </svg>
        );
      case 'slant':
        return (
          <svg viewBox="0 0 48 24" className="h-5 w-10">
            <polygon points="10,18 16,6 38,6 32,18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
          </svg>
        );
    }
  };

  return (
    <div className="space-y-3">
      {/* Segmented Sub-tabs */}
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-100 dark:bg-[#1E222D] p-1">
        {(
          [
            { id: 'styles', label: 'Styles' },
            { id: 'warp', label: 'Warp & Slant' },
            { id: 'finetune', label: 'Fine-Tune' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`rounded-lg py-1.5 text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              subTab === tab.id
                ? 'bg-white dark:bg-[#0F1117] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================================================================= */}
      {/* 1. TEXT STYLES (Canva-style 1-Click Visual Effect Cards)          */}
      {/* ================================================================= */}
      {subTab === 'styles' && (
        <div className="space-y-3">
          <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-3'} gap-1.5`}>
            {EFFECT_STYLE_CARDS.map((card) => {
              const active = currentEffect.style === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => selectEffectStyle(card.id)}
                  className={`flex flex-col items-center rounded-xl border p-1.5 text-center transition-all active:scale-95 cursor-pointer ${
                    active
                      ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-500/15 ring-1 ring-indigo-500'
                      : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#1E222D] hover:border-slate-400 dark:hover:border-slate-500'
                  }`}
                >
                  {renderEffectSpecimen(card.id)}
                  <span className="mt-1 text-[10.5px] font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                    {card.label}
                  </span>
                  <span className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-tight">
                    {card.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {currentEffect.style !== 'none' && (
            <div className="space-y-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#1E222D] p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 capitalize">
                  {currentEffect.style} Controls
                </span>
                <button
                  type="button"
                  onClick={() => selectEffectStyle('none')}
                  className="inline-flex items-center gap-1 text-[10.5px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear
                </button>
              </div>

              {currentEffect.style === 'hollow' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span>Stroke Weight</span>
                    <span className="font-mono-num">{(currentEffect.offset ?? 2.5).toFixed(1)}px</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    step={0.5}
                    value={currentEffect.offset ?? 2.5}
                    onChange={(e) => patchEffect({ offset: Number(e.target.value) })}
                    className="w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
                  />
                  <label className="flex items-center justify-between text-[11px]">
                    <span>Outline Color</span>
                    <input
                      type="color"
                      value={currentEffect.primaryColor || layer.fill || activePalette.primary}
                      onChange={(e) => patchEffect({ primaryColor: e.target.value })}
                      className="h-6 w-8 cursor-pointer rounded border border-[#E2E8F0] dark:border-[#2A2F3D] p-0.5"
                    />
                  </label>
                </div>
              )}

              {(currentEffect.style === 'splice' || currentEffect.style === 'extrude') && (
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span>{currentEffect.style === 'extrude' ? 'Extrude Depth' : 'Offset Distance'}</span>
                      <span className="font-mono-num">{currentEffect.offset ?? 6}px</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={16}
                      step={1}
                      value={currentEffect.offset ?? 6}
                      onChange={(e) => patchEffect({ offset: Number(e.target.value) })}
                      className="w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span>Angle</span>
                      <span className="font-mono-num">{currentEffect.angle ?? 45}°</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={359}
                      step={5}
                      value={currentEffect.angle ?? 45}
                      onChange={(e) => patchEffect({ angle: Number(e.target.value) })}
                      className="w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    {currentEffect.style === 'splice' ? (
                      <>
                        <label className="flex items-center gap-1.5 text-[11px]">
                          <span>Front Line</span>
                          <input
                            type="color"
                            value={currentEffect.secondaryColor || layer.fill || activePalette.primary}
                            onChange={(e) => patchEffect({ secondaryColor: e.target.value })}
                            className="h-6 w-7 cursor-pointer rounded border border-[#E2E8F0] dark:border-[#2A2F3D] p-0.5"
                          />
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px]">
                          <span>Offset Fill</span>
                          <input
                            type="color"
                            value={currentEffect.primaryColor || activePalette.accent || '#E09F3E'}
                            onChange={(e) => patchEffect({ primaryColor: e.target.value })}
                            className="h-6 w-7 cursor-pointer rounded border border-[#E2E8F0] dark:border-[#2A2F3D] p-0.5"
                          />
                        </label>
                      </>
                    ) : (
                      <label className="flex items-center gap-1.5 text-[11px]">
                        <span>Block Shade</span>
                        <input
                          type="color"
                          value={currentEffect.primaryColor || '#1E293B'}
                          onChange={(e) => patchEffect({ primaryColor: e.target.value })}
                          className="h-6 w-7 cursor-pointer rounded border border-[#E2E8F0] dark:border-[#2A2F3D] p-0.5"
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {currentEffect.style === 'neon' && (
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span>Glow Intensity</span>
                      <span className="font-mono-num">
                        {Math.round((currentEffect.intensity ?? 1.2) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.4}
                      max={2}
                      step={0.1}
                      value={currentEffect.intensity ?? 1.2}
                      onChange={(e) => patchEffect({ intensity: Number(e.target.value) })}
                      className="w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1">
                      {NEON_SWATCHES.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => patchEffect({ primaryColor: hex })}
                          title={hex}
                          className="h-5 w-5 rounded-full border border-black/15 cursor-pointer"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={currentEffect.primaryColor || '#22D3EE'}
                      onChange={(e) => patchEffect({ primaryColor: e.target.value })}
                      className="h-6 w-7 cursor-pointer rounded border border-[#E2E8F0] dark:border-[#2A2F3D] p-0.5"
                    />
                  </div>
                </div>
              )}

              {currentEffect.style === 'glitch' && (
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span>Channel Split</span>
                      <span className="font-mono-num">{currentEffect.offset ?? 4}px</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={12}
                      step={0.5}
                      value={currentEffect.offset ?? 4}
                      onChange={(e) => patchEffect({ offset: Number(e.target.value) })}
                      className="w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-[11px]">
                      <span>Left</span>
                      <input
                        type="color"
                        value={currentEffect.primaryColor || '#06B6D4'}
                        onChange={(e) => patchEffect({ primaryColor: e.target.value })}
                        className="h-6 w-7 cursor-pointer rounded border border-[#E2E8F0] dark:border-[#2A2F3D] p-0.5"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px]">
                      <span>Right</span>
                      <input
                        type="color"
                        value={currentEffect.secondaryColor || '#EC4899'}
                        onChange={(e) => patchEffect({ secondaryColor: e.target.value })}
                        className="h-6 w-7 cursor-pointer rounded border border-[#E2E8F0] dark:border-[#2A2F3D] p-0.5"
                      />
                    </label>
                  </div>
                </div>
              )}

              {currentEffect.style === 'foil' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-1">
                    {FOIL_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          patchEffect({
                            primaryColor: preset.primary,
                            secondaryColor: preset.secondary,
                          })
                        }
                        className="rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117] py-1 text-[10px] font-semibold hover:border-indigo-500 active:scale-95 transition-transform cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-[11px]">
                      <span>Highlight</span>
                      <input
                        type="color"
                        value={currentEffect.primaryColor || '#FFF3B0'}
                        onChange={(e) => patchEffect({ primaryColor: e.target.value })}
                        className="h-6 w-7 cursor-pointer rounded border border-[#E2E8F0] dark:border-[#2A2F3D] p-0.5"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px]">
                      <span>Deep Tone</span>
                      <input
                        type="color"
                        value={currentEffect.secondaryColor || '#B45309'}
                        onChange={(e) => patchEffect({ secondaryColor: e.target.value })}
                        className="h-6 w-7 cursor-pointer rounded border border-[#E2E8F0] dark:border-[#2A2F3D] p-0.5"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* 2. WARP & SHAPE (Arc Up/Down, Circle Ring, Wave, Slant/Tilt)      */}
      {/* ================================================================= */}
      {subTab === 'warp' && (
        <div className="space-y-3">
          <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-3'} gap-1.5`}>
            {WARP_CARDS.map((card) => {
              const active = effectiveWarp.mode === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => selectWarpMode(card.id)}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center transition-all active:scale-95 cursor-pointer ${
                    active
                      ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                      : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#1E222D] text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500'
                  }`}
                >
                  {renderWarpIcon(card.id)}
                  <span className="text-[10.5px] font-semibold leading-tight">{card.label}</span>
                </button>
              );
            })}
          </div>

          {(effectiveWarp.mode === 'arc-up' ||
            effectiveWarp.mode === 'arc-down' ||
            effectiveWarp.mode === 'circle' ||
            effectiveWarp.mode === 'wave') && (
            <div className="rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#1E222D] p-2.5 space-y-1.5">
              <div className="flex justify-between text-[11px] font-semibold">
                <span>
                  {effectiveWarp.mode === 'wave'
                    ? 'Wave Amplitude'
                    : effectiveWarp.mode === 'circle'
                      ? 'Ring Tightness'
                      : 'Curve Strength'}
                </span>
                <span className="font-mono-num">{effectiveWarp.strength}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={2}
                value={effectiveWarp.strength || 50}
                onChange={(e) => updateWarpValues({ strength: Number(e.target.value) })}
                className="w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
              />
            </div>
          )}

          {/* Perspective Slant & Vertical Tilt Sliders */}
          <div className="rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#1E222D] p-2.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                Perspective &amp; Slant
              </span>
              {(effectiveWarp.slant !== 0 || effectiveWarp.perspective !== 0) && (
                <button
                  type="button"
                  onClick={() => updateWarpValues({ slant: 0, perspective: 0 })}
                  className="text-[10.5px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Reset 0°
                </button>
              )}
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300">
                <span>Horizontal Slant</span>
                <span className="font-mono-num">{effectiveWarp.slant}°</span>
              </div>
              <input
                type="range"
                min={-35}
                max={35}
                step={1}
                value={effectiveWarp.slant}
                onChange={(e) => updateWarpValues({ slant: Number(e.target.value) })}
                className="w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300">
                <span>Perspective Tilt</span>
                <span className="font-mono-num">{effectiveWarp.perspective}°</span>
              </div>
              <input
                type="range"
                min={-30}
                max={30}
                step={1}
                value={effectiveWarp.perspective}
                onChange={(e) => updateWarpValues({ perspective: Number(e.target.value) })}
                className="w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. FINE-TUNE (Spacing, Outline, Shadow & Path Outlining)          */}
      {/* ================================================================= */}
      {subTab === 'finetune' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300">
                <span>Tracking</span>
                <span className="font-mono-num">{layer.letterSpacing.toFixed(2)}em</span>
              </div>
              <input
                type="range"
                min={-0.08}
                max={0.5}
                step={0.01}
                value={layer.letterSpacing}
                onChange={(e) => onChange({ letterSpacing: Number(e.target.value) })}
                className="mt-1 w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300">
                <span>Line Height</span>
                <span className="font-mono-num">{layer.lineHeight.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.8}
                max={2.0}
                step={0.05}
                value={layer.lineHeight}
                onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
                className="mt-1 w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] px-2.5 py-2">
            <div className="flex-1">
              <div className="flex justify-between text-[11px] font-medium">
                <span>Text Outline</span>
                <span className="font-mono-num">{layer.strokeWidth}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={12}
                step={0.5}
                value={layer.strokeWidth}
                onChange={(e) =>
                  onChange({
                    strokeWidth: Number(e.target.value),
                    stroke: layer.stroke === 'none' ? activePalette.primary : layer.stroke,
                  })
                }
                className="mt-0.5 w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
              />
            </div>
            <input
              type="color"
              value={layer.stroke === 'none' ? activePalette.primary : layer.stroke}
              onChange={(e) =>
                onChange({
                  stroke: e.target.value,
                  strokeWidth: layer.strokeWidth === 0 ? 2 : layer.strokeWidth,
                })
              }
              className="h-6 w-7 cursor-pointer rounded border border-[#E2E8F0] dark:border-[#2A2F3D] p-0.5"
            />
          </div>

          {/* Drop Shadow */}
          <div className="space-y-2 rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] p-2.5">
            <label className="flex items-center justify-between text-xs font-semibold cursor-pointer">
              <span>Drop Shadow</span>
              <input
                type="checkbox"
                checked={layer.shadow.enabled}
                onChange={(e) =>
                  onChange({
                    shadow: { ...layer.shadow, enabled: e.target.checked },
                  })
                }
                className="h-3.5 w-3.5 rounded accent-indigo-600 dark:accent-indigo-400"
              />
            </label>

            {layer.shadow.enabled && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="color"
                    value={layer.shadow.color.startsWith('#') ? layer.shadow.color : '#111827'}
                    onChange={(e) =>
                      onChange({
                        shadow: { ...layer.shadow, color: e.target.value },
                      })
                    }
                    className="h-6 w-8 cursor-pointer rounded border border-[#E2E8F0] dark:border-[#2A2F3D] p-0.5"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          shadow: {
                            enabled: true,
                            color: 'rgba(17, 24, 39, 0.24)',
                            blur: 10,
                            offsetX: 0,
                            offsetY: 5,
                          },
                        })
                      }
                      className="rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] px-2 py-0.5 text-[10px] font-medium cursor-pointer"
                    >
                      Soft
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          shadow: {
                            enabled: true,
                            color: '#141413',
                            blur: 0,
                            offsetX: 3,
                            offsetY: 3,
                          },
                        })
                      }
                      className="rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] px-2 py-0.5 text-[10px] font-medium cursor-pointer"
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
                      value={layer.shadow.blur}
                      onChange={(e) =>
                        onChange({
                          shadow: { ...layer.shadow, blur: Number(e.target.value) || 0 },
                        })
                      }
                      className="font-mono-num mt-0.5 w-full rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#1E222D] px-1.5 py-1 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400">
                    X
                    <input
                      type="number"
                      min={-30}
                      max={30}
                      value={layer.shadow.offsetX}
                      onChange={(e) =>
                        onChange({
                          shadow: { ...layer.shadow, offsetX: Number(e.target.value) || 0 },
                        })
                      }
                      className="font-mono-num mt-0.5 w-full rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#1E222D] px-1.5 py-1 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400">
                    Y
                    <input
                      type="number"
                      min={-30}
                      max={30}
                      value={layer.shadow.offsetY}
                      onChange={(e) =>
                        onChange({
                          shadow: { ...layer.shadow, offsetY: Number(e.target.value) || 0 },
                        })
                      }
                      className="font-mono-num mt-0.5 w-full rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#1E222D] px-1.5 py-1 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {onConvertTextToPath && (
            <button
              type="button"
              onClick={() => void onConvertTextToPath()}
              disabled={convertingPath}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-900 dark:bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:opacity-95 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
            >
              <Spline className="h-3.5 w-3.5" />
              {convertingPath ? 'Outlining Glyphs...' : 'Convert Text to Vector Path'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
