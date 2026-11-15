import test from 'node:test';
import assert from 'node:assert/strict';
import { searchStudioCommands, StudioCommandItem } from './commandRegistry';

const SAMPLE_COMMANDS: StudioCommandItem[] = [
  {
    id: 'proof-cmyk',
    title: 'Toggle Print Proof (CMYK)',
    subtitle: 'Simulate CMYK ink compression & flag out-of-gamut colors',
    category: 'Print & Pre-Press',
    keywords: ['cmyk', 'print', 'gamut', 'soft proof', 'ink'],
    run: () => {},
  },
  {
    id: 'toggle-crop-marks',
    title: 'Toggle Print Crop Marks',
    subtitle: 'Show corner trim lines & CMYK registration targets',
    category: 'Print & Pre-Press',
    keywords: ['crop', 'trim', 'registration', 'prepress'],
    run: () => {},
  },
  {
    id: 'align-center-h',
    title: 'Align Center Horizontally',
    category: 'Align & Transform',
    keywords: ['align', 'center', 'horizontal'],
    run: () => {},
  },
  {
    id: 'open-export',
    title: 'Open Export Studio',
    subtitle: 'Export SVG, PNG, PDF Brand Book & Favicons',
    category: 'Export & Studio',
    shortcut: 'Cmd+E',
    keywords: ['export', 'svg', 'png', 'pdf', 'download'],
    run: () => {},
  },
];

test('searchStudioCommands returns all commands when query is empty', () => {
  const res = searchStudioCommands(SAMPLE_COMMANDS, '');
  assert.equal(res.length, 4);
});

test('searchStudioCommands matches multi-token queries and ranks best hits first', () => {
  const cmykHits = searchStudioCommands(SAMPLE_COMMANDS, 'cmyk proof');
  assert.equal(cmykHits[0]?.id, 'proof-cmyk');

  const alignHits = searchStudioCommands(SAMPLE_COMMANDS, 'align center');
  assert.equal(alignHits[0]?.id, 'align-center-h');

  const cropHits = searchStudioCommands(SAMPLE_COMMANDS, 'trim');
  assert.equal(cropHits[0]?.id, 'toggle-crop-marks');

  const noHits = searchStudioCommands(SAMPLE_COMMANDS, 'zzzzzz');
  assert.equal(noHits.length, 0);
});
