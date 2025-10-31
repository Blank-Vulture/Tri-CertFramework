# GitHub Pages デプロイ設計書

**Version**: 1.0.0  
**最終更新**: 2025-01-XX  
**リポジトリ**: `https://github.com/Blank-Vulture/Tri-CertFramework`

---

## 1. 概要

本設計書は、`prover` と `verifier-ui` の2つの Next.js アプリケーションを GitHub Pages にデプロイするための設計と実装方針を定義します。

### 1.1 デプロイ対象

| アプリケーション | 技術スタック | デプロイパス | 用途 |
|----------------|------------|------------|------|
| **prover** | Next.js 15.5.0 | `/prover/` | 証明者インターフェース（ZKP生成） |
| **verifier-ui** | Next.js 15.5.0 | `/verifier/` | 検証者インターフェース（三層認証検証） |

### 1.2 デプロイ先URL構造

```
https://blank-vulture.github.io/Tri-CertFramework/
├── /prover/          # 証明者アプリ
└── /verifier/        # 検証者アプリ
```

---

## 2. アーキテクチャ設計

### 2.1 デプロイフロー

```
┌─────────────────────────────────────────────────────────┐
│ GitHub Repository (main branch)                          │
└─────────────────┬───────────────────────────────────────┘
                  │ Push/Manual Trigger
                  ▼
┌─────────────────────────────────────────────────────────┐
│ GitHub Actions Workflow                                  │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │ Build Prover │    │ Build        │                  │
│  │              │    │ Verifier-UI  │                  │
│  └──────┬───────┘    └──────┬───────┘                  │
│         │                   │                           │
│         └─────────┬─────────┘                           │
│                   ▼                                      │
│         ┌──────────────────┐                            │
│         │ Merge Artifacts  │                            │
│         │ (prover/ +       │                            │
│         │  verifier/)      │                            │
│         └────────┬─────────┘                           │
│                  │                                       │
│                  ▼                                       │
│         ┌──────────────────┐                            │
│         │ Deploy to        │                            │
│         │ GitHub Pages     │                            │
│         └──────────────────┘                            │
└─────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ GitHub Pages (gh-pages branch or /docs)                 │
│                                                          │
│  https://blank-vulture.github.io/Tri-CertFramework/     │
│  ├── prover/                                             │
│  └── verifier/                                           │
└─────────────────────────────────────────────────────────┘
```

### 2.2 技術的制約と対応

#### 2.2.1 Next.js 静的エクスポート

**制約**:
- GitHub Pages は静的ファイルホスティングのみ対応
- サーバーサイド機能（API Routes、ISR等）は使用不可

**対応**:
- `next.config.ts` に `output: 'export'` を設定
- 全ページを静的HTMLにエクスポート
- `basePath` を設定してサブディレクトリ配信に対応

#### 2.2.2 アセットパス問題

**制約**:
- GitHub Pages のサブディレクトリ配信では、絶対パスが相対パスに変換される必要がある

**対応**:
- `basePath` を `/prover` または `/verifier` に設定
- `assetPrefix` を同じ値に設定（必要な場合）
- 内部リンクは `next/link` を使用して自動解決

#### 2.2.3 環境変数

**制約**:
- ビルド時の環境変数のみ利用可能（ランタイム環境変数は不可）

**対応**:
- ビルド時に必要な環境変数を GitHub Actions Secrets から取得
- `NEXT_PUBLIC_*` プレフィックスを付与してクライアントサイドで利用可能に

---

## 3. 実装設計

### 3.1 Next.js 設定ファイル更新

#### 3.1.1 prover/next.config.ts

```typescript
const nextConfig: NextConfig = {
  output: 'export',           // 静的エクスポート有効化
  basePath: '/Tri-CertFramework/prover',  // GitHub Pages パス
  assetPrefix: '/Tri-CertFramework/prover', // アセットパス
  images: {
    unoptimized: true,         // 画像最適化無効化（静的エクスポート必須）
  },
  // ... 既存の設定
};
```

