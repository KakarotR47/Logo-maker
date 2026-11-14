import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  X,
} from 'lucide-react';
import {
  COLOR_PALETTES,
  FONT_PAIRINGS,
  INDUSTRY_CATEGORIES,
  STYLE_PRESETS,
} from '../data/logoLibrary';
import { BrandBrief, ColorPalette, IndustryCategory, LogoStylePreset } from '../types/logo';
import { AiConceptSuggestion } from '../utils/aiApi';
import { AiMagicPanel, TracedSymbolPayload } from './AiMagicPanel';

interface LogoWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  brief: BrandBrief;
  setBrief: React.Dispatch<React.SetStateAction<BrandBrief>>;
  activePalette: ColorPalette;
  onGenerate: () => void;
  onInsertTracedSymbol: (payload: TracedSymbolPayload) => void;
  onGenerateWithAiSymbol: (payload: TracedSymbolPayload) => void;
}

const STYLE_TAG_OPTIONS: Array<{
  tag: string;
  mappedStyle: LogoStylePreset;
  symbolHint?: string;
}> = [
  { tag: 'Minimalist', mappedStyle: 'minimalist' },
  { tag: 'Modern', mappedStyle: 'modern' },
  { tag: 'Geometric', mappedStyle: 'geometric' },
  { tag: 'Vintage', mappedStyle: 'vintage' },
  { tag: '3D Depth', mappedStyle: '3d' },
  { tag: 'Monogram', mappedStyle: 'monogram' },
  { tag: 'Luxury Crest', mappedStyle: 'vintage', symbolHint: 'royal crown crest' },
  { tag: 'Tech Circuit', mappedStyle: 'geometric', symbolHint: 'interlocking leaf and circuit' },
  { tag: 'Editorial', mappedStyle: 'minimalist' },
  { tag: 'Bold Stamp', mappedStyle: '3d', symbolHint: 'architectural keystone arch' },
];

const WIZARD_STEPS = [
  { id: 1, title: 'Brand & Industry' },
  { id: 2, title: 'Style Tags' },
  { id: 3, title: 'Color Palette' },
  { id: 4, title: 'Generate Grid' },
] as const;

