import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  Crown,
  Download,
  FileCode,
  FileText,
  Globe,
  Image as ImageIcon,
  Loader2,
  Lock,
  Package,
  Share2,
  X,
} from 'lucide-react';
import { BrandBrief, ColorPalette, LogoDocument } from '../types/logo';
import { exportBrandGuidelinesPdf } from '../utils/brandBookPdf';
import {
  CheckoutProvider,
  getConfiguredCheckoutUrl,
  PLAN_ENTITLEMENTS,
  PlanTier,
} from '../types/monetization';
import { extractBrandVariants } from '../utils/logoGenerator';
import {
  computeProportionalDimensions,
  exportCompleteBrandZip,
  exportFaviconPackage,
  exportLogoPdf,
  exportLogoPng,
  exportLogoSvg,
  FAVICON_SPECS,
  resolveSolidBackground,
  SOCIAL_CROP_SPECS,
} from '../utils/svgExport';
import { LogoDocumentSvg } from './CanvasLayerRenderer';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: LogoDocument;
  brief: BrandBrief;
  palette: ColorPalette;
  planTier?: PlanTier;
  onChangePlanTier?: (tier: PlanTier) => void;
  onOpenShareModal?: () => void;
}

type PreviewTab = 'master' | 'avatar' | 'banner';

