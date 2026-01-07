import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/mmv2', // Required for GitHub Pages subpath deployment
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;
