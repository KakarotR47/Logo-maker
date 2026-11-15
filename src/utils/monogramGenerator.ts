import { FONT_OPTIONS } from '../data/logoLibrary';
import {
  ColorPalette,
  CustomSvgLayer,
  CustomSvgPart,
  DividerLayer,
  LayerShadow,
  LogoLayer,
  ShapeLayer,
  TextLayer,
} from '../types/logo';
import { nextLayerId } from './logoGenerator';

export type MonogramCategory =
  | 'All'
  | 'Interlocking'
  | 'Crest & Shield'
  | 'Wreath & Laurel'
  | 'Geometric & Seal';

export const MONOGRAM_CATEGORIES: Exclude<MonogramCategory, 'All'>[] = [
  'Interlocking',
  'Crest & Shield',
  'Wreath & Laurel',
  'Geometric & Seal',
];

export type MonogramFontTone = 'serif' | 'sans' | 'display' | 'script';

export interface MonogramTemplateSpec {
  id: string;
  name: string;
  category: Exclude<MonogramCategory, 'All'>;
  note: string;
}

export const MONOGRAM_TEMPLATES: MonogramTemplateSpec[] = [
  // 1. Interlocking (6)
  { id: 'interlock-overlap', name: 'Interlock Offset', category: 'Interlocking', note: 'Crossed layered initials' },
  { id: 'interlock-split-bar', name: 'Rule Split', category: 'Interlocking', note: 'Bisected diamond bar' },
  { id: 'interlock-stacked-3', name: 'Estate Diamond', category: 'Interlocking', note: 'Hero center flanked' },
  { id: 'interlock-serif-weave', name: 'Editorial Weave', category: 'Interlocking', note: 'Dual contrast weave' },
  { id: 'interlock-duo-contrast', name: 'Solid & Hollow', category: 'Interlocking', note: 'Filled + outlined pair' },
  { id: 'interlock-diagonal-slash', name: 'Diagonal Split', category: 'Interlocking', note: 'Dynamic angled slash' },

  // 2. Crest & Shield (6)
  { id: 'crest-royal-shield', name: 'Royal Shield', category: 'Crest & Shield', note: 'Double-line heraldry' },
  { id: 'crest-knight-shield', name: 'Inverted Shield', category: 'Crest & Shield', note: 'Solid negative crest' },
  { id: 'crest-crown-seal', name: 'Crowned Crest', category: 'Crest & Shield', note: 'Shield with sovereign crown' },
  { id: 'crest-arch-herald', name: 'Cathedral Arch', category: 'Crest & Shield', note: 'Vaulted arch monogram' },
  { id: 'crest-atelier-frame', name: 'Atelier Frame', category: 'Crest & Shield', note: 'Architectural cartouche' },
  { id: 'crest-ribbon-herald', name: 'Ribbon Herald', category: 'Crest & Shield', note: 'Crest with ribbon banner' },

  // 3. Wreath & Laurel (6)
  { id: 'wreath-olive-laurel', name: 'Olive Laurel', category: 'Wreath & Laurel', note: 'Symmetrical botanical twigs' },
  { id: 'wreath-double-ring-botanical', name: 'Crown Ring Wreath', category: 'Wreath & Laurel', note: 'Laurel wrapped halo' },
  { id: 'wreath-heritage-seal', name: 'Heritage Stamp', category: 'Wreath & Laurel', note: 'Scalloped botanical seal' },
  { id: 'wreath-minimal-sprig', name: 'Minimalist Sprig', category: 'Wreath & Laurel', note: 'Open ring with leaves' },
  { id: 'wreath-botanical-diamond', name: 'Botanical Lozenge', category: 'Wreath & Laurel', note: 'Diamond flanked by laurel' },
  { id: 'wreath-royal-garland', name: 'Royal Garland', category: 'Wreath & Laurel', note: 'Wreath with top crown' },

  // 4. Geometric & Seal (6)
  { id: 'geo-hexagon-vault', name: 'Hex Vault', category: 'Geometric & Seal', note: 'Hexagonal geometric badge' },
  { id: 'geo-octagon-atelier', name: 'Octagon Mark', category: 'Geometric & Seal', note: '8-sided emblem frame' },
  { id: 'geo-circle-negative', name: 'Solar Disc', category: 'Geometric & Seal', note: 'High-contrast orb cutout' },
  { id: 'geo-split-pill', name: 'Capsule Pill', category: 'Geometric & Seal', note: 'Modern tracked pill' },
  { id: 'geo-diamond-prism', name: 'Prism Diamond', category: 'Geometric & Seal', note: 'Nested prism lozenge' },
  { id: 'geo-stamp-ring', name: 'Monogram Seal', category: 'Geometric & Seal', note: 'Twin concentric rings' },
];

