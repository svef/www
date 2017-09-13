module.exports = {
  use: [
    [
      'neutrino-preset-airbnb',
      {
        eslint: {
          baseConfig: {
            extends: ['prettier', 'prettier/react'],
          },
          rules: {
            'react/jsx-filename-extension': 0,
            'react/prop-types': 0,
            'no-param-reassign': [1, { props: false }],
          },
        },
      },
    ],
    'neutrino-preset-tux',

    // Compile source files for shared components as well
    neutrino => {
      neutrino.config.module.rule('compile').include.add(/\/components\/src/)
    },
  ],
}
