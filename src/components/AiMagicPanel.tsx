import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Download,
  Eraser,
  ImagePlus,
  Layers,
  Loader2,
  RefreshCw,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';
import { INDUSTRY_CATEGORIES } from '../data/logoLibrary';
import {
  BrandBrief,
  ColorPalette,
  CustomSvgPart,
  LogoDocument,
} from '../types/logo';
import {
  AiBrandBrainstormItem,
  AiConceptSuggestion,
  AiRemixSuggestion,
  AiSymbolStyleMode,
  brainstormAiBrands,
  cleanOrRemoveBgWithAi,
  generateAiLogoRemixes,
  generateAiSymbolImage,
  suggestAiLogoConcepts,
} from '../utils/aiApi';
import {
  buildRemixedLogoDocument,
  extractBrandContextFromDoc,
} from '../utils/logoGenerator';
import {
  removeImageBackgroundClient,
  traceImageDataUrlToSvg,
  VectorTraceResult,
} from '../utils/vectorTrace';
import { LogoDocumentSvg } from './CanvasLayerRenderer';

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

const BRAND_VIBES = ['Minimal', 'Luxury', 'Futuristic', 'Organic', 'Playful', 'Bold'];

type MagicStudioTool = 'vectorize' | 'remix' | 'brainstorm' | 'eraser';

export interface TracedSymbolPayload {
  paths: CustomSvgPart[];
  viewBox: string;
  name: string;
  preserveOriginalColors: boolean;
}

interface AiMagicPanelProps {
  variant: 'sidebar' | 'wizard';
  doc?: LogoDocument;
  activePalette: ColorPalette;
  brief?: BrandBrief;
  onInsertTracedSymbol: (payload: TracedSymbolPayload) => void;
  onApplyRemixedDocument?: (doc: LogoDocument, palette: ColorPalette) => void;
  onApplyBrandBrainstorm?: (item: AiBrandBrainstormItem) => void;
  onGenerateVariationsWithSymbol?: (payload: TracedSymbolPayload) => void;
  onApplyAiSuggestion?: (suggestion: AiConceptSuggestion) => void;
}