export const LogoWizardModal: React.FC<LogoWizardModalProps> = ({
  isOpen,
  onClose,
  brief,
  setBrief,
  activePalette,
  onGenerate,
  onInsertTracedSymbol,
  onGenerateWithAiSymbol,
}) => {
  const [wizardMode, setWizardMode] = useState<'guided' | 'ai'>('guided');
  const [step, setStep] = useState<number>(1);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setWizardMode('guided');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeTags = brief.styleTags ?? [
    STYLE_PRESETS.find((s) => s.id === brief.style)?.label ?? 'Minimalist',
  ];

  const toggleStyleTag = (tag: string, mappedStyle: LogoStylePreset, symbolHint?: string) => {
    setBrief((prev) => {
      const current = prev.styleTags ?? [];
      const exists = current.includes(tag);
      const nextTags = exists
        ? current.filter((t) => t !== tag)
        : [...current, tag].slice(-4);
      const nextStyle = !exists ? mappedStyle : prev.style;
      return {
        ...prev,
        styleTags: nextTags,
        style: nextStyle,
        symbolIdea: !exists && symbolHint && !prev.symbolIdea ? symbolHint : prev.symbolIdea,
      };
    });
  };

  const selectedPalette =
    COLOR_PALETTES.find((p) => p.id === brief.paletteId) ?? COLOR_PALETTES[0];

  const handleFinish = () => {
    onGenerate();
    onClose();
  };

  const handleApplySuggestion = (suggestion: AiConceptSuggestion) => {
    const validPalette = COLOR_PALETTES.some((p) => p.id === suggestion.paletteId)
      ? suggestion.paletteId
      : brief.paletteId;
    const validStyle = STYLE_PRESETS.some((s) => s.id === suggestion.style)
      ? suggestion.style
      : brief.style;

    setBrief((b) => ({
      ...b,
      businessName: suggestion.businessName || b.businessName,
      tagline: suggestion.tagline || b.tagline,
      symbolIdea: suggestion.symbolPrompt || b.symbolIdea,
      paletteId: validPalette,
      style: validStyle,
    }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logo-wizard-title"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#DCD9D0] bg-[#FAF9F6] shadow-2xl">
        {/* Top Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6E3DA] bg-white px-4 sm:px-6 py-3.5 sm:py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1B4332]">
              {wizardMode === 'ai'
                ? 'AI Magic Generate · Vector Symbol Studio'
                : `Auto-Layout Logo Wizard · Step ${step} of 4`}
            </p>
            <h2
              id="logo-wizard-title"
              className="font-display text-base sm:text-lg font-bold text-[#141413]"
            >
              {wizardMode === 'ai' ? 'AI Custom Symbol & Brand Generator' : WIZARD_STEPS[step - 1]?.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-[#DCD9D0] bg-[#EFECE4] p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setWizardMode('guided')}
                className={`rounded-md px-2.5 py-1 transition-colors cursor-pointer ${
                  wizardMode === 'guided' ? 'bg-white text-[#141413] shadow-xs' : 'text-[#55524B]'
                }`}
              >
                4-Step Brief
              </button>
              <button
                type="button"
                onClick={() => setWizardMode('ai')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors cursor-pointer ${
                  wizardMode === 'ai' ? 'bg-[#1B4332] text-white shadow-xs' : 'text-[#55524B]'
                }`}
              >
                <Sparkles className="h-3 w-3" />
                AI Magic Generate
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close wizard"
              className="rounded-lg border border-[#DCD9D0] p-1.5 text-[#5C5951] hover:bg-[#F3F1EB] hover:text-[#141413] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stepper Bar (Guided Mode Only) */}
        {wizardMode === 'guided' && (
          <div className="grid grid-cols-4 border-b border-[#E6E3DA] bg-[#F3F1EB]">
            {WIZARD_STEPS.map((s) => {
              const active = step === s.id;
              const done = step > s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={`flex items-center justify-center gap-1 border-b-2 px-1.5 sm:px-3 py-2.5 text-[10px] sm:text-[11px] font-semibold transition-colors cursor-pointer min-w-0 ${
                    active
                      ? 'border-[#141413] bg-white text-[#141413]'
                      : done
                        ? 'border-transparent text-[#1B4332] hover:bg-white/60'
                        : 'border-transparent text-[#6B675E] hover:bg-white/60'
                  }`}
                >
                  <span className="font-mono-num shrink-0">{s.id}.</span>
                  <span className="truncate">{s.title}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Step Body */}
        <div className="p-4 sm:p-6 min-h-[300px] sm:min-h-[340px] max-h-[65vh] overflow-y-auto space-y-5">
          {wizardMode === 'ai' && (
            <AiMagicPanel
              variant="wizard"
              activePalette={activePalette}
              brief={brief}
              onInsertTracedSymbol={(payload) => {
                onInsertTracedSymbol(payload);
                onClose();
              }}
              onGenerateVariationsWithSymbol={(payload) => {
                onGenerateWithAiSymbol(payload);
                onClose();
              }}
              onApplyAiSuggestion={handleApplySuggestion}
            />
          )}

          {/* STEP 1: BRAND NAME, SLOGAN, INDUSTRY */}
          {wizardMode === 'guided' && step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#141413]">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={brief.businessName}
                  onChange={(e) =>
                    setBrief((b) => ({ ...b, businessName: e.target.value }))
                  }
                  placeholder="e.g. Verdant Circuit"
                  className="mt-1.5 w-full rounded-lg border border-[#DCD9D0] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#141413] focus:border-[#141413] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141413]">
                  Slogan / Tagline
                </label>
                <input
                  type="text"
                  value={brief.tagline}
                  onChange={(e) =>
                    setBrief((b) => ({ ...b, tagline: e.target.value }))
                  }
                  placeholder="e.g. Clean Energy & Intelligent Systems"
                  className="mt-1.5 w-full rounded-lg border border-[#DCD9D0] bg-white px-3.5 py-2.5 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141413]">
                  Industry Category
                </label>
                <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {INDUSTRY_CATEGORIES.map((ind) => {
                    const active = brief.industry === ind;
                    return (
                      <button
                        key={ind}
                        type="button"
                        onClick={() =>
                          setBrief((b) => ({ ...b, industry: ind as IndustryCategory }))
                        }
                        className={`rounded-lg border px-2.5 py-2 text-left text-[11px] font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'border-[#141413] bg-[#141413] text-white'
                            : 'border-[#DCD9D0] bg-white text-[#141413] hover:border-[#141413]'
                        }`}
                      >
                        {ind}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141413]">
                  Symbol Direction (Optional)
                </label>
                <input
                  type="text"
                  value={brief.symbolIdea}
                  onChange={(e) =>
                    setBrief((b) => ({ ...b, symbolIdea: e.target.value }))
                  }
                  placeholder="e.g. interlocking leaf and circuit, crown crest, compass..."
                  className="mt-1.5 w-full rounded-lg border border-[#DCD9D0] bg-white px-3.5 py-2 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: STYLE TAGS */}
          {wizardMode === 'guided' && step === 2 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-[#141413]">
                  Select Style Tags (up to 4)
                </p>
                <p className="mt-0.5 text-[11px] text-[#5C5951]">
                  Style tags tune typography pairings, badge shapes, divider ornaments, and shadow depth across all 12 generated layouts.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STYLE_TAG_OPTIONS.map((item) => {
                    const active = activeTags.includes(item.tag);
                    return (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() =>
                          toggleStyleTag(item.tag, item.mappedStyle, item.symbolHint)
                        }
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          active
                            ? 'border-[#141413] bg-[#141413] text-white'
                            : 'border-[#DCD9D0] bg-white text-[#141413] hover:border-[#141413]'
                        }`}
                      >
                        {active && <Check className="h-3 w-3" />}
                        {item.tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-[#E6E3DA] pt-4">
                <p className="text-xs font-semibold text-[#141413]">
                  Primary Aesthetic Preset
                </p>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STYLE_PRESETS.map((preset) => {
                    const active = brief.style === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          setBrief((b) => ({ ...b, style: preset.id }))
                        }
                        className={`rounded-lg border p-2.5 text-left transition-colors cursor-pointer ${
                          active
                            ? 'border-[#141413] bg-white ring-1 ring-[#141413]'
                            : 'border-[#E2DFD7] bg-white hover:border-[#141413]'
                        }`}
                      >
                        <p className="text-xs font-bold text-[#141413]">{preset.label}</p>
                        <p className="mt-0.5 text-[10px] text-[#6B675E]">{preset.note}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: COLOR PALETTE & FONT PAIRING */}
          {wizardMode === 'guided' && step === 3 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-[#141413]">
                  Choose Brand Color Palette
                </p>
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {COLOR_PALETTES.map((pal) => {
                    const active = brief.paletteId === pal.id;
                    return (
                      <button
                        key={pal.id}
                        type="button"
                        onClick={() =>
                          setBrief((b) => ({ ...b, paletteId: pal.id }))
                        }
                        className={`flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                          active
                            ? 'border-[#141413] bg-white ring-1 ring-[#141413]'
                            : 'border-[#E2DFD7] bg-white hover:border-[#B5B0A4]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold text-[#141413]">
                          <span className="truncate">{pal.name}</span>
                          {active && (
                            <span className="text-[10px] font-bold text-[#1B4332]">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          {[pal.background, pal.primary, pal.accent, pal.secondary, pal.text].map(
                            (hex, i) => (
                              <span
                                key={i}
                                className="h-4 flex-1 rounded-sm border border-black/15"
                                style={{ backgroundColor: hex }}
                              />
                            )
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-[#E6E3DA] pt-4">
                <p className="text-xs font-semibold text-[#141413]">
                  Recommended Font Pairing
                </p>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FONT_PAIRINGS.slice(0, 6).map((pair) => {
                    const active =
                      brief.primaryFontId === pair.primaryFontId &&
                      brief.secondaryFontId === pair.secondaryFontId;
                    return (
                      <button
                        key={pair.id}
                        type="button"
                        onClick={() =>
                          setBrief((b) => ({
                            ...b,
                            primaryFontId: pair.primaryFontId,
                            secondaryFontId: pair.secondaryFontId,
                          }))
                        }
                        className={`rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                          active
                            ? 'border-[#141413] bg-[#141413] text-white'
                            : 'border-[#DCD9D0] bg-white text-[#141413] hover:border-[#141413]'
                        }`}
                      >
                        <p className="text-xs font-bold">{pair.name}</p>
                        <p
                          className={`text-[10px] ${
                            active ? 'text-white/75' : 'text-[#6B675E]'
                          }`}
                        >
                          {pair.note}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SUMMARY & AUTO-LAYOUT GENERATION */}
          {wizardMode === 'guided' && step === 4 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-[#DCD9D0] bg-white p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EFECE4] pb-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5C5951]">
                      Brand Brief Summary
                    </p>
                    <h3 className="font-display mt-1 text-2xl font-bold text-[#141413]">
                      {brief.businessName || 'Verdant Circuit'}
                    </h3>
                    <p className="text-xs text-[#5C5951]">
                      {brief.tagline || 'Clean Energy & Intelligent Systems'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {[
                      selectedPalette.primary,
                      selectedPalette.accent,
                      selectedPalette.secondary,
                      selectedPalette.text,
                    ].map((hex, i) => (
                      <span
                        key={i}
                        className="h-7 w-7 rounded-md border border-black/15"
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B675E]">
                      Industry
                    </p>
                    <p className="mt-1 font-semibold text-[#141413]">{brief.industry}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B675E]">
                      Style Tags
                    </p>
                    <p className="mt-1 font-semibold text-[#141413]">
                      {activeTags.join(' · ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B675E]">
                      Palette
                    </p>
                    <p className="mt-1 font-semibold text-[#141413]">
                      {selectedPalette.name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#E2DFD7] bg-white p-4">
                <p className="text-xs font-semibold text-[#141413]">
                  12 Auto-Layout Variations Ready to Synthesize
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#5C5951]">
                  Clicking generate builds editable SVG scene-graph variations across{' '}
                  <span className="font-semibold text-[#141413]">
                    Icon-Top, Icon-Left, Emblem &amp; Badge, Monogram Crest, and Wordmark
                  </span>{' '}
                  templates. Click any variation card to customize layers directly on the canvas.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {wizardMode === 'guided' ? (
          <div className="flex items-center justify-between gap-3 border-t border-[#E6E3DA] bg-white px-4 sm:px-6 py-3.5 sm:py-4">
            <button
              type="button"
              onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCD9D0] bg-white px-4 py-2 text-xs font-semibold text-[#141413] hover:bg-[#F3F1EB] cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {step > 1 ? 'Back' : 'Cancel'}
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#141413] px-5 py-2 text-xs font-semibold text-white hover:bg-[#2A2926] cursor-pointer whitespace-nowrap shrink-0"
              >
                Continue
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1B4332] px-5 py-2 text-xs font-semibold text-white hover:bg-[#143326] cursor-pointer whitespace-nowrap shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate 12 Logo Variations
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 border-t border-[#E6E3DA] bg-white px-4 sm:px-6 py-3.5">
            <button
              type="button"
              onClick={() => setWizardMode('guided')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCD9D0] bg-white px-3.5 py-2 text-xs font-semibold text-[#141413] hover:bg-[#F3F1EB] cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Switch to 4-Step Brief
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#DCD9D0] bg-white px-4 py-2 text-xs font-semibold text-[#5C5951] hover:bg-[#F3F1EB] cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
