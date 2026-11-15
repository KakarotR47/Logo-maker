import {
  ArtboardPresetKind,
  BrandBrief,
  BrandTokens,
  ColorPalette,
  CustomSvgLayer,
  IconLayer,
  LogoDocument,
  LogoLayer,
  ShapeLayer,
  TextLayer,
} from '../types/logo';
import { linkDocumentToBrandTokens, tokensToPalette } from './brandTokens';
import {
  buildDocumentForArchetype,
  getInitials,
  nextLayerId,
  pickMatchingIcons,
  resolveFont,
  resolvePalette,
} from './logoGenerator';
import { cloneDocumentForProject } from './projectStorage';

export interface ArtboardPresetMeta {
  kind: ArtboardPresetKind;
  label: string;
  shortLabel: string;
  width: number;
  height: number;
  description: string;
}

export const ARTBOARD_PRESETS: ArtboardPresetMeta[] = [
  {
    kind: 'primary-horizontal',
    label: 'Primary Horizontal',
    shortLabel: 'Horizontal',
    width: 800,
    height: 600,
    description: 'Side-by-side mark & wordmark lockup',
  },
  {
    kind: 'stacked-badge',
    label: 'Stacked Badge',
    shortLabel: 'Badge',
    width: 800,
    height: 800,
    description: 'Centered emblem badge for square placements',
  },
  {
    kind: 'app-icon',
    label: 'App Icon / Favicon',
    shortLabel: 'App Icon',
    width: 512,
    height: 512,
    description: 'High-impact square symbol mark for apps & favicons',
  },
  {
    kind: 'social-banner',
    label: 'Social Banner',
    shortLabel: 'Banner',
    width: 1200,
    height: 400,
    description: 'Wide 3:1 header lockup for social & hero banners',
  },
  {
    kind: 'custom',
    label: 'Duplicate Active',
    shortLabel: 'Duplicate',
    width: 800,
    height: 600,
    description: 'Clone the currently selected artboard side-by-side',
  },
];

export const ARTBOARD_GAP_PX = 96;

function extractBrandContextFromSource(
  brief: BrandBrief,
  sourceDoc?: LogoDocument
): {
  brandName: string;
  tagline: string;
  iconLayer?: IconLayer;
  customSvgLayer?: CustomSvgLayer;
} {
  if (!sourceDoc) {
    return {
      brandName: brief.businessName.trim() || 'Verdant Circuit',
      tagline: brief.tagline.trim() || 'Intelligent Brand Systems',
    };
  }

  const texts = sourceDoc.layers
    .filter((l): l is TextLayer => l.type === 'text' && l.visible)
    .sort((a, b) => b.fontSize - a.fontSize);

  const brandName = texts[0]?.text?.trim() || brief.businessName.trim() || 'Verdant Circuit';
  const tagline = texts[1]?.text?.trim() || brief.tagline.trim() || 'Intelligent Brand Systems';
  const iconLayer = sourceDoc.layers.find((l): l is IconLayer => l.type === 'icon' && l.visible);
  const customSvgLayer = sourceDoc.layers.find(
    (l): l is CustomSvgLayer => l.type === 'custom-svg' && l.visible
  );

  return { brandName, tagline, iconLayer, customSvgLayer };
}

function buildShadow() {
  return {
    enabled: false,
    color: 'rgba(17, 24, 39, 0.18)',
    blur: 10,
    offsetX: 0,
    offsetY: 6,
  };
}

function swapIconWithCustomSvgIfPresent(
  doc: LogoDocument,
  customSvg: CustomSvgLayer | undefined,
  primaryHex: string
): LogoDocument {
  if (!customSvg) return doc;
  const hasIcon = doc.layers.some((l) => l.type === 'icon');
  if (!hasIcon) return doc;

  return {
    ...doc,
    layers: doc.layers.map((layer) => {
      if (layer.type !== 'icon') return layer;
      const clonedSvg: CustomSvgLayer = {
        ...JSON.parse(JSON.stringify(customSvg)),
        id: nextLayerId('svg'),
        name: customSvg.name || 'Brand Mark',
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height,
        rotation: 0,
        fill: layer.fill || primaryHex,
        fillToken: layer.fillToken,
        locked: false,
      };
      return clonedSvg;
    }),
  };
}

