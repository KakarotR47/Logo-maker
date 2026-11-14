import React, { useMemo, useState } from 'react';
import { ArrowLeft, Layers, Palette } from 'lucide-react';
import { BrandBrief, ColorPalette, LogoDocument } from '../types/logo';
import { extractBrandVariants } from '../utils/logoGenerator';
import { LogoDocumentSvg } from './CanvasLayerRenderer';

interface MockupPreviewViewProps {
  activeDoc: LogoDocument;
  brief: BrandBrief;
  palette: ColorPalette;
  onBackToEditor: () => void;
  onOpenBrandKit: () => void;
}

type MockupTone = 'auto' | 'dark' | 'mono';

const SHIRT_COLORS = [
  { id: 'obsidian', label: 'Obsidian', hex: '#1B1C20', isDark: true },
  { id: 'ecru', label: 'Warm Ecru', hex: '#EDE8DC', isDark: false },
  { id: 'forest', label: 'Pine', hex: '#1B4332', isDark: true },
  { id: 'navy', label: 'Midnight', hex: '#17233B', isDark: true },
  { id: 'white', label: 'Optic White', hex: '#F9FAFB', isDark: false },
] as const;

export const MockupPreviewView: React.FC<MockupPreviewViewProps> = ({
  activeDoc,
  brief,
  palette,
  onBackToEditor,
  onOpenBrandKit,
}) => {
  const [mockupTone, setMockupTone] = useState<MockupTone>('auto');
  const [cardStock, setCardStock] = useState<'ivory' | 'charcoal' | 'brand'>('ivory');
  const [shirtColorId, setShirtColorId] = useState<(typeof SHIRT_COLORS)[number]['id']>('obsidian');
  const [shirtPlacement, setShirtPlacement] = useState<'chest' | 'pocket'>('chest');
  const [cupStyle, setCupStyle] = useState<'ceramic' | 'kraft'>('ceramic');
  const [phoneWallpaper, setPhoneWallpaper] = useState<'dark' | 'light'>('dark');
  const [signStyle, setSignStyle] = useState<'brass-blade' | 'illuminated'>('brass-blade');

  const variants = useMemo(
    () => extractBrandVariants(activeDoc, brief, palette),
    [activeDoc, brief, palette]
  );

  // Pick appropriate variant document for transparent overlays on dark vs light surfaces
  const getVariantForSurface = (isDarkSurface: boolean, preferIcon = false): LogoDocument => {
    if (mockupTone === 'mono') {
      return isDarkSurface ? variants.monochromeReversedDocument : variants.monochromeDocument;
    }
    if (mockupTone === 'dark') {
      return variants.darkModeDocument;
    }
    if (preferIcon) {
      return isDarkSurface ? variants.darkModeDocument : variants.markOnlyDocument;
    }
    return isDarkSurface ? variants.darkModeDocument : variants.primaryDocument;
  };

  const activeShirt = SHIRT_COLORS.find((s) => s.id === shirtColorId) ?? SHIRT_COLORS[0];
  const shirtLogoDoc = getVariantForSurface(activeShirt.isDark, shirtPlacement === 'pocket');
  const cardFrontDark = cardStock === 'charcoal' || cardStock === 'brand';
  const cardFrontBg =
    cardStock === 'charcoal' ? '#141518' : cardStock === 'brand' ? palette.primary : '#FAF8F3';

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-8 space-y-8">
      {/* Header & Global Mockup Controls */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#DCD9D0] bg-white px-6 py-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1B4332]">
            Live Mockup Generator
          </p>
          <h1 className="font-display mt-1 text-2xl sm:text-3xl font-bold text-[#141413]">
            {brief.businessName || 'Brand'} — Real-World Surface Previews
          </h1>
          <p className="mt-1 text-xs text-[#5C5951]">
            Every mockup below renders your live canvas artwork across print stationery, apparel, drinkware, mobile UI, and architectural signage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center rounded-lg border border-[#DCD9D0] bg-[#F3F1EB] p-0.5 text-xs font-semibold">
            {(
              [
                ['auto', 'Auto Contrast'],
                ['dark', 'Dark Ink'],
                ['mono', 'Monochrome'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMockupTone(id)}
                className={`rounded-md px-2.5 py-1.5 transition-colors cursor-pointer ${
                  mockupTone === id
                    ? 'bg-[#141413] text-white'
                    : 'text-[#4A4740] hover:text-[#141413]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenBrandKit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCD9D0] bg-white px-3.5 py-2 text-xs font-semibold text-[#141413] hover:bg-[#F3F1EB] cursor-pointer whitespace-nowrap shrink-0"
          >
            <Palette className="h-3.5 w-3.5" />
            Brand Kit
          </button>

          <button
            type="button"
            onClick={onBackToEditor}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#141413] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#2A2926] cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Canvas Editor
          </button>
        </div>
      </section>

      {/* 5 Realistic Mockup Templates Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* 1. BUSINESS CARD MOCKUP */}
        <article className="lg:col-span-6 rounded-xl border border-[#DCD9D0] bg-white p-5 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#141413]">01. Luxury Business Card</h2>
              <p className="text-[11px] text-[#6B675E]">3.5 × 2.0 in Heavy Cotton Stock · Front &amp; Back</p>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold">
              {(['ivory', 'charcoal', 'brand'] as const).map((stock) => (
                <button
                  key={stock}
                  type="button"
                  onClick={() => setCardStock(stock)}
                  className={`rounded border px-2 py-1 capitalize cursor-pointer ${
                    cardStock === stock
                      ? 'border-[#141413] bg-[#141413] text-white'
                      : 'border-[#DCD9D0] bg-[#FAF9F6] text-[#4A4740]'
                  }`}
                >
                  {stock}
                </button>
              ))}
            </div>
          </div>

          <div className="relative rounded-xl bg-gradient-to-br from-[#EAE6DC] via-[#E2DDD1] to-[#D4CEC0] p-6 sm:p-8 overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
              {/* Front Card */}
              <div
                className="aspect-[1.75/1] rounded-lg p-4 shadow-[0_18px_35px_rgba(17,24,39,0.2)] ring-1 ring-black/10 flex items-center justify-center transition-transform duration-300 hover:-translate-y-0.5"
                style={{ backgroundColor: cardFrontBg }}
              >
                <div className="w-4/5">
                  <LogoDocumentSvg
                    doc={getVariantForSurface(cardFrontDark, false)}
                    idPrefix="mock-bc-front"
                    forceBackground="transparent"
                    className="aspect-[4/3] w-full block"
                  />
                </div>
              </div>

              {/* Back Card */}
              <div className="aspect-[1.75/1] rounded-lg bg-[#FCFBF8] p-4 shadow-[0_18px_35px_rgba(17,24,39,0.16)] ring-1 ring-black/10 flex flex-col justify-between transition-transform duration-300 hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-20">
                    <LogoDocumentSvg
                      doc={getVariantForSurface(false, true)}
                      idPrefix="mock-bc-back"
                      forceBackground="transparent"
                      className="aspect-[4/3] w-full block"
                    />
                  </div>
                  <span
                    className="h-2.5 w-8 rounded-xs"
                    style={{ backgroundColor: palette.accent }}
                  />
                </div>

                <div className="border-t border-[#E6E3DA] pt-2 text-[9.5px] leading-relaxed text-[#4A4740]">
                  <p className="font-bold text-[#141413] truncate">
                    {brief.businessName || 'Brand Studio'}
                  </p>
                  <p className="truncate text-[#6B675E]">{brief.tagline || brief.industry}</p>
                  <p className="font-mono-num text-[8.5px] text-[#7A756B] mt-0.5">
                    hello@{(brief.businessName || 'brand').toLowerCase().replace(/[^a-z0-9]/g, '')}.com
                  </p>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* 2. T-SHIRT APPAREL MOCKUP */}
        <article className="lg:col-span-6 rounded-xl border border-[#DCD9D0] bg-white p-5 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#141413]">02. Heavyweight Cotton T-Shirt</h2>
              <p className="text-[11px] text-[#6B675E]">260 GSM Combed Jersey · Screen Print</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {SHIRT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setShirtColorId(c.id)}
                    title={c.label}
                    className={`h-5 w-5 rounded-full border cursor-pointer ${
                      shirtColorId === c.id
                        ? 'ring-2 ring-[#141413] ring-offset-1 border-black/30'
                        : 'border-black/20'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setShirtPlacement((p) => (p === 'chest' ? 'pocket' : 'chest'))
                }
                className="rounded border border-[#DCD9D0] bg-[#FAF9F6] px-2 py-1 text-[11px] font-semibold text-[#141413] hover:bg-[#EFECE4] cursor-pointer"
              >
                {shirtPlacement === 'chest' ? 'Center Chest' : 'Left Pocket'}
              </button>
            </div>
          </div>

          <div className="relative flex items-center justify-center rounded-xl bg-gradient-to-b from-[#EDEAE2] to-[#DDD8CC] p-5 min-h-[250px] overflow-hidden">
            <svg viewBox="0 0 380 280" className="h-64 w-auto drop-shadow-[0_16px_26px_rgba(0,0,0,0.22)]">
              <defs>
                <linearGradient id="shirt-fold-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(0,0,0,0.18)" />
                  <stop offset="22%" stopColor="rgba(255,255,255,0.06)" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.12)" />
                  <stop offset="78%" stopColor="rgba(0,0,0,0.03)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
                </linearGradient>
              </defs>
              {/* Draped Tee Body */}
              <path
                d="M110 24 L148 16 C162 42, 218 42, 232 16 L270 24 L344 68 L318 128 L280 108 V264 H100 V108 L62 128 L36 68 Z"
                fill={activeShirt.hex}
              />
              <path
                d="M110 24 L148 16 C162 42, 218 42, 232 16 L270 24 L344 68 L318 128 L280 108 V264 H100 V108 L62 128 L36 68 Z"
                fill="url(#shirt-fold-grad)"
                stroke="rgba(0,0,0,0.16)"
                strokeWidth="1.5"
              />
              {/* Ribbed Crew Collar */}
              <path
                d="M148 16 C162 42, 218 42, 232 16 C216 32, 164 32, 148 16 Z"
                fill="rgba(0,0,0,0.18)"
              />
              <path
                d="M142 18 C158 49, 222 49, 238 18"
                fill="none"
                stroke={activeShirt.isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)'}
                strokeWidth="2"
              />
              {/* Sleeve Hem Stitching */}
              <line x1="65" y1="122" x2="40" y2="74" stroke="rgba(128,128,128,0.22)" strokeDasharray="3 2" />
              <line x1="315" y1="122" x2="340" y2="74" stroke="rgba(128,128,128,0.22)" strokeDasharray="3 2" />
            </svg>

            <div
              className={`absolute transition-all duration-200 ${
                shirtPlacement === 'chest'
                  ? 'top-[90px] left-1/2 -translate-x-1/2 w-28'
                  : 'top-[86px] left-[56%] w-12'
              }`}
            >
              <LogoDocumentSvg
                doc={shirtLogoDoc}
                idPrefix="mock-tshirt"
                forceBackground="transparent"
                className="aspect-[4/3] w-full block"
              />
            </div>
          </div>
        </article>

        {/* 3. COFFEE CUP MOCKUP */}
        <article className="lg:col-span-4 rounded-xl border border-[#DCD9D0] bg-white p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#141413]">03. Coffee Cup</h2>
              <p className="text-[11px] text-[#6B675E]">Ceramic Mug &amp; Café Sleeve</p>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setCupStyle('ceramic')}
                className={`rounded border px-2 py-1 cursor-pointer ${
                  cupStyle === 'ceramic'
                    ? 'border-[#141413] bg-[#141413] text-white'
                    : 'border-[#DCD9D0] bg-[#FAF9F6] text-[#4A4740]'
                }`}
              >
                Ceramic
              </button>
              <button
                type="button"
                onClick={() => setCupStyle('kraft')}
                className={`rounded border px-2 py-1 cursor-pointer ${
                  cupStyle === 'kraft'
                    ? 'border-[#141413] bg-[#141413] text-white'
                    : 'border-[#DCD9D0] bg-[#FAF9F6] text-[#4A4740]'
                }`}
              >
                Takeaway
              </button>
            </div>
          </div>

          <div className="relative flex items-center justify-center rounded-xl bg-gradient-to-b from-[#ECE8DE] to-[#DAD4C6] p-6 min-h-[250px]">
            {cupStyle === 'ceramic' ? (
              <div className="relative flex items-center justify-center">
                <svg viewBox="0 0 260 230" className="h-56 w-auto drop-shadow-[0_16px_22px_rgba(17,24,39,0.2)]">
                  <defs>
                    <linearGradient id="mug-cylinder" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#E4E1D9" />
                      <stop offset="28%" stopColor="#FFFFFF" />
                      <stop offset="72%" stopColor="#F8F7F4" />
                      <stop offset="100%" stopColor="#CFCAC0" />
                    </linearGradient>
                  </defs>
                  {/* Mug Handle */}
                  <path
                    d="M178 68 C218 68, 224 148, 174 152"
                    fill="none"
                    stroke="#ECE9E2"
                    strokeWidth="16"
                    strokeLinecap="round"
                  />
                  <path
                    d="M178 68 C218 68, 224 148, 174 152"
                    fill="none"
                    stroke="rgba(0,0,0,0.08)"
                    strokeWidth="16"
                    strokeLinecap="round"
                  />
                  {/* Mug Cylinder Body */}
                  <path
                    d="M58 50 H182 V172 C182 192, 58 192, 58 172 Z"
                    fill="url(#mug-cylinder)"
                    stroke="rgba(0,0,0,0.1)"
                    strokeWidth="1"
                  />
                  {/* Mug Top Rim & Coffee Surface */}
                  <ellipse cx="120" cy="50" rx="62" ry="13" fill="#EFECE6" stroke="rgba(0,0,0,0.1)" />
                  <ellipse cx="120" cy="51" rx="54" ry="9" fill="#3B2416" />
                </svg>

                <div className="absolute top-[86px] left-[45%] -translate-x-1/2 w-24">
                  <LogoDocumentSvg
                    doc={getVariantForSurface(false, false)}
                    idPrefix="mock-mug"
                    forceBackground="transparent"
                    className="aspect-[4/3] w-full block"
                  />
                </div>
              </div>
            ) : (
              <div className="relative flex items-center justify-center">
                <svg viewBox="0 0 240 240" className="h-56 w-auto drop-shadow-[0_16px_22px_rgba(17,24,39,0.2)]">
                  <defs>
                    <linearGradient id="kraft-cup" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#B89368" />
                      <stop offset="32%" stopColor="#D7B58C" />
                      <stop offset="76%" stopColor="#C8A276" />
                      <stop offset="100%" stopColor="#9A754D" />
                    </linearGradient>
                  </defs>
                  {/* Tapered Paper Cup */}
                  <polygon
                    points="64,62 176,62 158,208 82,208"
                    fill="#F7F5F0"
                    stroke="rgba(0,0,0,0.08)"
                  />
                  {/* Kraft Sleeve */}
                  <polygon
                    points="68,94 172,94 164,166 76,166"
                    fill="url(#kraft-cup)"
                    stroke="rgba(60,36,15,0.18)"
                  />
                  {/* Travel Lid */}
                  <path d="M56 54 H184 L178 40 H62 Z" fill="#1F2024" />
                  <rect x="54" y="53" width="132" height="10" rx="3" fill="#141417" />
                </svg>
                <div className="absolute top-[98px] left-1/2 -translate-x-1/2 w-20">
                  <LogoDocumentSvg
                    doc={getVariantForSurface(false, false)}
                    idPrefix="mock-kraft"
                    forceBackground="transparent"
                    className="aspect-[4/3] w-full block"
                  />
                </div>
              </div>
            )}
          </div>
        </article>

        {/* 4. MOBILE APP ICON MOCKUP */}
        <article className="lg:col-span-4 rounded-xl border border-[#DCD9D0] bg-white p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#141413]">04. Mobile App Icon</h2>
              <p className="text-[11px] text-[#6B675E]">iOS &amp; Android Squircle + Home Screen</p>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setPhoneWallpaper('dark')}
                className={`rounded border px-2 py-1 cursor-pointer ${
                  phoneWallpaper === 'dark'
                    ? 'border-[#141413] bg-[#141413] text-white'
                    : 'border-[#DCD9D0] bg-[#FAF9F6] text-[#4A4740]'
                }`}
              >
                Dark UI
              </button>
              <button
                type="button"
                onClick={() => setPhoneWallpaper('light')}
                className={`rounded border px-2 py-1 cursor-pointer ${
                  phoneWallpaper === 'light'
                    ? 'border-[#141413] bg-[#141413] text-white'
                    : 'border-[#DCD9D0] bg-[#FAF9F6] text-[#4A4740]'
                }`}
              >
                Light UI
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-5 rounded-xl bg-gradient-to-br from-[#EAE6DC] to-[#D6D0C4] p-5 min-h-[250px]">
            {/* Phone Screen Frame */}
            <div className="w-44 rounded-[28px] border-[5px] border-[#1A1B1E] bg-[#111215] p-3 shadow-[0_18px_32px_rgba(0,0,0,0.28)]">
              <div
                className={`rounded-[20px] p-3.5 transition-colors ${
                  phoneWallpaper === 'dark'
                    ? 'bg-gradient-to-b from-[#1A202C] via-[#131720] to-[#0D1017] text-white'
                    : 'bg-gradient-to-b from-[#F5F7FA] to-[#E3E8F0] text-[#141413]'
                }`}
              >
                {/* Dynamic Island Notch */}
                <div className="mx-auto mb-3 h-3 w-14 rounded-full bg-black/80" />

                {/* Hero Brand App Icon + Sibling Icons */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="h-11 w-11 overflow-hidden rounded-[11px] p-1 shadow-md ring-1 ring-black/15"
                      style={{
                        backgroundColor:
                          phoneWallpaper === 'dark' ? palette.primary : '#FFFFFF',
                      }}
                    >
                      <LogoDocumentSvg
                        doc={getVariantForSurface(phoneWallpaper === 'dark', true)}
                        idPrefix="mock-app-hero"
                        forceBackground="transparent"
                        className="h-full w-full"
                      />
                    </div>
                    <span className="max-w-full truncate text-[8px] font-semibold">
                      {(brief.businessName || 'Brand').split(' ')[0]}
                    </span>
                  </div>

                  {['Notes', 'Wallet', 'Studio', 'Mail', 'Map'].map((app, i) => (
                    <div key={app} className="flex flex-col items-center gap-1 opacity-75">
                      <div
                        className="h-11 w-11 rounded-[11px]"
                        style={{
                          backgroundColor:
                            phoneWallpaper === 'dark'
                              ? ['#2A3140', '#2E3A36', '#3A2E39', '#253549', '#383428'][i]
                              : ['#E2E8F0', '#DCECE4', '#ECE4EE', '#DFEAFA', '#EFE9DB'][i],
                        }}
                      />
                      <span className="text-[8px]">{app}</span>
                    </div>
                  ))}
                </div>

                {/* Bottom Dock */}
                <div
                  className={`mt-4 grid grid-cols-3 gap-2 rounded-xl p-1.5 ${
                    phoneWallpaper === 'dark' ? 'bg-white/10' : 'bg-black/8'
                  }`}
                >
                  <div className="h-6 rounded-md bg-white/25" />
                  <div className="h-6 rounded-md bg-white/25" />
                  <div className="h-6 rounded-md bg-white/25" />
                </div>
              </div>
            </div>

            {/* Standalone 1:1 Squircle & Favicon Test */}
            <div className="hidden sm:flex flex-col items-center gap-3">
              <div
                className="h-20 w-20 overflow-hidden rounded-[20px] p-2.5 shadow-[0_12px_24px_rgba(0,0,0,0.2)] ring-1 ring-black/15"
                style={{
                  backgroundColor: phoneWallpaper === 'dark' ? '#141518' : '#FFFFFF',
                }}
              >
                <LogoDocumentSvg
                  doc={getVariantForSurface(phoneWallpaper === 'dark', true)}
                  idPrefix="mock-app-large"
                  forceBackground="transparent"
                  className="h-full w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 overflow-hidden rounded bg-white p-0.5 ring-1 ring-black/15">
                  <LogoDocumentSvg
                    doc={variants.markOnlyDocument}
                    idPrefix="mock-fav-24"
                    forceBackground="#FFFFFF"
                    className="h-full w-full"
                  />
                </div>
                <span className="font-mono-num text-[10px] text-[#4A4740]">1024px → 24px</span>
              </div>
            </div>
          </div>
        </article>

        {/* 5. STOREFRONT SIGN MOCKUP */}
        <article className="lg:col-span-4 rounded-xl border border-[#DCD9D0] bg-white p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#141413]">05. Storefront Sign</h2>
              <p className="text-[11px] text-[#6B675E]">Architectural Blade &amp; Fascia</p>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setSignStyle('brass-blade')}
                className={`rounded border px-2 py-1 cursor-pointer ${
                  signStyle === 'brass-blade'
                    ? 'border-[#141413] bg-[#141413] text-white'
                    : 'border-[#DCD9D0] bg-[#FAF9F6] text-[#4A4740]'
                }`}
              >
                Blade Sign
              </button>
              <button
                type="button"
                onClick={() => setSignStyle('illuminated')}
                className={`rounded border px-2 py-1 cursor-pointer ${
                  signStyle === 'illuminated'
                    ? 'border-[#141413] bg-[#141413] text-white'
                    : 'border-[#DCD9D0] bg-[#FAF9F6] text-[#4A4740]'
                }`}
              >
                Fascia Glow
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-[#23262B] via-[#1C1E22] to-[#131518] p-6 min-h-[250px] flex flex-col justify-between">
            {/* Subtle Architectural Timber/Brick Cladding Stripes */}
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 22px)',
              }}
            />

            {/* Top Sconce Lighting Wash */}
            <div className="pointer-events-none relative z-10 flex justify-around">
              <div className="h-3 w-8 rounded-b-full bg-[#3A3D44] shadow-[0_14px_28px_rgba(255,230,175,0.35)]" />
              <div className="h-3 w-8 rounded-b-full bg-[#3A3D44] shadow-[0_14px_28px_rgba(255,230,175,0.35)]" />
            </div>

            {/* Mounted Signboard */}
            {signStyle === 'brass-blade' ? (
              <div className="relative z-10 flex items-center justify-center my-2">
                <div className="flex items-center">
                  {/* Wall Bracket & Arm */}
                  <div className="h-24 w-2.5 rounded-sm bg-[#B5924C]" />
                  <div className="flex flex-col justify-between h-16">
                    <div className="h-1.5 w-6 bg-[#B5924C]" />
                    <div className="h-1.5 w-6 bg-[#B5924C]" />
                  </div>
                  {/* Hanging Enamel Signboard */}
                  <div className="w-44 rounded-lg border-2 border-[#C7A65E] bg-[#FAF8F2] p-3 shadow-[0_16px_30px_rgba(0,0,0,0.5)]">
                    <LogoDocumentSvg
                      doc={getVariantForSurface(false, false)}
                      idPrefix="mock-sign-blade"
                      forceBackground="transparent"
                      className="aspect-[4/3] w-full block"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative z-10 mx-auto my-2 w-full max-w-[260px] rounded-lg border border-white/15 bg-[#0D0F12] p-4 shadow-[0_0_32px_rgba(255,244,214,0.14)]">
                <LogoDocumentSvg
                  doc={getVariantForSurface(true, false)}
                  idPrefix="mock-sign-glow"
                  forceBackground="transparent"
                  className="aspect-[4/3] w-full block"
                />
              </div>
            )}

            {/* Glass Storefront Window Sill */}
            <div className="relative z-10 mx-auto flex h-7 w-full items-center justify-between rounded-t-md border-t border-x border-white/15 bg-gradient-to-b from-amber-100/10 to-transparent px-3 text-[9px] uppercase tracking-[0.2em] text-amber-100/60">
              <span>Est. {new Date().getFullYear()}</span>
              <span className="inline-flex items-center gap-1">
                <Layers className="h-2.5 w-2.5" />
                {brief.industry}
              </span>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};
