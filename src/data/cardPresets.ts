import {
  CardBorderPreset,
  CardDesignPreset,
  CardDetails,
  CardFontTheme,
  CardMagicConfig,
  CardSymbolsConfig,
  CardTheme,
  CardTypographyMap,
  CraftSymbolId,
  CrestCenterIconId,
  CrestFinishMode,
  CrestRimBorderId,
  CrestStyleId,
  FontFamilyId,
} from '../types/card';

export const DEFAULT_CARD_DETAILS: CardDetails = {
  companyName: 'SA Brothers Stamp Vendor',
  monogram: 'SA',
  subtitle: 'Est. Stamp Vendor · Authorized Dealer',
  tagline: 'We deals in Stamp Duties & Stationary & Office Items',
  cardLabel: 'Business Card',
  qrLabel: 'FIND US',
  qrSublabel: 'Scan for Google Maps location',
  contacts: [
    {
      id: 'salahuddin',
      name: 'Salahuddin',
      role: 'Proprietor',
      phone: '+923002634491',
    },
    {
      id: 'sikandar',
      name: 'M.Sikandar',
      role: 'Proprietor',
      phone: '+923401645979',
    },
  ],
  address: 'Shop#58, Site Market SITE Karachi.',
  locationUrl: 'https://share.google/8SbjoXRcRPsR8OW35',
  services: [
    'Judicial & Non-Judicial Stamp Papers',
    'Stamp Duties & Legal Documentation',
    'Corporate & Office Stationery',
    'Complete Office Items & Supplies',
  ],
};

export const FONT_FAMILY_OPTIONS: {
  id: FontFamilyId;
  name: string;
  css: string;
  canvas: string;
  category: string;
}[] = [
  { id: 'playfair', name: 'Playfair Display', css: "'Playfair Display', Georgia, serif", canvas: '"Playfair Display", Georgia, serif', category: 'Sculpted Serif' },
  { id: 'cinzel', name: 'Cinzel Roman', css: "'Cinzel', Georgia, serif", canvas: '"Cinzel", Georgia, serif', category: 'Imperial Engraved' },
  { id: 'cinzel-deco', name: 'Cinzel Decorative', css: "'Cinzel Decorative', Georgia, serif", canvas: '"Cinzel Decorative", Georgia, serif', category: 'Ornate Royal' },
  { id: 'cormorant', name: 'Cormorant Garamond', css: "'Cormorant Garamond', Georgia, serif", canvas: '"Cormorant Garamond", Georgia, serif', category: 'Parisian Couture' },
  { id: 'bodoni', name: 'Bodoni Moda', css: "'Bodoni Moda', Georgia, serif", canvas: '"Bodoni Moda", Georgia, serif', category: 'High-Fashion Didone' },
  { id: 'baskerville', name: 'Libre Baskerville', css: "'Libre Baskerville', Georgia, serif", canvas: '"Libre Baskerville", Georgia, serif', category: 'Judicial Charter' },
  { id: 'prata', name: 'Prata Luxury', css: "'Prata', Georgia, serif", canvas: '"Prata", Georgia, serif', category: 'Chiseled Display' },
  { id: 'yeseva', name: 'Yeseva One', css: "'Yeseva One', Georgia, serif", canvas: '"Yeseva One", Georgia, serif', category: 'Bold Heritage' },
  { id: 'abril', name: 'Abril Fatface', css: "'Abril Fatface', Georgia, serif", canvas: '"Abril Fatface", Georgia, serif', category: 'Dramatic Editorial' },
  { id: 'italiana', name: 'Italiana Couture', css: "'Italiana', Georgia, serif", canvas: '"Italiana", Georgia, serif', category: 'Milanese Thin' },
  { id: 'marcellus', name: 'Marcellus Classic', css: "'Marcellus', Georgia, serif", canvas: '"Marcellus", Georgia, serif', category: 'Roman Inscription' },
  { id: 'dm-serif', name: 'DM Serif Display', css: "'DM Serif Display', Georgia, serif", canvas: '"DM Serif Display", Georgia, serif', category: 'Magazine Headline' },
  { id: 'lora', name: 'Lora Archival', css: "'Lora', Georgia, serif", canvas: '"Lora", Georgia, serif', category: 'Warm Book Serif' },
  { id: 'great-vibes', name: 'Great Vibes Script', css: "'Great Vibes', cursive", canvas: '"Great Vibes", cursive', category: 'Royal Calligraphy' },
  { id: 'alex-brush', name: 'Alex Brush Script', css: "'Alex Brush', cursive", canvas: '"Alex Brush", cursive', category: 'Bespoke Signature' },
  { id: 'syne', name: 'Syne Avant-Garde', css: "'Syne', sans-serif", canvas: '"Syne", sans-serif', category: 'Luxury Atelier' },
  { id: 'outfit', name: 'Outfit Geometric', css: "'Outfit', sans-serif", canvas: '"Outfit", sans-serif', category: 'Modern Executive' },
  { id: 'jakarta', name: 'Plus Jakarta Sans', css: "'Plus Jakarta Sans', sans-serif", canvas: '"Plus Jakarta Sans", sans-serif', category: 'Architectural Sans' },
  { id: 'montserrat', name: 'Montserrat Boutique', css: "'Montserrat', sans-serif", canvas: '"Montserrat", sans-serif', category: 'Fashion House' },
  { id: 'mono', name: 'JetBrains Mono', css: "'JetBrains Mono', monospace", canvas: '"JetBrains Mono", monospace', category: 'Tabular Precision' },
];

