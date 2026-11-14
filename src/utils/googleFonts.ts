import { FontOption } from '../types/logo';

const loadedFamilies = new Set<string>();
const pendingFamilies = new Map<string, Promise<void>>();

/**
 * Normalizes a font family name for Google Fonts CSS2 URL parameters.
 */
function toGoogleFamilyParam(familyName: string, weights: number[]): string {
  const clean = familyName.replace(/['"]/g, '').trim();
  const encoded = encodeURIComponent(clean).replace(/%20/g, '+');
  const uniqueWeights = Array.from(
    new Set(weights.length > 0 ? weights : [400, 500, 600, 700, 800])
  ).sort((a, b) => a - b);

  // Include both normal (0) and italic (1) tuples so fontStyle toggles work dynamically
  const tuples: string[] = [];
  for (const italic of [0, 1]) {
    for (const w of uniqueWeights) {
      tuples.push(`${italic},${w}`);
    }
  }
  return `family=${encoded}:ital,wght@${tuples.join(';')}`;
}

/**
 * Dynamically injects a Google Fonts CSS2 <link> stylesheet into document.head
 * and resolves once the font faces are ready via the CSS Font Loading API.
 */
export function loadGoogleFont(
  familyName: string,
  weights: number[] = [400, 500, 600, 700, 800]
): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const cleanName = familyName.replace(/['"]/g, '').trim();
  if (!cleanName) return Promise.resolve();

  const key = `${cleanName.toLowerCase()}:${weights.join(',')}`;
  if (loadedFamilies.has(key)) return Promise.resolve();
  const existingPromise = pendingFamilies.get(key);
  if (existingPromise) return existingPromise;

  const linkId = `gf-dyn-${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  const promise = new Promise<void>((resolve) => {
    const existingLink = document.getElementById(linkId) as HTMLLinkElement | null;
    if (existingLink) {
      loadedFamilies.add(key);
      if (document.fonts?.load) {
        void document.fonts.load(`700 24px "${cleanName}"`).catch(() => undefined);
      }
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${toGoogleFamilyParam(cleanName, weights)}&display=swap`;

    const finish = () => {
      loadedFamilies.add(key);
      if (document.fonts?.load) {
        Promise.all([
          document.fonts.load(`400 24px "${cleanName}"`),
          document.fonts.load(`700 24px "${cleanName}"`),
        ])
          .catch(() => undefined)
          .finally(() => resolve());
      } else {
        resolve();
      }
    };

    link.onload = finish;
    link.onerror = () => {
      // Retry without italic/multi-weight tuple for single-weight display/script fonts
      const fallback = document.createElement('link');
      fallback.id = `${linkId}-fallback`;
      fallback.rel = 'stylesheet';
      const encoded = encodeURIComponent(cleanName).replace(/%20/g, '+');
      fallback.href = `https://fonts.googleapis.com/css2?family=${encoded}&display=swap`;
      fallback.onload = () => {
        loadedFamilies.add(key);
        resolve();
      };
      fallback.onerror = () => resolve();
      document.head.appendChild(fallback);
    };

    document.head.appendChild(link);
  }).finally(() => {
    pendingFamilies.delete(key);
  });

  pendingFamilies.set(key, promise);
  return promise;
}

/**
 * Ensures an existing FontOption from the studio library is dynamically loaded.
 */
export function ensureFontOptionLoaded(font: FontOption): Promise<void> {
  return loadGoogleFont(font.name, font.weights);
}

/**
 * Batch-loads a list of Google Fonts in a single CSS2 stylesheet request so
 * live font-preview dropdowns render every item in its true typeface.
 */
export function batchLoadGoogleFonts(fonts: FontOption[]): void {
  if (typeof document === 'undefined' || fonts.length === 0) return;

  const missing = fonts.filter(
    (f) => !loadedFamilies.has(`${f.name.toLowerCase()}:batch`)
  );
  if (missing.length === 0) return;

  // Chunk into groups of 12 to keep URL length safe
  for (let i = 0; i < missing.length; i += 12) {
    const slice = missing.slice(i, i + 12);
    const params = slice
      .map((f) => {
        const encoded = encodeURIComponent(f.name).replace(/%20/g, '+');
        const ws = Array.from(new Set(f.weights)).sort((a, b) => a - b);
        return ws.length > 1 ? `family=${encoded}:wght@${ws.join(';')}` : `family=${encoded}`;
      })
      .join('&');

    const batchId = `gf-batch-${slice.map((s) => s.id).join('-')}`;
    if (!document.getElementById(batchId)) {
      const link = document.createElement('link');
      link.id = batchId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?${params}&display=swap`;
      document.head.appendChild(link);
    }

    slice.forEach((f) => loadedFamilies.add(`${f.name.toLowerCase()}:batch`));
  }
}

/**
 * Creates a dynamic FontOption for any arbitrary Google Font family entered by the user.
 */
export function createDynamicGoogleFontOption(rawName: string): FontOption {
  const formattedName = rawName
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const id = `gf-${formattedName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return {
    id,
    name: formattedName,
    cssFamily: `'${formattedName}', sans-serif`,
    category: 'Display',
    weights: [400, 500, 600, 700, 800],
    ttfUrl: '',
  };
}
