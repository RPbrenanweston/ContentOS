import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Bun runtime for API routes
  serverExternalPackages: ['@supabase/supabase-js'],
};

export default nextConfig;