export function getFontCss(id: FontFamilyId): string {
  return FONT_FAMILY_OPTIONS.find((f) => f.id === id)?.css ?? FONT_FAMILY_OPTIONS[0].css;
}

export function getFontCanvas(id: FontFamilyId): string {
  return FONT_FAMILY_OPTIONS.find((f) => f.id === id)?.canvas ?? FONT_FAMILY_OPTIONS[0].canvas;
}

export const DEFAULT_TYPOGRAPHY_MAP: CardTypographyMap = {
  companyName: {
    fontId: 'playfair',
    scale: 1,
    italic: false,
    uppercase: true,
    tracking: 0.01,
    textEffect: 'solid',
    colorOverride: '',
  },
  subtitle: {
    fontId: 'montserrat',
    scale: 1,
    italic: false,
    uppercase: true,
    tracking: 0.22,
    textEffect: 'foil-gradient',
    colorOverride: '',
  },
  tagline: {
    fontId: 'cormorant',
    scale: 1,
    italic: true,
    uppercase: false,
    tracking: 0.01,
    textEffect: 'solid',
    colorOverride: '',
  },
  contactName: {
    fontId: 'jakarta',
    scale: 1,
    italic: false,
    uppercase: false,
    tracking: 0.02,
    textEffect: 'solid',
    colorOverride: '',
  },
  contactPhone: {
    fontId: 'mono',
    scale: 1,
    italic: false,
    uppercase: false,
    tracking: 0.02,
    textEffect: 'solid',
    colorOverride: '',
  },
  address: {
    fontId: 'jakarta',
    scale: 1,
    italic: false,
    uppercase: false,
    tracking: 0.01,
    textEffect: 'solid',
    colorOverride: '',
  },
  badge: {
    fontId: 'cinzel',
    scale: 1,
    italic: false,
    uppercase: true,
    tracking: 0.2,
    textEffect: 'foil-gradient',
    colorOverride: '',
  },
};

export type CrestCategory =
  | 'All'
  | 'Royal & Heraldic'
  | 'Legal & Stamp'
  | 'Couture & Watch'
  | 'Traditional';

export const CREST_STYLE_OPTIONS: {
  id: CrestStyleId;
  label: string;
  note: string;
  category: Exclude<CrestCategory, 'All'> | 'System';
}[] = [
  { id: 'auto', label: 'Design Default', note: 'Native crest for card', category: 'System' },
  { id: 'postage-stamp', label: 'Revenue Stamp', note: 'Perforated stamp badge', category: 'Legal & Stamp' },
  { id: 'notary-rosette', label: 'Notary Rosette', note: '28-tooth precision seal', category: 'Legal & Stamp' },
  { id: 'justice-scales-seal', label: 'High Court Scales', note: 'Scales of justice seal', category: 'Legal & Stamp' },
  { id: 'banknote-oval', label: 'Treasury Oval Seal', note: 'Central-bank guilloché oval', category: 'Legal & Stamp' },
  { id: 'arch-pillar-seal', label: 'Supreme Court Pillars', note: 'Fluted columns & pediment', category: 'Legal & Stamp' },
  { id: 'fountain-quill-guild', label: 'Calligraphy Quill', note: 'Gold fountain nib & crest', category: 'Legal & Stamp' },
  { id: 'wax-seal', label: 'Molten Wax Seal', note: 'Organic scalloped wax stamp', category: 'Royal & Heraldic' },
  { id: 'ribbon-wax-award', label: 'Ribbon Wax Award', note: 'Wax seal & twin tails', category: 'Royal & Heraldic' },
  { id: 'crown-crest', label: 'Royal Crown', note: 'Crown over laurel ring', category: 'Royal & Heraldic' },
  { id: 'laurel-sovereign', label: 'Imperial Laurel Wreath', note: 'Twin olive branches & star', category: 'Royal & Heraldic' },
  { id: 'heraldic-shield', label: 'Heraldic Shield', note: 'Merchant guild coat-of-arms', category: 'Royal & Heraldic' },
  { id: 'winged-hermes-crest', label: 'Winged Sovereign', note: 'Royal wings & shield crest', category: 'Royal & Heraldic' },
  { id: 'sunburst-medallion', label: 'Imperial Sunburst', note: '24-ray royal medallion', category: 'Royal & Heraldic' },
  { id: 'calatrava-cross', label: 'Geneva Watch Cross', note: 'Horology fleur-de-lis cross', category: 'Couture & Watch' },
  { id: 'cartouche-oval', label: 'Louis XIV Cartouche', note: 'Baroque beaded cameo frame', category: 'Couture & Watch' },
  { id: 'signet-hex-crest', label: 'Gemstone Signet', note: 'Faceted hexagonal bezel', category: 'Couture & Watch' },
  { id: 'chopard-wreath-crest', label: 'Couture Twin-Ring', note: 'Haute couture double ring', category: 'Couture & Watch' },
  { id: 'double-diamond-atelier', label: 'Atelier Double Diamond', note: 'Nested Cartier-style frame', category: 'Couture & Watch' },
  { id: 'art-deco-diamond', label: 'Art Deco Diamond', note: 'Gatsby geometric crest', category: 'Couture & Watch' },
  { id: 'octagon-vault', label: 'Octagon Vault', note: 'Swiss watch-bezel seal', category: 'Couture & Watch' },
  { id: 'compass-star-guild', label: 'North Star Compass', note: '8-point navigator rosette', category: 'Couture & Watch' },
  { id: 'mughal-arch', label: 'Mughal Archway', note: 'Traditional pointed arch', category: 'Traditional' },
  { id: 'mughal-lotus-mandala', label: 'Mughal 16-Petal Lotus', note: 'Royal darbar lotus mandala', category: 'Traditional' },
  { id: 'crescent-star', label: 'Crescent & Star', note: 'Traditional ornate crescent', category: 'Traditional' },
  { id: 'clean-logo', label: 'Clean Vector Logo', note: 'Frameless transparent canvas logo', category: 'System' },
  { id: 'none', label: 'Hide Crest', note: 'Pure typography only', category: 'System' },
];

