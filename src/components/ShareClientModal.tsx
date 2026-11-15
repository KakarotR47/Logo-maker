import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Eye,
  Link2,
  Loader2,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import { BrandBrief, ColorPalette, LogoDocument } from '../types/logo';
import { ClientSharePayload, createClientShareUrl } from '../utils/clientShare';
import { LogoDocumentSvg } from './CanvasLayerRenderer';

interface ShareClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: LogoDocument;
  brief: BrandBrief;
  palette: ColorPalette;
  onOpenClientPreview: (payload: ClientSharePayload, token: string) => void;
}

export const ShareClientModal: React.FC<ShareClientModalProps> = ({
  isOpen,
  onClose,
  doc,
  brief,
  palette,
  onOpenClientPreview,
}) => {
  const [designerNote, setDesignerNote] = useState<string>(
    `Identity presentation for ${brief.businessName || doc.title} — review on light/dark backgrounds & 3D mockups below.`
  );
  const [shareResult, setShareResult] = useState<{
    url: string;
    token: string;
    isCompactRef: boolean;
    payload: ClientSharePayload;
  } | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    setDesignerNote(
      `Identity presentation for ${brief.businessName || doc.title} — review on light/dark backgrounds & 3D mockups below.`
    );
  }, [isOpen, brief.businessName, doc.title]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setGenerating(true);

    const payload: ClientSharePayload = {
      v: 1,
      doc,
      brief,
      palette,
      designerNote: designerNote.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const timer = window.setTimeout(() => {
      void createClientShareUrl(payload).then((res) => {
        if (cancelled) return;
        setShareResult({ ...res, payload });
        setGenerating(false);
      });
    }, 140);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, doc, brief, palette, designerNote]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyUrl = async () => {
    if (!shareResult) return;
    try {
      await navigator.clipboard.writeText(shareResult.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const handleOpenPreview = () => {
    if (!shareResult) return;
    onOpenClientPreview(shareResult.payload, shareResult.token);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Share client presentation link"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-2xl border border-[#DCD9D0] dark:border-[#2A2D3D] bg-white dark:bg-[#161822] p-5 sm:p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#EAE7DF] dark:border-[#2A2D3D] pb-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1B4332]/10 dark:bg-emerald-500/15 text-[#1B4332] dark:text-emerald-400">
              <Share2 className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-[#141413] dark:text-white">
                Share Client Presentation Link
              </h2>
              <p className="text-xs text-[#5C5951] dark:text-slate-400">
                Generate a clean, read-only showcase with light/dark surfaces, 3D mockups &amp; Brand Guidelines PDF for client approval.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="rounded-lg p-1.5 text-[#5C5951] dark:text-slate-400 hover:bg-[#F3F1EB] dark:hover:bg-[#1E202B] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Snapshot Preview Card */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center rounded-xl border border-[#E5E2D9] dark:border-[#2A2D3D] bg-[#FAF9F6] dark:bg-[#11131B] p-3.5">
          <div className="sm:col-span-5 overflow-hidden rounded-lg border border-[#DCD9D0] dark:border-[#2A2D3D] bg-white">
            <LogoDocumentSvg
              doc={doc}
              idPrefix="share-modal-thumb"
              className="aspect-[4/3] w-full block"
            />
          </div>
          <div className="sm:col-span-7 space-y-1.5 min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#1B4332] dark:text-emerald-400">
              Read-Only Presentation Snapshot
            </p>
            <h3 className="font-display text-base font-bold text-[#141413] dark:text-white truncate">
              {brief.businessName || doc.title}
            </h3>
            <p className="text-xs text-[#5C5951] dark:text-slate-400 truncate">
              {brief.tagline || brief.industry}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1 text-[10.5px] font-medium text-[#5C5951] dark:text-slate-400">
              <span className="rounded border border-[#DCD9D0] dark:border-[#2A2D3D] bg-white dark:bg-[#161822] px-2 py-0.5">
                Light &amp; Dark Suites
              </span>
              <span className="rounded border border-[#DCD9D0] dark:border-[#2A2D3D] bg-white dark:bg-[#161822] px-2 py-0.5">
                3D Mockups
              </span>
              <span className="rounded border border-[#DCD9D0] dark:border-[#2A2D3D] bg-white dark:bg-[#161822] px-2 py-0.5">
                Approval Sign-Off
              </span>
            </div>
          </div>
        </div>

        {/* Optional Note to Client */}
        <div className="space-y-1.5">
          <label
            htmlFor="client-share-note"
            className="block text-xs font-semibold text-[#141413] dark:text-slate-200"
          >
            Note for Client (included in presentation header)
          </label>
          <textarea
            id="client-share-note"
            rows={2}
            value={designerNote}
            onChange={(e) => setDesignerNote(e.target.value)}
            placeholder="Add context, rationale, or revision notes for your client..."
            className="w-full rounded-xl border border-[#DCD9D0] dark:border-[#2A2D3D] bg-white dark:bg-[#11131B] px-3 py-2 text-xs text-[#141413] dark:text-slate-100 focus:border-[#1B4332] focus:outline-hidden"
          />
        </div>

        {/* Generated URL Field + Copy */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#141413] dark:text-slate-200 inline-flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-[#1B4332] dark:text-emerald-400" />
              Shareable Client URL
            </span>
            {shareResult?.isCompactRef && (
              <span className="text-[10.5px] text-[#6B675E] dark:text-slate-400">
                Compact local reference link
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={generating ? 'Encoding presentation snapshot...' : shareResult?.url ?? ''}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 rounded-xl border border-[#DCD9D0] dark:border-[#2A2D3D] bg-[#FAF9F6] dark:bg-[#11131B] px-3 py-2 font-mono-num text-[11px] text-[#3F3E39] dark:text-slate-300"
            />
            <button
              type="button"
              disabled={generating || !shareResult}
              onClick={handleCopyUrl}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#141413] dark:bg-white px-3.5 text-xs font-semibold text-white dark:text-[#141413] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400 dark:text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? 'Copied Link' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EAE7DF] dark:border-[#2A2D3D] pt-4">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[#5C5951] dark:text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-[#1B4332] dark:text-emerald-400" />
            Read-only · Zero editing chrome
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#DCD9D0] dark:border-[#2A2D3D] px-3.5 py-2 text-xs font-semibold text-[#4A4740] dark:text-slate-300 hover:bg-[#FAF9F6] dark:hover:bg-[#1E202B] cursor-pointer"
            >
              Done
            </button>
            <button
              type="button"
              disabled={generating || !shareResult}
              onClick={handleOpenPreview}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white hover:bg-[#143326] transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Eye className="h-3.5 w-3.5" />
              Open Client Presentation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
