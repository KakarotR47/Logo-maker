import {
  COLOR_PALETTES,
  FONT_OPTIONS,
  FONT_PAIRINGS,
  VECTOR_ICONS,
} from '../data/logoLibrary';
import {
  BrandBrief,
  ColorPalette,
  DividerLayer,
  FontOption,
  IconLayer,
  LayoutArchetype,
  LogoConcept,
  LogoDocument,
  LogoLayer,
  LogoStylePreset,
  ShapeLayer,
  TextLayer,
} from '../types/logo';

let idCounter = 1;
export function nextLayerId(prefix = 'layer'): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

export function getInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'FM';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function pickMatchingIcons(brief: BrandBrief): string[] {
  const query = `${brief.symbolIdea} ${brief.industry} ${brief.businessName}`.toLowerCase();
  const tokens = query.split(/[^a-z0-9]+/).filter((t) => t.length >= 2);

  const scored = VECTOR_ICONS.map((icon) => {
    let score = 0;
    for (const token of tokens) {
      if (icon.name.toLowerCase().includes(token)) score += 6;
      for (const kw of icon.keywords) {
        if (kw === token) score += 8;
        else if (kw.includes(token) || token.includes(kw)) score += 3;
      }
    }
    if (brief.industry === 'Eco & Sustainability' && icon.category === 'Nature & Eco') score += 3;
    if (brief.industry === 'Tech & AI' && icon.category === 'Tech & Circuit') score += 3;
    if (brief.industry === 'Architecture & Real Estate' && icon.category === 'Architecture') score += 4;
    if (brief.industry === 'Finance & Legal' && icon.category === 'Emblems & Heraldry') score += 3;
    if (brief.industry === 'Creative & Media' && icon.category === 'Commerce & Craft') score += 3;
    return { id: icon.id, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.id);
}

export function resolvePalette(paletteId: string): ColorPalette {
  return COLOR_PALETTES.find((p) => p.id === paletteId) ?? COLOR_PALETTES[0];
}

export function resolveFont(fontId: string): FontOption {
  return FONT_OPTIONS.find((f) => f.id === fontId) ?? FONT_OPTIONS[0];
}

export function resolveFontsForStyle(
  style: LogoStylePreset,
  explicitPrimaryId?: string,
  explicitSecondaryId?: string
): { primary: FontOption; secondary: FontOption } {
  const pairing = FONT_PAIRINGS.find((fp) => fp.styleMatch.includes(style)) ?? FONT_PAIRINGS[0];
  const primary = resolveFont(explicitPrimaryId || pairing.primaryFontId);
  const secondary = resolveFont(explicitSecondaryId || pairing.secondaryFontId);
  return { primary, secondary };
}

function baseShadow() {
  return {
    enabled: false,
    color: 'rgba(17, 24, 39, 0.18)',
    blur: 10,
    offsetX: 0,
    offsetY: 6,
  };
}

function makeTextLayer(
  overrides: Partial<TextLayer> & Pick<TextLayer, 'text' | 'x' | 'y' | 'width' | 'height'>
): TextLayer {
  const defaultFont = FONT_OPTIONS[0];
  return {
    id: nextLayerId('txt'),
    name: overrides.name ?? 'Text',
    type: 'text',
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: '#1D1E2C',
    stroke: 'none',
    strokeWidth: 0,
    shadow: baseShadow(),
    fontFamily: defaultFont.cssFamily,
    fontId: defaultFont.id,
    fontWeight: 700,
    fontStyle: 'normal',
    fontSize: 54,
    letterSpacing: 0.04,
    lineHeight: 1.1,
    textAlign: 'center',
    uppercase: false,
    curveRadius: 0,
    ...overrides,
  };
}

function makeIconLayer(
  overrides: Partial<IconLayer> & Pick<IconLayer, 'iconId' | 'x' | 'y' | 'width' | 'height'>
): IconLayer {
  return {
    id: nextLayerId('ico'),
    name: overrides.name ?? 'Symbol Mark',
    type: 'icon',
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: '#1B4332',
    secondaryFill: '#D8CCB4',
    accentFill: '#2D6A4F',
    stroke: 'none',
    strokeWidth: 0,
    shadow: baseShadow(),
    ...overrides,
  };
}

function makeShapeLayer(
  overrides: Partial<ShapeLayer> & Pick<ShapeLayer, 'shapeKind' | 'x' | 'y' | 'width' | 'height'>
): ShapeLayer {
  return {
    id: nextLayerId('shp'),
    name: overrides.name ?? 'Shape',
    type: 'shape',
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: '#1B4332',
    stroke: 'none',
    strokeWidth: 0,
    cornerRadius: 18,
    shadow: baseShadow(),
    ...overrides,
  };
}

function makeDividerLayer(
  overrides: Partial<DividerLayer> & Pick<DividerLayer, 'dividerKind' | 'x' | 'y' | 'width' | 'height'>
): DividerLayer {
  return {
    id: nextLayerId('div'),
    name: overrides.name ?? 'Divider',
    type: 'divider',
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: '#2D6A4F',
    stroke: 'none',
    strokeWidth: 0,
    shadow: baseShadow(),
    ...overrides,
  };
}

export interface ArchetypeBuildOptions {
  styleOverride?: LogoStylePreset;
  iconOverride?: string;
  primaryFontOverride?: string;
  secondaryFontOverride?: string;
  containerShapeOverride?: ShapeLayer['shapeKind'];
  gradientTitle?: boolean;
}

export function buildDocumentForArchetype(
  brief: BrandBrief,
  archetype: LayoutArchetype,
  styleOverride?: LogoStylePreset,
  iconOverride?: string,
  options?: ArchetypeBuildOptions
): LogoDocument {
  const effectiveStyleOverride = options?.styleOverride ?? styleOverride;
  const style = effectiveStyleOverride ?? brief.style;
  const palette = resolvePalette(brief.paletteId);
  const matchedIcons = pickMatchingIcons(brief);
  const iconId = options?.iconOverride ?? iconOverride ?? matchedIcons[0] ?? 'leaf-circuit';
  const { primary, secondary } = resolveFontsForStyle(
    style,
    options?.primaryFontOverride ?? (effectiveStyleOverride ? undefined : brief.primaryFontId),
    options?.secondaryFontOverride ?? (effectiveStyleOverride ? undefined : brief.secondaryFontId)
  );

  const nameClean = brief.businessName.trim() || 'Verdant Circuit';
  const taglineClean = brief.tagline.trim() || 'Intelligent Brand Systems';
  const initials = getInitials(nameClean);
  const isVintage = style === 'vintage';
  const is3d = style === '3d';
  const isMinimal = style === 'minimalist';
  const useGradient = Boolean(options?.gradientTitle);
  const titleGradient = useGradient
    ? {
        enabled: true,
        type: 'linear' as const,
        angle: 120,
        startColor: palette.primary,
        endColor: palette.accent,
      }
    : undefined;

  const shadowFor3d = is3d
    ? {
        enabled: true,
        color: 'rgba(15, 23, 42, 0.22)',
        blur: 14,
        offsetX: 0,
        offsetY: 10,
      }
    : baseShadow();

  const layers: LogoLayer[] = [];

  if (archetype === 'icon-left') {
    if (!isMinimal) {
      layers.push(
        makeShapeLayer({
          name: 'Icon Container',
          shapeKind:
            options?.containerShapeOverride ??
            (style === 'geometric' ? 'hexagon' : 'rounded-rect'),
          x: 118,
          y: 230,
          width: 140,
          height: 140,
          fill: style === 'geometric' ? palette.secondary : palette.primary,
          stroke: style === 'geometric' ? palette.primary : 'none',
          strokeWidth: style === 'geometric' ? 4 : 0,
          cornerRadius: 28,
          shadow: shadowFor3d,
        })
      );
    }

    layers.push(
      makeIconLayer({
        name: 'Primary Symbol',
        iconId,
        x: isMinimal ? 124 : 143,
        y: isMinimal ? 240 : 255,
        width: isMinimal ? 120 : 90,
        height: isMinimal ? 120 : 90,
        fill: isMinimal || style === 'geometric' ? palette.primary : palette.background,
        accentFill: palette.accent,
        secondaryFill: palette.secondary,
        shadow: isMinimal ? baseShadow() : shadowFor3d,
      })
    );

    layers.push(
      makeTextLayer({
        name: 'Brand Wordmark',
        text: nameClean,
        x: 286,
        y: 244,
        width: 410,
        height: 68,
        fontFamily: primary.cssFamily,
        fontId: primary.id,
        fontWeight: 700,
        fontSize: nameClean.length > 15 ? 42 : 52,
        letterSpacing: isVintage ? 0.08 : 0.02,
        uppercase: isVintage || style === 'modern',
        textAlign: 'left',
        fill: palette.text,
        fillGradient: titleGradient,
      })
    );

    if (taglineClean) {
      layers.push(
        makeDividerLayer({
          name: 'Accent Rule',
          dividerKind: isVintage ? 'diamond-center' : 'solid',
          x: 288,
          y: 318,
          width: 120,
          height: 12,
          fill: palette.accent,
        })
      );

      layers.push(
        makeTextLayer({
          name: 'Brand Tagline',
          text: taglineClean,
          x: 288,
          y: 334,
          width: 400,
          height: 36,
          fontFamily: secondary.cssFamily,
          fontId: secondary.id,
          fontWeight: 500,
          fontSize: 17,
          letterSpacing: 0.14,
          uppercase: true,
          textAlign: 'left',
          fill: palette.accent,
        })
      );
    }
  } else if (archetype === 'stacked') {
    if (style === 'geometric' || is3d || options?.containerShapeOverride) {
      layers.push(
        makeShapeLayer({
          name: 'Backdrop Geometry',
          shapeKind:
            options?.containerShapeOverride ?? (is3d ? 'hexagon' : 'circle'),
          x: 325,
          y: 122,
          width: 150,
          height: 150,
          fill: palette.secondary,
          stroke: palette.primary,
          strokeWidth: 4,
          shadow: shadowFor3d,
        })
      );
    }

    layers.push(
      makeIconLayer({
        name: 'Primary Symbol',
        iconId,
        x: 340,
        y: 137,
        width: 120,
        height: 120,
        fill: palette.primary,
        accentFill: palette.accent,
        secondaryFill: palette.secondary,
        shadow: shadowFor3d,
      })
    );

    layers.push(
      makeTextLayer({
        name: 'Brand Wordmark',
        text: nameClean,
        x: 130,
        y: 300,
        width: 540,
        height: 70,
        fontFamily: primary.cssFamily,
        fontId: primary.id,
        fontWeight: 800,
        fontSize: nameClean.length > 16 ? 44 : 54,
        letterSpacing: isMinimal ? 0.1 : 0.04,
        uppercase: isMinimal || style === 'geometric',
        textAlign: 'center',
        fill: palette.text,
        fillGradient: titleGradient,
      })
    );

    if (taglineClean) {
      layers.push(
        makeDividerLayer({
          name: 'Center Divider',
          dividerKind: isVintage ? 'diamond-center' : 'tapered',
          x: 280,
          y: 374,
          width: 240,
          height: 14,
          fill: palette.accent,
        })
      );

      layers.push(
        makeTextLayer({
          name: 'Brand Tagline',
          text: taglineClean,
          x: 160,
          y: 396,
          width: 480,
          height: 36,
          fontFamily: secondary.cssFamily,
          fontId: secondary.id,
          fontWeight: 600,
          fontSize: 16,
          letterSpacing: 0.16,
          uppercase: true,
          textAlign: 'center',
          fill: palette.accent,
        })
      );
    }
  } else if (archetype === 'badge') {
    const badgeShape =
      options?.containerShapeOverride ?? (isVintage ? 'ring' : 'shield');
    const isRingBadge = badgeShape === 'ring';

    layers.push(
      makeShapeLayer({
        name: 'Outer Emblem Ring',
        shapeKind: badgeShape,
        x: 240,
        y: 140,
        width: 320,
        height: 320,
        fill: isRingBadge ? 'transparent' : palette.primary,
        stroke: palette.primary,
        strokeWidth: isRingBadge ? 8 : 0,
        shadow: shadowFor3d,
      })
    );

    if (isRingBadge) {
      layers.push(
        makeShapeLayer({
          name: 'Inner Ring',
          shapeKind: 'ring',
          x: 258,
          y: 158,
          width: 284,
          height: 284,
          fill: 'transparent',
          stroke: palette.accent,
          strokeWidth: 2.5,
        })
      );
    }

    layers.push(
      makeIconLayer({
        name: 'Badge Mark',
        iconId,
        x: 345,
        y: 204,
        width: 110,
        height: 110,
        fill: isRingBadge ? palette.primary : palette.background,
        accentFill: palette.secondary,
        secondaryFill: palette.accent,
      })
    );

    layers.push(
      makeTextLayer({
        name: 'Curved Badge Title',
        text: nameClean,
        x: 205,
        y: isRingBadge ? 168 : 322,
        width: 390,
        height: 76,
        fontFamily: primary.cssFamily,
        fontId: primary.id,
        fontWeight: 700,
        fontSize: nameClean.length > 14 ? 26 : 32,
        letterSpacing: 0.12,
        uppercase: true,
        textAlign: 'center',
        fill: isRingBadge ? palette.text : palette.background,
        curveRadius: isRingBadge ? 128 : 0,
      })
    );

    if (taglineClean) {
      layers.push(
        makeTextLayer({
          name: 'Badge Subtext',
          text: taglineClean,
          x: 230,
          y: isRingBadge ? 344 : 386,
          width: 340,
          height: 44,
          fontFamily: secondary.cssFamily,
          fontId: secondary.id,
          fontWeight: 600,
          fontSize: 13,
          letterSpacing: 0.18,
          uppercase: true,
          textAlign: 'center',
          fill: isRingBadge ? palette.accent : palette.secondary,
          curveRadius: isRingBadge ? -118 : 0,
        })
      );
    }
  } else if (archetype === 'wordmark') {
    layers.push(
      makeTextLayer({
        name: 'Primary Wordmark',
        text: nameClean,
        x: 110,
        y: 238,
        width: 580,
        height: 82,
        fontFamily: primary.cssFamily,
        fontId: primary.id,
        fontWeight: 800,
        fontSize: nameClean.length > 16 ? 50 : 64,
        letterSpacing: isMinimal ? 0.12 : -0.01,
        uppercase: isMinimal || style === 'vintage',
        textAlign: 'center',
        fill: palette.text,
        fillGradient: titleGradient,
      })
    );

    layers.push(
      makeDividerLayer({
        name: 'Signature Underline',
        dividerKind: isVintage ? 'diamond-center' : 'double',
        x: 210,
        y: 332,
        width: 380,
        height: 14,
        fill: palette.primary,
      })
    );

    if (taglineClean) {
      layers.push(
        makeTextLayer({
          name: 'Wordmark Subtitle',
          text: taglineClean,
          x: 160,
          y: 356,
          width: 480,
          height: 36,
          fontFamily: secondary.cssFamily,
          fontId: secondary.id,
          fontWeight: 500,
          fontSize: 16,
          letterSpacing: 0.22,
          uppercase: true,
          textAlign: 'center',
          fill: palette.accent,
        })
      );
    }
  } else if (archetype === 'monogram-crest') {
    layers.push(
      makeShapeLayer({
        name: 'Monogram Crest Frame',
        shapeKind:
          options?.containerShapeOverride ??
          (style === 'geometric' ? 'octagon' : 'circle'),
        x: 310,
        y: 120,
        width: 180,
        height: 180,
        fill: palette.primary,
        stroke: palette.accent,
        strokeWidth: 4,
        shadow: shadowFor3d,
      })
    );

    layers.push(
      makeTextLayer({
        name: 'Monogram Initials',
        text: initials,
        x: 325,
        y: 168,
        width: 150,
        height: 86,
        fontFamily: primary.cssFamily,
        fontId: primary.id,
        fontWeight: 800,
        fontSize: 72,
        letterSpacing: 0.06,
        uppercase: true,
        textAlign: 'center',
        fill: palette.background,
      })
    );

    layers.push(
      makeTextLayer({
        name: 'Full Brand Name',
        text: nameClean,
        x: 130,
        y: 326,
        width: 540,
        height: 62,
        fontFamily: primary.cssFamily,
        fontId: primary.id,
        fontWeight: 700,
        fontSize: 44,
        letterSpacing: 0.08,
        uppercase: true,
        textAlign: 'center',
        fill: palette.text,
        fillGradient: titleGradient,
      })
    );

    if (taglineClean) {
      layers.push(
        makeTextLayer({
          name: 'Crest Tagline',
          text: taglineClean,
          x: 170,
          y: 392,
          width: 460,
          height: 34,
          fontFamily: secondary.cssFamily,
          fontId: secondary.id,
          fontWeight: 500,
          fontSize: 15,
          letterSpacing: 0.16,
          uppercase: true,
          textAlign: 'center',
          fill: palette.accent,
        })
      );
    }
  } else {
    // split-emblem: Arch / Geometric frame enclosing clean vector symbol + stacked type
    layers.push(
      makeShapeLayer({
        name: 'Architectural Frame',
        shapeKind: options?.containerShapeOverride ?? 'frame',
        x: 170,
        y: 125,
        width: 460,
        height: 350,
        fill: 'transparent',
        stroke: palette.primary,
        strokeWidth: 4,
      })
    );

    layers.push(
      makeIconLayer({
        name: 'Hero Emblem',
        iconId,
        x: 346,
        y: 158,
        width: 108,
        height: 108,
        fill: palette.primary,
        accentFill: palette.accent,
        secondaryFill: palette.secondary,
      })
    );

    layers.push(
      makeDividerLayer({
        name: 'Emblem Rule',
        dividerKind: 'diamond-center',
        x: 260,
        y: 284,
        width: 280,
        height: 16,
        fill: palette.accent,
      })
    );

    layers.push(
      makeTextLayer({
        name: 'Brand Title',
        text: nameClean,
        x: 195,
        y: 312,
        width: 410,
        height: 62,
        fontFamily: primary.cssFamily,
        fontId: primary.id,
        fontWeight: 700,
        fontSize: nameClean.length > 16 ? 38 : 44,
        letterSpacing: 0.05,
        uppercase: true,
        textAlign: 'center',
        fill: palette.text,
        fillGradient: titleGradient,
      })
    );

    if (taglineClean) {
      layers.push(
        makeTextLayer({
          name: 'Brand Tagline',
          text: taglineClean,
          x: 210,
          y: 382,
          width: 380,
          height: 34,
          fontFamily: secondary.cssFamily,
          fontId: secondary.id,
          fontWeight: 500,
          fontSize: 14,
          letterSpacing: 0.16,
          uppercase: true,
          textAlign: 'center',
          fill: palette.accent,
        })
      );
    }
  }

  return {
    id: nextLayerId('doc'),
    title: `${nameClean} — ${archetype}`,
    width: 800,
    height: 600,
    backgroundColor: palette.background,
    transparentBackground: false,
    layers,
  };
}

/**
 * Generates 12 distinct editable flat-vector logo concepts across all core layout templates:
 * icon-top (stacked), icon-left, emblem/badge, monogram, and wordmark.
 */
export function generateTwelveLogoConcepts(brief: BrandBrief): LogoConcept[] {
  const matchedIcons = pickMatchingIcons(brief);
  const iconA = matchedIcons[0] ?? 'leaf-circuit';
  const iconB = matchedIcons[1] ?? iconA;
  const iconC = matchedIcons[2] ?? iconA;
  const iconD = matchedIcons[3] ?? iconB;
  const tagsLabel = brief.styleTags?.length
    ? brief.styleTags.slice(0, 2).join(' + ')
    : brief.style;

  const specs: Array<{
    title: string;
    archetype: LayoutArchetype;
    style: LogoStylePreset;
    iconId: string;
    rationale: string;
    options?: ArchetypeBuildOptions;
  }> = [
    {
      title: '01. Classic Icon-Left Lockup',
      archetype: 'icon-left',
      style: brief.style,
      iconId: iconA,
      rationale: `Balanced horizontal lockup tuned to "${tagsLabel}" with crisp left-aligned wordmark hierarchy.`,
      options: { containerShapeOverride: 'rounded-rect' },
    },
    {
      title: '02. Minimalist Icon-Left',
      archetype: 'icon-left',
      style: 'minimalist',
      iconId: iconB,
      rationale: 'Clean frameless vector mark paired with modern geometric tracking for headers and product UI.',
      options: { primaryFontOverride: brief.primaryFontId, secondaryFontOverride: brief.secondaryFontId },
    },
    {
      title: '03. Hexagonal Icon-Left',
      archetype: 'icon-left',
      style: 'geometric',
      iconId: iconC,
      rationale: 'Structured hexagonal badge tile with bold uppercase display type and gradient title treatment.',
      options: { containerShapeOverride: 'hexagon', gradientTitle: true },
    },
    {
      title: '04. Centered Icon-Top Totem',
      archetype: 'stacked',
      style: brief.style,
      iconId: iconA,
      rationale: 'Symmetrical icon-top stack engineered to scale crisply from 16px favicons up to signage.',
      options: { primaryFontOverride: brief.primaryFontId, secondaryFontOverride: brief.secondaryFontId },
    },
    {
      title: '05. Geometric Halo Icon-Top',
      archetype: 'stacked',
      style: 'geometric',
      iconId: iconB,
      rationale: 'Circular framed mark above bold centered wordmark and tapered horizontal rule.',
      options: { containerShapeOverride: 'circle', primaryFontOverride: 'sora', secondaryFontOverride: 'josefin-sans' },
    },
    {
      title: '06. Isometric 3D Icon-Top',
      archetype: 'stacked',
      style: '3d',
      iconId: iconD,
      rationale: 'Elevated hexagonal backdrop with soft depth shadow and high-impact modern display face.',
      options: { containerShapeOverride: 'hexagon', gradientTitle: true },
    },
    {
      title: '07. Curved Seal Emblem',
      archetype: 'badge',
      style: 'vintage',
      iconId: iconA,
      rationale: 'Double-ring circular seal wrapping curved arc typography around your core vector mark.',
      options: { containerShapeOverride: 'ring', primaryFontOverride: 'cinzel', secondaryFontOverride: 'montserrat' },
    },
    {
      title: '08. Sovereign Shield Badge',
      archetype: 'badge',
      style: 'modern',
      iconId: iconB,
      rationale: 'Solid heraldic shield enclosure with reversed-out vector symbol for apparel and stamps.',
      options: { containerShapeOverride: 'shield', primaryFontOverride: 'outfit', secondaryFontOverride: 'plus-jakarta' },
    },
    {
      title: '09. Architectural Framed Seal',
      archetype: 'split-emblem',
      style: brief.style === '3d' ? '3d' : 'modern',
      iconId: iconC,
      rationale: 'Double-rule framed badge combining symbol, diamond divider, and editorial title.',
      options: { containerShapeOverride: 'frame', primaryFontOverride: 'playfair', secondaryFontOverride: 'dm-sans' },
    },
    {
      title: '10. Circular Monogram Crest',
      archetype: 'monogram-crest',
      style: 'monogram',
      iconId: iconA,
      rationale: `High-contrast "${getInitials(brief.businessName)}" circular seal paired with full brand lockup.`,
      options: { containerShapeOverride: 'circle', primaryFontOverride: 'cinzel', secondaryFontOverride: 'manrope' },
    },
    {
      title: '11. Octagon Monogram Stamp',
      archetype: 'monogram-crest',
      style: 'geometric',
      iconId: iconB,
      rationale: `Octagonal "${getInitials(brief.businessName)}" emblem built for app icons, social avatars, and packaging.`,
      options: { containerShapeOverride: 'octagon', primaryFontOverride: 'syne', secondaryFontOverride: 'dm-sans', gradientTitle: true },
    },
    {
      title: '12. Editorial Signature Wordmark',
      archetype: 'wordmark',
      style: 'minimalist',
      iconId: iconA,
      rationale: 'Pure typographic centerpiece with custom tracking, double rule line, and refined subtitle.',
      options: { primaryFontOverride: 'bodoni', secondaryFontOverride: 'dm-sans', gradientTitle: true },
    },
  ];

  return specs.map((spec, idx) => ({
    id: `concept-${idx + 1}`,
    title: spec.title,
    archetype: spec.archetype,
    style: spec.style,
    rationale: spec.rationale,
    document: buildDocumentForArchetype(
      brief,
      spec.archetype,
      spec.style,
      spec.iconId,
      spec.options
    ),
  }));
}

export function generateSixBrandConcepts(brief: BrandBrief): LogoConcept[] {
  return generateTwelveLogoConcepts(brief).slice(0, 6);
}

export interface BrandVariations {
  primaryDocument: LogoDocument;
  darkModeDocument: LogoDocument;
  monochromeDocument: LogoDocument;
  monochromeReversedDocument: LogoDocument;
  markOnlyDocument: LogoDocument;
  wordmarkDocument: LogoDocument;
}

function getHexLuminance(color: string): number {
  const clean = color.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(clean)) return 0.2;
  const full =
    clean.length === 3
      ? `${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`
      : clean;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function cloneLayersWithFreshIds(layers: LogoLayer[]): LogoLayer[] {
  return layers.map((l) => {
    const base = {
      ...l,
      id: nextLayerId(l.type),
      shadow: { ...l.shadow },
      fillGradient: l.fillGradient ? { ...l.fillGradient } : undefined,
    };
    if (base.type === 'icon' && l.type === 'icon') {
      return { ...base, partColors: l.partColors ? [...l.partColors] : undefined };
    }
    if (base.type === 'custom-svg' && l.type === 'custom-svg') {
      return { ...base, paths: l.paths.map((p) => ({ ...p })) };
    }
    return base;
  });
}

function buildMonochromeDoc(
  doc: LogoDocument,
  fgHex: string,
  bgHex: string,
  label: string
): LogoDocument {
  const layers = cloneLayersWithFreshIds(doc.layers).map((l): LogoLayer => {
    const nextFill = l.fill === 'transparent' ? 'transparent' : fgHex;
    const nextStroke = l.stroke === 'none' ? 'none' : fgHex;

    if (l.type === 'icon') {
      return {
        ...l,
        fill: fgHex,
        accentFill: fgHex,
        secondaryFill: fgHex,
        partColors: l.partColors?.map(() => fgHex),
        fillGradient: undefined,
        stroke: nextStroke,
      };
    }

    if (l.type === 'custom-svg') {
      return {
        ...l,
        fill: fgHex,
        fillGradient: undefined,
        stroke: nextStroke,
        preserveOriginalColors: false,
        paths: l.paths.map((p) => ({
          ...p,
          fill: p.fill === 'none' ? 'none' : fgHex,
          stroke: p.stroke && p.stroke !== 'none' ? fgHex : p.stroke,
        })),
      };
    }

    if (l.type === 'shape') {
      const isHollow = l.fill === 'transparent' || l.shapeKind === 'ring' || l.shapeKind === 'frame';
      return {
        ...l,
        fill: isHollow ? 'transparent' : fgHex,
        stroke: isHollow || l.strokeWidth > 0 ? fgHex : 'none',
        strokeWidth: isHollow ? Math.max(3, l.strokeWidth) : l.strokeWidth,
        fillGradient: undefined,
      };
    }

    return {
      ...l,
      fill: nextFill,
      stroke: nextStroke,
      fillGradient: undefined,
    };
  });

  return {
    ...doc,
    id: nextLayerId('doc'),
    title: `${doc.title} (${label})`,
    backgroundColor: bgHex,
    transparentBackground: false,
    layers,
  };
}

function buildDarkModeDoc(doc: LogoDocument, palette?: ColorPalette): LogoDocument {
  const darkBg = '#0F1115';
  const lightInk = '#F7F5EF';
  const brightAccent =
    palette && getHexLuminance(palette.accent) >= 0.35
      ? palette.accent
      : palette && getHexLuminance(palette.secondary) >= 0.45
        ? palette.secondary
        : '#E5C67B';

  const liftColor = (hex: string, fallback = lightInk): string => {
    if (!hex || hex === 'transparent' || hex === 'none') return hex;
    return getHexLuminance(hex) < 0.35 ? fallback : hex;
  };

  const layers = cloneLayersWithFreshIds(doc.layers).map((l): LogoLayer => {
    const nextGrad = l.fillGradient?.enabled
      ? {
          ...l.fillGradient,
          startColor: liftColor(l.fillGradient.startColor, lightInk),
          midColor: l.fillGradient.midColor
            ? liftColor(l.fillGradient.midColor, '#FFFFFF')
            : undefined,
          endColor: liftColor(l.fillGradient.endColor, brightAccent),
        }
      : l.fillGradient;

    if (l.type === 'icon') {
      return {
        ...l,
        fill: liftColor(l.fill, lightInk),
        accentFill: liftColor(l.accentFill, brightAccent),
        secondaryFill: liftColor(l.secondaryFill, '#3B4252'),
        partColors: l.partColors?.map((c) => liftColor(c, lightInk)),
        fillGradient: nextGrad,
        stroke: liftColor(l.stroke, lightInk),
      };
    }

    if (l.type === 'custom-svg') {
      return {
        ...l,
        fill: liftColor(l.fill, lightInk),
        fillGradient: nextGrad,
        stroke: liftColor(l.stroke, lightInk),
        paths: l.paths.map((p) => ({
          ...p,
          fill: p.fill ? liftColor(p.fill, lightInk) : p.fill,
          stroke: p.stroke ? liftColor(p.stroke, lightInk) : p.stroke,
        })),
      };
    }

    if (l.type === 'shape') {
      const isHollow = l.fill === 'transparent' || l.shapeKind === 'ring' || l.shapeKind === 'frame';
      return {
        ...l,
        fill: isHollow
          ? 'transparent'
          : getHexLuminance(l.fill) < 0.25
            ? '#1E232D'
            : l.fill,
        stroke: liftColor(l.stroke, brightAccent),
        fillGradient: nextGrad,
      };
    }

    return {
      ...l,
      fill: liftColor(l.fill, l.type === 'divider' ? brightAccent : lightInk),
      stroke: liftColor(l.stroke, lightInk),
      fillGradient: nextGrad,
    };
  });

  return {
    ...doc,
    id: nextLayerId('doc'),
    title: `${doc.title} (Dark Mode)`,
    backgroundColor: darkBg,
    transparentBackground: false,
    layers,
  };
}

export function extractBrandVariants(
  doc: LogoDocument,
  brief: BrandBrief,
  palette?: ColorPalette
): BrandVariations {
  const cloneDoc = (d: LogoDocument, suffix: string, layers: LogoLayer[]): LogoDocument => ({
    ...d,
    id: nextLayerId('doc'),
    title: `${d.title} (${suffix})`,
    layers: cloneLayersWithFreshIds(layers),
  });

  const markLayers = doc.layers.filter(
    (l) => l.type === 'icon' || l.type === 'shape' || l.type === 'custom-svg'
  );
  const textLayers = doc.layers.filter(
    (l) => l.type === 'text' || l.type === 'path' || l.type === 'divider'
  );

  const markOnlyDocument =
    markLayers.length > 0
      ? cloneDoc(doc, 'Icon Only', centerLayersInArtboard(markLayers, doc.width, doc.height, 260))
      : buildDocumentForArchetype(brief, 'monogram-crest');

  const wordmarkDocument =
    textLayers.length > 0
      ? cloneDoc(doc, 'Wordmark', centerLayersInArtboard(textLayers, doc.width, doc.height))
      : buildDocumentForArchetype(brief, 'wordmark');

  const darkModeDocument = buildDarkModeDoc(doc, palette);
  const monochromeDocument = buildMonochromeDoc(doc, '#141413', '#FFFFFF', 'Monochrome Ink');
  const monochromeReversedDocument = buildMonochromeDoc(
    doc,
    '#FFFFFF',
    '#141413',
    'Monochrome Reversed'
  );

  return {
    primaryDocument: doc,
    darkModeDocument,
    monochromeDocument,
    monochromeReversedDocument,
    markOnlyDocument,
    wordmarkDocument,
  };
}

function centerLayersInArtboard(
  layers: LogoLayer[],
  artW: number,
  artH: number,
  targetSpan?: number
): LogoLayer[] {
  if (layers.length === 0) return [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const l of layers) {
    minX = Math.min(minX, l.x);
    minY = Math.min(minY, l.y);
    maxX = Math.max(maxX, l.x + l.width);
    maxY = Math.max(maxY, l.y + l.height);
  }

  const groupW = Math.max(1, maxX - minX);
  const groupH = Math.max(1, maxY - minY);
  const scale = targetSpan ? Math.min(2.2, targetSpan / Math.max(groupW, groupH)) : 1;

  const newW = groupW * scale;
  const newH = groupH * scale;
  const offsetX = (artW - newW) / 2;
  const offsetY = (artH - newH) / 2;

  return layers.map((l) => {
    const scaled: LogoLayer = {
      ...l,
      x: offsetX + (l.x - minX) * scale,
      y: offsetY + (l.y - minY) * scale,
      width: l.width * scale,
      height: l.height * scale,
    };
    if (scaled.type === 'text') {
      scaled.fontSize = Math.round(scaled.fontSize * scale);
    }
    return scaled;
  });
}
