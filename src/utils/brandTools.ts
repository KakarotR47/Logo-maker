import {
  BrandBrief,
  ColorPalette,
  LogoDocument,
  LogoLayer,
} from '../types/logo';
import {
  doesPointOverlapLayer,
  getContrastRatio,
  resolveEffectiveBackdrop,
  suggestAccessibleTextColor,
} from './contrastChecker';
import {
  buildDocumentForArchetype,
  nextLayerId,
} from './logoGenerator';

export interface LogoVariationEntry {
  id: 'full-color' | 'all-white' | 'all-black' | 'icon-square';
  label: string;
  subtitle: string;
  previewSurface: 'light' | 'dark' | 'checker';
  document: LogoDocument;
}

function deepCloneLayersFresh(layers: LogoLayer[]): LogoLayer[] {
  return layers.map((l) => {
    const base = {
      ...l,
      id: nextLayerId(l.type),
      shadow: { ...l.shadow },
      fillGradient: l.fillGradient
        ? {
            ...l.fillGradient,
            stops: l.fillGradient.stops?.map((s) => ({ ...s })),
          }
        : undefined,
      fillPattern: l.fillPattern ? { ...l.fillPattern } : undefined,
      clipMask: l.clipMask
        ? {
            ...l.clipMask,
            customPaths: l.clipMask.customPaths ? [...l.clipMask.customPaths] : undefined,
          }
        : undefined,
    };
    if (base.type === 'icon' && l.type === 'icon') {
      return { ...base, partColors: l.partColors ? [...l.partColors] : undefined };
    }
    if (base.type === 'custom-svg' && l.type === 'custom-svg') {
      return { ...base, paths: l.paths.map((p) => ({ ...p })) };
    }
    if (base.type === 'text' && l.type === 'text') {
      return {
        ...base,
        textEffect: l.textEffect ? { ...l.textEffect } : undefined,
        textWarp: l.textWarp ? { ...l.textWarp } : undefined,
      };
    }
    if (base.type === 'path' && l.type === 'path') {
      return { ...base, pathDataList: [...l.pathDataList] };
    }
    return base;
  });
}

function scaleAndCenterLayers(
  layers: LogoLayer[],
  artW: number,
  artH: number,
  targetSpan: number
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
  const scale = Math.min(3.2, targetSpan / Math.max(groupW, groupH));

  const newW = groupW * scale;
  const newH = groupH * scale;
  const offsetX = (artW - newW) / 2;
  const offsetY = (artH - newH) / 2;

  return layers.map((l) => {
    const scaled: LogoLayer = {
      ...l,
      x: Math.round(offsetX + (l.x - minX) * scale),
      y: Math.round(offsetY + (l.y - minY) * scale),
      width: Math.max(4, Math.round(l.width * scale)),
      height: Math.max(4, Math.round(l.height * scale)),
    };
    if (scaled.type === 'text') {
      scaled.fontSize = Math.max(10, Math.round(scaled.fontSize * scale));
    }
    return scaled;
  });
}

function isHollowShapeLayer(layer: LogoLayer): boolean {
  return (
    layer.type === 'shape' &&
    (layer.fill === 'transparent' ||
      layer.fill === 'none' ||
      layer.shapeKind === 'ring' ||
      layer.shapeKind === 'frame')
  );
}

/**
 * 1-Click Magic Recolor:
 * Deterministically shuffles the user's selected 3-color brand palette (primary, secondary, accent)
 * across all shapes, icons, custom SVGs, dividers, and text layers while keeping text & overlaid marks legible.
 */
