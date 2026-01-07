論文に必要な画面キャプチャのリスト

## 保存先
`src/screenshot`

## 必須スクリーンショット一覧

### Prover（証明生成UI）
保存先: `src/screenshot/prover`
- [x] 初期画面（PDF未選択状態）
- [x] Salt入力画面
- [x] 証明生成中の画面
- [x] 完了画面（ダウンロードボタン表示）
- [x] WebAuthn認証ダイアログ

|内容|ファイル名|
|:-:|:-:|
|初期画面（PDF未選択状態）|default.png|
|Salt入力画面|input_before.png|
|証明生成中の画面|input_after.png|
|完了画面（ダウンロードボタン表示）|output.png|
|WebAuthn認証ダイアログ|webauthn_dialog.png|

### Verifier UI（検証UI）
保存先: `src/screenshot/verifier`
- [x] 初期画面
- [x] 検証中の5ステップ表示
- [x] 検証成功時の結果画面
- [x] 検証失敗時の画面

|内容|ファイル名|
|:-:|:-:|
|初期画面|default.png|
|検証中の5ステップ表示|verified_1.png|
|検証成功時の結果画面|verified_1.png|
|検証成功時の結果画面|verified_2.png|
|検証失敗時の画面|failure_verified_1.png|
|検証失敗時の画面|failure_verified_2.png|
|出力結果と説明|explain_output.png|

### Registrar Console
保存先: `src/screenshot/registrar-console`
- [x] メイン画面
- [x] 学生登録フォーム
- [x] 登録完了・Salt表示画面
- [x] CSV一括登録画面

|内容|ファイル名|
|:-:|:-:|
|メイン画面|default.png|
|学生登録フォーム|default.png|
|登録完了・Salt表示画面|registar.png|
|CSV一括登録画面|csv_registar.png|
|登録した学生の削除|delete.png|

### Executive Console
保存先: `src/screenshot/executive-console`
- [x] VK生成画面
- [x] Ledger署名画面
- [x] バンドル出力完了画面

|内容|ファイル名|
|:-:|:-:|
|メイン画面|default.png|
|VK生成画面|vk_generator.png|
|バンドル出力完了画面|vk_generated.png|
|Ledger署名画面|`/hw-wallet/*.png`, `/signing_logs/*.png, *.txt`|

## 出力
/docs/thesis-source/SCREENSHOT_CHECKLIST.md として保存
