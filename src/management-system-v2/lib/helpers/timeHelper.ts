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
      durationValues.years = Math.floor(miliseconds / (365 * 60 * 60 * 1000 * 24));
      miliseconds -= durationValues.years * (365 * 60 * 60 * 1000 * 24);
      durationValues.months = Math.floor(miliseconds / (30 * 60 * 60 * 1000 * 24));
      miliseconds -= durationValues.months * (30 * 60 * 60 * 1000 * 24);
    }
    durationValues.days = Math.floor(miliseconds / (60 * 60 * 1000 * 24));
    miliseconds -= durationValues.days * (60 * 60 * 1000 * 24);
    durationValues.hours = Math.floor(miliseconds / (60 * 60 * 1000));
    miliseconds -= durationValues.hours * (60 * 60 * 1000);
    // Minutes part from the difference
    durationValues.minutes = Math.floor(miliseconds / (60 * 1000));
    miliseconds -= durationValues.minutes * (60 * 1000);
    //Seconds part from the difference
    durationValues.seconds = Math.floor(miliseconds / 1000);
    miliseconds -= durationValues.seconds * 1000;
  }
  return durationValues;
}
