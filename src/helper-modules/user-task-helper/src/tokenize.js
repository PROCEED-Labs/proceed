/**
 * An object representing a sequence of text in the html string
 *
 * @typedef TextToken
 * @type {object}
 * @property {'string'} type - the type of the token
 * @property {string} content - the represented string
 */

/**
 * An object representing the start of a for construct in the html string
 *
 * @typedef StartIfToken
 * @type {object}
 * @property {'start_if'} type - the type of the token
 * @property {string} condition - the condition to evaluate
 */

/**
 * An object representing the end of a if construct in the html string
 *
 * @typedef EndIfToken
 * @type {object}
 * @property {'end_if'} type - the type of the token
 */

/**
 * An object representing the start of a for construct in the html string
 *
 * @typedef StartForToken
 * @type {object}
 * @property {'start_for'} type - the type of the token
 * @property {string} sourceVar - the variable from which to get the values to loop over
 * @property {string} loopVar - the variable that contains the value of the current loop run
 */

/**
 * An object representing the end of a for construct in the html string
 *
 * @typedef EndForToken
 * @type {object}
 * @property {'end_for'} type - the type of the token
 */

/**
 * An object representing a variable placeholder in the html string
 *
 * @typedef VariableToken
 * @type {object}
 * @property {'variable'} type - the type of the token
 * @property {string} variableName - the name of the variable
 */

/**
 * An object representing part of a html string
 *
 * @typedef Token
 * @type {TextToken | StartForToken | EndForToken | VariableToken}
 */

// Regexes used to identify the next token to get from the next part of the html
const matchers = [
  // match the opening construct for if blocks of the form {%if [condition]%}
  {
    regex: /^{%\s*if\s+([^}]+?)\s*\%}/,
    build: (match) => ({ type: 'start_if', condition: match[1] }),
  },
  // match the closing construct for if blocks of the form {%/if%}
  { regex: /^{%\s*\/if\s*%}/, build: (_) => ({ type: 'end_if' }) },
  // match the opening construct for for loops of the form {%for [loop variable name] in [input variable name]%}
  {
    regex: /^{%\s*for\s+(\w+)\s+in\s+([^}\s]+)\s*\%}/,
    build: (match) => ({ type: 'start_for', sourceVar: match[2], loopVar: match[1] }),
  },
  // match the closing construct for for loops of the form {%/for%}
  { regex: /^{%\s*\/for\s*%}/, build: (_) => ({ type: 'end_for' }) },
  // match the construct representing variables of the form {%[variable name]%}
  { regex: /^{%\s*(\S+?)\s*%}/, build: (match) => ({ type: 'variable', variableName: match[1] }) },
  // match everything else up until opening or closing of constructs or the end of the input string
  {
    regex: /^(?:.|\n)*?(?=((?:{%)|(?:%})|(?:$)))/,
    build: (match) => ({ type: 'text', content: match[0] }),
  },
];

/**
 * Transforms the html string into a sequence of tokens
 *
 * @param {string} html the html string to replace the placeholders in
 * @returns {Token[]}
 */
function tokenize(html) {
  const tokens = [];

  while (html.length) {
    let token;
    let match;
    for (const { regex, build } of matchers) {
      const candidate = html.match(regex);
      if (candidate && candidate[0].length) {
        if (!match || candidate[0].length > match.length) {
          match = candidate[0];
          token = build(candidate);
        }
      }
    }

    if (!match)
      throw new Error(
        `Invalid input string! Could not parse the following section: ${html.substring(0, 20)}...`,
      );

    html = html.substring(match.length);

    tokens.push(token);
  }

  return tokens;
}

module.exports = {
  tokenize,
};
