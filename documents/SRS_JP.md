# ソフトウェア要件定義書 (SRS) — ZKP 付き卒業証書システム
**版 2.0  最終更新: 2025‑06‑17**

---

## 1. 目的
本書では、**Trust Minimized・完全バックエンドレス**な卒業証書システムを定義する。学生本人のみがCircom回路とSnarkJSを使用して時限付きゼロ知識証明を生成し、**Ledger Nano X ハードウェアセキュリティ**による管理者操作を実現する。検証者はPDFファイルとPolygon zkEVMオンチェーンデータのみで真正性を確認できる。

## 2. スコープ
### 含まれる
* **Scholar Prover (PWA)**: Passkey登録 + Circom/SnarkJS証明生成 + PDF/A‑3埋め込み
* **Executive Console (Electron)**: Ledger保護による年度回路デプロイ + VK管理
* **Registrar Console (Electron)**: ローカル学生キー管理 + Merkle tree + PDF一括生成
* **Verifier UI (SSG)**: SnarkJS + オンチェーンVK検証によるオフライン検証
* **年度別独立性**: 卒業年度間（2025, 2026等）の完全分離

### 含まれない
* バックエンドサーバーまたはデータベース
* クラウドサービスや外部ストレージ（IPFS、AWS等）
* モバイルネイティブアプリケーション
* 複雑なキーローテーション仕組み
* 年度間依存関係

## 3. 用語定義
| 用語 | 定義 |
|------|------|
| **Passkey** | WebAuthn/FIDO2資格情報（ES‑256）をブラウザに保存 |
| **Commit** | Poseidon256(pk_passkey) → 32 bytes |
| **YearlySet** | 各卒業年度向けの独立した回路 + VK + NFT |
| **Proof** | Circom/SnarkJS Groth16証明、~2KB JSON |
| **Ledger EIP-191** | 管理者認証用ハードウェア署名パーソナルメッセージ |
| **Trust Minimization** | パブリックブロックチェーン以外の外部依存性ゼロ |

## 4. 利害関係者と関心事
* **学生** – 検証可能な証明書生成；ガス代なし、CLI不要、ブラウザのみ体験
* **教授** – Ledger Nano X使用による年度回路デプロイ；最小セットアップ複雑性
* **職員（登録係）** – ローカル学生データ管理；一括PDF生成
* **企業** – PDFドラッグ&ドロップで即座にオフライン真正性検証
* **ブロックチェーン（Polygon zkEVM）** – 年度NFT保存；公開検証可能性提供

## 5. 4コンポーネント・アーキテクチャ

### 5.1 Scholar Prover（学生インターフェース）
- **タイプ**: Progressive Web App (PWA)
- **目的**: ZKP生成とPDF埋め込み
- **ストレージ**: ブラウザlocalStorage + IndexedDB
- **依存性**: WebAuthn + Circom WASM + pdf-lib

### 5.2 Executive Console（管理者インターフェース）
- **タイプ**: Electronデスクトップアプリケーション
- **目的**: Ledgerセキュリティによる年度回路デプロイ
- **ストレージ**: ローカルJSONファイル + 回路ファイル
- **依存性**: Ledger Nano X + Web3 + Circomコンパイラー

### 5.3 Registrar Console（職員インターフェース）
- **タイプ**: Electronデスクトップアプリケーション
- **目的**: 学生キー管理 + PDF生成
- **ストレージ**: ローカルJSONファイル + 生成PDF
- **依存性**: Poseidonハッシュ + PDF生成ライブラリ

### 5.4 Verifier UI（企業インターフェース）
- **タイプ**: 静的サイト（Next.js SSG）
- **目的**: 証明書検証
- **ストレージ**: 永続ストレージなし
- **依存性**: SnarkJS検証 + Polygon zkEVM RPC

## 6. ユースケース概要
1. **UC‑01 学生Passkey登録**（Scholar Prover）
2. **UC‑02 年度回路デプロイ**（Executive Console + Ledger）
3. **UC‑03 学生キーインポート & Merkle Tree**（Registrar Console）
4. **UC‑04 ZKP生成 & PDF埋め込み**（Scholar Prover）
5. **UC‑05 証明書検証**（Verifier UI）

