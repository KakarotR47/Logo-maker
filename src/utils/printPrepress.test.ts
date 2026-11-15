import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCmykSoftProofToDocument,
  auditDocumentPrintGamut,
  computeClearSpaceMetrics,
  simulateCmykProofColor,
  snapDocumentToPrintGamut,
} from './printPrepress';
import { LogoDocument } from '../types/logo';

function makeTestDoc(overrides?: Partial<LogoDocument>): LogoDocument {
  return {
    id: 'doc-1',
    title: 'Test Logo',
    width: 800,
    height: 600,
    backgroundColor: '#FFFFFF',
    transparentBackground: false,
    layers: [
      {
        id: 'icon-1',
        type: 'icon',
        name: 'Primary Symbol',
        iconId: 'leaf-circuit',
        x: 200,
        y: 220,
        width: 120,
        height: 120,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        fill: '#00FF66',
        secondaryFill: '#1B4332',
        accentFill: '#1B4332',
        stroke: 'none',
        strokeWidth: 0,
        shadow: { enabled: false, color: '#000000', blur: 0, offsetX: 0, offsetY: 0 },
      },
      {
        id: 'text-1',
        type: 'text',
        name: 'Brand Wordmark',
        text: 'NEON LABS',
        fontId: 'syne',
        fontFamily: 'Syne, sans-serif',
        fontSize: 48,
        fontWeight: 700,
        fontStyle: 'normal',
        letterSpacing: 0.02,
        lineHeight: 1.1,
        textAlign: 'left',
        uppercase: false,
        curveRadius: 0,
        x: 350,
        y: 250,
        width: 320,
        height: 70,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        fill: '#1B4332',
        stroke: 'none',
        strokeWidth: 0,
        shadow: { enabled: false, color: '#000000', blur: 0, offsetX: 0, offsetY: 0 },
      },
    ],
    ...overrides,
  };
}

test('simulateCmykProofColor flags bright neon RGB colors as out-of-gamut and keeps earth tones in gamut', () => {
  const neonGreen = simulateCmykProofColor('#00FF66');
  assert.equal(neonGreen.isOutOfGamut, true);
  assert.equal(neonGreen.severity, 'critical');
  assert.ok(neonGreen.deltaE >= 15);
  assert.notEqual(neonGreen.proofHex, '#00FF66');

  const neonMagenta = simulateCmykProofColor('#FF00FF');
  assert.equal(neonMagenta.isOutOfGamut, true);
  assert.ok(neonMagenta.deltaE >= 15);

  const forest = simulateCmykProofColor('#1B4332');
  assert.equal(forest.isOutOfGamut, false);
  assert.equal(forest.severity, 'ok');
});

test('auditDocumentPrintGamut identifies out-of-gamut swatches and affected layer IDs', () => {
  const doc = makeTestDoc();
  const report = auditDocumentPrintGamut(doc);

  assert.equal(report.hasOutOfGamut, true);
  assert.equal(report.outOfGamutSwatches.length, 1);
  assert.equal(report.outOfGamutSwatches[0].sourceHex, '#00FF66');
  assert.deepEqual(report.outOfGamutLayerIds, ['icon-1']);
});

test('applyCmykSoftProofToDocument transforms colors non-destructively and snapDocumentToPrintGamut fixes out-of-gamut layers', () => {
  const doc = makeTestDoc();
  const proofDoc = applyCmykSoftProofToDocument(doc);

  assert.notEqual(proofDoc.layers[0].fill, '#00FF66');
  // Original stays untouched
  assert.equal(doc.layers[0].fill, '#00FF66');

  const snapped = snapDocumentToPrintGamut(doc);
  assert.notEqual(snapped.layers[0].fill, '#00FF66');
  // In-gamut forest green should be unchanged
  assert.equal(snapped.layers[1].fill, '#1B4332');

  const afterAudit = auditDocumentPrintGamut(snapped);
  assert.equal(afterAudit.hasOutOfGamut, false);
  assert.equal(afterAudit.outOfGamutSwatches.length, 0);
});

test('computeClearSpaceMetrics computes artwork bounds and 1x clear-space box', () => {
  const doc = makeTestDoc();
  const metrics = computeClearSpaceMetrics(doc);
  assert.ok(metrics !== null);
  assert.equal(metrics.artMinX, 200);
  assert.equal(metrics.artMinY, 220);
  assert.equal(metrics.artMaxX, 670);
  assert.equal(metrics.artMaxY, 340);
  assert.ok(metrics.unit >= 20 && metrics.unit <= 84);
  assert.equal(metrics.boxX, metrics.artMinX - metrics.unit);
  assert.equal(metrics.boxY, metrics.artMinY - metrics.unit);
  assert.equal(metrics.overflowsArtboard, false);
});
