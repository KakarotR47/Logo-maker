import { BrandBrief, LogoDocument, LogoProject } from '../types/logo';
import { nextLayerId } from './logoGenerator';

export const PROJECTS_STORAGE_KEY = 'forma-logo-projects-v1';
export const ACTIVE_SESSION_STORAGE_KEY = 'forma-logo-active-session-v1';

export interface ActiveSessionSnapshot {
  activeProjectId: string | null;
  brief: BrandBrief;
  document: LogoDocument;
  updatedAt: string;
}

function isValidDocument(doc: unknown): doc is LogoDocument {
  if (!doc || typeof doc !== 'object') return false;
  const candidate = doc as Partial<LogoDocument>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.width === 'number' &&
    candidate.width > 0 &&
    typeof candidate.height === 'number' &&
    candidate.height > 0 &&
    Array.isArray(candidate.layers)
  );
}

function isValidBrief(brief: unknown): brief is BrandBrief {
  if (!brief || typeof brief !== 'object') return false;
  const candidate = brief as Partial<BrandBrief>;
  return (
    typeof candidate.businessName === 'string' &&
    typeof candidate.paletteId === 'string' &&
    typeof candidate.style === 'string'
  );
}

export function loadSavedProjects(): LogoProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is LogoProject =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.updatedAt === 'string' &&
        isValidBrief(item.brief) &&
        isValidDocument(item.document)
    );
  } catch {
    return [];
  }
}

export function persistSavedProjects(projects: LogoProject[]): boolean {
  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    return true;
  } catch {
    return false;
  }
}

export function loadActiveSession(): ActiveSessionSnapshot | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ActiveSessionSnapshot>;
    if (!parsed || !isValidBrief(parsed.brief) || !isValidDocument(parsed.document)) {
      return null;
    }
    return {
      activeProjectId: typeof parsed.activeProjectId === 'string' ? parsed.activeProjectId : null,
      brief: parsed.brief,
      document: parsed.document,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function persistActiveSession(snapshot: ActiveSessionSnapshot): boolean {
  try {
    localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

/**
 * Deep-clones a LogoDocument with fresh document and layer IDs so duplicated
 * projects never share mutable references or colliding SVG gradient/filter IDs.
 */
export function cloneDocumentForProject(
  doc: LogoDocument,
  nextTitle?: string
): LogoDocument {
  const cloned = JSON.parse(JSON.stringify(doc)) as LogoDocument;
  const groupIdMap = new Map<string, string>();
  const remappedGroups = cloned.groups?.map((g) => {
    const freshId = nextLayerId('grp');
    groupIdMap.set(g.id, freshId);
    return { ...g, id: freshId };
  });

  return {
    ...cloned,
    id: nextLayerId('doc'),
    title: nextTitle ?? cloned.title,
    groups: remappedGroups,
    layers: cloned.layers.map((layer) => ({
      ...layer,
      id: nextLayerId(layer.type),
      groupId: layer.groupId ? (groupIdMap.get(layer.groupId) ?? layer.groupId) : undefined,
    })),
  };
}
