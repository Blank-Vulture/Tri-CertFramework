# 技術設計書 (TSD) — Verifier UI  
最終更新: 2025-06-16 Version 2.0

---

## 1. 技術スタック（完全静的サイト）
| 層 | 技術 | バージョン |
|----|------|-----------|
| フロントエンド | Next.js 15 + React 18 + TypeScript | 15.0+ / 18.0+ / 5.0+ |
| PDF 解析 | pdf.js + pdf-lib | 4.0+ / 1.17+ |
| ZKP 検証 | Circom 2.1.4 + SnarkJS 0.7 | Latest |
| ブロックチェーン | ethers.js v6 + Polygon zkEVM | 6.0+ |
| UI フレームワーク | Tailwind CSS + shadcn/ui | 3.4+ |
| 状態管理 | Zustand + React Query | 4.5+ / 5.0+ |
| ビルド | Next.js SSG + Vercel | Static Export |

## 2. Next.js 静的サイト生成設計

### 2.1 アプリケーション構成
```
verifier-ui-app/
├── next.config.js          # SSG設定
├── public/
│   ├── circuits/           # ZKP検証回路（WASM）
│   │   ├── certificate_js/
│   │   │   ├── certificate.wasm
│   │   │   └── certificate_js.js
│   │   └── verification_key.json
│   ├── workers/            # Web Worker
│   │   ├── verification-worker.js
│   │   └── pdf-parser-worker.js
│   └── icons/              # アイコン・画像
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── page.tsx        # メインページ
│   │   ├── verify/
│   │   │   └── page.tsx    # 検証ページ
│   │   └── report/
│   │       └── [id]/
│   │           └── page.tsx # 検証結果ページ
│   ├── components/         # React コンポーネント
│   ├── services/           # 検証サービス
│   ├── utils/              # ユーティリティ
│   ├── types/              # TypeScript 型定義
│   └── hooks/              # カスタムフック
└── out/                    # 静的ビルド出力
```

### 2.2 Next.js 設定（SSG）
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  webpack: (config, { isServer }) => {
    // WASM サポート
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true
    };

    // Worker サポート
    config.module.rules.push({
      test: /\.worker\.js$/,
      use: { loader: 'worker-loader' }
    });

    // pdf.js サポート
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        canvas: false
      };
    }

    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
```

## 3. PDF/A-3 解析・ZKP抽出

### 3.1 PDF 解析サービス
```typescript
// services/PDFAnalyzer.ts
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

// PDF.js Worker設定
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface ExtractedData {
  pdfHash: string;
  zkpProof: any;
  headerData: any;
  pageContent: string;
  metadata: any;
}

export class PDFAnalyzer {
  async analyzePDF(file: File): Promise<ExtractedData> {
    const arrayBuffer = await file.arrayBuffer();
    
    // 1. PDF基本情報取得
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const metadata = await pdfDoc.getMetadata();
    
    // 2. PDF/A-3添付ファイル抽出
    const attachments = await this.extractAttachments(arrayBuffer);
    
    // 3. ZKP証明データ検索
    const zkpData = this.findZKPAttachment(attachments);
    
    // 4. PDFハッシュ計算
    const pdfHash = await this.calculatePDFHash(arrayBuffer);
    
    // 5. ページコンテンツ抽出
    const pageContent = await this.extractTextContent(pdfDoc);
    
    return {
      pdfHash,
      zkpProof: zkpData?.proof,
      headerData: zkpData?.header,
      pageContent,
      metadata: metadata.info
    };
  }

  private async extractAttachments(pdfBuffer: ArrayBuffer): Promise<Map<string, ArrayBuffer>> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const attachments = new Map<string, ArrayBuffer>();
    
    // PDF内の添付ファイル検索・抽出
    const embeddedFiles = pdfDoc.catalog.lookup(pdfjsLib.PDFName.get('Names'));
    if (embeddedFiles) {
      const fileSpec = embeddedFiles.get(pdfjsLib.PDFName.get('EmbeddedFiles'));
      if (fileSpec) {
        // 添付ファイル処理（実装省略）
        // ISO 19005-3 (PDF/A-3) 仕様に従った抽出
      }
    }
    
