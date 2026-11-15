import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Database,
  Download,
  ExternalLink,
  FlipHorizontal2,
  MapPin,
  MessageCircle,
  Move,
  Palette,
  Pencil,
  Phone,
  Pin,
  Printer,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Upload,
  UserPlus,
} from 'lucide-react';
import {
  CARD_BORDER_PRESETS,
  CARD_DESIGNS,
  CARD_FONT_THEMES,
  CARD_THEMES,
  DEFAULT_CARD_DETAILS,
  DEFAULT_MAGIC_CONFIG,
  DEFAULT_SYMBOLS_CONFIG,
  DEFAULT_TYPOGRAPHY_MAP,
  buildCardThemeFromBrandColors,
} from '../data/cardPresets';
import { useStudioLogo } from '../context/StudioLogoContext';
import {
  CardBorderStyle,
  CardCornerStyle,
  CardDesignId,
  CardDetails,
  CardFontThemeId,
  CardMagicConfig,
  CardSymbolsConfig,
  CardThemeId,
  CardTypographyMap,
  CrestStyleId,
  SavedCardPreset,
} from '../types/card';
import { downloadVCard, exportCardPng } from '../utils/exportCard';
import { StudioCustomizer } from './StudioCustomizer';
import {
  CardBackFace,
  CardFrontFace,
  formatPakistaniPhone,
} from './VisitingCardFaces';

function toWhatsAppUrl(phone: string): string {
  const numeric = phone.replace(/[^0-9]/g, '');
  return `https://wa.me/${numeric}`;
}

type DesignFilter = 'All' | 'Traditional' | 'Heritage' | 'Executive' | 'Architectural';
const STORAGE_KEY = 'sa-brothers-card-presets-v1';

const BorderFoilDiagram: React.FC<{ styleId: CardBorderStyle; accent: string }> = ({
  styleId,
  accent,
}) => (
  <svg viewBox="0 0 84 48" className="h-10 w-[70px] shrink-0 rounded-md bg-[#141413] p-1" fill="none" aria-hidden="true">
    {styleId === 'double-hairline' && (
      <>
        <rect x="4" y="4" width="76" height="40" rx="3" stroke={accent} strokeWidth="1.2" />
        <rect x="8" y="8" width="68" height="32" rx="2" stroke={accent} strokeWidth="0.8" opacity="0.65" />
      </>
    )}
    {styleId === 'corner-filigree' && (
      <>
        <rect x="4" y="4" width="76" height="40" rx="3" stroke={accent} strokeWidth="0.75" opacity="0.45" />
        <path d="M8 16V8H16 M68 8H76V16 M8 32V40H16 M68 40H76V32" stroke={accent} strokeWidth="1.8" />
      </>
    )}
    {styleId === 'art-deco-stepped' && (
      <>
        <rect x="6" y="6" width="72" height="36" stroke={accent} strokeWidth="0.8" opacity="0.55" />
        <path d="M4 17V4H17 M67 4H80V17 M4 31V44H17 M67 44H80V31" stroke={accent} strokeWidth="1.7" />
        <rect x="4" y="4" width="4" height="4" fill={accent} />
        <rect x="76" y="4" width="4" height="4" fill={accent} />
        <rect x="4" y="40" width="4" height="4" fill={accent} />
        <rect x="76" y="40" width="4" height="4" fill={accent} />
      </>
    )}
    {styleId === 'mughal-arabesque' && (
      <>
        <rect x="4" y="4" width="76" height="40" rx="3" stroke={accent} strokeWidth="1.1" />
        <rect x="8" y="8" width="68" height="32" rx="2" stroke={accent} strokeWidth="1" strokeDasharray="1.5 2.5" opacity="0.7" />
        <path d="M4 16 C4 8 8 4 16 4 M68 4 C76 4 80 8 80 16 M4 32 C4 40 8 44 16 44 M68 44 C76 44 80 40 80 32" stroke={accent} strokeWidth="1.6" />
        <circle cx="8" cy="8" r="1.6" fill={accent} />
        <circle cx="76" cy="8" r="1.6" fill={accent} />
        <circle cx="8" cy="40" r="1.6" fill={accent} />
        <circle cx="76" cy="40" r="1.6" fill={accent} />
      </>
    )}
    {styleId === 'security-dashed' && (
      <>
        <rect x="4" y="4" width="76" height="40" rx="3" stroke={accent} strokeWidth="1.2" />
        <rect x="8" y="8" width="68" height="32" rx="2" stroke={accent} strokeWidth="1.2" strokeDasharray="3.5 3" />
      </>
    )}
    {styleId === 'solid-foil-band' && (
      <rect x="4" y="4" width="76" height="40" rx="3" stroke={accent} strokeWidth="3.2" />
    )}
    {styleId === 'beveled-triple' && (
      <>
        <rect x="3" y="3" width="78" height="42" rx="3" stroke={accent} strokeWidth="0.7" opacity="0.55" />
        <rect x="6.5" y="6.5" width="71" height="35" rx="2" stroke={accent} strokeWidth="1.8" />
        <rect x="10" y="10" width="64" height="28" rx="1" stroke={accent} strokeWidth="0.7" opacity="0.7" />
      </>
    )}
    {styleId === 'clean-edge' && (
      <text x="42" y="27" textAnchor="middle" fill={accent} fontSize="8" fontWeight="600" opacity="0.65">
        FLUSH
      </text>
    )}
  </svg>
);

const CornerCutDiagram: React.FC<{ cornerId: CardCornerStyle; active: boolean }> = ({
  cornerId,
  active,
}) => {
  const stroke = active ? '#E1BA59' : '#141413';
  const fill = active ? '#141413' : '#EAE7DF';
  return (
    <svg viewBox="0 0 36 36" className="h-9 w-9 shrink-0 rounded-md" fill="none" aria-hidden="true">
      {cornerId === 'sharp' && (
        <path d="M4 32 V6 L6 4 H32" fill={fill} stroke={stroke} strokeWidth="2.2" />
      )}
      {cornerId === 'classic' && (
        <path d="M4 32 V13 Q4 4 13 4 H32" fill={fill} stroke={stroke} strokeWidth="2.2" />
      )}
      {cornerId === 'soft' && (
        <path d="M4 32 V19 Q4 4 19 4 H32" fill={fill} stroke={stroke} strokeWidth="2.2" />
      )}
      {cornerId === 'chamfered' && (
        <path d="M4 32 V15 L15 4 H32" fill={fill} stroke={stroke} strokeWidth="2.2" />
      )}
      {cornerId === 'notched' && (
        <path d="M4 32 V16 A12 12 0 0 0 16 4 H32" fill={fill} stroke={stroke} strokeWidth="2.2" />
      )}
    </svg>
  );
};

interface VisitingCardAtelierProps {
  incomingLogoNonce?: number;
}

