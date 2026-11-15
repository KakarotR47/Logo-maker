import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ImagePlus,
  Layers,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { BrandBrief, ColorPalette, CustomSvgPart } from '../types/logo';
import {
  AiConceptSuggestion,
  AiSymbolStyleMode,
  generateAiSymbolImage,
  suggestAiLogoConcepts,
} from '../utils/aiApi';
import { traceImageDataUrlToSvg, VectorTraceResult } from '../utils/vectorTrace';

const SAMPLE_PROMPTS = [
  'minimalist geometric fox head, flat vector, white background',
  'sacred geometry lotus crown emblem, bold flat silhouette, white background',
  'abstract infinity circuit prism mark, minimal modern icon, white background',
  'soaring falcon wing monogram crest, clean flat vector, white background',
];

const STYLE_MODES: Array<{ id: AiSymbolStyleMode; label: string }> = [
  { id: 'flat-silhouette', label: 'Flat Silhouette' },
  { id: 'geometric-line', label: 'Geometric Line' },
  { id: 'emblem-badge', label: 'Emblem Badge' },
  { id: 'monogram-mark', label: 'Monogram Mark' },
];

export interface TracedSymbolPayload {
  paths: CustomSvgPart[];
  viewBox: string;
  name: string;
  preserveOriginalColors: boolean;
}

interface AiMagicPanelProps {
  variant: 'sidebar' | 'wizard';
  activePalette: ColorPalette;
  brief?: BrandBrief;
  onInsertTracedSymbol: (payload: TracedSymbolPayload) => void;
  onGenerateVariationsWithSymbol?: (payload: TracedSymbolPayload) => void;
  onApplyAiSuggestion?: (suggestion: AiConceptSuggestion) => void;
}