const NO_SHADOW: LayerShadow = {
  enabled: false,
  color: 'rgba(17, 24, 39, 0.18)',
  blur: 10,
  offsetX: 0,
  offsetY: 6,
};

export function sanitizeMonogramInitials(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9&]/g, '').slice(0, 3);
  return cleaned || 'FA';
}

export function extractInitialsFromBrand(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean);
  if (words.length >= 3) {
    return `${words[0][0]}${words[1][0]}${words[2][0]}`.toUpperCase();
  }
  if (words.length === 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return 'FA';
}

function resolveFontForTone(tone: MonogramFontTone) {
  const targetId =
    tone === 'serif'
      ? 'cinzel'
      : tone === 'sans'
        ? 'outfit'
        : tone === 'display'
          ? 'syne'
          : 'great-vibes';
  return FONT_OPTIONS.find((f) => f.id === targetId) ?? FONT_OPTIONS[0];
}

/**
 * Generates crisp symmetrical vector botanical laurel wreath paths in a 200x200 viewBox.
 */
function buildLaurelWreathParts(leafColor: string, stemColor: string, includeCrownStar = false): CustomSvgPart[] {
  const parts: CustomSvgPart[] = [];
  const cx = 100;
  const cy = 102;
  const r = 74;

  // Symmetrical main curved stems
  parts.push({
    d: `M 93 175 C 44 166, 22 128, 26 84 C 28 58, 42 36, 58 24`,
    fill: 'none',
    stroke: stemColor,
    strokeWidth: 3.2,
    label: 'Left Wreath Stem',
  });
  parts.push({
    d: `M 107 175 C 156 166, 178 128, 174 84 C 172 58, 158 36, 142 24`,
    fill: 'none',
    stroke: stemColor,
    strokeWidth: 3.2,
    label: 'Right Wreath Stem',
  });

  // 8 paired leaves along each side
  const anglesDeg = [115, 134, 154, 174, 194, 214, 232, 248];
  for (let i = 0; i < anglesDeg.length; i++) {
    const deg = anglesDeg[i];
    const rad = (deg * Math.PI) / 180;
    const lx = cx + Math.cos(rad) * r;
    const ly = cy + Math.sin(rad) * r;
    const size = 12 - i * 0.45;

    // Outer & inner angled leaf petals (left side + mirrored right side)
    for (const side of [-1, 1] as const) {
      const px = side === -1 ? lx : 200 - lx;
      const py = ly;
      for (const tilt of [-0.45, 0.45]) {
        const leafAngle = side === -1 ? rad - Math.PI / 2 + tilt : Math.PI - (rad - Math.PI / 2 + tilt);
        const tipX = px + Math.cos(leafAngle) * size;
        const tipY = py + Math.sin(leafAngle) * size;
        const midX = (px + tipX) / 2;
        const midY = (py + tipY) / 2;
        const nx = -Math.sin(leafAngle) * (size * 0.34);
        const ny = Math.cos(leafAngle) * (size * 0.34);
        parts.push({
          d: `M ${px.toFixed(1)} ${py.toFixed(1)} Q ${(midX + nx).toFixed(1)} ${(midY + ny).toFixed(1)} ${tipX.toFixed(1)} ${tipY.toFixed(1)} Q ${(midX - nx).toFixed(1)} ${(midY - ny).toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)} Z`,
          fill: leafColor,
          label: `Laurel Leaf ${side === -1 ? 'L' : 'R'}${i + 1}`,
        });
      }
    }
  }

  // Bottom tie emblem
  parts.push({
    d: 'M 94 176 L 100 170 L 106 176 L 100 183 Z',
    fill: stemColor,
    label: 'Wreath Clasp',
  });

  if (includeCrownStar) {
    parts.push({
      d: 'M 76 30 L 82 14 L 93 23 L 100 10 L 107 23 L 118 14 L 124 30 Z M 75 33 H 125 V 37 H 75 Z',
      fill: stemColor,
      label: 'Crown Crest',
    });
  }

  return parts;
}

