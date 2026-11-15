import { LogoLayer, TextLayer } from '../types/logo';
import {
  resolveTextPathGeometry,
  samplePathAtDistance,
  sampleSvgPath,
} from './pathGeometry';

export interface PositionedGlyph {
  /** Global character index in displayed text (matches letterKerning / letterTransforms keys) */
  index: number;
  lineIndex: number;
  char: string;
  /** Glyph baseline midpoint X in TextLayer local space */
  x: number;
  /** Glyph baseline Y in TextLayer local space */
  y: number;
  /** Combined rotation in degrees (path tangent + per-letter rotation) */
  angleDeg: number;
  /** Per-letter scale (default 1) */
  scale: number;
  /** Effective horizontal advance width in px */
  adv: number;
  /** Base measured unscaled advance width */
  baseAdv: number;
  /** Per-gap custom kerning value after this character (px) */
  kerningAfter: number;
  /** Whether a clickable kerning gap follows this character (same line, not last char) */
  hasGapAfter: boolean;
  /** Gap midpoint in TextLayer local space */
  gapX: number;
  gapY: number;
  gapAngleDeg: number;
  fontSize: number;
}

export interface TextGlyphLayoutResult {
  glyphs: PositionedGlyph[];
  isPathBased: boolean;
  pathD?: string;
  hasCustomEdits: boolean;
}

let cachedMeasureCtx: CanvasRenderingContext2D | null = null;

function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!cachedMeasureCtx) {
    const canvas = document.createElement('canvas');
    cachedMeasureCtx = canvas.getContext('2d');
  }
  return cachedMeasureCtx;
}

export function measureCharAdvance(
  char: string,
  fontFamily: string,
  fontWeight: number,
  fontStyle: 'normal' | 'italic',
  fontSize: number
): number {
  const ctx = getMeasureCtx();
  if (!ctx) {
    return char === ' ' ? fontSize * 0.3 : fontSize * 0.62;
  }
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  const m = ctx.measureText(char);
  if (Number.isFinite(m.width) && m.width > 0) {
    return m.width;
  }
  return char === ' ' ? fontSize * 0.3 : fontSize * 0.6;
}

export function resolveWarpConfig(layer: TextLayer): {
  mode: 'none' | 'arc-up' | 'arc-down' | 'circle' | 'wave' | 'slant';
  strength: number;
  slant: number;
  perspective: number;
} {
  if (layer.textWarp) {
    return {
      mode: layer.textWarp.mode,
      strength: layer.textWarp.strength ?? 0,
      slant: layer.textWarp.slant ?? 0,
      perspective: layer.textWarp.perspective ?? 0,
    };
  }
  if (Math.abs(layer.curveRadius) >= 20) {
    const strength = Math.max(
      8,
      Math.min(100, Math.round(((260 - Math.abs(layer.curveRadius)) / 240) * 100))
    );
    return {
      mode: layer.curveRadius > 0 ? 'arc-up' : 'arc-down',
      strength,
      slant: 0,
      perspective: 0,
    };
  }
  return { mode: 'none', strength: 0, slant: 0, perspective: 0 };
}

