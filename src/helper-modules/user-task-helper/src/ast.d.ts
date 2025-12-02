export type Token = import('./tokenize.js').Token;
/**
 * Node representing the root of the html
 */
export type RootNode = {
  /**
   * the node type
   */
  type: 'root';
  /**
   * - the nodes that are in the root of the html
   */
  children: ASTNode[];
};
/**
 * Node representing a section of text in the html
 */
export type TextNode = {
  /**
   * the node type
   */
  type: 'text';
  text: string;
};
/**
 * Node representing a variable placeholder in the html
 */
export type VariableNode = {
  /**
   * the node type
   */
  type: 'variable';
  variableName: string;
};
/**
 * Node representing a if block construct in the html
 */
export type IfNode = {
  /**
   * the node type
   */
  type: 'if';
  /**
   * the condition to evaluate
   */
  condition: string;
  /**
   * the nodes contained inside the if blocks body
   */
  children: ASTNode[];
};
/**
 * Node representing a for loop construct in the html
 */
export type ForNode = {
  /**
   * the node type
   */
  type: 'for';
  /**
   * the variable containing the values to iterate over
   */
  sourceVar: string;
  /**
   * the variable that contains the value of the current loop run
   */
  loopVar: string;
  /**
   * the nodes contained inside the for loops body
   */
  children: ASTNode[];
};
/**
 * Representation of a section of html
 */
export type ASTNode = RootNode | TextNode | VariableNode | ForNode;
/**
 * Creates an abstract syntax from a list of tokens
 *
 * @param {Token[]} tokens tokens representing a html document
 * @returns {RootNode} the root node of the abstract syntax tree
 */
export function createAST(tokens: Token[]): RootNode;
