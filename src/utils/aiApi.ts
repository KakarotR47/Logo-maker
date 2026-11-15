import { COLOR_PALETTES, FONT_OPTIONS, FONT_PAIRINGS } from '../data/logoLibrary';
import { ColorPalette, LayoutArchetype, LogoStylePreset } from '../types/logo';

export type AiSymbolStyleMode =
  | 'flat-silhouette'
  | 'geometric-line'
  | 'emblem-badge'
  | 'monogram-mark';

export interface AiStatusResponse {
  configured: boolean;
  imageModel: string;
  textModel: string;
}

export interface AiGenerateSymbolResult {
  imageDataUrl: string;
  model: string;
  promptUsed: string;
}

export interface AiCleanSketchResult {
  imageDataUrl: string;
  model: string;
  mode: 'vector-clean' | 'remove-bg';
}

export interface AiConceptSuggestion {
  title: string;
  businessName: string;
  tagline: string;
  symbolPrompt: string;
  paletteId: string;
  style: LogoStylePreset;
  rationale: string;
}

export interface AiRemixSuggestion {
  title: string;
  archetype: LayoutArchetype;
  style: LogoStylePreset;
  primaryFontId: string;
  secondaryFontId: string;
  rationale: string;
  palette: ColorPalette;
}

export interface AiBrandBrainstormItem {
  brandName: string;
  tagline: string;
  symbolPrompt: string;
  style: LogoStylePreset;
  psychologyMood: string;
  psychologyNote: string;
  palette: ColorPalette;
}

const VALID_ARCHETYPES: LayoutArchetype[] = [
  'icon-left',
  'stacked',
  'badge',
  'wordmark',
  'monogram-crest',
  'split-emblem',
];

const VALID_STYLES: LogoStylePreset[] = [
  'minimalist',
  'modern',
  'vintage',
  'geometric',
  '3d',
  'monogram',
];

function sanitizeHex(hex: unknown, fallback: string): string {
  const s = String(hex ?? '').trim();
  return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(s) ? s.toUpperCase() : fallback;
}

function normalizeArchetype(val: unknown, idx: number): LayoutArchetype {
  const s = String(val ?? '').trim() as LayoutArchetype;
  return VALID_ARCHETYPES.includes(s) ? s : VALID_ARCHETYPES[idx % VALID_ARCHETYPES.length];
}

function normalizeStyle(val: unknown, fallback: LogoStylePreset = 'modern'): LogoStylePreset {
  const s = String(val ?? '').trim() as LogoStylePreset;
  return VALID_STYLES.includes(s) ? s : fallback;
}

function normalizeFontId(val: unknown, fallback: string): string {
  const s = String(val ?? '').trim();
  return FONT_OPTIONS.some((f) => f.id === s) ? s : fallback;
}

export async function fetchAiStatus(): Promise<AiStatusResponse> {
  const res = await fetch('/api/ai/status');
  if (!res.ok) {
    throw new Error('Unable to check AI studio status.');
  }
  return (await res.json()) as AiStatusResponse;
}

