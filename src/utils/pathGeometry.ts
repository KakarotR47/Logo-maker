import {
  LayerBase,
  LogoLayer,
  PathLayer,
  ShapeKind,
  TextLayer,
} from '../types/logo';

export interface EditableHandle {
  x: number;
  y: number;
}

export interface EditableNode {
  x: number;
  y: number;
  handleIn: EditableHandle | null;
  handleOut: EditableHandle | null;
  smooth?: boolean;
}

export interface EditableSubpath {
  closed: boolean;
  nodes: EditableNode[];
}

export interface PathSamplePoint {
  x: number;
  y: number;
  tx: number; // unit tangent X
  ty: number; // unit tangent Y
  nx: number; // unit outward/upward normal X
  ny: number; // unit outward/upward normal Y
  angleDeg: number;
  len: number; // cumulative arc length from start
}

export interface SampledPath {
  points: PathSamplePoint[];
  totalLength: number;
  closed: boolean;
}

// ---------------------------------------------------------------------------
// Shared SVG Shape Path Builder (single source of truth, zero circular imports)
// ---------------------------------------------------------------------------

function buildRoundedPolygonPath(points: [number, number][], radius: number): string {
  if (points.length < 3) return '';
  if (radius <= 0.5) {
    return `M ${points.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ')} Z`;
  }

  const n = points.length;
  const segments: string[] = [];

  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];

    const v1x = prev[0] - curr[0];
    const v1y = prev[1] - curr[1];
    const v2x = next[0] - curr[0];
    const v2y = next[1] - curr[1];

    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);

    if (len1 < 0.01 || len2 < 0.01) {
      segments.push(
        i === 0
          ? `M ${curr[0].toFixed(1)} ${curr[1].toFixed(1)}`
          : `L ${curr[0].toFixed(1)} ${curr[1].toFixed(1)}`
      );
      continue;
    }

    const r = Math.min(radius, len1 * 0.42, len2 * 0.42);
    const pStartX = curr[0] + (v1x / len1) * r;
    const pStartY = curr[1] + (v1y / len1) * r;
    const pEndX = curr[0] + (v2x / len2) * r;
    const pEndY = curr[1] + (v2y / len2) * r;

    if (i === 0) {
      segments.push(`M ${pStartX.toFixed(1)} ${pStartY.toFixed(1)}`);
    } else {
      segments.push(`L ${pStartX.toFixed(1)} ${pStartY.toFixed(1)}`);
    }
    segments.push(
      `Q ${curr[0].toFixed(1)} ${curr[1].toFixed(1)} ${pEndX.toFixed(1)} ${pEndY.toFixed(1)}`
    );
  }

  return `${segments.join(' ')} Z`;
}

