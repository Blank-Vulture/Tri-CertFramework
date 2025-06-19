# 要件定義書 (SRS) — Scholar Prover  
**zk‑CertFramework / 証明者システム** 最終更新: 2025-06-17 (Version 2.0)

## 1. 目的  
Scholar Prover は学生が **ブラウザのみで完結する PWA** として
1) WebAuthn Passkey（ES‑256）署名を生成し、
2) Circom 回路 + SnarkJS により ZKP を作成、
3) 生成した `proof.json` を PDF/A‑3 に埋め込む。
**完全バックエンドレス** で本人が何度でも一時証明を作れる環境を提供する。

## 2. スコープ  
| 含む | 含まれない |
|------|------------|
| WebAuthn Passkey 署名 (navigator.credentials.get) | Passkey 初回登録UI |
| Circom + SnarkJS Groth16 証明生成 | サーバー側検証 |
| PDF/A‑3 添付ファイル埋込み | PDF 電子署名 |
| PWA オフライン動作 | ネイティブアプリ化 |
| 年度別回路ファイル対応 | 回路ファイル編集機能 |

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

### 5.2 UC‑SP‑02: ZKP 証明生成
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

### 5.3 UC‑SP‑03: オフライン証明生成
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

## 7. 非機能要求  
| カテゴリ | 指標 | 目標値 | 測定方法 |
|----------|------|--------|----------|
| **パフォーマンス** | PWA 初回起動時間 | ≤ 3秒 | Lighthouse Performance |
| **パフォーマンス** | ZKP 証明生成時間 | ≤ 15秒 @ M1/1コア | 実機ベンチマーク |
| **パフォーマンス** | PDF 埋込み処理時間 | ≤ 2秒 | pdf-lib 処理時間測定 |
| **可用性** | オフライン可用性 | 100% | Service Worker キャッシュ |
| **セキュリティ** | Passkey 秘密鍵保護 | ハードウェア保護 | WebAuthn L2 準拠 |
| **ユーザビリティ** | 証明生成成功率 | ≥ 95% | 100サンプル実測 |
| **互換性** | ブラウザサポート | Chrome 111+, Safari 16.4+, Edge 111+ | Can I Use 確認 |
| **ストレージ** | ローカルストレージ上限 | ≤ 100MB/年度 | 回路ファイル + 履歴 |

## 8. セキュリティ要求
### 8.1 認証・認可
- **SR‑01**: WebAuthn Level 2 準拠の Passkey 認証必須
- **SR‑02**: 秘密鍵は端末内 Secure Element/TPM に保護
- **SR‑03**: 証明生成には毎回生体認証・PIN認証必須

### 8.2 データ保護  
- **SR‑04**: 秘密鍵・署名の永続化禁止（メモリ上のみ）
- **SR‑05**: 回路ファイルの整合性検証（SHA-3ハッシュ）
- **SR‑06**: Content Security Policy (CSP) Strict モード

### 8.3 プライバシー
- **SR‑07**: 学生の個人情報は外部送信しない
- **SR‑08**: 証明内容は Zero-Knowledge で保護
- **SR‑09**: 追跡・分析ツールの使用禁止

## 9. PWA 要求
### 9.1 インストール性
- **PWA‑01**: Web App Manifest による ホーム画面追加
- **PWA‑02**: Service Worker による オフライン対応
- **PWA‑03**: 適切なアイコン・スプラッシュ画面

### 9.2 オフライン機能
- **PWA‑04**: 回路ファイル・VK の事前キャッシュ
- **PWA‑05**: 証明生成の完全オフライン実行
- **PWA‑06**: ネットワーク復旧時の状態同期

## 10. データ要求
### 10.1 ローカルストレージ構造
```typescript
// localStorage (設定・軽量データ)
interface LocalStorageData {
  'zk-cert.passkey': PasskeyCredentials;
  'zk-cert.settings': UserSettings;
  'zk-cert.last-year': number;
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
}
```

### 10.2 回路ファイル取得
- **年度別URL**: `https://circuits.zk-cert.framework/Document{YEAR}.wasm`
- **整合性検証**: SHA-3-512 ハッシュによる検証
- **フォールバック**: GitHub Releases からの取得

## 11. 受入基準  
### 11.1 機能テスト
- [ ] 全機能要求（FR‑SP‑01 〜 FR‑SP‑07）が PASS
- [ ] 3種類のブラウザ（Chrome, Safari, Edge）で動作確認
- [ ] 10パターンの PDF 形式で証明生成成功
- [ ] オフライン状態で証明生成成功

### 11.2 性能テスト  
- [ ] Lighthouse PWA スコア ≥ 90
- [ ] 証明生成時間 ≤ 15秒（M1 MacBook）
- [ ] 初回起動時間 ≤ 3秒
- [ ] メモリ使用量 ≤ 512MB

### 11.3 セキュリティテスト
- [ ] CSP レポート違反 0件
- [ ] WebAuthn 攻撃シナリオ耐性確認
- [ ] 静的解析ツール（ESLint Security）クリア

## 12. 制約・前提条件
### 12.1 技術制約
- **WebAuthn Level 2** 対応ブラウザ必須
- **WASM** サポート必須（Circom/SnarkJS）
- **IndexedDB** 100MB 以上の容量確保
- **Service Worker** 対応（HTTPS必須）

### 12.2 運用制約  
- **年度更新**: 各年度開始前に新回路ファイル配布
- **デバイス制限**: 登録 Passkey デバイス紛失時の再登録フロー
- **ブラウザ更新**: WebAuthn 仕様変更への対応

## 13. リスク・対策
| リスク | 影響度 | 対策 |
|--------|--------|------|
| WebAuthn デバイス紛失 | 高 | 複数デバイス登録 + 再登録フロー |
| 回路ファイル破損 | 中 | 複数ソースからの取得 + 整合性検証 |
| ブラウザ非対応 | 中 | 機能検出 + 代替手段案内 |
| WASM パフォーマンス | 低 | Web Workers + 最適化 |

---
