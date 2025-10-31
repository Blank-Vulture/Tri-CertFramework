# GitHub Pages デプロイ実装まとめ

最終更新: 2025-01-XX

## 実装内容

### 1. 設計ドキュメント

- **`docs/DEPLOYMENT_DESIGN.md`**: デプロイアーキテクチャの設計仕様
- **`docs/DEPLOYMENT_GUIDE.md`**: デプロイ手順ガイド

### 2. Next.js 設定の更新

#### `prover/next.config.ts` / `verifier-ui/next.config.ts`

静的エクスポート対応を追加:

- 環境変数 `NEXT_EXPORT=true` で静的エクスポートを有効化
- `BASE_PATH` 環境変数で GitHub Pages のサブパスに対応
- `ASSET_PREFIX` 環境変数でアセットパスを設定
- `images.unoptimized: true` で画像最適化を無効化（静的エクスポート必須）

#### `prover/package.json` / `verifier-ui/package.json`

`build:export` スクリプトを追加:

```json
"build:export": "NEXT_EXPORT=true BASE_PATH=/Tri-CertFramework/prover ASSET_PREFIX=/Tri-CertFramework/prover next build"
```

### 3. GitHub Actions ワークフロー

#### `.github/workflows/deploy-pages.yml`

**主要機能:**

- **トリガー**: `main` ブランチへの push、手動実行、PR マージ時
- **権限**: GitHub Pages への書き込み権限
- **ビルドジョブ**:
  - Node.js 20 セットアップ（キャッシュ有効化）
  - 両アプリの依存関係インストール
  - 静的エクスポートビルド
  - 統合ディレクトリ作成
  - GitHub Pages アーティファクトアップロード
- **デプロイジョブ**:
  - GitHub Pages へのデプロイ

**使用しているアクション（2025年最新版）:**

- `actions/checkout@v4`
- `actions/setup-node@v4`
- `actions/upload-pages-artifact@v3`
- `actions/deploy-pages@v4`

## デプロイ URL

デプロイ完了後、以下の URL でアクセス可能:

- **Prover**: `https://blank-vulture.github.io/Tri-CertFramework/prover/`
- **Verifier UI**: `https://blank-vulture.github.io/Tri-CertFramework/verifier-ui/`
- **トップページ**: `https://blank-vulture.github.io/Tri-CertFramework/`

## ファイル構成

```
.github/
└── workflows/
    └── deploy-pages.yml          # デプロイワークフロー

docs/
├── DEPLOYMENT_DESIGN.md          # 設計ドキュメント
├── DEPLOYMENT_GUIDE.md           # デプロイガイド
└── DEPLOYMENT_SUMMARY.md         # このファイル

prover/
├── next.config.ts                # 静的エクスポート設定追加
└── package.json                  # build:export スクリプト追加

verifier-ui/
├── next.config.ts                # 静的エクスポート設定追加
└── package.json                  # build:export スクリプト追加
```

## 次のステップ

### 1. 初回セットアップ

1. GitHub リポジトリの Settings > Pages で Source を "GitHub Actions" に設定
2. `main` ブランチに変更を push

### 2. 動作確認

- ワークフローが正常に実行されることを確認
- デプロイ URL にアクセスして動作確認

### 3. カスタマイズ（必要に応じて）

- デプロイトリガーの変更
- basePath の変更
- 追加のビルドステップの追加

## 注意事項

1. **静的サイトのみ**: GitHub Pages は静的サイトのみサポート。サーバーサイド機能は使用不可
2. **basePath の一貫性**: 開発環境と本番環境で basePath が異なるため、ローカルテスト時は注意
3. **キャッシュ**: デプロイ後の反映には数分かかる場合があります
4. **セキュリティ**: 機密情報をクライアントサイドコードに含めない

## 参考資料

- [設計ドキュメント](./DEPLOYMENT_DESIGN.md)
- [デプロイガイド](./DEPLOYMENT_GUIDE.md)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [GitHub Actions for GitHub Pages](https://docs.github.com/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow)

