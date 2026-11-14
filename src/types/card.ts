export type CardThemeId =
  | 'emerald-gold'
  | 'royal-sapphire'
  | 'tiffany-rosegold'
  | 'maharaja-ruby'
  | 'pearl-champagne'
  | 'white-marble-cobalt'
  | 'bullion-gold-onyx'
  | 'amethyst-silver'
  | 'obsidian-gold'
  | 'terracotta-ivory'
  | 'titanium-ice'
  | 'ivory-crimson';

export type CardDesignId =
  | 'sovereign-stamp'
  | 'royal-notary'
  | 'treasury-guilloche'
  | 'savile-monogram'
  | 'heritage-ledger'
  | 'art-deco-gilded'
  | 'imperial-crest-center'
  | 'diplomatic-ribbon'
  | 'atelier-letterpress'
  | 'court-charter'
  | 'mughal-arch'
  | 'obsidian-monolith'
  | 'emerald-split-horizon'
  | 'notary-ribbon-badge'
  | 'vault-microgrid'
  | 'mughal-darbar'
  | 'royal-stamp-charter'
  | 'crescent-guild'
  | 'karachi-heritage-press'
  | 'sovereign-blackcard';

export type CardBorderStyle =
  | 'double-hairline'
  | 'corner-filigree'
  | 'art-deco-stepped'
  | 'mughal-arabesque'
  | 'security-dashed'
  | 'solid-foil-band'
  | 'beveled-triple'
  | 'clean-edge';

export type CardFontThemeId =
  | 'playfair-jakarta'
  | 'cinzel-manrope'
  | 'cormorant-dm'
  | 'bodoni-montserrat'
  | 'baskerville-jakarta';

export type FontFamilyId =
  | 'playfair'
  | 'cinzel'
  | 'cinzel-deco'
  | 'cormorant'
  | 'bodoni'
  | 'baskerville'
  | 'prata'
  | 'yeseva'
  | 'abril'
  | 'italiana'
  | 'marcellus'
  | 'dm-serif'
  | 'lora'
  | 'great-vibes'
  | 'alex-brush'
  | 'syne'
  | 'outfit'
  | 'jakarta'
  | 'montserrat'
  | 'mono';

export type TextSlotKey =
  | 'companyName'
  | 'subtitle'
  | 'tagline'
  | 'contactName'
  | 'contactPhone'
  | 'address'
  | 'badge';

export type TextMagicEffect = 'solid' | 'foil-gradient' | 'embossed' | 'glow';

export interface TextElementStyle {
  fontId: FontFamilyId;
  scale: number; // 0.70 to 1.40
  italic: boolean;
  uppercase: boolean;
  tracking: number; // -0.04 to 0.32 em
  textEffect: TextMagicEffect;
  colorOverride?: string; // empty string = theme default
}

export type CardTypographyMap = Record<TextSlotKey, TextElementStyle>;

export type CrestStyleId =
  | 'auto'
  | 'postage-stamp'
  | 'notary-rosette'
  | 'crown-crest'
  | 'wax-seal'
  | 'mughal-arch'
  | 'art-deco-diamond'
  | 'heraldic-shield'
  | 'crescent-star'
  | 'sunburst-medallion'
  | 'octagon-vault'
  | 'laurel-sovereign'
  | 'justice-scales-seal'
  | 'calatrava-cross'
  | 'cartouche-oval'
  | 'fountain-quill-guild'
  | 'mughal-lotus-mandala'
  | 'banknote-oval'
  | 'signet-hex-crest'
  | 'winged-hermes-crest'
  | 'ribbon-wax-award'
  | 'compass-star-guild'
  | 'chopard-wreath-crest'
  | 'double-diamond-atelier'
  | 'arch-pillar-seal'
  | 'none';

export type CrestFinishMode =
  | '3d-embossed-coin'
  | 'enamel-inlay'
  | 'solid-foil'
  | 'fine-engraved';

export type CrestCenterMode =
  | 'icon-monogram'
  | 'icon-only'
  | 'monogram-only'
  | 'custom-image';

export type CrestCenterIconId =
  | 'scales'
  | 'crown'
  | 'stamp-press'
  | 'fountain-nib'
  | 'shield-star'
  | 'diamond-gem'
  | 'quill-scroll'
  | 'pillar-court'
  | 'briefcase'
  | 'shop-front'
  | 'crescent-royal'
  | 'lotus-crest';

