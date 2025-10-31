# ビルド検証ガイド（PDCAサイクル）

最終更新: 2025-01-XX

## 概要

GitHub Actionsでのビルドエラーを防ぐため、ローカルでビルドを検証してからプッシュすることを推奨します。

## PDCAサイクルの実践

### Plan（計画）
- 変更を加える前に、どのファイルが影響を受けるか確認
- ビルドエラーが発生しそうな箇所を特定（TypeScriptエラー、ESLintエラーなど）

### Do（実行）
- コードを修正
- ローカルでビルド検証を実行

### Check（確認）
- ビルドが成功することを確認
- エラーがあれば修正

### Action（改善）
- 問題がなければプッシュ
- 問題があれば再度Planから開始

## ローカルビルド検証方法

### 方法1: 検証スクリプトを使用（推奨）

```bash
# ルートディレクトリから実行
./scripts/verify-build.sh
```

このスクリプトは以下を実行します：
- Proverの依存関係インストール
- Proverのビルド検証
- Verifier UIの依存関係インストール
- Verifier UIのビルド検証

### 方法2: 個別にビルド

#### Proverの検証

```bash
cd prover
npm ci
npm run build:export
```

#### Verifier UIの検証

```bash
cd verifier-ui
npm ci
npm run build:export
```

## よくあるエラーと対処法

### TypeScriptエラー

#### `@ts-expect-error` が未使用
- **原因**: 実際には型エラーがないため、ディレクティブが不要
- **対処**: `@ts-expect-error`コメントを削除

```typescript
// ❌ 悪い例
// @ts-expect-error - コメント
const value = process.env.NEXT_PUBLIC_BASE_PATH;

// ✅ 良い例
const value = process.env.NEXT_PUBLIC_BASE_PATH;
```

### ESLintエラー

#### React Hook依存配列の警告
- **原因**: `useEffect`の依存配列が不完全
- **対処**: 意図的に依存を除外する場合は`eslint-disable-next-line`を使用

```typescript
// ✅ 良い例
useEffect(() => {
  // 初期化処理（一度だけ実行したい）
  if (preferred !== lang) setLangState(preferred);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Only run once on mount
```

### ビルド時の環境変数

GitHub Actionsでは環境変数が自動的に設定されますが、ローカルでは`package.json`のスクリプトで設定されます：

```json
"build:export": "NEXT_EXPORT=true BASE_PATH=/Tri-CertFramework/prover ASSET_PREFIX=/Tri-CertFramework/prover NEXT_PUBLIC_BASE_PATH=/Tri-CertFramework/prover next build"
```

## コミット前チェックリスト

- [ ] ローカルで`./scripts/verify-build.sh`を実行
- [ ] Proverのビルドが成功
- [ ] Verifier UIのビルドが成功
- [ ] TypeScriptエラーがない
- [ ] ESLintエラーがない

## トラブルシューティング

### `node_modules`が古い場合

```bash
cd prover
rm -rf node_modules package-lock.json
npm ci
```

### キャッシュの問題

```bash
# Next.jsのキャッシュをクリア
rm -rf prover/.next verifier-ui/.next
```

## 参考

- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [ESLint Rules](https://nextjs.org/docs/app/api-reference/config/eslint)

