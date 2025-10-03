## Tri-CertFramework アプリ概要（初心者向け）

### TL;DR
- **executive-console**: デスクトップ運用ツール（Tauri + React）。年度別 Verification Key(VK) を生成・インポート・ハッシュ化・バンドル出力。
- **prover**: 学生（提出者）側。PDFを正規化→SHA3-512ハッシュ→Circom回路でZK証明→WebAuthnで電子署名→PDFにすべて格納。
- **verifier-ui**: 受領側。PDFから証明/鍵/署名を抽出し、ZKP・WebAuthn・PDFハッシュ・VKハッシュの4軸で検証。

---

## 全体像（Phase 0 プロトタイプ）
- **配布**: 運用者が年度別の VK を発行（executive-console）して配る
- **生成**: 提出者が VK を使って PDF に対する ZK 証明と WebAuthn 署名を付与（prover）
- **検証**: 受領者が PDF を読み込み、ZKP/署名/ハッシュ/VK 整合性を検証（verifier-ui）

この段階では、PDF本体は変更せず、メタデータに証明類を格納する簡易方式を採用しています（安定性と実装コストのバランス）。

---

## executive-console（運用者コンソール）

- 技術: React 19 + Vite 7 + Tauri v2（macOS/Windows デスクトップ）
- 目的: 年度別 VK の生成・管理・配布

### 主要機能
- **VK 生成**: 既定の `vkey.json` を基に年度メタデータを付与し、VK ハッシュ（SHA3-256）を算出
- **VK 管理**: 一覧表示、削除、インポート（JSON）、ハッシュの個別保存（txt）
- **バンドル出力**: 複数 VK を `vk_bundle_verified.json` として一括エクスポート

### 使い方の流れ
1. 左メニュー「VK 生成」で年度を指定して VK を作成
2. 「VK 管理」で一覧を確認、必要なら外部の VK をインポート
3. `VK DL`（JSON）や `Hash DL`（txt）で保存
4. 配布用に「検証ずみバンドルをエクスポート」を作成

### 留意点
- Phase 0 ではモックVKも許容。実運用では鍵生成・保管手順を厳格化すること（秘密管理・監査証跡）。

---

## prover（証明生成 + WebAuthn署名 + PDF出力）

- 技術: Next.js 15 + React 19、`snarkjs`、`pdf-lib`、WebAuthn（ブラウザ内実行）
- 目的: PDFに対するゼロ知識証明と端末生体認証署名の付与

### 主要処理フロー
1. **PDF正規化とSHA3-512**
   - タイトル/作成者など可変メタデータを空、日時を Epoch に固定してから SHA3-512 を計算
2. **ZK証明生成**（Circom Groth16）
   - 既定の `commitment.wasm` と `commitment_final.zkey` を使用（年度別アセットがあれば自動検出して切替）
   - 入力: `owner_secret`, `pdf_sha3_512`（必要に応じ `graduation_year`）
3. **WebAuthn 署名**
   - `sig_target`（回路ID / VKハッシュ / PDFハッシュ等）をチャレンジにして認証器で署名
4. **PDFへ格納**
   - `proof.json`, `vkey.json`, `webauthn_sig.json`, `webauthn_pub.jwk.json`, `sig_target.json` を PDF メタデータ（Subject）に格納

### 使い方の流れ
1. PDF を選択
2. 秘密（owner_secret）と卒業年度を入力
3. 配布された VK を選択（未指定時は `public/vkey.json`）
4. WebAuthn を登録/選択 → 生成実行 → `*-secured.pdf` をダウンロード

### 公開ディレクトリに必要なもの（例）
- `public/commitment_js/commitment.wasm`
- `public/commitment_final.zkey`
- `public/vkey.json`
- 年度別運用時: `commitment_<year>.wasm`, `commitment_final_<year>.zkey`, `vkey_<year>.json`

---

## verifier-ui（検証UI）

- 技術: Next.js 15 + React 19、`snarkjs`、`pdf-lib`、WebAuthn 検証（Web Crypto）
- 目的: PDF から抽出したデータで 4 つの検証を行い、妥当性を可視化

### 検証の4軸
1. **ZKP妥当性**: `snarkjs.groth16.verify` で証明と公開信号の検証
2. **WebAuthn署名妥当性**: `sig_target` を challenge として ECDSA(SHA-256) で検証
3. **PDFハッシュ一致**: PDFを正規化→SHA3-512→`proof.public_signals.pdf_sha3_512` と一致
4. **VKハッシュ一致**: VK の SHA3-256 と `proof.vkey_hash` の一致

### 使い方の流れ
1. PDF をアップロード（内部の格納データを抽出）
2. 必要に応じて VK と 公開鍵(JWK) を指定（PDF内に含まれていれば不要）
3. 検証ボタンで 4 軸の結果を表示（詳細メッセージ付き）

---

## セキュリティと品質（Phase 0 最低限）
- **入力正規化**: Prover/Verifier で同一の PDF 正規化手順を踏むことでハッシュの安定性を担保
- **VKハッシュ**: 配布中の VK 改ざん検出の最低ライン
- **WebAuthn**: 作成者のデバイス生体認証により署名者の真正性を補強
- 次段階では、鍵の供給チェーン、回路の年次分離、失効/ローテーション、署名ポリシー強化を導入

---

## 具体例（5分クイックスタート）
1) 運用者: executive-console で 2026 年度 VK を生成 → `vkey_2026.json` を配布
2) 提出者: prover に `vkey_2026.json` を読み込ませ、PDF と 秘密 と 年度=2026 を指定 → `xxx-secured.pdf` 作成
3) 受領者: verifier-ui で `xxx-secured.pdf` をアップロード → 必要なら `vkey_2026.json` と `webauthn_pub.jwk.json` を指定 → 検証結果を確認

---

## 補足
- 実運用では、VK 生成・保管時の秘密管理、監査、配布経路の完全性確保（署名・ハッシュ公開等）を推奨します。
- 本ドキュメントは Phase 0 時点の仕様説明です。以降のフェーズで構成やAPIは進化します。


