/**
 * Color utility functions for the Gantt Chart Canvas
 * 
 * Pure functions for color manipulation and calculations.
 */

/**
 * Parse hex color to RGB components
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  if (cleanHex.length !== 6) {
    return null;
  }
  
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Adjust color brightness by percentage
 * @param color Hex color string
 * @param percent Percentage to adjust (-100 to 100)
 * @returns Adjusted hex color
 */
export function adjustBrightness(color: string, percent: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  
  const amount = Math.round(2.55 * percent);
  
  return rgbToHex(
    rgb.r + amount,
    rgb.g + amount,
    rgb.b + amount
  );
}

/**
 * Lighten a color by percentage
 * @param color Hex color string
 * @param percent Percentage to lighten (0 to 100)
 * @returns Lightened hex color
 */
export function lighten(color: string, percent: number): string {
  return adjustBrightness(color, Math.abs(percent));
}

/**
 * Darken a color by percentage
 * @param color Hex color string
 * @param percent Percentage to darken (0 to 100)
 * @returns Darkened hex color
 */
export function darken(color: string, percent: number): string {
  return adjustBrightness(color, -Math.abs(percent));
}

/**
 * Apply alpha transparency to a hex color
 * @param color Hex color string
 * @param alpha Alpha value (0 to 1)
 * @returns RGBA color string
 */
export function hexToRgba(color: string, alpha: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampedAlpha})`;
}

/**
 * Mix two colors
 * @param color1 First hex color
 * @param color2 Second hex color
 * @param ratio Mix ratio (0 = all color1, 1 = all color2)
 * @returns Mixed hex color
 */
export function mixColors(color1: string, color2: string, ratio: number): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return color1;
  
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const inverseRatio = 1 - clampedRatio;
  
  return rgbToHex(
    rgb1.r * inverseRatio + rgb2.r * clampedRatio,
    rgb1.g * inverseRatio + rgb2.g * clampedRatio,
    rgb1.b * inverseRatio + rgb2.b * clampedRatio
  );
}

/**
 * Get contrasting text color (black or white) for a background color
 * @param backgroundColor Hex color of background
 * @returns '#000000' or '#ffffff' for best contrast
 */
export function getContrastingTextColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return '#000000';
  
  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Generate a color palette variation
 * @param baseColor Base hex color
 * @param count Number of variations to generate
 * @returns Array of hex colors
 */
export function generateColorPalette(baseColor: string, count: number): string[] {
  if (count <= 1) return [baseColor];
  
  const palette: string[] = [];
  const step = 200 / (count - 1); // Range from -100 to +100
  
  for (let i = 0; i < count; i++) {
    const brightness = -100 + (step * i);
    palette.push(adjustBrightness(baseColor, brightness));
  }
  
  return palette;
}