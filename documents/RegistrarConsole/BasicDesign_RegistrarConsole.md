# 基本設計書 (Basic Design) — Registrar Console
**zk‑CertFramework / 事務管理システム** 最終更新: 2025-06-16

---

## 1. システム概要

### 1.1 目的
教務事務担当者が学生の公開鍵を管理し、卒業証明書PDFを生成・配布するためのWebベース管理システム。

### 1.2 主要機能
- 学生公開鍵の一括登録・管理
- 証明書テンプレート管理
- PDF証明書生成
- 学生へのPDF配布
- Merkle Tree構築・更新

### 1.3 非機能要件
- 同時ユーザー数: ≤ 10人
- データ処理能力: 500名/バッチ
- 応答時間: ≤ 3秒
- 可用性: 99.9%

---

## 2. システム構成

### 2.1 アーキテクチャ
```
[Registrar Staff] → [Web Frontend] → [Backend API]
                                          ↓
                    [Database] ← [Blockchain Interface]
                        ↓
                   [PDF Generator] → [File Storage]
```

### 2.2 技術スタック
| 層 | 技術 | 目的 |
|----|------|------|
| Frontend | Vue.js 3 + Vite | SPA基盤 |
| Backend | Node.js + Express | API Server |
| Database | PostgreSQL | データ永続化 |
| PDF生成 | PDFKit + Node.js | 証明書生成 |
| Storage | MinIO (S3互換) | PDFファイル保存 |
| Blockchain | Polygon zkEVM | Merkle Root保存 |

---

## 3. データ設計

### 3.1 データベーススキーマ
```sql
-- 学生情報
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) UNIQUE NOT NULL,  -- 学籍番号
    name_jp VARCHAR(100) NOT NULL,           -- 日本語氏名
    name_en VARCHAR(100) NOT NULL,           -- 英語氏名
    public_key BYTEA NOT NULL,               -- Passkey公開鍵
    commitment VARCHAR(66) NOT NULL,         -- Poseidon256(pk)
    department VARCHAR(50) NOT NULL,         -- 学部・学科
    admission_year INTEGER NOT NULL,         -- 入学年度
    graduation_year INTEGER,                 -- 卒業年度
    status VARCHAR(20) DEFAULT 'active',     -- ステータス
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 証明書テンプレート
CREATE TABLE certificate_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,              -- テンプレート名
    type VARCHAR(20) NOT NULL,               -- 証明書種別
    template_data JSONB NOT NULL,            -- テンプレート設定
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 証明書発行履歴
CREATE TABLE certificate_issues (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    template_id INTEGER REFERENCES certificate_templates(id),
    pdf_path VARCHAR(255) NOT NULL,          -- PDFファイルパス
    file_hash VARCHAR(66) NOT NULL,          -- PDFハッシュ値
    issued_at TIMESTAMP DEFAULT NOW(),
    issued_by VARCHAR(50) NOT NULL           -- 発行者
);

-- Merkle Tree管理
CREATE TABLE merkle_trees (
    id SERIAL PRIMARY KEY,
    root_hash VARCHAR(66) NOT NULL,          -- Merkle Root
    tree_data JSONB NOT NULL,                -- Tree構造
    block_number BIGINT,                     -- ブロック番号
    tx_hash VARCHAR(66),                     -- トランザクションハッシュ
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.2 API設計
```typescript
// REST API Endpoints
interface RegistrarAPI {
  // 学生管理
  GET    /api/students                    // 学生一覧取得
  POST   /api/students                    // 学生登録
  PUT    /api/students/:id                // 学生情報更新
  DELETE /api/students/:id                // 学生削除
  POST   /api/students/bulk-upload        // CSV一括登録

  // 証明書管理
  GET    /api/templates                   // テンプレート一覧
  POST   /api/templates                   // テンプレート作成
  PUT    /api/templates/:id               // テンプレート更新
  
  // PDF生成
  POST   /api/certificates/generate       // 証明書生成
  GET    /api/certificates/download/:id   // PDF ダウンロード
  
