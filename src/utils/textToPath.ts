import opentype from 'opentype.js';
import { resolveEffectiveTextWarp } from '../components/CanvasLayerRenderer';
import { FONT_OPTIONS } from '../data/logoLibrary';
import { LogoLayer, PathLayer, TextLayer } from '../types/logo';

const fontCache = new Map<string, Promise<opentype.Font | null>>();

async function loadOpentypeFont(
  fontId: string,
  fontFamily?: string
): Promise<opentype.Font | null> {
  const familyName = fontFamily?.split(',')[0]?.replace(/['"]/g, '').trim().toLowerCase() ?? '';
  const fontSpec =
    FONT_OPTIONS.find((f) => f.id === fontId) ??
    (familyName
      ? FONT_OPTIONS.find((f) => f.name.toLowerCase() === familyName)
      : undefined) ??
    FONT_OPTIONS[0];

  const cacheKey = fontSpec.id;
  if (fontCache.has(cacheKey)) {
    return fontCache.get(cacheKey)!;
  }

  const promise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(fontSpec.ttfUrl, {
        mode: 'cors',
        signal: controller.signal,
      });
      if (!response.ok) return null;
      const buffer = await response.arrayBuffer();
      return opentype.parse(buffer);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  })();

  fontCache.set(cacheKey, promise);
  return promise;
}

/**
 * Attempts to convert a TextLayer to outlined vector paths for clean SVG/PNG export.
 * If the font TTF cannot be fetched/parsed, preserves the original TextLayer rather than
 * substituting geometric placeholder bars.
 */
export async function tryConvertTextLayerToPath(layer: TextLayer): Promise<LogoLayer> {
  const font = await loadOpentypeFont(layer.fontId, layer.fontFamily);
  if (!font) return layer;
  return convertTextLayerToPathWithFont(layer, font);
}

/**
 * Converts a TextLayer into a true editable vector PathLayer (`<path d="...">`)
 * using opentype.js glyph outlines (supports spacing, arcs, wave, circle & slant warps).
 */
export async function convertTextLayerToPath(layer: TextLayer): Promise<PathLayer> {
  const font = await loadOpentypeFont(layer.fontId, layer.fontFamily);
  if (font) {
    return convertTextLayerToPathWithFont(layer, font);
  }
  const displayText = layer.uppercase ? layer.text.toUpperCase() : layer.text;
  const fontSize = Math.max(8, layer.fontSize);

  const fallbackPaths: string[] = [];
  const charCount = Math.max(1, displayText.length);
  const blockW = Math.min(layer.width * 0.86, charCount * fontSize * 0.62);
  const startX = (layer.width - blockW) / 2;
  const barH = Math.max(8, fontSize * 0.68);
  const barY = (layer.height - barH) / 2;
  const step = blockW / charCount;
  for (let i = 0; i < charCount; i++) {
    if (displayText[i] === ' ') continue;
    const x0 = +(startX + i * step + 2).toFixed(1);
    const w0 = +Math.max(4, step - 5).toFixed(1);
    fallbackPaths.push(
      `M${x0} ${barY.toFixed(1)} h${w0} v${barH.toFixed(1)} h-${w0} Z`
    );
  }

  return {
    id: layer.id,
    name: `${layer.name} (Vector)`,
    type: 'path',
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    rotation: layer.rotation,
    flipX: layer.flipX,
    flipY: layer.flipY,
    opacity: layer.opacity,
    visible: layer.visible,
    locked: layer.locked,
    fill: layer.fill,
    fillGradient: layer.fillGradient ? { ...layer.fillGradient } : undefined,
    fillPattern: layer.fillPattern ? { ...layer.fillPattern } : undefined,
    clipMask: layer.clipMask ? { ...layer.clipMask } : undefined,
    stroke: layer.stroke,
    strokeWidth: layer.strokeWidth,
    shadow: { ...layer.shadow },
    pathDataList: fallbackPaths,
    sourceViewBox: { width: layer.width, height: layer.height },
    sourceText: layer.text,
  };
}

function cubicPointAndTangent(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  t: number
): { x: number; y: number; angle: number } {
  const mt = 1 - t;
  const x =
    mt * mt * mt * p0[0] +
    3 * mt * mt * t * p1[0] +
    3 * mt * t * t * p2[0] +
    t * t * t * p3[0];
  const y =
    mt * mt * mt * p0[1] +
    3 * mt * mt * t * p1[1] +
    3 * mt * t * t * p2[1] +
    t * t * t * p3[1];
  const dx =
    3 * mt * mt * (p1[0] - p0[0]) +
    6 * mt * t * (p2[0] - p1[0]) +
    3 * t * t * (p3[0] - p2[0]);
  const dy =
    3 * mt * mt * (p1[1] - p0[1]) +
    6 * mt * t * (p2[1] - p1[1]) +
    3 * t * t * (p3[1] - p2[1]);
  return { x, y, angle: Math.atan2(dy, dx) };
}

