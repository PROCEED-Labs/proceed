module.exports = {
  parser: 'vue-eslint-parser',
  parserOptions: {
    // vue-eslint-plugin
    parser: 'babel-eslint',
    // es6 modules are used, default "script"
    sourceType: 'module',
  },
  env: {
    browser: true,
    node: true,
  },
  // self defined available global variables
  globals: {
    __static: 'writable',
  },
  plugins: [
    'vue',
    // 'html' does not work with the vue plugin: https://eslint.vuejs.org/user-guide/#faq
  ],
  // https://eslint.vuejs.org/user-guide/#usage
  extends: [
    // predefined by vue-cli
    'plugin:vue/essential', // Keep this is for useful error message about Vue
    //'@vue/airbnb',    // REMOVED in favor of prettier (they have different opinions)
  ],
  rules: {
    // predefined by vue-cli
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'import/no-unresolved': 'off',
    // 'import/extensions': ['error', 'ignorePackages'],   // REMOVED since it
    // was defined in the airbnb ruleset
    'linebreak-style': 'off', // because of windows linebreak problem
    'max-lines': ['error', { max: 300, skipComments: true, skipBlankLines: true }],
  },
};
