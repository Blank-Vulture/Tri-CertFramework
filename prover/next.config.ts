import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Static export for GitHub Pages
  output: 'export',
  
  // GitHub Pages base path
  basePath: process.env.NODE_ENV === 'production' ? '/Tri-CertFramework/prover' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/Tri-CertFramework/prover' : '',
  
  // Fix workspace root inference to this repo root
  outputFileTracingRoot: path.join(__dirname, ".."),
  
  // Ensure CSS is properly processed
  transpilePackages: [],
  
  // Image optimization disabled for static export
  images: {
    unoptimized: true,
  },
  
  // Suppress web-worker warnings from snarkjs
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    // Suppress critical dependency warnings for web-worker
    config.module.exprContextCritical = false;
    config.module.unknownContextCritical = false;
    
    return config;
  },
};

export default nextConfig;