function buildCrownCustomParts(color: string): CustomSvgPart[] {
  return [
    {
      d: 'M 22 68 L 32 26 L 68 48 L 100 16 L 132 48 L 168 26 L 178 68 Z',
      fill: color,
      label: 'Crown Points',
    },
    {
      d: 'M 22 76 H 178 V 88 H 22 Z',
      fill: color,
      label: 'Crown Band',
    },
    {
      d: 'M 100 6 C 103 6, 105 8, 105 11 C 105 14, 103 16, 100 16 C 97 16, 95 14, 95 11 C 95 8, 97 6, 100 6 Z',
      fill: color,
      label: 'Center Jewel',
    },
  ];
}

function makeTextLayer(
  name: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
  fill: string,
  fontTone: MonogramFontTone,
  extra?: Partial<TextLayer>
): TextLayer {
  const font = resolveFontForTone(fontTone);
  return {
    id: nextLayerId('monotxt'),
    name,
    type: 'text',
    text,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill,
    stroke: 'none',
    strokeWidth: 0,
    shadow: { ...NO_SHADOW },
    fontFamily: font.cssFamily,
    fontId: font.id,
    fontWeight: fontTone === 'script' ? 400 : 700,
    fontStyle: 'normal',
    fontSize,
    letterSpacing: fontTone === 'script' ? 0.01 : 0.08,
    lineHeight: 1.05,
    textAlign: 'center',
    uppercase: fontTone !== 'script',
    curveRadius: 0,
    ...extra,
  };
}

function makeShapeLayer(
  name: string,
  shapeKind: ShapeLayer['shapeKind'],
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  stroke = 'none',
  strokeWidth = 0,
  cornerRadius = 18
): ShapeLayer {
  return {
    id: nextLayerId('monoshp'),
    name,
    type: 'shape',
    shapeKind,
    cornerRadius,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill,
    stroke,
    strokeWidth,
    shadow: { ...NO_SHADOW },
  };
}

function makeDividerLayer(
  name: string,
  kind: DividerLayer['dividerKind'],
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  rotation = 0
): DividerLayer {
  return {
    id: nextLayerId('monodiv'),
    name,
    type: 'divider',
    dividerKind: kind,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    rotation,
    opacity: 1,
    visible: true,
    locked: false,
    fill,
    stroke: 'none',
    strokeWidth: 0,
    shadow: { ...NO_SHADOW },
  };
}

function makeCustomSvgLayer(
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  viewBox: string,
  parts: CustomSvgPart[],
  fill: string
): CustomSvgLayer {
  return {
    id: nextLayerId('monosvg'),
    name,
    type: 'custom-svg',
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill,
    stroke: 'none',
    strokeWidth: 0,
    shadow: { ...NO_SHADOW },
    paths: parts,
    viewBox,
    preserveOriginalColors: true,
  };
}

/**
 * Generates editable vector LogoLayer[] for any of the 24 Monogram archetypes centered on (centerX, centerY)
 * inside an editorial 220x220 footprint.
 */
