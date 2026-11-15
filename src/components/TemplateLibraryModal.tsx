import React, { useEffect, useMemo, useState } from 'react';
import { Check, LayoutTemplate, Search, Sparkles, X } from 'lucide-react';
import { FONT_OPTIONS } from '../data/logoLibrary';
import { batchLoadGoogleFonts } from '../utils/googleFonts';
import {
  buildDocumentFromTemplate,
  filterProTemplates,
  PRO_TEMPLATE_CATEGORIES,
  PRO_TEMPLATE_SPECS,
  ProTemplateCategory,
  ProTemplateSpec,
} from '../utils/templateLibrary';
import { CanvasLayerNode, LogoDocumentSvg } from './CanvasLayerRenderer';

interface TemplateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandName: string;
  tagline: string;
  onSelectTemplate: (spec: ProTemplateSpec, applyCustomBrand: boolean) => void;
}

export const TemplateLibraryModal: React.FC<TemplateLibraryModalProps> = ({
  isOpen,
  onClose,
  brandName,
  tagline,
  onSelectTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ProTemplateCategory | 'All'>('All');
  const [query, setQuery] = useState<string>('');
  const [applyCustomBrand, setApplyCustomBrand] = useState<boolean>(false);

  const filteredTemplates = useMemo(
    () => filterProTemplates(query, selectedCategory),
    [query, selectedCategory]
  );

  // Category counts for scannable tabs
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { All: PRO_TEMPLATE_SPECS.length };
    for (const cat of PRO_TEMPLATE_CATEGORIES) {
      map[cat] = PRO_TEMPLATE_SPECS.filter((t) => t.category === cat).length;
    }
    return map;
  }, []);

  // Dynamically preload fonts needed for visible template cards
  useEffect(() => {
    if (!isOpen) return;
    const neededFontIds = new Set<string>();
    filteredTemplates.slice(0, 24).forEach((tpl) => {
      tpl.layers.forEach((l) => {
        if (l.type === 'text' && l.fontId) neededFontIds.add(l.fontId);
      });
    });
    const fontObjs = FONT_OPTIONS.filter((f) => neededFontIds.has(f.id));
    if (fontObjs.length > 0) {
      void batchLoadGoogleFonts(fontObjs);
    }
  }, [isOpen, filteredTemplates]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-6 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#161822] shadow-2xl">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] dark:border-[#2A2D3D] px-5 py-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B4332] text-white shrink-0">
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white truncate">
                Pro Template Library
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {PRO_TEMPLATE_SPECS.length} studio-grade vector logos across {PRO_TEMPLATE_CATEGORIES.length} industries
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applyCustomBrand}
                onChange={(e) => setApplyCustomBrand(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-[#1B4332]"
              />
              <span className="truncate max-w-[200px]">
                Apply &ldquo;{brandName || 'My Brand'}&rdquo;
              </span>
            </label>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Pro Template Library"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search + Industry Filter Bar */}
        <div className="border-b border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50/70 dark:bg-[#12141D] px-5 py-3 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search templates by brand, keyword, aesthetic (e.g. neon, foil, serif, shield)..."
                className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#181A24] pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#1B4332] dark:focus:border-emerald-500 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="text-xs font-mono-num text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
              Showing {filteredTemplates.length} of {PRO_TEMPLATE_SPECS.length}
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {(['All', ...PRO_TEMPLATE_CATEGORIES] as const).map((cat) => {
              const active = selectedCategory === cat;
              const count = categoryCounts[cat] ?? 0;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'border-[#1B4332] bg-[#1B4332] text-white dark:border-emerald-500 dark:bg-emerald-600'
                      : 'border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`font-mono-num text-[10.5px] ${
                      active ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] dark:border-[#2A2D3D] py-16 text-center">
              <Sparkles className="h-8 w-8 text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No templates match &ldquo;{query}&rdquo;
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Try clearing filters or searching terms like crest, minimal, arch, or neon.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSelectedCategory('All');
                }}
                className="mt-4 rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-400 cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((spec) => {
                const previewDoc = buildDocumentFromTemplate(spec, {
                  customBrandName: applyCustomBrand ? brandName : undefined,
                  customTagline: applyCustomBrand ? tagline : undefined,
                  deterministicIdPrefix: `modal-tpl-${spec.id}`,
                });

                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => {
                      onSelectTemplate(spec, applyCustomBrand);
                      onClose();
                    }}
                    className="group flex flex-col overflow-hidden rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1B1D29] text-left transition-all hover:border-[#1B4332] dark:hover:border-emerald-500 hover:shadow-md cursor-pointer"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-[#E2E8F0] dark:border-[#2A2D3D]">
                      <LogoDocumentSvg
                        doc={previewDoc}
                        idPrefix={`tplcard-${spec.id}`}
                        className="h-full w-full block"
                      />
                      <span className="pointer-events-none absolute right-2.5 bottom-2.5 inline-flex items-center gap-1 rounded-lg bg-[#1B4332] px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                        <Check className="h-3 w-3" />
                        Use Template
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                          {spec.name}
                        </p>
                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {spec.category} · {spec.subtitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
                        {[spec.palette.primary, spec.palette.accent].map((hex, i) => (
                          <span
                            key={i}
                            className="h-3.5 w-3.5 rounded-sm border border-black/15 dark:border-white/15"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { CanvasLayerNode };
