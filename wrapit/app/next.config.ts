import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@wrapit/domain', '@wrapit/adapters'],
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