export function buildShapePath(
  kind: ShapeKind,
  w: number,
  h: number,
  cornerRadius = 18
): string {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const cr = Math.max(0, cornerRadius);

  switch (kind) {
    case 'circle':
    case 'ring':
      return `M ${cx} 2 A ${rx - 2} ${ry - 2} 0 1 0 ${cx} ${h - 2} A ${rx - 2} ${ry - 2} 0 1 0 ${cx} 2 Z`;
    case 'rounded-rect': {
      const r = Math.min(cr, Math.max(0, w / 2 - 2), Math.max(0, h / 2 - 2));
      if (r <= 0.5) {
        return `M 2 2 H ${w - 2} V ${h - 2} H 2 Z`;
      }
      return `M ${2 + r} 2 H ${w - 2 - r} A ${r} ${r} 0 0 1 ${w - 2} ${2 + r} V ${h - 2 - r} A ${r} ${r} 0 0 1 ${w - 2 - r} ${h - 2} H ${2 + r} A ${r} ${r} 0 0 1 2 ${h - 2 - r} V ${2 + r} A ${r} ${r} 0 0 1 ${2 + r} 2 Z`;
    }
    case 'pill': {
      const r = Math.max(1, Math.min(w, h) / 2 - 2);
      return `M ${r + 2} 2 H ${w - r - 2} A ${r} ${r} 0 0 1 ${w - r - 2} ${h - 2} H ${r + 2} A ${r} ${r} 0 0 1 ${r + 2} 2 Z`;
    }
    case 'hexagon': {
      const pts: [number, number][] = [
        [cx, 2],
        [w - 4, h * 0.25],
        [w - 4, h * 0.75],
        [cx, h - 2],
        [4, h * 0.75],
        [4, h * 0.25],
      ];
      return buildRoundedPolygonPath(pts, cr);
    }
    case 'octagon': {
      const ox = w * 0.29;
      const oy = h * 0.29;
      const pts: [number, number][] = [
        [ox, 2],
        [w - ox, 2],
        [w - 2, oy],
        [w - 2, h - oy],
        [w - ox, h - 2],
        [ox, h - 2],
        [2, h - oy],
        [2, oy],
      ];
      return buildRoundedPolygonPath(pts, cr);
    }
    case 'shield':
      if (cr > 1) {
        const sr = Math.min(cr * 0.35, w * 0.08, h * 0.08);
        return `M ${(cx - sr).toFixed(1)} ${(2 + sr * 0.3).toFixed(1)} Q ${cx.toFixed(1)} 0 ${(cx + sr).toFixed(1)} ${(2 + sr * 0.3).toFixed(1)} L ${(w - 4 - sr).toFixed(1)} ${(h * 0.16 - sr * 0.3).toFixed(1)} Q ${w - 4} ${(h * 0.16).toFixed(1)} ${w - 4} ${(h * 0.16 + sr).toFixed(1)} V ${h * 0.52} C ${w - 4} ${h * 0.78}, ${w * 0.72} ${h * 0.9}, ${cx} ${h - 2} C ${w * 0.28} ${h * 0.9}, 4 ${h * 0.78}, 4 ${h * 0.52} V ${(h * 0.16 + sr).toFixed(1)} Q 4 ${(h * 0.16).toFixed(1)} ${(4 + sr).toFixed(1)} ${(h * 0.16 - sr * 0.3).toFixed(1)} Z`;
      }
      return `M ${cx} 2 L ${w - 4} ${h * 0.16} V ${h * 0.52} C ${w - 4} ${h * 0.78}, ${w * 0.72} ${h * 0.9}, ${cx} ${h - 2} C ${w * 0.28} ${h * 0.9}, 4 ${h * 0.78}, 4 ${h * 0.52} V ${h * 0.16} Z`;
    case 'diamond':
      return buildRoundedPolygonPath(
        [
          [cx, 2],
          [w - 2, cy],
          [cx, h - 2],
          [2, cy],
        ],
        cr
      );
    case 'triangle':
      return buildRoundedPolygonPath(
        [
          [cx, 4],
          [w - 4, h - 4],
          [4, h - 4],
        ],
        cr
      );
    case 'star': {
      const pts: [number, number][] = [];
      for (let i = 0; i < 16; i++) {
        const angle = (i * Math.PI) / 8 - Math.PI / 2;
        const radX = i % 2 === 0 ? rx - 2 : (rx - 2) * 0.45;
        const radY = i % 2 === 0 ? ry - 2 : (ry - 2) * 0.45;
        pts.push([cx + Math.cos(angle) * radX, cy + Math.sin(angle) * radY]);
      }
      return buildRoundedPolygonPath(pts, Math.min(cr * 0.3, 8));
    }
    case 'arch': {
      const archR = Math.min(w / 2 - 2, h * 0.48);
      const botR = Math.min(cr, w * 0.2, h * 0.18);
      if (botR > 1) {
        return `M ${2 + botR} ${h - 2} Q 2 ${h - 2} 2 ${h - 2 - botR} V ${archR + 2} A ${w / 2 - 2} ${archR} 0 0 1 ${w - 2} ${archR + 2} V ${h - 2 - botR} Q ${w - 2} ${h - 2} ${w - 2 - botR} ${h - 2} Z`;
      }
      return `M 2 ${h - 2} V ${archR + 2} A ${w / 2 - 2} ${archR} 0 0 1 ${w - 2} ${archR + 2} V ${h - 2} Z`;
    }
    case 'frame': {
      const r = Math.min(cr, Math.max(0, w / 2 - 4), Math.max(0, h / 2 - 4));
      if (r <= 0.5) {
        return `M 4 4 H ${w - 4} V ${h - 4} H 4 Z`;
      }
      return `M ${4 + r} 4 H ${w - 4 - r} A ${r} ${r} 0 0 1 ${w - 4} ${4 + r} V ${h - 4 - r} A ${r} ${r} 0 0 1 ${w - 4 - r} ${h - 4} H ${4 + r} A ${r} ${r} 0 0 1 4 ${h - 4 - r} V ${4 + r} A ${r} ${r} 0 0 1 ${4 + r} 4 Z`;
    }
    case 'seal-scalloped': {
      const teeth = 20;
      const pts: string[] = [];
      for (let i = 0; i < teeth * 2; i++) {
        const angle = (i * Math.PI) / teeth - Math.PI / 2;
        const radX = i % 2 === 0 ? rx - 2 : (rx - 2) * 0.87;
        const radY = i % 2 === 0 ? ry - 2 : (ry - 2) * 0.87;
        pts.push(
          `${(cx + Math.cos(angle) * radX).toFixed(1)} ${(cy + Math.sin(angle) * radY).toFixed(1)}`
        );
      }
      return `M ${pts.join(' L ')} Z`;
    }
    case 'crest-double':
      if (cr > 1) {
        const sr = Math.min(cr * 0.35, w * 0.08, h * 0.08);
        return `M ${(cx - sr).toFixed(1)} ${(2 + sr * 0.3).toFixed(1)} Q ${cx.toFixed(1)} 0 ${(cx + sr).toFixed(1)} ${(2 + sr * 0.3).toFixed(1)} L ${(w - 4 - sr).toFixed(1)} ${(h * 0.14 - sr * 0.3).toFixed(1)} Q ${w - 4} ${(h * 0.14).toFixed(1)} ${w - 4} ${(h * 0.14 + sr).toFixed(1)} V ${h * 0.5} C ${w - 4} ${h * 0.78}, ${w * 0.72} ${h * 0.9}, ${cx} ${h - 2} C ${w * 0.28} ${h * 0.9}, 4 ${h * 0.78}, 4 ${h * 0.5} V ${(h * 0.14 + sr).toFixed(1)} Q 4 ${(h * 0.14).toFixed(1)} ${(4 + sr).toFixed(1)} ${(h * 0.14 - sr * 0.3).toFixed(1)} Z`;
      }
      return `M ${cx} 2 L ${w - 4} ${h * 0.14} V ${h * 0.5} C ${w - 4} ${h * 0.78}, ${w * 0.72} ${h * 0.91}, ${cx} ${h - 2} C ${w * 0.28} ${h * 0.91}, 4 ${h * 0.78}, 4 ${h * 0.5} V ${h * 0.14} Z`;
    case 'ribbon-banner':
      return buildRoundedPolygonPath(
        [
          [4, h * 0.18],
          [w - 4, h * 0.18],
          [w - 18, cy],
          [w - 4, h * 0.82],
          [4, h * 0.82],
          [18, cy],
        ],
        Math.min(cr * 0.45, 14)
      );
    case 'parallelogram':
      return buildRoundedPolygonPath(
        [
          [w * 0.16, 4],
          [w - 4, 4],
          [w * 0.84, h - 4],
          [4, h - 4],
        ],
        cr
      );
  }
}

