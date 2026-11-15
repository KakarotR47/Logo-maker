import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARTBOARD_GAP_PX,
  buildResponsiveLockupArtboard,
  computeWorldBounds,
  layoutArtboardsSideBySide,
  resetArtboardPositions,
} from './multiArtboard';
import { createDefaultBrandTokens } from './brandTokens';
import { DEFAULT_BRAND_BRIEF, FONT_OPTIONS, COLOR_PALETTES } from '../data/logoLibrary';

const palette = COLOR_PALETTES[0];
const displayFont = FONT_OPTIONS[0];
const taglineFont = FONT_OPTIONS[1] ?? FONT_OPTIONS[0];

test('buildResponsiveLockupArtboard creates properly sized responsive artboards linked to brand tokens', () => {
  const tokens = createDefaultBrandTokens(palette, displayFont, taglineFont);

  const primary = buildResponsiveLockupArtboard('primary-horizontal', DEFAULT_BRAND_BRIEF, tokens);
  assert.equal(primary.width, 800);
  assert.equal(primary.height, 600);
  assert.equal(primary.artboardRole, 'primary-horizontal');
  assert.equal(primary.backgroundToken, 'background');

  const badge = buildResponsiveLockupArtboard('stacked-badge', DEFAULT_BRAND_BRIEF, tokens, primary);
  assert.equal(badge.width, 800);
  assert.equal(badge.height, 800);
  assert.equal(badge.artboardRole, 'stacked-badge');

  const appIcon = buildResponsiveLockupArtboard('app-icon', DEFAULT_BRAND_BRIEF, tokens, primary);
  assert.equal(appIcon.width, 512);
  assert.equal(appIcon.height, 512);
  assert.equal(appIcon.artboardRole, 'app-icon');
  assert.ok(appIcon.layers.some((l) => l.fillToken === 'primary'));

  const banner = buildResponsiveLockupArtboard('social-banner', DEFAULT_BRAND_BRIEF, tokens, primary);
  assert.equal(banner.width, 1200);
  assert.equal(banner.height, 400);
  assert.equal(banner.artboardRole, 'social-banner');
  assert.ok(banner.layers.some((l) => l.type === 'text' && l.fontToken === 'display'));

  const duplicate = buildResponsiveLockupArtboard('custom', DEFAULT_BRAND_BRIEF, tokens, banner);
  assert.equal(duplicate.width, 1200);
  assert.equal(duplicate.height, 400);
  assert.notEqual(duplicate.id, banner.id);
});

test('layoutArtboardsSideBySide, resetArtboardPositions, and computeWorldBounds position artboards without overlap', () => {
  const tokens = createDefaultBrandTokens(palette, displayFont, taglineFont);
  const a1 = buildResponsiveLockupArtboard('primary-horizontal', DEFAULT_BRAND_BRIEF, tokens);
  const a2 = buildResponsiveLockupArtboard('app-icon', DEFAULT_BRAND_BRIEF, tokens, a1);
  const a3 = buildResponsiveLockupArtboard('social-banner', DEFAULT_BRAND_BRIEF, tokens, a1);

  const positioned = layoutArtboardsSideBySide([a1, a2, a3]);
  assert.equal(positioned[0].x, 0);
  assert.equal(positioned[1].x, 800 + ARTBOARD_GAP_PX);
  assert.equal(positioned[2].x, 800 + ARTBOARD_GAP_PX + 512 + ARTBOARD_GAP_PX);
  assert.equal(positioned[1].y, Math.round((600 - 512) / 2));
  assert.equal(positioned[2].y, Math.round((600 - 400) / 2));

  const bounds = computeWorldBounds(positioned);
  assert.equal(bounds.minX, 0);
  assert.equal(bounds.maxX, positioned[2].x + 1200);
  assert.equal(bounds.height, 600);

  const reset = resetArtboardPositions([
    { ...a1, canvasX: 999, canvasY: 999 },
    { ...a2, canvasX: -500, canvasY: 400 },
  ]);
  assert.equal(reset[0].canvasX, 0);
  assert.equal(reset[1].canvasX, 800 + ARTBOARD_GAP_PX);
});
