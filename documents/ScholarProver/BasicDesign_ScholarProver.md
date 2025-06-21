# 基本設計書 (Basic Design) — 証明者システム (Scholar Prover)
**ZK Document Authenticity Framework / 証明者システム** 最終更新: 2025-06-21

> **汎用的書類真正性証明システム** - あらゆる書類に適応可能な設計で、例として卒業証書の真正性証明を実装

---

## 1. システム概要

### 1.1 目的
書類所有者がブラウザのみで、自身のPasskey署名を用いてゼロ知識証明を生成し、PDF/A-3形式の書類に真正性証明を埋め込むシステム。

### 1.2 主要機能
- WebAuthn Passkey認証
- Circom-SnarkJS証明生成
- PDF/A-3証明埋め込み
- 証明付きPDFダウンロード

### 1.3 非機能要件
- 証明生成時間: ≤ 5秒
- ブラウザ対応: Chrome/Edge/Safari最新版
- バンドルサイズ: ≤ 1MB

---

## 2. システム構成

### 2.1 アーキテクチャ
```
[Document Owner] → [Browser PWA] → [WebAuthn API]
                     ↓
           [Circom-SnarkJS] → [pdf-lib] → [Download]
```

### 2.2 技術スタック
| 層 | 技術 | 目的 |
|----|------|------|
| UI | React 18 + Vite | PWA基盤 |
| 認証 | WebAuthn API | Passkey署名 |
| ZKP | Circom + SnarkJS | 証明生成 |
| PDF | pdf-lib | 埋め込み処理 |

---

## 3. データフロー

### 3.1 証明生成フロー
1. **PDF入力**: ユーザーがPDFをドロップ
2. **パラメータ入力**: 提出先・有効期限設定
3. **署名生成**: WebAuthn Passkey署名
4. **証明生成**: Circom-SnarkJSで証明作成
5. **埋め込み**: PDF/A-3に証明データ埋め込み
6. **ダウンロード**: 証明付きPDF提供

### 3.2 データ構造
```json
// proof-header.json (PDF埋め込み用)
{
  "vkHash": "0x...",     // Verifying Key ハッシュ
  "commit": "0x...",     // Poseidon256(pk)
  "expireTs": 1893456000, // 有効期限
  "pdfHash": "0x...",    // 元PDFハッシュ
  "destHash": "0x...",   // 提出先ハッシュ
  "proof": "binary"      // ZKP証明データ
}
```

---

## 4. インターフェース設計

### 4.1 UI画面構成
| 画面 | 機能 | 入力項目 |
|------|------|----------|
| メイン | 証明生成 | PDF、提出先、期限 |
| 進捗 | 処理状況 | - |
| 結果 | ダウンロード | - |

### 4.2 API設計
```typescript
// ローカルAPI (ブラウザ内処理)
interface ScholarProverAPI {
  getSignature(challenge: string): Promise<WebAuthnSignature>;
  generateProof(inputs: ProofInputs): Promise<Uint8Array>;
  embedPDF(pdf: ArrayBuffer, proof: Uint8Array): Promise<ArrayBuffer>;
}
```

---

## 5. セキュリティ設計

### 5.1 認証セキュリティ
- **Passkey**: WebAuthn Level-2準拠
- **署名**: ES-256 (secp256r1)
- **チャレンジ**: SHA3-512(pdfHash||destHash||expireTs||salt)

### 5.2 証明セキュリティ
- **回路検証**: VKハッシュ照合
- **改竄検知**: PDFハッシュ整合性
- **有効期限**: タイムスタンプ検証

---

## 6. エラー処理

### 6.1 エラー分類
| コード | メッセージ | 対応 |
|--------|-----------|------|
| 3001 | SIGNATURE_ABORT | Passkey認証失敗 |
| 3002 | PROOF_FAIL | 証明生成失敗 |
| 3003 | PDF_INVALID | PDF形式エラー |
| 3004 | EXPIRED_INPUT | 期限設定エラー |

### 6.2 エラーハンドリング
- **ユーザーフレンドリー**: 技術詳細を隠した分かりやすいメッセージ
- **リトライ**: 一時的エラーの自動再試行
- **ログ**: デバッグ用詳細ログ保存

---

## 7. パフォーマンス設計

### 7.1 最適化戦略
- **WASM最適化**: SnarkJS WASM最適化
- **並行処理**: WebWorkerでの証明生成
- **メモリ管理**: 大容量データの適切な解放

### 7.2 性能目標
- 証明生成: ≤ 5秒 (M1 Mac基準)
- メモリ使用: ≤ 512MB
- バンドルサイズ: ≤ 1MB

---

## 8. テスト設計

### 8.1 テスト種別
- **単体テスト**: 各関数の動作確認
- **統合テスト**: WebAuthn + ZKP連携
- **E2Eテスト**: 実際のブラウザでの動作

### 8.2 テストケース
- **正常系**: 標準的な証明生成フロー
- **異常系**: 各種エラー条件
- **境界値**: ファイルサイズ上限等

---

## 9. 運用設計

### 9.1 監視項目
- 証明生成成功率
- 平均処理時間
- エラー発生頻度

### 9.2 保守性
- **ログ**: 構造化ログによる問題追跡
- **バージョン管理**: 回路バージョンとの互換性
- **ドキュメント**: 技術仕様の継続更新 