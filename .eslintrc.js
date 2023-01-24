module.exports = {
  //this is the project root dir, eslint will not include parent config files
  root: true,
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 8,
  },
  //predefined available global variables
  env: {
    es6: true,
    // activate commonjs syntax (module.export and require) for webpack
    commonjs: true,
  },
  overrides: [
    {
      // for test files activate the jest env variables
      files: ['**/__tests__/*.{j,t}s?(x)', '**/e2e/**/*.{j,t}s?(x)', '**.test.{j,t}s?(x)'],
      env: {
        jest: true,
        node: true,
      },
      // extends in override possible since eslint version 6.x
      // problem: vscode eslint extension bug: https://github.com/microsoft/vscode-eslint/issues/696
      // that is why it is still commented out
      // extends: [
      //   'plugin:jest/recommended',
      // ]
    },
  ],
  //self defined available global variables
  globals: {},
  extends: [
    'eslint-config-prettier', // has to go last to override
  ],
  rules: {
    'no-warning-comments': 'warn', // Marks TODO: etc. as warnings
    'no-undef': 'warn', // no-undef for console etc.
    'no-console': 'warn', // don't use console but instead the logging methods in each project
  },
};
