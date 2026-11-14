import React, { useMemo, useState } from 'react';
import { BookmarkPlus, Check, Copy, Download, PenLine, Trash2 } from 'lucide-react';
import { FONT_OPTIONS } from '../data/logoLibrary';
import {
  BrandBrief,
  ColorPalette,
  LogoDocument,
  SavedBrandKit,
  TextLayer,
} from '../types/logo';
import { extractBrandVariants } from '../utils/logoGenerator';
import { exportLogoPng, exportLogoSvg } from '../utils/svgExport';
import { LogoDocumentSvg } from './CanvasLayerRenderer';

interface BrandKitViewProps {
  activeDoc: LogoDocument;
  brief: BrandBrief;
  palette: ColorPalette;
  savedKits: SavedBrandKit[];
  onSaveKit: () => void;
  onLoadKit: (kit: SavedBrandKit) => void;
  onDeleteKit: (id: string) => void;
  onOpenDocInEditor: (doc: LogoDocument) => void;
}

function hexToRgbLabel(hex: string): string {
  const clean = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return 'RGB —';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

export const BrandKitView: React.FC<BrandKitViewProps> = ({
  activeDoc,
  brief,
  palette,
  savedKits,
  onSaveKit,
  onLoadKit,
  onDeleteKit,
  onOpenDocInEditor,
}) => {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [busyExport, setBusyExport] = useState<string | null>(null);

  const variations = useMemo(
    () => extractBrandVariants(activeDoc, brief, palette),
    [activeDoc, brief, palette]
  );

  // Collect core palette swatches + any unique custom hex colors used on active canvas layers
  const colorSpecs = useMemo(() => {
    const base: Array<{ role: string; hex: string }> = [
      { role: 'Primary Brand', hex: palette.primary },
      { role: 'Accent Highlight', hex: palette.accent },
      { role: 'Secondary Surface', hex: palette.secondary },
      { role: 'Typography Ink', hex: palette.text },
      { role: 'Canvas Backdrop', hex: activeDoc.backgroundColor },
    ];

    const seen = new Set(base.map((b) => b.hex.toUpperCase()));
    let customIdx = 1;
    activeDoc.layers.forEach((l) => {
      const candidates = [
        l.fill,
        l.stroke,
        l.type === 'icon' ? l.accentFill : undefined,
        l.type === 'icon' ? l.secondaryFill : undefined,
      ];
      candidates.forEach((c) => {
        if (c && /^#[0-9a-fA-F]{6}$/.test(c.trim()) && !seen.has(c.trim().toUpperCase())) {
          seen.add(c.trim().toUpperCase());
          base.push({ role: `Custom Color ${customIdx++}`, hex: c.trim() });
        }
      });
    });

    return base;
  }, [palette, activeDoc]);

  // Extract fonts actively used on the canvas (plus brief defaults)
  const fontSpecs = useMemo(() => {
    const textLayers = activeDoc.layers.filter((l): l is TextLayer => l.type === 'text');
    const entries: Array<{
      role: string;
      name: string;
      cssFamily: string;
      category: string;
      weight: number;
      tracking: string;
    }> = [];
    const seen = new Set<string>();

    textLayers.forEach((tl, idx) => {
      const meta = FONT_OPTIONS.find((f) => f.id === tl.fontId);
      const rawName =
        meta?.name ||
        tl.fontFamily.split(',')[0]?.replace(/['"]/g, '').trim() ||
        'Display Sans';
      const key = `${rawName.toLowerCase()}-${tl.fontWeight}`;
      if (seen.has(key)) return;
      seen.add(key);
      entries.push({
        role: idx === 0 ? 'Primary Heading' : `Type Layer ${idx + 1}`,
        name: rawName,
        cssFamily: tl.fontFamily,
        category: meta?.category ?? 'Google Font',
        weight: tl.fontWeight,
        tracking: `${tl.letterSpacing.toFixed(2)}em`,
      });
    });

    if (entries.length === 0) {
      const pf = FONT_OPTIONS.find((f) => f.id === brief.primaryFontId) ?? FONT_OPTIONS[0];
      const sf = FONT_OPTIONS.find((f) => f.id === brief.secondaryFontId) ?? FONT_OPTIONS[1];
      entries.push(
        {
          role: 'Primary Heading',
          name: pf.name,
          cssFamily: pf.cssFamily,
          category: pf.category,
          weight: 700,
          tracking: '0.04em',
        },
        {
          role: 'Secondary / Tagline',
          name: sf.name,
          cssFamily: sf.cssFamily,
          category: sf.category,
          weight: 500,
          tracking: '0.16em',
        }
      );
    }

    return entries;
  }, [activeDoc.layers, brief.primaryFontId, brief.secondaryFontId]);

  const variationCards: Array<{
    id: string;
    title: string;
    subtitle: string;
    doc: LogoDocument;
    forceDarkBackdrop?: boolean;
  }> = [
    {
      id: 'primary',
      title: 'Primary Color Lockup',
      subtitle: 'Master horizontal or badge brand signature',
      doc: variations.primaryDocument,
    },
    {
      id: 'dark-mode',
      title: 'Dark Mode Lockup',
      subtitle: 'High-luminance adaptation for #0F1115 obsidian surfaces',
      doc: variations.darkModeDocument,
      forceDarkBackdrop: true,
    },
    {
      id: 'mono-ink',
      title: 'Monochrome (Ink)',
      subtitle: 'Single-ink #141413 print, embossing & watermark ready',
      doc: variations.monochromeDocument,
    },
    {
      id: 'mono-rev',
      title: 'Monochrome (Reversed)',
      subtitle: 'Pure white #FFFFFF knockout on deep charcoal',
      doc: variations.monochromeReversedDocument,
      forceDarkBackdrop: true,
    },
    {
      id: 'icon-only',
      title: 'Icon-Only Mark',
      subtitle: 'Centered standalone emblem for favicons & app icons',
      doc: variations.markOnlyDocument,
    },
    {
      id: 'wordmark',
      title: 'Wordmark Lockup',
      subtitle: 'Typography-only lockup for narrow headers & footers',
      doc: variations.wordmarkDocument,
    },
  ];

  const handleCopyHex = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex.toUpperCase());
      setCopiedHex(hex);
      window.setTimeout(() => setCopiedHex((cur) => (cur === hex ? null : cur)), 1600);
    } catch {
      setCopiedHex(hex);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#DCD9D0] bg-white px-6 py-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1B4332]">
            Brand Identity Guidelines
          </p>
          <h1 className="font-display mt-1 text-2xl sm:text-3xl font-bold text-[#141413]">
            {brief.businessName || 'Untitled Brand'} — Brand Kit
          </h1>
          <p className="mt-1 text-xs text-[#5C5951]">
            Palette: {palette.name} · Industry: {brief.industry} · Style: {brief.style}
          </p>
        </div>

        <button
          type="button"
          onClick={onSaveKit}
          className="inline-flex items-center gap-2 rounded-lg bg-[#141413] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2A2926] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <BookmarkPlus className="h-3.5 w-3.5" />
          Save Brand Kit
        </button>
      </section>

      {/* Color Hex Codes & Font Specifications */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Hex Color System */}
        <section className="lg:col-span-6 rounded-xl border border-[#DCD9D0] bg-white p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#EAE7DF] pb-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5C5951]">
              Color Palette &amp; Hex Codes
            </h2>
            <span className="font-mono-num text-[11px] text-[#6B675E]">
              {colorSpecs.length} swatches
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {colorSpecs.map((item) => {
              const isCopied = copiedHex?.toLowerCase() === item.hex.toLowerCase();
              return (
                <div
                  key={`${item.role}-${item.hex}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#E6E3DA] bg-[#FAF9F6] p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="h-11 w-11 shrink-0 rounded-lg border border-black/15 shadow-xs"
                      style={{ backgroundColor: item.hex }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[#141413]">{item.role}</p>
                      <p className="font-mono-num text-xs font-semibold uppercase text-[#141413]">
                        {item.hex}
                      </p>
                      <p className="font-mono-num text-[10px] text-[#6B675E]">
                        {hexToRgbLabel(item.hex)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleCopyHex(item.hex)}
                    className="inline-flex items-center gap-1 rounded-md border border-[#DCD9D0] bg-white px-2 py-1.5 text-[10.5px] font-semibold text-[#141413] hover:bg-[#EFECE4] cursor-pointer shrink-0"
                    title={`Copy ${item.hex}`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3 w-3 text-[#1B4332]" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Font Names & Specimens */}
        <section className="lg:col-span-6 rounded-xl border border-[#DCD9D0] bg-white p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#EAE7DF] pb-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5C5951]">
              Typography &amp; Font Names
            </h2>
            <span className="font-mono-num text-[11px] text-[#6B675E]">
              {fontSpecs.length} active faces
            </span>
          </div>

          <div className="space-y-3">
            {fontSpecs.map((font) => (
              <div
                key={`${font.role}-${font.name}-${font.weight}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-[#E6E3DA] bg-[#FAF9F6] p-4"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#6B675E]">
                    {font.role} · {font.category}
                  </p>
                  <p
                    className="truncate text-xl font-bold text-[#141413]"
                    style={{ fontFamily: font.cssFamily, fontWeight: font.weight }}
                  >
                    {font.name}
                  </p>
                  <p className="font-mono-num text-[11px] text-[#5C5951]">
                    Weight {font.weight} · Tracking {font.tracking}
                  </p>
                </div>

                <div
                  className="shrink-0 rounded-lg border border-[#DCD9D0] bg-white px-3.5 py-2 text-2xl text-[#141413]"
                  style={{ fontFamily: font.cssFamily, fontWeight: font.weight }}
                >
                  Aa Bb
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Secondary Logo Variations */}
      <section className="rounded-xl border border-[#DCD9D0] bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAE7DF] pb-3">
          <div>
            <h2 className="font-display text-xl font-bold text-[#141413]">
              Secondary Logo Variations
            </h2>
            <p className="text-xs text-[#5C5951]">
              Automatically generated dark mode, monochrome, icon-only, and wordmark assets ready for editing or vector download.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {variationCards.map((card) => (
            <div
              key={card.id}
              className="flex flex-col justify-between rounded-xl border border-[#DCD9D0] bg-[#FAF9F6] p-4"
            >
              <div>
                <div
                  className={`overflow-hidden rounded-lg border ${
                    card.forceDarkBackdrop
                      ? 'border-black/30 bg-[#0F1115]'
                      : 'border-[#E6E3DA] bg-white'
                  }`}
                >
                  <LogoDocumentSvg
                    doc={card.doc}
                    idPrefix={`bk-var-${card.id}`}
                    className="aspect-[4/3] w-full block"
                  />
                </div>
                <h3 className="mt-3 text-sm font-bold text-[#141413]">{card.title}</h3>
                <p className="mt-0.5 text-xs text-[#5C5951]">{card.subtitle}</p>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-[#E6E3DA] pt-3">
                <button
                  type="button"
                  onClick={() => onOpenDocInEditor(card.doc)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#141413] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2A2926] cursor-pointer"
                >
                  <PenLine className="h-3 w-3" />
                  Edit
                </button>
                <button
                  type="button"
                  disabled={busyExport !== null}
                  onClick={async () => {
                    setBusyExport(`${card.id}-svg`);
                    try {
                      await exportLogoSvg(card.doc, {
                        transparentBackground: card.id !== 'dark-mode' && card.id !== 'mono-rev',
                        outlineText: true,
                      });
                    } finally {
                      setBusyExport(null);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#DCD9D0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#141413] hover:bg-[#EFECE4] cursor-pointer disabled:opacity-60"
                >
                  <Download className="h-3 w-3" />
                  SVG
                </button>
                <button
                  type="button"
                  disabled={busyExport !== null}
                  onClick={async () => {
                    setBusyExport(`${card.id}-png`);
                    try {
                      await exportLogoPng(card.doc, 2, false);
                    } finally {
                      setBusyExport(null);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#DCD9D0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#141413] hover:bg-[#EFECE4] cursor-pointer disabled:opacity-60"
                >
                  PNG
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Saved Brand Kits Library */}
      <section className="rounded-xl border border-[#DCD9D0] bg-white p-6">
        <h2 className="font-display text-xl font-bold text-[#141413]">
          Saved Brand Kits ({savedKits.length})
        </h2>
        {savedKits.length === 0 ? (
          <p className="mt-2 text-xs text-[#5C5951]">
            No brand kits saved yet. Click &ldquo;Save Brand Kit&rdquo; above to archive your active logo, hex palette, and font pairing locally.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {savedKits.map((kit) => (
              <div
                key={kit.id}
                className="flex flex-col justify-between rounded-xl border border-[#E2DFD7] bg-[#FAF9F6] p-3.5"
              >
                <div className="overflow-hidden rounded-lg border border-[#E6E3DA] bg-white mb-3">
                  <LogoDocumentSvg
                    doc={kit.primaryDocument}
                    idPrefix={`kit-${kit.id}`}
                    className="aspect-[4/3] w-full block"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#141413] truncate">{kit.name}</p>
                    <p className="text-[11px] text-[#6B675E] truncate">{kit.palette.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onLoadKit(kit)}
                      className="rounded-md bg-[#141413] px-2.5 py-1.5 text-xs font-semibold text-white cursor-pointer"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteKit(kit.id)}
                      className="rounded-md p-1.5 text-[#6B675E] hover:text-red-700 cursor-pointer"
                      aria-label={`Delete ${kit.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