// ---------------------------------------------------------------------------
// SVG Path Tokenizer & Elliptical Arc -> Cubic Bezier Converter
// ---------------------------------------------------------------------------

const SVG_CMD_REGEX = /([a-zA-Z])|([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)/g;

function isSvgCmd(tok: string | undefined): boolean {
  return Boolean(tok && /^[a-zA-Z]$/.test(tok));
}

function svgArcToCubicSegments(
  x1: number,
  y1: number,
  rxIn: number,
  ryIn: number,
  angleDeg: number,
  largeArcFlag: number,
  sweepFlag: number,
  x2: number,
  y2: number
): Array<[number, number, number, number, number, number]> {
  if (Math.hypot(x2 - x1, y2 - y1) < 1e-6) return [];
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx < 1e-6 || ry < 1e-6) {
    return [[x1, y1, x2, y2, x2, y2]];
  }

  const phi = (angleDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const dx2 = (x1 - x2) / 2;
  const dy2 = (y1 - y2) / 2;
  const x1p = cosPhi * dx2 + sinPhi * dy2;
  const y1p = -sinPhi * dx2 + cosPhi * dy2;

  let rxSq = rx * rx;
  let rySq = ry * ry;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;

  const lambda = x1pSq / rxSq + y1pSq / rySq;
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    rx *= s;
    ry *= s;
    rxSq = rx * rx;
    rySq = ry * ry;
  }

  const num = Math.max(0, rxSq * rySq - rxSq * y1pSq - rySq * x1pSq);
  const den = rxSq * y1pSq + rySq * x1pSq;
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

  const segCount = Math.max(1, Math.ceil(Math.abs(dTheta) / (Math.PI / 2)));
  const delta = dTheta / segCount;
  const alpha = (4 / 3) * Math.tan(delta / 4);

  const out: Array<[number, number, number, number, number, number]> = [];
  for (let i = 0; i < segCount; i++) {
    const t1 = theta1 + i * delta;
    const t2 = theta1 + (i + 1) * delta;

    const cos1 = Math.cos(t1);
    const sin1 = Math.sin(t1);
    const cos2 = Math.cos(t2);
    const sin2 = Math.sin(t2);

    const p1x = cos1 - alpha * sin1;
    const p1y = sin1 + alpha * cos1;
    const p2x = cos2 + alpha * sin2;
    const p2y = sin2 - alpha * cos2;

    const mapEll = (ex: number, ey: number): [number, number] => [
      cosPhi * (rx * ex) - sinPhi * (ry * ey) + cx,
      sinPhi * (rx * ex) + cosPhi * (ry * ey) + cy,
    ];

    const [c1x, c1y] = mapEll(p1x, p1y);
    const [c2x, c2y] = mapEll(p2x, p2y);
    const [ex, ey] = mapEll(cos2, sin2);
    out.push([c1x, c1y, c2x, c2y, ex, ey]);
  }
  return out;
}

/**
 * Parses an SVG path `d` string into editable subpaths of nodes with cubic Bezier handles.
 * Converts Q/T/A into exact cubic Bezier segments so anchors & handles behave uniformly in Node Editor.
 */
