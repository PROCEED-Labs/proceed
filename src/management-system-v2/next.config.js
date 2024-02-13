const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // This is due to needing to init our in-memory db before accessing the getters.
    // Can probably be removed once we switch to a real db.
    config.experiments.topLevelAwait = true;
    // Important: return the modified config
    return config;
  },
  env: {
    JWT_SHARE_SECRET:
      process.env.NODE_ENV === 'development'
        ? 'T8VB/r1dw0kJAXjanUvGXpDb+VRr4dV5y59BT9TBqiQ='
        : process.env.JWT_SHARE_SECRET,
    API_URL:
      process.env.NODE_ENV === 'development' ? 'http://localhost:33080/api' : process.env.API_URL,
    NEXT_PUBLIC_USE_AUTH: 'true',
    // Provide default values for development if no .env file is present. In
    // production, the environment variables are set in the deployment
    // configuration during runtime.
    ...(process.env.NODE_ENV === 'development'
      ? {
          NEXTAUTH_SECRET:
            process.env.NEXTAUTH_SECRET ?? 'T8VB/r1dw0kJAXjanUvGXpDb+VRr4dV5y59BT9TBqiQ=',
        }
      : {}),
  },
};

module.exports = nextConfig;
