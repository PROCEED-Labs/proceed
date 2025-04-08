const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  /**
   *
   * @param {import('webpack').Configuration} config
   * @param {import('next/dist/server/config-shared').WebpackConfigContext} context
   * @returns {import('webpack').Configuration}
   */
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // This is due to needing to init our in-memory db before accessing the getters.
    // Can probably be removed once we switch to a real db.
    config.experiments.topLevelAwait = true;
    // Important: return the modified config
    return config;
  },
  env: {
    NEXT_PUBLIC_USE_AUTH: 'true',
    // Provide default values for development if no .env file is present. In
    // production, the environment variables are set in the deployment
    // configuration during runtime.
    ...(process.env.NODE_ENV === 'development'
      ? {
          NEXTAUTH_SECRET:
            process.env.NEXTAUTH_SECRET ?? 'T8VB/r1dw0kJAXjanUvGXpDb+VRr4dV5y59BT9TBqiQ=',
          SHARING_ENCRYPTION_SECRET:
            process.env.SHARING_ENCRYPTION_SECRET ?? 'T8VB/r1dw0kJAXjanUvGXpDb+VRr4dV5y59BT9TBqiQ=',
        }
      : {}),
  },
  redirects: async () => {
    return [
      {
        source: '/',
        destination: '/processes',
        // Permanent redirects get cached by browsers for a lifetime, so they
        // are effectively a de-commision of the old URL.
        // https://lists.w3.org/Archives/Public/ietf-http-wg/2017OctDec/0363.html
        permanent: false,
      },
    ];
  },
  rewrites: async () => {
    return [
      'processes',
      'spaces',
      'executions',
      'engines',
      'tasklist',
      'general-settings',
      'iam',
      'profile',
      'projects',
    ].map((folder) => ({
      // TODO: when building techserver separately, this can be set to rewrite
      // all unused paths to /404.
      source: `/${folder}/:path*`,
      destination: `/my/${folder}/:path*`,
    }));
  },
};

module.exports = nextConfig;
