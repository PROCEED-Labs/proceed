const path = require('path');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
//   .BundleAnalyzerPlugin;

module.exports = {
  entry: ['babel-polyfill', '../../modules/core/src/module.js'],
  mode: 'production',
  target: 'web',
  output: {
    filename: 'engine-lib.js',
    path: path.resolve(__dirname, 'modules'),
    library: 'engine',
    libraryTarget: 'var',
  },
  // plugins: [new BundleAnalyzerPlugin()],
  node: {
    fs: 'empty',
    module: 'empty',
    util: 'empty',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
};
