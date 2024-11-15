// @ts-check
import skyEslintConfig from '@softsky/configs/eslint.config.mjs';
import solid from "eslint-plugin-solid/configs/typescript";

/** @type {import("typescript-eslint").Config} */
export default [
  ...skyEslintConfig,
  solid,
];
