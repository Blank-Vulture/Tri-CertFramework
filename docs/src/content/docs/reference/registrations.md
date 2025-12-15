---
title: Registrations
description: 学生登録データと公開レジストリの仕様
---

`registrations/` ディレクトリには、学生登録データと公開レジストリファイルが格納されています。

## ディレクトリ構造

```
registrations/
├── commit-allowlist.json      # Salt登録用公開allowlist（GitHubにコミット）
├── index.json                 # 公開鍵レジストリ（GitHubにコミット）
├── issuer.json               # 発行機関情報（GitHubにコミット）
├── issuance-log.json         # 発行履歴（個人情報含む、.gitignoreで除外）
├── students/                  # 個人学生データ（.gitignoreで除外）
│   └── sha512:{hash}.json    # 学生IDハッシュごとのファイル
└── exports/                   # CSVエクスポート（.gitignoreで除外）
```

## セキュリティとプライバシー

### GitHubにコミットされるファイル（公開情報のみ）

| ファイル | 内容 | 個人情報 |
|---------|------|---------|
| `commit-allowlist.json` | activation_hash, student_id_hash, issuer情報 | ❌ なし |
| `index.json` | JWK thumbprintのみ | ❌ なし |
| `issuer.json` | 発行機関のID・名前 | ❌ なし |

### ローカルのみ（.gitignoreで除外）

| ファイル | 内容 | 個人情報 |
|---------|------|---------|
| `issuance-log.json` | 氏名、生年月日、salt等 | ⚠️ あり |
| `students/` | 個人学生データ | ⚠️ あり |
| `exports/` | CSVエクスポート | ⚠️ あり |

:::danger[重要]
`issuance-log.json` と `students/` は絶対にGitHubにコミットしないでください。
:::

## ファイル形式

### commit-allowlist.json

Salt登録用の公開allowlist。Proverでの検証とVerifier-UIでの確認に使用。

```json
{
  "schema": "tri-cert/commit-allowlist@2",
  "issuer": {
    "id": "university-a",
    "name": "A大学"
  },
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

### issuer.json

発行機関（大学等）の識別情報。

```json
{
  "id": "university-a",
  "name": "A大学"
}
```

| フィールド | 説明 |
|-----------|------|
| `id` | 機関を一意に識別するID（英数字とハイフン推奨） |
| `name` | 人間が読める機関名（Verifier UIで表示される） |

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

## データフロー

### 1. Registrar Consoleでの登録

<pre class="mermaid">
flowchart TB
    A["📝 学生情報入力"] --> B["🔑 Salt生成"]
    B --> C["#️⃣ activation_hash計算"]
    C --> D["💾 ローカルファイル保存"]
    D --> E["📤 公開ファイル更新"]
    E --> F["🌐 GitHubにコミット"]

    D -.- D1["issuance-log.json\n(個人情報含む)"]
    D -.- D2["students/hash.json\n(個人情報含む)"]

    E -.- E1["commit-allowlist.json\n(ハッシュのみ)"]
    E -.- E2["index.json\n(JWK thumbprintのみ)"]

    style D1 fill:#fee2e2,stroke:#dc2626
    style D2 fill:#fee2e2,stroke:#dc2626
    style E1 fill:#d1fae5,stroke:#059669
    style E2 fill:#d1fae5,stroke:#059669
</pre>

### 2. Proverでの検証

<pre class="mermaid">
flowchart TB
    A["🔑 学生がsalt入力"] --> B["#️⃣ activation_hash計算"]
    B --> C["📥 GitHubからcommit-allowlist.json取得"]
    C --> D{"activation_hashが存在？"}
    D -->|"✅ Yes"| E["登録確認済み → 証明生成可能"]
    D -->|"❌ No"| F["登録なし → エラー"]

    style E fill:#d1fae5,stroke:#059669
    style F fill:#fee2e2,stroke:#dc2626
</pre>

### 3. Verifier-UIでの検証

<pre class="mermaid">
flowchart TB
    A["📄 PDFから証明データ抽出"] --> B["🔍 registration情報確認"]
    B --> C["📥 GitHubからcommit-allowlist.json取得"]
    C --> D{"activation_hashが存在？"}
    D -->|"✅ Yes"| E["登録済み学生と表示"]
    D -->|"❌ No"| F["未登録と表示"]

    style E fill:#d1fae5,stroke:#059669
    style F fill:#fee2e2,stroke:#dc2626
</pre>

## 運用ガイド

### 初回セットアップ

1. Registrar Consoleで学生を登録
2. `commit-allowlist.json` と `index.json` がGitHubにコミットされていることを確認
3. Proverで学生がsalt検証できることを確認

### 日常運用

1. 新しい学生を登録
2. 公開ファイル（`commit-allowlist.json`, `index.json`）をGitHubにプッシュ
3. 個人情報ファイルはローカルでバックアップ

### バックアップ

| 種類 | 方法 |
|------|------|
| **公開ファイル** | GitHubで自動的にバージョン管理 |
| **個人情報ファイル** | ローカルで定期的にバックアップ（暗号化推奨） |
