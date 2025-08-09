# 機能設計書 (FSD) — Tri-CertFramework（三層認証書類真正性証明システム）
**バージョン 2.4 最終更新: 2025‑08‑09**

> **三層認証書類真正性証明システム** - ZKP + ブロックチェーン + 電子署名による三層認証で、あらゆる書類に適応可能な設計

---

## 1. システム構成 (C4)
```mermaid
graph TD
  subgraph "証明者システム (Scholar Prover PWA)"
    A[PDF + 入力データ] --> B[Circom-SnarkJS Prover]
    B --> C{proof.json}
    C --> D[PDF/A‑3 書き込み]
  end
  subgraph "責任者システム (Executive Console Tauri)"
    E[回路ファイル] --> F[Ledger Nano X]
    F --> G[年度セット デプロイ]
  end
  subgraph "管理者システム (Registrar Console Tauri)"
    H[検証鍵レジストリ JSON] --> I[Merkle Tree ビルダー]
    I --> J[IPFS/GitHub公開 + PDF/A-3 生成]
  end
  subgraph "検証者システム (Verifier UI SSG)"
    K[PDF 入力] --> L[SnarkJS 検証]
    L --> M[検証結果]
  end
  D -->|送信| K
  G -->|デプロイ| N[Polygon zkEVM YearNFT]
  L -->|クエリ| N
```

## 2. UI 仕様
### 2.1 電子署名キー生成画面（証明者システム）
| 要素 | ID | 機能 |
|------|----|------|
| キー生成ボタン | btnGenerateKey | `navigator.credentials.create()` 実行 |
| 検証鍵エクスポート | btnExportKey | JWK形式で検証鍵をエクスポート |
| 学生ID入力 | txtStudentId | 学生ID（数値検証付き） |
| ローカル保存 | localStorageKey | 電子署名キーデータをローカル保存 |

### 2.2 証明生成画面（証明者システム）
| 要素 | ID | 機能 |
|------|----|------|
| PDF ドロップ | dropPDF | ファイル入力（MIME: application/pdf） |
| 提出先入力 | txtDest | SHA‑3‑512(dest) をblur時に計算 |
| 期限入力 | dateExpire | 最大365日後まで設定可能 |
| 生成ボタン | btnGenerate | 入力が有効になるまで無効化 |

### 2.3 年度セット管理（責任者システム）
| 要素 | ID | 機能 |
|------|----|------|
| 回路ファイル | fileCircuit | Document{Year}.circom アップロード |
| Ptauファイル | filePtau | Powers of Tau セレモニーファイル |
| Ledger署名 | btnLedgerSign | Ledger Nano X EIP-191 署名実行 |
| 年度入力 | yearInput | 書類発行年度（2025+） |

### 2.4 検証鍵レジストリ管理（管理者システム）
| 要素 | ID | 機能 |
|------|----|------|
| 検証鍵ファイル | fileVerificationKeys | 学生検証鍵データ JSON |
| レジストリ公開 | btnPublishRegistry | IPFS/GitHub公開リポジトリに公開 |
| Merkleビルド | btnBuildMerkle | Poseidon Merkle Tree 構築 |
| PDF生成 | btnGeneratePDFs | 一括 PDF/A-3 生成 |

## 3. バックエンドレス・データ管理

### 3.1 ローカルストレージアーキテクチャ
```
責任者システム (Executive Console Tauri):
config/
├── yearly-sets.json          # デプロイ済み年度セット
├── circuits/Document{Year}.circom
├── build/Document{Year}.zkey
└── signatures/operations.log  # Ledger署名ログ

管理者システム (Registrar Console Tauri):
data/
├── verification-keys-{year}.json    # 学生検証鍵データ
├── published-registries/{year}/     # 公開済みレジストリ
├── merkle-tree-{year}.json          # 計算済みMerkle tree
└── generated-pdfs/{year}/           # 一括生成PDF

証明者システム (Scholar Prover PWA):
localStorage:
- signature_key_info: {verificationKey, credentialId}
- verification_key: {jwk格式検証鍵}
- circuit_cache: {wasm, zkey, vk}
- signature_history: [{pdfHash, signature, timestamp}]
```