export const CRAFT_SYMBOL_OPTIONS: { id: CraftSymbolId; label: string }[] = [
  { id: 'stamp-paper', label: 'Stamp Paper' },
  { id: 'round-seal', label: 'Notary Seal' },
  { id: 'fountain-pen', label: 'Fountain Pen' },
  { id: 'scales', label: 'Justice Scales' },
  { id: 'inkwell', label: 'Brass Inkwell' },
  { id: 'briefcase', label: 'Office Case' },
  { id: 'star-rosette', label: 'Crown Star' },
  { id: 'diamond', label: 'Royal Diamond' },
  { id: 'scroll', label: 'Legal Scroll' },
  { id: 'pillar', label: 'Court Pillar' },
];

export const CREST_FINISH_OPTIONS: {
  id: CrestFinishMode;
  label: string;
  note: string;
}[] = [
  { id: '3d-embossed-coin', label: '3D Embossed Coin', note: 'Solid metallic relief & recessed core' },
  { id: 'enamel-inlay', label: 'Royal Enamel Inlay', note: 'Rich jewel dial core + bullion rim' },
  { id: 'solid-foil', label: 'Solid Hot-Foil', note: 'Heavy stamped bullion fill' },
  { id: 'fine-engraved', label: 'Fine Currency Line', note: 'Classic banknote engraving' },
];

export const CREST_CENTER_ICON_OPTIONS: {
  id: CrestCenterIconId;
  label: string;
}[] = [
  { id: 'scales', label: 'Justice Scales' },
  { id: 'crown', label: 'Royal Crown' },
  { id: 'stamp-press', label: 'Stamp Press' },
  { id: 'fountain-nib', label: 'Fountain Nib' },
  { id: 'shield-star', label: 'Guild Shield' },
  { id: 'diamond-gem', label: 'Royal Diamond' },
  { id: 'quill-scroll', label: 'Charter Scroll' },
  { id: 'pillar-court', label: 'Court Pillars' },
  { id: 'briefcase', label: 'Executive Case' },
  { id: 'shop-front', label: 'Merchant House' },
  { id: 'crescent-royal', label: 'Hilal Crescent' },
  { id: 'lotus-crest', label: 'Royal Lotus' },
];

export const CREST_RIM_BORDER_OPTIONS: {
  id: CrestRimBorderId;
  label: string;
  note: string;
}[] = [
  { id: 'auto', label: 'Seal Native', note: 'Frame default' },
  { id: 'double-bevel', label: 'Double Bevel Ring', note: 'Heavy outer + fine inner' },
  { id: 'milled-coin', label: 'Milled Coin Edge', note: 'Precision gear teeth' },
  { id: 'pearl-bezel', label: 'Pearl Gem Bezel', note: '24 metallic gold beads' },
  { id: 'rope-twist', label: 'Twisted Gold Rope', note: 'Braided jeweler rim' },
  { id: 'scalloped-wax', label: 'Wax Seal Collar', note: 'Pressed wax perimeter' },
  { id: 'none', label: 'Open Core', note: 'No extra ring border' },
];

export const DEFAULT_SYMBOLS_CONFIG: CardSymbolsConfig = {
  crestStyle: 'auto',
  crestScale: 1,
  crestFoilGradient: true,
  crestFinish: '3d-embossed-coin',
  crestCenterMode: 'icon-monogram',
  crestCenterIcon: 'scales',
  crestRimBorder: 'double-bevel',
  crestStrokeWeight: 1.6,
  crestRingTextTop: '',
  crestRingTextBottom: '',
  crestLiveSheen: true,
  customLogoDataUrl: '',
  customLogoFullColor: false,
  customLogoVariant: 'full',
  customLogoOffsetX: 0,
  customLogoOffsetY: 0,
  customLogoRotation: 0,
  customLogoOpacity: 100,
  customLogoFlipX: false,
  watermarkCrest: 'none',
  watermarkOpacity: 12,
  stampIcons: ['stamp-paper', 'round-seal', 'fountain-pen'],
  contactIcon: 'phone',
  addressIcon: 'pin',
  serviceBullet: 'diamond',
};

