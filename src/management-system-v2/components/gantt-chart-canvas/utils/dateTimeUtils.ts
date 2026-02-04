/**
 * Date and time utilities for precise date calculations and formatting
 */

/**
 * Format a date using the specified format options
 * @param date Date to format
 * @param options Formatting options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

/**
 * Format time using specified format options
 * @param date Date/time to format
 * @param options Formatting options
 * @returns Formatted time string
 */
export function formatTime(
  date: Date,
  options: Intl.DateTimeFormatOptions = { timeStyle: 'short' },
): string {
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

/**
 * Format a date and time together
 * @param date Date/time to format
 * @param options Formatting options
 * @returns Formatted date and time string
 */
export function formatDateTime(
  date: Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
): string {
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

/**
 * Format a duration in milliseconds as a human-readable string
 * @param durationMs Duration in milliseconds
 * @param includeMilliseconds Whether to include milliseconds in the output
 * @returns Formatted duration string
 */
export function formatDuration(durationMs: number, includeMilliseconds: boolean = false): string {
  if (isNaN(durationMs) || !isFinite(durationMs)) {
    return '—';
  }

  const abs = Math.abs(durationMs);
  const sign = durationMs < 0 ? '-' : '';

  // For very short durations
  if (abs < 1000 && includeMilliseconds) {
    return `${sign}${abs}ms`;
  }

  const seconds = Math.floor(abs / 1000) % 60;
  const minutes = Math.floor(abs / (1000 * 60)) % 60;
  const hours = Math.floor(abs / (1000 * 60 * 60)) % 24;
  const days = Math.floor(abs / (1000 * 60 * 60 * 24));

  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  // Include seconds for shorter durations
  if (seconds > 0 || parts.length === 0) {
    const secondsStr = includeMilliseconds
      ? (seconds + (abs % 1000) / 1000).toFixed(3)
      : seconds.toString();
    parts.push(`${secondsStr}s`);
  }

  return sign + parts.join(' ');
}

/**
 * Calculate the exact number of days between two dates
 * @param start Start date
 * @param end End date
 * @returns Number of days (fractional)
 */
export function getDaysDifference(start: Date, end: Date): number {
  // Use high-precision timestamps for calculation
  const diffMs = end.getTime() - start.getTime();
  const msPerDay = 24 * 60 * 60 * 1000; // Exact ms per day
  return diffMs / msPerDay;
}

/**
 * Get the start of a specific time unit (day, month, etc.)
 * @param date Source date
 * @param unit Time unit to snap to
 * @returns Date at the start of the specified unit
 */
export function getUnitStart(
  date: Date,
  unit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year',
): Date {
  const result = new Date(date);

  switch (unit) {
    case 'year':
      result.setMonth(0);
    // Fall through to month case
    case 'quarter':
      // Set to start of quarter (Jan, Apr, Jul, Oct)
      result.setMonth(Math.floor(result.getMonth() / 3) * 3);
    // Fall through to month case
    case 'month':
      result.setDate(1);
    // Fall through to day case
    case 'week':
      // Set to start of week (Sunday)
      const day = result.getDay();
      result.setDate(result.getDate() - day);
    // Fall through to day case
    case 'day':
      result.setHours(0);
    // Fall through to hour case
    case 'hour':
      result.setMinutes(0);
    // Fall through to minute case
    case 'minute':
      result.setSeconds(0);
    // Fall through to second case
    case 'second':
      result.setMilliseconds(0);
      break;
  }

  return result;
}

/**
 * Get the end of a specific time unit
 * @param date Source date
 * @param unit Time unit to snap to
 * @returns Date at the end of the specified unit
 */
export function getUnitEnd(
  date: Date,
  unit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year',
): Date {
  // Start with beginning of the next unit
  let result: Date;

  switch (unit) {
    case 'year':
      result = new Date(date.getFullYear() + 1, 0, 1);
      break;
    case 'quarter':
      const quarter = Math.floor(date.getMonth() / 3);
      result = new Date(date.getFullYear(), (quarter + 1) * 3, 1);
      break;
    case 'month':
      result = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      break;
    case 'week':
      // Get to start of current week, then add 7 days
      const startOfWeek = getUnitStart(date, 'week');
      result = new Date(startOfWeek);
      result.setDate(startOfWeek.getDate() + 7);
      break;
    case 'day':
      result = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      break;
    case 'hour':
      result = new Date(date);
      result.setHours(date.getHours() + 1);
      result.setMinutes(0, 0, 0);
      break;
    case 'minute':
      result = new Date(date);
      result.setMinutes(date.getMinutes() + 1);
      result.setSeconds(0, 0);
      break;
    case 'second':
      result = new Date(date);
      result.setSeconds(date.getSeconds() + 1);
      result.setMilliseconds(0);
      break;
    default:
      result = new Date(date);
      break;
  }

  // Subtract 1 millisecond to get the last moment of the previous unit
  result.setMilliseconds(result.getMilliseconds() - 1);
  return result;
}

/**
 * Add a specific amount of a time unit to a date
 * Uses exact calculations for better precision than Date methods
 * @param date Source date
 * @param unit Time unit to add
 * @param amount Amount to add (can be fractional or negative)
 * @returns New date with the unit added
 */
export function addTime(
  date: Date,
  unit:
    | 'millisecond'
    | 'second'
    | 'minute'
    | 'hour'
    | 'day'
    | 'week'
    | 'month'
    | 'quarter'
    | 'year',
  amount: number,
): Date {
  if (amount === 0) return new Date(date);

  const result = new Date(date);
  const timestamp = date.getTime();

  switch (unit) {
    case 'millisecond':
      return new Date(timestamp + amount);

    case 'second':
      return new Date(timestamp + amount * 1000);

    case 'minute':
      return new Date(timestamp + amount * 60 * 1000);

    case 'hour':
      return new Date(timestamp + amount * 60 * 60 * 1000);

    case 'day':
      return new Date(timestamp + amount * 24 * 60 * 60 * 1000);

    case 'week':
      return new Date(timestamp + amount * 7 * 24 * 60 * 60 * 1000);

    case 'month':
      // For months, we need to be careful with variable month lengths
      const wholeMonths = Math.floor(amount);
      const fraction = amount - wholeMonths;

      // Add whole months directly
      result.setMonth(result.getMonth() + wholeMonths);

      // For fractional part, convert to days and add
      if (fraction !== 0) {
        // Get days in the target month
        const daysInTargetMonth = new Date(
          result.getFullYear(),
          result.getMonth() + 1,
          0,
        ).getDate();

        // Add the fractional part as days
        const daysToAdd = Math.round(daysInTargetMonth * fraction);
        result.setDate(result.getDate() + daysToAdd);
      }

      return result;

    case 'quarter':
      // A quarter is 3 months
      return addTime(date, 'month', amount * 3);

    case 'year':
      // For years, handle leap years correctly
      const wholeYears = Math.floor(amount);
      const yearFraction = amount - wholeYears;

      // Add whole years directly
      result.setFullYear(result.getFullYear() + wholeYears);

      // For fractional part, convert to days and add
      if (yearFraction !== 0) {
        // Check if target year is a leap year
        const isLeapYear = (year: number) => {
          return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        };

        const daysInYear = isLeapYear(result.getFullYear()) ? 366 : 365;

        // Add the fractional part as days
        const daysToAdd = Math.round(daysInYear * yearFraction);
        result.setDate(result.getDate() + daysToAdd);
      }

      return result;

    default:
      // Should never reach here
      return result;
  }
}
