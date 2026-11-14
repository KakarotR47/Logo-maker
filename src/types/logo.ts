export type LogoStylePreset =
  | 'minimalist'
  | 'modern'
  | 'vintage'
  | 'geometric'
  | '3d'
  | 'monogram';

export type LayoutArchetype =
  | 'icon-left'
  | 'stacked'
  | 'badge'
  | 'wordmark'
  | 'monogram-crest'
  | 'split-emblem';

export type IndustryCategory =
  | 'Tech & AI'
  | 'Eco & Sustainability'
  | 'Finance & Legal'
  | 'Retail & Fashion'
  | 'Food & Beverage'
  | 'Architecture & Real Estate'
  | 'Health & Wellness'
  | 'Creative & Media';

export interface BrandBrief {
  businessName: string;
  tagline: string;
  audience: string;
  industry: IndustryCategory;
  style: LogoStylePreset;
  styleTags?: string[];
  symbolIdea: string;
  paletteId: string;
  primaryFontId: string;
  secondaryFontId: string;
}

export interface ColorPalette {
  id: string;
  name: string;
  background: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
}

export interface FontOption {
  id: string;
  name: string;
  cssFamily: string;
  category:
    | 'Geometric Sans'
    | 'Modern Sans'
    | 'Condensed'
    | 'Editorial Serif'
    | 'Display'
    | 'Script'
    | 'Monospace';
  weights: number[];
  /** Direct raw TTF URL (used by opentype.js for real text-to-path outlining) */
  ttfUrl: string;
}

export interface FontPairing {
  id: string;
  name: string;
  note: string;
  primaryFontId: string;
  secondaryFontId: string;
  styleMatch: LogoStylePreset[];
}

export interface VectorPathPrimitive {
  d: string;
  role: 'primary' | 'accent' | 'secondary' | 'cutout';
  fillRule?: 'nonzero' | 'evenodd';
  strokeOnly?: boolean;
  strokeWidth?: number;
}

export interface VectorIconDef {
  id: string;
  name: string;
  category: 'Tech & Circuit' | 'Nature & Eco' | 'Geometric' | 'Emblems & Heraldry' | 'Commerce & Craft' | 'Architecture';
  keywords: string[];
  viewBox: string;
  paths: VectorPathPrimitive[];
}

export type ShapeKind =
  | 'circle'
  | 'ring'
  | 'rounded-rect'
  | 'hexagon'
  | 'octagon'
  | 'shield'
  | 'diamond'
  | 'triangle'
  | 'star'
  | 'arch'
  | 'pill'
  | 'frame'
  | 'seal-scalloped'
  | 'crest-double'
  | 'ribbon-banner'
  | 'parallelogram';

export type DividerKind =
  | 'solid'
  | 'double'
  | 'diamond-center'
  | 'tapered'
  | 'bracket'
  | 'dotted';

export interface LayerShadow {
  enabled: boolean;
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface LayerGradient {
  enabled: boolean;
  type: 'linear' | 'radial';
  angle: number;
  startColor: string;
  endColor: string;
  midColor?: string;
}

export interface LayerBase {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  fill: string;
  fillGradient?: LayerGradient;
  stroke: string;
  strokeWidth: number;
  shadow: LayerShadow;
}

export interface IconLayer extends LayerBase {
  type: 'icon';
  iconId: string;
  secondaryFill: string;
  accentFill: string;
  /** Optional per-path color overrides indexed by path order */
  partColors?: string[];
}

export interface ShapeLayer extends LayerBase {
  type: 'shape';
  shapeKind: ShapeKind;
  cornerRadius: number;
}

export interface DividerLayer extends LayerBase {
  type: 'divider';
  dividerKind: DividerKind;
}

export interface TextLayer extends LayerBase {
  type: 'text';
  text: string;
  fontFamily: string;
  fontId: string;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  fontSize: number;
  letterSpacing: number;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right';
  uppercase: boolean;
  /** 0 = flat straight text; +20..+240 = convex upward arch; -20..-240 = concave smile arc */
  curveRadius: number;
}

export interface PathLayer extends LayerBase {
  type: 'path';
  /** SVG path data strings relative to sourceViewBox */
  pathDataList: string[];
  sourceViewBox: { width: number; height: number };
  sourceText?: string;
}

export interface CustomSvgPart {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  label?: string;
}

export interface CustomSvgLayer extends LayerBase {
  type: 'custom-svg';
  /** Sanitized vector paths extracted from uploaded or Iconify SVG */
  paths: CustomSvgPart[];
  viewBox: string;
  preserveOriginalColors: boolean;
}

export type LogoLayer =
  | IconLayer
  | ShapeLayer
  | DividerLayer
  | TextLayer
  | PathLayer
  | CustomSvgLayer;

export interface LogoDocument {
  id: string;
  title: string;
  width: number;
  height: number;
  backgroundColor: string;
  transparentBackground: boolean;
  layers: LogoLayer[];
}

export interface LogoConcept {
  id: string;
  title: string;
  archetype: LayoutArchetype;
  style: LogoStylePreset;
  rationale: string;
  document: LogoDocument;
}

export interface SavedBrandKit {
  id: string;
  name: string;
  savedAt: string;
  brief: BrandBrief;
  palette: ColorPalette;
  primaryDocument: LogoDocument;
  markOnlyDocument: LogoDocument;
  wordmarkDocument: LogoDocument;
}

export interface LogoProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  brief: BrandBrief;
  document: LogoDocument;
}

export type StudioViewMode =
  | 'concepts'
  | 'editor'
  | 'mockups'
  | 'brandkit'
  | 'projects'
  | 'cards';
