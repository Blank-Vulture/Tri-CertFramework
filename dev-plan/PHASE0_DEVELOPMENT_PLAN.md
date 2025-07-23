# Phase 0 開発計画書 - ZK-CertFramework プロトタイプ
**バージョン 2.0 - 最終更新: 2025-01-20**

> **段階的移行対応プロトタイプ**: ローカルVK → ブロックチェーンVK の段階的実装

---

## 🎯 **Phase 0 概要**

### **目標**
- **Scholar Prover**: パスキー認証 + ZKP生成 + PDF埋め込み + **段階的VK取得**
- **Verifier UI**: PDF検証 + **ローカル/ブロックチェーンVK選択** + 有効期限チェック
- **段階的移行**: ローカルVK → ブロックチェーンVK のスムーズな移行
- **早期成功**: 2週間以内での動作確認

### **段階的移行機能**
- **ローカルモード**: ローカルVKファイル選択（基本機能）
- **ブロックチェーンモード**: Polygon zkEVM CardonaからVK取得（拡張機能）
- **ハイブリッドモード**: ブロックチェーン失敗時ローカルフォールバック

### **技術制約**
- **バックエンド**: なし（完全フロントエンド）
- **データベース**: なし（ローカルJSONファイル）
- **ブロックチェーン**: オプション（Polygon zkEVM Cardona）
- **外部依存**: 最小限（Circom + SnarkJS + PDF-lib）

---

## 🏗️ **プロジェクト構造**

```
zk-CertFramework/
├── dev-plan/
│   ├── PHASE0_DEVELOPMENT_PLAN.md
│   ├── PHASE1_DEVELOPMENT_PLAN.md
│   └── PHASE2_DEVELOPMENT_PLAN.md
├── scholar-prover/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── PasskeyAuth.tsx
│   │   │   ├── PDFUpload.tsx
│   │   │   ├── ProofGenerator.tsx
│   │   │   ├── PDFEmbedder.tsx
│   │   │   ├── VKSourceSelector.tsx
│   │   │   └── BlockchainStatus.tsx
│   │   ├── utils/
│   │   │   ├── zkp.ts
│   │   │   ├── pdf.ts
│   │   │   ├── crypto.ts
│   │   │   ├── passkey.ts
│   │   │   ├── vk-manager.ts
│   │   │   └── blockchain.ts
│   │   ├── config/
│   │   │   ├── phase-config.ts
│   │   │   └── blockchain-config.ts
│   │   └── types/
│   │       └── index.ts
│   ├── public/
│   │   └── circuits/
│   │       ├── Document2025.circom
│   │       ├── Document2025.wasm
│   │       └── Document2025.zkey
│   └── data/
│       └── test-students.json
├── verifier-ui/
│   ├── package.json
│   ├── next.config.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── PDFDropZone.tsx
│   │   │   ├── VKSelector.tsx
│   │   │   ├── ProofVerifier.tsx
│   │   │   ├── ResultDisplay.tsx
│   │   │   ├── VKSourceSelector.tsx
│   │   │   └── BlockchainStatus.tsx
│   │   ├── utils/
│   │   │   ├── verification.ts
│   │   │   ├── pdf-extractor.ts
│   │   │   ├── vk-loader.ts
│   │   │   └── blockchain.ts
│   │   ├── config/
│   │   │   ├── phase-config.ts
│   │   │   └── blockchain-config.ts
│   │   └── types/
│   │       └── index.ts
│   ├── public/
│   │   └── vk-files/
│   │       ├── vk-2025.json
│   │       └── vk-2024.json
│   └── data/
│       └── vk-metadata.json
└── shared/
    ├── circuits/
    │   ├── Document2025.circom
    │   └── build/
    │       ├── Document2025.wasm
    │       ├── Document2025.zkey
    │       └── Document2025_vk.json
    └── types/
        └── common.ts
```

---

## 🔧 **段階的移行設定システム**

