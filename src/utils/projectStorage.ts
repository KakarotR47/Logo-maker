import { BrandBrief, BrandTokens, LogoDocument, LogoProject } from '../types/logo';
import { nextLayerId } from './logoGenerator';

export const PROJECTS_STORAGE_KEY = 'forma-logo-projects-v1';
export const ACTIVE_SESSION_STORAGE_KEY = 'forma-logo-active-session-v1';

export interface ActiveSessionSnapshot {
  activeProjectId: string | null;
  brief: BrandBrief;
  document: LogoDocument;
  artboards?: LogoDocument[];
  activeArtboardIndex?: number;
  brandTokens?: BrandTokens;
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

function isValidBrandTokens(tokens: unknown): tokens is BrandTokens {
  if (!tokens || typeof tokens !== 'object') return false;
  const t = tokens as Partial<BrandTokens>;
  return (
    Boolean(t.colors?.primary?.hex) &&
    Boolean(t.colors?.secondary?.hex) &&
    Boolean(t.colors?.accent?.hex) &&
    Boolean(t.colors?.text?.hex) &&
    Boolean(t.colors?.background?.hex) &&
    Boolean(t.fonts?.display?.fontId) &&
    Boolean(t.fonts?.tagline?.fontId)
  );
}

export function loadSavedProjects(): LogoProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is LogoProject =>
          Boolean(item) &&
          typeof item.id === 'string' &&
          typeof item.name === 'string' &&
          typeof item.updatedAt === 'string' &&
          isValidBrief(item.brief) &&
          isValidDocument(item.document)
      )
      .map((item) => ({
        ...item,
        artboards:
          Array.isArray(item.artboards) && item.artboards.every(isValidDocument) && item.artboards.length > 0
            ? item.artboards
            : undefined,
        activeArtboardIndex:
          typeof item.activeArtboardIndex === 'number' && item.activeArtboardIndex >= 0
            ? item.activeArtboardIndex
            : undefined,
        brandTokens: isValidBrandTokens(item.brandTokens) ? item.brandTokens : undefined,
      }));
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
    const validArtboards =
      Array.isArray(parsed.artboards) && parsed.artboards.every(isValidDocument) && parsed.artboards.length > 0
        ? parsed.artboards
        : undefined;
    const validIndex =
      typeof parsed.activeArtboardIndex === 'number' &&
      parsed.activeArtboardIndex >= 0 &&
      (!validArtboards || parsed.activeArtboardIndex < validArtboards.length)
        ? parsed.activeArtboardIndex
        : 0;
    return {
      activeProjectId: typeof parsed.activeProjectId === 'string' ? parsed.activeProjectId : null,
      brief: parsed.brief,
      document: parsed.document,
      artboards: validArtboards,
      activeArtboardIndex: validIndex,
      brandTokens: isValidBrandTokens(parsed.brandTokens) ? parsed.brandTokens : undefined,
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

  const layerIdMap = new Map<string, string>();
  cloned.layers.forEach((layer) => {
    layerIdMap.set(layer.id, nextLayerId(layer.type));
  });

  return {
    ...cloned,
    id: nextLayerId('doc'),
    title: nextTitle ?? cloned.title,
    groups: remappedGroups,
    layers: cloned.layers.map((layer) => ({
      ...layer,
      id: layerIdMap.get(layer.id) ?? nextLayerId(layer.type),
      groupId: layer.groupId ? (groupIdMap.get(layer.groupId) ?? layer.groupId) : undefined,
      knockoutTargetId: layer.knockoutTargetId
        ? (layerIdMap.get(layer.knockoutTargetId) ?? layer.knockoutTargetId)
        : undefined,
      ...(layer.type === 'text' && layer.textPath?.targetLayerId
        ? {
            textPath: {
              ...layer.textPath,
              targetLayerId:
                layerIdMap.get(layer.textPath.targetLayerId) ?? layer.textPath.targetLayerId,
            },
          }
        : {}),
    })),
  };
}
