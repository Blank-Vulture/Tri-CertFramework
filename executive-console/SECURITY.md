# セキュリティに関する注意事項

## 🔐 署名鍵の管理

### 推奨設定（本番環境）

Executive Console は **Ledger Hardware Wallet** を使用した署名をサポートしています。

- **署名方式**: ECDSA P-256 (Ledger Ethereum App)
- **秘密鍵**: Ledgerデバイス内で保護（エクスポート不可）
- **設定**: `src/config/signing.ts` で自動選択

### 開発環境

開発時は **ソフトウェア署名**（デモ鍵）を自動使用します。

- **署名鍵の場所**: `src/config/signing.ts`
- **⚠️ 警告**: デモ鍵は開発専用、本番では使用禁止

### ⚠️ 重要な注意事項

#### 1. 秘密鍵の保護

**現在の秘密鍵はデモ用です。本番環境では絶対に使用しないでください。**

```typescript
// ❌ BAD: 秘密鍵をコードにハードコード（現在の状態）
export const SIGNING_CONFIG = {
  privateKey: { /* ... */ }
}

// ✅ GOOD: 環境変数から読み込む（推奨）
export const SIGNING_CONFIG = {
  privateKey: JSON.parse(process.env.SIGNING_PRIVATE_KEY || '{}')
}
```

#### 2. 本番環境での推奨設定

```bash
# 1. 新しい鍵ペアを生成
node scripts/generate-signing-key.js

# 2. 秘密鍵を環境変数に設定
export SIGNING_PRIVATE_KEY='{"kty":"EC",...}'

# 3. signing.ts を環境変数から読み込むように変更
```

#### 3. Git コミット前の確認

```bash
# 秘密鍵がコミットされていないか確認
git diff src/config/signing.ts

# もしコミットしてしまった場合
git reset HEAD~1
git clean -fd
```

---

## 🔑 鍵の種類

### ソフトウェア署名（現在）

**メリット**:
- ✅ デスクトップアプリで確実に動作
- ✅ 追加のハードウェア不要
- ✅ 自動化が容易

**デメリット**:
- ❌ 秘密鍵がソフトウェアに保存される
- ❌ 鍵の漏洩リスク

### ハードウェア署名（WebAuthn/Ledger）

**メリット**:
- ✅ 秘密鍵がハードウェア内に保護される
- ✅ 高いセキュリティレベル

**デメリット**:
- ❌ Tauriデスクトップアプリで動作しない
- ❌ ブラウザ版でのみ使用可能
- ❌ Ledgerデバイスが必要

---

## 🛠️ トラブルシューティング

### 署名エラー: "Failed to import private key"

**原因**: 秘密鍵のJWK形式が不正

**解決方法**:
```bash
# 新しい鍵を生成
node scripts/generate-signing-key.js

# 出力された鍵を src/config/signing.ts にコピー
```

### WebAuthn エラー: "NotAllowedError"

**原因**: TauriデスクトップアプリではWebAuthnが使用できない

**解決方法**: `signing.ts` の `mode` を `'software'` に変更（既に修正済み）

---

## 📋 セキュリティチェックリスト

開発時:
- [ ] デモ用の鍵を使用（現在の状態）
- [ ] 秘密鍵をGitにコミットしている（要注意）

本番環境:
- [ ] 新しい鍵ペアを生成
- [ ] 秘密鍵を環境変数に保存
- [ ] 秘密鍵をGitから削除
- [ ] バックアップを安全な場所に保管

---

## 🔄 将来の改善案

### Phase 1（現在）
- ✅ ソフトウェア署名の実装
- ✅ 鍵生成スクリプトの作成

### Phase 2（将来）
- [ ] 環境変数からの鍵読み込み
- [ ] Tauri Secure Storage APIの使用
- [ ] 鍵のローテーション機能

### Phase 3（将来）
- [ ] HSM（Hardware Security Module）の統合
- [ ] マルチシグ対応
- [ ] 監査ログの実装

---

## 📞 サポート

セキュリティに関する問題を発見した場合は、公開イシューではなく直接報告してください。

