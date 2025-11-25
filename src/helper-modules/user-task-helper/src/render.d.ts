export type ASTNode = import('./ast.js').ASTNode;
export type TextNode = import('./ast.js').TextNode;
export type IfNode = import('./ast.js').IfNode;
export type ForNode = import('./ast.js').ForNode;
export type VariableNode = import('./ast.js').VariableNode;
/**
 * Replaces occurences of "{%[variable-name]%}" with occurences of "variable-name" in the given
 * object in the given string
 *
 * @param {string} html the html string to replace the placeholders in
 * @param {{ [key: string]: any }} data the values to insert into the html
 * @param {boolean} [partial] if set to true placeholders that are not in data are not replaced
 * @returns {string}
 */
export function render(
  html: string,
  data: {
    [key: string]: any;
  },
  partial?: boolean,
): string;
