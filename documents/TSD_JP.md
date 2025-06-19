# 技術設計書 (TSD) — ZKP 付き書類真正性証明システム
**バージョン 2.1 最終更新: 2025‑01‑20**

> **汎用的書類真正性証明システム** - あらゆる書類に適応可能な設計で、例として卒業証書の真正性証明を実装

---

## 1. 暗号プリミティブ選定

| 目的 | アルゴリズム | 出力 | 選定根拠 |
|------|-------------|------|----------|
| 外部ハッシュ | SHA‑3‑512 | 512 bit | Grover攻撃でも実効256bit量子セキュリティ |
| 内部ハッシュ | Poseidon‑256 | 256 bit | ZK‑SNARK最適化；低制約数 |
| Passkey署名 | ES‑256 | r,s 32 B | WebAuthn Level‑2規格 |
| 管理者認証 | EIP‑191（Ledger） | 65 B | ハードウェアパーソナルメッセージ署名 |
| ZKPシステム | Groth16 | ~2KB JSON | Circom + SnarkJS標準 |

---

## 2. Circom回路設計

### 2.1 Document{Year}.circomテンプレート
```circom
pragma circom 2.1.4;

include "poseidon.circom";
include "ecdsa.circom";
include "merkle-tree.circom";

template DocumentProof() {
    // 公開入力
    signal input vkHash;
    signal input schemaHash; 
    signal input merkleRoot;
    signal input pdfHash;
    signal input destHash;
    signal input expireTs;
    
    // 秘密入力
    signal input privateKey;
    signal input signature[2]; // [r, s]
    signal input merkleProof[8];
    signal input merkleIndex;
    
    // 出力
    signal output valid;
    
    // 1. Passkey署名検証
    component ecdsa = ECDSAVerify();
    ecdsa.publicKey <== privateKey;
    ecdsa.signature <== signature;
    ecdsa.message <== poseidon4([pdfHash, destHash, expireTs, 0]);
    
    // 2. Merkle包含証明検証
    component merkle = MerkleTreeChecker(8);
    merkle.leaf <== poseidon1([privateKey]);
    merkle.root <== merkleRoot;
    merkle.pathElements <== merkleProof;
    merkle.pathIndices <== merkleIndex;
    
    // 3. 検証結果統合
    valid <== ecdsa.valid * merkle.valid;
}
```

### 2.2 回路仕様
| パラメータ | 値 | 備考 |
|-----------|----|----|
| 制約数 | ~65,000 | ブラウザ向け最適化 |
| 証明サイズ | ~2KB JSON | Groth16シリアライズ済み |
| 証明時間 | 5-15s | M1 MacBook、1コア |
| 検証時間 | 50-100ms | SnarkJS WASM |

---

## 3. システム技術スタック

### 3.1 証明者システム (Scholar Prover PWA)
```typescript
// 技術スタック
- フレームワーク: React 18 + Vite 4
- ZKP: Circom 2.1.4 + SnarkJS 0.7
- PDF: pdf-lib + PDF/A-3埋め込み
- ストレージ: IndexedDB + localStorage
- 認証: WebAuthn Level 2
- ビルド: Vite PWAプラグイン

// 回路統合
import { groth16 } from "snarkjs";

const generateProof = async (inputs: CircuitInputs) => {
  const { proof, publicSignals } = await groth16.fullProve(
    inputs,
    "/circuit.wasm",
    "/circuit_final.zkey"
  );
  return { proof, publicSignals };
};
```

### 3.2 責任者システム (Executive Console Tauri)
```typescript
// 技術スタック
- フレームワーク: React 18 + TypeScript + Tauri v2
- Ledger: @ledgerhq/hw-transport-node-hid
- Web3: ethers.js v6
- コンパイラー: circom CLI + snarkjs
- ストレージ: Tauri fs API + JSONファイル

// Ledger EIP-191統合
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import AppEth from "@ledgerhq/hw-app-eth";

const signWithLedger = async (message: string) => {
  const transport = await TransportNodeHid.create();
  const eth = new AppEth(transport);
  
  const signature = await eth.signPersonalMessage(
    "44'/60'/0'/0/0",
    Buffer.from(message, 'utf8').toString('hex')
  );
  
  return `0x${signature.r}${signature.s}${signature.v.toString(16)}`;
};
```

### 3.3 管理者システム (Registrar Console Tauri)
```typescript
// 技術スタック
- フレームワーク: React 18 + TypeScript + Tauri v2
- ハッシュ: @noble/hashes (Poseidon実装)
- PDF: puppeteer + PDF/A-3テンプレート
- ストレージ: Tauri fs API + JSONファイル
- Merkle: カスタムPoseidon Merkle tree

// Merkle Tree実装
import { poseidon2 } from "@noble/hashes/poseidon";

class PoseidonMerkleTree {
  private depth = 8;
  private zeroValue = BigInt(0);
  
  buildTree(leaves: bigint[]): MerkleTree {
    // 2^8 = 256葉までパディング
    while (leaves.length < 256) {
      leaves.push(this.zeroValue);
    }
    
    return this.computeLevels(leaves);
  }
}
```

