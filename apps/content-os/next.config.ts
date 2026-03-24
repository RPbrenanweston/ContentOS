import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@org/ai-core'],
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

export default nextConfig;
