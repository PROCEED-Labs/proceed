/**
 * An object containing all necessary values for duration
 */
export type DurationValues = {
  years: number | null;
  months: number | null;
  days: number | null;
  hours: number | null;
  minutes: number | null;
  seconds: number | null;
};

const MILISECONDS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;
const MILISECONDS_PER_MONTH = 30 * 60 * 60 * 1000 * 24;
const MILISECONDS_PER_DAY = 60 * 60 * 1000 * 24;
const MILISECONDS_PER_HOUR = 60 * 60 * 1000;
const MILISECONDS_PER_MINUTE = 60 * 1000;

/**
 * Calculate ISO Duration string based on given duration values
 */
export function calculateTimeFormalExpression(durationValues: DurationValues) {
  const dateFormal = `${durationValues.years ? durationValues.years + 'Y' : ''}${
    durationValues.months ? durationValues.months + 'M' : ''
  }${durationValues.days ? durationValues.days + 'D' : ''}`;

  let timeFormal = '';
  if (durationValues.hours || durationValues.minutes || durationValues.seconds) {
    timeFormal = `T${durationValues.hours ? durationValues.hours + 'H' : ''}${
      durationValues.minutes ? durationValues.minutes + 'M' : ''
    }${durationValues.seconds ? durationValues.seconds + 'S' : ''}`;
  }

  let formalExpression = '';
  if (dateFormal.length > 0 || timeFormal.length > 0) {
    formalExpression = `P${dateFormal}${timeFormal}`;
  }

  return formalExpression;
}

export function transformMilisecondsToDurationValues(
  timeInMs: number,
  excludeAfterDays: boolean = false,
) {
  let miliseconds = timeInMs;
  const durationValues: DurationValues = {
    years: null,
    months: null,
    days: null,
    hours: null,
    minutes: null,
    seconds: null,
  };

  if (miliseconds > 0) {
    if (!excludeAfterDays) {
      durationValues.years = Math.floor(miliseconds / MILISECONDS_PER_YEAR);
      miliseconds -= durationValues.years * MILISECONDS_PER_YEAR;
      durationValues.months = Math.floor(miliseconds / MILISECONDS_PER_MONTH);
      miliseconds -= durationValues.months * MILISECONDS_PER_MONTH;
    }

    durationValues.days = Math.floor(miliseconds / MILISECONDS_PER_DAY);
    miliseconds -= durationValues.days * MILISECONDS_PER_DAY;
    durationValues.hours = Math.floor(miliseconds / MILISECONDS_PER_HOUR);
    miliseconds -= durationValues.hours * MILISECONDS_PER_HOUR;
    // Minutes part from the difference
    durationValues.minutes = Math.floor(miliseconds / MILISECONDS_PER_MINUTE);
    miliseconds -= durationValues.minutes * MILISECONDS_PER_MINUTE;
    //Seconds part from the difference
    durationValues.seconds = Math.floor(miliseconds / 1000);
    miliseconds -= durationValues.seconds * 1000;
  }
  return durationValues;
}

export function toCustomUTCString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}-${milliseconds}`;
}

export function fromCustomUTCString(dateString: string): Date {
  const [year, month, day, hours, minutes, seconds, milliseconds] = dateString
    .split('-')
    .map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, milliseconds));
}