### **フェーズ設定定義**
```typescript
// shared/types/common.ts
export type VKSource = 'local' | 'blockchain' | 'hybrid';

export interface PhaseConfig {
  vkSource: VKSource;
  features: {
    blockchain: boolean;
    ledgerAuth: boolean;
    smartContract: boolean;
    merkleTree: boolean;
  };
  network: 'none' | 'cardona' | 'mainnet';
  ui: {
    showBlockchainStatus: boolean;
    showVKSourceSelector: boolean;
    showAdvancedFeatures: boolean;
  };
}

export interface ProofData {
  proof: {
    pi_a: [string, string];
    pi_b: [[string, string], [string, string]];
    pi_c: [string, string];
  };
  publicSignals: string[];
}

export interface VerifyingKey {
  protocol: string;
  curve: string;
  nPublic: number;
  vk_alpha_1: [string, string];
  vk_beta_2: [[string, string], [string, string]];
  vk_gamma_2: [[string, string], [string, string]];
  vk_delta_2: [[string, string], [string, string]];
  vk_alphabeta_12: [[[string, string], [string, string]], [[string, string], [string, string]]];
  IC: [string, string][];
}

export interface StudentData {
  id: string;
  name: string;
  email: string;
  passkey: {
    publicKey: string;
    credentialId: string;
    algorithm: number;
  };
  commit: string;
}

export interface ProofMetadata {
  studentId: string;
  pdfHash: string;
  destHash: string;
  expireTs: number;
  generatedAt: number;
  version: string;
  vkSource: VKSource;
}
```

### **段階的設定管理**
```typescript
// scholar-prover/src/config/phase-config.ts
import { PhaseConfig, VKSource } from '../types';

export const PHASE_CONFIGS: Record<string, PhaseConfig> = {
  local: {
    vkSource: 'local',
    features: {
      blockchain: false,
      ledgerAuth: false,
      smartContract: false,
      merkleTree: false
    },
    network: 'none',
    ui: {
      showBlockchainStatus: false,
      showVKSourceSelector: true,
      showAdvancedFeatures: false
    }
  },
  blockchain: {
    vkSource: 'blockchain',
    features: {
      blockchain: true,
      ledgerAuth: false,
      smartContract: true,
      merkleTree: false
    },
    network: 'cardona',
    ui: {
      showBlockchainStatus: true,
      showVKSourceSelector: true,
      showAdvancedFeatures: true
    }
  },
  hybrid: {
    vkSource: 'hybrid',
    features: {
      blockchain: true,
      ledgerAuth: false,
      smartContract: true,
      merkleTree: false
    },
    network: 'cardona',
    ui: {
      showBlockchainStatus: true,
      showVKSourceSelector: true,
      showAdvancedFeatures: true
    }
  }
};

export class PhaseManager {
  private currentConfig: PhaseConfig;

  constructor(initialPhase: string = 'local') {
    this.currentConfig = PHASE_CONFIGS[initialPhase];
  }

  getConfig(): PhaseConfig {
    return this.currentConfig;
  }

  setPhase(phase: string): void {
    if (PHASE_CONFIGS[phase]) {
      this.currentConfig = PHASE_CONFIGS[phase];
    }
  }

  isBlockchainEnabled(): boolean {
    return this.currentConfig.features.blockchain;
  }

  getVKSource(): VKSource {
    return this.currentConfig.vkSource;
  }
}
```

