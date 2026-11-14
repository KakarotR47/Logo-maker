import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  ArrowUpRight,
  Building2,
  Check,
  Compass,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  Star,
} from 'lucide-react';
import {
  AddressIconId,
  CardBorderStyle,
  CardCornerStyle,
  CardDesignId,
  CardDetails,
  CardMagicConfig,
  CardSymbolsConfig,
  CardTheme,
  CardTypographyMap,
  ContactIconId,
  CrestStyleId,
  ServiceBulletId,
  TextElementStyle,
} from '../types/card';
import { getFontCss } from '../data/cardPresets';
import {
  GuillocheMesh,
  LuxuryCrestSvg,
  PostageStampEmblem,
} from './SealCrest';

interface VisitingCardFaceProps {
  designId: CardDesignId;
  borderStyle: CardBorderStyle;
  cornerStyle: CardCornerStyle;
  details: CardDetails;
  theme: CardTheme;
  typography: CardTypographyMap;
  symbols: CardSymbolsConfig;
  magic: CardMagicConfig;
  formatPhone: (phone: string) => string;
  showPrintGuides?: boolean;
  glarePos?: { x: number; y: number };
}

export function formatPakistaniPhone(raw: string): string {
  const digits = raw.replace(/\s+/g, '');
  if (digits.startsWith('+92') && digits.length === 13) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return raw;
}

function getCornerPresentation(cornerStyle: CardCornerStyle): {
  radiusClass: string;
  style: React.CSSProperties;
} {
  if (cornerStyle === 'sharp') {
    return { radiusClass: 'rounded-[3px]', style: {} };
  }
  if (cornerStyle === 'soft') {
    return { radiusClass: 'rounded-2xl', style: {} };
  }
  if (cornerStyle === 'chamfered') {
    return {
      radiusClass: 'rounded-none',
      style: {
        clipPath:
          'polygon(16px 0%, calc(100% - 16px) 0%, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0% calc(100% - 16px), 0% 16px)',
      },
    };
  }
  if (cornerStyle === 'notched') {
    const mask =
      'radial-gradient(circle at 0 0, transparent 13px, #000 13.5px), radial-gradient(circle at 100% 0, transparent 13px, #000 13.5px), radial-gradient(circle at 0 100%, transparent 13px, #000 13.5px), radial-gradient(circle at 100% 100%, transparent 13px, #000 13.5px)';
    return {
      radiusClass: 'rounded-none',
      style: {
        maskImage: mask,
        WebkitMaskImage: mask,
        maskComposite: 'intersect',
        WebkitMaskComposite: 'source-in',
      },
    };
  }
  return { radiusClass: 'rounded-xl', style: {} };
}

function slotStyle(
  slot: TextElementStyle,
  baseMinPx: number,
  baseMaxPx: number,
  fallbackColor: string,
  theme: CardTheme,
  isLightSurface = !theme.isDark
): React.CSSProperties {
  const scaledMin = (baseMinPx * slot.scale).toFixed(1);
  const scaledMax = (baseMaxPx * slot.scale).toFixed(1);
  const resolvedColor = slot.colorOverride?.trim() ? slot.colorOverride.trim() : fallbackColor;

  const base: React.CSSProperties = {
    fontFamily: getFontCss(slot.fontId),
    fontStyle: slot.italic ? 'italic' : 'normal',
    textTransform: slot.uppercase ? 'uppercase' : 'none',
    letterSpacing: `${slot.tracking}em`,
    fontSize: `clamp(${scaledMin}px, ${(baseMaxPx * slot.scale * 0.19).toFixed(2)}vw, ${scaledMax}px)`,
  };

  if (slot.textEffect === 'foil-gradient') {
    const gradient = slot.colorOverride?.trim()
      ? `linear-gradient(135deg, ${resolvedColor} 0%, #FFFFFF 48%, ${resolvedColor} 100%)`
      : theme.foilGradient;
    return {
      ...base,
      backgroundImage: gradient,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      color: 'transparent',
    };
  }

  if (slot.textEffect === 'embossed') {
    return {
      ...base,
      color: resolvedColor,
      textShadow: isLightSurface
        ? '0 1px 0 rgba(255,255,255,0.95), 0 -0.8px 0 rgba(0,0,0,0.24)'
        : '0 1.5px 0 rgba(0,0,0,0.9), 0 -0.6px 0 rgba(255,255,255,0.28)',
    };
  }

  if (slot.textEffect === 'glow') {
    return {
      ...base,
      color: resolvedColor,
      textShadow: `0 0 12px ${resolvedColor}88, 0 0 3px ${resolvedColor}AA`,
    };
  }

  return {
    ...base,
    color: resolvedColor,
  };
}

const FoilBorderOverlay: React.FC<{
  borderStyle: CardBorderStyle;
  theme: CardTheme;
  shimmer?: boolean;
}> = ({ borderStyle, theme, shimmer = true }) => {
  if (borderStyle === 'clean-edge') return null;

  const primaryStroke = shimmer ? theme.accentHighlightHex : theme.accentHex;
  const secondaryStroke = theme.borderHex;

  if (borderStyle === 'double-hairline') {
    return (
      <>
        <div
          className="pointer-events-none absolute inset-2.5 rounded-lg"
          style={{
            border: `1.2px solid ${secondaryStroke}`,
            boxShadow: shimmer ? `inset 0 0 12px ${theme.accentHex}22` : undefined,
          }}
        />
        <div
          className="pointer-events-none absolute inset-4 rounded-md opacity-55"
          style={{ border: `0.75px solid ${primaryStroke}` }}
        />
      </>
    );
  }

  if (borderStyle === 'security-dashed') {
    return (
      <>
        <div
          className="pointer-events-none absolute inset-2.5 rounded-lg"
          style={{ border: `1.35px solid ${primaryStroke}`, opacity: 0.7 }}
        />
        <div
          className="pointer-events-none absolute inset-4 rounded-md"
          style={{ border: `1px dashed ${theme.accentHex}`, opacity: 0.52 }}
        />
      </>
    );
  }

  if (borderStyle === 'solid-foil-band') {
    return (
      <div
        className="pointer-events-none absolute inset-2 rounded-lg"
        style={{
          border: `3px solid ${primaryStroke}`,
          opacity: 0.85,
          boxShadow: shimmer ? `inset 0 0 16px ${theme.accentHex}33, 0 0 10px ${theme.accentHex}22` : undefined,
        }}
      />
    );
  }

  if (borderStyle === 'beveled-triple') {
    return (
      <>
        <div
          className="pointer-events-none absolute inset-2 rounded-lg"
          style={{ border: `0.8px solid ${secondaryStroke}` }}
        />
        <div
          className="pointer-events-none absolute inset-3 rounded-md"
          style={{
            border: `1.8px solid ${primaryStroke}`,
            opacity: 0.82,
            boxShadow: shimmer ? `inset 0 0 10px ${theme.accentHex}2A` : undefined,
          }}
        />
        <div
          className="pointer-events-none absolute inset-4 rounded-sm opacity-60"
          style={{ border: `0.75px solid ${theme.accentHex}` }}
        />
        {['top-3.5 left-3.5', 'top-3.5 right-3.5', 'bottom-3.5 left-3.5', 'bottom-3.5 right-3.5'].map(
          (pos, idx) => (
            <span
              key={idx}
              className={`pointer-events-none absolute h-2 w-2 rotate-45 ${pos}`}
              style={{ backgroundColor: primaryStroke }}
            />
          )
        )}
      </>
    );
  }

  if (borderStyle === 'mughal-arabesque') {
    return (
      <>
        <div
          className="pointer-events-none absolute inset-2.5 rounded-lg"
          style={{ border: `1.2px solid ${primaryStroke}`, opacity: 0.78 }}
        />
        <div
          className="pointer-events-none absolute inset-4 rounded-md"
          style={{ border: `1px dotted ${theme.accentHex}`, opacity: 0.6 }}
        />
        {[
          'top-2 left-2',
          'top-2 right-2 -scale-x-100',
          'bottom-2 left-2 -scale-y-100',
          'bottom-2 right-2 -scale-x-100 -scale-y-100',
        ].map((pos, i) => (
          <svg
            key={i}
            className={`pointer-events-none absolute h-8 w-8 ${pos}`}
            viewBox="0 0 32 32"
            fill="none"
          >
            <path
              d="M2 24 C2 11 11 2 24 2"
              stroke={primaryStroke}
              strokeWidth="1.5"
            />
            <path
              d="M5 17 C5 10 10 5 17 5"
              stroke={theme.accentHex}
              strokeWidth="1"
              opacity="0.75"
            />
            <circle cx="5" cy="5" r="2" fill={primaryStroke} />
          </svg>
        ))}
      </>
    );
  }

  if (borderStyle === 'art-deco-stepped') {
    return (
      <>
        <div
          className="pointer-events-none absolute inset-3 rounded-none"
          style={{ border: `1px solid ${secondaryStroke}` }}
        />
        {[
          'top-2 left-2',
          'top-2 right-2 -scale-x-100',
          'bottom-2 left-2 -scale-y-100',
          'bottom-2 right-2 -scale-x-100 -scale-y-100',
        ].map((pos, i) => (
          <svg
            key={i}
            className={`pointer-events-none absolute h-7 w-7 ${pos}`}
            viewBox="0 0 28 28"
            fill="none"
          >
            <path d="M1 24V1H24" stroke={primaryStroke} strokeWidth="1.6" />
            <path d="M6 18V6H18" stroke={theme.accentHex} strokeWidth="1" opacity="0.75" />
            <rect x="1" y="1" width="5" height="5" fill={primaryStroke} opacity="0.9" />
          </svg>
        ))}
      </>
    );
  }

  // corner-filigree
  return (
    <>
      <div
        className="pointer-events-none absolute inset-2.5 rounded-lg"
        style={{ border: `1px solid ${secondaryStroke}` }}
      />
      {[
        'top-3.5 left-3.5',
        'top-3.5 right-3.5 -scale-x-100',
        'bottom-3.5 left-3.5 -scale-y-100',
        'bottom-3.5 right-3.5 -scale-x-100 -scale-y-100',
      ].map((pos, i) => (
        <svg
          key={i}
          className={`pointer-events-none absolute h-5 w-5 opacity-85 ${pos}`}
          viewBox="0 0 24 24"
          fill="none"
        >
          <path d="M1 12V1H12" stroke={primaryStroke} strokeWidth="1.4" />
          <path d="M5 12V5H12" stroke={theme.accentHex} strokeWidth="0.8" opacity="0.65" />
        </svg>
      ))}
    </>
  );
};

