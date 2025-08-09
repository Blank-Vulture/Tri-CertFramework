# Phase 0 開発計画書 v3.0 - Tri-CertFramework 最小実装
**バージョン 2.4 - 最終更新: 2025-08-09**

> **4システム最小実装**: 全システムの基本機能を実装し、ZKP証明書システムの全体像を理解

---

## 🎯 **Phase 0 概要**

### **目標**
- **4システム最小実装**: Scholar Prover + Executive Console + Registrar Console + Verifier UI
- **基本ZKP機能**: 証明生成・検証の基本動作
- **全体理解**: Trust Minimized三層認証システムの概念実装
- **早期成功**: 1週間以内での動作確認

### **最小機能定義**
- **Scholar Prover**: PDF証明書 + 基本ZKP生成 + ローカルVK使用
- **Executive Console**: 簡易ZKP回路作成 + VK出力のみ
- **Registrar Console**: Scholar Prover出力の検証鍵JSONリスト化のみ  
- **Verifier UI**: PDF検証 + ローカルVK選択 + 基本検証

### **技術制約**
- **バックエンド**: なし（完全フロントエンド）
- **データベース**: なし（ローカルJSONファイルのみ）
- **ブロックチェーン**: なし（Phase 1で追加）
- **外部依存**: 最小限（Circom + SnarkJS + PDF-lib）

---

## 🏗️ **プロジェクト構造**

```
Tri-CertFramework/
├── scholar-prover/                 # React + Vite
│   ├── package.json
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── PDFUpload.tsx
│   │   │   ├── ProofGenerator.tsx
│   │   │   └── ResultDisplay.tsx
│   │   ├── utils/
│   │   │   ├── zkp.ts
│   │   │   ├── pdf.ts
│   │   │   └── hash.ts
│   │   └── types/
│   │       └── index.ts
│   └── public/
│       └── circuits/
│           ├── simple.circom
│           ├── simple.wasm
│           ├── simple.zkey
│           └── simple_vk.json
├── executive-console/              # React + Vite (簡易版)
│   ├── package.json
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── CircuitBuilder.tsx
│   │   │   └── VKExporter.tsx
│   │   └── utils/
│   │       ├── circuit-generator.ts
│   │       └── vk-generator.ts
│   └── public/
│       └── templates/
│           └── circuit-template.circom
├── registrar-console/              # React + Vite (簡易版)
│   ├── package.json
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── VKImporter.tsx
│   │   │   └── JSONListManager.tsx
│   │   └── utils/
│   │       └── vk-processor.ts
│   └── data/
│       └── vk-registry.json
├── verifier-ui/                    # Next.js
│   ├── package.json
│   ├── src/
│   │   ├── app/
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── PDFDropZone.tsx
│   │   │   ├── VKSelector.tsx
│   │   │   └── VerificationResult.tsx
│   │   └── utils/
│   │       ├── verification.ts
│   │       └── pdf-extractor.ts
│   └── public/
│       └── vk-files/
└── shared/
    ├── circuits/
    │   ├── simple.circom
    │   └── build/
    ├── types/
    │   └── common.ts
    └── utils/
        └── hash.ts
```

---

## 🔧 **最小回路設計**

### **Simple.circom - 最小限回路**
```circom
// shared/circuits/simple.circom
pragma circom 2.1.4;

include "node_modules/circomlib/circuits/poseidon.circom";

template SimpleProof() {
    // 公開入力
    signal input pdfHash;
    signal input destHash;
    
    // 秘密入力
    signal input secret;
    
    // 出力
    signal output valid;
    
    // ハッシュ計算
    component hasher = Poseidon(3);
    hasher.inputs[0] <== pdfHash;
    hasher.inputs[1] <== destHash;
    hasher.inputs[2] <== secret;
    
    // 簡単な検証
    valid <== 1;
}

component main = SimpleProof();
```

---

## 📋 **実装スケジュール（1週間）**

### **Day 1-2: 基盤セットアップ**

#### **1.1 全プロジェクト作成**
```bash
# Scholar Prover
npm create vite@latest scholar-prover -- --template react-ts
cd scholar-prover && npm install pdf-lib snarkjs

# Executive Console (簡易版)
npm create vite@latest executive-console -- --template react-ts
cd executive-console && npm install

# Registrar Console (簡易版)  
npm create vite@latest registrar-console -- --template react-ts
cd registrar-console && npm install

# Verifier UI
npx create-next-app@latest verifier-ui --typescript --tailwind
cd verifier-ui && npm install snarkjs pdf-lib
```

#### **1.2 簡単な回路作成**
```bash
# 最小限のCircom回路
mkdir -p shared/circuits
# Simple.circomを作成
circom shared/circuits/simple.circom --r1cs --wasm --sym
```

### **Day 3-4: 各システム最小実装**

#### **2.1 Scholar Prover - 基本機能**
```typescript
// scholar-prover/src/App.tsx
import React, { useState } from 'react';
import { PDFUpload } from './components/PDFUpload';
import { ProofGenerator } from './components/ProofGenerator';
import { ResultDisplay } from './components/ResultDisplay';

export default function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [destination, setDestination] = useState('');
  const [proof, setProof] = useState<any>(null);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Scholar Prover - 最小実装</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <PDFUpload onFileSelect={setPdfFile} />
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">提出先</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="提出先を入力"
            />
          </div>
        </div>
        
        <div>
          <ProofGenerator 
            pdfFile={pdfFile}
            destination={destination}
            onProofGenerated={setProof}
          />
          {proof && <ResultDisplay proof={proof} />}
        </div>
      </div>
    </div>
  );
}
```

