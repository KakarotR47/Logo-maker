import { CustomSvgPart } from '../types/logo';

export interface VectorTraceOptions {
  /** Luminance/contrast threshold (40..230). Higher captures lighter strokes. Default: 175 */
  threshold?: number;
  /** Path simplification tolerance (0.3..2.5). Higher yields smoother/simpler curves. Default: 1.0 */
  smoothness?: number;
  /** Trace mode: single recolorable silhouette or 2-tone primary+accent vector */
  colorMode?: 'mono' | 'duotone';
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

interface Point {
  x: number;
  y: number;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode generated image for vector tracing.'));
    img.src = src;
  });
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
  // Split at the two farthest vertices so closed-loop RDP preserves corners symmetrically
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
          loop.pop(); // closed back to startPt
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

    // Smooth quadratic Bezier mid-point spline preserving sharp silhouette corners
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

/**
 * Traces a raster PNG/JPEG data URL (such as an AI-generated flat logo mark) into
 * crisp, recolorable compound SVG vector paths normalized to a 0..100 viewBox.
 */
export async function traceImageDataUrlToSvg(
  imageDataUrl: string,
  options: VectorTraceOptions = {}
): Promise<VectorTraceResult> {
  const threshold = options.threshold ?? 175;
  const smoothness = options.smoothness ?? 0.95;
  const colorMode = options.colorMode ?? 'mono';
  const invert = options.invert ?? false;
  const minSpeckArea = options.minSpeckArea ?? 10;

  const img = await loadImageElement(imageDataUrl);
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

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h).data;

  // Sample four corners to detect background tone automatically
  const cornerCoords = [
    [1, 1],
    [w - 2, 1],
    [1, h - 2],
    [w - 2, h - 2],
  ];
  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  for (const [cx, cy] of cornerCoords) {
    const idx = (cy * w + cx) * 4;
    bgR += imgData[idx];
    bgG += imgData[idx + 1];
    bgB += imgData[idx + 2];
  }
  bgR /= 4;
  bgG /= 4;
  bgB /= 4;
  const bgLum = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;
  const isLightBg = bgLum >= 128;

  const gw = w + 2;
  const gh = h + 2;
  const primaryMask = new Uint8Array(gw * gh);
  const secondaryMask = new Uint8Array(gw * gh);
  const lumArr = new Float32Array(w * h);

  let lumMin = 255;
  let lumMax = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];
      const a = imgData[idx + 3];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      lumArr[y * w + x] = lum;

      const colorDist = Math.hypot(r - bgR, g - bgG, b - bgB);
      let isFg = false;

      if (a >= 40) {
        if (isLightBg) {
          isFg = lum < threshold || colorDist > Math.max(36, (255 - threshold) * 1.15);
        } else {
          isFg = lum > 255 - threshold || colorDist > Math.max(36, (255 - threshold) * 1.15);
        }
      }

      if (invert) {
        isFg = !isFg;
      }

      if (isFg) {
        primaryMask[(y + 1) * gw + (x + 1)] = 1;
        if (lum < lumMin) lumMin = lum;
        if (lum > lumMax) lumMax = lum;
      }
    }
  }

  // If duotone is requested and foreground has meaningful tonal range, split into dark + mid/accent bands
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

    // Only keep duotone split if both layers carry real visual weight
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

  const primaryLoops = rawPrimaryLoops.map((loop) =>
    simplifyClosedPolygon(loop, Math.max(0.25, smoothness))
  );
  const secondaryLoops = rawSecondaryLoops.map((loop) =>
    simplifyClosedPolygon(loop, Math.max(0.25, smoothness))
  );

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

  const smoothCurves = smoothness >= 0.4;
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
