import type { NextConfig } from "next";
import path from "path";

// GitHub Pages用のbasePath設定
// 環境変数 BASE_PATH が設定されている場合はそれを使用、なければ空文字列（開発用）
const basePath = process.env.BASE_PATH || "";
const assetPrefix = process.env.ASSET_PREFIX || basePath;

// Security headers configuration
const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
];

const nextConfig: NextConfig = {
  // Static export for GitHub Pages
  output: 'export',
  
  // GitHub Pages base path
  basePath: process.env.NODE_ENV === 'production' ? '/Tri-CertFramework/prover' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/Tri-CertFramework/prover' : '',
  
  // Security headers (applied in development and server mode)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  
  // Fix workspace root inference to this repo root
  outputFileTracingRoot: path.join(__dirname, ".."),
  
  // GitHub Pages用の設定
  ...(process.env.NEXT_EXPORT === "true" && {
    output: "export" as const,
    basePath: basePath,
    assetPrefix: assetPrefix,
    images: {
      unoptimized: true,
    },
  }),
  
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
      
      // Inject NEXT_PUBLIC_BASE_PATH for client-side usage
      if (process.env.NEXT_EXPORT === "true" && basePath) {
        config.plugins = config.plugins || [];
        config.plugins.push(
          new (require('webpack').DefinePlugin)({
            'process.env.NEXT_PUBLIC_BASE_PATH': JSON.stringify(basePath),
          })
        );
      }
    }
    
    // Suppress critical dependency warnings for web-worker
    config.module.exprContextCritical = false;
    config.module.unknownContextCritical = false;
    
    return config;
  },
};

export default nextConfig;
