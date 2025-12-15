---
title: Registrar Console
description: 学務向け証明書発行デスクトップアプリ
---

**Registrar Console** は、Tri-CertFrameworkの学務向けデスクトップアプリです。salt付きアクティベーションハッシュを生成し、`registrations/` ディレクトリ配下へファイルを自動出力します。

アプリは **Wails v2**（Go + Frontend）で構築されています。

## 出力ファイル

- `commit-allowlist.json` - Salt登録用公開allowlist
- `students/{student_id_hash}.json` - 学生個別データ
- `issuance-log.json` - 発行一覧の永続化

## 開発環境

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

:::note
開発フロントエンドはポート `5174` で起動するよう設定済みです（`executive-console` の Vite 開発サーバーとの衝突回避のため）。
:::

## 本番アプリ統合

### ビルド手順

1. **フロントエンドを本番ビルド**
   ```bash
   cd registrar-console/frontend
   npm run build
   ```

2. **Wails ビルド（デスクトップアプリ生成）**
   ```bash
   cd registrar-console
   GOCACHE=$(pwd)/../.gocache wails build
   ```

3. **生成物**
   - `build/bin/Registrar Console`（macOS）
   - `build/bin/registrar-console.exe`（Windows）

4. **データディレクトリ設定**
   
   `registrations/` ディレクトリを同階層に配置し、必要に応じて初期ファイルを準備します。アプリ内から「データ出力先を変更」ボタンで任意パスに切り替え可能です。

## 主要機能

### 学生登録

- 学籍番号・氏名・生年月日から salt とアクティベーションハッシュを生成
- CSV（`student_id,name,birthdate`）一括登録
- 生成結果を即座に UI 上で確認

### 発行管理

- 発行履歴（検索・永続保存）
- データ出力先の GUI 切り替え
- 設定は `registrar-settings.json` として保存

## データフロー

```
学生情報入力
      ↓
Salt生成
      ↓
activation_hash計算
      ↓
ローカルファイル保存:
  - issuance-log.json（個人情報含む）
  - students/{hash}.json（個人情報含む）
      ↓
公開ファイル更新:
  - commit-allowlist.json（ハッシュのみ）
  - index.json（JWK thumbprintのみ）
      ↓
GitHubにコミット（公開ファイルのみ）
```

## テスト

```bash
cd registrar-console
GOCACHE=$(pwd)/../.gocache go test ./...

cd frontend
npm run build
```

## 運用

運用時は git で `registrations/` をバージョン管理し、生成された JSON をコミット／配布してください。

:::caution[セキュリティ注意]
`issuance-log.json` と `students/` ディレクトリには個人情報が含まれます。  
これらは `.gitignore` で除外し、GitHubにはコミットしないでください。
:::
