const rules = {
  'no-undef': 'error',
  'no-unreachable': 'error',
  'no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
  'no-constant-condition': 'error'
};

export default [
  {
    files: ['js/main.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        window: 'readonly', document: 'readonly', navigator: 'readonly', location: 'readonly',
        localStorage: 'readonly', performance: 'readonly', console: 'readonly', Math: 'readonly',
        JSON: 'readonly', String: 'readonly', Number: 'readonly', Date: 'readonly', Object: 'readonly',
        Array: 'readonly', Infinity: 'readonly', Image: 'readonly', FileReader: 'readonly', Error: 'readonly',
        innerWidth: 'readonly', innerHeight: 'readonly', devicePixelRatio: 'readonly',
        requestAnimationFrame: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly',
        addEventListener: 'readonly'
      }
    },
    rules
  },
  {
    files: ['js/*-test.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly', URL: 'readonly', Set: 'readonly', Map: 'readonly', Proxy: 'readonly'
      }
    },
    rules
  }
];
