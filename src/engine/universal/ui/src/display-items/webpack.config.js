/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const TerserJSPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const path = require('path');

const target = process.env.TARGET;

// Save the whole html as a JS template string for use in a display item.
class SaveAsTemplateString {
  // Define `apply` as its prototype method which is supplied with compiler as its argument
  apply(compiler) {
    // Specify the event hook to attach to
    compiler.hooks.emit.tap('EscapeForTemplateString', (compilation) => {
      const template = Object.assign({}, compilation.assets['index.html']);
      template.source = () =>
        `\`${compilation.assets['index.html']
          .source()
          .replace(/\\/g, '\\\\')
          .replace(/\${/g, '\\${')
          .replace(/`/g, '\\`')}\``;
      compilation.assets['template.txt'] = template;
    });
  }
}

module.exports = {
  entry: path.resolve(__dirname, target, 'index.js'),
  mode: 'production',
  output: {
    filename: `${target}.js`,
    path: path.resolve(__dirname, target, 'dist'),
  },
  optimization: {
    minimizer: [new TerserJSPlugin({}), new OptimizeCssAssetsPlugin({})],
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
  devServer: {
    contentBase: path.resolve(__dirname, target, 'dist'),
    port: 9000,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
    },
    host: '0.0.0.0',
  },
  plugins: [
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({}),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, target, 'index.html'),
      inlineSource: '.(js|css)$',
      minify: {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
      },
    }),
    new HtmlWebpackInlineSourcePlugin(),
    new SaveAsTemplateString(),
  ],
};
