# Tri-CertFramework — Phase 0 統合仕様（最小プロトタイプ）
このフェーズの目的は「**PDF → ZKP 生成 → PDF/A-3 添付 → ローカル検証**」の縦切り導線を最短で成立させ、5分デモができる状態を作ること。

## 実装機能
- Scholar Proverの機能は
  - ZKPファイル生成/PDFへの添付
  - ZKP回路からVK生成/ローカルへエクスポート
  - パスキーを使ったPDFへの電子署名添付
  - パスキーの電子署名の検証鍵をローカルへエクスポート

- Verifier UIの機能は
  - VKをファイル指定してZKP検証
  - 電子署名の検証鍵を指定して電子署名検証

詳細仕様は[Phase0-Spec](Phase0-Spec.md)
## 1. スコープ / 目標（Phase 0）

- **必須コンポーネント**: Scholar Prover / Verifier UI（完全フロントエンド・ローカルJSON）
- **到達点**:
  1) 入力PDFから **ZKP（Groth16）** を生成し、`proof.json` を **PDF/A-3に添付**  
  2) **WebAuthn ES256** による JWS 署名 `sig.jws` を生成・PDFに添付  
  3) Verifier UI で **VK指定**して ZKP 検証、**公開鍵指定**して署名検証  
- **非スコープ（Phase 0では扱わない）**: ブロックチェーン統合、MPC、PAdES ネイティブ署名（Phase 1 以降で分岐）

---

## 2. 機能定義

### 2.1 Scholar Prover（必須）
- **ZKPファイル生成／PDFへの添付**  
  - Circom/snarkjs(Groth16) で `proof.json` を生成し PDF に添付
- **ZKP回路から VK 生成／ローカルへエクスポート**  
  - `vkey.json` と `vkey_hash(SHA3-256)` を出力（`proof.json` にも `vkey_hash` を埋め込む）
- **パスキー（WebAuthn ES256）で JWS 署名生成／PDFへ添付**  
  - 署名対象 `sig_target.json` を ES256(JWS) で署名 → `sig.jws` を添付
- **パスキーの検証鍵エクスポート**  
  - **JWK（EC P-256, alg: ES256）** もしくは **COSE_Key(JSON)** を出力（`kid` = credentialId 由来）

### 2.2 Verifier UI（必須）
- **VKファイル指定（またはPDF内添付抽出）で ZKP 検証**
- **公開鍵ファイル指定（またはPDF内添付抽出）で JWS 検証**

> **Phase 0 のハッシュ規則（自己参照回避）**  
> `pdf_sha3_512` は **「添付ファイルを除去したPDF本文」** に対する SHA3-512。  
> - Prover: 入力PDF（添付なし）をハッシュ化  
> - Verifier: 受領PDFから添付を一時除去 → 本文をハッシュ化 → `proof.json.public_signals.pdf_sha3_512` と一致確認

---

## 3. 成果物（実際の出力）

### 3.1 Scholar Prover の出力
- `out.pdf`（PDF/A-3）  
  - **必須添付**: `proof.json`, `sig.jws`  
  - **推奨添付**: `webauthn_pub.jwk.json`, `vkey.json`
- `proof.json`（例）
```json
{
  "schema": "tri-cert/proof@0",
  "circuit_id": "commitment_poseidon_v1",
  "vkey_hash": "sha3-256:...",
  "public_signals": {
    "pdf_sha3_512": "hex:...",
    "commit": "field:..."
  },
  "proof": { "pi_a": "...", "pi_b": "...", "pi_c": "..." }
}
```
- `vkey.json` / `vkey_hash.txt`（snarkjs 形式 + ハッシュ）
- `sig.jws`（ES256 / JWS compact 推奨）
- `sig_target.json`（署名対象；例）
```json
{
  "schema": "tri-cert/sig-target@0",
  "circuit_id": "commitment_poseidon_v1",
  "vkey_hash": "sha3-256:...",
  "pdf_sha3_512": "hex:...",
  "commit": "field:...",
  "issued_at": "2025-08-18T00:00:00Z"
}
```
- `webauthn_pub.jwk.json`（または COSE_Key JSON）

### 3.2 Verifier UI の出力（任意）
- `verify_report.json` — `ZKP: OK/NG`, `Signature: OK/NG`, 使用 `vkey_hash` / `kid` / 理由

---

## 4. 回路とデータ結合（最小方針）

