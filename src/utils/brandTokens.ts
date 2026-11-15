import {
  BrandColorTokenId,
  BrandFontTokenId,
  BrandTokens,
  ColorPalette,
  FontOption,
  LogoDocument,
  LogoLayer,
  TextLayer,
} from '../types/logo';

export const BRAND_COLOR_TOKEN_ORDER: BrandColorTokenId[] = [
  'primary',
  'accent',
  'secondary',
  'text',
  'background',
];

export const BRAND_FONT_TOKEN_ORDER: BrandFontTokenId[] = ['display', 'tagline'];

export const BRAND_COLOR_TOKEN_LABELS: Record<BrandColorTokenId, string> = {
  primary: 'Primary Brand Color',
  accent: 'Accent Color',
  secondary: 'Secondary Surface',
  text: 'Brand Ink / Text',
  background: 'Canvas Background',
};

export const BRAND_FONT_TOKEN_LABELS: Record<BrandFontTokenId, string> = {
  display: 'Primary Display Font',
  tagline: 'Secondary Tagline Font',
};

export function normalizeHex(hex: string | undefined | null): string {
  if (!hex) return '';
  const raw = hex.trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(raw)) return raw;
  if (/^#[0-9A-F]{3}$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return raw;
}

export function createDefaultBrandTokens(
  palette: ColorPalette,
  primaryFont: FontOption,
  secondaryFont: FontOption
): BrandTokens {
  return {
    colors: {
      primary: {
        id: 'primary',
        label: BRAND_COLOR_TOKEN_LABELS.primary,
        hex: normalizeHex(palette.primary) || '#1B4332',
      },
      secondary: {
        id: 'secondary',
        label: BRAND_COLOR_TOKEN_LABELS.secondary,
        hex: normalizeHex(palette.secondary) || '#D8CCB4',
      },
      accent: {
        id: 'accent',
        label: BRAND_COLOR_TOKEN_LABELS.accent,
        hex: normalizeHex(palette.accent) || '#2D6A4F',
      },
      text: {
        id: 'text',
        label: BRAND_COLOR_TOKEN_LABELS.text,
        hex: normalizeHex(palette.text) || '#141413',
      },
      background: {
        id: 'background',
        label: BRAND_COLOR_TOKEN_LABELS.background,
        hex: normalizeHex(palette.background) || '#FAF9F6',
      },
    },
    fonts: {
      display: {
        id: 'display',
        label: BRAND_FONT_TOKEN_LABELS.display,
        fontId: primaryFont.id,
        fontFamily: primaryFont.cssFamily,
      },
      tagline: {
        id: 'tagline',
        label: BRAND_FONT_TOKEN_LABELS.tagline,
        fontId: secondaryFont.id,
        fontFamily: secondaryFont.cssFamily,
      },
    },
  };
}

export function tokensToPalette(tokens: BrandTokens, basePalette: ColorPalette): ColorPalette {
  return {
    ...basePalette,
    primary: tokens.colors.primary.hex,
    secondary: tokens.colors.secondary.hex,
    accent: tokens.colors.accent.hex,
    text: tokens.colors.text.hex,
    background: tokens.colors.background.hex,
  };
}

export function matchColorTokenId(
  hex: string | undefined,
  tokens: BrandTokens
): BrandColorTokenId | undefined {
  const norm = normalizeHex(hex);
  if (!norm || norm === 'NONE' || norm === 'TRANSPARENT') return undefined;
  for (const id of BRAND_COLOR_TOKEN_ORDER) {
    if (normalizeHex(tokens.colors[id].hex) === norm) {
      return id;
    }
  }
  return undefined;
}