export const AiMagicPanel: React.FC<AiMagicPanelProps> = ({
  variant,
  doc,
  activePalette,
  brief,
  onInsertTracedSymbol,
  onApplyRemixedDocument,
  onApplyBrandBrainstorm,
  onGenerateVariationsWithSymbol,
  onApplyAiSuggestion,
}) => {
  const [activeTool, setActiveTool] = useState<MagicStudioTool>('vectorize');

  // 1. Vectorizer + Symbol Prompt state
  const [prompt, setPrompt] = useState<string>(
    () =>
      brief?.symbolIdea?.trim()
        ? `${brief.symbolIdea.trim()}, flat vector, white background`
        : 'minimalist geometric fox head, flat vector, white background'
  );
  const [styleMode, setStyleMode] = useState<AiSymbolStyleMode>('flat-silhouette');
  const [generating, setGenerating] = useState<boolean>(false);
  const [cleaningSketch, setCleaningSketch] = useState<boolean>(false);
  const [suggestingConcepts, setSuggestingConcepts] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const [sourceRasterUrl, setSourceRasterUrl] = useState<string | null>(null);
  const [sourceOrigin, setSourceOrigin] = useState<'ai' | 'upload'>('ai');
  const [traceResult, setTraceResult] = useState<VectorTraceResult | null>(null);
  const [suggestions, setSuggestions] = useState<AiConceptSuggestion[]>([]);

  // Vectorizer controls
  const [threshold, setThreshold] = useState<number>(175);
  const [smoothness, setSmoothness] = useState<number>(0.95);
  const [colorMode, setColorMode] = useState<'mono' | 'duotone' | 'multicolor'>('mono');
  const [maxColors, setMaxColors] = useState<number>(4);
  const [autoRemoveBg, setAutoRemoveBg] = useState<boolean>(true);
  const [invertMask, setInvertMask] = useState<boolean>(false);
  const [showTraceControls, setShowTraceControls] = useState<boolean>(false);

  // 2. AI Logo Remix (6 Remixes) state
  const [remixLoading, setRemixLoading] = useState<boolean>(false);
  const [remixNonce, setRemixNonce] = useState<number>(0);
  const [remixes, setRemixes] = useState<AiRemixSuggestion[]>([]);
  const [remixSource, setRemixSource] = useState<'gemini' | 'studio' | null>(null);
  const [remixError, setRemixError] = useState<string | null>(null);

  // 3. Brand Name & Slogan Generator state
  const [brainstormTopic, setBrainstormTopic] = useState<string>(
    () => brief?.symbolIdea?.trim() || 'artisan coffee & design studio'
  );
  const [brainstormIndustry, setBrainstormIndustry] = useState<string>(
    () => brief?.industry || INDUSTRY_CATEGORIES[0]
  );
  const [brainstormVibe, setBrainstormVibe] = useState<string>('Minimal');
  const [brainstorming, setBrainstorming] = useState<boolean>(false);
  const [brandResults, setBrandResults] = useState<AiBrandBrainstormItem[]>([]);
  const [brainstormSource, setBrainstormSource] = useState<'gemini' | 'studio' | null>(null);
  const [brainstormError, setBrainstormError] = useState<string | null>(null);
  const [appliedBrandIdx, setAppliedBrandIdx] = useState<number | null>(null);

  // 4. Magic Eraser / Background Remover state
  const [eraserSourceUrl, setEraserSourceUrl] = useState<string | null>(null);
  const [eraserResultUrl, setEraserResultUrl] = useState<string | null>(null);
  const [eraserRemovedPct, setEraserRemovedPct] = useState<number | null>(null);
  const [eraserTolerance, setEraserTolerance] = useState<number>(38);
  const [eraserHoles, setEraserHoles] = useState<boolean>(true);
  const [eraserFeather, setEraserFeather] = useState<boolean>(true);
  const [eraserBusy, setEraserBusy] = useState<boolean>(false);
  const [eraserError, setEraserError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const eraserFileInputRef = useRef<HTMLInputElement>(null);

  const brandContext = useMemo(() => {
    if (!doc || !brief) return null;
    return extractBrandContextFromDoc(doc, brief);
  }, [doc, brief]);

  const remixPreviews = useMemo(() => {
    if (!doc || !brief || remixes.length === 0) return [];
    return remixes.map((r) => ({
      spec: r,
      previewDoc: buildRemixedLogoDocument(doc, brief, r),
    }));
  }, [doc, brief, remixes]);

  const buildPayload = (traced: VectorTraceResult): TracedSymbolPayload => {
    const shortName =
      sourceOrigin === 'upload'
        ? 'Traced Vector Mark'
        : prompt
            .split(',')[0]
            ?.trim()
            .split(/\s+/)
            .slice(0, 4)
            .join(' ') || 'AI Vector Symbol';

    const coloredPaths =
      colorMode === 'multicolor'
        ? traced.paths
        : traced.paths.map((part, idx) => ({
            ...part,
            fill: idx === 0 ? activePalette.primary : activePalette.accent,
          }));

    return {
      paths: coloredPaths,
      viewBox: traced.viewBox,
      name: sourceOrigin === 'upload' ? shortName : `AI: ${shortName}`,
      preserveOriginalColors:
        colorMode === 'multicolor' ? true : traced.preserveOriginalColors,
    };
  };

  // Re-trace automatically whenever trace settings change on an already-loaded image
  useEffect(() => {
    if (!sourceRasterUrl) return;
    let cancelled = false;
    traceImageDataUrlToSvg(sourceRasterUrl, {
      threshold,
      smoothness,
      colorMode,
      maxColors,
      autoRemoveBg,
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
  }, [sourceRasterUrl, threshold, smoothness, colorMode, maxColors, autoRemoveBg, invertMask]);

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
      setSourceOrigin('ai');
      setSourceRasterUrl(imageDataUrl);
      setEraserSourceUrl(imageDataUrl);

      const traced = await traceImageDataUrlToSvg(imageDataUrl, {
        threshold,
        smoothness,
        colorMode,
        maxColors,
        autoRemoveBg,
        invert: invertMask,
      });
      setTraceResult(traced);

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

  const handleAiCleanSketchAndTrace = async () => {
    if (!sourceRasterUrl || cleaningSketch) return;
    setCleaningSketch(true);
    setErrorMsg(null);
    setStatusNotice('Cleaning rough sketch & removing noise with Gemini…');

    try {
      const cleaned = await cleanOrRemoveBgWithAi({
        imageDataUrl: sourceRasterUrl,
        mode: 'vector-clean',
      });
      setSourceRasterUrl(cleaned.imageDataUrl);
      setEraserSourceUrl(cleaned.imageDataUrl);
      setColorMode('multicolor');
      setAutoRemoveBg(true);
      setStatusNotice('Sketch cleaned by Gemini and traced into multi-color SVG paths.');
    } catch (err) {
      setStatusNotice(null);
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to clean sketch with Gemini.'
      );
    } finally {
      setCleaningSketch(false);
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
      setSourceOrigin('upload');
      setColorMode('multicolor');
      setAutoRemoveBg(true);
      setSourceRasterUrl(dataUrl);
      setEraserSourceUrl(dataUrl);
      setShowTraceControls(true);
      setStatusNotice('Background stripped & traced into multi-color editable SVG paths.');
    };
    reader.readAsDataURL(file);
  };

  // 2. Remix Handlers
  const handleGenerateSixRemixes = async () => {
    if (!doc || !brief || remixLoading) return;
    setRemixLoading(true);
    setRemixError(null);
    const nextSeed = remixNonce + 1;
    setRemixNonce(nextSeed);

    try {
      const ctx = extractBrandContextFromDoc(doc, brief);
      const { remixes: nextRemixes, source } = await generateAiLogoRemixes({
        brandName: ctx.brandName,
        tagline: ctx.tagline,
        industry: brief.industry,
        currentStyle: brief.style,
        symbolSummary: ctx.symbolSummary,
        seedNonce: nextSeed,
      });
      setRemixes(nextRemixes);
      setRemixSource(source);
    } catch (err) {
      setRemixError(err instanceof Error ? err.message : 'Failed to generate remixes.');
    } finally {
      setRemixLoading(false);
    }
  };

  // 3. Brand Name & Slogan Generator Handlers
  const handleBrainstormBrands = async () => {
    const topic = brainstormTopic.trim();
    if (!topic || brainstorming) return;
    setBrainstorming(true);
    setBrainstormError(null);
    setAppliedBrandIdx(null);

    try {
      const { brands, source } = await brainstormAiBrands({
        topic,
        industry: brainstormIndustry,
        vibe: brainstormVibe,
      });
      setBrandResults(brands);
      setBrainstormSource(source);
    } catch (err) {
      setBrainstormError(
        err instanceof Error ? err.message : 'Unable to brainstorm brand identities.'
      );
    } finally {
      setBrainstorming(false);
    }
  };

  // 4. Magic Eraser / Background Remover Handlers
  const runClientBgStrip = async (
    inputUrl: string,
    tol = eraserTolerance,
    holes = eraserHoles,
    feather = eraserFeather
  ) => {
    setEraserBusy(true);
    setEraserError(null);
    try {
      const res = await removeImageBackgroundClient(inputUrl, {
        tolerance: tol,
        removeInteriorHoles: holes,
        featherEdges: feather,
      });
      setEraserResultUrl(res.dataUrl);
      setEraserRemovedPct(res.removedPercent);
    } catch (err) {
      setEraserError(
        err instanceof Error ? err.message : 'Unable to strip background from image.'
      );
    } finally {
      setEraserBusy(false);
    }
  };

  const handleUploadForEraser = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const url = reader.result;
      setEraserSourceUrl(url);
      setSourceOrigin('upload');
      setSourceRasterUrl(url);
      void runClientBgStrip(url);
    };
    reader.readAsDataURL(file);
  };

  const handleAiComplexBgRemove = async () => {
    if (!eraserSourceUrl || eraserBusy) return;
    setEraserBusy(true);
    setEraserError(null);
    try {
      const isolated = await cleanOrRemoveBgWithAi({
        imageDataUrl: eraserSourceUrl,
        mode: 'remove-bg',
      });
      const stripped = await removeImageBackgroundClient(isolated.imageDataUrl, {
        tolerance: eraserTolerance,
        removeInteriorHoles: eraserHoles,
        featherEdges: eraserFeather,
      });
      setEraserResultUrl(stripped.dataUrl);
      setEraserRemovedPct(stripped.removedPercent);
    } catch (err) {
      setEraserError(
        err instanceof Error ? err.message : 'Gemini complex background isolation failed.'
      );
    } finally {
      setEraserBusy(false);
    }
  };

  const handleDownloadTransparentPng = () => {
    if (!eraserResultUrl) return;
    const a = document.createElement('a');
    a.href = eraserResultUrl;
    a.download = `${(brief?.businessName || 'logo-mark').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-nobg.png`;
    a.click();
  };

  const handleVectorizeErasedToCanvas = async () => {
    const targetUrl = eraserResultUrl || eraserSourceUrl;
    if (!targetUrl) return;
    setEraserBusy(true);
    setEraserError(null);
    try {
      const traced = await traceImageDataUrlToSvg(targetUrl, {
        colorMode: 'multicolor',
        maxColors: 4,
        autoRemoveBg: false,
        smoothness: 0.9,
      });
      onInsertTracedSymbol({
        paths: traced.paths,
        viewBox: traced.viewBox,
        name: 'Clean Traced Mark',
        preserveOriginalColors: true,
      });
    } catch (err) {
      setEraserError(
        err instanceof Error ? err.message : 'Unable to convert erased image to SVG paths.'
      );
    } finally {
      setEraserBusy(false);
    }
  };

  const TOOL_TABS: Array<{
    id: MagicStudioTool;
    label: string;
    icon: React.FC<{ className?: string }>;
    hideInWizard?: boolean;
  }> = [
    { id: 'vectorize', label: 'Vectorize', icon: Wand2 },
    { id: 'remix', label: '6 Remixes', icon: Shuffle, hideInWizard: !doc },
    { id: 'brainstorm', label: 'Brand AI', icon: Sparkles },
    { id: 'eraser', label: 'Eraser', icon: Eraser },
  ];

  const visibleTabs = TOOL_TABS.filter((t) => !t.hideInWizard);

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600 dark:text-indigo-400">
          <Sparkles className="h-3.5 w-3.5" />
          Pro AI Magic Studio
        </h2>
        <span className="rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-indigo-600 dark:text-indigo-300">
          4 Tools
        </span>
      </div>

      {/* 4-Tool Segmented Switcher */}
      <div
        className={`grid gap-1 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-[#F1F3F6] dark:bg-[#0F1117] p-0.5 ${
          visibleTabs.length === 4 ? 'grid-cols-4' : 'grid-cols-3'
        }`}
      >
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTool === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTool(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-md py-1.5 px-1 text-[10px] font-semibold transition-all active:scale-95 cursor-pointer ${
                active
                  ? 'bg-white dark:bg-[#1E222D] text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================================================================= */}
      {/* TOOL 1: AI IMAGE-TO-CLEAN-SVG VECTORIZER + PROMPT SYMBOL GEN      */}
      {/* ================================================================= */}
      {activeTool === 'vectorize' && (
        <div className="space-y-3.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleUploadRasterForTrace}
            className="hidden"
          />

          {/* Sketch / PNG / JPG Upload Drop Card */}
          <div className="rounded-xl border border-dashed border-[#CBD5E1] dark:border-[#2A2F3D] bg-[#F1F3F6]/70 dark:bg-[#1E222D] p-3 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <ImagePlus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Image-to-Clean-SVG Vectorizer</span>
            </div>
            <p className="text-[10.5px] leading-snug text-slate-500 dark:text-slate-400">
              Upload a rough sketch, PNG, or JPG. Strips background automatically and traces into multi-color editable SVG paths.
            </p>
            <div className="flex items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117] px-3 py-1.5 text-[11px] font-semibold text-slate-900 dark:text-slate-100 hover:border-indigo-400 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Upload Sketch / PNG / JPG
              </button>
              {sourceRasterUrl && (
                <button
                  type="button"
                  onClick={() => void handleAiCleanSketchAndTrace()}
                  disabled={cleaningSketch}
                  title="Use Gemini AI to turn a rough drawing or noisy image into crisp flat vector shapes"
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-500 disabled:opacity-55 active:scale-95 transition-all cursor-pointer"
                >
                  {cleaningSketch ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  AI Clean
                </button>
              )}
            </div>
          </div>

          {/* Prompt-based AI Symbol Generator */}
          <div className="space-y-2 border-t border-[#E2E8F0] dark:border-[#2A2F3D] pt-3">
            <label className="block text-[11px] font-semibold text-slate-900 dark:text-slate-200">
              Or Generate Symbol From Prompt
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
              {generating || cleaningSketch ? (
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
                    Source Image
                  </p>
                  <div className="aspect-square overflow-hidden rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white flex items-center justify-center p-1.5">
                    <img
                      src={sourceRasterUrl}
                      alt="Vectorize source"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    SVG ({traceResult.paths.length} {traceResult.paths.length === 1 ? 'path' : 'colors'})
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
                          fill={
                            colorMode === 'multicolor'
                              ? p.fill || activePalette.primary
                              : idx === 0
                                ? activePalette.primary
                                : activePalette.accent
                          }
                          fillRule={p.fillRule}
                        />
                      ))}
                    </svg>
                  </div>
                </div>
              </div>

              {/* Extracted Color Path Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {traceResult.paths.map((p, idx) => {
                  const chipColor =
                    colorMode === 'multicolor'
                      ? p.fill || activePalette.primary
                      : idx === 0
                        ? activePalette.primary
                        : activePalette.accent;
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] dark:border-[#2A2F3D] bg-[#F1F3F6]/70 dark:bg-[#0F1117] px-1.5 py-0.5 text-[10px] font-mono-num text-slate-700 dark:text-slate-300"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-black/15"
                        style={{ backgroundColor: chipColor }}
                      />
                      {chipColor}
                    </span>
                  );
                })}
              </div>

              {/* Vectorizer Mode & Threshold / Smoothing Toggle */}
              <div className="border-t border-[#E2E8F0] dark:border-[#2A2F3D] pt-2">
                <button
                  type="button"
                  onClick={() => setShowTraceControls((v) => !v)}
                  className="flex w-full items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Color Mode, BG Strip &amp; Smoothing
                  </span>
                  <span>{showTraceControls ? 'Hide' : 'Adjust'}</span>
                </button>

                {showTraceControls && (
                  <div className="mt-2.5 space-y-2.5 text-[11px]">
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          ['mono', 'Mono'],
                          ['duotone', '2-Tone'],
                          ['multicolor', 'Multi-Color'],
                        ] as const
                      ).map(([modeId, label]) => (
                        <button
                          key={modeId}
                          type="button"
                          onClick={() => setColorMode(modeId)}
                          className={`rounded-lg border py-1 text-[10.5px] font-semibold cursor-pointer ${
                            colorMode === modeId
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#0F1117] text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {colorMode === 'multicolor' && (
                      <div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-300">
                          <span>Max Quantized Colors</span>
                          <span className="font-mono-num">{maxColors}</span>
                        </div>
                        <input
                          type="range"
                          min={2}
                          max={6}
                          step={1}
                          value={maxColors}
                          onChange={(e) => setMaxColors(Number(e.target.value))}
                          className="mt-0.5 w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
                        />
                      </div>
                    )}

                    {colorMode !== 'multicolor' && (
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
                    )}

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

                    <div className="flex flex-col gap-1.5">
                      <label className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoRemoveBg}
                          onChange={(e) => setAutoRemoveBg(e.target.checked)}
                          className="h-3.5 w-3.5 rounded accent-indigo-600"
                        />
                        <span>Auto-Strip Background Before Tracing</span>
                      </label>

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
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => onInsertTracedSymbol(buildPayload(traceResult))}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 dark:bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:opacity-90 active:scale-95 transition-all cursor-pointer"
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
      )}

      {/* ================================================================= */}
      {/* TOOL 2: AI LOGO REMIX / VARIATIONS (6 LAYOUT & COLOR HARMONIES)   */}
      {/* ================================================================= */}
      {activeTool === 'remix' && doc && brief && (
        <div className="space-y-3.5">
          <div className="rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-[#F1F3F6]/70 dark:bg-[#1E222D] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                Active Logo Concept
              </span>
              {remixSource && (
                <span className="rounded-md bg-indigo-500/12 px-1.5 py-0.5 text-[9.5px] font-semibold text-indigo-600 dark:text-indigo-300">
                  {remixSource === 'gemini' ? 'Gemini AI' : 'Studio Remix'}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
              <p className="font-semibold text-slate-900 dark:text-white truncate">
                {brandContext?.brandName || brief.businessName}
              </p>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                Mark: {brandContext?.symbolSummary || 'Geometric Emblem'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleGenerateSixRemixes()}
              disabled={remixLoading}
              className="studio-gradient-btn w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-60 cursor-pointer"
            >
              {remixLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Composing 6 Remixes…
                </>
              ) : (
                <>
                  <Shuffle className="h-3.5 w-3.5" />
                  {remixes.length > 0 ? 'Regenerate 6 Remixes' : 'Generate 6 Remixes'}
                </>
              )}
            </button>
          </div>

          {remixError && (
            <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-[11px] text-red-700 dark:text-red-300">
              {remixError}
            </div>
          )}

          {remixPreviews.length > 0 ? (
            <div className="grid grid-cols-1 gap-2.5">
              {remixPreviews.map(({ spec, previewDoc }, idx) => (
                <div
                  key={`${spec.title}-${idx}`}
                  className="studio-card-hover rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#1E222D] p-2.5 space-y-2 shadow-xs"
                >
                  <div className="aspect-[16/10] w-full overflow-hidden rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D]">
                    <LogoDocumentSvg
                      doc={previewDoc}
                      idPrefix={`ai-remix-${idx}`}
                      className="h-full w-full"
                    />
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {spec.title}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {spec.rationale}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-slate-100 dark:bg-[#0F1117] px-1.5 py-0.5 text-[9.5px] font-semibold uppercase text-slate-600 dark:text-slate-300">
                      {spec.archetype}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 flex-1">
                      {[
                        spec.palette.background,
                        spec.palette.primary,
                        spec.palette.accent,
                        spec.palette.secondary,
                        spec.palette.text,
                      ].map((hex, cIdx) => (
                        <span
                          key={cIdx}
                          className="h-3.5 flex-1 rounded border border-black/15"
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => onApplyRemixedDocument?.(previewDoc, spec.palette)}
                      className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[10.5px] font-semibold text-white hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                      Apply Remix
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white/60 dark:bg-[#1E222D]/60 p-3 text-center text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Keep your exact brand name and symbol mark while testing 6 completely new layouts, font pairings, and color harmonies.
            </p>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TOOL 3: AI BRAND NAME, SLOGAN & COLOR PSYCHOLOGY GENERATOR        */}
      {/* ================================================================= */}
      {activeTool === 'brainstorm' && (
        <div className="space-y-3">
          <div className="space-y-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-[#F1F3F6]/70 dark:bg-[#1E222D] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                Brand Name &amp; Slogan Studio
              </span>
              {brainstormSource && (
                <span className="rounded-md bg-indigo-500/12 px-1.5 py-0.5 text-[9.5px] font-semibold text-indigo-600 dark:text-indigo-300">
                  {brainstormSource === 'gemini' ? 'Gemini AI' : 'Studio AI'}
                </span>
              )}
            </div>

            <input
              type="text"
              value={brainstormTopic}
              onChange={(e) => setBrainstormTopic(e.target.value)}
              placeholder="Describe your product, niche, or keywords…"
              className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117] px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
            />

            <select
              value={brainstormIndustry}
              onChange={(e) => setBrainstormIndustry(e.target.value)}
              aria-label="Brainstorm industry"
              className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117] px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100"
            >
              {INDUSTRY_CATEGORIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>

            <div className="flex flex-wrap gap-1">
              {BRAND_VIBES.map((vibe) => (
                <button
                  key={vibe}
                  type="button"
                  onClick={() => setBrainstormVibe(vibe)}
                  className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold active:scale-95 transition-all cursor-pointer ${
                    brainstormVibe === vibe
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117] text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {vibe}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void handleBrainstormBrands()}
              disabled={brainstorming || !brainstormTopic.trim()}
              className="studio-gradient-btn w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-55 cursor-pointer"
            >
              {brainstorming ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Brainstorming Identities…
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate Names, Slogans &amp; Palettes
                </>
              )}
            </button>
          </div>

          {brainstormError && (
            <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-[11px] text-red-700 dark:text-red-300">
              {brainstormError}
            </div>
          )}

          {brandResults.length > 0 && (
            <div className="space-y-2.5">
              {brandResults.map((item, idx) => {
                const isApplied = appliedBrandIdx === idx;
                return (
                  <div
                    key={`${item.brandName}-${idx}`}
                    className="studio-card-hover rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#1E222D] p-3 space-y-2 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {item.brandName}
                        </p>
                        <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-300 truncate">
                          “{item.tagline}”
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-indigo-700 dark:text-indigo-300">
                        {item.psychologyMood}
                      </span>
                    </div>

                    <p className="text-[10.5px] leading-snug text-slate-500 dark:text-slate-400">
                      {item.psychologyNote}
                    </p>

                    <div className="flex items-center gap-1">
                      {[
                        item.palette.background,
                        item.palette.primary,
                        item.palette.accent,
                        item.palette.secondary,
                        item.palette.text,
                      ].map((hex, cIdx) => (
                        <span
                          key={cIdx}
                          className="h-4 flex-1 rounded border border-black/15"
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 pt-0.5">
                      {onApplyBrandBrainstorm && (
                        <button
                          type="button"
                          onClick={() => {
                            onApplyBrandBrainstorm(item);
                            setAppliedBrandIdx(idx);
                          }}
                          className={`flex-1 inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-[10.5px] font-semibold active:scale-95 transition-all cursor-pointer ${
                            isApplied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-900 dark:bg-indigo-600 text-white hover:opacity-90'
                          }`}
                        >
                          {isApplied ? (
                            <>
                              <Check className="h-3 w-3" />
                              Applied
                            </>
                          ) : (
                            'Apply in 1 Click'
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setPrompt(item.symbolPrompt);
                          setActiveTool('vectorize');
                        }}
                        className="rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117] px-2.5 py-1.5 text-[10.5px] font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer"
                      >
                        AI Icon →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TOOL 4: MAGIC ERASER / 1-CLICK BACKGROUND REMOVER                 */}
      {/* ================================================================= */}
      {activeTool === 'eraser' && (
        <div className="space-y-3">
          <input
            ref={eraserFileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleUploadForEraser}
            className="hidden"
          />

          <div className="rounded-xl border border-dashed border-[#CBD5E1] dark:border-[#2A2F3D] bg-[#F1F3F6]/70 dark:bg-[#1E222D] p-3 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <Eraser className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Magic Eraser · Background Remover</span>
            </div>
            <p className="text-[10.5px] leading-snug text-slate-500 dark:text-slate-400">
              1-click edge flood-fill removes solid backdrops instantly, or use Gemini AI to isolate marks from textured/complex backgrounds.
            </p>
            <button
              type="button"
              onClick={() => eraserFileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117] px-3 py-1.5 text-[11px] font-semibold text-slate-900 dark:text-slate-100 hover:border-indigo-400 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              Upload PNG / JPG
            </button>
          </div>

          {eraserSourceUrl && (
            <div className="rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#1E222D] p-3 space-y-3 shadow-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Original
                  </p>
                  <div className="aspect-square overflow-hidden rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white flex items-center justify-center p-1">
                    <img
                      src={eraserSourceUrl}
                      alt="Original upload"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {eraserRemovedPct !== null ? `Erased (${eraserRemovedPct}%)` : 'Transparent'}
                  </p>
                  <div
                    className="aspect-square overflow-hidden rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] flex items-center justify-center p-1"
                    style={{
                      backgroundImage:
                        'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)',
                      backgroundSize: '12px 12px',
                      backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    {eraserBusy ? (
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                    ) : (
                      <img
                        src={eraserResultUrl || eraserSourceUrl}
                        alt="Background removed"
                        className="h-full w-full object-contain"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-[11px]">
                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Color Tolerance</span>
                    <span className="font-mono-num">{eraserTolerance}</span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={92}
                    step={2}
                    value={eraserTolerance}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setEraserTolerance(next);
                      if (eraserSourceUrl) void runClientBgStrip(eraserSourceUrl, next);
                    }}
                    className="mt-0.5 w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eraserHoles}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setEraserHoles(next);
                        if (eraserSourceUrl) {
                          void runClientBgStrip(eraserSourceUrl, eraserTolerance, next, eraserFeather);
                        }
                      }}
                      className="h-3.5 w-3.5 rounded accent-indigo-600"
                    />
                    <span>Strip Inner Counter Holes (O, A, Rings)</span>
                  </label>

                  <label className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eraserFeather}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setEraserFeather(next);
                        if (eraserSourceUrl) {
                          void runClientBgStrip(eraserSourceUrl, eraserTolerance, eraserHoles, next);
                        }
                      }}
                      className="h-3.5 w-3.5 rounded accent-indigo-600"
                    />
                    <span>Smooth Anti-Aliased Edge Feathering</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => void runClientBgStrip(eraserSourceUrl)}
                  disabled={eraserBusy}
                  className="studio-gradient-btn inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-white disabled:opacity-55 cursor-pointer"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  1-Click Strip BG
                </button>

                <button
                  type="button"
                  onClick={() => void handleAiComplexBgRemove()}
                  disabled={eraserBusy}
                  title="Use Gemini AI to remove textured or photo backgrounds first"
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117] px-2.5 py-2 text-[11px] font-semibold text-slate-900 dark:text-slate-100 hover:border-indigo-400 active:scale-95 transition-all disabled:opacity-55 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  AI Complex BG
                </button>
              </div>

              {eraserError && (
                <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 px-2.5 py-1.5 text-[10.5px] text-red-700 dark:text-red-300">
                  {eraserError}
                </div>
              )}

              {eraserResultUrl && (
                <div className="flex flex-col gap-1.5 border-t border-[#E2E8F0] dark:border-[#2A2F3D] pt-2.5">
                  <button
                    type="button"
                    onClick={handleDownloadTransparentPng}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#0F1117] px-3 py-1.5 text-[11px] font-semibold text-slate-900 dark:text-slate-100 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Transparent PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleVectorizeErasedToCanvas()}
                    disabled={eraserBusy}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 dark:bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    Vectorize &amp; Place SVG on Canvas
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
