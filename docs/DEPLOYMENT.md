# GitHub Pages デプロイ手順

このドキュメントでは、`prover` と `verifier-ui` を GitHub Pages にデプロイする手順を説明します。

## 📋 前提条件

- GitHub リポジトリ: `https://github.com/Blank-Vulture/Tri-CertFramework`
- GitHub Pages が有効化されていること
- `main` ブランチへのプッシュ権限

## 🚀 初回セットアップ

### 1. GitHub Pages の設定

1. GitHub リポジトリの **Settings** タブを開く
2. 左側メニューから **Pages** を選択
3. **Build and deployment** セクションで:
   - **Source**: `GitHub Actions` を選択
   - これにより、カスタムワークフローによるデプロイが有効になります

### 2. デプロイの実行

`main` ブランチにプッシュすると、自動的にデプロイが開始されます:

```bash
git push origin main
```

または、GitHub Actions のワークフローページから手動実行も可能です。

## 📁 デプロイ後のURL構造

デプロイが完了すると、以下のURLでアクセス可能になります:

- **Prover**: `https://blank-vulture.github.io/Tri-CertFramework/prover/`
- **Verifier**: `https://blank-vulture.github.io/Tri-CertFramework/verifier/`
- **ルート**: `https://blank-vulture.github.io/Tri-CertFramework/` (リンクページ)

## 🔧 ローカルでのビルド確認

デプロイ前にローカルでビルドを確認する場合:

```bash
# Prover のビルド
cd prover
npm ci
NODE_ENV=production npm run build

# Verifier-UI のビルド
cd ../verifier-ui
npm ci
NODE_ENV=production npm run build
```

ビルド成果物は各ディレクトリの `out/` フォルダに生成されます。

## 🔍 デプロイ状態の確認

### GitHub Actions

1. リポジトリの **Actions** タブを開く
2. **Deploy to GitHub Pages** ワークフローの実行状況を確認
3. エラーが発生した場合は、ログを確認して問題を特定

### デプロイログの確認ポイント

- ✅ **Build Applications**: 両アプリのビルドが成功しているか
- ✅ **Merge build artifacts**: 成果物のマージが正常に完了しているか
- ✅ **Deploy to GitHub Pages**: デプロイが正常に完了しているか

## ⚠️ トラブルシューティング

### ビルドエラー

**症状**: GitHub Actions でビルドが失敗する

**対処**:
1. ローカルでビルドを実行してエラーを再現
2. TypeScript の型エラーや依存関係の問題を確認
3. `package-lock.json` が最新であることを確認

### パスエラー（404）

**症状**: デプロイ後、ページが表示されないまたはアセットが読み込めない

**対処**:
1. `next.config.ts` の `basePath` が正しく設定されているか確認
2. ブラウザの開発者ツールでネットワークタブを確認
3. GitHub Pages の設定で **Source** が **GitHub Actions** になっているか確認

### キャッシュの問題

**症状**: 変更が反映されない

**対処**:
1. ブラウザのキャッシュをクリア
2. GitHub Actions のキャッシュをクリア（ワークフローで再実行）
3. ハードリフレッシュ（`Cmd+Shift+R` / `Ctrl+Shift+R`）

## 📝 ワークフローのカスタマイズ

ワークフローの詳細は `.github/workflows/deploy-pages.yml` を参照してください。

主な設定項目:
- **Node.js バージョン**: 現在 `20` に設定
- **トリガー**: `main` ブランチへのプッシュ時
- **ビルド並列化**: `prover` と `verifier-ui` は順次実行（依存関係を考慮）

## 🔐 セキュリティ注意事項

- 機密情報（API キー、秘密鍵等）は GitHub Actions の **Secrets** を使用
- ビルド成果物には公開可能な情報のみを含める
- `.env` ファイルは `.gitignore` で無視されていることを確認

## 📚 関連ドキュメント

- [詳細設計書](./github-pages-deployment.md)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)

