import rawTemplates from '../data/proTemplates.json';
import {
  ColorPalette,
  DividerKind,
  DividerLayer,
  IconLayer,
  LayerGradient,
  LogoDocument,
  LogoLayer,
  ShapeKind,
  ShapeLayer,
  TextEffectConfig,
  TextLayer,
  TextWarpConfig,
} from '../types/logo';
import { nextLayerId, resolveFont } from './logoGenerator';

export const PRO_TEMPLATE_CATEGORIES = [
  'Tech / AI',
  'Luxury Fashion',
  'Gaming / Esports',
  'Cafe / Restaurant',
  'Real Estate',
  'Minimalist Startup',
  'Beauty / Wellness',
] as const;

export type ProTemplateCategory = (typeof PRO_TEMPLATE_CATEGORIES)[number];

export interface JsonTemplateLayerSpec {
  type: 'shape' | 'icon' | 'text' | 'divider';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  shapeKind?: ShapeKind;
  dividerKind?: DividerKind;
  iconId?: string;
  accentFill?: string;
  secondaryFill?: string;
  role?: 'brand' | 'tagline';
  text?: string;
  fontId?: string;
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: 'normal' | 'italic';
  letterSpacing?: number;
  uppercase?: boolean;
  curveRadius?: number;
  fillGradient?: LayerGradient;
  textEffect?: TextEffectConfig;
  textWarp?: TextWarpConfig;
}

export interface ProTemplateSpec {
  id: string;
  category: ProTemplateCategory;
  name: string;
  subtitle: string;
  tags: string[];
  backgroundColor: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
  };
  layers: JsonTemplateLayerSpec[];
}

export const PRO_TEMPLATE_SPECS: ProTemplateSpec[] =
  rawTemplates as unknown as ProTemplateSpec[];

const DEFAULT_SHADOW = {
  enabled: false,
  color: 'rgba(15, 23, 42, 0.2)',
  blur: 10,
  offsetX: 0,
  offsetY: 6,
};

export interface HydrateTemplateOptions {
  /** Optional override to substitute user's current brand name onto main brand text layer */
  customBrandName?: string;
  /** Optional override to substitute user's tagline onto secondary tagline layer (only if flat single tagline) */
  customTagline?: string;
  /** Generate unique IDs for canvas insertion; pass deterministic prefix when rendering static gallery cards */
  deterministicIdPrefix?: string;
}

export function buildDocumentFromTemplate(
  spec: ProTemplateSpec,
  options: HydrateTemplateOptions = {}
): LogoDocument {
  const { customBrandName, customTagline, deterministicIdPrefix } = options;
  const trimmedBrand = customBrandName?.trim();
  const trimmedTagline = customTagline?.trim();

  let brandReplaced = false;
  let taglineReplaced = false;

  const layers: LogoLayer[] = spec.layers.map((item, idx) => {
    const id = deterministicIdPrefix
      ? `${deterministicIdPrefix}-${item.type}-${idx}`
      : nextLayerId(item.type);

    const base = {
      id,
      name: item.name,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      fill: item.fill ?? spec.palette.primary,
      fillGradient: item.fillGradient
        ? {
            ...item.fillGradient,
            stops: item.fillGradient.stops?.map((s) => ({ ...s })),
          }
        : undefined,
      stroke: item.stroke ?? 'none',
      strokeWidth: item.strokeWidth ?? 0,
      shadow: { ...DEFAULT_SHADOW },
    };

    if (item.type === 'shape') {
      const shapeLayer: ShapeLayer = {
        ...base,
        type: 'shape',
        shapeKind: item.shapeKind ?? 'rounded-rect',
        cornerRadius: item.cornerRadius ?? 18,
      };
      return shapeLayer;
    }

    if (item.type === 'icon') {
      const iconLayer: IconLayer = {
        ...base,
        type: 'icon',
        iconId: item.iconId ?? 'geometric-prism',
        accentFill: item.accentFill ?? spec.palette.accent,
        secondaryFill: item.secondaryFill ?? spec.palette.secondary,
      };
      return iconLayer;
    }

    if (item.type === 'divider') {
      const dividerLayer: DividerLayer = {
        ...base,
        type: 'divider',
        dividerKind: item.dividerKind ?? 'solid',
      };
      return dividerLayer;
    }

    const font = resolveFont(item.fontId ?? 'outfit');
    let nextText = item.text ?? spec.name;
    if (trimmedBrand && item.role === 'brand' && !brandReplaced) {
      nextText = trimmedBrand;
      brandReplaced = true;
    } else if (
      trimmedTagline &&
      item.role === 'tagline' &&
      !taglineReplaced &&
      (item.curveRadius ?? 0) === 0 &&
      (item.text?.length ?? 0) > 2
    ) {
      nextText = trimmedTagline;
      taglineReplaced = true;
    }

    const textLayer: TextLayer = {
      ...base,
      type: 'text',
      text: nextText,
      fontFamily: font.cssFamily,
      fontId: font.id,
      fontWeight: item.fontWeight ?? 700,
      fontStyle: item.fontStyle ?? 'normal',
      fontSize: item.fontSize ?? 48,
      letterSpacing: item.letterSpacing ?? 0.04,
      lineHeight: 1.1,
      textAlign: 'center',
      uppercase: item.uppercase ?? false,
      curveRadius: item.curveRadius ?? 0,
      textEffect: item.textEffect ? { ...item.textEffect } : undefined,
      textWarp: item.textWarp ? { ...item.textWarp } : undefined,
    };
    return textLayer;
  });

  return {
    id: deterministicIdPrefix ? `${deterministicIdPrefix}-doc` : nextLayerId('tpldoc'),
    title: trimmedBrand || spec.name,
    width: 800,
    height: 600,
    backgroundColor: spec.backgroundColor,
    transparentBackground: false,
    layers,
  };
}

export function buildPaletteFromTemplate(spec: ProTemplateSpec): ColorPalette {
  return {
    id: `tpl-pal-${spec.id}`,
    name: `${spec.name} Palette`,
    background: spec.backgroundColor,
    primary: spec.palette.primary,
    secondary: spec.palette.secondary,
    accent: spec.palette.accent,
    text: spec.palette.text,
  };
}

export function filterProTemplates(
  query: string,
  category: ProTemplateCategory | 'All'
): ProTemplateSpec[] {
  const q = query.trim().toLowerCase();
  return PRO_TEMPLATE_SPECS.filter((item) => {
    const matchesCat = category === 'All' || item.category === category;
    if (!matchesCat) return false;
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q))
    );
  });
}
