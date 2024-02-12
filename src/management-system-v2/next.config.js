const { readFileSync } = require('fs');
const path = require('path');

let oauthProvidersConfig;

try {
  const environmentsContent = JSON.parse(
    readFileSync(
      `../management-system/src/backend/server/environment-configurations/${process.env.NODE_ENV}/config_iam.json`,
      'utf8',
    ),
  );

  console.log('environmentsContent', environmentsContent);

  oauthProvidersConfig = {
    NEXTAUTH_SECRET: environmentsContent.nextAuthSecret,
    USE_AUTH0: environmentsContent.useAuth0 ? 'true' : 'false',
    AUTH0_CLIENT_ID: environmentsContent.clientID,
    AUTH0_CLIENT_SECRET: environmentsContent.clientSecret,
    AUTH0_clientCredentialScope: environmentsContent.clientCredentialScope,
    AUTH0_ISSUER: environmentsContent.baseAuthUrl,
    AUTH0_SCOPE: environmentsContent.scope,
  };

  Object.entries(oauthProvidersConfig).forEach(
    ([key, value]) => value === undefined && delete oauthProvidersConfig[key],
  );
} catch (_) {
  console.error(_);
  oauthProvidersConfig = {};
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // This is due to needing to init our in-memory db before accesing the getters.
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
    BACKEND_URL: process.env.NODE_ENV === 'development' ? 'http://localhost:33080' : 'FIXME',
    NEXT_PUBLIC_USE_AUTH: 'true',
    NEXTAUTH_SECRET:
      process.env.NODE_ENV === 'development'
        ? 'T8VB/r1dw0kJAXjanUvGXpDb+VRr4dV5y59BT9TBqiQ='
        : undefined,
    ...(process.env.NODE_ENV === 'development' ? oauthProvidersConfig : {}),
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
};

module.exports = nextConfig;