const BackgroundPatternOverlay: React.FC<{
  designId: CardDesignId;
  magic: CardMagicConfig;
  accentHex: string;
}> = ({ designId, magic, accentHex }) => {
  const effectivePattern =
    magic.pattern === 'auto'
      ? designId === 'sovereign-stamp' ||
        designId === 'treasury-guilloche' ||
        designId === 'mughal-arch' ||
        designId === 'mughal-darbar' ||
        designId === 'crescent-guild'
        ? 'guilloche'
        : designId === 'vault-microgrid' || designId === 'sovereign-blackcard'
        ? 'microgrid'
        : 'none'
      : magic.pattern;

  const opacity = magic.patternOpacity / 100;
  if (effectivePattern === 'none' || opacity <= 0) return null;

  if (effectivePattern === 'guilloche') {
    return (
      <GuillocheMesh
        color={accentHex}
        opacity={opacity}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
    );
  }

  if (effectivePattern === 'concentric') {
    return (
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 700 400"
        fill="none"
        style={{ opacity }}
        aria-hidden="true"
      >
        {[60, 110, 160, 210, 260, 310, 360].map((r) => (
          <circle key={r} cx="620" cy="200" r={r} stroke={accentHex} strokeWidth="0.8" />
        ))}
      </svg>
    );
  }

  if (effectivePattern === 'diamond-lattice') {
    return (
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: opacity * 0.7,
          backgroundImage: `repeating-linear-gradient(45deg, ${accentHex} 0, ${accentHex} 0.7px, transparent 0, transparent 22px), repeating-linear-gradient(-45deg, ${accentHex} 0, ${accentHex} 0.7px, transparent 0, transparent 22px)`,
        }}
      />
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        opacity: opacity * 0.65,
        backgroundImage: `linear-gradient(${accentHex} 0.8px, transparent 0.8px), linear-gradient(90deg, ${accentHex} 0.8px, transparent 0.8px)`,
        backgroundSize: '26px 26px',
      }}
    />
  );
};

const CanvasWatermarkOverlay: React.FC<{
  symbols: CardSymbolsConfig;
  theme: CardTheme;
  monogram: string;
  displayFont: string;
}> = ({ symbols, theme, monogram, displayFont }) => {
  const wm = symbols.watermarkCrest;
  if (!wm || wm === 'none') return null;

  const resolvedId: Exclude<CrestStyleId, 'auto' | 'none' | 'postage-stamp'> =
    wm === 'auto' || wm === 'postage-stamp'
      ? symbols.crestStyle !== 'auto' &&
        symbols.crestStyle !== 'none' &&
        symbols.crestStyle !== 'postage-stamp'
        ? symbols.crestStyle
        : 'justice-scales-seal'
      : wm;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 flex items-center justify-end pr-6 sm:pr-10 overflow-hidden"
      style={{ opacity: Math.min(0.32, Math.max(0.03, (symbols.watermarkOpacity ?? 12) / 100)) }}
    >
      <LuxuryCrestSvg
        crestId={resolvedId}
        accentColor={theme.accentHex}
        highlightColor={theme.accentHighlightHex}
        secondaryColor={theme.accentMutedHex}
        coreBgHex={theme.cardBgHex}
        monogram={monogram}
        displayFont={displayFont}
        className="h-56 w-56 sm:h-68 sm:w-68"
        foilGradient={symbols.crestFoilGradient}
        crestCenterMode={symbols.crestCenterMode === 'custom-image' ? 'custom-image' : symbols.crestCenterMode}
        crestCenterIcon={symbols.crestCenterIcon}
        customLogoDataUrl={symbols.customLogoDataUrl}
        customLogoFullColor={symbols.customLogoFullColor}
        isWatermark
      />
    </div>
  );
};

const MagicFoilGlare: React.FC<{
  isDark: boolean;
  magic: CardMagicConfig;
  glarePos?: { x: number; y: number };
  watermark?: React.ReactNode;
}> = ({ isDark, magic, glarePos, watermark }) => {
  const intensity = magic.foilIntensity / 100;
  const x = glarePos?.x ?? 50;
  const y = glarePos?.y ?? 50;

  let foilBg = `radial-gradient(440px circle at ${x}% ${y}%, ${
    isDark
      ? `rgba(255,244,214,${(0.16 * intensity).toFixed(3)})`
      : `rgba(255,255,255,${(0.55 * intensity).toFixed(3)})`
  }, transparent 60%)`;

  if (magic.foilEffect === 'holographic-prism') {
    foilBg = `radial-gradient(500px circle at ${x}% ${y}%, rgba(255,214,138,${(
      0.16 * intensity
    ).toFixed(3)}), rgba(130,235,215,${(0.11 * intensity).toFixed(
      3
    )}) 35%, rgba(205,155,255,${(0.09 * intensity).toFixed(3)}) 58%, transparent 75%)`;
  } else if (magic.foilEffect === 'mirror-foil') {
    foilBg = `linear-gradient(${105 + (x - 50) * 0.6}deg, transparent 20%, rgba(255,255,255,${(
      0.22 * intensity
    ).toFixed(3)}) 48%, transparent 76%)`;
  }

  return (
    <>
      {watermark}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, currentColor 0.7px, transparent 0)',
          backgroundSize: '8px 8px',
        }}
      />
      {intensity > 0 && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-200"
          style={{ background: foilBg }}
        />
      )}
      {magic.securityHologram && (
        <div
          className="pointer-events-none absolute right-5 bottom-12 z-20 flex h-8 w-8 items-center justify-center rounded-full opacity-60"
          style={{
            background:
              'conic-gradient(from 45deg, rgba(255,225,140,0.55), rgba(145,245,220,0.48), rgba(220,175,255,0.48), rgba(255,225,140,0.55))',
            border: '1px solid rgba(255,255,255,0.5)',
          }}
          title="Security Hologram Seal"
        >
          <Sparkles className="h-3.5 w-3.5 text-white/95" />
        </div>
      )}
    </>
  );
};

const ContactPrefixIcon: React.FC<{
  iconId: ContactIconId;
  color: string;
}> = ({ iconId, color }) => {
  if (iconId === 'none') return null;
  if (iconId === 'whatsapp') {
    return <MessageCircle className="h-3 w-3 shrink-0" style={{ color }} />;
  }
  if (iconId === 'star') {
    return <Star className="h-3 w-3 shrink-0" style={{ color }} />;
  }
  if (iconId === 'diamond') {
    return (
      <span
        className="inline-block h-1.5 w-1.5 shrink-0 rotate-45"
        style={{ backgroundColor: color }}
      />
    );
  }
  return <Phone className="h-3 w-3 shrink-0" style={{ color }} />;
};

const AddressPrefixIcon: React.FC<{
  iconId: AddressIconId;
  color: string;
}> = ({ iconId, color }) => {
  if (iconId === 'none') return null;
  if (iconId === 'compass') return <Compass className="h-3.5 w-3.5 shrink-0" style={{ color }} />;
  if (iconId === 'building') return <Building2 className="h-3.5 w-3.5 shrink-0" style={{ color }} />;
  return <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color }} />;
};

const ServiceBulletMarker: React.FC<{
  bulletId: ServiceBulletId;
  color: string;
}> = ({ bulletId, color }) => {
  if (bulletId === 'check') return <Check className="h-3 w-3 shrink-0" style={{ color }} />;
  if (bulletId === 'star') return <Star className="h-2.5 w-2.5 shrink-0" style={{ color }} />;
  if (bulletId === 'arrow') return <ArrowUpRight className="h-3 w-3 shrink-0" style={{ color }} />;
  if (bulletId === 'dash') {
    return <span className="h-px w-2 shrink-0" style={{ backgroundColor: color }} />;
  }
  return <span className="h-1 w-1 shrink-0 rotate-45" style={{ backgroundColor: color }} />;
};

