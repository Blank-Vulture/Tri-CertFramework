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
- 設定画面の診断ツールで「❌ Failed to sign: APDU command failed: status=6d02」エラー

**確認事項**
1. Consoleで `[Ledger]` のログを確認
2. 署名エラーのメッセージを記録

**考えられる原因と対処法**

#### 原因A: **Ethereum アプリが起動していない（最も多い原因）**
```
Error: APDU command failed: status=6d02
Error: Ethereum App is not running on Ledger
```

**症状**: エラーコード `6d02` は「INS not supported」を意味し、Ledger側でEthereumアプリが起動していないことを示します。

**対処法（重要）**: 
1. **Ledgerデバイスを接続してロック解除**
   - USBケーブルでPCに接続
   - PINコードを入力してロック解除

2. **Ledger上で「Ethereum」アプリを開く**
   - デバイスのボタンで「Ethereum」を選択
   - 両方のボタンを押して起動
   - **画面に "Application is ready" と表示されることを確認**

3. **再度署名を試行**
   - Executive Consoleで署名操作をやり直す
   - または設定画面の診断ツールで「3. 署名テスト」を実行

**注意**: Bitcoin、Polkadot、その他のアプリが開いている場合もこのエラーが発生します。必ず **Ethereum アプリ** を開いてください。

#### 原因B: Ledgerデバイスが接続されていない
```
Error: Ledger device not found
Error: Device not connected
```
**対処**: 
1. Ledger Nano S/X/S Plus をUSBで接続
2. デバイスのロックを解除
3. 接続を確認: 設定画面の「1. デバイス検出」テストを実行

#### 原因C: ユーザーが署名を拒否
```
Error: User denied the request on Ledger
Error: Signature request was denied
```
**対処**: 
- Ledgerデバイスで署名リクエストが表示されたら、両方のボタンを押して承認してください
- 拒否した場合は、再度署名操作をやり直してください

#### 原因D: Ethereumアプリのバージョンが古い
**対処**: 
1. Ledger Live を開く
2. 「My Ledger」タブへ移動
3. Ethereum アプリを最新版にアップデート（推奨: v1.10.0以上）

#### 原因E: HID通信エラー（Invalid response from Ledger）
```
Error: Invalid response from Ledger
```

**症状**: Ledgerとの通信が途中で失敗する

**原因**: 
- USBケーブルの不具合
- USB HIDドライバの問題
- Ledgerファームウェアのバグ
- 他のアプリケーションとの競合

**対処法**:
1. **USBケーブルを交換**
   - 純正または高品質なUSBケーブルを使用
   - データ転送に対応したケーブルを使用（充電専用ケーブルは不可）

2. **USBポートを変更**
   - 別のUSBポートに接続を試す
   - USB 3.0ポートよりUSB 2.0ポートの方が安定する場合があります
   - USBハブを使わず、PCに直接接続

3. **Ledgerを再接続**
   - デバイスを一度抜いて10秒待つ
   - 再度接続してEthereumアプリを開く

4. **他のLedgerアプリを閉じる**
   - Ledger Liveを終了
   - 他のウォレットアプリ（MetaMask等）を閉じる

5. **Ledgerを再起動**
   - デバイスの電源を切る（USBを抜く）
   - 10秒待ってから再接続
   - PINを入力してロック解除

6. **デバッグログを確認**
   - Executive Consoleを起動したターミナルを確認
   - `[Ledger]` で始まる詳細ログが出力されます
   - 以下の情報をチェック:
     ```
     [Ledger] Found Ledger device: ...
     [Ledger] Device opened successfully
     [Ledger] Sending APDU command: ...
     [Ledger] Received response: XX bytes
     [Ledger] Response hex: ...
     ```

7. **自動リトライ**
   - 通信エラーが発生した場合、最大3回まで自動的に再試行されます
   - エラーが続く場合は上記の対処法を試してください

**予防策**:
- 安定したUSB接続を使用
- Ledgerファームウェアを最新に保つ
- 同時に複数のLedgerアプリを起動しない

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

