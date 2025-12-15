---
title: セキュリティ
description: セキュリティガイドラインとベストプラクティス
---

Tri-CertFrameworkのセキュリティに関するガイドラインとベストプラクティスです。

## セキュリティアーキテクチャ

### 多層防御

<pre class="mermaid">
flowchart TB
    subgraph hw["🔒 Hardware Security"]
        hw_desc["Ledger Hardware Wallet"]
    end
    subgraph crypto["🔐 Cryptographic Layer"]
        crypto_desc["ZK-SNARK, WebAuthn, SHA3-512"]
    end
    subgraph app["📱 Application Layer"]
        app_desc["Input Validation, Access Control"]
    end
    subgraph transport["🌐 Transport Layer"]
        transport_desc["HTTPS, CORS"]
    end

    hw --> crypto
    crypto --> app
    app --> transport

    style hw fill:#fef3c7,stroke:#d97706,stroke-width:2px
    style crypto fill:#e0e7ff,stroke:#4f46e5,stroke-width:2px
    style app fill:#d1fae5,stroke:#059669,stroke-width:2px
    style transport fill:#dbeafe,stroke:#2563eb,stroke-width:2px
</pre>

## 暗号技術

### ゼロ知識証明 (ZK-SNARK)

| 項目 | 仕様 |
|------|------|
| **プロトコル** | Groth16 |
| **曲線** | BN128 |
| **ハッシュ** | SHA3-512 (PDF), SHA3-256 (VKey) |
| **ライブラリ** | snarkjs, circom |

### WebAuthn署名

| 項目 | 仕様 |
|------|------|
| **アルゴリズム** | ECDSA |
| **曲線** | P-256 (secp256r1) |
| **ハッシュ** | SHA-256 |
| **標準** | FIDO2 / WebAuthn |

### Ledgerハードウェア署名

| 項目 | 仕様 |
|------|------|
| **アルゴリズム** | ECDSA |
| **曲線** | P-256 |
| **アプリ** | Ethereum App |
| **Derivation** | BIP-44 |

## ベストプラクティス

### Executive Console

:::tip[本番環境では必ずLedgerを使用]
ソフトウェア署名は開発専用です。本番環境では必ずLedgerハードウェアウォレットを使用してください。
:::

**推奨設定**:
- Ledger Nano S Plus / X を使用
- ファームウェアを最新に保つ
- 署名前にデバイス画面で内容を確認
- PINは推測困難なものを設定

### Registrar Console

**データ保護**:
- `issuance-log.json` は暗号化してバックアップ
- `students/` ディレクトリへのアクセスを制限
- 定期的なアクセスログの監査

**運用**:
- 専用端末での使用を推奨
- 画面ロックを有効化
- 操作ログの保存

### Prover / Verifier UI

**ブラウザセキュリティ**:
- HTTPS環境でのみ動作
- 最新ブラウザの使用を推奨
- 拡張機能の最小化

## 個人情報保護

### 公開情報と非公開情報

| 情報 | 公開 | 保護レベル |
|------|------|-----------|
| activation_hash | ✅ | ハッシュ化済み |
| student_id_hash | ✅ | ハッシュ化済み |
| issuer情報 | ✅ | 公開情報 |
| 氏名 | ❌ | ローカルのみ |
| 生年月日 | ❌ | ローカルのみ |
| salt | ❌ | ローカルのみ |

### ハッシュからの逆算

SHA-512ハッシュは一方向関数であり、ハッシュ値から元の情報を復元することは計算上不可能です。

:::note
salt + 個人情報 → SHA-512 → activation_hash  
この変換は不可逆です。
:::

## インシデント対応

### 秘密鍵の漏洩が疑われる場合

1. **即座に使用を停止**
2. Ledgerデバイスを新しいものに交換
3. 新しいVKを生成・配布
4. 影響範囲を調査
5. 関係者に通知

### 個人情報ファイルの漏洩が疑われる場合

1. **即座にアクセスを遮断**
2. 漏洩範囲を特定
3. 関係者への通知（法的要件に従う）
4. セキュリティ強化策の実施
5. 再発防止策の策定

## 監査

### ログの保存

| コンポーネント | ログ内容 | 保存期間 |
|---------------|---------|---------|
| Executive Console | VK生成・署名 | 無期限 |
| Registrar Console | 発行履歴 | 無期限 |

### 定期監査項目

- [ ] GitHubに個人情報がコミットされていないか
- [ ] Ledgerファームウェアが最新か
- [ ] アクセスログに不審な活動がないか
- [ ] バックアップが正常に実行されているか

## コンプライアンス

### 準拠予定の標準

- W3C Verifiable Credentials (VC)
- FIDO2 / WebAuthn
- GDPR（個人情報保護）

### プライバシーバイデザイン

- **データ最小化**: 必要最小限の情報のみ収集
- **目的限定**: 収集目的以外での使用禁止
- **透明性**: 処理内容の明示
- **セキュリティ**: 適切な技術的保護措置
