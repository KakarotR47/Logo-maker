import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePort(): number {
  const portFlagIndex = process.argv.findIndex((arg) => arg === '--port' || arg === '-p');
  if (portFlagIndex !== -1 && process.argv[portFlagIndex + 1]) {
    const parsed = Number(process.argv[portFlagIndex + 1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const inlinePortArg = process.argv.find((arg) => arg.startsWith('--port='));
  if (inlinePortArg) {
    const parsed = Number(inlinePortArg.split('=')[1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 3000;
}

const PORT = resolvePort();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_VERCEL = Boolean(process.env.VERCEL);

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

const app = express();
app.use(express.json({ limit: '10mb' }));

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

  app.post('/api/ai/clean-sketch', async (req, res) => {
    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured on the server. Add or select your API key in Settings > Secrets.',
      });
      return;
    }

    const body = req.body as {
      imageDataUrl?: string;
      mode?: 'vector-clean' | 'remove-bg';
      styleMode?: string;
      promptHint?: string;
    };

    const rawUrl = String(body?.imageDataUrl ?? '').trim();
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(rawUrl);
    if (!match) {
      res.status(400).json({ error: 'Please upload a valid PNG, JPEG, or WebP image.' });
      return;
    }

    const mimeType = match[1];
    const base64Data = match[2];
    const mode = body?.mode === 'remove-bg' ? 'remove-bg' : 'vector-clean';
    const hint = body?.promptHint?.trim() ? ` Additional guidance: ${body.promptHint.trim()}.` : '';

    const instruction =
      mode === 'remove-bg'
        ? [
            'Isolate the main logo mark or foreground emblem from this image and remove every background texture, gradient, scenery, grid, shadow, or surface clutter.',
            'Place the clean isolated subject centered on a pure uniform solid #FFFFFF white background with crisp sharp edges, keeping the subject colors intact.',
            hint,
          ].join(' ')
        : [
            'Convert this rough sketch, scan, or raster logo image into an ultra-clean, professional flat 2D vector-style graphic emblem.',
            'Smooth hand-drawn lines into crisp geometric curves, remove all paper grain, pencil smudges, shadows, noise, and background clutter.',
            'Render using at most 3 to 4 crisp flat solid colors (no photorealistic shading or gradients) centered on a pure solid #FFFFFF white background.',
            hint,
          ].join(' ');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            { text: instruction },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: '1:1',
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      let cleanedUrl: string | null = null;
      let notes = '';

      for (const part of parts) {
        if (part.inlineData?.data && !cleanedUrl) {
          const outMime = part.inlineData.mimeType ?? 'image/png';
          cleanedUrl = `data:${outMime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          notes += `${part.text} `;
        }
      }

      if (!cleanedUrl) {
        res.status(502).json({
          error: notes.trim() || 'Gemini could not return a cleaned image for this upload.',
        });
        return;
      }

      res.json({
        imageDataUrl: cleanedUrl,
        model: 'gemini-3.1-flash-lite-image',
        mode,
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

  app.post('/api/ai/remix-concepts', async (req, res) => {
    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured on the server. Add or select your API key in Settings > Secrets.',
      });
      return;
    }

    const body = req.body as {
      brandName?: string;
      tagline?: string;
      industry?: string;
      currentStyle?: string;
      symbolSummary?: string;
    };

    const brandName = String(body?.brandName ?? 'Studio Brand').trim();
    const tagline = String(body?.tagline ?? '').trim();
    const industry = String(body?.industry ?? 'Creative & Media').trim();
    const currentStyle = String(body?.currentStyle ?? 'modern').trim();
    const symbolSummary = String(body?.symbolSummary ?? 'geometric mark').trim();

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          `Create 6 distinct layout and color-harmony logo remixes for the existing brand "${brandName}".`,
          tagline ? `Tagline: ${tagline}` : '',
          `Industry: ${industry}. Current style: ${currentStyle}. Active symbol concept: ${symbolSummary}.`,
          `Rules:`,
          `- Use all 6 archetypes across the 6 items: icon-left, stacked, badge, wordmark, monogram-crest, split-emblem.`,
          `- Allowed style values: minimalist, modern, vintage, geometric, 3d, monogram.`,
          `- Allowed font IDs: outfit, plus-jakarta, syne, montserrat, space-grotesk, bricolage, playfair, bodoni, cinzel, fraunces, dm-sans, manrope, space-mono.`,
          `- Each remix must include a harmonious 5-hex color palette (background, primary, secondary, accent, text) with strong contrast between background and text/primary.`,
        ]
          .filter(Boolean)
          .join('\n'),
        config: {
          systemInstruction:
            'You are a world-class logo art director. Return exactly 6 creative logo layout & color harmony remixes strictly matching the JSON schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: 'Short 2-4 word remix title' },
                archetype: { type: Type.STRING, description: 'One of the 6 layout archetypes' },
                style: { type: Type.STRING, description: 'One of the allowed style strings' },
                primaryFontId: { type: Type.STRING, description: 'Font ID for wordmark' },
                secondaryFontId: { type: Type.STRING, description: 'Font ID for tagline' },
                rationale: { type: Type.STRING, description: 'One concise design rationale sentence' },
                palette: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    background: { type: Type.STRING, description: 'Hex color like #FFFFFF or #0F172A' },
                    primary: { type: Type.STRING, description: 'Hex color' },
                    secondary: { type: Type.STRING, description: 'Hex color' },
                    accent: { type: Type.STRING, description: 'Hex color' },
                    text: { type: Type.STRING, description: 'Contrasting hex color for text' },
                  },
                  required: ['name', 'background', 'primary', 'secondary', 'accent', 'text'],
                },
              },
              required: [
                'title',
                'archetype',
                'style',
                'primaryFontId',
                'secondaryFontId',
                'rationale',
                'palette',
              ],
            },
          },
        },
      });

      const rawText = (response.text ?? '[]').trim();
      const remixes = JSON.parse(rawText);
      res.json({
        remixes: Array.isArray(remixes) ? remixes.slice(0, 6) : [],
        model: 'gemini-4-hydrogen',
      });
    } catch (err) {
      const parsed = parseGeminiError(err);
      res.status(parsed.status).json({ error: parsed.message });
    }
  });

  app.post('/api/ai/brand-brainstorm', async (req, res) => {
    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured on the server. Add or select your API key in Settings > Secrets.',
      });
      return;
    }

    const body = req.body as {
      topic?: string;
      industry?: string;
      vibe?: string;
    };

    const topic = String(body?.topic ?? '').trim();
    if (!topic) {
      res.status(400).json({ error: 'Please enter what your business or product does.' });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          `Brainstorm 5 original, memorable brand identities for this concept:`,
          `Concept / Keywords: ${topic}`,
          body?.industry ? `Industry: ${body.industry}` : '',
          body?.vibe ? `Desired Vibe / Personality: ${body.vibe}` : '',
          `For each brand identity, generate:`,
          `- brandName (1-2 crisp memorable words)`,
          `- tagline (2-5 punchy words)`,
          `- symbolPrompt (a flat minimalist 2D vector icon prompt on white background)`,
          `- style (one of: minimalist, modern, geometric, vintage, 3d, monogram)`,
          `- psychologyMood (2-4 word color psychology label e.g. "Trust & Precision")`,
          `- psychologyNote (1 sentence explaining why this color harmony fits the brand)`,
          `- palette (5 contrasting hex codes: name, background, primary, secondary, accent, text)`,
        ]
          .filter(Boolean)
          .join('\n'),
        config: {
          systemInstruction:
            'You are a brand naming strategist and color psychologist. Return 5 distinct, trademark-friendly brand packages strictly adhering to the JSON schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                brandName: { type: Type.STRING },
                tagline: { type: Type.STRING },
                symbolPrompt: { type: Type.STRING },
                style: { type: Type.STRING },
                psychologyMood: { type: Type.STRING },
                psychologyNote: { type: Type.STRING },
                palette: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    background: { type: Type.STRING },
                    primary: { type: Type.STRING },
                    secondary: { type: Type.STRING },
                    accent: { type: Type.STRING },
                    text: { type: Type.STRING },
                  },
                  required: ['name', 'background', 'primary', 'secondary', 'accent', 'text'],
                },
              },
              required: [
                'brandName',
                'tagline',
                'symbolPrompt',
                'style',
                'psychologyMood',
                'psychologyNote',
                'palette',
              ],
            },
          },
        },
      });

      const rawText = (response.text ?? '[]').trim();
      const brands = JSON.parse(rawText);
      res.json({
        brands: Array.isArray(brands) ? brands.slice(0, 5) : [],
        model: 'gemini-4-hydrogen',
      });
    } catch (err) {
      const parsed = parseGeminiError(err);
      res.status(parsed.status).json({ error: parsed.message });
    }
  });

async function startServer() {
  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
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

if (!IS_VERCEL) {
  void startServer();
}

export default app;
