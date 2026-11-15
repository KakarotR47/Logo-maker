import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  MessageSquare,
  Moon,
  Sparkles,
  Sun,
} from 'lucide-react';
import { FONT_OPTIONS } from '../data/logoLibrary';
import { BrandBrief, ColorPalette, LogoDocument, TextLayer } from '../types/logo';
import { exportBrandGuidelinesPdf } from '../utils/brandBookPdf';
import {
  ClientApprovalStatus,
  ClientSharePayload,
  loadClientApprovalState,
  saveClientApprovalState,
} from '../utils/clientShare';
import { getColorSpecs, isLightHex } from '../utils/colorSpecs';
import { loadGoogleFont } from '../utils/googleFonts';
import { extractBrandVariants } from '../utils/logoGenerator';
import { resolveSolidBackground } from '../utils/svgExport';
import { LogoDocumentSvg } from './CanvasLayerRenderer';

interface ClientPreviewViewProps {
  payload: ClientSharePayload;
  shareToken: string;
  isFromStudioSession: boolean;
  onExitPreview: () => void;
}

export const ClientPreviewView: React.FC<ClientPreviewViewProps> = ({
  payload,
  shareToken,
  isFromStudioSession,
  onExitPreview,
}) => {
  const { doc, brief, palette, designerNote, createdAt } = payload;

  const [phoneTheme, setPhoneTheme] = useState<'dark' | 'light'>('dark');
  const [boxAngle, setBoxAngle] = useState<'obsidian' | 'sand'>('obsidian');
  const [pdfBusy, setPdfBusy] = useState<boolean>(false);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const initialApproval = useMemo(
    () => loadClientApprovalState(shareToken),
    [shareToken]
  );
  const [approvalStatus, setApprovalStatus] = useState<ClientApprovalStatus>(
    initialApproval.status
  );
  const [feedbackText, setFeedbackText] = useState<string>(initialApproval.comment);
  const [feedbackOpen, setFeedbackOpen] = useState<boolean>(false);

  // Ensure fonts inside standalone client link render authentically
  useEffect(() => {
    doc.layers.forEach((layer) => {
      if (layer.type === 'text') {
        const family = layer.fontFamily.split(',')[0]?.replace(/['"]/g, '').trim();
        if (family) {
          void loadGoogleFont(family, [layer.fontWeight || 700, 400, 700]);
        }
      }
    });
  }, [doc]);

  const variants = useMemo(
    () => extractBrandVariants(doc, brief, palette),
    [doc, brief, palette]
  );

  const solidBg = useMemo(
    () => resolveSolidBackground(doc, palette),
    [doc, palette]
  );

  const brandName = brief.businessName || doc.title || 'Brand Identity';
  const tagline = brief.tagline || brief.industry;

  const typographySpecs = useMemo(() => {
    const texts = doc.layers
      .filter((l): l is TextLayer => l.type === 'text' && l.visible)
      .sort((a, b) => b.fontSize - a.fontSize);

    const resolveFontName = (fontId?: string, cssFamily?: string) => {
      const found = fontId ? FONT_OPTIONS.find((f) => f.id === fontId) : undefined;
      if (found) return found;
      const clean = cssFamily?.split(',')[0]?.replace(/['"]/g, '').trim();
      return (
        FONT_OPTIONS.find((f) => f.name.toLowerCase() === clean?.toLowerCase()) ?? {
          id: 'custom',
          name: clean || 'Display Sans',
          cssFamily: cssFamily || 'sans-serif',
          category: 'Display' as const,
          weights: [400, 600, 700],
          ttfUrl: '',
        }
      );
    };

    const primaryFont = resolveFontName(
      texts[0]?.fontId ?? brief.primaryFontId,
      texts[0]?.fontFamily
    );
    const secondaryFont = resolveFontName(
      texts[1]?.fontId ?? brief.secondaryFontId,
      texts[1]?.fontFamily
    );
    return { primaryFont, secondaryFont };
  }, [doc.layers, brief.primaryFontId, brief.secondaryFontId]);

  const colorCards = useMemo(
    () => [
      { role: 'Primary', hex: palette.primary },
      { role: 'Accent', hex: palette.accent },
      { role: 'Secondary', hex: palette.secondary },
      { role: 'Typography Ink', hex: palette.text },
      { role: 'Canvas Surface', hex: solidBg },
    ],
    [palette, solidBg]
  );

  const handleSetApproval = (nextStatus: ClientApprovalStatus) => {
    setApprovalStatus(nextStatus);
    saveClientApprovalState(shareToken, {
      status: nextStatus,
      comment: feedbackText,
    });
    setNotice(
      nextStatus === 'approved'
        ? 'Design marked as Approved for handoff.'
        : 'Revision feedback saved for designer review.'
    );
    window.setTimeout(() => setNotice(null), 2800);
  };

  const handleCopyColor = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      window.setTimeout(() => setCopiedHex(null), 1600);
    } catch {
      // Ignore clipboard error
    }
  };

  const handleDownloadBrandBook = async () => {
    try {
      setPdfBusy(true);
      await exportBrandGuidelinesPdf(doc, palette, brief);
      setNotice('6-page Brand Guidelines PDF downloaded.');
      window.setTimeout(() => setNotice(null), 2800);
    } finally {
      setPdfBusy(false);
    }
  };

  const primaryIsLightBg = isLightHex(palette.primary);

  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[#141413]">
      {/* Minimal Client Presentation Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[#E3E0D7] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-[#DCD9D0] p-1 flex items-center justify-center"
              style={{ backgroundColor: solidBg }}
            >
              <LogoDocumentSvg
                doc={variants.markOnlyDocument}
                idPrefix="client-nav-mark"
                forceBackground={solidBg}
                className="h-full w-full"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-sm sm:text-base font-bold text-[#141413] truncate">
                  {brandName}
                </span>
                <span className="rounded border border-[#DCD9D0] bg-[#FAF9F6] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#5C5951] shrink-0">
                  Client Preview
                </span>
              </div>
              <p className="text-[11px] text-[#6B675E] truncate">
                Prepared {createdAt.slice(0, 10)} · {brief.industry}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pdfBusy}
              onClick={handleDownloadBrandBook}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#DCD9D0] bg-white px-3.5 text-xs font-semibold text-[#141413] hover:border-[#141413] transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {pdfBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1B4332]" />
              ) : (
                <BookOpen className="h-3.5 w-3.5 text-[#1B4332]" />
              )}
              {pdfBusy ? 'Generating Brand Book...' : 'Brand Guidelines PDF'}
            </button>

            <button
              type="button"
              onClick={() => handleSetApproval('approved')}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                approvalStatus === 'approved'
                  ? 'bg-[#1B4332] text-white'
                  : 'bg-[#141413] text-white hover:bg-[#2A2926]'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {approvalStatus === 'approved' ? 'Approved' : 'Approve Concept'}
            </button>

            <button
              type="button"
              onClick={() => setFeedbackOpen((v) => !v)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                approvalStatus === 'changes-requested'
                  ? 'border-amber-600 bg-amber-50 text-amber-800'
                  : 'border-[#DCD9D0] bg-white text-[#4A4740] hover:border-[#141413]'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Notes
            </button>

            <button
              type="button"
              onClick={onExitPreview}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#DCD9D0] bg-[#FAF9F6] px-3 text-xs font-semibold text-[#141413] hover:bg-[#EFECE4] cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {isFromStudioSession ? 'Back to Editor' : 'Open in Studio'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1320px] px-5 py-8 sm:py-10 space-y-10">
        {notice && (
          <div className="flex items-center gap-2 rounded-xl border border-[#1B4332]/25 bg-[#1B4332]/8 px-4 py-2.5 text-xs font-semibold text-[#1B4332]">
            <Check className="h-4 w-4 shrink-0" />
            {notice}
          </div>
        )}

        {/* Revision Note Drawer */}
        {feedbackOpen && (
          <section className="rounded-2xl border border-[#DCD9D0] bg-white p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#141413]">
                Client Feedback &amp; Approval Status
              </h2>
              <span className="font-mono-num text-[11px] uppercase tracking-wider text-[#6B675E]">
                Status: {approvalStatus.replace('-', ' ')}
              </span>
            </div>
            <textarea
              rows={2}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Leave feedback on proportions, colorway, spacing, or signage contrasts..."
              className="w-full rounded-xl border border-[#DCD9D0] bg-[#FAF9F6] px-3.5 py-2.5 text-xs text-[#141413] focus:border-[#1B4332] focus:outline-hidden"
            />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleSetApproval('changes-requested')}
                className="rounded-lg border border-amber-600/40 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 cursor-pointer"
              >
                Request Revisions
              </button>
              <button
                type="button"
                onClick={() => handleSetApproval('approved')}
                className="rounded-lg bg-[#1B4332] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#143326] cursor-pointer"
              >
                Save &amp; Approve
              </button>
            </div>
          </section>
        )}

        {/* 1. HERO PRESENTATION STAGE */}
        <section className="rounded-2xl border border-[#DCD9D0] bg-white overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#EAE7DF]">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1B4332]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Brand Identity Presentation
                </div>
                <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#141413]">
                  {brandName}
                </h1>
                <p className="text-sm text-[#5C5951] leading-relaxed">
                  {tagline}
                </p>

                {designerNote && (
                  <div className="rounded-xl border border-[#E6E3DA] bg-[#FAF9F6] p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B675E]">
                      Designer Presentation Note
                    </span>
                    <p className="text-xs text-[#2E2D29] leading-relaxed">{designerNote}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-5 border-t border-[#EAE7DF] grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#7A756B]">
                    Industry
                  </span>
                  <span className="font-semibold text-[#141413]">{brief.industry}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#7A756B]">
                    Direction
                  </span>
                  <span className="font-semibold capitalize text-[#141413]">{brief.style}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#7A756B]">
                    Palette
                  </span>
                  <span className="font-semibold text-[#141413]">{palette.name}</span>
                </div>
              </div>
            </div>

            <div
              className="lg:col-span-7 flex items-center justify-center p-8 sm:p-12 min-h-[320px]"
              style={{ backgroundColor: solidBg }}
            >
              <div className="w-full max-w-[460px]">
                <LogoDocumentSvg
                  doc={doc}
                  idPrefix="client-hero-primary"
                  forceBackground={solidBg}
                  className="aspect-[4/3] w-full block"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 2. LIGHT & DARK SURFACE CONTRAST SUITE */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#1B4332]">
                01 · Surface Polarity
              </p>
              <h2 className="font-display text-2xl font-bold text-[#141413]">
                Light &amp; Dark Background Lockups
              </h2>
            </div>
            <p className="text-xs text-[#5C5951]">
              Automatically calibrated across optic light, warm editorial paper, deep obsidian dark UI, and brand ink surfaces.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pure Light */}
            <article className="rounded-xl border border-[#DCD9D0] bg-white p-4 space-y-3">
              <div className="flex h-44 items-center justify-center rounded-lg border border-[#ECE9E0] bg-white p-4">
                <LogoDocumentSvg
                  doc={variants.primaryDocument}
                  idPrefix="client-surf-light"
                  forceBackground="transparent"
                  className="aspect-[4/3] w-full max-h-full block"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#141413]">Optic White</span>
                <span className="font-mono-num text-[11px] text-[#6B675E]">#FFFFFF</span>
              </div>
            </article>

            {/* Dark Obsidian */}
            <article className="rounded-xl border border-[#242733] bg-[#0B0D14] p-4 space-y-3">
              <div className="flex h-44 items-center justify-center rounded-lg border border-white/10 bg-[#11141E] p-4">
                <LogoDocumentSvg
                  doc={variants.darkModeDocument}
                  idPrefix="client-surf-dark"
                  forceBackground="transparent"
                  className="aspect-[4/3] w-full max-h-full block"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Deep Obsidian (Dark UI)</span>
                <span className="font-mono-num text-[11px] text-slate-400">#0B0D14</span>
              </div>
            </article>

            {/* Brand Primary Tint */}
            <article
              className="rounded-xl border border-black/10 p-4 space-y-3"
              style={{ backgroundColor: palette.primary }}
            >
              <div className="flex h-44 items-center justify-center rounded-lg border border-white/15 bg-black/5 p-4">
                <LogoDocumentSvg
                  doc={primaryIsLightBg ? variants.primaryDocument : variants.darkModeDocument}
                  idPrefix="client-surf-brand"
                  forceBackground="transparent"
                  className="aspect-[4/3] w-full max-h-full block"
                />
              </div>
              <div
                className={`flex items-center justify-between text-xs ${
                  primaryIsLightBg ? 'text-[#141413]' : 'text-white'
                }`}
              >
                <span className="font-bold">Brand Primary Backdrop</span>
                <span className="font-mono-num text-[11px] opacity-80">
                  {palette.primary.toUpperCase()}
                </span>
              </div>
            </article>

            {/* Monochrome Ink */}
            <article className="rounded-xl border border-[#DCD9D0] bg-[#EFECE4] p-4 space-y-3">
              <div className="flex h-44 items-center justify-center rounded-lg border border-[#DCD9D0] bg-[#FAF8F2] p-4">
                <LogoDocumentSvg
                  doc={variants.monochromeDocument}
                  idPrefix="client-surf-mono"
                  forceBackground="transparent"
                  className="aspect-[4/3] w-full max-h-full block"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#141413]">Monochrome Emboss</span>
                <span className="font-mono-num text-[11px] text-[#6B675E]">1-COLOR INK</span>
              </div>
            </article>
          </div>
        </section>

        {/* 3. 3D & REAL-WORLD MOCKUPS */}
        <section className="space-y-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#1B4332]">
              02 · Spatial &amp; 3D Applications
            </p>
            <h2 className="font-display text-2xl font-bold text-[#141413]">
              3D Mockups &amp; Digital Surfaces
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 3D Perspective Floating Business Cards */}
            <article className="lg:col-span-6 rounded-2xl border border-[#DCD9D0] bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#141413]">
                    3D Isometric Stationery Suite
                  </h3>
                  <p className="text-[11px] text-[#6B675E]">
                    Duplex cotton stock · Dark Obsidian Front &amp; Crisp Editorial Back
                  </p>
                </div>
              </div>

              <div
                className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#EAE6DC] via-[#DFDBD0] to-[#CFC9BA] p-6 sm:p-10 min-h-[270px] overflow-hidden"
                style={{ perspective: '1100px' }}
              >
                <div className="relative flex flex-col sm:flex-row items-center gap-5">
                  {/* 3D Tilted Dark Front Card */}
                  <div
                    className="w-56 aspect-[1.75/1] rounded-xl bg-[#111319] p-4 shadow-[0_24px_40px_rgba(12,14,20,0.34)] ring-1 ring-white/15 flex items-center justify-center transition-transform duration-300 hover:scale-[1.03]"
                    style={{
                      transform: 'rotateY(14deg) rotateX(10deg) rotateZ(-4deg)',
                    }}
                  >
                    <LogoDocumentSvg
                      doc={variants.darkModeDocument}
                      idPrefix="client-3d-card-dark"
                      forceBackground="transparent"
                      className="aspect-[4/3] w-4/5 block"
                    />
                  </div>

                  {/* 3D Tilted Light Back Card */}
                  <div
                    className="w-56 aspect-[1.75/1] rounded-xl bg-[#FCFBF7] p-4 shadow-[0_22px_36px_rgba(17,24,39,0.22)] ring-1 ring-black/10 flex flex-col justify-between transition-transform duration-300 hover:scale-[1.03]"
                    style={{
                      transform: 'rotateY(-12deg) rotateX(8deg) rotateZ(3deg)',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-16">
                        <LogoDocumentSvg
                          doc={variants.markOnlyDocument}
                          idPrefix="client-3d-card-light"
                          forceBackground="transparent"
                          className="aspect-[4/3] w-full block"
                        />
                      </div>
                      <span
                        className="h-2 w-8 rounded-xs"
                        style={{ backgroundColor: palette.accent }}
                      />
                    </div>
                    <div className="border-t border-[#E6E3DA] pt-1.5 text-[9px] text-[#4A4740]">
                      <p className="font-bold text-[#141413] truncate">{brandName}</p>
                      <p className="truncate text-[#6B675E]">{tagline}</p>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            {/* 3D Packaging Cube & Architectural Signage */}
            <article className="lg:col-span-6 rounded-2xl border border-[#DCD9D0] bg-white p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#141413]">
                    3D Branded Packaging &amp; Signage
                  </h3>
                  <p className="text-[11px] text-[#6B675E]">
                    Rigid presentation box with 3D extruded bevels
                  </p>
                </div>
                <div className="inline-flex rounded-lg border border-[#DCD9D0] bg-[#FAF9F6] p-0.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setBoxAngle('obsidian')}
                    className={`rounded-md px-2.5 py-1 cursor-pointer ${
                      boxAngle === 'obsidian' ? 'bg-[#141413] text-white' : 'text-[#5C5951]'
                    }`}
                  >
                    Obsidian Box
                  </button>
                  <button
                    type="button"
                    onClick={() => setBoxAngle('sand')}
                    className={`rounded-md px-2.5 py-1 cursor-pointer ${
                      boxAngle === 'sand' ? 'bg-[#141413] text-white' : 'text-[#5C5951]'
                    }`}
                  >
                    Kraft Ivory
                  </button>
                </div>
              </div>

              <div
                className="relative flex items-center justify-center rounded-xl bg-gradient-to-b from-[#1D2028] to-[#111319] p-6 sm:p-8 min-h-[270px] overflow-hidden"
                style={{ perspective: '1000px' }}
              >
                {/* 3D Packaging Box */}
                <div
                  className="relative flex items-end justify-center"
                  style={{ transformStyle: 'preserve-3d', transform: 'rotateX(12deg) rotateY(-18deg)' }}
                >
                  {/* Main Front Face */}
                  <div
                    className={`relative z-10 flex h-44 w-56 items-center justify-center rounded-sm border p-6 shadow-[0_26px_45px_rgba(0,0,0,0.45)] ${
                      boxAngle === 'obsidian'
                        ? 'border-white/15 bg-gradient-to-br from-[#191C24] to-[#0E1015]'
                        : 'border-black/15 bg-gradient-to-br from-[#F7F4EC] to-[#E6DFD0]'
                    }`}
                  >
                    <LogoDocumentSvg
                      doc={
                        boxAngle === 'obsidian'
                          ? variants.darkModeDocument
                          : variants.primaryDocument
                      }
                      idPrefix="client-3d-box"
                      forceBackground="transparent"
                      className="aspect-[4/3] w-full block"
                    />
                  </div>
                  {/* Right 3D Extruded Side Panel */}
                  <div
                    className={`h-44 w-12 origin-left rounded-r-sm border-y border-r ${
                      boxAngle === 'obsidian'
                        ? 'border-white/10 bg-[#0A0B0F]'
                        : 'border-black/10 bg-[#CFC7B6]'
                    }`}
                    style={{ transform: 'skewY(-20deg) translateY(-9px)' }}
                  />
                </div>
              </div>
            </article>

            {/* Mobile App & Web Header Preview (Light / Dark Switcher) */}
            <article className="lg:col-span-6 rounded-2xl border border-[#DCD9D0] bg-white p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#141413]">
                    Digital Product &amp; App Launcher
                  </h3>
                  <p className="text-[11px] text-[#6B675E]">
                    App squircle + browser bookmark &amp; header lockup
                  </p>
                </div>
                <div className="inline-flex rounded-lg border border-[#DCD9D0] bg-[#FAF9F6] p-0.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setPhoneTheme('dark')}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 cursor-pointer ${
                      phoneTheme === 'dark' ? 'bg-[#141413] text-white' : 'text-[#5C5951]'
                    }`}
                  >
                    <Moon className="h-3 w-3" />
                    Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhoneTheme('light')}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 cursor-pointer ${
                      phoneTheme === 'light' ? 'bg-[#141413] text-white' : 'text-[#5C5951]'
                    }`}
                  >
                    <Sun className="h-3 w-3" />
                    Light
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 rounded-xl bg-gradient-to-br from-[#EAE6DC] to-[#D6D0C4] p-6 min-h-[250px]">
                {/* App Squircle */}
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="h-24 w-24 overflow-hidden rounded-[22px] p-3 shadow-[0_16px_28px_rgba(0,0,0,0.22)] ring-1 ring-black/10"
                    style={{
                      backgroundColor: phoneTheme === 'dark' ? '#13161F' : '#FFFFFF',
                    }}
                  >
                    <LogoDocumentSvg
                      doc={
                        phoneTheme === 'dark'
                          ? variants.darkModeDocument
                          : variants.markOnlyDocument
                      }
                      idPrefix="client-app-squircle"
                      forceBackground="transparent"
                      className="h-full w-full"
                    />
                  </div>
                  <span className="font-mono-num text-[10px] font-semibold text-[#4A4740]">
                    iOS / Android App Icon
                  </span>
                </div>

                {/* Browser Navigation Card */}
                <div
                  className={`w-full max-w-[270px] rounded-xl border p-3.5 shadow-md transition-colors ${
                    phoneTheme === 'dark'
                      ? 'border-white/10 bg-[#12151E] text-white'
                      : 'border-[#DCD9D0] bg-white text-[#141413]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 border-b border-current/10 pb-2 mb-3">
                    <span className="h-2 w-2 rounded-full bg-red-400/80" />
                    <span className="h-2 w-2 rounded-full bg-amber-400/80" />
                    <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                    <span className="ml-2 truncate font-mono-num text-[10px] opacity-65">
                      https://{brandName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'brand'}.com
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-9 w-28">
                      <LogoDocumentSvg
                        doc={
                          phoneTheme === 'dark'
                            ? variants.darkModeDocument
                            : variants.primaryDocument
                        }
                        idPrefix="client-web-header"
                        forceBackground="transparent"
                        className="h-full w-full"
                      />
                    </div>
                    <div className="flex gap-2 text-[9px] opacity-70 font-medium">
                      <span>Work</span>
                      <span>About</span>
                      <span>Contact</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            {/* 3D Illuminated Storefront Blade & Ceramic Vessel */}
            <article className="lg:col-span-6 rounded-2xl border border-[#DCD9D0] bg-white p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#141413]">
                  Architectural Storefront &amp; Ceramic Vessel
                </h3>
                <p className="text-[11px] text-[#6B675E]">
                  Warm backlit fascia sign alongside matte stoneware mug
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-gradient-to-b from-[#23262F] to-[#15171D] p-5 min-h-[250px] items-center">
                {/* Illuminated Fascia */}
                <div className="rounded-lg border border-white/15 bg-[#0D0F14] p-4 shadow-[0_0_28px_rgba(255,244,214,0.12)]">
                  <LogoDocumentSvg
                    doc={variants.darkModeDocument}
                    idPrefix="client-fascia-sign"
                    forceBackground="transparent"
                    className="aspect-[4/3] w-full block"
                  />
                </div>

                {/* Ceramic Mug */}
                <div className="relative flex items-center justify-center">
                  <svg viewBox="0 0 240 210" className="h-44 w-auto drop-shadow-[0_14px_20px_rgba(0,0,0,0.4)]">
                    <defs>
                      <linearGradient id="client-mug-cyl" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#E1DDD4" />
                        <stop offset="30%" stopColor="#FFFFFF" />
                        <stop offset="75%" stopColor="#F4F2EC" />
                        <stop offset="100%" stopColor="#C9C4B8" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M168 62 C205 62, 210 138, 165 142"
                      fill="none"
                      stroke="#E9E5DC"
                      strokeWidth="15"
                      strokeLinecap="round"
                    />
                    <path
                      d="M54 44 H172 V160 C172 178, 54 178, 54 160 Z"
                      fill="url(#client-mug-cyl)"
                    />
                    <ellipse cx="113" cy="44" rx="59" ry="12" fill="#EDEAE2" />
                    <ellipse cx="113" cy="45" rx="51" ry="8" fill="#3B2416" />
                  </svg>
                  <div className="absolute top-[74px] left-[45%] -translate-x-1/2 w-20">
                    <LogoDocumentSvg
                      doc={variants.primaryDocument}
                      idPrefix="client-mug-logo"
                      forceBackground="transparent"
                      className="aspect-[4/3] w-full block"
                    />
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* 4. COLOR SPECIFICATIONS & TYPOGRAPHY HIERARCHY */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Palette HEX / RGB / CMYK */}
          <div className="lg:col-span-7 rounded-2xl border border-[#DCD9D0] bg-white p-6 space-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#1B4332]">
                03 · Color Standards
              </p>
              <h2 className="font-display text-xl font-bold text-[#141413]">
                Brand Palette (HEX · RGB · CMYK)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {colorCards.map((c) => {
                const spec = getColorSpecs(c.hex);
                return (
                  <button
                    key={`${c.role}-${spec.hex}`}
                    type="button"
                    onClick={() => handleCopyColor(spec.hex)}
                    className="flex items-center gap-3 rounded-xl border border-[#E5E2D9] bg-[#FAF9F6] p-3 text-left hover:border-[#141413] transition-colors cursor-pointer"
                  >
                    <span
                      className="h-12 w-12 shrink-0 rounded-lg border border-black/15"
                      style={{ backgroundColor: spec.hex }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#141413]">{c.role}</span>
                        {copiedHex === spec.hex ? (
                          <span className="text-[10px] font-semibold text-[#1B4332] inline-flex items-center gap-0.5">
                            <Check className="h-3 w-3" /> Copied
                          </span>
                        ) : (
                          <Copy className="h-3 w-3 text-[#8C877D]" />
                        )}
                      </div>
                      <p className="font-mono-num text-[11px] font-semibold text-[#141413]">
                        {spec.hex} · {spec.rgbLabel}
                      </p>
                      <p className="font-mono-num text-[10.5px] text-[#6B675E]">
                        {spec.cmykLabel}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Typography Hierarchy */}
          <div className="lg:col-span-5 rounded-2xl border border-[#DCD9D0] bg-white p-6 space-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#1B4332]">
                04 · Typography
              </p>
              <h2 className="font-display text-xl font-bold text-[#141413]">
                Typeface Pairing
              </h2>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-[#E5E2D9] bg-[#FAF9F6] p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B675E]">
                  Display &amp; Logotype · {typographySpecs.primaryFont.category}
                </span>
                <p
                  className="text-2xl font-bold text-[#141413]"
                  style={{ fontFamily: typographySpecs.primaryFont.cssFamily }}
                >
                  {typographySpecs.primaryFont.name}
                </p>
                <p
                  className="text-sm text-[#4A4740]"
                  style={{ fontFamily: typographySpecs.primaryFont.cssFamily }}
                >
                  {brandName} — Aa Bb Cc Dd 0123456789
                </p>
              </div>

              <div className="rounded-xl border border-[#E5E2D9] bg-[#FAF9F6] p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B675E]">
                  Secondary &amp; UI Body · {typographySpecs.secondaryFont.category}
                </span>
                <p
                  className="text-xl font-semibold text-[#141413]"
                  style={{ fontFamily: typographySpecs.secondaryFont.cssFamily }}
                >
                  {typographySpecs.secondaryFont.name}
                </p>
                <p
                  className="text-xs text-[#4A4740]"
                  style={{ fontFamily: typographySpecs.secondaryFont.cssFamily }}
                >
                  {tagline} · Balanced proportions &amp; crisp hierarchy.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
