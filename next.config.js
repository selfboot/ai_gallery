const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'slefboot-1251736664.file.myqcloud.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;