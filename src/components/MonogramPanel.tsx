import React, { useMemo, useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import { ColorPalette, LogoDocument, LogoLayer } from '../types/logo';
import {
  buildMonogramLayers,
  extractInitialsFromBrand,
  MONOGRAM_CATEGORIES,
  MONOGRAM_TEMPLATES,
  MonogramCategory,
  MonogramFontTone,
  sanitizeMonogramInitials,
} from '../utils/monogramGenerator';
import { LogoDocumentSvg } from './CanvasLayerRenderer';

interface MonogramPanelProps {
  brandName: string;
  activePalette: ColorPalette;
  onInsertMonogram: (layers: LogoLayer[], mode: 'add' | 'replace') => void;
}

const FONT_TONE_OPTIONS: Array<{ id: MonogramFontTone; label: string }> = [
  { id: 'serif', label: 'Serif' },
  { id: 'sans', label: 'Sans' },
  { id: 'display', label: 'Display' },
  { id: 'script', label: 'Script' },
];

export const MonogramPanel: React.FC<MonogramPanelProps> = ({
  brandName,
  activePalette,
  onInsertMonogram,
}) => {
  const defaultInitials = useMemo(() => extractInitialsFromBrand(brandName), [brandName]);
  const [initialsInput, setInitialsInput] = useState<string>(defaultInitials);
  const [subtitle, setSubtitle] = useState<string>('EST. 2026');
  const [fontTone, setFontTone] = useState<MonogramFontTone>('serif');
  const [category, setCategory] = useState<'All' | MonogramCategory>('All');
  const [insertMode, setInsertMode] = useState<'add' | 'replace'>('add');

  const effectiveInitials = sanitizeMonogramInitials(initialsInput || defaultInitials);

  const visibleTemplates = useMemo(() => {
    if (category === 'All') return MONOGRAM_TEMPLATES;
    return MONOGRAM_TEMPLATES.filter((t) => t.category === category);
  }, [category]);

  const previewDocs = useMemo(() => {
    return visibleTemplates.map((tmpl) => {
      const layers = buildMonogramLayers(
        effectiveInitials,
        tmpl.id,
        activePalette,
        fontTone,
        120,
        120,
        subtitle
      );
      const previewDoc: LogoDocument = {
        id: `mono-prev-${tmpl.id}`,
        title: tmpl.name,
        width: 240,
        height: 240,
        backgroundColor: activePalette.background || '#FFFFFF',
        transparentBackground: true,
        layers,
      };
      return { tmpl, previewDoc };
    });
  }, [visibleTemplates, effectiveInitials, activePalette, fontTone, subtitle]);

  const handleApplyTemplate = (templateId: string) => {
    const layers = buildMonogramLayers(
      effectiveInitials,
      templateId,
      activePalette,
      fontTone,
      400,
      300,
      subtitle
    );
    onInsertMonogram(layers, insertMode);
  };

  return (
    <div className="space-y-3.5">
      {/* Initials & Subtitle Controls */}
      <div className="rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#0F1117] p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">
            Monogram Initials (2–3)
          </label>
          <button
            type="button"
            onClick={() => setInitialsInput(defaultInitials)}
            className="text-[10.5px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            Use {defaultInitials}
          </button>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          <input
            type="text"
            maxLength={3}
            value={initialsInput}
            onChange={(e) =>
              setInitialsInput(e.target.value.replace(/[^a-zA-Z0-9&]/g, '').toUpperCase())
            }
            placeholder="FA"
            aria-label="Monogram Initials"
            className="col-span-2 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#181B23] px-2.5 py-2 text-center text-base font-bold tracking-[0.16em] text-slate-900 dark:text-white uppercase focus:border-indigo-500 focus:outline-none"
          />
          <input
            type="text"
            maxLength={14}
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value.toUpperCase())}
            placeholder="CREST MOTTO"
            aria-label="Monogram Subtitle"
            className="col-span-3 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#181B23] px-2.5 py-2 text-xs font-semibold tracking-wider text-slate-800 dark:text-slate-100 uppercase focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Font Tone Picker */}
        <div className="grid grid-cols-4 gap-1">
          {FONT_TONE_OPTIONS.map((tone) => (
            <button
              key={tone.id}
              type="button"
              onClick={() => setFontTone(tone.id)}
              className={`rounded-lg border py-1 text-[10.5px] font-semibold active:scale-95 transition-all cursor-pointer ${
                fontTone === tone.id
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#181B23] text-slate-600 dark:text-slate-300 hover:border-indigo-400'
              }`}
            >
              {tone.label}
            </button>
          ))}
        </div>

        {/* Add vs Replace Toggle */}
        <div className="flex items-center justify-between gap-2 border-t border-[#E2E8F0] dark:border-[#2A2F3D] pt-2">
          <span className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
            Click card to:
          </span>
          <div className="inline-flex rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#181B23] p-0.5">
            <button
              type="button"
              onClick={() => setInsertMode('add')}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${
                insertMode === 'add'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Plus className="h-2.5 w-2.5" />
              Add
            </button>
            <button
              type="button"
              onClick={() => setInsertMode('replace')}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${
                insertMode === 'replace'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Layers className="h-2.5 w-2.5" />
              Replace
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setCategory('All')}
          className={`rounded-lg border px-2 py-1 text-[10px] font-semibold active:scale-95 transition-all cursor-pointer ${
            category === 'All'
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#1E222D] text-slate-600 dark:text-slate-300'
          }`}
        >
          All ({MONOGRAM_TEMPLATES.length})
        </button>
        {MONOGRAM_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`rounded-lg border px-2 py-1 text-[10px] font-semibold active:scale-95 transition-all cursor-pointer ${
              category === cat
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#1E222D] text-slate-600 dark:text-slate-300'
            }`}
          >
            {cat.split(' & ')[0]}
          </button>
        ))}
      </div>

      {/* Live 24-Layout Monogram Grid */}
      <div className="grid grid-cols-2 gap-2">
        {previewDocs.map(({ tmpl, previewDoc }) => (
          <button
            key={tmpl.id}
            type="button"
            onClick={() => handleApplyTemplate(tmpl.id)}
            title={`${tmpl.name} — ${tmpl.category}`}
            className="studio-card-hover group flex flex-col items-center gap-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#1E222D] p-2 text-center shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <div className="flex h-24 w-full items-center justify-center rounded-lg bg-[#F1F3F6] dark:bg-[#0F1117] p-1">
              <LogoDocumentSvg
                doc={previewDoc}
                idPrefix={`mono-grid-${tmpl.id}`}
                forceBackground="transparent"
                className="h-full w-full"
              />
            </div>
            <div className="w-full px-0.5">
              <p className="truncate text-[10.5px] font-semibold text-slate-900 dark:text-slate-100">
                {tmpl.name}
              </p>
              <p className="truncate text-[9.5px] text-slate-500 dark:text-slate-400">
                {tmpl.category}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
