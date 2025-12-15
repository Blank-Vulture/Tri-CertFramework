---
title: Verifier UI
description: 証明書検証Webアプリケーション
---

**Verifier UI** は、企業や機関が提示された証明書が本物かを確認するWebサイトです。ログイン不要で誰でも即座に検証可能です。

## 主な機能

- **証明付きPDFの読み込み**: ドラッグ&ドロップまたはファイル選択
- **ZK証明の検証**: ゼロ知識証明の有効性を確認
- **署名検証**: WebAuthn署名の検証
- **登録確認**: 発行者情報の照合

## 技術スタック

| 項目 | 技術 |
|------|------|
| **Framework** | Next.js 14 |
| **Language** | TypeScript |
| **ZK Library** | snarkjs (WASM) |
| **PDF Processing** | pdf-lib |
| **Styling** | Tailwind CSS |

## 開発

### セットアップ

```bash
cd verifier-ui
npm install
npm run dev
```

開発サーバーが `http://localhost:3001` で起動します。

### ビルド

```bash
npm run build
npm run start
```

### 静的エクスポート（GitHub Pages用）

```bash
npm run build:export
```

## 検証プロセス

Verifier UIは5つの検証ステップを実行します：

### 1. データ抽出

PDFファイルから証明データを抽出します。

- tail-append方式（暗号化PDF対応）
- Subjectメタデータ方式（通常PDF）

### 2. ハッシュ照合

PDFの内容が改ざんされていないことを確認します。

- SHA3-512ハッシュを計算
- 証明データ内のハッシュと比較

### 3. ZK証明検証

ゼロ知識証明が有効であることを確認します。

- snarkjs groth16検証
- 公開信号の検証

### 4. 署名検証

電子署名が有効であることを確認します。

- WebAuthn署名の検証
- ECDSA P-256

### 5. 登録確認

発行者情報を確認します。

- `commit-allowlist.json` との照合
- 発行機関名の表示

## 検証結果

| ステータス | 意味 |
|-----------|------|
| ✅ 成功 | 検証項目がパス |
| ❌ 失敗 | 検証項目が不合格 |
| ⚠️ スキップ | オプション項目（データなし） |

## 多言語対応

Verifier UIは日本語と英語に対応しています。

- `src/i18n/ja.json` - 日本語
- `src/i18n/en.json` - 英語

## 高度なオプション

### 検証鍵のアップロード

通常は自動的に年度別VKを読み込みますが、手動でアップロードすることも可能です。

### 公開鍵のアップロード

署名検証用の公開鍵を手動で指定できます。

## 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `NEXT_PUBLIC_BASE_PATH` | ベースパス | `/` |
| `BASE_PATH` | 静的エクスポート用 | `/` |

## トラブルシューティング

### 「データ抽出」で失敗する

- Proverで生成したPDFか確認
- 元のテスト用PDFでは検証できません
- ファイルが破損していないか確認

### 「登録確認」で失敗する

- ネットワーク接続を確認
- `commit-allowlist.json` がGitHubで公開されているか確認
