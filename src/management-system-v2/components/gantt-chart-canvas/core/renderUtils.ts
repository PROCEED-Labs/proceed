/**
 * Shared rendering utilities to reduce code duplication
 */

interface DrawStyle {
  strokeStyle?: string;
  fillStyle?: string;
  lineWidth?: number;
  lineDash?: number[];
  globalAlpha?: number;
  font?: string;
  textAlign?: CanvasTextAlign;
  textBaseline?: CanvasTextBaseline;
}

export function setupCanvasStyle(ctx: CanvasRenderingContext2D, style: DrawStyle): void {
  if (style.strokeStyle) ctx.strokeStyle = style.strokeStyle;
  if (style.fillStyle) ctx.fillStyle = style.fillStyle;
  if (style.lineWidth !== undefined) ctx.lineWidth = style.lineWidth;
  if (style.lineDash) ctx.setLineDash(style.lineDash);
  if (style.globalAlpha !== undefined) ctx.globalAlpha = style.globalAlpha;
  if (style.font) ctx.font = style.font;
  if (style.textAlign) ctx.textAlign = style.textAlign;
  if (style.textBaseline) ctx.textBaseline = style.textBaseline;
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  style: DrawStyle = {},
): void {
  ctx.save();
  setupCanvasStyle(ctx, style);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  style: DrawStyle = {},
): void {
  ctx.save();
  setupCanvasStyle(ctx, style);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  if (style.fillStyle) ctx.fill();
  if (style.strokeStyle) ctx.stroke();
  ctx.restore();
}

export function measureTextWithEllipsis(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  const fullWidth = ctx.measureText(text).width;
  if (fullWidth <= maxWidth) return text;

  const ellipsis = '...';
  const ellipsisWidth = ctx.measureText(ellipsis).width;

  // Binary search for optimal text length
  let left = 0;
  let right = text.length;
  let result = '';

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const truncated = text.substring(0, mid) + ellipsis;
    const width = ctx.measureText(truncated).width;

    if (width <= maxWidth) {
      result = truncated;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return result || ellipsis;
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth?: number,
  style: DrawStyle = {},
): void {
  ctx.save();
  setupCanvasStyle(ctx, style);

  const displayText = maxWidth ? measureTextWithEllipsis(ctx, text, maxWidth) : text;

  if (style.strokeStyle) {
    ctx.strokeText(displayText, x, y);
  }
  if (style.fillStyle) {
    ctx.fillText(displayText, x, y);
  }

  ctx.restore();
}
