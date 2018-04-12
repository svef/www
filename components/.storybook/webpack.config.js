const path = require('path')

module.exports = {
  module: {
    rules: [
      {
        test: /\.scss$/,
        loaders: [
          'style-loader',
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              data: '@import "~@svef/styles/includes/index.scss";',
              includePaths: [
                path.resolve(__dirname, '../node_modules'),
                path.resolve(__dirname, '../node_modules/@svef/styles'),
              ],
            },
          },
          {
            loader: '@epegzz/sass-vars-loader',
            options: {
              files: [require.resolve('@svef/styles')],
            },
          },
        ],
      },
    ],
  },
}