export function buildResponsiveLockupArtboard(
  preset: ArtboardPresetKind,
  brief: BrandBrief,
  tokens: BrandTokens,
  sourceDoc?: LogoDocument
): LogoDocument {
  const basePalette: ColorPalette = resolvePalette(brief.paletteId);
  const activePalette = tokensToPalette(tokens, basePalette);
  const { brandName, tagline, iconLayer, customSvgLayer } = extractBrandContextFromSource(
    brief,
    sourceDoc
  );

  const syncedBrief: BrandBrief = {
    ...brief,
    businessName: brandName,
    tagline,
    primaryFontId: tokens.fonts.display.fontId,
    secondaryFontId: tokens.fonts.tagline.fontId,
  };

  if (preset === 'custom' && sourceDoc) {
    const cloned = cloneDocumentForProject(sourceDoc, `${sourceDoc.title} Copy`);
    cloned.artboardRole = sourceDoc.artboardRole ?? 'custom';
    return cloned;
  }

  const iconId = iconLayer?.iconId ?? pickMatchingIcons(syncedBrief)[0] ?? 'leaf-circuit';
  const displayFont = resolveFont(tokens.fonts.display.fontId);
  const taglineFont = resolveFont(tokens.fonts.tagline.fontId);

  if (preset === 'primary-horizontal') {
    const built = buildDocumentForArchetype(syncedBrief, 'icon-left', brief.style, iconId, {
      paletteOverride: activePalette,
      primaryFontOverride: displayFont.id,
      secondaryFontOverride: taglineFont.id,
    });
    const withMark = swapIconWithCustomSvgIfPresent(built, customSvgLayer, activePalette.primary);
    return linkDocumentToBrandTokens(
      {
        ...withMark,
        id: nextLayerId('art'),
        title: 'Primary Horizontal',
        artboardRole: 'primary-horizontal',
        backgroundToken: 'background',
      },
      tokens,
      { forceRelink: true }
    );
  }

  if (preset === 'stacked-badge') {
    const built = buildDocumentForArchetype(syncedBrief, 'badge', brief.style, iconId, {
      paletteOverride: activePalette,
      primaryFontOverride: displayFont.id,
      secondaryFontOverride: taglineFont.id,
    });
    const centeredLayers = built.layers.map((l) => ({
      ...l,
      y: l.y + 100,
    }));
    const withMark = swapIconWithCustomSvgIfPresent(
      { ...built, width: 800, height: 800, layers: centeredLayers },
      customSvgLayer,
      activePalette.primary
    );
    return linkDocumentToBrandTokens(
      {
        ...withMark,
        id: nextLayerId('art'),
        title: 'Stacked Badge',
        artboardRole: 'stacked-badge',
        backgroundToken: 'background',
      },
      tokens,
      { forceRelink: true }
    );
  }

  if (preset === 'app-icon') {
    const layers: LogoLayer[] = [
      {
        id: nextLayerId('shp'),
        name: 'App Icon Tile',
        type: 'shape',
        shapeKind: 'rounded-rect',
        cornerRadius: 56,
        x: 48,
        y: 48,
        width: 416,
        height: 416,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        fill: activePalette.primary,
        fillToken: 'primary',
        stroke: 'none',
        strokeWidth: 0,
        shadow: buildShadow(),
      } satisfies ShapeLayer,
    ];

    if (customSvgLayer) {
      layers.push({
        ...JSON.parse(JSON.stringify(customSvgLayer)),
        id: nextLayerId('svg'),
        name: 'App Mark',
        x: 136,
        y: 136,
        width: 240,
        height: 240,
        rotation: 0,
        fill: activePalette.background,
        fillToken: 'background',
        preserveOriginalColors: false,
        locked: false,
      });
    } else if (iconLayer) {
      layers.push({
        id: nextLayerId('ico'),
        name: 'App Symbol',
        type: 'icon',
        iconId,
        x: 136,
        y: 136,
        width: 240,
        height: 240,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        fill: activePalette.background,
        fillToken: 'background',
        secondaryFill: activePalette.secondary,
        secondaryFillToken: 'secondary',
        accentFill: activePalette.accent,
        accentFillToken: 'accent',
        stroke: 'none',
        strokeWidth: 0,
        shadow: buildShadow(),
      });
    } else {
      layers.push({
        id: nextLayerId('txt'),
        name: 'App Monogram',
        type: 'text',
        text: getInitials(brandName),
        x: 96,
        y: 162,
        width: 320,
        height: 188,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        fill: activePalette.background,
        fillToken: 'background',
        stroke: 'none',
        strokeWidth: 0,
        shadow: buildShadow(),
        fontFamily: displayFont.cssFamily,
        fontId: displayFont.id,
        fontToken: 'display',
        fontWeight: 800,
        fontStyle: 'normal',
        fontSize: 164,
        letterSpacing: 0.04,
        lineHeight: 1.05,
        textAlign: 'center',
        uppercase: true,
        curveRadius: 0,
      });
    }

    return {
      id: nextLayerId('art'),
      title: 'App Icon / Favicon',
      artboardRole: 'app-icon',
      width: 512,
      height: 512,
      backgroundColor: activePalette.background,
      backgroundToken: 'background',
      transparentBackground: false,
      layers,
    };
  }

  // social-banner (1200x400)
  const bannerLayers: LogoLayer[] = [
    {
      id: nextLayerId('shp'),
      name: 'Banner Accent Bar',
      type: 'shape',
      shapeKind: 'rounded-rect',
      cornerRadius: 28,
      x: 130,
      y: 120,
      width: 160,
      height: 160,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      fill: activePalette.primary,
      fillToken: 'primary',
      stroke: 'none',
      strokeWidth: 0,
      shadow: buildShadow(),
    },
    customSvgLayer
      ? {
          ...JSON.parse(JSON.stringify(customSvgLayer)),
          id: nextLayerId('svg'),
          name: 'Banner Mark',
          x: 160,
          y: 150,
          width: 100,
          height: 100,
          rotation: 0,
          fill: activePalette.background,
          fillToken: 'background',
          preserveOriginalColors: false,
          locked: false,
        }
      : {
          id: nextLayerId('ico'),
          name: 'Banner Symbol',
          type: 'icon',
          iconId,
          x: 160,
          y: 150,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          fill: activePalette.background,
          fillToken: 'background',
          secondaryFill: activePalette.secondary,
          secondaryFillToken: 'secondary',
          accentFill: activePalette.accent,
          accentFillToken: 'accent',
          stroke: 'none',
          strokeWidth: 0,
          shadow: buildShadow(),
        },
    {
      id: nextLayerId('txt'),
      name: 'Banner Wordmark',
      type: 'text',
      text: brandName,
      x: 332,
      y: 126,
      width: 720,
      height: 78,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      fill: activePalette.text,
      fillToken: 'text',
      stroke: 'none',
      strokeWidth: 0,
      shadow: buildShadow(),
      fontFamily: displayFont.cssFamily,
      fontId: displayFont.id,
      fontToken: 'display',
      fontWeight: 700,
      fontStyle: 'normal',
      fontSize: brandName.length > 16 ? 50 : 62,
      letterSpacing: 0.03,
      lineHeight: 1.08,
      textAlign: 'left',
      uppercase: brief.style === 'modern' || brief.style === 'vintage',
      curveRadius: 0,
    },
    {
      id: nextLayerId('div'),
      name: 'Banner Rule',
      type: 'divider',
      dividerKind: 'solid',
      x: 334,
      y: 214,
      width: 160,
      height: 12,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      fill: activePalette.accent,
      fillToken: 'accent',
      stroke: 'none',
      strokeWidth: 0,
      shadow: buildShadow(),
    },
    {
      id: nextLayerId('txt'),
      name: 'Banner Tagline',
      type: 'text',
      text: tagline,
      x: 334,
      y: 236,
      width: 680,
      height: 40,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      fill: activePalette.accent,
      fillToken: 'accent',
      stroke: 'none',
      strokeWidth: 0,
      shadow: buildShadow(),
      fontFamily: taglineFont.cssFamily,
      fontId: taglineFont.id,
      fontToken: 'tagline',
      fontWeight: 600,
      fontStyle: 'normal',
      fontSize: 20,
      letterSpacing: 0.16,
      lineHeight: 1.15,
      textAlign: 'left',
      uppercase: true,
      curveRadius: 0,
    },
  ];

  return {
    id: nextLayerId('art'),
    title: 'Social Banner',
    artboardRole: 'social-banner',
    width: 1200,
    height: 400,
    backgroundColor: activePalette.background,
    backgroundToken: 'background',
    transparentBackground: false,
    layers: bannerLayers,
  };
}

