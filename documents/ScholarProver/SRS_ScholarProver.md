# 要件定義書 (SRS) — Scholar Prover  
**zk‑CertFramework / 証明者システム** 最終更新: 2025-07-10 (Version 2.2)

## 1. 目的  
Scholar Prover は学生が **ブラウザのみで完結する PWA** として
1) WebAuthn Passkey（ES‑256）署名を生成し、
2) Circom 回路 + SnarkJS により ZKP を作成、
3) 生成した `proof.json` を PDF/A‑3 に埋め込む。
4) **QR コード生成により Passkey データを管理者に効率的に提供する。**
**完全バックエンドレス** で本人が何度でも一時証明を作れる環境を提供する。

## 2. スコープ  
| 含む | 含まれない |
|------|------------|
| WebAuthn Passkey 署名 (navigator.credentials.get) | Passkey 初回登録UI |
| Circom + SnarkJS Groth16 証明生成 | サーバー側検証 |
| PDF/A‑3 添付ファイル埋込み | PDF 電子署名 |
| PWA オフライン動作 | ネイティブアプリ化 |
| 年度別回路ファイル対応 | 回路ファイル編集機能 |
| **QR コード生成・表示** | **外部 QR サービス利用** |
| **Passkey データ エクスポート** | **Passkey データ永続化** |

## 3. 用語  
- **Passkey**: WebAuthn+CTAP 仕様の資格情報（ブラウザ・デバイス内保存）
- **Circom**: Zero-knowledge 回路記述言語  
- **SnarkJS**: JavaScript Groth16 証明・検証ライブラリ
- **PWA**: Progressive Web App（インストール可能・オフライン対応）

## 4. アクター・利害関係者
| アクター | 主要関心事 | システム利用方法 |
|----------|------------|------------------|
| **学生** | 簡単・無料・プライベートな証明生成 | PWA で PDF ドロップ → 証明生成 → ダウンロード |
| **大学** | 学生の自律的証明発行支援 | 年度別回路ファイル・VK の配布 |
| **雇用主** | 証明書の真正性確認 | 学生提出PDFをVerifier UIで検証 |

## 5. ユースケース概要
### 5.1 UC‑SP‑01: 初回セットアップ
- **主アクター**: 学生
- **前提条件**: WebAuthn対応ブラウザ + 生体認証デバイス
- **基本フロー**: 
  1. PWA にアクセス・インストール
  2. WebAuthn Passkey 登録
  3. 年度別回路ファイルの自動ダウンロード
  4. ローカルストレージに保存完了
- **成功条件**: 証明生成の準備完了

### 5.2 UC‑SP‑02: Passkey QR コード エクスポート
- **主アクター**: 学生
- **前提条件**: 初回セットアップ完了 + Passkey 登録済み
- **基本フロー**:
  1. PWA でエクスポート機能にアクセス
  2. 学生情報・年度の確認
  3. QR コード生成（Passkey データ + メタデータ）
  4. 画面に QR コード表示
  5. 管理者による QR スキャン
  6. エクスポート履歴記録
- **成功条件**: Passkey データの QR 転送完了

### 5.3 UC‑SP‑03: ZKP 証明生成
- **主アクター**: 学生  
- **前提条件**: 初回セットアップ完了 + 大学発行のPDF/A-3
- **基本フロー**:
  1. PDF ファイルをドラッグ&ドロップ
  2. 提出先・有効期限を入力
  3. WebAuthn 署名実行（生体認証）
  4. Circom/SnarkJS で ZKP 生成（5-15秒）
  5. 証明を PDF/A-3 に埋込み
  6. 強化PDFをダウンロード
- **成功条件**: 検証可能な証明書PDFの取得

### 5.4 UC‑SP‑04: オフライン証明生成
- **主アクター**: 学生
- **前提条件**: 事前に回路ファイルをキャッシュ済み
- **基本フロー**: 
  1. ネットワーク切断状態で PWA 起動
  2. Service Worker からキャッシュ読込み
  3. 通常の証明生成フローを実行
  4. ネットワーク復旧時に状態同期
- **成功条件**: 完全オフラインでの証明生成

