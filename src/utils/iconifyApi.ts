export interface IconifySearchResult {
  id: string; // e.g. "lucide:crown"
  prefix: string;
  name: string;
}

const searchCache = new Map<string, IconifySearchResult[]>();
const svgCache = new Map<string, string>();

export const ICONIFY_COLLECTIONS: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'All Collections' },
  { id: 'lucide', label: 'Lucide' },
  { id: 'tabler', label: 'Tabler' },
  { id: 'solar', label: 'Solar Duotone' },
  { id: 'ph', label: 'Phosphor' },
  { id: 'flat-color-icons', label: 'Multi-Color' },
];

/**
 * Searches the public Iconify API for vector SVG icons matching a query.
 */
export async function searchIconifyIcons(
  query: string,
  collection = 'all',
  limit = 30
): Promise<IconifySearchResult[]> {
  const clean = query.trim();
  if (!clean) return [];

  const cacheKey = `${collection}:${clean.toLowerCase()}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    query: clean,
    limit: String(limit),
  });
  if (collection !== 'all') {
    params.set('prefix', collection);
  } else {
    params.set('prefixes', 'lucide,tabler,solar,ph,flat-color-icons,mdi');
  }

  const res = await fetch(`https://api.iconify.design/search?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Iconify search failed (${res.status})`);
  }

  const data = (await res.json()) as { icons?: string[] };
  const results: IconifySearchResult[] = (data.icons ?? []).map((fullId) => {
    const [prefix, name] = fullId.split(':');
    return {
      id: fullId,
      prefix: prefix || 'lucide',
      name: name || fullId,
    };
  });

  searchCache.set(cacheKey, results);
  return results;
}

/**
 * Fetches the raw standalone SVG XML for a given Iconify icon ID (e.g. "lucide:crown").
 */
export async function fetchIconifySvg(iconId: string): Promise<string> {
  const cached = svgCache.get(iconId);
  if (cached) return cached;

  const [prefix, name] = iconId.split(':');
  if (!prefix || !name) {
    throw new Error('Invalid Iconify icon identifier');
  }

  const res = await fetch(
    `https://api.iconify.design/${encodeURIComponent(prefix)}/${encodeURIComponent(name)}.svg`
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch icon SVG (${res.status})`);
  }
  const svgText = await res.text();
  svgCache.set(iconId, svgText);
  return svgText;
}

/**
 * Returns the fast preview image URL for an Iconify icon result.
 */
export function getIconifyPreviewUrl(iconId: string, color = '#141413'): string {
  const [prefix, name] = iconId.split(':');
  return `https://api.iconify.design/${encodeURIComponent(prefix)}/${encodeURIComponent(name)}.svg?color=${encodeURIComponent(color)}`;
}
