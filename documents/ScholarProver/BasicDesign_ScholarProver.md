# 基本設計書 (Basic Design) — 証明者システム (Scholar Prover)
**Tri-CertFramework / 証明者システム** 最終更新: 2025-08-09

> **三層認証書類真正性証明システム** - ZKP + ブロックチェーン + 電子署名による三層認証で、あらゆる書類に適応可能な設計

---

## 1. システム概要

### 1.1 目的
学生がブラウザのみで、パスキー電子署名とゼロ知識証明を生成し、PDF/A-3形式の書類に三層認証証明を埋め込むシステム。検証鍵をエクスポートして公開リポジトリでの配布に対応。

### 1.2 主要機能
- WebAuthn電子署名キー生成
- JWK形式検証鍵エクスポート
- パスキー電子署名生成
- Circom-SnarkJS証明生成
- PDF/A-3三層認証証明埋め込み
- 証明付きPDFダウンロード

### 1.3 非機能要件
- 証明生成時間: ≤ 5秒
- 電子署名生成: ≤ 1秒
- 検証鍵エクスポート: ≤ 0.5秒
- ブラウザ対応: Chrome/Edge/Safari最新版
- バンドルサイズ: ≤ 1MB

---

## 2. システム構成

### 2.1 アーキテクチャ
```
[Student] → [Browser PWA] → [WebAuthn API]
             ↓
    [Digital Signature] → [Verification Key Export]
             ↓
    [Circom-SnarkJS] → [pdf-lib] → [Triple-Auth PDF Download]
```

### 2.2 技術スタック
| 層 | 技術 | 目的 |
|----|------|------|
| UI | React 18 + Vite | PWA基盤 |
| 電子署名 | WebAuthn API + Web Crypto | パスキー電子署名 |
| 検証鍵 | JWK形式 + エクスポート | 検証鍵配布 |
| ZKP | Circom + SnarkJS | 証明生成 |
| PDF | pdf-lib | 三層認証埋め込み |

---

## 3. データフロー

### 3.1 三層認証証明生成フロー
1. **電子署名キー生成**: WebAuthnで電子署名キー作成
2. **検証鍵エクスポート**: JWK形式で検証鍵をエクスポート・管理者提出
3. **PDF入力**: 学生がPDFをドロップ
4. **パラメータ入力**: 提出先・有効期限設定
5. **電子署名生成**: パスキーでPDFハッシュを電子署名
6. **ZKP証明生成**: Circom-SnarkJSで証明作成
7. **三層認証埋め込み**: PDF/A-3に証明+電子署名埋め込み
8. **ダウンロード**: 三層認証PDF提供

### 3.2 データ構造
```json
// triple-auth-header.json (PDF埋め込み用)
{
  "vkHash": "0x...",         // Verifying Key ハッシュ
  "commit": "0x...",         // Poseidon256(verification_key)
  "expireTs": 1893456000,    // 有効期限
  "pdfHash": "0x...",        // 元PDFハッシュ
  "destHash": "0x...",       // 提出先ハッシュ
  "proof": "binary",         // ZKP証明データ
  "digitalSignature": "...", // ES256電子署名
  "studentId": "2025001",    // 学生ID
  "verificationKeyHash": "0x..." // 検証鍵ハッシュ
}

// verification-key.json (検証鍵エクスポート用)
{
  "kty": "EC",
  "crv": "P-256",
  "x": "...",
  "y": "...",
  "keyHash": "0x..."
}
```

---

## 4. インターフェース設計

### 4.1 UI画面構成
| 画面 | 機能 | 入力項目 |
|------|------|----------|
| キー生成 | 電子署名キー生成 | 学生ID、学生名 |
| キーエクスポート | 検証鍵エクスポート | - |
| メイン | 三層認証証明生成 | PDF、提出先、期限 |
| 進捗 | 処理状況 | - |
| 結果 | ダウンロード | - |