## 6. 機能要求  
| ID | 要求 | 受入基準 |
|----|------|----------|
| FR‑SP‑01 | PWA として動作し、ホーム画面インストール可能 | Lighthouse PWA スコア ≥ 90 |
| FR‑SP‑02 | WebAuthn Level 2 対応ブラウザで Passkey 署名 | Chrome/Safari/Edge で動作確認 |
| FR‑SP‑03 | Circom/SnarkJS で 15秒以内に証明生成 | M1 MacBook 1コアで性能測定 |  
| FR‑SP‑04 | PDF/A‑3 に `proof.json` を添付ファイルとして埋込み | ISO 19005-3 準拠・Adobe Reader で開閲 |
| FR‑SP‑05 | 年度別回路ファイル（2025, 2026, ...）に対応 | 各年度で独立した証明生成 |
| FR‑SP‑06 | 完全オフライン動作（Service Worker） | 機内モードで証明生成成功 |
| FR‑SP‑07 | 証明生成履歴をローカル保存・表示 | IndexedDB に履歴保存・管理画面 |
| **FR‑SP‑08** | **Passkey データを含む QR コード生成** | **qrcode.js で 500ms 以内** |
| **FR‑SP‑09** | **QR コード画面表示・管理者提示** | **高コントラスト・読取り最適化** |
| **FR‑SP‑10** | **QR データ整合性検証機能** | **SHA-3 チェックサム埋込み** |
| **FR‑SP‑11** | **QR エクスポート履歴管理** | **重複エクスポート防止** |

## 7. 非機能要求  
| カテゴリ | 指標 | 目標値 | 測定方法 |
|----------|------|--------|----------|
| **パフォーマンス** | PWA 初回起動時間 | ≤ 3秒 | Lighthouse Performance |
| **パフォーマンス** | ZKP 証明生成時間 | ≤ 15秒 @ M1/1コア | 実機ベンチマーク |
| **パフォーマンス** | PDF 埋込み処理時間 | ≤ 2秒 | pdf-lib 処理時間測定 |
| **パフォーマンス** | **QR コード生成時間** | **≤ 500ms** | **qrcode.js 測定** |
| **可用性** | オフライン可用性 | 100% | Service Worker キャッシュ |
| **セキュリティ** | Passkey 秘密鍵保護 | ハードウェア保護 | WebAuthn L2 準拠 |
| **ユーザビリティ** | 証明生成成功率 | ≥ 95% | 100サンプル実測 |
| **ユーザビリティ** | **QR 読取り成功率** | **≥ 95%** | **正常照明条件** |
| **互換性** | ブラウザサポート | Chrome 111+, Safari 16.4+, Edge 111+ | Can I Use 確認 |
| **ストレージ** | ローカルストレージ上限 | ≤ 100MB/年度 | 回路ファイル + 履歴 |
| **プライバシー** | **QR データ保護** | **一時表示のみ** | **永続化禁止** |

## 8. セキュリティ要求
### 8.1 認証・認可
- **SR‑01**: WebAuthn Level 2 準拠の Passkey 認証必須
- **SR‑02**: 秘密鍵は端末内 Secure Element/TPM に保護
- **SR‑03**: 証明生成には毎回生体認証・PIN認証必須

### 8.2 データ保護  
- **SR‑04**: 秘密鍵・署名の永続化禁止（メモリ上のみ）
- **SR‑05**: 回路ファイルの整合性検証（SHA-3ハッシュ）
- **SR‑06**: Content Security Policy (CSP) Strict モード
- **SR‑07**: **QR コード データの一時表示のみ（保存禁止）**
- **SR‑08**: **QR ペイロードの暗号学的整合性検証**

### 8.3 プライバシー
- **SR‑09**: 学生の個人情報は外部送信しない
- **SR‑10**: 証明内容は Zero-Knowledge で保護
- **SR‑11**: 追跡・分析ツールの使用禁止
- **SR‑12**: **QR コード生成は完全ローカル処理**

## 9. QR コード要求
### 9.1 QR コード仕様
- **QR‑01**: QR Code 2005 (ISO/IEC 18004) 準拠
- **QR‑02**: エラー訂正レベル M (15% 復旧能力)
- **QR‑03**: Version 3 (33x33 モジュール、~900文字)
- **QR‑04**: 高コントラスト表示（黒/白、背景明確化）
- **QR‑05**: UTF-8 JSON エンコーディング

### 9.2 QR データ構造要求
```json
{
  "version": "2.2",
  "type": "passkey_export",
  "studentId": "string",
  "year": "number", 
  "passkey": {
    "publicKey": "base64-cose-key",
    "credentialId": "base64-credential-id",
    "algorithm": "number"
  },
  "metadata": {
    "name": "string",
    "email": "string",
    "generatedAt": "timestamp"
  },
  "integrity": {
    "checksum": "sha3-512-hash"
  }
}
```

### 9.3 QR セキュリティ要求
- **QR‑SEC‑01**: チェックサム による データ整合性保証
- **QR‑SEC‑02**: タイムスタンプ による 有効期限管理
- **QR‑SEC‑03**: 学生ID による 重複検出対応
- **QR‑SEC‑04**: 機密データの除外（秘密鍵等は含めない）