export const DEFAULT_MAGIC_CONFIG: CardMagicConfig = {
  foilEffect: 'brushed-gold',
  foilIntensity: 80,
  pattern: 'auto',
  patternOpacity: 22,
  securityHologram: false,
  foilBorderShimmer: true,
  qrCenterMonogram: true,
  qrDarkColor: '#112E22',
  autoShowcase: false,
};

export const CARD_DESIGNS: CardDesignPreset[] = [
  {
    id: 'sovereign-stamp',
    name: '01. Sovereign Revenue Stamp',
    subtitle: 'Perforated Stamp Crest & Tear-Edge Back',
    category: 'Traditional',
    description:
      'Signature perforated metallic stamp frame with interlocking monogram and craft icons on front; perforated parchment split with phone medallions and QR on back.',
    recommendedTheme: 'emerald-gold',
    recommendedBorder: 'double-hairline',
  },
  {
    id: 'mughal-darbar',
    name: '02. Mughal Darbar Illumination',
    subtitle: 'Royal Arch Frame & Dual Corner Medallions',
    category: 'Traditional',
    description:
      'Traditional South Asian royal court card framed by ornamental filigree arches, twin rosettes, and centered calligraphic authority.',
    recommendedTheme: 'maharaja-ruby',
    recommendedBorder: 'mughal-arabesque',
  },
  {
    id: 'royal-stamp-charter',
    name: '03. Royal Stamp Charter & Wax',
    subtitle: 'Official Stamp Masthead & Molten Wax Seal',
    category: 'Traditional',
    description:
      'Authentic judicial stamp-paper masthead above a crisp two-column contact charter anchored by a molten wax seal crest.',
    recommendedTheme: 'pearl-champagne',
    recommendedBorder: 'beveled-triple',
  },
  {
    id: 'crescent-guild',
    name: '04. Crescent & Guild Rosette',
    subtitle: 'Heritage Merchant Guild Symmetry',
    category: 'Traditional',
    description:
      'Traditional merchant guild composition featuring a prominent crescent-and-star seal, fine engraved rules, and regal typography.',
    recommendedTheme: 'emerald-gold',
    recommendedBorder: 'corner-filigree',
  },
  {
    id: 'karachi-heritage-press',
    name: '05. Karachi Heritage Press',
    subtitle: 'Engraved Ribbon Banner & Woodcut Frame',
    category: 'Traditional',
    description:
      'Classic letterpress layout with a gilded top nameplate banner, heraldic shield crest, and structured SITE Market footer.',
    recommendedTheme: 'terracotta-ivory',
    recommendedBorder: 'double-hairline',
  },
  {
    id: 'royal-notary',
    name: '06. Royal Notary & Wax Seal',
    subtitle: 'Engraved Rosette Seal & Filigree Frame',
    category: 'Heritage',
    description:
      'Commanding architectural front with corner filigree brackets and circular notary rosette seal, paired with a crisp service & QR reverse.',
    recommendedTheme: 'obsidian-gold',
    recommendedBorder: 'corner-filigree',
  },
  {
    id: 'treasury-guilloche',
    name: '07. Treasury Banknote',
    subtitle: 'Central-Bank Security Certificate',
    category: 'Heritage',
    description:
      'Inspired by judicial stamp certificates with sweeping guilloche lattice, symmetrical crest lockup, and executive contact columns.',
    recommendedTheme: 'royal-sapphire',
    recommendedBorder: 'security-dashed',
  },
  {
    id: 'savile-monogram',
    name: '08. Architectural Monogram',
    subtitle: 'Savile Row Split & Foil Monogram',
    category: 'Architectural',
    description:
      'Crisp left-rail framed monogram panel balanced by sculpted display typography and sleek contact rule dividers.',
    recommendedTheme: 'white-marble-cobalt',
    recommendedBorder: 'clean-edge',
  },
  {
    id: 'heritage-ledger',
    name: '09. Heritage Karachi Ledger',
    subtitle: 'Foil-Stamped Spine & Archival Paper',
    category: 'Heritage',
    description:
      'Two-tone tactile editorial card combining a solid foil-stamped left spine with warm archival cotton typography.',
    recommendedTheme: 'ivory-crimson',
    recommendedBorder: 'double-hairline',
  },
  {
    id: 'art-deco-gilded',
    name: '10. Art Deco Gatsby Vault',
    subtitle: 'Stepped Brass Chevrons & Sunburst Crest',
    category: 'Executive',
    description:
      '1920s luxury geometric framing with stepped Art Deco corners, sunburst diamond crest, and high-contrast vertical rules.',
    recommendedTheme: 'tiffany-rosegold',
    recommendedBorder: 'art-deco-stepped',
  },
  {
    id: 'imperial-crest-center',
    name: '11. Imperial Crest Sovereign',
    subtitle: 'Centered Crown Seal & Dual Contact Strip',
    category: 'Executive',
    description:
      'Regal symmetrical centerpiece layout anchored by an oversized top-center crown seal and balanced proprietor footer.',
    recommendedTheme: 'amethyst-silver',
    recommendedBorder: 'beveled-triple',
  },
  {
    id: 'diplomatic-ribbon',
    name: '12. Diplomatic Diagonal Sash',
    subtitle: 'Angled Foil Band & Asymmetric Layout',
    category: 'Executive',
    description:
      'Rare diplomatic stationery aesthetic featuring a diagonal metallic sash corner, bold offset brand lockup, and crisp contact grid.',
    recommendedTheme: 'royal-sapphire',
    recommendedBorder: 'double-hairline',
  },
  {
    id: 'atelier-letterpress',
    name: '13. Atelier Minimal Letterpress',
    subtitle: 'Ultra-Clean Breathing Space & Deboss Feel',
    category: 'Architectural',
    description:
      'Whisper-quiet luxury minimalism with generous margins, fine top-left crest, and razor-sharp bottom-aligned contact details.',
    recommendedTheme: 'bullion-gold-onyx',
    recommendedBorder: 'clean-edge',
  },
  {
    id: 'court-charter',
    name: '14. High Court Stamp Charter',
    subtitle: 'Solid Foil Header Band & Legal Ledger',
    category: 'Heritage',
    description:
      'Authoritative top charter banner carrying the firm title and crest over a bright parchment-toned contact ledger.',
    recommendedTheme: 'emerald-gold',
    recommendedBorder: 'solid-foil-band',
  },
  {
    id: 'mughal-arch',
    name: '15. Heritage Archway & Lattice',
    subtitle: 'Pointed Arch Medallion & Royal Symmetry',
    category: 'Traditional',
    description:
      'Architectural pointed archway framing the monogram emblem, honoring classic South Asian stamp and court calligraphy craft.',
    recommendedTheme: 'maharaja-ruby',
    recommendedBorder: 'mughal-arabesque',
  },
  {
    id: 'obsidian-monolith',
    name: '16. Obsidian Monolith',
    subtitle: 'Oversized Flagship Typography & Coordinates',
    category: 'Architectural',
    description:
      'Bold edge-to-edge flagship hierarchy with oversized serif brand lettering and ultra-precise tabular numerals.',
    recommendedTheme: 'titanium-ice',
    recommendedBorder: 'solid-foil-band',
  },
  {
    id: 'emerald-split-horizon',
    name: '17. Horizon Dual-Stock',
    subtitle: 'Horizontal 55/45 Velvet & Parchment Split',
    category: 'Executive',
    description:
      'Architectural horizontal horizon dividing rich metallic brand authority above from warm cotton-stock contact clarity below.',
    recommendedTheme: 'tiffany-rosegold',
    recommendedBorder: 'clean-edge',
  },
  {
    id: 'notary-ribbon-badge',
    name: '18. Sovereign Ribbon Medallion',
    subtitle: 'Right Vertical Foil Ribbon & Wide Editorial',
    category: 'Executive',
    description:
      'Distinctive right-hand metallic ribbon column carrying the official SA seal and Business Card insignia.',
    recommendedTheme: 'amethyst-silver',
    recommendedBorder: 'double-hairline',
  },
  {
    id: 'vault-microgrid',
    name: '19. Swiss Precision Vault',
    subtitle: 'Engraved Registration Marks & Fine Grid',
    category: 'Architectural',
    description:
      'Precision print-house aesthetic with engraved crosshairs, structured tabular columns, and crisp modern geometry.',
    recommendedTheme: 'titanium-ice',
    recommendedBorder: 'security-dashed',
  },
  {
    id: 'sovereign-blackcard',
    name: '20. Sovereign Centurion Reserve',
    subtitle: 'Ultra-Exclusive VIP Metal Card Layout',
    category: 'Executive',
    description:
      'Inspired by ultra-exclusive metal reserve cards with fine engraved double-bevel frame, sunburst medallion, and embossed nameplate.',
    recommendedTheme: 'bullion-gold-onyx',
    recommendedBorder: 'beveled-triple',
  },
];