function convertTextLayerToPathWithFont(layer: TextLayer, font: opentype.Font): PathLayer {
  const displayText = layer.uppercase ? layer.text.toUpperCase() : layer.text;
  const lines = displayText.split(/\r?\n/);

  const fontSize = Math.max(8, layer.fontSize);
  const trackingPx = layer.letterSpacing * fontSize;
  const lineAdvance = fontSize * (layer.lineHeight || 1.15);
  const warp = resolveEffectiveTextWarp(layer);
  const cx = layer.width / 2;
  const cyBox = layer.height / 2;

  const hasSkew = Math.abs(warp.slant) > 0.1 || Math.abs(warp.perspective) > 0.1;
  const pathDataList: string[] = [];

  lines.forEach((line, lineIdx) => {
    if (!line) return;
    const baselineY = fontSize * 0.85 + lineIdx * lineAdvance;

    // Measure full line width with letter-spacing
    const glyphs = font.stringToGlyphs(line);
    const scale = fontSize / font.unitsPerEm;
    let totalWidth = 0;
    const glyphPositions: Array<{ glyph: opentype.Glyph; x: number; adv: number }> = [];

    for (let i = 0; i < glyphs.length; i++) {
      const glyph = glyphs[i];
      const adv = (glyph.advanceWidth ?? font.unitsPerEm * 0.5) * scale;
      glyphPositions.push({ glyph, x: totalWidth, adv });
      totalWidth += adv + (i < glyphs.length - 1 ? trackingPx : 0);
    }

    let startX = 0;
    if (layer.textAlign === 'center') {
      startX = (layer.width - totalWidth) / 2;
    } else if (layer.textAlign === 'right') {
      startX = layer.width - totalWidth;
    }

    if (warp.mode === 'wave' && lineIdx === 0) {
      const padX = Math.max(8, layer.width * 0.04);
      const spanW = Math.max(40, layer.width - padX * 2);
      const x0 = padX;
      const xMid = padX + spanW * 0.5;
      const xEnd = padX + spanW;
      const amp = Math.max(6, (warp.strength / 100) * Math.min(54, Math.max(24, layer.height * 0.42)));
      const baseY = cyBox + fontSize * 0.28;

      for (const item of glyphPositions) {
        const glyphMidRel = (item.x + item.adv / 2 - totalWidth / 2) / Math.max(1, spanW) + 0.5;
        const clampedU = Math.max(0.02, Math.min(0.98, glyphMidRel));
        const sample =
          clampedU <= 0.5
            ? cubicPointAndTangent(
                [x0, baseY],
                [x0 + spanW * 0.17, baseY - amp],
                [x0 + spanW * 0.33, baseY - amp],
                [xMid, baseY],
                clampedU * 2
              )
            : cubicPointAndTangent(
                [xMid, baseY],
                [xMid + spanW * 0.17, baseY + amp],
                [xMid + spanW * 0.33, baseY + amp],
                [xEnd, baseY],
                (clampedU - 0.5) * 2
              );
        const rawPath = item.glyph.getPath(-item.adv / 2, 0, fontSize);
        let transformed = rotateAndTranslatePath(rawPath, sample.angle, sample.x, sample.y);
        if (hasSkew) {
          transformed = applySkewTransform(transformed, warp.slant, warp.perspective, cx, cyBox);
        }
        const d = transformed.toPathData(2);
        if (d) pathDataList.push(d);
      }
    } else if (
      (warp.mode === 'circle' ||
        warp.mode === 'arc-up' ||
        warp.mode === 'arc-down' ||
        Math.abs(layer.curveRadius) >= 20) &&
      lineIdx === 0
    ) {
      const isCircle = warp.mode === 'circle';
      const minDim = Math.min(layer.width, Math.max(layer.height, layer.width * 0.55));
      const R = isCircle
        ? Math.max(36, (minDim * 0.44) * (1.28 - (warp.strength / 100) * 0.58))
        : Math.max(28, Math.abs(layer.curveRadius || 140));
      const isConvex = isCircle
        ? true
        : warp.mode === 'arc-down'
          ? false
          : warp.mode === 'arc-up'
            ? true
            : layer.curveRadius > 0;
      const cy = isCircle
        ? Math.max(R + fontSize * 0.65, cyBox)
        : isConvex
          ? Math.max(fontSize * 0.9, layer.height * 0.42) + R
          : Math.min(layer.height - fontSize * 0.3, layer.height * 0.65) - R;

      for (const item of glyphPositions) {
        const glyphCenterX = startX + item.x + item.adv / 2;
        const arcDist = glyphCenterX - cx;
        const theta = arcDist / R;

        const gx = cx + (isConvex ? Math.sin(theta) : -Math.sin(theta)) * R;
        const gy = cy + (isConvex ? -Math.cos(theta) : Math.cos(theta)) * R;
        const angle = isConvex ? theta : -theta;

        const rawPath = item.glyph.getPath(-item.adv / 2, 0, fontSize);
        let transformed = rotateAndTranslatePath(rawPath, angle, gx, gy);
        if (hasSkew) {
          transformed = applySkewTransform(transformed, warp.slant, warp.perspective, cx, cyBox);
        }
        const d = transformed.toPathData(2);
        if (d) pathDataList.push(d);
      }
    } else {
      for (const item of glyphPositions) {
        let p = item.glyph.getPath(startX + item.x, baselineY, fontSize);
        if (hasSkew) {
          p = applySkewTransform(p, warp.slant, warp.perspective, cx, cyBox);
        }
        const d = p.toPathData(2);
        if (d) pathDataList.push(d);
      }
    }
  });

  return {
    id: layer.id,
    name: `${layer.name} (Outlined)`,
    type: 'path',
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    rotation: layer.rotation,
    flipX: layer.flipX,
    flipY: layer.flipY,
    opacity: layer.opacity,
    visible: layer.visible,
    locked: layer.locked,
    fill: layer.fill,
    fillGradient: layer.fillGradient ? { ...layer.fillGradient } : undefined,
    fillPattern: layer.fillPattern ? { ...layer.fillPattern } : undefined,
    clipMask: layer.clipMask ? { ...layer.clipMask } : undefined,
    stroke: layer.stroke,
    strokeWidth: layer.strokeWidth,
    shadow: { ...layer.shadow },
    pathDataList,
    sourceViewBox: { width: layer.width, height: layer.height },
    sourceText: layer.text,
  };
}

