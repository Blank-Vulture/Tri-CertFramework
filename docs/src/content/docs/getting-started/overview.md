---
title: 概要
description: Tri-CertFrameworkの全体像と仕組み
---

**Tri-CertFramework** は、卒業証書、資格証明、会員証などの「証明書」を、スマートフォンやPCで安全かつ簡単に発行・管理・検証できるデジタルプラットフォームです。

紙の証明書における「偽造リスク」「紛失」「確認の手間」といった課題を、最新の暗号技術と使いやすいインターフェースで解決します。

## 誰のためのシステム？

| 利用者 | メリット | 対応アプリケーション |
|:---|:---|:---|
| **経営者・管理者** | 組織全体の証明書発行ルールを統制。不正防止とコスト削減を実現。 | 🏛️ **Executive Console** |
| **発行担当者** | 窓口業務の負担を軽減。数クリックで公的なデジタル証明書を発行。 | ✍️ **Registrar Console** |
| **証明書を持つ人** | あなただけ、その時だけの証明ファイルを証書に添付。 | 📱 **Prover** |
| **確認する人** | 目の前の証明書が本物かどうか、瞬時に自動判定。目視確認は不要。 | 🔍 **Verifier UI** |

## システムの仕組み

Tri-CertFrameworkは、3つの役割（発行者・保持者・検証者）と、それを統括する管理者の4者間で「信頼のバトン」を繋ぎます。

<pre class="mermaid">
flowchart TB
    subgraph admin["🏛️ Executive Console"]
        admin_desc["権限管理・監査"]
    end

    subgraph registrar["✍️ Registrar Console"]
        registrar_desc["証明書発行・失効"]
    end

    subgraph prover["📱 Prover App"]
        prover_desc["証明書受取・提示"]
    end

    subgraph verifier["🔍 Verifier UI"]
        verifier_desc["真正性チェック"]
    end

    admin -->|"1. ルール制定"| registrar
    registrar -->|"2. 発行"| prover
    prover -->|"3. 提示"| verifier

    style admin fill:#e0e7ff,stroke:#4f46e5,stroke-width:2px
    style registrar fill:#fef3c7,stroke:#d97706,stroke-width:2px
    style prover fill:#d1fae5,stroke:#059669,stroke-width:2px
    style verifier fill:#dbeafe,stroke:#2563eb,stroke-width:2px
</pre>

## 主要技術

### ゼロ知識証明 (ZK-SNARK)

証明書の内容を明かさずに「正当な証明書を持っている」ことを証明できる暗号技術です。

- **プライバシー保護**: 必要以上の情報を開示しない
- **改ざん検知**: 証明書の内容が変更されていないことを保証
- **オフライン検証**: ネットワーク接続なしでも検証可能

### WebAuthn 署名

FIDO2/WebAuthn標準に基づく生体認証や物理セキュリティキーによる署名です。

- **パスワードレス**: 生体認証で簡単かつ安全に署名
- **フィッシング耐性**: 偽サイトでの署名を防止
- **デバイス紐付け**: 本人のデバイスでのみ署名可能

## Getting Started

### 必要要件

- Node.js (v18+)
- Go (v1.20+) - Registrar Console用
- Rust (Latest Stable) - Executive Console用

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/your-org/tri-cert-framework.git
cd tri-cert-framework

# 例: Prover (ユーザーアプリ) の起動
cd prover
npm install
npm run dev
```

:::note
DBは必要ありません。全てファイルベースで動作します。  
Executive ConsoleにはLedgerデバイスが必要です。
:::

## セキュリティ & コンプライアンス

- **Open Source**: ソースコードは全て公開
- **Privacy First**: ユーザーの同意なしに個人情報は共有されません
- **Audit**: 全ての操作ログは改ざん困難な形式で記録されます
