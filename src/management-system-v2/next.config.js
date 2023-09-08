/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['antd'],
  env: {
    API_URL:
      process.env.NODE_ENV === 'development' ? 'https://localhost:33083/api' : process.env.API_URL,
    BACKEND_URL: process.env.NODE_ENV === 'development' ? 'https://localhost:33083' : 'FIXME',
    NEXT_PUBLIC_USE_AUTH: process.env.USE_AUTH === 'true',
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
