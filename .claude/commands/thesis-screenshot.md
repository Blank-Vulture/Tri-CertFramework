# スクリーンショット挿入支援

指定されたセクションに適切なスクリーンショットを挿入する提案を行う。

## 対象セクション
$ARGUMENTS （例: 3.4 Prover、第3章全体）

## 利用可能なスクリーンショット

### Prover（証明生成UI）
保存先: `docs/src/assets/screenshot/prover/`

| ファイル名 | 内容 |
|-----------|------|
| default.png | 初期画面（PDF未選択状態） |
| input_before.png | Salt入力画面 |
| input_after.png | 証明生成中の画面 |
| output.png | 完了画面（ダウンロードボタン表示） |
| webauthn_dialog.png | WebAuthn認証ダイアログ |

### Verifier UI（検証UI）
保存先: `docs/src/assets/screenshot/verifier/`

| ファイル名 | 内容 |
|-----------|------|
| default.png | 初期画面 |
| verified_1.png | 検証中の5ステップ表示 |
| verified_2.png | 検証成功時の結果画面 |
| failure_verified_1.png | 検証失敗時の画面（1） |
| failure_verified_2.png | 検証失敗時の画面（2） |
| explain_output.png | 出力結果と説明 |

### Registrar Console
保存先: `docs/src/assets/screenshot/registrar-console/`

| ファイル名 | 内容 |
|-----------|------|
| default.png | メイン画面 |
| registar.png | 登録完了・Salt表示画面 |
| csv_registar.png | CSV一括登録画面 |
| delete.png | 登録した学生の削除 |

### Executive Console
保存先: `docs/src/assets/screenshot/executive-console/`

| ファイル名 | 内容 |
|-----------|------|
| default.png | メイン画面 |
| vk_generator.png | VK生成画面 |
| vk_generated.png | バンドル出力完了画面 |
| settings.png | 設定画面 |
| vk_admin.png | VK管理画面 |
| hw-wallet/*.png | Ledger署名関連 |
| signing_logs/*.png | 署名ログ |

## 論文ソースでの記述形式

```markdown
![キャプション](prover/default.png)

**図3.X: キャプション**
```

ビルド時に自動的に正しいパスに変換される。

## 出力形式

```markdown
## [セクション名] へのスクリーンショット挿入提案

### 推奨挿入箇所

1. [段落の説明] の後に:
   ![キャプション](component/filename.png)
   **図X.Y: キャプション**

2. ...

### 挿入後の本文案
[修正後のMarkdown]
```
