# Gantt Chart Timescale System

## Overview

The timescale system automatically renders chronological information in a Gantt chart with varying levels of detail based solely on the current zoom level. It provides smooth transitions between different time units (years to seconds) and ensures context-rich visualization at every zoom level. The system follows mathematical principles to maintain precise time boundaries and optimizes rendering for performance.

## Core Design Principles

1. **Automatic Level Selection** - System determines appropriate time units and granularity based only on zoom level
2. **Two-Row Layout** - Strictly uses two lines of text (primary and context label) to minimize vertical space
3. **Hierarchical Time Display** - Always provide contextual information about time
4. **Smooth Transitions** - Uses hysteresis to prevent oscillation between levels during zoom operations
5. **Boundary Precision** - Respects natural time boundaries (days, months, years)
6. **Visual Clarity** - Prevents label overlap and ensures readability

## Time Unit Hierarchy

The system organizes time in a hierarchical structure with multiple levels within each time unit:

```
Year → Quarter → Month → Day → Hour → Minute → Second
```

## Automatic Zoom Level Mappings

The system automatically selects the appropriate time unit and level based on the available pixel density:

| Pixels Per Day | Time Unit | Display Level | Primary Label | Secondary Label | Grid Lines | Subgrid Lines |
| -------------- | --------- | ------------- | ------------- | --------------- | ---------- | ------------- |
| ≥ 20000        | Second    | Level 1       | HH:MM:SS      | DD/MMM          | Every 5s   | Every 1s      |
| ≥ 10000        | Second    | Level 2       | HH:MM:SS      | DD/MMM          | Every 15s  | Every 5s      |
| ≥ 6000         | Second    | Level 3       | HH:MM:SS      | DD/MMM          | Every 30s  | Every 10s     |
| ≥ 3500         | Minute    | Level 1       | HH:MM         | DD/MMM          | Every 5m   | Every 1m      |
| ≥ 2000         | Minute    | Level 2       | HH:MM         | DD/MMM          | Every 15m  | Every 5m      |
| ≥ 1200         | Minute    | Level 3       | HH:MM         | DD/MMM          | Every 30m  | Every 10m     |
| ≥ 800          | Hour      | Level 1       | HH:00         | DD/MMM          | Every 1h   | Every 15m     |
| ≥ 400          | Hour      | Level 2       | HH:00         | DD/MMM          | Every 3h   | Every 1h      |
| ≥ 200          | Hour      | Level 3       | HH:00         | DD/MMM          | Every 6h   | Every 2h      |
| ≥ 80           | Day       | Level 1       | DD            | MMM/YY          | Every 1d   | Every 6h      |
| ≥ 45           | Day       | Level 2       | DD            | MMM/YY          | Every 2d   | Every 1d      |
| ≥ 20           | Day       | Level 3       | DD            | MMM/YY          | Every 7d   | Every 1d      |
| ≥ 6            | Month     | Level 1       | MMM           | YYYY            | Every 1m   | Every 1d      |
| ≥ 3            | Month     | Level 2       | MMM           | YYYY            | Every 6m   | Every 1m      |
| ≥ 1.2          | Quarter   | Level 1       | Q#            | YYYY            | Every 1q   | Every 1m      |
| ≥ 0.8          | Year      | Level 1       | YYYY          | -               | Every 1y   | Every 1m      |
| ≥ 0.3          | Year      | Level 1       | YYYY          | -               | Every 1y   | Every 6m      |

## Compact Two-Row Format with Subgrid Lines

Each level displays time information using a consistent compact two-row format, with unlabeled subgrid lines in between major grid lines:

1. **Top Row (Primary)**: Shows the current time unit value (e.g., hour, day, month, year)
2. **Bottom Row (Secondary)**: Shows contextual information (date for time values, year for higher units)
3. **Subgrid Lines**: Thinner, unlabeled lines at reasonable fractions between major grid lines

### Visual Examples of Two-Row Layout with Subgrid Lines

**Seconds View (Every 5s with 1s subgrid):**

```
15:00:05   15:00:10   15:00:15   15:00:20   15:00:25
 01/Jan     01/Jan     01/Jan     01/Jan     01/Jan
    |          |          |          |          |
    ¦ ¦ ¦ ¦    ¦ ¦ ¦ ¦    ¦ ¦ ¦ ¦    ¦ ¦ ¦ ¦    ¦
```

