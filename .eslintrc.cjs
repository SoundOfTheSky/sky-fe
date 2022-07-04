module.exports = {
  parserOptions: {
    project: ['tsconfig.json'],
  },
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:@typescript-eslint/strict',
    'plugin:solid/typescript',
    'plugin:jsx-a11y/strict',
    'plugin:sonarjs/recommended',
    'plugin:prettier/recommended',
  ],
  rules: {
    'prettier/prettier': 1,
    '@typescript-eslint/no-misused-promises': 0,
    'sonarjs/cognitive-complexity': ['error', 20],
    '@typescript-eslint/no-non-null-assertion': 0,
    '@typescript-eslint/consistent-type-definitions': [2, 'type'],
    'jsx-a11y/media-has-caption': 0,
  },
};
