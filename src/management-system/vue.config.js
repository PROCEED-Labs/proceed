const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const webpack = require('webpack');
const path = require('path');
const autoprefixer = require('autoprefixer');
const ports = require('./ports.js');

let outputPath;

switch (process.env.MODE) {
  case 'electron':
    outputPath = path.join(__dirname, './dist');
    break;
  // output bundle for the MS Web Client into subdirectory in server build directory
  case 'frontend':
    outputPath = path.join(__dirname, './../../build/management-system/server/frontend');
    break;
  // output bundle for the puppeteer bpmn-js client into another subdirectory in server build directory
  case 'puppeteer':
    outputPath = path.join(__dirname, './../../build/management-system/server/puppeteerPages');
    break;
  default:
    throw new Error(
      `Expected process env variable MODE to have one of the values ["electron","frontend","puppeteer"]. Value was ${process.env.MODE}`
    );
}

let pages = {
  // options used for both electron and the MS Server frontend
  frontend: {
    entry: path.join(__dirname, './src/frontend/main.js'),

    template: path.join(__dirname, './public/frontendTemplate.html'),

    filename: 'index.html',
  },
};

if (process.env.MODE === 'puppeteer') {
  // option replacing the one for electron and the regular frontend in case we want to build the puppeteer client
  pages = {
    'backend-puppeteer-bpmn-js': {
      entry: path.join(
        __dirname,
        './src/backend/server/puppeteerWebsiteForServerWithBpmnModeller.js'
      ),

      template: path.join(__dirname, './public/puppeteerTemplateWebsiteForServer.html'),

      filename: 'bpmn-modeller.html',
    },
  };
}

module.exports = {
  outputDir: outputPath,
  pages,
  lintOnSave: true,
  devServer: {
    https: process.env.MODE === 'electron' ? undefined : {},
    // where we are serving static assets from in dev mode
    contentBase: path.resolve(__dirname, './public'),
    // on which endpoint static assets are served
    contentBasePublicPath: '/',
    // use different ports for the dev servers of electron, frontend and the puppeteer frontend
    port: ports['dev-server'][process.env.MODE],
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
    },
    host: process.env.MODE !== 'electron' ? '0.0.0.0' : undefined,
    // avoid problems with too much output when starting the dev-server in a child process
    // we do this for the server development to start server and frontend with one command
    progress: process.env.MODE !== 'electron' ? false : true,
    // route calls to the REST API to the actual server when developing the server frontend
    proxy:
      process.env.MODE !== 'electron'
        ? {
            '/api': {
              target: 'https://localhost:33080',
            },
            '/resources': {
              target: 'https://localhost:33080',
            },
            '/login': {
              target: 'https://localhost:33080',
            },
            '/logout': {
              target: 'https://localhost:33080',
            },
            '/register': {
              target: 'https://localhost:33080',
            },
            '/callback': {
              target: 'https://localhost:33080',
            },
            '/userinfo': {
              target: 'https://localhost:33080',
            },
          }
        : undefined,
  },
  css: {
    loaderOptions: {
      postcss: {
        plugins: [
          // eslint-disable-next-line global-require, import/no-extraneous-dependencies, node/no-extraneous-require
          autoprefixer(),
        ],
      },
    },
  },
  configureWebpack: (config) => {
    // don't create source maps for the production build
    config.devtool = process.env.NODE_ENV === 'production' ? '' : 'source-map';
    // create '@' alias for importing: points to management-system/src/
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');

    // helps loading monaco editor
    config.plugins = config.plugins.concat([
      new MonacoWebpackPlugin({
        languages: ['javascript', 'typescript'],
      }),
    ]);

    // replace the api import for either the frontend or the electron app
    // the puppeteer client has the server version hardcoded since it is not used/needed in the electron case
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/\/ms-api-interface\//, (result) => {
        if (result.request) {
          result.request = result.request.replace(
            'interface',
            process.env.MODE === 'electron' ? 'electron' : 'server' // 'electron' or 'server'
          );
        }
      })
    );

    // to enable logging with the backend logger in modules imported by the electron version
    if (process.env.MODE === 'electron') {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/dirname/, (result) => {
          if (result.request) {
            result.request = result.request.replace('-node', '-webpack');
          }
        })
      );
    }

    config.module.rules.push({
      test: /node_modules[/\\](iconv-lite)[/\\].+/,
      resolve: {
        aliasFields: ['main'],
      },
    });

    // build the frontend and puppeteer client for the web
    if (process.env.MODE !== 'electron') {
      config.target = 'web';
      config.plugins = config.plugins.concat([
        new webpack.DefinePlugin({
          'process.env.IS_WEB': 'true',
        }),
      ]);
    } else {
      config.target = 'electron-renderer';
      // vm2 can't be bundled using webpack
      config.externals = [
        {
          vm2: "require('vm2')",
        },
      ];
    }
  },
  chainWebpack: (config) => {
    config.module.rule('css').exclude.add(/\.lazy\.css$/i);
    config.module
      .rule('lazy.css')
      .test(/\.lazy\.css$/i)
      .use('style-loader')
      .loader('style-loader')
      .tap((options) => ({ injectType: 'lazyStyleTag' }))
      .end()
      .use('css-loader')
      .loader('css-loader')
      .end();
  },
  pluginOptions: {
    electronBuilder: {
      outputDir: '../../build/management-system/electron',
      builderOptions: {
        // BUG: delete this line if bug is resolved:
        // https://github.com/electron-userland/electron-builder/issues/4157
        // else you need to always update this to the newest/current electron version
        // that yarn has resolved in root/yarn.lock
        // 6.x.x
        electronVersion: '6.0.11',
        productName: 'PROCEED-Management-System',
        // eslint-disable-next-line no-template-curly-in-string
        artifactName: '${productName}-${version}.${ext}',
        appId: 'de.tu-berlin.snet.proceed',
        copyright: 'PROCEED Project Authors',
        dmg: {
          contents: [
            {
              x: 410,
              y: 150,
              type: 'link',
              path: '/Applications',
            },
            {
              x: 130,
              y: 150,
              type: 'file',
            },
          ],
        },
        mac: {
          icon: 'public/icons/icon.icns',
          target: 'dmg',
          category: 'public.app-category.developer-tools',
        },
        win: {
          icon: 'public/icons/icon.ico',
        },
        linux: {
          icon: 'public/icons',
          category: 'development',
        },
        extraResources: [
          {
            // copying from hoisted node_modules in root directory into the app directory
            from: '../../node_modules/vm2',
            to: './node_modules/vm2',
            filter: '**',
          },
        ],
      },
      nodeModulesPath: ['../../node_modules', './node_modules'],
      mainProcessFile: './src/backend/electron/background.js',
    },
  },
};
