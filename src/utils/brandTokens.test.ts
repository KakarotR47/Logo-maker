import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyColorTokenToArtboards,
  applyFontTokenToArtboards,
  applyPaletteToAllArtboards,
  countTokenUsages,
  createDefaultBrandTokens,
  linkDocumentToBrandTokens,
  matchColorTokenId,
  normalizeHex,
  tokensToPalette,
} from './brandTokens';
import { COLOR_PALETTES, FONT_OPTIONS } from '../data/logoLibrary';
import { IconLayer, LogoDocument, ShapeLayer, TextLayer } from '../types/logo';

const samplePalette = COLOR_PALETTES[0];
const displayFont = FONT_OPTIONS[0];
const taglineFont = FONT_OPTIONS[1] ?? FONT_OPTIONS[0];

function makeTestDoc(id: string, tokens = createDefaultBrandTokens(samplePalette, displayFont, taglineFont)): LogoDocument {
  const bgShape: ShapeLayer = {
    id: `${id}-shp`,
    name: 'Emblem Tile',
    type: 'shape',
    shapeKind: 'rounded-rect',
    cornerRadius: 24,
    x: 40,
    y: 40,
    width: 120,
    height: 120,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: tokens.colors.primary.hex,
    fillGradient: {
      enabled: true,
      type: 'linear',
      angle: 135,
      startColor: tokens.colors.primary.hex,
      endColor: tokens.colors.accent.hex,
    },
    stroke: tokens.colors.accent.hex,
    strokeWidth: 3,
    shadow: { enabled: false, color: '#000', blur: 0, offsetX: 0, offsetY: 0 },
  };

  const iconLayer: IconLayer = {
    id: `${id}-ico`,
    name: 'Symbol',
    type: 'icon',
    iconId: 'leaf-circuit',
    x: 70,
    y: 70,
    width: 60,
    height: 60,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: tokens.colors.primary.hex,
    secondaryFill: tokens.colors.secondary.hex,
    accentFill: tokens.colors.accent.hex,
    stroke: 'none',
    strokeWidth: 0,
    shadow: { enabled: false, color: '#000', blur: 0, offsetX: 0, offsetY: 0 },
  };

  const titleText: TextLayer = {
    id: `${id}-title`,
    name: 'Brand Name',
    type: 'text',
    text: 'VERDANT',
    x: 200,
    y: 80,
    width: 300,
    height: 60,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: tokens.colors.text.hex,
    stroke: 'none',
    strokeWidth: 0,
    shadow: { enabled: false, color: '#000', blur: 0, offsetX: 0, offsetY: 0 },
    fontFamily: displayFont.cssFamily,
    fontId: displayFont.id,
    fontWeight: 700,
    fontStyle: 'normal',
    fontSize: 48,
    letterSpacing: 0.04,
    lineHeight: 1.1,
    textAlign: 'left',
    uppercase: true,
    curveRadius: 0,
  };

  const tagText: TextLayer = {
    id: `${id}-tag`,
    name: 'Tagline',
    type: 'text',
    text: 'STUDIO SYSTEMS',
    x: 200,
    y: 145,
    width: 300,
    height: 30,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: tokens.colors.accent.hex,
    stroke: 'none',
    strokeWidth: 0,
    shadow: { enabled: false, color: '#000', blur: 0, offsetX: 0, offsetY: 0 },
    fontFamily: taglineFont.cssFamily,
    fontId: taglineFont.id,
    fontWeight: 600,
    fontStyle: 'normal',
    fontSize: 16,
    letterSpacing: 0.16,
    lineHeight: 1.1,
    textAlign: 'left',
    uppercase: true,
    curveRadius: 0,
  };

  return {
    id,
    title: `Doc ${id}`,
    width: 800,
    height: 600,
    backgroundColor: tokens.colors.background.hex,
    transparentBackground: false,
    layers: [bgShape, iconLayer, titleText, tagText],
  };
}

test('normalizeHex normalizes 3-char and 6-char hex values', () => {
  assert.equal(normalizeHex('#abc'), '#AABBCC');
  assert.equal(normalizeHex(' #1b4332 '), '#1B4332');
  assert.equal(normalizeHex(undefined), '');
});

