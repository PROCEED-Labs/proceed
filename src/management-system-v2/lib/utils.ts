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

export type Preferences = JSONObject;

export const getPreferences = (): Preferences => {
  const res =
    typeof document !== 'undefined'
      ? document?.cookie.split('; ').find((cookie) => cookie.startsWith('userpreferences='))
      : undefined;
  if (!res) return {};
  return JSON.parse(res?.split('=')[1]);
};

/**
 * Adds a preference to the user's preferences.
 * If the preference already exists, it will be overwritten.
 * @param prefs - Object of preferences to add to the user's preferences
 * @returns void
 **/
export const addUserPreference = (prefs: Preferences) => {
  const oldPrefs = getPreferences();
  document.cookie = `userpreferences=${JSON.stringify({
    ...oldPrefs,
    ...prefs,
  })}; SameSite=None; Secure; Max-Age=31536000;`;
};

/* Values and defaults:
{
  'show-process-meta-data': true
  'icon-view-in-process-list': false
}
*/

// found here: https://www.freecodecamp.org/news/javascript-debounce-example/
// TODO: should we use a library or create our own with functions like this that will be used frequently
export function debounce(func: Function, timeout = 1000) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), timeout);
  };
}
