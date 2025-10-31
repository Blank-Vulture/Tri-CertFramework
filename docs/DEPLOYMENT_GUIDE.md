# GitHub Pages デプロイガイド

最終更新: 2025-01-XX

## 概要

このガイドでは、`prover` と `verifier-ui` を GitHub Pages にデプロイする手順を説明します。

## 前提条件

- GitHub リポジトリ: `Blank-Vulture/Tri-CertFramework`
- GitHub Actions が有効になっていること
- `main` ブランチへの push 権限があること

## 初回セットアップ

### 1. GitHub Pages の有効化

1. リポジトリの **Settings** に移動
2. 左サイドバーから **Pages** を選択
3. **Source** セクションで以下を設定:
   - **Source**: `GitHub Actions` を選択
4. **Save** をクリック

### 2. ワークフローの確認

`.github/workflows/deploy-pages.yml` が正しく配置されていることを確認してください。

### 3. 初回デプロイの実行

`main` ブランチに変更を push すると、自動的にデプロイが開始されます:

```bash
git add .
git commit -m "feat: add GitHub Pages deployment workflow"
git push origin main
```

または、GitHub の Web UI から手動実行:

1. **Actions** タブに移動
2. **Deploy to GitHub Pages** ワークフローを選択
3. **Run workflow** をクリック

## デプロイの確認

### デプロイ状態の確認

1. **Actions** タブでワークフローの実行状況を確認
2. デプロイが完了すると、以下の URL でアクセス可能:
   - **Prover**: `https://blank-vulture.github.io/Tri-CertFramework/prover/`
   - **Verifier UI**: `https://blank-vulture.github.io/Tri-CertFramework/verifier-ui/`
   - **トップページ**: `https://blank-vulture.github.io/Tri-CertFramework/`

### デプロイ完了の目安

- ワークフローの実行時間: 約 3-5 分
- デプロイ反映時間: デプロイ完了後、数分で反映

## ローカルでのビルドテスト

デプロイ前にローカルで静的エクスポートをテストできます:

### Prover のビルドテスト

```bash
cd prover
npm install
npm run build:export
```

ビルド出力は `prover/out/` ディレクトリに生成されます。

### Verifier UI のビルドテスト

```bash
cd verifier-ui
npm install
npm run build:export
```

ビルド出力は `verifier-ui/out/` ディレクトリに生成されます。

### ローカルサーバーでの確認

静的ファイルをローカルサーバーで確認する場合:

```bash
# Python を使用する場合
cd prover/out  # または verifier-ui/out
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` にアクセス（basePath を考慮した場合は、適切なパス構造で確認）。

## トラブルシューティング

### デプロイが失敗する

1. **ワークフローのログを確認**
   - Actions タブで失敗したジョブを開き、エラーメッセージを確認

2. **よくある問題と解決策**

   | 問題 | 原因 | 解決策 |
   |------|------|--------|
   | `basePath` エラー | 環境変数の設定ミス | `package.json` の `build:export` スクリプトを確認 |
   | アセット読み込み失敗 | `assetPrefix` の設定ミス | `next.config.ts` の設定を確認 |
   | Node.js バージョン不一致 | Node.js 20 が使用されていない | ワークフローの `node-version` を確認 |
   | 依存関係のインストール失敗 | `package-lock.json` の不整合 | `npm ci` が正しく実行されているか確認 |

### 404 エラーが表示される

- `basePath` の設定が正しいか確認
- GitHub Pages の URL 構造と一致しているか確認
- ブラウザのキャッシュをクリアして再試行

### キャッシュの問題

GitHub Pages のデプロイ後、変更が反映されない場合:

1. ブラウザのキャッシュをクリア（Ctrl+Shift+R または Cmd+Shift+R）
2. 数分待ってから再アクセス
3. 別のブラウザで確認

## ワークフローのカスタマイズ

### デプロイトリガーの変更

`deploy-pages.yml` の `on` セクションを編集:

```yaml
on:
  push:
    branches:
      - main
      - develop  # 追加のブランチ
```

### デプロイパスの変更

`basePath` を変更する場合:

1. `prover/package.json` と `verifier-ui/package.json` の `build:export` スクリプトを編集
2. `next.config.ts` の `BASE_PATH` 環境変数を更新

## セキュリティ注意事項

- GitHub Pages は公開サイトです。機密情報を含まないようにしてください
- 静的ファイルのみがデプロイされます。サーバーサイドの処理は実行されません
- API Keys や認証情報をクライアントサイドコードに含めないでください

## 参考資料

- [設計ドキュメント](./DEPLOYMENT_DESIGN.md)
- [Next.js Static HTML Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [GitHub Pages Documentation](https://docs.github.com/pages)