export type CrestRimBorderId =
  | 'auto'
  | 'double-bevel'
  | 'milled-coin'
  | 'pearl-bezel'
  | 'rope-twist'
  | 'scalloped-wax'
  | 'none';

export type CraftSymbolId =
  | 'stamp-paper'
  | 'round-seal'
  | 'fountain-pen'
  | 'scales'
  | 'inkwell'
  | 'briefcase'
  | 'star-rosette'
  | 'diamond'
  | 'scroll'
  | 'pillar';

export type ContactIconId = 'phone' | 'whatsapp' | 'diamond' | 'star' | 'none';
export type AddressIconId = 'pin' | 'compass' | 'building' | 'none';
export type ServiceBulletId = 'diamond' | 'check' | 'star' | 'arrow' | 'dash';

export interface CardSymbolsConfig {
  crestStyle: CrestStyleId;
  crestScale: number;
  crestFoilGradient: boolean;
  crestFinish: CrestFinishMode;
  crestCenterMode: CrestCenterMode;
  crestCenterIcon: CrestCenterIconId;
  crestRimBorder: CrestRimBorderId;
  crestStrokeWeight: number;
  crestRingTextTop: string;
  crestRingTextBottom: string;
  crestLiveSheen: boolean;
  customLogoDataUrl: string;
  customLogoFullColor: boolean;
  watermarkCrest: CrestStyleId;
  watermarkOpacity: number;
  stampIcons: [CraftSymbolId, CraftSymbolId, CraftSymbolId];
  contactIcon: ContactIconId;
  addressIcon: AddressIconId;
  serviceBullet: ServiceBulletId;
}

export type FoilFinishEffect =
  | 'brushed-gold'
  | 'holographic-prism'
  | 'embossed-relief'
  | 'mirror-foil';

export type BackgroundPatternId =
  | 'auto'
  | 'none'
  | 'guilloche'
  | 'concentric'
  | 'diamond-lattice'
  | 'microgrid';

export interface CardMagicConfig {
  foilEffect: FoilFinishEffect;
  foilIntensity: number;
  pattern: BackgroundPatternId;
  patternOpacity: number;
  securityHologram: boolean;
  foilBorderShimmer: boolean;
  qrCenterMonogram: boolean;
  qrDarkColor: string;
  autoShowcase: boolean;
}

export type CardCornerStyle = 'sharp' | 'classic' | 'soft' | 'chamfered' | 'notched';

export interface CardFontTheme {
  id: CardFontThemeId;
  name: string;
  subtitle: string;
  displayFont: string;
  bodyFont: string;
  defaultDisplayId: FontFamilyId;
  defaultBodyId: FontFamilyId;
}

export interface CardBorderPreset {
  id: CardBorderStyle;
  name: string;
  note: string;
}

export interface CardDesignPreset {
  id: CardDesignId;
  name: string;
  subtitle: string;
  category: 'Traditional' | 'Heritage' | 'Executive' | 'Architectural';
  description: string;
  recommendedTheme: CardThemeId;
  recommendedBorder: CardBorderStyle;
}

export interface CardContact {
  id: string;
  name: string;
  role: string;
  phone: string;
}

export interface CardDetails {
  companyName: string;
  monogram: string;
  subtitle: string;
  tagline: string;
  cardLabel: string;
  qrLabel: string;
  qrSublabel: string;
  contacts: CardContact[];
  address: string;
  locationUrl: string;
  services: string[];
}

export interface CardTheme {
  id: CardThemeId;
  name: string;
  finishNote: string;
  surfaceBg: string;
  surfaceGradient: string;
  cardBgHex: string;
  cardBgEndHex: string;
  creamPaperHex: string;
  creamInkHex: string;
  accentHex: string;
  accentHighlightHex: string;
  accentMutedHex: string;
  foilGradient: string;
  textPrimaryHex: string;
  textSecondaryHex: string;
  borderHex: string;
  isDark: boolean;
}

export interface SavedCardPreset {
  id: string;
  name: string;
  savedAt: string;
  designId: CardDesignId;
  themeId: CardThemeId;
  borderStyle: CardBorderStyle;
  fontThemeId: CardFontThemeId;
  cornerStyle: CardCornerStyle;
  details: CardDetails;
  typography: CardTypographyMap;
  symbols: CardSymbolsConfig;
  magic: CardMagicConfig;
}
