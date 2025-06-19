# 技術設計書 (TSD) — Scholar Prover  
最終更新: 2025-06-17 (Version 2.0)

## 1. 技術スタック (PWA完全バックエンドレス版)  
| 層 | 技術 | バージョン | 目的 |
|----|------|-----------|------|
| **フレームワーク** | React + Vite | React 18, Vite 4 | PWA開発・高速ビルド |
| **ZKP証明** | Circom + SnarkJS | Circom 2.1.4, SnarkJS 0.7 | Groth16証明生成・検証 |
| **PDF処理** | pdf-lib | 1.17+ | PDF/A-3埋込み・操作 |
| **認証** | WebAuthn Level 2 | Navigator.credentials API | Passkey署名・生体認証 |
| **ストレージ** | IndexedDB + localStorage | Browser APIs | 回路ファイル・履歴保存 |
| **PWA** | Workbox | 7.0+ | Service Worker・キャッシュ |
| **暗号化** | @noble/hashes | 1.3+ | Poseidon・SHA3ハッシュ |
| **UI** | TailwindCSS | 3.3+ | レスポンシブデザイン |

## 2. Circom 回路統合  
### 2.1 Document{Year}.circom 回路構造
```circom
pragma circom 2.1.4;

include "poseidon.circom";
include "ecdsa.circom";
include "merkletree.circom";

template CertificateProof() {
    // パブリック入力 (6つ)
    signal input vkHash;        // 検証鍵ハッシュ (SHA3-512)
    signal input schemaHash;    // スキーマハッシュ
    signal input merkleRoot;    // Merkle Tree ルート
    signal input pdfHash;       // PDF ハッシュ (SHA3-512)
    signal input destHash;      // 提出先ハッシュ (SHA3-512)
    signal input expireTs;      // 有効期限 (Unix timestamp)
    
    // プライベート入力
    signal input privateKey;    // Passkey秘密鍵
    signal input signature[2];  // WebAuthn署名 [r, s]
    signal input merkleProof[8]; // Merkle証明 (depth=8)
    signal input merkleIndex;   // Merkle Tree上の位置
    
    // 出力
    signal output valid;
    
    // 1. WebAuthn ES-256署名検証
    component ecdsa = ECDSAVerify();
    ecdsa.publicKey <== privateKey;
    ecdsa.signature <== signature;
    ecdsa.message <== poseidon4([pdfHash, destHash, expireTs, 0]);
    
    // 2. Merkle Tree包含証明
    component merkle = MerkleTreeChecker(8);
    merkle.leaf <== poseidon1([privateKey]);
    merkle.root <== merkleRoot;
    merkle.pathElements <== merkleProof;
    merkle.pathIndices <== merkleIndex;
    
    // 3. 最終検証
    valid <== ecdsa.valid * merkle.valid;
}

component main = CertificateProof();
```

