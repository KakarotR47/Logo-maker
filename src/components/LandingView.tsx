import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Crown,
  FolderOpen,
  Layers,
  Palette,
  Scan,
  Sparkles,
} from 'lucide-react';
import { INDUSTRY_CATEGORIES } from '../data/logoLibrary';
import {
  BrandBrief,
  IndustryCategory,
  LayoutArchetype,
  LogoDocument,
  LogoStylePreset,
} from '../types/logo';
import { buildDocumentForArchetype, resolvePalette } from '../utils/logoGenerator';
import { LogoDocumentSvg } from './CanvasLayerRenderer';

interface SampleSpecimenSpec {
  id: string;
  businessName: string;
  tagline: string;
  industry: IndustryCategory;
  style: LogoStylePreset;
  archetype: LayoutArchetype;
  paletteId: string;
  primaryFontId: string;
  secondaryFontId: string;
  iconId: string;
  surfaceMode: 'light' | 'dark';
}

const SAMPLE_SPECIMENS: SampleSpecimenSpec[] = [
  {
    id: 'kestrel',
    businessName: 'Kestrel Labs',
    tagline: 'AUTONOMOUS FLIGHT',
    industry: 'Tech & AI',
    style: 'geometric',
    archetype: 'icon-left',
    paletteId: 'cobalt-slate',
    primaryFontId: 'outfit',
    secondaryFontId: 'plus-jakarta',
    iconId: 'prism-delta',
    surfaceMode: 'light',
  },
  {
    id: 'nordic-roast',
    businessName: 'Nordic Roast',
    tagline: 'SMALL BATCH COFFEE',
    industry: 'Food & Beverage',
    style: 'vintage',
    archetype: 'badge',
    paletteId: 'dark-noir-gold',
    primaryFontId: 'cinzel',
    secondaryFontId: 'montserrat',
    iconId: 'coffee-crest',
    surfaceMode: 'dark',
  },
  {
    id: 'solstice',
    businessName: 'Solstice Flora',
    tagline: 'BOTANICAL APOTHECARY',
    industry: 'Eco & Sustainability',
    style: 'minimalist',
    archetype: 'stacked',
    paletteId: 'forest-sand',
    primaryFontId: 'fraunces',
    secondaryFontId: 'dm-sans',
    iconId: 'leaf-canopy',
    surfaceMode: 'light',
  },
  {
    id: 'meridian',
    businessName: 'Meridian',
    tagline: 'CAPITAL PARTNERS',
    industry: 'Finance & Legal',
    style: 'monogram',
    archetype: 'monogram-crest',
    paletteId: 'obsidian-amber',
    primaryFontId: 'cinzel',
    secondaryFontId: 'manrope',
    iconId: 'shield-pillar',
    surfaceMode: 'light',
  },
  {
    id: 'vespera',
    businessName: 'Vespera',
    tagline: 'EDITORIAL ATELIER',
    industry: 'Retail & Fashion',
    style: 'modern',
    archetype: 'split-emblem',
    paletteId: 'dark-emerald-sand',
    primaryFontId: 'playfair',
    secondaryFontId: 'dm-sans',
    iconId: 'diamond-facet',
    surfaceMode: 'dark',
  },
  {
    id: 'atelier-arch',
    businessName: 'Monolith Arch',
    tagline: 'TIMBER & CONCRETE',
    industry: 'Architecture & Real Estate',
    style: '3d',
    archetype: 'stacked',
    paletteId: 'terracotta-olive',
    primaryFontId: 'syne',
    secondaryFontId: 'dm-sans',
    iconId: 'arch-spire',
    surfaceMode: 'light',
  },
];

