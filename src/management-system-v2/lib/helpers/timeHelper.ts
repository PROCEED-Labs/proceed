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
