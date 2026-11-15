import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BrandBrief,
  ColorPalette,
  LogoDocument,
  TextLayer,
} from '../types/logo';
import { extractBrandVariants } from '../utils/logoGenerator';
import { buildCleanSvgString } from '../utils/svgExport';

export interface SharedBrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface StudioLogoState {
  /** Tight-cropped transparent SVG data URL of the full Canvas logo */
  logoSvgDataUrl: string;
  /** Tight-cropped transparent SVG data URL of the icon/mark only (for seals & compact badges) */
  markSvgDataUrl: string;
  /** Live brand name extracted from Canvas text or BrandBrief */
  brandName: string;
  /** 2-3 character uppercase monogram derived from brandName */
  monogram: string;
  /** Live tagline extracted from Canvas subtitle text or BrandBrief */
  tagline: string;
  /** Primary & supporting colors from Canvas layers + active palette */
  colors: SharedBrandColors;
  /** Source canvas document & palette */
  document: LogoDocument;
  palette: ColorPalette;
  /** Monotonically increments whenever the Canvas logo is edited or saved */
  revision: number;
  updatedAt: string;
  isGeneratingSnapshot: boolean;
}

export interface StudioLogoContextValue extends StudioLogoState {
  onJumpToLogoEditor: () => void;
  onUpdateCanvasBrandMeta: (patch: {
    brandName?: string;
    tagline?: string;
    primaryColor?: string;
  }) => void;
  flushSnapshotNow: () => Promise<{
    logoSvgDataUrl: string;
    markSvgDataUrl: string;
  }>;
}

function computeMonogram(name: string): string {
  const words = name
    .trim()
    .split(/[\s&·-]+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  const single = words[0] || 'FS';
  return single.slice(0, 2).toUpperCase();
}

function isUsableHex(val?: string): val is string {
  if (!val) return false;
  const trimmed = val.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed);
}

export function extractBrandMetaFromDocument(
  doc: LogoDocument,
  brief: BrandBrief,
  palette: ColorPalette
): {
  brandName: string;
  monogram: string;
  tagline: string;
  colors: SharedBrandColors;
} {
  const visibleTextLayers = doc.layers
    .filter((l): l is TextLayer => l.type === 'text' && l.visible && l.text.trim().length > 0)
    .sort((a, b) => b.fontSize - a.fontSize);

  const primaryTextLayer = visibleTextLayers[0];
  const secondaryTextLayer = visibleTextLayers[1];

  const brandName =
    primaryTextLayer?.text.trim() ||
    brief.businessName?.trim() ||
    doc.title?.trim() ||
    'Forma Studio';

  const tagline =
    secondaryTextLayer?.text.trim() ||
    brief.tagline?.trim() ||
    '';

  const iconOrCustom = doc.layers.find(
    (l) => l.visible && (l.type === 'icon' || l.type === 'custom-svg')
  );
  const shapeLayer = doc.layers.find(
    (l) => l.visible && l.type === 'shape' && l.fill !== 'transparent'
  );

  const primary = isUsableHex(iconOrCustom?.fill)
    ? iconOrCustom.fill
    : isUsableHex(shapeLayer?.fill)
    ? shapeLayer.fill
    : palette.primary;

  const accent =
    iconOrCustom?.type === 'icon' && isUsableHex(iconOrCustom.accentFill)
      ? iconOrCustom.accentFill
      : palette.accent;

  const secondary =
    iconOrCustom?.type === 'icon' && isUsableHex(iconOrCustom.secondaryFill)
      ? iconOrCustom.secondaryFill
      : palette.secondary;

  const background =
    !doc.transparentBackground && isUsableHex(doc.backgroundColor)
      ? doc.backgroundColor
      : palette.background;

  const text = isUsableHex(primaryTextLayer?.fill)
    ? primaryTextLayer.fill
    : palette.text;

  return {
    brandName,
    monogram: computeMonogram(brandName),
    tagline,
    colors: {
      primary,
      secondary,
      accent,
      background,
      text,
    },
  };
}

const StudioLogoContext = createContext<StudioLogoContextValue | null>(null);

interface StudioLogoProviderProps {
  activeDoc: LogoDocument;
  brief: BrandBrief;
  activePalette: ColorPalette;
  onJumpToLogoEditor: () => void;
  onUpdateCanvasBrandMeta: (patch: {
    brandName?: string;
    tagline?: string;
    primaryColor?: string;
  }) => void;
  children: React.ReactNode;
}