export const AiMagicPanel: React.FC<AiMagicPanelProps> = ({
  variant,
  activePalette,
  brief,
  onInsertTracedSymbol,
  onGenerateVariationsWithSymbol,
  onApplyAiSuggestion,
}) => {
  const [prompt, setPrompt] = useState<string>(
    () =>
      brief?.symbolIdea?.trim()
        ? `${brief.symbolIdea.trim()}, flat vector, white background`
        : 'minimalist geometric fox head, flat vector, white background'
  );
  const [styleMode, setStyleMode] = useState<AiSymbolStyleMode>('flat-silhouette');
  const [generating, setGenerating] = useState<boolean>(false);
  const [suggestingConcepts, setSuggestingConcepts] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const [sourceRasterUrl, setSourceRasterUrl] = useState<string | null>(null);
  const [traceResult, setTraceResult] = useState<VectorTraceResult | null>(null);
  const [suggestions, setSuggestions] = useState<AiConceptSuggestion[]>([]);

  // Vectorizer controls
  const [threshold, setThreshold] = useState<number>(175);
  const [smoothness, setSmoothness] = useState<number>(0.95);
  const [colorMode, setColorMode] = useState<'mono' | 'duotone'>('mono');
  const [invertMask, setInvertMask] = useState<boolean>(false);
  const [showTraceControls, setShowTraceControls] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const buildPayload = (traced: VectorTraceResult): TracedSymbolPayload => {
    const shortName =
      prompt
        .split(',')[0]
        ?.trim()
        .split(/\s+/)
        .slice(0, 4)
        .join(' ') || 'AI Vector Symbol';

    const coloredPaths = traced.paths.map((part, idx) => ({
      ...part,
      fill: idx === 0 ? activePalette.primary : activePalette.accent,
    }));

    return {
      paths: coloredPaths,
      viewBox: traced.viewBox,
      name: `AI: ${shortName}`,
      preserveOriginalColors: traced.preserveOriginalColors,
    };
  };

  // Re-trace automatically whenever trace settings change on an already-generated/uploaded image
  useEffect(() => {
    if (!sourceRasterUrl) return;
    let cancelled = false;
    traceImageDataUrlToSvg(sourceRasterUrl, {
      threshold,
      smoothness,
      colorMode,
      invert: invertMask,
    })
      .then((res) => {
        if (!cancelled) {
          setTraceResult(res);
          setErrorMsg(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'Unable to trace image.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sourceRasterUrl, threshold, smoothness, colorMode, invertMask]);

  const handleGenerateAndTrace = async () => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || generating) return;

    setGenerating(true);
    setErrorMsg(null);
    setStatusNotice('Generating symbol artwork with Gemini…');

    try {
      const { imageDataUrl } = await generateAiSymbolImage({
        prompt: cleanPrompt,
        styleMode,
        brandName: brief?.businessName,
        industry: brief?.industry,
      });

      setStatusNotice('Tracing raster artwork into clean vector SVG paths…');
      setSourceRasterUrl(imageDataUrl);

      const traced = await traceImageDataUrlToSvg(imageDataUrl, {
        threshold,
        smoothness,
        colorMode,
        invert: invertMask,
      });
      setTraceResult(traced);

      // In the editor sidebar, automatically place the traced SVG right onto the canvas
      if (variant === 'sidebar') {
        onInsertTracedSymbol(buildPayload(traced));
        setStatusNotice('Vectorized and placed onto your canvas.');
      } else {
        setStatusNotice(
          `Traced ${traced.contourCount} clean vector contours — ready to place or synthesize.`
        );
      }
    } catch (err) {
      setStatusNotice(null);
      setErrorMsg(
        err instanceof Error ? err.message : 'AI symbol generation failed. Please try again.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleSuggestDirections = async () => {
    if (suggestingConcepts) return;
    const cleanPrompt =
      prompt.trim() || `${brief?.businessName || 'Modern Brand'} (${brief?.industry || 'Tech'})`;
    setSuggestingConcepts(true);
    setErrorMsg(null);

    try {
      const items = await suggestAiLogoConcepts({
        prompt: cleanPrompt,
        businessName: brief?.businessName,
        tagline: brief?.tagline,
        industry: brief?.industry,
      });
      setSuggestions(items);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to generate concept suggestions.'
      );
    } finally {
      setSuggestingConcepts(false);
    }
  };

  const handleUploadRasterForTrace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result !== 'string') return;
      const dataUrl = reader.result;
      setSourceRasterUrl(dataUrl);
      try {
        const traced = await traceImageDataUrlToSvg(dataUrl, {
          threshold,
          smoothness,
          colorMode,
          invert: invertMask,
        });
        setTraceResult(traced);
        setShowTraceControls(true);
        setStatusNotice('Image traced into recolorable vector paths.');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Could not vectorize uploaded image.');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-3.5 w-3.5" />
            AI Magic Generate
          </h2>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleUploadRasterForTrace}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117] px-2.5 py-1 text-[10.5px] font-semibold text-slate-900 dark:text-slate-100 hover:border-indigo-400 shadow-xs active:scale-95 cursor-pointer whitespace-nowrap shrink-0 transition-all"
            title="Upload PNG or JPG and trace to SVG"
          >
            <ImagePlus className="h-3 w-3" />
            Trace PNG/JPG
          </button>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
          Describe a custom logo symbol. Gemini generates a crisp mark and automatically traces it into an editable, recolorable SVG layer.
        </p>
      </div>

      {/* Prompt Input */}
      <div className="space-y-2">
        <label className="block text-[11px] font-semibold text-slate-900 dark:text-slate-200">
          Custom Symbol Prompt
        </label>
        <textarea
          rows={variant === 'wizard' ? 2 : 3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. minimalist geometric fox head, flat vector, white background"
          className="w-full resize-none rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
        />

        <div className="flex flex-wrap gap-1">
          {SAMPLE_PROMPTS.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => setPrompt(sample)}
              className={`rounded-lg border px-2 py-1 text-[10px] font-medium active:scale-95 transition-all cursor-pointer text-left truncate max-w-full ${
                prompt === sample
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#1E222D] text-slate-600 dark:text-slate-300 hover:border-indigo-400'
              }`}
            >
              {sample.split(',')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Vector Style Presets */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-900 dark:text-slate-200">
          Mark Construction Style
        </label>
        <div
          className={`mt-1.5 grid gap-1.5 ${
            variant === 'wizard' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'
          }`}
        >
          {STYLE_MODES.map((m) => {
            const active = styleMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setStyleMode(m.id)}
                className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold active:scale-95 transition-all cursor-pointer truncate ${
                  active
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                    : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#1E222D] text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => void handleGenerateAndTrace()}
          disabled={generating || !prompt.trim()}
          className="studio-gradient-btn flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-55 cursor-pointer"
        >
          {generating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating &amp; Tracing…
            </>
          ) : (
            <>
              <Wand2 className="h-3.5 w-3.5" />
              {sourceRasterUrl ? 'Regenerate AI Symbol' : 'Generate & Trace Vector SVG'}
            </>
          )}
        </button>

        {variant === 'wizard' && onApplyAiSuggestion && (
          <button
            type="button"
            onClick={() => void handleSuggestDirections()}
            disabled={suggestingConcepts}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#181B23] px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-[#1E222D] active:scale-95 transition-all disabled:opacity-55 cursor-pointer whitespace-nowrap"
          >
            {suggestingConcepts ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Brainstorming…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                AI Brand Ideas
              </>
            )}
          </button>
        )}
      </div>

      {/* Status or Error Feedback */}
      {errorMsg && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-[11px] leading-relaxed text-red-700 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {!errorMsg && statusNotice && (
        <div className="flex items-center gap-1.5 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3 py-2 text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
          {generating ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>{statusNotice}</span>
        </div>
      )}

      {/* AI Concept Direction Cards (Wizard Mode) */}
      {suggestions.length > 0 && onApplyAiSuggestion && (
        <div className="space-y-2 border-t border-[#E2E8F0] dark:border-[#2A2F3D] pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            AI Brand &amp; Symbol Directions
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(s.symbolPrompt);
                  onApplyAiSuggestion(s);
                }}
                className="studio-card-hover flex flex-col justify-between rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#1E222D] p-2.5 text-left shadow-sm cursor-pointer"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {s.title}
                  </p>
                  <p className="mt-0.5 text-[10.5px] font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                    {s.businessName} · {s.style}
                  </p>
                  <p className="mt-1 text-[10px] leading-snug text-slate-500 dark:text-slate-400 line-clamp-2">
                    {s.rationale}
                  </p>
                </div>
                <span className="mt-2 text-[10px] font-semibold text-slate-900 dark:text-slate-200">
                  Use Direction →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Raster + Traced Vector Preview & Fine-Tuning */}
      {sourceRasterUrl && traceResult && (
        <div className="rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#1E222D] p-3 space-y-3 shadow-sm">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                AI Raster
              </p>
              <div className="aspect-square overflow-hidden rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white flex items-center justify-center p-1.5">
                <img
                  src={sourceRasterUrl}
                  alt="AI generated symbol source"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Traced Vector ({traceResult.contourCount})
              </p>
              <div
                className="aspect-square overflow-hidden rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] flex items-center justify-center p-2"
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
                  backgroundSize: '12px 12px',
                  backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
                  backgroundColor: '#f8fafc',
                }}
              >
                <svg viewBox={traceResult.viewBox} className="h-full w-full">
                  {traceResult.paths.map((p, idx) => (
                    <path
                      key={idx}
                      d={p.d}
                      fill={idx === 0 ? activePalette.primary : activePalette.accent}
                      fillRule={p.fillRule}
                    />
                  ))}
                </svg>
              </div>
            </div>
          </div>

          {/* Vectorizer Threshold / Smoothing Toggle */}
          <div className="border-t border-[#E2E8F0] dark:border-[#2A2F3D] pt-2">
            <button
              type="button"
              onClick={() => setShowTraceControls((v) => !v)}
              className="flex w-full items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Vectorize Threshold &amp; Curve Tuning
              </span>
              <span>{showTraceControls ? 'Hide' : 'Adjust'}</span>
            </button>

            {showTraceControls && (
              <div className="mt-2.5 space-y-2.5 text-[11px]">
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setColorMode('mono')}
                    className={`rounded-lg border py-1 font-semibold cursor-pointer ${
                      colorMode === 'mono'
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#0F1117] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Mono Recolorable
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorMode('duotone')}
                    className={`rounded-lg border py-1 font-semibold cursor-pointer ${
                      colorMode === 'duotone'
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#0F1117] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    2-Tone Brand
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Threshold</span>
                    <span className="font-mono-num">{threshold}</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={230}
                    step={5}
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="mt-0.5 w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Curve Smoothing</span>
                    <span className="font-mono-num">{smoothness.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.3}
                    max={2.2}
                    step={0.05}
                    value={smoothness}
                    onChange={(e) => setSmoothness(Number(e.target.value))}
                    className="mt-0.5 w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
                  />
                </div>

                <label className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={invertMask}
                    onChange={(e) => setInvertMask(e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-indigo-600"
                  />
                  <span>Invert Mask (Light on Dark)</span>
                </label>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => onInsertTracedSymbol(buildPayload(traceResult))}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 px-3 py-2 text-xs font-semibold text-white dark:text-slate-900 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Place Traced SVG
            </button>

            {variant === 'wizard' && onGenerateVariationsWithSymbol && (
              <button
                type="button"
                onClick={() => onGenerateVariationsWithSymbol(buildPayload(traceResult))}
                className="studio-gradient-btn flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                <Layers className="h-3.5 w-3.5" />
                Generate 12 Variations
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
