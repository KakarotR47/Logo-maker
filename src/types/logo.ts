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

export interface GradientStop {
  id: string;
  offset: number; // 0..100
  color: string;
}

export interface LayerGradient {
  enabled: boolean;
  type: 'linear' | 'radial';
  angle: number;
  startColor: string;
  endColor: string;
  midColor?: string;
  stops?: GradientStop[];
  radialCx?: number; // 0..100
  radialCy?: number; // 0..100
  radialR?: number; // 15..120
}

export type PatternPresetKind =
  | 'diagonal-stripes'
  | 'halftone-dots'
  | 'grid-mesh'
  | 'chevron-wave'
  | 'crosshatch'
  | 'terrazzo-geo'
  | 'concentric-rings';

export interface LayerPatternFill {
  enabled: boolean;
  preset: PatternPresetKind;
  foregroundColor: string;
  backgroundColor: string;
  scale: number; // 0.4..2.5
  rotation: number; // 0..360
}

export type ClipMaskShapeKind =
  | 'circle'
  | 'rounded-rect'
  | 'pill'
  | 'hexagon'
  | 'octagon'
  | 'shield'
  | 'diamond'
  | 'triangle'
  | 'star'
  | 'arch'
  | 'custom';

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-burn'
  | 'difference';

export type SurfaceTexturePreset =
  | 'none'
  | 'vintage-grit'
  | 'halftone-dots'
  | 'brushed-metal'
  | 'paper-grain';

export interface SurfaceTextureConfig {
  enabled: boolean;
  preset: SurfaceTexturePreset;
  /** 0.1..1.0 strength */
  intensity: number;
  /** 0.4..2.5 scale factor */
  scale: number;
  /** 0..180 pattern angle in degrees */
  angle?: number;
  /** Deterministic seed for grit / grain */
  seed?: number;
  /** 'distress' punches alpha texture holes through artwork; 'overlay' applies sheen/grain over artwork; 'canvas' applies texture over full artboard */
  mode?: 'distress' | 'overlay' | 'canvas';
  /** Inverts the distress texture mask */
  inverted?: boolean;
}

export interface LayerClipMask {
  enabled: boolean;
  shape: ClipMaskShapeKind;
  cornerRadius?: number;
  scale?: number; // 0.35..1.25
  /** When true, punches the clip shape out as a transparent hole inside the layer */
  inverted?: boolean;
  customPaths?: string[];
  customViewBox?: { width: number; height: number };
}

export interface LayerBase {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  flipX?: boolean;
  flipY?: boolean;
  opacity: number;
  blendMode?: BlendMode;
  /** Non-destructive knockout: punches a transparent hole through the layer underneath */
  isKnockout?: boolean;
  /** Optional explicit layer ID underneath to punch through */
  knockoutTargetId?: string;
  visible: boolean;
  locked: boolean;
  groupId?: string;
  fill: string;
  fillGradient?: LayerGradient;
  fillPattern?: LayerPatternFill;
  clipMask?: LayerClipMask;
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

export type TextEffectStyleKind =
  | 'none'
  | 'hollow'
  | 'splice'
  | 'neon'
  | 'extrude'
  | 'glitch'
  | 'foil';

export interface TextEffectConfig {
  style: TextEffectStyleKind;
  intensity?: number; // 0.3..2.0
  primaryColor?: string;
  secondaryColor?: string;
  offset?: number; // px offset for splice / extrude / glitch
  angle?: number; // 0..360 deg direction for splice / extrude
}

export type TextWarpMode =
  | 'none'
  | 'arc-up'
  | 'arc-down'
  | 'circle'
  | 'wave'
  | 'slant';

export interface TextWarpConfig {
  mode: TextWarpMode;
  strength: number; // 0..100 bend/wave depth
  slant: number; // -35..35 deg horizontal slant
  perspective?: number; // -30..30 deg vertical tilt / perspective skew
}

export interface TextPathAttachment {
  mode: 'preset-circle' | 'preset-wave' | 'layer';
  /** Target canvas layer ID when mode === 'layer' (shape, ring, or Pen Bezier path) */
  targetLayerId?: string;
  /** Cached artboard-space SVG path d for export and detached fallback */
  customPathD?: string;
  /** 0..100 percentage position along the path */
  startOffset: number;
  /** Flip text onto the opposite side / direction of the path */
  flipSide: boolean;
  /** -60..60 px perpendicular baseline shift from the curve */
  baselineShift: number;
}

export interface PerLetterTransform {
  /** Independent glyph scale multiplier (default 1) */
  scale?: number;
  /** Independent glyph rotation in degrees */
  rotation?: number;
  /** Independent vertical baseline shift in px */
  baselineShift?: number;
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
  textEffect?: TextEffectConfig;
  textWarp?: TextWarpConfig;
  /** Phase 20: Custom path attachment (circle, wave, or Pen-tool Bezier path) */
  textPath?: TextPathAttachment;
  /** Phase 20: Per-gap kerning overrides in px indexed by left character index */
  letterKerning?: Record<number, number>;
  /** Phase 20: Per-letter independent scale/rotation/baseline shifts indexed by character index */
  letterTransforms?: Record<number, PerLetterTransform>;
}

export interface PathLayer extends LayerBase {
  type: 'path';
  /** SVG path data strings relative to sourceViewBox */
  pathDataList: string[];
  sourceViewBox: { width: number; height: number };
  fillRule?: 'nonzero' | 'evenodd';
  sourceText?: string;
  /** True for open Pen-tool Bezier curves rendered with stroke only */
  isOpenPath?: boolean;
}

export interface CustomSvgPart {
  d: string;
  fill?: string;
  fillRule?: 'nonzero' | 'evenodd';
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

export interface LayerGroup {
  id: string;
  name: string;
  collapsed?: boolean;
}

export interface LogoDocument {
  id: string;
  title: string;
  width: number;
  height: number;
  backgroundColor: string;
  transparentBackground: boolean;
  backgroundLocked?: boolean;
  surfaceTexture?: SurfaceTextureConfig;
  groups?: LayerGroup[];
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
  | 'landing'
  | 'concepts'
  | 'editor'
  | 'mockups'
  | 'brandkit'
  | 'projects'
  | 'cards'
  | 'client-preview';