**Minutes View (Every 5m with 1m subgrid):**

```
15:05     15:10     15:15     15:20     15:25
01/Jan    01/Jan    01/Jan    01/Jan    01/Jan
  |         |         |         |         |
  ¦ ¦ ¦ ¦   ¦ ¦ ¦ ¦   ¦ ¦ ¦ ¦   ¦ ¦ ¦ ¦   ¦
```

**Hours View (Every 1h with 15m subgrid):**

```
00:00     01:00     02:00     03:00     04:00
01/Jan    01/Jan    01/Jan    01/Jan    01/Jan
  |         |         |         |         |
  ¦ ¦ ¦     ¦ ¦ ¦     ¦ ¦ ¦     ¦ ¦ ¦     ¦
```

**Days View (Every 1d with 6h subgrid):**

```
 01       02       03       04       05
Jan/24   Jan/24   Jan/24   Jan/24   Jan/24
  |        |        |        |        |
  ¦ ¦ ¦    ¦ ¦ ¦    ¦ ¦ ¦    ¦ ¦ ¦    ¦
```

**Months View (Every 1m with 1d subgrid):**

```
 Jan      Feb      Mar      Apr      May
 2024     2024     2024     2024     2024
   |        |        |        |        |
   ¦ ¦ ¦    ¦ ¦ ¦    ¦ ¦ ¦    ¦ ¦ ¦    ¦
```

**Years View (Every 1y with quarterly subgrid):**

```
 2024     2025     2026     2027     2028
   |        |        |        |        |
   ¦ ¦ ¦    ¦ ¦ ¦    ¦ ¦ ¦    ¦ ¦ ¦    ¦
```

## Subgrid Line Generation

The system generates appropriate unlabeled subgrid lines using actual time units rather than fractional divisions. This ensures precise temporal alignment and accurate representation of time intervals:

| Time Unit | Major Grid | Subgrid Lines     | Rationale                                |
| --------- | ---------- | ----------------- | ---------------------------------------- |
| Second    | Every 5s   | Every 1s          | Natural second divisions                 |
| Second    | Every 15s  | Every 5s          | Standard 5-second intervals              |
| Second    | Every 30s  | Every 10s         | Standard 10-second intervals             |
| Minute    | Every 5m   | Every 1m          | Natural minute divisions                 |
| Minute    | Every 15m  | Every 5m          | Standard 5-minute intervals              |
| Minute    | Every 30m  | Every 10m         | Standard 10-minute intervals             |
| Hour      | Every 1h   | Every 15m         | Quarter-hour standard intervals          |
| Hour      | Every 3h   | Every 1h          | Natural hour divisions                   |
| Hour      | Every 6h   | Every 2h          | Standard 2-hour intervals                |
| Day       | Every 1d   | Every 6h          | Quarter-day divisions (6-hour intervals) |
| Day       | Every 2d   | Every 1d          | Natural day divisions                    |
| Day       | Every 7d   | Every 1d          | Natural day divisions within week        |
| Month     | Every 1m   | Every 7d (weekly) | Standard week divisions within month     |
| Month     | Every 3m   | Every 1m          | Natural month divisions                  |
| Month     | Every 6m   | Every 1m          | Natural month divisions                  |
| Quarter   | Every 1q   | Every 1m          | Natural month divisions within quarter   |
| Year      | Every 1y   | Every 1m          | Standard 1-month divisions within year   |
| Year      | Every 1y   | Every 1y          | Standard 6-month divisions within year   |

## Year Context Logic

To provide proper temporal context without creating cramped labels, the system includes year information according to these rules:

1. **For Seconds, Minutes, Hours**:

   - Standard labels show day/month only (01/Jan)
   - At month or year boundaries, add year context (01/Jan/24)
   - First label in view always includes year context

2. **For Days**:

   - Always include short year format (Jan/24)
   - Apply higher visual emphasis for year boundaries

3. **For Months and Quarters**:

   - Always include full year format (2024)

4. **For Years**:
   - Year itself is the primary label (2024)
   - No secondary label needed

## Smooth Transition Mechanism

The system implements several techniques to ensure smooth transitions between time-based levels:

### 1. Hysteresis for Level Changes

To prevent oscillation between levels when zooming near threshold boundaries:

