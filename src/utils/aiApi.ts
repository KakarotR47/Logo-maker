import { LogoStylePreset } from '../types/logo';

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

export interface AiConceptSuggestion {
  title: string;
  businessName: string;
  tagline: string;
  symbolPrompt: string;
  paletteId: string;
  style: LogoStylePreset;
  rationale: string;
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
