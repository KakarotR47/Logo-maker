import React, { useEffect, useState } from 'react';
import {
  Check,
  Download,
  ExternalLink,
  FolderPlus,
  Layers,
  X,
} from 'lucide-react';
import { ColorPalette, LogoDocument } from '../types/logo';
import { LogoVariationEntry } from '../utils/brandTools';
import { exportLogoPng, exportLogoSvg } from '../utils/svgExport';
import { LogoDocumentSvg } from './CanvasLayerRenderer';

interface VariationsModalProps {
  isOpen: boolean;
  variations: LogoVariationEntry[];
  palette: ColorPalette;
  onClose: () => void;
  onOpenInEditor: (doc: LogoDocument) => void;
  onSaveAllToProjects: (variations: LogoVariationEntry[]) => void;
}

export const VariationsModal: React.FC<VariationsModalProps> = ({
  isOpen,
  variations,
  palette,
  onClose,
  onOpenInEditor,
  onSaveAllToProjects,
}) => {
  const [savedBatch, setSavedBatch] = useState<boolean>(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [whiteTransparentExport, setWhiteTransparentExport] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setSavedBatch(false);
      setBusyId(null);
    }
  }, [isOpen, variations]);

  if (!isOpen) return null;

  const handleSaveBatch = () => {
    onSaveAllToProjects(variations);
    setSavedBatch(true);
  };

  const handleDownloadSvg = async (entry: LogoVariationEntry) => {
    setBusyId(`${entry.id}-svg`);
    try {
      const useTransparent =
        entry.id === 'all-white' ? whiteTransparentExport : entry.document.transparentBackground;
      await exportLogoSvg(entry.document, {
        transparentBackground: useTransparent,
        outlineText: true,
        forceBackground: useTransparent ? 'transparent' : entry.document.backgroundColor,
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDownloadPng = async (entry: LogoVariationEntry) => {
    setBusyId(`${entry.id}-png`);
    try {
      const useTransparent =
        entry.id === 'all-white' ? whiteTransparentExport : entry.document.transparentBackground;
      await exportLogoPng(entry.document, 2, useTransparent, {
        targetLongEdge: 1600,
        palette,
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-5 backdrop-blur-xs">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#DCD9D0] bg-[#FAF9F6] shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCD9D0] bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#141413] text-white">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-[#141413]">
                Logo Variations Generator
              </h2>
              <p className="text-xs text-[#5C5951]">
                4 ready-to-use formats duplicated from your active logo: Full Color, All-White, All-Black Monochrome, and Icon-Only Square.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveBatch}
              disabled={savedBatch}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                savedBatch
                  ? 'bg-[#1B4332] text-white'
                  : 'bg-[#141413] text-white hover:bg-[#2A2926]'
              }`}
            >
              {savedBatch ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Saved All 4 to My Projects
                </>
              ) : (
                <>
                  <FolderPlus className="h-3.5 w-3.5" />
                  Save All 4 to My Projects
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close variations modal"
              className="rounded-lg border border-[#DCD9D0] bg-white p-2 text-[#5C5951] hover:border-[#141413] hover:text-[#141413] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 2x2 Grid of 4 Duplicated Logo Versions */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {variations.map((entry) => {
              const isDark = entry.previewSurface === 'dark';
              const isChecker = entry.previewSurface === 'checker';
              const svgBusy = busyId === `${entry.id}-svg`;
              const pngBusy = busyId === `${entry.id}-png`;

              return (
                <div
                  key={entry.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-[#DCD9D0] bg-white shadow-xs"
                >
                  {/* Preview Artboard Surface */}
                  <div
                    className={`relative flex h-56 items-center justify-center p-6 border-b border-[#ECE9E0] ${
                      isDark ? 'bg-[#141518]' : ''
                    }`}
                    style={{
                      backgroundColor: isDark
                        ? '#141518'
                        : isChecker
                          ? '#FFFFFF'
                          : entry.document.backgroundColor,
                      backgroundImage: isChecker
                        ? 'linear-gradient(45deg, #eceae4 25%, transparent 25%), linear-gradient(-45deg, #eceae4 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eceae4 75%), linear-gradient(-45deg, transparent 75%, #eceae4 75%)'
                        : undefined,
                      backgroundSize: isChecker ? '18px 18px' : undefined,
                      backgroundPosition: isChecker
                        ? '0 0, 0 9px, 9px -9px, -9px 0'
                        : undefined,
                    }}
                  >
                    <LogoDocumentSvg
                      doc={entry.document}
                      idPrefix={`variation-${entry.id}`}
                      className="max-h-full max-w-full drop-shadow-xs"
                    />
                    <span
                      className={`absolute left-3 top-3 rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${
                        isDark
                          ? 'bg-white/12 text-white border border-white/15'
                          : 'bg-[#F4F3EF]/90 text-[#141413] border border-[#DCD9D0]'
                      }`}
                    >
                      {entry.document.width} × {entry.document.height}
                    </span>
                  </div>

                  {/* Metadata & Actions */}
                  <div className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-[#141413]">{entry.label}</h3>
                        <p className="text-[11px] text-[#5C5951]">{entry.subtitle}</p>
                      </div>
                      {entry.id === 'all-white' && (
                        <button
                          type="button"
                          onClick={() => setWhiteTransparentExport((v) => !v)}
                          className={`rounded-md border px-2 py-1 text-[10px] font-semibold cursor-pointer ${
                            whiteTransparentExport
                              ? 'border-[#1B4332] bg-[#1B4332]/10 text-[#1B4332]'
                              : 'border-[#DCD9D0] bg-[#FAF9F6] text-[#5C5951]'
                          }`}
                          title="Export All-White SVG/PNG with transparent background instead of dark slate"
                        >
                          {whiteTransparentExport ? 'Export: Transparent BG' : 'Export: Dark BG'}
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onOpenInEditor(entry.document);
                          onClose();
                        }}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#141413] bg-[#141413] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2A2926] cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open in Canvas
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadSvg(entry)}
                        disabled={busyId !== null}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#DCD9D0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#141413] hover:border-[#141413] hover:bg-[#F2F0EA] disabled:opacity-50 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {svgBusy ? 'Saving...' : 'SVG'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadPng(entry)}
                        disabled={busyId !== null}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#DCD9D0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#141413] hover:border-[#141413] hover:bg-[#F2F0EA] disabled:opacity-50 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {pngBusy ? 'Saving...' : 'PNG'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
