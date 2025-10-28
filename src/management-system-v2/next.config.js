const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
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
      'executions-dashboard',
      'engines',
      'tasklist',
      'tasks',
      'general-settings',
      'iam',
      'profile',
      'projects',
      'settings',
    ].map((folder) => ({
      // TODO: when building techserver separately, this can be set to rewrite
      // all unused paths to /404.
      source: `/${folder}/:path*`,
      destination: `/my/${folder}/:path*`,
    }));
  },
};

module.exports = nextConfig;
