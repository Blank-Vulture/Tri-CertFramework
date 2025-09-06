import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix workspace root inference to this repo root
  outputFileTracingRoot: path.join(__dirname, ".."),
  
  // Ensure CSS is properly processed
  transpilePackages: [],
  
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
