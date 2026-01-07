# Claude Code 論文執筆活用ガイド

このガイドでは、Claude Codeを最大限活用して高品質な修士論文を執筆するための具体的な手順を説明する。

## 目次

1. [環境の確認](#1-環境の確認)
2. [論文ビルドシステム](#2-論文ビルドシステム)
3. [基本的なワークフロー](#3-基本的なワークフロー)
4. [スラッシュコマンドの活用](#4-スラッシュコマンドの活用)
5. [スクリーンショットの挿入](#5-スクリーンショットの挿入)
6. [章別執筆戦略](#6-章別執筆戦略)
7. [効果的なプロンプトパターン](#7-効果的なプロンプトパターン)
8. [品質管理](#8-品質管理)
9. [最終チェック](#9-最終チェック)

---

## 1. 環境の確認

### 必須ファイルの確認

```
/Users/pality/portfolio/Tri-CertFramework/
├── CLAUDE.md                    # プロジェクトコンテキスト（重要）
├── 修士論文構成例.pdf            # 論文フォーマット要件
├── .claude/commands/            # カスタムスラッシュコマンド
│
└── docs/
    ├── thesis-source/           # 論文ソース（★編集対象）
    │   ├── _frontmatter.md
    │   ├── 第1章 序論/
    │   ├── 第2章 先行研究と技術基盤/
    │   ├── 第3章 システム設計と実装/
    │   ├── 第4章 検証/
    │   ├── 第5章 考察/
    │   ├── 第6章 結論と今後の課題/
    │   └── SCREENSHOT_CHECKLIST.md
    │
    ├── src/assets/screenshot/   # スクリーンショット格納
    │
    └── scripts/
        ├── thesis.py            # ビルドスクリプト
        └── thesis.config        # 設定ファイル
```

### Claude Codeの起動

```bash
cd /Users/pality/portfolio/Tri-CertFramework
claude
```

CLAUDE.mdがルートにあるため、Claude Codeは自動的にプロジェクトのコンテキストを理解する。

---

## 2. 論文ビルドシステム

### ビルドコマンド

```bash
cd docs/scripts

# 論文をビルド（マイナーバージョン自動インクリメント）
python thesis.py build

# ソースディレクトリの構造を表示
python thesis.py tree

# 全リビジョンを一覧表示
python thesis.py list

# 特定バージョンの詳細表示（章数、図数など）
python thesis.py show 1.3

# プレビュー起動
cd ../.. && npm run dev
```

### ビルドの流れ

1. `thesis-source/` 内のMarkdownファイルを収集
2. 章・節の順序でソート
3. 目次を自動生成
4. Mermaid記法を `<pre class="mermaid">` に変換
5. **画像パスを正しい相対パスに自動変換**
6. `src/content/docs/research/thesis-vX-Y.md` に出力
7. astro.config.mjs と index.md を自動更新

### 編集→ビルド→確認のサイクル

```
1. thesis-source/ 内のファイルを編集
2. python thesis.py build でビルド
3. npm run dev でプレビュー確認
4. 問題なければコミット
```

---

## 3. 基本的なワークフロー

### Phase 1: 構造化と計画

```
あなた: 論文の現在の状態を確認して、各章の完成度を評価してください

Claude: [全章を読み込んで評価]
```

### Phase 2: 章ごとの執筆

1. **下書き作成**: 実装コードを参照しながら内容を生成
2. **スクリーンショット挿入**: 適切な画面キャプチャを追加
3. **レビュー**: スラッシュコマンドで品質チェック
4. **推敲**: 学術的表現への変換
5. **ビルド**: `python thesis.py build`

### Phase 3: 全体調整

1. 一貫性チェック
2. 参考文献の整理
3. 内容梗概の生成
4. 最終チェックリスト

---

## 4. スラッシュコマンドの活用

### 使用可能なコマンド一覧

| コマンド | 用途 | 使用例 |
|---------|------|--------|
| `/thesis-review` | 章のレビュー | `/thesis-review 第3章` |
| `/thesis-expand` | セクションの拡充 | `/thesis-expand 3.2.1 アーキテクチャ` |
| `/thesis-consistency` | 一貫性チェック | `/thesis-consistency` |
| `/thesis-abstract` | 内容梗概生成 | `/thesis-abstract` |
| `/thesis-references` | 参考文献管理 | `/thesis-references ZKP` |
| `/thesis-impl-to-doc` | 実装→論文変換 | `/thesis-impl-to-doc prover/src` |
| `/thesis-chapter` | 章別支援 | `/thesis-chapter 1` |
| `/thesis-figure` | 図表作成 | `/thesis-figure システム構成図` |
| `/thesis-polish` | 文章推敲 | `/thesis-polish [テキスト]` |
| `/thesis-checklist` | 提出前チェック | `/thesis-checklist` |
| `/thesis-build` | 論文をビルド | `/thesis-build` |
| `/thesis-screenshot` | スクリーンショット挿入支援 | `/thesis-screenshot 3.4 Prover` |

---

## 5. スクリーンショットの挿入

### 利用可能なスクリーンショット

詳細は `SCREENSHOT_CHECKLIST.md` を参照。

#### Prover（証明生成UI）
```
prover/default.png        - 初期画面
prover/input_before.png   - Salt入力画面
prover/input_after.png    - 証明生成中
prover/output.png         - 完了画面
prover/webauthn_dialog.png - WebAuthn認証
```

#### Verifier UI（検証UI）
```
verifier/default.png          - 初期画面
verifier/verified_1.png       - 検証中の5ステップ
verifier/verified_2.png       - 検証成功
verifier/failure_verified_1.png - 検証失敗
verifier/explain_output.png   - 出力結果説明
```

#### Registrar Console
```
registrar-console/default.png     - メイン画面
registrar-console/registar.png    - 登録完了・Salt表示
registrar-console/csv_registar.png - CSV一括登録
registrar-console/delete.png      - 削除画面
```

#### Executive Console
```
executive-console/default.png       - メイン画面
executive-console/vk_generator.png  - VK生成画面
executive-console/vk_generated.png  - 出力完了
executive-console/settings.png      - 設定画面
```

### 論文ソースでの記述方法

```markdown
証明生成UIの初期画面を図3.4に示す。

![Prover初期画面](prover/default.png)

**図3.4: Proverの初期画面**

ユーザーはこの画面からPDFファイルをドラッグ&ドロップで...
```

**ポイント**:
- `prover/default.png` のように、コンポーネント名/ファイル名で指定
- ビルド時に自動的に正しいパス `../../../assets/screenshot/prover/default.png` に変換される
- 図のキャプションは `**図X.Y: 説明**` 形式で画像の下に記述

---

## 6. 章別執筆戦略

### 第1章 序論

```
あなた: 第1章の序論を読んで、「Point of View」が明確になっているか確認してください。
```

### 第2章 先行研究

```
あなた: /thesis-references ZKP

あなた: 第2章で引用すべき重要な先行研究を特定してください。
```

### 第3章 設計・実装（スクリーンショット重要）

```
あなた: /thesis-screenshot 3.4 Prover

あなた: /thesis-impl-to-doc prover/src/app

あなた: Proverコンポーネントの実装を読み込んで、論文の3.4節に
       スクリーンショットと共に記載すべき内容を生成してください。
```

### 第4章 検証

```
あなた: 検証結果を示すための表とグラフを生成してください。
       スクリーンショット（検証成功・失敗画面）も活用して
       検証プロセスを視覚的に説明してください。
```

### 第5章 考察

```
あなた: 第4章の検証結果を踏まえて、本システムの長所と短所を
       客観的に分析してください。
```

### 第6章 結論

```
あなた: 第1章の目的と第4章の検証結果を照らし合わせて、
       結論を書いてください。
```

---

## 7. 効果的なプロンプトパターン

### パターン1: 実装からの文書生成

```
あなた: circuits/commitment.circom を読んで、
       論文向けに説明してください。
       数式は LaTeX 形式で出力してください。
```

### パターン2: スクリーンショット付き説明生成

```
あなた: 3.5節のVerifier UIについて、以下のスクリーンショットを
       使って検証フローを説明する文章を生成してください：
       - verifier/default.png（初期状態）
       - verifier/verified_1.png（検証中）
       - verifier/verified_2.png（検証完了）
```

### パターン3: 副査ロールプレイ

```
あなた: あなたは修士論文の副査教員です。
       第3章を読んで、口頭試問で聞きそうな質問を5つ挙げてください。
```

### パターン4: 比較表の生成

```
あなた: 以下の項目について、本研究と既存手法の比較表を作成してください：
       - プライバシー保護
       - 検証速度
       - 運用コスト
```

---

## 8. 品質管理

### 日次チェック

```
あなた: 今日編集したファイルの「である調」統一と誤字脱字をチェックしてください。
```

### 章完成時チェック

```
あなた: /thesis-review [章名]
あなた: /thesis-chapter [章番号]
```

### ビルド後チェック

```bash
python thesis.py show 1.4  # 章数、図数、サイズを確認
```

---

## 9. 最終チェック

### 提出1週間前

```
あなた: /thesis-checklist
あなた: 修士論文構成例.pdfの要件と照らし合わせて、不足要素をリストアップしてください。
```

### 提出3日前

```
あなた: /thesis-abstract
あなた: 全体を通読して、序論と結論の対応関係を確認してください。
```

### 提出前日

```
あなた: 参考文献の形式が統一されているか確認してください。
あなた: 図表の番号と本文の参照が一致しているか確認してください。

# 最終ビルド
cd docs/scripts && python thesis.py build
python thesis.py show [最新バージョン]
```

---

## 注意事項

1. **著作権**: AI生成文は必ず自分で確認・修正すること
2. **オリジナリティ**: AIの出力をそのまま使わず、自分の言葉で書き直す
3. **事実確認**: 技術的な記述は実装と照合して正確性を担保する
4. **スクリーンショット**: 存在しない画像を参照するとビルド時に警告が出る
5. **バージョン管理**: ビルドごとにマイナーバージョンがインクリメントされる

---

*このガイドは Tri-Cert Framework 修士論文プロジェクト用に作成されました。*
