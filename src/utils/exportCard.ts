import QRCode from 'qrcode';
import {
  CardBorderStyle,
  CardDesignId,
  CardDetails,
  CardMagicConfig,
  CardSymbolsConfig,
  CardTheme,
  CardTypographyMap,
  CraftSymbolId,
  CrestCenterIconId,
  CrestCenterMode,
  CrestFinishMode,
  CrestRimBorderId,
  CrestStyleId,
  TextElementStyle,
} from '../types/card';
import { getFontCanvas } from '../data/cardPresets';

const CARD_WIDTH = 2100; // 3.5 in @ 600 DPI
const CARD_HEIGHT = 1200; // 2.0 in @ 600 DPI

function splitBrandName(full: string): { main: string; role: string } {
  const idx = full.toLowerCase().indexOf('stamp vendor');
  if (idx > 0) {
    return {
      main: full.slice(0, idx).trim(),
      role: full.slice(idx).trim(),
    };
  }
  return { main: full, role: 'Stamp Vendor' };
}

function buildCanvasFont(
  slot: TextElementStyle,
  basePx: number,
  weight: number | string = 600
): string {
  const size = Math.round(basePx * slot.scale);
  const style = slot.italic ? 'italic ' : '';
  return `${style}${weight} ${size}px ${getFontCanvas(slot.fontId)}`;
}

function formatSlotText(text: string, slot: TextElementStyle): string {
  return slot.uppercase ? text.toUpperCase() : text;
}

function drawStyledText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  slot: TextElementStyle,
  basePx: number,
  weight: number | string,
  fallbackColor: string,
  theme: CardTheme
) {
  ctx.save();
  ctx.font = buildCanvasFont(slot, basePx, weight);
  const resolvedColor = slot.colorOverride?.trim() ? slot.colorOverride.trim() : fallbackColor;
  const formatted = formatSlotText(text, slot);

  if (slot.textEffect === 'foil-gradient') {
    const grad = ctx.createLinearGradient(x - 160, y - 30, x + 360, y + basePx);
    if (slot.colorOverride?.trim()) {
      grad.addColorStop(0, resolvedColor);
      grad.addColorStop(0.5, '#FFFFFF');
      grad.addColorStop(1, resolvedColor);
    } else {
      grad.addColorStop(0, theme.accentMutedHex);
      grad.addColorStop(0.48, theme.accentHighlightHex);
      grad.addColorStop(1, theme.accentHex);
    }
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = resolvedColor;
  }

  if (slot.textEffect === 'embossed') {
    ctx.shadowColor = theme.isDark ? 'rgba(0,0,0,0.88)' : 'rgba(255,255,255,0.92)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 3;
  } else if (slot.textEffect === 'glow') {
    ctx.shadowColor = resolvedColor;
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 0;
  }

  ctx.fillText(formatted, x, y);
  ctx.restore();
}

