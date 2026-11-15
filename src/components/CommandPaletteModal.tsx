import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenterHorizontal,
  ArrowRight,
  Command,
  CornerDownLeft,
  Layers,
  LayoutGrid,
  Printer,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import {
  searchStudioCommands,
  StudioCommandCategory,
  StudioCommandItem,
} from '../utils/commandRegistry';

interface CommandPaletteModalProps {
  isOpen: boolean;
  commands: StudioCommandItem[];
  onClose: () => void;
}

const CATEGORY_ICON: Record<StudioCommandCategory, React.ReactNode> = {
  'Print & Pre-Press': <Printer className="h-3.5 w-3.5 text-rose-500" />,
  'Align & Transform': <AlignCenterHorizontal className="h-3.5 w-3.5 text-indigo-500" />,
  'Layers & Vector': <Layers className="h-3.5 w-3.5 text-amber-500" />,
  'Canvas & Artboards': <LayoutGrid className="h-3.5 w-3.5 text-emerald-500" />,
  'Export & Studio': <Sparkles className="h-3.5 w-3.5 text-violet-500" />,
};

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  commands,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(
    () => searchStudioCommands(commands, query),
    [commands, query]
  );

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setActiveIndex(0);
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex((idx) => {
      if (filtered.length === 0) return 0;
      return Math.min(idx, filtered.length - 1);
    });
  }, [filtered.length]);

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const item = listRef.current.querySelector<HTMLElement>(
      `[data-command-idx="${activeIndex}"]`
    );
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  if (!isOpen) return null;

  const executeCommand = (cmd: StudioCommandItem | undefined) => {
    if (!cmd || cmd.disabled) return;
    onClose();
    cmd.run();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (filtered.length === 0 ? 0 : (i + 1) % filtered.length));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) =>
        filtered.length === 0 ? 0 : (i - 1 + filtered.length) % filtered.length
      );
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(Math.max(0, filtered.length - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(filtered[activeIndex]);
    }
  };

  return (
    <div
      data-testid="command-palette-backdrop"
      className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/45 px-4 pt-[11vh] backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick Command Palette"
        data-testid="command-palette-dialog"
        onKeyDown={handleKeyDown}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#141720] shadow-[0_24px_70px_rgba(15,23,42,0.38)]"
      >
        {/* Spotlight Search Header */}
        <div className="flex items-center gap-2.5 border-b border-[#E2E8F0] dark:border-[#242937] px-4 py-3">
          <Search className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            data-testid="command-palette-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search tools, CMYK proof, crop marks, alignment, layers, export..."
            aria-label="Search commands"
            className="flex-1 bg-transparent text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1E2330] hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center rounded border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#0F1117] px-1.5 py-0.5 font-mono-num text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Search Results List */}
        <div
          ref={listRef}
          role="listbox"
          aria-label="Command results"
          className="max-h-[54vh] overflow-y-auto p-2 space-y-1"
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Command className="h-7 w-7 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No matching command for &ldquo;{query}&rdquo;
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Try &ldquo;CMYK&rdquo;, &ldquo;crop&rdquo;, &ldquo;bleed&rdquo;, &ldquo;clear&rdquo;, &ldquo;align&rdquo;, or &ldquo;export&rdquo;.
              </p>
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-command-idx={idx}
                  data-testid={`command-item-${cmd.id}`}
                  disabled={cmd.disabled}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => executeCommand(cmd)}
                  className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                    cmd.disabled
                      ? 'opacity-45 cursor-not-allowed'
                      : isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-500/15 ring-1 ring-indigo-500/40 cursor-pointer'
                        : 'hover:bg-slate-50 dark:hover:bg-[#1B202C] cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117]">
                      {CATEGORY_ICON[cmd.category]}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                          {cmd.title}
                        </span>
                        {cmd.active !== undefined && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase ${
                              cmd.active
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {cmd.active ? 'ON' : 'OFF'}
                          </span>
                        )}
                        {cmd.badge && (
                          <span className="rounded-full bg-amber-100 dark:bg-amber-500/20 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-700 dark:text-amber-300">
                            {cmd.badge}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {cmd.category}
                        {cmd.subtitle ? ` · ${cmd.subtitle}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {cmd.shortcut && (
                      <kbd className="rounded border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#0F1117] px-1.5 py-0.5 font-mono-num text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {cmd.shortcut}
                      </kbd>
                    )}
                    {isSelected && !cmd.disabled && (
                      <ArrowRight className="h-3.5 w-3.5 text-indigo-500" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="flex items-center justify-between border-t border-[#E2E8F0] dark:border-[#242937] bg-slate-50/80 dark:bg-[#0F1117]/80 px-4 py-2 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#181B23] px-1 font-mono-num text-[10px]">
                ↑↓
              </kbd>
              Navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="inline-flex items-center rounded border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#181B23] px-1 font-mono-num text-[10px]">
                <CornerDownLeft className="h-2.5 w-2.5" />
              </kbd>
              Run
            </span>
          </div>
          <span className="font-mono-num text-[10px]">
            {filtered.length} command{filtered.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  );
};
