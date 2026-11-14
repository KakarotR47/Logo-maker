import React, { useId } from 'react';
import {
  CraftSymbolId,
  CrestCenterIconId,
  CrestCenterMode,
  CrestFinishMode,
  CrestRimBorderId,
  CrestStyleId,
} from '../types/card';

interface CraftIconSvgProps {
  symbol: CraftSymbolId;
  primaryColor: string;
  accentColor: string;
  size?: number;
  className?: string;
}

export const CraftIconSvg: React.FC<CraftIconSvgProps> = ({
  symbol,
  primaryColor,
  accentColor,
  size = 24,
  className = '',
}) => {
  switch (symbol) {
    case 'stamp-paper':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="3" y="4" width="14" height="18" stroke={primaryColor} strokeWidth="1.4" />
          <path d="M8 1.5H20V16" stroke={primaryColor} strokeWidth="1" opacity="0.65" />
          <circle cx="10" cy="14" r="3" stroke={accentColor} strokeWidth="1.4" />
        </svg>
      );
    case 'round-seal':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9.5" stroke={primaryColor} strokeWidth="1.4" />
          <circle cx="12" cy="12" r="6.2" stroke={accentColor} strokeWidth="1.2" strokeDasharray="2 1.8" />
          <circle cx="12" cy="12" r="1.6" fill={accentColor} />
        </svg>
      );
    case 'fountain-pen':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <g transform="rotate(24 12 12)">
            <rect x="9" y="2" width="6" height="13" fill={accentColor} stroke={primaryColor} strokeWidth="1.3" />
            <polygon points="9,15 15,15 12,21.5" fill={primaryColor} />
            <line x1="12" y1="15" x2="12" y2="18.5" stroke={accentColor} strokeWidth="1" />
          </g>
        </svg>
      );
    case 'scales':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <line x1="12" y1="3" x2="12" y2="20" stroke={primaryColor} strokeWidth="1.4" />
          <line x1="7" y1="20" x2="17" y2="20" stroke={primaryColor} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="4.5" y1="7" x2="19.5" y2="7" stroke={accentColor} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M4.5 7 L2.5 13 H6.5 Z" stroke={primaryColor} strokeWidth="1.2" />
          <path d="M19.5 7 L17.5 13 H21.5 Z" stroke={primaryColor} strokeWidth="1.2" />
        </svg>
      );
    case 'inkwell':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="8.5" y="4" width="7" height="3.5" rx="0.8" fill={accentColor} stroke={primaryColor} strokeWidth="1.2" />
          <path d="M7 9.5 H17 L19 19.5 H5 Z" stroke={primaryColor} strokeWidth="1.4" />
          <line x1="8" y1="14" x2="16" y2="14" stroke={accentColor} strokeWidth="1.3" />
        </svg>
      );
    case 'briefcase':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="3" y="7" width="18" height="13" rx="1.5" stroke={primaryColor} strokeWidth="1.4" />
          <path d="M8.5 7V4.5C8.5 3.9 8.9 3.5 9.5 3.5H14.5C15.1 3.5 15.5 3.9 15.5 4.5V7" stroke={primaryColor} strokeWidth="1.3" />
          <line x1="3" y1="12.5" x2="21" y2="12.5" stroke={accentColor} strokeWidth="1.3" />
          <rect x="10.5" y="11" width="3" height="3" fill={accentColor} />
        </svg>
      );
    case 'star-rosette':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <polygon
            points="12,2 14.8,8.4 21.6,9 16.4,13.6 18,20.4 12,16.8 6,20.4 7.6,13.6 2.4,9 9.2,8.4"
            stroke={primaryColor}
            strokeWidth="1.3"
            fill={accentColor}
            fillOpacity="0.3"
          />
        </svg>
      );
    case 'diamond':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <polygon points="12,2.5 21,12 12,21.5 3,12" stroke={primaryColor} strokeWidth="1.4" />
          <polygon points="12,6.5 17,12 12,17.5 7,12" fill={accentColor} />
        </svg>
      );
    case 'scroll':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M6 4 H18 V18 C18 19.6 16.8 20.5 15.5 20.5 H5 C3.8 20.5 3 19.5 3 18.2 V6.5 C3 5 4.2 4 6 4 Z" stroke={primaryColor} strokeWidth="1.3" />
          <line x1="7" y1="8.5" x2="14" y2="8.5" stroke={accentColor} strokeWidth="1.3" />
          <line x1="7" y1="12" x2="14" y2="12" stroke={primaryColor} strokeWidth="1.1" opacity="0.7" />
          <line x1="7" y1="15.5" x2="11.5" y2="15.5" stroke={primaryColor} strokeWidth="1.1" opacity="0.7" />
        </svg>
      );
    case 'pillar':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="4" y="4" width="16" height="2.5" fill={accentColor} stroke={primaryColor} strokeWidth="1.1" />
          <rect x="4" y="18" width="16" height="2.5" fill={accentColor} stroke={primaryColor} strokeWidth="1.1" />
          <line x1="8" y1="6.5" x2="8" y2="18" stroke={primaryColor} strokeWidth="1.4" />
          <line x1="12" y1="6.5" x2="12" y2="18" stroke={primaryColor} strokeWidth="1.4" />
          <line x1="16" y1="6.5" x2="16" y2="18" stroke={primaryColor} strokeWidth="1.4" />
        </svg>
      );
  }
};

