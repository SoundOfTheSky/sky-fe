// @ts-check
import skyEslintConfig from '@softsky/configs/eslint.config.mjs';
import solid from "eslint-plugin-solid/configs/typescript";

/** @type {import("typescript-eslint").Config} */
export default [
  ...skyEslintConfig,
  solid,
  {
    rules: {
      'unicorn/no-useless-undefined': 0,
      'unicorn/consistent-function-scoping': 0,
      '@typescript-eslint/no-explicit-any': 0,
    }
  }
];