```typescript
// Only change levels if the new level is significantly different
if (Math.abs(currentLevel - newLevel) <= 1) {
  // Maintain current level for stability
  return currentLevel;
}
```

### 2. Consistent Context Across Time Units

The secondary label maintains appropriate temporal context as units change, preserving the hierarchical time relationship:

- For seconds/minutes/hours: Shows the date (DD/MMM)
- For days: Shows month/year (MMM/YY)
- For months/quarters: Shows full year (YYYY)

### 3. Natural Time Unit Progression

As zoom levels change, grid lines adjust using natural time units rather than arbitrary divisions:

```typescript
// Example of time-based unit selection
function selectTimeUnitAndLevel(pixelsPerDay: number): {
  unit: TimeUnit;
  level: number;
} {
  if (pixelsPerDay >= 20000) return { unit: TimeUnit.Second, level: 1 }; // 5-second intervals
  if (pixelsPerDay >= 10000) return { unit: TimeUnit.Second, level: 2 }; // 15-second intervals
  if (pixelsPerDay >= 6000) return { unit: TimeUnit.Second, level: 3 }; // 30-second intervals
  if (pixelsPerDay >= 3500) return { unit: TimeUnit.Minute, level: 1 }; // 5-minute intervals
  // ... and so on through the hierarchy of time units
}
```

### 4. Date-Aware Boundary Transitions

When crossing significant time boundaries (like month/year changes), the system ensures accurate representations:

```typescript
// Example: Determining if date is at a significant time boundary
function isSignificantTimeBoundary(date: Date, timeUnit: TimeUnit): boolean {
  switch (timeUnit) {
    case TimeUnit.Day:
      // First day of month or year
      return date.getDate() === 1;
    case TimeUnit.Month:
      // First month of year
      return date.getMonth() === 0;
    // Other cases...
  }
}
```

### 5. Time-Unit Based Visual Emphasis

The system applies different visual styles based on time unit significance:

```typescript
// Apply visual emphasis based on time boundary significance
function getLineStyleForDate(date: Date, timeUnit: TimeUnit): LineStyle {
  if (isYearBoundary(date)) {
    return { color: '#888888', width: 1.5, pattern: [] };
  } else if (isMonthBoundary(date) && timeUnit <= TimeUnit.Day) {
    return { color: '#aaaaaa', width: 1.2, pattern: [] };
  } else {
    return { color: '#cccccc', width: 1.0, pattern: [] };
  }
}
```

## Smart Label Placement

The system prevents label overlap using several techniques:

1. **Minimum Spacing Enforcement** - Each level has a minimum required pixel spacing between labels
2. **Priority for Unit Boundaries** - Natural boundaries (day/month changes) get label priority
3. **Dynamic Label Skipping** - Skip labels where they would overlap, based on available space
4. **Contextual Abbreviation** - Use shorter formats when space is constrained

## Date Formatting Implementation

The system implements date and time formatting with a balance of compactness and context:

```typescript
/**
 * Format time values for display based on the time unit
 * Includes year context only for days and higher units or at boundaries
 */
function formatTimeLabels(
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
  const showYearForTimeUnits =
    isYearBoundary || isMonthBoundary || isFirstLabel;

  switch (unit) {
    case TimeUnit.Second:
      return {
        primaryLabel: `${hours}:${minutes}:${seconds}`,
        secondaryLabel: showYearForTimeUnits
          ? `${day}/${month}/${shortYear}`
          : `${day}/${month}`,
      };

    case TimeUnit.Minute:
      return {
        primaryLabel: `${hours}:${minutes}`,
        secondaryLabel: showYearForTimeUnits
          ? `${day}/${month}/${shortYear}`
          : `${day}/${month}`,
      };

    case TimeUnit.Hour:
      return {
        primaryLabel: `${hours}:00`,
        secondaryLabel: showYearForTimeUnits
          ? `${day}/${month}/${shortYear}`
          : `${day}/${month}`,
      };

    case TimeUnit.Day:
      // Always include year for day unit
      return {
        primaryLabel: day,
        secondaryLabel: `${month}/${shortYear}`,
      };

    case TimeUnit.Month:
      return {
        primaryLabel: month,
        secondaryLabel: year.toString(),
      };

    case TimeUnit.Quarter:
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return {
        primaryLabel: `Q${quarter}`,
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
```

## Rendering Implementation

The timescale rendering process uses a data-centric approach with time-unit-based grid lines:

