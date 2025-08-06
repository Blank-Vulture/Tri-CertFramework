# ソフトウェア要件定義書 (SRS) — Tri-CertFramework プロトタイプ版
**版 2.3  最終更新: 2025-07-23**

---

## 1. 目的
本書では、**段階的移行対応プロトタイプ**として、**Trust Minimized・2025年度対応**な三層認証書類真正性証明システムを定義する。dev-planに基づき、**ローカルVK → ブロックチェーンVKの段階的移行**、**Phase 0（2システム）→ Phase 1（3システム）→ Phase 2（4システム）の段階的構築**により実装する。学生が**ブラウザのみ**でCircom回路とSnarkJSによりZKP証明を生成し、パスキーで電子署名を付与、**検証者は段階的に進歩するVK取得方法と検証鍵リポジトリ**で三層認証（ZKP + ブロックチェーン + 電子署名）を確認できる。

## 2. スコープ
### 含まれる（段階的移行対応）
* **Phase 0（基盤）**: Scholar Prover PWA + Verifier UI SSG + **段階的VK取得機能**
* **Phase 1（ブロックチェーン統合）**: + Executive Console Tauri + **完全ブロックチェーン統合**
* **Phase 2（完全システム）**: + Registrar Console Tauri + **検証鍵レジストリ管理** + **4システム完全統合**
* **段階的移行機能**: ローカルVK → ブロックチェーンVK → ハイブリッドモード
* **電子署名機能**: パスキー電子署名生成・検証、検証鍵リポジトリ管理
* **配布方法**: **GitHub Pages** (Verifier UI) + **GitHub Releases** (Tauriアプリ・回路ファイル)
* **デモ機能**: 各段階での価値確認 + 教授向け最終デモンストレーション

### 含まれない
* 複数年度対応（2025年度に特化）
* 詳細なエラーハンドリング・監査ログ（ハッピーパステスト重視）
* 高度なパフォーマンス最適化
* 完全オフライン検証機能（Service Worker複雑実装回避）
* 多言語対応・アクセシビリティ
* 包括的なユニット・E2Eテスト（段階的手動テスト重視）
* メインネット対応（経費節約のためCardonaテストネットのみ）

## 3. 用語定義
| 用語 | 定義 |
|------|------|
| **段階的移行プロトタイプ** | Phase 0→1→2の段階的開発で最終的に完全システムを構築 |
| **Phase 0** | Scholar Prover + Verifier UI + 段階的VK取得機能 |
| **Phase 1** | + Executive Console + ブロックチェーン統合 |
| **Phase 2** | + Registrar Console + 4システム完全統合 |
| **段階的VK取得** | ローカル・ブロックチェーン・ハイブリッドの3つの選択肢 |
| **Cardonaテストネット** | 経費節約目的でのPolygon zkEVMテストネット環境利用 |
| **GitHub Releases配布** | IPFSに代わる回路ファイル配布方法 |
| **Trust Minimized移行** | ローカル → ブロックチェーン → 完全分散化の段階的移行 |

## 4. 利害関係者と関心事
* **教授** – 段階的価値確認；各段階での研究コンセプト理解；最終デモでの完全システム体験
* **学生（デモ用）** – Phase 0での基本体験 → Phase 1でのブロックチェーン体験 → Phase 2での完全体験
* **管理者（デモ用）** – Phase 1でのExecutive Console体験 → Phase 2でのRegistrar Console体験
* **検証者（デモ用）** – 段階的VK取得体験；ローカル → ブロックチェーン移行の実感

## 5. 段階的システム・アーキテクチャ（dev-plan準拠）

### 5.1 Phase 0: 基盤システム
#### 証明者システム（Scholar Prover PWA）
- **タイプ**: Progressive Web App (PWA) - 段階的移行対応版
- **目的**: 基本的なZKP生成とPDF埋め込み + **段階的VK取得機能**
- **VK取得方法**: ローカルファイル選択（基本）+ ブロックチェーン対応（準備）
- **UI**: VK取得方法選択ボタン（ローカル・ブロックチェーン・ハイブリッド）

#### 検証者システム（Verifier UI SSG）
- **タイプ**: 静的サイト（Next.js 15 SSG）
- **目的**: 段階的VK検証 + PDF検証
- **VK取得方法**: ローカルファイル選択 → ブロックチェーン取得 → ハイブリッド
- **配布**: **GitHub Pages**

### 5.2 Phase 1: ブロックチェーン統合
#### 責任者システム（Executive Console Tauri）
- **タイプ**: Tauriデスクトップアプリケーション
- **目的**: VKManager.solデプロイ + VKブロックチェーン保存
- **認証**: Ledger Nano X必須
- **機能**: スマートコントラクトデプロイ + VKアップロード

#### ブロックチェーン統合
- **ネットワーク**: Polygon zkEVM Cardona
- **コントラクト**: VKManager.sol（VK管理）
- **Scholar Prover・Verifier UI**: ブロックチェーンVK取得機能完全実装

### 5.3 Phase 2: 完全システム統合
#### 管理者システム（Registrar Console Tauri）
- **タイプ**: Tauriデスクトップアプリケーション
- **目的**: 学生データ管理 + Merkle Tree構築
- **機能**: StudentDataManager + MerkleTreeBuilder + DataExporter

#### 4システム完全統合
- **完全Trust Minimized**: ブロックチェーン中心設計
- **Merkle Tree統合**: MerkleManager.sol
- **教授デモ**: 完全システムの威力実演

## 6. 段階的ユースケース概要（dev-plan対応）