export function magicRecolorDocument(
  doc: LogoDocument,
  palette: ColorPalette,
  step: number
): LogoDocument {
  const brandTriad = [palette.primary, palette.secondary, palette.accent];

  // 6 distinct permutations of the 3-color brand palette
  const permutations: [number, number, number][] = [
    [2, 0, 1],
    [1, 2, 0],
    [0, 2, 1],
    [2, 1, 0],
    [1, 0, 2],
    [0, 1, 2],
  ];
  const [i0, i1, i2] = permutations[Math.abs(step) % permutations.length];
  const c0 = brandTriad[i0];
  const c1 = brandTriad[i1];
  const c2 = brandTriad[i2];
  const shuffledTriad = [c0, c1, c2];

  const docBg =
    doc.transparentBackground || doc.backgroundColor === 'transparent'
      ? '#FFFFFF'
      : doc.backgroundColor || '#FFFFFF';

  const pickContrasting = (preferredOrder: string[], backdropHex: string, minRatio = 2.6): string => {
    for (const candidate of preferredOrder) {
      if (getContrastRatio(candidate, backdropHex) >= minRatio) {
        return candidate;
      }
    }
    return suggestAccessibleTextColor(backdropHex, palette);
  };

  let shapeIdx = 0;
  let iconIdx = 0;
  let dividerIdx = 0;
  let textIdx = 0;

  const updatedLayers: LogoLayer[] = [];

  for (let idx = 0; idx < doc.layers.length; idx += 1) {
    const layer = doc.layers[idx];

    if (layer.type === 'shape') {
      const assigned = shuffledTriad[(shapeIdx + step) % 3];
      const alt = shuffledTriad[(shapeIdx + 1 + step) % 3];
      shapeIdx += 1;

      if (isHollowShapeLayer(layer)) {
        const strokeColor = pickContrasting([assigned, alt, c0], docBg, 2.0);
        updatedLayers.push({
          ...layer,
          fill: 'transparent',
          fillGradient: undefined,
          stroke: strokeColor,
          strokeWidth: Math.max(3, layer.strokeWidth || 4),
        });
      } else {
        const nextFill =
          getContrastRatio(assigned, docBg) >= 1.25 ? assigned : pickContrasting([c1, c2, c0], docBg, 1.25);
        updatedLayers.push({
          ...layer,
          fill: nextFill,
          fillGradient: layer.fillGradient?.enabled
            ? {
                ...layer.fillGradient,
                startColor: nextFill,
                endColor: alt,
                midColor: layer.fillGradient.midColor ? c2 : undefined,
                stops: undefined,
              }
            : layer.fillGradient,
          fillPattern: layer.fillPattern?.enabled
            ? {
                ...layer.fillPattern,
                foregroundColor: nextFill,
                backgroundColor:
                  layer.fillPattern.backgroundColor === 'transparent' ? 'transparent' : alt,
              }
            : layer.fillPattern,
          stroke: layer.strokeWidth > 0 ? alt : 'none',
        });
      }
      continue;
    }

    // Compute underlying surface based on ALREADY recolored lower layers so icons & text contrast against shapes!
    const tempDocSoFar: LogoDocument = {
      ...doc,
      layers: [...updatedLayers, layer, ...doc.layers.slice(idx + 1)],
    };
    const effectiveBackdrop = resolveEffectiveBackdrop(tempDocSoFar, idx, layer);

    if (layer.type === 'icon') {
      const pA = shuffledTriad[(iconIdx + step) % 3];
      const pB = shuffledTriad[(iconIdx + 1 + step) % 3];
      const pC = shuffledTriad[(iconIdx + 2 + step) % 3];
      iconIdx += 1;

      const mainFill = pickContrasting([pA, pB, pC, palette.background, '#FFFFFF'], effectiveBackdrop, 2.2);
      const accentFill = pickContrasting([pB, pC, pA, '#FFFFFF'], effectiveBackdrop, 1.8);
      const secondaryFill = pickContrasting([pC, pA, pB], effectiveBackdrop, 1.5);

      updatedLayers.push({
        ...layer,
        fill: mainFill,
        accentFill,
        secondaryFill,
        partColors: layer.partColors?.map((_, partI) => {
          const rotated = [mainFill, accentFill, secondaryFill][partI % 3];
          return rotated;
        }),
        fillGradient: layer.fillGradient?.enabled
          ? {
              ...layer.fillGradient,
              startColor: mainFill,
              endColor: accentFill,
              midColor: layer.fillGradient.midColor ? secondaryFill : undefined,
            }
          : layer.fillGradient,
        stroke: layer.strokeWidth > 0 ? accentFill : 'none',
      });
      continue;
    }

    if (layer.type === 'custom-svg') {
      const pA = shuffledTriad[(iconIdx + step) % 3];
      const pB = shuffledTriad[(iconIdx + 1 + step) % 3];
      const pC = shuffledTriad[(iconIdx + 2 + step) % 3];
      iconIdx += 1;

      const mainFill = pickContrasting([pA, pB, pC, palette.background, '#FFFFFF'], effectiveBackdrop, 2.2);
      const partTriad = [mainFill, pB, pC];

      updatedLayers.push({
        ...layer,
        fill: mainFill,
        fillGradient: layer.fillGradient?.enabled
          ? {
              ...layer.fillGradient,
              startColor: mainFill,
              endColor: pB,
            }
          : layer.fillGradient,
        paths: layer.paths.map((p, partI) => ({
          ...p,
          fill: p.fill === 'none' ? 'none' : partTriad[partI % partTriad.length],
          stroke: p.stroke && p.stroke !== 'none' ? partTriad[(partI + 1) % partTriad.length] : p.stroke,
        })),
      });
      continue;
    }

    if (layer.type === 'divider') {
      const divColor = pickContrasting([c2, c1, c0], effectiveBackdrop, 1.6);
      dividerIdx += 1;
      updatedLayers.push({
        ...layer,
        fill: divColor,
        fillGradient: undefined,
      });
      continue;
    }

    if (layer.type === 'text' || layer.type === 'path') {
      const isSecondaryText =
        layer.type === 'text' && (layer.fontSize <= 22 || textIdx > 0);
      const preferredOrder = isSecondaryText
        ? [c2, c1, c0, palette.text, palette.primary]
        : [c0, c2, palette.text, c1, palette.primary];
      textIdx += 1;

      const minReq = layer.type === 'text' && layer.fontSize < 22 ? 4.5 : 3.0;
      const nextTextColor = pickContrasting(preferredOrder, effectiveBackdrop, minReq);

      const nextTextEffect =
        layer.type === 'text' && layer.textEffect && layer.textEffect.style !== 'none'
          ? {
              ...layer.textEffect,
              primaryColor:
                layer.textEffect.style === 'hollow'
                  ? nextTextColor
                  : layer.textEffect.style === 'splice' || layer.textEffect.style === 'extrude'
                    ? pickContrasting([c2, c1, c0], effectiveBackdrop, 1.5)
                    : layer.textEffect.primaryColor,
              secondaryColor:
                layer.textEffect.style === 'splice'
                  ? nextTextColor
                  : layer.textEffect.secondaryColor,
            }
          : layer.type === 'text'
            ? layer.textEffect
            : undefined;

      updatedLayers.push({
        ...layer,
        fill: nextTextColor,
        ...(layer.type === 'text' ? { textEffect: nextTextEffect } : {}),
        fillGradient: layer.fillGradient?.enabled
          ? {
              ...layer.fillGradient,
              startColor: nextTextColor,
              endColor: pickContrasting([c1, c2, nextTextColor], effectiveBackdrop, minReq),
              midColor: undefined,
            }
          : layer.fillGradient,
      });
      continue;
    }

    updatedLayers.push(layer);
  }

  return {
    ...doc,
    layers: updatedLayers,
  };
}