## 7. 機能要求
| ID | 要求 | 実装 | 適合基準（TestID） |
|----|------|------|------------------|
| FR‑01 | システムはSnarkJS `proof.json`をPDF/A‑3に埋め込むこと | Scholar Prover | TC‑P01 |
| FR‑02 | 証明はCircom回路内でES‑256署名とMerkle包含を検証すること | 全回路 | TC‑P02 |
| FR‑03 | `expireTs < now()`時に証明は期限切れとなること | Verifier UI | TC‑N03 |
| FR‑04 | 検証者はYearNFTを照会し`vkHash`不一致時は拒否すること | Verifier UI | TC‑N04 |
| FR‑05 | 全管理者操作はLedger Nano X EIP-191署名を要求すること | Executive Console | TC‑P05 |
| FR‑06 | 各卒業年度は完全に独立していること | 全コンポーネント | TC‑P06 |
| FR‑07 | システムはバックエンドサーバーなしで動作すること | アーキテクチャ | TC‑P07 |

## 8. 非機能要求
| 分類 | 指標 | 目標 | 備考 |
|----|------|------|------|
| 性能 | Circom証明生成 | ≤ 10s @ M1/1‑core | SnarkJS WASM最適化 |
| 性能 | SnarkJS検証 | ≤ 100ms | ブラウザWASM |
| セキュリティ | 量子耐性 | SHA‑3‑512ハッシュ | 256ビット耐量子セキュリティ |
| セキュリティ | ハードウェアセキュリティ | Ledger Nano X必須 | EIP-191パーソナルメッセージ署名 |
| UX | オフライン検証 | 100%エアギャップ | ネットワーク依存性なし |
| Trust | 外部依存性 | Polygon zkEVMのみ | クラウドサービスゼロ |
| ストレージ | ローカルファイル制限 | <100MB/年 | 回路 + キーファイル |

## 9. セキュリティ要求

### 9.1 Trust Minimization原則
| 原則 | 実装 |
|------|------|
| **サーバーなし** | 全コンポーネントはローカル実行（Electron/PWA/SSG） |
| **データベースなし** | JSONファイル + ブラウザストレージのみ |
| **外部サービスなし** | 直接ブロックチェーンRPCのみ |
| **ハードウェアセキュリティ** | 全管理者操作にLedger Nano X |
| **年度別独立性** | 年度間共有秘密なし |

### 9.2 EIP-191セキュリティ実装
```
ドメイン: "zk-cert-framework.local"
メッセージ構造:
- 操作タイプ (deploy_yearly_set, etc.)
- タイムスタンプ（5分間有効ウィンドウ）
- Nonce（リプレイ攻撃防止）
- 年度と回路パラメータ
- ユーザー検証用警告メッセージ
```

## 10. 受入基準
- 全重要テストケース（TC‑P01…TC‑P07）が複数ブラウザで合格
- Ledger Nano X統合がWindows/macOS/Linuxで動作
- 完全エアギャップ検証が成功
- 年度回路デプロイが独立NFTコントラクトを作成
- ネットワーク監視で外部サービス呼び出しゼロを検出
- Electronアプリが単一実行ファイルにビルド

## 11. 制約
- **ハードウェア**: Executive ConsoleにLedger Nano X必須
- **ブラウザ**: Chrome 111+/Edge 111+/Safari 16.4+（WebAuthn Level 2）
- **ネットワーク**: Polygon zkEVM（本番環境用メインネット、テスト用Amoy）
- **ファイルサイズ**: 回路ファイル<50MB、証明ファイル<5MB
- **年度制限**: 卒業年度あたり最大10,000名学生

## 12. リスク管理
| ID | リスク | 確率 | 影響 | 軽減策 |
|----|------|------|------|-------|
| R‑1 | Passkeyデバイス紛失 | 中 | 高 | 再登録フロー + Merkleルート更新 |
| R‑2 | Ledgerサプライチェーン攻撃 | 低 | 重大 | ファームウェア検証 + 安全配送 |
| R‑3 | Circom回路バグ | 中 | 高 | 形式検証 + 広範囲テスト |
| R‑4 | ブラウザ互換性 | 低 | 中 | 機能検出 + グレースフル劣化 |
| R‑5 | Polygon zkEVM停止 | 低 | 中 | ローカル検証モード + RPCフォールバック |

## 13. コンプライアンスと標準
- **PDF**: ISO 32000-2（PDF 2.0）+ ISO 19005-3（PDF/A-3）
- **暗号**: FIPS 186-4（ES-256）、NIST SP 800-185（SHA-3）
- **WebAuthn**: W3C Web Authentication Level 2
- **ZKP**: Groth16（標準化済み）+ Powers of Tauセレモニー
- **EIP**: EIP-191（Ethereumパーソナルメッセージ署名）