export function parseSvgPathToSubpaths(d: string): EditableSubpath[] {
  const tokens: string[] = [];
  let match: RegExpExecArray | null;
  SVG_CMD_REGEX.lastIndex = 0;
  while ((match = SVG_CMD_REGEX.exec(d)) !== null) {
    tokens.push(match[0]);
  }

  let idx = 0;
  const nextNum = () => {
    const v = parseFloat(tokens[idx] ?? '0');
    idx += 1;
    return Number.isFinite(v) ? v : 0;
  };
  const hasMoreNums = () => idx < tokens.length && !isSvgCmd(tokens[idx]);

  const subpaths: EditableSubpath[] = [];
  let current: EditableSubpath | null = null;
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;
  let lastCmd = '';
  let lastCtrlX = 0;
  let lastCtrlY = 0;

  const ensureCurrent = () => {
    if (!current) {
      current = { closed: false, nodes: [{ x: cx, y: cy, handleIn: null, handleOut: null }] };
    }
    return current;
  };

  const pushCubicSegment = (c1x: number, c1y: number, c2x: number, c2y: number, ex: number, ey: number) => {
    const sp = ensureCurrent();
    const prev = sp.nodes[sp.nodes.length - 1];
    if (prev) {
      prev.handleOut = { x: c1x, y: c1y };
    }
    sp.nodes.push({
      x: ex,
      y: ey,
      handleIn: { x: c2x, y: c2y },
      handleOut: null,
    });
    cx = ex;
    cy = ey;
  };

  const flushSubpath = () => {
    if (current && current.nodes.length > 0) {
      // If closed and last node sits atop first node, merge its handleIn into node 0
      if (current.closed && current.nodes.length >= 2) {
        const first = current.nodes[0];
        const last = current.nodes[current.nodes.length - 1];
        if (Math.hypot(first.x - last.x, first.y - last.y) < 0.25) {
          if (last.handleIn) {
            first.handleIn = last.handleIn;
          }
          current.nodes.pop();
        }
      }
      // Compute smooth flags heuristically for collinear opposite handles
      for (const n of current.nodes) {
        if (n.handleIn && n.handleOut) {
          const v1x = n.handleIn.x - n.x;
          const v1y = n.handleIn.y - n.y;
          const v2x = n.handleOut.x - n.x;
          const v2y = n.handleOut.y - n.y;
          const l1 = Math.hypot(v1x, v1y);
          const l2 = Math.hypot(v2x, v2y);
          if (l1 > 0.1 && l2 > 0.1) {
            const dot = (v1x * v2x + v1y * v2y) / (l1 * l2);
            if (dot < -0.98) n.smooth = true;
          }
        }
      }
      subpaths.push(current);
    }
    current = null;
  };

  while (idx < tokens.length) {
    let cmd = tokens[idx];
    if (isSvgCmd(cmd)) {
      idx += 1;
    } else {
      cmd = lastCmd === 'M' ? 'L' : lastCmd === 'm' ? 'l' : lastCmd;
    }

    switch (cmd) {
      case 'M':
      case 'm': {
        let firstPair = true;
        while (hasMoreNums()) {
          const nx = nextNum();
          const ny = nextNum();
          const x = cmd === 'm' ? cx + nx : nx;
          const y = cmd === 'm' ? cy + ny : ny;
          if (firstPair) {
            flushSubpath();
            cx = x;
            cy = y;
            startX = x;
            startY = y;
            current = {
              closed: false,
              nodes: [{ x, y, handleIn: null, handleOut: null }],
            };
            firstPair = false;
          } else {
            ensureCurrent().nodes.push({ x, y, handleIn: null, handleOut: null });
            cx = x;
            cy = y;
          }
        }
        lastCtrlX = cx;
        lastCtrlY = cy;
        break;
      }
      case 'L':
      case 'l': {
        while (hasMoreNums()) {
          const nx = nextNum();
          const ny = nextNum();
          const x = cmd === 'l' ? cx + nx : nx;
          const y = cmd === 'l' ? cy + ny : ny;
          ensureCurrent().nodes.push({ x, y, handleIn: null, handleOut: null });
          cx = x;
          cy = y;
        }
        lastCtrlX = cx;
        lastCtrlY = cy;
        break;
      }
      case 'H':
      case 'h': {
        while (hasMoreNums()) {
          const nx = nextNum();
          const x = cmd === 'h' ? cx + nx : nx;
          ensureCurrent().nodes.push({ x, y: cy, handleIn: null, handleOut: null });
          cx = x;
        }
        lastCtrlX = cx;
        lastCtrlY = cy;
        break;
      }
      case 'V':
      case 'v': {
        while (hasMoreNums()) {
          const ny = nextNum();
          const y = cmd === 'v' ? cy + ny : ny;
          ensureCurrent().nodes.push({ x: cx, y, handleIn: null, handleOut: null });
          cy = y;
        }
        lastCtrlX = cx;
        lastCtrlY = cy;
        break;
      }
      case 'C':
      case 'c': {
        while (hasMoreNums()) {
          const x1 = nextNum();
          const y1 = nextNum();
          const x2 = nextNum();
          const y2 = nextNum();
          const x = nextNum();
          const y = nextNum();
          const rel = cmd === 'c';
          const c1x = rel ? cx + x1 : x1;
          const c1y = rel ? cy + y1 : y1;
          const c2x = rel ? cx + x2 : x2;
          const c2y = rel ? cy + y2 : y2;
          const ex = rel ? cx + x : x;
          const ey = rel ? cy + y : y;
          pushCubicSegment(c1x, c1y, c2x, c2y, ex, ey);
          lastCtrlX = c2x;
          lastCtrlY = c2y;
        }
        break;
      }
      case 'S':
      case 's': {
        while (hasMoreNums()) {
          const hasPrevCubic = ['C', 'c', 'S', 's'].includes(lastCmd);
          const c1x = hasPrevCubic ? 2 * cx - lastCtrlX : cx;
          const c1y = hasPrevCubic ? 2 * cy - lastCtrlY : cy;
          const x2 = nextNum();
          const y2 = nextNum();
          const x = nextNum();
          const y = nextNum();
          const rel = cmd === 's';
          const c2x = rel ? cx + x2 : x2;
          const c2y = rel ? cy + y2 : y2;
          const ex = rel ? cx + x : x;
          const ey = rel ? cy + y : y;
          pushCubicSegment(c1x, c1y, c2x, c2y, ex, ey);
          lastCtrlX = c2x;
          lastCtrlY = c2y;
          lastCmd = cmd;
        }
        break;
      }
      case 'Q':
      case 'q': {
        while (hasMoreNums()) {
          const qx = nextNum();
          const qy = nextNum();
          const x = nextNum();
          const y = nextNum();
          const rel = cmd === 'q';
          const ax1 = rel ? cx + qx : qx;
          const ay1 = rel ? cy + qy : qy;
          const ex = rel ? cx + x : x;
          const ey = rel ? cy + y : y;
          const c1x = cx + (2 / 3) * (ax1 - cx);
          const c1y = cy + (2 / 3) * (ay1 - cy);
          const c2x = ex + (2 / 3) * (ax1 - ex);
          const c2y = ey + (2 / 3) * (ay1 - ey);
          pushCubicSegment(c1x, c1y, c2x, c2y, ex, ey);
          lastCtrlX = ax1;
          lastCtrlY = ay1;
        }
        break;
      }
      case 'T':
      case 't': {
        while (hasMoreNums()) {
          const hasPrevQuad = ['Q', 'q', 'T', 't'].includes(lastCmd);
          const ax1 = hasPrevQuad ? 2 * cx - lastCtrlX : cx;
          const ay1 = hasPrevQuad ? 2 * cy - lastCtrlY : cy;
          const x = nextNum();
          const y = nextNum();
          const rel = cmd === 't';
          const ex = rel ? cx + x : x;
          const ey = rel ? cy + y : y;
          const c1x = cx + (2 / 3) * (ax1 - cx);
          const c1y = cy + (2 / 3) * (ay1 - cy);
          const c2x = ex + (2 / 3) * (ax1 - ex);
          const c2y = ey + (2 / 3) * (ay1 - ey);
          pushCubicSegment(c1x, c1y, c2x, c2y, ex, ey);
          lastCtrlX = ax1;
          lastCtrlY = ay1;
          lastCmd = cmd;
        }
        break;
      }
      case 'A':
      case 'a': {
        while (hasMoreNums()) {
          const rx = nextNum();
          const ry = nextNum();
          const rot = nextNum();
          const large = nextNum();
          const sweep = nextNum();
          const x = nextNum();
          const y = nextNum();
          const rel = cmd === 'a';
          const ex = rel ? cx + x : x;
          const ey = rel ? cy + y : y;
          const segs = svgArcToCubicSegments(cx, cy, rx, ry, rot, large, sweep, ex, ey);
          for (const [c1x, c1y, c2x, c2y, sx, sy] of segs) {
            pushCubicSegment(c1x, c1y, c2x, c2y, sx, sy);
          }
          cx = ex;
          cy = ey;
        }
        lastCtrlX = cx;
        lastCtrlY = cy;
        break;
      }
      case 'Z':
      case 'z': {
        if (current) {
          current.closed = true;
          flushSubpath();
        }
        cx = startX;
        cy = startY;
        lastCtrlX = cx;
        lastCtrlY = cy;
        break;
      }
      default: {
        while (hasMoreNums()) nextNum();
        break;
      }
    }
    lastCmd = cmd;
  }

  flushSubpath();
  return subpaths;
}

