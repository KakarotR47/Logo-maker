import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Crop,
  Maximize2,
  Printer,
  Scan,
  Scissors,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { DocumentGamutReport } from '../utils/printPrepress';

interface PrintPrepressPopoverProps {
  isOpen: boolean;
  printProofCmyk: boolean;
  showCropMarks: boolean;
  showBleed: boolean;
  showClearSpace: boolean;
  showSafeZone: boolean;
  gamutReport: DocumentGamutReport;
  onTogglePrintProof: () => void;
  onToggleCropMarks: () => void;
  onToggleBleed: () => void;
  onToggleClearSpace: () => void;
  onToggleSafeZone: () => void;
  onSnapAllToPrintGamut: () => void;
  onSnapSingleColorToGamut: (sourceHex: string) => void;
  onSelectGamutLayers: (layerIds: string[]) => void;
  onClose: () => void;
}

export const PrintPrepressPopover: React.FC<PrintPrepressPopoverProps> = ({
  isOpen,
  printProofCmyk,
  showCropMarks,
  showBleed,
  showClearSpace,
  showSafeZone,
  gamutReport,
  onTogglePrintProof,
  onToggleCropMarks,
  onToggleBleed,
  onToggleClearSpace,
  onToggleSafeZone,
  onSnapAllToPrintGamut,
  onSnapSingleColorToGamut,
  onSelectGamutLayers,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      data-testid="prepress-popover"
      onPointerDown={(e) => e.stopPropagation()}
      className="w-[330px] max-w-[92vw] rounded-2xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white/98 dark:bg-[#181B23]/98 p-3.5 text-xs shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#E2E8F0] dark:border-[#2A2F3D]">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400">
            <Printer className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Print Pre-Press &amp; Soft Proof
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Coated CMYK (FOGRA39) gamut &amp; print trim guides
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Pre-Press Panel"
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#252A38] hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* CMYK Soft-Proof Master Toggle */}
      <div className="mt-2.5 space-y-2">
        <button
          type="button"
          role="switch"
          aria-checked={printProofCmyk}
          data-testid="toggle-cmyk-proof"
          onClick={onTogglePrintProof}
          className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-all cursor-pointer ${
            printProofCmyk
              ? 'border-indigo-500 bg-indigo-50/90 dark:bg-indigo-500/15 text-indigo-900 dark:text-indigo-100'
              : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50/70 dark:bg-[#0F1117]/70 text-slate-700 dark:text-slate-200 hover:border-indigo-400'
          }`}
        >
          <div className="min-w-0">
            <p className="text-xs font-bold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span>Print Proof (CMYK)</span>
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Simulates CMYK ink dulling on bright neon RGB colors
            </p>
          </div>
          <span
            className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
              printProofCmyk ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
                printProofCmyk ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </span>
        </button>

        {/* Out-of-Gamut Inspection Summary */}
        <div
          data-testid="cmyk-gamut-audit-card"
          className={`rounded-xl border p-2.5 ${
            gamutReport.hasOutOfGamut
              ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50/75 dark:bg-amber-950/30'
              : 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/25'
          }`}
        >
          {gamutReport.hasOutOfGamut ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {gamutReport.outOfGamutSwatches.length} Out-of-Gamut Color
                  {gamutReport.outOfGamutSwatches.length > 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  data-testid="snap-all-gamut-btn"
                  onClick={onSnapAllToPrintGamut}
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-700 px-2 py-1 text-[10px] font-bold text-white cursor-pointer transition-colors"
                >
                  <Wand2 className="h-3 w-3" />
                  Snap All to Print Gamut
                </button>
              </div>
              <div className="mt-2 max-h-32 overflow-y-auto space-y-1.5 pr-0.5">
                {gamutReport.outOfGamutSwatches.map((sw) => (
                  <div
                    key={sw.sourceHex}
                    className="flex items-center justify-between gap-2 rounded-lg border border-amber-200/80 dark:border-amber-800/50 bg-white/90 dark:bg-[#0F1117]/90 px-2 py-1.5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (sw.layerIds.length > 0) {
                          onSelectGamutLayers(sw.layerIds);
                        }
                      }}
                      className="flex items-center gap-2 min-w-0 text-left cursor-pointer"
                      title={`Select affected layers: ${sw.layerNames.join(', ') || 'Background'}`}
                    >
                      <span className="inline-flex items-center shrink-0">
                        <span
                          className="h-4 w-4 rounded-l border border-black/15"
                          style={{ backgroundColor: sw.sourceHex }}
                          title={`Screen RGB: ${sw.sourceHex}`}
                        />
                        <span
                          className="h-4 w-4 rounded-r border border-l-0 border-black/15"
                          style={{ backgroundColor: sw.proofHex }}
                          title={`CMYK Proof: ${sw.proofHex}`}
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-mono-num text-[10px] font-bold text-slate-800 dark:text-slate-100">
                          {sw.sourceHex} → {sw.proofHex}
                        </span>
                        <span className="block truncate text-[9.5px] text-slate-500 dark:text-slate-400">
                          ΔE {sw.deltaE} · {sw.cmykLabel}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSnapSingleColorToGamut(sw.sourceHex)}
                      className="shrink-0 rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/40 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-200 hover:bg-amber-100 cursor-pointer"
                    >
                      Fix
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                All {gamutReport.totalColorsChecked} brand color
                {gamutReport.totalColorsChecked === 1 ? '' : 's'} within CMYK gamut
              </span>
              <span className="font-mono-num text-[10px] opacity-80">
                TAC {gamutReport.maxTotalInk}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Print Trim, Bleed & Brand Clear-Space Overlays */}
      <div className="mt-3 pt-2.5 border-t border-[#E2E8F0] dark:border-[#2A2F3D]">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Pre-Press Marks &amp; Brand Clear Space
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            data-testid="toggle-crop-marks"
            aria-pressed={showCropMarks}
            onClick={onToggleCropMarks}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all cursor-pointer ${
              showCropMarks
                ? 'border-rose-500 bg-rose-600 text-white shadow-xs'
                : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117] text-slate-700 dark:text-slate-200 hover:border-rose-400'
            }`}
          >
            <Crop className="h-3.5 w-3.5 shrink-0" />
            <span>Crop Marks</span>
          </button>

          <button
            type="button"
            data-testid="toggle-bleed-guides"
            aria-pressed={showBleed}
            onClick={onToggleBleed}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all cursor-pointer ${
              showBleed
                ? 'border-rose-500 bg-rose-600 text-white shadow-xs'
                : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117] text-slate-700 dark:text-slate-200 hover:border-rose-400'
            }`}
          >
            <Scissors className="h-3.5 w-3.5 shrink-0" />
            <span>3mm Bleed</span>
          </button>

          <button
            type="button"
            data-testid="toggle-clear-space"
            aria-pressed={showClearSpace}
            onClick={onToggleClearSpace}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all cursor-pointer ${
              showClearSpace
                ? 'border-indigo-500 bg-indigo-600 text-white shadow-xs'
                : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117] text-slate-700 dark:text-slate-200 hover:border-indigo-400'
            }`}
          >
            <Maximize2 className="h-3.5 w-3.5 shrink-0" />
            <span>1x Clear Space</span>
          </button>

          <button
            type="button"
            data-testid="toggle-safe-margin"
            aria-pressed={showSafeZone}
            onClick={onToggleSafeZone}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all cursor-pointer ${
              showSafeZone
                ? 'border-teal-500 bg-teal-600 text-white shadow-xs'
                : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117] text-slate-700 dark:text-slate-200 hover:border-teal-400'
            }`}
          >
            <Scan className="h-3.5 w-3.5 shrink-0" />
            <span>8% Safe Zone</span>
          </button>
        </div>
      </div>
    </div>
  );
};