export const StudioLogoProvider: React.FC<StudioLogoProviderProps> = ({
  activeDoc,
  brief,
  activePalette,
  onJumpToLogoEditor,
  onUpdateCanvasBrandMeta,
  children,
}) => {
  const [logoSvgDataUrl, setLogoSvgDataUrl] = useState<string>('');
  const [markSvgDataUrl, setMarkSvgDataUrl] = useState<string>('');
  const [revision, setRevision] = useState<number>(0);
  const [updatedAt, setUpdatedAt] = useState<string>(() => new Date().toISOString());
  const [isGeneratingSnapshot, setIsGeneratingSnapshot] = useState<boolean>(false);

  const latestInputsRef = useRef({ activeDoc, brief, activePalette });
  latestInputsRef.current = { activeDoc, brief, activePalette };

  const meta = useMemo(
    () => extractBrandMetaFromDocument(activeDoc, brief, activePalette),
    [activeDoc, brief, activePalette]
  );

  const generateSnapshotForCurrentDoc = useCallback(async (): Promise<{
    logoSvgDataUrl: string;
    markSvgDataUrl: string;
  }> => {
    const { activeDoc: doc, brief: curBrief, activePalette: curPalette } =
      latestInputsRef.current;

    const hasVisibleLayers = doc.layers.some((l) => l.visible);
    if (!hasVisibleLayers) {
      setLogoSvgDataUrl('');
      setMarkSvgDataUrl('');
      setRevision((r) => r + 1);
      setUpdatedAt(new Date().toISOString());
      return { logoSvgDataUrl: '', markSvgDataUrl: '' };
    }

    setIsGeneratingSnapshot(true);
    try {
      const variants = extractBrandVariants(doc, curBrief, curPalette);
      const [fullSvgXml, markSvgXml] = await Promise.all([
        buildCleanSvgString(doc, {
          transparentBackground: true,
          outlineText: true,
          fitToArtwork: true,
          paddingRatio: 0.06,
        }),
        buildCleanSvgString(variants.markOnlyDocument, {
          transparentBackground: true,
          outlineText: true,
          fitToArtwork: true,
          paddingRatio: 0.08,
        }),
      ]);

      const fullUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fullSvgXml)}`;
      const markUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markSvgXml)}`;

      setLogoSvgDataUrl(fullUrl);
      setMarkSvgDataUrl(markUrl);
      setRevision((r) => r + 1);
      setUpdatedAt(new Date().toISOString());
      return { logoSvgDataUrl: fullUrl, markSvgDataUrl: markUrl };
    } catch {
      return { logoSvgDataUrl: '', markSvgDataUrl: '' };
    } finally {
      setIsGeneratingSnapshot(false);
    }
  }, []);

  // Automatically sync Logo Maker canvas edits into shared context (debounced so 60fps dragging stays silky)
  useEffect(() => {
    let cancelled = false;
    const delay = logoSvgDataUrl ? 260 : 40;
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      await generateSnapshotForCurrentDoc();
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeDoc, brief.businessName, brief.tagline, activePalette.id, generateSnapshotForCurrentDoc]);

  const value = useMemo<StudioLogoContextValue>(
    () => ({
      logoSvgDataUrl,
      markSvgDataUrl,
      brandName: meta.brandName,
      monogram: meta.monogram,
      tagline: meta.tagline,
      colors: meta.colors,
      document: activeDoc,
      palette: activePalette,
      revision,
      updatedAt,
      isGeneratingSnapshot,
      onJumpToLogoEditor,
      onUpdateCanvasBrandMeta,
      flushSnapshotNow: generateSnapshotForCurrentDoc,
    }),
    [
      logoSvgDataUrl,
      markSvgDataUrl,
      meta,
      activeDoc,
      activePalette,
      revision,
      updatedAt,
      isGeneratingSnapshot,
      onJumpToLogoEditor,
      onUpdateCanvasBrandMeta,
      generateSnapshotForCurrentDoc,
    ]
  );

  return (
    <StudioLogoContext.Provider value={value}>
      {children}
    </StudioLogoContext.Provider>
  );
};

export function useStudioLogo(): StudioLogoContextValue {
  const ctx = useContext(StudioLogoContext);
  if (!ctx) {
    throw new Error('useStudioLogo must be used within a StudioLogoProvider');
  }
  return ctx;
}