  // Merkle Tree
  POST   /api/merkle/build                // Merkle Tree構築
  GET    /api/merkle/latest               // 最新Root取得
  POST   /api/merkle/deploy               // ブロックチェーンにデプロイ
}
```

---

## 4. 業務フロー設計

### 4.1 学生登録フロー
1. **CSV準備**: 学務システムから学生データエクスポート
2. **公開鍵収集**: 学生によるPasskey登録（別途実施）
3. **データ統合**: 学生情報 + 公開鍵の突合
4. **一括登録**: Registrar ConsoleでCSVアップロード
5. **検証**: データ整合性チェック
6. **コミット確定**: データベース反映

### 4.2 証明書発行フロー
1. **対象選択**: 卒業生リストから発行対象を選択
2. **テンプレート選択**: 証明書種別・テンプレート指定
3. **PDF生成**: 個人情報を埋め込んだPDF作成
4. **ファイル保存**: 生成したPDFをストレージに保存
5. **配布通知**: 学生へメール通知（別途システム）

### 4.3 Merkle Tree更新フロー
1. **変更検知**: 学生データの追加・更新を検知
2. **Tree再構築**: 最新データでMerkle Tree構築
3. **ハッシュ計算**: 各ノードのPoseidon256ハッシュ計算
4. **Root取得**: 新しいMerkle Root算出
5. **ブロックチェーン更新**: Executive Consoleに更新要求
6. **確認**: トランザクション完了まで監視

---

## 5. セキュリティ設計

### 5.1 認証・認可
- **RBAC**: 事務職員・管理者の権限分離
- **セッション管理**: JWT Token + Redis Session Store
- **MFA**: 重要操作時の二要素認証
- **監査ログ**: 全操作の詳細ログ記録

### 5.2 データ保護
- **暗号化**: データベース暗号化 (AES-256)
- **通信**: TLS 1.3 + Perfect Forward Secrecy
- **アクセス制御**: IP制限 + VPN必須
- **バックアップ**: 暗号化バックアップ (Daily)

### 5.3 データ整合性
- **公開鍵検証**: secp256r1楕円曲線検証
- **ハッシュ検証**: SHA3-512 + Poseidon256
- **デジタル署名**: 管理者による操作署名

---

## 6. インターフェース設計

### 6.1 画面構成
| 画面名 | 機能 | アクセス権限 |
|--------|------|-------------|
| ダッシュボード | システム状況確認 | 全権限 |
| 学生管理 | 学生情報CRUD | 事務職員以上 |
| 一括登録 | CSV アップロード | 事務職員以上 |
| テンプレート管理 | PDF テンプレート編集 | 管理者のみ |
| 証明書生成 | PDF 作成・配布 | 事務職員以上 |
| Merkle管理 | Tree構築・デプロイ | 管理者のみ |
| 設定 | システム設定 | 管理者のみ |

### 6.2 ユーザビリティ
- **直感的UI**: Vue.js + Element Plus UI Framework
- **レスポンシブ**: タブレット対応
- **国際化**: 日本語・英語切り替え
- **アクセシビリティ**: WCAG 2.1 AA準拠

---

## 7. パフォーマンス設計

### 7.1 処理性能
- **CSV処理**: 500名/分 (並行処理)
- **PDF生成**: 10件/秒 (Worker Queue)
- **Merkle Tree**: 1000名 ≤ 5秒
- **データベース**: Connection Pool + Query最適化

### 7.2 スケーラビリティ
- **水平スケーリング**: Load Balancer + Multi Instance
- **キャッシュ**: Redis Cache (頻繁なクエリ)
- **CDN**: 静的ファイル配信最適化

---

## 8. エラー処理・監視

### 8.1 エラーハンドリング
| エラータイプ | 対応 | 通知 |
|-------------|------|------|
| 入力検証エラー | フロントエンド表示 | なし |
| データベースエラー | エラーページ + ログ | システム管理者 |
| 外部API エラー | リトライ + フォールバック | 運用担当者 |
| ブロックチェーンエラー | 手動対応待ち | 技術責任者 |

### 8.2 監視・アラート
- **APM**: Application Performance Monitoring
- **ログ監視**: Centralized Logging (ELK Stack)
- **メトリクス**: CPU/Memory/Disk/Network
- **ヘルスチェック**: API エンドポイント監視

---

## 9. 運用設計

### 9.1 バックアップ戦略
- **データベース**: 日次フルバックアップ + WAL
- **ファイル**: PDFファイルの増分バックアップ
- **設定**: システム設定の定期バックアップ
- **復旧テスト**: 月次復旧テスト実施

### 9.2 メンテナンス
- **定期メンテナンス**: 月次 (第2土曜日 AM 2:00-4:00)
- **緊急メンテナンス**: 重大障害時の緊急対応
- **データクリーンアップ**: 古いログ・一時ファイル削除
- **バージョンアップ**: 四半期ごとのセキュリティアップデート

### 9.3 災害復旧
- **RTO**: 4時間 (Recovery Time Objective)
- **RPO**: 1時間 (Recovery Point Objective)
- **冗長化**: Primary-Secondary DB構成
- **地理的冗長**: 異なるリージョンでのバックアップ 