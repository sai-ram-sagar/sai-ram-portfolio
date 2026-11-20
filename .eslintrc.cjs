module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  overrides: [
    {
      // react-three-fiber elements take three.js props (position, args,
      // castShadow...) that the DOM-oriented property check does not know.
      files: ['src/components/Projects/SttScene/**/*.jsx', 'src/components/Projects/DfrScene/**/*.jsx', 'src/components/Projects/ErssScene/**/*.jsx'],
      rules: { 'react/no-unknown-property': 'off' },
    },
  ],
  rules: {
    'react/jsx-no-target-blank': 'off',
    // The project does not use PropTypes anywhere; component contracts live in
    // the data modules under src/data.
    'react/prop-types': 'off',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
}
