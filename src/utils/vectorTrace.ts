import { CustomSvgPart } from '../types/logo';

export interface VectorTraceOptions {
  /** Luminance/contrast threshold (40..230). Higher captures lighter strokes. Default: 175 */
  threshold?: number;
  /** Path simplification tolerance (0.3..2.5). Higher yields smoother/simpler curves. Default: 1.0 */
  smoothness?: number;
  /** Trace mode: mono silhouette, 2-tone primary+accent, or full multi-color quantization */
  colorMode?: 'mono' | 'duotone' | 'multicolor';
  /** Number of quantized color layers when colorMode === 'multicolor' (2..6) */
  maxColors?: number;
  /** Automatically strip border-connected background before tracing */
  autoRemoveBg?: boolean;
  /** Color distance tolerance (12..95) when auto-stripping background */
  bgTolerance?: number;
  /** Invert foreground/background mask */
  invert?: boolean;
  /** Minimum polygon area in trace-grid pixels^2 to keep (filters specks) */
  minSpeckArea?: number;
}

export interface VectorTraceResult {
  paths: CustomSvgPart[];
  viewBox: string;
  previewSvg: string;
  contourCount: number;
  preserveOriginalColors: boolean;
}

export interface BackgroundRemovalOptions {
  /** RGB Euclidean tolerance from border colors (12..95). Default: 38 */
  tolerance?: number;
  /** Strip enclosed holes matching the border background color (great for letters/rings). Default: true */
  removeInteriorHoles?: boolean;
  /** Smooth 1px semi-transparent edge feathering. Default: true */
  featherEdges?: boolean;
  /** Max output resolution along longest side. Default: 760 */
  maxDimension?: number;
}

export interface BackgroundRemovalResult {
  dataUrl: string;
  width: number;
  height: number;
  removedPercent: number;
}

interface Point {
  x: number;
  y: number;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image for processing.'));
    img.src = src;
  });
}

function rgbToHex(r: number, g: number, b: number): string {
  const clampByte = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clampByte(r), clampByte(g), clampByte(b)]
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

interface RgbCluster {
  r: number;
  g: number;
  b: number;
  count: number;
}

/**
 * Computes up to 3 dominant border background color clusters from the perimeter of RGBA image data.
 */
