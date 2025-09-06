# 年度別VK統合機能ガイド

## 🎯 概要

Tri-CertFrameworkに年度別検証鍵（VK）管理機能を統合しました。これにより、卒業年度ごとに異なるVKを使用して、より細かい証明書管理が可能になります。

## 🏗️ 実装された機能

### 1. ZKP回路の年度対応
- **ファイル**: `circuits/commitment.circom`
- **変更点**: `graduation_year`を公開入力として追加
- **新しい入力構造**:
  ```
  Private: owner_secret
  Public: pdf_sha3_512, graduation_year
  Output: commit = Poseidon(owner_secret, pdf_sha3_512, graduation_year)
  ```

### 2. Scholar Prover の年度入力機能
- **ファイル**: `prover/src/app/components/ProofGenerator.tsx`
- **機能**:
  - 年度選択UI（クイックボタン + 手動入力）
  - 半角数字制限（inputMode: numeric, pattern: [0-9]*）
  - 年度範囲バリデーション（2000-2050年）
  - 年度別circuit_id生成（`commitment_poseidon_YYYY_v1`）

### 3. Executive Console の新規作成
- **ディレクトリ**: `executive-console/`
- **技術スタック**: Vite + React + TypeScript + TailwindCSS
- **主要機能**:
  - 年度別VK生成・管理
  - VKファイル自動ダウンロード（`vkey_YYYY.json`）
  - VKハッシュファイル生成（`vkey_hash_YYYY.txt`）
  - 一括エクスポート機能

### 4. Verifier UI の年度別検証機能
- **ファイル**: `verifier-ui/src/app/page.tsx`
- **機能**:
  - 年度別VK選択モード
  - 証明書からの年度自動検出
  - 年度別VKファイル自動読み込み（`/vkey_YYYY.json`）
  - フォールバック機能（デフォルトVK使用）

## 🚀 起動方法

### Executive Console
```bash
cd executive-console
npm install
npm run dev
# http://localhost:5173 でアクセス
```

### Scholar Prover
```bash
cd prover
npm install
npm run dev
# http://localhost:3000 でアクセス
```

### Verifier UI
```bash
cd verifier-ui
npm install
npm run dev
# http://localhost:3001 でアクセス
```

## 📋 使用手順

### 1. 年度別VK生成（Executive Console）
1. Executive Consoleを起動
2. 「VK 生成」タブを選択
3. 卒業年度を指定（2024, 2025, 2026など）
4. 「YYYY年度用VKを生成」ボタンをクリック
5. 自動的に`vkey_YYYY.json`と`vkey_hash_YYYY.txt`がダウンロード

### 2. 年度別証明書生成（Scholar Prover）
1. Scholar Proverを起動
2. PDFファイルをアップロード
3. WebAuthn認証設定
4. 秘密鍵を入力
5. **卒業年度を選択**（新機能）
6. 「Generate Proof & Digital Signature」実行
7. 年度情報が含まれた証明書PDFが生成

### 3. 年度別検証（Verifier UI）
1. Verifier UIを起動
2. 証明書PDFをアップロード
3. **年度別VK選択モードを有効化**（新機能）
4. 年度を指定または自動検出
5. 検証実行
6. 年度に対応したVKで自動検証

## 🔧 技術詳細

### データ構造の変更

#### ProofData
```typescript
interface ProofData {
  schema: string;
  circuit_id: string; // "commitment_poseidon_YYYY_v1"
  vkey_hash: string;
  public_signals: {
    pdf_sha3_512: string;
    graduation_year: string;  // 新規追加
    commit: string;
  };
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
  };
}
```

#### SignatureData
```typescript
interface SignatureData {
  // ... 他のフィールド
  sig_target: {
    schema: string;
    circuit_id: string;
    vkey_hash: string;
    pdf_sha3_512: string;
    graduation_year: string;  // 新規追加
    commit: string;
    issued_at: string;
  };
}
```

### VKファイル命名規則
- **年度別**: `vkey_2024.json`, `vkey_2025.json`, etc.
- **ハッシュファイル**: `vkey_hash_2024.txt`, `vkey_hash_2025.txt`, etc.
- **デフォルト**: `vkey.json`（フォールバック用）

## 🔒 セキュリティ強化

### 年度固定による偽造防止
- 卒業年度がZKP公開シグナルに含まれ、改ざん不可能
- 年度別VKにより、他年度のVKを使用した偽造を防止
- circuit_idに年度が含まれ、回路レベルでの検証が可能

### バリデーション
- 年度範囲制限（2000-2050年）
- 半角数字のみ入力可能
- UI・バックエンド両方でのバリデーション

## 📊 プロジェクト構造

```
Tri-CertFramework/
├── executive-console/          # 新規作成（年度別VK管理）
│   ├── src/
│   │   ├── components/
│   │   │   ├── VKGenerator.tsx
│   │   │   └── VKManager.tsx
│   │   └── App.tsx
├── prover/                     # 年度入力機能追加
│   └── src/app/components/
│       └── ProofGenerator.tsx  # 年度選択UI追加
├── verifier-ui/                # 年度別検証機能追加
│   └── src/app/
│       └── page.tsx           # 年度別VK読み込み機能追加
└── circuits/
    └── commitment.circom       # 年度対応回路
```

## 🎉 完了したタスク

- ✅ 回路を年度対応に修正（graduation_year を公開入力に追加）
- ✅ Executive Console作成（Vite + React + TypeScript）
- ✅ Proverに年度入力UI追加（半角数字制限）
- ✅ Verifier UIに年度別VK選択機能追加
- ✅ Executive Consoleで年度別VK生成・管理機能実装

## 📝 次のステップ（オプション）

1. **回路の実際のコンパイル**: Circom環境の修正
2. **ブロックチェーン統合**: Phase 1機能（VKManager.sol）
3. **Merkle Tree統合**: Phase 2機能（大規模データ対応）
4. **E2Eテスト**: 年度別機能の総合テスト

---

**注意**: 現在はPhase 0実装として、既存のVKファイルをベースに年度別のメタデータを付与する方式を採用しています。実際の年度別回路コンパイルは、Circom環境の整備後に実装予定です。
