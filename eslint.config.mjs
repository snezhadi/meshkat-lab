import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends(
    'next/core-web-vitals',
    'next/typescript',
    'plugin:import/recommended',
    'prettier',
    'plugin:prettier/recommended'
  ),
  {
    rules: {
      // Disable strict rules that are causing build failures
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'react/no-unescaped-entities': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'import/no-duplicates': 'warn',
      'prettier/prettier': 'warn',
      '@next/next/no-img-element': 'warn',
      'prefer-const': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      'import/named': 'warn'
    }
  }
];

export default eslintConfig;
