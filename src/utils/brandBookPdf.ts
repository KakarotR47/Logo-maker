import { jsPDF } from 'jspdf';
import { FONT_OPTIONS } from '../data/logoLibrary';
import { BrandBrief, ColorPalette, FontOption, LogoDocument, TextLayer } from '../types/logo';
import { hexToRgb, isLightHex, normalizeHex, rgbToCmyk } from './colorSpecs';
import { extractBrandVariants } from './logoGenerator';
import {
  computeProportionalDimensions,
  renderLogoPngBlob,
  resolveSolidBackground,
  slugifyFilename,
} from './svgExport';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to encode raster asset for Brand Book PDF'));
    reader.readAsDataURL(blob);
  });
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function fitIntoBox(
  aspectW: number,
  aspectH: number,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number
) {
  const safeAspect = Math.max(0.25, aspectW / Math.max(1, aspectH));
  let w = boxW;
  let h = w / safeAspect;
  if (h > boxH) {
    h = boxH;
    w = h * safeAspect;
  }
  return {
    x: boxX + (boxW - w) / 2,
    y: boxY + (boxH - h) / 2,
    w,
    h,
  };
}

function drawPageChrome(
  pdf: jsPDF,
  brandName: string,
  sectionNumber: string,
  sectionTitle: string,
  pageNumber: number,
  totalPages: number,
  accentHex: string
) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const accentRgb = hexToRgb(accentHex);

  // Subtle top bar rule
  pdf.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b);
  pdf.rect(44, 34, 24, 3, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
  pdf.text(`SECTION ${sectionNumber}`, 76, 38);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(20, 20, 19);
  pdf.text(sectionTitle, 44, 62);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(115, 111, 102);
  pdf.text(`${brandName.toUpperCase()}  ·  BRAND IDENTITY GUIDELINES`, pageW - 44, 38, {
    align: 'right',
  });

  pdf.setDrawColor(225, 222, 214);
  pdf.setLineWidth(0.75);
  pdf.line(44, 74, pageW - 44, 74);

  // Footer
  pdf.setDrawColor(232, 229, 222);
  pdf.line(44, pageH - 36, pageW - 44, pageH - 36);
  pdf.setFont('courier', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(125, 121, 112);
  pdf.text(`${brandName} Brand Standards`, 44, pageH - 21);
  pdf.text(`PAGE 0${pageNumber} / 0${totalPages}`, pageW - 44, pageH - 21, { align: 'right' });
}

interface ExtractedSwatch {
  role: string;
  usage: string;
  hex: string;
}

function collectBrandSwatches(
  doc: LogoDocument,
  palette: ColorPalette,
  solidBg: string
): ExtractedSwatch[] {
  const base: ExtractedSwatch[] = [
    { role: 'Primary Brand', usage: 'Primary mark, key headlines & hero surfaces', hex: normalizeHex(palette.primary) },
    { role: 'Accent Highlight', usage: 'Badges, dividers, highlights & focal rules', hex: normalizeHex(palette.accent) },
    { role: 'Secondary Tint', usage: 'Supporting containers, badges & secondary fills', hex: normalizeHex(palette.secondary) },
    { role: 'Typography Ink', usage: 'Primary wordmark ink & body legibility', hex: normalizeHex(palette.text) },
    { role: 'Surface Canvas', usage: 'Default light backdrop & print paper base', hex: normalizeHex(solidBg) },
  ];

  const seen = new Set(base.map((s) => s.hex));
  const extraHexes: string[] = [];
  doc.layers.forEach((layer) => {
    if (!layer.visible) return;
    [layer.fill, layer.stroke, layer.fillGradient?.startColor, layer.fillGradient?.endColor].forEach(
      (candidate) => {
        if (candidate && /^#[0-9a-fA-F]{3,6}$/.test(candidate.trim())) {
          const norm = normalizeHex(candidate);
          if (!seen.has(norm)) {
            seen.add(norm);
            extraHexes.push(norm);
          }
        }
      }
    );
  });

  extraHexes.slice(0, 3).forEach((hex, idx) => {
    base.push({
      role: `Canvas Color ${idx + 1}`,
      usage: 'Custom artwork detail tone from master logo',
      hex,
    });
  });

  return base;
}

function collectTypographyEntries(doc: LogoDocument, brief?: BrandBrief): Array<{
  role: string;
  font: FontOption;
  weight: number;
  tracking: string;
  sample: string;
}> {
  const brandName = brief?.businessName || doc.title || 'BRAND STUDIO';
  const tagline = brief?.tagline || 'CRAFTED IDENTITY & SYSTEMS';

  const textLayers = doc.layers
    .filter((l): l is TextLayer => l.type === 'text' && l.visible)
    .sort((a, b) => b.fontSize - a.fontSize);

  const findFont = (fontId?: string, cssFamily?: string, fallbackId = 'outfit'): FontOption => {
    const byId = fontId ? FONT_OPTIONS.find((f) => f.id === fontId) : undefined;
    if (byId) return byId;
    if (cssFamily) {
      const clean = cssFamily.split(',')[0]?.replace(/['"]/g, '').trim().toLowerCase();
      const byName = FONT_OPTIONS.find((f) => f.name.toLowerCase() === clean);
      if (byName) return byName;
      return {
        id: clean || 'custom',
        name: cssFamily.split(',')[0]?.replace(/['"]/g, '').trim() || 'Display Type',
        cssFamily,
        category: 'Display',
        weights: [400, 600, 700],
        ttfUrl: '',
      };
    }
    return FONT_OPTIONS.find((f) => f.id === fallbackId) ?? FONT_OPTIONS[0];
  };

  const primaryLayer = textLayers[0];
  const secondaryLayer = textLayers[1];

  const primaryFont = findFont(
    primaryLayer?.fontId ?? brief?.primaryFontId,
    primaryLayer?.fontFamily,
    'outfit'
  );
  const secondaryFont = findFont(
    secondaryLayer?.fontId ?? brief?.secondaryFontId,
    secondaryLayer?.fontFamily,
    'plus-jakarta'
  );

  return [
    {
      role: '01 · Primary Display & Wordmark',
      font: primaryFont,
      weight: primaryLayer?.fontWeight ?? 700,
      tracking: `${((primaryLayer?.letterSpacing ?? 0.04) * 100).toFixed(0)}% tracking`,
      sample: primaryLayer?.text || brandName,
    },
    {
      role: '02 · Tagline, Labels & Body',
      font: secondaryFont,
      weight: secondaryLayer?.fontWeight ?? 600,
      tracking: `${((secondaryLayer?.letterSpacing ?? 0.14) * 100).toFixed(0)}% tracking`,
      sample: secondaryLayer?.text || tagline,
    },
  ];
}

/**
 * Generates an automated 6-Page A4 Landscape Brand Guidelines Book PDF containing:
 * 1. Cover Page
 * 2. Primary Logo & Approved Lockups
 * 3. Clear Space & Minimum Size Rules
 * 4. Color Palette (HEX, RGB, CMYK)
 * 5. Typography Hierarchy
 * 6. Brand Do's & Don'ts
 */
export async function buildBrandGuidelinesPdfBlob(
  doc: LogoDocument,
  palette: ColorPalette,
  brief?: BrandBrief
): Promise<Blob> {
  const brandName = (brief?.businessName || doc.title || 'Brand Identity').trim();
  const tagline = (brief?.tagline || 'Visual Identity & Usage Standards').trim();
  const solidBg = resolveSolidBackground(doc, palette);

  const fallbackBrief: BrandBrief = brief ?? {
    businessName: brandName,
    tagline,
    audience: 'Modern customers',
    industry: 'Creative & Media',
    style: 'modern',
    symbolIdea: '',
    paletteId: palette.id,
    primaryFontId: 'outfit',
    secondaryFontId: 'plus-jakarta',
  };

  const variants = extractBrandVariants(doc, fallbackBrief, palette);

  // Rasterize assets once in parallel
  const primaryDims = computeProportionalDimensions(doc, 1600);
  const markDims = computeProportionalDimensions(variants.markOnlyDocument, 900);

  const [
    primarySolidUrl,
    primaryTransparentUrl,
    darkSolidUrl,
    darkTransparentUrl,
    monoLightUrl,
    markSolidUrl,
  ] = await Promise.all([
    renderLogoPngBlob(doc, primaryDims.width, primaryDims.height, {
      transparentBackground: false,
      solidBackground: solidBg,
    }).then(blobToDataUrl),
    renderLogoPngBlob(doc, primaryDims.width, primaryDims.height, {
      transparentBackground: true,
      fitToArtwork: true,
      paddingRatio: 0.06,
    }).then(blobToDataUrl),
    renderLogoPngBlob(variants.darkModeDocument, primaryDims.width, primaryDims.height, {
      transparentBackground: false,
      solidBackground: variants.darkModeDocument.backgroundColor,
    }).then(blobToDataUrl),
    renderLogoPngBlob(variants.darkModeDocument, primaryDims.width, primaryDims.height, {
      transparentBackground: true,
      fitToArtwork: true,
      paddingRatio: 0.06,
    }).then(blobToDataUrl),
    renderLogoPngBlob(variants.monochromeDocument, primaryDims.width, primaryDims.height, {
      transparentBackground: false,
      solidBackground: '#FFFFFF',
    }).then(blobToDataUrl),
    renderLogoPngBlob(variants.markOnlyDocument, markDims.width, markDims.height, {
      transparentBackground: false,
      solidBackground: solidBg,
      fitToArtwork: true,
      paddingRatio: 0.16,
    }).then(blobToDataUrl),
  ]);

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageW = pdf.internal.pageSize.getWidth(); // 841.89
  const pageH = pdf.internal.pageSize.getHeight(); // 595.28
  const totalPages = 6;

  const primaryRgb = hexToRgb(palette.primary);
  const accentRgb = hexToRgb(palette.accent);
  const secondaryRgb = hexToRgb(palette.secondary);
  const bgIsLight = isLightHex(solidBg);

  // =========================================================================
  // PAGE 1: COVER PAGE
  // =========================================================================
  pdf.setFillColor(18, 19, 24);
  pdf.rect(0, 0, pageW, pageH, 'F');

  // Subtle decorative left band in primary brand color
  pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  pdf.rect(0, 0, 18, pageH, 'F');

  // Top metadata header
  pdf.setFont('courier', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
  pdf.text('OFFICIAL BRAND GUIDELINES BOOK', 56, 56);

  pdf.setFont('courier', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(175, 178, 188);
  pdf.text(
    `${fallbackBrief.industry.toUpperCase()}  ·  EDITION ${new Date().getFullYear()}`,
    pageW - 52,
    56,
    { align: 'right' }
  );

  // Left hero title block
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(34);
  pdf.setTextColor(255, 255, 255);
  const titleLines = pdf.splitTextToSize(brandName, 340);
  pdf.text(titleLines, 56, 178);

  const afterTitleY = 178 + titleLines.length * 36;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(13);
  pdf.setTextColor(200, 204, 214);
  const tagLines = pdf.splitTextToSize(tagline, 330);
  pdf.text(tagLines, 56, afterTitleY + 4);

  // Accent horizontal rule
  pdf.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b);
  pdf.rect(56, afterTitleY + tagLines.length * 18 + 20, 64, 3, 'F');

  // Palette ribbon & table of contents preview at bottom left
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(155, 160, 172);
  pdf.text('CONTENTS INCLUDED IN THIS BOOK', 56, 405);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(220, 223, 232);
  const tocItems = [
    '01  Primary Logo & Approved Lockups',
    '02  Clear Space & Minimum Size Rules',
    '03  Color Palette (HEX, RGB, CMYK)',
    '04  Typography Hierarchy & Specimens',
    '05  Brand Usage Do’s & Don’ts',
  ];
  tocItems.forEach((line, i) => {
    pdf.text(line, 56, 424 + i * 16);
  });

  // Right cover logo presentation stage
  const stageX = 432;
  const stageY = 104;
  const stageW = 358;
  const stageH = 380;
  const stageBgRgb = hexToRgb(solidBg);
  pdf.setFillColor(stageBgRgb.r, stageBgRgb.g, stageBgRgb.b);
  pdf.roundedRect(stageX, stageY, stageW, stageH, 10, 10, 'F');

  const coverLogoFit = fitIntoBox(
    doc.width,
    doc.height,
    stageX + 26,
    stageY + 26,
    stageW - 52,
    stageH - 52
  );
  pdf.addImage(
    bgIsLight ? primaryTransparentUrl : darkTransparentUrl,
    'PNG',
    coverLogoFit.x,
    coverLogoFit.y,
    coverLogoFit.w,
    coverLogoFit.h
  );

  // Palette color bar under stage
  const ribbonColors = [palette.primary, palette.accent, palette.secondary, palette.text, solidBg];
  const segW = stageW / ribbonColors.length;
  ribbonColors.forEach((hex, idx) => {
    const rgb = hexToRgb(hex);
    pdf.setFillColor(rgb.r, rgb.g, rgb.b);
    pdf.rect(stageX + idx * segW, stageY + stageH + 14, segW - 4, 12, 'F');
  });

  pdf.setFont('courier', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(145, 150, 160);
  pdf.text(`PREPARED ${new Date().toISOString().slice(0, 10)}`, 56, pageH - 28);
  pdf.text('PAGE 01 / 06', pageW - 52, pageH - 28, { align: 'right' });

  // =========================================================================
  // PAGE 2: PRIMARY LOGO & LOCKUP SYSTEM
  // =========================================================================
  pdf.addPage('a4', 'landscape');
  pdf.setFillColor(249, 248, 245);
  pdf.rect(0, 0, pageW, pageH, 'F');
  drawPageChrome(pdf, brandName, '01', 'Primary Logo & Lockup Variations', 2, totalPages, palette.primary);

  // Main Primary Showcase Left Card
  const pCardX = 44;
  const pCardY = 92;
  const pCardW = 456;
  const pCardH = 342;
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(220, 217, 208);
  pdf.roundedRect(pCardX, pCardY, pCardW, pCardH, 8, 8, 'FD');

  const primaryFit = fitIntoBox(
    doc.width,
    doc.height,
    pCardX + 28,
    pCardY + 26,
    pCardW - 56,
    pCardH - 80
  );
  pdf.addImage(primarySolidUrl, 'PNG', primaryFit.x, primaryFit.y, primaryFit.w, primaryFit.h);

  pdf.setDrawColor(235, 232, 224);
  pdf.line(pCardX + 20, pCardY + pCardH - 44, pCardX + pCardW - 20, pCardY + pCardH - 44);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(20, 20, 19);
  pdf.text('Master Primary Lockup', pCardX + 20, pCardY + pCardH - 24);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(100, 96, 88);
  pdf.text(
    'Default horizontal/full composition for light editorial, web, and print materials.',
    pCardX + 20,
    pCardY + pCardH - 11
  );

  // Right Column: 3 Secondary Lockup Cards (Dark Reversed, Monochrome Ink, Standalone Mark)
  const rightX = 520;
  const rightW = pageW - rightX - 44; // ~278
  const miniCards = [
    {
      title: 'Dark Surface / Reversed Lockup',
      caption: 'Required on dark UI, signage, and obsidian substrates.',
      img: darkSolidUrl,
      aspectW: doc.width,
      aspectH: doc.height,
      bg: [17, 20, 27] as const,
    },
    {
      title: 'Monochrome Print Ink',
      caption: '1-color engraving, stamps, embossing & monochrome receipts.',
      img: monoLightUrl,
      aspectW: doc.width,
      aspectH: doc.height,
      bg: [255, 255, 255] as const,
    },
    {
      title: 'Standalone Brand Mark / Favicon',
      caption: '1:1 square icon for app launchers, avatars & small stamps.',
      img: markSolidUrl,
      aspectW: 1,
      aspectH: 1,
      bg: [246, 245, 240] as const,
    },
  ];

  miniCards.forEach((card, idx) => {
    const cy = 92 + idx * 144;
    const ch = 132;
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(220, 217, 208);
    pdf.roundedRect(rightX, cy, rightW, ch, 8, 8, 'FD');

    const thumbBoxW = 132;
    const thumbBoxH = ch - 18;
    pdf.setFillColor(card.bg[0], card.bg[1], card.bg[2]);
    pdf.roundedRect(rightX + 9, cy + 9, thumbBoxW, thumbBoxH, 5, 5, 'F');

    const fit = fitIntoBox(
      card.aspectW,
      card.aspectH,
      rightX + 15,
      cy + 14,
      thumbBoxW - 12,
      thumbBoxH - 10
    );
    pdf.addImage(card.img, 'PNG', fit.x, fit.y, fit.w, fit.h);

    const textX = rightX + 152;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(20, 20, 19);
    const wrappedTitle = pdf.splitTextToSize(card.title, rightW - 164);
    pdf.text(wrappedTitle, textX, cy + 32);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.2);
    pdf.setTextColor(96, 92, 84);
    const wrappedCap = pdf.splitTextToSize(card.caption, rightW - 164);
    pdf.text(wrappedCap, textX, cy + 32 + wrappedTitle.length * 12 + 4);
  });

  // Bottom Note Strip
  pdf.setFillColor(241, 239, 233);
  pdf.roundedRect(44, 452, pageW - 88, 84, 6, 6, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(20, 20, 19);
  pdf.text('Lockup Selection Summary', 60, 474);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.8);
  pdf.setTextColor(78, 75, 68);
  pdf.text(
    'Always use vector SVG masters for print production and lossless PNGs for digital screens. Never recreate or substitute fonts within the official lockup.',
    60,
    494,
    { maxWidth: pageW - 120 }
  );

  // =========================================================================
  // PAGE 3: CLEAR SPACE & MINIMUM SIZE RULES
  // =========================================================================
  pdf.addPage('a4', 'landscape');
  pdf.setFillColor(249, 248, 245);
  pdf.rect(0, 0, pageW, pageH, 'F');
  drawPageChrome(pdf, brandName, '02', 'Clear Space & Minimum Size Rules', 3, totalPages, palette.primary);

  // Left panel: Clear space diagram
  const csX = 44;
  const csY = 94;
  const csW = 468;
  const csH = 436;
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(220, 217, 208);
  pdf.roundedRect(csX, csY, csW, csH, 8, 8, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(20, 20, 19);
  pdf.text('Proportional Exclusion Zone (1x Buffer)', csX + 20, csY + 28);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.8);
  pdf.setTextColor(96, 92, 84);
  pdf.text(
    'Maintain an unobstructed clear-space margin equal to 1x (25% of emblem height) around all four sides.',
    csX + 20,
    csY + 44
  );

  const logoAreaW = 240;
  const logoAreaH = 164;
  const marginX = 42;
  const logoCenterX = csX + csW / 2;
  const logoCenterY = csY + 236;
  const innerX = logoCenterX - logoAreaW / 2;
  const innerY = logoCenterY - logoAreaH / 2;
  const outerX = innerX - marginX;
  const outerY = innerY - marginX;
  const outerW = logoAreaW + marginX * 2;
  const outerH = logoAreaH + marginX * 2;

  // Light tinted exclusion band
  pdf.setFillColor(243, 246, 244);
  pdf.rect(outerX, outerY, outerW, outerH, 'F');
  pdf.setFillColor(255, 255, 255);
  pdf.rect(innerX, innerY, logoAreaW, logoAreaH, 'F');

  // Outer dashed exclusion perimeter
  pdf.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  pdf.setLineWidth(1);
  pdf.setLineDashPattern([4, 3], 0);
  pdf.rect(outerX, outerY, outerW, outerH);

  // Inner logo bounds
  pdf.setDrawColor(180, 178, 170);
  pdf.setLineDashPattern([2, 2], 0);
  pdf.rect(innerX, innerY, logoAreaW, logoAreaH);
  pdf.setLineDashPattern([], 0);

  // Centered logo artwork inside clear-space diagram
  const csLogoFit = fitIntoBox(
    doc.width,
    doc.height,
    innerX + 6,
    innerY + 6,
    logoAreaW - 12,
    logoAreaH - 12
  );
  pdf.addImage(
    primaryTransparentUrl,
    'PNG',
    csLogoFit.x,
    csLogoFit.y,
    csLogoFit.w,
    csLogoFit.h
  );

  // "x" measurement boxes at Top, Bottom, Left, Right
  const xBadges = [
    { x: logoCenterX - 11, y: outerY + 10, label: '1x' },
    { x: logoCenterX - 11, y: innerY + logoAreaH + 10, label: '1x' },
    { x: outerX + 10, y: logoCenterY - 11, label: '1x' },
    { x: innerX + logoAreaW + 10, y: logoCenterY - 11, label: '1x' },
  ];
  xBadges.forEach((badge) => {
    pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    pdf.roundedRect(badge.x, badge.y, 22, 22, 3, 3, 'F');
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text(badge.label, badge.x + 11, badge.y + 14, { align: 'center' });
  });

  // Right panel: Minimum Sizes (Digital & Print)
  const msX = 532;
  const msW = pageW - msX - 44;
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(220, 217, 208);
  pdf.roundedRect(msX, csY, msW, csH, 8, 8, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(20, 20, 19);
  pdf.text('Minimum Size Thresholds', msX + 20, csY + 28);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.8);
  pdf.setTextColor(96, 92, 84);
  pdf.text(
    'Never scale below these minimums to preserve stroke clarity and wordmark legibility.',
    msX + 20,
    csY + 44,
    { maxWidth: msW - 40 }
  );

  const minRows = [
    {
      title: 'Full Lockup — Digital Screens',
      metric: '120 px min width',
      sub: 'Headers, email signatures & web navbars',
      thumbW: 96,
      img: primaryTransparentUrl,
      aspectW: doc.width,
      aspectH: doc.height,
    },
    {
      title: 'Full Lockup — Print Media',
      metric: '28 mm (1.1 in) min',
      sub: 'Stationery, brochures & woven labels',
      thumbW: 72,
      img: primaryTransparentUrl,
      aspectW: doc.width,
      aspectH: doc.height,
    },
    {
      title: 'Symbol Mark — Digital Favicon',
      metric: '24 px min width',
      sub: 'App icons, avatars & browser tabs',
      thumbW: 36,
      img: markSolidUrl,
      aspectW: 1,
      aspectH: 1,
    },
    {
      title: 'Symbol Mark — Micro Stamp',
      metric: '8 mm (0.31 in) min',
      sub: 'Pen engravings, hardware & foil seals',
      thumbW: 24,
      img: markSolidUrl,
      aspectW: 1,
      aspectH: 1,
    },
  ];

  minRows.forEach((row, idx) => {
    const ry = csY + 76 + idx * 86;
    pdf.setFillColor(248, 247, 244);
    pdf.setDrawColor(232, 229, 222);
    pdf.roundedRect(msX + 18, ry, msW - 36, 74, 5, 5, 'FD');

    const thumbH = Math.min(44, Math.round((row.thumbW * row.aspectH) / row.aspectW));
    const thumbX = msX + 30;
    const thumbY = ry + (74 - thumbH) / 2;
    pdf.addImage(row.img, 'PNG', thumbX, thumbY, row.thumbW, thumbH);

    // Dimension caliper line under thumbnail
    pdf.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    pdf.setLineWidth(0.8);
    pdf.line(thumbX, thumbY + thumbH + 5, thumbX + row.thumbW, thumbY + thumbH + 5);

    const infoX = msX + 144;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(20, 20, 19);
    pdf.text(row.title, infoX, ry + 24);

    pdf.setFont('courier', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    pdf.text(row.metric, infoX, ry + 41);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(102, 98, 90);
    pdf.text(row.sub, infoX, ry + 56);
  });

  // =========================================================================
  // PAGE 4: COLOR PALETTE (HEX, RGB, CMYK)
  // =========================================================================
  pdf.addPage('a4', 'landscape');
  pdf.setFillColor(249, 248, 245);
  pdf.rect(0, 0, pageW, pageH, 'F');
  drawPageChrome(pdf, brandName, '03', 'Color System — HEX, RGB & CMYK', 4, totalPages, palette.primary);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(86, 82, 75);
  pdf.text(
    `Active Palette Theme: ${palette.name}. Use HEX/RGB values for digital screens and CMYK builds for four-color offset lithography.`,
    44,
    96
  );

  const swatches = collectBrandSwatches(doc, palette, solidBg);
  const cols = 4;
  const cardGapX = 16;
  const cardGapY = 16;
  const swCardW = (pageW - 88 - cardGapX * (cols - 1)) / cols;
  const swCardH = 196;

  swatches.slice(0, 8).forEach((sw, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = 44 + col * (swCardW + cardGapX);
    const y = 114 + row * (swCardH + cardGapY);

    const rgb = hexToRgb(sw.hex);
    const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(220, 217, 208);
    pdf.roundedRect(x, y, swCardW, swCardH, 8, 8, 'FD');

    // Top color chip
    pdf.setFillColor(rgb.r, rgb.g, rgb.b);
    pdf.roundedRect(x + 8, y + 8, swCardW - 16, 74, 5, 5, 'F');
    if (isLightHex(sw.hex)) {
      pdf.setDrawColor(220, 217, 208);
      pdf.roundedRect(x + 8, y + 8, swCardW - 16, 74, 5, 5, 'S');
    }

    // Badge text inside chip bottom-left
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(isLightHex(sw.hex) ? 20 : 255, isLightHex(sw.hex) ? 20 : 255, isLightHex(sw.hex) ? 19 : 255);
    pdf.text(sw.hex, x + 16, y + 72);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(20, 20, 19);
    pdf.text(sw.role, x + 12, y + 102);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.8);
    pdf.setTextColor(102, 98, 90);
    const usageLines = pdf.splitTextToSize(sw.usage, swCardW - 24);
    pdf.text(usageLines.slice(0, 2), x + 12, y + 115);

    // Code breakdown box
    pdf.setFillColor(247, 246, 242);
    pdf.roundedRect(x + 10, y + 138, swCardW - 20, 48, 4, 4, 'F');
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(45, 44, 40);
    pdf.text(`HEX   ${sw.hex}`, x + 16, y + 151);
    pdf.text(`RGB   ${rgb.r}, ${rgb.g}, ${rgb.b}`, x + 16, y + 164);
    pdf.text(`CMYK  ${cmyk.c}% / ${cmyk.m}% / ${cmyk.y}% / ${cmyk.k}%`, x + 16, y + 177);
  });

  // =========================================================================
  // PAGE 5: TYPOGRAPHY HIERARCHY
  // =========================================================================
  pdf.addPage('a4', 'landscape');
  pdf.setFillColor(249, 248, 245);
  pdf.rect(0, 0, pageW, pageH, 'F');
  drawPageChrome(pdf, brandName, '04', 'Typography Hierarchy & Specimens', 5, totalPages, palette.primary);

  const typoEntries = collectTypographyEntries(doc, fallbackBrief);

  typoEntries.forEach((entry, idx) => {
    const x = 44 + idx * 384;
    const y = 94;
    const w = 368;
    const h = 236;

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(220, 217, 208);
    pdf.roundedRect(x, y, w, h, 8, 8, 'FD');

    pdf.setFont('courier', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    pdf.text(entry.role.toUpperCase(), x + 18, y + 26);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(20, 20, 19);
    pdf.text(entry.font.name, x + 18, y + 54);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.8);
    pdf.setTextColor(96, 92, 84);
    pdf.text(
      `${entry.font.category}  ·  Weight ${entry.weight}  ·  ${entry.tracking}`,
      x + 18,
      y + 72
    );

    // Big Aa specimen
    pdf.setFillColor(247, 246, 242);
    pdf.roundedRect(x + 18, y + 88, w - 36, 76, 5, 5, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(34);
    pdf.setTextColor(20, 20, 19);
    pdf.text('Aa', x + 32, y + 138);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(75, 73, 68);
    pdf.text('ABCDEFGHIJKLM', x + 98, y + 115);
    pdf.text('NOPQRSTUVWXYZ', x + 98, y + 130);
    pdf.text('0123456789 · !?@&%', x + 98, y + 145);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(20, 20, 19);
    pdf.text(`Specimen: "${entry.sample.slice(0, 34)}"`, x + 18, y + 190);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(102, 98, 90);
    pdf.text(
      idx === 0
        ? 'Used for primary logotype, hero headlines, and architectural signage titles.'
        : 'Used for tracked eyebrows, taglines, specification metadata, and UI captions.',
      x + 18,
      y + 206,
      { maxWidth: w - 36 }
    );
  });

  // Type Scale Table
  const scaleY = 348;
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(220, 217, 208);
  pdf.roundedRect(44, scaleY, pageW - 88, 190, 8, 8, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.setTextColor(20, 20, 19);
  pdf.text('Recommended Brand Type Scale & Hierarchy', 62, scaleY + 24);

  const scaleRows = [
    {
      level: 'Display / Wordmark',
      spec: `${typoEntries[0].font.name} · 48–64pt · Bold`,
      sample: brandName,
      size: 16,
      bold: true,
    },
    {
      level: 'Section Heading',
      spec: `${typoEntries[0].font.name} · 24–32pt · SemiBold`,
      sample: `${brandName} Visual Identity Standards`,
      size: 13,
      bold: true,
    },
    {
      level: 'Tagline / Eyebrow',
      spec: `${typoEntries[1].font.name} · 11–14pt · Tracked Uppercase`,
      sample: tagline.toUpperCase(),
      size: 9.5,
      bold: true,
    },
    {
      level: 'Editorial Body Copy',
      spec: `${typoEntries[1].font.name} · 10–12pt · Regular · 1.5 Line Height`,
      sample: 'Clear proportions, legible hierarchy, and high contrast across print and digital surfaces.',
      size: 9.5,
      bold: false,
    },
  ];

  scaleRows.forEach((row, idx) => {
    const ry = scaleY + 42 + idx * 36;
    if (idx > 0) {
      pdf.setDrawColor(238, 236, 228);
      pdf.line(62, ry - 4, pageW - 62, ry - 4);
    }
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    pdf.text(row.level.toUpperCase(), 62, ry + 13);

    pdf.setFont('courier', 'normal');
    pdf.setFontSize(7.8);
    pdf.setTextColor(115, 111, 102);
    pdf.text(row.spec, 210, ry + 13);

    pdf.setFont('helvetica', row.bold ? 'bold' : 'normal');
    pdf.setFontSize(row.size);
    pdf.setTextColor(20, 20, 19);
    pdf.text(row.sample.slice(0, 56), 445, ry + 15);
  });

  // =========================================================================
  // PAGE 6: BRAND DO'S & DON'TS
  // =========================================================================
  pdf.addPage('a4', 'landscape');
  pdf.setFillColor(249, 248, 245);
  pdf.rect(0, 0, pageW, pageH, 'F');
  drawPageChrome(pdf, brandName, '05', "Logo Usage — Do's & Don'ts", 6, totalPages, palette.primary);

  const ruleCols = 3;
  const rGap = 16;
  const rW = (pageW - 88 - rGap * (ruleCols - 1)) / ruleCols;
  const rH = 212;

  const guidelines = [
    {
      kind: 'DO' as const,
      title: 'Preserve Original Proportions',
      caption: 'Always scale uniformly from corners with full 1x clear space intact.',
      mode: 'do-primary' as const,
    },
    {
      kind: 'DO' as const,
      title: 'Use Reversed Lockup on Dark Surfaces',
      caption: 'Switch to the approved high-contrast dark variant on deep backdrops.',
      mode: 'do-dark' as const,
    },
    {
      kind: 'DO' as const,
      title: 'Use Monochrome Ink for Stamps',
      caption: 'Use pure black or white ink when 1-color printing or embossing.',
      mode: 'do-mono' as const,
    },
    {
      kind: 'DONT' as const,
      title: 'Do Not Stretch or Squash',
      caption: 'Never alter the aspect ratio or distort the width-to-height balance.',
      mode: 'dont-stretch' as const,
    },
    {
      kind: 'DONT' as const,
      title: 'Do Not Tilt or Skew',
      caption: 'Keep the emblem and wordmark strictly aligned to a horizontal baseline.',
      mode: 'dont-tilt' as const,
    },
    {
      kind: 'DONT' as const,
      title: 'Do Not Place on Low-Contrast Clutter',
      caption: 'Never place the dark primary mark directly on clashing low-contrast fills.',
      mode: 'dont-contrast' as const,
    },
  ];

  guidelines.forEach((item, idx) => {
    const col = idx % ruleCols;
    const row = Math.floor(idx / ruleCols);
    const x = 44 + col * (rW + rGap);
    const y = 92 + row * (rH + 18);

    const isDo = item.kind === 'DO';
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(isDo ? 186 : 235, isDo ? 216 : 196, isDo ? 196 : 196);
    pdf.setLineWidth(1);
    pdf.roundedRect(x, y, rW, rH, 8, 8, 'FD');

    // Artwork preview stage
    const stageRectX = x + 10;
    const stageRectY = y + 10;
    const stageRectW = rW - 20;
    const stageRectH = 122;

    if (item.mode === 'do-dark') {
      pdf.setFillColor(16, 18, 24);
      pdf.roundedRect(stageRectX, stageRectY, stageRectW, stageRectH, 5, 5, 'F');
      const f = fitIntoBox(doc.width, doc.height, stageRectX + 16, stageRectY + 12, stageRectW - 32, stageRectH - 24);
      pdf.addImage(darkTransparentUrl, 'PNG', f.x, f.y, f.w, f.h);
    } else if (item.mode === 'do-mono') {
      pdf.setFillColor(247, 246, 242);
      pdf.roundedRect(stageRectX, stageRectY, stageRectW, stageRectH, 5, 5, 'F');
      const f = fitIntoBox(doc.width, doc.height, stageRectX + 16, stageRectY + 12, stageRectW - 32, stageRectH - 24);
      pdf.addImage(monoLightUrl, 'PNG', f.x, f.y, f.w, f.h);
    } else if (item.mode === 'dont-stretch') {
      pdf.setFillColor(252, 247, 247);
      pdf.roundedRect(stageRectX, stageRectY, stageRectW, stageRectH, 5, 5, 'F');
      // Intentionally distorted horizontal squash
      pdf.addImage(
        primaryTransparentUrl,
        'PNG',
        stageRectX + 18,
        stageRectY + 42,
        stageRectW - 36,
        40
      );
    } else if (item.mode === 'dont-tilt') {
      pdf.setFillColor(252, 247, 247);
      pdf.roundedRect(stageRectX, stageRectY, stageRectW, stageRectH, 5, 5, 'F');
      const f = fitIntoBox(doc.width, doc.height, stageRectX + 34, stageRectY + 18, stageRectW - 68, stageRectH - 36);
      pdf.addImage(primaryTransparentUrl, 'PNG', f.x + 12, f.y + 8, f.w * 0.85, f.h * 0.85, undefined, 'NONE', 18);
    } else if (item.mode === 'dont-contrast') {
      // Busy clashing background
      pdf.setFillColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
      pdf.roundedRect(stageRectX, stageRectY, stageRectW, stageRectH, 5, 5, 'F');
      pdf.setFillColor(122, 128, 138);
      pdf.rect(stageRectX + 12, stageRectY + 16, stageRectW - 24, stageRectH - 32, 'F');
      const f = fitIntoBox(doc.width, doc.height, stageRectX + 16, stageRectY + 12, stageRectW - 32, stageRectH - 24);
      pdf.addImage(primaryTransparentUrl, 'PNG', f.x, f.y, f.w, f.h);
    } else {
      pdf.setFillColor(249, 249, 247);
      pdf.roundedRect(stageRectX, stageRectY, stageRectW, stageRectH, 5, 5, 'F');
      const f = fitIntoBox(doc.width, doc.height, stageRectX + 16, stageRectY + 12, stageRectW - 32, stageRectH - 24);
      pdf.addImage(primaryTransparentUrl, 'PNG', f.x, f.y, f.w, f.h);
    }

    // Diagonal slash line across DON'T preview box
    if (!isDo) {
      pdf.setDrawColor(198, 40, 40);
      pdf.setLineWidth(1.8);
      pdf.line(stageRectX + 10, stageRectY + stageRectH - 10, stageRectX + stageRectW - 10, stageRectY + 10);
    }

    // Status pill
    pdf.setFillColor(isDo ? 27 : 185, isDo ? 67 : 28, isDo ? 50 : 28);
    pdf.roundedRect(x + 12, y + 142, 42, 16, 3, 3, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text(isDo ? 'DO' : "DON'T", x + 33, y + 153, { align: 'center' });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(20, 20, 19);
    pdf.text(item.title, x + 62, y + 153, { maxWidth: rW - 72 });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(96, 92, 84);
    pdf.text(item.caption, x + 12, y + 174, { maxWidth: rW - 24 });
  });

  return pdf.output('blob');
}

export async function exportBrandGuidelinesPdf(
  doc: LogoDocument,
  palette: ColorPalette,
  brief?: BrandBrief
) {
  const blob = await buildBrandGuidelinesPdfBlob(doc, palette, brief);
  triggerBlobDownload(
    blob,
    `${slugifyFilename(brief?.businessName || doc.title)}-brand-guidelines.pdf`
  );
}