export function serializeSubpathsToPathData(subpaths: EditableSubpath[]): string {
  const chunks: string[] = [];
  for (const sp of subpaths) {
    if (sp.nodes.length === 0) continue;
    const first = sp.nodes[0];
    chunks.push(`M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`);
    for (let i = 1; i < sp.nodes.length; i++) {
      const prev = sp.nodes[i - 1];
      const cur = sp.nodes[i];
      if (prev.handleOut || cur.handleIn) {
        const c1 = prev.handleOut ?? { x: prev.x, y: prev.y };
        const c2 = cur.handleIn ?? { x: cur.x, y: cur.y };
        chunks.push(
          `C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)}, ${c2.x.toFixed(2)} ${c2.y.toFixed(2)}, ${cur.x.toFixed(2)} ${cur.y.toFixed(2)}`
        );
      } else {
        chunks.push(`L ${cur.x.toFixed(2)} ${cur.y.toFixed(2)}`);
      }
    }
    if (sp.closed && sp.nodes.length >= 2) {
      const last = sp.nodes[sp.nodes.length - 1];
      if (last.handleOut || first.handleIn) {
        const c1 = last.handleOut ?? { x: last.x, y: last.y };
        const c2 = first.handleIn ?? { x: first.x, y: first.y };
        chunks.push(
          `C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)}, ${c2.x.toFixed(2)} ${c2.y.toFixed(2)}, ${first.x.toFixed(2)} ${first.y.toFixed(2)}`
        );
      }
      chunks.push('Z');
    }
  }
  return chunks.join(' ');
}

export function reverseSubpaths(subpaths: EditableSubpath[]): EditableSubpath[] {
  return [...subpaths].reverse().map((sp) => {
    const revNodes = [...sp.nodes].reverse().map((n) => ({
      x: n.x,
      y: n.y,
      handleIn: n.handleOut ? { ...n.handleOut } : null,
      handleOut: n.handleIn ? { ...n.handleIn } : null,
      smooth: n.smooth,
    }));
    return {
      closed: sp.closed,
      nodes: revNodes,
    };
  });
}

export function reverseSvgPath(d: string): string {
  const subs = parseSvgPathToSubpaths(d);
  return serializeSubpathsToPathData(reverseSubpaths(subs));
}

export function transformSubpaths(
  subpaths: EditableSubpath[],
  mapPt: (x: number, y: number) => [number, number]
): EditableSubpath[] {
  return subpaths.map((sp) => ({
    closed: sp.closed,
    nodes: sp.nodes.map((n) => {
      const [nx, ny] = mapPt(n.x, n.y);
      const hi = n.handleIn ? mapPt(n.handleIn.x, n.handleIn.y) : null;
      const ho = n.handleOut ? mapPt(n.handleOut.x, n.handleOut.y) : null;
      return {
        x: nx,
        y: ny,
        handleIn: hi ? { x: hi[0], y: hi[1] } : null,
        handleOut: ho ? { x: ho[0], y: ho[1] } : null,
        smooth: n.smooth,
      };
    }),
  }));
}