#### 3.1.2 verifier-ui/next.config.ts

```typescript
const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/Tri-CertFramework/verifier',
  assetPrefix: '/Tri-CertFramework/verifier',
  images: {
    unoptimized: true,
  },
  // ... 既存の設定
};
```

### 3.2 GitHub Actions ワークフロー

#### 3.2.1 ワークフローファイル構成

**ファイル**: `.github/workflows/deploy-pages.yml`

**主要ステップ**:
1. **Checkout**: リポジトリをチェックアウト
2. **Setup Node.js**: Node.js 環境セットアップ（キャッシュ有効化）
3. **Install Dependencies**: 依存関係インストール（キャッシュ有効化）
4. **Build Prover**: `prover` アプリをビルド
5. **Build Verifier-UI**: `verifier-ui` アプリをビルド
6. **Merge Artifacts**: 2つのアプリを1つのディレクトリにマージ
7. **Deploy to GitHub Pages**: 静的ファイルをデプロイ

#### 3.2.2 ビルド成果物構造

```
gh-pages-root/
├── index.html              # リダイレクトまたはランディングページ（オプション）
├── prover/
│   ├── index.html
│   ├── _next/
│   └── ...
└── verifier/
    ├── index.html
    ├── _next/
    └── ...
```

### 3.3 package.json スクリプト追加

各アプリの `package.json` に以下を追加:

```json
{
  "scripts": {
    "build:pages": "next build",
    "export:static": "next build"
  }
}
```

---

## 4. セキュリティ考慮事項

### 4.1 公開リポジトリでの機密情報

- **禁止**: API キー、秘密鍵、パスワードのハードコード
- **許可**: 公開可能な設定のみ（検証鍵ハッシュ、公開設定等）

### 4.2 ビルド時検証

- ESLint チェックをワークフローに組み込み
- TypeScript 型チェックを実行
- ビルドエラー時のデプロイ中止

---

## 5. パフォーマンス最適化

### 5.1 ビルド時間短縮

- **依存関係キャッシュ**: `node_modules` を GitHub Actions キャッシュに保存
- **インクリメンタルビルド**: Next.js のキャッシュ機能を活用
- **並列ビルド**: `prover` と `verifier-ui` を並列実行

### 5.2 配信最適化

- 静的アセットの CDN キャッシュヘッダー設定
- 画像の最適化（ビルド時）

---

## 6. デプロイフロー詳細

### 6.1 トリガー条件

```yaml
on:
  push:
    branches:
      - main
  workflow_dispatch:  # 手動実行も可能
```

### 6.2 環境設定

- **Node.js バージョン**: 20.x (LTS)
- **実行環境**: `ubuntu-latest`
- **権限**: `pages: write`, `id-token: write`

### 6.3 エラーハンドリング

- ビルド失敗時の通知
- デプロイ失敗時のロールバック（前回の成果物を保持）
- ステータスバッジ表示

---

## 7. テスト戦略

### 7.1 デプロイ前検証

- **Lint**: ESLint による静的解析
- **Type Check**: TypeScript コンパイラによる型チェック
- **Build Test**: ローカルビルド成功確認

### 7.2 デプロイ後検証

- 各アプリのアクセス可能性確認
- アセット読み込み確認
- 基本機能動作確認（手動）

---

## 8. ロールバック手順

### 8.1 緊急時の対応

1. GitHub Actions の実行をキャンセル
2. 前回の正常なデプロイのコミットを特定
3. `gh-pages` ブランチを前回のコミットにリセット
4. 問題修正後に再デプロイ

---

## 9. 参考資料

- [Next.js Static Export Documentation](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [GitHub Pages with GitHub Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow)
- [GitHub Actions: Deploy to GitHub Pages](https://github.com/actions/deploy-pages)

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|---------|--------|
| 1.0.0 | 2025-01-XX | 初版作成 | - |

