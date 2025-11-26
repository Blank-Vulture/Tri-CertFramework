# Registrations Directory

このディレクトリには、学生登録データと公開レジストリファイルが格納されています。

## 📁 ディレクトリ構造

```
registrations/
├── commit-allowlist.json      # Salt登録用公開allowlist（GitHubにコミット）
├── index.json                 # 公開鍵レジストリ（GitHubにコミット）
├── issuance-log.json         # 発行履歴（個人情報含む、.gitignoreで除外）
├── students/                  # 個人学生データ（.gitignoreで除外）
│   └── sha512:{hash}.json    # 学生IDハッシュごとのファイル
└── exports/                   # CSVエクスポート（.gitignoreで除外）
```

## 🔐 セキュリティとプライバシー

### GitHubにコミットされるファイル（公開情報のみ）

- ✅ `commit-allowlist.json` - activation_hashとstudent_id_hashのみ（個人情報なし）
- ✅ `index.json` - JWK thumbprintのみ（個人情報なし）

### ローカルのみ（個人情報含む、.gitignoreで除外）

- ❌ `issuance-log.json` - 氏名、生年月日、salt等を含む
- ❌ `students/` - 個人学生データ
- ❌ `exports/` - CSVエクスポート

## 📄 ファイル形式

### commit-allowlist.json

Salt登録用の公開allowlist。Proverでの検証とVerifier-UIでの確認に使用。

```json
{
  "schema": "tri-cert/commit-allowlist@1",
  "updated_at": "2025-11-26T00:00:00Z",
  "entries": [
    {
      "activation_hash": "sha512:...",
      "student_id_hash": "sha512:...",
      "created_at": "2025-11-26T00:00:00Z",
      "updated_at": "2025-11-26T00:00:00Z"
    }
  ]
}
```

**含まれる情報**: ハッシュ値のみ（個人情報なし）

### index.json

公開鍵レジストリ。WebAuthn公開鍵のJWK thumbprintを管理。

```json
{
  "schema": "tri-cert/student-registry@1",
  "description": "Student public key registry (JWK thumbprint based)",
  "registry": {
    "JWK_THUMBPRINT_1": true,
    "JWK_THUMBPRINT_2": true
  },
  "last_updated": "2025-11-26T00:00:00Z",
  "version": "1.0.0"
}
```

**含まれる情報**: JWK thumbprintのみ（個人情報なし）

### issuance-log.json（ローカルのみ）

発行履歴。個人情報を含むため、GitHubにはコミットしない。

```json
{
  "schema": "tri-cert/issuance-log@1",
  "updated_at": "2025-11-26T00:00:00Z",
  "data_root": "/path/to/registrations",
  "entries": [
    {
      "student_id": "12345",
      "student_id_hash": "sha512:...",
      "name": "山田 太郎",
      "normalized_name": "山田 太郎",
      "birthdate": "2000-01-01",
      "salt": "ABCDEFG...",
      "activation_hash": "sha512:...",
      "created_at": "2025-11-26T00:00:00Z",
      "allowlist_index": 0,
      "allowlist_version": 1
    }
  ]
}
```

**含まれる情報**: 氏名、生年月日、salt等（個人情報あり）

## 🔄 データフロー

### 1. Registrar Consoleでの登録

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

### 2. Proverでの検証

```
学生がsalt入力
  ↓
activation_hash計算
  ↓
GitHubからcommit-allowlist.json取得
  ↓
activation_hashが存在するか確認
  ↓
登録確認済み → 証明生成可能
```

### 3. Verifier-UIでの検証

```
PDFから証明データ抽出
  ↓
registration情報確認
  ↓
GitHubからcommit-allowlist.json取得
  ↓
activation_hashが存在するか確認
  ↓
「登録済み学生」と表示
```

## 🚀 運用

### 初回セットアップ

1. Registrar Consoleで学生を登録
2. `commit-allowlist.json`と`index.json`がGitHubにコミットされていることを確認
3. Proverで学生がsalt検証できることを確認

### 日常運用

1. 新しい学生を登録
2. 公開ファイル（`commit-allowlist.json`, `index.json`）をGitHubにプッシュ
3. 個人情報ファイルはローカルでバックアップ

### バックアップ

- **公開ファイル**: GitHubで自動的にバージョン管理
- **個人情報ファイル**: ローカルで定期的にバックアップ（暗号化推奨）

## ⚠️ 重要な注意事項

1. **個人情報の保護**
   - `issuance-log.json`と`students/`は絶対にGitHubにコミットしない
   - `.gitignore`で確実に除外されていることを確認

2. **公開情報の管理**
   - `commit-allowlist.json`と`index.json`は公開情報のみ
   - ハッシュ値から元の情報を復元することは不可能

3. **データの整合性**
   - 公開ファイルとローカルファイルの整合性を保つ
   - Registrar Consoleを使用して更新することを推奨

## 📚 関連ドキュメント

- [Registrar Console README](../registrar-console/README.md)
- [Prover README](../prover/README.md)
- [Verifier UI README](../verifier-ui/README.md)