### **VK取得の段階的実装**
```typescript
// scholar-prover/src/utils/vk-manager.ts
import { VerifyingKey, VKSource } from '../types';
import { PhaseManager } from '../config/phase-config';

export class VKManager {
  constructor(private phaseManager: PhaseManager) {}

  async getVK(): Promise<VerifyingKey> {
    const vkSource = this.phaseManager.getVKSource();
    
    switch (vkSource) {
      case 'local':
        return this.getVKFromLocal();
      case 'blockchain':
        return this.getVKFromBlockchain();
      case 'hybrid':
        return this.getVKFromHybrid();
      default:
        throw new Error(`Unknown VK source: ${vkSource}`);
    }
  }

  private async getVKFromLocal(): Promise<VerifyingKey> {
    // ローカルファイル選択
    const file = await this.selectVKFile();
    return JSON.parse(await file.text());
  }

  private async getVKFromBlockchain(): Promise<VerifyingKey> {
    // ブロックチェーンから取得
    const { ethers } = await import('ethers');
    const contract = new ethers.Contract(
      VK_CONTRACT_ADDRESS,
      ["function getVK2025() view returns (string)"],
      this.getProvider()
    );
    const vkData = await contract.getVK2025();
    return JSON.parse(vkData);
  }

  private async getVKFromHybrid(): Promise<VerifyingKey> {
    // ハイブリッド: ブロックチェーン失敗時ローカルフォールバック
    try {
      return await this.getVKFromBlockchain();
    } catch (error) {
      console.warn('Blockchain VK取得失敗、ローカルVKを使用:', error);
      return await this.getVKFromLocal();
    }
  }

  private async selectVKFile(): Promise<File> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          resolve(file);
        } else {
          reject(new Error('No file selected'));
        }
      };
      input.click();
    });
  }

  private getProvider() {
    // Polygon zkEVM Cardona プロバイダー
    return new ethers.JsonRpcProvider('https://rpc.cardona.zkevm-rpc.com');
  }
}
```

---

## 📋 **Week 1: 基盤構築**

### **Day 1-2: プロジェクトセットアップ**

#### **1.1 共通ディレクトリ作成**
```bash
# ルートディレクトリで実行
mkdir -p scholar-prover verifier-ui shared/circuits shared/types
mkdir -p scholar-prover/src/config verifier-ui/src/config
```

#### **1.2 Scholar Prover セットアップ**
```bash
cd scholar-prover
npm create vite@latest . -- --template react-ts
npm install
npm install @pdf-lib/fontkit pdf-lib snarkjs circomlibjs ethers
npm install -D @types/node
```

#### **1.3 Verifier UI セットアップ**
```bash
cd ../verifier-ui
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
npm install snarkjs pdf-lib ethers
```

### **Day 3-4: Circom回路作成**

#### **2.1 最小限回路設計**
```circom
// shared/circuits/Document2025.circom
pragma circom 2.1.4;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";

template Document2025Proof() {
    // 公開入力
    signal input pdfHash;
    signal input destHash;
    signal input expireTs;
    signal input vkHash;
    
    // 秘密入力
    signal input privateKey;
    signal input signature[2];
    signal input currentTs;
    
    // 出力
    signal output valid;
    
    // 1. 有効期限チェック
    component timeCheck = LessThan(64);
    timeCheck.in[0] <== currentTs;
    timeCheck.in[1] <== expireTs;
    
    // 2. 署名検証（簡素化）
    component hasher = Poseidon(3);
    hasher.inputs[0] <== pdfHash;
    hasher.inputs[1] <== destHash;
    hasher.inputs[2] <== expireTs;
    
    // 3. 最終検証
    valid <== timeCheck.out;
}

component main = Document2025Proof();
```

### **Day 5-7: 段階的機能実装**

#### **3.1 VK取得の段階的実装**
```typescript
// scholar-prover/src/utils/vk-manager.ts
export class VKManager {
  // ... (上記のVKManager実装)
}
```