## 4. 詳細ワークフロー - 証明生成

```mermaid
sequenceDiagram
    participant Student as 学生
    participant PWA as 証明者システム PWA
    participant LS as Local Storage
    participant Circuit as Circom Circuit
    participant Repo as 公開リポジトリ

    Student->>PWA: PDF + dest + expiry をドラッグ
    PWA->>PWA: pdfHash + destHash 計算
    PWA->>Student: WebAuthn getAssertion() (電子署名)
    Student-->>PWA: digitalSignature, verificationKey
    PWA->>LS: 回路ファイル読み込み
    LS-->>PWA: circuit.wasm, circuit.zkey
    PWA->>Circuit: snarkjs.groth16.fullProve()
    Circuit-->>PWA: proof.json + publicSignals
    PWA->>PWA: PDF/A-3 に proof + digitalSignature 埋め込み
    PWA-->>Student: 三層認証PDF ダウンロード
    PWA->>Repo: 検証鍵をリポジトリに提出
```

## 5. データ辞書
| フィールド | 型 | 説明 |
|-----------|----|------|
| commit | hex[64] | Poseidon256(verification_key) |
| vkHash | hex[128]| SHA‑3‑512 of VK |
| digitalSignature | base64 | ES256電子署名（PDF+デスト+期限） |
| verificationKey | json | JWK形式検証鍵 |
| keyRegistryHash | hex[128] | 検証鍵レジストリのSHA‑3‑512 |
| merkleRoot | hex[64] | Poseidon256 |
| yearlySetAddr | hex[40] | デプロイ済みコントラクトアドレス |
| circuitHash | hex[128] | 回路ファイルのSHA‑3‑512 |
| ledgerSignature | hex[130] | Ledger からの EIP-191 署名 |

## 6. エラーハンドリング
| コード | メッセージ | UI アクション |
|-------|-----------|-------------|
| 1001 | INVALID_PDF_HASH | 赤バナー表示 |
| 1002 | EXPIRED | 黄バナー表示 |
| 1003 | LEDGER_DISCONNECTED | 接続ダイアログ表示 |
| 1004 | CIRCUIT_COMPILE_FAILED | エラー詳細表示 |
| 1005 | SNARKJS_PROOF_FAILED | 異なる入力で再試行 |
| 1006 | DIGITAL_SIGNATURE_FAILED | 電子署名再実行 |
| 1007 | VERIFICATION_KEY_INVALID | 検証鍵形式エラー |
| 1008 | REGISTRY_PUBLICATION_FAILED | リポジトリ公開エラー |

## 7. Trust Minimization 機能

### 7.1 最小外部依存性
- ✅ バックエンドサーバーなし
- ✅ データベースなし
- ✅ クラウドサービス使用なし
- 📂 公開リポジトリのみ（IPFS/GitHub・検証鍵配布用）

### 7.2 信頼できるコンポーネントのみ
- 🔐 Polygon zkEVM（パブリックブロックチェーン）
- 📱 Ledger Nano X（ハードウェア認証済み）
- 📂 IPFS/GitHub（分散型・公開リポジトリ）
- 🌐 npm パッケージ（ビルド時検証済み）
- 💻 ブラウザ標準API

### 7.3 年度別独立性
- 各年度 = 完全に独立した回路 + VK + NFT
- キーローテーション複雑性なし
- 年度間依存性なし
- シンプルな検証ロジック

## 8. テストケース
- TC‑01: 正常生成（証明者システム + Circom + 電子署名）
- TC‑02: 期限切れ（検証者システム）
- TC‑03: PDF 改竄検出（SnarkJS + 電子署名検証）
- TC‑04: Ledger署名検証（責任者システム）
- TC‑05: 検証鍵レジストリ公開・取得（管理者・検証者システム）
- TC‑06: 電子署名検証（検証者システム）
- TC‑07: 三層認証統合動作確認（全システム）
