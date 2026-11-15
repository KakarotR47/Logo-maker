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
import {
  buildBrushedMetalGeometry,
  buildHalftoneDotsGeometry,
  buildPaperGrainGeometry,
  buildVintageGritGeometry,
  resolveKnockoutCompositing,
  SURFACE_TEXTURE_PRESETS,
} from '../utils/surfaceTextures';
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
  maskAttr?: string;
  clipPathDef: React.ReactNode;
} {
  const mask = layer.clipMask;
  if (!mask?.enabled) return { clipPathDef: null };

  const clipId = `${idPrefix}-clip-${layer.id}`;
  const scale = Math.max(0.35, Math.min(1.25, mask.scale ?? 1));
  const w = layer.width;
  const h = layer.height;
  const inverted = Boolean(mask.inverted);

  let geometryNode: React.ReactNode;
  if (mask.shape === 'custom' && mask.customPaths && mask.customPaths.length > 0) {
    const vbW = Math.max(1, mask.customViewBox?.width ?? w);
    const vbH = Math.max(1, mask.customViewBox?.height ?? h);
    const sx = (w * scale) / vbW;
    const sy = (h * scale) / vbH;
    const tx = (w * (1 - scale)) / 2;
    const ty = (h * (1 - scale)) / 2;
    geometryNode = (
      <g
        transform={`translate(${tx.toFixed(1)}, ${ty.toFixed(1)}) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`}
      >
        {mask.customPaths.map((d, idx) => (
          <path
            key={idx}
            d={d}
            fill={inverted ? '#000000' : undefined}
            fillRule="evenodd"
            clipRule="evenodd"
          />
        ))}
      </g>
    );
  } else {
    const mw = Math.max(8, w * scale);
    const mh = Math.max(8, h * scale);
    const tx = (w - mw) / 2;
    const ty = (h - mh) / 2;
    const shapeKind: ShapeKind = mask.shape === 'custom' ? 'circle' : mask.shape;
    const d = buildShapePath(shapeKind, mw, mh, mask.cornerRadius ?? 18);
    geometryNode = (
      <path
        d={d}
        fill={inverted ? '#000000' : undefined}
        transform={`translate(${tx.toFixed(1)}, ${ty.toFixed(1)})`}
      />
    );
  }

  if (inverted) {
    const pad = Math.max(40, layer.strokeWidth * 2 + 20);
    return {
      maskAttr: `url(#${clipId})`,
      clipPathDef: (
        <mask
          id={clipId}
          maskUnits="userSpaceOnUse"
          x={-pad}
          y={-pad}
          width={w + pad * 2}
          height={h + pad * 2}
        >
          <rect x={-pad} y={-pad} width={w + pad * 2} height={h + pad * 2} fill="#ffffff" />
          {geometryNode}
        </mask>
      ),
    };
  }

  return {
    clipPathAttr: `url(#${clipId})`,
    clipPathDef: <clipPath id={clipId}>{geometryNode}</clipPath>,
  };
}

interface RenderLayerProps {
  layer: LogoLayer;
  docBg: string;
  idPrefix: string;
  allLayers?: LogoLayer[];
  /** Used internally by <mask> definitions to render solid black/white layer silhouettes */
  forceMaskFill?: '#000000' | '#ffffff';
}

