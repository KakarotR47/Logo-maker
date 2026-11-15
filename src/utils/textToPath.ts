import opentype from 'opentype.js';
import { FONT_OPTIONS } from '../data/logoLibrary';
import { LogoLayer, PathLayer, TextLayer } from '../types/logo';
import { buildWarpArcPathD, resolveWarpConfig } from './glyphLayout';
import {
  resolveTextPathGeometry,
  samplePathAtDistance,
  sampleSvgPath,
} from './pathGeometry';

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
export async function tryConvertTextLayerToPath(
  layer: TextLayer,
  allLayers?: LogoLayer[]
): Promise<LogoLayer> {
  const font = await loadOpentypeFont(layer.fontId, layer.fontFamily);
  if (!font) return layer;
  try {
    return convertTextLayerToPathWithFont(layer, font, allLayers);
  } catch {
    return layer;
  }
}

/**
 * Converts a TextLayer into a true editable vector PathLayer (`<path d="...">`)
 * using opentype.js glyph outlines (supports spacing, textPath curves, arcs, wave,
 * circle, slant warps, and per-letter kerning & transforms).
 */
export async function convertTextLayerToPath(
  layer: TextLayer,
  allLayers?: LogoLayer[]
): Promise<PathLayer> {
  const font = await loadOpentypeFont(layer.fontId, layer.fontFamily);
  if (font) {
    try {
      return convertTextLayerToPathWithFont(layer, font, allLayers);
    } catch {
      // Fall back to geometric placeholder bounds if TTF tables fail to outline
    }
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
    blendMode: layer.blendMode,
    isKnockout: layer.isKnockout,
    knockoutTargetId: layer.knockoutTargetId,
    visible: layer.visible,
    locked: layer.locked,
    groupId: layer.groupId,
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

function safeStringToGlyphs(font: opentype.Font, text: string): opentype.Glyph[] {
  try {
    return font.stringToGlyphs(text);
  } catch {
    // Some Google Fonts use GSUB lookupType 6 substFormat 2 in ccmp/calt tables
    // which opentype.js Bidi shaper does not support yet; map directly via cmap.
    return Array.from(text).map((ch) => font.charToGlyph(ch));
  }
}

function safeGetKerningValue(
  font: opentype.Font,
  left: opentype.Glyph,
  right: opentype.Glyph
): number {
  try {
    return font.getKerningValue(left, right) || 0;
  } catch {
    return 0;
  }
}

function convertTextLayerToPathWithFont(
  layer: TextLayer,
  font: opentype.Font,
  allLayers?: LogoLayer[]
): PathLayer {
  const displayText = layer.uppercase ? layer.text.toUpperCase() : layer.text;
  const lines = displayText.split(/\r?\n/);

  const fontSize = Math.max(8, layer.fontSize);
  const fontScale = fontSize / font.unitsPerEm;
  const trackingPx = layer.letterSpacing * fontSize;
  const lineAdvance = fontSize * (layer.lineHeight || 1.15);
  const warp = resolveWarpConfig(layer);
  const customPath = resolveTextPathGeometry(layer, allLayers);
  const kerningMap = layer.letterKerning ?? {};
  const transformMap = layer.letterTransforms ?? {};
  const cx = layer.width / 2;
  const cyBox = layer.height / 2;

  const hasSkew = Math.abs(warp.slant) > 0.1 || Math.abs(warp.perspective ?? 0) > 0.1;
  const pathDataList: string[] = [];

  const usesBuiltInWarp =
    !customPath &&
    (warp.mode === 'wave' ||
      warp.mode === 'circle' ||
      warp.mode === 'arc-up' ||
      warp.mode === 'arc-down' ||
      Math.abs(layer.curveRadius) >= 20);

  if (customPath || usesBuiltInWarp) {
    const pathD = customPath ? customPath.localD : buildWarpArcPathD(layer).d;
    const sampled = sampleSvgPath(pathD);
    const line = lines[0] ?? '';
    const glyphs = safeStringToGlyphs(font, line);

    let totalWidth = 0;
    const items: Array<{
      index: number;
      glyph: opentype.Glyph;
      baseAdv: number;
      adv: number;
      charScale: number;
      rotDeg: number;
      bShift: number;
      cursorStart: number;
    }> = [];

    for (let i = 0; i < glyphs.length; i++) {
      const glyph = glyphs[i];
      const otKern =
        i > 0 ? safeGetKerningValue(font, glyphs[i - 1], glyph) * fontScale : 0;
      if (i > 0) totalWidth += otKern;

      const baseAdv = (glyph.advanceWidth ?? font.unitsPerEm * 0.5) * fontScale;
      const t = transformMap[i];
      const charScale = Math.max(0.35, Math.min(2.6, t?.scale ?? 1));
      const adv = baseAdv * charScale;
      const customKern = i < glyphs.length - 1 ? kerningMap[i] ?? 0 : 0;

      items.push({
        index: i,
        glyph,
        baseAdv,
        adv,
        charScale,
        rotDeg: t?.rotation ?? 0,
        bShift: t?.baselineShift ?? 0,
        cursorStart: totalWidth,
      });

      totalWidth += adv + (i < glyphs.length - 1 ? trackingPx + customKern : 0);
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

    for (const item of items) {
      const midDist = startDist + item.cursorStart + item.adv / 2;
      const sample = samplePathAtDistance(sampled, midDist);
      const totalNormalShift = globalBaseShift - item.bShift;
      const gx = sample.x + sample.nx * totalNormalShift;
      const gy = sample.y + sample.ny * totalNormalShift;
      const angleRad = ((sample.angleDeg + item.rotDeg) * Math.PI) / 180;

      const rawPath = item.glyph.getPath(-item.baseAdv / 2, 0, fontSize);
      let transformed = scaleRotateTranslatePath(
        rawPath,
        item.charScale,
        angleRad,
        gx,
        gy
      );
      if (hasSkew) {
        transformed = applySkewTransform(
          transformed,
          warp.slant,
          warp.perspective ?? 0,
          cx,
          cyBox
        );
      }
      const d = transformed.toPathData(2);
      if (d) pathDataList.push(d);
    }
  } else {
    const totalTextHeight = lines.length * fontSize * (layer.lineHeight || 1.15);
    const firstY = Math.max(
      fontSize * 0.85,
      (layer.height - totalTextHeight) / 2 + fontSize * 0.82
    );

    let globalCharOffset = 0;

    lines.forEach((line, lineIdx) => {
      if (!line) {
        globalCharOffset += 1;
        return;
      }
      const baselineY = firstY + lineIdx * lineAdvance;
      const glyphs = safeStringToGlyphs(font, line);
      let lineWidth = 0;
      const items: Array<{
        glyph: opentype.Glyph;
        cursorStart: number;
        baseAdv: number;
        adv: number;
        charScale: number;
        rotDeg: number;
        bShift: number;
      }> = [];

      for (let i = 0; i < glyphs.length; i++) {
        const gIdx = globalCharOffset + i;
        const glyph = glyphs[i];
        const otKern =
          i > 0 ? safeGetKerningValue(font, glyphs[i - 1], glyph) * fontScale : 0;
        if (i > 0) lineWidth += otKern;

        const baseAdv = (glyph.advanceWidth ?? font.unitsPerEm * 0.5) * fontScale;
        const t = transformMap[gIdx];
        const charScale = Math.max(0.35, Math.min(2.6, t?.scale ?? 1));
        const adv = baseAdv * charScale;
        const customKern = i < glyphs.length - 1 ? kerningMap[gIdx] ?? 0 : 0;

        items.push({
          glyph,
          cursorStart: lineWidth,
          baseAdv,
          adv,
          charScale,
          rotDeg: t?.rotation ?? 0,
          bShift: t?.baselineShift ?? 0,
        });

        lineWidth += adv + (i < glyphs.length - 1 ? trackingPx + customKern : 0);
      }

      let startX = 4;
      if (layer.textAlign === 'center') {
        startX = (layer.width - lineWidth) / 2;
      } else if (layer.textAlign === 'right') {
        startX = layer.width - 4 - lineWidth;
      }

      for (const item of items) {
        const gx = startX + item.cursorStart + item.adv / 2;
        const gy = baselineY - item.bShift;
        const angleRad = (item.rotDeg * Math.PI) / 180;
        const rawPath = item.glyph.getPath(-item.baseAdv / 2, 0, fontSize);
        let p = scaleRotateTranslatePath(
          rawPath,
          item.charScale,
          angleRad,
          gx,
          gy
        );
        if (hasSkew) {
          p = applySkewTransform(
            p,
            warp.slant,
            warp.perspective ?? 0,
            cx,
            cyBox
          );
        }
        const d = p.toPathData(2);
        if (d) pathDataList.push(d);
      }

      globalCharOffset += glyphs.length + 1;
    });
  }

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
    blendMode: layer.blendMode,
    isKnockout: layer.isKnockout,
    knockoutTargetId: layer.knockoutTargetId,
    visible: layer.visible,
    locked: layer.locked,
    groupId: layer.groupId,
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

function scaleRotateTranslatePath(
  path: opentype.Path,
  scale: number,
  angleRad: number,
  tx: number,
  ty: number
): opentype.Path {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const out = new opentype.Path();

  const xform = (px: number, py: number): [number, number] => {
    const sx = px * scale;
    const sy = py * scale;
    return [sx * cos - sy * sin + tx, sx * sin + sy * cos + ty];
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