export function inferLayerTokens(
  layer: LogoLayer,
  tokens: BrandTokens,
  options?: { forceRelink?: boolean; primaryTextId?: string }
): LogoLayer {
  const force = Boolean(options?.forceRelink);

  const fillToken = force
    ? matchColorTokenId(layer.fill, tokens)
    : layer.fillToken ?? matchColorTokenId(layer.fill, tokens);

  const strokeToken = force
    ? layer.strokeWidth > 0
      ? matchColorTokenId(layer.stroke, tokens)
      : undefined
    : layer.strokeToken ??
      (layer.strokeWidth > 0 ? matchColorTokenId(layer.stroke, tokens) : undefined);

  let next: LogoLayer = {
    ...layer,
    fillToken,
    strokeToken,
  };

  if (next.type === 'icon') {
    next = {
      ...next,
      secondaryFillToken: force
        ? matchColorTokenId(next.secondaryFill, tokens)
        : next.secondaryFillToken ?? matchColorTokenId(next.secondaryFill, tokens),
      accentFillToken: force
        ? matchColorTokenId(next.accentFill, tokens)
        : next.accentFillToken ?? matchColorTokenId(next.accentFill, tokens),
    };
  }

  if (next.type === 'text') {
    let fontToken: BrandFontTokenId | undefined = force ? undefined : next.fontToken;
    if (!fontToken) {
      if (options?.primaryTextId && next.id === options.primaryTextId) {
        fontToken = 'display';
      } else if (next.fontId === tokens.fonts.display.fontId) {
        fontToken = 'display';
      } else if (next.fontId === tokens.fonts.tagline.fontId) {
        fontToken = 'tagline';
      } else if (next.fontSize >= 26) {
        fontToken = 'display';
      } else {
        fontToken = 'tagline';
      }
    }
    next = {
      ...next,
      fontToken,
    };
  }

  return next;
}

export function linkDocumentToBrandTokens(
  doc: LogoDocument,
  tokens: BrandTokens,
  options?: { forceRelink?: boolean }
): LogoDocument {
  const textLayers = doc.layers
    .filter((l): l is TextLayer => l.type === 'text')
    .sort((a, b) => b.fontSize - a.fontSize);
  const primaryTextId = textLayers[0]?.id;

  const backgroundToken = options?.forceRelink
    ? matchColorTokenId(doc.backgroundColor, tokens)
    : doc.backgroundToken ?? matchColorTokenId(doc.backgroundColor, tokens);

  return {
    ...doc,
    backgroundToken,
    layers: doc.layers.map((layer) =>
      inferLayerTokens(layer, tokens, {
        forceRelink: options?.forceRelink,
        primaryTextId,
      })
    ),
  };
}

function replaceHexInGradient(
  layer: LogoLayer,
  prevHex: string,
  nextHex: string
): LogoLayer['fillGradient'] {
  if (!layer.fillGradient?.enabled) return layer.fillGradient;
  const p = normalizeHex(prevHex);
  const g = layer.fillGradient;
  return {
    ...g,
    startColor: normalizeHex(g.startColor) === p ? nextHex : g.startColor,
    endColor: normalizeHex(g.endColor) === p ? nextHex : g.endColor,
    midColor: g.midColor && normalizeHex(g.midColor) === p ? nextHex : g.midColor,
    stops: g.stops?.map((s) =>
      normalizeHex(s.color) === p ? { ...s, color: nextHex } : s
    ),
  };
}

export function applyColorTokenToArtboards(
  artboards: LogoDocument[],
  tokens: BrandTokens,
  tokenId: BrandColorTokenId,
  nextHexRaw: string
): { artboards: LogoDocument[]; tokens: BrandTokens } {
  const nextHex = normalizeHex(nextHexRaw) || nextHexRaw;
  const prevHex = tokens.colors[tokenId].hex;

  const nextTokens: BrandTokens = {
    ...tokens,
    colors: {
      ...tokens.colors,
      [tokenId]: {
        ...tokens.colors[tokenId],
        hex: nextHex,
      },
    },
  };

  const nextArtboards = artboards.map((doc) => {
    const updateBg = doc.backgroundToken === tokenId;
    const nextLayers = doc.layers.map((layer) => {
      let updated: LogoLayer = layer;
      let changed = false;

      if (layer.fillToken === tokenId) {
        updated = {
          ...updated,
          fill: nextHex,
          fillGradient: replaceHexInGradient(updated, prevHex, nextHex),
        };
        if (
          updated.type === 'text' &&
          updated.textEffect &&
          updated.textEffect.primaryColor &&
          normalizeHex(updated.textEffect.primaryColor) === normalizeHex(prevHex)
        ) {
          updated = {
            ...updated,
            textEffect: {
              ...updated.textEffect,
              primaryColor: nextHex,
            },
          };
        }
        changed = true;
      }

      if (layer.strokeToken === tokenId) {
        updated = {
          ...updated,
          stroke: nextHex,
        };
        changed = true;
      }

      if (updated.type === 'icon') {
        const iconPatch: Partial<typeof updated> = {};
        if (updated.secondaryFillToken === tokenId) {
          iconPatch.secondaryFill = nextHex;
          changed = true;
        }
        if (updated.accentFillToken === tokenId) {
          iconPatch.accentFill = nextHex;
          changed = true;
        }
        if (Object.keys(iconPatch).length > 0) {
          updated = { ...updated, ...iconPatch };
        }
      }

      return changed ? updated : layer;
    });

    if (!updateBg && nextLayers.every((l, i) => l === doc.layers[i])) {
      return doc;
    }

    return {
      ...doc,
      backgroundColor: updateBg ? nextHex : doc.backgroundColor,
      layers: nextLayers,
    };
  });

  return { artboards: nextArtboards, tokens: nextTokens };
}

