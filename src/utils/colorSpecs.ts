export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface CmykColor {
  c: number;
  m: number;
  y: number;
  k: number;
}

export function normalizeHex(hex: string, fallback = '#1B4332'): string {
  const clean = (hex || '').trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`.toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `#${clean}`.toUpperCase();
  }
  return fallback.toUpperCase();
}

export function hexToRgb(hex: string): RgbColor {
  const norm = normalizeHex(hex);
  const clean = norm.slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16) || 0,
    g: parseInt(clean.slice(2, 4), 16) || 0,
    b: parseInt(clean.slice(4, 6), 16) || 0,
  };
}

export function rgbToCmyk(r: number, g: number, b: number): CmykColor {
  const rn = Math.max(0, Math.min(255, r)) / 255;
  const gn = Math.max(0, Math.min(255, g)) / 255;
  const bn = Math.max(0, Math.min(255, b)) / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k >= 0.999) return { c: 0, m: 0, y: 0, k: 100 };
  const c = ((1 - rn - k) / (1 - k)) * 100;
  const m = ((1 - gn - k) / (1 - k)) * 100;
  const y = ((1 - bn - k) / (1 - k)) * 100;
  return {
    c: Math.round(c),
    m: Math.round(m),
    y: Math.round(y),
    k: Math.round(k * 100),
  };
}

export function getColorSpecs(hex: string) {
  const normalizedHex = normalizeHex(hex);
  const rgb = hexToRgb(normalizedHex);
  const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
  return {
    hex: normalizedHex,
    rgb,
    cmyk,
    rgbLabel: `RGB(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    cmykLabel: `C${cmyk.c} M${cmyk.m} Y${cmyk.y} K${cmyk.k}`,
  };
}

export function isLightHex(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.62;
}