interface LandingViewProps {
  initialBrandName: string;
  savedProjectsCount: number;
  onStartWithBrandName: (brandName: string, industry: IndustryCategory) => void;
  onOpenBlankEditor: () => void;
  onOpenSampleInEditor: (brief: BrandBrief, doc: LogoDocument) => void;
  onOpenProjects: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  initialBrandName,
  savedProjectsCount,
  onStartWithBrandName,
  onOpenBlankEditor,
  onOpenSampleInEditor,
  onOpenProjects,
}) => {
  const [brandInput, setBrandInput] = useState<string>(initialBrandName || '');
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryCategory>('Tech & AI');
  const [heroArchetype, setHeroArchetype] = useState<LayoutArchetype>('icon-left');
  const [validationError, setValidationError] = useState<string | null>(null);

  const liveHeroName = brandInput.trim() || 'Forma Atelier';

  const liveHeroDoc = useMemo(() => {
    const previewBrief: BrandBrief = {
      businessName: liveHeroName,
      tagline: selectedIndustry.toUpperCase(),
      audience: 'Modern customers',
      industry: selectedIndustry,
      style: 'modern',
      symbolIdea: 'geometric mark',
      paletteId: 'forest-sand',
      primaryFontId: 'outfit',
      secondaryFontId: 'plus-jakarta',
    };
    return buildDocumentForArchetype(previewBrief, heroArchetype, 'modern');
  }, [liveHeroName, selectedIndustry, heroArchetype]);

  const sampleCards = useMemo(() => {
    return SAMPLE_SPECIMENS.map((spec) => {
      const specBrief: BrandBrief = {
        businessName: spec.businessName,
        tagline: spec.tagline,
        audience: 'Design-conscious buyers',
        industry: spec.industry,
        style: spec.style,
        symbolIdea: spec.iconId,
        paletteId: spec.paletteId,
        primaryFontId: spec.primaryFontId,
        secondaryFontId: spec.secondaryFontId,
      };
      const doc = buildDocumentForArchetype(
        specBrief,
        spec.archetype,
        spec.style,
        spec.iconId
      );
      const palette = resolvePalette(spec.paletteId);
      return { spec, brief: specBrief, doc, palette };
    });
  }, []);

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = brandInput.trim();
    if (!trimmed) {
      setValidationError('Please enter your brand name to generate concepts.');
      return;
    }
    setValidationError(null);
    onStartWithBrandName(trimmed, selectedIndustry);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F3EF] text-[#141413]">
      {/* Strict 3-Zone Top Bar */}
      <header className="border-b border-[#DCD9D0] bg-[#FAF9F6]">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-8 px-5 sm:px-8 py-4">
          <button
            type="button"
            onClick={onOpenBlankEditor}
            className="font-display text-xl font-bold tracking-tight text-[#141413] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Forma Studio
          </button>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#55524B]">
            <a
              href="#capabilities"
              className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Capabilities
            </a>
            <a
              href="#showcase"
              className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Logo Showcase
            </a>
            <a
              href="#pricing-tiers"
              className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Free &amp; Pro
            </a>
            {savedProjectsCount > 0 && (
              <button
                type="button"
                onClick={onOpenProjects}
                className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                My Projects ({savedProjectsCount})
              </button>
            )}
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={onOpenBlankEditor}
              className="inline-flex items-center gap-2 rounded-lg bg-[#141413] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2A2926] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Open Canvas Editor
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Proposition + Live Prompt Bar */}
        <section className="border-b border-[#DCD9D0] bg-[#FAF9F6]">
          <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-10 px-5 sm:px-8 py-12 sm:py-16 lg:grid-cols-12 lg:py-20">
            <div className="lg:col-span-7 space-y-6">
              <p className="text-xs font-semibold tracking-wide text-[#1B4332]">
                Vector Logo Maker &amp; Brand Identity Studio
              </p>

              <h1
                className="font-display font-bold tracking-tight text-[#141413] leading-[1.08]"
                style={{ fontSize: 'clamp(2.25rem, 4.2vw, 3.65rem)', textWrap: 'balance' }}
              >
                Build scalable vector logos and print-ready brand kits.
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-[#4F4C45]">
                Enter your brand name to generate twelve geometric lockups, edit every SVG path and curved wordmark on the canvas, inspect WCAG contrast, and export SVG, 4000px PNG, and print PDF packages.
              </p>

              {/* Hero Prompt Bar */}
              <form onSubmit={handleHeroSubmit} className="space-y-2.5 max-w-2xl" noValidate>
                <div className="flex flex-col sm:flex-row items-stretch gap-2 rounded-xl border border-[#CFCBC0] bg-white p-1.5 shadow-xs focus-within:border-[#141413]">
                  <input
                    type="text"
                    value={brandInput}
                    onChange={(e) => {
                      setBrandInput(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="Enter your brand name to start"
                    aria-label="Enter your brand name to start"
                    className="flex-1 bg-transparent px-3.5 py-2.5 text-sm font-medium text-[#141413] placeholder:text-[#8A857B] focus:outline-none min-w-0"
                  />

                  <select
                    value={selectedIndustry}
                    onChange={(e) => setSelectedIndustry(e.target.value as IndustryCategory)}
                    aria-label="Brand industry"
                    className="rounded-lg border border-[#E6E3DA] bg-[#FAF9F6] px-3 py-2 text-xs font-medium text-[#141413] cursor-pointer focus:outline-none"
                  >
                    {INDUSTRY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1B4332] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#143326] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Generate Concepts
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {validationError && (
                  <p className="text-xs font-medium text-red-700" role="alert">
                    {validationError}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-[#5C5951]">
                  <button
                    type="button"
                    onClick={onOpenBlankEditor}
                    className="font-semibold text-[#141413] hover:underline underline-offset-4 cursor-pointer"
                  >
                    Jump straight into Canvas Editor
                  </button>
                  {savedProjectsCount > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={onOpenProjects}
                        className="inline-flex items-center gap-1.5 font-medium text-[#1B4332] hover:underline underline-offset-4 cursor-pointer"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                        Resume saved projects ({savedProjectsCount})
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>

            {/* Live Interactive Specimen Card */}
            <div className="lg:col-span-5">
              <div className="overflow-hidden rounded-2xl border border-[#DCD9D0] bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-[#EAE7DF] px-4 py-2.5">
                  <span className="text-xs font-semibold text-[#141413]">
                    Live Vector Specimen
                  </span>
                  <div className="flex items-center gap-1 rounded-lg bg-[#F4F3EF] p-0.5">
                    {(
                      [
                        { id: 'icon-left', label: 'Horizontal' },
                        { id: 'stacked', label: 'Stacked' },
                        { id: 'badge', label: 'Badge' },
                      ] as const
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setHeroArchetype(mode.id)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                          heroArchetype === mode.id
                            ? 'bg-white text-[#141413] shadow-xs'
                            : 'text-[#5C5951] hover:text-[#141413]'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex aspect-[4/3] items-center justify-center bg-[#FFFFFF] p-6">
                  <LogoDocumentSvg
                    doc={liveHeroDoc}
                    idPrefix="landing-hero-live"
                    className="h-full w-full"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-[#EAE7DF] bg-[#FAF9F6] px-4 py-2.5 text-xs text-[#5C5951]">
                  <span>{selectedIndustry}</span>
                  <span className="font-mono-num">SVG · 4000px PNG · PDF</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Capabilities Bento Grid */}
        <section id="capabilities" className="mx-auto max-w-[1280px] px-5 sm:px-8 py-14 sm:py-16">
          <div className="max-w-2xl space-y-2 mb-8">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#141413]">
              Built for real vector production
            </h2>
            <p className="text-sm sm:text-base text-[#55524B]">
              Every mark, outline, and typographic arc stays editable inside the scene graph before export.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-7 rounded-2xl border border-[#DCD9D0] bg-white p-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1B4332]">
                <Layers className="h-4 w-4" />
                <span>01. Layered SVG Scene-Graph Editor</span>
              </div>
              <h3 className="text-lg font-bold text-[#141413]">
                Direct geometry handles, curved wordmarks, and opentype outlining
              </h3>
              <p className="text-sm leading-relaxed text-[#55524B]">
                Drag, scale, rotate, snap-align, and convert live Google Fonts into pure vector paths so printers and design tools render identical outlines without missing font files.
              </p>
            </div>

            <div className="md:col-span-5 rounded-2xl border border-[#DCD9D0] bg-white p-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1B4332]">
                <Palette className="h-4 w-4" />
                <span>02. Magic Recolor &amp; 4 Variations</span>
              </div>
              <h3 className="text-lg font-bold text-[#141413]">
                Shuffle palettes and duplicate print lockups in one click
              </h3>
              <p className="text-sm leading-relaxed text-[#55524B]">
                Rotate your 3-color brand triad across layers and duplicate your logo into Full Color, All-White, All-Black Monochrome, and an 800×800 Icon-Only Square.
              </p>
            </div>

            <div className="md:col-span-5 rounded-2xl border border-[#DCD9D0] bg-white p-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1B4332]">
                <Sparkles className="h-4 w-4" />
                <span>03. AI Symbol Generation &amp; SVG Tracing</span>
              </div>
              <h3 className="text-lg font-bold text-[#141413]">
                Prompt custom marks and trace raster drafts into vectors
              </h3>
              <p className="text-sm leading-relaxed text-[#55524B]">
                Generate minimalist symbol concepts on demand and automatically vectorize silhouettes into crisp, recolorable multi-path canvas layers.
              </p>
            </div>

            <div className="md:col-span-7 rounded-2xl border border-[#DCD9D0] bg-white p-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1B4332]">
                <Scan className="h-4 w-4" />
                <span>04. Safe-Zone Margins &amp; WCAG Contrast Audit</span>
              </div>
              <h3 className="text-lg font-bold text-[#141413]">
                Catch clipped artwork and illegible color pairings before export
              </h3>
              <p className="text-sm leading-relaxed text-[#55524B]">
                Toggle the 8% print safe-margin overlay directly over the canvas and verify text legibility against solid backgrounds or container badges with one-click contrast repair.
              </p>
            </div>
          </div>
        </section>

        {/* Sample Logo Showcase */}
        <section id="showcase" className="border-y border-[#DCD9D0] bg-[#FAF9F6]">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-8 py-14 sm:py-16">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div className="space-y-1.5">
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#141413]">
                  Sample logo showcase
                </h2>
                <p className="text-sm text-[#55524B]">
                  Rendered live with editable vector primitives. Click any specimen to customize it on the canvas.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenBlankEditor}
                className="text-xs font-semibold text-[#1B4332] hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Start with a blank artboard
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sampleCards.map(({ spec, brief, doc, palette }) => {
                const isDark = spec.surfaceMode === 'dark';
                return (
                  <div
                    key={spec.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-[#DCD9D0] bg-white transition-colors hover:border-[#141413]"
                  >
                    <div
                      className="flex aspect-[4/3] items-center justify-center p-6 border-b border-[#EAE7DF]"
                      style={{ backgroundColor: isDark ? palette.background : '#FFFFFF' }}
                    >
                      <LogoDocumentSvg
                        doc={doc}
                        idPrefix={`showcase-${spec.id}`}
                        forceBackground={isDark ? palette.background : '#FFFFFF'}
                        className="h-full w-full"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-[#141413]">
                          {spec.businessName}
                        </h3>
                        <p className="truncate text-xs text-[#5C5951]">
                          {spec.industry} · {spec.style}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenSampleInEditor(brief, doc)}
                        className="rounded-lg border border-[#DCD9D0] bg-[#FAF9F6] px-3 py-1.5 text-xs font-semibold text-[#141413] hover:border-[#141413] hover:bg-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Edit Logo
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Free vs. Pro Tier Comparison */}
        <section id="pricing-tiers" className="mx-auto max-w-[1280px] px-5 sm:px-8 py-14 sm:py-16">
          <div className="max-w-2xl space-y-2 mb-8">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#141413]">
              Free drafting, Pro production exports
            </h2>
            <p className="text-sm text-[#55524B]">
              Design freely in the studio and preview both Free and Pro deliverables directly inside the Export modal.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Free Plan */}
            <div className="rounded-2xl border border-[#DCD9D0] bg-white p-6 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-baseline justify-between border-b border-[#EAE7DF] pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#141413]">Free Starter</h3>
                    <p className="text-xs text-[#5C5951]">Full studio access for web drafts</p>
                  </div>
                  <span className="font-mono-num text-xl font-bold text-[#141413]">$0</span>
                </div>
                <ul className="space-y-2.5 text-sm text-[#3F3E39]">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#1B4332] shrink-0" />
                    <span>Unlimited canvas editing, mockups &amp; local auto-save</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#1B4332] shrink-0" />
                    <span>Standard 1000px solid-background PNG export</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#1B4332] shrink-0" />
                    <span>Safe-zone margin checks &amp; WCAG contrast diagnostics</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={onOpenBlankEditor}
                className="w-full rounded-lg border border-[#141413] bg-white px-4 py-2.5 text-xs font-semibold text-[#141413] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
              >
                Start Free in Studio
              </button>
            </div>

            {/* Pro Plan */}
            <div className="rounded-2xl border border-[#141413] bg-[#FAF9F6] p-6 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-baseline justify-between border-b border-[#DCD9D0] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-[#141413]">Forma Pro</h3>
                      <span className="inline-flex items-center gap-1 rounded bg-[#1B4332] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        <Crown className="h-2.5 w-2.5" />
                        Pro
                      </span>
                    </div>
                    <p className="text-xs text-[#5C5951]">Complete scalable &amp; print-ready deliverables</p>
                  </div>
                  <span className="font-mono-num text-xl font-bold text-[#141413]">$29</span>
                </div>
                <ul className="space-y-2.5 text-sm text-[#141413]">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#1B4332] shrink-0" />
                    <span>Clean scalable SVG vectors (outlined paths &amp; editable source)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#1B4332] shrink-0" />
                    <span>Transparent &amp; high-res 2000px / 4000px PNG packages</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#1B4332] shrink-0" />
                    <span>2-Page Print-Ready PDF with crop marks &amp; CMYK spec sheet</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#1B4332] shrink-0" />
                    <span>Web Favicon bundle (16/32/180px) &amp; social profile crops</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={onOpenBlankEditor}
                className="w-full rounded-lg bg-[#141413] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2A2926] transition-colors cursor-pointer"
              >
                Design &amp; Preview Pro Exports
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-[#DCD9D0] bg-[#FAF9F6]">
        <div className="mx-auto flex max-w-[1280px] flex-col sm:flex-row items-center justify-between gap-4 px-5 sm:px-8 py-6 text-xs text-[#5C5951]">
          <span className="font-display text-sm font-bold text-[#141413]">Forma Studio</span>
          <div className="flex items-center gap-5">
            <a href="#capabilities" className="hover:text-[#141413]">
              Capabilities
            </a>
            <a href="#showcase" className="hover:text-[#141413]">
              Showcase
            </a>
            <button
              type="button"
              onClick={onOpenBlankEditor}
              className="hover:text-[#141413] cursor-pointer"
            >
              Canvas Editor
            </button>
          </div>
          <span>Vector Logo &amp; Brand Identity Studio</span>
        </div>
      </footer>
    </div>
  );
};
