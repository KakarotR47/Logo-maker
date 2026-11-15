import {
  BlendMode,
  LogoLayer,
  SurfaceTextureConfig,
  SurfaceTexturePreset,
} from '../types/logo';

export const BLEND_MODE_OPTIONS: Array<{
  value: BlendMode;
  label: string;
  description: string;
}> = [
  { value: 'normal', label: 'Normal', description: 'Standard opaque stacking' },
  { value: 'multiply', label: 'Multiply', description: 'Darkens using ink absorption' },
  { value: 'screen', label: 'Screen', description: 'Brightens and adds light' },
  { value: 'overlay', label: 'Overlay', description: 'Boosts contrast & highlights' },
  { value: 'darken', label: 'Darken', description: 'Keeps darker tones beneath' },
  { value: 'lighten', label: 'Lighten', description: 'Keeps lighter tones beneath' },
  { value: 'color-burn', label: 'Color Burn', description: 'Deep saturated shadows' },
  { value: 'difference', label: 'Difference', description: 'Inverts overlapping contrast' },
];

export interface SurfaceTextureMeta {
  preset: SurfaceTexturePreset;
  label: string;
  subtitle: string;
  defaultMode: 'distress' | 'overlay' | 'canvas';
  defaultAngle: number;
  defaultScale: number;
  defaultIntensity: number;
}

export const SURFACE_TEXTURE_PRESETS: SurfaceTextureMeta[] = [
  {
    preset: 'none',
    label: 'Clean Vector',
    subtitle: 'Crisp unprinted finish',
    defaultMode: 'distress',
    defaultAngle: 0,
    defaultScale: 1,
    defaultIntensity: 0,
  },
  {
    preset: 'vintage-grit',
    label: 'Vintage Grit',
    subtitle: 'Worn ink distress & flecks',
    defaultMode: 'distress',
    defaultAngle: 12,
    defaultScale: 1,
    defaultIntensity: 0.65,
  },
  {
    preset: 'halftone-dots',
    label: 'Halftone Dots',
    subtitle: 'Classic angled dot screen',
    defaultMode: 'distress',
    defaultAngle: 22,
    defaultScale: 1,
    defaultIntensity: 0.6,
  },
  {
    preset: 'brushed-metal',
    label: 'Brushed Metal',
    subtitle: 'Directional satin foil sheen',
    defaultMode: 'overlay',
    defaultAngle: 18,
    defaultScale: 1,
    defaultIntensity: 0.72,
  },
  {
    preset: 'paper-grain',
    label: 'Paper Grain',
    subtitle: 'Letterpress cotton fibers',
    defaultMode: 'canvas',
    defaultAngle: 0,
    defaultScale: 1,
    defaultIntensity: 0.55,
  },
];

export const DEFAULT_SURFACE_TEXTURE: SurfaceTextureConfig = {
  enabled: false,
  preset: 'none',
  intensity: 0.65,
  scale: 1,
  angle: 15,
  seed: 42,
  mode: 'distress',
  inverted: false,
};

export interface KnockoutCompositingMap {
  /** Maps target layer ID -> visible knockout cutter layers above it (in z-order) */
  cuttersByTargetId: Map<string, LogoLayer[]>;
  /** Visible knockout layer IDs that successfully latched onto a visible target underneath */
  consumedKnockoutIds: Set<string>;
}

/**
 * Resolves which layers punch true transparent holes through layers underneath.
 * Each visible layer with `isKnockout: true` targets either its explicit `knockoutTargetId`
 * (if present & visible below it) or the nearest visible non-knockout layer directly beneath it.
 */
export function resolveKnockoutCompositing(layers: LogoLayer[]): KnockoutCompositingMap {
  const cuttersByTargetId = new Map<string, LogoLayer[]>();
  const consumedKnockoutIds = new Set<string>();

  const visibleBelowIds: string[] = [];
  let lastNonKnockoutVisibleId: string | null = null;

  for (const layer of layers) {
    if (!layer.visible) continue;

    if (!layer.isKnockout) {
      lastNonKnockoutVisibleId = layer.id;
      visibleBelowIds.push(layer.id);
      continue;
    }

    const explicitTarget =
      layer.knockoutTargetId && visibleBelowIds.includes(layer.knockoutTargetId)
        ? layer.knockoutTargetId
        : null;
    const resolvedTarget = explicitTarget ?? lastNonKnockoutVisibleId;

    if (!resolvedTarget) {
      // No visible layer underneath to punch through -> keep normal render fallback
      continue;
    }

    const list = cuttersByTargetId.get(resolvedTarget) ?? [];
    list.push(layer);
    cuttersByTargetId.set(resolvedTarget, list);
    consumedKnockoutIds.add(layer.id);
  }

  return { cuttersByTargetId, consumedKnockoutIds };
}

