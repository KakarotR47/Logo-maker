import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { flushSync } from 'react-dom';
import { LogoDocumentSvg } from '../components/CanvasLayerRenderer';
import { BrandBrief, ColorPalette, CustomSvgLayer, LogoDocument } from '../types/logo';
import { extractBrandVariants, nextLayerId } from './logoGenerator';
import { tryConvertTextLayerToPath } from './textToPath';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function slugifyFilename(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'logo'
  );
}

function resolveInheritedAttr(el: Element, attr: string): string | undefined {
  let cur: Element | null = el;
  while (cur) {
    const val = cur.getAttribute(attr);
    if (val !== null && val !== '') return val;
    cur = cur.parentElement;
  }
  return undefined;
}

function normalizeSvgColor(val: string | undefined, fallback: string): string | undefined {
  if (!val) return undefined;
  const clean = val.trim();
  if (!clean) return undefined;
  if (clean.toLowerCase() === 'currentcolor') return fallback;
  return clean;
}

/**
 * Resolves a guaranteed opaque background hex color for solid exports, PDFs, favicons, and social crops.
 */
export function resolveSolidBackground(
  doc: LogoDocument,
  palette?: ColorPalette,
  overrideBg?: string
): string {
  if (overrideBg && overrideBg !== 'transparent') return overrideBg;
  if (doc.backgroundColor && doc.backgroundColor !== 'transparent') return doc.backgroundColor;
  if (palette?.background && palette.background !== 'transparent') return palette.background;
  return '#FFFFFF';
}

/**
 * Computes proportional export dimensions for a target long-edge pixel resolution (1000, 2000, 4000).
 * For landscape or square artboards, width equals targetLongEdge.
 */
export function computeProportionalDimensions(
  doc: LogoDocument,
  targetLongEdge: number
): { width: number; height: number } {
  const safeW = Math.max(1, doc.width);
  const safeH = Math.max(1, doc.height);
  if (safeW >= safeH) {
    return {
      width: targetLongEdge,
      height: Math.max(1, Math.round((targetLongEdge * safeH) / safeW)),
    };
  }
  return {
    width: Math.max(1, Math.round((targetLongEdge * safeW) / safeH)),
    height: targetLongEdge,
  };
}

/**
 * Safely parses a user-uploaded or Iconify .svg file into an editable CustomSvgLayer
 * supporting <path>, <circle>, <ellipse>, <rect>, <polygon>, <polyline>, and <line>,
 * preserving inherited fill/stroke attributes so every individual SVG part is recolorable.
 */
