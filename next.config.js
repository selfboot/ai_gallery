const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['lodash'],
  turbopack: {
    resolveAlias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'slefboot-1251736664.file.myqcloud.com',
        port: '',
        pathname: '/**',
      },
    ]
  },
};

module.exports = nextConfig;