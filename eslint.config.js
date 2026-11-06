import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const DOMAIN_MESSAGE =
  'src/domain must stay framework- and transport-agnostic (pure TypeScript).'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'openspec', 'docs', '.claude']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
  },
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-dom',
                'react/*',
                '@tanstack/*',
                'react-router',
                '@/api',
                '@/api/*',
                '@/features',
                '@/features/*',
                '@/app',
                '@/app/*',
                '@/shared',
                '@/shared/*',
                '@/config',
                '**/api',
                '**/api/*',
                '**/features',
                '**/features/*',
                '**/app',
                '**/app/*',
              ],
              message: DOMAIN_MESSAGE,
            },
          ],
        },
      ],
    },
  },
])
