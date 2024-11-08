// @ts-check
import solid from "eslint-plugin-solid/configs/typescript";
import skyEslintConfig from 'sky-lint/eslint.config.mjs';

/** @type {import("typescript-eslint").Config} */
export default [
  ...skyEslintConfig,
  solid,
];
