import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@deckit/domain', '@deckit/google-adapters'],
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