function drawBackgroundPattern(
  ctx: CanvasRenderingContext2D,
  designId: CardDesignId,
  magic: CardMagicConfig,
  color: string
) {
  const effectivePattern =
    magic.pattern === 'auto'
      ? designId === 'sovereign-stamp' ||
        designId === 'treasury-guilloche' ||
        designId === 'mughal-arch' ||
        designId === 'mughal-darbar' ||
        designId === 'crescent-guild'
        ? 'guilloche'
        : designId === 'vault-microgrid' || designId === 'sovereign-blackcard'
        ? 'microgrid'
        : 'none'
      : magic.pattern;

  const alpha = magic.patternOpacity / 100;
  if (effectivePattern === 'none' || alpha <= 0) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;

  if (effectivePattern === 'guilloche') {
    ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
      const offset = i * 72;
      ctx.beginPath();
      ctx.moveTo(780 + offset * 0.8, -120);
      ctx.quadraticCurveTo(1350 + offset * 0.4, 600, 630 + offset * 0.9, 1320);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(540 + offset * 1.1, 1260);
      ctx.quadraticCurveTo(1440, 540 - offset * 0.3, 2220, 120 + offset * 0.9);
      ctx.stroke();
    }
  } else if (effectivePattern === 'concentric') {
    ctx.lineWidth = 2;
    for (let r = 180; r <= 1080; r += 150) {
      ctx.beginPath();
      ctx.arc(CARD_WIDTH * 0.88, CARD_HEIGHT * 0.5, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (effectivePattern === 'diamond-lattice') {
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = alpha * 0.7;
    const step = 66;
    for (let x = -CARD_HEIGHT; x < CARD_WIDTH + CARD_HEIGHT; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + CARD_HEIGHT, CARD_HEIGHT);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, CARD_HEIGHT);
      ctx.lineTo(x + CARD_HEIGHT, 0);
      ctx.stroke();
    }
  } else {
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = alpha * 0.65;
    const step = 78;
    for (let x = 0; x <= CARD_WIDTH; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CARD_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CARD_HEIGHT; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CARD_WIDTH, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawCraftSymbolOnCanvas(
  ctx: CanvasRenderingContext2D,
  symbol: CraftSymbolId,
  cx: number,
  cy: number,
  inkColor: string,
  goldColor: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = inkColor;
  ctx.lineWidth = 3;

  switch (symbol) {
    case 'stamp-paper':
      ctx.strokeRect(-21, -24, 42, 54);
      ctx.strokeStyle = goldColor;
      ctx.beginPath();
      ctx.arc(0, 8, 9, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'round-seal':
      ctx.beginPath();
      ctx.arc(0, 3, 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.save();
      ctx.strokeStyle = goldColor;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(0, 3, 19, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      break;
    case 'fountain-pen':
      ctx.rotate((22 * Math.PI) / 180);
      ctx.fillStyle = goldColor;
      ctx.fillRect(-10, -24, 20, 42);
      ctx.strokeRect(-10, -24, 20, 42);
      ctx.fillStyle = inkColor;
      ctx.beginPath();
      ctx.moveTo(-10, 18);
      ctx.lineTo(10, 18);
      ctx.lineTo(0, 34);
      ctx.closePath();
      ctx.fill();
      break;
    case 'scales':
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.lineTo(0, 24);
      ctx.moveTo(-14, 24);
      ctx.lineTo(14, 24);
      ctx.stroke();
      ctx.strokeStyle = goldColor;
      ctx.beginPath();
      ctx.moveTo(-22, -12);
      ctx.lineTo(22, -12);
      ctx.stroke();
      break;
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.lineTo(24, 0);
      ctx.lineTo(0, 24);
      ctx.lineTo(-24, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = goldColor;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(12, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-12, 0);
      ctx.closePath();
      ctx.fill();
      break;
    default:
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = goldColor;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

function drawBorderOverlay(
  ctx: CanvasRenderingContext2D,
  borderStyle: CardBorderStyle,
  theme: CardTheme,
  shimmer = true
) {
  if (borderStyle === 'clean-edge') return;
  const foilColor = shimmer ? theme.accentHighlightHex : theme.accentHex;

  if (borderStyle === 'double-hairline') {
    ctx.save();
    ctx.strokeStyle = theme.borderHex;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(40, 40, CARD_WIDTH - 80, CARD_HEIGHT - 80, 22);
    ctx.stroke();

    ctx.strokeStyle = foilColor;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(60, 60, CARD_WIDTH - 120, CARD_HEIGHT - 120, 16);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (borderStyle === 'security-dashed') {
    ctx.save();
    ctx.strokeStyle = foilColor;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(40, 40, CARD_WIDTH - 80, CARD_HEIGHT - 80, 20);
    ctx.stroke();

    ctx.strokeStyle = theme.accentHex;
    ctx.globalAlpha = 0.52;
    ctx.lineWidth = 2.4;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.roundRect(64, 64, CARD_WIDTH - 128, CARD_HEIGHT - 128, 14);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (borderStyle === 'solid-foil-band') {
    ctx.save();
    ctx.strokeStyle = foilColor;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.roundRect(36, 36, CARD_WIDTH - 72, CARD_HEIGHT - 72, 22);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (borderStyle === 'beveled-triple') {
    ctx.save();
    ctx.strokeStyle = theme.borderHex;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(32, 32, CARD_WIDTH - 64, CARD_HEIGHT - 64, 24);
    ctx.stroke();

    ctx.strokeStyle = foilColor;
    ctx.globalAlpha = 0.82;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(48, 48, CARD_WIDTH - 96, CARD_HEIGHT - 96, 18);
    ctx.stroke();

    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(66, 66, CARD_WIDTH - 132, CARD_HEIGHT - 132, 12);
    ctx.stroke();

    ctx.fillStyle = foilColor;
    ctx.globalAlpha = 1;
    const pts = [
      [56, 56],
      [CARD_WIDTH - 56, 56],
      [56, CARD_HEIGHT - 56],
      [CARD_WIDTH - 56, CARD_HEIGHT - 56],
    ];
    for (const [px, py] of pts) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-10, -10, 20, 20);
      ctx.restore();
    }
    ctx.restore();
    return;
  }

  if (borderStyle === 'mughal-arabesque') {
    ctx.save();
    ctx.strokeStyle = foilColor;
    ctx.globalAlpha = 0.78;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(40, 40, CARD_WIDTH - 80, CARD_HEIGHT - 80, 22);
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = theme.accentHex;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 9]);
    ctx.beginPath();
    ctx.roundRect(62, 62, CARD_WIDTH - 124, CARD_HEIGHT - 124, 14);
    ctx.stroke();
    ctx.restore();

    const corners = [
      { x: 34, y: 34, dx: 1, dy: 1 },
      { x: CARD_WIDTH - 34, y: 34, dx: -1, dy: 1 },
      { x: 34, y: CARD_HEIGHT - 34, dx: 1, dy: -1 },
      { x: CARD_WIDTH - 34, y: CARD_HEIGHT - 34, dx: -1, dy: -1 },
    ];
    for (const c of corners) {
      ctx.strokeStyle = foilColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y + c.dy * 90);
      ctx.quadraticCurveTo(c.x, c.y, c.x + c.dx * 90, c.y);
      ctx.stroke();

      ctx.fillStyle = foilColor;
      ctx.beginPath();
      ctx.arc(c.x + c.dx * 16, c.y + c.dy * 16, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (borderStyle === 'art-deco-stepped') {
    ctx.save();
    ctx.strokeStyle = theme.borderHex;
    ctx.lineWidth = 3;
    ctx.strokeRect(48, 48, CARD_WIDTH - 96, CARD_HEIGHT - 96);

    const corners = [
      { x: 34, y: 34, dx: 1, dy: 1 },
      { x: CARD_WIDTH - 34, y: 34, dx: -1, dy: 1 },
      { x: 34, y: CARD_HEIGHT - 34, dx: 1, dy: -1 },
      { x: CARD_WIDTH - 34, y: CARD_HEIGHT - 34, dx: -1, dy: -1 },
    ];
    for (const c of corners) {
      ctx.strokeStyle = foilColor;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y + c.dy * 72);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(c.x + c.dx * 72, c.y);
      ctx.stroke();

      ctx.fillStyle = foilColor;
      ctx.fillRect(c.dx > 0 ? c.x : c.x - 16, c.dy > 0 ? c.y : c.y - 16, 16, 16);
    }
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.strokeStyle = theme.borderHex;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(40, 40, CARD_WIDTH - 80, CARD_HEIGHT - 80, 22);
  ctx.stroke();

  const cPad = 58;
  const arm = 42;
  const innerOffset = 14;
  ctx.strokeStyle = foilColor;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 3.5;

  const corners = [
    { x: cPad, y: cPad, dx: 1, dy: 1 },
    { x: CARD_WIDTH - cPad, y: cPad, dx: -1, dy: 1 },
    { x: cPad, y: CARD_HEIGHT - cPad, dx: 1, dy: -1 },
    { x: CARD_WIDTH - cPad, y: CARD_HEIGHT - cPad, dx: -1, dy: -1 },
  ];

  for (const c of corners) {
    ctx.beginPath();
    ctx.moveTo(c.x, c.y + c.dy * arm);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(c.x + c.dx * arm, c.y);
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c.x + c.dx * innerOffset, c.y + c.dy * arm);
    ctx.lineTo(c.x + c.dx * innerOffset, c.y + c.dy * innerOffset);
    ctx.lineTo(c.x + c.dx * arm, c.y + c.dy * innerOffset);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawPostageStampEmblem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  goldColor: string,
  paperColor: string,
  inkColor: string,
  monogram: string,
  brandSub: string,
  displayFont: string,
  stampIcons: [CraftSymbolId, CraftSymbolId, CraftSymbolId]
) {
  ctx.save();
  ctx.translate(x, y);

  ctx.shadowColor = 'rgba(0,0,0,0.38)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 14;

  ctx.fillStyle = goldColor;
  ctx.fillRect(0, 0, w, h);
  ctx.shadowColor = 'transparent';

  const r = w * 0.022;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const cols = 11;
  const rows = 13;
  for (let i = 0; i < cols; i++) {
    const px = w * 0.06 + (i * (w * 0.88)) / (cols - 1);
    ctx.beginPath();
    ctx.arc(px, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, h, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let j = 0; j < rows; j++) {
    const py = h * 0.06 + (j * (h * 0.88)) / (rows - 1);
    ctx.beginPath();
    ctx.arc(0, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const pad = w * 0.06;
  ctx.fillStyle = paperColor;
  ctx.fillRect(pad, pad, w - pad * 2, h - pad * 2);

  ctx.strokeStyle = inkColor;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 2.4;
  ctx.strokeRect(pad + 14, pad + 14, w - (pad + 14) * 2, h - (pad + 14) * 2);

  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([6, 6]);
  ctx.strokeRect(pad + 26, pad + 26, w - (pad + 26) * 2, h - (pad + 26) * 2);
  ctx.restore();

  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const firstChar = monogram.slice(0, 1) || 'S';
  const secondChar = monogram.slice(1, 2) || 'A';

  ctx.fillStyle = inkColor;
  ctx.font = `800 ${Math.round(w * 0.38)}px ${displayFont}`;
  ctx.fillText(firstChar, w * 0.38, h * 0.36);

  ctx.strokeStyle = goldColor;
  ctx.lineWidth = 6;
  ctx.font = `700 ${Math.round(w * 0.37)}px ${displayFont}`;
  ctx.strokeText(secondChar, w * 0.62, h * 0.38);

  ctx.strokeStyle = goldColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.16, h * 0.6);
  ctx.lineTo(w * 0.27, h * 0.6);
  ctx.moveTo(w * 0.73, h * 0.6);
  ctx.lineTo(w * 0.84, h * 0.6);
  ctx.stroke();

  ctx.fillStyle = inkColor;
  ctx.font = `600 ${Math.round(w * 0.048)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(brandSub.slice(0, 14).toUpperCase(), w * 0.5, h * 0.6);

  const iconY = h * 0.74;
  drawCraftSymbolOnCanvas(ctx, stampIcons[0], w * 0.29, iconY, inkColor, goldColor);
  drawCraftSymbolOnCanvas(ctx, stampIcons[1], w * 0.5, iconY, inkColor, goldColor);
  drawCraftSymbolOnCanvas(ctx, stampIcons[2], w * 0.71, iconY, inkColor, goldColor);

  ctx.restore();
}

function drawSculptedCenterIconOnCanvas(
  ctx: CanvasRenderingContext2D,
  iconId: CrestCenterIconId,
  color: string | CanvasGradient,
  highlight: string
) {
  // Assumes 40x40 local space centered at (20, 20)
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  if (iconId === 'scales') {
    ctx.beginPath();
    ctx.roundRect(18.6, 6, 2.8, 26, 1.2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10, 32.5);
    ctx.lineTo(30, 32.5);
    ctx.lineTo(28, 35.5);
    ctx.lineTo(12, 35.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(6, 10.5, 28, 2.6, 1.3);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(20, 6.5, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = highlight;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(8.5, 13);
    ctx.lineTo(4.5, 23.5);
    ctx.lineTo(12.5, 23.5);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(8.5, 23.5, 4.3, 0, Math.PI);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(31.5, 13);
    ctx.lineTo(27.5, 23.5);
    ctx.lineTo(35.5, 23.5);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(31.5, 23.5, 4.3, 0, Math.PI);
    ctx.fill();
  } else if (iconId === 'crown') {
    ctx.beginPath();
    ctx.moveTo(5.5, 27.5);
    ctx.lineTo(4, 13);
    ctx.lineTo(12.5, 19.5);
    ctx.lineTo(20, 7.5);
    ctx.lineTo(27.5, 19.5);
    ctx.lineTo(36, 13);
    ctx.lineTo(34.5, 27.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(5.5, 29.5, 29, 4, 1.5);
    ctx.fill();
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.arc(20, 7, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (iconId === 'stamp-press') {
    ctx.beginPath();
    ctx.arc(20, 9.5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(17, 13.5);
    ctx.lineTo(23, 13.5);
    ctx.lineTo(22, 22.5);
    ctx.lineTo(18, 22.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(7, 22.5, 26, 5, 1.8);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(5, 28.5, 30, 4.5, 1.2);
    ctx.fill();
  } else if (iconId === 'fountain-nib') {
    ctx.beginPath();
    ctx.moveTo(20, 4.5);
    ctx.lineTo(30.5, 21.5);
    ctx.lineTo(26.2, 31);
    ctx.lineTo(13.8, 31);
    ctx.lineTo(9.5, 21.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = highlight;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(20, 5);
    ctx.lineTo(20, 19.5);
    ctx.stroke();
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.arc(20, 21.5, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(12.5, 32.2, 15, 3.8, 1.2);
    ctx.fill();
  } else if (iconId === 'shield-star') {
    ctx.beginPath();
    ctx.moveTo(8, 7);
    ctx.lineTo(32, 7);
    ctx.lineTo(32, 20);
    ctx.quadraticCurveTo(32, 30, 20, 36);
    ctx.quadraticCurveTo(8, 30, 8, 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = highlight;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 7.5 : 3.2;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = 20 + Math.cos(a) * r;
      const py = 20 + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else if (iconId === 'diamond-gem') {
    ctx.beginPath();
    ctx.moveTo(11, 8);
    ctx.lineTo(29, 8);
    ctx.lineTo(36, 16.5);
    ctx.lineTo(20, 34.5);
    ctx.lineTo(4, 16.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = highlight;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(4, 16.5);
    ctx.lineTo(36, 16.5);
    ctx.stroke();
  } else if (iconId === 'pillar-court') {
    ctx.beginPath();
    ctx.moveTo(20, 5);
    ctx.lineTo(36, 13.5);
    ctx.lineTo(4, 13.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(6, 14.5, 28, 2.8);
    ctx.fillRect(9, 18.2, 3.8, 12.5);
    ctx.fillRect(18.1, 18.2, 3.8, 12.5);
    ctx.fillRect(27.2, 18.2, 3.8, 12.5);
    ctx.fillRect(5, 31.5, 30, 3.8);
  } else if (iconId === 'briefcase') {
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.roundRect(14, 6, 12, 6, 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(5, 11.5, 30, 22, 3);
    ctx.fill();
    ctx.fillStyle = highlight;
    ctx.fillRect(17, 18, 6, 5);
  } else if (iconId === 'shop-front') {
    ctx.beginPath();
    ctx.moveTo(6, 14);
    ctx.lineTo(9.5, 7);
    ctx.lineTo(30.5, 7);
    ctx.lineTo(34, 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(6, 15, 28, 3.2);
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 19, 24, 14.5);
    ctx.fillRect(16, 23, 8, 10.5);
    ctx.fillRect(5, 33.5, 30, 3);
  } else if (iconId === 'crescent-royal') {
    ctx.beginPath();
    ctx.arc(21, 20, 12.5, 0.5, Math.PI * 2 - 0.5);
    ctx.arc(25, 20, 9.5, Math.PI * 2 - 0.5, 0.5, true);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 5.5 : 2.3;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = 29 + Math.cos(a) * r;
      const py = 17 + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else if (iconId === 'lotus-crest') {
    ctx.beginPath();
    ctx.moveTo(20, 6);
    ctx.bezierCurveTo(24, 13, 24, 21, 20, 26);
    ctx.bezierCurveTo(16, 21, 16, 13, 20, 6);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12.5, 11);
    ctx.bezierCurveTo(17, 15, 18.5, 21, 17, 26.5);
    ctx.bezierCurveTo(12.5, 24, 10.5, 18, 12.5, 11);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(27.5, 11);
    ctx.bezierCurveTo(23, 15, 21.5, 21, 23, 26.5);
    ctx.bezierCurveTo(27.5, 24, 29.5, 18, 27.5, 11);
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(10, 31.5);
    ctx.quadraticCurveTo(20, 28, 30, 31.5);
    ctx.stroke();
  } else {
    // quill-scroll
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 7.5, 22, 25);
    ctx.beginPath();
    ctx.moveTo(11.5, 14);
    ctx.lineTo(23.5, 14);
    ctx.moveTo(11.5, 19);
    ctx.lineTo(23.5, 19);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(28.5, 27.5, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCurvedArcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  isTop: boolean,
  color: string | CanvasGradient
) {
  const clean = text.trim().toUpperCase().slice(0, 24);
  if (!clean) return;
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = '700 6.2px "Montserrat", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const stepAngle = 0.145;
  const totalSpan = (clean.length - 1) * stepAngle;
  for (let i = 0; i < clean.length; i++) {
    const offset = i * stepAngle - totalSpan / 2;
    const angle = isTop ? -Math.PI / 2 + offset : Math.PI / 2 - offset;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.rotate(isTop ? angle + Math.PI / 2 : angle - Math.PI / 2);
    ctx.fillText(clean[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

function drawDynamicCrestOnCanvas(
  ctx: CanvasRenderingContext2D,
  crestStyle: CrestStyleId,
  designDefault: Exclude<CrestStyleId, 'auto' | 'none'>,
  cx: number,
  cy: number,
  radius: number,
  accentColor: string,
  mutedColor: string,
  monogram: string,
  displayFont: string,
  highlightColor = '#FFF3C4',
  foilGradient = true,
  symbols?: CardSymbolsConfig,
  coreBgHex = '#0E1914',
  customLogoImg?: HTMLImageElement | null,
  isWatermark = false
) {
  const effective = crestStyle === 'auto' ? designDefault : crestStyle;
  if (effective === 'none') return;

  const finish: CrestFinishMode = isWatermark
    ? 'fine-engraved'
    : symbols?.crestFinish ?? '3d-embossed-coin';
  const centerMode: CrestCenterMode = symbols?.crestCenterMode ?? 'icon-monogram';
  const centerIcon: CrestCenterIconId = symbols?.crestCenterIcon ?? 'scales';
  const rimBorder: CrestRimBorderId = symbols?.crestRimBorder ?? 'double-bevel';
  const weight = symbols?.crestStrokeWeight ?? 1.6;
  const ringTop = symbols?.crestRingTextTop ?? '';
  const ringBottom = symbols?.crestRingTextBottom ?? '';

  const isSolidFill = finish === 'solid-foil';
  const isEmbossedCoin = finish === '3d-embossed-coin';
  const isEnamelInlay = finish === 'enamel-inlay';

  ctx.save();
  ctx.translate(cx, cy);
  const scale = radius / 60;
  ctx.scale(scale, scale);

  let inkStyle: string | CanvasGradient = accentColor;
  if (foilGradient) {
    const grad = ctx.createLinearGradient(-52, -52, 52, 52);
    grad.addColorStop(0, mutedColor || accentColor);
    grad.addColorStop(0.35, highlightColor);
    grad.addColorStop(0.65, accentColor);
    grad.addColorStop(1, mutedColor || accentColor);
    inkStyle = grad;
  }

  if (!isWatermark) {
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
  }

  ctx.strokeStyle = inkStyle;
  ctx.fillStyle = inkStyle;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const drawStar5 = (sx: number, sy: number, rOuter: number, rInner: number) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = sx + Math.cos(a) * r;
      const py = sy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  };

  // Layer 1: Outer Luxury Frame Silhouette (centered in -60..60 coordinate box)
  const sw = 1.6 * weight;
  ctx.lineWidth = sw;
  const frameFillAlpha = isWatermark ? 0 : isSolidFill ? 0.95 : 0.22;

  const paintFrame = () => {
    if (frameFillAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = frameFillAlpha;
      ctx.fillStyle = isSolidFill ? inkStyle : accentColor;
      ctx.fill();
      ctx.restore();
    }
    ctx.stroke();
  };

  if (effective === 'wax-seal') {
    ctx.beginPath();
    const lobes = 16;
    for (let i = 0; i <= lobes * 4; i++) {
      const a = (i * Math.PI * 2) / (lobes * 4);
      const r = 49 + Math.sin(a * lobes) * 4.5;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    paintFrame();
  } else if (effective === 'ribbon-wax-award') {
    ctx.beginPath();
    ctx.moveTo(-16, 16);
    ctx.lineTo(-26, 54);
    ctx.lineTo(-12, 44);
    ctx.lineTo(-4, 54);
    ctx.lineTo(-2, 20);
    ctx.closePath();
    paintFrame();
    ctx.beginPath();
    ctx.moveTo(16, 16);
    ctx.lineTo(26, 54);
    ctx.lineTo(12, 44);
    ctx.lineTo(4, 54);
    ctx.lineTo(2, 20);
    ctx.closePath();
    paintFrame();
    ctx.beginPath();
    ctx.arc(0, -4, 46, 0, Math.PI * 2);
    paintFrame();
  } else if (effective === 'crown-crest') {
    ctx.beginPath();
    ctx.moveTo(-25, -37);
    ctx.lineTo(-19, -51);
    ctx.lineTo(-7, -43);
    ctx.lineTo(0, -56);
    ctx.lineTo(7, -43);
    ctx.lineTo(19, -51);
    ctx.lineTo(25, -37);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-25, -36, 50, 3.2);
  } else if (effective === 'laurel-sovereign') {
    drawStar5(0, -49, 8.5, 3.5);
    ctx.beginPath();
    ctx.moveTo(-18, 44);
    ctx.bezierCurveTo(-43, 34, -48, 0, -37, -30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(18, 44);
    ctx.bezierCurveTo(43, 34, 48, 0, 37, -30);
    ctx.stroke();
    const leafAngles = [-55, -35, -15, 5, 25, 45];
    leafAngles.forEach((deg) => {
      [-1, 1].forEach((side) => {
        ctx.save();
        ctx.rotate((side * deg * Math.PI) / 180);
        ctx.translate(side * -41, 0);
        ctx.rotate((side * -32 * Math.PI) / 180);
        ctx.beginPath();
        ctx.ellipse(0, 0, 6, 2.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    });
  } else if (effective === 'heraldic-shield') {
    ctx.beginPath();
    ctx.moveTo(-44, -46);
    ctx.lineTo(44, -46);
    ctx.lineTo(44, 0);
    ctx.quadraticCurveTo(44, 34, 0, 53);
    ctx.quadraticCurveTo(-44, 34, -44, 0);
    ctx.closePath();
    paintFrame();
  } else if (effective === 'winged-hermes-crest') {
    ctx.beginPath();
    ctx.moveTo(-34, -16);
    ctx.lineTo(-56, -30);
    ctx.lineTo(-45, -16);
    ctx.lineTo(-54, -8);
    ctx.lineTo(-40, -2);
    ctx.lineTo(-48, 5);
    ctx.lineTo(-32, 7);
    ctx.closePath();
    paintFrame();
    ctx.beginPath();
    ctx.moveTo(34, -16);
    ctx.lineTo(56, -30);
    ctx.lineTo(45, -16);
    ctx.lineTo(54, -8);
    ctx.lineTo(40, -2);
    ctx.lineTo(48, 5);
    ctx.lineTo(32, 7);
    ctx.closePath();
    paintFrame();
    drawStar5(0, -45, 7, 3);
  } else if (effective === 'sunburst-medallion') {
    for (let i = 0; i < 24; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / 24);
      ctx.beginPath();
      ctx.moveTo(0, i % 2 === 0 ? -56 : -50);
      ctx.lineTo(2.4, -39);
      ctx.lineTo(-2.4, -39);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else if (effective === 'calatrava-cross') {
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 2);
      ctx.beginPath();
      ctx.moveTo(0, -55);
      ctx.bezierCurveTo(7, -44, 9, -35, 5, -26);
      ctx.lineTo(0, -20);
      ctx.lineTo(-5, -26);
      ctx.bezierCurveTo(-9, -35, -7, -44, 0, -55);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else if (effective === 'mughal-lotus-mandala') {
    for (let i = 0; i < 16; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / 16);
      ctx.beginPath();
      ctx.moveTo(0, -54);
      ctx.bezierCurveTo(6, -43, 7, -34, 0, -27);
      ctx.bezierCurveTo(-7, -34, -6, -43, 0, -54);
      ctx.fill();
      ctx.restore();
    }
  } else if (effective === 'mughal-arch') {
    ctx.beginPath();
    ctx.moveTo(-46, 54);
    ctx.lineTo(-46, -10);
    ctx.bezierCurveTo(-46, -34, -22, -46, 0, -54);
    ctx.bezierCurveTo(22, -46, 46, -34, 46, -10);
    ctx.lineTo(46, 54);
    ctx.closePath();
    paintFrame();
  } else if (effective === 'octagon-vault') {
    const pts = [
      [-22, -53],
      [22, -53],
      [53, -22],
      [53, 22],
      [22, 53],
      [-22, 53],
      [-53, 22],
      [-53, -22],
    ];
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.closePath();
    paintFrame();
  } else if (effective === 'signet-hex-crest') {
    const pts = [
      [0, -54],
      [48, -27],
      [48, 27],
      [0, 54],
      [-48, 27],
      [-48, -27],
    ];
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.closePath();
    paintFrame();
  } else if (effective === 'art-deco-diamond' || effective === 'double-diamond-atelier') {
    ctx.strokeRect(-40, -40, 80, 80);
    ctx.beginPath();
    ctx.moveTo(0, -54);
    ctx.lineTo(54, 0);
    ctx.lineTo(0, 54);
    ctx.lineTo(-54, 0);
    ctx.closePath();
    paintFrame();
  } else if (effective === 'compass-star-guild') {
    const compass = [
      [0, -56],
      [9, -9],
      [56, 0],
      [9, 9],
      [0, 56],
      [-9, 9],
      [-56, 0],
      [-9, -9],
    ];
    ctx.beginPath();
    compass.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.closePath();
    ctx.fill();
  } else if (effective === 'arch-pillar-seal') {
    ctx.beginPath();
    ctx.moveTo(0, -53);
    ctx.lineTo(48, -30);
    ctx.lineTo(-48, -30);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-44, -29, 11, 72);
    ctx.fillRect(33, -29, 11, 72);
    ctx.fillRect(-50, 43, 100, 8);
  } else if (effective === 'banknote-oval' || effective === 'cartouche-oval') {
    ctx.beginPath();
    ctx.ellipse(0, 0, 53, 44, 0, 0, Math.PI * 2);
    paintFrame();
  } else if (effective === 'chopard-wreath-crest') {
    ctx.beginPath();
    ctx.arc(-12, 0, 38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(12, 0, 38, 0, Math.PI * 2);
    ctx.stroke();
  } else if (effective === 'crescent-star') {
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    paintFrame();
    drawStar5(31, -28, 7.5, 3);
  } else {
    // notary-rosette, justice-scales-seal, fountain-quill-guild
    for (let i = 0; i < 32; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / 32);
      ctx.beginPath();
      ctx.moveTo(0, -56);
      ctx.lineTo(2, -48);
      ctx.lineTo(-2, -48);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.shadowColor = 'transparent';
  const medCy = effective === 'crown-crest' ? 5 : effective === 'ribbon-wax-award' ? -4 : 0;
  const rOuter =
    effective === 'sunburst-medallion' ||
    effective === 'calatrava-cross' ||
    effective === 'mughal-lotus-mandala' ||
    effective === 'arch-pillar-seal'
      ? 36
      : effective === 'crown-crest'
      ? 39
      : 45;
  const hasRingText = !isWatermark && (Boolean(ringTop.trim()) || Boolean(ringBottom.trim()));
  const rInner = hasRingText ? rOuter - 12.5 : rOuter - 5.5;

  // Layer 2: Solid Dimensional Medallion Core
  if (!isWatermark && finish !== 'fine-engraved') {
    ctx.save();
    if (isSolidFill) {
      ctx.fillStyle = inkStyle;
    } else if (isEmbossedCoin) {
      const coreGrad = ctx.createRadialGradient(-10, medCy - 12, 4, 0, medCy, rOuter);
      coreGrad.addColorStop(0, '#26332D');
      coreGrad.addColorStop(0.6, coreBgHex);
      coreGrad.addColorStop(1, '#070B09');
      ctx.fillStyle = coreGrad;
    } else if (isEnamelInlay) {
      ctx.fillStyle = coreBgHex;
    }
    ctx.beginPath();
    ctx.arc(0, medCy, rOuter, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Layer 3: Seal Rim Border
  const effectiveRim: CrestRimBorderId =
    rimBorder === 'auto'
      ? effective === 'cartouche-oval' || effective === 'chopard-wreath-crest'
        ? 'pearl-bezel'
        : effective === 'wax-seal' || effective === 'ribbon-wax-award'
        ? 'scalloped-wax'
        : effective === 'notary-rosette' || effective === 'banknote-oval'
        ? 'milled-coin'
        : 'double-bevel'
      : rimBorder;

  if (effectiveRim !== 'none') {
    ctx.save();
    ctx.strokeStyle = inkStyle;
    ctx.fillStyle = inkStyle;
    if (effectiveRim === 'milled-coin') {
      for (let i = 0; i < 40; i++) {
        ctx.save();
        ctx.translate(0, medCy);
        ctx.rotate((i * Math.PI * 2) / 40);
        ctx.lineWidth = 1.3 * weight;
        ctx.beginPath();
        ctx.moveTo(0, -rOuter - 2.5);
        ctx.lineTo(0, -rOuter + 1.5);
        ctx.stroke();
        ctx.restore();
      }
      ctx.lineWidth = 2 * weight;
      ctx.beginPath();
      ctx.arc(0, medCy, rOuter, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 0.9 * weight;
      ctx.beginPath();
      ctx.arc(0, medCy, rInner, 0, Math.PI * 2);
      ctx.stroke();
    } else if (effectiveRim === 'pearl-bezel') {
      ctx.lineWidth = 1.6 * weight;
      ctx.beginPath();
      ctx.arc(0, medCy, rOuter, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 24; i++) {
        const a = (i * Math.PI * 2) / 24;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (rOuter - 2.5), medCy + Math.sin(a) * (rOuter - 2.5), 1.8 * Math.min(1.4, weight * 0.85), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.lineWidth = 1 * weight;
      ctx.beginPath();
      ctx.arc(0, medCy, rInner, 0, Math.PI * 2);
      ctx.stroke();
    } else if (effectiveRim === 'rope-twist') {
      ctx.lineWidth = 1.4 * weight;
      ctx.beginPath();
      ctx.arc(0, medCy, rOuter, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 28; i++) {
        ctx.save();
        ctx.translate(0, medCy);
        ctx.rotate((i * Math.PI * 2) / 28);
        ctx.beginPath();
        ctx.ellipse(0, -rOuter + 2.4, 3, 1.4, 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.lineWidth = 1 * weight;
      ctx.beginPath();
      ctx.arc(0, medCy, rInner, 0, Math.PI * 2);
      ctx.stroke();
    } else if (effectiveRim === 'scalloped-wax') {
      for (let i = 0; i < 18; i++) {
        ctx.save();
        ctx.translate(0, medCy);
        ctx.rotate((i * Math.PI * 2) / 18);
        ctx.beginPath();
        ctx.arc(0, -rOuter + 0.5, 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.lineWidth = 1 * weight;
      ctx.beginPath();
      ctx.arc(0, medCy, rInner, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.lineWidth = 2.2 * weight;
      ctx.beginPath();
      ctx.arc(0, medCy, rOuter, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1 * weight;
      ctx.beginPath();
      ctx.arc(0, medCy, rInner, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Layer 4: Curved Ring Text
  if (hasRingText) {
    const textR = rOuter - 6.8;
    const textInk = isSolidFill ? coreBgHex : highlightColor;
    drawCurvedArcText(ctx, ringTop, 0, medCy, textR, true, textInk);
    drawCurvedArcText(ctx, ringBottom, 0, medCy, textR, false, textInk);
  }

  // Layer 5: Real Centerpiece (Custom Uploaded Logo, Icon + Monogram, Icon Only, or Monogram)
  const coreInk = isSolidFill ? coreBgHex : inkStyle;
  const coreHighlight = isSolidFill ? coreBgHex : highlightColor;
  const effectiveCenterMode: CrestCenterMode =
    centerMode === 'custom-image' && !customLogoImg ? 'icon-monogram' : centerMode;

  if (effectiveCenterMode === 'custom-image' && customLogoImg) {
    const clipR = Math.max(12, rInner - 2);
    const imgSize = rInner * 1.56;
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, medCy, clipR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(customLogoImg, -imgSize / 2, medCy - imgSize / 2, imgSize, imgSize);
    ctx.restore();
  } else if (effectiveCenterMode === 'icon-only') {
    const iconScale = (rInner * 1.32) / 40;
    ctx.save();
    ctx.translate(-20 * iconScale, medCy - 20 * iconScale);
    ctx.scale(iconScale, iconScale);
    drawSculptedCenterIconOnCanvas(ctx, centerIcon, isSolidFill ? coreBgHex : accentColor, coreHighlight);
    ctx.restore();
  } else if (effectiveCenterMode === 'icon-monogram') {
    const iconScale = (rInner * 0.72) / 40;
    const iconY = medCy - rInner * 0.56;
    const textY = medCy + rInner * 0.36;
    const fontSize = monogram.length > 2 ? Math.max(13, rInner * 0.42) : Math.max(15, rInner * 0.54);
    ctx.save();
    ctx.translate(-20 * iconScale, iconY);
    ctx.scale(iconScale, iconScale);
    drawSculptedCenterIconOnCanvas(ctx, centerIcon, isSolidFill ? coreBgHex : accentColor, coreHighlight);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = coreInk;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-rInner * 0.48, medCy + rInner * 0.06);
    ctx.lineTo(rInner * 0.48, medCy + rInner * 0.06);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = coreInk;
    ctx.font = `800 ${Math.round(fontSize)}px ${displayFont}`;
    ctx.fillText(monogram, 0, textY);
  } else {
    const fontSize = monogram.length > 2 ? Math.max(16, rInner * 0.56) : Math.max(20, rInner * 0.74);
    ctx.fillStyle = coreInk;
    ctx.font = `800 ${Math.round(fontSize)}px ${displayFont}`;
    ctx.fillText(monogram, 0, medCy + 1);
  }

  ctx.restore();
}

function drawWatermarkOnCanvas(
  ctx: CanvasRenderingContext2D,
  symbols: CardSymbolsConfig,
  theme: CardTheme,
  monogram: string,
  displayFont: string,
  customLogoImg?: HTMLImageElement | null
) {
  const wm = symbols.watermarkCrest;
  if (!wm || wm === 'none') return;

  const resolvedId: Exclude<CrestStyleId, 'auto' | 'none' | 'postage-stamp'> =
    wm === 'auto' || wm === 'postage-stamp'
      ? symbols.crestStyle !== 'auto' &&
        symbols.crestStyle !== 'none' &&
        symbols.crestStyle !== 'postage-stamp'
        ? symbols.crestStyle
        : 'justice-scales-seal'
      : wm;

  ctx.save();
  ctx.globalAlpha = Math.min(0.32, Math.max(0.03, (symbols.watermarkOpacity ?? 12) / 100));
  drawDynamicCrestOnCanvas(
    ctx,
    resolvedId,
    'justice-scales-seal',
    CARD_WIDTH - 450,
    CARD_HEIGHT / 2,
    400,
    theme.accentHex,
    theme.accentMutedHex,
    monogram,
    displayFont,
    theme.accentHighlightHex,
    symbols.crestFoilGradient ?? true,
    symbols,
    theme.cardBgHex,
    customLogoImg,
    true
  );
  ctx.restore();
}

function drawCardBase(ctx: CanvasRenderingContext2D, theme: CardTheme) {
  const grad = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  grad.addColorStop(0, theme.cardBgHex);
  grad.addColorStop(1, theme.cardBgEndHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
}

function triggerDownload(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function createQrImage(url: string, darkColor: string): Promise<HTMLImageElement> {
  const qrDataUrl = await QRCode.toDataURL(url, {
    width: 440,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: {
      dark: darkColor || '#112E22',
      light: '#FFFFFF',
    },
  });

  const qrImg = new Image();
  await new Promise<void>((resolve, reject) => {
    qrImg.onload = () => resolve();
    qrImg.onerror = () => reject(new Error('QR load error'));
    qrImg.src = qrDataUrl;
  });
  return qrImg;
}

async function loadOptionalImage(dataUrl?: string): Promise<HTMLImageElement | null> {
  if (!dataUrl) return null;
  const img = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image load error'));
      img.src = dataUrl;
    });
    return img;
  } catch {
    return null;
  }
}

export async function exportCardPng(
  side: 'front' | 'back',
  designId: CardDesignId,
  borderStyle: CardBorderStyle,
  details: CardDetails,
  theme: CardTheme,
  typography: CardTypographyMap,
  symbols: CardSymbolsConfig,
  magic: CardMagicConfig,
  formatPhone: (p: string) => string
): Promise<void> {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    await document.fonts.ready;
  }

  const customLogoImg =
    symbols.crestCenterMode === 'custom-image' && symbols.customLogoDataUrl
      ? await loadOptionalImage(symbols.customLogoDataUrl)
      : null;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { main: brandMain, role: brandRole } = splitBrandName(details.companyName);
  const brandWords = brandMain.split(/\s+/);
  const firstWord = brandWords[0] ?? 'SA';
  const restWords = brandWords.slice(1).join(' ') || 'BROTHERS';
  const companyFontCanvas = getFontCanvas(typography.companyName.fontId);

  const crestScale = symbols.crestScale ?? 1;
  const crestFoil = symbols.crestFoilGradient ?? true;

  if (side === 'front') {
    if (designId === 'sovereign-stamp') {
      drawCardBase(ctx, theme);
      drawBackgroundPattern(ctx, designId, magic, theme.accentHex);
      drawWatermarkOnCanvas(ctx, symbols, theme, details.monogram, companyFontCanvas, customLogoImg);
      drawBorderOverlay(ctx, borderStyle, theme, magic.foilBorderShimmer);

      if (symbols.crestStyle !== 'none') {
        const sw = Math.round(525 * crestScale);
        const sh = Math.round(605 * crestScale);
        const sx = 150 + Math.round((525 - sw) / 2);
        const sy = 195 + Math.round((605 - sh) / 2);
        drawPostageStampEmblem(
          ctx,
          sx,
          sy,
          sw,
          sh,
          theme.accentHex,
          theme.isDark ? theme.creamPaperHex : '#FAF7F0',
          theme.isDark ? theme.creamInkHex : theme.textPrimaryHex,
          details.monogram,
          brandMain,
          companyFontCanvas,
          symbols.stampIcons
        );
      }

      const rx = symbols.crestStyle === 'none' ? 140 : 775;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = theme.accentHex;
      ctx.fillRect(rx, 175, 76, 4);
      drawStyledText(ctx, details.subtitle, rx + 98, 158, typography.subtitle, 32, 600, theme.accentHex, theme);

      drawStyledText(ctx, firstWord, rx, 238, typography.companyName, 126, 800, theme.textPrimaryHex, theme);
      drawStyledText(ctx, restWords, rx, 378, typography.companyName, 126, 800, theme.textPrimaryHex, theme);

      drawStyledText(ctx, brandRole, rx, 548, typography.badge, 56, 600, theme.accentHex, theme);
      drawStyledText(ctx, details.tagline, rx, 765, typography.tagline, 44, 600, theme.accentHex, theme);

      ctx.strokeStyle = theme.borderHex;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(rx, 920);
      ctx.lineTo(CARD_WIDTH - 140, 920);
      ctx.stroke();

      drawStyledText(ctx, details.address, rx, 960, typography.address, 38, 500, theme.textSecondaryHex, theme);
    } else if (
      designId === 'treasury-guilloche' ||
      designId === 'imperial-crest-center' ||
      designId === 'mughal-darbar'
    ) {
      drawCardBase(ctx, theme);
      drawBackgroundPattern(ctx, designId, magic, theme.accentHex);
      drawWatermarkOnCanvas(ctx, symbols, theme, details.monogram, companyFontCanvas, customLogoImg);
      drawBorderOverlay(ctx, borderStyle, theme, magic.foilBorderShimmer);

      if (symbols.crestStyle !== 'none') {
        drawDynamicCrestOnCanvas(
          ctx,
          symbols.crestStyle,
          designId === 'imperial-crest-center'
            ? 'crown-crest'
            : designId === 'mughal-darbar'
            ? 'mughal-arch'
            : 'notary-rosette',
          CARD_WIDTH / 2,
          215,
          96 * crestScale,
          theme.accentHex,
          theme.accentMutedHex,
          details.monogram,
          companyFontCanvas,
          theme.accentHighlightHex,
          crestFoil,
          symbols,
          theme.cardBgHex,
          customLogoImg
        );
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      drawStyledText(ctx, details.companyName, CARD_WIDTH / 2, 355, typography.companyName, 90, 700, theme.textPrimaryHex, theme);
      drawStyledText(ctx, details.tagline, CARD_WIDTH / 2, 478, typography.tagline, 40, 500, theme.accentHex, theme);

      const [c1, c2] = details.contacts;
      if (c1) {
        drawStyledText(ctx, c1.name, CARD_WIDTH * 0.33, 665, typography.contactName, 48, 600, theme.textPrimaryHex, theme);
        drawStyledText(ctx, formatPhone(c1.phone), CARD_WIDTH * 0.33, 738, typography.contactPhone, 40, 500, theme.accentHex, theme);
      }

      ctx.fillStyle = theme.accentHex;
      ctx.fillRect(CARD_WIDTH / 2 - 2, 665, 4, 130);

      if (c2) {
        drawStyledText(ctx, c2.name, CARD_WIDTH * 0.67, 665, typography.contactName, 48, 600, theme.textPrimaryHex, theme);
        drawStyledText(ctx, formatPhone(c2.phone), CARD_WIDTH * 0.67, 738, typography.contactPhone, 40, 500, theme.accentHex, theme);
      }

      ctx.strokeStyle = theme.borderHex;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(180, 930);
      ctx.lineTo(CARD_WIDTH - 180, 930);
      ctx.stroke();

      drawStyledText(ctx, details.address, CARD_WIDTH / 2, 975, typography.address, 38, 500, theme.textSecondaryHex, theme);
    } else if (designId === 'savile-monogram') {
      drawCardBase(ctx, theme);
      drawBackgroundPattern(ctx, designId, magic, theme.accentHex);
      drawWatermarkOnCanvas(ctx, symbols, theme, details.monogram, companyFontCanvas, customLogoImg);
      const splitX = 680;
      ctx.fillStyle = theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(20,20,19,0.03)';
      ctx.fillRect(0, 0, splitX, CARD_HEIGHT);
      drawBorderOverlay(ctx, borderStyle, theme, magic.foilBorderShimmer);

      ctx.strokeStyle = theme.borderHex;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, CARD_HEIGHT);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      drawStyledText(ctx, 'KARACHI', splitX / 2, 110, typography.subtitle, 30, 600, theme.accentMutedHex, theme);

      ctx.strokeStyle = theme.accentHex;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(splitX / 2 - 175, 425, 350, 350, 28);
      ctx.stroke();

      ctx.fillStyle = theme.accentHex;
      ctx.textBaseline = 'middle';
      ctx.font = `700 150px ${companyFontCanvas}`;
      ctx.fillText(details.monogram, splitX / 2, 605);

      ctx.textBaseline = 'top';
      drawStyledText(ctx, details.cardLabel, splitX / 2, 1045, typography.badge, 30, 600, theme.accentHex, theme);

      const rx = splitX + 120;
      ctx.textAlign = 'left';
      drawStyledText(ctx, details.companyName, rx, 145, typography.companyName, 88, 700, theme.textPrimaryHex, theme);
      drawStyledText(ctx, details.tagline, rx, 275, typography.tagline, 40, 500, theme.textSecondaryHex, theme);

      let y = 505;
      details.contacts.slice(0, 2).forEach((contact) => {
        drawStyledText(ctx, contact.name, rx, y, typography.contactName, 46, 600, theme.textPrimaryHex, theme);

        ctx.textAlign = 'right';
        drawStyledText(ctx, formatPhone(contact.phone), CARD_WIDTH - 120, y + 4, typography.contactPhone, 42, 500, theme.accentHex, theme);
        ctx.textAlign = 'left';

        ctx.strokeStyle = theme.borderHex;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(rx, y + 90);
        ctx.lineTo(CARD_WIDTH - 120, y + 90);
        ctx.stroke();
        y += 165;
      });

      drawStyledText(ctx, details.address, rx, 985, typography.address, 38, 500, theme.textSecondaryHex, theme);
    } else {
      drawCardBase(ctx, theme);
      drawBackgroundPattern(ctx, designId, magic, theme.accentHex);
      drawWatermarkOnCanvas(ctx, symbols, theme, details.monogram, companyFontCanvas, customLogoImg);
      drawBorderOverlay(ctx, borderStyle, theme, magic.foilBorderShimmer);
      const marginX = 140;

      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      drawStyledText(ctx, details.subtitle, marginX, 128, typography.subtitle, 32, 600, theme.accentHex, theme);
      drawStyledText(ctx, details.companyName, marginX, 182, typography.companyName, 92, 700, theme.textPrimaryHex, theme);

      ctx.fillStyle = theme.accentHex;
      ctx.fillRect(marginX, 326, 110, 5);

      drawStyledText(ctx, details.tagline, marginX + 136, 304, typography.tagline, 40, 500, theme.textSecondaryHex, theme);

      if (symbols.crestStyle !== 'none') {
        const defaultForDesign: Exclude<CrestStyleId, 'auto' | 'none'> =
          designId === 'royal-stamp-charter'
            ? 'wax-seal'
            : designId === 'crescent-guild'
            ? 'crescent-star'
            : designId === 'karachi-heritage-press'
            ? 'heraldic-shield'
            : designId === 'sovereign-blackcard'
            ? 'sunburst-medallion'
            : designId === 'vault-microgrid'
            ? 'octagon-vault'
            : 'notary-rosette';
        drawDynamicCrestOnCanvas(
          ctx,
          symbols.crestStyle,
          defaultForDesign,
          CARD_WIDTH - 245,
          235,
          115 * crestScale,
          theme.accentHex,
          theme.accentMutedHex,
          details.monogram,
          companyFontCanvas,
          theme.accentHighlightHex,
          crestFoil,
          symbols,
          theme.cardBgHex,
          customLogoImg
        );
      }

      const divGrad = ctx.createLinearGradient(marginX, 0, CARD_WIDTH - marginX, 0);
      divGrad.addColorStop(0, theme.accentHex);
      divGrad.addColorStop(0.85, 'transparent');
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = divGrad;
      ctx.fillRect(marginX, 555, CARD_WIDTH - marginX * 2, 3);
      ctx.restore();

      const colWidth = (CARD_WIDTH - marginX * 2) / 2;
      details.contacts.slice(0, 2).forEach((contact, idx) => {
        const x = marginX + idx * colWidth;
        drawStyledText(ctx, contact.name, x, 645, typography.contactName, 50, 600, theme.textPrimaryHex, theme);
        drawStyledText(ctx, formatPhone(contact.phone), x, 725, typography.contactPhone, 42, 500, theme.accentHex, theme);
      });

      ctx.strokeStyle = theme.borderHex;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(marginX, 910);
      ctx.lineTo(CARD_WIDTH - marginX, 910);
      ctx.stroke();

      drawStyledText(ctx, details.address, marginX, 965, typography.address, 40, 500, theme.textSecondaryHex, theme);

      ctx.textAlign = 'right';
      drawStyledText(ctx, details.cardLabel, CARD_WIDTH - marginX, 970, typography.badge, 32, 600, theme.accentMutedHex, theme);
    }
  } else {
    const qrImg = await createQrImage(details.locationUrl, magic.qrDarkColor);

    const drawQrCenterBadge = (qrX: number, qrY: number, qrBoxSize: number) => {
      if (!magic.qrCenterMonogram) return;
      const badgeSize = 90;
      const bx = qrX + (qrBoxSize - badgeSize) / 2;
      const by = qrY + (qrBoxSize - badgeSize) / 2;
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(bx, by, badgeSize, badgeSize, 12);
      ctx.fill();
      ctx.strokeStyle = magic.qrDarkColor || '#112E22';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.fillStyle = magic.qrDarkColor || '#112E22';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `800 38px ${companyFontCanvas}`;
      ctx.fillText(details.monogram, bx + badgeSize / 2, by + badgeSize / 2 + 2);
      ctx.restore();
    };

    if (designId === 'sovereign-stamp' || designId === 'emerald-split-horizon') {
      const lightBg = theme.isDark ? theme.creamPaperHex : '#FAF7F0';
      const lightInk = theme.isDark ? theme.creamInkHex : theme.textPrimaryHex;
      const darkPanel = theme.isDark ? theme.cardBgHex : '#171614';

      const splitX = Math.round(CARD_WIDTH * 0.67);

      const grad = ctx.createLinearGradient(splitX, 0, CARD_WIDTH, CARD_HEIGHT);
      grad.addColorStop(0, theme.isDark ? theme.cardBgHex : '#1D1C19');
      grad.addColorStop(1, theme.isDark ? theme.cardBgEndHex : '#11100E');
      ctx.fillStyle = grad;
      ctx.fillRect(splitX, 0, CARD_WIDTH - splitX, CARD_HEIGHT);

      ctx.fillStyle = lightBg;
      ctx.fillRect(0, 0, splitX, CARD_HEIGHT);

      ctx.save();
      ctx.strokeStyle = lightInk;
      ctx.globalAlpha = 0.08;
      ctx.lineWidth = 2.5;
      for (let r = 120; r <= 720; r += 90) {
        ctx.beginPath();
        ctx.arc(0, CARD_HEIGHT / 2, r, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
      }
      ctx.restore();

      ctx.fillStyle = darkPanel;
      for (let i = 0; i < 18; i++) {
        const ny = 42 + i * ((CARD_HEIGHT - 84) / 17);
        ctx.beginPath();
        ctx.arc(splitX, ny, 16, 0, Math.PI * 2);
        ctx.fill();
      }

      const lx = 120;
      ctx.fillStyle = darkPanel;
      ctx.fillRect(lx, 105, 112, 112);
      ctx.strokeStyle = theme.accentHex;
      ctx.lineWidth = 5;
      ctx.strokeRect(lx, 105, 112, 112);

      ctx.fillStyle = theme.accentHex;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 46px ${companyFontCanvas}`;
      ctx.fillText(details.monogram, lx + 56, 163);

      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      drawStyledText(ctx, brandMain, lx + 148, 106, typography.companyName, 56, 700, lightInk, theme);
      drawStyledText(ctx, brandRole, lx + 150, 178, typography.subtitle, 28, 600, theme.accentMutedHex, theme);

      let py = 395;
      details.contacts.slice(0, 2).forEach((contact) => {
        ctx.fillStyle = darkPanel;
        ctx.beginPath();
        ctx.arc(lx + 58, py + 45, 58, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = theme.accentHex;
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.fillStyle = theme.accentHex;
        ctx.font = '600 40px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☎', lx + 58, py + 48);

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        drawStyledText(ctx, formatPhone(contact.phone), lx + 148, py - 2, typography.contactPhone, 56, 600, lightInk, theme);
        drawStyledText(ctx, contact.name, lx + 150, py + 66, typography.contactName, 32, 600, theme.accentMutedHex, theme);
        py += 205;
      });

      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx, 955);
      ctx.lineTo(splitX - 90, 955);
      ctx.stroke();

      drawStyledText(ctx, details.address, lx, 988, typography.address, 34, 600, lightInk, theme);

      ctx.fillStyle = theme.accentMutedHex;
      ctx.font = '600 26px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('STAMP PAPERS · STAMP DUTIES · STATIONERY · OFFICE ITEMS', lx, 1048);

      const qrBoxSize = 420;
      const qrX = splitX + (CARD_WIDTH - splitX - qrBoxSize) / 2;
      const qrY = 300;

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(qrX - 24, qrY - 24, qrBoxSize + 48, qrBoxSize + 48, 24);
      ctx.fill();
      ctx.strokeStyle = theme.accentHex;
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.drawImage(qrImg, qrX, qrY, qrBoxSize, qrBoxSize);
      drawQrCenterBadge(qrX, qrY, qrBoxSize);

      ctx.textAlign = 'center';
      drawStyledText(ctx, details.qrLabel, splitX + (CARD_WIDTH - splitX) / 2, qrY + qrBoxSize + 72, typography.badge, 34, 700, theme.accentHex, theme);

      ctx.fillStyle = theme.isDark ? theme.textSecondaryHex : '#D6D3CB';
      ctx.font = '500 28px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(details.qrSublabel, splitX + (CARD_WIDTH - splitX) / 2, qrY + qrBoxSize + 122);
    } else {
      drawCardBase(ctx, theme);
      drawBackgroundPattern(ctx, designId, magic, theme.accentHex);
      drawWatermarkOnCanvas(ctx, symbols, theme, details.monogram, companyFontCanvas, customLogoImg);
      drawBorderOverlay(ctx, borderStyle, theme, magic.foilBorderShimmer);
      const marginX = 140;

      if (symbols.crestStyle !== 'none') {
        drawDynamicCrestOnCanvas(
          ctx,
          symbols.crestStyle,
          'notary-rosette',
          marginX + 95,
          230,
          95 * crestScale,
          theme.accentHex,
          theme.accentMutedHex,
          details.monogram,
          companyFontCanvas,
          theme.accentHighlightHex,
          crestFoil,
          symbols,
          theme.cardBgHex,
          customLogoImg
        );
      }

      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      drawStyledText(ctx, details.companyName, marginX + 230, 152, typography.companyName, 76, 700, theme.textPrimaryHex, theme);
      drawStyledText(ctx, details.tagline, marginX + 232, 248, typography.tagline, 36, 500, theme.accentHex, theme);

      let y = 415;
      details.services.forEach((service) => {
        ctx.save();
        ctx.translate(marginX + 16, y + 22);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = theme.accentHex;
        ctx.fillRect(-8, -8, 16, 16);
        ctx.restore();

        ctx.fillStyle = theme.textSecondaryHex;
        ctx.font = '500 40px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(service, marginX + 54, y);
        y += 92;
      });

      ctx.strokeStyle = theme.borderHex;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(marginX, 910);
      ctx.lineTo(CARD_WIDTH - 640, 910);
      ctx.stroke();

      drawStyledText(ctx, details.address, marginX, 965, typography.address, 36, 500, theme.textSecondaryHex, theme);

      const qrBoxSize = 440;
      const qrX = CARD_WIDTH - marginX - qrBoxSize;
      const qrY = 330;

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(qrX - 24, qrY - 24, qrBoxSize + 48, qrBoxSize + 48, 24);
      ctx.fill();

      ctx.strokeStyle = theme.accentHex;
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.drawImage(qrImg, qrX, qrY, qrBoxSize, qrBoxSize);
      drawQrCenterBadge(qrX, qrY, qrBoxSize);

      ctx.textAlign = 'center';
      drawStyledText(ctx, details.qrLabel, qrX + qrBoxSize / 2, qrY + qrBoxSize + 62, typography.badge, 32, 600, theme.accentHex, theme);
    }
  }

  const pngUrl = canvas.toDataURL('image/png');
  const safeSlug = details.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  triggerDownload(pngUrl, `${safeSlug}-${designId}-${side}-${theme.id}.png`);
}

export function downloadVCard(details: CardDetails): void {
  const [primary, secondary] = details.contacts;
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${details.companyName}`,
    `ORG:${details.companyName}`,
    `TITLE:${details.tagline}`,
  ];

  if (primary) {
    lines.push(`TEL;TYPE=CELL,VOICE:${primary.phone.replace(/\s+/g, '')}`);
  }
  if (secondary) {
    lines.push(`TEL;TYPE=WORK,VOICE:${secondary.phone.replace(/\s+/g, '')}`);
  }

  lines.push(`ADR;TYPE=WORK:;;${details.address};Karachi;;Pakistan`);
  lines.push(`URL:${details.locationUrl}`);
  lines.push(
    `NOTE:Contacts: ${details.contacts.map((c) => `${c.name} (${c.phone})`).join(' | ')} - ${details.tagline}`
  );
  lines.push('END:VCARD');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, 'SA-Brothers-Stamp-Vendor.vcf');
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
