import React from 'react';
import { VECTOR_ICONS } from '../data/logoLibrary';
import {
  CustomSvgLayer,
  DividerKind,
  DividerLayer,
  IconLayer,
  LogoDocument,
  LogoLayer,
  PathLayer,
  ShapeKind,
  ShapeLayer,
  TextLayer,
} from '../types/logo';
import {
  buildWarpArcPathD,
  computeTextGlyphLayout,
  hasPerLetterEdits,
  resolveWarpConfig,
} from '../utils/glyphLayout';
import { buildShapePath } from '../utils/pathGeometry';

export { buildShapePath };
export const resolveEffectiveTextWarp = resolveWarpConfig;
export const buildCurvedArcPath = buildWarpArcPathD;


export function buildDividerPrimitives(
  kind: DividerKind,
  w: number,
  h: number,
  color: string
): React.ReactNode {
  const cy = h / 2;
  switch (kind) {
    case 'solid':
      return <line x1={0} y1={cy} x2={w} y2={cy} stroke={color} strokeWidth={Math.max(2, h * 0.25)} strokeLinecap="round" />;
    case 'double':
      return (
        <>
          <line x1={0} y1={cy - 3} x2={w} y2={cy - 3} stroke={color} strokeWidth={2} />
          <line x1={0} y1={cy + 3} x2={w} y2={cy + 3} stroke={color} strokeWidth={1.2} opacity={0.75} />
        </>
      );
    case 'diamond-center': {
      const cx = w / 2;
      const dSize = Math.min(6, h * 0.42);
      return (
        <>
          <line x1={0} y1={cy} x2={cx - dSize - 6} y2={cy} stroke={color} strokeWidth={1.8} />
          <polygon
            points={`${cx},${cy - dSize} ${cx + dSize},${cy} ${cx},${cy + dSize} ${cx - dSize},${cy}`}
            fill={color}
          />
          <line x1={cx + dSize + 6} y1={cy} x2={w} y2={cy} stroke={color} strokeWidth={1.8} />
        </>
      );
    }
    case 'tapered':
      return (
        <polygon
          points={`0,${cy} ${w * 0.5},${cy - Math.max(1.8, h * 0.22)} ${w},${cy} ${w * 0.5},${cy + Math.max(1.8, h * 0.22)}`}
          fill={color}
        />
      );
    case 'bracket':
      return (
        <path
          d={`M 8 2 H 2 V ${h - 2} H 8 M ${w - 8} 2 H ${w - 2} V ${h - 2} H ${w - 8} M 10 ${cy} H ${w - 10}`}
          fill="none"
          stroke={color}
          strokeWidth={1.8}
        />
      );
    case 'dotted':
      return (
        <line
          x1={2}
          y1={cy}
          x2={w - 2}
          y2={cy}
          stroke={color}
          strokeWidth={3}
          strokeDasharray="1 8"
          strokeLinecap="round"
        />
      );
  }
}



