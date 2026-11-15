import { ColorPalette, LogoDocument, LogoLayer } from '../types/logo';

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface TextContrastIssue {
  layerId: string;
  layerName: string;
  ratio: number;
  requiredRatio: number;
  fgHex: string;
  bgHex: string;
  suggestedHex: string;
  isLargeText: boolean;
  isCritical: boolean;
}

export interface DocumentContrastReport {
  hasWarning: boolean;
  hasCritical: boolean;
  checkedCount: number;
  worstRatio: number;
  worstLayerId?: string;
  worstLayerName?: string;
  worstFgHex?: string;
  worstBgHex: string;
  suggestedFixHex?: string;
  issues: TextContrastIssue[];
}

export interface SafeZoneReport {
  marginX: number;
  marginY: number;
  violatingLayerIds: string[];
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [clampByte(r), clampByte(g), clampByte(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

export function parseColorRgba(color?: string | null): RgbaColor | null {
  if (!color) return null;
  const clean = color.trim().toLowerCase();
  if (!clean || clean === 'none' || clean === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  if (clean === 'white') return { r: 255, g: 255, b: 255, a: 1 };
  if (clean === 'black') return { r: 0, g: 0, b: 0, a: 1 };

  const hexMatch = clean.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
      return { r, g, b, a };
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  const rgbMatch = clean.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/
  );
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
      a: rgbMatch[4] !== undefined ? Math.max(0, Math.min(1, Number(rgbMatch[4]))) : 1,
    };
  }

  return null;
}

export function blendRgbaOver(fg: RgbaColor, bg: RgbaColor): RgbaColor {
  const alpha = Math.max(0, Math.min(1, fg.a));
  return {
    r: fg.r * alpha + bg.r * (1 - alpha),
    g: fg.g * alpha + bg.g * (1 - alpha),
    b: fg.b * alpha + bg.b * (1 - alpha),
    a: 1,
  };
}

export function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const linearize = (v: number) => {
    const s = Math.max(0, Math.min(1, v / 255));
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearize(rgb.r) + 0.7152 * linearize(rgb.g) + 0.0722 * linearize(rgb.b);
}

export function getContrastRatio(fgColor: string, bgColor: string, fgOpacity = 1): number {
  const parsedBg = parseColorRgba(bgColor) ?? { r: 255, g: 255, b: 255, a: 1 };
  const opaqueBg = parsedBg.a < 1 ? blendRgbaOver(parsedBg, { r: 255, g: 255, b: 255, a: 1 }) : parsedBg;
  const parsedFg = parseColorRgba(fgColor);
  if (!parsedFg) return 21;

  const compositedFg = blendRgbaOver(
    { ...parsedFg, a: parsedFg.a * Math.max(0, Math.min(1, fgOpacity)) },
    opaqueBg
  );

  const l1 = getRelativeLuminance(compositedFg);
  const l2 = getRelativeLuminance(opaqueBg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function doesPointOverlapLayer(px: number, py: number, container: LogoLayer): boolean {
  return (
    px >= container.x &&
    px <= container.x + container.width &&
    py >= container.y &&
    py <= container.y + container.height
  );
}

/**
 * Resolves the effective solid backdrop behind a given layer by scanning underlying visible filled shapes.
 */
export function resolveEffectiveBackdrop(
  doc: LogoDocument,
  layerIndex: number,
  target: LogoLayer
): string {
  const baseBg =
    doc.transparentBackground || doc.backgroundColor === 'transparent'
      ? '#FFFFFF'
      : doc.backgroundColor || '#FFFFFF';

  let currentBg = parseColorRgba(baseBg) ?? { r: 255, g: 255, b: 255, a: 1 };
  const cx = target.x + target.width / 2;
  const cy = target.y + target.height / 2;

  for (let i = 0; i < layerIndex; i += 1) {
    const under = doc.layers[i];
    if (!under || !under.visible || under.type !== 'shape') continue;
    if (under.shapeKind === 'ring' || under.shapeKind === 'frame') continue;
    if (!doesPointOverlapLayer(cx, cy, under)) continue;

    const rawFill = under.fillGradient?.enabled
      ? under.fillGradient.midColor || under.fillGradient.startColor
      : under.fill;
    const parsedFill = parseColorRgba(rawFill);
    if (!parsedFill || parsedFill.a === 0) continue;

    currentBg = blendRgbaOver({ ...parsedFill, a: parsedFill.a * under.opacity }, currentBg);
  }

  return rgbToHex(currentBg.r, currentBg.g, currentBg.b);
}

export function suggestAccessibleTextColor(bgHex: string, palette?: ColorPalette): string {
  const candidates = [
    palette?.text,
    palette?.primary,
    palette?.accent,
    '#141413',
    '#FFFFFF',
    '#0F172A',
    '#F8FAFC',
  ].filter((c): c is string => Boolean(c && c !== 'transparent' && c !== 'none'));

  // Prefer the first palette candidate that comfortably passes WCAG AA (4.5:1)
  for (const hex of candidates) {
    if (getContrastRatio(hex, bgHex) >= 4.5) {
      return hex;
    }
  }

  const whiteRatio = getContrastRatio('#FFFFFF', bgHex);
  const darkRatio = getContrastRatio('#141413', bgHex);
  return whiteRatio >= darkRatio ? '#FFFFFF' : '#141413';
}

export function analyzeDocumentContrast(
  doc: LogoDocument,
  palette?: ColorPalette
): DocumentContrastReport {
  const baseBg =
    doc.transparentBackground || doc.backgroundColor === 'transparent'
      ? '#FFFFFF'
      : doc.backgroundColor || '#FFFFFF';

  const issues: TextContrastIssue[] = [];
  let worstRatio = 21;
  let worstLayerId: string | undefined;
  let worstLayerName: string | undefined;
  let worstFgHex: string | undefined;
  let worstBgHex = baseBg;
  let suggestedFixHex: string | undefined;
  let checkedCount = 0;

  doc.layers.forEach((layer, idx) => {
    if (!layer.visible || layer.opacity <= 0.05) return;
    if (layer.type !== 'text' && layer.type !== 'path') return;
    if (layer.type === 'text' && !layer.text.trim()) return;

    const bgHex = resolveEffectiveBackdrop(doc, idx, layer);
    const candidateFills = layer.fillGradient?.enabled
      ? [
          layer.fillGradient.startColor,
          layer.fillGradient.midColor,
          layer.fillGradient.endColor,
        ].filter((c): c is string => Boolean(c))
      : [layer.fill];

    let minStopRatio = 21;
    let minStopColor = layer.fill;

    for (const stopHex of candidateFills) {
      if (!stopHex || stopHex === 'transparent' || stopHex === 'none') continue;
      const r = getContrastRatio(stopHex, bgHex, layer.opacity);
      if (r < minStopRatio) {
        minStopRatio = r;
        minStopColor = stopHex;
      }
    }

    checkedCount += 1;

    const isLargeText =
      layer.type === 'path'
        ? layer.height >= 24
        : layer.fontSize >= 24 || (layer.fontSize >= 18.66 && layer.fontWeight >= 700);
    const requiredRatio = isLargeText ? 3.0 : 4.5;

    if (minStopRatio < worstRatio) {
      worstRatio = minStopRatio;
      worstLayerId = layer.id;
      worstLayerName = layer.name;
      worstFgHex = minStopColor;
      worstBgHex = bgHex;
      suggestedFixHex = suggestAccessibleTextColor(bgHex, palette);
    }

    if (minStopRatio < requiredRatio) {
      issues.push({
        layerId: layer.id,
        layerName: layer.name,
        ratio: minStopRatio,
        requiredRatio,
        fgHex: minStopColor,
        bgHex,
        suggestedHex: suggestAccessibleTextColor(bgHex, palette),
        isLargeText,
        isCritical: minStopRatio < 2.2,
      });
    }
  });

  // Sort worst contrast first
  issues.sort((a, b) => a.ratio - b.ratio);

  return {
    hasWarning: issues.length > 0,
    hasCritical: issues.some((i) => i.isCritical),
    checkedCount,
    worstRatio: checkedCount > 0 ? worstRatio : 21,
    worstLayerId,
    worstLayerName,
    worstFgHex,
    worstBgHex,
    suggestedFixHex,
    issues,
  };
}

export function checkSafeZoneViolations(
  doc: LogoDocument,
  marginRatio = 0.08
): SafeZoneReport {
  const marginX = Math.round(doc.width * marginRatio);
  const marginY = Math.round(doc.height * marginRatio);
  const safeLeft = marginX;
  const safeTop = marginY;
  const safeRight = doc.width - marginX;
  const safeBottom = doc.height - marginY;

  const violatingLayerIds: string[] = [];
  for (const l of doc.layers) {
    if (!l.visible) continue;
    if (
      l.x < safeLeft - 1 ||
      l.y < safeTop - 1 ||
      l.x + l.width > safeRight + 1 ||
      l.y + l.height > safeBottom + 1
    ) {
      violatingLayerIds.push(l.id);
    }
  }

  return {
    marginX,
    marginY,
    violatingLayerIds,
  };
}