const DynamicCrest: React.FC<{
  designDefault: Exclude<CrestStyleId, 'auto' | 'none'>;
  symbols: CardSymbolsConfig;
  theme: CardTheme;
  details: CardDetails;
  displayFont: string;
  sizeClass?: string;
}> = ({
  designDefault,
  symbols,
  theme,
  details,
  displayFont,
  sizeClass = 'h-14 w-14 sm:h-16 sm:w-16',
}) => {
  const effective = symbols.crestStyle === 'auto' ? designDefault : symbols.crestStyle;
  if (effective === 'none') return null;

  const brandMain = details.companyName.split(/stamp vendor/i)[0].trim() || details.companyName;
  const scale = symbols.crestScale ?? 1;
  const scaleStyle: React.CSSProperties =
    scale !== 1 ? { transform: `scale(${scale})`, transformOrigin: 'center' } : {};

  if (effective === 'postage-stamp') {
    return (
      <div style={scaleStyle}>
        <PostageStampEmblem
          goldColor={theme.accentHex}
          paperColor={theme.isDark ? theme.creamPaperHex : '#FAF7F0'}
          inkColor={theme.isDark ? theme.creamInkHex : theme.textPrimaryHex}
          monogram={details.monogram}
          brandSub={brandMain}
          displayFont={displayFont}
          stampIcons={symbols.stampIcons}
          customLogoDataUrl={symbols.customLogoDataUrl}
          crestCenterMode={symbols.crestCenterMode}
          crestCenterIcon={symbols.crestCenterIcon}
          className="w-[116px] h-[134px] sm:w-[144px] sm:h-[166px] drop-shadow-[0_10px_18px_rgba(0,0,0,0.35)]"
        />
      </div>
    );
  }

  return (
    <div style={scaleStyle}>
      <LuxuryCrestSvg
        crestId={effective}
        accentColor={theme.accentHex}
        highlightColor={theme.accentHighlightHex}
        secondaryColor={theme.accentMutedHex}
        coreBgHex={theme.cardBgHex}
        monogram={details.monogram}
        displayFont={displayFont}
        className={effective === 'mughal-arch' ? 'h-20 w-16 sm:h-24 sm:w-20' : sizeClass}
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
    </div>
  );
};

const PrintCropMarks: React.FC<{ visible?: boolean }> = ({ visible }) => {
  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <div className="absolute inset-4 border border-dashed border-sky-400/50" />
      <span className="absolute -top-3 left-0 h-2.5 w-px bg-zinc-500" />
      <span className="absolute top-0 -left-3 h-px w-2.5 bg-zinc-500" />
      <span className="absolute -top-3 right-0 h-2.5 w-px bg-zinc-500" />
      <span className="absolute top-0 -right-3 h-px w-2.5 bg-zinc-500" />
      <span className="absolute -bottom-3 left-0 h-2.5 w-px bg-zinc-500" />
      <span className="absolute bottom-0 -left-3 h-px w-2.5 bg-zinc-500" />
      <span className="absolute -bottom-3 right-0 h-2.5 w-px bg-zinc-500" />
      <span className="absolute bottom-0 -right-3 h-px w-2.5 bg-zinc-500" />
    </div>
  );
};

function useQrDataUrl(url: string, darkColor: string): string {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: darkColor || '#112E22',
        light: '#FFFFFF',
      },
    })
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [url, darkColor]);

  return qrDataUrl;
}

function splitBrandName(full: string): { main: string; role: string } {
  const idx = full.toLowerCase().indexOf('stamp vendor');
  if (idx > 0) {
    return {
      main: full.slice(0, idx).trim(),
      role: full.slice(idx).trim(),
    };
  }
  return { main: full, role: 'Stamp Vendor' };
}

