const path = require('path');

try {
  const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare");
  initOpenNextCloudflareForDev();
} catch {
  // @opennextjs/cloudflare is only needed for Cloudflare dev/deploy
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ['lodash'],
  turbopack: {
    resolveAlias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index,follow',
          },
        ],
      },
    ];
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