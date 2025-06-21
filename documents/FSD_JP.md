# 機能設計書 (FSD) — ZKP 付き書類真正性証明システム
**バージョン 2.1 最終更新: 2025‑06‑21**

> **汎用的書類真正性証明システム** - あらゆる書類に適応可能な設計で、例として卒業証書の真正性証明を実装

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
    H[書類所有者キー JSON] --> I[Merkle Tree ビルダー]
    I --> J[PDF/A-3 生成]
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
### 2.1 Passkey 登録画面（証明者システム）
| 要素 | ID | 機能 |
|------|----|------|
| 登録ボタン | btnRegister | `navigator.credentials.create()` 実行 |
| 所有者ID入力 | txtOwnerId | 書類所有者ID（数値検証付き） |
| ローカル保存 | localStorageKey | Passkeyデータをローカル保存 |

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

### 2.4 書類所有者キー管理（管理者システム）
| 要素 | ID | 機能 |
|------|----|------|
| 所有者キーファイル | fileOwnerKeys | 書類所有者Passkeyデータ JSON |
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
├── owners-{year}.json         # 書類所有者Passkeyデータ
├── merkle-tree-{year}.json    # 計算済みMerkle tree
└── generated-pdfs/{year}/     # 一括生成PDF

証明者システム (Scholar Prover PWA):
localStorage:
- passkey_info: {publicKey, credentialId}
- circuit_cache: {wasm, zkey, vk}
- proof_history: [{pdfHash, timestamp, proofId}]
```

## 4. 詳細ワークフロー - 証明生成

```mermaid
sequenceDiagram
    participant Owner as 書類所有者
    participant PWA as 証明者システム PWA
    participant LS as Local Storage
    participant Circuit as Circom Circuit

    Owner->>PWA: PDF + dest + expiry をドラッグ
    PWA->>PWA: pdfHash + destHash 計算
    PWA->>Owner: WebAuthn getAssertion()
    Owner-->>PWA: pk, sig
    PWA->>LS: 回路ファイル読み込み
    LS-->>PWA: circuit.wasm, circuit.zkey
    PWA->>Circuit: snarkjs.groth16.fullProve()
    Circuit-->>PWA: proof.json + publicSignals
    PWA->>PWA: PDF/A-3 に proof 埋め込み
    PWA-->>Owner: 拡張PDF ダウンロード
```

## 5. データ辞書
| フィールド | 型 | 説明 |
|-----------|----|------|
| commit | hex[64] | Poseidon256(pk) |
| vkHash | hex[128]| SHA‑3‑512 of VK |
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

## 7. Trust Minimization 機能

### 7.1 外部依存性排除
- ✅ バックエンドサーバーなし
- ✅ データベースなし
- ✅ クラウドサービス使用なし
- ✅ 外部ストレージ（IPFS等）なし

### 7.2 信頼できるコンポーネントのみ
- 🔐 Polygon zkEVM（パブリックブロックチェーン）
- 📱 Ledger Nano X（ハードウェア認証済み）
- 🌐 npm パッケージ（ビルド時検証済み）
- 💻 ブラウザ標準API

### 7.3 年度別独立性
- 各年度 = 完全に独立した回路 + VK + NFT
- キーローテーション複雑性なし
- 年度間依存性なし
- シンプルな検証ロジック

## 8. テストケース
- TC‑01: 正常生成（証明者システム + Circom）
- TC‑02: 期限切れ（検証者システム）
- TC‑03: PDF 改竄検出（SnarkJS）
- TC‑04: Ledger署名検証（責任者システム）
- TC‑05: バックエンドレス動作確認（全システム）
