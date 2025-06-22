/**
 * TimeAxisRenderer.ts
 *
 * Implements the timescale system from TIMESCALE_SYSTEM.md.
 * Provides precise time-based grid line generation and label formatting.
 * Ensures accurate representation of time units across all scales.
 */

import { TimeUnit } from './TimeUnits';
import { MS_PER_DAY } from './constants';

// Represents a grid line on the time axis
export interface TimeAxisGridLine {
  time: number; // Timestamp in milliseconds
  screenX: number; // Pixel position
  primaryLabel: string; // Formatted primary label (top row)
  secondaryLabel: string; // Formatted secondary label (bottom row)
  isMajor: boolean; // Whether this is a major grid line
  shouldShowLabel: boolean; // Whether label should be displayed
}

// Time level within a unit (for adjusting density)
export enum TimeLevel {
  Level1 = 1, // Finest density (e.g., every 5 seconds)
  Level2 = 2, // Medium density (e.g., every 15 seconds)
  Level3 = 3, // Coarse density (e.g., every 30 seconds)
}

// Configuration for the time axis renderer
export interface TimeAxisConfig {
  labelFontSize: number;
  labelPrimaryColor: string;
  labelSecondaryColor: string;
  gridMajorColor: string;
  gridMinorColor: string;
  gridMajorLineWidth?: number;
  gridMinorLineWidth?: number;
  gridMajorTimelineTickSize?: number;
  gridMinorTimelineTickSize?: number;
}

// Default configuration
const DEFAULT_CONFIG: TimeAxisConfig = {
  labelFontSize: 12,
  labelPrimaryColor: '#333333',
  labelSecondaryColor: '#777777',
  gridMajorColor: '#E0E0E0',
  gridMinorColor: '#F0F0F0', // Fixed: was '#000000' which was causing styling issues
  gridMajorLineWidth: 1,
  gridMinorLineWidth: 0.5,
  gridMajorTimelineTickSize: 10, // Draw as 10px ticks at the bottom
  gridMinorTimelineTickSize: 0, // Draw full height by default
};

/**
 * Manages time axis rendering with accurate time unit grid lines and two-row labels.
 * Implements the precise time-based grid generation system from TIMESCALE_SYSTEM.md.
 */
export class TimeAxisRenderer {
  private config: TimeAxisConfig;
  private pixelRatio: number = 1;

  // Cache grid line results for performance
  private static gridLineCache: {
    [key: string]: {
      majorGridLines: TimeAxisGridLine[];
      subgridLines: TimeAxisGridLine[];
      timestamp: number;
    };
  } = {};
  
  /**
   * Clear the grid line cache
   * This is useful when grid styling has changed and we need to regenerate all grid lines
   */
  static clearCache(): void {
    TimeAxisRenderer.gridLineCache = {};
  }

