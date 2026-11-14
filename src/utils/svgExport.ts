import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { flushSync } from 'react-dom';
import { LogoDocumentSvg } from '../components/CanvasLayerRenderer';
import { ColorPalette, CustomSvgLayer, LogoDocument } from '../types/logo';
import { nextLayerId } from './logoGenerator';
import { convertTextLayerToPath } from './textToPath';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugify(input: string): string {
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
      // Skip elements inside <defs> or <clipPath>
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
 * Renders any LogoDocument cleanly to a standalone SVG XML string.
 * Optionally outlines all TextLayers into vector <path> glyphs before export.
 */
export async function buildCleanSvgString(
  doc: LogoDocument,
  options: { transparentBackground?: boolean; outlineText?: boolean; forceBackground?: string } = {}
): Promise<string> {
  let exportDoc: LogoDocument = {
    ...doc,
    transparentBackground: options.transparentBackground ?? doc.transparentBackground,
  };

  if (options.outlineText) {
    const convertedLayers = await Promise.all(
      exportDoc.layers.map(async (layer) =>
        layer.type === 'text' ? convertTextLayerToPath(layer) : layer
      )
    );
    exportDoc = { ...exportDoc, layers: convertedLayers };
  }

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-9999px';
  host.style.top = '-9999px';
  document.body.appendChild(host);

  try {
    const root = createRoot(host);
    flushSync(() => {
      root.render(
        React.createElement(LogoDocumentSvg, {
          doc: exportDoc,
          idPrefix: 'exp',
          forceBackground: options.forceBackground,
        })
      );
    });
    const svgNode = host.querySelector('svg');
    if (!svgNode) throw new Error('SVG render failed');
    svgNode.setAttribute('width', `${exportDoc.width}`);
    svgNode.setAttribute('height', `${exportDoc.height}`);
    const serializer = new XMLSerializer();
    const xml = serializer.serializeToString(svgNode);
    root.unmount();
    return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
  } finally {
    host.remove();
  }
}

export async function exportLogoSvg(
  doc: LogoDocument,
  options: { transparentBackground?: boolean; outlineText?: boolean } = {}
) {
  const svgXml = await buildCleanSvgString(doc, options);
  const blob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
  triggerDownload(blob, `${slugify(doc.title)}.svg`);
}

async function svgToPngBlob(
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
      image.onerror = reject;
      image.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');

    if (background && background !== 'transparent') {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('PNG export failed'))),
        'image/png'
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportLogoPng(
  doc: LogoDocument,
  scale = 3,
  transparentBackground = true
) {
  // Outline text first so Google Fonts always rasterize accurately inside SVG Blob images!
  const svgXml = await buildCleanSvgString(doc, {
    transparentBackground,
    outlineText: true,
  });
  const w = Math.round(doc.width * scale);
  const h = Math.round(doc.height * scale);
  const blob = await svgToPngBlob(
    svgXml,
    w,
    h,
    transparentBackground ? undefined : doc.backgroundColor
  );
  triggerDownload(blob, `${slugify(doc.title)}-${w}x${h}.png`);
}

export async function exportLogoPdf(doc: LogoDocument, palette: ColorPalette) {
  const svgXml = await buildCleanSvgString(doc, {
    transparentBackground: false,
    outlineText: true,
    forceBackground: doc.backgroundColor,
  });

  const pngBlob = await svgToPngBlob(svgXml, 1600, 1200, doc.backgroundColor);
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(pngBlob);
  });

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageW = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(248, 248, 247);
  pdf.rect(0, 0, pageW, pdf.internal.pageSize.getHeight(), 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(20, 20, 19);
  pdf.text(doc.title, 44, 52);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(95, 95, 90);
  pdf.text('Master Brand Proof Sheet · Vector-Ready Identity Specification', 44, 70);

  // Main proof frame
  pdf.addImage(dataUrl, 'PNG', 44, 92, 480, 360);
  pdf.setDrawColor(218, 216, 208);
  pdf.rect(44, 92, 480, 360);

  // Palette color specification panel on right
  const specX = 552;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(20, 20, 19);
  pdf.text('Brand Color Palette', specX, 112);

  const swatches: Array<[string, string]> = [
    ['Primary', palette.primary],
    ['Accent', palette.accent],
    ['Secondary', palette.secondary],
    ['Ink / Text', palette.text],
    ['Canvas', palette.background],
  ];

  swatches.forEach(([label, hex], idx) => {
    const y = 132 + idx * 52;
    const rgb = hexToRgb(hex);
    pdf.setFillColor(rgb.r, rgb.g, rgb.b);
    pdf.setDrawColor(200, 200, 195);
    pdf.roundedRect(specX, y, 36, 36, 4, 4, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(20, 20, 19);
    pdf.text(label, specX + 48, y + 15);
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(90, 90, 86);
    pdf.text(hex.toUpperCase(), specX + 48, y + 30);
  });

  pdf.save(`${slugify(doc.title)}-brand-sheet.pdf`);
}

export async function exportFaviconPackage(
  markDoc: LogoDocument,
  brandName: string
) {
  const zip = new JSZip();
  const sizes = [
    { file: 'favicon-16x16.png', size: 16 },
    { file: 'favicon-32x32.png', size: 32 },
    { file: 'favicon-48x48.png', size: 48 },
    { file: 'apple-touch-icon.png', size: 180 },
    { file: 'android-chrome-192x192.png', size: 192 },
    { file: 'android-chrome-512x512.png', size: 512 },
  ];

  // Crop square aspect centered around artboard center for crisp square icons
  const squareSide = Math.min(markDoc.width, markDoc.height);
  const offsetX = (markDoc.width - squareSide) / 2;
  const squareDoc: LogoDocument = {
    ...markDoc,
    width: squareSide,
    height: squareSide,
    layers: markDoc.layers.map((l) => ({
      ...l,
      x: l.x - offsetX,
    })),
  };

  const svgXml = await buildCleanSvgString(squareDoc, {
    transparentBackground: false,
    outlineText: true,
    forceBackground: squareDoc.backgroundColor,
  });

  zip.file('favicon.svg', svgXml);

  for (const item of sizes) {
    const png = await svgToPngBlob(svgXml, item.size, item.size, squareDoc.backgroundColor);
    zip.file(item.file, png);
  }

  const manifest = {
    name: brandName,
    short_name: brandName.slice(0, 12),
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    theme_color: squareDoc.backgroundColor,
    background_color: squareDoc.backgroundColor,
    display: 'standalone',
  };
  zip.file('site.webmanifest', JSON.stringify(manifest, null, 2));

  zip.file(
    'favicon-head-snippet.html',
    `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />\n` +
      `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />\n` +
      `<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />\n` +
      `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />\n` +
      `<link rel="manifest" href="/site.webmanifest" />\n`
  );

  const archive = await zip.generateAsync({ type: 'blob' });
  triggerDownload(archive, `${slugify(brandName)}-favicon-package.zip`);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return { r: 27, g: 67, b: 50 };
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}
