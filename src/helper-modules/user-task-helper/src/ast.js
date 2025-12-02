/**
 * @typedef {import('./tokenize.js').Token} Token
 */

/**
 * Node representing the root of the html
 *
 * @typedef RootNode
 * @type {object}
 * @property {'root'} type the node type
 * @property {ASTNode[]} children - the nodes that are in the root of the html
 */

/**
 * Node representing a section of text in the html
 *
 * @typedef TextNode
 * @type {object}
 * @property {'text'} type the node type
 * @property {string} text
 */

/**
 * Node representing a variable placeholder in the html
 *
 * @typedef VariableNode
 * @type {object}
 * @property {'variable'} type the node type
 * @property {string} variableName
 */

/**
 * Node representing a if block construct in the html
 *
 * @typedef IfNode
 * @type {object}
 * @property {'if'} type the node type
 * @property {string} condition the condition to evaluate
 * @property {ASTNode[]} children the nodes contained inside the if blocks body
 */

/**
 * Node representing a for loop construct in the html
 *
 * @typedef ForNode
 * @type {object}
 * @property {'for'} type the node type
 * @property {string} sourceVar the variable containing the values to iterate over
 * @property {string} loopVar the variable that contains the value of the current loop run
 * @property {ASTNode[]} children the nodes contained inside the for loops body
 */

/**
 * Representation of a section of html
 *
 * @typedef ASTNode
 * @type {RootNode|TextNode|VariableNode|ForNode}
 */

class TreeBuilder {
  /**
   * @param {Token} tokens
   */
  constructor(tokens) {
    this.tokens = tokens;
    this.currentToken = 0;
  }

  /**
   * Returns the next token if there is still one
   *
   * @returns {Token|undefined} a token or nothing if all tokens were used
   **/
  getToken() {
    if (this.currentToken < this.tokens.length) return this.tokens[this.currentToken++];
  }

  /**
   * Returns an ast tree node representing an if block
   *
   * @returns {IfNode}
   **/
  getIfNode() {
    const ifToken = this.tokens[this.currentToken - 1];
    /** @type {IfNode} */
    const node = { type: 'if', condition: ifToken.condition };

    node.children = [];

    let current = this.getToken();
    while (current) {
      switch (current.type) {
        case 'text':
          node.children.push({ type: 'text', text: current.content });
          break;
        case 'variable':
          node.children.push({ type: 'variable', variableName: current.variableName });
          break;
        case 'start_for':
          node.children.push(this.getForNode());
          break;
        case 'start_if':
          node.children.push(this.getIfNode());
          break;
        case 'end_if':
          return node;
        case 'end_for':
          throw new Error(
            'Encountered the end of a for loop without having encountered the start before!',
          );
        default:
          throw new Error('Wrong syntax in input!');
      }
      current = this.getToken();
    }

    throw new Error(`Missing the closing construct for the if block {%if ${ifToken.condition}%}!`);
  }

  /**
   * Returns an ast tree node representing a for loop
   *
   * @returns {ForNode}
   **/
  getForNode() {
    const forToken = this.tokens[this.currentToken - 1];
    /** @type {ForNode} */
    const node = { type: 'for', loopVar: forToken.loopVar, sourceVar: forToken.sourceVar };

    node.children = [];

    let current = this.getToken();
    while (current) {
      switch (current.type) {
        case 'text':
          node.children.push({ type: 'text', text: current.content });
          break;
        case 'variable':
          node.children.push({ type: 'variable', variableName: current.variableName });
          break;
        case 'start_if':
          node.children.push(this.getIfNode());
          break;
        case 'start_for':
          node.children.push(this.getForNode());
          break;
        case 'end_for':
          return node;
        case 'end_if':
          throw new Error(
            'Encountered the end of a conditional block without having encountered the start before!',
          );
        default:
          throw new Error('Wrong syntax in input!');
      }
      current = this.getToken();
    }

    throw new Error(
      `Missing the closing construct for the loop {%for ${forToken.loopVar} in ${forToken.sourceVar}%}!`,
    );
  }

  /**
   * Returns an root node containing the other nodes in the html tree
   *
   * @returns {RootNode}
   **/
  getTree() {
    /** @type {RootNode} */
    const root = { type: 'root', children: [] };

    root.children = [];

    let current = this.getToken();
    while (current) {
      switch (current.type) {
        case 'text':
          root.children.push({ type: 'text', text: current.content });
          break;
        case 'variable':
          root.children.push({ type: 'variable', variableName: current.variableName });
          break;
        case 'start_for':
          root.children.push(this.getForNode());
          break;
        case 'start_if':
          root.children.push(this.getIfNode());
          break;
        case 'end_for':
          throw new Error(
            'Encountered the end of a for loop without having encountered the start before!',
          );
        case 'end_if':
          throw new Error(
            'Encountered the end of a conditional block without having encountered the start before!',
          );
        default:
          throw new Error('Wrong syntax in input!');
      }
      current = this.getToken();
    }

    return root;
  }
}

/**
 * Creates an abstract syntax from a list of tokens
 *
 * @param {Token[]} tokens tokens representing a html document
 * @returns {RootNode} the root node of the abstract syntax tree
 */
function createAST(tokens) {
  const builder = new TreeBuilder(tokens);

  return builder.getTree();
}

module.exports = {
  createAST,
};