function applySkewTransform(
  path: opentype.Path,
  slantDeg: number,
  perspectiveDeg: number,
  cx: number,
  cy: number
): opentype.Path {
  const tanX = Math.tan((-slantDeg * Math.PI) / 180);
  const tanY = Math.tan((perspectiveDeg * 0.45 * Math.PI) / 180);
  const scaleY = 1 - Math.min(0.28, Math.abs(perspectiveDeg) * 0.006);
  const out = new opentype.Path();

  const xform = (px: number, py: number): [number, number] => {
    const dx = px - cx;
    const dy = (py - cy) * scaleY;
    return [cx + dx + dy * tanX, cy + dy + dx * tanY];
  };

  for (const cmd of path.commands) {
    if (cmd.type === 'M') {
      const [nx, ny] = xform(cmd.x, cmd.y);
      out.moveTo(nx, ny);
    } else if (cmd.type === 'L') {
      const [nx, ny] = xform(cmd.x, cmd.y);
      out.lineTo(nx, ny);
    } else if (cmd.type === 'C') {
      const [x1, y1] = xform(cmd.x1, cmd.y1);
      const [x2, y2] = xform(cmd.x2, cmd.y2);
      const [nx, ny] = xform(cmd.x, cmd.y);
      out.curveTo(x1, y1, x2, y2, nx, ny);
    } else if (cmd.type === 'Q') {
      const [x1, y1] = xform(cmd.x1, cmd.y1);
      const [nx, ny] = xform(cmd.x, cmd.y);
      out.quadraticCurveTo(x1, y1, nx, ny);
    } else if (cmd.type === 'Z') {
      out.closePath();
    }
  }

  return out;
}

function rotateAndTranslatePath(
  path: opentype.Path,
  angleRad: number,
  tx: number,
  ty: number
): opentype.Path {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const out = new opentype.Path();

  const xform = (px: number, py: number): [number, number] => [
    px * cos - py * sin + tx,
    px * sin + py * cos + ty,
  ];

  for (const cmd of path.commands) {
    if (cmd.type === 'M') {
      const [nx, ny] = xform(cmd.x, cmd.y);
      out.moveTo(nx, ny);
    } else if (cmd.type === 'L') {
      const [nx, ny] = xform(cmd.x, cmd.y);
      out.lineTo(nx, ny);
    } else if (cmd.type === 'C') {
      const [x1, y1] = xform(cmd.x1, cmd.y1);
      const [x2, y2] = xform(cmd.x2, cmd.y2);
      const [nx, ny] = xform(cmd.x, cmd.y);
      out.curveTo(x1, y1, x2, y2, nx, ny);
    } else if (cmd.type === 'Q') {
      const [x1, y1] = xform(cmd.x1, cmd.y1);
      const [nx, ny] = xform(cmd.x, cmd.y);
      out.quadraticCurveTo(x1, y1, nx, ny);
    } else if (cmd.type === 'Z') {
      out.closePath();
    }
  }

  return out;
}