export function parseUploadedSvgToLayer(
  svgString: string,
  fileName: string,
  defaultColor: string,
  centerPos?: { x: number; y: number }
): CustomSvgLayer {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(svgString, 'image/svg+xml');
  const svgEl = parsed.querySelector('svg');
  const rawViewBox = svgEl?.getAttribute('viewBox');
  const wAttr = parseFloat(svgEl?.getAttribute('width') || '0');
  const hAttr = parseFloat(svgEl?.getAttribute('height') || '0');
  const viewBox =
    rawViewBox || (wAttr > 0 && hAttr > 0 ? `0 0 ${wAttr} ${hAttr}` : '0 0 24 24');

  const paths: CustomSvgLayer['paths'] = [];

  if (svgEl) {
    const elements = svgEl.querySelectorAll(
      'path, rect, circle, ellipse, polygon, polyline, line'
    );
    let partIdx = 1;

    elements.forEach((el) => {
      if (el.closest('defs, clipPath, mask')) return;

      const rawFill = normalizeSvgColor(resolveInheritedAttr(el, 'fill'), defaultColor);
      const rawStroke = normalizeSvgColor(resolveInheritedAttr(el, 'stroke'), defaultColor);
      const rawSw = parseFloat(resolveInheritedAttr(el, 'stroke-width') || '0');

      const fill = rawFill ?? (rawStroke && rawStroke !== 'none' ? 'none' : defaultColor);
      const stroke = rawStroke;
      const strokeWidth = Number.isFinite(rawSw) && rawSw > 0 ? rawSw : undefined;

      const tag = el.tagName.toLowerCase();
      let d: string | null = null;
      let label = `Part ${partIdx}`;

      if (tag === 'path') {
        d = el.getAttribute('d');
        label = `Path ${partIdx}`;
      } else if (tag === 'rect') {
        const x = parseFloat(el.getAttribute('x') || '0');
        const y = parseFloat(el.getAttribute('y') || '0');
        const w = parseFloat(el.getAttribute('width') || '0');
        const h = parseFloat(el.getAttribute('height') || '0');
        const rx = Math.min(
          w / 2,
          parseFloat(el.getAttribute('rx') || el.getAttribute('ry') || '0') || 0
        );
        if (w > 0 && h > 0) {
          if (rx > 0) {
            d = `M ${x + rx} ${y} H ${x + w - rx} A ${rx} ${rx} 0 0 1 ${x + w} ${y + rx} V ${y + h - rx} A ${rx} ${rx} 0 0 1 ${x + w - rx} ${y + h} H ${x + rx} A ${rx} ${rx} 0 0 1 ${x} ${y + h - rx} V ${y + rx} A ${rx} ${rx} 0 0 1 ${x + rx} ${y} Z`;
          } else {
            d = `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
          }
          label = `Rect ${partIdx}`;
        }
      } else if (tag === 'circle') {
        const cx = parseFloat(el.getAttribute('cx') || '0');
        const cy = parseFloat(el.getAttribute('cy') || '0');
        const r = parseFloat(el.getAttribute('r') || '0');
        if (r > 0) {
          d = `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
          label = `Circle ${partIdx}`;
        }
      } else if (tag === 'ellipse') {
        const cx = parseFloat(el.getAttribute('cx') || '0');
        const cy = parseFloat(el.getAttribute('cy') || '0');
        const rx = parseFloat(el.getAttribute('rx') || '0');
        const ry = parseFloat(el.getAttribute('ry') || '0');
        if (rx > 0 && ry > 0) {
          d = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
          label = `Ellipse ${partIdx}`;
        }
      } else if (tag === 'line') {
        const x1 = parseFloat(el.getAttribute('x1') || '0');
        const y1 = parseFloat(el.getAttribute('y1') || '0');
        const x2 = parseFloat(el.getAttribute('x2') || '0');
        const y2 = parseFloat(el.getAttribute('y2') || '0');
        d = `M ${x1} ${y1} L ${x2} ${y2}`;
        label = `Line ${partIdx}`;
      } else if (tag === 'polygon' || tag === 'polyline') {
        const pts = (el.getAttribute('points') || '').trim();
        const coords = pts.split(/[\s,]+/).filter(Boolean);
        if (coords.length >= 4) {
          d = `M ${coords[0]} ${coords[1]}`;
          for (let i = 2; i + 1 < coords.length; i += 2) {
            d += ` L ${coords[i]} ${coords[i + 1]}`;
          }
          if (tag === 'polygon') d += ' Z';
          label = `${tag === 'polygon' ? 'Polygon' : 'Polyline'} ${partIdx}`;
        }
      }

      if (d) {
        paths.push({
          d,
          fill: tag === 'line' || tag === 'polyline' ? 'none' : fill,
          stroke:
            stroke ?? (tag === 'line' || tag === 'polyline' ? defaultColor : undefined),
          strokeWidth:
            strokeWidth ?? (tag === 'line' || tag === 'polyline' || fill === 'none' ? 2 : undefined),
          label,
        });
        partIdx += 1;
      }
    });
  }

  if (paths.length === 0) {
    paths.push({
      d: 'M 50 10 L 88 32 V 68 L 50 90 L 12 68 V 32 Z',
      fill: defaultColor,
      label: 'Part 1',
    });
  }

  return {
    id: nextLayerId('svg'),
    name: fileName.replace(/\.svg$/i, '') || 'Uploaded Vector',
    type: 'custom-svg',
    x: centerPos ? Math.round(centerPos.x - 80) : 320,
    y: centerPos ? Math.round(centerPos.y - 80) : 220,
    width: 160,
    height: 160,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: defaultColor,
    stroke: 'none',
    strokeWidth: 0,
    shadow: {
      enabled: false,
      color: 'rgba(17, 24, 39, 0.18)',
      blur: 10,
      offsetX: 0,
      offsetY: 6,
    },
    paths,
    viewBox,
    preserveOriginalColors: true,
  };
}

/**
 * Removes editor-only hit-target rects & metadata attributes from a rendered SVG DOM tree
 * so exported SVGs are clean, lightweight, and designer-friendly.
 */
function sanitizeExportedSvgDom(svgNode: SVGSVGElement) {
  svgNode.querySelectorAll('g[data-layer-id]').forEach((g) => {
    const firstChild = g.firstElementChild;
    if (
      firstChild &&
      firstChild.tagName.toLowerCase() === 'rect' &&
      firstChild.getAttribute('fill') === 'transparent' &&
      firstChild.getAttribute('x') === '0' &&
      firstChild.getAttribute('y') === '0'
    ) {
      firstChild.remove();
    }
    const title = g.querySelector(':scope > title');
    if (title) {
      title.removeAttribute('data-cx');
      title.removeAttribute('data-cy');
    }
    g.removeAttribute('data-layer-id');
  });

  svgNode.querySelectorAll('text').forEach((txt) => {
    txt.removeAttribute('style');
  });
}

/**
 * Computes the union bounding box of visible artwork inside an SVG DOM node,
 * preferring live SVG getBBox() measurements and falling back to layer bounds.
 */
function measureDocumentArtBounds(
  svgNode: SVGSVGElement,
  doc: LogoDocument
): { minX: number; minY: number; maxX: number; maxY: number } {
  const visibleLayers = doc.layers.filter((l) => l.visible);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const layerGroups = Array.from(svgNode.querySelectorAll(':scope > g[data-layer-id]'));
  visibleLayers.forEach((layer, idx) => {
    const groupEl = layerGroups[idx] as SVGGraphicsElement | undefined;
    let measured = false;
    if (groupEl && typeof groupEl.getBBox === 'function') {
      try {
        const b = groupEl.getBBox();
        if (Number.isFinite(b.width) && b.width > 0.5 && Number.isFinite(b.height) && b.height > 0.5) {
          minX = Math.min(minX, layer.x + b.x);
          minY = Math.min(minY, layer.y + b.y);
          maxX = Math.max(maxX, layer.x + b.x + b.width);
          maxY = Math.max(maxY, layer.y + b.y + b.height);
          measured = true;
        }
      } catch {
        measured = false;
      }
    }
    if (!measured) {
      minX = Math.min(minX, layer.x);
      minY = Math.min(minY, layer.y);
      maxX = Math.max(maxX, layer.x + layer.width);
      maxY = Math.max(maxY, layer.y + layer.height);
    }
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || maxX <= minX || maxY <= minY) {
    return { minX: 0, minY: 0, maxX: doc.width, maxY: doc.height };
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Renders any LogoDocument cleanly to a standalone SVG XML string.
 * Optionally outlines all TextLayers into vector <path> glyphs before export,
 * and can fit/center artwork cleanly into any target aspect ratio (for favicons & social crops).
 */
export async function buildCleanSvgString(
  doc: LogoDocument,
  options: {
    transparentBackground?: boolean;
    outlineText?: boolean;
    forceBackground?: string;
    targetWidth?: number;
    targetHeight?: number;
    fitToArtwork?: boolean;
    paddingRatio?: number;
  } = {}
): Promise<string> {
  let exportDoc: LogoDocument = {
    ...doc,
    transparentBackground: options.transparentBackground ?? doc.transparentBackground,
  };

  if (options.outlineText) {
    const convertedLayers = await Promise.all(
      exportDoc.layers.map(async (layer) =>
        layer.type === 'text' ? tryConvertTextLayerToPath(layer) : layer
      )
    );
    exportDoc = { ...exportDoc, layers: convertedLayers };
  }

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-9999px';
  host.style.top = '-9999px';
  host.style.visibility = 'hidden';
  host.style.pointerEvents = 'none';
  document.body.appendChild(host);

  let root: ReturnType<typeof createRoot> | null = null;
  try {
    const activeRoot = createRoot(host);
    root = activeRoot;
    flushSync(() => {
      activeRoot.render(
        React.createElement(LogoDocumentSvg, {
          doc: exportDoc,
          idPrefix: 'exp',
          forceBackground: options.forceBackground,
        })
      );
    });
    const svgNode = host.querySelector('svg');
    if (!svgNode) throw new Error('SVG render failed');

    // Measure tight bounds BEFORE stripping hit-target rects? No — strip hit-target rects FIRST
    // while keeping data-layer-id so getBBox() measures only actual artwork!
    svgNode.querySelectorAll('g[data-layer-id]').forEach((g) => {
      const firstChild = g.firstElementChild;
      if (
        firstChild &&
        firstChild.tagName.toLowerCase() === 'rect' &&
        firstChild.getAttribute('fill') === 'transparent' &&
        firstChild.getAttribute('x') === '0' &&
        firstChild.getAttribute('y') === '0'
      ) {
        firstChild.remove();
      }
    });

    const outW = options.targetWidth ?? exportDoc.width;
    const outH = options.targetHeight ?? exportDoc.height;

    if (options.fitToArtwork) {
      const bounds = measureDocumentArtBounds(svgNode, exportDoc);
      const boxW = Math.max(1, bounds.maxX - bounds.minX);
      const boxH = Math.max(1, bounds.maxY - bounds.minY);
      const cx = (bounds.minX + bounds.maxX) / 2;
      const cy = (bounds.minY + bounds.maxY) / 2;
      const padding = Math.min(0.4, Math.max(0.02, options.paddingRatio ?? 0.14));
      const safe = 1 - 2 * padding;
      const scale = Math.max(boxW / (outW * safe), boxH / (outH * safe));
      const vbW = outW * scale;
      const vbH = outH * scale;
      const vbX = cx - vbW / 2;
      const vbY = cy - vbH / 2;

      svgNode.setAttribute(
        'viewBox',
        `${vbX.toFixed(2)} ${vbY.toFixed(2)} ${vbW.toFixed(2)} ${vbH.toFixed(2)}`
      );

      const bgRect = svgNode.querySelector(':scope > rect');
      if (bgRect) {
        bgRect.setAttribute('x', vbX.toFixed(2));
        bgRect.setAttribute('y', vbY.toFixed(2));
        bgRect.setAttribute('width', vbW.toFixed(2));
        bgRect.setAttribute('height', vbH.toFixed(2));
      }
    }

    sanitizeExportedSvgDom(svgNode);
    svgNode.setAttribute('width', `${outW}`);
    svgNode.setAttribute('height', `${outH}`);
    const serializer = new XMLSerializer();
    const xml = serializer.serializeToString(svgNode);
    return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
  } finally {
    root?.unmount();
    host.remove();
  }
}

export async function exportLogoSvg(
  doc: LogoDocument,
  options: { transparentBackground?: boolean; outlineText?: boolean; forceBackground?: string } = {}
) {
  const svgXml = await buildCleanSvgString(doc, options);
  const blob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
  const suffix = options.transparentBackground ? '-transparent' : '';
  triggerDownload(blob, `${slugifyFilename(doc.title)}${suffix}.svg`);
}

export async function svgToPngBlob(
  svgXml: string,
  targetWidth: number,
  targetHeight: number,
  background?: string
): Promise<Blob> {
  const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Unable to rasterize SVG image'));
      image.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (background && background !== 'transparent') {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))),
        'image/png'
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function renderLogoPngBlob(
  doc: LogoDocument,
  targetWidth: number,
  targetHeight: number,
  options: {
    transparentBackground?: boolean;
    solidBackground?: string;
    fitToArtwork?: boolean;
    paddingRatio?: number;
  } = {}
): Promise<Blob> {
  const transparent = Boolean(options.transparentBackground);
  const bg = transparent ? undefined : options.solidBackground ?? doc.backgroundColor;
  const svgXml = await buildCleanSvgString(doc, {
    transparentBackground: transparent,
    outlineText: true,
    forceBackground: transparent ? 'transparent' : bg,
    targetWidth,
    targetHeight,
    fitToArtwork: options.fitToArtwork,
    paddingRatio: options.paddingRatio,
  });

  return svgToPngBlob(svgXml, targetWidth, targetHeight, transparent ? undefined : bg);
}

export async function exportLogoPng(
  doc: LogoDocument,
  scaleOrLongEdge = 3,
  transparentBackground = true,
  options?: { targetLongEdge?: number; palette?: ColorPalette }
) {
  const dims = options?.targetLongEdge
    ? computeProportionalDimensions(doc, options.targetLongEdge)
    : {
        width: Math.round(doc.width * scaleOrLongEdge),
        height: Math.round(doc.height * scaleOrLongEdge),
      };

  const solidBg = resolveSolidBackground(doc, options?.palette);
  const blob = await renderLogoPngBlob(doc, dims.width, dims.height, {
    transparentBackground,
    solidBackground: solidBg,
  });
  const bgLabel = transparentBackground ? 'transparent' : 'solid';
  triggerDownload(blob, `${slugifyFilename(doc.title)}-${dims.width}x${dims.height}-${bgLabel}.png`);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if (clean.length !== 6) return { r: 27, g: 67, b: 50 };
  return {
    r: parseInt(clean.slice(0, 2), 16) || 0,
    g: parseInt(clean.slice(2, 4), 16) || 0,
    b: parseInt(clean.slice(4, 6), 16) || 0,
  };
}

function rgbToCmyk(r: number, g: number, b: number): { c: number; m: number; y: number; k: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k >= 0.999) return { c: 0, m: 0, y: 0, k: 100 };
  const c = ((1 - rn - k) / (1 - k)) * 100;
  const m = ((1 - gn - k) / (1 - k)) * 100;
  const y = ((1 - bn - k) / (1 - k)) * 100;
  return {
    c: Math.round(c),
    m: Math.round(m),
    y: Math.round(y),
    k: Math.round(k * 100),
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read image blob'));
    reader.readAsDataURL(blob);
  });
}

function drawCropMarks(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  markLen = 14,
  offset = 6
) {
  pdf.setDrawColor(40, 40, 38);
  pdf.setLineWidth(0.6);

  // Top-left
  pdf.line(x - offset - markLen, y, x - offset, y);
  pdf.line(x, y - offset - markLen, x, y - offset);
  // Top-right
  pdf.line(x + w + offset, y, x + w + offset + markLen, y);
  pdf.line(x + w, y - offset - markLen, x + w, y - offset);
  // Bottom-left
  pdf.line(x - offset - markLen, y + h, x - offset, y + h);
  pdf.line(x, y + h + offset, x, y + h + offset + markLen);
  // Bottom-right
  pdf.line(x + w + offset, y + h, x + w + offset + markLen, y + h);
  pdf.line(x + w, y + h + offset, x + w, y + h + offset + markLen);

  // Center registration crosshairs (top & bottom)
  const midX = x + w / 2;
  const topCy = y - offset - markLen / 2;
  const botCy = y + h + offset + markLen / 2;
  [topCy, botCy].forEach((cy) => {
    pdf.circle(midX, cy, 4, 'S');
    pdf.line(midX - 6, cy, midX + 6, cy);
    pdf.line(midX, cy - 6, midX, cy + 6);
  });
}

/**
 * Generates a 2-page Print-Ready PDF (A4 Landscape):
 * - Page 1: High-res Print Master with crop marks, registration crosshairs, and trim specs
 * - Page 2: Brand Identity Spec Sheet with light/dark lockups, HEX/RGB/CMYK color specs & font breakdown
 */
export async function buildLogoPdfBlob(
  doc: LogoDocument,
  palette: ColorPalette,
  brief?: BrandBrief
): Promise<Blob> {
  const solidBg = resolveSolidBackground(doc, palette);
  const primaryDims = computeProportionalDimensions(doc, 2400);
  const primaryBlob = await renderLogoPngBlob(doc, primaryDims.width, primaryDims.height, {
    transparentBackground: false,
    solidBackground: solidBg,
  });
  const primaryDataUrl = await blobToDataUrl(primaryBlob);

  const fallbackBrief: BrandBrief = brief ?? {
    businessName: doc.title,
    tagline: '',
    audience: '',
    industry: 'Creative & Media',
    style: 'modern',
    symbolIdea: '',
    paletteId: palette.id,
    primaryFontId: 'outfit',
    secondaryFontId: 'plus-jakarta',
  };
  const variants = extractBrandVariants(doc, fallbackBrief, palette);
  const darkDims = computeProportionalDimensions(variants.darkModeDocument, 1200);
  const darkBlob = await renderLogoPngBlob(
    variants.darkModeDocument,
    darkDims.width,
    darkDims.height,
    {
      transparentBackground: false,
      solidBackground: variants.darkModeDocument.backgroundColor,
    }
  );
  const darkDataUrl = await blobToDataUrl(darkBlob);

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // --- PAGE 1: PRINT-READY MASTER ARTWORK WITH TRIM/CROP MARKS ---
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageW, pageH, 'F');

  // Header metadata
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor(20, 20, 19);
  pdf.text(brief?.businessName || doc.title, 44, 42);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(92, 89, 81);
  pdf.text(
    `PRINT-READY MASTER PROOF  ·  300 DPI RASTERIZED  ·  TRIM ARTBOARD: ${doc.width} × ${doc.height} PT`,
    44,
    57
  );

  // Fit artwork frame cleanly inside printable area with room for crop marks
  const maxBoxW = pageW - 160;
  const maxBoxH = pageH - 175;
  const aspect = doc.width / Math.max(1, doc.height);
  let frameW = maxBoxW;
  let frameH = frameW / aspect;
  if (frameH > maxBoxH) {
    frameH = maxBoxH;
    frameW = frameH * aspect;
  }
  const frameX = (pageW - frameW) / 2;
  const frameY = 92 + (maxBoxH - frameH) / 2;

  pdf.addImage(primaryDataUrl, 'PNG', frameX, frameY, frameW, frameH);
  pdf.setDrawColor(218, 216, 208);
  pdf.setLineWidth(0.5);
  pdf.rect(frameX, frameY, frameW, frameH);
  drawCropMarks(pdf, frameX, frameY, frameW, frameH);

  // Print calibration color strip at bottom left
  const stripColors = [
    [0, 174, 239],
    [236, 0, 140],
    [255, 242, 0],
    [20, 20, 19],
    [hexToRgb(palette.primary).r, hexToRgb(palette.primary).g, hexToRgb(palette.primary).b],
    [hexToRgb(palette.accent).r, hexToRgb(palette.accent).g, hexToRgb(palette.accent).b],
  ];
  stripColors.forEach(([r, g, b], idx) => {
    pdf.setFillColor(r, g, b);
    pdf.rect(44 + idx * 14, pageH - 34, 12, 10, 'F');
  });

  pdf.setFont('courier', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(110, 108, 102);
  pdf.text(
    `BACKGROUND: ${solidBg.toUpperCase()}  |  PAGE 1 OF 2 — PRINT MASTER`,
    pageW - 44,
    pageH - 26,
    { align: 'right' }
  );

  // --- PAGE 2: BRAND IDENTITY & COLOR SPECIFICATION SHEET ---
  pdf.addPage('a4', 'landscape');
  pdf.setFillColor(248, 247, 243);
  pdf.rect(0, 0, pageW, pageH, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(17);
  pdf.setTextColor(20, 20, 19);
  pdf.text(`${brief?.businessName || doc.title} — Brand Specification`, 44, 48);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(92, 89, 81);
  pdf.text(
    'Light & Dark Lockups · Print CMYK / Digital HEX & RGB Color Values · Typography Reference',
    44,
    65
  );

  // Left column: Primary & Dark Lockups
  const cardW = 360;
  const cardH = Math.round((cardW * doc.height) / Math.max(1, doc.width));
  const clampedCardH = Math.min(205, cardH);
  const clampedCardW = Math.round((clampedCardH * doc.width) / Math.max(1, doc.height));

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(92, 89, 81);
  pdf.text('PRIMARY LOCKUP', 44, 96);
  pdf.addImage(primaryDataUrl, 'PNG', 44, 104, clampedCardW, clampedCardH);
  pdf.setDrawColor(218, 216, 208);
  pdf.rect(44, 104, clampedCardW, clampedCardH);

  const darkTop = 104 + clampedCardH + 28;
  pdf.text('REVERSED / DARK SURFACE LOCKUP', 44, darkTop - 8);
  pdf.addImage(darkDataUrl, 'PNG', 44, darkTop, clampedCardW, clampedCardH);
  pdf.rect(44, darkTop, clampedCardW, clampedCardH);

  // Right column: Color Specifications (HEX / RGB / CMYK)
  const specX = 436;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(20, 20, 19);
  pdf.text('Color Palette Specifications', specX, 104);

  const swatches: Array<[string, string]> = [
    ['Primary Brand', palette.primary],
    ['Accent', palette.accent],
    ['Secondary Tint', palette.secondary],
    ['Typography Ink', palette.text],
    ['Canvas Surface', solidBg],
  ];

  swatches.forEach(([label, hex], idx) => {
    const y = 122 + idx * 54;
    const rgb = hexToRgb(hex);
    const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);

    pdf.setFillColor(rgb.r, rgb.g, rgb.b);
    pdf.setDrawColor(200, 198, 190);
    pdf.roundedRect(specX, y, 40, 40, 4, 4, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(20, 20, 19);
    pdf.text(label, specX + 52, y + 13);

    pdf.setFont('courier', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(75, 73, 68);
    pdf.text(
      `HEX ${hex.toUpperCase()}   ·   RGB(${rgb.r}, ${rgb.g}, ${rgb.b})`,
      specX + 52,
      y + 27
    );
    pdf.text(
      `CMYK ${cmyk.c}% / ${cmyk.m}% / ${cmyk.y}% / ${cmyk.k}%`,
      specX + 52,
      y + 39
    );
  });

  // Typography Summary Box
  const textLayers = doc.layers.filter((l) => l.type === 'text');
  const fontNames = Array.from(
    new Set(
      textLayers
        .map((l) => (l.type === 'text' ? l.fontFamily.split(',')[0]?.replace(/['"]/g, '').trim() : ''))
        .filter(Boolean)
    )
  );
  const typoY = 415;
  pdf.setDrawColor(218, 216, 208);
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(specX, typoY, pageW - specX - 44, 108, 6, 6, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(20, 20, 19);
  pdf.text('Typography & Export Notes', specX + 14, typoY + 22);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(80, 78, 72);
  pdf.text(
    `Typefaces: ${fontNames.length > 0 ? fontNames.join(' + ') : 'Vector Outlined Paths'}`,
    specX + 14,
    typoY + 42
  );
  pdf.text(`Palette Theme: ${palette.name}`, specX + 14, typoY + 58);
  pdf.text('Vectors: Clean SVG (text outlined to curves for press compatibility)', specX + 14, typoY + 74);
  pdf.text('Digital: 1000px / 2000px / 4000px PNGs + Web Favicons & Social Crops', specX + 14, typoY + 90);

  return pdf.output('blob');
}

export async function exportLogoPdf(
  doc: LogoDocument,
  palette: ColorPalette,
  brief?: BrandBrief
) {
  const blob = await buildLogoPdfBlob(doc, palette, brief);
  triggerDownload(blob, `${slugifyFilename(brief?.businessName || doc.title)}-print-ready.pdf`);
}

export interface SocialCropSpec {
  id: string;
  fileName: string;
  label: string;
  platform: string;
  width: number;
  height: number;
  paddingRatio: number;
  kind: 'avatar' | 'banner';
}

export const FAVICON_SPECS = [
  { fileName: 'favicon-16x16.png', size: 16, label: 'Browser Tab (16×16)' },
  { fileName: 'favicon-32x32.png', size: 32, label: 'Retina Tab (32×32)' },
  { fileName: 'apple-touch-icon-180x180.png', size: 180, label: 'Apple Touch Icon (180×180)' },
] as const;

export const SOCIAL_CROP_SPECS: SocialCropSpec[] = [
  {
    id: 'instagram-avatar',
    fileName: 'profile-instagram-1080x1080.png',
    label: 'Instagram / Threads Profile',
    platform: 'Instagram',
    width: 1080,
    height: 1080,
    paddingRatio: 0.18,
    kind: 'avatar',
  },
  {
    id: 'youtube-avatar',
    fileName: 'profile-youtube-800x800.png',
    label: 'YouTube Channel Avatar',
    platform: 'YouTube',
    width: 800,
    height: 800,
    paddingRatio: 0.18,
    kind: 'avatar',
  },
  {
    id: 'facebook-avatar',
    fileName: 'profile-facebook-512x512.png',
    label: 'Facebook Page Profile',
    platform: 'Facebook',
    width: 512,
    height: 512,
    paddingRatio: 0.16,
    kind: 'avatar',
  },
  {
    id: 'twitter-avatar',
    fileName: 'profile-x-twitter-400x400.png',
    label: 'X / Twitter Avatar',
    platform: 'X / Twitter',
    width: 400,
    height: 400,
    paddingRatio: 0.18,
    kind: 'avatar',
  },
  {
    id: 'linkedin-avatar',
    fileName: 'profile-linkedin-400x400.png',
    label: 'LinkedIn Company Logo',
    platform: 'LinkedIn',
    width: 400,
    height: 400,
    paddingRatio: 0.14,
    kind: 'avatar',
  },
  {
    id: 'og-share',
    fileName: 'social-og-share-1200x630.png',
    label: 'OpenGraph Social Share Card',
    platform: 'OpenGraph',
    width: 1200,
    height: 630,
    paddingRatio: 0.18,
    kind: 'banner',
  },
  {
    id: 'twitter-header',
    fileName: 'cover-x-twitter-1500x500.png',
    label: 'X / Social Header Banner',
    platform: 'Cover Banner',
    width: 1500,
    height: 500,
    paddingRatio: 0.22,
    kind: 'banner',
  },
];

export async function exportFaviconPackage(
  markDoc: LogoDocument,
  brandName: string,
  options?: {
    fullDoc?: LogoDocument;
    palette?: ColorPalette;
    includeSocialCrops?: boolean;
  }
) {
  const zip = new JSZip();
  const solidBg = resolveSolidBackground(markDoc, options?.palette);

  const faviconSvg = await buildCleanSvgString(markDoc, {
    transparentBackground: false,
    outlineText: true,
    forceBackground: solidBg,
    targetWidth: 512,
    targetHeight: 512,
    fitToArtwork: true,
    paddingRatio: 0.14,
  });

  zip.file('favicon.svg', faviconSvg);

  for (const spec of FAVICON_SPECS) {
    const png = await svgToPngBlob(faviconSvg, spec.size, spec.size, solidBg);
    zip.file(spec.fileName, png);
  }

  // Also include standard Android PWA sizes
  for (const extraSize of [192, 512]) {
    const png = await svgToPngBlob(faviconSvg, extraSize, extraSize, solidBg);
    zip.file(`android-chrome-${extraSize}x${extraSize}.png`, png);
  }

  const manifest = {
    name: brandName,
    short_name: brandName.slice(0, 12),
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    theme_color: solidBg,
    background_color: solidBg,
    display: 'standalone',
  };
  zip.file('site.webmanifest', JSON.stringify(manifest, null, 2));

  zip.file(
    'favicon-head-snippet.html',
    `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />\n` +
      `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />\n` +
      `<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />\n` +
      `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png" />\n` +
      `<link rel="manifest" href="/site.webmanifest" />\n`
  );

  if (options?.includeSocialCrops) {
    const socialFolder = zip.folder('social-crops');
    if (socialFolder) {
      const fullSource = options.fullDoc ?? markDoc;
      for (const spec of SOCIAL_CROP_SPECS) {
        const srcDoc = spec.kind === 'banner' ? fullSource : markDoc;
        const blob = await renderLogoPngBlob(srcDoc, spec.width, spec.height, {
          transparentBackground: false,
          solidBackground: solidBg,
          fitToArtwork: true,
          paddingRatio: spec.paddingRatio,
        });
        socialFolder.file(spec.fileName, blob);
      }
    }
  }

  const archive = await zip.generateAsync({ type: 'blob' });
  triggerDownload(archive, `${slugifyFilename(brandName)}-web-social-bundle.zip`);
}

export interface BrandZipPackageOptions {
  includeSvg: boolean;
  includePngs: boolean;
  includePdf: boolean;
  includeWebAndSocial: boolean;
  outlineTextInSvg: boolean;
  cropSource: 'mark' | 'full';
  solidBackgroundOverride?: string;
  onProgress?: (info: { step: number; total: number; label: string }) => void;
}

const yieldToFrame = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Packages the complete Multi-Format Brand Export ZIP containing:
 * - Clean, scalable SVG vector files (outlined & editable + standalone mark)
 * - High-resolution PNGs (1000px, 2000px, 4000px) with both solid and transparent backgrounds
 * - Print-ready 2-page PDF with crop marks & CMYK/HEX/RGB specs
 * - Web Favicon bundle (16x16, 32x32, 180x180, SVG, manifest) & Social media profile crops
 */
export async function exportCompleteBrandZip(
  doc: LogoDocument,
  brief: BrandBrief,
  palette: ColorPalette,
  options: BrandZipPackageOptions
): Promise<{ fileCount: number; zipFileName: string }> {
  const zip = new JSZip();
  const slug = slugifyFilename(brief.businessName || doc.title);
  const solidBg = resolveSolidBackground(doc, palette, options.solidBackgroundOverride);
  const variants = extractBrandVariants(doc, brief, palette);
  const cropDoc = options.cropSource === 'mark' ? variants.markOnlyDocument : doc;

  const resolutions = [1000, 2000, 4000] as const;

  let totalSteps = 1; // README + ZIP compression
  if (options.includeSvg) totalSteps += 4;
  if (options.includePngs) totalSteps += resolutions.length * 2;
  if (options.includePdf) totalSteps += 1;
  if (options.includeWebAndSocial) totalSteps += FAVICON_SPECS.length + 1 + SOCIAL_CROP_SPECS.length;

  let step = 0;
  let fileCount = 0;
  const tick = async (label: string) => {
    step += 1;
    options.onProgress?.({ step: Math.min(step, totalSteps), total: totalSteps, label });
    await yieldToFrame();
  };

  // 1. Clean, scalable SVG vector files
  if (options.includeSvg) {
    const svgFolder = zip.folder('01-vector-svg')!;

    await tick('Generating scalable SVG (solid background)...');
    const solidSvg = await buildCleanSvgString(doc, {
      transparentBackground: false,
      outlineText: options.outlineTextInSvg,
      forceBackground: solidBg,
    });
    svgFolder.file(`${slug}-logo-solid.svg`, solidSvg);
    fileCount += 1;

    await tick('Generating scalable SVG (transparent background)...');
    const transparentSvg = await buildCleanSvgString(doc, {
      transparentBackground: true,
      outlineText: options.outlineTextInSvg,
      forceBackground: 'transparent',
    });
    svgFolder.file(`${slug}-logo-transparent.svg`, transparentSvg);
    fileCount += 1;

    await tick('Generating editable-text SVG source...');
    const editableSvg = await buildCleanSvgString(doc, {
      transparentBackground: true,
      outlineText: false,
      forceBackground: 'transparent',
    });
    svgFolder.file(`${slug}-logo-editable-text.svg`, editableSvg);
    fileCount += 1;

    await tick('Generating standalone mark SVG...');
    const markSvg = await buildCleanSvgString(variants.markOnlyDocument, {
      transparentBackground: true,
      outlineText: options.outlineTextInSvg,
      forceBackground: 'transparent',
      targetWidth: 512,
      targetHeight: 512,
      fitToArtwork: true,
      paddingRatio: 0.12,
    });
    svgFolder.file(`${slug}-mark-only.svg`, markSvg);
    fileCount += 1;
  }

  // 2. High-resolution PNGs (1000px, 2000px, 4000px) — Solid & Transparent
  if (options.includePngs) {
    const solidFolder = zip.folder('02-png-solid')!;
    const transparentFolder = zip.folder('03-png-transparent')!;

    for (const res of resolutions) {
      const dims = computeProportionalDimensions(doc, res);

      await tick(`Rendering ${res}px solid PNG (${dims.width}×${dims.height})...`);
      const solidPng = await renderLogoPngBlob(doc, dims.width, dims.height, {
        transparentBackground: false,
        solidBackground: solidBg,
      });
      solidFolder.file(`${slug}-${res}px-solid.png`, solidPng);
      fileCount += 1;

      await tick(`Rendering ${res}px transparent PNG (${dims.width}×${dims.height})...`);
      const transparentPng = await renderLogoPngBlob(doc, dims.width, dims.height, {
        transparentBackground: true,
      });
      transparentFolder.file(`${slug}-${res}px-transparent.png`, transparentPng);
      fileCount += 1;
    }
  }

  // 3. Print-ready PDF
  if (options.includePdf) {
    const pdfFolder = zip.folder('04-print-pdf')!;
    await tick('Building 2-page print-ready PDF proof & color spec...');
    const pdfBlob = await buildLogoPdfBlob(doc, palette, brief);
    pdfFolder.file(`${slug}-print-ready.pdf`, pdfBlob);
    fileCount += 1;
  }

  // 4. Web Favicon bundle (16x16, 32x32, 180x180) & Social media profile crops
  if (options.includeWebAndSocial) {
    const favFolder = zip.folder('05-web-favicons')!;
    await tick('Generating scalable favicon.svg & manifest...');

    const favSvg = await buildCleanSvgString(cropDoc, {
      transparentBackground: false,
      outlineText: true,
      forceBackground: solidBg,
      targetWidth: 512,
      targetHeight: 512,
      fitToArtwork: true,
      paddingRatio: 0.14,
    });
    favFolder.file('favicon.svg', favSvg);
    fileCount += 1;

    for (const spec of FAVICON_SPECS) {
      await tick(`Rendering ${spec.fileName} (${spec.size}×${spec.size})...`);
      const png = await svgToPngBlob(favSvg, spec.size, spec.size, solidBg);
      favFolder.file(spec.fileName, png);
      fileCount += 1;
    }

    // Standard PWA icons referenced by site.webmanifest
    for (const extraSize of [192, 512]) {
      const png = await svgToPngBlob(favSvg, extraSize, extraSize, solidBg);
      favFolder.file(`android-chrome-${extraSize}x${extraSize}.png`, png);
      fileCount += 1;
    }

    const brandName = brief.businessName || doc.title;
    favFolder.file(
      'site.webmanifest',
      JSON.stringify(
        {
          name: brandName,
          short_name: brandName.slice(0, 12),
          icons: [
            { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
          ],
          theme_color: solidBg,
          background_color: solidBg,
          display: 'standalone',
        },
        null,
        2
      )
    );
    favFolder.file(
      'favicon-html-tags.html',
      `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />\n` +
        `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />\n` +
        `<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />\n` +
        `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png" />\n` +
        `<link rel="manifest" href="/site.webmanifest" />\n`
    );
    fileCount += 2;

    const socialFolder = zip.folder('06-social-media-crops')!;
    for (const spec of SOCIAL_CROP_SPECS) {
      await tick(`Rendering ${spec.platform} crop (${spec.width}×${spec.height})...`);
      const source = spec.kind === 'banner' ? doc : cropDoc;
      const png = await renderLogoPngBlob(source, spec.width, spec.height, {
        transparentBackground: false,
        solidBackground: solidBg,
        fitToArtwork: true,
        paddingRatio: spec.paddingRatio,
      });
      socialFolder.file(spec.fileName, png);
      fileCount += 1;
    }
  }

  // Brand Spec README
  const primaryRgb = hexToRgb(palette.primary);
  const primaryCmyk = rgbToCmyk(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  const accentRgb = hexToRgb(palette.accent);
  const accentCmyk = rgbToCmyk(accentRgb.r, accentRgb.g, accentRgb.b);

  zip.file(
    'README.txt',
    [
      `${brief.businessName || doc.title} — Brand Asset Package`,
      `Generated on ${new Date().toISOString().slice(0, 10)}`,
      ``,
      `PALETTE SPECIFICATIONS (${palette.name})`,
      `- Primary:    ${palette.primary.toUpperCase()} | RGB(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}) | CMYK(${primaryCmyk.c}%, ${primaryCmyk.m}%, ${primaryCmyk.y}%, ${primaryCmyk.k}%)`,
      `- Accent:     ${palette.accent.toUpperCase()} | RGB(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}) | CMYK(${accentCmyk.c}%, ${accentCmyk.m}%, ${accentCmyk.y}%, ${accentCmyk.k}%)`,
      `- Secondary:  ${palette.secondary.toUpperCase()}`,
      `- Text Ink:   ${palette.text.toUpperCase()}`,
      `- Background: ${solidBg.toUpperCase()}`,
      ``,
      `INCLUDED FOLDERS`,
      options.includeSvg ? `- 01-vector-svg/: Scalable vector SVGs (solid, transparent, editable text, mark-only)` : null,
      options.includePngs ? `- 02-png-solid/: High-res PNGs at 1000px, 2000px, and 4000px on solid ${solidBg}` : null,
      options.includePngs ? `- 03-png-transparent/: High-res PNGs at 1000px, 2000px, and 4000px with transparency` : null,
      options.includePdf ? `- 04-print-pdf/: 2-page A4 Print Master (with crop marks) & Brand Spec Sheet` : null,
      options.includeWebAndSocial ? `- 05-web-favicons/: 16x16, 32x32, 180x180, SVG favicon, webmanifest & HTML snippet` : null,
      options.includeWebAndSocial ? `- 06-social-media-crops/: Instagram, YouTube, Facebook, X/Twitter, LinkedIn, & OG Share crops` : null,
    ]
      .filter(Boolean)
      .join('\n')
  );
  fileCount += 1;

  await tick('Compressing brand archive (.zip)...');
  const archive = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  const zipFileName = `${slug}-brand-export.zip`;
  triggerDownload(archive, zipFileName);

  return { fileCount, zipFileName };
}