export async function generateAiSymbolImage(params: {
  prompt: string;
  styleMode?: AiSymbolStyleMode;
  brandName?: string;
  industry?: string;
}): Promise<AiGenerateSymbolResult> {
  const res = await fetch('/api/ai/generate-symbol', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = (await res.json()) as Partial<AiGenerateSymbolResult> & { error?: string };
  if (!res.ok || !data.imageDataUrl) {
    throw new Error(data.error || `Symbol generation failed (${res.status}).`);
  }

  return data as AiGenerateSymbolResult;
}

export async function cleanOrRemoveBgWithAi(params: {
  imageDataUrl: string;
  mode: 'vector-clean' | 'remove-bg';
  promptHint?: string;
}): Promise<AiCleanSketchResult> {
  const res = await fetch('/api/ai/clean-sketch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = (await res.json()) as Partial<AiCleanSketchResult> & { error?: string };
  if (!res.ok || !data.imageDataUrl) {
    throw new Error(data.error || `AI image processing failed (${res.status}).`);
  }

  return data as AiCleanSketchResult;
}

export async function suggestAiLogoConcepts(params: {
  prompt: string;
  businessName?: string;
  tagline?: string;
  industry?: string;
}): Promise<AiConceptSuggestion[]> {
  const res = await fetch('/api/ai/suggest-concepts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = (await res.json()) as {
    suggestions?: AiConceptSuggestion[];
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `Concept suggestion failed (${res.status}).`);
  }
  return data.suggestions ?? [];
}

function buildFallbackSixRemixes(seedNonce: number): AiRemixSuggestion[] {
  const titles = [
    'Editorial Lockup',
    'Totem Stack',
    'Heritage Seal',
    'Signature Type',
    'Monogram Crest',
    'Split Emblem',
  ];
  const rationales = [
    'Crisp horizontal lockup balancing your primary symbol with bold wordmark hierarchy.',
    'Centered vertical stack built for square app icons, social headers, and hero cards.',
    'Enclosed emblem badge creating instant stamp authority for packaging and merch.',
    'Refined typographic centerpiece pairing custom letterspacing with a signature rule.',
    'Initials-driven crest pairing a framed seal with full brand attribution.',
    'Framed split lockup uniting symbol, accent divider, and architectural typography.',
  ];

  return VALID_ARCHETYPES.map((archetype, idx) => {
    const pal = COLOR_PALETTES[(idx * 2 + seedNonce) % COLOR_PALETTES.length];
    const style = VALID_STYLES[(idx + seedNonce) % VALID_STYLES.length];
    const pairing = FONT_PAIRINGS[(idx + seedNonce) % FONT_PAIRINGS.length];
    return {
      title: titles[idx],
      archetype,
      style,
      primaryFontId: pairing.primaryFontId,
      secondaryFontId: pairing.secondaryFontId,
      rationale: rationales[idx],
      palette: { ...pal },
    };
  });
}

export async function generateAiLogoRemixes(params: {
  brandName: string;
  tagline?: string;
  industry?: string;
  currentStyle?: LogoStylePreset;
  symbolSummary?: string;
  seedNonce?: number;
}): Promise<{ remixes: AiRemixSuggestion[]; source: 'gemini' | 'studio' }> {
  try {
    const res = await fetch('/api/ai/remix-concepts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (res.status === 503) {
      return {
        remixes: buildFallbackSixRemixes(params.seedNonce ?? 0),
        source: 'studio',
      };
    }

    const data = (await res.json()) as {
      remixes?: Array<Partial<AiRemixSuggestion> & { palette?: Partial<ColorPalette> }>;
      error?: string;
    };

    if (!res.ok || !Array.isArray(data.remixes) || data.remixes.length === 0) {
      throw new Error(data.error || `Remix generation failed (${res.status}).`);
    }

    const sanitized: AiRemixSuggestion[] = data.remixes.slice(0, 6).map((item, idx) => {
      const fallbackPal = COLOR_PALETTES[(idx + 1) % COLOR_PALETTES.length];
      const fallbackPair = FONT_PAIRINGS[idx % FONT_PAIRINGS.length];
      return {
        title: String(item.title ?? `Remix ${idx + 1}`).trim(),
        archetype: normalizeArchetype(item.archetype, idx),
        style: normalizeStyle(item.style, VALID_STYLES[idx % VALID_STYLES.length]),
        primaryFontId: normalizeFontId(item.primaryFontId, fallbackPair.primaryFontId),
        secondaryFontId: normalizeFontId(item.secondaryFontId, fallbackPair.secondaryFontId),
        rationale: String(item.rationale ?? 'Balanced layout and color harmony remix.').trim(),
        palette: {
          id: `remix-pal-${Date.now()}-${idx}`,
          name: String(item.palette?.name ?? fallbackPal.name),
          background: sanitizeHex(item.palette?.background, fallbackPal.background),
          primary: sanitizeHex(item.palette?.primary, fallbackPal.primary),
          secondary: sanitizeHex(item.palette?.secondary, fallbackPal.secondary),
          accent: sanitizeHex(item.palette?.accent, fallbackPal.accent),
          text: sanitizeHex(item.palette?.text, fallbackPal.text),
        },
      };
    });

    return { remixes: sanitized, source: 'gemini' };
  } catch (err) {
    // Only fall back when network/AI endpoint is unconfigured; rethrow explicit validation/quota errors
    if (err instanceof TypeError) {
      return {
        remixes: buildFallbackSixRemixes(params.seedNonce ?? 0),
        source: 'studio',
      };
    }
    throw err;
  }
}

function buildFallbackBrandBrainstorm(params: {
  topic: string;
  industry?: string;
  vibe?: string;
}): AiBrandBrainstormItem[] {
  const words = params.topic
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  const root = (words[0] || 'Nova').replace(/^(.)/, (c) => c.toUpperCase());
  const rootShort = root.slice(0, 4);
  const vibe = params.vibe || 'Modern';

  const templates: Array<{
    brandName: string;
    tagline: string;
    symbolPrompt: string;
    style: LogoStylePreset;
    psychologyMood: string;
    psychologyNote: string;
    paletteIdx: number;
  }> = [
    {
      brandName: `${root}line`,
      tagline: `Precision ${vibe} Craft`,
      symbolPrompt: `minimalist geometric ${root.toLowerCase()} emblem, flat vector, white background`,
      style: 'minimalist',
      psychologyMood: 'Trust & Authority',
      psychologyNote: 'Deep slate and cobalt tones communicate reliability, clarity, and executive confidence.',
      paletteIdx: 2,
    },
    {
      brandName: `${rootShort}ia Studio`,
      tagline: 'Designed to Endure',
      symbolPrompt: `modern abstract monogram crest for ${root.toLowerCase()}, flat vector silhouette, white background`,
      style: 'modern',
      psychologyMood: 'Creative Energy',
      psychologyNote: 'Indigo-violet contrast sparks originality and forward-thinking brand recall.',
      paletteIdx: 4,
    },
    {
      brandName: `Verdant ${root}`,
      tagline: 'Pure Form, Real Impact',
      symbolPrompt: `minimalist botanical geometric mark for ${root.toLowerCase()}, flat vector, white background`,
      style: 'geometric',
      psychologyMood: 'Calm Growth',
      psychologyNote: 'Forest greens paired with warm neutral stone evoke balance, sustainability, and craft.',
      paletteIdx: 0,
    },
    {
      brandName: `${rootShort} Atelier`,
      tagline: 'Heritage Meets Tomorrow',
      symbolPrompt: `luxury heraldic emblem stamp for ${root.toLowerCase()}, clean vector lines, white background`,
      style: 'vintage',
      psychologyMood: 'Prestige & Warmth',
      psychologyNote: 'Obsidian ink and burnished gold accents signal exclusivity and timeless quality.',
      paletteIdx: 1,
    },
    {
      brandName: `Kineti${rootShort}`,
      tagline: 'Built for Momentum',
      symbolPrompt: `dynamic geometric prism icon for ${root.toLowerCase()}, bold flat vector, white background`,
      style: '3d',
      psychologyMood: 'Bold Momentum',
      psychologyNote: 'Teal and coral accents balance technical precision with approachable human warmth.',
      paletteIdx: 6,
    },
  ];

  return templates.map((t, idx) => ({
    brandName: t.brandName,
    tagline: t.tagline,
    symbolPrompt: t.symbolPrompt,
    style: t.style,
    psychologyMood: t.psychologyMood,
    psychologyNote: t.psychologyNote,
    palette: { ...COLOR_PALETTES[t.paletteIdx % COLOR_PALETTES.length], id: `psy-${Date.now()}-${idx}` },
  }));
}

export async function brainstormAiBrands(params: {
  topic: string;
  industry?: string;
  vibe?: string;
}): Promise<{ brands: AiBrandBrainstormItem[]; source: 'gemini' | 'studio' }> {
  try {
    const res = await fetch('/api/ai/brand-brainstorm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (res.status === 503) {
      return {
        brands: buildFallbackBrandBrainstorm(params),
        source: 'studio',
      };
    }

    const data = (await res.json()) as {
      brands?: Array<Partial<AiBrandBrainstormItem> & { palette?: Partial<ColorPalette> }>;
      error?: string;
    };

    if (!res.ok || !Array.isArray(data.brands) || data.brands.length === 0) {
      throw new Error(data.error || `Brand brainstorm failed (${res.status}).`);
    }

    const sanitized: AiBrandBrainstormItem[] = data.brands.slice(0, 5).map((item, idx) => {
      const fallbackPal = COLOR_PALETTES[idx % COLOR_PALETTES.length];
      return {
        brandName: String(item.brandName ?? `Brand ${idx + 1}`).trim(),
        tagline: String(item.tagline ?? 'Crafted Identity').trim(),
        symbolPrompt: String(
          item.symbolPrompt ?? 'minimalist geometric emblem, flat vector, white background'
        ).trim(),
        style: normalizeStyle(item.style, 'modern'),
        psychologyMood: String(item.psychologyMood ?? 'Balanced Harmony').trim(),
        psychologyNote: String(
          item.psychologyNote ?? 'Balanced color contrast engineered for digital and print clarity.'
        ).trim(),
        palette: {
          id: `brainstorm-pal-${Date.now()}-${idx}`,
          name: String(item.palette?.name ?? item.psychologyMood ?? fallbackPal.name),
          background: sanitizeHex(item.palette?.background, fallbackPal.background),
          primary: sanitizeHex(item.palette?.primary, fallbackPal.primary),
          secondary: sanitizeHex(item.palette?.secondary, fallbackPal.secondary),
          accent: sanitizeHex(item.palette?.accent, fallbackPal.accent),
          text: sanitizeHex(item.palette?.text, fallbackPal.text),
        },
      };
    });

    return { brands: sanitized, source: 'gemini' };
  } catch (err) {
    if (err instanceof TypeError) {
      return {
        brands: buildFallbackBrandBrainstorm(params),
        source: 'studio',
      };
    }
    throw err;
  }
}

