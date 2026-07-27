import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '../Backend/public/dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Fetch-on-mount is an intentional, standard pattern throughout this app.
      'react-hooks/set-state-in-effect': 'off',
      // Route/store files intentionally export non-component values.
      'react-refresh/only-export-components': 'off',
    },
  },
  // Prettier owns formatting — keep this last to disable conflicting rules.
  prettier,
])
