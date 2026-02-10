const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  outputFileTracingIncludes: {
    '/': ['../../node_modules/.prisma/**/*', '../../node_modules/@prisma/**/*'],
  },
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
      {
        source: '/processes',
        destination: '/my/processes/editor',
      },
      {
        source: '/processes/:mode/:path*',
        destination: '/my/processes/:mode/:path*',
      },
      {
        source: '/:environmentId/processes',
        destination: '/:environmentId/processes/editor/',
      },
      // Catch-all rewrite for remaining paths (must be last)
      ...[
        'spaces',
        'executions',
        'executions-dashboard',
        'engines',
        'tasklist',
        'tasks',
        'general-settings',
        'iam',
        'profile',
        'user-competence',
        'projects',
        'settings',
      ].map((folder) => ({
        // TODO: when building techserver separately, this can be set to rewrite
        // all unused paths to /404.
        source: `/${folder}/:path*`,
        destination: `/my/${folder}/:path*`,
      })),
    ];
  },
};

module.exports = nextConfig;