export const CARD_THEMES: CardTheme[] = [
  {
    id: 'emerald-gold',
    name: 'Heritage Emerald & 24K Gold',
    finishNote: 'Stamp-paper green · 24K gold foil',
    surfaceBg: '#0F3829',
    surfaceGradient: 'linear-gradient(135deg, #154A37 0%, #09261B 65%, #113C2C 100%)',
    cardBgHex: '#154A37',
    cardBgEndHex: '#09261B',
    creamPaperHex: '#F6F2E7',
    creamInkHex: '#103226',
    accentHex: '#E1BA59',
    accentHighlightHex: '#FAE59E',
    accentMutedHex: '#A68536',
    foilGradient: 'linear-gradient(135deg, #B58C35 0%, #FAF0B8 48%, #C99E40 100%)',
    textPrimaryHex: '#FBF8F0',
    textSecondaryHex: '#C5D3CC',
    borderHex: 'rgba(225, 186, 89, 0.45)',
    isDark: true,
  },
  {
    id: 'royal-sapphire',
    name: 'Imperial Sapphire & Gold',
    finishNote: 'Deep royal cobalt blue · Champagne foil',
    surfaceBg: '#0E2960',
    surfaceGradient: 'linear-gradient(135deg, #163B85 0%, #091B42 65%, #102D69 100%)',
    cardBgHex: '#163B85',
    cardBgEndHex: '#091B42',
    creamPaperHex: '#F5F7FC',
    creamInkHex: '#0E2454',
    accentHex: '#F0CB69',
    accentHighlightHex: '#FFF0BA',
    accentMutedHex: '#B69440',
    foilGradient: 'linear-gradient(135deg, #C79F3D 0%, #FFF2BF 50%, #D9B152 100%)',
    textPrimaryHex: '#FFFFFF',
    textSecondaryHex: '#C2D2F2',
    borderHex: 'rgba(240, 203, 105, 0.45)',
    isDark: true,
  },
  {
    id: 'tiffany-rosegold',
    name: 'Verdigris Teal & Rose Gold',
    finishNote: 'Luxury boutique teal · Rose gold foil',
    surfaceBg: '#0B474A',
    surfaceGradient: 'linear-gradient(135deg, #115E62 0%, #073336 65%, #0D4D50 100%)',
    cardBgHex: '#115E62',
    cardBgEndHex: '#073336',
    creamPaperHex: '#F9F4F2',
    creamInkHex: '#0A3E40',
    accentHex: '#F2B9A5',
    accentHighlightHex: '#FFE0D4',
    accentMutedHex: '#C48470',
    foilGradient: 'linear-gradient(135deg, #C9826B 0%, #FFE0D4 50%, #DA967F 100%)',
    textPrimaryHex: '#FAFDFD',
    textSecondaryHex: '#B9DDE0',
    borderHex: 'rgba(242, 185, 165, 0.45)',
    isDark: true,
  },
  {
    id: 'maharaja-ruby',
    name: 'Maharaja Ruby & Antique Gold',
    finishNote: 'Rich crimson ruby · Gilded gold leaf',
    surfaceBg: '#6B0F1D',
    surfaceGradient: 'linear-gradient(135deg, #871426 0%, #4A0812 65%, #6D0F1E 100%)',
    cardBgHex: '#871426',
    cardBgEndHex: '#4A0812',
    creamPaperHex: '#FCF6EC',
    creamInkHex: '#520B16',
    accentHex: '#F0CA6E',
    accentHighlightHex: '#FFF0C2',
    accentMutedHex: '#BA9643',
    foilGradient: 'linear-gradient(135deg, #C99E3D 0%, #FFF0C2 50%, #D9AF52 100%)',
    textPrimaryHex: '#FFF9F2',
    textSecondaryHex: '#E8C6CA',
    borderHex: 'rgba(240, 202, 110, 0.45)',
    isDark: true,
  },
  {
    id: 'pearl-champagne',
    name: 'Pearl Champagne & Espresso',
    finishNote: 'Warm silk parchment · Espresso & gold ink',
    surfaceBg: '#F4EBD7',
    surfaceGradient: 'linear-gradient(135deg, #FAF3E3 0%, #EADBC0 100%)',
    cardBgHex: '#FAF3E3',
    cardBgEndHex: '#EADBC0',
    creamPaperHex: '#2C1B12',
    creamInkHex: '#FAF3E3',
    accentHex: '#8F621E',
    accentHighlightHex: '#C4923F',
    accentMutedHex: '#734F18',
    foilGradient: 'linear-gradient(135deg, #754E14 0%, #C9963B 50%, #8C611D 100%)',
    textPrimaryHex: '#26170F',
    textSecondaryHex: '#5E493B',
    borderHex: 'rgba(143, 98, 30, 0.36)',
    isDark: false,
  },
  {
    id: 'white-marble-cobalt',
    name: 'Carrara Marble & Royal Cobalt',
    finishNote: 'Bright satin white · Cobalt & silver foil',
    surfaceBg: '#F8FAFD',
    surfaceGradient: 'linear-gradient(135deg, #FFFFFF 0%, #EBF0F7 100%)',
    cardBgHex: '#FFFFFF',
    cardBgEndHex: '#EBF0F7',
    creamPaperHex: '#0F2557',
    creamInkHex: '#FFFFFF',
    accentHex: '#1D4ED8',
    accentHighlightHex: '#3B82F6',
    accentMutedHex: '#475569',
    foilGradient: 'linear-gradient(135deg, #1E40AF 0%, #60A5FA 50%, #1D4ED8 100%)',
    textPrimaryHex: '#0F172A',
    textSecondaryHex: '#475569',
    borderHex: 'rgba(29, 78, 216, 0.3)',
    isDark: false,
  },
  {
    id: 'bullion-gold-onyx',
    name: '24K Bullion Gold & Jet Onyx',
    finishNote: 'Brushed metallic gold card · Deep jet ink',
    surfaceBg: '#D8B153',
    surfaceGradient: 'linear-gradient(135deg, #E8C76B 0%, #B88B2E 52%, #DFBA5D 100%)',
    cardBgHex: '#E8C76B',
    cardBgEndHex: '#B88B2E',
    creamPaperHex: '#121212',
    creamInkHex: '#F3D889',
    accentHex: '#141311',
    accentHighlightHex: '#36322B',
    accentMutedHex: '#3E331A',
    foilGradient: 'linear-gradient(135deg, #0D0D0C 0%, #3F3A2F 50%, #141311 100%)',
    textPrimaryHex: '#11100E',
    textSecondaryHex: '#2E2613',
    borderHex: 'rgba(17, 16, 14, 0.42)',
    isDark: false,
  },
  {
    id: 'amethyst-silver',
    name: 'Royal Amethyst & Sterling',
    finishNote: 'Imperial violet velvet · Mirror silver foil',
    surfaceBg: '#30144F',
    surfaceGradient: 'linear-gradient(135deg, #431B6E 0%, #1F0B36 65%, #341557 100%)',
    cardBgHex: '#431B6E',
    cardBgEndHex: '#1F0B36',
    creamPaperHex: '#F8F5FC',
    creamInkHex: '#260F40',
    accentHex: '#E8EDF5',
    accentHighlightHex: '#FFFFFF',
    accentMutedHex: '#B6A8C9',
    foilGradient: 'linear-gradient(135deg, #A3AFC2 0%, #FFFFFF 50%, #C2CCE0 100%)',
    textPrimaryHex: '#FFFFFF',
    textSecondaryHex: '#D9CBEB',
    borderHex: 'rgba(232, 237, 245, 0.4)',
    isDark: true,
  },
  {
    id: 'obsidian-gold',
    name: 'Obsidian & Holographic Gold',
    finishNote: 'Matte velvet black · Bright 24K foil',
    surfaceBg: '#090A0D',
    surfaceGradient: 'linear-gradient(135deg, #1A1C22 0%, #07080A 60%, #14120E 100%)',
    cardBgHex: '#1A1C22',
    cardBgEndHex: '#07080A',
    creamPaperHex: '#F7F4EC',
    creamInkHex: '#141413',
    accentHex: '#F0CA65',
    accentHighlightHex: '#FFF0B3',
    accentMutedHex: '#A68839',
    foilGradient: 'linear-gradient(135deg, #BA943B 0%, #FFF2B8 50%, #D4AA4A 100%)',
    textPrimaryHex: '#FAF7F0',
    textSecondaryHex: '#BCB7AC',
    borderHex: 'rgba(240, 202, 101, 0.42)',
    isDark: true,
  },
  {
    id: 'terracotta-ivory',
    name: 'Mughal Terracotta & Brass',
    finishNote: 'Warm clay heritage · Antique brass leaf',
    surfaceBg: '#692C1E',
    surfaceGradient: 'linear-gradient(135deg, #823827 0%, #4A1D13 65%, #6E2F20 100%)',
    cardBgHex: '#823827',
    cardBgEndHex: '#4A1D13',
    creamPaperHex: '#FBF4E8',
    creamInkHex: '#4D1F14',
    accentHex: '#ECC876',
    accentHighlightHex: '#FFF0C7',
    accentMutedHex: '#C29A4E',
    foilGradient: 'linear-gradient(135deg, #C79E44 0%, #FFF0C7 50%, #D9B057 100%)',
    textPrimaryHex: '#FFF9F0',
    textSecondaryHex: '#E8CFC5',
    borderHex: 'rgba(236, 200, 118, 0.42)',
    isDark: true,
  },
  {
    id: 'titanium-ice',
    name: 'Brushed Titanium & Ice Silver',
    finishNote: 'Anodized gunmetal · Ice cyan silver',
    surfaceBg: '#222B36',
    surfaceGradient: 'linear-gradient(135deg, #313E4D 0%, #181F28 65%, #273240 100%)',
    cardBgHex: '#313E4D',
    cardBgEndHex: '#181F28',
    creamPaperHex: '#F2F6FA',
    creamInkHex: '#1B232E',
    accentHex: '#BAE6FD',
    accentHighlightHex: '#F0F9FF',
    accentMutedHex: '#86B3CC',
    foilGradient: 'linear-gradient(135deg, #7DD3FC 0%, #F0F9FF 50%, #93C5FD 100%)',
    textPrimaryHex: '#F8FAFC',
    textSecondaryHex: '#CBD5E1',
    borderHex: 'rgba(186, 230, 253, 0.38)',
    isDark: true,
  },
  {
    id: 'ivory-crimson',
    name: 'Archival Cotton & Seal Crimson',
    finishNote: '450gsm textured cotton · Engraved crimson',
    surfaceBg: '#FAF7F0',
    surfaceGradient: 'linear-gradient(135deg, #FCFBF7 0%, #EFE9DA 100%)',
    cardBgHex: '#FCFBF7',
    cardBgEndHex: '#EFE9DA',
    creamPaperHex: '#1B1A18',
    creamInkHex: '#F9F6EE',
    accentHex: '#941C23',
    accentHighlightHex: '#C72C35',
    accentMutedHex: '#B6464C',
    foilGradient: 'linear-gradient(135deg, #7B1319 0%, #CC353D 50%, #8C1920 100%)',
    textPrimaryHex: '#171614',
    textSecondaryHex: '#57534B',
    borderHex: 'rgba(148, 28, 35, 0.34)',
    isDark: false,
  },
];