    return attachments;
  }

  private findZKPAttachment(attachments: Map<string, ArrayBuffer>): any {
    for (const [filename, data] of attachments) {
      if (filename.includes('zkp') || filename.includes('proof')) {
        try {
          const textData = new TextDecoder().decode(data);
          return JSON.parse(textData);
        } catch (error) {
          console.warn('Failed to parse ZKP data:', filename);
        }
      }
    }
    return null;
  }

  private async calculatePDFHash(pdfBuffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', pdfBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async extractTextContent(pdfDoc: any): Promise<string> {
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  }
}
```

## 4. Circom + SnarkJS ZKP検証

### 4.1 ZKP検証サービス
```typescript
// services/ZKPVerifier.ts
import { groth16 } from 'snarkjs';

interface VerificationResult {
  isValid: boolean;
  publicSignals: string[];
  verificationKey: any;
  proof: any;
  verificationTime: number;
}

export class ZKPVerifier {
  private wasmPath = '/circuits/certificate_js/certificate.wasm';
  private zkeyPath = '/circuits/certificate.zkey';
  private vkeyPath = '/circuits/verification_key.json';

  async verifyProof(proof: any, publicSignals: string[]): Promise<VerificationResult> {
    const startTime = performance.now();
    
    try {
      // 1. Verification Key 読み込み
      const vKey = await this.loadVerificationKey();
      
      // 2. SnarkJS Groth16 検証
      const isValid = await groth16.verify(vKey, publicSignals, proof);
      
      const verificationTime = performance.now() - startTime;
      
      return {
        isValid,
        publicSignals,
        verificationKey: vKey,
        proof,
        verificationTime
      };
    } catch (error) {
      console.error('ZKP verification failed:', error);
      return {
        isValid: false,
        publicSignals,
        verificationKey: null,
        proof,
        verificationTime: performance.now() - startTime
      };
    }
  }

  private async loadVerificationKey(): Promise<any> {
    try {
      const response = await fetch(this.vkeyPath);
      if (!response.ok) {
        throw new Error('Failed to load verification key');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to load verification key:', error);
      throw error;
    }
  }

  async validatePublicSignals(signals: string[], expectedData: any): Promise<boolean> {
    // 公開入力の検証
    try {
      // signals[0]: 公開鍵ハッシュ
      // signals[1]: Merkle Root
      // signals[2]: 卒業年度
      // signals[3]: 証明書ハッシュ
      
      const publicKeyHash = signals[0];
      const merkleRoot = signals[1];
      const graduationYear = parseInt(signals[2]) / 1000000; // スケーリング調整
      const certificateHash = signals[3];
      
      // 期待値との比較
      return (
        publicKeyHash === expectedData.publicKeyHash &&
        merkleRoot === expectedData.merkleRoot &&
        Math.abs(graduationYear - expectedData.graduationYear) < 1 &&
        certificateHash === expectedData.certificateHash
      );
    } catch (error) {
      console.error('Public signals validation failed:', error);
      return false;
    }
  }

  async benchmarkVerification(): Promise<{ avgTime: number; iterations: number }> {
    const iterations = 10;
    const times: number[] = [];
    
    // ダミーデータでベンチマーク
    const dummyProof = {
      pi_a: ["0", "0", "1"],
      pi_b: [["0", "0"], ["0", "0"], ["1", "0"]],
      pi_c: ["0", "0", "1"],
      protocol: "groth16",
      curve: "bn128"
    };
    const dummySignals = ["0", "0", "0", "0"];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        await this.verifyProof(dummyProof, dummySignals);
      } catch (error) {
        // ベンチマーク用なのでエラーは無視
      }
      times.push(performance.now() - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    return { avgTime, iterations };
  }
}
```

## 5. ブロックチェーン検証

### 5.1 ブロックチェーン検証サービス
```typescript
// services/BlockchainVerifier.ts
import { ethers } from 'ethers';

interface BlockchainVerification {
  merkleRootValid: boolean;
  contractExists: boolean;
  blockNumber: number;
  timestamp: number;
  transactionHash: string;
}

export class BlockchainVerifier {
  private provider: ethers.JsonRpcProvider;
  private readonly GRADUATION_NFT_ABI = [
    "function merkleRoot() view returns (bytes32)",
    "function GRADUATION_YEAR() view returns (uint256)",
    "function VK_HASH() view returns (bytes32)"
  ];