  /**
   * Create a new time axis renderer
   * @param config Optional configuration overrides
   * @param pixelRatio Device pixel ratio for DPI-aware rendering
   */
  constructor(config: Partial<TimeAxisConfig> = {}, pixelRatio: number = 1) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.pixelRatio = pixelRatio;
  }

  /**
   * Get the appropriate time unit and level based on pixels per day
   * @param pixelsPerDay How many pixels represent one day at current zoom
   * @returns The most appropriate time unit and level for the current zoom
   */
  static getTimeUnitAndLevel(pixelsPerDay: number): { unit: TimeUnit; level: TimeLevel } {
    // Convert to integer for more stable comparisons
    const pixelsPerDayInt = Math.round(pixelsPerDay);

    if (pixelsPerDayInt >= 1000000) return { unit: TimeUnit.Second, level: TimeLevel.Level1 };

    // Minutes views - much higher thresholds to delay transition from hours
    if (pixelsPerDayInt >= 200000) return { unit: TimeUnit.Minute, level: TimeLevel.Level1 };
    if (pixelsPerDayInt >= 50000) return { unit: TimeUnit.Minute, level: TimeLevel.Level2 };
    if (pixelsPerDayInt >= 15000) return { unit: TimeUnit.Minute, level: TimeLevel.Level3 };

    // Hours views
    if (pixelsPerDayInt >= 2000) return { unit: TimeUnit.Hour, level: TimeLevel.Level1 };
    if (pixelsPerDayInt >= 850) return { unit: TimeUnit.Hour, level: TimeLevel.Level2 };
    if (pixelsPerDayInt >= 300) return { unit: TimeUnit.Hour, level: TimeLevel.Level3 };

    // Days views
    if (pixelsPerDayInt >= 100) return { unit: TimeUnit.Day, level: TimeLevel.Level1 };
    if (pixelsPerDayInt >= 45) return { unit: TimeUnit.Day, level: TimeLevel.Level2 };

    // Week view (replacing Day Level3)
    if (pixelsPerDayInt >= 20) return { unit: TimeUnit.Week, level: TimeLevel.Level1 };

    // Months views
    if (pixelsPerDayInt >= 4) return { unit: TimeUnit.Month, level: TimeLevel.Level1 };
    if (pixelsPerDayInt >= 1) return { unit: TimeUnit.Month, level: TimeLevel.Level2 };

    // Year views
    if (pixelsPerDayInt >= 0.6) return { unit: TimeUnit.Year, level: TimeLevel.Level1 };
    // Most zoomed out - years view as default fallback
    return { unit: TimeUnit.Year, level: TimeLevel.Level2 };
  }

  /**
   * Gets the appropriate time intervals for grid lines based on time unit and level
   * Following the TIMESCALE_SYSTEM.md document but adjusted to maintain good visual balance
   *
   * The system works as follows:
   * 1. Each time unit (Second, Minute, Hour, etc.) has configurations for different density levels
   * 2. For each combination, we define two values:
   *    - majorInterval: How many units between labeled grid lines (e.g., every 5 seconds)
   *    - subgridInterval: How many units between unlabeled subgrid lines
   * 3. When generating grid lines:
   *    - If majorInterval is 1, subgrid uses the next smaller time unit (e.g., minutes for hour)
   *    - If majorInterval > 1, subgrid uses the same time unit with a smaller interval
   *
   * This maintains proper temporal relationships while ensuring visual clarity at all zoom levels.
   *
   * @param timeUnit The time unit to use for major grid lines (Second, Minute, Hour, etc.)
   * @param level The detail level within the time unit (Level1, Level2, Level3)
   * @returns Configuration with majorInterval and subgridInterval values
   */
  private getTimeIntervals(
    timeUnit: TimeUnit,
    level: TimeLevel,
  ): { majorInterval: number; subgridInterval: number } {
    switch (timeUnit) {
      case TimeUnit.Second:
        return { majorInterval: 5, subgridInterval: 1 };

      case TimeUnit.Minute:
        if (level === TimeLevel.Level1) return { majorInterval: 1, subgridInterval: 15 };
        if (level === TimeLevel.Level2) return { majorInterval: 5, subgridInterval: 1 };
        return { majorInterval: 15, subgridInterval: 5 };

      case TimeUnit.Hour:
        if (level === TimeLevel.Level1) return { majorInterval: 1, subgridInterval: 15 };
        if (level === TimeLevel.Level2) return { majorInterval: 3, subgridInterval: 1 };
        return { majorInterval: 6, subgridInterval: 2 };

      case TimeUnit.Day:
        if (level === TimeLevel.Level1) return { majorInterval: 1, subgridInterval: 6 };
        if (level === TimeLevel.Level2) return { majorInterval: 1, subgridInterval: 0 };
        return { majorInterval: 2, subgridInterval: 1 };

      case TimeUnit.Week:
        return { majorInterval: 1, subgridInterval: 1 }; // 1 week major, 1 day subgrid (with Day time unit)

      case TimeUnit.Month:
        if (level === TimeLevel.Level1) return { majorInterval: 1, subgridInterval: 7 }; // 1 month major, 1 week subgrid
        return { majorInterval: 3, subgridInterval: 1 }; // 3 month major, 1 month subgrid

      case TimeUnit.Year:
        if (level === TimeLevel.Level1) return { majorInterval: 1, subgridInterval: 4 }; // 1 year major, 3 month subgrid
        return { majorInterval: 3, subgridInterval: 1 }; // 5 year major, 1 year subgrid

      default:
        return { majorInterval: 1, subgridInterval: 0 };
    }
  }

  /**
   * Get time unit and level based on milliseconds per pixel
   * Useful when working directly with matrix scale
   */
  static getTimeUnitAndLevelFromScale(msPerPixel: number): { unit: TimeUnit; level: TimeLevel } {
    // The number of milliseconds in a day
    // MS_PER_DAY imported from constants

    // Convert to pixels per day to use the existing logic
    const pixelsPerDay = MS_PER_DAY / msPerPixel;
    return TimeAxisRenderer.getTimeUnitAndLevel(pixelsPerDay);
  }

  /**
   * Generate grid lines for the time axis with proper caching
   * @param startTime Start of visible range in ms
   * @param endTime End of visible range in ms
   * @param timeUnit Time unit to use for major grid lines
   * @param level Detail level within the time unit
   * @param transformFn Function to convert time to screen position
   * @param minPixelsBetweenLabels Minimum pixels required between labels
   * @returns Major grid lines and subgrid lines
   */
  generateGridLines(
    startTime: number,
    endTime: number,
    timeUnit: TimeUnit,
    level: TimeLevel,
    transformFn: (time: number) => number,
    minPixelsBetweenLabels: number = 40,
  ): { majorGridLines: TimeAxisGridLine[]; subgridLines: TimeAxisGridLine[] } {
    // Use a simple cache key based on rounded time values
    // This helps reduce regeneration of grid lines during small pan movements
    const timeRange = endTime - startTime;
    const cacheWindow = Math.max(5000, timeRange * 0.5); // 50% of visible range or at least 5 seconds

    // Round time range to reduce cache misses during small panning movements
    const roundedStart = Math.floor(startTime / cacheWindow) * cacheWindow;
    const roundedEnd = Math.ceil(endTime / cacheWindow) * cacheWindow;

    // Create cache key - only depends on the rounded time boundaries and unit/level
    const cacheKey = `${roundedStart}_${roundedEnd}_${timeUnit}_${level}`;

    // Check if we have a cached result
    const now = performance.now();
    const cachedResult = TimeAxisRenderer.gridLineCache[cacheKey];
    if (cachedResult && now - cachedResult.timestamp < 3000) {
      // Cache valid for 3 seconds
      // Update screen positions for cached grid lines
      cachedResult.majorGridLines.forEach((line) => (line.screenX = transformFn(line.time)));
      cachedResult.subgridLines.forEach((line) => (line.screenX = transformFn(line.time)));

      // Always recalculate label visibility to update based on new screen positions
      this.updateLabelVisibility(cachedResult.majorGridLines, minPixelsBetweenLabels);

      return {
        majorGridLines: cachedResult.majorGridLines,
        subgridLines: cachedResult.subgridLines,
      };
    }

    // Get time intervals for this unit and level
    const { majorInterval, subgridInterval } = this.getTimeIntervals(timeUnit, level);

    // Generate major and subgrid lines using time-unit based approach
    const { majorGridLines, subgridLines } = this.generateGridLinesForTimeUnit(
      startTime,
      endTime,
      timeUnit,
      level,
      majorInterval,
      subgridInterval,
      transformFn,
    );

    // Update label visibility based on available space
    this.updateLabelVisibility(majorGridLines, minPixelsBetweenLabels);

    // Cache the results
    TimeAxisRenderer.gridLineCache[cacheKey] = {
      majorGridLines,
      subgridLines,
      timestamp: now,
    };

    // Clean old cache entries (older than 10 seconds)
    if (now % 1000 < 20) {
      Object.keys(TimeAxisRenderer.gridLineCache).forEach((key) => {
        if (now - TimeAxisRenderer.gridLineCache[key].timestamp > 10000) {
          delete TimeAxisRenderer.gridLineCache[key];
        }
      });
    }

    return { majorGridLines, subgridLines };
  }

  /**
   * Generate time-based grid lines using actual time units
   * This follows the approach described in TIMESCALE_SYSTEM.md
   */
  private generateGridLinesForTimeUnit(
    startTime: number,
    endTime: number,
    timeUnit: TimeUnit,
    level: TimeLevel,
    majorInterval: number,
    subgridInterval: number,
    transformFn: (time: number) => number,
  ): { majorGridLines: TimeAxisGridLine[]; subgridLines: TimeAxisGridLine[] } {
    const majorGridLines: TimeAxisGridLine[] = [];
    const subgridLines: TimeAxisGridLine[] = [];

    // Generate major grid lines at natural time boundaries
    const majorDate = new Date(startTime);
    this.snapToTimeUnitBoundary(majorDate, timeUnit, majorInterval);

    // Track the first label to add year context
    let isFirstLabel = true;

    // Generate all major grid lines for the visible range
    while (majorDate.getTime() <= endTime) {
      const time = majorDate.getTime();
      const screenX = transformFn(time);

      // Check if this is at a significant boundary (start of month, year)
      const isYearBoundary = majorDate.getMonth() === 0 && majorDate.getDate() === 1;
      const isMonthBoundary = majorDate.getDate() === 1;

      // Format the labels appropriate for this time unit
      const labels = this.formatTimeLabels(
        majorDate,
        timeUnit,
        isYearBoundary,
        isMonthBoundary,
        isFirstLabel,
      );

      majorGridLines.push({
        time,
        screenX,
        primaryLabel: labels.primaryLabel,
        secondaryLabel: labels.secondaryLabel,
        isMajor: true,
        shouldShowLabel: true, // Will be updated later based on spacing
      });

      // Move to next major interval using proper date arithmetic
      this.advanceTimeUnitByInterval(majorDate, timeUnit, majorInterval);
      isFirstLabel = false;
    }

    // Generate subgrid lines at appropriate intervals (but only if subgridInterval > 0)
    if (subgridInterval > 0) {
      // First, handle subgrid lines between major grid lines
      for (let i = 0; i < majorGridLines.length - 1; i++) {
        const majorStart = majorGridLines[i].time;
        const majorEnd = majorGridLines[i + 1].time;

        // Create a date object for the subgrid starting point
        const subgridDate = new Date(majorStart);

        // Special case for Week time unit - always use Day as subgrid unit
        // For other time units, only use smaller time unit if majorInterval is 1
        // This follows the guideline to respect natural time boundaries
        const subgridTimeUnit =
          timeUnit === TimeUnit.Week
            ? TimeUnit.Day
            : majorInterval === 1
              ? this.getSubgridTimeUnit(timeUnit)
              : timeUnit;

        // Advance from start point by the subgrid interval
        this.advanceTimeUnitByInterval(subgridDate, subgridTimeUnit, subgridInterval);

        while (subgridDate.getTime() < majorEnd) {
          const time = subgridDate.getTime();
          subgridLines.push({
            time,
            screenX: transformFn(time),
            primaryLabel: '', // Subgrid lines don't have labels
            secondaryLabel: '',
            isMajor: false,
            shouldShowLabel: false,
          });

          // Move to next subgrid interval
          this.advanceTimeUnitByInterval(subgridDate, subgridTimeUnit, subgridInterval);
        }
      }

      // Then, handle subgrid lines after the last major grid line up to the end time
      if (majorGridLines.length > 0) {
        const lastMajorTime = majorGridLines[majorGridLines.length - 1].time;

        // Create a date object for the subgrid starting point (last major grid line)
        const subgridDate = new Date(lastMajorTime);

        // Special case for Week time unit - always use Day as subgrid unit
        // For other time units, only use smaller time unit if majorInterval is 1
        const subgridTimeUnit =
          timeUnit === TimeUnit.Week
            ? TimeUnit.Day
            : majorInterval === 1
              ? this.getSubgridTimeUnit(timeUnit)
              : timeUnit;

        // Advance from the last major grid line by the subgrid interval
        this.advanceTimeUnitByInterval(subgridDate, subgridTimeUnit, subgridInterval);

        // Generate subgrid lines up to the end of the visible range
        while (subgridDate.getTime() <= endTime) {
          const time = subgridDate.getTime();
          subgridLines.push({
            time,
            screenX: transformFn(time),
            primaryLabel: '', // Subgrid lines don't have labels
            secondaryLabel: '',
            isMajor: false,
            shouldShowLabel: false,
          });

          // Move to next subgrid interval
          this.advanceTimeUnitByInterval(subgridDate, subgridTimeUnit, subgridInterval);
        }
      }
    }

    return { majorGridLines, subgridLines };
  }

  /**
   * Returns the appropriate subgrid time unit based on major time unit
   */
  private getSubgridTimeUnit(majorTimeUnit: TimeUnit): TimeUnit {
    switch (majorTimeUnit) {
      case TimeUnit.Year:
        return TimeUnit.Month; // Use Month for Year subgrid
      case TimeUnit.Month:
        return TimeUnit.Day;
      case TimeUnit.Week:
        return TimeUnit.Day; // Week uses Day for subgrid
      case TimeUnit.Day:
        return TimeUnit.Hour;
      case TimeUnit.Hour:
        return TimeUnit.Minute;
      case TimeUnit.Minute:
      case TimeUnit.Second:
        return TimeUnit.Second;
      default:
        return majorTimeUnit;
    }
  }

  /**
   * Advances a date by a specific interval in the given time unit
   * Uses proper date arithmetic to handle month/year boundaries correctly
   */
  private advanceTimeUnitByInterval(date: Date, timeUnit: TimeUnit, interval: number): void {
    switch (timeUnit) {
      case TimeUnit.Second:
        date.setSeconds(date.getSeconds() + interval);
        break;
      case TimeUnit.Minute:
        date.setMinutes(date.getMinutes() + interval);
        break;
      case TimeUnit.Hour:
        date.setHours(date.getHours() + interval);
        break;
      case TimeUnit.Day:
        date.setDate(date.getDate() + interval);
        break;
      case TimeUnit.Week:
        date.setDate(date.getDate() + interval * 7); // 7 days per week
        break;
      case TimeUnit.Month:
        date.setMonth(date.getMonth() + interval);
        break;
      case TimeUnit.Year:
        date.setFullYear(date.getFullYear() + interval);
        break;
    }
  }

  /**
   * Snaps a date to the nearest time unit boundary
   */
  private snapToTimeUnitBoundary(date: Date, timeUnit: TimeUnit, interval: number): void {
    switch (timeUnit) {
      case TimeUnit.Second:
        date.setMilliseconds(0);
        date.setSeconds(Math.floor(date.getSeconds() / interval) * interval);
        break;
      case TimeUnit.Minute:
        date.setMilliseconds(0);
        date.setSeconds(0);
        date.setMinutes(Math.floor(date.getMinutes() / interval) * interval);
        break;
      case TimeUnit.Hour:
        date.setMilliseconds(0);
        date.setSeconds(0);
        date.setMinutes(0);
        date.setHours(Math.floor(date.getHours() / interval) * interval);
        break;
      case TimeUnit.Day:
        date.setMilliseconds(0);
        date.setSeconds(0);
        date.setMinutes(0);
        date.setHours(0);
        if (interval > 1) {
          // For intervals like every 2 days
          const daysSinceEpoch = Math.floor(date.getTime() / (24 * 60 * 60 * 1000));
          const intervalDays = Math.floor(daysSinceEpoch / interval) * interval;
          date.setTime(intervalDays * 24 * 60 * 60 * 1000);
        }
        break;
      case TimeUnit.Week:
        // Snap to the start of the week (Sunday)
        date.setMilliseconds(0);
        date.setSeconds(0);
        date.setMinutes(0);
        date.setHours(0);

        // Get the current day of the week (0 = Sunday, 1 = Monday, etc.)
        const dayOfWeek = date.getDay();

        // Calculate the date of the previous Sunday
        date.setDate(date.getDate() - dayOfWeek);

        if (interval > 1) {
          // For multiple week intervals
          const weeksSinceEpoch = Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
          const intervalWeeks = Math.floor(weeksSinceEpoch / interval) * interval;
          date.setTime(intervalWeeks * 7 * 24 * 60 * 60 * 1000);
        }
        break;
      case TimeUnit.Month:
        date.setMilliseconds(0);
        date.setSeconds(0);
        date.setMinutes(0);
        date.setHours(0);
        date.setDate(1);
        date.setMonth(Math.floor(date.getMonth() / interval) * interval);
        break;
      case TimeUnit.Year:
        date.setMilliseconds(0);
        date.setSeconds(0);
        date.setMinutes(0);
        date.setHours(0);
        date.setDate(1);
        date.setMonth(0);
        if (interval > 1) {
          date.setFullYear(Math.floor(date.getFullYear() / interval) * interval);
        }
        break;
    }
  }

  /**
   * Format time values for display based on the time unit
   * Includes year context only for days and higher units or at boundaries
   */
  private formatTimeLabels(
    date: Date,
    unit: TimeUnit,
    isYearBoundary: boolean,
    isMonthBoundary: boolean,
    isFirstLabel: boolean,
  ): { primaryLabel: string; secondaryLabel: string } {
    const year = date.getFullYear();
    const shortYear = (year % 100).toString().padStart(2, '0');
    const month = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ][date.getMonth()];
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    // Determine if we should show year for this label
    const showYearForTimeUnits = isYearBoundary || isMonthBoundary || isFirstLabel;

    switch (unit) {
      case TimeUnit.Second:
        return {
          primaryLabel: `${hours}:${minutes}:${seconds}`,
          secondaryLabel: showYearForTimeUnits ? `${day}/${month}/${shortYear}` : `${day}/${month}`,
        };

      case TimeUnit.Minute:
        return {
          primaryLabel: `${hours}:${minutes}`,
          secondaryLabel: showYearForTimeUnits ? `${day}/${month}/${shortYear}` : `${day}/${month}`,
        };

      case TimeUnit.Hour:
        return {
          primaryLabel: `${hours}:00`,
          secondaryLabel: showYearForTimeUnits ? `${day}/${month}/${shortYear}` : `${day}/${month}`,
        };

      case TimeUnit.Day:
        // Always include year for day unit
        return {
          primaryLabel: day,
          secondaryLabel: `${month}/${shortYear}`,
        };

      case TimeUnit.Week:
        // For week unit, show the date of the week start (Sunday)
        // and include month/year in secondary label
        return {
          primaryLabel: day, // Show the day number (date of the Sunday)
          secondaryLabel: `${month}/${shortYear}`,
        };

      case TimeUnit.Month:
        return {
          primaryLabel: month,
          secondaryLabel: year.toString(),
        };

      case TimeUnit.Year:
        return {
          primaryLabel: year.toString(),
          secondaryLabel: '',
        };

      default:
        return { primaryLabel: '', secondaryLabel: '' };
    }
  }

  /**
   * Update which labels should be displayed based on available space
   * Shows all visible major grid line labels, but prevents overlaps
   */
  private updateLabelVisibility(
    gridLines: TimeAxisGridLine[],
    minPixelsBetweenLabels: number,
  ): void {
    if (gridLines.length === 0) return;

    // First, mark all labels as potentially visible
    gridLines.forEach((line) => (line.shouldShowLabel = true));

    // Simple left-to-right pass to prevent overlaps
    let lastVisibleX = -Infinity;

    // Check for time labels for priority determination
    const isTimeLabel = gridLines[0].primaryLabel.includes(':');

    // Get the base spacing value from the input parameter
    // No need to apply additional multipliers as this is already done in the CanvasRenderer
    const spacing = minPixelsBetweenLabels;

    // Simple left-to-right greedy algorithm
    for (let i = 0; i < gridLines.length; i++) {
      const line = gridLines[i];

      // Always show first and last labels
      const isFirstOrLast = i === 0 || i === gridLines.length - 1;

      // Also prioritize key time boundaries (hours, month starts, year starts)
      const isPriorityLabel =
        isFirstOrLast ||
        (isTimeLabel && line.primaryLabel.endsWith(':00')) || // Hour boundary
        line.primaryLabel === '01' ||
        line.primaryLabel === '1'; // Month/day start

      if (isPriorityLabel) {
        // Priority labels are always shown
        line.shouldShowLabel = true;
        lastVisibleX = line.screenX;
      } else if (line.screenX - lastVisibleX < spacing) {
        // Hide this label if it would overlap with the previous one
        line.shouldShowLabel = false;
      } else {
        // Show this label and update the last visible position
        lastVisibleX = line.screenX;
      }
    }
  }

  /**
   * Render the time axis on a canvas context
   */
  renderTimeAxis(
    context: CanvasRenderingContext2D,
    majorGridLines: TimeAxisGridLine[],
    subgridLines: TimeAxisGridLine[],
    width: number,
    height: number,
  ): void {
    // Clear and set background
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, width, height);

    // Calculate label positions
    const primaryY = height * 0.25;
    const secondaryY = height * 0.7;

    // Use the configured tick sizes
    const minorTickSize = this.config.gridMinorTimelineTickSize || 0;
    const majorTickSize = this.config.gridMajorTimelineTickSize || 10;

    // Calculate start positions based on tick sizes
    const minorTickStart = minorTickSize > 0 ? height - minorTickSize : 0;
    const majorTickStart = majorTickSize > 0 ? height - majorTickSize : 0;

    // 1. Render subgrid lines (lightest color, thinnest)
    context.beginPath();
    subgridLines.forEach((gridLine) => {
      // Check if in visible range to avoid drawing off-screen
      // Using slightly wider range ensures grid lines at the edges render properly
      if (gridLine.screenX >= -2 && gridLine.screenX <= width + 2) {
        // Draw either full height or as tick at the bottom based on configuration
        context.moveTo(gridLine.screenX, minorTickStart);
        context.lineTo(gridLine.screenX, height);
      }
    });
    // Ensure we're using the configured color, not the default
    context.strokeStyle = this.config.gridMinorColor;
    context.lineWidth = this.config.gridMinorLineWidth || 0.5;
    context.stroke();

    // 2. Render major grid lines (medium color, medium thickness)
    context.beginPath();
    majorGridLines.forEach((gridLine) => {
      // Using slightly wider range ensures grid lines at the edges render properly
      if (gridLine.screenX >= -2 && gridLine.screenX <= width + 2) {
        // Draw either full height or as tick at the bottom based on configuration
        context.moveTo(gridLine.screenX, majorTickStart);
        context.lineTo(gridLine.screenX, height);
      }
    });
    context.strokeStyle = this.config.gridMajorColor;
    context.lineWidth = this.config.gridMajorLineWidth || 1;
    context.stroke();

    // 4. Render two-row labels for major grid lines
    context.textAlign = 'center';
    
    // Dynamic font sizing based on device pixel ratio
    let baseFontSize = this.config.labelFontSize;
    
    // Much more aggressive reduction for high-DPI displays
    if (this.pixelRatio >= 2) {
      baseFontSize = 6.5;  // Very small for Retina displays
    } else if (this.pixelRatio > 1.5) {
      baseFontSize = 9;
    } else if (this.pixelRatio > 1) {
      baseFontSize = 10.5;
    }
    
    const primaryFontSize = baseFontSize;
    const secondaryFontSize = baseFontSize - 1;
    
    majorGridLines.forEach((gridLine) => {
      // Slightly wider range to ensure labels at the edges are visible
      if (gridLine.screenX >= -5 && gridLine.screenX <= width + 5 && gridLine.shouldShowLabel) {
        // Primary label (top row)
        context.font = `bold ${primaryFontSize}px Arial, sans-serif`;
        context.fillStyle = this.config.labelPrimaryColor;
        context.fillText(gridLine.primaryLabel, gridLine.screenX, primaryY);

        // Secondary label (bottom row)
        if (gridLine.secondaryLabel) {
          context.font = `${secondaryFontSize}px Arial, sans-serif`;
          context.fillStyle = this.config.labelSecondaryColor;
          context.fillText(gridLine.secondaryLabel, gridLine.screenX, secondaryY);
        }
      }
    });

    // Draw bottom border
    context.beginPath();
    context.moveTo(0, height - 0.5);
    context.lineTo(width, height - 0.5);
    context.strokeStyle = this.config.gridMajorColor;
    context.lineWidth = this.config.gridMajorLineWidth || 1;
    context.stroke();
  }
}
