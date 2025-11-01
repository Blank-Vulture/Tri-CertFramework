# Registrar Console

Tri-CertFramework の学務向けデスクトップアプリです。salt 付きアクティベーションハッシュを生成し、`registrations/` ディレクトリ配下へ以下のファイルを自動出力します。

- `commit-allowlist.json`  
- `students/{student_id_hash}.json`  
- `issuance-log.json`（発行一覧の永続化）

アプリは Wails v2（Go + SolidJS）で構築されています。

---

## 1. 開発環境

### 必要要件
- Go 1.23+
- Node.js 18+
- npm

### 初期セットアップ
```bash
cd registrar-console/frontend
npm install
```

### 開発モード
```bash
cd registrar-console
GOCACHE=$(pwd)/../.gocache wails dev
```

---

## 2. 本番アプリ統合手順（単体バイナリ化）

1. フロントエンドを本番ビルド  
   ```bash
   cd registrar-console/frontend
   npm run build
   ```

2. Wails ビルド（デスクトップアプリ生成）  
   ```bash
   cd registrar-console
   GOCACHE=$(pwd)/../.gocache wails build
   ```

3. 生成物  
   - `build/bin/Registrar Console`（macOS）  
   - `build/bin/registrar-console.exe`（Windows）など

4. `registrations/` ディレクトリを同階層に配置し、必要に応じて初期ファイルを準備します。  
   アプリ内から「データ出力先を変更」ボタンで任意パスに切り替え可能です（設定は `registrar-settings.json` として保存され、次回起動時に復元されます）。

5. 正常起動後、`発行一覧` に全履歴が表示され、CSV または手動登録で追加した情報が `registrations/` 内に反映されます。

---

## 3. テスト

```bash
cd registrar-console
GOCACHE=$(pwd)/../.gocache go test ./...

cd frontend
npm run build
```

---

## 4. 主要機能

- 学籍番号・氏名・生年月日から salt とアクティベーションハッシュを生成  
- CSV（`student_id,name,birthdate`）一括登録  
- 発行履歴（検索・永続保存）  
- データ出力先の GUI 切り替え  
- 生成結果を即座に UI 上で確認

運用時は git で `registrations/` をバージョン管理し、生成された JSON をコミット／配布してください。