  constructor() {
    this.provider = new ethers.JsonRpcProvider('https://polygon-zkevm.drpc.org');
  }

  async verifyMerkleRoot(contractAddress: string, expectedRoot: string): Promise<BlockchainVerification> {
    try {
      // 1. コントラクト存在確認
      const code = await this.provider.getCode(contractAddress);
      const contractExists = code !== '0x';
      
      if (!contractExists) {
        throw new Error('Contract does not exist');
      }

      // 2. コントラクトインスタンス作成
      const contract = new ethers.Contract(contractAddress, this.GRADUATION_NFT_ABI, this.provider);
      
      // 3. Merkle Root 取得
      const onChainRoot = await contract.merkleRoot();
      const merkleRootValid = onChainRoot.toLowerCase() === expectedRoot.toLowerCase();
      
      // 4. ブロック情報取得
      const latestBlock = await this.provider.getBlock('latest');
      
      return {
        merkleRootValid,
        contractExists,
        blockNumber: latestBlock?.number || 0,
        timestamp: latestBlock?.timestamp || 0,
        transactionHash: latestBlock?.hash || ''
      };
    } catch (error) {
      console.error('Blockchain verification failed:', error);
      throw error;
    }
  }

  async getContractInfo(contractAddress: string): Promise<{
    graduationYear: number;
    vkHash: string;
    merkleRoot: string;
  }> {
    const contract = new ethers.Contract(contractAddress, this.GRADUATION_NFT_ABI, this.provider);
    
    const [graduationYear, vkHash, merkleRoot] = await Promise.all([
      contract.GRADUATION_YEAR(),
      contract.VK_HASH(),
      contract.merkleRoot()
    ]);
    
    return {
      graduationYear: Number(graduationYear),
      vkHash,
      merkleRoot
    };
  }

  async checkNetworkHealth(): Promise<boolean> {
    try {
      const latestBlock = await this.provider.getBlock('latest');
      const now = Math.floor(Date.now() / 1000);
      const blockAge = now - (latestBlock?.timestamp || 0);
      
      // ブロックが5分以内に生成されていることを確認
      return blockAge < 300;
    } catch (error) {
      return false;
    }
  }
}
```

## 6. Web Worker による並列処理

### 6.1 検証ワーカー
```typescript
// public/workers/verification-worker.js
import { groth16 } from 'snarkjs';

self.onmessage = async function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'VERIFY_ZKP':
      try {
        const { proof, publicSignals, verificationKey } = data;
        const isValid = await groth16.verify(verificationKey, publicSignals, proof);
        
        self.postMessage({
          type: 'VERIFY_ZKP_RESULT',
          success: true,
          result: { isValid }
        });
      } catch (error) {
        self.postMessage({
          type: 'VERIFY_ZKP_RESULT',
          success: false,
          error: error.message
        });
      }
      break;
      
    case 'PARSE_PDF':
      try {
        // PDF解析処理（Worker内で実行）
        const { pdfBuffer } = data;
        // 実装省略
        
        self.postMessage({
          type: 'PARSE_PDF_RESULT',
          success: true,
          result: { /* 解析結果 */ }
        });
      } catch (error) {
        self.postMessage({
          type: 'PARSE_PDF_RESULT',
          success: false,
          error: error.message
        });
      }
      break;
  }
};
```

### 6.2 ワーカー管理フック
```typescript
// hooks/useVerificationWorker.ts
import { useCallback, useRef } from 'react';

interface WorkerResult {
  success: boolean;
  result?: any;
  error?: string;
}