/* ---------- SCULPTED REAL BRAND ICONS FOR SEAL CENTER ---------- */
export const SculptedCenterIcon: React.FC<{
  iconId: CrestCenterIconId;
  color: string;
  highlight?: string;
  size?: number;
  className?: string;
}> = ({ iconId, color, highlight = '#FFFFFF', size = 28, className = '' }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      {iconId === 'scales' && (
        <>
          <rect x="18.6" y="6" width="2.8" height="26" rx="1.2" fill={color} />
          <path d="M10 32.5 H30 L28 35.5 H12 Z" fill={color} />
          <rect x="6" y="10.5" width="28" height="2.6" rx="1.3" fill={color} />
          <circle cx="20" cy="6.5" r="2.6" fill={highlight} stroke={color} strokeWidth="1.2" />
          <path d="M8.5 13 L4.5 23.5 H12.5 Z" stroke={color} strokeWidth="1.3" fill={color} fillOpacity="0.22" />
          <path d="M4.2 23.5 C4.2 27 12.8 27 12.8 23.5 Z" fill={color} />
          <path d="M31.5 13 L27.5 23.5 H35.5 Z" stroke={color} strokeWidth="1.3" fill={color} fillOpacity="0.22" />
          <path d="M27.2 23.5 C27.2 27 35.8 27 35.8 23.5 Z" fill={color} />
        </>
      )}
      {iconId === 'crown' && (
        <>
          <path
            d="M5.5 27.5 L4 13 L12.5 19.5 L20 7.5 L27.5 19.5 L36 13 L34.5 27.5 Z"
            fill={color}
            stroke={highlight}
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          <rect x="5.5" y="29.5" width="29" height="4" rx="1.5" fill={color} />
          <circle cx="20" cy="7" r="2" fill={highlight} />
          <circle cx="4.5" cy="12" r="1.6" fill={highlight} />
          <circle cx="35.5" cy="12" r="1.6" fill={highlight} />
          <polygon points="20,16.5 22.5,21 20,24.5 17.5,21" fill={highlight} opacity="0.85" />
        </>
      )}
      {iconId === 'stamp-press' && (
        <>
          <circle cx="20" cy="9.5" r="5" fill={color} />
          <path d="M17 13.5 H23 L22 22.5 H18 Z" fill={color} />
          <rect x="7" y="22.5" width="26" height="5" rx="1.8" fill={color} />
          <rect x="5" y="28.5" width="30" height="4.5" rx="1.2" fill={color} />
          <line x1="8" y1="24.5" x2="32" y2="24.5" stroke={highlight} strokeWidth="1" opacity="0.7" />
        </>
      )}
      {iconId === 'fountain-nib' && (
        <>
          <path d="M20 4.5 L30.5 21.5 L26.2 31 H13.8 L9.5 21.5 Z" fill={color} stroke={highlight} strokeWidth="0.8" />
          <line x1="20" y1="5" x2="20" y2="19.5" stroke={highlight} strokeWidth="1.5" />
          <circle cx="20" cy="21.5" r="2.6" fill={highlight} />
          <rect x="12.5" y="32.2" width="15" height="3.8" rx="1.2" fill={color} />
        </>
      )}
      {iconId === 'shield-star' && (
        <>
          <path d="M8 7 H32 V20 C32 27.5 26 33 20 36 C14 33 8 27.5 8 20 Z" fill={color} />
          <path d="M11 10 H29 V19.5 C29 25.5 24.5 29.8 20 32.3 C15.5 29.8 11 25.5 11 19.5 Z" stroke={highlight} strokeWidth="1" fill="none" opacity="0.7" />
          <polygon points="20,13 22,18 27.5,18.4 23.3,21.8 24.6,27 20,24 15.4,27 16.7,21.8 12.5,18.4 18,18" fill={highlight} />
        </>
      )}
      {iconId === 'diamond-gem' && (
        <>
          <polygon points="11,8 29,8 36,16.5 20,34.5 4,16.5" fill={color} />
          <polygon points="11,8 29,8 25,16.5 15,16.5" fill={highlight} opacity="0.45" />
          <polygon points="15,16.5 25,16.5 20,34.5" fill={highlight} opacity="0.25" />
          <line x1="4" y1="16.5" x2="36" y2="16.5" stroke={highlight} strokeWidth="1.1" />
        </>
      )}
      {iconId === 'quill-scroll' && (
        <>
          <path d="M9 7.5 H28 V29.5 C28 32 26 33.5 23.5 33.5 H7.5 C5.8 33.5 4.5 32 4.5 30 V11.5 C4.5 9 6.5 7.5 9 7.5 Z" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="2" />
          <line x1="11.5" y1="14" x2="23.5" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <line x1="11.5" y1="19" x2="23.5" y2="19" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <circle cx="29" cy="27.5" r="5.5" fill={color} stroke={highlight} strokeWidth="1" />
          <path d="M27 27.5 L29 29.5 L32 25.5" stroke={highlight} strokeWidth="1.4" strokeLinecap="round" />
        </>
      )}
      {iconId === 'pillar-court' && (
        <>
          <polygon points="20,5 36,13.5 4,13.5" fill={color} />
          <rect x="6" y="14.5" width="28" height="2.8" fill={color} />
          <rect x="9" y="18.2" width="3.8" height="12.5" fill={color} />
          <rect x="18.1" y="18.2" width="3.8" height="12.5" fill={color} />
          <rect x="27.2" y="18.2" width="3.8" height="12.5" fill={color} />
          <rect x="5" y="31.5" width="30" height="3.8" rx="1" fill={color} />
        </>
      )}
      {iconId === 'briefcase' && (
        <>
          <path d="M14 11 V8 C14 6.8 15 6 16.2 6 H23.8 C25 6 26 6.8 26 8 V11" stroke={color} strokeWidth="2.4" />
          <rect x="5" y="11.5" width="30" height="22" rx="3" fill={color} />
          <line x1="5" y1="20.5" x2="35" y2="20.5" stroke={highlight} strokeWidth="1.4" opacity="0.8" />
          <rect x="17" y="18" width="6" height="5" rx="1" fill={highlight} />
        </>
      )}
      {iconId === 'shop-front' && (
        <>
          <path d="M6 14 L9.5 7 H30.5 L34 14 Z" fill={color} />
          <rect x="6" y="15" width="28" height="3.2" fill={color} />
          <rect x="8" y="19" width="24" height="14.5" fill={color} fillOpacity="0.28" stroke={color} strokeWidth="2" />
          <rect x="16" y="23" width="8" height="10.5" fill={color} />
          <rect x="5" y="33.5" width="30" height="3" rx="1" fill={color} />
        </>
      )}
      {iconId === 'crescent-royal' && (
        <>
          <path d="M25.5 7 C15.5 7 8.5 14 8.5 22 C8.5 30 16 35.5 25.5 33.5 C18.5 33 14 28 14 21.5 C14 15 18.5 9.5 25.5 7 Z" fill={color} />
          <polygon points="29,11.5 30.8,15.5 35,16 31.8,18.8 32.8,23 29,20.8 25.2,23 26.2,18.8 23,16 27.2,15.5" fill={color} />
        </>
      )}
      {iconId === 'lotus-crest' && (
        <>
          <path d="M20 6 C24 13 24 21 20 26 C16 21 16 13 20 6 Z" fill={color} />
          <path d="M12.5 11 C17 15 18.5 21 17 26.5 C12.5 24 10.5 18 12.5 11 Z" fill={color} opacity="0.9" />
          <path d="M27.5 11 C23 15 21.5 21 23 26.5 C27.5 24 29.5 18 27.5 11 Z" fill={color} opacity="0.9" />
          <path d="M6.5 18.5 C12 19.5 15 23 15 27.5 C10 27.5 7 24 6.5 18.5 Z" fill={color} opacity="0.78" />
          <path d="M33.5 18.5 C28 19.5 25 23 25 27.5 C30 27.5 33 24 33.5 18.5 Z" fill={color} opacity="0.78" />
          <path d="M10 31.5 Q20 28 30 31.5" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
};

export interface SealCrestProps {
  accentColor: string;
  highlightColor?: string;
  secondaryColor?: string;
  coreBgHex?: string;
  monogram?: string;
  displayFont?: string;
  size?: number;
  className?: string;
  foilGradient?: boolean;
  crestFinish?: CrestFinishMode;
  crestCenterMode?: CrestCenterMode;
  crestCenterIcon?: CrestCenterIconId;
  crestRimBorder?: CrestRimBorderId;
  crestStrokeWeight?: number;
  crestRingTextTop?: string;
  crestRingTextBottom?: string;
  crestLiveSheen?: boolean;
  customLogoDataUrl?: string;
  customLogoFullColor?: boolean;
  isWatermark?: boolean;
}

export const LuxuryCrestSvg: React.FC<
  SealCrestProps & {
    crestId: Exclude<CrestStyleId, 'auto' | 'none' | 'postage-stamp'>;
  }
> = ({
  crestId,
  accentColor,
  highlightColor = '#FFF3C4',
  secondaryColor = accentColor,
  coreBgHex = '#0E1914',
  monogram = 'SA',
  displayFont = "'Playfair Display', Georgia, serif",
  className = 'h-14 w-14',
  foilGradient = true,
  crestFinish = '3d-embossed-coin',
  crestCenterMode = 'icon-monogram',
  crestCenterIcon = 'scales',
  crestRimBorder = 'double-bevel',
  crestStrokeWeight = 1.6,
  crestRingTextTop = '',
  crestRingTextBottom = '',
  crestLiveSheen = false,
  customLogoDataUrl = '',
  customLogoFullColor = false,
  isWatermark = false,
}) => {
  const uid = useId().replace(/:/g, '');
  const metalGradId = `seal-metal-${uid}`;
  const darkCoreGradId = `seal-core-${uid}`;
  const bevelGradId = `seal-bevel-${uid}`;
  const shadowFilterId = `seal-shadow-${uid}`;
  const tintFilterId = `seal-tint-${uid}`;
  const centerClipId = `seal-clip-${uid}`;
  const topArcId = `seal-top-arc-${uid}`;
  const botArcId = `seal-bot-arc-${uid}`;

  const effectiveFinish: CrestFinishMode = isWatermark ? 'fine-engraved' : crestFinish;
  const strokeMain = foilGradient ? `url(#${metalGradId})` : accentColor;
  const weight = crestStrokeWeight;

  // Determine medallion interior fill & contrasting foreground color
  const isSolidFill = effectiveFinish === 'solid-foil';
  const isEmbossedCoin = effectiveFinish === '3d-embossed-coin';
  const isEnamelInlay = effectiveFinish === 'enamel-inlay';
  const hasRingText = !isWatermark && (Boolean(crestRingTextTop?.trim()) || Boolean(crestRingTextBottom?.trim()));

  const coreFill = isWatermark
    ? 'none'
    : isSolidFill
    ? strokeMain
    : isEmbossedCoin
    ? `url(#${darkCoreGradId})`
    : isEnamelInlay
    ? coreBgHex
    : 'none';

  const coreInk = isSolidFill ? coreBgHex : strokeMain;
  const coreHighlight = isSolidFill ? coreBgHex : highlightColor;

  // Frame silhouette builder (Layer 1: Outer Luxury Frame Ornament)
  const renderOuterFrame = () => {
    const sw = 1.6 * weight;
    const fillBackdrop = isWatermark ? 'none' : isSolidFill ? strokeMain : accentColor;
    const backdropOpacity = isWatermark ? 0 : isSolidFill ? 0.96 : isEmbossedCoin ? 0.24 : isEnamelInlay ? 0.3 : 0.08;

    switch (crestId) {
      case 'wax-seal':
        return (
          <path
            d="M60 6 C68 6 72 11 79 10 C86 9 92 15 95 21 C98 27 106 31 107 39 C108 47 113 52 111 60 C109 68 111 76 106 82 C101 88 99 96 92 100 C85 104 79 109 71 107 C63 105 57 110 49 107 C41 104 34 104 28 98 C22 92 15 87 14 79 C13 71 8 64 10 56 C12 48 10 39 15 33 C20 27 22 18 29 14 C36 10 43 7 51 8 C55 8.5 57 6 60 6 Z"
            fill={fillBackdrop}
            fillOpacity={backdropOpacity || 0.14}
            stroke={strokeMain}
            strokeWidth={sw}
          />
        );
      case 'ribbon-wax-award':
        return (
          <>
            <path d="M44 76 L34 114 L48 104 L56 114 L58 80" fill={fillBackdrop} fillOpacity={isWatermark ? 0 : 0.85} stroke={strokeMain} strokeWidth={sw * 0.9} />
            <path d="M76 76 L86 114 L72 104 L64 114 L62 80" fill={fillBackdrop} fillOpacity={isWatermark ? 0 : 0.85} stroke={strokeMain} strokeWidth={sw * 0.9} />
            <circle cx="60" cy="56" r="46" fill={fillBackdrop} fillOpacity={backdropOpacity} stroke={strokeMain} strokeWidth={sw} />
          </>
        );
      case 'crown-crest':
        return (
          <>
            <path d="M35 23 L41 9 L53 17 L60 4 L67 17 L79 9 L85 23 Z" fill={strokeMain} stroke={highlightColor} strokeWidth="0.8" />
            <rect x="35" y="24" width="50" height="3.2" rx="1" fill={strokeMain} />
            <circle cx="60" cy="64" r="42" fill={fillBackdrop} fillOpacity={backdropOpacity} stroke={strokeMain} strokeWidth={sw} />
          </>
        );
      case 'laurel-sovereign': {
        const leafAngles = [-55, -35, -15, 5, 25, 45];
        return (
          <>
            <polygon points="60,5 62.5,11 69,11.5 64,15.5 65.5,21.5 60,18 54.5,21.5 56,15.5 51,11.5 57.5,11" fill={strokeMain} />
            <path d="M42 104 C17 94 12 60 23 30" stroke={strokeMain} strokeWidth={sw} strokeLinecap="round" />
            <path d="M78 104 C103 94 108 60 97 30" stroke={strokeMain} strokeWidth={sw} strokeLinecap="round" />
            {leafAngles.map((a, idx) => (
              <React.Fragment key={idx}>
                <ellipse cx="19" cy="60" rx="6" ry="2.8" fill={strokeMain} fillOpacity={isWatermark ? 0.35 : 0.88} transform={`rotate(${a} 60 60) rotate(-32 19 60)`} />
                <ellipse cx="101" cy="60" rx="6" ry="2.8" fill={strokeMain} fillOpacity={isWatermark ? 0.35 : 0.88} transform={`rotate(${-a} 60 60) rotate(32 101 60)`} />
              </React.Fragment>
            ))}
          </>
        );
      }
      case 'heraldic-shield':
        return (
          <path
            d="M16 14 H104 V60 C104 88 82 104 60 113 C38 104 16 88 16 60 Z"
            fill={fillBackdrop}
            fillOpacity={backdropOpacity}
            stroke={strokeMain}
            strokeWidth={sw}
          />
        );
      case 'winged-hermes-crest':
        return (
          <>
            <path d="M26 44 L4 30 L15 44 L6 52 L20 58 L12 65 L28 67" fill={strokeMain} fillOpacity={isWatermark ? 0.3 : 0.85} stroke={strokeMain} strokeWidth={sw * 0.8} strokeLinejoin="round" />
            <path d="M94 44 L116 30 L105 44 L114 52 L100 58 L108 65 L92 67" fill={strokeMain} fillOpacity={isWatermark ? 0.3 : 0.85} stroke={strokeMain} strokeWidth={sw * 0.8} strokeLinejoin="round" />
            <polygon points="60,8 63,14 69,14.5 64,18 65.5,23 60,20 54.5,23 56,18 51,14.5 57,14" fill={strokeMain} />
            <path d="M26 24 H94 V64 C94 84 78 98 60 107 C42 98 26 84 26 64 Z" fill={fillBackdrop} fillOpacity={backdropOpacity} stroke={strokeMain} strokeWidth={sw} />
          </>
        );
      case 'sunburst-medallion': {
        const rays = Array.from({ length: 24 }, (_, i) => (i * 360) / 24);
        return (
          <>
            {rays.map((angle, idx) => (
              <polygon
                key={angle}
                points={idx % 2 === 0 ? '60,4 62.5,20 57.5,20' : '60,10 61.5,22 58.5,22'}
                fill={strokeMain}
                transform={`rotate(${angle} 60 60)`}
              />
            ))}
          </>
        );
      }
      case 'calatrava-cross':
        return (
          <>
            {[0, 90, 180, 270].map((angle) => (
              <g key={angle} transform={`rotate(${angle} 60 60)`}>
                <path d="M60 5 C67 16 69 25 65 34 L60 40 L55 34 C51 25 53 16 60 5 Z" fill={strokeMain} fillOpacity={isWatermark ? 0.3 : 0.9} stroke={highlightColor} strokeWidth="0.6" />
              </g>
            ))}
          </>
        );
      case 'mughal-lotus-mandala': {
        const petals = Array.from({ length: 16 }, (_, i) => (i * 360) / 16);
        return (
          <>
            {petals.map((angle) => (
              <path
                key={angle}
                d="M60 6 C66 17 67 26 60 33 C53 26 54 17 60 6 Z"
                fill={strokeMain}
                fillOpacity={isWatermark ? 0.25 : 0.85}
                stroke={highlightColor}
                strokeWidth="0.5"
                transform={`rotate(${angle} 60 60)`}
              />
            ))}
          </>
        );
      }
      case 'mughal-arch':
        return (
          <path
            d="M14 114 V50 C14 26 38 14 60 6 C82 14 106 26 106 50 V114 Z"
            fill={fillBackdrop}
            fillOpacity={backdropOpacity}
            stroke={strokeMain}
            strokeWidth={sw}
          />
        );
      case 'octagon-vault':
        return (
          <polygon
            points="38,7 82,7 113,38 113,82 82,113 38,113 7,82 7,38"
            fill={fillBackdrop}
            fillOpacity={backdropOpacity}
            stroke={strokeMain}
            strokeWidth={sw}
          />
        );
      case 'signet-hex-crest':
        return (
          <polygon
            points="60,6 108,33 108,87 60,114 12,87 12,33"
            fill={fillBackdrop}
            fillOpacity={backdropOpacity}
            stroke={strokeMain}
            strokeWidth={sw}
          />
        );
      case 'art-deco-diamond':
      case 'double-diamond-atelier':
        return (
          <>
            <rect x="20" y="20" width="80" height="80" fill={fillBackdrop} fillOpacity={backdropOpacity * 0.7} stroke={strokeMain} strokeWidth={sw * 0.9} />
            <polygon points="60,6 114,60 60,114 6,60" fill={fillBackdrop} fillOpacity={backdropOpacity} stroke={strokeMain} strokeWidth={sw} />
          </>
        );
      case 'compass-star-guild':
        return (
          <polygon
            points="60,4 69,51 116,60 69,69 60,116 51,69 4,60 51,51"
            fill={strokeMain}
            fillOpacity={isWatermark ? 0.28 : 0.86}
          />
        );
      case 'arch-pillar-seal':
        return (
          <>
            <polygon points="60,7 108,30 12,30" fill={strokeMain} />
            <rect x="16" y="31" width="11" height="72" fill={strokeMain} fillOpacity={isWatermark ? 0.35 : 0.9} />
            <rect x="93" y="31" width="11" height="72" fill={strokeMain} fillOpacity={isWatermark ? 0.35 : 0.9} />
            <rect x="10" y="103" width="100" height="8" rx="1.5" fill={strokeMain} />
          </>
        );
      case 'banknote-oval':
      case 'cartouche-oval':
        return (
          <ellipse
            cx="60"
            cy="60"
            rx="53"
            ry="44"
            fill={fillBackdrop}
            fillOpacity={backdropOpacity}
            stroke={strokeMain}
            strokeWidth={sw}
          />
        );
      case 'chopard-wreath-crest':
        return (
          <>
            <circle cx="48" cy="60" r="38" stroke={strokeMain} strokeWidth={sw} opacity="0.88" />
            <circle cx="72" cy="60" r="38" stroke={strokeMain} strokeWidth={sw} opacity="0.88" />
          </>
        );
      case 'crescent-star':
        return (
          <>
            <circle cx="60" cy="60" r="50" fill={fillBackdrop} fillOpacity={backdropOpacity} stroke={strokeMain} strokeWidth={sw} />
            <polygon points="91,24 93.5,30 100,30.5 95,34.5 96.5,41 91,37.5 85.5,41 87,34.5 82,30.5 88.5,30" fill={strokeMain} />
          </>
        );
      case 'justice-scales-seal':
      case 'fountain-quill-guild':
      case 'notary-rosette':
      default: {
        const teeth = Array.from({ length: 32 }, (_, i) => (i * 360) / 32);
        return (
          <g>
            {teeth.map((angle) => (
              <polygon
                key={angle}
                points="60,4 62,12 58,12"
                fill={strokeMain}
                transform={`rotate(${angle} 60 60)`}
              />
            ))}
          </g>
        );
      }
    }
  };

  // Medallion core center coordinates (slightly lower for crown-crest / ribbon-wax-award)
  const cy = crestId === 'crown-crest' ? 65 : crestId === 'ribbon-wax-award' ? 56 : 60;
  const rOuter = crestId === 'sunburst-medallion' || crestId === 'calatrava-cross' || crestId === 'mughal-lotus-mandala' || crestId === 'arch-pillar-seal'
    ? 36
    : crestId === 'crown-crest'
    ? 39
    : 45;
  const rInner = hasRingText ? rOuter - 12.5 : rOuter - 5.5;

  const effectiveRim: CrestRimBorderId =
    crestRimBorder === 'auto'
      ? crestId === 'cartouche-oval' || crestId === 'chopard-wreath-crest'
        ? 'pearl-bezel'
        : crestId === 'wax-seal' || crestId === 'ribbon-wax-award'
        ? 'scalloped-wax'
        : crestId === 'notary-rosette' || crestId === 'banknote-oval'
        ? 'milled-coin'
        : 'double-bevel'
      : crestRimBorder;

  const renderSealRimBorder = () => {
    if (effectiveRim === 'none') return null;

    if (effectiveRim === 'milled-coin') {
      const ticks = Array.from({ length: 40 }, (_, i) => (i * 360) / 40);
      return (
        <g>
          {ticks.map((a) => (
            <line
              key={a}
              x1="60"
              y1={cy - rOuter - 2.5}
              x2="60"
              y2={cy - rOuter + 1.5}
              stroke={strokeMain}
              strokeWidth={1.3 * weight}
              transform={`rotate(${a} 60 ${cy})`}
            />
          ))}
          <circle cx="60" cy={cy} r={rOuter} stroke={strokeMain} strokeWidth={2 * weight} />
          <circle cx="60" cy={cy} r={rInner} stroke={strokeMain} strokeWidth={0.9 * weight} opacity="0.85" />
        </g>
      );
    }

    if (effectiveRim === 'pearl-bezel') {
      const beads = Array.from({ length: 24 }, (_, i) => {
        const rad = (i * Math.PI * 2) / 24;
        return { x: 60 + Math.cos(rad) * (rOuter - 2.5), y: cy + Math.sin(rad) * (rOuter - 2.5) };
      });
      return (
        <g>
          <circle cx="60" cy={cy} r={rOuter} stroke={strokeMain} strokeWidth={1.6 * weight} />
          {beads.map((b, i) => (
            <circle key={i} cx={b.x} cy={b.y} r={1.8 * Math.min(1.4, weight * 0.85)} fill={strokeMain} />
          ))}
          <circle cx="60" cy={cy} r={rInner} stroke={strokeMain} strokeWidth={1 * weight} opacity="0.85" />
        </g>
      );
    }

    if (effectiveRim === 'rope-twist') {
      const links = Array.from({ length: 28 }, (_, i) => (i * 360) / 28);
      return (
        <g>
          <circle cx="60" cy={cy} r={rOuter} stroke={strokeMain} strokeWidth={1.4 * weight} />
          {links.map((a) => (
            <ellipse
              key={a}
              cx="60"
              cy={cy - rOuter + 2.4}
              rx="3"
              ry="1.4"
              fill={strokeMain}
              transform={`rotate(${a} 60 ${cy}) rotate(35 60 ${cy - rOuter + 2.4})`}
            />
          ))}
          <circle cx="60" cy={cy} r={rInner} stroke={strokeMain} strokeWidth={1 * weight} />
        </g>
      );
    }

    if (effectiveRim === 'scalloped-wax') {
      const bumps = Array.from({ length: 18 }, (_, i) => (i * 360) / 18);
      return (
        <g>
          {bumps.map((a) => (
            <circle
              key={a}
              cx="60"
              cy={cy - rOuter + 0.5}
              r="3.8"
              fill={strokeMain}
              opacity="0.9"
              transform={`rotate(${a} 60 ${cy})`}
            />
          ))}
          <circle cx="60" cy={cy} r={rOuter - 1.5} stroke={highlightColor} strokeWidth={1.1 * weight} opacity="0.85" />
          <circle cx="60" cy={cy} r={rInner} stroke={strokeMain} strokeWidth={1 * weight} />
        </g>
      );
    }

    // double-bevel default
    return (
      <g>
        <circle cx="60" cy={cy} r={rOuter} stroke={strokeMain} strokeWidth={2.2 * weight} />
        <circle cx="60" cy={cy} r={rOuter - 2.6} stroke={highlightColor} strokeWidth={0.7} opacity="0.7" />
        <circle cx="60" cy={cy} r={rInner} stroke={strokeMain} strokeWidth={1 * weight} opacity="0.88" />
      </g>
    );
  };

  // Determine inner center icon & monogram sizing cleanly
  const effectiveCenterMode: CrestCenterMode =
    crestCenterMode === 'custom-image' && !customLogoDataUrl ? 'icon-monogram' : crestCenterMode;

  const renderCenterpiece = () => {
    if (effectiveCenterMode === 'custom-image' && customLogoDataUrl) {
      const imgSize = rInner * 1.56;
      return (
        <g clipPath={`url(#${centerClipId})`}>
          <image
            href={customLogoDataUrl}
            x={60 - imgSize / 2}
            y={cy - imgSize / 2}
            width={imgSize}
            height={imgSize}
            preserveAspectRatio="xMidYMid meet"
            filter={customLogoFullColor || isWatermark ? undefined : `url(#${tintFilterId})`}
          />
        </g>
      );
    }

    if (effectiveCenterMode === 'icon-only') {
      const iconScale = (rInner * 1.32) / 40;
      return (
        <g transform={`translate(${60 - 20 * iconScale}, ${cy - 20 * iconScale}) scale(${iconScale})`}>
          <SculptedCenterIcon
            iconId={crestCenterIcon}
            color={isSolidFill ? coreBgHex : accentColor}
            highlight={coreHighlight}
            size={40}
          />
        </g>
      );
    }

    if (effectiveCenterMode === 'icon-monogram') {
      const iconScale = (rInner * 0.72) / 40;
      const iconY = cy - rInner * 0.56;
      const textY = cy + rInner * 0.45;
      const fontSize = monogram.length > 2 ? Math.max(13, rInner * 0.42) : Math.max(15, rInner * 0.54);
      return (
        <g>
          <g transform={`translate(${60 - 20 * iconScale}, ${iconY}) scale(${iconScale})`}>
            <SculptedCenterIcon
              iconId={crestCenterIcon}
              color={isSolidFill ? coreBgHex : accentColor}
              highlight={coreHighlight}
              size={40}
            />
          </g>
          <line
            x1={60 - rInner * 0.48}
            y1={cy + rInner * 0.06}
            x2={60 + rInner * 0.48}
            y2={cy + rInner * 0.06}
            stroke={coreInk}
            strokeWidth="0.8"
            opacity="0.6"
          />
          <text
            x="60"
            y={textY}
            textAnchor="middle"
            fill={coreInk}
            style={{
              fontFamily: displayFont,
              fontWeight: 800,
              fontSize: `${fontSize}px`,
              letterSpacing: '0.06em',
            }}
          >
            {monogram}
          </text>
        </g>
      );
    }

    // monogram-only
    const fontSize = monogram.length > 2 ? Math.max(16, rInner * 0.56) : Math.max(20, rInner * 0.74);
    return (
      <text
        x="60"
        y={cy + fontSize * 0.34}
        textAnchor="middle"
        fill={coreInk}
        style={{
          fontFamily: displayFont,
          fontWeight: 800,
          fontSize: `${fontSize}px`,
          letterSpacing: '0.05em',
        }}
      >
        {monogram}
      </text>
    );
  };

  const textArcRadius = rOuter - 6.8;

  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={metalGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={secondaryColor} />
          <stop offset="32%" stopColor={highlightColor} />
          <stop offset="58%" stopColor={accentColor} />
          <stop offset="100%" stopColor={secondaryColor} />
        </linearGradient>

        <radialGradient id={darkCoreGradId} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#26332D" />
          <stop offset="55%" stopColor={coreBgHex} />
          <stop offset="100%" stopColor="#070B09" />
        </radialGradient>

        <linearGradient id={bevelGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.26" />
        </linearGradient>

        <filter id={shadowFilterId} x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.2" floodColor="#000000" floodOpacity="0.48" />
        </filter>

        <filter id={tintFilterId} colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" />
          <feFlood floodColor={accentColor} floodOpacity="0.88" result="flood" />
          <feComposite in="flood" in2="SourceAlpha" operator="in" result="tinted" />
          <feBlend in="tinted" in2="SourceGraphic" mode="screen" />
        </filter>

        <clipPath id={centerClipId}>
          <circle cx="60" cy={cy} r={Math.max(12, rInner - 2)} />
        </clipPath>

        {/* Curved Arc Paths for Top & Bottom Ring Text */}
        <path
          id={topArcId}
          d={`M ${60 - textArcRadius} ${cy} A ${textArcRadius} ${textArcRadius} 0 1 1 ${60 + textArcRadius} ${cy}`}
        />
        <path
          id={botArcId}
          d={`M ${60 - textArcRadius} ${cy + 1.5} A ${textArcRadius} ${textArcRadius} 0 1 0 ${60 + textArcRadius} ${cy + 1.5}`}
        />
      </defs>

      <g filter={isWatermark ? undefined : `url(#${shadowFilterId})`}>
        {/* Layer 1: Signature Frame Ornament */}
        {renderOuterFrame()}

        {/* Layer 2: Solid Dimensional Medallion Core */}
        <circle
          cx="60"
          cy={cy}
          r={rOuter}
          fill={coreFill}
          fillOpacity={isWatermark ? 0 : 1}
        />

        {/* Subtle 3D Bevel Lighting Overlay on Coin / Enamel Modes */}
        {!isWatermark && (isEmbossedCoin || isEnamelInlay || isSolidFill) && (
          <circle cx="60" cy={cy} r={rInner} fill={`url(#${bevelGradId})`} opacity="0.65" />
        )}

        {/* Layer 3: Seal Rim Border */}
        {renderSealRimBorder()}

        {/* Layer 4: Curved Ring Text (Top & Bottom) */}
        {!isWatermark && crestRingTextTop?.trim() && (
          <text
            fill={isSolidFill ? coreBgHex : highlightColor}
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 700,
              fontSize: '6.3px',
              letterSpacing: '0.16em',
            }}
          >
            <textPath href={`#${topArcId}`} startOffset="50%" textAnchor="middle">
              {crestRingTextTop.trim().toUpperCase().slice(0, 24)}
            </textPath>
          </text>
        )}
        {!isWatermark && crestRingTextBottom?.trim() && (
          <text
            fill={isSolidFill ? coreBgHex : highlightColor}
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 700,
              fontSize: '6.1px',
              letterSpacing: '0.16em',
            }}
          >
            <textPath href={`#${botArcId}`} startOffset="50%" textAnchor="middle">
              {crestRingTextBottom.trim().toUpperCase().slice(0, 24)}
            </textPath>
          </text>
        )}

        {/* Layer 5: Centerpiece (Icon + Monogram, Icon Only, Monogram, or Custom Uploaded Logo) */}
        {renderCenterpiece()}

        {/* Layer 6: Animated Live Sheen Gloss Sweep */}
        {!isWatermark && crestLiveSheen && (
          <g clipPath={`url(#${centerClipId})`} opacity="0.65">
            <rect
              x="10"
              y={cy - rOuter}
              width="22"
              height={rOuter * 2.2}
              fill="rgba(255,255,255,0.42)"
              className="seal-sheen-sweep"
            />
          </g>
        )}
      </g>
    </svg>
  );
};

