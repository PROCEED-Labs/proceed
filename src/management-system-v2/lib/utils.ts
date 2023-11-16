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