export const useVerificationWorker = () => {
  const workerRef = useRef<Worker | null>(null);

  const initWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker('/workers/verification-worker.js');
    }
    return workerRef.current;
  }, []);

  const verifyZKP = useCallback((proof: any, publicSignals: string[], verificationKey: any): Promise<WorkerResult> => {
    return new Promise((resolve) => {
      const worker = initWorker();
      
      const handleMessage = (e: MessageEvent) => {
        if (e.data.type === 'VERIFY_ZKP_RESULT') {
          worker.removeEventListener('message', handleMessage);
          resolve(e.data);
        }
      };
      
      worker.addEventListener('message', handleMessage);
      worker.postMessage({
        type: 'VERIFY_ZKP',
        data: { proof, publicSignals, verificationKey }
      });
    });
  }, [initWorker]);

  const parsePDF = useCallback((pdfBuffer: ArrayBuffer): Promise<WorkerResult> => {
    return new Promise((resolve) => {
      const worker = initWorker();
      
      const handleMessage = (e: MessageEvent) => {
        if (e.data.type === 'PARSE_PDF_RESULT') {
          worker.removeEventListener('message', handleMessage);
          resolve(e.data);
        }
      };
      
      worker.addEventListener('message', handleMessage);
      worker.postMessage({
        type: 'PARSE_PDF',
        data: { pdfBuffer }
      });
    });
  }, [initWorker]);

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  return {
    verifyZKP,
    parsePDF,
    terminateWorker
  };
};
```

## 7. React UI コンポーネント

### 7.1 メイン検証ページ
```tsx
// app/page.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileUploadZone } from '@/components/FileUploadZone';
import { VerificationProgress } from '@/components/VerificationProgress';
import { VerificationResult } from '@/components/VerificationResult';
import { useVerification } from '@/hooks/useVerification';

const VERIFICATION_STEPS = [
  'PDF解析・データ抽出',
  'ZKP証明検証',
  'ブロックチェーン確認',
  '結果生成・レポート作成'
];

export default function VerifierPage() {
  const [file, setFile] = useState<File | null>(null);
  const {
    currentStep,
    isVerifying,
    verificationResult,
    error,
    progress,
    startVerification,
    resetVerification
  } = useVerification();

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    resetVerification();
  }, [resetVerification]);

  const handleStartVerification = useCallback(async () => {
    if (file) {
      await startVerification(file);
    }
  }, [file, startVerification]);

  const renderContent = () => {
    if (!file) {
      return (
        <FileUploadZone
          onFileSelect={handleFileSelect}
          acceptedTypes=".pdf"
          maxSize={50 * 1024 * 1024} // 50MB
          description="PDF/A-3形式の証明書ファイルをドロップするか、クリックして選択してください"
        />
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertDescription>
            検証中にエラーが発生しました: {error}
          </AlertDescription>
          <Button 
            variant="outline" 
            onClick={() => {
              setFile(null);
              resetVerification();
            }}
            className="mt-2"
          >
            再試行
          </Button>
        </Alert>
      );
    }

    if (isVerifying) {
      return (
        <VerificationProgress
          currentStep={currentStep}
          steps={VERIFICATION_STEPS}
          progress={progress}
        />
      );
    }

    if (verificationResult) {
      return (
        <VerificationResult
          result={verificationResult}
          onReset={() => {
            setFile(null);
            resetVerification();
          }}
        />
      );
    }

    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            ファイル「{file.name}」を検証します。
            この処理には数秒かかる場合があります。
          </AlertDescription>
        </Alert>
        
        <Button
          onClick={handleStartVerification}
          disabled={isVerifying}
          className="w-full"
          size="lg"
        >
          検証を開始
        </Button>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Certificate Verifier
          </CardTitle>
          <p className="text-muted-foreground">
            ゼロ知識証明付き卒業証明書の検証システム
          </p>
        </CardHeader>
        
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
```

## 8. セキュリティ対策

### 8.1 XSS・コンテンツセキュリティ
```typescript
// utils/SecurityUtils.ts
import DOMPurify from 'dompurify';

export class SecurityUtils {
  static sanitizeHTML(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'span'],
      ALLOWED_ATTR: ['class']
    });
  }

  static validateFileType(file: File): boolean {
    // PDF MIME type 検証
    const validTypes = [
      'application/pdf'
    ];
    
    return validTypes.includes(file.type);
  }

  static validateFileSize(file: File, maxSize: number): boolean {
    return file.size <= maxSize;
  }

  static async validatePDFStructure(arrayBuffer: ArrayBuffer): Promise<boolean> {
    try {
      // PDF ヘッダー検証
      const uint8Array = new Uint8Array(arrayBuffer);
      const header = new TextDecoder().decode(uint8Array.slice(0, 8));
      return header.startsWith('%PDF-');
    } catch (error) {
      return false;
    }
  }

  static validateRPCResponse(response: any): boolean {
    // RPC レスポンス検証
    if (!response || typeof response !== 'object') {
      return false;
    }
    
    // 基本的な構造チェック
    return 'jsonrpc' in response || 'result' in response || 'error' in response;
  }
}
```

## 9. パフォーマンス最適化

### 9.1 遅延読み込み・キャッシュ
```typescript
// hooks/useCircuitCache.ts
import { useQuery } from '@tanstack/react-query';