#### **2.2 Executive Console - 簡易版**
```typescript
// executive-console/src/App.tsx
import React, { useState } from 'react';
import { CircuitBuilder } from './components/CircuitBuilder';
import { VKExporter } from './components/VKExporter';

export default function App() {
  const [circuitCode, setCircuitCode] = useState('');
  const [vk, setVK] = useState<any>(null);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Executive Console - 回路作成</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CircuitBuilder 
          onCircuitGenerated={setCircuitCode}
          onVKGenerated={setVK}
        />
        <VKExporter vk={vk} />
      </div>
    </div>
  );
}
```

#### **2.3 Registrar Console - 簡易版**
```typescript
// registrar-console/src/App.tsx
import React, { useState } from 'react';
import { VKImporter } from './components/VKImporter';
import { JSONListManager } from './components/JSONListManager';

export default function App() {
  const [vkList, setVKList] = useState<any[]>([]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Registrar Console - VK管理</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <VKImporter onVKImported={(vk) => setVKList([...vkList, vk])} />
        <JSONListManager vkList={vkList} onListUpdated={setVKList} />
      </div>
    </div>
  );
}
```

#### **2.4 Verifier UI - 基本検証**
```typescript
// verifier-ui/src/app/page.tsx
'use client';
import React, { useState } from 'react';
import { PDFDropZone } from '../components/PDFDropZone';
import { VKSelector } from '../components/VKSelector';
import { VerificationResult } from '../components/VerificationResult';

export default function Home() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [selectedVK, setSelectedVK] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Verifier UI - 検証システム</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <PDFDropZone onFileSelect={setPdfFile} />
        <VKSelector onVKSelect={setSelectedVK} />
        <VerificationResult 
          pdfFile={pdfFile}
          vk={selectedVK}
          onVerificationComplete={setResult}
        />
      </div>
    </div>
  );
}
```

### **Day 5-7: 統合・テスト**

#### **3.1 システム間連携**
```typescript
// shared/types/common.ts
export interface ProofData {
  proof: any;
  publicSignals: string[];
  metadata: {
    pdfHash: string;
    destHash: string;
    timestamp: number;
    version: string;
  };
}

export interface VerifyingKey {
  protocol: string;
  curve: string;
  nPublic: number;
  vk_alpha_1: [string, string];
  vk_beta_2: [[string, string], [string, string]];
  vk_gamma_2: [[string, string], [string, string]];
  vk_delta_2: [[string, string], [string, string]];
  vk_alphabeta_12: any;
  IC: [string, string][];
}

export interface VKRegistry {
  id: string;
  name: string;
  version: string;
  vk: VerifyingKey;
  createdAt: string;
}
```

#### **3.2 統合テストシナリオ**
```typescript
// 統合テストフロー
const minimumViableTest = async () => {
  console.log("=== 最小実装統合テスト ===");
  
  // 1. Executive Console: 回路・VK作成
  const vk = await createCircuitAndVK();
  console.log("VK作成完了");
  
  // 2. Registrar Console: VKをJSONリストに追加
  const vkRegistry = await addVKToRegistry(vk);
  console.log("VKレジストリ更新完了");
  
  // 3. Scholar Prover: ZKP生成
  const proof = await generateProof("test.pdf", "university");
  console.log("証明生成完了");
  
  // 4. Verifier UI: 検証
  const result = await verifyProof(proof, vk);
  console.log("検証完了:", result);
};
```

---

## 🎯 **成功基準**

### **技術的成功基準**
- [ ] 4システムすべてが基本動作する
- [ ] ZKP生成・検証の基本フローが動作する
- [ ] ローカルファイルでの VK 管理が動作する
- [ ] システム間でのデータ受け渡しが動作する

### **理解度成功基準**
- [ ] **基本概念**: ZKP証明書システムの仕組み理解
- [ ] **システム構成**: 4システムの役割理解
- [ ] **Trust Minimized**: 分散化設計の基本理解
- [ ] **実用性**: 大学での利用イメージ理解

### **デモンストレーション成功基準**
- [ ] **5分デモ**: 4システム連携の基本動作
- [ ] **概念説明**: ZKP + ブロックチェーンの価値説明
- [ ] **実用性**: 実際の大学での利用可能性説明

---

## 🚀 **開発開始手順**

### **1. 環境セットアップ（30分）**
```bash
# 各システムのセットアップ
./setup-all.sh

# 基本回路コンパイル
cd shared/circuits
circom simple.circom --r1cs --wasm --sym
```

### **2. 開発実行（並列開発）**
```bash
# 4つのターミナルで並列実行
cd scholar-prover && npm run dev      # ポート 5173
cd executive-console && npm run dev   # ポート 5174  
cd registrar-console && npm run dev   # ポート 5175
cd verifier-ui && npm run dev         # ポート 3000
```

### **3. 統合テスト（1時間）**
```bash
npm run test:integration
npm run demo:prepare
```

---

## 📝 **Phase 1準備**

Phase 0完了後、以下の機能を Phase 1 で追加：

### **ブロックチェーン統合**
- Polygon zkEVM Cardona 統合
- スマートコントラクト（VK管理）
- メタマスク連携

### **Trust Minimized拡張**
- ブロックチェーンVK取得
- 分散検証
- 透明性向上

---

**Phase 0目標**: 4システム最小実装を完成させ、ZKP証明書システムの全体像と価値を実感する。
