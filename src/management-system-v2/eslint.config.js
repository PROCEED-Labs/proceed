const { defineConfig, globalIgnores } = require('eslint/config');
const nextVitals = require('eslint-config-next/core-web-vitals');
const pluginQuery = require('@tanstack/eslint-plugin-query');
const eslintConfigPrettier = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  ...nextVitals,
  ...pluginQuery.configs['flat/recommended'],
  eslintConfigPrettier,
  globalIgnores(['.next/**', 'build/**', 'next-env.d.ts']),
]);
