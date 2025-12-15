---
title: Executive Console
description: VK管理とLedgerハードウェアウォレット統合
---

**Executive Console** は、ゼロ知識証明回路の検証鍵（VK）を生成・管理・署名するためのデスクトップアプリケーションです。**Ledgerハードウェアウォレット**によるプロダクショングレードのセキュリティをサポートしています。

## 主な機能

### 🔐 ハードウェアウォレット署名

- **Ledger Nano S/X/S Plus** でVKバンドルに署名
- 秘密鍵はハードウェアデバイスから離れない
- ECDSA P-256署名（SHA-256ハッシュ）

### 📦 VK生成

- 年度別検証鍵の生成
- 回路アーティファクト（WASM, ZKey）の作成
- 暗号ハッシュ（SHA3-256）の計算

### 📂 VKNFTバンドル

- メタデータと署名を含むVKのパッケージング
- ファイル整合性チェック付きJSONマニフェスト
- 配布用ZIPアーカイブ

## クイックスタート

### 必要要件

- **Node.js** 18+ および npm
- **Rust** 1.77+（Tauri用）
- **Ledgerデバイス**（オプション、ハードウェア署名用）

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/tri-CertFramework.git
cd tri-CertFramework/executive-console

# 依存関係をインストール
npm install

# 開発モードで起動（ソフトウェア署名）
npm run dev:desktop

# 本番ビルド（Ledger署名）
npm run build:desktop
```

## 使用方法

### 開発モード

```bash
npm run dev:desktop
```

- **ソフトウェア署名**（デモキー使用）
- ⚠️ デモキーは開発専用です！

### 本番モード

```bash
npm run build:desktop
```

- 自動的に**Ledgerハードウェアウォレット**を使用
- 署名時にデバイス接続を要求

### 手動モード選択

```bash
# Ledgerモードを強制
VITE_SIGNING_MODE=ledger npm run dev:desktop

# ソフトウェアモードを強制（開発のみ）
VITE_SIGNING_MODE=software npm run dev:desktop
```

## Ledger統合

### クイックセットアップ

1. LedgerをUSBで接続
2. PINを入力しEthereumアプリを開く
3. アプリでVKを生成または署名
4. Ledgerデバイスでリクエストを承認

### Derivation Path

カスタムLedgerパスの場合：

```typescript
const PRODUCTION_CONFIG: LedgerHardwareSigningConfig = {
  mode: 'ledger-hardware',
  label: 'Ledger Hardware Wallet',
  derivation_path: "44'/60'/0'/0/1", // ← カスタマイズ
}
```

## アーキテクチャ

<pre class="mermaid">
flowchart TB
    subgraph app["🖥️ Executive Console - Tauri Desktop App"]
        subgraph frontend["Frontend - React + TypeScript"]
            vkgen["VK Generation UI"]
            vkmgmt["VK Management UI"]
            ledger_ui["Ledger Integration"]
        end

        subgraph backend["Backend - Rust"]
            hid["Ledger HID Communication"]
            fs["File System Operations"]
            tauri["Tauri Commands"]
        end

        frontend --> backend
    end

    style app fill:#f8fafc,stroke:#64748b,stroke-width:2px
    style frontend fill:#e0e7ff,stroke:#4f46e5,stroke-width:2px
    style backend fill:#fef3c7,stroke:#d97706,stroke-width:2px
</pre>

### 技術スタック

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, TailwindCSS |
| **Backend** | Rust, Tauri 2, hidapi |
| **Crypto** | SnarkJS, circomlib, sha2 |
| **Hardware** | Ledger Ethereum App (ECDSA P-256) |

## セキュリティ

### ✅ 本番環境（推奨）

- **Ledgerハードウェアウォレットを使用**
- 秘密鍵はデバイス内のみに保存
- コードや環境に鍵なし
- 各署名にユーザー確認が必要

### ⚠️ 開発環境

- デモキーによるソフトウェア署名
- **本番環境では使用しないこと**
- キーはソースコードに表示される
- テスト目的のみ

## テスト

```bash
# テスト実行
npm test

# 型チェック
npm run type-check

# Lint
npm run lint

# ビルドチェック
npm run build
```

## 配布

### macOS

```bash
npm run build:desktop
```

出力: `src-tauri/target/release/bundle/dmg/`

### Windows

```bash
npm run build:desktop
```

出力: `src-tauri/target/release/bundle/msi/`
