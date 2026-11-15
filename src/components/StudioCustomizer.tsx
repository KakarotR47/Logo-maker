import React, { useRef, useState } from 'react';
import {
  BookmarkPlus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Stamp,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
import {
  AddressIconId,
  BackgroundPatternId,
  CardBorderStyle,
  CardCornerStyle,
  CardDesignId,
  CardDetails,
  CardFontThemeId,
  CardMagicConfig,
  CardSymbolsConfig,
  CardThemeId,
  CardTypographyMap,
  ContactIconId,
  CraftSymbolId,
  CrestCenterMode,
  FoilFinishEffect,
  SavedCardPreset,
  ServiceBulletId,
  TextMagicEffect,
  TextSlotKey,
} from '../types/card';
import {
  CARD_FONT_THEMES,
  CRAFT_SYMBOL_OPTIONS,
  CREST_CENTER_ICON_OPTIONS,
  CREST_FINISH_OPTIONS,
  CREST_RIM_BORDER_OPTIONS,
  CREST_STYLE_OPTIONS,
  CrestCategory,
  DEFAULT_SYMBOLS_CONFIG,
  FONT_FAMILY_OPTIONS,
} from '../data/cardPresets';
import {
  CraftIconSvg,
  CrestPreviewThumb,
  LuxuryCrestSvg,
  PostageStampEmblem,
  SculptedCenterIcon,
} from './SealCrest';

type StudioTab = 'content' | 'fonts' | 'symbols' | 'magic' | 'presets';

const TEXT_SLOTS: { key: TextSlotKey; label: string }[] = [
  { key: 'companyName', label: 'Business Name' },
  { key: 'subtitle', label: 'Header Kicker' },
  { key: 'tagline', label: 'Services Tagline' },
  { key: 'contactName', label: 'Contact Names' },
  { key: 'contactPhone', label: 'Phone Numbers' },
  { key: 'address', label: 'Shop Address (Bottom)' },
  { key: 'badge', label: 'Badges & QR Label' },
];

const TEXT_MAGIC_EFFECTS: { id: TextMagicEffect; label: string; note: string }[] = [
  { id: 'solid', label: 'Crisp Ink', note: 'Solid sharp print' },
  { id: 'foil-gradient', label: 'Metallic Foil', note: 'Liquid 24K gradient sheen' },
  { id: 'embossed', label: 'Embossed Press', note: 'Tactile raised relief' },
  { id: 'glow', label: 'Lustrous Glow', note: 'Soft metallic halo' },
];

const COLOR_SWATCHES: { hex: string; label: string }[] = [
  { hex: '', label: 'Auto' },
  { hex: '#FBF8F0', label: 'Ivory White' },
  { hex: '#E1BA59', label: '24K Gold' },
  { hex: '#FAE59E', label: 'Champagne' },
  { hex: '#F2B9A5', label: 'Rose Gold' },
  { hex: '#BAE6FD', label: 'Ice Silver' },
  { hex: '#941C23', label: 'Seal Crimson' },
  { hex: '#141413', label: 'Jet Obsidian' },
];

interface StudioCustomizerProps {
  details: CardDetails;
  setDetails: React.Dispatch<React.SetStateAction<CardDetails>>;
  typography: CardTypographyMap;
  setTypography: React.Dispatch<React.SetStateAction<CardTypographyMap>>;
  activeFontId: CardFontThemeId;
  onApplyFontTheme: (id: CardFontThemeId) => void;
  symbols: CardSymbolsConfig;
  setSymbols: React.Dispatch<React.SetStateAction<CardSymbolsConfig>>;
  magic: CardMagicConfig;
  setMagic: React.Dispatch<React.SetStateAction<CardMagicConfig>>;
  activeDesignId: CardDesignId;
  activeThemeId: CardThemeId;
  activeBorderStyle: CardBorderStyle;
  cornerStyle: CardCornerStyle;
  savedPresets: SavedCardPreset[];
  onSavePreset: (name: string) => void;
  onLoadPreset: (preset: SavedCardPreset) => void;
  onDeletePreset: (id: string) => void;
  onResetAll: () => void;
}

export const StudioCustomizer: React.FC<StudioCustomizerProps> = ({
  details,
  setDetails,
  typography,
  setTypography,
  activeFontId,
  onApplyFontTheme,
  symbols,
  setSymbols,
  magic,
  setMagic,
  savedPresets,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  onResetAll,
}) => {
  const [tab, setTab] = useState<StudioTab>('fonts');
  const [selectedSlot, setSelectedSlot] = useState<TextSlotKey>('companyName');
  const [activeStampSlot, setActiveStampSlot] = useState<0 | 1 | 2>(0);
  const [crestCategory, setCrestCategory] = useState<CrestCategory>('All');
  const [presetName, setPresetName] = useState<string>('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  const currentSlotStyle = typography[selectedSlot];

  const updateSlot = <K extends keyof typeof currentSlotStyle>(
    field: K,
    value: (typeof currentSlotStyle)[K]
  ) => {
    setTypography((prev) => ({
      ...prev,
      [selectedSlot]: {
        ...prev[selectedSlot],
        [field]: value,
      },
    }));
  };

  const getSlotPreviewText = (key: TextSlotKey): string => {
    switch (key) {
      case 'companyName':
        return details.companyName;
      case 'subtitle':
        return details.subtitle;
      case 'tagline':
        return details.tagline;
      case 'contactName':
        return details.contacts.map((c) => c.name).join(' · ');
      case 'contactPhone':
        return details.contacts[0]?.phone ?? '+923002634491';
      case 'address':
        return details.address;
      case 'badge':
        return `${details.cardLabel} · ${details.qrLabel}`;
    }
  };

  const updateContact = (index: number, field: 'name' | 'phone', value: string) => {
    setDetails((prev) => {
      const nextContacts = [...prev.contacts];
      nextContacts[index] = { ...nextContacts[index], [field]: value };
      return { ...prev, contacts: nextContacts };
    });
  };

  const updateService = (index: number, value: string) => {
    setDetails((prev) => {
      const nextServices = [...prev.services];
      nextServices[index] = value;
      return { ...prev, services: nextServices };
    });
  };

  const handleStampSymbolPick = (sym: CraftSymbolId) => {
    setSymbols((prev) => {
      const next: [CraftSymbolId, CraftSymbolId, CraftSymbolId] = [...prev.stampIcons];
      next[activeStampSlot] = sym;
      return { ...prev, stampIcons: next };
    });
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = presetName.trim();
    if (!trimmed) return;
    onSavePreset(trimmed);
    setPresetName('');
  };

  const handleCustomLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = () => {
      const rawUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!rawUrl) return;

      if (file.type === 'image/svg+xml') {
        setSymbols((prev) => ({
          ...prev,
          customLogoDataUrl: rawUrl,
          crestCenterMode: 'custom-image',
          crestStyle: prev.crestStyle === 'none' ? 'notary-rosette' : prev.crestStyle,
        }));
        return;
      }

      const img = new Image();
      img.onload = () => {
        const maxDim = 480;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const compressedUrl = canvas.toDataURL('image/png');
        setSymbols((prev) => ({
          ...prev,
          customLogoDataUrl: compressedUrl,
          crestCenterMode: 'custom-image',
          crestStyle: prev.crestStyle === 'none' ? 'notary-rosette' : prev.crestStyle,
        }));
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <section id="customize" className="scroll-mt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#141413]">
            Complete Atelier Customizer
          </h2>
          <p className="mt-1 text-sm text-[#5C5951]">
            Configure every individual sentence — including your shop address — with 20 luxury editorial fonts, metallic foil text magic, 24 royal seals &amp; canvas logos, and custom symbols.
          </p>
        </div>

        <button
          type="button"
          onClick={onResetAll}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D4C9] bg-white px-3.5 py-2 text-xs font-semibold text-[#141413] transition-colors hover:bg-[#FAF8F4] cursor-pointer whitespace-nowrap shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset All Defaults
        </button>
      </div>

      {/* Customizer Navigation Tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-1.5 rounded-xl bg-[#E7E4DC] p-1.5">
        {(
          [
            { id: 'fonts', label: '20 Fonts & Text Magic', icon: Type },
            { id: 'symbols', label: 'Live Logo & 24 Seals', icon: Stamp },
            { id: 'magic', label: 'Foil & Security FX', icon: Sparkles },
            { id: 'content', label: 'Edit Text & Contacts', icon: SlidersHorizontal },
            { id: 'presets', label: `Saved Cards (${savedPresets.length})`, icon: BookmarkPlus },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === id
                ? 'bg-white text-[#141413] shadow-xs'
                : 'text-[#55524B] hover:text-[#141413]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: PER-TEXT FONT & MAGIC EDITOR */}
      {tab === 'fonts' && (
        <div className="mt-6 space-y-6">
          {/* Quick Global Font Theme Presets */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B675E]">
              Quick Font Pairing Themes
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {CARD_FONT_THEMES.map((font) => {
                const isSelected = font.id === activeFontId;
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => onApplyFontTheme(font.id)}
                    className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#141413] bg-white shadow-xs'
                        : 'border-[#E2DFD7] bg-[#FAF9F6] hover:border-[#C5C0B4] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-baseline justify-between">
                      <span
                        className="text-xl font-bold text-[#141413]"
                        style={{ fontFamily: font.displayFont }}
                      >
                        SA Aa
                      </span>
                      {isSelected && (
                        <span className="text-[11px] font-semibold text-[#7E632B]">Active</span>
                      )}
                    </div>
                    <p className="mt-2 text-xs font-semibold text-[#141413]">{font.name}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Individual Text Slot Editor */}
          <div className="grid grid-cols-1 gap-6 rounded-xl border border-[#E2DFD7] bg-white p-5 sm:p-6 xl:grid-cols-12">
            <div className="xl:col-span-4 space-y-2 border-b xl:border-b-0 xl:border-r border-[#EAE7DF] pb-4 xl:pb-0 xl:pr-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B675E] mb-2">
                1. Pick Any Sentence on Card
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                {TEXT_SLOTS.map((slot) => {
                  const isActive = selectedSlot === slot.key;
                  const slotCfg = typography[slot.key];
                  const activeFontName =
                    FONT_FAMILY_OPTIONS.find((f) => f.id === slotCfg.fontId)?.name ??
                    'Playfair Display';
                  return (
                    <button
                      key={slot.key}
                      type="button"
                      onClick={() => setSelectedSlot(slot.key)}
                      className={`flex w-full flex-col gap-0.5 rounded-lg px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#141413] text-white'
                          : 'bg-[#F8F7F4] text-[#36342F] hover:bg-[#EFECE4]'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-2 text-xs font-semibold">
                        <span className="truncate">{slot.label}</span>
                        <span className={`text-[10.5px] shrink-0 ${isActive ? 'text-[#DFBC64]' : 'text-[#7A756B]'}`}>
                          {activeFontName}
                        </span>
                      </div>
                      <p className={`text-[11px] truncate ${isActive ? 'text-white/70' : 'text-[#7A756B]'}`}>
                        {getSlotPreviewText(slot.key)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="xl:col-span-8 space-y-6">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B675E]">
                    2. Choose From 20 Luxury Editorial Fonts — {TEXT_SLOTS.find((s) => s.key === selectedSlot)?.label}
                  </p>
                  <span className="text-[11px] font-medium text-[#7A756B]">
                    20 Studio Typefaces
                  </span>
                </div>

                {/* 20 Font Family Grid */}
                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                  {FONT_FAMILY_OPTIONS.map((font) => {
                    const isPicked = currentSlotStyle.fontId === font.id;
                    return (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() => updateSlot('fontId', font.id)}
                        className={`rounded-lg border p-2.5 text-left transition-all cursor-pointer ${
                          isPicked
                            ? 'border-[#141413] bg-[#FAF8F4] shadow-xs ring-1 ring-[#141413]'
                            : 'border-[#E2DFD7] bg-white hover:border-[#C5C0B4]'
                        }`}
                      >
                        <p
                          className="text-base font-bold text-[#141413] truncate"
                          style={{ fontFamily: font.css }}
                        >
                          SA Brothers
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-[#36342F] truncate">
                          {font.name}
                        </p>
                        <p className="text-[10px] text-[#7A756B] truncate">{font.category}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Per-Sentence Text Magic Effects & Color Override */}
              <div className="space-y-4 border-t border-[#EAE7DF] pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B675E]">
                  3. Per-Sentence Magic Finish &amp; Color
                </p>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {TEXT_MAGIC_EFFECTS.map((eff) => {
                    const isPicked = currentSlotStyle.textEffect === eff.id;
                    return (
                      <button
                        key={eff.id}
                        type="button"
                        onClick={() => updateSlot('textEffect', eff.id)}
                        className={`rounded-lg border p-2.5 text-left transition-all cursor-pointer ${
                          isPicked
                            ? 'border-[#141413] bg-[#141413] text-white'
                            : 'border-[#E2DFD7] bg-[#FAF9F6] text-[#141413] hover:bg-white'
                        }`}
                      >
                        <p className="text-xs font-semibold">{eff.label}</p>
                        <p className={`mt-0.5 text-[10px] ${isPicked ? 'text-white/75' : 'text-[#6B675E]'}`}>
                          {eff.note}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[#4A4740] mr-1">Text Color:</span>
                    {COLOR_SWATCHES.map((sw) => {
                      const active = (currentSlotStyle.colorOverride ?? '') === sw.hex;
                      return (
                        <button
                          key={sw.label}
                          type="button"
                          onClick={() => updateSlot('colorOverride', sw.hex)}
                          title={sw.label}
                          className={`inline-flex items-center justify-center rounded-full border transition-transform cursor-pointer ${
                            sw.hex === ''
                              ? 'px-2.5 h-6 text-[10px] font-semibold bg-[#F4F3EF] text-[#141413]'
                              : 'h-6 w-6'
                          } ${active ? 'ring-2 ring-[#141413] ring-offset-1 scale-110' : 'border-black/20'}`}
                          style={sw.hex ? { backgroundColor: sw.hex } : undefined}
                        >
                          {sw.hex === '' ? 'Theme Auto' : ''}
                        </button>
                      );
                    })}
                    <label
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D4C9] bg-[#FAF9F6] px-2 py-1 text-[11px] font-semibold text-[#36342F] cursor-pointer"
                      title="Pick any custom hex color"
                    >
                      <span>Custom</span>
                      <input
                        type="color"
                        value={currentSlotStyle.colorOverride || '#E1BA59'}
                        onChange={(e) => updateSlot('colorOverride', e.target.value)}
                        className="h-4 w-5 cursor-pointer border-0 bg-transparent p-0"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Scale, Tracking & Case Controls */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 pt-4 border-t border-[#EAE7DF]">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-[#4A4740]">
                    <span>Font Size Scale</span>
                    <span className="font-mono-num">{Math.round(currentSlotStyle.scale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.75}
                    max={1.35}
                    step={0.05}
                    value={currentSlotStyle.scale}
                    onChange={(e) => updateSlot('scale', parseFloat(e.target.value))}
                    className="mt-2 w-full accent-[#141413] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-[#4A4740]">
                    <span>Letter Spacing</span>
                    <span className="font-mono-num">{currentSlotStyle.tracking.toFixed(2)} em</span>
                  </div>
                  <input
                    type="range"
                    min={-0.03}
                    max={0.3}
                    step={0.01}
                    value={currentSlotStyle.tracking}
                    onChange={(e) => updateSlot('tracking', parseFloat(e.target.value))}
                    className="mt-2 w-full accent-[#141413] cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateSlot('italic', !currentSlotStyle.italic)}
                  className={`rounded-lg border px-3.5 py-2 text-xs font-semibold italic transition-colors cursor-pointer ${
                    currentSlotStyle.italic
                      ? 'border-[#141413] bg-[#141413] text-white'
                      : 'border-[#D8D4C9] bg-white text-[#141413] hover:bg-[#FAF8F4]'
                  }`}
                >
                  Italic Style
                </button>
                <button
                  type="button"
                  onClick={() => updateSlot('uppercase', !currentSlotStyle.uppercase)}
                  className={`rounded-lg border px-3.5 py-2 text-xs font-semibold uppercase transition-colors cursor-pointer ${
                    currentSlotStyle.uppercase
                      ? 'border-[#141413] bg-[#141413] text-white'
                      : 'border-[#D8D4C9] bg-white text-[#141413] hover:bg-[#FAF8F4]'
                  }`}
                >
                  ALL CAPS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE SEAL & REAL LOGO MAKER + 24 SEALS */}
      {tab === 'symbols' && (
        <div className="mt-6 space-y-7 rounded-xl border border-[#E2DFD7] bg-white p-6">
          {/* LIVE SEAL & REAL LOGO MAKER WORKBENCH */}
          <div className="rounded-xl border border-[#E2DFD7] bg-[#FAF9F6] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E4DC] pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B675E]">
                  Live Seal &amp; Real Logo Builder
                </p>
                <p className="mt-0.5 text-xs text-[#6B675E]">
                  Turn any crest into a solid 3D bullion medallion, drop in a real center icon or upload your own logo, and sculpt the border rim.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSymbols((prev) => ({
                    ...prev,
                    crestFinish: DEFAULT_SYMBOLS_CONFIG.crestFinish,
                    crestCenterMode: DEFAULT_SYMBOLS_CONFIG.crestCenterMode,
                    crestCenterIcon: DEFAULT_SYMBOLS_CONFIG.crestCenterIcon,
                    crestRimBorder: DEFAULT_SYMBOLS_CONFIG.crestRimBorder,
                    crestStrokeWeight: DEFAULT_SYMBOLS_CONFIG.crestStrokeWeight,
                    crestRingTextTop: '',
                    crestRingTextBottom: '',
                    crestLiveSheen: true,
                  }))
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D4C9] bg-white px-3 py-1.5 text-xs font-semibold text-[#141413] hover:bg-[#F3F1EC] cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Seal Builder
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-12">
              {/* Left: Enlarged Live Jeweler's Preview Pad */}
              <div className="xl:col-span-4 flex flex-col items-center justify-center rounded-xl border border-[#23322A] bg-gradient-to-br from-[#0F271E] via-[#0B1C15] to-[#08130F] p-6 text-center">
                <div className="flex h-40 w-40 items-center justify-center">
                  {symbols.crestStyle === 'none' ? (
                    <span className="text-xs font-semibold tracking-widest text-white/50">
                      CREST HIDDEN
                    </span>
                  ) : symbols.crestStyle === 'clean-logo' ? (
                    symbols.customLogoDataUrl ? (
                      <img
                        src={symbols.customLogoDataUrl}
                        alt={details.companyName}
                        className="h-32 w-32 object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.45)]"
                        style={{
                          transform: `rotate(${symbols.customLogoRotation ?? 0}deg) scaleX(${symbols.customLogoFlipX ? -1 : 1})`,
                          opacity: (symbols.customLogoOpacity ?? 100) / 100,
                          filter:
                            symbols.customLogoFullColor ?? true
                              ? undefined
                              : 'brightness(0) invert(0.92) sepia(0.35) saturate(2.4) hue-rotate(6deg)',
                        }}
                      />
                    ) : (
                      <span className="text-xs font-semibold tracking-wider text-white/60">
                        UPLOAD OR SYNC LOGO
                      </span>
                    )
                  ) : symbols.crestStyle === 'postage-stamp' ? (
                    <PostageStampEmblem
                      goldColor="#E1BA59"
                      paperColor="#FAF7F0"
                      inkColor="#112E22"
                      monogram={details.monogram}
                      brandSub={details.companyName.split(/stamp vendor/i)[0].trim() || details.companyName}
                      stampIcons={symbols.stampIcons}
                      customLogoDataUrl={symbols.customLogoDataUrl}
                      crestCenterMode={symbols.crestCenterMode}
                      crestCenterIcon={symbols.crestCenterIcon}
                      className="h-36 w-32"
                    />
                  ) : (
                    <LuxuryCrestSvg
                      crestId={symbols.crestStyle === 'auto' ? 'notary-rosette' : symbols.crestStyle}
                      accentColor="#E1BA59"
                      highlightColor="#FFF2BF"
                      secondaryColor="#B08D3B"
                      coreBgHex="#0E241C"
                      monogram={details.monogram}
                      className="h-36 w-36"
                      foilGradient={symbols.crestFoilGradient ?? true}
                      crestFinish={symbols.crestFinish ?? '3d-embossed-coin'}
                      crestCenterMode={symbols.crestCenterMode ?? 'icon-monogram'}
                      crestCenterIcon={symbols.crestCenterIcon ?? 'scales'}
                      crestRimBorder={symbols.crestRimBorder ?? 'double-bevel'}
                      crestStrokeWeight={symbols.crestStrokeWeight ?? 1.6}
                      crestRingTextTop={symbols.crestRingTextTop ?? ''}
                      crestRingTextBottom={symbols.crestRingTextBottom ?? ''}
                      crestLiveSheen={symbols.crestLiveSheen ?? true}
                      customLogoDataUrl={symbols.customLogoDataUrl ?? ''}
                      customLogoFullColor={symbols.customLogoFullColor ?? false}
                    />
                  )}
                </div>

                <p className="mt-3 text-xs font-semibold text-[#F8F6F0]">
                  {CREST_STYLE_OPTIONS.find((c) => c.id === symbols.crestStyle)?.label ?? 'Design Default'}
                </p>
                <p className="mt-0.5 text-[11px] text-[#B8C4BC]">
                  {CREST_FINISH_OPTIONS.find((f) => f.id === (symbols.crestFinish ?? '3d-embossed-coin'))?.label}
                </p>

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleCustomLogoUpload}
                  className="hidden"
                />
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#E1BA59] px-3.5 py-2 text-xs font-semibold text-[#141413] hover:bg-[#ECCB73] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {symbols.customLogoDataUrl ? 'Replace Logo Image' : 'Upload Own Logo'}
                  </button>
                  {symbols.customLogoDataUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setSymbols((prev) => ({
                          ...prev,
                          customLogoDataUrl: '',
                          crestCenterMode: prev.crestCenterMode === 'custom-image' ? 'icon-monogram' : prev.crestCenterMode,
                        }))
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-2.5 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Right: Seal Realism, Center Icon, Rim Border & Curved Text Controls */}
              <div className="xl:col-span-8 space-y-5">
                {/* 1. Centerpiece Mode + Custom Logo Options */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B675E]">
                    1. Seal Centerpiece (Icon, Monogram, or Uploaded Logo)
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(
                      [
                        { id: 'icon-monogram', label: 'Icon + Monogram' },
                        { id: 'icon-only', label: 'Real Icon Only' },
                        { id: 'monogram-only', label: 'Monogram Only' },
                        { id: 'custom-image', label: 'Uploaded Logo' },
                      ] as { id: CrestCenterMode; label: string }[]
                    ).map((m) => {
                      const active = (symbols.crestCenterMode ?? 'icon-monogram') === m.id;
                      const needsUpload = m.id === 'custom-image' && !symbols.customLogoDataUrl;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            if (needsUpload) {
                              logoInputRef.current?.click();
                            } else {
                              setSymbols((prev) => ({ ...prev, crestCenterMode: m.id }));
                            }
                          }}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            active
                              ? 'border-[#141413] bg-[#141413] text-white'
                              : 'border-[#D8D4C9] bg-white text-[#141413] hover:bg-[#F3F1EC]'
                          }`}
                        >
                          {needsUpload ? 'Upload Logo...' : m.label}
                        </button>
                      );
                    })}
                  </div>

                  {symbols.customLogoDataUrl &&
                    (symbols.crestCenterMode === 'custom-image' || symbols.crestStyle === 'clean-logo') && (
                    <div className="mt-3 space-y-2.5 rounded-lg border border-[#E2DFD7] bg-white px-3.5 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={symbols.customLogoDataUrl}
                            alt="Active brand logo on card"
                            className="h-9 w-9 rounded border border-[#E2DFD7] object-contain bg-[#FAF9F6] p-0.5"
                          />
                          <div>
                            <span className="text-xs font-semibold text-[#141413] block">
                              {symbols.crestStyle === 'clean-logo'
                                ? 'Frameless Canvas Logo Active'
                                : 'Custom Logo Active Inside Seal'}
                            </span>
                            <span className="text-[10.5px] text-[#6B675E]">
                              Drag directly on the card preview or adjust framing below.
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setSymbols((prev) => ({
                                ...prev,
                                crestStyle: 'clean-logo',
                                crestCenterMode: 'custom-image',
                              }))
                            }
                            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                              symbols.crestStyle === 'clean-logo'
                                ? 'bg-[#141413] text-white'
                                : 'border border-[#D8D4C9] bg-[#FAF9F6] text-[#141413]'
                            }`}
                          >
                            Clean Vector
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSymbols((prev) => ({
                                ...prev,
                                crestStyle:
                                  prev.crestStyle === 'clean-logo' || prev.crestStyle === 'none'
                                    ? 'notary-rosette'
                                    : prev.crestStyle,
                                crestCenterMode: 'custom-image',
                              }))
                            }
                            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                              symbols.crestStyle !== 'clean-logo'
                                ? 'bg-[#141413] text-white'
                                : 'border border-[#D8D4C9] bg-[#FAF9F6] text-[#141413]'
                            }`}
                          >
                            Royal Seal Frame
                          </button>
                        </div>
                      </div>

                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#141413] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={symbols.customLogoFullColor ?? true}
                          onChange={(e) =>
                            setSymbols((prev) => ({ ...prev, customLogoFullColor: e.target.checked }))
                          }
                          className="h-4 w-4 rounded accent-[#141413]"
                        />
                        <span>Keep Original Colors (uncheck for Gold Foil Tint)</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* 2. Real Sculpted Center Icon Picker */}
                {((symbols.crestCenterMode ?? 'icon-monogram') === 'icon-monogram' ||
                  symbols.crestCenterMode === 'icon-only') && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B675E]">
                      2. Choose Real Sculpted Center Icon (12 Emblems)
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
                      {CREST_CENTER_ICON_OPTIONS.map((ic) => {
                        const active = (symbols.crestCenterIcon ?? 'scales') === ic.id;
                        return (
                          <button
                            key={ic.id}
                            type="button"
                            onClick={() => setSymbols((prev) => ({ ...prev, crestCenterIcon: ic.id }))}
                            className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-all cursor-pointer ${
                              active
                                ? 'border-[#141413] bg-[#141413] text-white'
                                : 'border-[#E2DFD7] bg-white text-[#141413] hover:border-[#C5C0B4]'
                            }`}
                          >
                            <SculptedCenterIcon
                              iconId={ic.id}
                              color={active ? '#E1BA59' : '#141413'}
                              highlight={active ? '#FFF2BF' : '#C99E40'}
                              size={24}
                            />
                            <span className="text-[10px] font-semibold leading-tight truncate w-full">
                              {ic.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Seal Material Finish & Border Rim Maker */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B675E]">
                      3. Seal Material &amp; 3D Depth
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {CREST_FINISH_OPTIONS.map((fin) => {
                        const active = (symbols.crestFinish ?? '3d-embossed-coin') === fin.id;
                        return (
                          <button
                            key={fin.id}
                            type="button"
                            onClick={() => setSymbols((prev) => ({ ...prev, crestFinish: fin.id }))}
                            className={`rounded-lg border px-2.5 py-2 text-left transition-colors cursor-pointer ${
                              active
                                ? 'border-[#141413] bg-[#141413] text-white'
                                : 'border-[#E2DFD7] bg-white text-[#141413] hover:bg-[#F3F1EC]'
                            }`}
                          >
                            <p className="text-[11px] font-semibold leading-tight">{fin.label}</p>
                            <p className={`mt-0.5 text-[10px] leading-tight ${active ? 'text-white/70' : 'text-[#6B675E]'}`}>
                              {fin.note}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B675E]">
                      4. Seal Border Ring Maker
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {CREST_RIM_BORDER_OPTIONS.map((rim) => {
                        const active = (symbols.crestRimBorder ?? 'double-bevel') === rim.id;
                        return (
                          <button
                            key={rim.id}
                            type="button"
                            onClick={() => setSymbols((prev) => ({ ...prev, crestRimBorder: rim.id }))}
                            className={`rounded-lg border px-2 py-1.5 text-left transition-colors cursor-pointer ${
                              active
                                ? 'border-[#141413] bg-[#141413] text-white'
                                : 'border-[#E2DFD7] bg-white text-[#141413] hover:bg-[#F3F1EC]'
                            }`}
                          >
                            <p className="text-[11px] font-semibold leading-tight truncate">{rim.label}</p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#4A4740]">
                        <span>Rim &amp; Frame Thickness</span>
                        <span className="font-mono-num">{(symbols.crestStrokeWeight ?? 1.6).toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={2.4}
                        step={0.2}
                        value={symbols.crestStrokeWeight ?? 1.6}
                        onChange={(e) =>
                          setSymbols((prev) => ({ ...prev, crestStrokeWeight: parseFloat(e.target.value) }))
                        }
                        className="mt-1 w-full accent-[#141413] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Circular Stamp Border Text & Live Sheen */}
                <div className="border-t border-[#E7E4DC] pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B675E]">
                      5. Circular Stamp Ring Text (Optional)
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setSymbols((prev) => ({
                            ...prev,
                            crestRingTextTop: 'SA BROTHERS',
                            crestRingTextBottom: 'KARACHI · PAKISTAN',
                          }))
                        }
                        className="rounded border border-[#D8D4C9] bg-white px-2 py-1 text-[10px] font-semibold text-[#141413] hover:bg-[#F3F1EC] cursor-pointer"
                      >
                        SA Brothers · Karachi
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSymbols((prev) => ({
                            ...prev,
                            crestRingTextTop: 'AUTHORIZED DEALER',
                            crestRingTextBottom: 'STAMP VENDOR',
                          }))
                        }
                        className="rounded border border-[#D8D4C9] bg-white px-2 py-1 text-[10px] font-semibold text-[#141413] hover:bg-[#F3F1EC] cursor-pointer"
                      >
                        Authorized Stamp Seal
                      </button>
                      {(symbols.crestRingTextTop || symbols.crestRingTextBottom) && (
                        <button
                          type="button"
                          onClick={() =>
                            setSymbols((prev) => ({
                              ...prev,
                              crestRingTextTop: '',
                              crestRingTextBottom: '',
                            }))
                          }
                          className="rounded border border-[#D8D4C9] bg-white px-2 py-1 text-[10px] font-semibold text-[#6B675E] hover:text-[#141413] cursor-pointer"
                        >
                          Clear Text
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      maxLength={24}
                      placeholder="Top curved arc (e.g. SA BROTHERS)"
                      value={symbols.crestRingTextTop ?? ''}
                      onChange={(e) =>
                        setSymbols((prev) => ({ ...prev, crestRingTextTop: e.target.value.toUpperCase() }))
                      }
                      className="w-full rounded-lg border border-[#D8D4C9] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#141413] focus:border-[#141413] focus:outline-none"
                    />
                    <input
                      type="text"
                      maxLength={24}
                      placeholder="Bottom curved arc (e.g. STAMP VENDOR)"
                      value={symbols.crestRingTextBottom ?? ''}
                      onChange={(e) =>
                        setSymbols((prev) => ({ ...prev, crestRingTextBottom: e.target.value.toUpperCase() }))
                      }
                      className="w-full rounded-lg border border-[#D8D4C9] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#141413] focus:border-[#141413] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 24 EXCLUSIVE LUXURY SEAL FRAMES */}
          <div>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B675E]">
                  24 Exclusive Seal Frames &amp; Silhouettes
                </p>
                <p className="mt-0.5 text-xs text-[#6B675E]">
                  Pick any outer royal frame below — your chosen real icon, uploaded logo, border rim, and 3D finish apply live to every seal.
                </p>
              </div>

              <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-[#EAE7DF] p-1 self-start md:self-auto">
                {(
                  ['All', 'Royal & Heraldic', 'Legal & Stamp', 'Couture & Watch', 'Traditional'] as CrestCategory[]
                ).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCrestCategory(cat)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      crestCategory === cat
                        ? 'bg-white text-[#141413] shadow-xs'
                        : 'text-[#55524B] hover:text-[#141413]'
                    }`}
                  >
                    {cat === 'All' ? 'All 24' : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {CREST_STYLE_OPTIONS.filter(
                (item) =>
                  crestCategory === 'All' ||
                  item.category === crestCategory ||
                  item.category === 'System'
              ).map((item) => {
                const isSelected = symbols.crestStyle === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSymbols((prev) => ({ ...prev, crestStyle: item.id }))}
                    className={`flex flex-col items-center justify-between rounded-xl border p-3 text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#141413] bg-[#141413] text-white shadow-xs'
                        : 'border-[#E2DFD7] bg-[#FAF9F6] text-[#141413] hover:border-[#C5C0B4] hover:bg-white'
                    }`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center">
                      <CrestPreviewThumb
                        crestId={item.id}
                        color={isSelected ? '#E1BA59' : '#B88B2E'}
                        monogram={details.monogram}
                        crestFinish={symbols.crestFinish}
                        crestCenterMode={symbols.crestCenterMode}
                        crestCenterIcon={symbols.crestCenterIcon}
                        crestRimBorder={symbols.crestRimBorder}
                        customLogoDataUrl={symbols.customLogoDataUrl}
                      />
                    </div>
                    <div className="mt-2">
                      <p className="text-xs font-semibold leading-tight">{item.label}</p>
                      <p className={`mt-0.5 text-[10px] leading-tight ${isSelected ? 'text-white/70' : 'text-[#6B675E]'}`}>
                        {item.note}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Crest / Logo Size, Position, Rotation & Metallic Sheen */}
            <div className="mt-5 space-y-4 rounded-xl border border-[#EAE7DF] bg-[#FAF9F6] p-4">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-[#4A4740]">
                    <span>Primary Seal / Logo Size</span>
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
                    className="mt-2 w-full accent-[#141413] cursor-pointer"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-5">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#141413] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={symbols.crestFoilGradient ?? true}
                      onChange={(e) =>
                        setSymbols((prev) => ({ ...prev, crestFoilGradient: e.target.checked }))
                      }
                      className="h-4 w-4 rounded accent-[#141413]"
                    />
                    <span>24K Metallic Foil Gradient</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#141413] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={symbols.crestLiveSheen ?? true}
                      onChange={(e) =>
                        setSymbols((prev) => ({ ...prev, crestLiveSheen: e.target.checked }))
                      }
                      className="h-4 w-4 rounded accent-[#141413]"
                    />
                    <span>Live Specular Sheen</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 border-t border-[#E5E1D7] pt-3.5 sm:grid-cols-4">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#4A4740]">
                    <span>Offset X</span>
                    <span className="font-mono-num">{Math.round(symbols.customLogoOffsetX ?? 0)} px</span>
                  </div>
                  <input
                    type="range"
                    min={-120}
                    max={120}
                    step={2}
                    value={symbols.customLogoOffsetX ?? 0}
                    onChange={(e) =>
                      setSymbols((prev) => ({ ...prev, customLogoOffsetX: parseInt(e.target.value, 10) }))
                    }
                    className="mt-1.5 w-full accent-[#141413] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#4A4740]">
                    <span>Offset Y</span>
                    <span className="font-mono-num">{Math.round(symbols.customLogoOffsetY ?? 0)} px</span>
                  </div>
                  <input
                    type="range"
                    min={-80}
                    max={80}
                    step={2}
                    value={symbols.customLogoOffsetY ?? 0}
                    onChange={(e) =>
                      setSymbols((prev) => ({ ...prev, customLogoOffsetY: parseInt(e.target.value, 10) }))
                    }
                    className="mt-1.5 w-full accent-[#141413] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#4A4740]">
                    <span>Rotation</span>
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
                    className="mt-1.5 w-full accent-[#141413] cursor-pointer"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSymbols((prev) => ({ ...prev, customLogoFlipX: !(prev.customLogoFlipX ?? false) }))
                    }
                    className={`flex-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer ${
                      symbols.customLogoFlipX
                        ? 'border-[#141413] bg-[#141413] text-white'
                        : 'border-[#D8D4C9] bg-white text-[#141413]'
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
                    className="rounded-lg border border-[#D8D4C9] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#141413] hover:bg-[#F3F1EC] cursor-pointer"
                  >
                    Center
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Logo Layer: Secondary Royal Canvas Watermark Seal */}
          <div className="border-t border-[#EAE7DF] pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B675E]">
                  Multi-Logo Layer: Giant Royal Canvas Watermark Seal
                </p>
                <p className="mt-0.5 text-xs text-[#6B675E]">
                  Layer a second translucent royal crest across the card background (like official judicial stamp papers &amp; luxury certificates).
                </p>
              </div>
              <div className="w-48">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#4A4740]">
                  <span>Watermark Visibility</span>
                  <span className="font-mono-num">{symbols.watermarkOpacity ?? 12}%</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={28}
                  step={2}
                  value={symbols.watermarkOpacity ?? 12}
                  onChange={(e) =>
                    setSymbols((prev) => ({ ...prev, watermarkOpacity: parseInt(e.target.value, 10) }))
                  }
                  className="mt-1 w-full accent-[#141413] cursor-pointer"
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
              {[
                { id: 'none' as const, label: 'No Watermark' },
                { id: 'justice-scales-seal' as const, label: 'High Court Scales' },
                { id: 'mughal-lotus-mandala' as const, label: 'Mughal Lotus' },
                { id: 'laurel-sovereign' as const, label: 'Imperial Laurel' },
                { id: 'calatrava-cross' as const, label: 'Geneva Cross' },
                { id: 'sunburst-medallion' as const, label: 'Royal Sunburst' },
                { id: 'winged-hermes-crest' as const, label: 'Winged Sovereign' },
                { id: 'banknote-oval' as const, label: 'Treasury Oval' },
                { id: 'crown-crest' as const, label: 'Royal Crown' },
                { id: 'cartouche-oval' as const, label: 'Louis Cartouche' },
                { id: 'compass-star-guild' as const, label: 'North Star' },
                { id: 'arch-pillar-seal' as const, label: 'Court Pillars' },
                { id: 'double-diamond-atelier' as const, label: 'Atelier Diamond' },
                { id: 'auto' as const, label: 'Mirror Hero Seal' },
              ].map((wm) => {
                const isPicked = (symbols.watermarkCrest ?? 'none') === wm.id;
                return (
                  <button
                    key={wm.id}
                    type="button"
                    onClick={() => setSymbols((prev) => ({ ...prev, watermarkCrest: wm.id }))}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] font-semibold transition-all cursor-pointer ${
                      isPicked
                        ? 'border-[#141413] bg-[#141413] text-white'
                        : 'border-[#E2DFD7] bg-[#FAF9F6] text-[#141413] hover:bg-white'
                    }`}
                  >
                    <div className="h-6 w-6 shrink-0 flex items-center justify-center">
                      <CrestPreviewThumb
                        crestId={wm.id}
                        color={isPicked ? '#E1BA59' : '#141413'}
                        monogram={details.monogram}
                      />
                    </div>
                    <span className="truncate">{wm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3 Miniature Craft Symbols inside the Sovereign Stamp */}
          <div className="border-t border-[#EAE7DF] pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B675E]">
                  3 Craft Symbols Inside Postage Stamp Emblem
                </p>
                <p className="mt-0.5 text-xs text-[#6B675E]">
                  Click Slot 1, 2, or 3 below, then pick any engraved symbol from the library.
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#EAE7DF] p-1">
                {([0, 1, 2] as const).map((slotIdx) => (
                  <button
                    key={slotIdx}
                    type="button"
                    onClick={() => setActiveStampSlot(slotIdx)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                      activeStampSlot === slotIdx
                        ? 'bg-white text-[#141413] shadow-xs'
                        : 'text-[#55524B] hover:text-[#141413]'
                    }`}
                  >
                    <CraftIconSvg
                      symbol={symbols.stampIcons[slotIdx]}
                      primaryColor="#141413"
                      accentColor="#C99E40"
                      size={15}
                    />
                    Slot {slotIdx + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
              {CRAFT_SYMBOL_OPTIONS.map((opt) => {
                const isPicked = symbols.stampIcons[activeStampSlot] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleStampSymbolPick(opt.id)}
                    className={`flex items-center gap-2.5 rounded-lg border p-3 text-left text-xs font-semibold transition-all cursor-pointer ${
                      isPicked
                        ? 'border-[#141413] bg-[#FAF8F4] shadow-xs'
                        : 'border-[#E2DFD7] bg-white hover:border-[#C5C0B4]'
                    }`}
                  >
                    <CraftIconSvg
                      symbol={opt.id}
                      primaryColor="#141413"
                      accentColor="#C99E40"
                      size={22}
                    />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contact, Address & Service Bullet Symbols */}
          <div className="grid grid-cols-1 gap-6 border-t border-[#EAE7DF] pt-5 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B675E]">
                Phone Contact Icon
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {(
                  [
                    { id: 'phone', label: 'Phone' },
                    { id: 'whatsapp', label: 'WhatsApp' },
                    { id: 'diamond', label: 'Diamond' },
                    { id: 'star', label: 'Star' },
                    { id: 'none', label: 'None' },
                  ] as { id: ContactIconId; label: string }[]
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSymbols((prev) => ({ ...prev, contactIcon: item.id }))}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                      symbols.contactIcon === item.id
                        ? 'border-[#141413] bg-[#141413] text-white'
                        : 'border-[#E2DFD7] bg-[#FAF9F6] text-[#141413]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B675E]">
                Address Icon
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {(
                  [
                    { id: 'pin', label: 'Map Pin' },
                    { id: 'compass', label: 'Compass' },
                    { id: 'building', label: 'Shop Building' },
                    { id: 'none', label: 'None' },
                  ] as { id: AddressIconId; label: string }[]
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSymbols((prev) => ({ ...prev, addressIcon: item.id }))}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                      symbols.addressIcon === item.id
                        ? 'border-[#141413] bg-[#141413] text-white'
                        : 'border-[#E2DFD7] bg-[#FAF9F6] text-[#141413]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B675E]">
                Back Service Bullet
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {(
                  [
                    { id: 'diamond', label: 'Diamond' },
                    { id: 'check', label: 'Check' },
                    { id: 'star', label: 'Star' },
                    { id: 'arrow', label: 'Arrow' },
                    { id: 'dash', label: 'Dash' },
                  ] as { id: ServiceBulletId; label: string }[]
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSymbols((prev) => ({ ...prev, serviceBullet: item.id }))}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                      symbols.serviceBullet === item.id
                        ? 'border-[#141413] bg-[#141413] text-white'
                        : 'border-[#E2DFD7] bg-[#FAF9F6] text-[#141413]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MAGIC & FOIL FX */}
      {tab === 'magic' && (
        <div className="mt-6 space-y-6 rounded-xl border border-[#E2DFD7] bg-white p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B675E]">
                Metallic Foil Light Reflection
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {(
                  [
                    { id: 'brushed-gold', label: 'Brushed 24K Foil' },
                    { id: 'holographic-prism', label: 'Holographic Prism' },
                    { id: 'embossed-relief', label: 'Embossed Relief' },
                    { id: 'mirror-foil', label: 'Mirror Chrome Sheen' },
                  ] as { id: FoilFinishEffect; label: string }[]
                ).map((fx) => (
                  <button
                    key={fx.id}
                    type="button"
                    onClick={() => setMagic((prev) => ({ ...prev, foilEffect: fx.id }))}
                    className={`rounded-lg border px-3.5 py-2.5 text-left text-xs font-semibold transition-colors cursor-pointer ${
                      magic.foilEffect === fx.id
                        ? 'border-[#141413] bg-[#141413] text-white'
                        : 'border-[#E2DFD7] bg-[#FAF9F6] text-[#141413]'
                    }`}
                  >
                    {fx.label}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-semibold text-[#4A4740]">
                  <span>Foil Glare Intensity</span>
                  <span className="font-mono-num">{magic.foilIntensity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={magic.foilIntensity}
                  onChange={(e) =>
                    setMagic((prev) => ({ ...prev, foilIntensity: parseInt(e.target.value, 10) }))
                  }
                  className="mt-2 w-full accent-[#141413] cursor-pointer"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B675E]">
                Engraved Security Backdrop Pattern
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {(
                  [
                    { id: 'auto', label: 'Auto' },
                    { id: 'guilloche', label: 'Guilloche Mesh' },
                    { id: 'concentric', label: 'Notary Ripples' },
                    { id: 'diamond-lattice', label: 'Diamond Lattice' },
                    { id: 'microgrid', label: 'Swiss Microgrid' },
                    { id: 'none', label: 'Solid Clean' },
                  ] as { id: BackgroundPatternId; label: string }[]
                ).map((pat) => (
                  <button
                    key={pat.id}
                    type="button"
                    onClick={() => setMagic((prev) => ({ ...prev, pattern: pat.id }))}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                      magic.pattern === pat.id
                        ? 'border-[#141413] bg-[#141413] text-white'
                        : 'border-[#E2DFD7] bg-[#FAF9F6] text-[#141413]'
                    }`}
                  >
                    {pat.label}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-semibold text-[#4A4740]">
                  <span>Pattern Opacity</span>
                  <span className="font-mono-num">{magic.patternOpacity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={45}
                  step={2}
                  value={magic.patternOpacity}
                  onChange={(e) =>
                    setMagic((prev) => ({ ...prev, patternOpacity: parseInt(e.target.value, 10) }))
                  }
                  className="mt-2 w-full accent-[#141413] cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-6 border-t border-[#EAE7DF] pt-5">
            <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-[#141413]">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={magic.foilBorderShimmer}
                  onChange={(e) =>
                    setMagic((prev) => ({ ...prev, foilBorderShimmer: e.target.checked }))
                  }
                  className="h-4 w-4 rounded accent-[#141413]"
                />
                <span>Border Foil Shimmer</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={magic.securityHologram}
                  onChange={(e) =>
                    setMagic((prev) => ({ ...prev, securityHologram: e.target.checked }))
                  }
                  className="h-4 w-4 rounded accent-[#141413]"
                />
                <span>Security Hologram Seal</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={magic.qrCenterMonogram}
                  onChange={(e) =>
                    setMagic((prev) => ({ ...prev, qrCenterMonogram: e.target.checked }))
                  }
                  className="h-4 w-4 rounded accent-[#141413]"
                />
                <span>Monogram Badge Inside QR</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={magic.autoShowcase}
                  onChange={(e) =>
                    setMagic((prev) => ({ ...prev, autoShowcase: e.target.checked }))
                  }
                  className="h-4 w-4 rounded accent-[#141413]"
                />
                <span>Live 3D Showcase Glide</span>
              </label>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-[#4A4740]">QR Ink Color:</span>
              {['#112E22', '#141413', '#43121B', '#0B1626', '#8E1B22'].map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setMagic((prev) => ({ ...prev, qrDarkColor: hex }))}
                  className={`h-6 w-6 rounded-full border-2 transition-transform cursor-pointer ${
                    magic.qrDarkColor === hex ? 'scale-115 border-[#C99E40]' : 'border-black/15'
                  }`}
                  style={{ backgroundColor: hex }}
                  aria-label={`Select QR color ${hex}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EDIT TEXT & CONTACTS */}
      {tab === 'content' && (
        <div className="mt-6 grid grid-cols-1 gap-5 rounded-xl border border-[#E2DFD7] bg-white p-6 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-[#4A4740]">Business Name</label>
            <input
              type="text"
              value={details.companyName}
              onChange={(e) => setDetails((prev) => ({ ...prev, companyName: e.target.value }))}
              className="mt-1.5 w-full rounded-lg border border-[#D8D4C9] bg-[#FAF9F6] px-3.5 py-2 text-sm text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#4A4740]">Seal Monogram</label>
              <input
                type="text"
                maxLength={3}
                value={details.monogram}
                onChange={(e) =>
                  setDetails((prev) => ({ ...prev, monogram: e.target.value.toUpperCase() }))
                }
                className="mt-1.5 w-full rounded-lg border border-[#D8D4C9] bg-[#FAF9F6] px-3.5 py-2 text-sm font-bold uppercase text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-[#4A4740]">Card Badge Label</label>
              <input
                type="text"
                value={details.cardLabel}
                onChange={(e) => setDetails((prev) => ({ ...prev, cardLabel: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-[#D8D4C9] bg-[#FAF9F6] px-3.5 py-2 text-sm text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4A4740]">Header Kicker</label>
            <input
              type="text"
              value={details.subtitle}
              onChange={(e) => setDetails((prev) => ({ ...prev, subtitle: e.target.value }))}
              className="mt-1.5 w-full rounded-lg border border-[#D8D4C9] bg-[#FAF9F6] px-3.5 py-2 text-sm text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4A4740]">Services Tagline</label>
            <input
              type="text"
              value={details.tagline}
              onChange={(e) => setDetails((prev) => ({ ...prev, tagline: e.target.value }))}
              className="mt-1.5 w-full rounded-lg border border-[#D8D4C9] bg-[#FAF9F6] px-3.5 py-2 text-sm text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
            />
          </div>

          {details.contacts.map((contact, idx) => (
            <div key={contact.id} className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#4A4740]">
                  Contact {idx + 1} Name
                </label>
                <input
                  type="text"
                  value={contact.name}
                  onChange={(e) => updateContact(idx, 'name', e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#D8D4C9] bg-[#FAF9F6] px-3.5 py-2 text-sm text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4A4740]">
                  Contact {idx + 1} Phone
                </label>
                <input
                  type="text"
                  value={contact.phone}
                  onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                  className="font-mono-num mt-1.5 w-full rounded-lg border border-[#D8D4C9] bg-[#FAF9F6] px-3.5 py-2 text-sm text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold text-[#4A4740]">Shop Address</label>
            <input
              type="text"
              value={details.address}
              onChange={(e) => setDetails((prev) => ({ ...prev, address: e.target.value }))}
              className="mt-1.5 w-full rounded-lg border border-[#D8D4C9] bg-[#FAF9F6] px-3.5 py-2 text-sm text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4A4740]">
              Google Maps Location URL (QR Target)
            </label>
            <input
              type="url"
              value={details.locationUrl}
              onChange={(e) => setDetails((prev) => ({ ...prev, locationUrl: e.target.value }))}
              className="font-mono-num mt-1.5 w-full rounded-lg border border-[#D8D4C9] bg-[#FAF9F6] px-3.5 py-2 text-sm text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4A4740]">QR Heading Label</label>
            <input
              type="text"
              value={details.qrLabel}
              onChange={(e) => setDetails((prev) => ({ ...prev, qrLabel: e.target.value }))}
              className="mt-1.5 w-full rounded-lg border border-[#D8D4C9] bg-[#FAF9F6] px-3.5 py-2 text-sm text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4A4740]">QR Sub-Label</label>
            <input
              type="text"
              value={details.qrSublabel}
              onChange={(e) => setDetails((prev) => ({ ...prev, qrSublabel: e.target.value }))}
              className="mt-1.5 w-full rounded-lg border border-[#D8D4C9] bg-[#FAF9F6] px-3.5 py-2 text-sm text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#4A4740]">
              Back Side Service Highlights
            </label>
            <div className="mt-1.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {details.services.map((service, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={service}
                  onChange={(e) => updateService(idx, e.target.value)}
                  className="w-full rounded-lg border border-[#D8D4C9] bg-[#FAF9F6] px-3.5 py-2 text-sm text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SAVED PRESETS */}
      {tab === 'presets' && (
        <div className="mt-6 space-y-5 rounded-xl border border-[#E2DFD7] bg-white p-6">
          <form onSubmit={handleSaveSubmit} className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Name your custom card (e.g. Emerald Gold Court Edition)"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="min-w-[260px] flex-1 rounded-lg border border-[#D8D4C9] bg-[#FAF9F6] px-3.5 py-2 text-sm text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[#141413] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2C2B28] cursor-pointer whitespace-nowrap shrink-0"
            >
              <BookmarkPlus className="h-3.5 w-3.5" />
              Save Current Design
            </button>
          </form>

          {savedPresets.length === 0 ? (
            <p className="text-xs text-[#6B675E] py-4">
              No saved designs yet. Customize any fonts, symbols, or foil colors and save your favorite combinations here.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {savedPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#E2DFD7] bg-[#FAF9F6] p-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#141413] truncate">{preset.name}</p>
                    <p className="text-[11px] text-[#6B675E]">
                      {preset.designId} · {preset.themeId}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onLoadPreset(preset)}
                      className="rounded-md bg-[#141413] px-2.5 py-1.5 text-xs font-semibold text-white cursor-pointer"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePreset(preset.id)}
                      className="rounded-md p-1.5 text-[#7A756B] hover:bg-black/5 hover:text-red-700 cursor-pointer"
                      aria-label={`Delete ${preset.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