function resolveClosestWeight(requested: number, available: number[]): number {
  if (available.length === 0) return requested;
  if (available.includes(requested)) return requested;
  return available.reduce((best, cur) =>
    Math.abs(cur - requested) < Math.abs(best - requested) ? cur : best
  );
}

export function applyFontTokenToArtboards(
  artboards: LogoDocument[],
  tokens: BrandTokens,
  tokenId: BrandFontTokenId,
  nextFont: FontOption
): { artboards: LogoDocument[]; tokens: BrandTokens } {
  const nextTokens: BrandTokens = {
    ...tokens,
    fonts: {
      ...tokens.fonts,
      [tokenId]: {
        ...tokens.fonts[tokenId],
        fontId: nextFont.id,
        fontFamily: nextFont.cssFamily,
      },
    },
  };

  const nextArtboards = artboards.map((doc) => {
    let docChanged = false;
    const nextLayers = doc.layers.map((layer) => {
      if (layer.type !== 'text' || layer.fontToken !== tokenId) return layer;
      docChanged = true;
      return {
        ...layer,
        fontId: nextFont.id,
        fontFamily: nextFont.cssFamily,
        fontWeight: resolveClosestWeight(layer.fontWeight, nextFont.weights),
      };
    });
    return docChanged ? { ...doc, layers: nextLayers } : doc;
  });

  return { artboards: nextArtboards, tokens: nextTokens };
}

export function applyPaletteToAllArtboards(
  artboards: LogoDocument[],
  tokens: BrandTokens,
  palette: ColorPalette
): { artboards: LogoDocument[]; tokens: BrandTokens } {
  let curArtboards = artboards;
  let curTokens = tokens;

  const updates: Array<[BrandColorTokenId, string]> = [
    ['primary', palette.primary],
    ['secondary', palette.secondary],
    ['accent', palette.accent],
    ['text', palette.text],
    ['background', palette.background],
  ];

  for (const [id, hex] of updates) {
    const res = applyColorTokenToArtboards(curArtboards, curTokens, id, hex);
    curArtboards = res.artboards;
    curTokens = res.tokens;
  }

  return { artboards: curArtboards, tokens: curTokens };
}

export function countTokenUsages(artboards: LogoDocument[]): {
  colorCounts: Record<BrandColorTokenId, number>;
  fontCounts: Record<BrandFontTokenId, number>;
} {
  const colorCounts: Record<BrandColorTokenId, number> = {
    primary: 0,
    secondary: 0,
    accent: 0,
    text: 0,
    background: 0,
  };
  const fontCounts: Record<BrandFontTokenId, number> = {
    display: 0,
    tagline: 0,
  };

  for (const doc of artboards) {
    if (doc.backgroundToken) {
      colorCounts[doc.backgroundToken] += 1;
    }
    for (const layer of doc.layers) {
      if (layer.fillToken) colorCounts[layer.fillToken] += 1;
      if (layer.strokeToken) colorCounts[layer.strokeToken] += 1;
      if (layer.type === 'icon') {
        if (layer.secondaryFillToken) colorCounts[layer.secondaryFillToken] += 1;
        if (layer.accentFillToken) colorCounts[layer.accentFillToken] += 1;
      }
      if (layer.type === 'text' && layer.fontToken) {
        fontCounts[layer.fontToken] += 1;
      }
    }
  }

  return { colorCounts, fontCounts };
}