- **回路（概念）**: `commit = Poseidon(owner_secret, pdf_sha3_512)`  
  - Poseidon（ZKフレンドリ）で **本文ハッシュ** と **秘密** を結合  
  - 公開シグナル: `pdf_sha3_512`, `commit`
- **結合規則**:  
  - Verifier で PDF から添付を除去 → `pdf_sha3_512` を再計算し、`proof.json` と一致確認  
  - `vkey_hash` を `proof.json` と `sig_target.json` に記録し、VKすり替えを検出

---

## 5. 検証フロー（Verifier UI）

1. PDFを受領 → **添付を一時除去** → 本文の `pdf_sha3_512` を計算  
2. PDFから `proof.json`（および `vkey.json`, `webauthn_pub.jwk.json`）を抽出  
3. `groth16.verify(vkey.json, proof.json)` を実行（snarkjs 互換）  
4. `sig.jws` を `webauthn_pub.jwk.json`（または指定鍵）で検証  
5. `pdf_sha3_512` / `vkey_hash` / `commit` の整合性をチェック → `verify_report.json`（任意）

---

## 6. ディレクトリ構成（統合案）

```
Tri-CertFramework/
├─ circuits/
│  ├─ commitment.circom
│  ├─ poseidon/            # 依存（サブモジュール可）
│  └─ build/               # wasm, zkey, vkey
├─ prover/                 # Scholar Prover（PWA/Tauri）
├─ verifier-ui/            # Next.js（ローカル検証）
├─ scripts/
│  ├─ hash-pdf.ts          # 添付除去 → SHA3-512
│  └─ pdf-attach.ts        # pdfcpu 呼び出し
└─ dev-plan/
   └─ Phase0-Integrated.md # 本ファイル
```

> **補足（v3の構成要素）**: Executive/Registrar コンソールは Phase 0 では任意（**VKの生成・JSONリスト管理のみ**なら軽量追加可）。実装する場合は `executive-console/`, `registrar-console/` を並置。

---

## 7. コマンド例

- **ZKP 検証（snarkjs 互換）**
```bash
snarkjs groth16 verify vkey.json public.json proof.json
```
- **PDF 添付操作（pdfcpu）**
```bash
# 添付
pdfcpu attachments add input.pdf proof.json sig.jws webauthn_pub.jwk.json -o out.pdf
# 添付一覧
pdfcpu attachments list out.pdf
# 添付除去（本文ハッシュ再計算時）
pdfcpu attachments remove out.pdf -o out_noattach.pdf
```

---

## 8. スケジュール（1週間目安）

- **Day 1–2**: Circom/snarkjs セットアップ、`commitment.circom` 実装、`vkey.json`/`proof.json` 生成  
- **Day 3–4**: Scholar Prover（PDF添付・JWS 署名生成）/ Verifier UI（抽出・検証UI）  
- **Day 5–7**: 統合テスト（同一PDF成功・1バイト改変失敗・添付横流し失敗・VKすり替え失敗）

---

## 9. 受け入れ基準（Acceptance Criteria）

- **同一PDF**（本文同一）: ZKP/署名とも ✅ 成功  
- **本文1バイト改変**: ZKP/署名とも ❌ 失敗  
- **添付横流し**（他PDFの `proof.json`/`sig.jws` を流用）: ❌ 失敗（`pdf_sha3_512` 不一致）  
- **VKすり替え**（別回路の VK）: ❌ 失敗（`vkey_hash` 不一致）

---

## 10. セキュリティ観点（Phase 0）

- **添付差し替え**: 本文ハッシュ結合（`pdf_sha3_512`）で検知  
- **VK/回路不整合**: `vkey_hash` の二重記録（proof & sig_target）で検知  
- **見た目同一・内部改変**: 添付除去後ハッシュで検出  
- **PAdES 互換**: Phase 0 では JWS 外部署名。公的PDF署名互換は後続フェーズで分岐

---

## 11. 5分デモ手順（サンプル）

1. PDF をドラッグ＆ドロップ → Prover が `proof.json` 生成 & `sig.jws` 署名 → `out.pdf` 生成  
2. Verifier UI へ `out.pdf` を投入 → 添付抽出 → VK/鍵指定 → ZKP & 署名検証 → 結果表示

---

## 12. 参考（仕様・ツール）

- Circom/snarkjs（Groth16） / Poseidon（ZK向けハッシュ）  
- JWS / RFC 7515（ES256） / WebAuthn × COSE（alg=-7）  
- pdfcpu（attachments add/list/remove） / PDF/A-3（任意型埋め込み）