/** Fast deterministic PRNG for repeatable vector distressing & paper grain */
function createSeededRng(seed: number) {
  let state = (Math.floor(seed) || 1) >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export interface GritSpeck {
  kind: 'circle' | 'rect' | 'scratch';
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  alpha: number;
}

export function buildVintageGritGeometry(
  seed = 42,
  intensity = 0.65
): { tileW: number; tileH: number; specks: GritSpeck[] } {
  const tileW = 140;
  const tileH = 140;
  const rng = createSeededRng(seed * 7919 + 17);
  const clampedInt = Math.max(0.1, Math.min(1, intensity));
  const count = Math.round(45 + clampedInt * 125);
  const specks: GritSpeck[] = [];

  for (let i = 0; i < count; i++) {
    const roll = rng();
    const x = +(rng() * tileW).toFixed(1);
    const y = +(rng() * tileH).toFixed(1);
    const alpha = +(0.35 + rng() * 0.65 * Math.min(1, clampedInt + 0.15)).toFixed(2);

    if (roll < 0.56) {
      const r = +(0.5 + rng() * (1.2 + clampedInt * 1.4)).toFixed(2);
      specks.push({ kind: 'circle', x, y, w: r, h: r, rot: 0, alpha });
    } else if (roll < 0.86) {
      const w = +(1.1 + rng() * (2.6 + clampedInt * 2.2)).toFixed(1);
      const h = +(0.7 + rng() * (1.7 + clampedInt * 1.1)).toFixed(1);
      const rot = +(rng() * 180).toFixed(0);
      specks.push({ kind: 'rect', x, y, w, h, rot: Number(rot), alpha });
    } else {
      const len = +(5 + rng() * (10 + clampedInt * 14)).toFixed(1);
      const thick = +(0.45 + rng() * 0.75).toFixed(2);
      const rot = +((rng() - 0.5) * 44).toFixed(1);
      specks.push({ kind: 'scratch', x, y, w: len, h: thick, rot, alpha });
    }
  }

  return { tileW, tileH, specks };
}

export function buildHalftoneDotsGeometry(
  intensity = 0.6
): { tileW: number; tileH: number; dots: Array<{ cx: number; cy: number; r: number }> } {
  const tileW = 16;
  const tileH = 16;
  const clamped = Math.max(0.1, Math.min(1, intensity));
  const r = +(1.1 + clamped * 3.1).toFixed(2);
  return {
    tileW,
    tileH,
    dots: [
      { cx: 4, cy: 4, r },
      { cx: 12, cy: 12, r },
    ],
  };
}

export interface MetalStreak {
  y: number;
  x1: number;
  x2: number;
  strokeWidth: number;
  opacity: number;
  tone: 'light' | 'dark';
}

export function buildBrushedMetalGeometry(
  seed = 42,
  intensity = 0.72
): { tileW: number; tileH: number; streaks: MetalStreak[] } {
  const tileW = 160;
  const tileH = 96;
  const rng = createSeededRng(seed * 3571 + 91);
  const clamped = Math.max(0.1, Math.min(1, intensity));
  const count = Math.round(40 + clamped * 55);
  const streaks: MetalStreak[] = [];

  for (let i = 0; i < count; i++) {
    const y = +(rng() * tileH).toFixed(1);
    const x1 = +(rng() * 35).toFixed(1);
    const x2 = +(tileW - rng() * 35).toFixed(1);
    const tone: 'light' | 'dark' = rng() > 0.45 ? 'light' : 'dark';
    const opacity = +((0.12 + rng() * 0.36) * clamped).toFixed(2);
    const strokeWidth = +(0.5 + rng() * 1.1).toFixed(2);
    streaks.push({ y, x1, x2, strokeWidth, opacity, tone });
  }

  return { tileW, tileH, streaks };
}

export interface PaperFiber {
  kind: 'fiber' | 'grain';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  r: number;
  opacity: number;
  tone: 'light' | 'dark';
}

export function buildPaperGrainGeometry(
  seed = 42,
  intensity = 0.55
): { tileW: number; tileH: number; fibers: PaperFiber[] } {
  const tileW = 110;
  const tileH = 110;
  const rng = createSeededRng(seed * 6133 + 29);
  const clamped = Math.max(0.1, Math.min(1, intensity));
  const count = Math.round(52 + clamped * 96);
  const fibers: PaperFiber[] = [];

  for (let i = 0; i < count; i++) {
    const x1 = +(rng() * tileW).toFixed(1);
    const y1 = +(rng() * tileH).toFixed(1);
    const angle = rng() * Math.PI * 2;
    const len = 3 + rng() * 6.5;
    const x2 = +(x1 + Math.cos(angle) * len).toFixed(1);
    const y2 = +(y1 + Math.sin(angle) * len).toFixed(1);
    const tone: 'light' | 'dark' = rng() > 0.42 ? 'dark' : 'light';
    const opacity = +((0.1 + rng() * 0.28) * clamped).toFixed(2);
    const isFiber = rng() > 0.52;
    fibers.push({
      kind: isFiber ? 'fiber' : 'grain',
      x1,
      y1,
      x2,
      y2,
      r: +(0.45 + rng() * 0.85).toFixed(2),
      opacity,
      tone,
    });
  }

  return { tileW, tileH, fibers };
}
