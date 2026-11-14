import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FolderOpen,
  FolderPlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import {
  BrandBrief,
  ColorPalette,
  LogoDocument,
  LogoProject,
} from '../types/logo';
import { LogoDocumentSvg } from './CanvasLayerRenderer';

type ProjectSortMode = 'updated-desc' | 'created-desc' | 'name-asc';

interface ProjectsDashboardProps {
  projects: LogoProject[];
  activeProjectId: string | null;
  activeDoc: LogoDocument;
  activePalette: ColorPalette;
  brief: BrandBrief;
  autoSaveState: 'saved' | 'saving';
  onSaveCurrentAsProject: (name?: string) => void;
  onNewBlankProject: () => void;
  onOpenWizard: () => void;
  onOpenProject: (project: LogoProject) => void;
  onRenameProject: (id: string, nextName: string) => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onExportProject: (project: LogoProject) => void;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

export const ProjectsDashboard: React.FC<ProjectsDashboardProps> = ({
  projects,
  activeProjectId,
  activeDoc,
  activePalette,
  brief,
  autoSaveState,
  onSaveCurrentAsProject,
  onNewBlankProject,
  onOpenWizard,
  onOpenProject,
  onRenameProject,
  onDuplicateProject,
  onDeleteProject,
  onExportProject,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<ProjectSortMode>('updated-desc');
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? projects.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.brief.businessName.toLowerCase().includes(q) ||
            p.brief.industry.toLowerCase().includes(q) ||
            p.brief.tagline.toLowerCase().includes(q)
        )
      : [...projects];

    list.sort((a, b) => {
      if (sortMode === 'name-asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortMode === 'created-desc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return list;
  }, [projects, searchQuery, sortMode]);

  const handleOpenSavePrompt = () => {
    setNewProjectName(
      brief.businessName?.trim() || activeDoc.title?.trim() || 'Untitled Logo'
    );
    setSavePromptOpen(true);
  };

  const handleSubmitSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCurrentAsProject(newProjectName.trim() || undefined);
    setSavePromptOpen(false);
    setNewProjectName('');
  };

  const startRename = (project: LogoProject) => {
    setConfirmDeleteId(null);
    setRenamingId(project.id);
    setRenameDraft(project.name);
  };

  const commitRename = (id: string) => {
    const trimmed = renameDraft.trim();
    if (trimmed) {
      onRenameProject(id, trimmed);
    }
    setRenamingId(null);
    setRenameDraft('');
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Top Studio Header & Active Session Summary */}
      <section className="rounded-2xl border border-[#DCD9D0] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="h-16 w-20 sm:h-20 sm:w-28 shrink-0 overflow-hidden rounded-xl border border-[#DCD9D0]"
              style={
                activeDoc.transparentBackground
                  ? {
                      backgroundImage:
                        'linear-gradient(45deg, #eceae2 25%, transparent 25%), linear-gradient(-45deg, #eceae2 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eceae2 75%), linear-gradient(-45deg, transparent 75%, #eceae2 75%)',
                      backgroundSize: '14px 14px',
                      backgroundPosition: '0 0, 0 7px, 7px -7px, -7px 0',
                      backgroundColor: '#f7f5ef',
                    }
                  : { backgroundColor: activeDoc.backgroundColor }
              }
            >
              <LogoDocumentSvg
                doc={activeDoc}
                idPrefix="projects-current-session"
                className="h-full w-full block"
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1B4332]">
                  My Projects
                </p>
                <span className="rounded-md bg-[#F3F1EB] px-2 py-0.5 text-[10.5px] font-medium text-[#5C5951]">
                  {autoSaveState === 'saving' ? 'Auto-saving…' : 'Local auto-save active'}
                </span>
              </div>
              <h1 className="font-display mt-1 text-xl sm:text-2xl font-bold text-[#141413] truncate">
                {activeProject
                  ? activeProject.name
                  : `${brief.businessName || 'Untitled'} (Active Draft)`}
              </h1>
              <p className="mt-0.5 text-xs text-[#5C5951]">
                {activeDoc.layers.length} layers · {activeDoc.width}×{activeDoc.height}px ·{' '}
                <span
                  className="inline-block h-2 w-2 rounded-full align-middle mr-1"
                  style={{ backgroundColor: activePalette.primary }}
                />
                {activePalette.name}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenSavePrompt}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B4332] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#143326] transition-colors cursor-pointer whitespace-nowrap"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              Save Current Canvas
            </button>

            <button
              type="button"
              onClick={onNewBlankProject}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCD9D0] bg-white px-3.5 py-2 text-xs font-semibold text-[#141413] hover:bg-[#F3F1EB] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              New Blank Logo
            </button>

            <button
              type="button"
              onClick={onOpenWizard}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#141413] bg-white px-3.5 py-2 text-xs font-semibold text-[#141413] hover:bg-[#141413] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <Wand2 className="h-3.5 w-3.5" />
              New via Wizard
            </button>
          </div>
        </div>

        {savePromptOpen && (
          <form
            onSubmit={handleSubmitSave}
            className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 border-t border-[#EAE7DF] pt-4"
          >
            <label className="sr-only" htmlFor="new-project-name-input">
              Project Name
            </label>
            <input
              id="new-project-name-input"
              type="text"
              autoFocus
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Enter project name (e.g. Verdant Circuit Primary)"
              className="flex-1 rounded-lg border border-[#DCD9D0] bg-[#FAF9F6] px-3.5 py-2 text-sm font-medium text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#141413] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2A2926] cursor-pointer flex-1 sm:flex-initial"
              >
                <Check className="h-3.5 w-3.5" />
                Save Project
              </button>
              <button
                type="button"
                onClick={() => setSavePromptOpen(false)}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#DCD9D0] bg-white px-3 py-2 text-xs font-semibold text-[#5C5951] hover:bg-[#F3F1EB] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Search & Sort Controls */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#7A756B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved logos by name, industry, or tagline..."
            className="w-full rounded-lg border border-[#DCD9D0] bg-white pl-9 pr-8 py-2 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear project search"
              className="absolute right-2.5 top-2.5 text-[#7A756B] hover:text-[#141413] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <span className="text-xs font-medium text-[#5C5951]">
            {filteredProjects.length}{' '}
            {filteredProjects.length === 1 ? 'project' : 'projects'}
          </span>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as ProjectSortMode)}
            aria-label="Sort saved projects"
            className="rounded-lg border border-[#DCD9D0] bg-white px-3 py-2 text-xs font-semibold text-[#141413] focus:border-[#141413] focus:outline-none"
          >
            <option value="updated-desc">Recently Updated</option>
            <option value="created-desc">Newest Created</option>
            <option value="name-asc">Name (A–Z)</option>
          </select>
        </div>
      </section>

      {/* Saved Projects Grid */}
      {projects.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-[#CFCAC0] bg-[#FAF9F6] px-6 py-14 text-center">
          <FolderOpen className="mx-auto h-9 w-9 text-[#7A756B]" />
          <h2 className="font-display mt-3 text-xl font-bold text-[#141413]">
            No Saved Logo Projects Yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-[#5C5951]">
            Your active canvas is automatically backed up in your browser. Save named versions here to organize client concepts, rename iterations, duplicate layouts, and switch between brands anytime.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenSavePrompt}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#141413] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2A2926] cursor-pointer"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              Save Current Canvas
            </button>
            <button
              type="button"
              onClick={onOpenWizard}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCD9D0] bg-white px-4 py-2 text-xs font-semibold text-[#141413] hover:bg-[#F3F1EB] cursor-pointer"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Generate Concepts
            </button>
          </div>
        </section>
      ) : filteredProjects.length === 0 ? (
        <section className="rounded-2xl border border-[#DCD9D0] bg-white px-6 py-12 text-center">
          <p className="text-sm font-semibold text-[#141413]">
            No saved projects match &ldquo;{searchQuery}&rdquo;
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-3 rounded-lg border border-[#DCD9D0] bg-[#FAF9F6] px-3 py-1.5 text-xs font-semibold text-[#141413] hover:bg-[#EFECE4] cursor-pointer"
          >
            Reset Search
          </button>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProjects.map((project) => {
            const isActive = project.id === activeProjectId;
            const isRenaming = renamingId === project.id;
            const isDeleting = confirmDeleteId === project.id;

            return (
              <article
                key={project.id}
                className={`flex flex-col justify-between rounded-xl border bg-white p-3.5 transition-colors ${
                  isActive
                    ? 'border-[#1B4332] ring-1 ring-[#1B4332]'
                    : 'border-[#DCD9D0] hover:border-[#A8A397]'
                }`}
              >
                <div>
                  {/* Thumbnail Preview */}
                  <button
                    type="button"
                    onClick={() => onOpenProject(project)}
                    className="group relative block w-full overflow-hidden rounded-lg border border-[#EAE7DF] cursor-pointer text-left"
                    style={
                      project.document.transparentBackground
                        ? {
                            backgroundImage:
                              'linear-gradient(45deg, #eceae2 25%, transparent 25%), linear-gradient(-45deg, #eceae2 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eceae2 75%), linear-gradient(-45deg, transparent 75%, #eceae2 75%)',
                            backgroundSize: '16px 16px',
                            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
                            backgroundColor: '#f7f5ef',
                          }
                        : { backgroundColor: project.document.backgroundColor }
                    }
                    title={`Open ${project.name} in Canvas Editor`}
                  >
                    <LogoDocumentSvg
                      doc={project.document}
                      idPrefix={`proj-${project.id}`}
                      className="aspect-[4/3] w-full block"
                    />
                    {isActive && (
                      <span className="absolute left-2 top-2 rounded bg-[#1B4332] px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                        Active
                      </span>
                    )}
                  </button>

                  {/* Title & Inline Rename */}
                  <div className="mt-3">
                    {isRenaming ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          autoFocus
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              commitRename(project.id);
                            } else if (e.key === 'Escape') {
                              setRenamingId(null);
                              setRenameDraft('');
                            }
                          }}
                          className="min-w-0 flex-1 rounded-md border border-[#141413] bg-[#FAF9F6] px-2 py-1 text-xs font-semibold text-[#141413] focus:bg-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => commitRename(project.id)}
                          aria-label="Confirm rename"
                          className="rounded-md bg-[#141413] p-1.5 text-white hover:bg-[#2A2926] cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(null);
                            setRenameDraft('');
                          }}
                          aria-label="Cancel rename"
                          className="rounded-md border border-[#DCD9D0] p-1.5 text-[#5C5951] hover:bg-[#F3F1EB] cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          onDoubleClick={() => startRename(project)}
                          className="truncate text-sm font-bold text-[#141413]"
                          title="Double-click to rename"
                        >
                          {project.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => startRename(project)}
                          aria-label={`Rename ${project.name}`}
                          title="Rename project"
                          className="rounded p-1 text-[#6B675E] hover:bg-[#F3F1EB] hover:text-[#141413] cursor-pointer shrink-0"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    <p className="mt-0.5 truncate text-[11px] text-[#5C5951]">
                      {project.brief.industry} · {project.document.layers.length} layers ·{' '}
                      <span className="font-mono-num">
                        {project.document.width}×{project.document.height}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[10.5px] text-[#7A756B]">
                      Updated {formatTimestamp(project.updatedAt)}
                    </p>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="mt-3.5 border-t border-[#EFECE4] pt-2.5">
                  {isDeleting ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-red-700">
                        Delete project?
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteProject(project.id);
                            setConfirmDeleteId(null);
                          }}
                          className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700 cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-md border border-[#DCD9D0] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#4A4740] hover:bg-[#F3F1EB] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenProject(project)}
                        className="inline-flex items-center gap-1 rounded-md bg-[#141413] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1B4332] transition-colors cursor-pointer"
                      >
                        <FolderOpen className="h-3 w-3" />
                        {isActive ? 'Edit Canvas' : 'Open'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onDuplicateProject(project.id)}
                          title="Duplicate project"
                          aria-label={`Duplicate ${project.name}`}
                          className="rounded-md border border-[#DCD9D0] bg-white p-1.5 text-[#4A4740] hover:bg-[#F3F1EB] hover:text-[#141413] cursor-pointer"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onExportProject(project)}
                          title="Export project"
                          aria-label={`Export ${project.name}`}
                          className="rounded-md border border-[#DCD9D0] bg-white p-1.5 text-[#4A4740] hover:bg-[#F3F1EB] hover:text-[#141413] cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(null);
                            setConfirmDeleteId(project.id);
                          }}
                          title="Delete project"
                          aria-label={`Delete ${project.name}`}
                          className="rounded-md border border-[#DCD9D0] bg-white p-1.5 text-[#4A4740] hover:border-red-200 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
};
