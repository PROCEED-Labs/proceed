const { tokenize } = require('./tokenize');
const { createAST } = require('./ast');

/**
 * @typedef {import('./ast.js').ASTNode} ASTNode
 * @typedef {import('./ast.js').TextNode} TextNode
 * @typedef {import('./ast.js').IfNode} IfNode
 * @typedef {import('./ast.js').ForNode} ForNode
 * @typedef {import('./ast.js').VariableNode} VariableNode
 */

/**
 * Returns the value of a variable from the input data
 *
 * @param {string} varName a string literal ('[string]'), variable name ([var-name]) or an access to a (nested) property in a variable ([var-name].[attribute]...)
 * @param {object} data the data to get the values from
 * @param {boolean} partial if true: keep placeholders that have no entry in data in the output
 *
 * @returns {{ value: any } | undefined} nothing if the variable does not exist and the partial flag
 * is set or the respective value
 */
function getVariableValue(varName, data, partial) {
  varName = varName.trim();

  // check if the variable is actually a string literal
  const literalMatch = varName.match(/\s*'(.*)'\s*/);
  if (literalMatch) return { value: literalMatch[1] };

  // the varName might define a nested access ([var-name].[attribute1].[attribute2]...)
  const varPath = varName.split('.');

  // if the partial flag is set and the variable is not defined in the given data return nothing
  if (partial && !(varPath[0] in data)) return undefined;

  let index = 0;
  // get the (nested) data using the variable path or undefined if the data cannot be completely
  // resolved
  while (data && index < varPath.length) data = data[varPath[index++]];

  let value = data;

  if (value === undefined || value === null) value = '';

  return { value };
}

/**
 * Converts a text node back into a string
 *
 * @param {TextNode} node the text node to convert
 * @param {{ [key: string]: any }} data the values to insert into the html
 * @param {boolean} partial if true: keep placeholders that have no entry in data in the output
 *
 * @returns {string} the string representation of the node
 **/
function textNodeToString(node, data, partial) {
  return node.text;
}

/**
 * Converts a variable node back into a string
 *
 * @param {VariableNode} node the variable node to convert
 * @param {{ [key: string]: any }} data the values to insert into the html
 * @param {boolean} partial if true: keep placeholders that have no entry in data in the output
 *
 * @returns {string} the string representation of the node
 **/
function variableNodeToString(node, data, partial) {
  let value = getVariableValue(node.variableName, data, partial);

  if (!value) {
    return `{%${node.variableName}%}`;
  }

  return `${value.value}`;
}

/**
 * Converts an if-block node back into a string
 *
 * @param {IfNode} node the variable node to convert
 * @param {{ [key: string]: any }} data the values to insert into the html
 * @param {boolean} partial if true: keep placeholders that have no entry in data in the output
 *
 * @returns {string} the string representation of the node
 **/
function ifNodeToString(node, data, partial) {
  const { condition } = node;

  // check if the condition is just some variable or string literal
  const varMatch = condition.match(/^\s*(\S+?)\s*$/);
  if (varMatch) {
    const value = getVariableValue(varMatch[1], data, partial);

    // if there is no value the placeholder should not be replaced
    if (!value) {
      return `{%if ${condition}%}${nodesToString(node.children, {}, partial)}{%/if%}`;
    }

    // if the value is falsy exclude the if body from the output
    if (!value.value) return '';
  } else {
    // check if the condition is a valid comparison
    const compMatch = condition.match(
      /^\s*((?:\S*)|(?:'.*?'))\s*((?:==)|(?:!=)|(?:contains))\s*((?:\S*)|(?:'.*?'))\s*$/,
    );
    if (!compMatch) throw new Error(`Invalid condition in if block. ({%if ${condition}%})`);

    let [_, l, comp, r] = compMatch;
    const lhs = getVariableValue(l, data, partial);
    const rhs = getVariableValue(r, data, partial);

    // if one of the sides has no value the placeholder should not be replaced
    if (!lhs || !rhs) {
      return `{%if ${condition}%}${nodesToString(node.children, {}, partial)}{%/if%}`;
    }

    if (comp === 'contains') {
      // consider nullish values to be empty arrays which cannot contain anything and therefore
      // exclude the if body from the output
      if (!lhs.value) return '';

      if (!Array.isArray(lhs.value)) {
        throw new Error(`The value to check in is not an array. ({%if ${condition}%})`);
      }

      // if the array does not contain the value exclude the if body from the output
      // the comparison in not strict to allow checks for numbers in string arrays
      if (!lhs.value.includes(`${rhs.value}`)) return '';
    } else if (
      (comp === '==' && lhs.value != rhs.value) ||
      (comp === '!=' && lhs.value == rhs.value)
    )
      // if the comparison returns false exclude the if body from the output
      return '';
  }

  // the condition was fulfilled => include the if body in the output
  return nodesToString(node.children, data, partial);
}

/**
 * Converts a for-loop node back into a string
 *
 * @param {ForNode} node the variable node to convert
 * @param {{ [key: string]: any }} data the values to insert into the html
 * @param {boolean} partial if true: keep placeholders that have no entry in data in the output
 *
 * @returns {string} the string representation of the node
 **/
function forNodeToString(node, data, partial) {
  const value = getVariableValue(node.sourceVar, data, partial);

  let out = '';
  if (!value) {
    out += `{%for ${node.loopVar} in ${node.sourceVar}%}`;
    out += nodesToString(node.children, {}, partial);
    out += '{%/for%}';
    return out;
  }

  if (!value.value) return '';

  if (!Array.isArray(value.value))
    throw new Error(
      `The value to iterate over in for loop placeholders must be an array. ({%for ${node.loopVar} in ${node.sourceVar}%})`,
    );

  for (const val of value.value) {
    const newData = { ...data, [node.loopVar]: val };
    out += nodesToString(node.children, newData, partial);
  }

  return out;
}

/**
 * Converts a list of nodes back into a single string
 *
 * @param {ASTNode[]} nodes a list of nodes to convert into a single string
 * @param {{ [key: string]: any }} data the values to insert into the html
 * @param {boolean} partial if true: keep placeholders that have no entry in data in the output
 *
 * @returns {string} the string representing the list of nodes
 **/
function nodesToString(nodes, data, partial) {
  let out = '';

  const transforms = {
    text: textNodeToString,
    variable: variableNodeToString,
    for: forNodeToString,
    if: ifNodeToString,
  };

  for (const node of nodes) {
    if (!(node.type in transforms)) {
      throw new Error('Unexpected tree node type!');
    }

    out += transforms[node.type](node, data, partial);
  }

  return out;
}

/**
 * Replaces placeholders ({%[placeholder definition]%}) in a string with given data
 *
 * @param {string} html the html string to replace the placeholders in
 * @param {{ [key: string]: any }} data the values to insert into the html
 * @param {boolean} [partial] if set to true placeholders that are not in data are not replaced
 * @returns {string}
 */
function render(html, data, partial = false) {
  const tokens = tokenize(html);
  const ast = createAST(tokens);

  return nodesToString(ast.children, data, partial);
}

module.exports = {
  render,
};
