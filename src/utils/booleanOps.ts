import polygonClipping, { Geom, MultiPolygon, Pair, Ring } from 'polygon-clipping';
import { buildShapePath } from '../components/CanvasLayerRenderer';
import { VECTOR_ICONS } from '../data/logoLibrary';
import {
  CustomSvgLayer,
  IconLayer,
  LogoLayer,
  PathLayer,
  ShapeLayer,
  TextLayer,
} from '../types/logo';
import { nextLayerId } from './logoGenerator';
import { tryConvertTextLayerToPath } from './textToPath';

export type BooleanOpKind = 'unite' | 'subtract' | 'intersect' | 'exclude';

const CMD_REGEX = /([a-zA-Z])|([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)/g;

interface PathTokenStream {
  tokens: string[];
  idx: number;
}

function isCommand(tok: string | undefined): boolean {
  return Boolean(tok && /^[a-zA-Z]$/.test(tok));
}

function nextNum(stream: PathTokenStream): number {
  const val = parseFloat(stream.tokens[stream.idx] ?? '0');
  stream.idx += 1;
  return Number.isFinite(val) ? val : 0;
}

function hasMoreNums(stream: PathTokenStream): boolean {
  return stream.idx < stream.tokens.length && !isCommand(stream.tokens[stream.idx]);
}

function sampleCubic(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  steps = 18
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x =
      mt * mt * mt * x0 +
      3 * mt * mt * t * x1 +
      3 * mt * t * t * x2 +
      t * t * t * x3;
    const y =
      mt * mt * mt * y0 +
      3 * mt * mt * t * y1 +
      3 * mt * t * t * y2 +
      t * t * t * y3;
    pts.push([x, y]);
  }
  return pts;
}

function sampleQuadratic(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  steps = 14
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt * mt * x0 + 2 * mt * t * x1 + t * t * x2;
    const y = mt * mt * y0 + 2 * mt * t * y1 + t * t * y2;
    pts.push([x, y]);
  }
  return pts;
}

function sampleSvgArc(
  x1: number,
  y1: number,
  rxIn: number,
  ryIn: number,
  angleDeg: number,
  largeArcFlag: number,
  sweepFlag: number,
  x2: number,
  y2: number
): [number, number][] {
  if (Math.hypot(x2 - x1, y2 - y1) < 1e-6) return [[x2, y2]];
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx < 1e-6 || ry < 1e-6) return [[x2, y2]];

  const phi = (angleDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const dx2 = (x1 - x2) / 2;
  const dy2 = (y1 - y2) / 2;
  const x1p = cosPhi * dx2 + sinPhi * dy2;
  const y1p = -sinPhi * dx2 + cosPhi * dy2;

  const rxSq = rx * rx;
  const rySq = ry * ry;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;

  const lambda = x1pSq / rxSq + y1pSq / rySq;
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    rx *= s;
    ry *= s;
  }

  const rx2 = rx * rx;
  const ry2 = ry * ry;
  const num = Math.max(0, rx2 * ry2 - rx2 * y1pSq - ry2 * x1pSq);
  const den = rx2 * y1pSq + ry2 * x1pSq;
  const factor = den > 1e-9 ? Math.sqrt(num / den) : 0;
  const sign = largeArcFlag === sweepFlag ? -1 : 1;
  const cxp = sign * factor * ((rx * y1p) / ry);
  const cyp = sign * factor * (-(ry * x1p) / rx);

  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

  const vecAngle = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    const ratio = len > 1e-9 ? Math.max(-1, Math.min(1, dot / len)) : 1;
    const ang = Math.acos(ratio);
    return ux * vy - uy * vx < 0 ? -ang : ang;
  };

  const ux = (x1p - cxp) / rx;
  const uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx;
  const vy = (-y1p - cyp) / ry;

  const theta1 = vecAngle(1, 0, ux, uy);
  let dTheta = vecAngle(ux, uy, vx, vy);
  if (!sweepFlag && dTheta > 0) dTheta -= Math.PI * 2;
  if (sweepFlag && dTheta < 0) dTheta += Math.PI * 2;

  const steps = Math.max(12, Math.min(48, Math.ceil((Math.abs(dTheta) / Math.PI) * 24)));
  const pts: [number, number][] = [];
  for (let i = 1; i <= steps; i++) {
    const theta = theta1 + (dTheta * i) / steps;
    const px = rx * Math.cos(theta);
    const py = ry * Math.sin(theta);
    pts.push([
      cosPhi * px - sinPhi * py + cx,
      sinPhi * px + cosPhi * py + cy,
    ]);
  }
  return pts;
}