export function transformSvgPath(
  d: string,
  mapPt: (x: number, y: number) => [number, number]
): string {
  return serializeSubpathsToPathData(transformSubpaths(parseSvgPathToSubpaths(d), mapPt));
}

export function getSubpathsBounds(subpaths: EditableSubpath[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const include = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  for (const sp of subpaths) {
    for (let i = 0; i < sp.nodes.length; i++) {
      const a = sp.nodes[i];
      include(a.x, a.y);
      const next =
        i + 1 < sp.nodes.length ? sp.nodes[i + 1] : sp.closed ? sp.nodes[0] : null;
      if (next && (a.handleOut || next.handleIn)) {
        const c1 = a.handleOut ?? { x: a.x, y: a.y };
        const c2 = next.handleIn ?? { x: next.x, y: next.y };
        for (let s = 1; s < 12; s++) {
          const t = s / 12;
          const mt = 1 - t;
          const bx =
            mt * mt * mt * a.x +
            3 * mt * mt * t * c1.x +
            3 * mt * t * t * c2.x +
            t * t * t * next.x;
          const by =
            mt * mt * mt * a.y +
            3 * mt * mt * t * c1.y +
            3 * mt * t * t * c2.y +
            t * t * t * next.y;
          include(bx, by);
        }
      }
    }
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(2, maxX - minX),
    height: Math.max(2, maxY - minY),
  };
}

// ---------------------------------------------------------------------------
// Arc-length Path Sampling (used by Text-on-Path + Outlines)
// ---------------------------------------------------------------------------

export function sampleSvgPath(d: string): SampledPath {
  const subpaths = parseSvgPathToSubpaths(d);
  const firstSp = subpaths[0];
  if (!firstSp || firstSp.nodes.length === 0) {
    return { points: [], totalLength: 0, closed: false };
  }

  const pts: Array<[number, number]> = [[firstSp.nodes[0].x, firstSp.nodes[0].y]];

  const segCount = firstSp.closed ? firstSp.nodes.length : firstSp.nodes.length - 1;
  for (let i = 0; i < segCount; i++) {
    const a = firstSp.nodes[i];
    const b = firstSp.nodes[(i + 1) % firstSp.nodes.length];
    if (a.handleOut || b.handleIn) {
      const c1 = a.handleOut ?? { x: a.x, y: a.y };
      const c2 = b.handleIn ?? { x: b.x, y: b.y };
      const approxLen =
        Math.hypot(c1.x - a.x, c1.y - a.y) +
        Math.hypot(c2.x - c1.x, c2.y - c1.y) +
        Math.hypot(b.x - c2.x, b.y - c2.y);
      const steps = Math.max(12, Math.min(48, Math.ceil(approxLen / 5)));
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const mt = 1 - t;
        const px =
          mt * mt * mt * a.x +
          3 * mt * mt * t * c1.x +
          3 * mt * t * t * c2.x +
          t * t * t * b.x;
        const py =
          mt * mt * mt * a.y +
          3 * mt * mt * t * c1.y +
          3 * mt * t * t * c2.y +
          t * t * t * b.y;
        pts.push([px, py]);
      }
    } else {
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.min(20, Math.ceil(segLen / 12)));
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        pts.push([a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t]);
      }
    }
  }

  const sampled: PathSamplePoint[] = [];
  let accLen = 0;

  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    if (i > 0) {
      accLen += Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]);
    }
    const prev =
      i > 0
        ? pts[i - 1]
        : firstSp.closed && pts.length > 2
          ? pts[pts.length - 2]
          : pts[0];
    const next =
      i < pts.length - 1
        ? pts[i + 1]
        : firstSp.closed && pts.length > 2
          ? pts[1]
          : pts[pts.length - 1];

    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const segL = Math.hypot(dx, dy) || 1;
    const tx = dx / segL;
    const ty = dy / segL;
    // Left-hand normal in SVG coords (y-down): (ty, -tx) points "above" a left->right curve
    const nx = ty;
    const ny = -tx;
    const angleDeg = (Math.atan2(ty, tx) * 180) / Math.PI;
    sampled.push({ x, y, tx, ty, nx, ny, angleDeg, len: accLen });
  }

  return {
    points: sampled,
    totalLength: accLen,
    closed: firstSp.closed,
  };
}

export function samplePathAtDistance(
  sampled: SampledPath,
  rawDist: number
): { x: number; y: number; nx: number; ny: number; angleDeg: number } {
  const { points, totalLength, closed } = sampled;
  if (points.length === 0) {
    return { x: 0, y: 0, nx: 0, ny: -1, angleDeg: 0 };
  }
  if (points.length === 1 || totalLength <= 1e-4) {
    const p = points[0];
    return { x: p.x, y: p.y, nx: p.nx, ny: p.ny, angleDeg: p.angleDeg };
  }

  let dist = rawDist;
  if (closed) {
    dist = ((dist % totalLength) + totalLength) % totalLength;
  } else {
    if (dist < 0) {
      const p0 = points[0];
      return {
        x: p0.x + p0.tx * dist,
        y: p0.y + p0.ty * dist,
        nx: p0.nx,
        ny: p0.ny,
        angleDeg: p0.angleDeg,
      };
    }
    if (dist > totalLength) {
      const pEnd = points[points.length - 1];
      const extra = dist - totalLength;
      return {
        x: pEnd.x + pEnd.tx * extra,
        y: pEnd.y + pEnd.ty * extra,
        nx: pEnd.nx,
        ny: pEnd.ny,
        angleDeg: pEnd.angleDeg,
      };
    }
  }

  // Binary search by cumulative length
  let lo = 0;
  let hi = points.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].len <= dist) lo = mid;
    else hi = mid;
  }

  const a = points[lo];
  const b = points[hi];
  const span = Math.max(1e-6, b.len - a.len);
  const t = Math.max(0, Math.min(1, (dist - a.len) / span));

  const tx = a.tx + (b.tx - a.tx) * t;
  const ty = a.ty + (b.ty - a.ty) * t;
  const tLen = Math.hypot(tx, ty) || 1;
  const utx = tx / tLen;
  const uty = ty / tLen;

  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    nx: uty,
    ny: -utx,
    angleDeg: (Math.atan2(uty, utx) * 180) / Math.PI,
  };
}

