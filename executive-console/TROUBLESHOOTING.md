# Executive Console トラブルシューティング

## VK生成時の問題

### 問題1: VKNFTディレクトリが作成されない

**症状**
- VK生成ボタンを押しても年度のサブディレクトリが作成されない
- VK管理画面に何も表示されない

**確認事項**
1. ブラウザの開発者ツール（DevTools）のConsoleを確認
2. `[VKNFT]` で始まるログを探す
3. エラーメッセージがあれば記録

**考えられる原因と対処法**

#### 原因A: ディレクトリ選択がキャンセルされた
```
Error: VKNFTディレクトリが選択されませんでした
```
**対処**: VK生成を再試行し、ディレクトリ選択ダイアログで適切なフォルダを選択

#### 原因B: Tauri FSプラグインの権限不足
```
[VKNFT] Error: Permission denied
```
**対処**: `src-tauri/capabilities/default.json`を確認し、以下が含まれているか確認:
```json
{
  "permissions": [
    "fs:allow-mkdir",
    "fs:allow-write-file",
    "fs:allow-read-dir",
    "fs:allow-read-file",
    "fs:allow-exists"
  ]
}
```

#### 原因C: ディレクトリパスに問題がある
```
[VKNFT] Base directory: undefined
```
**対処**: localStorageをクリアして再試行
```javascript
// ブラウザのConsoleで実行
localStorage.removeItem('tricert.vknft.baseDir')
```

---

## 問題2: VK管理画面に表示されない

**症状**
- VKは生成されたが、VK管理画面に表示されない

**確認事項**
1. VKNFTディレクトリ内に年度フォルダが存在するか
2. `manifest.json` が存在するか
3. Consoleで `loadVkInfosFromVknft` のエラーを確認

**考えられる原因と対処法**

#### 原因A: manifest.jsonが不正
**対処**: manifest.jsonの内容を確認
```bash
cat VKNFT/2025/manifest.json
```
スキーマが `tri-cert/vknft-bundle@1` であることを確認

#### 原因B: ベースディレクトリのパスが変更された
**対処**: localStorageの値を確認
```javascript
// ブラウザのConsoleで実行
console.log(localStorage.getItem('tricert.vknft.baseDir'))
```

---

## 問題3: Ledger署名が動作しない

**症状**
- ZIPファイルは作成されるが、署名ファイル（.sig）が作成されない
- manifest.jsonに `ledgerSignature: null` と記録される

**確認事項**
1. Consoleで `[Ledger]` のログを確認
2. 署名エラーのメッセージを記録

**考えられる原因と対処法**

#### 原因A: WebAuthn非対応環境
```
Error: WebAuthn is not supported in this environment
```
**対処**: 
- Chromiumベースのブラウザを使用していることを確認
- Tauriの最新版を使用していることを確認

#### 原因B: セキュアコンテキスト問題
```
Error: WebAuthn requires a secure context
```
**対処**: 
- この問題は修正済みですが、もし発生する場合はTauriアプリを再起動

#### 原因C: Ledgerデバイスが接続されていない
```
Error: Ledger signing was cancelled
```
**対処**: 
- Fallbackのソフトウェア署名が自動的に使用されます
- ハードウェア署名を行いたい場合:
  1. Ledger Nano X をUSBで接続
  2. デバイスのロックを解除
  3. 署名リクエストを承認

#### 原因D: WebAuthn登録が必要
**対処**: 初回のみ、Ledgerの登録プロセスが実行されます
1. 「登録」ダイアログが表示される
2. Ledgerデバイスで承認
3. 登録後、自動的に署名が実行される

---

## デバッグ情報の収集

問題が解決しない場合、以下の情報を収集してください：

### 1. Console ログ
```
ブラウザのDevTools → Console → 右クリック → Save as...
```

### 2. localStorage の内容
```javascript
// ブラウザのConsoleで実行
console.log({
  baseDir: localStorage.getItem('tricert.vknft.baseDir'),
  ledgerCredential: localStorage.getItem('tricert.vknft.ledgerCredential'),
  theme: localStorage.getItem('theme'),
  lang: localStorage.getItem('lang')
})
```

### 3. VKNFT ディレクトリの構造
```bash
# macOS/Linux
tree VKNFT/

# または
ls -laR VKNFT/
```

### 4. Tauri のバージョン
```bash
cd executive-console
npm list @tauri-apps/cli @tauri-apps/api
```

---

## リセット手順

すべてをリセットして最初からやり直す場合：

```javascript
// 1. ブラウザのConsoleで実行
localStorage.clear()

// 2. VKNFTディレクトリを削除（バックアップ推奨）
// macOS/Linux
rm -rf /path/to/VKNFT

// 3. アプリを再起動
```

---

## よくある質問

### Q: 生成したVKファイルはどこに保存されますか？
A: `VKNFT/{年度}/files/` ディレクトリ内に保存されます。追加で、個別にダウンロードすることも可能です。

### Q: 署名なしでVKを使用できますか？
A: はい。署名はオプションです。署名がない場合、manifest.jsonに `ledgerSignature: null` が記録されます。

### Q: 複数の年度を同時に管理できますか？
A: はい。VKNFTディレクトリ内に年度ごとのサブディレクトリが作成されます。

### Q: VKNFTバンドルを他の端末に移動できますか？
A: はい。VKNFTディレクトリをコピーし、新しい端末で同じディレクトリを選択してください。

---

## サポート

問題が解決しない場合は、上記のデバッグ情報と共に報告してください。

