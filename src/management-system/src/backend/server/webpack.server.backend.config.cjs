const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const projectPackageJson = require('../../../package.json');

module.exports = {
  target: 'node',
  entry: './index.js',
  mode: 'production',
  output: {
    // eslint-disable-next-line no-undef
    path: path.resolve(__dirname, './../../../../../build/management-system/server'),
    filename: 'server.js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.SERVER': JSON.stringify(process.env.SERVER || 'true'),
    }),
    // Take the webpack file because webpack does not parse import.meta.url in
    // the node file.
    new webpack.NormalModuleReplacementPlugin(/dirname/, (result) => {
      if (result.request) {
        result.request = result.request.replace('-node', '-webpack');
      }
    }),
    // https://v4.webpack.js.org/plugins/copy-webpack-plugin/
    new CopyWebpackPlugin([
      {
        from: path.join(__dirname, 'https-public-dev-certificate.pem'),
        to: 'https-public-dev-certificate.pem',
      },
      {
        from: path.join(__dirname, 'https-private-dev-key.key'),
        to: 'https-private-dev-key.key',
      },
      {
        from: path.join(__dirname, 'Dockerfile'),
        to: 'Dockerfile',
        toType: 'file',
      },
      {
        from: path.join(__dirname, '.puppeteerrc.cjs'),
        to: '.puppeteerrc.cjs',
      },
      {
        from: path.join(__dirname, '../../../../../docker-compose.yml'),
        to: 'docker-compose.yml',
        toType: 'file',
      },
      {
        from: path.join(__dirname, 'README.md'),
        to: 'README.md',
      },
      {
        from: path.join(__dirname, '../../../opa/policies'),
        to: 'policies',
      },
      {
        from: path.join(__dirname, '../../../opa/main.rego'),
        to: 'main.rego',
        toType: 'file',
      },
    ]),
    {
      apply: (compiler) => {
        compiler.hooks.done.tap('UserInstallPlugin', (stats) => {
          // get all external dependencies
          const externals = stats.compilation.options.externals.map((entry) => {
            if (typeof entry === 'object') {
              return Object.keys(entry)[0];
            }

            return entry;
          });

          const dependencies = {};

          // get the correct versions of the dependencies from the node_modules directory
          for (const external of externals) {
            // ignore the serverConfig.js external which seems to be a function here
            if (typeof external === 'string') {
              const packageJson = JSON.parse(
                fs.readFileSync(
                  path.join(__dirname, `../../../../../node_modules/${external}/package.json`),
                  'utf-8',
                ),
              );

              dependencies[external] = packageJson.version;
            }
          }

          // write package.json with dependencies into output
          const serverPackageJson = {
            name: projectPackageJson.name,
            version: projectPackageJson.version,
            author: projectPackageJson.author,
            homepage: projectPackageJson.homepage,
            bugs: projectPackageJson.bugs,
            description: projectPackageJson.description,
            license: projectPackageJson.license,
            repository: projectPackageJson.repository,
            main: 'server.js',
            scripts: {
              'start-new':
                'API_ONLY=true node server.js & cd management-system-v2 && npm run start',
            },
            dependencies,
          };

          fs.writeFileSync(
            path.join(stats.compilation.compiler.outputPath, 'package.json'),
            JSON.stringify(serverPackageJson, null, 2),
          );
        });
      },
    },
  ],
  externals: [
    {
      vm2: "require('vm2')",
    },
    {
      puppeteer: "require('puppeteer')",
    },
  ],
  node: {
    __dirname: false,
  },
  resolve: {
    extensions: ['.js', '.ts', '.json', '.wasm', '.mjs'],
  },
};
