module.exports = {
  env: {},
  overrides: [
    {
      // for test files activate the jest env variables
      files: ['native/node/**'],
      env: {
        node: true,
      },
      rules: {
        'import/no-extraneous-dependencies': 'off',
      },
      // extends in override possible sinde eslint version 6.x
      // problem: vscode eslint extension bug: https://github.com/microsoft/vscode-eslint/issues/696
      // that is why it is still commented out
      // extends: [
      //   'plugin:node/recommended'
      // ],
    },
  ],
  //self defined available global variables
  globals: {},
};
