/**
 * Replaces occurences of "{{[variable-name]}}" with occurences of "variable-name" in the given
 * object in the given string
 *
 * @param {string} html the html string to replace the placeholders in
 * @param {{ [key: string]: any }} data the values to insert into the html
 * @param {boolean} [partial] if set to true placeholders that are not in data are not replaced
 * @returns {string}
 */
function render(html, data, partial = false) {
  let out = '';

  let index = 0;
  let copyIndex = 0;

  for (; index < html.length; ++index) {
    if (html[index] == '{' && index < html.length - 1 && html[index + 1] == '{') {
      const startIndex = index;
      index += 2;
      for (; index < html.length; ++index) {
        if (html[index] == '}' && index < html.length - 1 && html[index + 1] == '}') {
          out += html.substring(copyIndex, startIndex);

          const variable = html.substring(startIndex + 2, index);
          if (variable in data) {
            out += data[variable];
          } else if (partial) {
            out += `{{${variable}}}`;
          }

          index += 2;
          copyIndex = index;
          break;
        }
      }
    }
  }

  out += html.substring(copyIndex, index);

  return out;
}

module.exports = {
  render,
};
