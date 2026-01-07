import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // Only use basePath in production builds (for GitHub Pages deployment)
  // In development, the app will be available at root (localhost:3000/)
  basePath: process.env.NODE_ENV === 'production' ? '/mmv2' : '',
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;
