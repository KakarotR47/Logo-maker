import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const STYLE_DIRECTIVES: Record<string, string> = {
  'flat-silhouette':
    'ultra-clean solid black flat vector silhouette mark, bold minimal geometry, high contrast, sharp crisp edges',
  'geometric-line':
    'minimalist geometric monoline vector emblem, uniform crisp thick black strokes, symmetrical construction',
  'emblem-badge':
    'minimalist modern heraldic stamp emblem mark in solid flat black ink, bold clean cutouts',
  'monogram-mark':
    'minimalist geometric interlocking abstract monogram icon, solid flat dark ink, clean negative space',
};

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseGeminiError(err: unknown): { status: number; message: string } {
  const rawMessage = err instanceof Error ? err.message : String(err ?? 'Unknown error');
  const lower = rawMessage.toLowerCase();

  if (
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('400')
  ) {
    return {
      status: 400,
      message:
        'The configured GEMINI_API_KEY appears invalid. Please verify or update it in Settings > Secrets.',
    };
  }
  if (lower.includes('permission_denied') || lower.includes('403')) {
    return {
      status: 403,
      message:
        'Permission denied by Gemini API. Please check your billing-enabled API key in Settings > Secrets.',
    };
  }
  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return {
      status: 429,
      message:
        'Gemini API quota exceeded. Check your paid API key tier or quota limits in Settings > Secrets.',
    };
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return {
      status: 404,
      message: `Requested Gemini model was not found or unavailable: ${rawMessage}`,
    };
  }

  return {
    status: 500,
    message: rawMessage || 'Failed to generate AI logo symbol.',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/ai/status', (_req, res) => {
    res.json({
      configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      imageModel: 'gemini-3.1-flash-lite-image',
      textModel: 'gemini-4-hydrogen',
    });
  });

  app.post('/api/ai/generate-symbol', async (req, res) => {
    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured on the server. Add or select your API key in Settings > Secrets.',
      });
      return;
    }

    const body = req.body as {
      prompt?: string;
      styleMode?: string;
      brandName?: string;
      industry?: string;
    };

    const userPrompt = String(body?.prompt ?? '').trim();
    if (!userPrompt) {
      res.status(400).json({ error: 'Please enter a symbol prompt before generating.' });
      return;
    }

    const styleDirective =
      STYLE_DIRECTIVES[String(body?.styleMode ?? 'flat-silhouette')] ??
      STYLE_DIRECTIVES['flat-silhouette'];

    const brandContext = body?.brandName?.trim()
      ? ` for brand "${body.brandName.trim()}"`
      : '';
    const industryContext = body?.industry?.trim() ? ` (${body.industry.trim()})` : '';

    const composedPrompt = [
      `Create a single isolated minimalist 2D logo symbol icon${brandContext}${industryContext}: ${userPrompt}.`,
      `Visual style: ${styleDirective}.`,
      'Composition: centered icon filling 70% of a pure solid #FFFFFF white background, clean crisp sharp vector edges, solid dark ink shapes with clear negative space.',
      'Strictly avoid: text, letters, words, watermarks, mockups, paper texture, drop shadows, gradients, 3D lighting, or complex backgrounds.',
    ].join(' ');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: composedPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: '1:1',
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      let imageDataUrl: string | null = null;
      let notes = '';

      for (const part of parts) {
        if (part.inlineData?.data && !imageDataUrl) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageDataUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          notes += `${part.text} `;
        }
      }

      if (!imageDataUrl) {
        res.status(502).json({
          error:
            notes.trim() ||
            'Gemini returned no image data for this prompt. Try simplifying your symbol description.',
        });
        return;
      }

      res.json({
        imageDataUrl,
        model: 'gemini-3.1-flash-lite-image',
        promptUsed: composedPrompt,
      });
    } catch (err) {
      const parsed = parseGeminiError(err);
      res.status(parsed.status).json({ error: parsed.message });
    }
  });

  app.post('/api/ai/suggest-concepts', async (req, res) => {
    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured on the server. Add or select your API key in Settings > Secrets.',
      });
      return;
    }

    const body = req.body as {
      prompt?: string;
      businessName?: string;
      tagline?: string;
      industry?: string;
    };

    const prompt = String(body?.prompt ?? '').trim();
    if (!prompt) {
      res.status(400).json({ error: 'Please describe your brand or symbol idea first.' });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          `Design 3 distinct logo identity directions based on this creative brief:`,
          `Prompt: ${prompt}`,
          body?.businessName ? `Brand Name: ${body.businessName}` : '',
          body?.tagline ? `Tagline: ${body.tagline}` : '',
          body?.industry ? `Industry: ${body.industry}` : '',
          `Allowed paletteId values: emerald-gold, obsidian-amber, cobalt-chalk, terracotta-sand, plum-champagne, slate-mint, crimson-ivory, indigo-cyan.`,
          `Allowed style values: minimalist, modern, geometric, vintage, 3d, monogram.`,
          `For each direction, craft a concise vector-friendly symbolPrompt (e.g. "minimalist geometric fox head, flat vector silhouette, pure white background").`,
        ]
          .filter(Boolean)
          .join('\n'),
        config: {
          systemInstruction:
            'You are a senior brand identity director. Return concise, practical vector logo directions adhering strictly to the schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: 'Short concept direction title' },
                businessName: { type: Type.STRING, description: 'Brand wordmark' },
                tagline: { type: Type.STRING, description: 'Concise 2-5 word tagline' },
                symbolPrompt: {
                  type: Type.STRING,
                  description: 'Flat crisp vector symbol generation prompt on white background',
                },
                paletteId: { type: Type.STRING, description: 'One of the allowed paletteId strings' },
                style: { type: Type.STRING, description: 'One of the allowed style strings' },
                rationale: { type: Type.STRING, description: 'One sentence rationale' },
              },
              required: [
                'title',
                'businessName',
                'tagline',
                'symbolPrompt',
                'paletteId',
                'style',
                'rationale',
              ],
            },
          },
        },
      });

      const rawText = (response.text ?? '[]').trim();
      const suggestions = JSON.parse(rawText);
      res.json({
        suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 3) : [],
        model: 'gemini-4-hydrogen',
      });
    } catch (err) {
      const parsed = parseGeminiError(err);
      res.status(parsed.status).json({ error: parsed.message });
    }
  });

  if (!IS_PRODUCTION) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Forma Studio server running at http://0.0.0.0:${PORT}`);
  });
}

void startServer();
