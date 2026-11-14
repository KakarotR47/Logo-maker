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

export function buildShapePath(kind: ShapeKind, w: number, h: number, cornerRadius = 18): string {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;

  switch (kind) {
    case 'circle':
    case 'ring':
      return `M ${cx} 2 A ${rx - 2} ${ry - 2} 0 1 0 ${cx} ${h - 2} A ${rx - 2} ${ry - 2} 0 1 0 ${cx} 2 Z`;
    case 'rounded-rect': {
      const r = Math.min(cornerRadius, w / 2, h / 2);
      return `M ${r} 2 H ${w - r} A ${r} ${r} 0 0 1 ${w - 2} ${r} V ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h - 2} H ${r} A ${r} ${r} 0 0 1 2 ${h - r} V ${r} A ${r} ${r} 0 0 1 ${r} 2 Z`;
    }
    case 'pill': {
      const r = Math.min(w, h) / 2 - 2;
      return `M ${r + 2} 2 H ${w - r - 2} A ${r} ${r} 0 0 1 ${w - r - 2} ${h - 2} H ${r + 2} A ${r} ${r} 0 0 1 ${r + 2} 2 Z`;
    }
    case 'hexagon': {
      const pts = [
        [cx, 2],
        [w - 4, h * 0.25],
        [w - 4, h * 0.75],
        [cx, h - 2],
        [4, h * 0.75],
        [4, h * 0.25],
      ];
      return `M ${pts.map((p) => p.join(' ')).join(' L ')} Z`;
    }
    case 'octagon': {
      const ox = w * 0.29;
      const oy = h * 0.29;
      const pts = [
        [ox, 2],
        [w - ox, 2],
        [w - 2, oy],
        [w - 2, h - oy],
        [w - ox, h - 2],
        [ox, h - 2],
        [2, h - oy],
        [2, oy],
      ];
      return `M ${pts.map((p) => p.join(' ')).join(' L ')} Z`;
    }
    case 'shield':
      return `M ${cx} 2 L ${w - 4} ${h * 0.16} V ${h * 0.52} C ${w - 4} ${h * 0.78}, ${w * 0.72} ${h * 0.9}, ${cx} ${h - 2} C ${w * 0.28} ${h * 0.9}, 4 ${h * 0.78}, 4 ${h * 0.52} V ${h * 0.16} Z`;
    case 'diamond':
      return `M ${cx} 2 L ${w - 2} ${cy} L ${cx} ${h - 2} L 2 ${cy} Z`;
    case 'triangle':
      return `M ${cx} 4 L ${w - 4} ${h - 4} L 4 ${h - 4} Z`;
    case 'star': {
      const pts: string[] = [];
      for (let i = 0; i < 16; i++) {
        const angle = (i * Math.PI) / 8 - Math.PI / 2;
        const radX = i % 2 === 0 ? rx - 2 : (rx - 2) * 0.45;
        const radY = i % 2 === 0 ? ry - 2 : (ry - 2) * 0.45;
        pts.push(`${(cx + Math.cos(angle) * radX).toFixed(1)} ${(cy + Math.sin(angle) * radY).toFixed(1)}`);
      }
      return `M ${pts.join(' L ')} Z`;
    }
    case 'arch': {
      const archR = Math.min(w / 2 - 2, h * 0.48);
      return `M 2 ${h - 2} V ${archR + 2} A ${w / 2 - 2} ${archR} 0 0 1 ${w - 2} ${archR + 2} V ${h - 2} Z`;
    }
    case 'frame':
      return `M 4 4 H ${w - 4} V ${h - 4} H 4 Z`;
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
      return `M ${cx} 2 L ${w - 4} ${h * 0.14} V ${h * 0.5} C ${w - 4} ${h * 0.78}, ${w * 0.72} ${h * 0.91}, ${cx} ${h - 2} C ${w * 0.28} ${h * 0.91}, 4 ${h * 0.78}, 4 ${h * 0.5} V ${h * 0.14} Z`;
    case 'ribbon-banner':
      return `M 4 ${h * 0.18} H ${w - 4} L ${w - 18} ${cy} L ${w - 4} ${h * 0.82} H 4 L 18 ${cy} Z`;
    case 'parallelogram':
      return `M ${w * 0.16} 4 H ${w - 4} L ${w * 0.84} ${h - 4} H 4 Z`;
  }
}

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

