import opentype from 'opentype.js';
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
 * using opentype.js glyph outlines (supports letter spacing & curve/arc warp!).
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
    opacity: layer.opacity,
    visible: layer.visible,
    locked: layer.locked,
    fill: layer.fill,
    fillGradient: layer.fillGradient ? { ...layer.fillGradient } : undefined,
    stroke: layer.stroke,
    strokeWidth: layer.strokeWidth,
    shadow: { ...layer.shadow },
    pathDataList: fallbackPaths,
    sourceViewBox: { width: layer.width, height: layer.height },
    sourceText: layer.text,
  };
}

function convertTextLayerToPathWithFont(layer: TextLayer, font: opentype.Font): PathLayer {
  const displayText = layer.uppercase ? layer.text.toUpperCase() : layer.text;
  const lines = displayText.split(/\r?\n/);

  const fontSize = Math.max(8, layer.fontSize);
  const trackingPx = layer.letterSpacing * fontSize;
  const lineAdvance = fontSize * (layer.lineHeight || 1.15);

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

      if (Math.abs(layer.curveRadius) >= 20 && lineIdx === 0) {
        // Project each glyph individually along circular arc matching SVG <textPath>
        const R = Math.max(28, Math.abs(layer.curveRadius));
        const cx = layer.width / 2;
        const isConvex = layer.curveRadius > 0;
        const cy = isConvex
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
          const rotated = rotateAndTranslatePath(rawPath, angle, gx, gy);
          const d = rotated.toPathData(2);
          if (d) pathDataList.push(d);
        }
      } else {
        for (const item of glyphPositions) {
          const p = item.glyph.getPath(startX + item.x, baselineY, fontSize);
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
    opacity: layer.opacity,
    visible: layer.visible,
    locked: layer.locked,
    fill: layer.fill,
    fillGradient: layer.fillGradient ? { ...layer.fillGradient } : undefined,
    stroke: layer.stroke,
    strokeWidth: layer.strokeWidth,
    shadow: { ...layer.shadow },
    pathDataList,
    sourceViewBox: { width: layer.width, height: layer.height },
    sourceText: layer.text,
  };
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
