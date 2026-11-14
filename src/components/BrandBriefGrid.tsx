import React, { useMemo, useState } from 'react';
import { ArrowRight, RefreshCw, Wand2 } from 'lucide-react';
import {
  COLOR_PALETTES,
  FONT_OPTIONS,
  INDUSTRY_CATEGORIES,
  STYLE_PRESETS,
} from '../data/logoLibrary';
import {
  BrandBrief,
  IndustryCategory,
  LogoConcept,
  LogoStylePreset,
} from '../types/logo';
import { LogoDocumentSvg } from './CanvasLayerRenderer';

const SYMBOL_PROMPTS = [
  'interlocking leaf and circuit',
  'isometric cube prism',
  'neural hex network',
  'minimal mountain peak',
  'architectural keystone arch',
  'royal crown crest',
  'north star compass',
  'audio wave bars',
];

const STYLE_TAGS = [
  'Minimalist',
  'Modern',
  'Geometric',
  'Vintage',
  '3D Depth',
  'Monogram',
  'Luxury Crest',
  'Editorial',
];

type LayoutFilter =
  | 'all'
  | 'stacked'
  | 'icon-left'
  | 'badge'
  | 'monogram-crest'
  | 'wordmark';

interface BrandBriefGridProps {
  brief: BrandBrief;
  setBrief: React.Dispatch<React.SetStateAction<BrandBrief>>;
  concepts: LogoConcept[];
  onRegenerate: () => void;
  onOpenWizard: () => void;
  onOpenInEditor: (concept: LogoConcept) => void;
}

