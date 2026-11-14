import React, { useState } from 'react';
import { Download, FileCode, FileText, Image as ImageIcon, Package, X } from 'lucide-react';
import { BrandBrief, ColorPalette, LogoDocument } from '../types/logo';
import { extractBrandVariants } from '../utils/logoGenerator';
import {
  exportFaviconPackage,
  exportLogoPdf,
  exportLogoPng,
  exportLogoSvg,
} from '../utils/svgExport';
import { LogoDocumentSvg } from './CanvasLayerRenderer';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: LogoDocument;
  brief: BrandBrief;
  palette: ColorPalette;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  doc,
  brief,
  palette,
}) => {
  const [transparentBg, setTransparentBg] = useState<boolean>(true);
  const [outlineText, setOutlineText] = useState<boolean>(true);
  const [pngScale, setPngScale] = useState<number>(3);
  const [busy, setBusy] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [lastExported, setLastExported] = useState<string | null>(null);

  if (!isOpen) return null;

  const runExport = async (label: string, fn: () => Promise<void>) => {
    try {
      setExportError(null);
      setLastExported(null);
      setBusy(label);
      await fn();
      setLastExported(label.toUpperCase());
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'Unable to complete export. Please try again.'
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Export logo package"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-[#DCD9D0] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#EAE7DF] pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-[#141413]">
              Export Brand Assets
            </h2>
            <p className="mt-0.5 text-xs text-[#5C5951]">
              Download scalable vectors, high-resolution transparent PNGs, print-ready PDFs, or a complete favicon bundle.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#5C5951] hover:bg-[#F3F1EB] hover:text-[#141413] cursor-pointer"
            aria-label="Close export modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {exportError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {exportError}
          </div>
        )}
        {lastExported && !exportError && (
          <div className="mt-4 rounded-lg border border-[#1B4332]/25 bg-[#1B4332]/8 px-3 py-2 text-xs font-medium text-[#1B4332]">
            {lastExported} package downloaded cleanly.
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Preview + Settings */}
          <div className="md:col-span-5 space-y-3">
            <div
              className="overflow-hidden rounded-xl border border-[#DCD9D0]"
              style={{
                backgroundImage: transparentBg
                  ? 'linear-gradient(45deg, #ececec 25%, transparent 25%), linear-gradient(-45deg, #ececec 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ececec 75%), linear-gradient(-45deg, transparent 75%, #ececec 75%)'
                  : undefined,
                backgroundSize: transparentBg ? '16px 16px' : undefined,
                backgroundPosition: transparentBg
                  ? '0 0, 0 8px, 8px -8px, -8px 0'
                  : undefined,
              }}
            >
              <LogoDocumentSvg
                doc={doc}
                idPrefix="exp-modal"
                forceBackground={transparentBg ? 'transparent' : doc.backgroundColor}
                className="aspect-[4/3] w-full block"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-[#141413] cursor-pointer">
              <input
                type="checkbox"
                checked={transparentBg}
                onChange={(e) => setTransparentBg(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-[#141413]"
              />
              Transparent Background (SVG / PNG)
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-[#141413] cursor-pointer">
              <input
                type="checkbox"
                checked={outlineText}
                onChange={(e) => setOutlineText(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-[#141413]"
              />
              Convert Text to Outlined Paths
            </label>

            <div>
              <label className="block text-[11px] font-semibold text-[#5C5951]">
                PNG Output Resolution
              </label>
              <select
                value={pngScale}
                onChange={(e) => setPngScale(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-[#DCD9D0] bg-[#FAF9F6] px-2.5 py-1.5 text-xs font-mono-num text-[#141413]"
              >
                <option value={1}>1× Standard (800 × 600 px)</option>
                <option value={2}>2× Retina (1600 × 1200 px)</option>
                <option value={3}>3× High-Res (2400 × 1800 px)</option>
                <option value={5}>5× Print Ultra (4000 × 3000 px)</option>
              </select>
            </div>
          </div>

          {/* 4 Export Action Cards */}
          <div className="md:col-span-7 space-y-2.5">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                runExport('svg', () =>
                  exportLogoSvg(doc, { transparentBackground: transparentBg, outlineText })
                )
              }
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#DCD9D0] bg-[#FAF9F6] p-3.5 text-left hover:border-[#141413] hover:bg-white transition-colors cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <FileCode className="h-5 w-5 text-[#1B4332] shrink-0" />
                <div>
                  <p className="text-sm font-bold text-[#141413]">Clean Vector SVG</p>
                  <p className="text-xs text-[#5C5951]">
                    Infinitely scalable XML vector for Figma, Illustrator &amp; web
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md bg-[#141413] px-3 py-1.5 text-xs font-semibold text-white shrink-0">
                <Download className="h-3.5 w-3.5" />
                {busy === 'svg' ? 'Saving...' : 'SVG'}
              </span>
            </button>

            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                runExport('png', () => exportLogoPng(doc, pngScale, transparentBg))
              }
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#DCD9D0] bg-[#FAF9F6] p-3.5 text-left hover:border-[#141413] hover:bg-white transition-colors cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <ImageIcon className="h-5 w-5 text-[#1B4332] shrink-0" />
                <div>
                  <p className="text-sm font-bold text-[#141413]">High-Resolution PNG</p>
                  <p className="text-xs text-[#5C5951] font-mono-num">
                    {doc.width * pngScale} × {doc.height * pngScale} px ·{' '}
                    {transparentBg ? 'Transparent' : 'Solid'}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md bg-[#141413] px-3 py-1.5 text-xs font-semibold text-white shrink-0">
                <Download className="h-3.5 w-3.5" />
                {busy === 'png' ? 'Rendering...' : 'PNG'}
              </span>
            </button>

            <button
              type="button"
              disabled={busy !== null}
              onClick={() => runExport('pdf', () => exportLogoPdf(doc, palette))}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#DCD9D0] bg-[#FAF9F6] p-3.5 text-left hover:border-[#141413] hover:bg-white transition-colors cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-[#1B4332] shrink-0" />
                <div>
                  <p className="text-sm font-bold text-[#141413]">Print-Ready Brand PDF</p>
                  <p className="text-xs text-[#5C5951]">
                    A4 proof sheet with primary lockup &amp; hex color specs
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md bg-[#141413] px-3 py-1.5 text-xs font-semibold text-white shrink-0">
                <Download className="h-3.5 w-3.5" />
                {busy === 'pdf' ? 'Building...' : 'PDF'}
              </span>
            </button>

            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                runExport('fav', async () => {
                  const variants = extractBrandVariants(doc, brief, palette);
                  await exportFaviconPackage(variants.markOnlyDocument, brief.businessName);
                })
              }
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#DCD9D0] bg-[#FAF9F6] p-3.5 text-left hover:border-[#141413] hover:bg-white transition-colors cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-[#1B4332] shrink-0" />
                <div>
                  <p className="text-sm font-bold text-[#141413]">Favicon Package (.zip)</p>
                  <p className="text-xs text-[#5C5951]">
                    16/32/48/180/192/512 PNGs, favicon.svg, site.webmanifest &amp; HTML
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md bg-[#141413] px-3 py-1.5 text-xs font-semibold text-white shrink-0">
                <Download className="h-3.5 w-3.5" />
                {busy === 'fav' ? 'Zipping...' : 'ZIP'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