export function buildCurvedArcPath(
  layer: TextLayer
): { d: string; startOffset: string; textAnchor: 'start' | 'middle' | 'end' } {
  const R = Math.max(28, Math.abs(layer.curveRadius));
  const cx = layer.width / 2;
  const isConvex = layer.curveRadius > 0;

  // Allow wrapping up to ~305 degrees around circular badges & seals
  const halfSpanAngle = Math.min(Math.PI * 0.85, Math.max(0.45, (layer.width * 0.46) / R));
  const largeArcFlag = halfSpanAngle * 2 > Math.PI ? 1 : 0;

  if (isConvex) {
    // Keep top apex cleanly anchored inside text layer bounds
    const apexY = Math.max(layer.fontSize * 0.9, layer.height * 0.42);
    const cy = apexY + R;
    const x1 = cx - Math.sin(halfSpanAngle) * R;
    const y1 = cy - Math.cos(halfSpanAngle) * R;
    const x2 = cx + Math.sin(halfSpanAngle) * R;
    const y2 = cy - Math.cos(halfSpanAngle) * R;
    return {
      d: `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 ${largeArcFlag} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`,
      startOffset: '50%',
      textAnchor: 'middle',
    };
  }

  // Concave smile arc: anchor bottom apex cleanly inside bounds
  const bottomApexY = Math.min(layer.height - layer.fontSize * 0.3, layer.height * 0.65);
  const cy = bottomApexY - R;
  const x1 = cx - Math.sin(halfSpanAngle) * R;
  const y1 = cy + Math.cos(halfSpanAngle) * R;
  const x2 = cx + Math.sin(halfSpanAngle) * R;
  const y2 = cy + Math.cos(halfSpanAngle) * R;
  return {
    d: `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 ${largeArcFlag} 0 ${x2.toFixed(1)} ${y2.toFixed(1)}`,
    startOffset: '50%',
    textAnchor: 'middle',
  };
}

function getLayerFillProps(layer: LogoLayer, idPrefix: string): {
  fillAttr: string;
  gradientDef: React.ReactNode;
} {
  const grad = layer.fillGradient;
  if (!grad?.enabled) {
    return { fillAttr: layer.fill, gradientDef: null };
  }

  const gradId = `${idPrefix}-grad-${layer.id}`;
  if (grad.type === 'radial') {
    return {
      fillAttr: `url(#${gradId})`,
      gradientDef: (
        <radialGradient id={gradId} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={grad.startColor} />
          {grad.midColor && <stop offset="50%" stopColor={grad.midColor} />}
          <stop offset="100%" stopColor={grad.endColor} />
        </radialGradient>
      ),
    };
  }

  const rad = ((grad.angle ?? 90) * Math.PI) / 180;
  const x1 = 50 - Math.cos(rad) * 50;
  const y1 = 50 - Math.sin(rad) * 50;
  const x2 = 50 + Math.cos(rad) * 50;
  const y2 = 50 + Math.sin(rad) * 50;

  return {
    fillAttr: `url(#${gradId})`,
    gradientDef: (
      <linearGradient
        id={gradId}
        x1={`${x1.toFixed(1)}%`}
        y1={`${y1.toFixed(1)}%`}
        x2={`${x2.toFixed(1)}%`}
        y2={`${y2.toFixed(1)}%`}
      >
        <stop offset="0%" stopColor={grad.startColor} />
        {grad.midColor && <stop offset="50%" stopColor={grad.midColor} />}
        <stop offset="100%" stopColor={grad.endColor} />
      </linearGradient>
    ),
  };
}

