import React, { useMemo, useState } from 'react';
import { History, Search, X } from 'lucide-react';
import { STUDIO_UPDATE_LOG, UpdateChangeKind } from '../data/updateLog';

interface UpdateLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FILTER_OPTIONS: Array<{ id: 'all' | UpdateChangeKind; label: string }> = [
  { id: 'all', label: 'All Updates' },
  { id: 'added', label: 'Added' },
  { id: 'upgraded', label: 'Upgraded' },
  { id: 'fixed', label: 'Fixed' },
];

const KIND_TEXT_CLASS: Record<UpdateChangeKind, string> = {
  added: 'text-emerald-700 dark:text-emerald-400',
  upgraded: 'text-sky-700 dark:text-sky-400',
  fixed: 'text-amber-700 dark:text-amber-400',
};

const KIND_LABEL: Record<UpdateChangeKind, string> = {
  added: 'Added',
  upgraded: 'Upgraded',
  fixed: 'Fixed',
};

export const UpdateLogModal: React.FC<UpdateLogModalProps> = ({ isOpen, onClose }) => {
  const [kindFilter, setKindFilter] = useState<'all' | UpdateChangeKind>('all');
  const [query, setQuery] = useState<string>('');

  const filteredBuilds = useMemo(() => {
    const q = query.trim().toLowerCase();
    return STUDIO_UPDATE_LOG.map((build) => {
      const matchingChanges = build.changes.filter((c) => {
        if (kindFilter !== 'all' && c.kind !== kindFilter) return false;
        if (!q) return true;
        return (
          c.title.toLowerCase().includes(q) ||
          c.details.toLowerCase().includes(q) ||
          c.area.toLowerCase().includes(q) ||
          (c.filesEdited ?? []).some((f) => f.toLowerCase().includes(q))
        );
      });
      return { ...build, changes: matchingChanges };
    }).filter((b) => b.changes.length > 0);
  }, [kindFilter, query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#161822] text-slate-900 dark:text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#2A2D3D] px-6 py-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1B4332] dark:text-emerald-400">
              <History className="h-3.5 w-3.5" />
              <span>Studio Update Log</span>
            </div>
            <h2 className="font-display text-xl font-bold tracking-tight">
              Release History &amp; Previous Build Edits
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Review new features, upgraded tools, and modified source modules across builds.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close update log"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#252836] hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#141620] px-6 py-3">
          <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 dark:bg-[#1E202B] p-1 w-fit">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setKindFilter(opt.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  kindFilter === opt.id
                    ? 'bg-white dark:bg-[#2A2D3D] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search feature or file..."
              className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#1B4332] dark:focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Release Timeline Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
          {filteredBuilds.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No matching updates found
              </p>
              <button
                type="button"
                onClick={() => {
                  setKindFilter('all');
                  setQuery('');
                }}
                className="text-xs font-semibold text-[#1B4332] dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : (
            filteredBuilds.map((build, bIdx) => (
              <section
                key={build.id}
                className={
                  bIdx > 0
                    ? 'border-t border-[#E2E8F0] dark:border-[#2A2D3D] pt-7 space-y-4'
                    : 'space-y-4'
                }
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                    <span className="font-bold text-[#1B4332] dark:text-emerald-400">
                      {build.buildLabel}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{build.dateLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{build.changes.length} updates</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {build.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {build.summary}
                  </p>
                </div>

                <div className="divide-y divide-[#E2E8F0] dark:divide-[#2A2D3D] rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50/60 dark:bg-[#1E202B]/70">
                  {build.changes.map((item, idx) => (
                    <div key={idx} className="p-3.5 space-y-1.5">
                      <div className="flex flex-wrap items-baseline gap-2 text-xs">
                        <span className={`font-bold ${KIND_TEXT_CLASS[item.kind]}`}>
                          {KIND_LABEL[item.kind]}
                        </span>
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                          ·
                        </span>
                        <span className="font-semibold text-slate-500 dark:text-slate-400">
                          {item.area}
                        </span>
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                          ·
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {item.title}
                        </span>
                      </div>

                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {item.details}
                      </p>

                      {item.filesEdited && item.filesEdited.length > 0 && (
                        <p className="font-mono-num text-[10.5px] text-slate-500 dark:text-slate-400 pt-0.5">
                          Edited: {item.filesEdited.join(' · ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#141620] px-6 py-3">
          <span className="font-mono-num text-[11px] text-slate-500 dark:text-slate-400">
            Forma Studio · Current Release: Build 13
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#1B4332] dark:bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:brightness-110 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
