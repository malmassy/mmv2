import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // No basePath needed - using custom domain (mm10570.com) which serves at root
  basePath: '',
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;