### 3.4 検証者システム (Verifier UI SSG)
```typescript
// 技術スタック
- フレームワーク: Next.js 15 (SSGモード) + App Router
- ZKP: SnarkJS 0.7 (検証のみ)
- PDF: PDF.js + 添付ファイル抽出
- Web3: ethers.js v6 (読み取り専用)
- デプロイ: GitHub Pagesへ静的エクスポート

// 検証フロー
const verifyProof = async (pdfFile: File) => {
  // 1. PDF/A-3から証明抽出
  const { proof, publicSignals } = await extractProofFromPDF(pdfFile);
  
  // 2. ブロックチェーンからVK取得
  const vk = await getVerifyingKey(publicSignals.year);
  
  // 3. 証明検証
  const isValid = await groth16.verify(vk, publicSignals, proof);
  
  return { isValid, expiry: publicSignals.expireTs };
};
```

---

## 4. スマートコントラクト・アーキテクチャ

### 4.1 YearlyDeploymentManager.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract YearlyDeploymentManager {
    struct YearlySet {
        uint256 year;
        address nftContract;
        bytes32 vkHash;          // 検証鍵のSHA3-512
        bytes32 circuitHash;     // 回路ファイルのSHA3-512
        bytes32 merkleRoot;      // Poseidon Merkleルート
        uint256 deployedAt;
    }
    
    mapping(uint256 => YearlySet) public yearlySets;
    address public immutable deployer;
    
    event YearlySetDeployed(
        uint256 indexed year,
        address nftContract,
        bytes32 vkHash,
        bytes32 merkleRoot
    );
    
    modifier onlyDeployer() {
        require(msg.sender == deployer, "Unauthorized");
        _;
    }
    
    function deployYearlySet(
        uint256 year,
        bytes32 vkHash,
        bytes32 circuitHash,
        bytes32 merkleRoot,
        bytes calldata ledgerSignature
    ) external onlyDeployer {
        // EIP-191署名検証
        bytes32 messageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            keccak256(abi.encodePacked(year, vkHash, circuitHash, merkleRoot))
        ));
        
        require(ecrecover(messageHash, v, r, s) == deployer, "Invalid signature");
        
        // YearlySetデプロイ処理
        // ...
    }
}
```

---

## 5. Poseidon Merkle Tree

| パラメータ | 値 |
|-----------|-----|
| depth | 8 (256葉) |
| zeroLeaf | `0x0` |
| hash | Poseidon‑256 |

### 5.1 チャレンジ計算
`challenge = SHA3‑512(pdfHash || destHash || expireTs || salt)`

---

## 6. Ledger VK署名ドメイン

```
msg = keccak256(
       "zk-cert-framework.local",  // ドメイン区分
       vkHash,
       chainId,
       address(this))
sig = ledger.signPersonalMessage(msg)
```
検証者は`ecrecover(sig) == deployerAddress`をチェック。

---

## 7. CI/CD パイプライン

```yaml
name: zk-cert-framework
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Swatinem/rust-cache@v2
      - name: Test Circuits
        run: |
          npm install -g circom snarkjs
          cd circuits
          circom Document2025.circom --wasm --r1cs
          snarkjs groth16 setup Document2025.r1cs ptau/pot15_final.ptau Document2025_final.zkey
      - name: Test Components
        run: |
          cd scholar-prover && npm test
          cd ../executive-console && npm run test:tauri
          cd ../registrar-console && npm run test:tauri
          cd ../verifier-ui && npm test
      - name: E2E Tests
        run: npx playwright test
```

---

## 8. テストベクトル

ディレクトリ `test_vectors/` に配置:
* `sample.pdf`, `certificate_inputs.json`, `proof.json`, `yearly_nft.json`, `vk.json`
* CIは完全なラウンドトリップ証明の合格と改竄バリアントの失敗をアサート

---

## 9. セキュリティ考慮事項

### 9.1 Ledgerハードウェアセキュリティ
- 全管理者操作にLedger Nano X物理確認要求
- EIP-191パーソナルメッセージでフィッシング防止
- 5分間有効ウィンドウでリプレイ攻撃防止

### 9.2 年度別独立性
- 各年度 = 独立した回路 + VK + NFTコントラクト
- 年度間共有秘密なし
- キーローテーション複雑性排除

### 9.3 バックエンドレス・セキュリティ
- サーバー攻撃面積ゼロ
- データベース侵害リスクなし
- クラウド依存性排除による完全ローカル制御
