/**
 * An object representing a sequence of text in the html string
 */
export type TextToken = {
  /**
   * - the type of the token
   */
  type: 'string';
  /**
   * - the represented string
   */
  content: string;
};
/**
 * An object representing the start of a for construct in the html string
 */
export type StartIfToken = {
  /**
   * - the type of the token
   */
  type: 'start_if';
  /**
   * - the condition to evaluate
   */
  condition: string;
};
/**
 * An object representing the end of a if construct in the html string
 */
export type EndIfToken = {
  /**
   * - the type of the token
   */
  type: 'end_if';
};
/**
 * An object representing the start of a for construct in the html string
 */
export type StartForToken = {
  /**
   * - the type of the token
   */
  type: 'start_for';
  /**
   * - the variable from which to get the values to loop over
   */
  sourceVar: string;
  /**
   * - the variable that contains the value of the current loop run
   */
  loopVar: string;
};
/**
 * An object representing the end of a for construct in the html string
 */
export type EndForToken = {
  /**
   * - the type of the token
   */
  type: 'end_for';
};
/**
 * An object representing a variable placeholder in the html string
 */
export type VariableToken = {
  /**
   * - the type of the token
   */
  type: 'variable';
  /**
   * - the name of the variable
   */
  variableName: string;
};
/**
 * An object representing part of a html string
 */
export type Token = TextToken | StartForToken | EndForToken | VariableToken;
/**
 * Transforms the html string into a sequence of tokens
 *
 * @param {string} html the html string to replace the placeholders in
 * @returns {Token[]}
 */
export function tokenize(html: string): Token[];