#### **3.2 段階的UIコンポーネント**
```typescript
// scholar-prover/src/components/VKSourceSelector.tsx
import React from 'react';
import { PhaseManager } from '../config/phase-config';

interface VKSourceSelectorProps {
  phaseManager: PhaseManager;
  onVKSourceChange: (source: string) => void;
}

export const VKSourceSelector: React.FC<VKSourceSelectorProps> = ({
  phaseManager,
  onVKSourceChange
}) => {
  const currentSource = phaseManager.getVKSource();

  return (
    <div className="vk-source-selector">
      <h3 className="text-lg font-medium mb-4">VK取得方法</h3>
      
      <div className="space-y-3">
        <label className="flex items-center space-x-3">
          <input
            type="radio"
            name="vkSource"
            value="local"
            checked={currentSource === 'local'}
            onChange={(e) => onVKSourceChange(e.target.value)}
            className="text-blue-600"
          />
          <span>ローカルファイル</span>
        </label>
        
        <label className="flex items-center space-x-3">
          <input
            type="radio"
            name="vkSource"
            value="blockchain"
            checked={currentSource === 'blockchain'}
            onChange={(e) => onVKSourceChange(e.target.value)}
            className="text-blue-600"
          />
          <span>ブロックチェーン</span>
        </label>
        
        <label className="flex items-center space-x-3">
          <input
            type="radio"
            name="vkSource"
            value="hybrid"
            checked={currentSource === 'hybrid'}
            onChange={(e) => onVKSourceChange(e.target.value)}
            className="text-blue-600"
          />
          <span>ハイブリッド（フォールバック付き）</span>
        </label>
      </div>
      
      <div className="mt-4 p-3 bg-gray-50 rounded">
        <p className="text-sm text-gray-600">
          {currentSource === 'local' && 'ローカルファイルからVKを選択します'}
          {currentSource === 'blockchain' && 'Polygon zkEVM CardonaからVKを取得します'}
          {currentSource === 'hybrid' && 'ブロックチェーンから取得し、失敗時はローカルファイルを使用します'}
        </p>
      </div>
    </div>
  );
};
```

#### **3.3 ブロックチェーン状態表示**
```typescript
// scholar-prover/src/components/BlockchainStatus.tsx
import React, { useState, useEffect } from 'react';
import { PhaseManager } from '../config/phase-config';

interface BlockchainStatusProps {
  phaseManager: PhaseManager;
}

export const BlockchainStatus: React.FC<BlockchainStatusProps> = ({
  phaseManager
}) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [network, setNetwork] = useState<string>('');

  useEffect(() => {
    if (phaseManager.isBlockchainEnabled()) {
      checkBlockchainStatus();
    }
  }, [phaseManager]);

  const checkBlockchainStatus = async () => {
    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.JsonRpcProvider('https://rpc.cardona.zkevm-rpc.com');
      const blockNumber = await provider.getBlockNumber();
      setStatus('connected');
      setNetwork(`Cardona Testnet (Block: ${blockNumber})`);
    } catch (error) {
      setStatus('error');
      setNetwork('接続エラー');
    }
  };

  if (!phaseManager.isBlockchainEnabled()) {
    return null;
  }

  return (
    <div className="blockchain-status">
      <h3 className="text-lg font-medium mb-2">ブロックチェーン状態</h3>
      
      <div className={`p-3 rounded ${
        status === 'connected' ? 'bg-green-100' :
        status === 'error' ? 'bg-red-100' : 'bg-yellow-100'
      }`}>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            status === 'connected' ? 'bg-green-500' :
            status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
          }`} />
          <span className="text-sm">
            {status === 'connecting' && '接続中...'}
            {status === 'connected' && '接続済み'}
            {status === 'error' && '接続エラー'}
          </span>
        </div>
        
        {network && (
          <p className="text-sm text-gray-600 mt-1">{network}</p>
        )}
      </div>
    </div>
  );
};
```

---

## 📋 **Week 2: PDF統合・UI実装**

### **Day 8-10: PDF埋め込み・抽出機能**

#### **4.1 Scholar Prover - PDF埋め込み（段階的対応）**
```typescript
// scholar-prover/src/utils/pdf.ts
import { PDFDocument, PDFDict, PDFName } from 'pdf-lib';
import { ProofData, ProofMetadata, VKSource } from '../types';

export class PDFEmbedder {
  async embedProof(
    pdfBuffer: ArrayBuffer,
    proofData: ProofData,
    metadata: ProofMetadata,
    vkSource: VKSource
  ): Promise<ArrayBuffer> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // VK取得方法も含めてメタデータに保存
    const enhancedMetadata = {
      ...metadata,
      vkSource,
      embeddedAt: new Date().toISOString()
    };
    
    const proofJson = JSON.stringify({
      proof: proofData.proof,
      publicSignals: proofData.publicSignals,
      metadata: enhancedMetadata
    });

