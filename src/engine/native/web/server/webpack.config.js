const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: 'main.[contentHash].js',
  },
  module: {
    rules: [
      {
        test: /\.html$/,
        use: ['html-loader'],
      },
    ],
  },
  optimization: {
    minimizer: [
      new TerserPlugin(),
      new HtmlWebpackPlugin({
        template: './src/template.html',
        minify: {
          removeAttributeQuotes: true,
          collapseWhitespace: true,
          removeComments: true,
        },
      }),
    ],
  },
  plugins: [new CleanWebpackPlugin()],
};