export const CARD_BORDER_PRESETS: CardBorderPreset[] = [
  { id: 'double-hairline', name: 'Twin Gold Hairlines', note: 'Dual parallel inset lines' },
  { id: 'corner-filigree', name: 'Royal Corner Brackets', note: 'Engraved L-brackets in 4 corners' },
  { id: 'art-deco-stepped', name: 'Art Deco Chevrons', note: 'Stepped geometric corner blocks' },
  { id: 'mughal-arabesque', name: 'Mughal Scalloped Rim', note: 'Ornamental corner arches & dots' },
  { id: 'security-dashed', name: 'Stamp Certificate Dash', note: 'Official revenue-stamp dotted frame' },
  { id: 'solid-foil-band', name: 'Heavy Bullion Rim', note: 'Bold 3px gilded metallic frame' },
  { id: 'beveled-triple', name: 'Triple Engraved Vault', note: 'Outer rim + inner corner diamonds' },
  { id: 'clean-edge', name: 'Rimless Flush Edge', note: 'Pure borderless raw stock' },
];

export const CARD_FONT_THEMES: CardFontTheme[] = [
  {
    id: 'playfair-jakarta',
    name: 'Royal Sculpted Serif',
    subtitle: 'Playfair Display + Plus Jakarta Sans',
    displayFont: "'Playfair Display', Georgia, serif",
    bodyFont: "'Plus Jakarta Sans', system-ui, sans-serif",
    defaultDisplayId: 'playfair',
    defaultBodyId: 'jakarta',
  },
  {
    id: 'cinzel-manrope',
    name: 'Imperial Roman Engraved',
    subtitle: 'Cinzel + Montserrat',
    displayFont: "'Cinzel', Georgia, serif",
    bodyFont: "'Montserrat', system-ui, sans-serif",
    defaultDisplayId: 'cinzel',
    defaultBodyId: 'montserrat',
  },
  {
    id: 'cormorant-dm',
    name: 'Parisian Couture Editorial',
    subtitle: 'Cormorant Garamond + Plus Jakarta Sans',
    displayFont: "'Cormorant Garamond', Georgia, serif",
    bodyFont: "'Plus Jakarta Sans', system-ui, sans-serif",
    defaultDisplayId: 'cormorant',
    defaultBodyId: 'jakarta',
  },
  {
    id: 'bodoni-montserrat',
    name: 'Milanese High Fashion',
    subtitle: 'Bodoni Moda + Montserrat',
    displayFont: "'Bodoni Moda', Georgia, serif",
    bodyFont: "'Montserrat', system-ui, sans-serif",
    defaultDisplayId: 'bodoni',
    defaultBodyId: 'montserrat',
  },
  {
    id: 'baskerville-jakarta',
    name: 'Judicial Stamp Heritage',
    subtitle: 'Libre Baskerville + Lora',
    displayFont: "'Libre Baskerville', Georgia, serif",
    bodyFont: "'Lora', Georgia, serif",
    defaultDisplayId: 'baskerville',
    defaultBodyId: 'lora',
  },
];

