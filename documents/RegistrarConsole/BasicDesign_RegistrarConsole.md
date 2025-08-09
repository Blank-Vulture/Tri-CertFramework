# 基本設計書 (Basic Design) — 管理者システム (Registrar Console)
**Tri-CertFramework / 管理者システム** 最終更新: 2025-08-09 Version 2.4

> **三層認証書類真正性証明システム** - ZKP + ブロックチェーン + 電子署名による三層認証で、あらゆる書類に適応可能な設計

---

## 1. システム概要

### 1.1 目的
管理者が学生の検証鍵レジストリを管理し、IPFS/GitHubに公開、書類PDFを生成・配布するためのTauriデスクトップアプリケーション。完全バックエンドレス設計により、データベースやサーバー不要でローカルJSONファイルのみで動作。

### 1.2 主要機能
- 学生検証鍵レジストリの一括登録・管理（JSONファイル）
- IPFS/GitHub公開リポジトリ管理
- 書類テンプレート管理（ローカルファイル）
- PDF/A-3書類生成（三層認証埋め込み）
- Poseidon Merkle Tree構築・エクスポート
- CSV インポート/エクスポート機能
- 年度別データ管理

### 1.3 非機能要件
- 同時ユーザー数: ≤ 3人（管理者のみ）
- データ処理能力: 500名/バッチ（ローカル処理）
- 応答時間: ≤ 5秒（PDF生成）
- 可用性: デスクトップアプリ（オフライン動作）

---

## 2. システム構成

### 2.1 アーキテクチャ（完全バックエンドレス）
```
[Administrator] → [Tauri Desktop App]
                            ↓
                    [Local JSON Files] ← → [Local File System]
                            ↓                       ↓
                    [PDF/A-3 Generator] ← → [Templates/Outputs]
                            ↓
                    [Poseidon Merkle Tree] → [Export Files]
                                                    ↓
                                            [USB Backup / Distribution]
```

### 2.2 技術スタック（Version 2.1）
| 層 | 技術 | 目的 |
|----|------|------|
| Frontend | React 18 + TypeScript + Tauri v2 | デスクトップアプリUI |
| データ管理 | JSONファイル + Tauri fs API | ローカルデータ永続化 |
| 認証 | Ledger Nano X + EIP-191 | ハードウェア署名 |
| PDF生成 | PDFtk + PDF/A-3 | 書類生成・ZKP埋め込み |
| Merkle Tree | Poseidon256 + JavaScript | ツリー構築 |
| Storage | ローカルファイルシステム | データ・PDF保存 |
| 配布 | GitHub Releases | 署名付きバイナリ |

---

## 3. データ設計（JSONファイルベース）

### 3.1 ファイル構造
```
registrar-console-app/
├── data/                     # 学生データ
│   ├── students_2025.json
│   ├── students_2026.json
│   └── merkle_tree_2025.json
├── templates/                # 証明書テンプレート
│   ├── graduation_template.pdf
│   └── transcript_template.pdf
├── certificates/             # 生成された証明書
│   ├── 2025/
│   │   ├── student_001.pdf
│   │   └── student_002.pdf
│   └── 2026/
├── exports/                  # エクスポートファイル
│   ├── public_keys_2025.csv
│   └── merkle_proof_2025.json
├── backups/                  # 自動バックアップ
│   └── backup_20250616.zip
└── config/
    └── registrar-config.json # アプリ設定
```

### 3.2 学生データスキーマ
```json
// data/students_2025.json
{
  "version": "2.0",
  "year": 2025,
  "lastUpdated": "2025-08-09T10:30:00Z",
  "totalStudents": 150,
  "institution": {
    "name": "○○大学",
    "department": "工学部",
    "address": "〒123-4567 東京都..."
  },
  "students": [
    {
      "id": "2025001",
      "name_jp": "田中太郎",
      "name_en": "Taro Tanaka",
      "kana": "タナカタロウ",
      "email": "tanaka@example.edu",
      "department": "工学部",
      "major": "情報工学科",
      "publicKey": {
        "x": "0x1234567890abcdef...",
        "y": "0xfedcba0987654321...",
        "format": "secp256r1"
      },
      "commitment": "0x789abc...",
      "enrollmentDate": "2021-04-01",
      "graduationDate": "2025-08-31",
      "gpa": 3.75,
      "status": "graduated",
      "certificateGenerated": true,
      "certificatePath": "./certificates/2025/tanaka_taro_certificate.pdf",
      "merkleIndex": 0,
      "addedAt": "2024-12-01T09:00:00Z",
      "updatedAt": "2025-08-09T14:30:00Z"
    }
  ]
}
```