### 4.2 API設計
```typescript
// ローカルAPI (ブラウザ内処理)
interface ScholarProverAPI {
  generateSigningKey(studentId: string): Promise<VerificationKey>;
  exportVerificationKey(): Promise<JWK>;
  generateDigitalSignature(documentHash: string): Promise<Signature>;
  generateProof(inputs: ProofInputs): Promise<Uint8Array>;
  embedTripleAuth(pdf: ArrayBuffer, proof: Uint8Array, signature: Signature): Promise<ArrayBuffer>;
}
```

---

## 5. セキュリティ設計

### 5.1 電子署名セキュリティ
- **Passkey**: WebAuthn Level-2準拠
- **電子署名**: ES-256 (secp256r1) RFC 7515準拠
- **検証鍵**: JWK形式 RFC 7517準拠
- **ドキュメントハッシュ**: SHA3-512(pdfHash||destHash||expireTs||salt)

### 5.2 三層認証セキュリティ
- **第1層 ZKP**: 回路検証・VKハッシュ照合
- **第2層 ブロックチェーン**: Polygon zkEVMによる公開検証
- **第3層 電子署名**: ES256電子署名・公開検証鍵による検証
- **改竄検知**: PDFハッシュ整合性・電子署名検証
- **有効期限**: タイムスタンプ検証

---

## 6. エラー処理

### 6.1 エラー分類
| コード | メッセージ | 対応 |
|--------|-----------|------|
| 3001 | KEY_GENERATION_ABORT | 電子署名キー生成失敗 |
| 3002 | SIGNATURE_ABORT | 電子署名生成失敗 |
| 3003 | VERIFICATION_KEY_EXPORT_FAIL | 検証鍵エクスポート失敗 |
| 3004 | PROOF_FAIL | ZKP証明生成失敗 |
| 3005 | PDF_INVALID | PDF形式エラー |
| 3006 | EXPIRED_INPUT | 期限設定エラー |
| 3007 | TRIPLE_AUTH_EMBED_FAIL | 三層認証埋め込み失敗 |

### 6.2 エラーハンドリング
- **ユーザーフレンドリー**: 技術詳細を隠した分かりやすいメッセージ
- **リトライ**: 一時的エラーの自動再試行
- **ログ**: デバッグ用詳細ログ保存

---

## 7. パフォーマンス設計

### 7.1 最適化戦略
- **WASM最適化**: SnarkJS WASM最適化
- **並行処理**: WebWorkerでの証明生成
- **電子署名最適化**: Web Crypto API活用
- **検証鍵キャッシュ**: ローカルストレージ活用
- **メモリ管理**: 大容量データの適切な解放

### 7.2 性能目標
- 電子署名キー生成: ≤ 1秒 (M1 Mac基準)
- 検証鍵エクスポート: ≤ 0.5秒
- 電子署名生成: ≤ 1秒
- ZKP証明生成: ≤ 5秒
- 三層認証埋め込み: ≤ 2秒
- メモリ使用: ≤ 512MB
- バンドルサイズ: ≤ 1MB

---

## 8. テスト設計

### 8.1 テスト種別
- **単体テスト**: 各関数の動作確認
- **統合テスト**: WebAuthn + 電子署名 + ZKP連携
- **E2Eテスト**: 実際のブラウザでの三層認証動作

### 8.2 テストケース
- **正常系**: 標準的な三層認証証明生成フロー
- **電子署名系**: キー生成・エクスポート・署名生成
- **検証鍵系**: JWK形式エクスポート・インポート
- **異常系**: 各種エラー条件
- **境界値**: ファイルサイズ上限等

---

## 9. 運用設計

### 9.1 監視項目
- 電子署名キー生成成功率
- 検証鍵エクスポート成功率
- 三層認証証明生成成功率
- 平均処理時間（電子署名・ZKP・埋め込み別）
- エラー発生頻度

### 9.2 保守性
- **ログ**: 構造化ログによる問題追跡
- **バージョン管理**: 回路バージョンとの互換性
- **ドキュメント**: 技術仕様の継続更新 