function hexToRgbChannels(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || 0,
      parseInt(clean[1] + clean[1], 16) || 0,
      parseInt(clean[2] + clean[2], 16) || 0,
    ];
  }
  if (clean.length !== 6) return [27, 67, 50];
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0,
  ];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgbChannels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function shiftHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgbChannels(hex).map((v) =>
    Math.max(0, Math.min(255, Math.round(v + amount)))
  );
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function buildCardThemeFromBrandColors(
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  },
  brandName: string
): CardTheme {
  const surfaceBg = colors.background || '#FAF9F6';
  const isDark = relativeLuminance(surfaceBg) < 0.35;
  const cardBgEndHex = isDark ? shiftHex(surfaceBg, -18) : shiftHex(surfaceBg, -14);
  const accentHex = colors.accent || colors.primary || '#1B4332';
  const accentHighlightHex = shiftHex(accentHex, isDark ? 42 : 28);
  const accentMutedHex = colors.secondary || shiftHex(accentHex, -32);
  const textPrimaryHex = colors.text || (isDark ? '#FBF8F0' : '#141413');
  const textSecondaryHex = isDark ? shiftHex(textPrimaryHex, -45) : shiftHex(textPrimaryHex, 55);
  const [ar, ag, ab] = hexToRgbChannels(accentHex);

  return {
    id: 'canvas-brand',
    name: `${brandName} Brand Palette`,
    finishNote: 'Synced live from Logo Maker colors',
    surfaceBg,
    surfaceGradient: `linear-gradient(135deg, ${surfaceBg} 0%, ${cardBgEndHex} 100%)`,
    cardBgHex: surfaceBg,
    cardBgEndHex,
    creamPaperHex: isDark ? '#F7F5EE' : '#141413',
    creamInkHex: isDark ? '#141413' : '#FAF7F0',
    accentHex,
    accentHighlightHex,
    accentMutedHex,
    foilGradient: `linear-gradient(135deg, ${accentMutedHex} 0%, ${accentHighlightHex} 50%, ${accentHex} 100%)`,
    textPrimaryHex,
    textSecondaryHex,
    borderHex: `rgba(${ar}, ${ag}, ${ab}, 0.38)`,
    isDark,
  };
}