export function buildWarpArcPathD(
  layer: TextLayer
): { d: string; startOffset: string; textAnchor: 'start' | 'middle' | 'end' } {
  const warp = resolveWarpConfig(layer);
  const cx = layer.width / 2;
  const cyBox = layer.height / 2;

  if (warp.mode === 'wave') {
    const padX = Math.max(8, layer.width * 0.04);
    const spanW = Math.max(40, layer.width - padX * 2);
    const x0 = padX;
    const xMid = padX + spanW * 0.5;
    const xEnd = padX + spanW;
    const amp = Math.max(
      6,
      (warp.strength / 100) * Math.min(54, Math.max(24, layer.height * 0.42))
    );
    const baseY = cyBox + layer.fontSize * 0.28;
    const d = `M ${x0.toFixed(1)} ${baseY.toFixed(1)} C ${(x0 + spanW * 0.17).toFixed(1)} ${(baseY - amp).toFixed(1)}, ${(x0 + spanW * 0.33).toFixed(1)} ${(baseY - amp).toFixed(1)}, ${xMid.toFixed(1)} ${baseY.toFixed(1)} C ${(xMid + spanW * 0.17).toFixed(1)} ${(baseY + amp).toFixed(1)}, ${(xMid + spanW * 0.33).toFixed(1)} ${(baseY + amp).toFixed(1)}, ${xEnd.toFixed(1)} ${baseY.toFixed(1)}`;
    return { d, startOffset: '50%', textAnchor: 'middle' };
  }

  if (warp.mode === 'circle') {
    const minDim = Math.min(layer.width, Math.max(layer.height, layer.width * 0.55));
    const R = Math.max(36, minDim * 0.44 * (1.28 - (warp.strength / 100) * 0.58));
    const circleCy = Math.max(R + layer.fontSize * 0.65, cyBox);
    const d = `M ${cx.toFixed(1)} ${(circleCy + R).toFixed(1)} A ${R.toFixed(1)} ${R.toFixed(1)} 0 1 1 ${(cx - 0.1).toFixed(1)} ${(circleCy + R).toFixed(1)} Z`;
    return { d, startOffset: '50%', textAnchor: 'middle' };
  }

  const R = Math.max(28, Math.abs(layer.curveRadius || 140));
  const isConvex =
    warp.mode === 'arc-down'
      ? false
      : warp.mode === 'arc-up'
        ? true
        : layer.curveRadius > 0;
  const halfSpanAngle = Math.min(Math.PI * 0.85, Math.max(0.45, (layer.width * 0.46) / R));
  const largeArcFlag = halfSpanAngle * 2 > Math.PI ? 1 : 0;

  if (isConvex) {
    const apexY = Math.max(layer.fontSize * 0.9, layer.height * 0.42);
    const cy = apexY + R;
    const x1 = cx - Math.sin(halfSpanAngle) * R;
    const y1 = cy - Math.cos(halfSpanAngle) * R;
    const x2 = cx + Math.sin(halfSpanAngle) * R;
    const y2 = cy - Math.cos(halfSpanAngle) * R;
    return {
      d: `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 ${largeArcFlag} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`,
      startOffset: '50%',
      textAnchor: 'middle',
    };
  }

  const bottomApexY = Math.min(layer.height - layer.fontSize * 0.3, layer.height * 0.65);
  const cy = bottomApexY - R;
  const x1 = cx - Math.sin(halfSpanAngle) * R;
  const y1 = cy + Math.cos(halfSpanAngle) * R;
  const x2 = cx + Math.sin(halfSpanAngle) * R;
  const y2 = cy + Math.cos(halfSpanAngle) * R;
  return {
    d: `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 ${largeArcFlag} 0 ${x2.toFixed(1)} ${y2.toFixed(1)}`,
    startOffset: '50%',
    textAnchor: 'middle',
  };
}

export function hasPerLetterEdits(layer: TextLayer): boolean {
  const kCount = layer.letterKerning ? Object.keys(layer.letterKerning).length : 0;
  const tCount = layer.letterTransforms ? Object.keys(layer.letterTransforms).length : 0;
  return kCount > 0 || tCount > 0;
}

/**
 * Computes exact per-character positions & gap coordinates for:
 * - Straight text (multi-line)
 * - Built-in warped text (arc-up, arc-down, circle, wave)
 * - Custom attached Text-on-Path (circle, wave, or Pen-tool Bezier layer)
 * Supports independent per-gap kerning and per-letter scale/rotation/baselineShift.
 */