    // 添付ファイルとして埋め込み
    const proofBytes = new TextEncoder().encode(proofJson);
    const embeddedFile = pdfDoc.context.obj({
      Type: PDFName.of('Filespec'),
      F: PDFName.of('proof.json'),
      EF: {
        F: pdfDoc.context.stream(proofBytes)
      }
    });

    // カタログに追加
    const catalog = pdfDoc.catalog;
    if (!catalog.get(PDFName.of('Names'))) {
      catalog.set(PDFName.of('Names'), pdfDoc.context.obj({}));
    }
    
    const names = catalog.get(PDFName.of('Names')) as PDFDict;
    if (!names.get(PDFName.of('EmbeddedFiles'))) {
      names.set(PDFName.of('EmbeddedFiles'), pdfDoc.context.obj({
        Names: []
      }));
    }

    const embeddedFiles = names.get(PDFName.of('EmbeddedFiles')) as PDFDict;
    const namesArray = embeddedFiles.get(PDFName.of('Names')) as any;
    namesArray.push('proof.json', embeddedFile);

    return await pdfDoc.save();
  }
}
```

### **Day 11-12: WebAuthn統合**

#### **4.2 Scholar Prover - Passkey認証（段階的対応）**
```typescript
// scholar-prover/src/utils/passkey.ts
export class PasskeyManager {
  async registerPasskey(userId: string, userName: string): Promise<{
    publicKey: string;
    credentialId: string;
  }> {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'ZK-CertFramework',
          id: window.location.hostname
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: userName,
          displayName: userName
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' } // ES256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform'
        },
        timeout: 60000
      }
    }) as PublicKeyCredential;

    const publicKey = this.arrayBufferToBase64(
      (credential.response as AuthenticatorAttestationResponse).getPublicKey()
    );
    const credentialId = this.arrayBufferToBase64(credential.rawId);

    return { publicKey, credentialId };
  }

  async signWithPasskey(credentialId: string, challenge: string): Promise<{
    signature: [string, string];
    publicKey: string;
  }> {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: new TextEncoder().encode(challenge),
        allowCredentials: [{
          id: this.base64ToArrayBuffer(credentialId),
          type: 'public-key'
        }]
      }
    }) as PublicKeyCredential;

    const response = assertion.response as AuthenticatorAssertionResponse;
    const signature = this.parseSignature(response.signature);
    const publicKey = this.arrayBufferToBase64(response.authenticatorData);

    return { signature, publicKey };
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private parseSignature(signature: ArrayBuffer): [string, string] {
    // ES256署名の解析（簡素化版）
    const bytes = new Uint8Array(signature);
    const r = bytes.slice(0, 32);
    const s = bytes.slice(32, 64);
    return [
      this.arrayBufferToBase64(r.buffer),
      this.arrayBufferToBase64(s.buffer)
    ];
  }
}
```

### **Day 13-14: 段階的UI実装**

#### **4.3 Scholar Prover - メインコンポーネント（段階的対応）**
```typescript
// scholar-prover/src/components/ProofGenerator.tsx
import React, { useState, useRef } from 'react';
import { ZKPGenerator } from '../utils/zkp';
import { PDFEmbedder } from '../utils/pdf';
import { PasskeyManager } from '../utils/passkey';
import { VKManager } from '../utils/vk-manager';
import { VKSourceSelector } from './VKSourceSelector';
import { BlockchainStatus } from './BlockchainStatus';
import { PhaseManager } from '../config/phase-config';