export function flattenSvgPathToRings(d: string): Ring[] {
  const tokens: string[] = [];
  let match: RegExpExecArray | null;
  CMD_REGEX.lastIndex = 0;
  while ((match = CMD_REGEX.exec(d)) !== null) {
    tokens.push(match[0]);
  }

  const stream: PathTokenStream = { tokens, idx: 0 };
  const rings: Ring[] = [];
  let currentRing: [number, number][] = [];
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;
  let lastCmd = '';
  let lastCtrlX = 0;
  let lastCtrlY = 0;

  const flushRing = () => {
    if (currentRing.length >= 3) {
      const first = currentRing[0];
      const last = currentRing[currentRing.length - 1];
      if (Math.hypot(first[0] - last[0], first[1] - last[1]) > 0.05) {
        currentRing.push([first[0], first[1]]);
      } else {
        currentRing[currentRing.length - 1] = [first[0], first[1]];
      }
      rings.push(currentRing);
    }
    currentRing = [];
  };

  while (stream.idx < stream.tokens.length) {
    let cmd = stream.tokens[stream.idx];
    if (isCommand(cmd)) {
      stream.idx += 1;
    } else {
      cmd = lastCmd === 'M' ? 'L' : lastCmd === 'm' ? 'l' : lastCmd;
    }

    switch (cmd) {
      case 'M':
      case 'm': {
        let firstPair = true;
        while (hasMoreNums(stream)) {
          const nx = nextNum(stream);
          const ny = nextNum(stream);
          const x = cmd === 'm' ? cx + nx : nx;
          const y = cmd === 'm' ? cy + ny : ny;
          if (firstPair) {
            flushRing();
            currentRing = [[x, y]];
            startX = x;
            startY = y;
            firstPair = false;
          } else {
            currentRing.push([x, y]);
          }
          cx = x;
          cy = y;
        }
        lastCmd = cmd;
        break;
      }
      case 'L':
      case 'l': {
        while (hasMoreNums(stream)) {
          const nx = nextNum(stream);
          const ny = nextNum(stream);
          cx = cmd === 'l' ? cx + nx : nx;
          cy = cmd === 'l' ? cy + ny : ny;
          currentRing.push([cx, cy]);
        }
        lastCmd = cmd;
        break;
      }
      case 'H':
      case 'h': {
        while (hasMoreNums(stream)) {
          const nx = nextNum(stream);
          cx = cmd === 'h' ? cx + nx : nx;
          currentRing.push([cx, cy]);
        }
        lastCmd = cmd;
        break;
      }
      case 'V':
      case 'v': {
        while (hasMoreNums(stream)) {
          const ny = nextNum(stream);
          cy = cmd === 'v' ? cy + ny : ny;
          currentRing.push([cx, cy]);
        }
        lastCmd = cmd;
        break;
      }
      case 'C':
      case 'c': {
        while (hasMoreNums(stream)) {
          const x1 = (cmd === 'c' ? cx : 0) + nextNum(stream);
          const y1 = (cmd === 'c' ? cy : 0) + nextNum(stream);
          const x2 = (cmd === 'c' ? cx : 0) + nextNum(stream);
          const y2 = (cmd === 'c' ? cy : 0) + nextNum(stream);
          const x = (cmd === 'c' ? cx : 0) + nextNum(stream);
          const y = (cmd === 'c' ? cy : 0) + nextNum(stream);
          currentRing.push(...sampleCubic(cx, cy, x1, y1, x2, y2, x, y));
          lastCtrlX = x2;
          lastCtrlY = y2;
          cx = x;
          cy = y;
        }
        lastCmd = cmd;
        break;
      }
      case 'S':
      case 's': {
        while (hasMoreNums(stream)) {
          const prevIsCubic = 'CcSs'.includes(lastCmd);
          const x1 = prevIsCubic ? 2 * cx - lastCtrlX : cx;
          const y1 = prevIsCubic ? 2 * cy - lastCtrlY : cy;
          const x2 = (cmd === 's' ? cx : 0) + nextNum(stream);
          const y2 = (cmd === 's' ? cy : 0) + nextNum(stream);
          const x = (cmd === 's' ? cx : 0) + nextNum(stream);
          const y = (cmd === 's' ? cy : 0) + nextNum(stream);
          currentRing.push(...sampleCubic(cx, cy, x1, y1, x2, y2, x, y));
          lastCtrlX = x2;
          lastCtrlY = y2;
          cx = x;
          cy = y;
          lastCmd = cmd;
        }
        lastCmd = cmd;
        break;
      }
      case 'Q':
      case 'q': {
        while (hasMoreNums(stream)) {
          const x1 = (cmd === 'q' ? cx : 0) + nextNum(stream);
          const y1 = (cmd === 'q' ? cy : 0) + nextNum(stream);
          const x = (cmd === 'q' ? cx : 0) + nextNum(stream);
          const y = (cmd === 'q' ? cy : 0) + nextNum(stream);
          currentRing.push(...sampleQuadratic(cx, cy, x1, y1, x, y));
          lastCtrlX = x1;
          lastCtrlY = y1;
          cx = x;
          cy = y;
        }
        lastCmd = cmd;
        break;
      }
      case 'T':
      case 't': {
        while (hasMoreNums(stream)) {
          const prevIsQuad = 'QqTt'.includes(lastCmd);
          const x1 = prevIsQuad ? 2 * cx - lastCtrlX : cx;
          const y1 = prevIsQuad ? 2 * cy - lastCtrlY : cy;
          const x = (cmd === 't' ? cx : 0) + nextNum(stream);
          const y = (cmd === 't' ? cy : 0) + nextNum(stream);
          currentRing.push(...sampleQuadratic(cx, cy, x1, y1, x, y));
          lastCtrlX = x1;
          lastCtrlY = y1;
          cx = x;
          cy = y;
          lastCmd = cmd;
        }
        lastCmd = cmd;
        break;
      }
      case 'A':
      case 'a': {
        while (hasMoreNums(stream)) {
          const rx = nextNum(stream);
          const ry = nextNum(stream);
          const rot = nextNum(stream);
          const largeArc = nextNum(stream);
          const sweep = nextNum(stream);
          const x = (cmd === 'a' ? cx : 0) + nextNum(stream);
          const y = (cmd === 'a' ? cy : 0) + nextNum(stream);
          currentRing.push(...sampleSvgArc(cx, cy, rx, ry, rot, largeArc, sweep, x, y));
          cx = x;
          cy = y;
        }
        lastCmd = cmd;
        break;
      }
      case 'Z':
      case 'z': {
        flushRing();
        cx = startX;
        cy = startY;
        lastCmd = cmd;
        break;
      }
      default: {
        stream.idx += 1;
        break;
      }
    }
  }

  flushRing();
  return rings;
}