export const BrandBriefGrid: React.FC<BrandBriefGridProps> = ({
  brief,
  setBrief,
  concepts,
  onRegenerate,
  onOpenWizard,
  onOpenInEditor,
}) => {
  const [layoutFilter, setLayoutFilter] = useState<LayoutFilter>('all');

  const filteredConcepts = useMemo(() => {
    if (layoutFilter === 'all') return concepts;
    if (layoutFilter === 'badge') {
      return concepts.filter(
        (c) => c.archetype === 'badge' || c.archetype === 'split-emblem'
      );
    }
    return concepts.filter((c) => c.archetype === layoutFilter);
  }, [concepts, layoutFilter]);

  const activeTags = brief.styleTags ?? [];

  const toggleTag = (tag: string) => {
    setBrief((prev) => {
      const current = prev.styleTags ?? [];
      const exists = current.includes(tag);
      const next = exists
        ? current.filter((t) => t !== tag)
        : [...current, tag].slice(-4);
      return { ...prev, styleTags: next };
    });
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-8">
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* LEFT COLUMN: BRAND BRIEF QUICK CONFIG */}
        <section className="lg:col-span-4 rounded-xl border border-[#DCD9D0] bg-white p-5 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1B4332]">
                Auto-Layout Generator
              </p>
              <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-[#141413]">
                12+ Logo Variations
              </h1>
            </div>
            <button
              type="button"
              onClick={onOpenWizard}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#141413] bg-white px-3 py-1.5 text-xs font-semibold text-[#141413] hover:bg-[#141413] hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Launch Wizard
            </button>
          </div>

          <p className="text-xs leading-relaxed text-[#5C5951]">
            Enter your brand name, slogan, industry, style tags, and palette—or launch the step-by-step wizard—to synthesize editable vector variations across every core layout.
          </p>

          <div className="space-y-3.5 border-t border-[#EAE7DF] pt-4">
            <div>
              <label className="block text-xs font-semibold text-[#141413]">Brand Name</label>
              <input
                type="text"
                value={brief.businessName}
                onChange={(e) => setBrief((b) => ({ ...b, businessName: e.target.value }))}
                placeholder="e.g. Verdant Circuit"
                className="mt-1 w-full rounded-lg border border-[#DCD9D0] bg-[#FAF9F6] px-3 py-2 text-sm font-medium text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#141413]">Slogan / Tagline</label>
              <input
                type="text"
                value={brief.tagline}
                onChange={(e) => setBrief((b) => ({ ...b, tagline: e.target.value }))}
                placeholder="e.g. Clean Energy & Intelligent Systems"
                className="mt-1 w-full rounded-lg border border-[#DCD9D0] bg-[#FAF9F6] px-3 py-2 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#141413]">Industry</label>
                <select
                  value={brief.industry}
                  onChange={(e) =>
                    setBrief((b) => ({ ...b, industry: e.target.value as IndustryCategory }))
                  }
                  className="mt-1 w-full rounded-lg border border-[#DCD9D0] bg-[#FAF9F6] px-2.5 py-2 text-xs font-medium text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                >
                  {INDUSTRY_CATEGORIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141413]">Target Audience</label>
                <input
                  type="text"
                  value={brief.audience}
                  onChange={(e) => setBrief((b) => ({ ...b, audience: e.target.value }))}
                  placeholder="e.g. Enterprise founders"
                  className="mt-1 w-full rounded-lg border border-[#DCD9D0] bg-[#FAF9F6] px-2.5 py-2 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#141413]">
                Symbol Concept / Keyword
              </label>
              <input
                type="text"
                value={brief.symbolIdea}
                onChange={(e) => setBrief((b) => ({ ...b, symbolIdea: e.target.value }))}
                placeholder="e.g. interlocking leaf and circuit"
                className="mt-1 w-full rounded-lg border border-[#DCD9D0] bg-[#FAF9F6] px-3 py-2 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
              />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {SYMBOL_PROMPTS.slice(0, 4).map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => setBrief((b) => ({ ...b, symbolIdea: idea }))}
                    className={`rounded border px-2 py-1 text-[10px] font-medium transition-colors cursor-pointer ${
                      brief.symbolIdea === idea
                        ? 'border-[#141413] bg-[#141413] text-white'
                        : 'border-[#DCD9D0] bg-[#FAF9F6] text-[#4A4740] hover:border-[#141413]'
                    }`}
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </div>

            {/* Style Tags */}
            <div>
              <label className="block text-xs font-semibold text-[#141413]">Style Tags</label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {STYLE_TAGS.map((tag) => {
                  const active = activeTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`rounded-md border px-2 py-1 text-[10.5px] font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'border-[#141413] bg-[#141413] text-white'
                          : 'border-[#DCD9D0] bg-[#FAF9F6] text-[#3F3E39] hover:border-[#141413]'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Style Presets */}
            <div>
              <label className="block text-xs font-semibold text-[#141413]">Primary Style</label>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {STYLE_PRESETS.map((st) => {
                  const active = brief.style === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() =>
                        setBrief((b) => ({ ...b, style: st.id as LogoStylePreset }))
                      }
                      className={`rounded-lg border px-2.5 py-2 text-left text-xs font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'border-[#141413] bg-[#141413] text-white'
                          : 'border-[#DCD9D0] bg-[#FAF9F6] text-[#141413] hover:bg-white'
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Palette Picker */}
            <div>
              <label className="block text-xs font-semibold text-[#141413]">Color Palette</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {COLOR_PALETTES.slice(0, 8).map((pal) => {
                  const active = brief.paletteId === pal.id;
                  return (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() => setBrief((b) => ({ ...b, paletteId: pal.id }))}
                      className={`flex flex-col gap-1.5 rounded-lg border p-2 text-left transition-colors cursor-pointer ${
                        active
                          ? 'border-[#141413] bg-white ring-1 ring-[#141413]'
                          : 'border-[#E2DFD7] bg-[#FAF9F6] hover:border-[#B8B3A6]'
                      }`}
                    >
                      <span className="truncate text-[10.5px] font-semibold text-[#141413]">
                        {pal.name}
                      </span>
                      <div className="flex gap-1">
                        {[pal.primary, pal.accent, pal.secondary, pal.text].map((hex, i) => (
                          <span
                            key={i}
                            className="h-3 flex-1 rounded-sm border border-black/10"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Typography Override */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#4A4740]">
                  Display Font
                </label>
                <select
                  value={brief.primaryFontId}
                  onChange={(e) => setBrief((b) => ({ ...b, primaryFontId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[#DCD9D0] bg-[#FAF9F6] px-2 py-1.5 text-xs text-[#141413]"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#4A4740]">
                  Tagline Font
                </label>
                <select
                  value={brief.secondaryFontId}
                  onChange={(e) => setBrief((b) => ({ ...b, secondaryFontId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[#DCD9D0] bg-[#FAF9F6] px-2 py-1.5 text-xs text-[#141413]"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={onRegenerate}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#141413] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2A2926] transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate {concepts.length} Logo Variations
            </button>
          </div>
        </section>

        {/* RIGHT COLUMN: 12+ EDITABLE AUTO-LAYOUT VARIATIONS */}
        <section className="lg:col-span-8 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#DCD9D0] pb-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#141413]">
                {concepts.length} Editable Variations — {brief.businessName || 'Untitled Brand'}
              </h2>
              <p className="mt-1 text-xs text-[#5C5951]">
                {brief.industry} · {activeTags.length ? activeTags.join(' · ') : brief.style} · Click any variation card to open its vector layers in the Canvas Editor.
              </p>
            </div>

            {/* Layout Template Filter Bar */}
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[#DCD9D0] bg-[#FAF9F6] p-1">
              {(
                [
                  { id: 'all', label: `All (${concepts.length})` },
                  { id: 'stacked', label: 'Icon-Top' },
                  { id: 'icon-left', label: 'Icon-Left' },
                  { id: 'badge', label: 'Emblem / Badge' },
                  { id: 'monogram-crest', label: 'Monogram' },
                  { id: 'wordmark', label: 'Wordmark' },
                ] as const
              ).map((tab) => {
                const active = layoutFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setLayoutFilter(tab.id)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#141413] text-white'
                        : 'text-[#55524B] hover:text-[#141413]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredConcepts.map((concept) => (
              <div
                key={concept.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpenInEditor(concept)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenInEditor(concept);
                  }
                }}
                className="group flex flex-col justify-between rounded-xl border border-[#DCD9D0] bg-white p-3.5 text-left transition-colors hover:border-[#141413] focus:outline-none focus:ring-2 focus:ring-[#141413] cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <h3 className="truncate text-xs font-bold text-[#141413]">
                      {concept.title}
                    </h3>
                    <span className="text-[10px] font-medium text-[#5C5951] capitalize shrink-0">
                      {concept.archetype === 'stacked' ? 'icon-top' : concept.archetype}
                    </span>
                  </div>

                  {/* Crisp Centered Vector Artboard Preview */}
                  <div className="overflow-hidden rounded-lg border border-[#EAE7DF] bg-white">
                    <LogoDocumentSvg
                      doc={concept.document}
                      idPrefix={concept.id}
                      className="aspect-[4/3] w-full block"
                    />
                  </div>

                  <p className="mt-2.5 text-[11px] leading-relaxed text-[#5C5951] line-clamp-2">
                    {concept.rationale}
                  </p>
                </div>

                {/* Bottom Favicon Scale Proof + Open in Editor CTA */}
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#EFECE4] pt-2.5">
                  <div className="flex items-center gap-1.5 text-[10.5px] text-[#6B675E]">
                    <div className="h-4 w-4 overflow-hidden rounded border border-[#DCD9D0] bg-white">
                      <LogoDocumentSvg
                        doc={concept.document}
                        idPrefix={`${concept.id}-sm`}
                        className="h-full w-full"
                      />
                    </div>
                    <span className="font-mono-num">16px · SVG</span>
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-md bg-[#141413] px-2.5 py-1 text-[11px] font-semibold text-white group-hover:bg-[#1B4332] transition-colors whitespace-nowrap shrink-0">
                    Open in Canvas
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
