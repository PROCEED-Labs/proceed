module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true,
  },
  extends: 'airbnb-base',
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
    Espruino: 'readonly',
    Terminal: 'readonly',
    E: 'readonly',
    g: 'readonly',
    save: 'readonly',
    PIXL: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  rules: {
    'arrow-parens': 'off',
    'operator-linebreak': 'off',
  },
};
