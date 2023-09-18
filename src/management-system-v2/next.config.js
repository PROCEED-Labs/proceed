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
};

module.exports = nextConfig;
