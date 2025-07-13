/**
 * ZoomCurveCalculator.ts
 *
 * Provides a simple but effective zoom curve that maps linear input (0-100)
 * to scale factors for time-based visualizations.
 *
 * The curve maintains a gentle slope for 0-50 range and accelerates
 * in the 50-100 range to provide better control across different time scales.
 */

/**
 * Configuration interface for customizing the zoom curve
 */
export interface ZoomCurveConfig {
  /**
   * Zoom level (0-100) where acceleration begins
   * Below this level, gentle exponential scaling is used
   * Above this level, more aggressive scaling is applied
   */
  breakpoint: number;

  /**
   * Scale factor at zoom level 0 (most zoomed out)
   * This determines the view at minimum zoom (typically years)
   */
  minScale: number;

  /**
   * Scale factor at zoom level 100 (most zoomed in)
   * This determines the view at maximum zoom (typically seconds)
   */
  maxScale: number;

  /**
   * Controls the steepness of the curve above the breakpoint
   * Higher values create steeper acceleration in the upper range
   * Range: 1.0-3.0 (default: 2.0)
   */
  upperExponent: number;
}

/**
 * Simplified preset configurations for common use cases
 */
export const ZOOM_PRESETS = {
  DEFAULT: {
    breakpoint: 70,
    minScale: 4.0e-9, // Years view
    maxScale: 3.0e-2, // Seconds view
    upperExponent: 2.0, // Moderate acceleration
  },
  GENTLE: {
    breakpoint: 60,
    minScale: 4.0e-9,
    maxScale: 1.0e-2,
    upperExponent: 1.5, // Gentler acceleration
  },
  STEEP: {
    breakpoint: 40,
    minScale: 4.0e-9,
    maxScale: 1.0e-2,
    upperExponent: 2.5, // Steeper acceleration
  },
  EXTREME: {
    breakpoint: 30,
    minScale: 4.0e-9,
    maxScale: 5.0e-2, // Close to seconds
    upperExponent: 3.0, // Dramatic acceleration
  },
} as const;

/**
 * Simple, effective zoom curve calculator that maps linear input (0-100)
 * to appropriate scale factors for time-based visualizations.
 */
export class ZoomCurveCalculator {
  private config: ZoomCurveConfig;

  /**
   * Create a new zoom curve calculator
   * @param config Optional custom configuration (partial or complete) or preset name
   */
  constructor(config: Partial<ZoomCurveConfig> | keyof typeof ZOOM_PRESETS = {}) {
    if (typeof config === 'string' && config in ZOOM_PRESETS) {
      // If a preset name is provided, use that preset
      this.config = { ...ZOOM_PRESETS[config] };
    } else {
      // Otherwise, merge with defaults
      this.config = { ...ZOOM_PRESETS.DEFAULT, ...(config as Partial<ZoomCurveConfig>) };
    }
  }

  /**
   * Calculate scale factor from a zoom level (0-100)
   *
   * The scale factor determines how many time units (milliseconds) correspond to one pixel:
   * - Small scale values = highly zoomed in (few milliseconds per pixel)
   * - Large scale values = zoomed out (many milliseconds per pixel)
   *
   * @param zoomLevel Input zoom level (0-100)
   * @returns Scale factor (milliseconds per pixel)
   */
  calculateScale(zoomLevel: number): number {
    // Clamp zoom level to valid range
    const zoom = Math.max(0, Math.min(100, zoomLevel));
    const { breakpoint, minScale, maxScale, upperExponent } = this.config;

    // For the lower range (0 to breakpoint) - gentle exponential curve
    if (zoom <= breakpoint) {
      // Simple linear interpolation in log space
      // This maps zoom 0 -> minScale and zoom breakpoint -> midScale
      const logMinScale = Math.log10(minScale);
      const midScale = this.calculateMidScale();
      const logMidScale = Math.log10(midScale);

      const zoomProgress = zoom / breakpoint; // 0 to 1 as zoom goes from 0 to breakpoint
      const logScale = logMinScale + (logMidScale - logMinScale) * zoomProgress;

      return Math.pow(10, logScale);
    }
    // For the upper range (breakpoint to 100) - accelerated curve
    else {
      // Get the scale at the breakpoint (for continuity)
      const midScale = this.calculateMidScale();

      // Use a combined linear+quadratic function for smooth acceleration

      // Normalized progress from breakpoint to 100
      const zoomProgress = (zoom - breakpoint) / (100 - breakpoint);

      // This function smoothly transitions from linear to exponential
      // It ensures continuous acceleration without the "slowing down" period
      const acceleratedProgress =
        0.5 * zoomProgress + // Linear component (for continuity with the first half)
        0.5 * Math.pow(zoomProgress, 2); // Quadratic acceleration component

      // Interpolate in log space between midScale and maxScale
      const logMidScale = Math.log10(midScale);
      const logMaxScale = Math.log10(maxScale);
      const logScale = logMidScale + (logMaxScale - logMidScale) * acceleratedProgress;

      return Math.pow(10, logScale);
    }
  }

  /**
   * Calculate the scale at the breakpoint
   * This ensures continuity between the two segments of the curve
   * @private
   */
  private calculateMidScale(): number {
    // Set the midScale to be logarithmically halfway between minScale and maxScale
    const { minScale, maxScale } = this.config;
    const logMinScale = Math.log10(minScale);
    const logMaxScale = Math.log10(maxScale);

    // Linear interpolation in log space
    const logMidScale = logMinScale + (logMaxScale - logMinScale) * 0.5;

    return Math.pow(10, logMidScale);
  }