function transformPointForLayer(px: number, py: number, layer: LogoLayer): Pair {
  let lx = layer.flipX ? layer.width - px : px;
  let ly = layer.flipY ? layer.height - py : py;

  if (layer.rotation) {
    const cx = layer.width / 2;
    const cy = layer.height / 2;
    const rad = (layer.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = lx - cx;
    const dy = ly - cy;
    lx = cx + dx * cos - dy * sin;
    ly = cy + dx * sin + dy * cos;
  }

  return [Number((layer.x + lx).toFixed(2)), Number((layer.y + ly).toFixed(2))];
}

function ringsToWorldGeom(rings: Ring[], layer: LogoLayer, mode: 'union' | 'xor' = 'xor'): MultiPolygon {
  const worldGeoms: Geom[] = rings
    .filter((r) => r.length >= 3)
    .map((r) => [[r.map(([x, y]) => transformPointForLayer(x, y, layer))]]);

  if (worldGeoms.length === 0) return [];
  if (worldGeoms.length === 1) return worldGeoms[0] as MultiPolygon;
  return mode === 'xor'
    ? polygonClipping.xor(worldGeoms[0], ...worldGeoms.slice(1))
    : polygonClipping.union(worldGeoms[0], ...worldGeoms.slice(1));
}

function layerToWorldMultiPolygon(layer: LogoLayer): MultiPolygon {
  if (layer.type === 'shape') {
    const sw = Math.max(4, layer.strokeWidth || 6);
    if (layer.shapeKind === 'ring') {
      const outer = flattenSvgPathToRings(
        buildShapePath('circle', layer.width, layer.height, layer.cornerRadius)
      );
      const inset = Math.min(sw, Math.min(layer.width, layer.height) * 0.35);
      const innerRaw = flattenSvgPathToRings(
        buildShapePath('circle', Math.max(8, layer.width - inset * 2), Math.max(8, layer.height - inset * 2), 0)
      ).map((r) => r.map(([x, y]): Pair => [x + inset, y + inset]));
      const outerGeom = ringsToWorldGeom(outer, layer, 'union');
      const innerGeom = ringsToWorldGeom(innerRaw, layer, 'union');
      return innerGeom.length > 0 ? polygonClipping.difference(outerGeom, innerGeom) : outerGeom;
    }
    if (layer.shapeKind === 'frame') {
      const outer = flattenSvgPathToRings(
        buildShapePath('frame', layer.width, layer.height, layer.cornerRadius)
      );
      const inset = Math.max(6, Math.min(sw + 4, Math.min(layer.width, layer.height) * 0.28));
      const innerRaw = flattenSvgPathToRings(
        buildShapePath(
          'rounded-rect',
          Math.max(8, layer.width - inset * 2),
          Math.max(8, layer.height - inset * 2),
          Math.max(0, layer.cornerRadius * 0.7)
        )
      ).map((r) => r.map(([x, y]): Pair => [x + inset, y + inset]));
      const outerGeom = ringsToWorldGeom(outer, layer, 'union');
      const innerGeom = ringsToWorldGeom(innerRaw, layer, 'union');
      return innerGeom.length > 0 ? polygonClipping.difference(outerGeom, innerGeom) : outerGeom;
    }
    const d = buildShapePath(layer.shapeKind, layer.width, layer.height, layer.cornerRadius);
    return ringsToWorldGeom(flattenSvgPathToRings(d), layer, 'xor');
  }

  if (layer.type === 'path') {
    const sx = layer.width / Math.max(1, layer.sourceViewBox.width);
    const sy = layer.height / Math.max(1, layer.sourceViewBox.height);
    const allRings: Ring[] = [];
    for (const d of layer.pathDataList) {
      const rings = flattenSvgPathToRings(d).map((r) =>
        r.map(([x, y]): Pair => [x * sx, y * sy])
      );
      allRings.push(...rings);
    }
    return ringsToWorldGeom(allRings, layer, 'xor');
  }

  if (layer.type === 'icon') {
    const icon = VECTOR_ICONS.find((ic) => ic.id === layer.iconId);
    if (!icon) return [];
    const sx = layer.width / 100;
    const sy = layer.height / 100;
    const solidRings: Ring[] = [];
    const cutoutRings: Ring[] = [];
    for (const p of icon.paths) {
      if (p.strokeOnly) continue;
      const rings = flattenSvgPathToRings(p.d).map((r) =>
        r.map(([x, y]): Pair => [x * sx, y * sy])
      );
      if (p.role === 'cutout') cutoutRings.push(...rings);
      else solidRings.push(...rings);
    }
    const base = ringsToWorldGeom(solidRings, layer, 'xor');
    if (cutoutRings.length === 0) return base;
    const cut = ringsToWorldGeom(cutoutRings, layer, 'union');
    return polygonClipping.difference(base, cut);
  }

  if (layer.type === 'custom-svg') {
    const parts = layer.viewBox.trim().split(/\s+/).map(Number);
    const vbX = Number.isFinite(parts[0]) ? parts[0] : 0;
    const vbY = Number.isFinite(parts[1]) ? parts[1] : 0;
    const vbW = Number.isFinite(parts[2]) && parts[2] > 0 ? parts[2] : 100;
    const vbH = Number.isFinite(parts[3]) && parts[3] > 0 ? parts[3] : 100;
    const sx = layer.width / vbW;
    const sy = layer.height / vbH;
    const allRings: Ring[] = [];
    for (const p of layer.paths) {
      if (p.fill === 'none') continue;
      const rings = flattenSvgPathToRings(p.d).map((r) =>
        r.map(([x, y]): Pair => [(x - vbX) * sx, (y - vbY) * sy])
      );
      allRings.push(...rings);
    }
    return ringsToWorldGeom(allRings, layer, 'xor');
  }

  return [];
}

export function isCombinableVectorLayer(layer: LogoLayer): boolean {
  return (
    layer.type === 'shape' ||
    layer.type === 'path' ||
    layer.type === 'icon' ||
    layer.type === 'custom-svg'
  );
}

function multiPolygonToCompoundPath(
  mp: MultiPolygon,
  offsetX: number,
  offsetY: number
): string {
  const subpaths: string[] = [];
  for (const poly of mp) {
    for (const ring of poly) {
      if (ring.length < 3) continue;
      const cmds = ring.map(([x, y], i) => {
        const rx = (x - offsetX).toFixed(2);
        const ry = (y - offsetY).toFixed(2);
        return `${i === 0 ? 'M' : 'L'} ${rx} ${ry}`;
      });
      subpaths.push(`${cmds.join(' ')} Z`);
    }
  }
  return subpaths.join(' ');
}

export function combineVectorLayers(
  orderedLayers: LogoLayer[],
  op: BooleanOpKind
): { ok: true; layer: PathLayer } | { ok: false; reason: string } {
  const combinable = orderedLayers.filter(isCombinableVectorLayer);
  if (combinable.length < 2) {
    return { ok: false, reason: 'Select 2 or more shapes to combine.' };
  }

  const geoms = combinable.map((l) => layerToWorldMultiPolygon(l)).filter((g) => g.length > 0);
  if (geoms.length < 2) {
    return { ok: false, reason: 'Selected shapes have no combinable vector area.' };
  }

  let result: MultiPolygon = [];
  if (op === 'unite') {
    result = polygonClipping.union(geoms[0], ...geoms.slice(1));
  } else if (op === 'subtract') {
    result = polygonClipping.difference(geoms[0], ...geoms.slice(1));
  } else if (op === 'intersect') {
    result = geoms[0];
    for (let i = 1; i < geoms.length; i++) {
      result = polygonClipping.intersection(result, geoms[i]);
      if (result.length === 0) break;
    }
  } else if (op === 'exclude') {
    result = polygonClipping.xor(geoms[0], ...geoms.slice(1));
  }

  if (result.length === 0) {
    return {
      ok: false,
      reason:
        op === 'intersect'
          ? 'The selected shapes do not overlap.'
          : 'The boolean operation produced an empty shape.',
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of result) {
    for (const ring of poly) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const width = Math.max(4, Math.round(maxX - minX));
  const height = Math.max(4, Math.round(maxY - minY));
  const compoundD = multiPolygonToCompoundPath(result, minX, minY);
  if (!compoundD) {
    return { ok: false, reason: 'No valid geometry generated.' };
  }

  const styleSource =
    combinable.find((l) => l.fill !== 'transparent' && l.fill !== 'none') ?? combinable[0];

  const opLabel =
    op === 'unite'
      ? 'United'
      : op === 'subtract'
        ? 'Subtracted'
        : op === 'intersect'
          ? 'Intersected'
          : 'Excluded';

  const nextLayer: PathLayer = {
    id: nextLayerId('bool'),
    name: `${opLabel} Shape`,
    type: 'path',
    x: Math.round(minX),
    y: Math.round(minY),
    width,
    height,
    rotation: 0,
    opacity: styleSource.opacity,
    visible: true,
    locked: false,
    fill:
      styleSource.fill === 'transparent' || styleSource.fill === 'none'
        ? styleSource.stroke !== 'none'
          ? styleSource.stroke
          : '#1B4332'
        : styleSource.fill,
    fillGradient: styleSource.fillGradient ? { ...styleSource.fillGradient } : undefined,
    fillPattern: styleSource.fillPattern ? { ...styleSource.fillPattern } : undefined,
    stroke: styleSource.fill === 'transparent' ? 'none' : styleSource.stroke,
    strokeWidth: styleSource.fill === 'transparent' ? 0 : styleSource.strokeWidth,
    shadow: { ...styleSource.shadow },
    pathDataList: [compoundD],
    sourceViewBox: { width: maxX - minX, height: maxY - minY },
    fillRule: 'evenodd',
  };

  return { ok: true, layer: nextLayer };
}

/**
 * Extracts world-space MultiPolygon from any layer (converting TextLayer to outlines if needed),
 * then projects it into a target layer's local un-rotated/un-flipped coordinate frame for Clipping Masking.
 */
function inverseTransformPoint(wx: number, wy: number, target: LogoLayer): Pair {
  let lx = wx - target.x;
  let ly = wy - target.y;

  if (target.rotation) {
    const cx = target.width / 2;
    const cy = target.height / 2;
    const rad = (-target.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = lx - cx;
    const dy = ly - cy;
    lx = cx + dx * cos - dy * sin;
    ly = cy + dx * sin + dy * cos;
  }

  if (target.flipX) lx = target.width - lx;
  if (target.flipY) ly = target.height - ly;

  return [lx, ly];
}

export async function createClippingMaskFromSelection(
  orderedSelected: LogoLayer[]
): Promise<{
  ok: true;
  clippedLayer: LogoLayer;
  consumedLayerIds: string[];
} | { ok: false; reason: string }> {
  if (orderedSelected.length < 2) {
    return { ok: false, reason: 'Select 2 layers to create a clipping mask.' };
  }

  // Pick mask vs content:
  // If a text layer is paired with a gradient/pattern/graphic layer, clip the graphic inside the text!
  // Otherwise use the bottom-most layer as the clipping mask for the top-most layer.
  let maskSource = orderedSelected[0];
  let contentSource = orderedSelected[orderedSelected.length - 1];

  const textMaskCandidate = orderedSelected.find((l) => l.type === 'text');
  const styledContentCandidate = orderedSelected.find(
    (l) =>
      l.id !== textMaskCandidate?.id &&
      (l.fillGradient?.enabled || l.fillPattern?.enabled || l.type === 'custom-svg' || l.type === 'icon')
  );

  if (textMaskCandidate && styledContentCandidate) {
    maskSource = textMaskCandidate;
    contentSource = styledContentCandidate;
  }

  let resolvedMaskLayer: LogoLayer = maskSource;
  if (maskSource.type === 'text') {
    resolvedMaskLayer = await tryConvertTextLayerToPath(maskSource as TextLayer);
  }

  let worldMask: MultiPolygon = [];
  if (resolvedMaskLayer.type === 'text') {
    // Fallback bounding box if font outline fetch failed offline
    worldMask = [
      [
        [
          transformPointForLayer(0, 0, resolvedMaskLayer),
          transformPointForLayer(resolvedMaskLayer.width, 0, resolvedMaskLayer),
          transformPointForLayer(resolvedMaskLayer.width, resolvedMaskLayer.height, resolvedMaskLayer),
          transformPointForLayer(0, resolvedMaskLayer.height, resolvedMaskLayer),
        ],
      ],
    ];
  } else {
    worldMask = layerToWorldMultiPolygon(resolvedMaskLayer);
  }

  if (worldMask.length === 0) {
    return { ok: false, reason: 'Mask layer does not have a valid vector outline.' };
  }

  // Project mask geometry into contentSource's local (0..width, 0..height) space
  const localPaths: string[] = [];
  for (const poly of worldMask) {
    const subpaths: string[] = [];
    for (const ring of poly) {
      if (ring.length < 3) continue;
      const cmds = ring.map(([wx, wy], i) => {
        const [lx, ly] = inverseTransformPoint(wx, wy, contentSource);
        return `${i === 0 ? 'M' : 'L'} ${lx.toFixed(2)} ${ly.toFixed(2)}`;
      });
      subpaths.push(`${cmds.join(' ')} Z`);
    }
    if (subpaths.length > 0) {
      localPaths.push(subpaths.join(' '));
    }
  }

  if (localPaths.length === 0) {
    return { ok: false, reason: 'Failed to project clipping mask geometry.' };
  }

  const clippedLayer: LogoLayer = {
    ...contentSource,
    name: `${contentSource.name} (Masked)`,
    clipMask: {
      enabled: true,
      shape: 'custom',
      scale: 1,
      customPaths: localPaths,
      customViewBox: { width: contentSource.width, height: contentSource.height },
    },
  };

  return {
    ok: true,
    clippedLayer,
    consumedLayerIds: [maskSource.id],
  };
}