```typescript
// Grid line generation function that uses actual time units
function generateGridLines(
  startTime: number,
  endTime: number,
  timeUnit: TimeUnit,
  level: number,
): { majorGridLines: GridLine[]; subgridLines: GridLine[] } {
  const majorGridLines: GridLine[] = [];
  const subgridLines: GridLine[] = [];

  // Configure time intervals based on time unit and level
  const { majorInterval, subgridInterval } = getTimeIntervals(timeUnit, level);

  // Generate major grid lines at natural time boundaries
  const currentDate = new Date(startTime);
  snapToTimeUnitBoundary(currentDate, timeUnit, majorInterval);

  while (currentDate.getTime() <= endTime) {
    majorGridLines.push({
      time: currentDate.getTime(),
      isMajor: true,
      isUnitBoundary: isUnitBoundary(currentDate, timeUnit),
      // Other properties like labels
    });

    // Move to next major interval using proper date arithmetic
    advanceTimeUnitByInterval(currentDate, timeUnit, majorInterval);
  }

  // Generate subgrid lines at smaller time unit intervals
  for (let i = 0; i < majorGridLines.length - 1; i++) {
    const majorStart = majorGridLines[i].time;
    const majorEnd = majorGridLines[i + 1].time;

    // Create subgrid using actual time units, not fractional divisions
    const subgridDate = new Date(majorStart);
    advanceTimeUnitByInterval(
      subgridDate,
      getSubgridTimeUnit(timeUnit),
      subgridInterval,
    );

    while (subgridDate.getTime() < majorEnd) {
      subgridLines.push({
        time: subgridDate.getTime(),
        isMajor: false,
        isUnitBoundary: false,
        // Other properties
      });

      // Move to next subgrid interval using proper date arithmetic
      advanceTimeUnitByInterval(
        subgridDate,
        getSubgridTimeUnit(timeUnit),
        subgridInterval,
      );
    }
  }

  return { majorGridLines, subgridLines };
}

// Rendering layers
// 1. Render subgrid lines (lightest color, thinnest)
ctx.strokeStyle = '#f0f0f0';
ctx.lineWidth = 0.5;
subgridLines.forEach((gridLine) => {
  const screenX = timeToScreenX(gridLine.time);
  ctx.moveTo(screenX, 0);
  ctx.lineTo(screenX, timelineHeight);
});

// 2. Render major grid lines (medium color, medium thickness)
ctx.strokeStyle = '#d0d0d0';
ctx.lineWidth = 1;
majorGridLines.forEach((gridLine) => {
  const screenX = timeToScreenX(gridLine.time);
  if (!gridLine.isUnitBoundary) {
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, timelineHeight);
  }
});

// 3. Render unit boundary lines (darkest color, thickest)
ctx.strokeStyle = '#a0a0a0';
ctx.lineWidth = 1.5;
majorGridLines.forEach((gridLine) => {
  const screenX = timeToScreenX(gridLine.time);
  if (gridLine.isUnitBoundary) {
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, timelineHeight);
  }
});

// 4. Render two-row labels (only on major grid lines)
majorGridLines.forEach((gridLine) => {
  const screenX = timeToScreenX(gridLine.time);
  if (gridLine.shouldShowLabel) {
    // Primary label (top row)
    renderPrimaryLabel(gridLine.primaryLabel, screenX, primaryY);

    // Secondary label (bottom row)
    renderSecondaryLabel(gridLine.secondaryLabel, screenX, secondaryY);
  }
});
```

## Integration with Zoom System

When the zoom level changes:

1. The zoom value (0-100) is converted to a scale factor using `ZoomCurveCalculator`
2. The scale factor is translated to pixels-per-day metric
3. The correct time unit and level are automatically determined based on pixels-per-day
4. Grid lines, subgrid lines, and two-row labels are generated for the selected level
5. The hysteresis mechanism prevents oscillation between levels

## Time Unit Operations

The system implements key helper functions for accurate time-based calculations:

```typescript
/**
 * Returns the appropriate subgrid time unit based on major time unit
 */
function getSubgridTimeUnit(majorTimeUnit: TimeUnit): TimeUnit {
  switch (majorTimeUnit) {
    case TimeUnit.Year:
      return TimeUnit.Quarter;
    case TimeUnit.Quarter:
    case TimeUnit.Month:
      return TimeUnit.Day;
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
function advanceTimeUnitByInterval(
  date: Date,
  timeUnit: TimeUnit,
  interval: number,
): void {
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
    case TimeUnit.Month:
      date.setMonth(date.getMonth() + interval);
      break;
    case TimeUnit.Quarter:
      date.setMonth(date.getMonth() + interval * 3);
      break;
    case TimeUnit.Year:
      date.setFullYear(date.getFullYear() + interval);
      break;
  }
}

/**
 * Snaps a date to the nearest time unit boundary
 */
function snapToTimeUnitBoundary(
  date: Date,
  timeUnit: TimeUnit,
  interval: number,
): void {
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
        // For intervals like every 2 days or every week
        const daysSinceEpoch = Math.floor(
          date.getTime() / (24 * 60 * 60 * 1000),
        );
        const intervalDays = Math.floor(daysSinceEpoch / interval) * interval;
        date.setTime(intervalDays * 24 * 60 * 60 * 1000);
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
    case TimeUnit.Quarter:
      date.setMilliseconds(0);
      date.setSeconds(0);
      date.setMinutes(0);
      date.setHours(0);
      date.setDate(1);
      const quarter = Math.floor(date.getMonth() / 3);
      date.setMonth(quarter * 3);
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
 * Checks if a date is at a unit boundary (like year start, month start)
 */
function isUnitBoundary(date: Date, timeUnit: TimeUnit): boolean {
  switch (timeUnit) {
    case TimeUnit.Second:
      return date.getMilliseconds() === 0;
    case TimeUnit.Minute:
      return date.getSeconds() === 0;
    case TimeUnit.Hour:
      return date.getMinutes() === 0;
    case TimeUnit.Day:
      return date.getHours() === 0;
    case TimeUnit.Month:
      return date.getDate() === 1;
    case TimeUnit.Quarter:
      return date.getDate() === 1 && date.getMonth() % 3 === 0;
    case TimeUnit.Year:
      return date.getMonth() === 0 && date.getDate() === 1;
    default:
      return false;
  }
}

/**
 * Gets the appropriate time intervals for grid lines based on time unit and level
 */
function getTimeIntervals(
  timeUnit: TimeUnit,
  level: number,
): { majorInterval: number; subgridInterval: number } {
  switch (timeUnit) {
    case TimeUnit.Second:
      if (level === 1) return { majorInterval: 5, subgridInterval: 1 };
      if (level === 2) return { majorInterval: 15, subgridInterval: 5 };
      return { majorInterval: 30, subgridInterval: 10 };

    case TimeUnit.Minute:
      if (level === 1) return { majorInterval: 5, subgridInterval: 1 };
      if (level === 2) return { majorInterval: 15, subgridInterval: 5 };
      return { majorInterval: 30, subgridInterval: 10 };

    case TimeUnit.Hour:
      if (level === 1) return { majorInterval: 1, subgridInterval: 15 };
      if (level === 2) return { majorInterval: 3, subgridInterval: 1 };
      return { majorInterval: 6, subgridInterval: 2 };

    case TimeUnit.Day:
      if (level === 1) return { majorInterval: 1, subgridInterval: 6 };
      if (level === 2) return { majorInterval: 2, subgridInterval: 1 };
      return { majorInterval: 7, subgridInterval: 1 };

    case TimeUnit.Month:
      if (level === 1) return { majorInterval: 1, subgridInterval: 7 };
      return { majorInterval: 3, subgridInterval: 1 };

    case TimeUnit.Quarter:
      return { majorInterval: 1, subgridInterval: 1 };

    case TimeUnit.Year:
      if (level === 1) return { majorInterval: 1, subgridInterval: 3 };
      return { majorInterval: 5, subgridInterval: 1 };

    default:
      return { majorInterval: 1, subgridInterval: 1 };
  }
}
```

## Performance Optimizations

1. **Efficient Caching** - Grid lines are cached with time-based invalidation
2. **Smart Label Placement** - Only render labels where they won't overlap
3. **Minimal Vertical Space** - Strict two-row layout minimizes timeline height
4. **Throttled Updates** - Grid recalculation happens only after significant zoom changes
5. **Optimized Grid Generation** - Only generate grid lines visible in the current viewport
6. **Reuse Date Objects** - Minimize object creation by reusing date instances
7. **Batch Rendering** - Group similar grid lines to minimize canvas state changes