/**
 * Generates a pure single-ink document (e.g. All-White or All-Black Monochrome)
 * while converting solid container shapes enclosing icons/text into negative-space cutouts so nested artwork stays crisp.
 */
function buildSingleInkVariant(
  sourceDoc: LogoDocument,
  inkHex: string,
  backdropHex: string,
  transparentBg: boolean,
  titleSuffix: string
): LogoDocument {
  const cloned = deepCloneLayersFresh(sourceDoc.layers);

  const layers = cloned.map((layer, idx): LogoLayer => {
    const cx = layer.x + layer.width / 2;
    const cy = layer.y + layer.height / 2;
    const sitsInsideSolidShape = cloned.some(
      (other, oIdx) =>
        oIdx < idx &&
        other.visible &&
        other.type === 'shape' &&
        !isHollowShapeLayer(other) &&
        doesPointOverlapLayer(cx, cy, other)
    );

    const activeInk = sitsInsideSolidShape ? backdropHex : inkHex;

    if (layer.type === 'icon') {
      return {
        ...layer,
        fill: activeInk,
        accentFill: activeInk,
        secondaryFill: activeInk,
        partColors: layer.partColors?.map(() => activeInk),
        fillGradient: undefined,
        fillPattern: undefined,
        stroke: layer.strokeWidth > 0 ? activeInk : 'none',
      };
    }

    if (layer.type === 'custom-svg') {
      return {
        ...layer,
        fill: activeInk,
        fillGradient: undefined,
        fillPattern: undefined,
        stroke: layer.strokeWidth > 0 ? activeInk : 'none',
        preserveOriginalColors: false,
        paths: layer.paths.map((p) => ({
          ...p,
          fill: p.fill === 'none' ? 'none' : activeInk,
          stroke: p.stroke && p.stroke !== 'none' ? activeInk : p.stroke,
        })),
      };
    }

    if (layer.type === 'shape') {
      const hollow = isHollowShapeLayer(layer);
      return {
        ...layer,
        fill: hollow ? 'transparent' : inkHex,
        stroke: hollow || layer.strokeWidth > 0 ? inkHex : 'none',
        strokeWidth: hollow ? Math.max(4, layer.strokeWidth) : layer.strokeWidth,
        fillGradient: undefined,
        fillPattern: undefined,
      };
    }

    if (layer.type === 'text') {
      const keepHollow = layer.textEffect?.style === 'hollow';
      return {
        ...layer,
        fill: activeInk,
        stroke: layer.strokeWidth > 0 ? activeInk : 'none',
        fillGradient: undefined,
        fillPattern: undefined,
        textEffect: keepHollow
          ? { style: 'hollow', offset: layer.textEffect?.offset ?? 2.5, primaryColor: activeInk }
          : undefined,
      };
    }

    return {
      ...layer,
      fill: activeInk,
      stroke: layer.strokeWidth > 0 ? activeInk : 'none',
      fillGradient: undefined,
      fillPattern: undefined,
    };
  });

  return {
    ...sourceDoc,
    id: nextLayerId('doc'),
    title: `${sourceDoc.title} — ${titleSuffix}`,
    backgroundColor: backdropHex,
    transparentBackground: transparentBg,
    layers,
  };
}

