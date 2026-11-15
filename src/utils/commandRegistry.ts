export type StudioCommandCategory =
  | 'Print & Pre-Press'
  | 'Align & Transform'
  | 'Layers & Vector'
  | 'Canvas & Artboards'
  | 'Export & Studio';

export interface StudioCommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: StudioCommandCategory;
  shortcut?: string;
  keywords: string[];
  active?: boolean;
  disabled?: boolean;
  badge?: string;
  run: () => void;
}

/**
 * Scores and filters studio commands for the Spotlight Command Palette (Ctrl/Cmd+K).
 */
export function searchStudioCommands(
  commands: StudioCommandItem[],
  query: string
): StudioCommandItem[] {
  const clean = query.trim().toLowerCase();
  if (!clean) {
    return commands;
  }

  const tokens = clean.split(/\s+/).filter(Boolean);

  const scored: Array<{ cmd: StudioCommandItem; score: number }> = [];

  for (const cmd of commands) {
    const titleLower = cmd.title.toLowerCase();
    const subtitleLower = (cmd.subtitle ?? '').toLowerCase();
    const categoryLower = cmd.category.toLowerCase();
    const keywordJoined = cmd.keywords.join(' ').toLowerCase();
    const haystack = `${titleLower} ${subtitleLower} ${categoryLower} ${keywordJoined}`;

    // Every token must match somewhere in the command metadata
    const allMatch = tokens.every((t) => haystack.includes(t));
    if (!allMatch) continue;

    let score = 0;
    if (titleLower === clean) score += 100;
    else if (titleLower.startsWith(clean)) score += 60;
    else if (titleLower.includes(clean)) score += 35;

    for (const token of tokens) {
      if (titleLower.startsWith(token)) score += 20;
      else if (titleLower.includes(token)) score += 12;
      if (cmd.keywords.some((kw) => kw.toLowerCase().startsWith(token))) score += 10;
      else if (keywordJoined.includes(token)) score += 6;
      if (categoryLower.includes(token)) score += 4;
    }

    if (!cmd.disabled) score += 8;

    scored.push({ cmd, score });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.cmd.title.localeCompare(b.cmd.title);
  });

  return scored.map((entry) => entry.cmd);
}