  /**
   * Calculate zoom level from a scale factor (inverse of calculateScale)
   *
   * @param scale Scale factor (milliseconds per pixel)
   * @returns Zoom level (0-100)
   */
  scaleToZoom(scale: number): number {
    // Clamp scale to valid range
    const clampedScale = Math.max(this.config.minScale, Math.min(this.config.maxScale, scale));
    const { breakpoint, minScale, maxScale } = this.config;
    const midScale = this.calculateMidScale();

    // Determine which segment of the curve this scale belongs to
    if (clampedScale <= midScale) {
      // Lower range (0 to breakpoint) - reverse linear interpolation in log space
      const logMinScale = Math.log10(minScale);
      const logMidScale = Math.log10(midScale);
      const logScale = Math.log10(clampedScale);

      const progress = (logScale - logMinScale) / (logMidScale - logMinScale);
      return progress * breakpoint;
    } else {
      // Upper range (breakpoint to 100) - reverse the accelerated curve
      const logMidScale = Math.log10(midScale);
      const logMaxScale = Math.log10(maxScale);
      const logScale = Math.log10(clampedScale);

      // Get the accelerated progress value
      const acceleratedProgress = (logScale - logMidScale) / (logMaxScale - logMidScale);

      // Reverse the acceleration formula: acceleratedProgress = 0.5 * progress + 0.5 * progress^2
      // This is a quadratic equation: 0.5 * progress^2 + 0.5 * progress - acceleratedProgress = 0
      // Using quadratic formula: progress = (-b + sqrt(b^2 - 4ac)) / 2a
      // where a = 0.5, b = 0.5, c = -acceleratedProgress
      const a = 0.5;
      const b = 0.5;
      const c = -acceleratedProgress;
      const discriminant = b * b - 4 * a * c;

      // We want the positive root
      const progress = (-b + Math.sqrt(discriminant)) / (2 * a);

      return breakpoint + progress * (100 - breakpoint);
    }
  }

  /**
   * Get the current configuration
   * @returns Deep copy of the current configuration
   */
  getConfig(): ZoomCurveConfig {
    return { ...this.config };
  }

  /**
   * Update configuration with new values
   * @param newConfig Partial or complete configuration update
   */
  updateConfig(newConfig: Partial<ZoomCurveConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Set configuration to a named preset
   * @param presetName Name of the preset to use
   */
  usePreset(presetName: keyof typeof ZOOM_PRESETS): void {
    this.config = { ...ZOOM_PRESETS[presetName] };
  }

  /**
   * Generate scale values for a range of zoom levels
   * Useful for analysis and visualization of the zoom curve
   *
   * @param steps Number of sample points to generate
   * @returns Array of [zoomLevel, scaleValue] pairs
   */
  generateCurveData(steps: number = 100): [number, number][] {
    const data: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const zoom = (i / steps) * 100;
      const scale = this.calculateScale(zoom);
      data.push([zoom, scale]);
    }
    return data;
  }

  /**
   * Verify that calculateScale and scaleToZoom are proper inverses
   * Useful for debugging zoom curve issues
   * @returns true if functions are proper inverses within tolerance
   */
  verifyInverseFunctions(tolerance: number = 0.01): boolean {
    let allPassed = true;

    // Test zoom -> scale -> zoom
    for (let zoom = 0; zoom <= 100; zoom += 5) {
      const scale = this.calculateScale(zoom);
      const reversedZoom = this.scaleToZoom(scale);
      const diff = Math.abs(zoom - reversedZoom);

      if (diff > tolerance) {
        console.warn(
          `Zoom curve inverse mismatch: zoom ${zoom} -> scale ${scale} -> zoom ${reversedZoom} (diff: ${diff})`,
        );
        allPassed = false;
      }
    }

    // Test scale -> zoom -> scale
    const testScales = [1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1, 1, 10, 100, 1000];
    for (const scale of testScales) {
      if (scale >= this.config.minScale && scale <= this.config.maxScale) {
        const zoom = this.scaleToZoom(scale);
        const reversedScale = this.calculateScale(zoom);
        const relDiff = Math.abs(scale - reversedScale) / scale;

        if (relDiff > tolerance) {
          console.warn(
            `Zoom curve inverse mismatch: scale ${scale} -> zoom ${zoom} -> scale ${reversedScale} (rel diff: ${relDiff})`,
          );
          allPassed = false;
        }
      }
    }

    return allPassed;
  }
}

/**
 * Create a new zoom curve calculator with the default configuration
 * @returns A new ZoomCurveCalculator instance
 */
export function createDefaultZoomCurve(): ZoomCurveCalculator {
  return new ZoomCurveCalculator('DEFAULT');
}

/**
 * Utility function to get appropriate time unit label based on scale
 * @param scale The current scale factor (milliseconds per pixel)
 * @returns Human-readable description of the visible time range
 */
export function getTimeUnitForScale(scale: number): string {
  if (scale < 1e-6) return 'Milliseconds';
  if (scale < 1e-5) return 'Seconds';
  if (scale < 1e-4) return 'Minutes';
  if (scale < 5e-4) return 'Hours'; // Require higher zoom level for hours
  if (scale < 1.2e-2) return 'Days'; // Extended range for days
  if (scale < 5e-2) return 'Weeks';
  if (scale < 1e-1) return 'Months';
  if (scale < 5e-1) return 'Quarters';
  return 'Years';
}