// ---------------------------------------------------------------------------
// Layer Coordinate Mapping & Text-on-Path Target Resolution
// ---------------------------------------------------------------------------

export function mapLocalPointToArtboard(
  lx: number,
  ly: number,
  layer: Pick<LayerBase, 'x' | 'y' | 'width' | 'height' | 'rotation' | 'flipX' | 'flipY'>
): [number, number] {
  let px = layer.flipX ? layer.width - lx : lx;
  let py = layer.flipY ? layer.height - ly : ly;

  if (layer.rotation) {
    const cx = layer.width / 2;
    const cy = layer.height / 2;
    const rad = (layer.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = px - cx;
    const dy = py - cy;
    px = cx + dx * cos - dy * sin;
    py = cy + dx * sin + dy * cos;
  }

  return [layer.x + px, layer.y + py];
}

export function mapArtboardPointToLocal(
  wx: number,
  wy: number,
  layer: Pick<LayerBase, 'x' | 'y' | 'width' | 'height' | 'rotation' | 'flipX' | 'flipY'>
): [number, number] {
  let px = wx - layer.x;
  let py = wy - layer.y;

  if (layer.rotation) {
    const cx = layer.width / 2;
    const cy = layer.height / 2;
    const rad = (-layer.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = px - cx;
    const dy = py - cy;
    px = cx + dx * cos - dy * sin;
    py = cy + dx * sin + dy * cos;
  }

  if (layer.flipX) px = layer.width - px;
  if (layer.flipY) py = layer.height - py;

  return [px, py];
}

export function extractLayerPathInArtboardSpace(layer: LogoLayer): string | null {
  if (layer.type === 'shape') {
    let localD: string;
    if (layer.shapeKind === 'circle' || layer.shapeKind === 'ring') {
      // Clockwise circle starting at bottom apex so 50% startOffset = top apex
      const cx = layer.width / 2;
      const rx = Math.max(4, layer.width / 2 - 2);
      const ry = Math.max(4, layer.height / 2 - 2);
      const botY = layer.height - 2;
      localD = `M ${cx.toFixed(1)} ${botY.toFixed(1)} A ${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 1 ${(cx - 0.1).toFixed(1)} ${botY.toFixed(1)} Z`;
    } else {
      localD = buildShapePath(layer.shapeKind, layer.width, layer.height, layer.cornerRadius);
    }
    return transformSvgPath(localD, (lx, ly) => mapLocalPointToArtboard(lx, ly, layer));
  }

  if (layer.type === 'path') {
    const rawD = layer.pathDataList.join(' ').trim();
    if (!rawD) return null;
    const sx = layer.width / Math.max(1, layer.sourceViewBox.width);
    const sy = layer.height / Math.max(1, layer.sourceViewBox.height);
    return transformSvgPath(rawD, (px, py) => mapLocalPointToArtboard(px * sx, py * sy, layer));
  }

  if (layer.type === 'divider') {
    const localD = `M 0 ${(layer.height / 2).toFixed(1)} L ${layer.width.toFixed(1)} ${(layer.height / 2).toFixed(1)}`;
    return transformSvgPath(localD, (lx, ly) => mapLocalPointToArtboard(lx, ly, layer));
  }

  if (layer.type === 'custom-svg') {
    const first = layer.paths[0];
    if (!first?.d) return null;
    const parts = layer.viewBox.trim().split(/\s+/).map(Number);
    const vbX = Number.isFinite(parts[0]) ? parts[0] : 0;
    const vbY = Number.isFinite(parts[1]) ? parts[1] : 0;
    const vbW = Number.isFinite(parts[2]) && parts[2] > 0 ? parts[2] : 100;
    const vbH = Number.isFinite(parts[3]) && parts[3] > 0 ? parts[3] : 100;
    const sx = layer.width / vbW;
    const sy = layer.height / vbH;
    return transformSvgPath(first.d, (px, py) =>
      mapLocalPointToArtboard((px - vbX) * sx, (py - vbY) * sy, layer)
    );
  }

  return null;
}

export function buildPresetTextPathLocal(
  mode: 'preset-circle' | 'preset-wave',
  layer: TextLayer
): string {
  const cx = layer.width / 2;
  const cyBox = layer.height / 2;

  if (mode === 'preset-wave') {
    const padX = Math.max(8, layer.width * 0.04);
    const spanW = Math.max(40, layer.width - padX * 2);
    const x0 = padX;
    const xMid = padX + spanW * 0.5;
    const xEnd = padX + spanW;
    const amp = Math.max(18, Math.min(56, layer.height * 0.42));
    const baseY = cyBox + layer.fontSize * 0.22;
    return `M ${x0.toFixed(1)} ${baseY.toFixed(1)} C ${(x0 + spanW * 0.17).toFixed(1)} ${(baseY - amp).toFixed(1)}, ${(x0 + spanW * 0.33).toFixed(1)} ${(baseY - amp).toFixed(1)}, ${xMid.toFixed(1)} ${baseY.toFixed(1)} C ${(xMid + spanW * 0.17).toFixed(1)} ${(baseY + amp).toFixed(1)}, ${(xMid + spanW * 0.33).toFixed(1)} ${(baseY + amp).toFixed(1)}, ${xEnd.toFixed(1)} ${baseY.toFixed(1)}`;
  }

  // preset-circle
  const minDim = Math.min(layer.width, Math.max(layer.height, layer.width * 0.6));
  const R = Math.max(42, minDim * 0.4);
  const circleCy = Math.max(R + layer.fontSize * 0.65, cyBox);
  return `M ${cx.toFixed(1)} ${(circleCy + R).toFixed(1)} A ${R.toFixed(1)} ${R.toFixed(1)} 0 1 1 ${(cx - 0.1).toFixed(1)} ${(circleCy + R).toFixed(1)} Z`;
}

export function resolveTextPathGeometry(
  layer: TextLayer,
  allLayers?: LogoLayer[]
): {
  localD: string;
  closed: boolean;
  startOffset: number;
  flipSide: boolean;
  baselineShift: number;
} | null {
  const tp = layer.textPath;
  if (!tp) return null;

  let localD: string | null = null;

  if (tp.mode === 'layer') {
    const target = tp.targetLayerId
      ? allLayers?.find((l) => l.id === tp.targetLayerId)
      : undefined;
    const artboardD = target ? extractLayerPathInArtboardSpace(target) : tp.customPathD ?? null;
    if (artboardD) {
      localD = transformSvgPath(artboardD, (wx, wy) => mapArtboardPointToLocal(wx, wy, layer));
    }
  } else {
    localD = buildPresetTextPathLocal(tp.mode, layer);
  }

  if (!localD) return null;

  if (tp.flipSide) {
    localD = reverseSvgPath(localD);
  }

  const closed = /[zZ]\s*$/.test(localD.trim());
  return {
    localD,
    closed,
    startOffset: tp.startOffset ?? 50,
    flipSide: Boolean(tp.flipSide),
    baselineShift: tp.baselineShift ?? 0,
  };
}

/**
 * After editing nodes of a PathLayer (pulling serifs or Bezier handles),
 * expands/refits the layer's viewBox & artboard bounds cleanly without shifting unmoved vertices visually.
 */
export function refitPathLayerAfterNodeEdit(
  layer: PathLayer,
  updatedPathDataList: string[]
): PathLayer {
  const allSubs = updatedPathDataList.flatMap((d) => parseSvgPathToSubpaths(d));
  if (allSubs.length === 0) {
    return { ...layer, pathDataList: updatedPathDataList };
  }

  const b = getSubpathsBounds(allSubs);
  const oldVbW = Math.max(1, layer.sourceViewBox.width);
  const oldVbH = Math.max(1, layer.sourceViewBox.height);
  const sx = layer.width / oldVbW;
  const sy = layer.height / oldVbH;

  const pad = layer.isOpenPath ? Math.max(6, layer.strokeWidth) : 2;
  const nextMinX = b.minX - pad;
  const nextMinY = b.minY - pad;
  const nextVbW = Math.max(8, b.width + pad * 2);
  const nextVbH = Math.max(8, b.height + pad * 2);

  // Local origin shift in layer's unrotated frame
  const dLocalX = (layer.flipX ? oldVbW - (nextMinX + nextVbW) : nextMinX) * sx;
  const dLocalY = (layer.flipY ? oldVbH - (nextMinY + nextVbH) : nextMinY) * sy;

  const nextWidth = Math.max(8, nextVbW * sx);
  const nextHeight = Math.max(8, nextVbH * sy);

  // Old center in artboard coordinates vs new local center in old local frame
  const oldCxLocal = layer.width / 2;
  const oldCyLocal = layer.height / 2;
  const newCxInOldLocal = dLocalX + nextWidth / 2;
  const newCyInOldLocal = dLocalY + nextHeight / 2;

  const rad = ((layer.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dcxLocal = newCxInOldLocal - oldCxLocal;
  const dcyLocal = newCyInOldLocal - oldCyLocal;
  const worldCenterX = layer.x + oldCxLocal + dcxLocal * cos - dcyLocal * sin;
  const worldCenterY = layer.y + oldCyLocal + dcxLocal * sin + dcyLocal * cos;

  const shiftedPaths = updatedPathDataList.map((d) =>
    transformSvgPath(d, (px, py) => [px - nextMinX, py - nextMinY])
  );

  return {
    ...layer,
    x: Number((worldCenterX - nextWidth / 2).toFixed(2)),
    y: Number((worldCenterY - nextHeight / 2).toFixed(2)),
    width: Number(nextWidth.toFixed(2)),
    height: Number(nextHeight.toFixed(2)),
    sourceViewBox: {
      width: Number(nextVbW.toFixed(2)),
      height: Number(nextVbH.toFixed(2)),
    },
    pathDataList: shiftedPaths,
  };
}
