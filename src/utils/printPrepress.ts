import { LogoDocument, LogoLayer } from '../types/logo';
import { CmykColor, hexToRgb, normalizeHex, rgbToCmyk } from './colorSpecs';

export interface GamutProofResult {
  sourceHex: string;
  proofHex: string;
  cmyk: CmykColor;
  cmykLabel: string;
  deltaE: number;
  isOutOfGamut: boolean;
  severity: 'ok' | 'warning' | 'critical';
  totalInkPercent: number;
}

export interface DocumentGamutSwatch {
  sourceHex: string;
  proofHex: string;
  cmykLabel: string;
  deltaE: number;
  severity: 'warning' | 'critical';
  totalInkPercent: number;
  layerIds: string[];
  layerNames: string[];
  includesBackground: boolean;
}

export interface DocumentGamutReport {
  totalColorsChecked: number;
  inGamutCount: number;
  outOfGamutSwatches: DocumentGamutSwatch[];
  outOfGamutLayerIds: string[];
  hasOutOfGamut: boolean;
  maxTotalInk: number;
}

export interface ClearSpaceMetrics {
  artMinX: number;
  artMinY: number;
  artMaxX: number;
  artMaxY: number;
  artWidth: number;
  artHeight: number;
  unit: number;
  boxX: number;
  boxY: number;
  boxWidth: number;
  boxHeight: number;
  overflowsArtboard: boolean;
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

function srgbChannelToLinear(c255: number): number {
  const c = Math.max(0, Math.min(255, c255)) / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const rl = srgbChannelToLinear(r);
  const gl = srgbChannelToLinear(g);
  const bl = srgbChannelToLinear(b);

  // sRGB D65 -> CIE XYZ
  const x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
  const y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) / 1.0;
  const z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function computeDeltaE76(hexA: string, hexB: string): number {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const [L1, a1, b1] = rgbToLab(a.r, a.g, a.b);
  const [L2, a2, b2] = rgbToLab(b.r, b.g, b.b);
  const dL = L1 - L2;
  const da = a1 - a2;
  const db = b1 - b2;
  return Math.round(Math.sqrt(dL * dL + da * da + db * db) * 10) / 10;
}

/**
 * Simulates coated CMYK ink reflectance (FOGRA39 / US Web Coated SWOP v2 envelope)
 * by applying subtractive cyan/magenta/yellow pigment cross-absorption to the
 * chromatic ink component while preserving neutral/dark K ink tones cleanly.
 */
function projectRgbToCoatedCmykGamut(r255: number, g255: number, b255: number): {
  r: number;
  g: number;
  b: number;
} {
  const r = Math.max(0, Math.min(255, r255)) / 255;
  const g = Math.max(0, Math.min(255, g255)) / 255;
  const b = Math.max(0, Math.min(255, b255)) / 255;

  const maxC = Math.max(r, g, b);
  const cRaw = Math.max(0, maxC - r);
  const mRaw = Math.max(0, maxC - g);
  const yRaw = Math.max(0, maxC - b);

  // Chromatic pigment unwanted absorption & overprint dimming in coated offset ink
  const lossR = (0.12 * mRaw + 0.03 * yRaw + 0.05 * mRaw * yRaw) * maxC;
  const lossG = (0.31 * cRaw + 0.09 * yRaw + 0.08 * cRaw * yRaw) * maxC;
  const lossB = (0.15 * cRaw + 0.41 * mRaw + 0.14 * cRaw * mRaw) * maxC;

  const pr = Math.max(0.072, Math.min(0.988, r - lossR));
  const pg = Math.max(0.070, Math.min(0.984, g - lossG));
  const pb = Math.max(0.072, Math.min(0.973, b - lossB));

  return {
    r: Math.round(pr * 255),
    g: Math.round(pg * 255),
    b: Math.round(pb * 255),
  };
}

/**
 * Maps CMYK ink percentages (0..100) into simulated coated-paper RGB.
 */
export function cmykToSimulatedRgb(cmyk: CmykColor): { r: number; g: number; b: number } {
  const c = Math.max(0, Math.min(100, cmyk.c)) / 100;
  const m = Math.max(0, Math.min(100, cmyk.m)) / 100;
  const y = Math.max(0, Math.min(100, cmyk.y)) / 100;
  const k = Math.max(0, Math.min(100, cmyk.k)) / 100;

  const idealR = 255 * (1 - c) * (1 - k);
  const idealG = 255 * (1 - m) * (1 - k);
  const idealB = 255 * (1 - y) * (1 - k);
  return projectRgbToCoatedCmykGamut(idealR, idealG, idealB);
}

function isHexString(val: string | undefined): val is string {
  if (!val) return false;
  const trimmed = val.trim();
  if (trimmed === 'transparent' || trimmed === 'none' || trimmed.startsWith('url(')) {
    return false;
  }
  return /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(trimmed);
}

/**
 * Simulates coated CMYK print appearance for a hex color and flags whether
 * it falls outside standard CMYK print gamut (Delta E >= 8.5).
 */
export function simulateCmykProofColor(hex: string): GamutProofResult {
  const sourceHex = normalizeHex(hex);
  const { r, g, b } = hexToRgb(sourceHex);
  const cmyk = rgbToCmyk(r, g, b);
  const sim = projectRgbToCoatedCmykGamut(r, g, b);
  const proofHex = rgbToHex(sim.r, sim.g, sim.b);
  const deltaE = computeDeltaE76(sourceHex, proofHex);
  const totalInkPercent = cmyk.c + cmyk.m + cmyk.y + cmyk.k;

  // Bright neons, electric blues/magentas/greens shift >= 8.5 Delta E when converted to CMYK ink
  const isOutOfGamut = deltaE >= 8.5;
  const severity: 'ok' | 'warning' | 'critical' =
    deltaE >= 15 ? 'critical' : isOutOfGamut ? 'warning' : 'ok';

  return {
    sourceHex,
    proofHex,
    cmyk,
    cmykLabel: `C${cmyk.c} M${cmyk.m} Y${cmyk.y} K${cmyk.k}`,
    deltaE,
    isOutOfGamut,
    severity,
    totalInkPercent,
  };
}

/**
 * Finds the nearest stable printable hex inside the CMYK gamut boundary
 * so a snapped color passes subsequent print gamut audits cleanly.
 */
function findNearestPrintableHex(hex: string): string {
  let candidate = normalizeHex(hex);
  for (let step = 0; step < 6; step++) {
    const res = simulateCmykProofColor(candidate);
    if (!res.isOutOfGamut) return candidate;
    candidate = res.proofHex;
  }
  return candidate;
}

function collectLayerColors(layer: LogoLayer): string[] {
  const out: string[] = [];
  if (isHexString(layer.fill)) out.push(normalizeHex(layer.fill));
  if (layer.strokeWidth > 0 && isHexString(layer.stroke)) out.push(normalizeHex(layer.stroke));
  if (layer.shadow?.enabled && isHexString(layer.shadow.color)) {
    out.push(normalizeHex(layer.shadow.color));
  }
  if (layer.fillGradient?.enabled) {
    if (isHexString(layer.fillGradient.startColor)) {
      out.push(normalizeHex(layer.fillGradient.startColor));
    }
    if (isHexString(layer.fillGradient.endColor)) {
      out.push(normalizeHex(layer.fillGradient.endColor));
    }
    if (isHexString(layer.fillGradient.midColor)) {
      out.push(normalizeHex(layer.fillGradient.midColor));
    }
    layer.fillGradient.stops?.forEach((s) => {
      if (isHexString(s.color)) out.push(normalizeHex(s.color));
    });
  }
  if (layer.fillPattern?.enabled) {
    if (isHexString(layer.fillPattern.foregroundColor)) {
      out.push(normalizeHex(layer.fillPattern.foregroundColor));
    }
    if (isHexString(layer.fillPattern.backgroundColor)) {
      out.push(normalizeHex(layer.fillPattern.backgroundColor));
    }
  }
  if (layer.type === 'icon') {
    if (isHexString(layer.accentFill)) out.push(normalizeHex(layer.accentFill));
    if (isHexString(layer.secondaryFill)) out.push(normalizeHex(layer.secondaryFill));
    layer.partColors?.forEach((pc) => {
      if (isHexString(pc)) out.push(normalizeHex(pc));
    });
  }
  if (layer.type === 'text' && layer.textEffect && layer.textEffect.style !== 'none') {
    if (isHexString(layer.textEffect.primaryColor)) {
      out.push(normalizeHex(layer.textEffect.primaryColor));
    }
    if (isHexString(layer.textEffect.secondaryColor)) {
      out.push(normalizeHex(layer.textEffect.secondaryColor));
    }
  }
  return out;
}

/**
 * Audits all visible layers and background in a LogoDocument for out-of-gamut colors.
 */
export function auditDocumentPrintGamut(doc: LogoDocument): DocumentGamutReport {
  const checkedHexMap = new Map<string, GamutProofResult>();
  const swatchUsage = new Map<
    string,
    {
      layerIds: Set<string>;
      layerNames: Set<string>;
      includesBackground: boolean;
      result: GamutProofResult;
    }
  >();

  let maxTotalInk = 0;

  const inspectHex = (hex: string, layer?: LogoLayer, isBg = false) => {
    const norm = normalizeHex(hex);
    let result = checkedHexMap.get(norm);
    if (!result) {
      result = simulateCmykProofColor(norm);
      checkedHexMap.set(norm, result);
    }
    if (result.totalInkPercent > maxTotalInk) {
      maxTotalInk = result.totalInkPercent;
    }
    if (!result.isOutOfGamut) return;

    let entry = swatchUsage.get(norm);
    if (!entry) {
      entry = {
        layerIds: new Set<string>(),
        layerNames: new Set<string>(),
        includesBackground: false,
        result,
      };
      swatchUsage.set(norm, entry);
    }
    if (isBg) entry.includesBackground = true;
    if (layer) {
      entry.layerIds.add(layer.id);
      entry.layerNames.add(layer.name);
    }
  };

  if (!doc.transparentBackground && isHexString(doc.backgroundColor)) {
    inspectHex(doc.backgroundColor, undefined, true);
  }

  for (const layer of doc.layers) {
    if (!layer.visible) continue;
    for (const hex of collectLayerColors(layer)) {
      inspectHex(hex, layer, false);
    }
  }

  const outOfGamutSwatches: DocumentGamutSwatch[] = Array.from(swatchUsage.values())
    .map(({ result, layerIds, layerNames, includesBackground }) => ({
      sourceHex: result.sourceHex,
      proofHex: result.proofHex,
      cmykLabel: result.cmykLabel,
      deltaE: result.deltaE,
      severity: result.severity === 'critical' ? ('critical' as const) : ('warning' as const),
      totalInkPercent: result.totalInkPercent,
      layerIds: Array.from(layerIds),
      layerNames: Array.from(layerNames),
      includesBackground,
    }))
    .sort((a, b) => b.deltaE - a.deltaE);

  const outOfGamutLayerIdSet = new Set<string>();
  outOfGamutSwatches.forEach((s) => s.layerIds.forEach((id) => outOfGamutLayerIdSet.add(id)));

  return {
    totalColorsChecked: checkedHexMap.size,
    inGamutCount: Math.max(0, checkedHexMap.size - outOfGamutSwatches.length),
    outOfGamutSwatches,
    outOfGamutLayerIds: Array.from(outOfGamutLayerIdSet),
    hasOutOfGamut: outOfGamutSwatches.length > 0,
    maxTotalInk,
  };
}

function mapLayerColors(layer: LogoLayer, mapper: (hex: string) => string): LogoLayer {
  const next: LogoLayer = { ...layer };

  if (isHexString(next.fill)) {
    next.fill = mapper(next.fill);
  }
  if (next.strokeWidth > 0 && isHexString(next.stroke)) {
    next.stroke = mapper(next.stroke);
  }
  if (next.shadow?.enabled && isHexString(next.shadow.color)) {
    next.shadow = { ...next.shadow, color: mapper(next.shadow.color) };
  }
  if (next.fillGradient?.enabled) {
    next.fillGradient = {
      ...next.fillGradient,
      startColor: isHexString(next.fillGradient.startColor)
        ? mapper(next.fillGradient.startColor)
        : next.fillGradient.startColor,
      endColor: isHexString(next.fillGradient.endColor)
        ? mapper(next.fillGradient.endColor)
        : next.fillGradient.endColor,
      midColor: isHexString(next.fillGradient.midColor)
        ? mapper(next.fillGradient.midColor)
        : next.fillGradient.midColor,
      stops: next.fillGradient.stops?.map((s) => ({
        ...s,
        color: isHexString(s.color) ? mapper(s.color) : s.color,
      })),
    };
  }
  if (next.fillPattern?.enabled) {
    next.fillPattern = {
      ...next.fillPattern,
      foregroundColor: isHexString(next.fillPattern.foregroundColor)
        ? mapper(next.fillPattern.foregroundColor)
        : next.fillPattern.foregroundColor,
      backgroundColor: isHexString(next.fillPattern.backgroundColor)
        ? mapper(next.fillPattern.backgroundColor)
        : next.fillPattern.backgroundColor,
    };
  }
  if (next.type === 'icon') {
    next.accentFill = isHexString(next.accentFill) ? mapper(next.accentFill) : next.accentFill;
    next.secondaryFill = isHexString(next.secondaryFill)
      ? mapper(next.secondaryFill)
      : next.secondaryFill;
    if (next.partColors) {
      next.partColors = next.partColors.map((pc) => (isHexString(pc) ? mapper(pc) : pc));
    }
  }
  if (next.type === 'text' && next.textEffect && next.textEffect.style !== 'none') {
    next.textEffect = {
      ...next.textEffect,
      primaryColor: isHexString(next.textEffect.primaryColor)
        ? mapper(next.textEffect.primaryColor)
        : next.textEffect.primaryColor,
      secondaryColor: isHexString(next.textEffect.secondaryColor)
        ? mapper(next.textEffect.secondaryColor)
        : next.textEffect.secondaryColor,
    };
  }

  return next;
}

/**
 * Returns a non-destructive soft-proofed clone of a LogoDocument where every
 * RGB color is converted to its simulated coated CMYK ink appearance.
 */
export function applyCmykSoftProofToDocument(doc: LogoDocument): LogoDocument {
  const cache = new Map<string, string>();
  const toProof = (hex: string) => {
    const norm = normalizeHex(hex);
    let hit = cache.get(norm);
    if (!hit) {
      hit = simulateCmykProofColor(norm).proofHex;
      cache.set(norm, hit);
    }
    return hit;
  };

  return {
    ...doc,
    backgroundColor:
      !doc.transparentBackground && isHexString(doc.backgroundColor)
        ? toProof(doc.backgroundColor)
        : doc.backgroundColor,
    layers: doc.layers.map((layer) => mapLayerColors(layer, toProof)),
  };
}

/**
 * Permanently converts out-of-gamut neon/RGB hexes in a document (or a specific
 * target hex) to their closest printable coated CMYK ink hex equivalents.
 */
export function snapDocumentToPrintGamut(
  doc: LogoDocument,
  onlySourceHex?: string
): LogoDocument {
  const filterHex = onlySourceHex ? normalizeHex(onlySourceHex) : null;
  const cache = new Map<string, string>();

  const toPrintable = (hex: string) => {
    const norm = normalizeHex(hex);
    if (filterHex && norm !== filterHex) return hex;
    let hit = cache.get(norm);
    if (!hit) {
      const proof = simulateCmykProofColor(norm);
      hit = proof.isOutOfGamut ? findNearestPrintableHex(norm) : norm;
      cache.set(norm, hit);
    }
    return hit;
  };

  return {
    ...doc,
    backgroundColor:
      !doc.transparentBackground && isHexString(doc.backgroundColor)
        ? toPrintable(doc.backgroundColor)
        : doc.backgroundColor,
    layers: doc.layers.map((layer) => mapLayerColors(layer, toPrintable)),
  };
}

/**
 * Computes standard 1x brand-guideline clear-space bounds around the visible
 * artwork on the artboard.
 */
export function computeClearSpaceMetrics(doc: LogoDocument): ClearSpaceMetrics | null {
  const visible = doc.layers.filter((l) => l.visible && l.width > 0 && l.height > 0);
  if (visible.length === 0) return null;

  const artMinX = Math.min(...visible.map((l) => l.x));
  const artMinY = Math.min(...visible.map((l) => l.y));
  const artMaxX = Math.max(...visible.map((l) => l.x + l.width));
  const artMaxY = Math.max(...visible.map((l) => l.y + l.height));
  const artWidth = Math.max(1, artMaxX - artMinX);
  const artHeight = Math.max(1, artMaxY - artMinY);

  // Measure proportional 1x unit from primary emblem or 25% of compact lockup span
  const emblem = visible.find((l) => l.type === 'icon' || l.type === 'shape');
  const rawUnit = emblem
    ? Math.round(Math.min(emblem.width, emblem.height) * 0.45)
    : Math.round(Math.min(artWidth, artHeight) * 0.25);
  const unit = Math.max(20, Math.min(84, rawUnit));

  const boxX = artMinX - unit;
  const boxY = artMinY - unit;
  const boxWidth = artWidth + unit * 2;
  const boxHeight = artHeight + unit * 2;

  const overflowsArtboard =
    boxX < 0 ||
    boxY < 0 ||
    boxX + boxWidth > doc.width ||
    boxY + boxHeight > doc.height;

  return {
    artMinX,
    artMinY,
    artMaxX,
    artMaxY,
    artWidth,
    artHeight,
    unit,
    boxX,
    boxY,
    boxWidth,
    boxHeight,
    overflowsArtboard,
  };
}
