
const NextFederationPlugin = require('@module-federation/nextjs-mf');

const ModuleFederationPlugin = require('webpack').container.ModuleFederationPlugin;


/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['antd'],
  env: {
    API_URL:
      process.env.NODE_ENV === 'development' ? 'https://localhost:33080/api' : process.env.API_URL,
    BACKEND_URL: process.env.NODE_ENV === 'development' ? 'https://localhost:33080' : 'FIXME',
    NEXT_PUBLIC_USE_AUTH: process.env.USE_AUTHORIZATION === 'true',
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/processes',
        permanent: false,
      },
    ];
  },
  // webpack(config, options) {
  //   const { isServer } = options;

  //   // if (!isServer) {
  //   //   config.plugins.push(new NextFederationPlugin({
  //   //     name: "host",
  //   //     filename: 'static/chunks/remoteEntry.js',
  //   //     shared: {
  //   //       // react: {
  //   //       //   eager: true,
  //   //       //   singleton: true,
  //   //       // },
  //   //       // 'react-dom': {},
  //   //       antd: {
  //   //         eager: true,
  //   //         singleton: true
  //   //       }
  //   //     }
  //   //   }))
  //   // }


  //   return config;
  // }
};

module.exports = nextConfig;