### 3.3 Merkle Tree データ
```json
// data/merkle_tree_2025.json
{
  "version": "2.0",
  "year": 2025,
  "totalLeaves": 256,
  "actualStudents": 150,
  "treeDepth": 8,
  "hashFunction": "poseidon256",
  "root": "0xabcdef1234567890...",
  "leaves": [
    {
      "index": 0,
      "studentId": "2025001",
      "publicKeyHash": "0x123abc...",
      "commitment": "0x456def...",
      "leaf": "0x789ghi..."
    }
  ],
  "tree": {
    "level0": ["0x123...", "0x456...", "0x000...", "..."],
    "level1": ["0xabc...", "0xdef...", "..."],
    "level7": ["0xabcdef1234567890..."]
  },
  "generatedAt": "2025-08-09T10:00:00Z",
  "exportedTo": "./exports/merkle_proof_2025.json"
}
```

### 3.4 アプリケーション設定
```json
// config/registrar-config.json
{
  "version": "2.0",
  "appVersion": "1.0.0",
  "currentYear": 2025,
  "institution": {
    "name": "○○大学",
    "department": "工学部情報工学科",
    "address": "〒123-4567 東京都渋谷区...",
    "phone": "03-1234-5678",
    "email": "registrar@example.edu",
    "website": "https://example.edu"
  },
  "ledger": {
    "required": true,
    "signingMethod": "EIP-191",
    "chainId": 1442,
    "contractAddress": "0x..."
  },
  "certificate": {
    "templatePath": "./templates/graduation_template.pdf",
    "outputPath": "./certificates",
    "format": "PDF/A-3",
    "embedZKP": true,
    "digitalSignature": true,
    "watermark": true
  },
  "merkleTree": {
    "hashFunction": "poseidon256",
    "treeDepth": 8,
    "paddingLeaves": 256,
    "autoRebuild": true,
    "exportOnUpdate": true
  },
  "export": {
    "csvEncoding": "UTF-8",
    "includePersonalInfo": false,
    "timestampFormat": "ISO8601",
    "autoBackup": true
  },
  "ui": {
    "theme": "light",
    "language": "ja",
    "autoSave": true,
    "backupInterval": 300,
    "pageSize": 50
  }
}
```

---

## 4. 業務フロー設計

### 4.1 学生登録フロー（CSVインポート）
1. **CSV準備**: 学務システムから学生データエクスポート
2. **公開鍵収集**: 学生によるPasskey登録（Scholar Prover）
3. **データ統合**: 学生情報 + 公開鍵の突合・検証
4. **CSV インポート**: Registrar ConsoleでCSVファイル読み込み
5. **データ検証**: 公開鍵形式・重複チェック
6. **JSON保存**: ローカルJSONファイルに保存

### 4.2 証明書発行フロー（PDF/A-3生成）
1. **対象選択**: 卒業生リストから発行対象を選択
2. **テンプレート選択**: 証明書種別・テンプレート指定
3. **PDF生成**: 個人情報を埋め込んだPDF/A-3作成
4. **ZKP埋め込み**: 証明書にZKP証明データ埋め込み
5. **ローカル保存**: 生成したPDFをローカルフォルダに保存
6. **USBバックアップ**: 外部ドライブへバックアップ

### 4.3 Merkle Tree構築フロー
1. **学生データ読み込み**: JSONファイルから公開鍵取得
2. **Commitment計算**: Poseidon256(publicKey)算出
3. **Merkle Tree構築**: 8層・256葉のPoseidon Merkle Tree
4. **Root計算**: 最新のMerkle Root算出
5. **エクスポート**: 証明生成用データをJSONエクスポート
6. **Executive Console連携**: 手動でRoot更新要求

---

## 5. セキュリティ設計

