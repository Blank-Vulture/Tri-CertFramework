# 論文ビルド

論文をthesis-sourceからビルドし、新しいリビジョンを作成する。

## 実行内容

1. `docs/scripts/thesis.py build` を実行
2. ビルド結果を確認
3. 問題があれば報告

## ビルドプロセス

thesis.py buildは以下を自動実行：

- thesis-source/ 内のMarkdownファイルを収集
- 章・節の順序でソート
- 目次を自動生成
- Mermaid記法を変換
- 画像パスを正しい相対パスに変換
- thesis-vX-Y.md として出力
- astro.config.mjs と index.md を更新

## 出力

```
ビルド結果:
- バージョン: vX.Y
- ファイル: docs/src/content/docs/research/thesis-vX-Y.md
- サイズ: XX KB
- 章数: X
- 節数: X
- 図の数: X
- 警告: [あれば表示]
```

## 注意

- ビルドするとマイナーバージョンが自動インクリメントされる
- スクリーンショットが見つからない場合は警告が表示される
- プレビューは `cd docs && npm run dev` で確認
