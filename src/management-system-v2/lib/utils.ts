export function generateDateString(date?: Date | string, includeTime: boolean = false): string {
  if (!date) {
    return '';
  }

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: includeTime ? 'numeric' : undefined,
    minute: includeTime ? 'numeric' : undefined,
  };

  return new Date(date).toLocaleDateString('en-UK', options);
}
type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
type JSONObject = { [key: string]: JSONValue };
type JSONArray = JSONValue[];

/**
 * Allows to create a function that will only run its logic if it has not been called for a specified amount of time
 *
 * example use-case: you don't want to check some text entered by a user on every keystroke but only when the user has stopped entering new text
 *
 * found here: https://www.freecodecamp.org/news/javascript-debounce-example/
 *
 * @param func the function to call after the debounce timeout has elapsed
 * @param timeout the time that needs to elapse without a function call before the logic is executed
 * @returns the function to call for the debounced behaviour
 */
export function debounce(func: Function, timeout = 1000) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounced = (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), timeout);
  };

  /**
   * Immediatly execute the debounced function and cancel any pending executions
   */
  debounced.immediate = (...args: any[]) => {
    clearTimeout(timer);
    func(...args);
  };

  /**
   * Immediatly execute the debounced (async) function and cancel any pending executions
   *
   * Allows the function to be awaited
   */
  debounced.asyncImmediate = async (...args: any[]) => {
    clearTimeout(timer);
    await func(...args);
  };

  return debounced;
}
