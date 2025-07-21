/**
 * TimeUnits.ts
 *
 * Defines time units and constants for time-based calculations.
 * Provides the foundation for accurate time handling in the Gantt chart.
 */

// Define time units from smallest to largest
export enum TimeUnit {
  Millisecond = 'millisecond',
  Second = 'second',
  Minute = 'minute',
  Hour = 'hour',
  Day = 'day',
  Week = 'week',
  Month = 'month',
  Year = 'year',
}

// Duration of each time unit in milliseconds (approximations for month/year)
export const TIME_UNIT_DURATIONS: Record<TimeUnit, number> = {
  [TimeUnit.Millisecond]: 1,
  [TimeUnit.Second]: 1000,
  [TimeUnit.Minute]: 60 * 1000,
  [TimeUnit.Hour]: 60 * 60 * 1000,
  [TimeUnit.Day]: 24 * 60 * 60 * 1000,
  [TimeUnit.Week]: 7 * 24 * 60 * 60 * 1000,
  [TimeUnit.Month]: 30 * 24 * 60 * 60 * 1000, // Approximation
  [TimeUnit.Year]: 365 * 24 * 60 * 60 * 1000, // Approximation
};

/**
 * Gets the name of the time unit as a readable string
 */
export function getTimeUnitName(unit: TimeUnit): string {
  return unit.charAt(0).toUpperCase() + unit.slice(1);
}

/**
 * Checks if a date is at a specific time unit boundary
 */
export function isTimeUnitBoundary(date: Date, unit: TimeUnit): boolean {
  switch (unit) {
    case TimeUnit.Second:
      return date.getMilliseconds() === 0;
    case TimeUnit.Minute:
      return date.getSeconds() === 0 && date.getMilliseconds() === 0;
    case TimeUnit.Hour:
      return date.getMinutes() === 0 && date.getSeconds() === 0 && date.getMilliseconds() === 0;
    case TimeUnit.Day:
      return (
        date.getHours() === 0 &&
        date.getMinutes() === 0 &&
        date.getSeconds() === 0 &&
        date.getMilliseconds() === 0
      );
    case TimeUnit.Week:
      // Check if it's the start of a week (Sunday by default)
      return (
        date.getDay() === 0 &&
        date.getHours() === 0 &&
        date.getMinutes() === 0 &&
        date.getSeconds() === 0 &&
        date.getMilliseconds() === 0
      );
    case TimeUnit.Month:
      return (
        date.getDate() === 1 &&
        date.getHours() === 0 &&
        date.getMinutes() === 0 &&
        date.getSeconds() === 0 &&
        date.getMilliseconds() === 0
      );
    case TimeUnit.Year:
      return (
        date.getMonth() === 0 &&
        date.getDate() === 1 &&
        date.getHours() === 0 &&
        date.getMinutes() === 0 &&
        date.getSeconds() === 0 &&
        date.getMilliseconds() === 0
      );
    default:
      return false;
  }
}

/**
 * Snaps a date to the nearest time unit boundary
 */
export function snapToTimeUnitBoundary(date: Date, unit: TimeUnit): void {
  switch (unit) {
    case TimeUnit.Year:
      date.setMonth(0);
    // fallthrough
    case TimeUnit.Month:
      date.setDate(1);
    // fallthrough
    case TimeUnit.Week:
    case TimeUnit.Day:
      date.setHours(0);
    // fallthrough
    case TimeUnit.Hour:
      date.setMinutes(0);
    // fallthrough
    case TimeUnit.Minute:
      date.setSeconds(0);
    // fallthrough
    case TimeUnit.Second:
      date.setMilliseconds(0);
      break;
  }

  // Special handling for weeks
  if (unit === TimeUnit.Week) {
    const dayOfWeek = date.getDay();
    date.setDate(date.getDate() - dayOfWeek); // Adjust to start of week (Sunday)
  }
}

/**
 * Advance a date by one time unit
 */
export function advanceOneTimeUnit(date: Date, unit: TimeUnit): void {
  switch (unit) {
    case TimeUnit.Millisecond:
      date.setMilliseconds(date.getMilliseconds() + 1);
      break;
    case TimeUnit.Second:
      date.setSeconds(date.getSeconds() + 1);
      break;
    case TimeUnit.Minute:
      date.setMinutes(date.getMinutes() + 1);
      break;
    case TimeUnit.Hour:
      date.setHours(date.getHours() + 1);
      break;
    case TimeUnit.Day:
      date.setDate(date.getDate() + 1);
      break;
    case TimeUnit.Week:
      date.setDate(date.getDate() + 7);
      break;
    case TimeUnit.Month:
      date.setMonth(date.getMonth() + 1);
      break;
    case TimeUnit.Year:
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
}