const ProBadge: React.FC<{ locked?: boolean }> = ({ locked }) => (
  <span
    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0 ${
      locked
        ? 'bg-[#141413] text-white'
        : 'bg-[#1B4332]/12 text-[#1B4332]'
    }`}
  >
    {locked ? <Lock className="h-2.5 w-2.5" /> : <Crown className="h-2.5 w-2.5" />}
    Pro
  </span>
);

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  doc,
  brief,
  palette,
  planTier: controlledPlanTier,
  onChangePlanTier,
  onOpenShareModal,
}) => {
  const [internalPlanTier, setInternalPlanTier] = useState<PlanTier>('pro');
  const planTier = controlledPlanTier ?? internalPlanTier;
  const setPlanTier = (nextTier: PlanTier) => {
    setInternalPlanTier(nextTier);
    onChangePlanTier?.(nextTier);
  };
  const entitlements = PLAN_ENTITLEMENTS[planTier];
  const isPro = planTier === 'pro';

  const [upgradeFeatureLabel, setUpgradeFeatureLabel] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<CheckoutProvider>('stripe');
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('master');
  const [previewTransparent, setPreviewTransparent] = useState<boolean>(true);
  const [outlineText, setOutlineText] = useState<boolean>(true);
  const [cropSource, setCropSource] = useState<'mark' | 'full'>('mark');

  // ZIP bundle section toggles
  const [includeSvg, setIncludeSvg] = useState<boolean>(true);
  const [includePngs, setIncludePngs] = useState<boolean>(true);
  const [includePdf, setIncludePdf] = useState<boolean>(true);
  const [includeWebAndSocial, setIncludeWebAndSocial] = useState<boolean>(true);

  // Individual quick-export controls
  const [singlePngSize, setSinglePngSize] = useState<1000 | 2000 | 4000>(2000);
  const [singlePngTransparent, setSinglePngTransparent] = useState<boolean>(true);
  const [singleSvgTransparent, setSingleSvgTransparent] = useState<boolean>(true);

  // Busy / Progress / Status state
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [zipProgress, setZipProgress] = useState<{
    step: number;
    total: number;
    label: string;
  } | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && busyKey === null) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, busyKey, onClose]);

  const solidBg = useMemo(
    () => resolveSolidBackground(doc, palette),
    [doc, palette]
  );

  const variants = useMemo(
    () => extractBrandVariants(doc, brief, palette),
    [doc, brief, palette]
  );

  const activeCropDoc = cropSource === 'mark' ? variants.markOnlyDocument : doc;

  const dims1000 = useMemo(() => computeProportionalDimensions(doc, 1000), [doc]);
  const dims2000 = useMemo(() => computeProportionalDimensions(doc, 2000), [doc]);
  const dims4000 = useMemo(() => computeProportionalDimensions(doc, 4000), [doc]);
  const singlePngDims =
    singlePngSize === 1000 ? dims1000 : singlePngSize === 2000 ? dims2000 : dims4000;

  if (!isOpen) return null;

  const totalSelectedFiles =
    1 + // README.txt
    (includeSvg ? 4 : 0) +
    (includePngs ? 6 : 0) +
    (includePdf ? 1 : 0) +
    (includeWebAndSocial ? FAVICON_SPECS.length + 5 + SOCIAL_CROP_SPECS.length : 0);

  const hasAnySection = includeSvg || includePngs || includePdf || includeWebAndSocial;

  const effectivePngSize: 1000 | 2000 | 4000 = isPro ? singlePngSize : 1000;
  const effectivePngTransparent = isPro ? singlePngTransparent : false;
  const effectiveSinglePngDims =
    effectivePngSize === 1000 ? dims1000 : effectivePngSize === 2000 ? dims2000 : dims4000;

  const requireProOrRun = (featureLabel: string, action: () => void) => {
    if (!isPro) {
      setUpgradeFeatureLabel(featureLabel);
      setCheckoutNotice(null);
      return;
    }
    setUpgradeFeatureLabel(null);
    action();
  };

  const runExport = async (key: string, fn: () => Promise<string>) => {
    try {
      setExportError(null);
      setSuccessMessage(null);
      setBusyKey(key);
      const msg = await fn();
      setSuccessMessage(msg);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'Unable to complete export. Please try again.'
      );
    } finally {
      setBusyKey(null);
      setZipProgress(null);
    }
  };

  const handleDownloadFullZip = () => {
    if (!hasAnySection) return;
    requireProOrRun('Complete Brand Kit ZIP Archive', () => {
      void runExport('zip', async () => {
        const result = await exportCompleteBrandZip(doc, brief, palette, {
          includeSvg,
          includePngs,
          includePdf,
          includeWebAndSocial,
          outlineTextInSvg: outlineText,
          cropSource,
          solidBackgroundOverride: solidBg,
          onProgress: (info) => setZipProgress(info),
        });
        return `Packaged ${result.fileCount} brand assets into ${result.zipFileName}.`;
      });
    });
  };

  const configuredCheckoutUrl = getConfiguredCheckoutUrl(selectedProvider);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-5 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Multi-format export studio"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && busyKey === null) onClose();
      }}
    >
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-[#DCD9D0] bg-white p-5 sm:p-6 shadow-2xl">
        {/* Modal Header + Free vs Pro Tier Toggle */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EAE7DF] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#1B4332]/10 text-[#1B4332]">
                <Package className="h-4 w-4" />
              </span>
              <h2 className="font-display text-xl font-bold text-[#141413]">
                Multi-Format Brand Export
              </h2>
            </div>
            <p className="mt-1 text-xs text-[#5C5951]">
              {isPro
                ? 'Pro Plan active: unlimited scalable SVGs, 4000px transparent PNGs, print PDF, favicons & full Brand Kit ZIP.'
                : 'Free Plan: standard 1000px solid PNG included. Switch to Pro to unlock transparent high-res, SVG, PDF & Brand Kit ZIP.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Free vs. Pro Tier Toggle */}
            <div
              className="inline-flex items-center rounded-lg border border-[#DCD9D0] bg-[#FAF9F6] p-0.5"
              role="group"
              aria-label="Export plan tier"
            >
              <button
                type="button"
                onClick={() => {
                  setPlanTier('free');
                  setUpgradeFeatureLabel(null);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  planTier === 'free'
                    ? 'bg-white text-[#141413] shadow-xs'
                    : 'text-[#5C5951] hover:text-[#141413]'
                }`}
              >
                Free Plan
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlanTier('pro');
                  setUpgradeFeatureLabel(null);
                  setCheckoutNotice(null);
                }}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  planTier === 'pro'
                    ? 'bg-[#141413] text-white shadow-xs'
                    : 'text-[#5C5951] hover:text-[#141413]'
                }`}
              >
                <Crown className="h-3 w-3" />
                Pro Plan
              </button>
            </div>

            <button
              type="button"
              disabled={busyKey !== null}
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#5C5951] hover:bg-[#F3F1EB] hover:text-[#141413] cursor-pointer disabled:opacity-40"
              aria-label="Close export modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Inline Pro Upgrade Prompt Card (Ready for Stripe / LemonSqueezy Integration) */}
        {!isPro && upgradeFeatureLabel && (
          <div className="mt-4 rounded-xl border border-[#141413] bg-[#FAF9F6] p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ProBadge locked />
                  <h3 className="text-sm font-bold text-[#141413]">
                    {upgradeFeatureLabel} requires Forma Pro
                  </h3>
                </div>
                <p className="text-xs text-[#5C5951]">
                  One-time upgrade ({entitlements.priceDisplay} in Pro: {PLAN_ENTITLEMENTS.pro.priceDisplay}) unlocks scalable SVG vectors, transparent 2000px/4000px PNGs, 2-page Print PDF, and complete Brand Kit ZIPs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUpgradeFeatureLabel(null)}
                className="text-xs text-[#5C5951] hover:text-[#141413] cursor-pointer"
              >
                Dismiss
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E6E3DA] pt-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-[#5C5951]">Checkout provider:</span>
                {(['stripe', 'lemonsqueezy'] as const).map((prov) => (
                  <button
                    key={prov}
                    type="button"
                    onClick={() => {
                      setSelectedProvider(prov);
                      setCheckoutNotice(null);
                    }}
                    className={`rounded-md border px-2 py-1 text-[11px] font-semibold cursor-pointer ${
                      selectedProvider === prov
                        ? 'border-[#141413] bg-white text-[#141413]'
                        : 'border-transparent text-[#5C5951] hover:text-[#141413]'
                    }`}
                  >
                    {prov === 'stripe' ? 'Stripe' : 'LemonSqueezy'}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {configuredCheckoutUrl ? (
                  <a
                    href={configuredCheckoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B4332] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#143326]"
                  >
                    <Crown className="h-3.5 w-3.5" />
                    Continue to {selectedProvider === 'stripe' ? 'Stripe' : 'LemonSqueezy'} Checkout
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setCheckoutNotice(
                        `Ready for ${
                          selectedProvider === 'stripe' ? 'Stripe' : 'LemonSqueezy'
                        }: set ${
                          selectedProvider === 'stripe'
                            ? 'VITE_STRIPE_CHECKOUT_URL'
                            : 'VITE_LEMONSQUEEZY_CHECKOUT_URL'
                        } in your environment to route live payments, or click "Preview Pro Mode".`
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#141413] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#2A2926] cursor-pointer"
                  >
                    <Crown className="h-3.5 w-3.5" />
                    Upgrade via {selectedProvider === 'stripe' ? 'Stripe' : 'LemonSqueezy'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setPlanTier('pro');
                    setUpgradeFeatureLabel(null);
                    setCheckoutNotice(null);
                  }}
                  className="rounded-lg border border-[#DCD9D0] bg-white px-3 py-2 text-xs font-semibold text-[#141413] hover:border-[#141413] cursor-pointer"
                >
                  Preview Pro Mode
                </button>
              </div>
            </div>

            {checkoutNotice && (
              <p className="rounded-lg border border-[#DCD9D0] bg-white px-3 py-2 text-[11px] text-[#3F3E39]">
                {checkoutNotice}
              </p>
            )}
          </div>
        )}

        {/* Status Feedback */}
        {exportError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            {exportError}
          </div>
        )}
        {successMessage && !exportError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#1B4332]/25 bg-[#1B4332]/8 px-3.5 py-2.5 text-xs font-medium text-[#1B4332]">
            <Check className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Visual Previews + Global Export Options */}
          <div className="lg:col-span-5 space-y-4">
            {/* Preview Tab Switcher */}
            <div className="flex items-center justify-between gap-2 rounded-xl border border-[#DCD9D0] bg-[#FAF9F6] p-1">
              {(
                [
                  { id: 'master', label: 'Master Logo' },
                  { id: 'avatar', label: 'Favicon & Avatar' },
                  { id: 'banner', label: 'Social Cover' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPreviewTab(tab.id)}
                  className={`flex-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                    previewTab === tab.id
                      ? 'bg-[#141413] text-white shadow-xs'
                      : 'text-[#5C5951] hover:text-[#141413]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Preview Stage */}
            {previewTab === 'master' && (
              <div className="space-y-2">
                <div
                  className="relative overflow-hidden rounded-xl border border-[#DCD9D0]"
                  style={{
                    backgroundImage: previewTransparent
                      ? 'linear-gradient(45deg, #ececec 25%, transparent 25%), linear-gradient(-45deg, #ececec 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ececec 75%), linear-gradient(-45deg, transparent 75%, #ececec 75%)'
                      : undefined,
                    backgroundSize: previewTransparent ? '16px 16px' : undefined,
                    backgroundPosition: previewTransparent
                      ? '0 0, 0 8px, 8px -8px, -8px 0'
                      : undefined,
                    backgroundColor: previewTransparent ? '#FAFAFA' : solidBg,
                  }}
                >
                  <LogoDocumentSvg
                    doc={doc}
                    idPrefix="exp-modal-master"
                    forceBackground={previewTransparent ? 'transparent' : solidBg}
                    className="aspect-[4/3] w-full block"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#5C5951]">
                  <span className="font-mono-num">
                    Artboard: {doc.width} × {doc.height}
                  </span>
                  <div className="inline-flex rounded-lg border border-[#DCD9D0] bg-[#FAF9F6] p-0.5">
                    <button
                      type="button"
                      onClick={() => setPreviewTransparent(true)}
                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${
                        previewTransparent ? 'bg-white text-[#141413] shadow-xs' : 'text-[#5C5951]'
                      }`}
                    >
                      Transparent
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTransparent(false)}
                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${
                        !previewTransparent ? 'bg-white text-[#141413] shadow-xs' : 'text-[#5C5951]'
                      }`}
                    >
                      Solid
                    </button>
                  </div>
                </div>
              </div>
            )}

            {previewTab === 'avatar' && (
              <div className="rounded-xl border border-[#DCD9D0] bg-[#FAF9F6] p-4 space-y-4">
                <div className="flex items-center justify-around gap-4">
                  {/* Circular Social Profile Preview */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-[#DCD9D0] shadow-xs flex items-center justify-center p-3"
                      style={{ backgroundColor: solidBg }}
                    >
                      <LogoDocumentSvg
                        doc={activeCropDoc}
                        idPrefix="exp-modal-circle"
                        forceBackground={solidBg}
                        className="h-full w-full"
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-[#5C5951]">
                      Social Avatar (Circular)
                    </span>
                  </div>

                  {/* Apple Touch Icon 180x180 & Browser Tab 32x32 / 16x16 */}
                  <div className="flex flex-col items-center gap-2.5">
                    <div
                      className="h-16 w-16 overflow-hidden rounded-2xl border border-[#DCD9D0] shadow-xs p-2 flex items-center justify-center"
                      style={{ backgroundColor: solidBg }}
                    >
                      <LogoDocumentSvg
                        doc={activeCropDoc}
                        idPrefix="exp-modal-apple"
                        forceBackground={solidBg}
                        className="h-full w-full"
                      />
                    </div>
                    <span className="text-[10px] font-mono-num text-[#5C5951]">180×180 iOS</span>

                    <div className="flex items-center gap-2 rounded-lg border border-[#DCD9D0] bg-white px-2.5 py-1.5">
                      <div
                        className="h-5 w-5 overflow-hidden rounded-xs flex items-center justify-center p-0.5"
                        style={{ backgroundColor: solidBg }}
                      >
                        <LogoDocumentSvg
                          doc={activeCropDoc}
                          idPrefix="exp-modal-fav32"
                          forceBackground={solidBg}
                          className="h-full w-full"
                        />
                      </div>
                      <span className="text-[10px] font-medium text-[#141413] truncate max-w-[90px]">
                        {brief.businessName || doc.title}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-[#5C5951] text-center">
                  Auto-fitted with safe circular &amp; square margins on{' '}
                  <span className="font-mono-num font-semibold text-[#141413]">{solidBg.toUpperCase()}</span>
                </p>
              </div>
            )}

            {previewTab === 'banner' && (
              <div className="rounded-xl border border-[#DCD9D0] bg-[#FAF9F6] p-3.5 space-y-3">
                <div
                  className="overflow-hidden rounded-lg border border-[#DCD9D0] aspect-[1200/630] flex items-center justify-center p-6"
                  style={{ backgroundColor: solidBg }}
                >
                  <LogoDocumentSvg
                    doc={doc}
                    idPrefix="exp-modal-og"
                    forceBackground={solidBg}
                    className="h-full w-full"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#5C5951]">
                  <span>OpenGraph Share Card (1200×630)</span>
                  <span>+ 1500×500 Header</span>
                </div>
              </div>
            )}

            {/* Global Export Settings */}
            <div className="rounded-xl border border-[#DCD9D0] bg-[#FAF9F6] p-3.5 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#5C5951]">
                Export Settings
              </p>

              <label className="flex items-start gap-2.5 text-xs font-medium text-[#141413] cursor-pointer">
                <input
                  type="checkbox"
                  checked={outlineText}
                  onChange={(e) => setOutlineText(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded accent-[#1B4332]"
                />
                <span>
                  Outline SVG text to vector paths
                  <span className="block text-[11px] font-normal text-[#5C5951]">
                    Guarantees exact typography in Illustrator &amp; Figma without font installs.
                  </span>
                </span>
              </label>

              <div>
                <span className="block text-[11px] font-semibold text-[#5C5951] mb-1.5">
                  Favicon &amp; Profile Avatar Crop
                </span>
                <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-[#DCD9D0] bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setCropSource('mark')}
                    className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                      cropSource === 'mark'
                        ? 'bg-[#1B4332] text-white'
                        : 'text-[#5C5951] hover:text-[#141413]'
                    }`}
                  >
                    Symbol Mark
                  </button>
                  <button
                    type="button"
                    onClick={() => setCropSource('full')}
                    className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                      cropSource === 'full'
                        ? 'bg-[#1B4332] text-white'
                        : 'text-[#5C5951] hover:text-[#141413]'
                    }`}
                  >
                    Full Lockup
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[#EAE7DF] text-[11px]">
                <span className="text-[#5C5951]">Solid Export Background</span>
                <span className="inline-flex items-center gap-1.5 font-mono-num font-semibold text-[#141413]">
                  <span
                    className="h-3 w-3 rounded-xs border border-black/15"
                    style={{ backgroundColor: solidBg }}
                  />
                  {solidBg.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Complete ZIP Bundle + Individual Format Quick Exports */}
          <div className="lg:col-span-7 space-y-4">
            {/* Complete Brand ZIP Package Builder */}
            <div className="rounded-2xl border border-[#1B4332]/30 bg-[#FAF9F6] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#141413]">
                      Complete Brand Kit Archive (.zip)
                    </h3>
                    <ProBadge locked={!isPro} />
                  </div>
                  <p className="text-[11px] text-[#5C5951]">
                    Select deliverable folders to package into a single organized download.
                  </p>
                </div>
                <span className="rounded-md bg-[#1B4332]/10 px-2 py-1 text-[11px] font-mono-num font-semibold text-[#1B4332]">
                  {totalSelectedFiles} files
                </span>
              </div>

              {/* 4 Deliverable Bundle Checkboxes */}
              <div className="space-y-2">
                <label className="flex items-start gap-2.5 rounded-xl border border-[#DCD9D0] bg-white p-2.5 cursor-pointer hover:border-[#141413]/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeSvg}
                    onChange={(e) => setIncludeSvg(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded accent-[#1B4332]"
                  />
                  <FileCode className="mt-0.5 h-4 w-4 text-[#1B4332] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#141413]">
                        Clean Scalable SVG Vectors
                      </span>
                      <span className="text-[10px] font-mono-num text-[#5C5951]">4 SVGs</span>
                    </div>
                    <p className="text-[11px] text-[#5C5951]">
                      Solid, transparent, editable-text source, and standalone mark SVG.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 rounded-xl border border-[#DCD9D0] bg-white p-2.5 cursor-pointer hover:border-[#141413]/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={includePngs}
                    onChange={(e) => setIncludePngs(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded accent-[#1B4332]"
                  />
                  <ImageIcon className="mt-0.5 h-4 w-4 text-[#1B4332] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#141413]">
                        High-Resolution PNGs (1000 / 2000 / 4000px)
                      </span>
                      <span className="text-[10px] font-mono-num text-[#5C5951]">6 PNGs</span>
                    </div>
                    <p className="text-[11px] text-[#5C5951] font-mono-num">
                      Solid + Transparent · {dims1000.width}×{dims1000.height}, {dims2000.width}×{dims2000.height}, {dims4000.width}×{dims4000.height}
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 rounded-xl border border-[#DCD9D0] bg-white p-2.5 cursor-pointer hover:border-[#141413]/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={includePdf}
                    onChange={(e) => setIncludePdf(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded accent-[#1B4332]"
                  />
                  <FileText className="mt-0.5 h-4 w-4 text-[#1B4332] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#141413]">
                        Print-Ready Master PDF
                      </span>
                      <span className="text-[10px] font-mono-num text-[#5C5951]">2-Page A4</span>
                    </div>
                    <p className="text-[11px] text-[#5C5951]">
                      Crop marks &amp; registration proof + CMYK / RGB / HEX brand color spec sheet.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 rounded-xl border border-[#DCD9D0] bg-white p-2.5 cursor-pointer hover:border-[#141413]/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeWebAndSocial}
                    onChange={(e) => setIncludeWebAndSocial(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded accent-[#1B4332]"
                  />
                  <Globe className="mt-0.5 h-4 w-4 text-[#1B4332] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#141413]">
                        Web Favicons &amp; Social Media Crops
                      </span>
                      <span className="text-[10px] font-mono-num text-[#5C5951]">
                        15 assets
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5C5951]">
                      16×16, 32×32, 180×180, SVG &amp; manifest + Instagram, YouTube, X, LinkedIn, Facebook &amp; OG crops.
                    </p>
                  </div>
                </label>
              </div>

              {/* Packaging Progress Bar */}
              {zipProgress && (
                <div className="space-y-1.5 rounded-xl border border-[#DCD9D0] bg-white px-3 py-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-[#141413] truncate pr-2">
                      {zipProgress.label}
                    </span>
                    <span className="font-mono-num font-semibold text-[#1B4332] shrink-0">
                      {zipProgress.step}/{zipProgress.total}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EAE7DF]">
                    <div
                      className="h-full bg-[#1B4332] transition-all duration-150"
                      style={{
                        width: `${Math.round((zipProgress.step / Math.max(1, zipProgress.total)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Primary ZIP Download CTA */}
              <button
                type="button"
                disabled={busyKey !== null || !hasAnySection}
                onClick={handleDownloadFullZip}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#141413] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2A2926] transition-colors cursor-pointer disabled:opacity-50"
              >
                {busyKey === 'zip' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Packaging Multi-Format ZIP...
                  </>
                ) : isPro ? (
                  <>
                    <Download className="h-4 w-4" />
                    Download Complete Brand ZIP ({totalSelectedFiles} files)
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Unlock Complete Brand Kit ZIP ({totalSelectedFiles} files)
                  </>
                )}
              </button>
            </div>

            {/* Automated 6-Page Brand Guidelines Book & Client Presentation Card */}
            <div className="rounded-2xl border border-[#DCD9D0] bg-[#FAF9F6] p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#141413]">
                      Automated Brand Guidelines Book &amp; Client Presentation
                    </h3>
                    <span className="rounded bg-[#1B4332]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1B4332]">
                      6-Page PDF
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#5C5951]">
                    Auto-generates Cover, Primary Logo &amp; Lockups, 1x Clear Space &amp; Min Size, HEX/RGB/CMYK Palette, Typography Hierarchy, and Visual Do’s &amp; Don’ts.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={busyKey !== null}
                  onClick={() =>
                    void runExport('brandbook', async () => {
                      await exportBrandGuidelinesPdf(doc, palette, brief);
                      return '6-page Brand Guidelines Presentation PDF downloaded.';
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1B4332] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#143326] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {busyKey === 'brandbook' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Building 6-Page Book...
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-3.5 w-3.5" />
                      Download Brand Guidelines PDF
                    </>
                  )}
                </button>

                {onOpenShareModal && (
                  <button
                    type="button"
                    disabled={busyKey !== null}
                    onClick={() => {
                      onClose();
                      onOpenShareModal();
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DCD9D0] bg-white px-4 py-2.5 text-xs font-semibold text-[#141413] hover:border-[#141413] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Share2 className="h-3.5 w-3.5 text-[#1B4332]" />
                    Share Client Preview Link
                  </button>
                )}
              </div>
            </div>

            {/* Individual Quick Downloads */}
            <div className="space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#5C5951]">
                Or Download Individual Files
              </p>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {/* Single SVG (PRO) */}
                <div className="rounded-xl border border-[#DCD9D0] bg-[#FAF9F6] p-3 flex flex-col justify-between gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#141413]">Vector SVG</span>
                      <ProBadge locked={!isPro} />
                    </div>
                    <div className="inline-flex rounded-md border border-[#DCD9D0] bg-white p-0.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setSingleSvgTransparent(true)}
                        className={`rounded-xs px-1.5 py-0.5 font-semibold cursor-pointer ${
                          singleSvgTransparent ? 'bg-[#141413] text-white' : 'text-[#5C5951]'
                        }`}
                      >
                        Alpha
                      </button>
                      <button
                        type="button"
                        onClick={() => setSingleSvgTransparent(false)}
                        className={`rounded-xs px-1.5 py-0.5 font-semibold cursor-pointer ${
                          !singleSvgTransparent ? 'bg-[#141413] text-white' : 'text-[#5C5951]'
                        }`}
                      >
                        Solid
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busyKey !== null}
                    onClick={() =>
                      requireProOrRun('Scalable Vector SVG Export', () => {
                        void runExport('svg', async () => {
                          await exportLogoSvg(doc, {
                            transparentBackground: singleSvgTransparent,
                            outlineText,
                            forceBackground: singleSvgTransparent ? 'transparent' : solidBg,
                          });
                          return 'Clean scalable SVG downloaded.';
                        });
                      })
                    }
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#DCD9D0] bg-white px-3 py-1.5 text-xs font-semibold text-[#141413] hover:border-[#141413] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isPro ? (
                      <FileCode className="h-3.5 w-3.5 text-[#1B4332]" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-[#5C5951]" />
                    )}
                    {busyKey === 'svg' ? 'Saving...' : 'Download SVG'}
                  </button>
                </div>

                {/* PNG Export (1000px Solid FREE; Transparent & 2000/4000px PRO) */}
                <div className="rounded-xl border border-[#DCD9D0] bg-[#FAF9F6] p-3 flex flex-col justify-between gap-2.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <select
                        aria-label="PNG width resolution"
                        value={effectivePngSize}
                        onChange={(e) => {
                          const nextVal = Number(e.target.value) as 1000 | 2000 | 4000;
                          if (nextVal > 1000 && !isPro) {
                            setUpgradeFeatureLabel(`${nextVal}px High-Resolution PNG Export`);
                            return;
                          }
                          setSinglePngSize(nextVal);
                        }}
                        className="rounded-md border border-[#DCD9D0] bg-white px-1.5 py-0.5 text-[11px] font-mono-num font-semibold text-[#141413]"
                      >
                        <option value={1000}>1000px (Free)</option>
                        <option value={2000}>2000px (Pro)</option>
                        <option value={4000}>4000px (Pro)</option>
                      </select>
                      {!isPro ? (
                        <span className="rounded bg-[#1B4332]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#1B4332]">
                          Free
                        </span>
                      ) : (
                        <ProBadge />
                      )}
                    </div>
                    <div className="inline-flex rounded-md border border-[#DCD9D0] bg-white p-0.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isPro) {
                            setUpgradeFeatureLabel('Transparent Alpha PNG Export');
                            return;
                          }
                          setSinglePngTransparent(true);
                        }}
                        className={`rounded-xs px-1.5 py-0.5 font-semibold cursor-pointer ${
                          effectivePngTransparent ? 'bg-[#141413] text-white' : 'text-[#5C5951]'
                        }`}
                      >
                        Alpha{!isPro ? ' (Pro)' : ''}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSinglePngTransparent(false)}
                        className={`rounded-xs px-1.5 py-0.5 font-semibold cursor-pointer ${
                          !effectivePngTransparent ? 'bg-[#141413] text-white' : 'text-[#5C5951]'
                        }`}
                      >
                        Solid
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busyKey !== null}
                    onClick={() =>
                      runExport('png', async () => {
                        await exportLogoPng(doc, 1, effectivePngTransparent, {
                          targetLongEdge: effectivePngSize,
                          palette,
                        });
                        return `Downloaded ${effectiveSinglePngDims.width}×${effectiveSinglePngDims.height} ${
                          effectivePngTransparent ? 'transparent' : 'solid'
                        } PNG.`;
                      })
                    }
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#DCD9D0] bg-white px-3 py-1.5 text-xs font-semibold text-[#141413] hover:border-[#141413] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-[#1B4332]" />
                    {busyKey === 'png'
                      ? 'Rendering...'
                      : `PNG (${effectiveSinglePngDims.width}×${effectiveSinglePngDims.height})`}
                  </button>
                </div>

                {/* Print PDF (PRO) */}
                <button
                  type="button"
                  disabled={busyKey !== null}
                  onClick={() =>
                    requireProOrRun('Print-Ready Master PDF', () => {
                      void runExport('pdf', async () => {
                        await exportLogoPdf(doc, palette, brief);
                        return '2-page print-ready PDF proof downloaded.';
                      });
                    })
                  }
                  className="inline-flex items-center justify-between gap-2 rounded-xl border border-[#DCD9D0] bg-[#FAF9F6] px-3 py-2.5 text-xs font-semibold text-[#141413] hover:border-[#141413] hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {isPro ? (
                      <FileText className="h-3.5 w-3.5 text-[#1B4332]" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-[#5C5951]" />
                    )}
                    {busyKey === 'pdf' ? 'Building PDF...' : 'Print-Ready PDF'}
                  </span>
                  <ProBadge locked={!isPro} />
                </button>

                {/* Web Favicon + Social ZIP (PRO) */}
                <button
                  type="button"
                  disabled={busyKey !== null}
                  onClick={() =>
                    requireProOrRun('Favicons & Social Crops Bundle', () => {
                      void runExport('web-social', async () => {
                        await exportFaviconPackage(
                          activeCropDoc,
                          brief.businessName || doc.title,
                          {
                            fullDoc: doc,
                            palette,
                            includeSocialCrops: true,
                          }
                        );
                        return 'Web favicons & social media crops ZIP downloaded.';
                      });
                    })
                  }
                  className="inline-flex items-center justify-between gap-2 rounded-xl border border-[#DCD9D0] bg-[#FAF9F6] px-3 py-2.5 text-xs font-semibold text-[#141413] hover:border-[#141413] hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {isPro ? (
                      <Share2 className="h-3.5 w-3.5 text-[#1B4332]" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-[#5C5951]" />
                    )}
                    {busyKey === 'web-social' ? 'Packaging...' : 'Favicons & Social (.zip)'}
                  </span>
                  <ProBadge locked={!isPro} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