export interface PositionedArtboard {
  doc: LogoDocument;
  index: number;
  x: number;
  y: number;
}

/**
 * Computes deterministic side-by-side world coordinates for all artboards
 * when explicit canvasX/canvasY are not provided, vertically centered around maxHeight/2.
 */
export function layoutArtboardsSideBySide(
  artboards: LogoDocument[],
  gap = ARTBOARD_GAP_PX
): PositionedArtboard[] {
  if (artboards.length === 0) return [];
  const maxH = Math.max(...artboards.map((a) => a.height));
  let cursorX = 0;

  return artboards.map((doc, index) => {
    const x = typeof doc.canvasX === 'number' ? doc.canvasX : cursorX;
    const y =
      typeof doc.canvasY === 'number'
        ? doc.canvasY
        : Math.round((maxH - doc.height) / 2);
    cursorX = x + doc.width + gap;
    return { doc, index, x, y };
  });
}

export function resetArtboardPositions(
  artboards: LogoDocument[],
  gap = ARTBOARD_GAP_PX
): LogoDocument[] {
  if (artboards.length === 0) return artboards;
  const maxH = Math.max(...artboards.map((a) => a.height));
  let cursorX = 0;
  return artboards.map((doc) => {
    const x = cursorX;
    const y = Math.round((maxH - doc.height) / 2);
    cursorX += doc.width + gap;
    return {
      ...doc,
      canvasX: x,
      canvasY: y,
    };
  });
}

export function computeWorldBounds(positioned: PositionedArtboard[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (positioned.length === 0) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const item of positioned) {
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + item.doc.width);
    maxY = Math.max(maxY, item.y + item.doc.height);
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}