### 5.1 認証・認可（Ledger Nano X）
- **ハードウェア認証**: Ledger Nano X必須
- **EIP-191署名**: 重要操作時のデジタル署名
- **権限分離**: 事務職員・管理者の機能制限
- **操作ログ**: 全操作の詳細ログ記録（JSON）

### 5.2 データ保護（ローカル暗号化）
- **ファイル暗号化**: 機密JSONファイルの暗号化
- **アクセス制御**: OSレベルのファイル権限設定
- **バックアップ暗号化**: 外部ドライブへの暗号化バックアップ
- **データ完全性**: ファイルハッシュによる改ざん検証

### 5.3 データ整合性
- **公開鍵検証**: secp256r1楕円曲線検証
- **ハッシュ検証**: SHA3-256 + Poseidon256
- **JSON スキーマ**: 厳密なデータ形式検証
- **バージョン管理**: データ形式のバージョン追跡

---

## 6. インターフェース設計

### 6.1 画面構成
| 画面名 | 機能 | アクセス権限 |
|--------|------|-------------|
| ダッシュボード | 年度別データ状況確認 | 全権限 |
| 学生管理 | 学生情報CRUD・CSV処理 | 事務職員以上 |
| CSV インポート | 一括データ登録 | 事務職員以上 |
| テンプレート管理 | PDF テンプレート編集 | 管理者のみ |
| 証明書生成 | PDF/A-3 バッチ生成 | 事務職員以上 |
| Merkle Tree管理 | Tree構築・エクスポート | 管理者のみ |
| エクスポート | CSV・JSON出力 | 事務職員以上 |
| 設定 | アプリケーション設定 | 管理者のみ |

### 6.2 ユーザビリティ
- **直感的UI**: Vue.js 3 + Element Plus UI Framework
- **レスポンシブ**: デスクトップ最適化
- **国際化**: 日本語・英語切り替え
- **アクセシビリティ**: WCAG 2.1 AA準拠
- **キーボードショートカット**: 効率的な操作

---

## 7. パフォーマンス設計

### 7.1 処理性能（ローカル処理）
- **CSV処理**: 500名/分（非同期処理）
- **PDF生成**: 10件/秒（並列Worker）
- **Merkle Tree**: 1000名 ≤ 3秒（WASM最適化）
- **ファイルI/O**: 大容量ファイル対応

### 7.2 メモリ最適化
- **ストリーミング処理**: 大容量CSVの分割処理
- **メモリプール**: オブジェクト再利用
- **ガベージコレクション**: 定期的なメモリクリーンアップ

---

## 8. エラー処理・監視

### 8.1 エラーハンドリング
| エラータイプ | 対応 | 記録 |
|-------------|------|------|
| ファイル読み込みエラー | ダイアログ表示・再試行 | ローカルログ |
| JSON パースエラー | データ復旧・バックアップ復元 | 詳細エラーログ |
| PDF生成エラー | 個別スキップ・レポート生成 | 失敗リスト |
| Ledger接続エラー | 再接続・手動対応 | セキュリティログ |

### 8.2 監視・ログ
- **アプリケーションログ**: 操作履歴・エラー記録
- **ファイル整合性**: 定期的なハッシュ検証
- **自動バックアップ**: 設定可能な間隔での自動保存
- **使用量監視**: ディスク容量・処理時間監視

---

## 9. 運用設計

### 9.1 バックアップ戦略（ローカル）
- **自動バックアップ**: 日次・週次の自動保存
- **外部ドライブ**: USBドライブへの暗号化バックアップ
- **世代管理**: 複数世代のバックアップ保持
- **復旧テスト**: 月次バックアップ復旧テスト

### 9.2 メンテナンス
- **データクリーンアップ**: 古いログ・一時ファイル削除
- **アプリ更新**: GitHub Releasesからのダウンロード更新
- **セキュリティ更新**: 四半期ごとの依存関係更新
- **年度切り替え**: 新年度データ構造の準備

### 9.3 配布・インストール
- **GitHub Releases**: 署名付きバイナリ配布
- **署名検証**: Tauri Builderによるコード署名
- **自動更新**: アプリ内更新通知・ダウンロード
- **ポータブル版**: USB実行可能版の提供 