### Phase 0ユースケース
1. **UC-P0-01 ローカルVK選択・ZKP生成・PDF埋め込み**（Scholar Prover）
2. **UC-P0-02 ローカルVK選択・PDF検証**（Verifier UI）
3. **UC-P0-03 段階的VK取得方法選択**（両システム）

### Phase 1ユースケース
4. **UC-P1-01 Ledger認証・VKManagerデプロイ**（Executive Console）
5. **UC-P1-02 VKブロックチェーン保存**（Executive Console）
6. **UC-P1-03 ブロックチェーンVK取得・ZKP生成**（Scholar Prover）
7. **UC-P1-04 ブロックチェーンVK取得・PDF検証**（Verifier UI）

### Phase 2ユースケース
8. **UC-P2-01 学生データ管理・Merkle Tree構築**（Registrar Console）
9. **UC-P2-02 4システム完全統合動作**（全システム）
10. **UC-P2-03 教授向け完全デモンストレーション**（全システム統合）

## 7. 機能要求 - 段階的移行版（dev-plan準拠）

### Phase 0機能要求
| ID | 要求 | 実装 | 段階的移行内容 |
|----|------|------|---------------|
| FR-P0-01 | 段階的VK取得方法選択UI | Scholar Prover・Verifier UI | ローカル・ブロックチェーン・ハイブリッド選択 |
| FR-P0-02 | ローカルVKファイル選択・読み込み | 両システム | 基本機能 |
| FR-P0-03 | ZKP生成・PDF埋め込み | Scholar Prover | 基本ZKP機能 |
| FR-P0-04 | PDF検証・結果表示 | Verifier UI | 基本検証機能 |
| FR-P0-05 | 段階的設定管理（PhaseManager） | 両システム | フェーズ設定切り替え |

### Phase 1機能要求
| ID | 要求 | 実装 | ブロックチェーン統合内容 |
|----|------|------|----------------------|
| FR-P1-01 | Ledger Nano X認証 | Executive Console | ハードウェア認証 |
| FR-P1-02 | VKManager.solデプロイ | Executive Console | スマートコントラクト |
| FR-P1-03 | VKブロックチェーン保存 | Executive Console | VK管理 |
| FR-P1-04 | ブロックチェーンVK取得 | Scholar Prover・Verifier UI | 完全Trust Minimized |
| FR-P1-05 | ハイブリッドVK取得（フォールバック） | 両システム | 堅牢性確保 |

### Phase 2機能要求
| ID | 要求 | 実装 | 完全統合内容 |
|----|------|------|-------------|
| FR-P2-01 | 学生データ管理 | Registrar Console | StudentDataManager |
| FR-P2-02 | Merkle Tree構築 | Registrar Console | MerkleTreeBuilder |
| FR-P2-03 | MerkleManager.solデプロイ | Executive Console | Merkle Root管理 |
| FR-P2-04 | 4システム完全統合 | 全システム | システム間連携 |
| FR-P2-05 | 教授デモンストレーション | 全システム | 完全価値実演 |

## 8. 非機能要求 - 段階的移行版（段階的品質向上）

### Phase 0非機能要求
| 分類 | 指標 | 目標 | 備考 |
|----|------|------|------|
| **学習効率** | 理解時間 | 30分以内 | 基本概念の把握 |
| **動作確認** | 成功率 | 90%以上 | ハッピーパス重視 |
| **エラー処理** | 表示 | 基本的なメッセージ | 詳細は最小限 |

### Phase 1非機能要求
| 分類 | 指標 | 目標 | 備考 |
|----|------|------|------|
| **ブロックチェーン連携** | 接続成功率 | 95%以上 | Cardona安定性 |
| **Ledger認証** | 認証時間 | 30秒以内 | ユーザビリティ重視 |
| **Trust Minimized実感** | 理解度 | 教授が納得 | 価値の実感 |

### Phase 2非機能要求
| 分類 | 指標 | 目標 | 備考 |
|----|------|------|------|
| **システム統合** | 連携成功率 | 98%以上 | 完全システム動作 |
| **デモンストレーション** | 成功率 | 100% | 教授向け完璧デモ |
| **実用性** | 運用可能性 | 大学での採用検討可能 | 実用レベル |

## 9. 段階的開発スケジュール

### Phase 0: 基盤構築（2週間）
- Week 1: プロジェクトセットアップ + 段階的設定システム
- Week 2: 基本ZKP機能 + 段階的VK取得UI

### Phase 1: ブロックチェーン統合（3週間）
- Week 1: Executive Console基盤 + Ledger統合
- Week 2: スマートコントラクト統合
- Week 3: ブロックチェーンVK取得統合

### Phase 2: 完全システム（3週間）
- Week 1: Registrar Console基盤
- Week 2: Merkle Tree統合
- Week 3: 4システム統合 + 教授デモ準備

## 10. 成功基準

### Phase 0成功基準
- [ ] 段階的VK取得方法選択機能動作
- [ ] ローカルVK選択・ZKP生成・PDF検証成功
- [ ] 基本概念の理解・早期成功体験

### Phase 1成功基準
- [ ] Ledger Nano X認証成功
- [ ] VKブロックチェーン保存・取得成功
- [ ] Trust Minimized設計の実感

### Phase 2成功基準
- [ ] 4システム完全統合成功
- [ ] 教授向けデモンストレーション成功
- [ ] 実用可能なプロトタイプ完成

---

**段階的移行プロトタイプ目標**: Phase 0で基本概念を実証し、Phase 1でTrust Minimized設計を実感し、Phase 2で完全なシステムの威力を教授にデモンストレーションする。 