function sampleBorderColors(data: Uint8ClampedArray, w: number, h: number): RgbCluster[] {
  const samples: Array<[number, number, number]> = [];
  const stepX = Math.max(1, Math.floor(w / 40));
  const stepY = Math.max(1, Math.floor(h / 40));

  for (let x = 0; x < w; x += stepX) {
    for (const y of [0, h - 1]) {
      const idx = (y * w + x) * 4;
      if (data[idx + 3] >= 30) samples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
  }
  for (let y = 0; y < h; y += stepY) {
    for (const x of [0, w - 1]) {
      const idx = (y * w + x) * 4;
      if (data[idx + 3] >= 30) samples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
  }

  if (samples.length === 0) {
    return [{ r: 255, g: 255, b: 255, count: 1 }];
  }

  const clusters: RgbCluster[] = [];
  for (const [r, g, b] of samples) {
    let matched: RgbCluster | null = null;
    for (const c of clusters) {
      if (Math.hypot(r - c.r, g - c.g, b - c.b) < 28) {
        matched = c;
        break;
      }
    }
    if (matched) {
      const nextCount = matched.count + 1;
      matched.r = (matched.r * matched.count + r) / nextCount;
      matched.g = (matched.g * matched.count + g) / nextCount;
      matched.b = (matched.b * matched.count + b) / nextCount;
      matched.count = nextCount;
    } else if (clusters.length < 4) {
      clusters.push({ r, g, b, count: 1 });
    }
  }

  clusters.sort((a, b) => b.count - a.count);
  return clusters.slice(0, 3);
}

function minColorDistToClusters(r: number, g: number, b: number, clusters: RgbCluster[]): number {
  let best = Infinity;
  for (const c of clusters) {
    const d = Math.hypot(r - c.r, g - c.g, b - c.b);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Strips solid or softly shaded backgrounds using multi-seed border flood-fill + optional
 * interior hole clearing + 1px anti-aliased edge feathering. Returns a transparent PNG data URL.
 */
export async function removeImageBackgroundClient(
  imageDataUrl: string,
  options: BackgroundRemovalOptions = {}
): Promise<BackgroundRemovalResult> {
  const tolerance = options.tolerance ?? 38;
  const removeInteriorHoles = options.removeInteriorHoles ?? true;
  const featherEdges = options.featherEdges ?? true;
  const maxDimension = options.maxDimension ?? 760;

  const img = await loadImageElement(imageDataUrl);
  const srcW = Math.max(1, img.width);
  const srcH = Math.max(1, img.height);
  const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
  const w = Math.max(16, Math.round(srcW * scale));
  const h = Math.max(16, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable for background removal.');
  }

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const total = w * h;
  const bgClusters = sampleBorderColors(data, w, h);

  // bgMask: 1 = removed background, 0 = foreground
  const bgMask = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const trySeed = (pIdx: number) => {
    if (bgMask[pIdx] === 1) return;
    const off = pIdx * 4;
    const a = data[off + 3];
    if (a < 20) {
      bgMask[pIdx] = 1;
      queue[tail++] = pIdx;
      return;
    }
    const d = minColorDistToClusters(data[off], data[off + 1], data[off + 2], bgClusters);
    if (d <= tolerance * 1.15) {
      bgMask[pIdx] = 1;
      queue[tail++] = pIdx;
    }
  };

  for (let x = 0; x < w; x++) {
    trySeed(x);
    trySeed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    trySeed(y * w);
    trySeed(y * w + (w - 1));
  }

  // BFS edge-connected flood fill (allows slight local gradient drift + border cluster match)
  const adaptiveTol = tolerance * 1.12;
  while (head < tail) {
    const curr = queue[head++];
    const cx = curr % w;
    const cy = (curr - cx) / w;
    const cOff = curr * 4;
    const cr = data[cOff];
    const cg = data[cOff + 1];
    const cb = data[cOff + 2];

    const neighbors = [
      cx > 0 ? curr - 1 : -1,
      cx < w - 1 ? curr + 1 : -1,
      cy > 0 ? curr - w : -1,
      cy < h - 1 ? curr + w : -1,
    ];

    for (const nIdx of neighbors) {
      if (nIdx < 0 || bgMask[nIdx] === 1) continue;
      const nOff = nIdx * 4;
      const na = data[nOff + 3];
      if (na < 20) {
        bgMask[nIdx] = 1;
        queue[tail++] = nIdx;
        continue;
      }
      const nr = data[nOff];
      const ng = data[nOff + 1];
      const nb = data[nOff + 2];
      const distCluster = minColorDistToClusters(nr, ng, nb, bgClusters);
      const distLocal = Math.hypot(nr - cr, ng - cg, nb - cb);
      if (distCluster <= adaptiveTol || (distLocal <= 14 && distCluster <= adaptiveTol * 1.45)) {
        bgMask[nIdx] = 1;
        queue[tail++] = nIdx;
      }
    }
  }

  // Also strip enclosed holes (e.g. letter counters / badge cutouts) matching the primary background color
  if (removeInteriorHoles && bgClusters.length > 0) {
    const primaryBg = bgClusters[0];
    const tightTol = Math.max(12, tolerance * 0.72);
    for (let i = 0; i < total; i++) {
      if (bgMask[i] === 1) continue;
      const off = i * 4;
      if (data[off + 3] < 20) {
        bgMask[i] = 1;
        continue;
      }
      const d = Math.hypot(
        data[off] - primaryBg.r,
        data[off + 1] - primaryBg.g,
        data[off + 2] - primaryBg.b
      );
      if (d <= tightTol) {
        bgMask[i] = 1;
      }
    }
  }

  let removedCount = 0;
  for (let i = 0; i < total; i++) {
    const off = i * 4;
    if (bgMask[i] === 1) {
      data[off + 3] = 0;
      removedCount += 1;
    } else if (featherEdges) {
      const x = i % w;
      const y = (i - x) / w;
      let bgAdj = 0;
      if (x > 0 && bgMask[i - 1] === 1) bgAdj++;
      if (x < w - 1 && bgMask[i + 1] === 1) bgAdj++;
      if (y > 0 && bgMask[i - w] === 1) bgAdj++;
      if (y < h - 1 && bgMask[i + w] === 1) bgAdj++;
      if (bgAdj > 0) {
        const d = minColorDistToClusters(data[off], data[off + 1], data[off + 2], bgClusters);
        const edgeRatio = Math.min(1, Math.max(0.25, (d - tolerance * 0.55) / (tolerance * 0.85)));
        data[off + 3] = Math.round(data[off + 3] * edgeRatio);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: w,
    height: h,
    removedPercent: Math.round((removedCount / total) * 100),
  };
}

function pointKey(p: Point): string {
  return `${Math.round(p.x * 2)},${Math.round(p.y * 2)}`;
}

function shoelaceArea(pts: Point[]): number {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) * 0.5;
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

function rdpOpen(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let index = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist > epsilon) {
    const left = rdpOpen(points.slice(0, index + 1), epsilon);
    const right = rdpOpen(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

function simplifyClosedPolygon(pts: Point[], epsilon: number): Point[] {
  if (pts.length <= 4) return pts;
  let splitIdx = 0;
  let bestDist = -1;
  const anchor = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const d = (pts[i].x - anchor.x) ** 2 + (pts[i].y - anchor.y) ** 2;
    if (d > bestDist) {
      bestDist = d;
      splitIdx = i;
    }
  }
  const firstHalf = rdpOpen(pts.slice(0, splitIdx + 1), epsilon);
  const secondHalf = rdpOpen([...pts.slice(splitIdx), pts[0]], epsilon);
  const merged = [...firstHalf.slice(0, -1), ...secondHalf.slice(0, -1)];
  return merged.length >= 3 ? merged : pts;
}

/**
 * Extracts closed contour loops from a padded binary grid (1 = foreground, 0 = background)
 * using Marching Squares edge midpoints + directed half-edge chaining.
 */
function extractContoursFromMask(
  mask: Uint8Array,
  gw: number,
  gh: number,
  minSpeckArea: number
): Point[][] {
  const edgeMap = new Map<string, Point[]>();

  const addSeg = (p1: Point, p2: Point) => {
    const k = pointKey(p1);
    const list = edgeMap.get(k);
    if (list) list.push(p2);
    else edgeMap.set(k, [p2]);
  };

  for (let y = 0; y < gh - 1; y++) {
    for (let x = 0; x < gw - 1; x++) {
      const tl = mask[y * gw + x];
      const tr = mask[y * gw + (x + 1)];
      const br = mask[(y + 1) * gw + (x + 1)];
      const bl = mask[(y + 1) * gw + x];
      const code = (tl << 3) | (tr << 2) | (br << 1) | bl;

      if (code === 0 || code === 15) continue;

      const T: Point = { x: x + 0.5, y };
      const R: Point = { x: x + 1, y: y + 0.5 };
      const B: Point = { x: x + 0.5, y: y + 1 };
      const L: Point = { x, y: y + 0.5 };

      switch (code) {
        case 1:
          addSeg(L, B);
          break;
        case 2:
          addSeg(B, R);
          break;
        case 3:
          addSeg(L, R);
          break;
        case 4:
          addSeg(R, T);
          break;
        case 5:
          addSeg(L, T);
          addSeg(R, B);
          break;
        case 6:
          addSeg(B, T);
          break;
        case 7:
          addSeg(L, T);
          break;
        case 8:
          addSeg(T, L);
          break;
        case 9:
          addSeg(T, B);
          break;
        case 10:
          addSeg(T, R);
          addSeg(B, L);
          break;
        case 11:
          addSeg(T, R);
          break;
        case 12:
          addSeg(R, L);
          break;
        case 13:
          addSeg(R, B);
          break;
        case 14:
          addSeg(B, L);
          break;
      }
    }
  }

  const loops: Point[][] = [];
  const maxSteps = gw * gh * 2;

  for (const [startKey, targets] of edgeMap.entries()) {
    while (targets.length > 0) {
      const [sx, sy] = startKey.split(',').map((n) => Number(n) / 2);
      const startPt: Point = { x: sx, y: sy };
      const nextPt = targets.pop();
      if (!nextPt) break;

      const loop: Point[] = [startPt];
      let curr = nextPt;
      let steps = 0;

      while (steps < maxSteps) {
        steps += 1;
        loop.push(curr);
        const currKey = pointKey(curr);
        if (currKey === startKey) {
          loop.pop();
          break;
        }
        const candidates = edgeMap.get(currKey);
        if (!candidates || candidates.length === 0) break;
        curr = candidates.pop()!;
      }

      if (loop.length >= 4 && shoelaceArea(loop) >= minSpeckArea) {
        loops.push(loop);
      }
    }
  }

  return loops;
}

function buildCompoundSvgPath(
  loops: Point[][],
  transformPoint: (p: Point) => Point,
  smoothCurves: boolean
): string {
  const segments: string[] = [];

  for (const rawLoop of loops) {
    const pts = rawLoop.map(transformPoint);
    if (pts.length < 3) continue;

    if (!smoothCurves || pts.length < 4) {
      const first = pts[0];
      const rest = pts
        .slice(1)
        .map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
        .join(' ');
      segments.push(`M ${first.x.toFixed(2)} ${first.y.toFixed(2)} ${rest} Z`);
      continue;
    }

    const n = pts.length;
    const mid0 = {
      x: (pts[n - 1].x + pts[0].x) * 0.5,
      y: (pts[n - 1].y + pts[0].y) * 0.5,
    };
    const parts: string[] = [`M ${mid0.x.toFixed(2)} ${mid0.y.toFixed(2)}`];

    for (let i = 0; i < n; i++) {
      const pCurr = pts[i];
      const pNext = pts[(i + 1) % n];
      const mid = {
        x: (pCurr.x + pNext.x) * 0.5,
        y: (pCurr.y + pNext.y) * 0.5,
      };
      parts.push(
        `Q ${pCurr.x.toFixed(2)} ${pCurr.y.toFixed(2)} ${mid.x.toFixed(2)} ${mid.y.toFixed(2)}`
      );
    }

    parts.push('Z');
    segments.push(parts.join(' '));
  }

  return segments.join(' ');
}

interface ColorCentroid {
  r: number;
  g: number;
  b: number;
  pixelIndices: number[];
}

/**
 * Deterministic furthest-first + K-Means clustering over foreground RGB pixels.
 */
function quantizeForegroundColors(
  imgData: Uint8ClampedArray,
  fgIndices: number[],
  kTarget: number
): ColorCentroid[] {
  if (fgIndices.length === 0) return [];
  const sampleStep = Math.max(1, Math.floor(fgIndices.length / 2400));
  const sampled: Array<[number, number, number]> = [];
  for (let i = 0; i < fgIndices.length; i += sampleStep) {
    const off = fgIndices[i] * 4;
    sampled.push([imgData[off], imgData[off + 1], imgData[off + 2]]);
  }

  const k = Math.max(2, Math.min(kTarget, 6));
  // Pick furthest-first initial seeds deterministically
  const seeds: Array<[number, number, number]> = [sampled[0]];
  while (seeds.length < k && seeds.length < sampled.length) {
    let bestPt = sampled[0];
    let bestDist = -1;
    for (const pt of sampled) {
      let minD = Infinity;
      for (const s of seeds) {
        const d = (pt[0] - s[0]) ** 2 + (pt[1] - s[1]) ** 2 + (pt[2] - s[2]) ** 2;
        if (d < minD) minD = d;
      }
      if (minD > bestDist) {
        bestDist = minD;
        bestPt = pt;
      }
    }
    if (bestDist < 900) break; // remaining colors are too close to warrant another layer
    seeds.push(bestPt);
  }

  // 7 iterations of K-Means on sampled points
  let centroids = seeds.map((s) => ({ r: s[0], g: s[1], b: s[2] }));
  for (let iter = 0; iter < 7; iter++) {
    const sums = centroids.map(() => ({ r: 0, g: 0, b: 0, count: 0 }));
    for (const [r, g, b] of sampled) {
      let bestC = 0;
      let bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d =
          (r - centroids[c].r) ** 2 + (g - centroids[c].g) ** 2 + (b - centroids[c].b) ** 2;
        if (d < bestD) {
          bestD = d;
          bestC = c;
        }
      }
      sums[bestC].r += r;
      sums[bestC].g += g;
      sums[bestC].b += b;
      sums[bestC].count += 1;
    }
    centroids = sums.map((s, idx) =>
      s.count > 0
        ? { r: s.r / s.count, g: s.g / s.count, b: s.b / s.count }
        : centroids[idx]
    );
  }

  // Merge centroids that converged very closely (< 26 RGB distance)
  const merged: ColorCentroid[] = [];
  for (const c of centroids) {
    const dup = merged.find((m) => Math.hypot(m.r - c.r, m.g - c.g, m.b - c.b) < 26);
    if (!dup) {
      merged.push({ r: c.r, g: c.g, b: c.b, pixelIndices: [] });
    }
  }

  for (const pIdx of fgIndices) {
    const off = pIdx * 4;
    const r = imgData[off];
    const g = imgData[off + 1];
    const b = imgData[off + 2];
    let bestC = 0;
    let bestD = Infinity;
    for (let c = 0; c < merged.length; c++) {
      const d = (r - merged[c].r) ** 2 + (g - merged[c].g) ** 2 + (b - merged[c].b) ** 2;
      if (d < bestD) {
        bestD = d;
        bestC = c;
      }
    }
    merged[bestC].pixelIndices.push(pIdx);
  }

  // Filter out tiny noisy clusters (< 1.5% of foreground pixels) and sort largest-area first
  const minClusterPixels = Math.max(18, Math.floor(fgIndices.length * 0.015));
  const kept = merged.filter((m) => m.pixelIndices.length >= minClusterPixels);
  kept.sort((a, b) => b.pixelIndices.length - a.pixelIndices.length);
  return kept.length > 0 ? kept : [merged[0]];
}

/**
 * Traces a raster PNG/JPEG/WebP data URL (such as an AI-generated mark or rough sketch)
 * into crisp, recolorable mono, duotone, or multi-color compound SVG vector paths normalized to 0..100.
 */
export async function traceImageDataUrlToSvg(
  imageDataUrl: string,
  options: VectorTraceOptions = {}
): Promise<VectorTraceResult> {
  const threshold = options.threshold ?? 175;
  const smoothness = options.smoothness ?? 0.95;
  const colorMode = options.colorMode ?? 'mono';
  const maxColors = Math.max(2, Math.min(6, options.maxColors ?? 4));
  const autoRemoveBg = options.autoRemoveBg ?? (colorMode === 'multicolor');
  const bgTolerance = options.bgTolerance ?? 36;
  const invert = options.invert ?? false;
  const minSpeckArea = options.minSpeckArea ?? 10;

  // Optionally strip complex/solid border backgrounds first for clean isolated tracing
  const sourceUrl = autoRemoveBg
    ? (
        await removeImageBackgroundClient(imageDataUrl, {
          tolerance: bgTolerance,
          removeInteriorHoles: true,
          featherEdges: false,
          maxDimension: 360,
        })
      ).dataUrl
    : imageDataUrl;

  const img = await loadImageElement(sourceUrl);
  const traceDim = 224;
  const aspect = img.width > 0 && img.height > 0 ? img.width / img.height : 1;
  const w = aspect >= 1 ? traceDim : Math.max(64, Math.round(traceDim * aspect));
  const h = aspect >= 1 ? Math.max(64, Math.round(traceDim / aspect)) : traceDim;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable for vector tracing.');
  }

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h).data;
  const bgClusters = sampleBorderColors(imgData, w, h);
  const primaryBg = bgClusters[0] ?? { r: 255, g: 255, b: 255, count: 1 };
  const bgLum = 0.299 * primaryBg.r + 0.587 * primaryBg.g + 0.114 * primaryBg.b;
  const isLightBg = bgLum >= 128;

  const gw = w + 2;
  const gh = h + 2;
  const primaryMask = new Uint8Array(gw * gh);
  const secondaryMask = new Uint8Array(gw * gh);
  const lumArr = new Float32Array(w * h);
  const fgPixelIndices: number[] = [];

  let lumMin = 255;
  let lumMax = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pIdx = y * w + x;
      const idx = pIdx * 4;
      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];
      const a = imgData[idx + 3];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      lumArr[pIdx] = lum;

      const colorDist = minColorDistToClusters(r, g, b, bgClusters);
      let isFg = false;

      if (a >= 50) {
        if (autoRemoveBg) {
          // Since background was already made transparent, keep any opaque foreground pixel
          isFg = true;
        } else if (isLightBg) {
          isFg = lum < threshold || colorDist > Math.max(32, (255 - threshold) * 1.15);
        } else {
          isFg = lum > 255 - threshold || colorDist > Math.max(32, (255 - threshold) * 1.15);
        }
      }

      if (invert) {
        isFg = !isFg;
      }

      if (isFg) {
        primaryMask[(y + 1) * gw + (x + 1)] = 1;
        fgPixelIndices.push(pIdx);
        if (lum < lumMin) lumMin = lum;
        if (lum > lumMax) lumMax = lum;
      }
    }
  }

  if (fgPixelIndices.length === 0) {
    throw new Error(
      'No distinct vector shapes detected. Try adjusting Threshold, Background Tolerance, or Invert Mask.'
    );
  }

  const smoothCurves = smoothness >= 0.4;
  const eps = Math.max(0.25, smoothness);

  // MULTI-COLOR QUANTIZED TRACE PATH
  if (colorMode === 'multicolor') {
    const clusters = quantizeForegroundColors(imgData, fgPixelIndices, maxColors);
    const layerEntries: Array<{ hex: string; loops: Point[][]; label: string }> = [];

    clusters.forEach((cluster, idx) => {
      const mask = new Uint8Array(gw * gh);
      for (const pIdx of cluster.pixelIndices) {
        const px = pIdx % w;
        const py = (pIdx - px) / w;
        mask[(py + 1) * gw + (px + 1)] = 1;
      }
      const rawLoops = extractContoursFromMask(mask, gw, gh, minSpeckArea);
      const loops = rawLoops.map((loop) => simplifyClosedPolygon(loop, eps));
      if (loops.length > 0) {
        layerEntries.push({
          hex: rgbToHex(cluster.r, cluster.g, cluster.b),
          loops,
          label: idx === 0 ? 'Primary Color' : `Color Layer ${idx + 1}`,
        });
      }
    });

    const allLoops = layerEntries.flatMap((e) => e.loops);
    if (allLoops.length === 0) {
      throw new Error(
        'No distinct multi-color vector paths detected. Try adjusting Background Tolerance or Smoothing.'
      );
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const loop of allLoops) {
      for (const pt of loop) {
        if (pt.x < minX) minX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y > maxY) maxY = pt.y;
      }
    }

    const spanW = Math.max(1, maxX - minX);
    const spanH = Math.max(1, maxY - minY);
    const scale = 90 / Math.max(spanW, spanH);
    const offsetX = 50 - (minX + spanW * 0.5) * scale;
    const offsetY = 50 - (minY + spanH * 0.5) * scale;
    const transformPoint = (p: Point): Point => ({
      x: p.x * scale + offsetX,
      y: p.y * scale + offsetY,
    });

    const paths: CustomSvgPart[] = layerEntries
      .map((entry) => ({
        d: buildCompoundSvgPath(entry.loops, transformPoint, smoothCurves),
        fill: entry.hex,
        fillRule: 'evenodd' as const,
        label: entry.label,
      }))
      .filter((p) => Boolean(p.d));

    const pathElementsXml = paths
      .map(
        (p) =>
          `<path d="${p.d}" fill="${p.fill ?? '#141413'}" fill-rule="${p.fillRule ?? 'evenodd'}" />`
      )
      .join('');

    return {
      paths,
      viewBox: '0 0 100 100',
      previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${pathElementsXml}</svg>`,
      contourCount: allLoops.length,
      preserveOriginalColors: true,
    };
  }

  // MONO / DUOTONE TRACE PATH
  let hasDualTone = false;
  if (colorMode === 'duotone' && lumMax - lumMin > 35) {
    const splitPoint = lumMin + (lumMax - lumMin) * 0.54;
    let secCount = 0;
    let priCount = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const gIdx = (y + 1) * gw + (x + 1);
        if (primaryMask[gIdx] === 1) {
          const lum = lumArr[y * w + x];
          const isAccentBand = isLightBg ? lum > splitPoint : lum < splitPoint;
          if (isAccentBand) {
            primaryMask[gIdx] = 0;
            secondaryMask[gIdx] = 1;
            secCount += 1;
          } else {
            priCount += 1;
          }
        }
      }
    }

    if (secCount > 24 && priCount > 24) {
      hasDualTone = true;
    } else {
      for (let i = 0; i < primaryMask.length; i++) {
        if (secondaryMask[i] === 1) {
          primaryMask[i] = 1;
          secondaryMask[i] = 0;
        }
      }
    }
  }

  const rawPrimaryLoops = extractContoursFromMask(primaryMask, gw, gh, minSpeckArea);
  const rawSecondaryLoops = hasDualTone
    ? extractContoursFromMask(secondaryMask, gw, gh, minSpeckArea)
    : [];

  const primaryLoops = rawPrimaryLoops.map((loop) => simplifyClosedPolygon(loop, eps));
  const secondaryLoops = rawSecondaryLoops.map((loop) => simplifyClosedPolygon(loop, eps));

  const allLoops = [...primaryLoops, ...secondaryLoops];
  if (allLoops.length === 0) {
    throw new Error(
      'No distinct vector shapes detected at this threshold. Try raising Threshold or toggling Invert.'
    );
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const loop of allLoops) {
    for (const pt of loop) {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    }
  }

  const spanW = Math.max(1, maxX - minX);
  const spanH = Math.max(1, maxY - minY);
  const targetSpan = 90;
  const scale = targetSpan / Math.max(spanW, spanH);
  const offsetX = 50 - (minX + spanW * 0.5) * scale;
  const offsetY = 50 - (minY + spanH * 0.5) * scale;

  const transformPoint = (p: Point): Point => ({
    x: p.x * scale + offsetX,
    y: p.y * scale + offsetY,
  });

  const primaryD = buildCompoundSvgPath(primaryLoops, transformPoint, smoothCurves);
  const secondaryD = hasDualTone
    ? buildCompoundSvgPath(secondaryLoops, transformPoint, smoothCurves)
    : '';

  const paths: CustomSvgPart[] = [];
  if (primaryD) {
    paths.push({
      d: primaryD,
      fill: '#141413',
      fillRule: 'evenodd',
      label: 'Primary Mark',
    });
  }
  if (secondaryD) {
    paths.push({
      d: secondaryD,
      fill: '#2D6A4F',
      fillRule: 'evenodd',
      label: 'Accent Detail',
    });
  }

  const pathElementsXml = paths
    .map(
      (p) =>
        `<path d="${p.d}" fill="${p.fill ?? '#141413'}" fill-rule="${p.fillRule ?? 'evenodd'}" />`
    )
    .join('');

  return {
    paths,
    viewBox: '0 0 100 100',
    previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${pathElementsXml}</svg>`,
    contourCount: allLoops.length,
    preserveOriginalColors: hasDualTone,
  };
}
