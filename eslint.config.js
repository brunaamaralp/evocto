import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import unusedImports from 'eslint-plugin-unused-imports'

const unusedVarsBase = {
  vars: 'all',
  args: 'after-used',
  ignoreRestSiblings: true,
  argsIgnorePattern: '^_',
  varsIgnorePattern: '^_',
  caughtErrorsIgnorePattern: '^_',
}

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'refactor-plan/**',
      'security-fixes/**',
      'public/sw.js',
      '**/*.min.js',
      'lint-report.json',
      'lint-src.json',
      'audit-appwrite-schema*.json',
      'build-out.txt',
    ],
  },

  // App React (browser)
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'unused-imports': unusedImports,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Autofixable unused imports; keep vars/args under control with _ prefix.
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        unusedVarsBase,
      ],
    },
  },

  // Testes (vitest/jest globals)
  {
    files: [
      'src/**/*.{test,spec}.{js,jsx}',
      'src/**/__tests__/**/*.{js,jsx}',
      'src/test/**/*.{js,jsx}',
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.vitest,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
        jest: 'readonly',
      },
    },
  },

  // Node / server / scripts / configs
  {
    files: [
      'api/**/*.{js,mjs,cjs}',
      'lib/**/*.{js,mjs,cjs}',
      'scripts/**/*.{js,mjs,cjs}',
      '*.config.{js,cjs,mjs}',
      'vite.config.{js,ts}',
      'vitest.config.{js,ts}',
      'tailwind.config.js',
      'postcss.config.js',
      'eslint.config.js',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        unusedVarsBase,
      ],
    },
  },
]