export function buildMonogramLayers(
  rawInitials: string,
  templateId: string,
  palette: ColorPalette,
  fontTone: MonogramFontTone,
  centerX = 400,
  centerY = 300,
  subtitle = ''
): LogoLayer[] {
  const letters = sanitizeMonogramInitials(rawInitials);
  const chars = letters.split('');
  const c1 = chars[0] || 'F';
  const c2 = chars[1] || c1;
  const c3 = chars[2] || '';
  const has3 = chars.length === 3;

  const primary = palette.primary;
  const accent = palette.accent;
  const secondary = palette.secondary;
  const bg = palette.background === 'transparent' ? '#FFFFFF' : palette.background;

  const layers: LogoLayer[] = [];

  switch (templateId) {
    case 'interlock-overlap': {
      layers.push(
        makeTextLayer('Initial 1', c1, centerX - 104, centerY - 82, 140, 130, 108, primary, fontTone, {
          rotation: -3,
        }),
        makeTextLayer('Initial 2', c2, centerX - 36, centerY - 46, 140, 130, 108, accent, fontTone, {
          stroke: bg,
          strokeWidth: 6,
          rotation: 3,
        })
      );
      if (has3) {
        layers.push(
          makeTextLayer('Initial 3', c3, centerX + 26, centerY - 66, 100, 110, 74, palette.text, fontTone, {
            stroke: bg,
            strokeWidth: 4,
          })
        );
      }
      break;
    }

    case 'interlock-split-bar': {
      layers.push(
        makeShapeLayer('Monogram Frame', 'frame', centerX - 102, centerY - 102, 204, 204, 'transparent', primary, 4, 16),
        makeTextLayer('Top Initials', letters, centerX - 96, centerY - 66, 192, 92, 68, primary, fontTone),
        makeDividerLayer('Center Rule', 'diamond-center', centerX - 78, centerY + 18, 156, 16, accent),
        makeTextLayer(
          'Monogram Motto',
          (subtitle || 'ATELIER · EST. 2026').toUpperCase(),
          centerX - 88,
          centerY + 42,
          176,
          32,
          12,
          palette.text,
          'sans',
          { letterSpacing: 0.24 }
        )
      );
      break;
    }

    case 'interlock-stacked-3': {
      const sideLeft = c1;
      const centerHero = has3 ? c2 : c1;
      const sideRight = has3 ? c3 : c2;
      layers.push(
        makeShapeLayer('Outer Ring', 'ring', centerX - 106, centerY - 106, 212, 212, 'transparent', primary, 3.5),
        makeTextLayer('Left Initial', sideLeft, centerX - 96, centerY - 36, 60, 72, 46, accent, fontTone),
        makeTextLayer('Center Hero Initial', centerHero, centerX - 58, centerY - 72, 116, 144, 104, primary, fontTone),
        makeTextLayer('Right Initial', sideRight, centerX + 36, centerY - 36, 60, 72, 46, accent, fontTone)
      );
      break;
    }

    case 'interlock-serif-weave': {
      layers.push(
        makeTextLayer('Primary Initial', c1, centerX - 92, centerY - 76, 128, 128, 104, primary, fontTone),
        makeTextLayer('Secondary Initial', has3 ? `${c2}${c3}` : c2, centerX - 24, centerY - 38, 130, 120, 90, accent, fontTone, {
          fontStyle: 'italic',
          stroke: bg,
          strokeWidth: 4.5,
        }),
        makeDividerLayer('Signature Underline', 'tapered', centerX - 78, centerY + 72, 156, 10, primary)
      );
      break;
    }

    case 'interlock-duo-contrast': {
      layers.push(
        makeTextLayer('Solid Initial', c1, centerX - 98, centerY - 68, 120, 136, 98, primary, fontTone),
        makeTextLayer(
          'Hollow Initial',
          has3 ? `${c2}${c3}` : c2,
          centerX - 18,
          centerY - 52,
          132,
          136,
          96,
          accent,
          fontTone,
          {
            textEffect: { style: 'hollow', intensity: 1.25, primaryColor: accent },
          }
        )
      );
      break;
    }

    case 'interlock-diagonal-slash': {
      layers.push(
        makeShapeLayer('Circle Backdrop', 'circle', centerX - 96, centerY - 96, 192, 192, secondary, primary, 3),
        makeTextLayer('Upper Left Initial', c1, centerX - 88, centerY - 76, 90, 86, 66, primary, fontTone),
        makeDividerLayer('Diagonal Slash', 'solid', centerX - 84, centerY - 4, 168, 8, accent, -42),
        makeTextLayer('Lower Right Initial', has3 ? `${c2}${c3}` : c2, centerX - 2, centerY - 6, 92, 86, 66, primary, fontTone)
      );
      break;
    }

    case 'crest-royal-shield': {
      layers.push(
        makeShapeLayer('Royal Crest Shield', 'crest-double', centerX - 98, centerY - 110, 196, 220, primary, accent, 4, 10),
        makeTextLayer('Crest Initials', letters, centerX - 82, centerY - 48, 164, 96, has3 ? 52 : 66, bg, fontTone, {
          letterSpacing: 0.08,
        }),
        makeDividerLayer('Shield Rule', 'diamond-center', centerX - 54, centerY + 38, 108, 12, accent)
      );
      break;
    }

    case 'crest-knight-shield': {
      layers.push(
        makeShapeLayer('Shield Outline', 'shield', centerX - 96, centerY - 108, 192, 216, 'transparent', primary, 6, 8),
        makeShapeLayer('Inner Shield Fill', 'shield', centerX - 84, centerY - 95, 168, 190, secondary, accent, 1.5, 6),
        makeTextLayer('Shield Monogram', letters, centerX - 76, centerY - 46, 152, 92, has3 ? 52 : 64, primary, fontTone)
      );
      break;
    }

    case 'crest-crown-seal': {
      layers.push(
        makeShapeLayer('Shield Base', 'shield', centerX - 92, centerY - 76, 184, 196, primary, accent, 3.5, 8),
        makeCustomSvgLayer(
          'Royal Crown',
          centerX - 44,
          centerY - 122,
          88,
          44,
          '0 0 200 100',
          buildCrownCustomParts(accent),
          accent
        ),
        makeTextLayer('Crowned Initials', letters, centerX - 76, centerY - 30, 152, 92, has3 ? 50 : 62, bg, fontTone)
      );
      break;
    }

    case 'crest-arch-herald': {
      layers.push(
        makeShapeLayer('Arch Vault', 'arch', centerX - 92, centerY - 106, 184, 212, 'transparent', primary, 5, 10),
        makeShapeLayer('Inner Arch Fill', 'arch', centerX - 80, centerY - 94, 160, 188, secondary, 'none', 0, 8),
        makeTextLayer('Arch Initials', letters, centerX - 74, centerY - 44, 148, 92, has3 ? 48 : 60, primary, fontTone),
        makeDividerLayer('Arch Base Rule', 'double', centerX - 56, centerY + 46, 112, 12, accent)
      );
      break;
    }

    case 'crest-atelier-frame': {
      layers.push(
        makeShapeLayer('Atelier Cartouche', 'frame', centerX - 104, centerY - 88, 208, 176, 'transparent', primary, 4.5, 4),
        makeTextLayer('Atelier Initials', letters, centerX - 92, centerY - 48, 184, 96, has3 ? 56 : 70, primary, fontTone),
        makeDividerLayer('Bracket Rule', 'bracket', centerX - 74, centerY + 42, 148, 14, accent)
      );
      break;
    }

    case 'crest-ribbon-herald': {
      layers.push(
        makeShapeLayer('Herald Shield', 'shield', centerX - 88, centerY - 106, 176, 196, primary, 'none', 0, 8),
        makeTextLayer('Crest Initials', letters, centerX - 74, centerY - 56, 148, 84, has3 ? 48 : 60, bg, fontTone),
        makeShapeLayer('Ribbon Banner', 'ribbon-banner', centerX - 114, centerY + 42, 228, 52, accent, bg, 2, 6),
        makeTextLayer(
          'Ribbon Label',
          (subtitle || letters).toUpperCase(),
          centerX - 86,
          centerY + 52,
          172,
          32,
          14,
          bg,
          'sans',
          { letterSpacing: 0.24 }
        )
      );
      break;
    }

    case 'wreath-olive-laurel': {
      layers.push(
        makeCustomSvgLayer(
          'Olive Laurel Wreath',
          centerX - 114,
          centerY - 114,
          228,
          228,
          '0 0 200 200',
          buildLaurelWreathParts(primary, accent, false),
          primary
        ),
        makeTextLayer('Wreath Monogram', letters, centerX - 68, centerY - 44, 136, 88, has3 ? 48 : 62, primary, fontTone)
      );
      break;
    }

    case 'wreath-double-ring-botanical': {
      layers.push(
        makeCustomSvgLayer(
          'Botanical Wreath',
          centerX - 116,
          centerY - 116,
          232,
          232,
          '0 0 200 200',
          buildLaurelWreathParts(accent, primary, false),
          accent
        ),
        makeShapeLayer('Inner Medallion', 'circle', centerX - 64, centerY - 64, 128, 128, secondary, primary, 3),
        makeTextLayer('Center Monogram', letters, centerX - 58, centerY - 40, 116, 80, has3 ? 40 : 52, primary, fontTone)
      );
      break;
    }

    case 'wreath-heritage-seal': {
      layers.push(
        makeShapeLayer('Scalloped Seal', 'seal-scalloped', centerX - 112, centerY - 112, 224, 224, secondary, primary, 3),
        makeCustomSvgLayer(
          'Seal Laurel',
          centerX - 96,
          centerY - 96,
          192,
          192,
          '0 0 200 200',
          buildLaurelWreathParts(primary, accent, false),
          primary
        ),
        makeTextLayer('Seal Initials', letters, centerX - 56, centerY - 36, 112, 72, has3 ? 38 : 48, primary, fontTone)
      );
      break;
    }

    case 'wreath-minimal-sprig': {
      layers.push(
        makeShapeLayer('Fine Ring', 'ring', centerX - 98, centerY - 98, 196, 196, 'transparent', primary, 2.5),
        makeCustomSvgLayer(
          'Laurel Sprig',
          centerX - 110,
          centerY - 106,
          220,
          220,
          '0 0 200 200',
          buildLaurelWreathParts(accent, primary, false),
          accent
        ),
        makeTextLayer('Minimal Initials', letters, centerX - 64, centerY - 42, 128, 84, has3 ? 44 : 56, primary, fontTone)
      );
      break;
    }

    case 'wreath-botanical-diamond': {
      layers.push(
        makeCustomSvgLayer(
          'Flanking Laurel',
          centerX - 116,
          centerY - 112,
          232,
          224,
          '0 0 200 200',
          buildLaurelWreathParts(accent, primary, false),
          accent
        ),
        makeShapeLayer('Diamond Core', 'diamond', centerX - 72, centerY - 72, 144, 144, primary, bg, 3, 8),
        makeTextLayer('Diamond Initials', letters, centerX - 58, centerY - 36, 116, 72, has3 ? 38 : 48, bg, fontTone)
      );
      break;
    }

    case 'wreath-royal-garland': {
      layers.push(
        makeCustomSvgLayer(
          'Royal Garland Wreath',
          centerX - 114,
          centerY - 112,
          228,
          228,
          '0 0 200 200',
          buildLaurelWreathParts(primary, accent, true),
          primary
        ),
        makeTextLayer('Royal Initials', letters, centerX - 66, centerY - 36, 132, 82, has3 ? 44 : 56, primary, fontTone),
        makeDividerLayer('Royal Base', 'tapered', centerX - 44, centerY + 46, 88, 10, accent)
      );
      break;
    }

    case 'geo-hexagon-vault': {
      layers.push(
        makeShapeLayer('Hexagon Frame', 'hexagon', centerX - 104, centerY - 108, 208, 216, primary, accent, 4, 14),
        makeTextLayer('Hex Monogram', letters, centerX - 84, centerY - 48, 168, 96, has3 ? 52 : 66, bg, fontTone)
      );
      break;
    }

    case 'geo-octagon-atelier': {
      layers.push(
        makeShapeLayer('Outer Octagon', 'octagon', centerX - 104, centerY - 104, 208, 208, 'transparent', primary, 5, 6),
        makeShapeLayer('Inner Octagon', 'octagon', centerX - 90, centerY - 90, 180, 180, secondary, accent, 2, 4),
        makeTextLayer('Octagon Initials', letters, centerX - 78, centerY - 46, 156, 92, has3 ? 48 : 62, primary, fontTone)
      );
      break;
    }

    case 'geo-circle-negative': {
      layers.push(
        makeShapeLayer('Solid Disc', 'circle', centerX - 100, centerY - 100, 200, 200, primary, 'none', 0),
        makeShapeLayer('Orbital Ring', 'ring', centerX - 86, centerY - 86, 172, 172, 'transparent', accent, 2.5),
        makeTextLayer('Cutout Initials', letters, centerX - 76, centerY - 46, 152, 92, has3 ? 50 : 64, bg, fontTone)
      );
      break;
    }

    case 'geo-split-pill': {
      layers.push(
        makeShapeLayer('Capsule Badge', 'pill', centerX - 114, centerY - 56, 228, 112, primary, accent, 3.5),
        makeTextLayer('Pill Initials', letters, centerX - 96, centerY - 38, 192, 76, has3 ? 46 : 54, bg, fontTone, {
          letterSpacing: 0.22,
        })
      );
      break;
    }

    case 'geo-diamond-prism': {
      layers.push(
        makeShapeLayer('Outer Diamond', 'diamond', centerX - 108, centerY - 108, 216, 216, 'transparent', primary, 4.5, 12),
        makeShapeLayer('Inner Diamond', 'diamond', centerX - 88, centerY - 88, 176, 176, secondary, accent, 2, 8),
        makeTextLayer('Prism Initials', letters, centerX - 74, centerY - 40, 148, 80, has3 ? 42 : 54, primary, fontTone)
      );
      break;
    }

    case 'geo-stamp-ring':
    default: {
      layers.push(
        makeShapeLayer('Outer Ring', 'ring', centerX - 104, centerY - 104, 208, 208, 'transparent', primary, 6),
        makeShapeLayer('Inner Ring', 'ring', centerX - 88, centerY - 88, 176, 176, 'transparent', accent, 2),
        makeTextLayer('Center Initials', letters, centerX - 74, centerY - 46, 148, 92, has3 ? 48 : 62, primary, fontTone)
      );
      break;
    }
  }

  return layers;
}