export const ProofGenerator: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [destination, setDestination] = useState('');
  const [expiryDays, setExpiryDays] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const phaseManager = useRef(new PhaseManager('local'));
  const zkpGenerator = useRef(new ZKPGenerator());
  const pdfEmbedder = useRef(new PDFEmbedder());
  const passkeyManager = useRef(new PasskeyManager());
  const vkManager = useRef(new VKManager(phaseManager.current));

  const handleVKSourceChange = (source: string) => {
    phaseManager.current.setPhase(source);
    vkManager.current = new VKManager(phaseManager.current);
  };

  const handleGenerateProof = async () => {
    if (!pdfFile || !destination) return;

    setIsGenerating(true);
    try {
      // 1. 回路ファイル読み込み
      await zkpGenerator.current.loadCircuitFiles();

      // 2. VK取得（段階的）
      const vk = await vkManager.current.getVK();

      // 3. PDFハッシュ計算
      const pdfBuffer = await pdfFile.arrayBuffer();
      const pdfHash = await calculateHash(pdfBuffer);
      const destHash = await calculateHash(new TextEncoder().encode(destination));

      // 4. 有効期限設定
      const expireTs = Math.floor(Date.now() / 1000) + (expiryDays * 24 * 60 * 60);

      // 5. Passkey署名
      const challenge = `${pdfHash}${destHash}${expireTs}`;
      const { signature, publicKey } = await passkeyManager.current.signWithPasskey(
        'test-credential-id',
        challenge
      );

      // 6. ZKP生成
      const proofData = await zkpGenerator.current.generateProof({
        pdfHash,
        destHash,
        expireTs: expireTs.toString(),
        vkHash: 'test-vk-hash',
        privateKey: publicKey,
        signature,
        currentTs: Math.floor(Date.now() / 1000)
      });

      // 7. PDF埋め込み（VK取得方法も含める）
      const metadata: ProofMetadata = {
        studentId: 'test-student',
        pdfHash,
        destHash,
        expireTs,
        generatedAt: Math.floor(Date.now() / 1000),
        version: '1.0',
        vkSource: phaseManager.current.getVKSource()
      };

      const embeddedPdf = await pdfEmbedder.current.embedProof(
        pdfBuffer,
        proofData,
        metadata,
        phaseManager.current.getVKSource()
      );

      // 8. ダウンロード
      const blob = new Blob([embeddedPdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'certificate-with-proof.pdf';
      a.click();

      setResult('証明書の生成が完了しました！');
    } catch (error) {
      setResult(`エラー: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const config = phaseManager.current.getConfig();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">証明書生成システム</h1>
      
      {/* VK取得方法選択 */}
      <VKSourceSelector
        phaseManager={phaseManager.current}
        onVKSourceChange={handleVKSourceChange}
      />
      
      {/* ブロックチェーン状態表示 */}
      {config.ui.showBlockchainStatus && (
        <BlockchainStatus phaseManager={phaseManager.current} />
      )}
      
      <div className="space-y-4 mt-6">
        <div>
          <label className="block text-sm font-medium mb-2">PDF証明書</label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">提出先</label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="提出先を入力"
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">有効期限（日数）</label>
          <input
            type="number"
            value={expiryDays}
            onChange={(e) => setExpiryDays(Number(e.target.value))}
            min="1"
            max="365"
            className="w-full p-2 border rounded"
          />
        </div>

        <button
          onClick={handleGenerateProof}
          disabled={!pdfFile || !destination || isGenerating}
          className="w-full bg-blue-500 text-white p-3 rounded disabled:bg-gray-300"
        >
          {isGenerating ? '生成中...' : '証明書生成'}
        </button>

        {result && (
          <div className={`p-3 rounded ${result.includes('エラー') ? 'bg-red-100' : 'bg-green-100'}`}>
            {result}
          </div>
        )}
      </div>
    </div>
  );
};

async function calculateHash(data: ArrayBuffer | Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

---

## 📋 **Week 3: 統合・テスト**

### **Day 15-17: 段階的統合テスト**

#### **5.1 段階的テストシナリオ**
```typescript
// 段階的テストシナリオ
const phaseTestScenarios = {
  local: async () => {
    console.log("=== ローカルモードテスト ===");
    // ローカルVK選択テスト
    const result = await testLocalVKSelection();
    console.log("ローカルVKテスト:", result);
  },
  
  blockchain: async () => {
    console.log("=== ブロックチェーンモードテスト ===");
    // ブロックチェーンVK取得テスト
    const result = await testBlockchainVKRetrieval();
    console.log("ブロックチェーンVKテスト:", result);
  },
  
  hybrid: async () => {
    console.log("=== ハイブリッドモードテスト ===");
    // フォールバック機能テスト
    const result = await testHybridFallback();
    console.log("ハイブリッドテスト:", result);
  }
};

const runPhaseTests = async () => {
  for (const [phase, testFn] of Object.entries(phaseTestScenarios)) {
    try {
      await testFn();
    } catch (error) {
      console.error(`${phase}テスト失敗:`, error);
    }
  }
};
```

### **Day 18-21: 改善・ドキュメント**

#### **5.2 段階的移行ドキュメント**
```markdown
# 段階的移行ガイド

## Phase 0: ローカルモード
- 基本機能: ZKP生成・PDF埋め込み・ローカルVK検証
- 対象: 基本概念の理解・動作確認

## Phase 1: ブロックチェーンモード
- 拡張機能: Polygon zkEVM Cardona統合・VK直接保存
- 対象: Trust Minimized設計の実感

## Phase 2: 完全実装
- 完全機能: 4システム統合・完全なTrust Minimized
- 対象: 教授向けデモンストレーション

## 移行手順
1. VK取得方法を「ローカル」から「ブロックチェーン」に変更
2. ブロックチェーン接続状態を確認
3. VK取得・検証をテスト
4. 問題があれば「ハイブリッド」モードでフォールバック
```

---

## 🎯 **成功基準・受入テスト**

### **技術的成功基準**
- [ ] ローカルモードでの基本機能動作
- [ ] ブロックチェーンモードでのVK取得
- [ ] ハイブリッドモードでのフォールバック機能
- [ ] 段階的移行のスムーズな動作
- [ ] エラーハンドリング適切動作

### **段階的デモンストレーション成功基準**
- [ ] **ローカルモード**: 5分以内で基本機能説明
- [ ] **ブロックチェーンモード**: ブロックチェーン連携の実感
- [ ] **ハイブリッドモード**: フォールバック機能の確認
- [ ] **段階的移行**: 各段階での価値理解

### **段階的受入テスト**
```typescript
const phaseAcceptanceTests = {
  local: [
    {
      name: "ローカルVK選択テスト",
      steps: ["VKファイル選択", "PDF検証", "結果確認"],
      expected: "ローカルVKで正常に検証される"
    }
  ],
  blockchain: [
    {
      name: "ブロックチェーンVK取得テスト",
      steps: ["ブロックチェーンモード選択", "VK取得", "PDF検証"],
      expected: "ブロックチェーンからVKを取得して検証される"
    }
  ],
  hybrid: [
    {
      name: "フォールバック機能テスト",
      steps: ["ブロックチェーン切断", "ハイブリッドモード選択", "VK取得"],
      expected: "ブロックチェーン失敗時ローカルVKでフォールバック"
    }
  ]
};
```

---

## 🚀 **開発開始手順**

### **1. 環境セットアップ**
```bash
# ルートディレクトリで実行
cd zk-CertFramework

# Scholar Proverセットアップ
cd scholar-prover
npm install
npm run dev

# 別ターミナルでVerifier UIセットアップ
cd ../verifier-ui
npm install
npm run dev
```

### **2. 段階的テスト実行**
```bash
# ローカルモードテスト
npm run test:local

# ブロックチェーンモードテスト
npm run test:blockchain

# ハイブリッドモードテスト
npm run test:hybrid
```

---

## 📝 **次のフェーズ準備**

Phase 0完了後、以下のフェーズに進む準備：

### **Phase 1: 完全ブロックチェーン統合**
- Executive Console実装
- スマートコントラクト完全実装
- Ledger Nano X認証

### **Phase 2: 完全システム**
- Registrar Console実装
- 4システム完全統合
- 教授向けデモ準備

---

**Phase 0目標**: 段階的移行機能を含むプロトタイプを完成させ、ローカルVKからブロックチェーンVKへのスムーズな移行を実現する。