### 2.2 SnarkJS 統合実装
```typescript
import { groth16 } from "snarkjs";

class CircomProofGenerator {
  private wasmPath: string;
  private zkeyPath: string;
  
  constructor(year: number) {
    this.wasmPath = `/circuits/Certificate${year}.wasm`;
    this.zkeyPath = `/circuits/Certificate${year}_final.zkey`;
  }
  
  async generateProof(inputs: CircuitInputs): Promise<ProofResult> {
    try {
      // 1. 回路ファイル読み込み
      const circuitWasm = await this.loadCircuitFile(this.wasmPath);
      const circuitZkey = await this.loadCircuitFile(this.zkeyPath);
      
      // 2. Witness 計算 + Groth16 証明生成
      const { proof, publicSignals } = await groth16.fullProve(
        {
          // パブリック入力
          vkHash: inputs.vkHash,
          schemaHash: inputs.schemaHash,
          merkleRoot: inputs.merkleRoot,
          pdfHash: inputs.pdfHash,
          destHash: inputs.destHash,
          expireTs: inputs.expireTs,
          
          // プライベート入力
          privateKey: inputs.privateKey,
          signature: inputs.signature,
          merkleProof: inputs.merkleProof,
          merkleIndex: inputs.merkleIndex
        },
        circuitWasm,
        circuitZkey
      );
      
      // 3. 形式変換・検証
      const formattedProof = this.formatGroth16Proof(proof);
      const isValid = await this.verifyProof(formattedProof, publicSignals);
      
      if (!isValid) {
        throw new Error('Generated proof is invalid');
      }
      
      return {
        proof: formattedProof,
        publicSignals: publicSignals.map(String),
        metadata: {
          version: "2.0",
          year: inputs.year,
          circuitHash: await this.computeCircuitHash(),
          generatedAt: Date.now(),
          proofId: crypto.randomUUID()
        }
      };
      
    } catch (error) {
      throw new Error(`Proof generation failed: ${error.message}`);
    }
  }
  
  private async loadCircuitFile(path: string): Promise<ArrayBuffer> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load circuit file: ${path}`);
    }
    return response.arrayBuffer();
  }
  
  private formatGroth16Proof(proof: any): GrothProof {
    return {
      pi_a: [proof.pi_a[0], proof.pi_a[1], proof.pi_a[2]],
      pi_b: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]], [proof.pi_b[2][1], proof.pi_b[2][0]]],
      pi_c: [proof.pi_c[0], proof.pi_c[1], proof.pi_c[2]],
      protocol: "groth16",
      curve: "bn128"
    };
  }
}
```

## 3. WebAuthn統合  
### 3.1 Passkey署名生成
```typescript
class PasskeyManager {
  async getAssertion(challenge: Uint8Array): Promise<WebAuthnAssertion> {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: challenge,
        allowCredentials: [{
          id: this.getStoredCredentialId(),
          type: 'public-key',
          transports: ['internal', 'usb', 'nfc', 'ble']
        }],
        userVerification: 'required', // 生体認証必須
        timeout: 60000
      }
    }) as PublicKeyCredential;
    
    const response = credential.response as AuthenticatorAssertionResponse;
    const signature = this.parseWebAuthnSignature(response.signature);
    
    return {
      credentialId: credential.id,
      signature: signature,
      authenticatorData: response.authenticatorData,
      clientDataJSON: response.clientDataJSON
    };
  }
  
  private parseWebAuthnSignature(signature: ArrayBuffer): [string, string] {
    // ES-256 署名を [r, s] にパース
    const sigArray = new Uint8Array(signature);
    const r = sigArray.slice(0, 32);
    const s = sigArray.slice(32, 64);
    
    return [
      '0x' + Array.from(r).map(b => b.toString(16).padStart(2, '0')).join(''),
      '0x' + Array.from(s).map(b => b.toString(16).padStart(2, '0')).join('')
    ];
  }
}
```

### 3.2 Challenge 計算
```typescript
import { sha3_512 } from '@noble/hashes/sha3';

class ChallengeGenerator {
  generateChallenge(pdfHash: string, destHash: string, expireTs: number): Uint8Array {
    const message = new TextEncoder().encode(
      `zk-cert-framework-challenge:${pdfHash}:${destHash}:${expireTs}`
    );
    return sha3_512(message);
  }
  