interface RenderLayerProps {
  layer: LogoLayer;
  docBg: string;
  idPrefix: string;
}

export const CanvasLayerNode: React.FC<RenderLayerProps> = ({ layer, docBg, idPrefix }) => {
  if (!layer.visible) return null;

  const cx = layer.x + layer.width / 2;
  const cy = layer.y + layer.height / 2;
  const transform = `translate(${layer.x}, ${layer.y})${
    layer.rotation ? ` rotate(${layer.rotation}, ${layer.width / 2}, ${layer.height / 2})` : ''
  }`;
  const filterId = `${idPrefix}-sh-${layer.id}`;
  const { fillAttr, gradientDef } = getLayerFillProps(layer, idPrefix);

  const renderContent = () => {
    switch (layer.type) {
      case 'icon':
        return renderIcon(layer, docBg, fillAttr);
      case 'shape':
        return renderShape(layer, fillAttr);
      case 'divider':
        return renderDivider(layer, fillAttr);
      case 'text':
        return renderText(layer, `${idPrefix}-arc-${layer.id}`, fillAttr);
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
      {(layer.shadow.enabled || gradientDef) && (
        <defs>
          {gradientDef}
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
      <rect x={0} y={0} width={layer.width} height={layer.height} fill="transparent" />
      {renderContent()}
      <title data-cx={cx} data-cy={cy}>{layer.name}</title>
    </g>
  );
};

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

  return (
    <>
      <path d={d} fill={fillVal} stroke={strokeVal} strokeWidth={strokeW} strokeLinejoin="round" />
      {layer.shapeKind === 'frame' && layer.width > 24 && layer.height > 24 && (
        <rect
          x={11}
          y={11}
          width={layer.width - 22}
          height={layer.height - 22}
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

function renderText(layer: TextLayer, arcPathId: string, fillAttr: string) {
  const raw = layer.uppercase ? layer.text.toUpperCase() : layer.text;
  const lines = raw.split(/\r?\n/);

  if (Math.abs(layer.curveRadius) >= 20) {
    const arc = buildCurvedArcPath(layer);
    return (
      <>
        <defs>
          <path id={arcPathId} d={arc.d} fill="none" />
        </defs>
        <text
          fill={fillAttr}
          stroke={layer.strokeWidth > 0 ? layer.stroke : 'none'}
          strokeWidth={layer.strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          paintOrder="stroke fill"
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
      </>
    );
  }

  const anchor: 'start' | 'middle' | 'end' =
    layer.textAlign === 'left' ? 'start' : layer.textAlign === 'right' ? 'end' : 'middle';
  const xPos =
    layer.textAlign === 'left' ? 4 : layer.textAlign === 'right' ? layer.width - 4 : layer.width / 2;
  const totalTextHeight = lines.length * layer.fontSize * layer.lineHeight;
  const firstY = Math.max(layer.fontSize * 0.85, (layer.height - totalTextHeight) / 2 + layer.fontSize * 0.82);

  return (
    <text
      x={xPos}
      y={firstY}
      textAnchor={anchor}
      fill={fillAttr}
      stroke={layer.strokeWidth > 0 ? layer.stroke : 'none'}
      strokeWidth={layer.strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
      paintOrder="stroke fill"
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
}

function renderPathLayer(layer: PathLayer, fillAttr: string) {
  const sx = layer.width / Math.max(1, layer.sourceViewBox.width);
  const sy = layer.height / Math.max(1, layer.sourceViewBox.height);
  return (
    <g transform={`scale(${sx}, ${sy})`}>
      {layer.pathDataList.map((d, idx) => (
        <path
          key={idx}
          d={d}
          fill={fillAttr}
          stroke={layer.strokeWidth > 0 ? layer.stroke : 'none'}
          strokeWidth={layer.strokeWidth > 0 ? layer.strokeWidth / Math.max(0.3, sx) : 0}
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

export const LogoDocumentSvg: React.FC<DocumentSvgProps> = ({
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
        />
      ))}
    </svg>
  );
};