## 10. PWA 要求
### 10.1 インストール性
- **PWA‑01**: Web App Manifest による ホーム画面追加
- **PWA‑02**: Service Worker による オフライン対応
- **PWA‑03**: 適切なアイコン・スプラッシュ画面

### 10.2 オフライン機能
- **PWA‑04**: 回路ファイル・VK の事前キャッシュ
- **PWA‑05**: 証明生成の完全オフライン実行
- **PWA‑06**: ネットワーク復旧時の状態同期
- **PWA‑07**: **QR コード生成のオフライン対応**

## 11. データ要求
### 11.1 ローカルストレージ構造
```typescript
// localStorage (設定・軽量データ)
interface LocalStorageData {
  'zk-cert.passkey': PasskeyCredentials;
  'zk-cert.settings': UserSettings;
  'zk-cert.last-year': number;
  'zk-cert.qr-export-history': QRExportHistory[];
}

// IndexedDB (大容量・構造化データ)
interface IndexedDBStores {
  circuits: {  // 回路ファイルストア
    keyPath: 'year';
    data: {
      year: number;
      wasmBuffer: ArrayBuffer;
      zkeyBuffer: ArrayBuffer; 
      vkObject: VerifyingKey;
      downloadedAt: Date;
    };
  };
  
  proofHistory: {  // 証明履歴ストア
    keyPath: 'proofId';
    data: {
      proofId: string;
      year: number;
      pdfName: string;
      destination: string;
      expiry: Date;
      createdAt: Date;
      status: 'success' | 'failed';
    };
  };
  
  qrExportHistory: {  // QR エクスポート履歴
    keyPath: 'exportId';
    data: {
      exportId: string;
      year: number;
      studentId: string;
      exportedAt: Date;
      status: 'generated' | 'scanned' | 'expired';
      qrDataHash: string;
    };
  };
}
```

### 11.2 回路ファイル取得
- **年度別URL**: `https://circuits.zk-cert.framework/Document{YEAR}.wasm`
- **整合性検証**: SHA-3-512 ハッシュによる検証
- **フォールバック**: GitHub Releases からの取得

## 12. 受入基準  
### 12.1 機能テスト
- [ ] 全機能要求（FR‑SP‑01 〜 FR‑SP‑11）が PASS
- [ ] 3種類のブラウザ（Chrome, Safari, Edge）で動作確認
- [ ] 10パターンの PDF 形式で証明生成成功
- [ ] オフライン状態で証明生成成功
- [ ] **QR コード生成・表示が正常動作**
- [ ] **管理者による QR スキャンが成功**

### 12.2 性能テスト  
- [ ] Lighthouse PWA スコア ≥ 90
- [ ] 証明生成時間 ≤ 15秒（M1 MacBook）
- [ ] 初回起動時間 ≤ 3秒
- [ ] メモリ使用量 ≤ 512MB
- [ ] **QR 生成時間 ≤ 500ms**

### 12.3 セキュリティテスト
- [ ] CSP レポート違反 0件
- [ ] WebAuthn 攻撃シナリオ耐性確認
- [ ] 静的解析ツール（ESLint Security）クリア
- [ ] **QR データ整合性検証テスト**
- [ ] **QR コード 一時表示のみ確認**

### 12.4 ユーザビリティテスト
- [ ] **QR コード読取り成功率 ≥ 95%（正常照明）**
- [ ] **QR 表示 UI の視認性確認**
- [ ] **エクスポート操作の直感性確認**

## 13. 制約・前提条件
### 13.1 技術制約
- **WebAuthn Level 2** 対応ブラウザ必須
- **WASM** サポート必須（Circom/SnarkJS）
- **IndexedDB** 100MB 以上の容量確保
- **Service Worker** 対応（HTTPS必須）
- **Canvas API** 対応（QR コード生成）

### 13.2 運用制約  
- **年度更新**: 各年度開始前に新回路ファイル配布
- **デバイス制限**: 登録 Passkey デバイス紛失時の再登録フロー
- **ブラウザ更新**: WebAuthn 仕様変更への対応
- **QR 表示**: 学生デバイスの画面・カメラ品質に依存

## 14. リスク・対策
| リスク | 影響度 | 対策 |
|--------|--------|------|
| WebAuthn デバイス紛失 | 高 | 複数デバイス登録 + 再登録フロー |
| 回路ファイル破損 | 中 | 複数ソースからの取得 + 整合性検証 |
| ブラウザ非対応 | 中 | 機能検出 + 代替手段案内 |
| WASM パフォーマンス | 低 | Web Workers + 最適化 |
| **QR 読取り失敗** | **中** | **複数回生成 + 表示品質向上** |
| **画面品質不良** | **低** | **表示ガイダンス + 環境改善案内** |

---