export const VisitingCardAtelier: React.FC<VisitingCardAtelierProps> = ({
  incomingLogoNonce = 0,
}) => {
  const studioLogo = useStudioLogo();

  const [details, setDetails] = useState<CardDetails>(() => ({
    ...DEFAULT_CARD_DETAILS,
    companyName: studioLogo.brandName || DEFAULT_CARD_DETAILS.companyName,
    monogram: studioLogo.monogram || DEFAULT_CARD_DETAILS.monogram,
    tagline: studioLogo.tagline || DEFAULT_CARD_DETAILS.tagline,
  }));
  const [activeDesignId, setActiveDesignId] = useState<CardDesignId>('sovereign-stamp');
  const [activeThemeId, setActiveThemeId] = useState<CardThemeId>('emerald-gold');
  const [activeBorderStyle, setActiveBorderStyle] =
    useState<CardBorderStyle>('double-hairline');
  const [activeFontId, setActiveFontId] =
    useState<CardFontThemeId>('playfair-jakarta');
  const [cornerStyle, setCornerStyle] = useState<CardCornerStyle>('classic');
  const [typography, setTypography] =
    useState<CardTypographyMap>(DEFAULT_TYPOGRAPHY_MAP);
  const [symbols, setSymbols] = useState<CardSymbolsConfig>(() => {
    const initialLogo = studioLogo.logoSvgDataUrl;
    if (initialLogo) {
      return {
        ...DEFAULT_SYMBOLS_CONFIG,
        customLogoDataUrl: initialLogo,
        customLogoFullColor: true,
        crestCenterMode: 'custom-image',
        crestStyle: 'clean-logo',
      };
    }
    return DEFAULT_SYMBOLS_CONFIG;
  });
  const [magic, setMagic] = useState<CardMagicConfig>(DEFAULT_MAGIC_CONFIG);

  const [designFilter, setDesignFilter] = useState<DesignFilter>('All');
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [spacePhones, setSpacePhones] = useState<boolean>(true);
  const [showPrintGuides, setShowPrintGuides] = useState<boolean>(false);
  const [exportingSide, setExportingSide] = useState<'front' | 'back' | 'both' | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mobilePinned, setMobilePinned] = useState<boolean>(false);
  const [dbFeedback, setDbFeedback] = useState<string | null>(null);
  const [autoSyncBrand, setAutoSyncBrand] = useState<boolean>(true);
  const [isLogoSelected, setIsLogoSelected] = useState<boolean>(false);
  const [lastSealStyle, setLastSealStyle] = useState<CrestStyleId>('notary-rosette');

  const [savedPresets, setSavedPresets] = useState<SavedCardPreset[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SavedCardPreset[]) : [];
    } catch {
      return [];
    }
  });

  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50 });
  const cardStageRef = useRef<HTMLDivElement>(null);
  const dbUploadRef = useRef<HTMLInputElement>(null);
  const hoverRafRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const lastSyncedRevRef = useRef<number>(-1);
  const justDraggedRef = useRef<boolean>(false);
  const logoDragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const scheduleFeedbackClear = (ms: number) => {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      feedbackTimerRef.current = null;
      setDbFeedback(null);
    }, ms);
  };

  useEffect(() => {
    return () => {
      if (hoverRafRef.current !== null) {
        window.cancelAnimationFrame(hoverRafRef.current);
      }
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  // Remember the most recent framed seal so users can toggle cleanly between Frameless and Royal Seal
  useEffect(() => {
    if (
      symbols.crestStyle !== 'clean-logo' &&
      symbols.crestStyle !== 'none' &&
      symbols.crestStyle !== 'auto'
    ) {
      setLastSealStyle(symbols.crestStyle);
    }
  }, [symbols.crestStyle]);

  const placeSavedLogoOnCard = (opts?: {
    syncText?: boolean;
    variantOverride?: 'full' | 'mark';
    feedback?: string;
    logoOverride?: string;
    markOverride?: string;
  }) => {
    const variant = opts?.variantOverride ?? symbols.customLogoVariant ?? 'full';
    const fullUrl = opts?.logoOverride ?? studioLogo.logoSvgDataUrl;
    const markUrl = opts?.markOverride ?? studioLogo.markSvgDataUrl;
    const targetLogoUrl = variant === 'mark' ? markUrl || fullUrl : fullUrl;

    if (targetLogoUrl) {
      setSymbols((prev) => ({
        ...prev,
        customLogoDataUrl: targetLogoUrl,
        customLogoFullColor: prev.customLogoFullColor ?? true,
        customLogoVariant: variant,
        crestCenterMode: 'custom-image',
        crestStyle:
          prev.crestStyle === 'none' || prev.crestStyle === 'auto'
            ? 'clean-logo'
            : prev.crestStyle,
      }));
    }

    if (opts?.syncText ?? autoSyncBrand) {
      setDetails((prev) => ({
        ...prev,
        companyName: studioLogo.brandName || prev.companyName,
        monogram: studioLogo.monogram || prev.monogram,
        tagline: studioLogo.tagline || prev.tagline,
      }));
    }

    if (opts?.feedback) {
      setDbFeedback(opts.feedback);
      scheduleFeedbackClear(2600);
    }
  };

  // Auto-sync whenever Canvas Logo updates or Visiting Card tab mounts with a fresh snapshot
  useEffect(() => {
    if (!studioLogo.logoSvgDataUrl) return;
    if (!autoSyncBrand && lastSyncedRevRef.current !== -1) return;
    if (lastSyncedRevRef.current === studioLogo.revision) return;

    lastSyncedRevRef.current = studioLogo.revision;
    placeSavedLogoOnCard({ syncText: autoSyncBrand });
  }, [
    studioLogo.revision,
    studioLogo.logoSvgDataUrl,
    studioLogo.markSvgDataUrl,
    studioLogo.brandName,
    studioLogo.monogram,
    studioLogo.tagline,
    autoSyncBrand,
  ]);

  // Explicit "Put Logo on Card" button from Logo Canvas Editor
  useEffect(() => {
    if (incomingLogoNonce === 0) return;
    let active = true;
    void (async () => {
      const snap = studioLogo.logoSvgDataUrl
        ? { logoSvgDataUrl: studioLogo.logoSvgDataUrl, markSvgDataUrl: studioLogo.markSvgDataUrl }
        : await studioLogo.flushSnapshotNow();
      if (!active) return;
      placeSavedLogoOnCard({
        syncText: true,
        logoOverride: snap.logoSvgDataUrl,
        markOverride: snap.markSvgDataUrl,
        feedback: `Canvas logo for "${studioLogo.brandName}" placed onto your visiting card.`,
      });
      setIsLogoSelected(true);
    })();
    return () => {
      active = false;
    };
  }, [incomingLogoNonce]);

  const handleForceSyncFromCanvas = async () => {
    const snap = await studioLogo.flushSnapshotNow();
    placeSavedLogoOnCard({
      syncText: true,
      logoOverride: snap.logoSvgDataUrl,
      markOverride: snap.markSvgDataUrl,
      feedback: `Synced "${studioLogo.brandName}" logo & brand metadata from Canvas.`,
    });
  };

  const handleLogoPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setIsLogoSelected(true);
    logoDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: symbols.customLogoOffsetX ?? 0,
      origY: symbols.customLogoOffsetY ?? 0,
    };

    const handleMove = (ev: PointerEvent) => {
      const drag = logoDragRef.current;
      const stage = cardStageRef.current;
      if (!drag || !stage) return;
      const rect = stage.getBoundingClientRect();
      const factor = 680 / Math.max(280, rect.width);
      const dx = (ev.clientX - drag.startX) * factor;
      const dy = (ev.clientY - drag.startY) * factor;
      if (Math.abs(ev.clientX - drag.startX) > 3 || Math.abs(ev.clientY - drag.startY) > 3) {
        justDraggedRef.current = true;
      }
      const nextX = Math.max(-150, Math.min(150, Math.round(drag.origX + dx)));
      const nextY = Math.max(-95, Math.min(95, Math.round(drag.origY + dy)));
      setSymbols((prev) => ({
        ...prev,
        customLogoOffsetX: nextX,
        customLogoOffsetY: nextY,
      }));
    };

    const handleUp = () => {
      logoDragRef.current = null;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      if (justDraggedRef.current) {
        window.setTimeout(() => {
          justDraggedRef.current = false;
        }, 60);
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  useEffect(() => {
    if (!magic.autoShowcase) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    let frameId = 0;
    const start = performance.now();
    let lastEmit = 0;

    // Throttle React state updates to ~16fps while CSS transition-transform smoothly interpolates
    const tick = (now: number) => {
      if (now - lastEmit >= 60) {
        lastEmit = now;
        const t = (now - start) / 1000;
        const ry = Math.sin(t * 1.1) * 7;
        const rx = Math.cos(t * 0.85) * 4.5;
        const gx = Math.round(50 + Math.sin(t * 1.1) * 35);
        const gy = Math.round(50 + Math.cos(t * 0.85) * 30);
        setTilt({ rx, ry });
        setGlare({ x: gx, y: gy });
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [magic.autoShowcase]);

  const canvasBrandTheme = useMemo(
    () => buildCardThemeFromBrandColors(studioLogo.colors, studioLogo.brandName),
    [studioLogo.colors, studioLogo.brandName]
  );

  const allThemes = useMemo(
    () => [canvasBrandTheme, ...CARD_THEMES],
    [canvasBrandTheme]
  );

  const activeTheme = useMemo(
    () => allThemes.find((t) => t.id === activeThemeId) ?? CARD_THEMES[0],
    [allThemes, activeThemeId]
  );

  const activeDesign = useMemo(
    () => CARD_DESIGNS.find((d) => d.id === activeDesignId) ?? CARD_DESIGNS[0],
    [activeDesignId]
  );

  const filteredDesigns = useMemo(() => {
    if (designFilter === 'All') return CARD_DESIGNS;
    return CARD_DESIGNS.filter((d) => d.category === designFilter);
  }, [designFilter]);

  const phoneFormatter = (raw: string) =>
    spacePhones ? formatPakistaniPhone(raw) : raw;

  const handleApplyFontTheme = (fontThemeId: CardFontThemeId) => {
    setActiveFontId(fontThemeId);
    const preset = CARD_FONT_THEMES.find((f) => f.id === fontThemeId);
    if (!preset) return;
    setTypography((prev) => ({
      ...prev,
      companyName: { ...prev.companyName, fontId: preset.defaultDisplayId },
      tagline: { ...prev.tagline, fontId: preset.defaultDisplayId },
      subtitle: { ...prev.subtitle, fontId: preset.defaultBodyId },
      contactName: { ...prev.contactName, fontId: preset.defaultBodyId },
      address: { ...prev.address, fontId: preset.defaultBodyId },
      badge: { ...prev.badge, fontId: preset.defaultBodyId },
    }));
  };

  const handleSelectDesign = (
    designId: CardDesignId,
    recommendedTheme: CardThemeId,
    recommendedBorder: CardBorderStyle
  ) => {
    const designName = CARD_DESIGNS.find((d) => d.id === designId)?.name ?? 'Template';
    setActiveDesignId(designId);
    setActiveThemeId(recommendedTheme);
    setActiveBorderStyle(recommendedBorder);

    // Automatically place saved Canvas logo onto the visiting card canvas when selecting any template
    const variant = symbols.customLogoVariant ?? 'full';
    const targetLogoUrl =
      variant === 'mark'
        ? studioLogo.markSvgDataUrl || studioLogo.logoSvgDataUrl
        : studioLogo.logoSvgDataUrl;

    if (targetLogoUrl) {
      setSymbols((prev) => ({
        ...prev,
        customLogoDataUrl: targetLogoUrl,
        customLogoFullColor: prev.customLogoFullColor ?? true,
        crestCenterMode: 'custom-image',
        crestStyle:
          prev.crestStyle === 'none' || prev.crestStyle === 'auto'
            ? 'clean-logo'
            : prev.crestStyle,
      }));
      if (autoSyncBrand) {
        setDetails((prev) => ({
          ...prev,
          companyName: studioLogo.brandName || prev.companyName,
          monogram: studioLogo.monogram || prev.monogram,
          tagline: studioLogo.tagline || prev.tagline,
        }));
      }
      setIsLogoSelected(true);
      setDbFeedback(`${designName} loaded with your Canvas logo placed automatically.`);
      scheduleFeedbackClear(2600);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (magic.autoShowcase) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const clientX = e.clientX;
    const clientY = e.clientY;
    if (hoverRafRef.current !== null) return;
    hoverRafRef.current = window.requestAnimationFrame(() => {
      hoverRafRef.current = null;
      const el = cardStageRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const px = (clientX - rect.left) / rect.width;
      const py = (clientY - rect.top) / rect.height;
      const ry = (px - 0.5) * 10;
      const rx = (0.5 - py) * 8;
      setTilt({ rx, ry });
      setGlare({ x: Math.round(px * 100), y: Math.round(py * 100) });
    });
  };

  const handleMouseLeave = () => {
    if (hoverRafRef.current !== null) {
      window.cancelAnimationFrame(hoverRafRef.current);
      hoverRafRef.current = null;
    }
    if (magic.autoShowcase) return;
    setTilt({ rx: 0, ry: 0 });
    setGlare({ x: 50, y: 50 });
  };

  const handleExportPng = async (targetSide: 'front' | 'back') => {
    try {
      setExportingSide(targetSide);
      await exportCardPng(
        targetSide,
        activeDesignId,
        activeBorderStyle,
        details,
        activeTheme,
        typography,
        symbols,
        magic,
        phoneFormatter
      );
    } finally {
      setExportingSide(null);
    }
  };

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        copyTimerRef.current = null;
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 1800);
    } catch {
      // Clipboard blocked
    }
  };

  const persistPresets = (next: SavedCardPreset[]) => {
    setSavedPresets(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  };

  const handleSavePreset = (name: string) => {
    const newPreset: SavedCardPreset = {
      id: `${Date.now()}`,
      name,
      savedAt: new Date().toISOString(),
      designId: activeDesignId,
      themeId: activeThemeId,
      borderStyle: activeBorderStyle,
      fontThemeId: activeFontId,
      cornerStyle,
      details,
      typography,
      symbols,
      magic,
    };
    persistPresets([newPreset, ...savedPresets]);
  };

  const handleLoadPreset = (preset: SavedCardPreset) => {
    setActiveDesignId(preset.designId);
    setActiveThemeId(preset.themeId);
    setActiveBorderStyle(preset.borderStyle);
    setActiveFontId(preset.fontThemeId);
    setCornerStyle(preset.cornerStyle);
    setDetails(preset.details);
    setTypography({ ...DEFAULT_TYPOGRAPHY_MAP, ...preset.typography });
    setSymbols({ ...DEFAULT_SYMBOLS_CONFIG, ...preset.symbols });
    setMagic({ ...DEFAULT_MAGIC_CONFIG, ...preset.magic });
  };

  const handleDeletePreset = (id: string) => {
    persistPresets(savedPresets.filter((p) => p.id !== id));
  };

  const handleResetAll = () => {
    setDetails(DEFAULT_CARD_DETAILS);
    setActiveDesignId('sovereign-stamp');
    setActiveThemeId('emerald-gold');
    setActiveBorderStyle('double-hairline');
    setActiveFontId('playfair-jakarta');
    setCornerStyle('classic');
    setTypography(DEFAULT_TYPOGRAPHY_MAP);
    setSymbols(DEFAULT_SYMBOLS_CONFIG);
    setMagic(DEFAULT_MAGIC_CONFIG);
  };

  const handleExportDatabaseJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      activeCard: {
        id: `active-${Date.now()}`,
        name: `${details.companyName} (${activeDesign.name})`,
        savedAt: new Date().toISOString(),
        designId: activeDesignId,
        themeId: activeThemeId,
        borderStyle: activeBorderStyle,
        fontThemeId: activeFontId,
        cornerStyle,
        details,
        typography,
        symbols,
        magic,
      },
      savedPresets,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'visiting-cards-database.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDbFeedback(`Exported database (${savedPresets.length} saved presets + active card).`);
    scheduleFeedbackClear(2600);
  };

  const handleImportDatabaseJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        let imported: SavedCardPreset[] = [];
        if (Array.isArray(parsed)) {
          imported = parsed;
        } else if (Array.isArray(parsed?.savedPresets)) {
          imported = parsed.savedPresets;
          if (parsed.activeCard) {
            handleLoadPreset(parsed.activeCard as SavedCardPreset);
          }
        } else if (parsed?.designId && parsed?.details) {
          imported = [parsed as SavedCardPreset];
          handleLoadPreset(parsed as SavedCardPreset);
        }

        if (imported.length > 0) {
          const existingIds = new Set(savedPresets.map((p) => p.id));
          const merged = [
            ...imported.filter((p) => !existingIds.has(p.id)),
            ...savedPresets,
          ];
          persistPresets(merged);
          setDbFeedback(`Imported ${imported.length} card preset(s) into your database.`);
        } else {
          setDbFeedback('Loaded card configuration from file.');
        }
      } catch {
        setDbFeedback('Could not read file — ensure it is a valid JSON card database.');
      }
      scheduleFeedbackClear(3200);
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <div className="no-print mx-auto max-w-[1440px] px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
          {/* STICKY LIVE CARD STAGE */}
          <aside
            id="preview"
            className={`order-1 lg:order-2 lg:col-span-5 lg:sticky lg:top-5 ${
              mobilePinned ? 'sticky top-2 z-30' : ''
            }`}
          >
            <div className="rounded-2xl border border-[#DFDBD0] bg-[#EAE7DF] p-4 sm:p-5 shadow-sm">
              <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7E632B] truncate">
                    Live Card Proof · {activeDesign.name}
                  </p>
                  <p className="text-xs font-medium text-[#55524B] truncate">
                    {activeTheme.name}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div
                    className="inline-flex items-center rounded-lg bg-[#DCD8CE] p-0.5"
                    role="tablist"
                    aria-label="Card side selector"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={side === 'front'}
                      onClick={() => setSide('front')}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        side === 'front'
                          ? 'bg-white text-[#141413] shadow-xs'
                          : 'text-[#55524B] hover:text-[#141413]'
                      }`}
                    >
                      Front
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={side === 'back'}
                      onClick={() => setSide('back')}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        side === 'back'
                          ? 'bg-white text-[#141413] shadow-xs'
                          : 'text-[#55524B] hover:text-[#141413]'
                      }`}
                    >
                      Back (QR)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSide((s) => (s === 'front' ? 'back' : 'front'))}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#D2CEC2] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#141413] transition-colors hover:bg-[#FAF8F4] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <FlipHorizontal2 className="h-3.5 w-3.5" />
                    Flip
                  </button>

                  <button
                    type="button"
                    onClick={() => setMobilePinned((v) => !v)}
                    className={`lg:hidden inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      mobilePinned
                        ? 'border-[#141413] bg-[#141413] text-white'
                        : 'border-[#D2CEC2] bg-white text-[#141413]'
                    }`}
                  >
                    <Pin className="h-3 w-3" />
                    {mobilePinned ? 'Pinned' : 'Pin'}
                  </button>
                </div>
              </div>

              <div
                ref={cardStageRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={() => {
                  if (justDraggedRef.current) return;
                  if (isLogoSelected) {
                    setIsLogoSelected(false);
                    return;
                  }
                  setSide((s) => (s === 'front' ? 'back' : 'front'));
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSide((s) => (s === 'front' ? 'back' : 'front'));
                  }
                }}
                aria-label="Interactive visiting card preview. Click to flip between front and back, or drag your logo directly on the front."
                className="perspective-stage mx-auto w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#141413] focus-visible:ring-offset-4 rounded-xl"
              >
                <div
                  className="aspect-[1.75/1] w-full transition-transform duration-200 ease-out"
                  style={{
                    transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
                  }}
                >
                  <div
                    className={`card-3d-inner relative h-full w-full ${
                      side === 'back' ? 'is-flipped' : ''
                    }`}
                  >
                    <div className="card-face absolute inset-0">
                      <CardFrontFace
                        designId={activeDesignId}
                        borderStyle={activeBorderStyle}
                        cornerStyle={cornerStyle}
                        details={details}
                        theme={activeTheme}
                        typography={typography}
                        symbols={symbols}
                        magic={magic}
                        formatPhone={phoneFormatter}
                        showPrintGuides={showPrintGuides}
                        glarePos={glare}
                        interactiveLogo={side === 'front' && !showPrintGuides}
                        isLogoSelected={isLogoSelected}
                        onLogoPointerDown={handleLogoPointerDown}
                      />
                    </div>

                    <div className="card-face card-face-back absolute inset-0">
                      <CardBackFace
                        designId={activeDesignId}
                        borderStyle={activeBorderStyle}
                        cornerStyle={cornerStyle}
                        details={details}
                        theme={activeTheme}
                        typography={typography}
                        symbols={symbols}
                        magic={magic}
                        formatPhone={phoneFormatter}
                        showPrintGuides={showPrintGuides}
                        glarePos={glare}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSide('front')}
                  className={`group rounded-lg border p-1.5 text-left transition-all cursor-pointer ${
                    side === 'front'
                      ? 'border-[#141413] bg-white shadow-xs'
                      : 'border-[#D8D4C9] bg-[#F5F3ED]/80 opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="relative aspect-[1.75/1] w-full overflow-hidden rounded pointer-events-none">
                    <div className="origin-top-left scale-[0.38] w-[264%] h-[264%]">
                      <CardFrontFace
                        designId={activeDesignId}
                        borderStyle={activeBorderStyle}
                        cornerStyle={cornerStyle}
                        details={details}
                        theme={activeTheme}
                        typography={typography}
                        symbols={symbols}
                        magic={magic}
                        formatPhone={phoneFormatter}
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-center text-[10px] font-semibold text-[#36342F]">
                    Front Proof
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSide('back')}
                  className={`group rounded-lg border p-1.5 text-left transition-all cursor-pointer ${
                    side === 'back'
                      ? 'border-[#141413] bg-white shadow-xs'
                      : 'border-[#D8D4C9] bg-[#F5F3ED]/80 opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="relative aspect-[1.75/1] w-full overflow-hidden rounded pointer-events-none">
                    <div className="origin-top-left scale-[0.38] w-[264%] h-[264%]">
                      <CardBackFace
                        designId={activeDesignId}
                        borderStyle={activeBorderStyle}
                        cornerStyle={cornerStyle}
                        details={details}
                        theme={activeTheme}
                        typography={typography}
                        symbols={symbols}
                        magic={magic}
                        formatPhone={phoneFormatter}
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-center text-[10px] font-semibold text-[#36342F]">
                    Back Proof (QR)
                  </p>
                </button>
              </div>

              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-[#DCD8CE] pt-3 text-[11px] text-[#5C5951]">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={spacePhones}
                      onChange={(e) => setSpacePhones(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#B8B3A6] accent-[#141413]"
                    />
                    <span>Spaced Phone</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showPrintGuides}
                      onChange={(e) => setShowPrintGuides(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#B8B3A6] accent-[#141413]"
                    />
                    <span>Crop Guides</span>
                  </label>
                </div>
                <span className="font-mono-num text-[10px] text-[#6B675E]">
                  2100×1200 px · 600 DPI
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleExportPng('front')}
                  disabled={exportingSide !== null}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#141413] px-3 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-[#2C2B28] disabled:opacity-60 whitespace-nowrap cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 shrink-0" />
                  {exportingSide === 'front' ? 'Exporting...' : 'Front PNG'}
                </button>

                <button
                  type="button"
                  onClick={() => handleExportPng('back')}
                  disabled={exportingSide !== null}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#141413] bg-white px-3 py-2 text-[11px] font-semibold text-[#141413] transition-colors hover:bg-[#F5F3ED] disabled:opacity-60 whitespace-nowrap cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 shrink-0" />
                  {exportingSide === 'back' ? 'Exporting...' : 'Back PNG'}
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#D2CEC2] bg-white px-3 py-2 text-[11px] font-medium text-[#36342F] transition-colors hover:bg-[#FAF8F4] whitespace-nowrap cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5 shrink-0" />
                  Print Sheet
                </button>

                <button
                  type="button"
                  onClick={() => downloadVCard(details)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#D2CEC2] bg-white px-3 py-2 text-[11px] font-medium text-[#36342F] transition-colors hover:bg-[#FAF8F4] whitespace-nowrap cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5 shrink-0" />
                  Save .vcf
                </button>
              </div>

              {/* LIVE ON-CARD LOGO EDITOR PANEL */}
              {(symbols.customLogoDataUrl || studioLogo.logoSvgDataUrl) && (
                <div className="mt-4 rounded-xl border border-[#D5D0C3] bg-white/95 p-3.5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-lg border border-[#E2DFD7] bg-[#FAF9F6] p-1 flex items-center justify-center shrink-0">
                        <img
                          src={symbols.customLogoDataUrl || studioLogo.logoSvgDataUrl}
                          alt={studioLogo.brandName}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-[#141413] flex items-center gap-1 truncate">
                          <Move className="h-3 w-3 text-[#7E632B] shrink-0" />
                          Logo on Card (Drag to Move)
                        </p>
                        <p className="text-[10px] text-[#6B675E] truncate">
                          {autoSyncBrand ? 'Auto-synced with Logo Canvas' : 'Custom card logo overrides active'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={studioLogo.onJumpToLogoEditor}
                      className="inline-flex items-center gap-1 rounded-md border border-[#D2CEC2] bg-[#FAF9F6] px-2 py-1 text-[10px] font-semibold text-[#141413] hover:bg-[#EFECE4] cursor-pointer shrink-0"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                      Edit SVG
                    </button>
                  </div>

                  {/* Framing + Logo Variant + Color Mode */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="inline-flex rounded-md bg-[#EAE7DF] p-0.5 text-[10px] font-semibold">
                      <button
                        type="button"
                        onClick={() =>
                          setSymbols((prev) => ({
                            ...prev,
                            crestStyle: 'clean-logo',
                            crestCenterMode: 'custom-image',
                            customLogoDataUrl:
                              prev.customLogoDataUrl || studioLogo.logoSvgDataUrl,
                          }))
                        }
                        className={`rounded px-2 py-1 cursor-pointer ${
                          symbols.crestStyle === 'clean-logo'
                            ? 'bg-white text-[#141413] shadow-xs'
                            : 'text-[#55524B]'
                        }`}
                      >
                        Frameless
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSymbols((prev) => ({
                            ...prev,
                            crestStyle: lastSealStyle,
                            crestCenterMode: 'custom-image',
                            customLogoDataUrl:
                              prev.customLogoDataUrl || studioLogo.logoSvgDataUrl,
                          }))
                        }
                        className={`rounded px-2 py-1 cursor-pointer ${
                          symbols.crestStyle !== 'clean-logo' && symbols.crestStyle !== 'none'
                            ? 'bg-white text-[#141413] shadow-xs'
                            : 'text-[#55524B]'
                        }`}
                      >
                        Seal Frame
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSymbols((prev) => ({ ...prev, crestStyle: 'none' }))
                        }
                        className={`rounded px-2 py-1 cursor-pointer ${
                          symbols.crestStyle === 'none'
                            ? 'bg-white text-[#141413] shadow-xs'
                            : 'text-[#55524B]'
                        }`}
                      >
                        Hide
                      </button>
                    </div>

                    <div className="inline-flex rounded-md bg-[#EAE7DF] p-0.5 text-[10px] font-semibold">
                      <button
                        type="button"
                        onClick={() =>
                          placeSavedLogoOnCard({ variantOverride: 'full', syncText: false })
                        }
                        className={`rounded px-2 py-1 cursor-pointer ${
                          (symbols.customLogoVariant ?? 'full') === 'full'
                            ? 'bg-white text-[#141413] shadow-xs'
                            : 'text-[#55524B]'
                        }`}
                      >
                        Full Logo
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          placeSavedLogoOnCard({ variantOverride: 'mark', syncText: false })
                        }
                        className={`rounded px-2 py-1 cursor-pointer ${
                          symbols.customLogoVariant === 'mark'
                            ? 'bg-white text-[#141413] shadow-xs'
                            : 'text-[#55524B]'
                        }`}
                      >
                        Mark Only
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSymbols((prev) => ({
                          ...prev,
                          customLogoFullColor: !(prev.customLogoFullColor ?? true),
                        }))
                      }
                      className={`rounded-md border px-2 py-1 text-[10px] font-semibold cursor-pointer ${
                        symbols.customLogoFullColor ?? true
                          ? 'border-[#141413] bg-[#141413] text-white'
                          : 'border-[#D2CEC2] bg-[#FAF9F6] text-[#141413]'
                      }`}
                    >
                      {symbols.customLogoFullColor ?? true ? 'Original Colors' : 'Foil Tint'}
                    </button>
                  </div>

                  {/* Size, Rotate, Opacity Sliders */}
                  <div className="grid grid-cols-3 gap-2 pt-0.5">
                    <div>
                      <div className="flex justify-between text-[10px] font-semibold text-[#55524B]">
                        <span>Size</span>
                        <span className="font-mono-num">{Math.round((symbols.crestScale ?? 1) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.45}
                        max={2.0}
                        step={0.05}
                        value={symbols.crestScale ?? 1}
                        onChange={(e) =>
                          setSymbols((prev) => ({ ...prev, crestScale: parseFloat(e.target.value) }))
                        }
                        className="mt-1 w-full accent-[#141413] cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-semibold text-[#55524B]">
                        <span>Rotate</span>
                        <span className="font-mono-num">{Math.round(symbols.customLogoRotation ?? 0)}°</span>
                      </div>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={5}
                        value={symbols.customLogoRotation ?? 0}
                        onChange={(e) =>
                          setSymbols((prev) => ({ ...prev, customLogoRotation: parseInt(e.target.value, 10) }))
                        }
                        className="mt-1 w-full accent-[#141413] cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-semibold text-[#55524B]">
                        <span>Opacity</span>
                        <span className="font-mono-num">{symbols.customLogoOpacity ?? 100}%</span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={100}
                        step={5}
                        value={symbols.customLogoOpacity ?? 100}
                        onChange={(e) =>
                          setSymbols((prev) => ({ ...prev, customLogoOpacity: parseInt(e.target.value, 10) }))
                        }
                        className="mt-1 w-full accent-[#141413] cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Quick inline brand text + Push back to Canvas + Reset Transform */}
                  <div className="grid grid-cols-2 gap-1.5 border-t border-[#EAE7DF] pt-2.5">
                    <input
                      type="text"
                      value={details.companyName}
                      onChange={(e) =>
                        setDetails((prev) => ({ ...prev, companyName: e.target.value }))
                      }
                      placeholder="Brand Name"
                      className="rounded-md border border-[#D8D4C9] bg-[#FAF9F6] px-2 py-1 text-[11px] font-semibold text-[#141413] focus:border-[#141413] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={details.tagline}
                      onChange={(e) =>
                        setDetails((prev) => ({ ...prev, tagline: e.target.value }))
                      }
                      placeholder="Tagline"
                      className="rounded-md border border-[#D8D4C9] bg-[#FAF9F6] px-2 py-1 text-[11px] text-[#141413] focus:border-[#141413] focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-semibold">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setSymbols((prev) => ({
                            ...prev,
                            customLogoFlipX: !(prev.customLogoFlipX ?? false),
                          }))
                        }
                        className={`rounded border px-2 py-1 cursor-pointer ${
                          symbols.customLogoFlipX
                            ? 'border-[#141413] bg-[#141413] text-white'
                            : 'border-[#D8D4C9] bg-[#FAF9F6] text-[#141413]'
                        }`}
                      >
                        Flip H
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSymbols((prev) => ({
                            ...prev,
                            crestScale: 1,
                            customLogoOffsetX: 0,
                            customLogoOffsetY: 0,
                            customLogoRotation: 0,
                            customLogoOpacity: 100,
                            customLogoFlipX: false,
                          }))
                        }
                        className="inline-flex items-center gap-1 rounded border border-[#D8D4C9] bg-[#FAF9F6] px-2 py-1 text-[#141413] hover:bg-[#EFECE4] cursor-pointer"
                      >
                        <RotateCcw className="h-2.5 w-2.5" />
                        Reset Pos
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        studioLogo.onUpdateCanvasBrandMeta({
                          brandName: details.companyName,
                          tagline: details.tagline,
                        });
                        setDbFeedback('Updated brand text in Logo Canvas too.');
                        scheduleFeedbackClear(2400);
                      }}
                      className="rounded bg-[#1B4332] px-2 py-1 text-white hover:bg-[#143527] cursor-pointer"
                    >
                      Sync Text to Canvas
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* SCROLLING EDITOR WORKSPACE */}
          <div className="order-2 lg:order-1 lg:col-span-7 min-w-0 space-y-12">
            {/* Editorial Header + Synced Canvas Logo Banner + DB Controls */}
            <section className="border-b border-[#E2DFD7] pb-6 space-y-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#7E632B]">
                  Visiting Card Database · {activeDesign.name}
                </p>
                <h1 className="font-display mt-1.5 text-3xl sm:text-4xl font-bold leading-[1.08] tracking-tight text-[#141413] text-balance">
                  {details.companyName}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-[#55524B] max-w-2xl">
                  Your Logo Canvas artwork, brand name, tagline, and brand colors automatically connect here. Pick any of the 20 card templates below and click or drag your logo directly on the card proof.
                </p>
              </div>

              {/* Connected Canvas Brand Card */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] p-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-12 w-12 rounded-lg border border-[#E2DFD7] bg-white p-1.5 flex items-center justify-center shrink-0">
                    {studioLogo.logoSvgDataUrl ? (
                      <img
                        src={studioLogo.logoSvgDataUrl}
                        alt={studioLogo.brandName}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs font-bold text-[#7A756B]">
                        {studioLogo.monogram}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#141413] truncate">
                        {studioLogo.brandName}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {[
                          studioLogo.colors.primary,
                          studioLogo.colors.accent,
                          studioLogo.colors.secondary,
                        ].map((hex, idx) => (
                          <span
                            key={idx}
                            className="h-3 w-3 rounded-full border border-black/15"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-[#6B675E] truncate">
                      {studioLogo.tagline || 'Connected live from Logo Maker canvas'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <label className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D4C9] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#141413] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoSyncBrand}
                      onChange={(e) => setAutoSyncBrand(e.target.checked)}
                      className="h-3.5 w-3.5 rounded accent-[#1B4332]"
                    />
                    Auto-Sync
                  </label>

                  <button
                    type="button"
                    onClick={() => setActiveThemeId('canvas-brand')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                      activeThemeId === 'canvas-brand'
                        ? 'bg-[#141413] text-white'
                        : 'border border-[#D8D4C9] bg-white text-[#141413] hover:bg-[#EFECE4]'
                    }`}
                  >
                    <Palette className="h-3.5 w-3.5" />
                    Match Brand Colors
                  </button>

                  <button
                    type="button"
                    onClick={handleForceSyncFromCanvas}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B4332] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#143527] transition-colors cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Place Canvas Logo
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={studioLogo.onJumpToLogoEditor}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#141413] bg-[#141413] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#2C2B28] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Edit Logo on Canvas
                </button>

                <input
                  ref={dbUploadRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportDatabaseJson}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => dbUploadRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D4C9] bg-white px-3.5 py-2 text-xs font-semibold text-[#141413] hover:bg-[#FAF8F4] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Import Cards Database (.json)
                </button>

                <button
                  type="button"
                  onClick={handleExportDatabaseJson}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D4C9] bg-white px-3.5 py-2 text-xs font-semibold text-[#141413] hover:bg-[#FAF8F4] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Database className="h-3.5 w-3.5" />
                  Backup Cards DB ({savedPresets.length})
                </button>
              </div>

              {dbFeedback && (
                <p className="text-xs font-semibold text-[#1B4332]">{dbFeedback}</p>
              )}
            </section>

            {/* Granular Customizer Section */}
            <StudioCustomizer
              details={details}
              setDetails={setDetails}
              typography={typography}
              setTypography={setTypography}
              activeFontId={activeFontId}
              onApplyFontTheme={handleApplyFontTheme}
              symbols={symbols}
              setSymbols={setSymbols}
              magic={magic}
              setMagic={setMagic}
              activeDesignId={activeDesignId}
              activeThemeId={activeThemeId}
              activeBorderStyle={activeBorderStyle}
              cornerStyle={cornerStyle}
              savedPresets={savedPresets}
              onSavePreset={handleSavePreset}
              onLoadPreset={handleLoadPreset}
              onDeletePreset={handleDeletePreset}
              onResetAll={handleResetAll}
            />

            {/* 20 Exclusive, Traditional & Luxury Designs Showcase */}
            <section id="designs" className="scroll-mt-6 border-t border-[#E2DFD7] pt-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#141413]">
                    20 Exclusive, Traditional &amp; Luxury Designs
                  </h2>
                  <p className="mt-1 text-sm text-[#5C5951]">
                    Click any edition below to load it onto the pinned studio card — your custom fonts, seals, text magic, and foil carry over.
                  </p>
                </div>

                <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-[#E7E4DC] p-1 self-start md:self-auto">
                  {(['All', 'Traditional', 'Heritage', 'Executive', 'Architectural'] as DesignFilter[]).map(
                    (category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setDesignFilter(category)}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          designFilter === category
                            ? 'bg-white text-[#141413] shadow-xs'
                            : 'text-[#5C5951] hover:text-[#141413]'
                        }`}
                      >
                        {category === 'All' ? 'All 20' : category}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                {filteredDesigns.map((design) => {
                  const isSelected = design.id === activeDesignId;
                  const previewTheme =
                    CARD_THEMES.find((t) => t.id === design.recommendedTheme) ??
                    CARD_THEMES[0];

                  return (
                    <button
                      key={design.id}
                      type="button"
                      onClick={() =>
                        handleSelectDesign(
                          design.id,
                          design.recommendedTheme,
                          design.recommendedBorder
                        )
                      }
                      className={`group flex flex-col rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#141413] bg-white shadow-sm'
                          : 'border-[#E2DFD7] bg-[#FAF9F6] hover:border-[#C5C0B4] hover:bg-white'
                      }`}
                    >
                      <div className="relative w-full overflow-hidden rounded-xl bg-[#EAE7DF] p-2.5">
                        <div className="relative aspect-[1.75/1] w-full overflow-hidden rounded-lg pointer-events-none">
                          <div className="origin-top-left scale-[0.52] sm:scale-[0.55] w-[192%] sm:w-[182%] h-[192%] sm:h-[182%]">
                            <CardFrontFace
                              designId={design.id}
                              borderStyle={design.recommendedBorder}
                              cornerStyle={cornerStyle}
                              details={details}
                              theme={previewTheme}
                              typography={typography}
                              symbols={symbols}
                              magic={magic}
                              formatPhone={phoneFormatter}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-[#141413]">{design.name}</h3>
                          <p className="mt-0.5 text-xs font-medium text-[#7E632B]">
                            {design.category} · {design.subtitle}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-xs font-semibold ${
                            isSelected ? 'text-[#141413]' : 'text-[#7A756B] group-hover:text-[#141413]'
                          }`}
                        >
                          {isSelected ? 'Active' : 'Select'}
                        </span>
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-[#5C5951]">
                        {design.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 12 Foil & Paper Palettes + 8 Border Foil Finishes + 5 Corner Cuts */}
            <section id="finishes" className="scroll-mt-6 border-t border-[#E2DFD7] pt-10 space-y-10">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#141413]">
                      12 Exclusive Foil &amp; Paper Color Editions
                    </h2>
                    <p className="mt-1 text-sm text-[#5C5951]">
                      Royal Sapphire, Verdigris Teal &amp; Rose Gold, Maharaja Ruby, Carrara Marble, 24K Bullion Gold, Amethyst, Titanium &amp; Emerald.
                    </p>
                  </div>
                  <span className="text-xs font-medium text-[#6B675E] whitespace-nowrap shrink-0">
                    12 Distinct Palettes
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                  {allThemes.map((theme) => {
                    const isSelected = theme.id === activeTheme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setActiveThemeId(theme.id)}
                        className={`group flex flex-col justify-between rounded-xl border p-4 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#141413] bg-white shadow-sm ring-1 ring-[#141413]'
                            : 'border-[#E2DFD7] bg-[#FAF9F6] hover:border-[#C5C0B4] hover:bg-white'
                        }`}
                      >
                        <div className="flex w-full items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="flex h-9 w-12 items-center justify-center rounded-md border"
                              style={{
                                background: theme.surfaceGradient,
                                borderColor: theme.borderHex,
                              }}
                            >
                              <span
                                className="font-display text-xs font-bold tracking-wider"
                                style={{ color: theme.accentHex }}
                              >
                                {details.monogram}
                              </span>
                            </div>
                            <span
                              className="h-9 w-2.5 rounded-sm border border-black/10"
                              style={{ background: theme.foilGradient }}
                              title="Metallic Foil Swatch"
                            />
                          </div>
                          <span
                            className={`text-xs font-semibold ${
                              isSelected ? 'text-[#141413]' : 'text-[#7A756B]'
                            }`}
                          >
                            {isSelected ? 'Active' : 'Apply'}
                          </span>
                        </div>

                        <div className="mt-3.5">
                          <p className="text-sm font-semibold text-[#141413]">{theme.name}</p>
                          <p className="mt-0.5 text-xs text-[#6B675E]">{theme.finishNote}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-[#141413]">
                  8 Exclusive Border Foil Finishes
                </h3>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {CARD_BORDER_PRESETS.map((border) => {
                    const isSelected = border.id === activeBorderStyle;
                    return (
                      <button
                        key={border.id}
                        type="button"
                        onClick={() => setActiveBorderStyle(border.id)}
                        className={`flex items-center gap-3.5 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#141413] bg-white shadow-xs ring-1 ring-[#141413]'
                            : 'border-[#E2DFD7] bg-[#FAF9F6] hover:border-[#C5C0B4] hover:bg-white'
                        }`}
                      >
                        <BorderFoilDiagram styleId={border.id} accent={activeTheme.accentHex} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-[#141413] truncate">
                              {border.name}
                            </span>
                            {isSelected && (
                              <span className="text-[11px] font-semibold text-[#7E632B] shrink-0">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-[#6B675E] leading-snug">{border.note}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-[#141413]">
                  5 Luxury Card Corner Cuts
                </h3>
                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {(
                    [
                      { id: 'sharp', name: 'Razor Press 90° Cut', note: 'Architectural square edge (3px crisp bevel)' },
                      { id: 'classic', name: 'Classic Luxury Radius', note: 'Balanced 3mm rounded corner (Standard VIP)' },
                      { id: 'soft', name: 'Boutique Soft Curve', note: 'Generous 6mm smooth tactile curve' },
                      { id: 'chamfered', name: '45° Diamond Chamfer', note: 'Bespoke angled VIP metal-card cut' },
                      { id: 'notched', name: 'Victorian Ticket Notch', note: 'Rare concave circular corner die-cut' },
                    ] as { id: CardCornerStyle; name: string; note: string }[]
                  ).map((c) => {
                    const isSelected = cornerStyle === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCornerStyle(c.id)}
                        className={`flex w-full items-center gap-3.5 rounded-xl border px-3.5 py-2.5 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#141413] bg-white shadow-xs ring-1 ring-[#141413]'
                            : 'border-[#E2DFD7] bg-[#FAF9F6] hover:border-[#C5C0B4] hover:bg-white'
                        }`}
                      >
                        <CornerCutDiagram cornerId={c.id} active={isSelected} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-[#141413] truncate">{c.name}</p>
                            {isSelected && (
                              <span className="text-[11px] font-semibold text-[#7E632B] shrink-0">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#6B675E] leading-snug">{c.note}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Direct Contact & Store Location */}
            <section id="directory" className="scroll-mt-6 border-t border-[#E2DFD7] pt-10">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#141413]">
                Direct Contact &amp; Store Location
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {details.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex flex-col justify-between rounded-xl border border-[#E2DFD7] bg-white p-5"
                  >
                    <div>
                      <p className="text-xs font-medium text-[#7A756B]">{contact.role}</p>
                      <h3 className="mt-1 text-lg font-bold text-[#141413]">{contact.name}</h3>
                      <p className="font-mono-num mt-1 text-sm font-medium text-[#4A4740]">
                        {phoneFormatter(contact.phone)}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <a
                        href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#141413] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2C2B28] whitespace-nowrap shrink-0"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Call Now
                      </a>
                      <a
                        href={toWhatsAppUrl(contact.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D4C9] bg-[#FAF9F6] px-3 py-2 text-xs font-semibold text-[#141413] transition-colors hover:bg-[#EFECE4] whitespace-nowrap shrink-0"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy(contact.id, contact.phone)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-[#5C5951] hover:bg-[#F4F3EF] cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {copiedKey === contact.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-700" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex flex-col justify-between rounded-xl border border-[#E2DFD7] bg-white p-5">
                  <div>
                    <p className="text-xs font-medium text-[#7A756B]">Shop Address</p>
                    <h3 className="mt-1 text-lg font-bold text-[#141413]">SITE Market, Karachi</h3>
                    <p className="mt-1 text-sm text-[#4A4740]">{details.address}</p>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <a
                      href={details.locationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#141413] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2C2B28] whitespace-nowrap shrink-0"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Google Maps
                      <ExternalLink className="h-3 w-3 opacity-80" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopy('location', details.locationUrl)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D4C9] bg-[#FAF9F6] px-3 py-2 text-xs font-semibold text-[#141413] transition-colors hover:bg-[#EFECE4] cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {copiedKey === 'location' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-700" />
                          Link Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Print-Only Exact Physical Size Sheet (3.5in x 2in) */}
      <div className="hidden print-only-sheet flex-col items-center justify-center gap-8 bg-white p-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            {details.companyName} — {activeDesign.name} (3.5 in × 2.0 in)
          </p>
        </div>

        <div className="space-y-8">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Front Side
            </p>
            <div className="relative h-[2in] w-[3.5in]">
              <CardFrontFace
                designId={activeDesignId}
                borderStyle={activeBorderStyle}
                cornerStyle={cornerStyle}
                details={details}
                theme={activeTheme}
                typography={typography}
                symbols={symbols}
                magic={magic}
                formatPhone={phoneFormatter}
                showPrintGuides={true}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Back Side
            </p>
            <div className="relative h-[2in] w-[3.5in]">
              <CardBackFace
                designId={activeDesignId}
                borderStyle={activeBorderStyle}
                cornerStyle={cornerStyle}
                details={details}
                theme={activeTheme}
                typography={typography}
                symbols={symbols}
                magic={magic}
                formatPhone={phoneFormatter}
                showPrintGuides={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