export function computeTextGlyphLayout(
  layer: TextLayer,
  allLayers?: LogoLayer[]
): TextGlyphLayoutResult {
  const raw = layer.uppercase ? layer.text.toUpperCase() : layer.text;
  const lines = raw.split(/\r?\n/);
  const fontSize = Math.max(8, layer.fontSize);
  const trackingPx = layer.letterSpacing * fontSize;
  const lineAdvance = fontSize * (layer.lineHeight || 1.15);
  const kerningMap = layer.letterKerning ?? {};
  const transformMap = layer.letterTransforms ?? {};

  const customPath = resolveTextPathGeometry(layer, allLayers);
  const warp = resolveWarpConfig(layer);
  const usesBuiltInWarp =
    !customPath &&
    (warp.mode === 'arc-up' ||
      warp.mode === 'arc-down' ||
      warp.mode === 'circle' ||
      warp.mode === 'wave' ||
      (warp.mode === 'none' && Math.abs(layer.curveRadius) >= 20));

  const glyphs: PositionedGlyph[] = [];
  let activePathD: string | undefined;

  if (customPath || usesBuiltInWarp) {
    const pathD = customPath ? customPath.localD : buildWarpArcPathD(layer).d;
    activePathD = pathD;
    const sampled = sampleSvgPath(pathD);
    const line = lines[0] ?? '';
    const chars = Array.from(line);

    const items: Array<{
      index: number;
      char: string;
      baseAdv: number;
      adv: number;
      scale: number;
      rot: number;
      bShift: number;
      kernAfter: number;
      cursorStart: number;
    }> = [];

    let totalWidth = 0;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const baseAdv = measureCharAdvance(
        ch,
        layer.fontFamily,
        layer.fontWeight,
        layer.fontStyle,
        fontSize
      );
      const t = transformMap[i];
      const scale = Math.max(0.35, Math.min(2.6, t?.scale ?? 1));
      const adv = baseAdv * scale;
      const kernAfter = i < chars.length - 1 ? kerningMap[i] ?? 0 : 0;

      items.push({
        index: i,
        char: ch,
        baseAdv,
        adv,
        scale,
        rot: t?.rotation ?? 0,
        bShift: t?.baselineShift ?? 0,
        kernAfter,
        cursorStart: totalWidth,
      });

      totalWidth += adv + (i < chars.length - 1 ? trackingPx + kernAfter : 0);
    }

    const startOffsetPct = customPath ? customPath.startOffset : 50;
    const globalBaseShift = customPath ? customPath.baselineShift : 0;
    const anchorDist = (startOffsetPct / 100) * sampled.totalLength;
    const startDist =
      layer.textAlign === 'left'
        ? anchorDist
        : layer.textAlign === 'right'
          ? anchorDist - totalWidth
          : anchorDist - totalWidth / 2;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const midDist = startDist + it.cursorStart + it.adv / 2;
      const sample = samplePathAtDistance(sampled, midDist);
      const totalNormalShift = globalBaseShift - it.bShift;
      // Normal (nx, ny) points "above" path when moving left->right; positive baselineShift lifts text away/up
      const gx = sample.x + sample.nx * totalNormalShift;
      const gy = sample.y + sample.ny * totalNormalShift;

      let gapX = gx;
      let gapY = gy;
      let gapAngleDeg = sample.angleDeg;
      const hasGapAfter = i < items.length - 1;
      if (hasGapAfter) {
        const gapDist = startDist + it.cursorStart + it.adv + (trackingPx + it.kernAfter) / 2;
        const gSample = samplePathAtDistance(sampled, gapDist);
        gapX = gSample.x + gSample.nx * globalBaseShift;
        gapY = gSample.y + gSample.ny * globalBaseShift;
        gapAngleDeg = gSample.angleDeg;
      }

      glyphs.push({
        index: it.index,
        lineIndex: 0,
        char: it.char,
        x: gx,
        y: gy,
        angleDeg: sample.angleDeg + it.rot,
        scale: it.scale,
        adv: it.adv,
        baseAdv: it.baseAdv,
        kerningAfter: it.kernAfter,
        hasGapAfter,
        gapX,
        gapY,
        gapAngleDeg,
        fontSize,
      });
    }

    return {
      glyphs,
      isPathBased: true,
      pathD: activePathD,
      hasCustomEdits: Boolean(customPath) || hasPerLetterEdits(layer),
    };
  }

  // Straight / Multi-line layout
  const totalTextHeight = lines.length * fontSize * layer.lineHeight;
  const firstY = Math.max(
    fontSize * 0.85,
    (layer.height - totalTextHeight) / 2 + fontSize * 0.82
  );

  let globalCharOffset = 0;

  lines.forEach((line, lineIdx) => {
    const chars = Array.from(line);
    const items: Array<{
      index: number;
      char: string;
      baseAdv: number;
      adv: number;
      scale: number;
      rot: number;
      bShift: number;
      kernAfter: number;
      cursorStart: number;
    }> = [];

    let lineWidth = 0;
    for (let i = 0; i < chars.length; i++) {
      const gIdx = globalCharOffset + i;
      const ch = chars[i];
      const baseAdv = measureCharAdvance(
        ch,
        layer.fontFamily,
        layer.fontWeight,
        layer.fontStyle,
        fontSize
      );
      const t = transformMap[gIdx];
      const scale = Math.max(0.35, Math.min(2.6, t?.scale ?? 1));
      const adv = baseAdv * scale;
      const kernAfter = i < chars.length - 1 ? kerningMap[gIdx] ?? 0 : 0;

      items.push({
        index: gIdx,
        char: ch,
        baseAdv,
        adv,
        scale,
        rot: t?.rotation ?? 0,
        bShift: t?.baselineShift ?? 0,
        kernAfter,
        cursorStart: lineWidth,
      });

      lineWidth += adv + (i < chars.length - 1 ? trackingPx + kernAfter : 0);
    }

    const baseLineY = firstY + lineIdx * lineAdvance;
    const startX =
      layer.textAlign === 'left'
        ? 4
        : layer.textAlign === 'right'
          ? layer.width - 4 - lineWidth
          : (layer.width - lineWidth) / 2;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const gx = startX + it.cursorStart + it.adv / 2;
      const gy = baseLineY - it.bShift;
      const hasGapAfter = i < items.length - 1;
      const gapX = hasGapAfter
        ? startX + it.cursorStart + it.adv + (trackingPx + it.kernAfter) / 2
        : gx;

      glyphs.push({
        index: it.index,
        lineIndex: lineIdx,
        char: it.char,
        x: gx,
        y: gy,
        angleDeg: it.rot,
        scale: it.scale,
        adv: it.adv,
        baseAdv: it.baseAdv,
        kerningAfter: it.kernAfter,
        hasGapAfter,
        gapX,
        gapY: baseLineY,
        gapAngleDeg: 0,
        fontSize,
      });
    }

    globalCharOffset += chars.length + 1; // +1 for newline character
  });

  return {
    glyphs,
    isPathBased: false,
    hasCustomEdits: hasPerLetterEdits(layer),
  };
}