interface PostageStampEmblemProps {
  goldColor: string;
  paperColor: string;
  inkColor: string;
  monogram?: string;
  brandSub?: string;
  displayFont?: string;
  stampIcons?: [CraftSymbolId, CraftSymbolId, CraftSymbolId];
  customLogoDataUrl?: string;
  crestCenterMode?: CrestCenterMode;
  crestCenterIcon?: CrestCenterIconId;
  className?: string;
}

export const PostageStampEmblem: React.FC<PostageStampEmblemProps> = ({
  goldColor,
  paperColor,
  inkColor,
  monogram = 'SA',
  brandSub = 'SA BROTHERS',
  displayFont = "'Playfair Display', Georgia, serif",
  stampIcons = ['stamp-paper', 'round-seal', 'fountain-pen'],
  customLogoDataUrl = '',
  crestCenterMode = 'icon-monogram',
  crestCenterIcon = 'scales',
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const maskId = `stamp-perforation-mask-${uid}`;
  const horizNotches = Array.from({ length: 11 }, (_, i) => 16 + i * 16.8);
  const vertNotches = Array.from({ length: 13 }, (_, i) => 16 + i * 16.5);
  const firstChar = monogram.slice(0, 1) || 'S';
  const secondChar = monogram.slice(1, 2) || 'A';

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 200 230" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full drop-shadow-md" aria-hidden="true">
        <defs>
          <mask id={maskId}>
            <rect x="6" y="6" width="188" height="218" rx="2" fill="white" />
            {horizNotches.map((cx, idx) => (
              <React.Fragment key={`h-${idx}`}>
                <circle cx={cx} cy="6" r="4.2" fill="black" />
                <circle cx={cx} cy="224" r="4.2" fill="black" />
              </React.Fragment>
            ))}
            {vertNotches.map((cy, idx) => (
              <React.Fragment key={`v-${idx}`}>
                <circle cx="6" cy={cy} r="4.2" fill="black" />
                <circle cx="194" cy={cy} r="4.2" fill="black" />
              </React.Fragment>
            ))}
          </mask>
        </defs>
        <g mask={`url(#${maskId})`}>
          <rect x="6" y="6" width="188" height="218" fill={goldColor} />
        </g>
        <rect x="17" y="17" width="166" height="196" fill={paperColor} />
        <rect x="22" y="22" width="156" height="186" stroke={inkColor} strokeWidth="0.9" opacity="0.7" />
        <rect x="26" y="26" width="148" height="178" stroke={inkColor} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.45" />

        {crestCenterMode === 'custom-image' && customLogoDataUrl ? (
          <image href={customLogoDataUrl} x="46" y="34" width="108" height="88" preserveAspectRatio="xMidYMid meet" />
        ) : crestCenterMode === 'icon-only' ? (
          <g transform="translate(64, 42) scale(1.8)">
            <SculptedCenterIcon iconId={crestCenterIcon} color={inkColor} highlight={goldColor} size={40} />
          </g>
        ) : (
          <>
            <text x="76" y="108" textAnchor="middle" fill={inkColor} style={{ fontFamily: displayFont, fontWeight: 800, fontSize: '74px' }}>
              {firstChar}
            </text>
            <text x="124" y="112" textAnchor="middle" fill="none" stroke={goldColor} strokeWidth="2.1" style={{ fontFamily: displayFont, fontWeight: 700, fontSize: '72px' }}>
              {secondChar}
            </text>
          </>
        )}

        <line x1="36" y1="138" x2="54" y2="138" stroke={goldColor} strokeWidth="1.2" />
        <text x="100" y="141" textAnchor="middle" fill={inkColor} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '9px', letterSpacing: '0.22em' }}>
          {brandSub.slice(0, 14).toUpperCase()}
        </text>
        <line x1="146" y1="138" x2="164" y2="138" stroke={goldColor} strokeWidth="1.2" />
      </svg>

      <div className="pointer-events-none absolute right-[18%] bottom-[14.5%] left-[18%] flex items-center justify-between">
        {stampIcons.map((sym, idx) => (
          <CraftIconSvg key={`${sym}-${idx}`} symbol={sym} primaryColor={inkColor} accentColor={goldColor} size={20} className="h-4 w-4 sm:h-5 sm:w-5" />
        ))}
      </div>
    </div>
  );
};