function buildPatternDef(layer: LogoLayer, idPrefix: string): {
  fillAttr: string;
  patternDef: React.ReactNode;
} | null {
  const pat = layer.fillPattern;
  if (!pat?.enabled) return null;

  const patId = `${idPrefix}-pat-${layer.id}`;
  const fg = pat.foregroundColor || '#141413';
  const bg = pat.backgroundColor || 'transparent';
  const scale = Math.max(0.35, Math.min(3, pat.scale || 1));
  const rot = pat.rotation ?? 0;

  let tileW = 20;
  let tileH = 20;
  let inner: React.ReactNode = null;

  switch (pat.preset) {
    case 'diagonal-stripes':
      tileW = 16;
      tileH = 16;
      inner = (
        <>
          {bg !== 'transparent' && <rect width={16} height={16} fill={bg} />}
          <path d="M-4,4 l8,-8 M0,16 l16,-16 M12,20 l8,-8" stroke={fg} strokeWidth={5} />
        </>
      );
      break;
    case 'halftone-dots':
      tileW = 16;
      tileH = 16;
      inner = (
        <>
          {bg !== 'transparent' && <rect width={16} height={16} fill={bg} />}
          <circle cx={4} cy={4} r={2.6} fill={fg} />
          <circle cx={12} cy={12} r={2.6} fill={fg} />
        </>
      );
      break;
    case 'grid-mesh':
      tileW = 18;
      tileH = 18;
      inner = (
        <>
          {bg !== 'transparent' && <rect width={18} height={18} fill={bg} />}
          <path d="M 18 0 L 0 0 0 18" fill="none" stroke={fg} strokeWidth={2.2} />
        </>
      );
      break;
    case 'chevron-wave':
      tileW = 24;
      tileH = 16;
      inner = (
        <>
          {bg !== 'transparent' && <rect width={24} height={16} fill={bg} />}
          <path
            d="M 0 10 L 12 2 L 24 10"
            fill="none"
            stroke={fg}
            strokeWidth={3.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
      break;
    case 'crosshatch':
      tileW = 16;
      tileH = 16;
      inner = (
        <>
          {bg !== 'transparent' && <rect width={16} height={16} fill={bg} />}
          <path d="M 0 0 L 16 16 M 16 0 L 0 16" stroke={fg} strokeWidth={2} />
        </>
      );
      break;
    case 'terrazzo-geo':
      tileW = 32;
      tileH = 32;
      inner = (
        <>
          {bg !== 'transparent' && <rect width={32} height={32} fill={bg} />}
          <polygon points="4,4 12,2 9,11" fill={fg} opacity={0.9} />
          <polygon points="18,6 27,10 21,16" fill={fg} opacity={0.6} />
          <circle cx={8} cy={24} r={3.5} fill={fg} opacity={0.75} />
          <polygon points="20,21 29,24 26,30 19,28" fill={fg} opacity={0.85} />
        </>
      );
      break;
    case 'concentric-rings':
      tileW = 24;
      tileH = 24;
      inner = (
        <>
          {bg !== 'transparent' && <rect width={24} height={24} fill={bg} />}
          <circle cx={12} cy={12} r={9} fill="none" stroke={fg} strokeWidth={2} />
          <circle cx={12} cy={12} r={4} fill="none" stroke={fg} strokeWidth={2} />
        </>
      );
      break;
  }

  return {
    fillAttr: `url(#${patId})`,
    patternDef: (
      <pattern
        id={patId}
        width={tileW}
        height={tileH}
        patternUnits="userSpaceOnUse"
        patternTransform={`rotate(${rot}) scale(${scale})`}
      >
        {inner}
      </pattern>
    ),
  };
}

function getLayerFillProps(layer: LogoLayer, idPrefix: string): {
  fillAttr: string;
  gradientDef: React.ReactNode;
} {
  const patResult = buildPatternDef(layer, idPrefix);
  if (patResult) {
    return { fillAttr: patResult.fillAttr, gradientDef: patResult.patternDef };
  }

  const grad = layer.fillGradient;
  if (!grad?.enabled) {
    return { fillAttr: layer.fill, gradientDef: null };
  }

  const gradId = `${idPrefix}-grad-${layer.id}`;
  const resolvedStops =
    grad.stops && grad.stops.length >= 2
      ? [...grad.stops].sort((a, b) => a.offset - b.offset)
      : [
          { id: 's0', offset: 0, color: grad.startColor },
          ...(grad.midColor ? [{ id: 's1', offset: 50, color: grad.midColor }] : []),
          { id: 's2', offset: 100, color: grad.endColor },
        ];

  const stopEls = resolvedStops.map((s) => (
    <stop key={s.id} offset={`${Math.max(0, Math.min(100, s.offset))}%`} stopColor={s.color} />
  ));

  const w = Math.max(1, layer.width);
  const h = Math.max(1, layer.height);

  if (grad.type === 'radial') {
    const cxPct = grad.radialCx ?? 50;
    const cyPct = grad.radialCy ?? 50;
    const rPct = grad.radialR ?? 60;
    const cxPx = (cxPct / 100) * w;
    const cyPx = (cyPct / 100) * h;
    const rPx = (rPct / 100) * Math.max(w, h);
    return {
      fillAttr: `url(#${gradId})`,
      gradientDef: (
        <radialGradient
          id={gradId}
          gradientUnits="userSpaceOnUse"
          cx={cxPx.toFixed(1)}
          cy={cyPx.toFixed(1)}
          r={Math.max(4, rPx).toFixed(1)}
        >
          {stopEls}
        </radialGradient>
      ),
    };
  }

  const rad = ((grad.angle ?? 90) * Math.PI) / 180;
  const cx = w / 2;
  const cy = h / 2;
  const halfSpan = (Math.abs(Math.cos(rad)) * w + Math.abs(Math.sin(rad)) * h) / 2;
  const x1 = cx - Math.cos(rad) * halfSpan;
  const y1 = cy - Math.sin(rad) * halfSpan;
  const x2 = cx + Math.cos(rad) * halfSpan;
  const y2 = cy + Math.sin(rad) * halfSpan;

  return {
    fillAttr: `url(#${gradId})`,
    gradientDef: (
      <linearGradient
        id={gradId}
        gradientUnits="userSpaceOnUse"
        x1={x1.toFixed(1)}
        y1={y1.toFixed(1)}
        x2={x2.toFixed(1)}
        y2={y2.toFixed(1)}
      >
        {stopEls}
      </linearGradient>
    ),
  };
}

function buildClipMaskDef(layer: LogoLayer, idPrefix: string): {
  clipPathAttr?: string;
  clipPathDef: React.ReactNode;
} {
  const mask = layer.clipMask;
  if (!mask?.enabled) return { clipPathDef: null };

  const clipId = `${idPrefix}-clip-${layer.id}`;
  const scale = Math.max(0.35, Math.min(1.25, mask.scale ?? 1));
  const w = layer.width;
  const h = layer.height;

  if (mask.shape === 'custom' && mask.customPaths && mask.customPaths.length > 0) {
    const vbW = Math.max(1, mask.customViewBox?.width ?? w);
    const vbH = Math.max(1, mask.customViewBox?.height ?? h);
    const sx = (w * scale) / vbW;
    const sy = (h * scale) / vbH;
    const tx = (w * (1 - scale)) / 2;
    const ty = (h * (1 - scale)) / 2;
    return {
      clipPathAttr: `url(#${clipId})`,
      clipPathDef: (
        <clipPath id={clipId}>
          <g transform={`translate(${tx.toFixed(1)}, ${ty.toFixed(1)}) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`}>
            {mask.customPaths.map((d, idx) => (
              <path key={idx} d={d} clipRule="evenodd" />
            ))}
          </g>
        </clipPath>
      ),
    };
  }

  const mw = Math.max(8, w * scale);
  const mh = Math.max(8, h * scale);
  const tx = (w - mw) / 2;
  const ty = (h - mh) / 2;
  const shapeKind: ShapeKind = mask.shape === 'custom' ? 'circle' : mask.shape;
  const d = buildShapePath(shapeKind, mw, mh, mask.cornerRadius ?? 18);

  return {
    clipPathAttr: `url(#${clipId})`,
    clipPathDef: (
      <clipPath id={clipId}>
        <path d={d} transform={`translate(${tx.toFixed(1)}, ${ty.toFixed(1)})`} />
      </clipPath>
    ),
  };
}

interface RenderLayerProps {
  layer: LogoLayer;
  docBg: string;
  idPrefix: string;
  allLayers?: LogoLayer[];
}

export const CanvasLayerNode: React.FC<RenderLayerProps> = React.memo(({ layer, docBg, idPrefix, allLayers }) => {
  if (!layer.visible) return null;

  const cx = layer.x + layer.width / 2;
  const cy = layer.y + layer.height / 2;
  const flipTransform =
    layer.flipX || layer.flipY
      ? ` translate(${layer.flipX ? layer.width : 0}, ${layer.flipY ? layer.height : 0}) scale(${
          layer.flipX ? -1 : 1
        }, ${layer.flipY ? -1 : 1})`
      : '';
  const transform = `translate(${layer.x}, ${layer.y})${
    layer.rotation ? ` rotate(${layer.rotation}, ${layer.width / 2}, ${layer.height / 2})` : ''
  }${flipTransform}`;
  const filterId = `${idPrefix}-sh-${layer.id}`;
  const { fillAttr, gradientDef } = getLayerFillProps(layer, idPrefix);
  const { clipPathAttr, clipPathDef } = buildClipMaskDef(layer, idPrefix);

  const renderContent = () => {
    switch (layer.type) {
      case 'icon':
        return renderIcon(layer, docBg, fillAttr);
      case 'shape':
        return renderShape(layer, fillAttr);
      case 'divider':
        return renderDivider(layer, fillAttr);
      case 'text':
        return renderText(layer, `${idPrefix}-arc-${layer.id}`, fillAttr, allLayers);
      case 'path':
        return renderPathLayer(layer, fillAttr);
      case 'custom-svg':
        return renderCustomSvg(layer, fillAttr);
    }
  };

  return (
    <g
      data-layer-id={layer.id}
      transform={transform}
      opacity={layer.opacity}
      filter={layer.shadow.enabled ? `url(#${filterId})` : undefined}
    >
      {(layer.shadow.enabled || gradientDef || clipPathDef) && (
        <defs>
          {gradientDef}
          {clipPathDef}
          {layer.shadow.enabled && (
            <filter id={filterId} x="-35%" y="-35%" width="170%" height="170%">
              <feDropShadow
                dx={layer.shadow.offsetX}
                dy={layer.shadow.offsetY}
                stdDeviation={Math.max(0.5, layer.shadow.blur / 2)}
                floodColor={layer.shadow.color}
              />
            </filter>
          )}
        </defs>
      )}
      {/* Invisible hit target rect so dragging anywhere inside bounding box works smoothly */}
      <rect data-hit-target="true" x={0} y={0} width={layer.width} height={layer.height} fill="transparent" />
      {clipPathAttr ? <g clipPath={clipPathAttr}>{renderContent()}</g> : renderContent()}
      <title data-cx={cx} data-cy={cy}>{layer.name}</title>
    </g>
  );
});

function renderIcon(layer: IconLayer, docBg: string, fillAttr: string) {
  const icon = VECTOR_ICONS.find((ic) => ic.id === layer.iconId) ?? VECTOR_ICONS[0];
  const scaleX = layer.width / 100;
  const scaleY = layer.height / 100;

  return (
    <g transform={`scale(${scaleX}, ${scaleY})`}>
      {icon.paths.map((p, idx) => {
        const override = layer.partColors?.[idx];
        const color =
          override ||
          (p.role === 'primary'
            ? fillAttr
            : p.role === 'accent'
              ? layer.accentFill || fillAttr
              : p.role === 'secondary'
                ? layer.secondaryFill || fillAttr
                : docBg === 'transparent'
                  ? '#FFFFFF'
                  : docBg);

        if (p.strokeOnly) {
          return (
            <path
              key={idx}
              d={p.d}
              fill="none"
              stroke={color}
              strokeWidth={p.strokeWidth ?? 5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        }

        return (
          <path
            key={idx}
            d={p.d}
            fill={color}
            fillRule={p.fillRule ?? 'nonzero'}
            stroke={layer.strokeWidth > 0 ? layer.stroke : 'none'}
            strokeWidth={layer.strokeWidth > 0 ? layer.strokeWidth / Math.max(0.3, scaleX) : 0}
          />
        );
      })}
    </g>
  );
}

function renderShape(layer: ShapeLayer, fillAttr: string) {
  const d = buildShapePath(layer.shapeKind, layer.width, layer.height, layer.cornerRadius);
  const fillVal = layer.shapeKind === 'ring' || layer.shapeKind === 'frame' ? 'none' : fillAttr;
  const strokeVal =
    layer.strokeWidth > 0
      ? layer.stroke
      : layer.shapeKind === 'ring' || layer.shapeKind === 'frame'
        ? fillAttr
        : 'none';
  const strokeW =
    layer.strokeWidth > 0
      ? layer.strokeWidth
      : layer.shapeKind === 'ring' || layer.shapeKind === 'frame'
        ? 6
        : 0;

  const frameInnerR = Math.max(0, Math.min(layer.cornerRadius * 0.7, (layer.width - 22) / 2, (layer.height - 22) / 2));

  return (
    <>
      <path d={d} fill={fillVal} stroke={strokeVal} strokeWidth={strokeW} strokeLinejoin="round" />
      {layer.shapeKind === 'frame' && layer.width > 24 && layer.height > 24 && (
        <rect
          x={11}
          y={11}
          width={layer.width - 22}
          height={layer.height - 22}
          rx={frameInnerR}
          ry={frameInnerR}
          fill="none"
          stroke={strokeVal}
          strokeWidth={Math.max(1, strokeW * 0.4)}
          opacity={0.65}
        />
      )}
      {layer.shapeKind === 'crest-double' && layer.width > 36 && layer.height > 36 && (
        <path
          d={buildShapePath('shield', layer.width - 18, layer.height - 18, layer.cornerRadius)}
          transform="translate(9, 9)"
          fill="none"
          stroke={layer.strokeWidth > 0 ? strokeVal : '#FFFFFF'}
          strokeWidth={Math.max(1.5, strokeW * 0.45)}
          opacity={0.75}
        />
      )}
    </>
  );
}

function renderDivider(layer: DividerLayer, fillAttr: string) {
  return buildDividerPrimitives(layer.dividerKind, layer.width, layer.height, fillAttr);
}

function buildTextSkewTransform(layer: TextLayer): string | undefined {
  const warp = resolveEffectiveTextWarp(layer);
  const slant = warp.slant ?? 0;
  const perspective = warp.perspective ?? 0;
  if (Math.abs(slant) < 0.2 && Math.abs(perspective) < 0.2) return undefined;

  const cx = layer.width / 2;
  const cy = layer.height / 2;
  const ops: string[] = [`translate(${cx.toFixed(1)}, ${cy.toFixed(1)})`];
  if (Math.abs(slant) >= 0.2) {
    ops.push(`skewX(${(-slant).toFixed(1)})`);
  }
  if (Math.abs(perspective) >= 0.2) {
    ops.push(`skewY(${(perspective * 0.45).toFixed(1)})`);
    const yScale = Math.max(0.68, 1 - Math.abs(perspective) * 0.006);
    ops.push(`scale(1, ${yScale.toFixed(3)})`);
  }
  ops.push(`translate(${(-cx).toFixed(1)}, ${(-cy).toFixed(1)})`);
  return ops.join(' ');
}

function renderText(
  layer: TextLayer,
  idBase: string,
  fillAttr: string,
  allLayers?: LogoLayer[]
) {
  const arcPathId = `${idBase}-path`;
  const raw = layer.uppercase ? layer.text.toUpperCase() : layer.text;
  const lines = raw.split(/\r?\n/);
  const warp = resolveEffectiveTextWarp(layer);
  const usesCustomTextPath = Boolean(layer.textPath);
  const usesPerLetterLayout = usesCustomTextPath || hasPerLetterEdits(layer);

  const usesWarpPath =
    !usesPerLetterLayout &&
    (warp.mode === 'arc-up' ||
      warp.mode === 'arc-down' ||
      warp.mode === 'circle' ||
      warp.mode === 'wave' ||
      (warp.mode === 'none' && Math.abs(layer.curveRadius) >= 20));

  const arc = usesWarpPath ? buildCurvedArcPath(layer) : null;
  const perLetterLayout = usesPerLetterLayout ? computeTextGlyphLayout(layer, allLayers) : null;
  const skewTransform = buildTextSkewTransform(layer);

  const anchor: 'start' | 'middle' | 'end' =
    layer.textAlign === 'left' ? 'start' : layer.textAlign === 'right' ? 'end' : 'middle';
  const xPos =
    layer.textAlign === 'left' ? 4 : layer.textAlign === 'right' ? layer.width - 4 : layer.width / 2;
  const totalTextHeight = lines.length * layer.fontSize * layer.lineHeight;
  const firstY = Math.max(
    layer.fontSize * 0.85,
    (layer.height - totalTextHeight) / 2 + layer.fontSize * 0.82
  );

  const effect = layer.textEffect;
  const style = effect?.style ?? 'none';
  const intensity = Math.max(0.3, Math.min(2.0, effect?.intensity ?? 1));
  const effOffset = Math.max(2, Math.min(18, effect?.offset ?? 6));
  const effAngleRad = (((effect?.angle ?? 45) * Math.PI) / 180);
  const dx = Math.cos(effAngleRad) * effOffset;
  const dy = Math.sin(effAngleRad) * effOffset;

  const neonFilterId = `${idBase}-neon`;
  const foilGradId = `${idBase}-foil`;

  const renderGlyphPass = (opts: {
    key: string;
    fill: string;
    stroke?: string;
    strokeWidth?: number;
    dxOffset?: number;
    dyOffset?: number;
    opacity?: number;
    filter?: string;
  }) => {
    const translateStr =
      opts.dxOffset || opts.dyOffset
        ? `translate(${(opts.dxOffset ?? 0).toFixed(2)}, ${(opts.dyOffset ?? 0).toFixed(2)})`
        : undefined;

    if (usesPerLetterLayout && perLetterLayout) {
      return (
        <g
          key={opts.key}
          transform={translateStr}
          fill={opts.fill}
          fillOpacity={opts.opacity}
          stroke={opts.stroke ?? 'none'}
          strokeWidth={opts.strokeWidth ?? 0}
          strokeLinejoin="round"
          strokeLinecap="round"
          paintOrder="stroke fill"
          filter={opts.filter}
        >
          {perLetterLayout.glyphs.map((g) => (
            <text
              key={`${opts.key}-g-${g.index}`}
              x={0}
              y={0}
              textAnchor="middle"
              transform={`translate(${g.x.toFixed(2)}, ${g.y.toFixed(2)}) rotate(${g.angleDeg.toFixed(2)}) scale(${g.scale.toFixed(3)})`}
              fontFamily={layer.fontFamily}
              fontWeight={layer.fontWeight}
              fontStyle={layer.fontStyle}
              fontSize={layer.fontSize}
              style={{ userSelect: 'none' }}
            >
              {g.char === ' ' ? '\u00A0' : g.char}
            </text>
          ))}
        </g>
      );
    }

    if (usesWarpPath && arc) {
      return (
        <text
          key={opts.key}
          transform={translateStr}
          fill={opts.fill}
          fillOpacity={opts.opacity}
          stroke={opts.stroke ?? 'none'}
          strokeWidth={opts.strokeWidth ?? 0}
          strokeLinejoin="round"
          strokeLinecap="round"
          paintOrder="stroke fill"
          filter={opts.filter}
          fontFamily={layer.fontFamily}
          fontWeight={layer.fontWeight}
          fontStyle={layer.fontStyle}
          fontSize={layer.fontSize}
          letterSpacing={`${layer.letterSpacing}em`}
          style={{ userSelect: 'none' }}
        >
          <textPath
            href={`#${arcPathId}`}
            startOffset={arc.startOffset}
            textAnchor={arc.textAnchor}
          >
            {lines[0]}
          </textPath>
        </text>
      );
    }

    return (
      <text
        key={opts.key}
        x={xPos}
        y={firstY}
        transform={translateStr}
        textAnchor={anchor}
        fill={opts.fill}
        fillOpacity={opts.opacity}
        stroke={opts.stroke ?? 'none'}
        strokeWidth={opts.strokeWidth ?? 0}
        strokeLinejoin="round"
        strokeLinecap="round"
        paintOrder="stroke fill"
        filter={opts.filter}
        fontFamily={layer.fontFamily}
        fontWeight={layer.fontWeight}
        fontStyle={layer.fontStyle}
        fontSize={layer.fontSize}
        letterSpacing={`${layer.letterSpacing}em`}
        style={{ userSelect: 'none' }}
      >
        {lines.map((line, i) => (
          <tspan
            key={i}
            x={xPos}
            dy={i === 0 ? 0 : layer.fontSize * layer.lineHeight}
          >
            {line || ' '}
          </tspan>
        ))}
      </text>
    );
  };

  let effectDefs: React.ReactNode = null;
  const passes: React.ReactNode[] = [];

  if (style === 'hollow') {
    const sw = Math.max(1.4, (layer.strokeWidth > 0 ? layer.strokeWidth : 2.6) * intensity);
    const strokeCol =
      effect?.primaryColor ||
      (layer.strokeWidth > 0 && layer.stroke !== 'none' ? layer.stroke : fillAttr);
    passes.push(
      renderGlyphPass({
        key: 'hollow',
        fill: 'none',
        stroke: strokeCol,
        strokeWidth: sw,
      })
    );
  } else if (style === 'splice') {
    const shadowFill = effect?.primaryColor || '#F59E0B';
    const outlineCol = effect?.secondaryColor || layer.fill;
    const sw = Math.max(1.6, 2.4 * intensity);
    passes.push(
      renderGlyphPass({
        key: 'splice-back',
        fill: shadowFill,
        dxOffset: dx,
        dyOffset: dy,
        opacity: 0.94,
      }),
      renderGlyphPass({
        key: 'splice-front',
        fill: 'none',
        stroke: outlineCol,
        strokeWidth: sw,
      })
    );
  } else if (style === 'neon') {
    const glowColor = effect?.primaryColor || layer.fill;
    const coreColor = effect?.secondaryColor || '#FFFFFF';
    const outerStd = Math.max(3, 6.5 * intensity);
    const innerStd = Math.max(1.2, 2.2 * intensity);
    effectDefs = (
      <filter id={neonFilterId} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation={outerStd} result="blurOuter" />
        <feGaussianBlur in="SourceGraphic" stdDeviation={innerStd} result="blurInner" />
        <feMerge>
          <feMergeNode in="blurOuter" />
          <feMergeNode in="blurOuter" />
          <feMergeNode in="blurInner" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    );
    passes.push(
      renderGlyphPass({
        key: 'neon-halo',
        fill: glowColor,
        stroke: glowColor,
        strokeWidth: Math.max(2, 3.4 * intensity),
        filter: `url(#${neonFilterId})`,
      }),
      renderGlyphPass({
        key: 'neon-core',
        fill: coreColor,
        stroke: glowColor,
        strokeWidth: Math.max(0.8, 1.1 * intensity),
        opacity: 0.96,
      })
    );
  } else if (style === 'extrude') {
    const depthColor = effect?.primaryColor || '#1E293B';
    const steps = Math.max(5, Math.min(12, Math.round(effOffset * 1.2)));
    for (let s = steps; s >= 1; s--) {
      const t = s / steps;
      passes.push(
        renderGlyphPass({
          key: `ext-${s}`,
          fill: depthColor,
          stroke: depthColor,
          strokeWidth: 0.8,
          dxOffset: dx * t * 1.35,
          dyOffset: dy * t * 1.35,
          opacity: s === steps ? 0.9 : 1,
        })
      );
    }
    passes.push(
      renderGlyphPass({
        key: 'ext-face',
        fill: fillAttr,
        stroke: layer.strokeWidth > 0 ? layer.stroke : effect?.secondaryColor || 'none',
        strokeWidth: layer.strokeWidth > 0 ? layer.strokeWidth : effect?.secondaryColor ? 1.2 : 0,
      })
    );
  } else if (style === 'glitch') {
    const cyan = effect?.primaryColor || '#06B6D4';
    const magenta = effect?.secondaryColor || '#F43F5E';
    const shift = effOffset * 0.72 * intensity;
    passes.push(
      renderGlyphPass({
        key: 'glitch-c',
        fill: cyan,
        dxOffset: -shift,
        dyOffset: -shift * 0.22,
        opacity: 0.84,
      }),
      renderGlyphPass({
        key: 'glitch-m',
        fill: magenta,
        dxOffset: shift,
        dyOffset: shift * 0.22,
        opacity: 0.84,
      }),
      renderGlyphPass({
        key: 'glitch-main',
        fill: fillAttr,
        stroke: layer.strokeWidth > 0 ? layer.stroke : 'none',
        strokeWidth: layer.strokeWidth,
      })
    );
  } else if (style === 'foil') {
    const highlight = effect?.primaryColor || '#FFF3C4';
    const mid = layer.fill === 'transparent' || layer.fill === '#141413' ? '#D4AF37' : layer.fill;
    const shadowCol = effect?.secondaryColor || '#78550B';
    effectDefs = (
      <linearGradient
        id={foilGradId}
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1="0"
        x2={layer.width}
        y2={layer.height}
      >
        <stop offset="0%" stopColor={highlight} />
        <stop offset="22%" stopColor={mid} />
        <stop offset="48%" stopColor={shadowCol} />
        <stop offset="72%" stopColor={highlight} />
        <stop offset="100%" stopColor={mid} />
      </linearGradient>
    );
    passes.push(
      renderGlyphPass({
        key: 'foil-depth',
        fill: shadowCol,
        dxOffset: 1.2 * intensity,
        dyOffset: 1.6 * intensity,
        opacity: 0.65,
      }),
      renderGlyphPass({
        key: 'foil-sheen',
        fill: highlight,
        dxOffset: -0.7,
        dyOffset: -0.7,
        opacity: 0.5,
      }),
      renderGlyphPass({
        key: 'foil-face',
        fill: `url(#${foilGradId})`,
        stroke: shadowCol,
        strokeWidth: Math.max(0.5, layer.strokeWidth),
      })
    );
  } else {
    passes.push(
      renderGlyphPass({
        key: 'base',
        fill: fillAttr,
        stroke: layer.strokeWidth > 0 ? layer.stroke : 'none',
        strokeWidth: layer.strokeWidth,
      })
    );
  }

  return (
    <g transform={skewTransform}>
      {(arc || effectDefs) && (
        <defs>
          {arc && <path id={arcPathId} d={arc.d} fill="none" />}
          {effectDefs}
        </defs>
      )}
      {passes}
    </g>
  );
}

function renderPathLayer(layer: PathLayer, fillAttr: string) {
  const sx = layer.width / Math.max(1, layer.sourceViewBox.width);
  const sy = layer.height / Math.max(1, layer.sourceViewBox.height);
  const isOpen = Boolean(layer.isOpenPath) && (layer.fill === 'transparent' || layer.fill === 'none');
  const resolvedFill = isOpen ? 'none' : fillAttr;
  const resolvedStroke =
    layer.strokeWidth > 0 && layer.stroke !== 'none'
      ? layer.stroke
      : isOpen
        ? fillAttr !== 'transparent' && fillAttr !== 'none'
          ? fillAttr
          : '#141413'
        : 'none';
  const resolvedStrokeW =
    layer.strokeWidth > 0
      ? layer.strokeWidth / Math.max(0.3, sx)
      : isOpen
        ? 4 / Math.max(0.3, sx)
        : 0;

  return (
    <g transform={`scale(${sx}, ${sy})`}>
      {layer.pathDataList.map((d, idx) => (
        <path
          key={idx}
          d={d}
          fill={resolvedFill}
          fillRule={layer.fillRule ?? 'nonzero'}
          stroke={resolvedStroke}
          strokeWidth={resolvedStrokeW}
          strokeLinecap="round"
          strokeLinejoin="round"
          paintOrder="stroke fill"
        />
      ))}
    </g>
  );
}

function renderCustomSvg(layer: CustomSvgLayer, fillAttr: string) {
  const parts = layer.viewBox.trim().split(/\s+/).map(Number);
  const vbX = Number.isFinite(parts[0]) ? parts[0] : 0;
  const vbY = Number.isFinite(parts[1]) ? parts[1] : 0;
  const vbW = Number.isFinite(parts[2]) && parts[2] > 0 ? parts[2] : 100;
  const vbH = Number.isFinite(parts[3]) && parts[3] > 0 ? parts[3] : 100;
  const sx = layer.width / vbW;
  const sy = layer.height / vbH;

  return (
    <g transform={`scale(${sx}, ${sy}) translate(${-vbX}, ${-vbY})`}>
      {layer.paths.map((p, idx) => {
        const useOriginal = layer.preserveOriginalColors;
        const hasStrokeOnly = p.fill === 'none';
        const fill = hasStrokeOnly
          ? 'none'
          : useOriginal && p.fill
            ? p.fill
            : fillAttr;
        const stroke =
          layer.strokeWidth > 0
            ? layer.stroke
            : hasStrokeOnly || (p.stroke && p.stroke !== 'none')
              ? useOriginal && p.stroke && p.stroke !== 'none'
                ? p.stroke
                : fillAttr
              : 'none';
        const sw =
          layer.strokeWidth > 0
            ? layer.strokeWidth / Math.max(0.2, sx)
            : p.strokeWidth ?? (stroke !== 'none' ? 2 : 0);

        return (
          <path
            key={idx}
            d={p.d}
            fill={fill}
            fillRule={p.fillRule}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </g>
  );
}

interface DocumentSvgProps {
  doc: LogoDocument;
  idPrefix: string;
  className?: string;
  forceBackground?: string;
}

export const LogoDocumentSvg: React.FC<DocumentSvgProps> = React.memo(({
  doc,
  idPrefix,
  className,
  forceBackground,
}) => {
  const bg = forceBackground ?? (doc.transparentBackground ? 'transparent' : doc.backgroundColor);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${doc.width} ${doc.height}`}
      className={className}
    >
      {bg !== 'transparent' && (
        <rect x={0} y={0} width={doc.width} height={doc.height} fill={bg} />
      )}
      {doc.layers.map((layer) => (
        <CanvasLayerNode
          key={layer.id}
          layer={layer}
          docBg={bg}
          idPrefix={idPrefix}
          allLayers={doc.layers}
        />
      ))}
    </svg>
  );
});