export const CardFrontFace: React.FC<VisitingCardFaceProps> = ({
  designId,
  borderStyle,
  cornerStyle,
  details,
  theme,
  typography,
  symbols,
  magic,
  formatPhone,
  showPrintGuides = false,
  glarePos,
}) => {
  const { main: brandMain, role: brandRole } = splitBrandName(details.companyName);
  const brandWords = brandMain.split(/\s+/);
  const firstWord = brandWords[0] ?? 'SA';
  const restWords = brandWords.slice(1).join(' ') || 'BROTHERS';
  const corner = getCornerPresentation(cornerStyle);
  const companyFontCss = getFontCss(typography.companyName.fontId);

  const cardShadow = theme.isDark
    ? '0 24px 60px -15px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255,255,255,0.08)'
    : '0 24px 55px -15px rgba(20, 20, 19, 0.2), inset 0 1px 0 rgba(255,255,255,0.9)';

  const wrapperStyle: React.CSSProperties = {
    background: theme.surfaceGradient,
    color: theme.textPrimaryHex,
    boxShadow: cardShadow,
    ...corner.style,
  };

  const renderBorder = () => (
    <FoilBorderOverlay
      borderStyle={borderStyle}
      theme={theme}
      shimmer={magic.foilBorderShimmer}
    />
  );

  const watermarkEl = (
    <CanvasWatermarkOverlay
      symbols={symbols}
      theme={theme}
      monogram={details.monogram}
      displayFont={companyFontCss}
    />
  );

  // 01. SOVEREIGN REVENUE STAMP
  if (designId === 'sovereign-stamp') {
    return (
      <div className={`relative h-full w-full overflow-hidden ${corner.radiusClass} select-none`} style={wrapperStyle}>
        <BackgroundPatternOverlay designId={designId} magic={magic} accentHex={theme.accentHex} />
        <MagicFoilGlare isDark={theme.isDark} magic={magic} glarePos={glarePos} watermark={watermarkEl} />
        {renderBorder()}
        <PrintCropMarks visible={showPrintGuides} />

        <div className="relative z-10 flex h-full items-center gap-5 sm:gap-7 px-6 py-5 sm:px-9 sm:py-6">
          {symbols.crestStyle !== 'none' && (
            <div className="shrink-0 flex items-center justify-center">
              <DynamicCrest
                designDefault="postage-stamp"
                symbols={symbols}
                theme={theme}
                details={details}
                displayFont={companyFontCss}
                sizeClass="w-24 h-24 sm:w-28 sm:h-28"
              />
            </div>
          )}

          <div className="min-w-0 flex-1 flex flex-col justify-between h-full py-1">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-px w-5 shrink-0" style={{ backgroundColor: theme.accentHex }} />
                <p
                  className="font-semibold truncate"
                  style={slotStyle(typography.subtitle, 8.5, 10, theme.accentHex, theme)}
                >
                  {details.subtitle}
                </p>
              </div>
              <h2
                className="mt-2 font-extrabold leading-[0.96]"
                style={slotStyle(typography.companyName, 24, 33, theme.textPrimaryHex, theme)}
              >
                <span className="block">{firstWord}</span>
                <span className="block">{restWords}</span>
              </h2>
              <p
                className="mt-1 font-semibold"
                style={slotStyle(typography.badge, 12, 16, theme.accentHex, theme)}
              >
                {brandRole}
              </p>
            </div>

            <div className="space-y-2">
              <p
                className="leading-snug"
                style={slotStyle(typography.tagline, 11, 13.5, theme.accentHex, theme)}
              >
                {details.tagline}
              </p>
              <div
                className="flex items-center justify-between gap-2 pt-2"
                style={{ borderTop: `1px solid ${theme.borderHex}` }}
              >
                <span
                  className="inline-flex items-center gap-1.5 truncate"
                  style={slotStyle(typography.address, 9.5, 11.5, theme.textSecondaryHex, theme)}
                >
                  <AddressPrefixIcon iconId={symbols.addressIcon} color={theme.accentHex} />
                  <span className="truncate">{details.address}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 02. MUGHAL DARBAR ILLUMINATION (Traditional Royal Archway & Dual Corner Rosettes)
  if (designId === 'mughal-darbar') {
    return (
      <div className={`relative h-full w-full overflow-hidden ${corner.radiusClass} select-none`} style={wrapperStyle}>
        <BackgroundPatternOverlay designId={designId} magic={magic} accentHex={theme.accentHex} />
        <MagicFoilGlare isDark={theme.isDark} magic={magic} glarePos={glarePos} watermark={watermarkEl} />
        {renderBorder()}
        <PrintCropMarks visible={showPrintGuides} />

        {/* Subtle arched frame accent */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-20" viewBox="0 0 700 400" fill="none" aria-hidden="true">
          <path d="M40 360 V115 C40 60 180 28 350 28 C520 28 660 60 660 115 V360 Z" stroke={theme.accentHex} strokeWidth="2" />
        </svg>

        <div className="relative z-10 flex h-full flex-col items-center justify-between px-8 py-5 sm:px-11 sm:py-6 text-center">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 opacity-65" style={{ backgroundColor: theme.accentHex }} />
              <p className="font-semibold" style={slotStyle(typography.subtitle, 8.5, 10, theme.accentHex, theme)}>
                {details.subtitle}
              </p>
              <span className="h-px w-8 opacity-65" style={{ backgroundColor: theme.accentHex }} />
            </div>

            <div className="mt-2 flex items-center gap-4">
              <DynamicCrest
                designDefault="mughal-arch"
                symbols={symbols}
                theme={theme}
                details={details}
                displayFont={companyFontCss}
                sizeClass="h-12 w-12 sm:h-14 sm:w-14 shrink-0"
              />
              <div className="text-left">
                <h2 className="font-bold leading-tight" style={slotStyle(typography.companyName, 20, 27, theme.textPrimaryHex, theme)}>
                  {details.companyName}
                </h2>
                <p className="mt-0.5" style={slotStyle(typography.tagline, 10, 12.5, theme.accentHex, theme)}>
                  {details.tagline}
                </p>
              </div>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-3 my-1">
            {details.contacts.slice(0, 2).map((contact) => (
              <div
                key={contact.id}
                className="rounded-md px-3 py-2 text-center"
                style={{
                  border: `1px solid ${theme.borderHex}`,
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(20,20,19,0.03)',
                }}
              >
                <p className="font-semibold truncate" style={slotStyle(typography.contactName, 11, 13.5, theme.textPrimaryHex, theme)}>
                  {contact.name}
                </p>
                <p className="font-mono-num mt-0.5 inline-flex items-center justify-center gap-1 font-medium" style={slotStyle(typography.contactPhone, 10, 12, theme.accentHex, theme)}>
                  <ContactPrefixIcon iconId={symbols.contactIcon} color={theme.accentHex} />
                  {formatPhone(contact.phone)}
                </p>
              </div>
            ))}
          </div>

          <div
            className="inline-flex w-full items-center justify-center gap-2 rounded-sm px-3 py-1.5"
            style={{
              border: `1px solid ${theme.borderHex}`,
              backgroundColor: theme.isDark ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.45)',
            }}
          >
            <AddressPrefixIcon iconId={symbols.addressIcon} color={theme.accentHex} />
            <span className="truncate font-medium" style={slotStyle(typography.address, 9.5, 11.5, theme.textSecondaryHex, theme)}>
              {details.address}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 03. ROYAL STAMP CHARTER & WAX SEAL
  if (designId === 'royal-stamp-charter') {
    return (
      <div className={`relative h-full w-full overflow-hidden ${corner.radiusClass} select-none`} style={wrapperStyle}>
        <BackgroundPatternOverlay designId={designId} magic={magic} accentHex={theme.accentHex} />
        <MagicFoilGlare isDark={theme.isDark} magic={magic} glarePos={glarePos} watermark={watermarkEl} />
        {renderBorder()}
        <PrintCropMarks visible={showPrintGuides} />

        <div className="relative z-10 flex h-full flex-col justify-between px-7 py-5 sm:px-9 sm:py-6">
          <div className="flex items-start justify-between gap-4 border-b pb-3" style={{ borderColor: theme.borderHex }}>
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rotate-45" style={{ backgroundColor: theme.accentHex }} />
                <p className="font-semibold truncate" style={slotStyle(typography.subtitle, 8.5, 10, theme.accentHex, theme)}>
                  {details.subtitle}
                </p>
              </div>
              <h2 className="mt-1 font-bold leading-tight" style={slotStyle(typography.companyName, 21, 28, theme.textPrimaryHex, theme)}>
                {details.companyName}
              </h2>
              <p className="mt-1" style={slotStyle(typography.tagline, 10, 12.5, theme.textSecondaryHex, theme)}>
                {details.tagline}
              </p>
            </div>
            <DynamicCrest
              designDefault="wax-seal"
              symbols={symbols}
              theme={theme}
              details={details}
              displayFont={companyFontCss}
              sizeClass="h-14 w-14 sm:h-16 sm:w-16 shrink-0"
            />
          </div>

          <div className="grid grid-cols-2 gap-5 py-1">
            {details.contacts.slice(0, 2).map((contact) => (
              <div key={contact.id} className="min-w-0">
                <p className="font-bold truncate" style={slotStyle(typography.contactName, 12, 14.5, theme.textPrimaryHex, theme)}>
                  {contact.name}
                </p>
                <p className="font-mono-num mt-0.5 inline-flex items-center gap-1.5 font-medium" style={slotStyle(typography.contactPhone, 10.5, 12.5, theme.accentHex, theme)}>
                  <ContactPrefixIcon iconId={symbols.contactIcon} color={theme.accentHex} />
                  {formatPhone(contact.phone)}
                </p>
              </div>
            ))}
          </div>

          <div
            className="flex items-center justify-between gap-3 rounded-md px-3.5 py-2"
            style={{
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(20,20,19,0.04)',
              border: `1px solid ${theme.borderHex}`,
            }}
          >
            <span className="inline-flex min-w-0 items-center gap-1.5 truncate" style={slotStyle(typography.address, 9.5, 11.5, theme.textSecondaryHex, theme)}>
              <AddressPrefixIcon iconId={symbols.addressIcon} color={theme.accentHex} />
              <span className="truncate">{details.address}</span>
            </span>
            <span className="shrink-0 font-semibold" style={slotStyle(typography.badge, 8.5, 10, theme.accentHex, theme)}>
              {details.cardLabel}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 04. CRESCENT & GUILD ROSETTE
  if (designId === 'crescent-guild') {
    return (
      <div className={`relative h-full w-full overflow-hidden ${corner.radiusClass} select-none`} style={wrapperStyle}>
        <BackgroundPatternOverlay designId={designId} magic={magic} accentHex={theme.accentHex} />
        <MagicFoilGlare isDark={theme.isDark} magic={magic} glarePos={glarePos} watermark={watermarkEl} />
        {renderBorder()}
        <PrintCropMarks visible={showPrintGuides} />

        <div className="relative z-10 flex h-full items-center gap-5 px-7 py-5 sm:px-9 sm:py-6">
          {symbols.crestStyle !== 'none' && (
            <div
              className="shrink-0 flex flex-col items-center justify-center rounded-full p-3"
              style={{
                border: `1.5px solid ${theme.borderHex}`,
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.025)' : 'rgba(20,20,19,0.025)',
              }}
            >
              <DynamicCrest
                designDefault="crescent-star"
                symbols={symbols}
                theme={theme}
                details={details}
                displayFont={companyFontCss}
                sizeClass="h-20 w-20 sm:h-24 sm:w-24"
              />
            </div>
          )}

          <div className="h-[80%] w-px shrink-0 opacity-45" style={{ backgroundColor: theme.accentHex }} />

          <div className="min-w-0 flex-1 flex flex-col justify-between h-full py-1">
            <div>
              <p className="font-semibold truncate" style={slotStyle(typography.subtitle, 8.5, 10, theme.accentHex, theme)}>
                {details.subtitle}
              </p>
              <h2 className="mt-1 font-bold leading-tight" style={slotStyle(typography.companyName, 20, 27, theme.textPrimaryHex, theme)}>
                {details.companyName}
              </h2>
              <p className="mt-1 leading-snug" style={slotStyle(typography.tagline, 10, 12.5, theme.textSecondaryHex, theme)}>
                {details.tagline}
              </p>
            </div>

            <div className="space-y-1.5">
              {details.contacts.slice(0, 2).map((contact) => (
                <div key={contact.id} className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold truncate" style={slotStyle(typography.contactName, 11.5, 13.5, theme.textPrimaryHex, theme)}>
                    {contact.name}
                  </span>
                  <span className="font-mono-num inline-flex items-center gap-1 shrink-0" style={slotStyle(typography.contactPhone, 10, 12, theme.accentHex, theme)}>
                    <ContactPrefixIcon iconId={symbols.contactIcon} color={theme.accentHex} />
                    {formatPhone(contact.phone)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t pt-2 inline-flex items-center gap-1.5 truncate" style={{ borderColor: theme.borderHex }}>
              <AddressPrefixIcon iconId={symbols.addressIcon} color={theme.accentHex} />
              <span className="truncate font-medium" style={slotStyle(typography.address, 9.5, 11.5, theme.textSecondaryHex, theme)}>
                {details.address}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 05. KARACHI HERITAGE PRESS
  if (designId === 'karachi-heritage-press') {
    return (
      <div className={`relative h-full w-full overflow-hidden ${corner.radiusClass} select-none`} style={wrapperStyle}>
        <BackgroundPatternOverlay designId={designId} magic={magic} accentHex={theme.accentHex} />
        <MagicFoilGlare isDark={theme.isDark} magic={magic} glarePos={glarePos} watermark={watermarkEl} />
        {renderBorder()}
        <PrintCropMarks visible={showPrintGuides} />

        <div className="relative z-10 flex h-full flex-col justify-between px-7 py-5 sm:px-9 sm:py-6">
          {/* Gilded Top Banner */}
          <div
            className="flex items-center justify-between gap-3 rounded-md px-4 py-2.5"
            style={{
              background: theme.foilGradient,
              color: theme.isDark ? '#141413' : '#FAF7F0',
            }}
          >
            <h2
              className="font-extrabold leading-none truncate"
              style={{
                ...slotStyle(
                  typography.companyName,
                  18,
                  24,
                  theme.isDark ? '#141413' : '#FAF7F0',
                  theme,
                  theme.isDark
                ),
              }}
            >
              {details.companyName}
            </h2>
            <span
              className="shrink-0 font-bold"
              style={slotStyle(
                typography.badge,
                8.5,
                10,
                theme.isDark ? '#141413' : '#FAF7F0',
                theme,
                theme.isDark
              )}
            >
              {details.cardLabel}
            </span>
          </div>

          {/* Center Heraldic Shield & Tagline */}
          <div className="flex items-center gap-4 my-1">
            <DynamicCrest
              designDefault="heraldic-shield"
              symbols={symbols}
              theme={theme}
              details={details}
              displayFont={companyFontCss}
              sizeClass="h-14 w-14 sm:h-16 sm:w-16 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate" style={slotStyle(typography.subtitle, 8.5, 10, theme.accentHex, theme)}>
                {details.subtitle}
              </p>
              <p className="mt-1 leading-snug" style={slotStyle(typography.tagline, 10.5, 13, theme.textSecondaryHex, theme)}>
                {details.tagline}
              </p>
            </div>
          </div>

          {/* Bottom Contacts + Address */}
          <div className="space-y-2 border-t pt-2.5" style={{ borderColor: theme.borderHex }}>
            <div className="grid grid-cols-2 gap-4">
              {details.contacts.slice(0, 2).map((contact) => (
                <div key={contact.id} className="flex items-baseline justify-between gap-1.5 min-w-0">
                  <span className="font-semibold truncate" style={slotStyle(typography.contactName, 11, 13, theme.textPrimaryHex, theme)}>
                    {contact.name}
                  </span>
                  <span className="font-mono-num shrink-0" style={slotStyle(typography.contactPhone, 10, 11.5, theme.accentHex, theme)}>
                    {formatPhone(contact.phone)}
                  </span>
                </div>
              ))}
            </div>
            <div className="inline-flex w-full items-center gap-1.5 truncate">
              <AddressPrefixIcon iconId={symbols.addressIcon} color={theme.accentHex} />
              <span className="truncate font-medium" style={slotStyle(typography.address, 9.5, 11.5, theme.textSecondaryHex, theme)}>
                {details.address}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 20. SOVEREIGN CENTURION RESERVE (VIP Metal Card Layout)
  if (designId === 'sovereign-blackcard') {
    return (
      <div className={`relative h-full w-full overflow-hidden ${corner.radiusClass} select-none`} style={wrapperStyle}>
        <BackgroundPatternOverlay designId={designId} magic={magic} accentHex={theme.accentHex} />
        <MagicFoilGlare isDark={theme.isDark} magic={magic} glarePos={glarePos} watermark={watermarkEl} />
        {renderBorder()}
        <PrintCropMarks visible={showPrintGuides} />

        <div className="relative z-10 flex h-full flex-col justify-between px-8 py-6 sm:px-10 sm:py-7">
          <div className="flex items-start justify-between">
            <DynamicCrest
              designDefault="sunburst-medallion"
              symbols={symbols}
              theme={theme}
              details={details}
              displayFont={companyFontCss}
              sizeClass="h-13 w-13 sm:h-15 sm:w-15"
            />
            <div className="text-right">
              <p className="font-semibold" style={slotStyle(typography.subtitle, 8.5, 10, theme.accentHex, theme)}>
                {details.subtitle}
              </p>
              <p className="mt-1 font-semibold" style={slotStyle(typography.badge, 8.5, 10, theme.accentMutedHex, theme)}>
                {details.cardLabel}
              </p>
            </div>
          </div>

          <div className="my-auto">
            <h2 className="font-extrabold leading-tight" style={slotStyle(typography.companyName, 22, 30, theme.textPrimaryHex, theme)}>
              {details.companyName}
            </h2>
            <p className="mt-1" style={slotStyle(typography.tagline, 10.5, 13, theme.accentHex, theme)}>
              {details.tagline}
            </p>
          </div>

          <div className="flex flex-col gap-2 border-t pt-2.5" style={{ borderColor: theme.borderHex }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {details.contacts.slice(0, 2).map((contact) => (
                <div key={contact.id} className="inline-flex items-baseline gap-2">
                  <span className="font-semibold" style={slotStyle(typography.contactName, 11, 13, theme.textPrimaryHex, theme)}>
                    {contact.name}
                  </span>
                  <span className="font-mono-num" style={slotStyle(typography.contactPhone, 10, 12, theme.accentHex, theme)}>
                    {formatPhone(contact.phone)}
                  </span>
                </div>
              ))}
            </div>
            <p className="inline-flex items-center gap-1.5 truncate" style={slotStyle(typography.address, 9.5, 11.5, theme.textSecondaryHex, theme)}>
              <AddressPrefixIcon iconId={symbols.addressIcon} color={theme.accentHex} />
              <span className="truncate">{details.address}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 07. TREASURY BANKNOTE & 11. IMPERIAL CREST SOVEREIGN
  if (designId === 'treasury-guilloche' || designId === 'imperial-crest-center') {
    return (
      <div className={`relative h-full w-full overflow-hidden ${corner.radiusClass} select-none`} style={wrapperStyle}>
        <BackgroundPatternOverlay designId={designId} magic={magic} accentHex={theme.accentHex} />
        <MagicFoilGlare isDark={theme.isDark} magic={magic} glarePos={glarePos} watermark={watermarkEl} />
        {renderBorder()}
        <PrintCropMarks visible={showPrintGuides} />

        <div className="relative z-10 flex h-full flex-col items-center justify-between px-7 py-5 sm:px-10 sm:py-6 text-center">
          <div className="flex flex-col items-center">
            <DynamicCrest
              designDefault={designId === 'imperial-crest-center' ? 'crown-crest' : 'notary-rosette'}
              symbols={symbols}
              theme={theme}
              details={details}
              displayFont={companyFontCss}
              sizeClass="h-11 w-11 sm:h-12 sm:w-12"
            />
            <h2
              className="mt-2 font-bold"
              style={slotStyle(typography.companyName, 20, 27, theme.textPrimaryHex, theme)}
            >
              {details.companyName}
            </h2>
            <p className="mt-0.5 font-medium" style={slotStyle(typography.tagline, 10, 12.5, theme.accentHex, theme)}>
              {details.tagline}
            </p>
          </div>

          <div className="flex w-full items-center justify-center gap-4 sm:gap-8">
            {details.contacts.slice(0, 2).map((contact, idx) => (
              <React.Fragment key={contact.id}>
                {idx > 0 && <span className="h-7 w-px opacity-45" style={{ backgroundColor: theme.accentHex }} />}
                <div className="min-w-0 text-center">
                  <p className="font-semibold truncate" style={slotStyle(typography.contactName, 11, 13.5, theme.textPrimaryHex, theme)}>
                    {contact.name}
                  </p>
                  <p className="font-mono-num font-medium" style={slotStyle(typography.contactPhone, 10, 12, theme.accentHex, theme)}>
                    {formatPhone(contact.phone)}
                  </p>
                </div>
              </React.Fragment>
            ))}
          </div>

          <div
            className="w-full pt-2 font-medium inline-flex items-center justify-center gap-1.5"
            style={{
              ...slotStyle(typography.address, 9.5, 11.5, theme.textSecondaryHex, theme),
              borderTop: `1px solid ${theme.borderHex}`,
            }}
          >
            <AddressPrefixIcon iconId={symbols.addressIcon} color={theme.accentHex} />
            <span className="truncate">{details.address}</span>
          </div>
        </div>
      </div>
    );
  }

  // 08. ARCHITECTURAL MONOGRAM
  if (designId === 'savile-monogram') {
    return (
      <div className={`relative h-full w-full overflow-hidden ${corner.radiusClass} select-none`} style={wrapperStyle}>
        <BackgroundPatternOverlay designId={designId} magic={magic} accentHex={theme.accentHex} />
        <MagicFoilGlare isDark={theme.isDark} magic={magic} glarePos={glarePos} watermark={watermarkEl} />
        {renderBorder()}
        <PrintCropMarks visible={showPrintGuides} />

        <div className="relative z-10 grid h-full grid-cols-12">
          <div
            className="col-span-4 flex flex-col items-center justify-between p-5 sm:p-6"
            style={{
              borderRight: `1px solid ${theme.borderHex}`,
              background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(20,20,19,0.03)',
            }}
          >
            <span className="font-semibold" style={slotStyle(typography.subtitle, 8.5, 9.5, theme.accentMutedHex, theme)}>
              KARACHI
            </span>
            <div
              className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-lg"
              style={{ border: `1.5px solid ${theme.accentHex}` }}
            >
              <span className="text-4xl sm:text-[42px] font-bold tracking-wider" style={{ fontFamily: companyFontCss, color: theme.accentHex }}>
                {details.monogram}
              </span>
            </div>
            <span className="font-semibold" style={slotStyle(typography.badge, 8.5, 10, theme.accentHex, theme)}>
              {details.cardLabel}
            </span>
          </div>

          <div className="col-span-8 flex flex-col justify-between p-6 sm:p-8">
            <div>
              <h2 className="font-bold leading-tight" style={slotStyle(typography.companyName, 20, 26, theme.textPrimaryHex, theme)}>
                {details.companyName}
              </h2>
              <p className="mt-1.5 leading-snug" style={slotStyle(typography.tagline, 10.5, 12.5, theme.textSecondaryHex, theme)}>
                {details.tagline}
              </p>
            </div>

            <div className="space-y-2">
              {details.contacts.slice(0, 2).map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-baseline justify-between gap-2 border-b pb-1.5"
                  style={{ borderColor: theme.borderHex }}
                >
                  <span className="font-semibold truncate" style={slotStyle(typography.contactName, 12, 14, theme.textPrimaryHex, theme)}>
                    {contact.name}
                  </span>
                  <span className="font-mono-num inline-flex items-center gap-1 font-medium shrink-0" style={slotStyle(typography.contactPhone, 10.5, 12.5, theme.accentHex, theme)}>
                    <ContactPrefixIcon iconId={symbols.contactIcon} color={theme.accentHex} />
                    {formatPhone(contact.phone)}
                  </span>
                </div>
              ))}
            </div>

            <p className="inline-flex items-center gap-1.5 font-medium truncate" style={slotStyle(typography.address, 10, 11.5, theme.textSecondaryHex, theme)}>
              <AddressPrefixIcon iconId={symbols.addressIcon} color={theme.accentHex} />
              <span className="truncate">{details.address}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 09. HERITAGE KARACHI LEDGER
  if (designId === 'heritage-ledger') {
    const paperBg = theme.isDark ? theme.creamPaperHex : '#FAF7F0';
    const paperText = theme.isDark ? theme.creamInkHex : theme.textPrimaryHex;
    const spineBg = theme.isDark ? theme.surfaceGradient : '#1B1A18';
    const spineAccent = theme.isDark ? theme.accentHex : '#D8B35B';

    return (
      <div
        className={`relative h-full w-full overflow-hidden ${corner.radiusClass} select-none`}
        style={{ background: paperBg, color: paperText, boxShadow: cardShadow, ...corner.style }}
      >
        <MagicFoilGlare isDark={false} magic={magic} glarePos={glarePos} watermark={watermarkEl} />
        {renderBorder()}
        <PrintCropMarks visible={showPrintGuides} />

        <div className="relative z-10 grid h-full grid-cols-12">
          <div className="col-span-3 flex flex-col items-center justify-between py-6 px-3" style={{ background: spineBg }}>
            <DynamicCrest
              designDefault="notary-rosette"
              symbols={symbols}
              theme={{ ...theme, accentHex: spineAccent }}
              details={details}
              displayFont={companyFontCss}
              sizeClass="h-12 w-12"
            />
            <div className="text-center">
              <p className="text-[8.5px] font-semibold tracking-[0.22em] uppercase" style={{ color: spineAccent }}>SITE</p>
              <p className="text-[8.5px] font-semibold tracking-[0.22em] uppercase mt-0.5" style={{ color: spineAccent }}>KARACHI</p>
            </div>
          </div>

          <div className="col-span-9 flex flex-col justify-between p-6 sm:p-8">
            <div>
              <p className="font-semibold" style={slotStyle(typography.subtitle, 8.5, 10, theme.accentMutedHex, theme, true)}>
                {details.subtitle}
              </p>
              <h2 className="mt-1 font-bold leading-tight" style={slotStyle(typography.companyName, 20, 26, paperText, theme, true)}>
                {details.companyName}
              </h2>
              <p className="mt-1.5 font-medium opacity-85" style={slotStyle(typography.tagline, 10.5, 12.5, paperText, theme, true)}>
                {details.tagline}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 py-2">
              {details.contacts.slice(0, 2).map((contact) => (
                <div key={contact.id} className="min-w-0">
                  <p className="font-bold truncate" style={slotStyle(typography.contactName, 12, 14, paperText, theme, true)}>
                    {contact.name}
                  </p>
                  <p
                    className="font-mono-num mt-0.5 inline-flex items-center gap-1 font-semibold"
                    style={slotStyle(
                      typography.contactPhone,
                      10.5,
                      12,
                      theme.isDark ? theme.accentMutedHex : theme.accentHex,
                      theme,
                      true
                    )}
                  >
                    <ContactPrefixIcon iconId={symbols.contactIcon} color={theme.isDark ? theme.accentMutedHex : theme.accentHex} />
                    {formatPhone(contact.phone)}
                  </p>
                </div>
              ))}
            </div>

            <div
              className="border-t border-black/15 pt-2 font-medium inline-flex items-center gap-1.5 truncate"
              style={slotStyle(typography.address, 10, 11.5, paperText, theme, true)}
            >
              <AddressPrefixIcon iconId={symbols.addressIcon} color={theme.isDark ? theme.accentMutedHex : theme.accentHex} />
              <span className="truncate">{details.address}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 10. ART DECO GATSBY VAULT & 15. HERITAGE ARCHWAY & LATTICE
  if (designId === 'art-deco-gilded' || designId === 'mughal-arch') {
    return (
      <div className={`relative h-full w-full overflow-hidden ${corner.radiusClass} select-none`} style={wrapperStyle}>
        <BackgroundPatternOverlay designId={designId} magic={magic} accentHex={theme.accentHex} />
        <MagicFoilGlare isDark={theme.isDark} magic={magic} glarePos={glarePos} watermark={watermarkEl} />
        {renderBorder()}
        <PrintCropMarks visible={showPrintGuides} />

        <div className="relative z-10 flex h-full items-center gap-6 px-7 py-6 sm:px-9">
          {symbols.crestStyle !== 'none' && (
            <div className="shrink-0 flex flex-col items-center gap-2">
              <DynamicCrest
                designDefault={designId === 'art-deco-gilded' ? 'art-deco-diamond' : 'mughal-arch'}
                symbols={symbols}
                theme={theme}
                details={details}
                displayFont={companyFontCss}
                sizeClass="h-20 w-20 sm:h-24 sm:w-24"
              />
              {designId === 'art-deco-gilded' && (
                <span className="font-semibold" style={slotStyle(typography.badge, 8, 9.5, theme.accentMutedHex, theme)}>
                  {details.cardLabel}
                </span>
              )}
            </div>
          )}

          {designId === 'art-deco-gilded' && (
            <div className="h-[78%] w-px shrink-0 opacity-45" style={{ backgroundColor: theme.accentHex }} />
          )}

          <div className="min-w-0 flex-1 flex flex-col justify-between h-full py-1">
            <div>
              <p className="font-semibold" style={slotStyle(typography.subtitle, 8.5, 10, theme.accentHex, theme)}>
                {details.subtitle}
              </p>
              <h2 className="mt-1 font-bold leading-tight" style={slotStyle(typography.companyName, 21, 27, theme.textPrimaryHex, theme)}>
                {details.companyName}
              </h2>
              <p className="mt-1" style={slotStyle(typography.tagline, 10.5, 12.5, theme.textSecondaryHex, theme)}>
                {details.tagline}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {details.contacts.slice(0, 2).map((contact) => (
                <div key={contact.id}>
                  <p className="font-semibold truncate" style={slotStyle(typography.contactName, 12, 13.5, theme.textPrimaryHex, theme)}>
                    {contact.name}
                  </p>
                  <p className="font-mono-num inline-flex items-center gap-1" style={slotStyle(typography.contactPhone, 10.5, 12, theme.accentHex, theme)}>
                    <ContactPrefixIcon iconId={symbols.contactIcon} color={theme.accentHex} />
                    {formatPhone(contact.phone)}
                  </p>
                </div>
              ))}
            </div>

            <p className="pt-2 truncate border-t inline-flex items-center gap-1.5" style={{ ...slotStyle(typography.address, 9.5, 11.5, theme.textSecondaryHex, theme), borderColor: theme.borderHex }}>
              <AddressPrefixIcon iconId={symbols.addressIcon} color={theme.accentHex} />
              <span className="truncate">{details.address}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 14. HIGH COURT STAMP CHARTER & 17. HORIZON DUAL-STOCK
  if (designId === 'court-charter' || designId === 'emerald-split-horizon') {
    const bottomBg = theme.isDark ? theme.creamPaperHex : '#FAF7F0';
    const bottomInk = theme.isDark ? theme.creamInkHex : theme.textPrimaryHex;

    return (
      <div className={`relative h-full w-full overflow-hidden ${corner.radiusClass} select-none`} style={wrapperStyle}>
        <MagicFoilGlare isDark={theme.isDark} magic={magic} glarePos={glarePos} watermark={watermarkEl} />
        <PrintCropMarks visible={showPrintGuides} />

        <div className="relative z-10 flex h-full flex-col">
          <div className="flex flex-[1.1] items-center justify-between px-7 py-4 sm:px-9" style={{ background: theme.surfaceGradient }}>
            <div className="min-w-0 pr-4">
              <p className="font-semibold" style={slotStyle(typography.subtitle, 8.5, 10, theme.accentHex, theme)}>
                {details.subtitle}
              </p>
              <h2 className="mt-1 font-bold leading-tight" style={slotStyle(typography.companyName, 21, 28, theme.textPrimaryHex, theme)}>
                {details.companyName}
              </h2>
              {designId === 'emerald-split-horizon' && (
                <p className="mt-1" style={slotStyle(typography.tagline, 10.5, 12.5, theme.textSecondaryHex, theme)}>
                  {details.tagline}
                </p>
              )}
            </div>
            <DynamicCrest
              designDefault="notary-rosette"
              symbols={symbols}
              theme={theme}
              details={details}
              displayFont={companyFontCss}
              sizeClass="h-12 w-12 sm:h-14 sm:w-14 shrink-0"
            />
          </div>

          <div
            className="flex flex-1 flex-col justify-between px-7 py-3.5 sm:px-9"
            style={{ background: bottomBg, color: bottomInk, borderTop: `2px solid ${theme.accentHex}` }}
          >
            {designId === 'court-charter' && (
              <p className="font-semibold" style={slotStyle(typography.tagline, 10.5, 12.5, theme.isDark ? theme.accentMutedHex : theme.accentHex, theme, true)}>
                {details.tagline}
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 my-auto">
              {details.contacts.slice(0, 2).map((contact) => (
                <div key={contact.id}>
                  <p className="font-bold" style={slotStyle(typography.contactName, 12, 14, bottomInk, theme, true)}>
                    {contact.name}
                  </p>
                  <p className="font-mono-num inline-flex items-center gap-1 font-semibold" style={slotStyle(typography.contactPhone, 10.5, 12.5, theme.isDark ? theme.accentMutedHex : theme.accentHex, theme, true)}>
                    <ContactPrefixIcon iconId={symbols.contactIcon} color={theme.isDark ? theme.accentMutedHex : theme.accentHex} />
                    {formatPhone(contact.phone)}
                  </p>
                </div>
              ))}
            </div>
            <p className="font-medium inline-flex items-center gap-1.5 truncate border-t border-black/15 pt-1.5" style={slotStyle(typography.address, 10, 11.5, bottomInk, theme, true)}>
              <AddressPrefixIcon iconId={symbols.addressIcon} color={theme.isDark ? theme.accentMutedHex : theme.accentHex} />
              <span className="truncate">{details.address}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 12. DIPLOMATIC DIAGONAL SASH
  if (designId === 'diplomatic-ribbon') {
    return (
      <div className={`relative h-full w-full overflow-hidden ${corner.radiusClass} select-none`} style={wrapperStyle}>
        <div
          className="pointer-events-none absolute -top-12 -right-12 h-36 w-56 rotate-45 opacity-90"
          style={{ background: theme.foilGradient }}
        />
        <BackgroundPatternOverlay designId={designId} magic={magic} accentHex={theme.accentHex} />
        <MagicFoilGlare isDark={theme.isDark} magic={magic} glarePos={glarePos} watermark={watermarkEl} />
        {renderBorder()}
        <PrintCropMarks visible={showPrintGuides} />

        <div className="relative z-10 flex h-full flex-col justify-between px-8 py-6 sm:px-10 sm:py-7">
          <div className="pr-16">
            <p className="font-semibold" style={slotStyle(typography.subtitle, 8.5, 10, theme.accentHex, theme)}>
              {details.subtitle}
            </p>
            <h2 className="mt-1.5 font-bold leading-tight" style={slotStyle(typography.companyName, 22, 30, theme.textPrimaryHex, theme)}>
              {details.companyName}
            </h2>
            <p className="mt-1.5" style={slotStyle(typography.tagline, 11, 13, theme.textSecondaryHex, theme)}>
              {details.tagline}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-4">
              {details.contacts.slice(0, 2).map((contact) => (
                <div key={contact.id}>
                  <p className="font-semibold" style={slotStyle(typography.contactName, 12.5, 14.5, theme.textPrimaryHex, theme)}>
                    {contact.name}
                  </p>
                  <p className="font-mono-num inline-flex items-center gap-1" style={slotStyle(typography.contactPhone, 10.5, 12.5, theme.accentHex, theme)}>
                    <ContactPrefixIcon iconId={symbols.contactIcon} color={theme.accentHex} />
                    {formatPhone(contact.phone)}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: theme.borderHex }}>
              <span className="inline-flex items-center gap-1.5 truncate" style={slotStyle(typography.address, 10, 11.5, theme.textSecondaryHex, theme)}>
                <AddressPrefixIcon iconId={symbols.addressIcon} color={theme.accentHex} />
                <span className="truncate">{details.address}</span>
              </span>
              <span className="font-semibold shrink-0" style={slotStyle(typography.badge, 9, 10, theme.accentHex, theme)}>
                {details.monogram}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ROYAL NOTARY, ATELIER LETTERPRESS, OBSIDIAN MONOLITH, SOVEREIGN RIBBON MEDALLION, SWISS PRECISION VAULT
  return (
    <div className={`relative h-full w-full overflow-hidden ${corner.radiusClass} select-none`} style={wrapperStyle}>
      <BackgroundPatternOverlay designId={designId} magic={magic} accentHex={theme.accentHex} />
      <MagicFoilGlare isDark={theme.isDark} magic={magic} glarePos={glarePos} watermark={watermarkEl} />
      {renderBorder()}
      <PrintCropMarks visible={showPrintGuides} />

      <div className="relative z-10 flex h-full flex-col justify-between px-7 py-6 sm:px-9 sm:py-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 pr-2">
            <p className="font-semibold truncate" style={slotStyle(typography.subtitle, 8.5, 10.5, theme.accentHex, theme)}>
              {details.subtitle}
            </p>
            <h2
              className="mt-1 leading-[1.06] font-bold"
              style={slotStyle(
                typography.companyName,
                designId === 'obsidian-monolith' ? 25 : 22,
                designId === 'obsidian-monolith' ? 34 : 30,
                theme.textPrimaryHex,
                theme
              )}
            >
              {details.companyName}
            </h2>
            <div className="mt-2.5 flex items-center gap-2.5">
              <span className="h-[1.5px] w-7 shrink-0" style={{ backgroundColor: theme.accentHex }} />
              <p className="font-medium leading-snug" style={slotStyle(typography.tagline, 10.5, 12.5, theme.textSecondaryHex, theme)}>
                {details.tagline}
              </p>
            </div>
          </div>

          <DynamicCrest
            designDefault={designId === 'vault-microgrid' ? 'octagon-vault' : 'notary-rosette'}
            symbols={symbols}
            theme={theme}
            details={details}
            displayFont={companyFontCss}
            sizeClass="h-13 w-13 sm:h-16 sm:w-16 shrink-0"
          />
        </div>

        <div className="my-1 h-px w-full opacity-35" style={{ background: `linear-gradient(90deg, ${theme.accentHex}, transparent 85%)` }} />

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 sm:gap-6">
            {details.contacts.slice(0, 2).map((contact) => (
              <div key={contact.id} className="min-w-0">
                <p className="font-semibold truncate" style={slotStyle(typography.contactName, 12.5, 15, theme.textPrimaryHex, theme)}>
                  {contact.name}
                </p>
                <a
                  href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-mono-num mt-0.5 inline-flex items-center gap-1.5 font-medium hover:underline"
                  style={slotStyle(typography.contactPhone, 10.5, 12.5, theme.accentHex, theme)}
                >
                  <ContactPrefixIcon iconId={symbols.contactIcon} color={theme.accentHex} />
                  <span className="truncate">{formatPhone(contact.phone)}</span>
                </a>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2" style={{ borderTop: `1px solid ${theme.borderHex}` }}>
            <a
              href={details.locationUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex min-w-0 items-center gap-1.5 font-medium"
              style={slotStyle(typography.address, 10, 12, theme.textSecondaryHex, theme)}
            >
              <AddressPrefixIcon iconId={symbols.addressIcon} color={theme.accentHex} />
              <span className="truncate">{details.address}</span>
            </a>
            <span className="shrink-0 font-semibold" style={slotStyle(typography.badge, 9, 10, theme.accentMutedHex, theme)}>
              {details.cardLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CardBackFace: React.FC<VisitingCardFaceProps> = ({
  designId,
  borderStyle,
  cornerStyle,
  details,
  theme,
  typography,
  symbols,
  magic,
  formatPhone,
  showPrintGuides = false,
  glarePos,
}) => {
  const qrDataUrl = useQrDataUrl(details.locationUrl, magic.qrDarkColor);
  const { main: brandMain, role: brandRole } = splitBrandName(details.companyName);
  const corner = getCornerPresentation(cornerStyle);
  const companyFontCss = getFontCss(typography.companyName.fontId);

  const cardShadow = theme.isDark
    ? '0 24px 60px -15px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255,255,255,0.08)'
    : '0 24px 55px -15px rgba(20, 20, 19, 0.2), inset 0 1px 0 rgba(255,255,255,0.9)';

  const watermarkEl = (
    <CanvasWatermarkOverlay
      symbols={symbols}
      theme={theme}
      monogram={details.monogram}
      displayFont={companyFontCss}
    />
  );

  const QrBox: React.FC<{ sizeClass?: string }> = ({ sizeClass = 'h-20 w-20 sm:h-24 sm:w-24' }) => (
    <div
      className="relative rounded-lg bg-white p-1.5 sm:p-2 shadow-md transition-transform duration-200 group-hover:scale-[1.03]"
      style={{ border: `2px solid ${theme.accentHex}` }}
    >
      {qrDataUrl ? (
        <img src={qrDataUrl} alt="Google Maps QR Code" className={`block ${sizeClass}`} referrerPolicy="no-referrer" />
      ) : (
        <div className={`flex ${sizeClass} items-center justify-center text-[10px] text-zinc-500`}>QR</div>
      )}
      {magic.qrCenterMonogram && (
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-sm bg-white shadow-xs"
          style={{ border: `1.5px solid ${magic.qrDarkColor || '#112E22'}` }}
        >
          <span
            className="text-[9px] font-extrabold leading-none"
            style={{ fontFamily: companyFontCss, color: magic.qrDarkColor || '#112E22' }}
          >
            {details.monogram}
          </span>
        </div>
      )}
    </div>
  );

  // Perforated Split Back for Sovereign Stamp & Horizon
  if (designId === 'sovereign-stamp' || designId === 'emerald-split-horizon') {
    const lightSideBg = theme.isDark ? theme.creamPaperHex : '#FAF7F0';
    const lightSideInk = theme.isDark ? theme.creamInkHex : theme.textPrimaryHex;
    const darkPanelBg = theme.isDark ? theme.surfaceGradient : '#171614';
    const darkPanelText = theme.isDark ? theme.textPrimaryHex : '#FAF7F0';

    return (
      <div
        className={`relative h-full w-full overflow-hidden ${corner.radiusClass} select-none`}
        style={{ background: darkPanelBg, boxShadow: cardShadow, ...corner.style }}
      >
        <MagicFoilGlare isDark={theme.isDark} magic={magic} glarePos={glarePos} watermark={watermarkEl} />
        <PrintCropMarks visible={showPrintGuides} />

        <div className="relative z-10 grid h-full grid-cols-12">
          <div
            className="relative col-span-8 flex flex-col justify-between px-6 py-5 sm:px-8 sm:py-6 overflow-hidden"
            style={{ background: lightSideBg, color: lightSideInk }}
          >
            <svg
              className="pointer-events-none absolute -left-24 top-1/2 -translate-y-1/2 h-[300px] w-[300px] opacity-[0.09]"
              viewBox="0 0 200 200"
              fill="none"
            >
              {[25, 42, 59, 76, 93, 110, 127].map((r) => (
                <circle key={r} cx="60" cy="100" r={r} stroke={lightSideInk} strokeWidth="0.9" />
              ))}
            </svg>

            <div className="pointer-events-none absolute top-0 -right-[5px] bottom-0 z-20 flex flex-col justify-between py-1.5">
              {Array.from({ length: 18 }).map((_, idx) => (
                <span
                  key={idx}
                  className="block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: theme.isDark ? theme.cardBgHex : '#171614' }}
                />
              ))}
            </div>

            <div className="relative z-10 flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border-2"
                style={{
                  backgroundColor: theme.isDark ? theme.cardBgHex : '#171614',
                  borderColor: theme.accentHex,
                }}
              >
                <span className="text-sm font-bold" style={{ fontFamily: companyFontCss, color: theme.accentHex }}>
                  {details.monogram}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-bold leading-none truncate" style={slotStyle(typography.companyName, 14, 18, lightSideInk, theme, true)}>
                  {brandMain}
                </p>
                <p className="mt-1 font-semibold" style={slotStyle(typography.subtitle, 8, 9.5, theme.accentMutedHex, theme, true)}>
                  {brandRole}
                </p>
              </div>
            </div>

            <div className="relative z-10 space-y-2.5 sm:space-y-3 my-1">
              {details.contacts.slice(0, 2).map((contact) => (
                <a
                  key={contact.id}
                  href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                  onClick={(e) => e.stopPropagation()}
                  className="group flex items-center gap-3 sm:gap-3.5"
                >
                  <span
                    className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border-2 transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: theme.isDark ? theme.cardBgHex : '#171614',
                      borderColor: theme.accentHex,
                      color: theme.accentHex,
                    }}
                  >
                    <ContactPrefixIcon iconId={symbols.contactIcon === 'none' ? 'phone' : symbols.contactIcon} color={theme.accentHex} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono-num font-semibold leading-none" style={slotStyle(typography.contactPhone, 14, 18, lightSideInk, theme, true)}>
                      {formatPhone(contact.phone)}
                    </p>
                    <p className="mt-1 font-semibold" style={slotStyle(typography.contactName, 9, 10.5, theme.accentMutedHex, theme, true)}>
                      {contact.name}
                    </p>
                  </div>
                </a>
              ))}
            </div>

            <div className="relative z-10 space-y-1 pt-1.5 border-t border-black/10">
              <p className="font-semibold truncate" style={slotStyle(typography.address, 9.5, 11, lightSideInk, theme, true)}>
                {details.address}
              </p>
              <p className="text-[8.5px] sm:text-[9.5px] font-semibold tracking-[0.14em] uppercase truncate" style={{ color: theme.accentMutedHex }}>
                Stamp Papers · Stamp Duties · Stationery · Office Items
              </p>
            </div>
          </div>

          <div className="col-span-4 flex flex-col items-center justify-center px-3 py-5 text-center" style={{ color: darkPanelText }}>
            <a
              href={details.locationUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="group flex flex-col items-center"
              title="Open Google Maps Location"
            >
              <QrBox />
              <p className="mt-2.5 font-bold" style={slotStyle(typography.badge, 9.5, 11, theme.accentHex, theme)}>
                {details.qrLabel}
              </p>
              <p className="mt-0.5 text-[8.5px] sm:text-[9.5px] opacity-80 leading-tight max-w-[120px]">
                {details.qrSublabel}
              </p>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Unified Luxury Reverse
  return (
    <div
      className={`relative h-full w-full overflow-hidden ${corner.radiusClass} select-none`}
      style={{
        background: theme.surfaceGradient,
        color: theme.textPrimaryHex,
        boxShadow: cardShadow,
        ...corner.style,
      }}
    >
      <BackgroundPatternOverlay designId={designId} magic={magic} accentHex={theme.accentHex} />
      <MagicFoilGlare isDark={theme.isDark} magic={magic} glarePos={glarePos} watermark={watermarkEl} />
      <FoilBorderOverlay borderStyle={borderStyle} theme={theme} shimmer={magic.foilBorderShimmer} />
      <PrintCropMarks visible={showPrintGuides} />

      <div className="relative z-10 flex h-full items-center justify-between gap-5 px-7 py-6 sm:px-9 sm:py-7">
        <div className="flex min-w-0 flex-1 flex-col justify-between h-full">
          <div className="flex items-center gap-3.5">
            <DynamicCrest
              designDefault="notary-rosette"
              symbols={symbols}
              theme={theme}
              details={details}
              displayFont={companyFontCss}
              sizeClass="h-11 w-11 sm:h-12 sm:w-12 shrink-0"
            />
            <div className="min-w-0">
              <h3 className="font-bold leading-tight truncate" style={slotStyle(typography.companyName, 17, 22, theme.textPrimaryHex, theme)}>
                {details.companyName}
              </h3>
              <p className="font-medium truncate" style={slotStyle(typography.tagline, 10, 11.5, theme.accentHex, theme)}>
                {details.tagline}
              </p>
            </div>
          </div>

          <ul className="my-2 space-y-1.5">
            {details.services.map((service, idx) => (
              <li key={`${service}-${idx}`} className="flex items-center gap-2 text-[11px] sm:text-[12px] font-medium" style={{ color: theme.textSecondaryHex }}>
                <ServiceBulletMarker bulletId={symbols.serviceBullet} color={theme.accentHex} />
                <span className="truncate">{service}</span>
              </li>
            ))}
          </ul>

          <div
            className="pt-2 font-medium inline-flex items-center gap-1.5 truncate"
            style={{
              ...slotStyle(typography.address, 10, 11.5, theme.textSecondaryHex, theme),
              borderTop: `1px solid ${theme.borderHex}`,
            }}
          >
            <AddressPrefixIcon iconId={symbols.addressIcon} color={theme.accentHex} />
            <span className="truncate">{details.address}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center justify-center">
          <a
            href={details.locationUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="group flex flex-col items-center"
            title="Open Google Maps Location"
          >
            <QrBox />
            <span className="mt-2 inline-flex items-center gap-1 font-semibold" style={slotStyle(typography.badge, 9.5, 10.5, theme.accentHex, theme)}>
              {details.qrLabel}
              <ArrowUpRight className="h-3 w-3" />
            </span>
          </a>
        </div>
      </div>
    </div>
  );
};
