const path = require('path')

module.exports = {
  options: {
    serverEntry: 'server',
  },
  use: [
    // TODO: make this shit stop throwing nonsensical errors
    // [
    //   'neutrino-preset-airbnb',
    //   {
    //     eslint: {
    //       baseConfig: {
    //         extends: ['prettier', 'prettier/react'],
    //       },
    //       rules: {
    //         'react/jsx-filename-extension': 0,
    //         'react/prop-types': 0,
    //         'no-param-reassign': [1, { props: false }],
    //         // TODO: Make import/resolver work with webpack alias
    //         'import/no-extraneous-dependencies': 0,
    //         'import/extensions': 0,
    //         'import/no-unresolved': 0,
    //       },
    //       // settings: {
    //       //   'import/resolver': {
    //       //     webpack: {
    //       //       config: {
    //       //         resolve: {
    //       //           alias: {
    //       //             app: path.resolve('./src/app'),
    //       //             server: path.resolve('./src/server'),
    //       //           },
    //       //         },
    //       //       },
    //       //     },
    //       //   },
    //       // },
    //     },
    //   },
    // ],

    [
      'tux/neutrino',
      {
        style: {
          test: /\.scss/,
          loaders: [
            {
              loader: require.resolve('sass-loader'),
              options: {
                data: '@import "~@svef/styles/includes/index.scss";',
                includePaths: [
                  path.resolve(__dirname, '../../node_modules'),
                  path.resolve(__dirname, '../../node_modules/@svef/styles'),
                ],
              },
            },
            {
              loader: require.resolve('@epegzz/sass-vars-loader'),
              options: {
                files: [require.resolve('@svef/styles/variables')],
              },
            },
          ],
        },
      },
    ],

    // Create alias for main folders
    neutrino => {
      neutrino.config.resolve.alias
        .set('app', path.resolve(__dirname, './src/app'))
        .set('server', path.resolve(__dirname, './src/server'))
    },

    // Compile source files for shared components as well
    neutrino => {
      neutrino.config.module
        .rule('compile')
        .include.add(/\/components\/src/)
        .add(/\/styles/)
    },
  ],
}