interface CircuitCache {
  verificationKey: any;
  wasmBuffer: ArrayBuffer;
  lastUpdated: string;
}

export const useCircuitCache = () => {
  const { data: vKey, isLoading: vkLoading } = useQuery({
    queryKey: ['verification-key'],
    queryFn: async () => {
      const response = await fetch('/circuits/verification_key.json');
      return response.json();
    },
    staleTime: 1000 * 60 * 60, // 1時間キャッシュ
    cacheTime: 1000 * 60 * 60 * 24 // 24時間保持
  });

  const { data: wasmBuffer, isLoading: wasmLoading } = useQuery({
    queryKey: ['circuit-wasm'],
    queryFn: async () => {
      const response = await fetch('/circuits/certificate_js/certificate.wasm');
      return response.arrayBuffer();
    },
    staleTime: 1000 * 60 * 60,
    cacheTime: 1000 * 60 * 60 * 24
  });

  return {
    verificationKey: vKey,
    wasmBuffer,
    isLoading: vkLoading || wasmLoading,
    isReady: !!(vKey && wasmBuffer)
  };
};
```

## 10. テスト・デプロイ

### 10.1 E2E テスト
```typescript
// tests/verification.e2e.test.ts
import { test, expect } from '@playwright/test';

test.describe('Certificate Verification', () => {
  test('should verify valid certificate', async ({ page }) => {
    await page.goto('/');
    
    // ファイルアップロード
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./test-data/valid-certificate.pdf');
    
    // 検証開始
    await page.click('button:has-text("検証を開始")');
    
    // 進行状況確認
    await expect(page.locator('.verification-progress')).toBeVisible();
    
    // 結果確認
    await page.waitForSelector('.verification-result', { timeout: 30000 });
    await expect(page.locator('.verification-status.valid')).toBeVisible();
  });

  test('should reject invalid certificate', async ({ page }) => {
    await page.goto('/');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./test-data/invalid-certificate.pdf');
    
    await page.click('button:has-text("検証を開始")');
    
    await page.waitForSelector('.verification-result', { timeout: 30000 });
    await expect(page.locator('.verification-status.invalid')).toBeVisible();
  });
});
```

### 10.2 静的ビルド・デプロイ
```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "export": "next build && next export",
    "deploy": "npm run export && gh-pages -d out"
  }
}
```

## 11. 運用監視

### 11.1 エラー追跡・分析
```typescript
// utils/Analytics.ts
export class Analytics {
  static trackVerification(result: {
    success: boolean;
    duration: number;
    fileSize: number;
    errorType?: string;
  }) {
    // 分析データ送信（プライバシー配慮）
    const anonymizedData = {
      timestamp: Date.now(),
      success: result.success,
      duration: Math.round(result.duration),
      fileSizeRange: this.getFileSizeRange(result.fileSize),
      errorCategory: result.errorType ? this.categorizeError(result.errorType) : null
    };
    
    // ローカルストレージに保存（個人情報なし）
    this.saveToLocalStorage(anonymizedData);
  }

  private static getFileSizeRange(size: number): string {
    if (size < 1024 * 1024) return 'small';
    if (size < 10 * 1024 * 1024) return 'medium';
    return 'large';
  }

  private static categorizeError(error: string): string {
    if (error.includes('PDF')) return 'pdf-error';
    if (error.includes('ZKP')) return 'zkp-error';
    if (error.includes('blockchain')) return 'blockchain-error';
    return 'unknown-error';
  }

  private static saveToLocalStorage(data: any) {
    try {
      const existing = JSON.parse(localStorage.getItem('verification-analytics') || '[]');
      existing.push(data);
      
      // 最新100件のみ保持
      if (existing.length > 100) {
        existing.splice(0, existing.length - 100);
      }
      
      localStorage.setItem('verification-analytics', JSON.stringify(existing));
    } catch (error) {
      console.warn('Failed to save analytics data:', error);
    }
  }
}
```