  computePDFHash(pdfBuffer: ArrayBuffer): string {
    const hash = sha3_512(new Uint8Array(pdfBuffer));
    return '0x' + Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  computeDestHash(destination: string): string {
    const hash = sha3_512(new TextEncoder().encode(destination));
    return '0x' + Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
```

## 4. PDF/A-3 統合
### 4.1 proof.json 埋込み実装
```typescript
import { PDFDocument, PDFName, PDFString, PDFDict } from 'pdf-lib';

class PDFProofEmbedder {
  async embedProofInPDF(
    pdfBuffer: ArrayBuffer, 
    proof: ProofResult
  ): Promise<ArrayBuffer> {
    try {
      // 1. PDF読み込み・解析
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      
      // 2. proof.json を添付ファイルとして追加
      const proofJSON = JSON.stringify(proof, null, 2);
      const proofBytes = new TextEncoder().encode(proofJSON);
      
      await pdfDoc.attach(
        proofBytes,
        'zk-proof.json',
        {
          mimeType: 'application/json',
          description: 'Zero-Knowledge Proof for Certificate Verification',
          creationDate: new Date(),
          modificationDate: new Date()
        }
      );
      
      // 3. メタデータ更新
      pdfDoc.setTitle('Verified Graduation Certificate');
      pdfDoc.setSubject(`Zero-Knowledge Certificate Proof (Year ${proof.metadata.year})`);
      pdfDoc.setKeywords(['zero-knowledge', 'certificate', 'verification', 'blockchain']);
      pdfDoc.setProducer('zk-CertFramework Scholar Prover v2.0');
      pdfDoc.setCreator('zk-CertFramework Scholar Prover v2.0');
      
      // 4. PDF/A-3 準拠設定
      await this.ensurePDFA3Compliance(pdfDoc);
      
      // 5. 出力
      return await pdfDoc.save();
      
    } catch (error) {
      throw new Error(`PDF embedding failed: ${error.message}`);
    }
  }
  
  private async ensurePDFA3Compliance(pdfDoc: PDFDocument): Promise<void> {
    // PDF/A-3 メタデータ・カラープロファイル設定
    const catalog = pdfDoc.catalog;
    
    // XMP メタデータ
    const xmpMetadata = this.generateXMPMetadata();
    catalog.set(PDFName.of('Metadata'), pdfDoc.context.flateStream(xmpMetadata));
    
    // PDF/A-3 識別子
    const outputIntents = pdfDoc.context.obj({
      Type: 'OutputIntent',
      S: 'GTS_PDFA1',
      OutputConditionIdentifier: PDFString.of('sRGB IEC61966-2.1'),
      Info: PDFString.of('sRGB IEC61966-2.1')
    });
    
    catalog.set(PDFName.of('OutputIntents'), pdfDoc.context.obj([outputIntents]));
  }
}
```

## 5. PWA アーキテクチャ
### 5.1 Service Worker キャッシュ戦略
```typescript
// sw.ts - Service Worker
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';

// 静的アセットの事前キャッシュ
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// 回路ファイルのキャッシュ戦略
registerRoute(
  ({ request }) => request.url.includes('/circuits/'),
  new CacheFirst({
    cacheName: 'circuits-cache-v2',
    plugins: [{
      cacheKeyWillBeUsed: async ({ request }) => {
        // 年度別キャッシュキー
        return `${request.url}-${new Date().getFullYear()}`;
      }
    }]
  })
);

// VK ファイルのキャッシュ
registerRoute(
  ({ request }) => request.url.includes('/vk/'),
  new StaleWhileRevalidate({
    cacheName: 'vk-cache-v2'
  })
);

// オフライン証明生成対応
self.addEventListener('message', (event) => {
  if (event.data?.type === 'GENERATE_PROOF_OFFLINE') {
    handleOfflineProofGeneration(event.data.payload);
  }
});
```

### 5.2 IndexedDB ストレージ管理
```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ScholarProverDB extends DBSchema {
  circuits: {
    key: number; // year
    value: {
      year: number;
      wasmBuffer: ArrayBuffer;
      zkeyBuffer: ArrayBuffer;
      vkObject: object;
      downloadedAt: Date;
      circuitHash: string;
    };
  };
  
  proofHistory: {
    key: string; // proofId
    value: {
      proofId: string;
      year: number;
      pdfName: string;
      destination: string;
      expiry: Date;
      createdAt: Date;
      status: 'success' | 'failed';
      proofData?: object;
    };
  };
}

class StorageManager {
  private db: IDBPDatabase<ScholarProverDB>;
  
  async init(): Promise<void> {
    this.db = await openDB<ScholarProverDB>('scholar-prover', 2, {
      upgrade(db, oldVersion, newVersion) {
        // Circuits store
        if (!db.objectStoreNames.contains('circuits')) {
          const circuitStore = db.createObjectStore('circuits', { keyPath: 'year' });
          circuitStore.createIndex('downloadedAt', 'downloadedAt');
        }
        
        // Proof history store
        if (!db.objectStoreNames.contains('proofHistory')) {
          const historyStore = db.createObjectStore('proofHistory', { keyPath: 'proofId' });
          historyStore.createIndex('createdAt', 'createdAt');
          historyStore.createIndex('year', 'year');
        }
      }
    });
  }
  
  async storeCircuitFiles(year: number, files: CircuitFiles): Promise<void> {
    await this.db.put('circuits', {
      year,
      wasmBuffer: files.wasmBuffer,
      zkeyBuffer: files.zkeyBuffer,
      vkObject: files.vkObject,
      downloadedAt: new Date(),
      circuitHash: files.circuitHash
    });
  }
  
  async getCircuitFiles(year: number): Promise<CircuitFiles | null> {
    return await this.db.get('circuits', year);
  }
  
  async saveProofHistory(proofResult: ProofResult): Promise<void> {
    await this.db.put('proofHistory', {
      proofId: proofResult.metadata.proofId,
      year: proofResult.metadata.year,
      pdfName: proofResult.pdfName || 'unknown.pdf',
      destination: proofResult.destination || 'unknown',
      expiry: new Date(proofResult.publicSignals[5] * 1000),
      createdAt: new Date(),
      status: 'success',
      proofData: proofResult.proof
    });
  }
}
```

## 6. パフォーマンス最適化
### 6.1 Web Workers 統合
```typescript
// proof-worker.ts
import { groth16 } from "snarkjs";

self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;
  
  if (type === 'GENERATE_PROOF') {
    try {
      const result = await generateProofInWorker(payload);
      self.postMessage({ type: 'PROOF_SUCCESS', result });
    } catch (error) {
      self.postMessage({ type: 'PROOF_ERROR', error: error.message });
    }
  }
});

async function generateProofInWorker(inputs: CircuitInputs): Promise<ProofResult> {
  // Worker内でのCircom/SnarkJS処理
  const { proof, publicSignals } = await groth16.fullProve(
    inputs.circuitInputs,
    inputs.wasmBuffer,
    inputs.zkeyBuffer
  );
  
  return {
    proof,
    publicSignals: publicSignals.map(String),
    metadata: {
      version: "2.0",
      year: inputs.year,
      generatedAt: Date.now(),
      proofId: crypto.randomUUID()
    }
  };
}
```

### 6.2 最適化設定
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50MB (回路ファイル対応)
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,wasm,zkey}'
        ],
        runtimeCaching: [{
          urlPattern: /^https:\/\/circuits\.zk-cert\.framework\/.*/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'circuit-files',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 30 * 24 * 60 * 60 // 30日
            }
          }
        }]
      }
    })
  ],
  
  // WASM 最適化
  optimizeDeps: {
    include: ['snarkjs'],
    exclude: ['@noble/hashes']
  },
  
  // ビルド最適化
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-crypto': ['@noble/hashes', 'snarkjs'],
          'vendor-pdf': ['pdf-lib'],
          'vendor-ui': ['react', 'react-dom']
        }
      }
    }
  }
});
```

## 7. テスト戦略
### 7.1 ユニットテスト (Jest + Testing Library)
```typescript
// tests/proof-generation.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CircomProofGenerator } from '../src/services/CircomProofGenerator';

describe('CircomProofGenerator', () => {
  let generator: CircomProofGenerator;
  
  beforeEach(() => {
    generator = new CircomProofGenerator(2025);
  });
  
  test('should generate valid proof for valid inputs', async () => {
    const mockInputs = {
      year: 2025,
      vkHash: '0x1234...',
      pdfHash: '0x5678...',
      destHash: '0x9abc...',
      expireTs: Math.floor(Date.now() / 1000) + 86400,
      privateKey: '0xdef0...',
      signature: ['0x1111...', '0x2222...'],
      merkleProof: new Array(8).fill('0x0000...'),
      merkleIndex: 0
    };
    
    const result = await generator.generateProof(mockInputs);
    
    expect(result.proof).toBeDefined();
    expect(result.publicSignals).toHaveLength(6);
    expect(result.metadata.year).toBe(2025);
    expect(result.metadata.version).toBe('2.0');
  });
  
  test('should fail for expired timestamp', async () => {
    const expiredInputs = {
      // ... 他の有効な入力
      expireTs: Math.floor(Date.now() / 1000) - 86400 // 過去の時刻
    };
    
    await expect(generator.generateProof(expiredInputs)).rejects.toThrow();
  });
});
```

### 7.2 E2E テスト (Playwright)
```typescript
// e2e/proof-generation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Scholar Prover PWA', () => {
  test('should complete full proof generation workflow', async ({ page }) => {
    // 1. PWA アクセス
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Scholar Prover');
    
    // 2. PDF アップロード
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./test-data/sample-certificate.pdf');
    
    // 3. 設定入力
    await page.fill('[data-testid="destination"]', 'Test Company');
    await page.fill('[data-testid="expiry"]', '2025-12-31');
    
    // 4. 証明生成開始
    await page.click('[data-testid="generate-proof"]');
    
    // 5. WebAuthn モック (テスト環境)
    await page.evaluate(() => {
      // WebAuthn API のモック実装
      Object.defineProperty(navigator, 'credentials', {
        value: {
          get: () => Promise.resolve({
            id: 'test-credential-id',
            response: {
              signature: new ArrayBuffer(64),
              authenticatorData: new ArrayBuffer(37),
              clientDataJSON: new ArrayBuffer(100)
            }
          })
        }
      });
    });
    
    // 6. 証明完了確認
    await expect(page.locator('[data-testid="proof-success"]')).toBeVisible({ timeout: 30000 });
    
    // 7. PDF ダウンロード
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-pdf"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/.*-verified\.pdf$/);
  });
});
```

## 8. セキュリティ実装
### 8.1 Content Security Policy
```typescript
// CSP 設定 (index.html)
const cspHeader = `
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self';
  connect-src 'self' https://*.zk-cert.framework;
  worker-src 'self';
  manifest-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'none';
`;
```

### 8.2 入力検証・サニタイゼーション  
```typescript
class InputValidator {
  validatePDF(file: File): void {
    if (file.type !== 'application/pdf') {
      throw new Error('Invalid file type. PDF required.');
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB制限
      throw new Error('File too large. Maximum 50MB allowed.');
    }
  }
  
  validateDestination(dest: string): string {
    // XSS 対策：HTML特殊文字エスケープ
    return dest.replace(/[<>&"']/g, (match) => {
      const escapeMap: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return escapeMap[match];
    });
  }
  
  validateExpiry(expiry: Date): void {
    const now = new Date();
    const maxExpiry = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1年後
    
    if (expiry <= now) {
      throw new Error('Expiry date must be in the future');
    }
    
    if (expiry > maxExpiry) {
      throw new Error('Expiry date too far in the future (max 1 year)');
    }
  }
}
```

---