export const CanvasLayerNode: React.FC<RenderLayerProps> = React.memo(
  ({ layer, docBg, idPrefix, allLayers, forceMaskFill }) => {
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
    const { fillAttr: normalFillAttr, gradientDef } = forceMaskFill
      ? { fillAttr: forceMaskFill, gradientDef: null }
      : getLayerFillProps(layer, idPrefix);
    const { clipPathAttr, maskAttr, clipPathDef } = buildClipMaskDef(layer, idPrefix);

    const renderContent = () => {
      switch (layer.type) {
        case 'icon':
          return renderIcon(layer, docBg, normalFillAttr, forceMaskFill);
        case 'shape':
          return renderShape(layer, normalFillAttr, forceMaskFill);
        case 'divider':
          return renderDivider(layer, normalFillAttr);
        case 'text':
          return renderText(layer, `${idPrefix}-arc-${layer.id}`, normalFillAttr, allLayers, forceMaskFill);
        case 'path':
          return renderPathLayer(layer, normalFillAttr, forceMaskFill);
        case 'custom-svg':
          return renderCustomSvg(layer, normalFillAttr, forceMaskFill);
      }
    };

    const blendStyle =
      !forceMaskFill && layer.blendMode && layer.blendMode !== 'normal'
        ? { mixBlendMode: layer.blendMode }
        : undefined;

    return (
      <g
        data-layer-id={forceMaskFill ? undefined : layer.id}
        transform={transform}
        opacity={layer.opacity}
        style={blendStyle}
        filter={!forceMaskFill && layer.shadow.enabled ? `url(#${filterId})` : undefined}
      >
        {( (!forceMaskFill && layer.shadow.enabled) || gradientDef || clipPathDef) && (
          <defs>
            {gradientDef}
            {clipPathDef}
            {!forceMaskFill && layer.shadow.enabled && (
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
        {!forceMaskFill && (
          <rect data-hit-target="true" x={0} y={0} width={layer.width} height={layer.height} fill="transparent" />
        )}
        {clipPathAttr ? (
          <g clipPath={clipPathAttr}>{renderContent()}</g>
        ) : maskAttr ? (
          <g mask={maskAttr}>{renderContent()}</g>
        ) : (
          renderContent()
        )}
        {!forceMaskFill && (
          <title data-cx={cx} data-cy={cy}>
            {layer.name}
          </title>
        )}
      </g>
    );
  }
);

function renderIcon(
  layer: IconLayer,
  docBg: string,
  fillAttr: string,
  forceMaskFill?: '#000000' | '#ffffff'
) {
  const icon = VECTOR_ICONS.find((ic) => ic.id === layer.iconId) ?? VECTOR_ICONS[0];
  const scaleX = layer.width / 100;
  const scaleY = layer.height / 100;

  return (
    <g transform={`scale(${scaleX}, ${scaleY})`}>
      {icon.paths.map((p, idx) => {
        const override = forceMaskFill ? undefined : layer.partColors?.[idx];
        const cutoutColor = forceMaskFill
          ? forceMaskFill === '#000000'
            ? '#ffffff'
            : '#000000'
          : docBg === 'transparent'
            ? '#FFFFFF'
            : docBg;
        const color =
          override ||
          (p.role === 'cutout'
            ? cutoutColor
            : forceMaskFill
              ? forceMaskFill
              : p.role === 'primary'
                ? fillAttr
                : p.role === 'accent'
                  ? layer.accentFill || fillAttr
                  : layer.secondaryFill || fillAttr);

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

        const resolvedStroke =
          layer.strokeWidth > 0 ? (forceMaskFill ?? layer.stroke) : 'none';

        return (
          <path
            key={idx}
            d={p.d}
            fill={color}
            fillRule={p.fillRule ?? 'nonzero'}
            stroke={resolvedStroke}
            strokeWidth={layer.strokeWidth > 0 ? layer.strokeWidth / Math.max(0.3, scaleX) : 0}
          />
        );
      })}
    </g>
  );
}

function renderShape(
  layer: ShapeLayer,
  fillAttr: string,
  forceMaskFill?: '#000000' | '#ffffff'
) {
  const d = buildShapePath(layer.shapeKind, layer.width, layer.height, layer.cornerRadius);
  const fillVal = layer.shapeKind === 'ring' || layer.shapeKind === 'frame' ? 'none' : fillAttr;
  const strokeVal =
    layer.strokeWidth > 0
      ? forceMaskFill ?? layer.stroke
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
  allLayers?: LogoLayer[],
  forceMaskFill?: '#000000' | '#ffffff'
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

  if (forceMaskFill) {
    passes.push(
      renderGlyphPass({
        key: 'mask-solid',
        fill: style === 'hollow' ? 'none' : forceMaskFill,
        stroke:
          style === 'hollow' || layer.strokeWidth > 0 ? forceMaskFill : 'none',
        strokeWidth:
          style === 'hollow'
            ? Math.max(1.4, (layer.strokeWidth > 0 ? layer.strokeWidth : 2.6) * intensity)
            : layer.strokeWidth,
      })
    );
  } else if (style === 'hollow') {
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

function renderPathLayer(
  layer: PathLayer,
  fillAttr: string,
  forceMaskFill?: '#000000' | '#ffffff'
) {
  const sx = layer.width / Math.max(1, layer.sourceViewBox.width);
  const sy = layer.height / Math.max(1, layer.sourceViewBox.height);
  const isOpen = Boolean(layer.isOpenPath) && (layer.fill === 'transparent' || layer.fill === 'none');
  const resolvedFill = isOpen ? 'none' : fillAttr;
  const resolvedStroke =
    layer.strokeWidth > 0 && layer.stroke !== 'none'
      ? forceMaskFill ?? layer.stroke
      : isOpen
        ? fillAttr !== 'transparent' && fillAttr !== 'none'
          ? fillAttr
          : forceMaskFill ?? '#141413'
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

function renderCustomSvg(
  layer: CustomSvgLayer,
  fillAttr: string,
  forceMaskFill?: '#000000' | '#ffffff'
) {
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
        const useOriginal = !forceMaskFill && layer.preserveOriginalColors;
        const hasStrokeOnly = p.fill === 'none';
        const fill = hasStrokeOnly
          ? 'none'
          : forceMaskFill
            ? forceMaskFill
            : useOriginal && p.fill
              ? p.fill
              : fillAttr;
        const stroke =
          layer.strokeWidth > 0
            ? forceMaskFill ?? layer.stroke
            : hasStrokeOnly || (p.stroke && p.stroke !== 'none')
              ? forceMaskFill ?? (useOriginal && p.stroke && p.stroke !== 'none' ? p.stroke : fillAttr)
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

interface SceneLayersProps {
  doc: LogoDocument;
  docBg: string;
  idPrefix: string;
  wrapInteractiveLayer?: (
    layer: LogoLayer,
    node: React.ReactNode,
    options?: { isKnockoutCutter?: boolean }
  ) => React.ReactNode;
}

/**
 * Shared compositing scene renderer used by both the live interactive editor
 * and clean SVG/PNG/PDF exports. Handles:
 *  - Knockout / Cutout SVG masks punching true transparent holes through underlying layers
 *  - Non-destructive Vintage Grit, Halftone Dots, Brushed Metal & Paper Grain finishes
 */
export const LogoSceneLayers: React.FC<SceneLayersProps> = React.memo(
  ({ doc, docBg, idPrefix, wrapInteractiveLayer }) => {
    const { cuttersByTargetId, consumedKnockoutIds } = React.useMemo(
      () => resolveKnockoutCompositing(doc.layers),
      [doc.layers]
    );

    const tex = doc.surfaceTexture;
    const texActive = Boolean(tex?.enabled && tex.preset !== 'none');
    const texMeta = texActive
      ? SURFACE_TEXTURE_PRESETS.find((m) => m.preset === tex?.preset)
      : undefined;
    const texMode = tex?.mode ?? texMeta?.defaultMode ?? 'distress';
    const texScale = Math.max(0.35, Math.min(3, tex?.scale ?? 1));
    const texAngle = tex?.angle ?? texMeta?.defaultAngle ?? 15;
    const texIntensity = Math.max(0.1, Math.min(1, tex?.intensity ?? 0.65));
    const texSeed = tex?.seed ?? 42;
    const texInverted = Boolean(tex?.inverted);

    const maskPad = 1200;
    const texPatId = `${idPrefix}-stex-pat`;
    const texMaskId = `${idPrefix}-stex-mask`;
    const artSilMaskId = `${idPrefix}-artsil-mask`;
    const sheenGradId = `${idPrefix}-metal-sheen`;

    const renderTexturePatternContent = (
      mode: 'distress' | 'overlay' | 'canvas',
      inverted: boolean
    ) => {
      if (!tex || !texActive) return null;

      if (tex.preset === 'vintage-grit') {
        const { tileW, tileH, specks } = buildVintageGritGeometry(texSeed, texIntensity);
        const holeColor = mode === 'distress' ? (inverted ? '#ffffff' : '#000000') : '#141413';
        return {
          tileW,
          tileH,
          elements: specks.map((s, i) => {
            if (s.kind === 'circle') {
              return (
                <circle
                  key={i}
                  cx={s.x}
                  cy={s.y}
                  r={s.w}
                  fill={holeColor}
                  opacity={s.alpha}
                />
              );
            }
            return (
              <rect
                key={i}
                x={s.x}
                y={s.y}
                width={s.w}
                height={s.h}
                rx={s.kind === 'scratch' ? s.h / 2 : 0.4}
                fill={holeColor}
                opacity={s.alpha}
                transform={s.rot ? `rotate(${s.rot}, ${s.x}, ${s.y})` : undefined}
              />
            );
          }),
        };
      }

      if (tex.preset === 'halftone-dots') {
        const { tileW, tileH, dots } = buildHalftoneDotsGeometry(texIntensity);
        const dotColor = mode === 'distress' ? (inverted ? '#ffffff' : '#000000') : '#0F172A';
        return {
          tileW,
          tileH,
          elements: dots.map((d, i) => (
            <circle
              key={i}
              cx={d.cx}
              cy={d.cy}
              r={d.r}
              fill={dotColor}
              opacity={mode === 'distress' ? 0.92 : Math.min(0.65, texIntensity * 0.75)}
            />
          )),
        };
      }

      if (tex.preset === 'brushed-metal') {
        const { tileW, tileH, streaks } = buildBrushedMetalGeometry(texSeed, texIntensity);
        return {
          tileW,
          tileH,
          elements: streaks.map((st, i) => (
            <line
              key={i}
              x1={st.x1}
              y1={st.y}
              x2={st.x2}
              y2={st.y}
              stroke={
                mode === 'distress'
                  ? inverted
                    ? '#ffffff'
                    : '#000000'
                  : st.tone === 'light'
                    ? '#FFFFFF'
                    : '#0F172A'
              }
              strokeWidth={st.strokeWidth}
              strokeLinecap="round"
              opacity={mode === 'distress' ? Math.min(0.85, st.opacity * 1.45) : st.opacity}
            />
          )),
        };
      }

      if (tex.preset === 'paper-grain') {
        const { tileW, tileH, fibers } = buildPaperGrainGeometry(texSeed, texIntensity);
        return {
          tileW,
          tileH,
          elements: fibers.map((fb, i) => {
            const color =
              mode === 'distress'
                ? inverted
                  ? '#ffffff'
                  : '#000000'
                : fb.tone === 'dark'
                  ? '#1E293B'
                  : '#FFFFFF';
            if (fb.kind === 'grain') {
              return (
                <circle
                  key={i}
                  cx={fb.x1}
                  cy={fb.y1}
                  r={fb.r}
                  fill={color}
                  opacity={mode === 'distress' ? fb.opacity * 1.65 : fb.opacity}
                />
              );
            }
            return (
              <line
                key={i}
                x1={fb.x1}
                y1={fb.y1}
                x2={fb.x2}
                y2={fb.y2}
                stroke={color}
                strokeWidth={0.75}
                strokeLinecap="round"
                opacity={mode === 'distress' ? fb.opacity * 1.6 : fb.opacity}
              />
            );
          }),
        };
      }

      return null;
    };

    const texPattern = renderTexturePatternContent(texMode, texInverted);

    const renderBaseLayers = (maskSilhouette?: '#ffffff') =>
      doc.layers.map((layer) => {
        if (!layer.visible) return null;

        const isConsumedKnockout = consumedKnockoutIds.has(layer.id);
        if (isConsumedKnockout) {
          if (maskSilhouette || !wrapInteractiveLayer) return null;
          const invisibleHitNode = (
            <g opacity={0}>
              <CanvasLayerNode
                layer={layer}
                docBg={docBg}
                idPrefix={`${idPrefix}-hit`}
                allLayers={doc.layers}
              />
            </g>
          );
          return (
            <React.Fragment key={layer.id}>
              {wrapInteractiveLayer(layer, invisibleHitNode, { isKnockoutCutter: true })}
            </React.Fragment>
          );
        }

        const cutters = cuttersByTargetId.get(layer.id);
        const node = (
          <CanvasLayerNode
            layer={layer}
            docBg={docBg}
            idPrefix={maskSilhouette ? `${idPrefix}-sil` : idPrefix}
            allLayers={doc.layers}
            forceMaskFill={maskSilhouette}
          />
        );

        const wrappedNode =
          cutters && cutters.length > 0 ? (
            <g mask={`url(#${idPrefix}-ko-${layer.id}${maskSilhouette ? '-sil' : ''})`}>
              {node}
            </g>
          ) : (
            node
          );

        if (maskSilhouette || !wrapInteractiveLayer) {
          return <React.Fragment key={layer.id}>{wrappedNode}</React.Fragment>;
        }

        return (
          <React.Fragment key={layer.id}>
            {wrapInteractiveLayer(layer, wrappedNode, { isKnockoutCutter: false })}
          </React.Fragment>
        );
      });

    const needsArtworkSilhouette =
      texActive && texPattern !== null && texMode === 'overlay';

    return (
      <>
        {(cuttersByTargetId.size > 0 || (texActive && texPattern)) && (
          <defs>
            {/* Knockout Cutout Masks for Target Layers */}
            {Array.from(cuttersByTargetId.entries()).map(([targetId, cutters]) => (
              <React.Fragment key={`komask-${targetId}`}>
                <mask
                  id={`${idPrefix}-ko-${targetId}`}
                  maskUnits="userSpaceOnUse"
                  x={-maskPad}
                  y={-maskPad}
                  width={doc.width + maskPad * 2}
                  height={doc.height + maskPad * 2}
                >
                  <rect
                    x={-maskPad}
                    y={-maskPad}
                    width={doc.width + maskPad * 2}
                    height={doc.height + maskPad * 2}
                    fill="#ffffff"
                  />
                  {cutters.map((cutter) => (
                    <CanvasLayerNode
                      key={`cutter-${cutter.id}`}
                      layer={cutter}
                      docBg="#ffffff"
                      idPrefix={`${idPrefix}-ko-${targetId}`}
                      allLayers={doc.layers}
                      forceMaskFill="#000000"
                    />
                  ))}
                </mask>
                {needsArtworkSilhouette && (
                  <mask
                    id={`${idPrefix}-ko-${targetId}-sil`}
                    maskUnits="userSpaceOnUse"
                    x={-maskPad}
                    y={-maskPad}
                    width={doc.width + maskPad * 2}
                    height={doc.height + maskPad * 2}
                  >
                    <rect
                      x={-maskPad}
                      y={-maskPad}
                      width={doc.width + maskPad * 2}
                      height={doc.height + maskPad * 2}
                      fill="#ffffff"
                    />
                    {cutters.map((cutter) => (
                      <CanvasLayerNode
                        key={`cutter-sil-${cutter.id}`}
                        layer={cutter}
                        docBg="#ffffff"
                        idPrefix={`${idPrefix}-ko-${targetId}-sil`}
                        allLayers={doc.layers}
                        forceMaskFill="#000000"
                      />
                    ))}
                  </mask>
                )}
              </React.Fragment>
            ))}

            {/* Finish & Texture Pattern + Masks */}
            {texActive && texPattern && (
              <>
                <pattern
                  id={texPatId}
                  width={texPattern.tileW}
                  height={texPattern.tileH}
                  patternUnits="userSpaceOnUse"
                  patternTransform={`rotate(${texAngle}) scale(${texScale})`}
                >
                  {texPattern.elements}
                </pattern>

                {tex?.preset === 'brushed-metal' && texMode !== 'distress' && (
                  <linearGradient
                    id={sheenGradId}
                    gradientUnits="userSpaceOnUse"
                    x1="0"
                    y1="0"
                    x2={doc.width}
                    y2={doc.height * 0.72}
                  >
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.34 * texIntensity} />
                    <stop offset="28%" stopColor="#0F172A" stopOpacity={0.14 * texIntensity} />
                    <stop offset="52%" stopColor="#FFFFFF" stopOpacity={0.44 * texIntensity} />
                    <stop offset="76%" stopColor="#0F172A" stopOpacity={0.18 * texIntensity} />
                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.3 * texIntensity} />
                  </linearGradient>
                )}

                {texMode === 'distress' && (
                  <mask
                    id={texMaskId}
                    maskUnits="userSpaceOnUse"
                    x={-maskPad}
                    y={-maskPad}
                    width={doc.width + maskPad * 2}
                    height={doc.height + maskPad * 2}
                  >
                    <rect
                      x={-maskPad}
                      y={-maskPad}
                      width={doc.width + maskPad * 2}
                      height={doc.height + maskPad * 2}
                      fill={texInverted ? '#262626' : '#ffffff'}
                    />
                    <rect
                      x={-maskPad}
                      y={-maskPad}
                      width={doc.width + maskPad * 2}
                      height={doc.height + maskPad * 2}
                      fill={`url(#${texPatId})`}
                    />
                  </mask>
                )}

                {needsArtworkSilhouette && (
                  <mask
                    id={artSilMaskId}
                    maskUnits="userSpaceOnUse"
                    x={-maskPad}
                    y={-maskPad}
                    width={doc.width + maskPad * 2}
                    height={doc.height + maskPad * 2}
                  >
                    <rect
                      x={-maskPad}
                      y={-maskPad}
                      width={doc.width + maskPad * 2}
                      height={doc.height + maskPad * 2}
                      fill="#000000"
                    />
                    {renderBaseLayers('#ffffff')}
                  </mask>
                )}
              </>
            )}
          </defs>
        )}

        <g
          data-artwork-root="true"
          mask={texActive && texPattern && texMode === 'distress' ? `url(#${texMaskId})` : undefined}
        >
          {renderBaseLayers()}
        </g>

        {texActive && texPattern && texMode === 'overlay' && (
          <g
            data-texture-overlay="true"
            pointerEvents="none"
            mask={`url(#${artSilMaskId})`}
            style={{
              mixBlendMode: tex?.preset === 'brushed-metal' ? 'soft-light' : 'overlay',
            }}
          >
            {tex?.preset === 'brushed-metal' && (
              <rect
                x={0}
                y={0}
                width={doc.width}
                height={doc.height}
                fill={`url(#${sheenGradId})`}
              />
            )}
            <rect
              x={0}
              y={0}
              width={doc.width}
              height={doc.height}
              fill={`url(#${texPatId})`}
            />
          </g>
        )}

        {texActive && texPattern && texMode === 'canvas' && (
          <g
            data-texture-overlay="true"
            pointerEvents="none"
            style={{
              mixBlendMode: tex?.preset === 'brushed-metal' ? 'soft-light' : 'multiply',
            }}
          >
            {tex?.preset === 'brushed-metal' && (
              <rect
                x={0}
                y={0}
                width={doc.width}
                height={doc.height}
                fill={`url(#${sheenGradId})`}
              />
            )}
            <rect
              x={0}
              y={0}
              width={doc.width}
              height={doc.height}
              fill={`url(#${texPatId})`}
            />
          </g>
        )}
      </>
    );
  }
);

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
      style={{ isolation: 'isolate' }}
    >
      {bg !== 'transparent' && (
        <rect x={0} y={0} width={doc.width} height={doc.height} fill={bg} />
      )}
      <LogoSceneLayers doc={doc} docBg={bg} idPrefix={idPrefix} />
    </svg>
  );
});