export const CrestPreviewThumb: React.FC<{
  crestId: CrestStyleId;
  color: string;
  monogram?: string;
  crestFinish?: CrestFinishMode;
  crestCenterMode?: CrestCenterMode;
  crestCenterIcon?: CrestCenterIconId;
  crestRimBorder?: CrestRimBorderId;
  customLogoDataUrl?: string;
}> = ({
  crestId,
  color,
  monogram = 'SA',
  crestFinish = '3d-embossed-coin',
  crestCenterMode = 'icon-monogram',
  crestCenterIcon = 'scales',
  crestRimBorder = 'double-bevel',
  customLogoDataUrl = '',
}) => {
  if (crestId === 'postage-stamp') {
    return (
      <PostageStampEmblem
        goldColor={color}
        paperColor="#FAF7F0"
        inkColor="#141413"
        monogram={monogram}
        customLogoDataUrl={customLogoDataUrl}
        crestCenterMode={crestCenterMode}
        crestCenterIcon={crestCenterIcon}
        className="h-10 w-8"
      />
    );
  }
  if (crestId === 'none') {
    return <span className="text-[10px] font-bold tracking-widest opacity-50">OFF</span>;
  }
  const effectiveId = crestId === 'auto' ? 'notary-rosette' : crestId;
  return (
    <LuxuryCrestSvg
      crestId={effectiveId}
      accentColor={color}
      highlightColor="#FFF2BF"
      monogram={monogram}
      crestFinish={crestFinish}
      crestCenterMode={crestCenterMode}
      crestCenterIcon={crestCenterIcon}
      crestRimBorder={crestRimBorder}
      customLogoDataUrl={customLogoDataUrl}
      className="h-10 w-10"
      foilGradient
    />
  );
};

export const GuillocheMesh: React.FC<{
  color: string;
  opacity?: number;
  className?: string;
}> = ({ color, opacity = 0.16, className = '' }) => {
  const curves = Array.from({ length: 18 }, (_, i) => i * 24);
  return (
    <svg viewBox="0 0 700 400" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} preserveAspectRatio="none" aria-hidden="true">
      <g opacity={opacity} stroke={color} strokeWidth="0.8">
        {curves.map((offset) => (
          <path key={`a-${offset}`} d={`M ${260 + offset * 0.8} -40 Q ${450 + offset * 0.4} 200 ${210 + offset * 0.9} 440`} />
        ))}
        {curves.map((offset) => (
          <path key={`b-${offset}`} d={`M ${180 + offset * 1.1} 420 Q ${480} ${180 - offset * 0.3} 740 ${40 + offset * 0.9}`} />
        ))}
      </g>
    </svg>
  );
};
