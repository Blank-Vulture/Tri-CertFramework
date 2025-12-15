---
title: Prover
description: ZK証明生成Webアプリケーション
---

**Prover** は、一般ユーザーが自分の証明書を受け取り、ゼロ知識証明を添付するためのWebアプリケーションです。

## 主な機能

- **PDF証明書の読み込み**: ドラッグ&ドロップまたはファイル選択
- **ZK証明の生成**: ブラウザ内でゼロ知識証明を計算
- **WebAuthn署名**: 生体認証による電子署名
- **証明付きPDFの出力**: 証明データを埋め込んだPDFをダウンロード

## 技術スタック

| 項目 | 技術 |
|------|------|
| **Framework** | Next.js 14 |
| **Language** | TypeScript |
| **ZK Library** | snarkjs (WASM) |
| **PDF Processing** | pdf-lib |
| **Authentication** | WebAuthn / FIDO2 |

## 開発

### セットアップ

```bash
cd prover
npm install
npm run dev
```

開発サーバーが `http://localhost:3000` で起動します。

### ビルド

```bash
npm run build
npm run start
```

### 静的エクスポート（GitHub Pages用）

```bash
npm run build:export
```

`out/` ディレクトリに静的ファイルが出力されます。

## 証明生成フロー

```
1. PDFをアップロード
      ↓
2. PDF内容のSHA3-512ハッシュを計算
      ↓
3. ZK回路にハッシュを入力
      ↓
4. ブラウザ内でZK証明を生成（WASM）
      ↓
5. WebAuthnで電子署名
      ↓
6. 証明データをPDFに埋め込み
      ↓
7. 証明付きPDFをダウンロード
```

## 多言語対応

Proverは日本語と英語に対応しています。

- `src/i18n/ja.json` - 日本語
- `src/i18n/en.json` - 英語

右上の言語切り替えボタンで変更できます。

## 公開アセット

`public/` ディレクトリには以下のファイルが含まれます：

| ファイル | 説明 |
|---------|------|
| `commitment.wasm` | ZK回路のWASMバイナリ |
| `commitment_final.zkey` | 証明生成用ZKey |
| `vkey.json` | 検証鍵（年度別にも対応） |

## 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `NEXT_PUBLIC_BASE_PATH` | ベースパス | `/` |
| `BASE_PATH` | 静的エクスポート用 | `/` |

## トラブルシューティング

### 証明生成が遅い

- 初回はWASMファイルのダウンロードと初期化に時間がかかります
- 2回目以降はキャッシュにより高速化されます
- 推奨: 安定したネットワーク環境で使用

### WebAuthn署名が失敗する

- ブラウザがWebAuthnをサポートしているか確認
- HTTPS環境（またはlocalhost）でのみ動作
- 生体認証やセキュリティキーが利用可能か確認
