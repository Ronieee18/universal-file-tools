// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Used when running with classic webpack (`next dev --webpack` / `next build --webpack`)
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
  // Used when running with Turbopack (Next.js 16 default: `next dev`)
  turbopack: {
    resolveAlias: {
      canvas: { browser: './empty-module.js' },
    },
  },
};

export default nextConfig;