test('linkDocumentToBrandTokens infers fill, stroke, icon, background, and font tokens', () => {
  const tokens = createDefaultBrandTokens(samplePalette, displayFont, taglineFont);
  const raw = makeTestDoc('a', tokens);
  const linked = linkDocumentToBrandTokens(raw, tokens);

  assert.equal(linked.backgroundToken, 'background');
  assert.equal(linked.layers[0].fillToken, 'primary');
  assert.equal(linked.layers[0].strokeToken, 'accent');

  const icon = linked.layers[1] as IconLayer;
  assert.equal(icon.fillToken, 'primary');
  assert.equal(icon.secondaryFillToken, 'secondary');
  assert.equal(icon.accentFillToken, 'accent');

  const title = linked.layers[2] as TextLayer;
  const tag = linked.layers[3] as TextLayer;
  assert.equal(title.fontToken, 'display');
  assert.equal(tag.fontToken, 'tagline');
});

test('applyColorTokenToArtboards updates all linked layers across multiple artboards while preserving unlinked overrides', () => {
  const tokens = createDefaultBrandTokens(samplePalette, displayFont, taglineFont);
  const doc1 = linkDocumentToBrandTokens(makeTestDoc('ab1', tokens), tokens);
  const doc2 = linkDocumentToBrandTokens(makeTestDoc('ab2', tokens), tokens);

  // Unlink shape on artboard 2 to verify manual per-layer override stays untouched
  doc2.layers[0] = {
    ...doc2.layers[0],
    fill: '#FF00AA',
    fillToken: undefined,
  };

  const res = applyColorTokenToArtboards([doc1, doc2], tokens, 'primary', '#2563EB');

  assert.equal(res.tokens.colors.primary.hex, '#2563EB');
  assert.equal(res.artboards[0].layers[0].fill, '#2563EB');
  assert.equal(res.artboards[0].layers[0].fillGradient?.startColor, '#2563EB');
  assert.equal(res.artboards[0].layers[1].fill, '#2563EB');
  // Artboard 2 icon is linked, so it updates; shape was unlinked, so it keeps #FF00AA
  assert.equal(res.artboards[1].layers[1].fill, '#2563EB');
  assert.equal(res.artboards[1].layers[0].fill, '#FF00AA');
});

test('applyFontTokenToArtboards propagates font changes across all artboards and clamps to supported weights', () => {
  const tokens = createDefaultBrandTokens(samplePalette, displayFont, taglineFont);
  const doc1 = linkDocumentToBrandTokens(makeTestDoc('ab1', tokens), tokens);
  const doc2 = linkDocumentToBrandTokens(makeTestDoc('ab2', tokens), tokens);

  const altFont = {
    ...displayFont,
    id: 'test-serif',
    name: 'Test Serif',
    cssFamily: '"Test Serif", serif',
    weights: [400, 600],
  };

  const res = applyFontTokenToArtboards([doc1, doc2], tokens, 'display', altFont);
  assert.equal(res.tokens.fonts.display.fontId, 'test-serif');

  const t1 = res.artboards[0].layers[2] as TextLayer;
  const t2 = res.artboards[1].layers[2] as TextLayer;
  const tag1 = res.artboards[0].layers[3] as TextLayer;

  assert.equal(t1.fontId, 'test-serif');
  assert.equal(t1.fontWeight, 600);
  assert.equal(t2.fontId, 'test-serif');
  assert.equal(tag1.fontId, taglineFont.id);
});

test('applyPaletteToAllArtboards, matchColorTokenId, tokensToPalette, and countTokenUsages work together', () => {
  const tokens = createDefaultBrandTokens(samplePalette, displayFont, taglineFont);
  const doc1 = linkDocumentToBrandTokens(makeTestDoc('ab1', tokens), tokens);
  const doc2 = linkDocumentToBrandTokens(makeTestDoc('ab2', tokens), tokens);

  const nextPalette = COLOR_PALETTES[1] ?? samplePalette;
  const res = applyPaletteToAllArtboards([doc1, doc2], tokens, nextPalette);

  assert.equal(
    matchColorTokenId(nextPalette.accent, res.tokens),
    'accent'
  );
  const derivedPalette = tokensToPalette(res.tokens, samplePalette);
  assert.equal(derivedPalette.primary, normalizeHex(nextPalette.primary));
  assert.equal(res.artboards[0].backgroundColor, normalizeHex(nextPalette.background));

  const counts = countTokenUsages(res.artboards);
  assert.ok(counts.colorCounts.primary >= 4);
  assert.equal(counts.fontCounts.display, 2);
  assert.equal(counts.fontCounts.tagline, 2);
});
