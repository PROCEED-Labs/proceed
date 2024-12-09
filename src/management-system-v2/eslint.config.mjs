import { FlatCompat } from '@eslint/eslintrc';
import { fixupConfigRules } from '@eslint/compat';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const config = [
  ...fixupConfigRules(
    compat.extends(
      '../../.eslintrc.js',
      'next/core-web-vitals',
      'prettier',
      'plugin:@tanstack/eslint-plugin-query/recommended',
    ),
  ),
];

export default config;