/**
 * 1-Click Logo Variations Generator:
 * Duplicates the current logo into 4 ready-to-use versions:
 * 1. Full Color
 * 2. All-White (for dark backgrounds)
 * 3. All-Black Monochrome
 * 4. Icon-Only Square (800x800)
 */
export function generateFourLogoVariations(
  doc: LogoDocument,
  brief: BrandBrief,
  _palette: ColorPalette
): LogoVariationEntry[] {
  const baseTitle = doc.title.replace(/\s+—\s+(Full Color|All-White|All-Black|Icon-Only Square)$/i, '');

  const cleanSource: LogoDocument = {
    ...doc,
    title: baseTitle,
  };

  // 1. Full Color
  const fullColorDoc: LogoDocument = {
    ...cleanSource,
    id: nextLayerId('doc'),
    title: `${baseTitle} — Full Color`,
    layers: deepCloneLayersFresh(cleanSource.layers),
  };

  // 2. All-White (for dark backgrounds)
  const allWhiteDoc = buildSingleInkVariant(
    cleanSource,
    '#FFFFFF',
    '#141518',
    false,
    'All-White'
  );

  // 3. All-Black Monochrome
  const allBlackDoc = buildSingleInkVariant(
    cleanSource,
    '#111111',
    '#FFFFFF',
    false,
    'All-Black'
  );

  // 4. Icon-Only Square (800x800)
  const squareSize = 800;
  const markLayers = cleanSource.layers.filter(
    (l) => l.visible && (l.type === 'icon' || l.type === 'custom-svg' || l.type === 'shape')
  );

  let iconSquareLayers: LogoLayer[];
  if (markLayers.length > 0) {
    iconSquareLayers = scaleAndCenterLayers(
      deepCloneLayersFresh(markLayers),
      squareSize,
      squareSize,
      460
    );
  } else {
    // Fallback to generated monogram crest in 800x800 if current doc has no icon/shape
    const fallbackDoc = buildDocumentForArchetype(brief, 'monogram-crest');
    const fallbackMarks = fallbackDoc.layers.filter(
      (l) => l.type === 'shape' || l.type === 'icon' || l.type === 'text'
    );
    iconSquareLayers = scaleAndCenterLayers(
      deepCloneLayersFresh(fallbackMarks),
      squareSize,
      squareSize,
      460
    );
  }

  const iconOnlySquareDoc: LogoDocument = {
    ...cleanSource,
    id: nextLayerId('doc'),
    title: `${baseTitle} — Icon-Only Square`,
    width: squareSize,
    height: squareSize,
    layers: iconSquareLayers,
  };

  return [
    {
      id: 'full-color',
      label: 'Full Color',
      subtitle: `${fullColorDoc.width} × ${fullColorDoc.height} · Primary Lockup`,
      previewSurface: fullColorDoc.transparentBackground ? 'checker' : 'light',
      document: fullColorDoc,
    },
    {
      id: 'all-white',
      label: 'All-White',
      subtitle: 'Pure White Ink · For Dark Backgrounds',
      previewSurface: 'dark',
      document: allWhiteDoc,
    },
    {
      id: 'all-black',
      label: 'All-Black Monochrome',
      subtitle: 'Single-Ink Black · Print & Stamps',
      previewSurface: 'light',
      document: allBlackDoc,
    },
    {
      id: 'icon-square',
      label: 'Icon-Only Square',
      subtitle: '800 × 800 px · App Icon & Avatar',
      previewSurface: iconOnlySquareDoc.transparentBackground ? 'checker' : 'light',
      document: iconOnlySquareDoc,
    },
  ];
}
