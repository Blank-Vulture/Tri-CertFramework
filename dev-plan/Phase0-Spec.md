# Tri-CertFramework — Phase 0 仕様（最小プロトタイプ）

この文書は Tri-CertFramework の **Phase 0（縦切り最小プロトタイプ）**の機能・出力定義をまとめたものです。
目的は「**PDF → ZKP 生成 → PDF/A-3 添付 → ローカル検証**」の導線を最短で成立させることです。

---

## 機能面

### Scholar Prover
- **ZKPファイル生成／PDFへの添付**
  - Circom/snarkjs(Groth16) で `proof.json` を生成し、PDF に添付します。
- **ZKP回路から VK 生成／ローカルへエクスポート**
  - `vkey.json`（検証鍵）と `vkey_hash`（SHA3-256）を出力します（`proof.json` にも埋め込み）。
- **パスキーを使った電子署名（JWS, ES256）を PDF へ添付**
  - 署名対象は `sig_target.json`（下記）で、WebAuthn の鍵で **ES256** 署名した `sig.jws` を添付します。
- **パスキーの検証鍵をローカルへエクスポート**
  - 公開鍵を **JWK（EC P-256, alg: ES256）** もしくは **COSE_Key(JSON)** でエクスポートします。

### Verifier UI
- **VKをファイル指定して ZKP 検証**
  - 指定した `vkey.json`（または PDF 内の添付から抽出）で `proof.json` を検証します。
- **電子署名の検証鍵を指定して電子署名検証**
  - 指定した JWK/COSE（または PDF 内の添付から抽出）で `sig.jws` を検証します。

> **Phase 0 ハッシュ規則（自己参照回避）**  
> `pdf_sha3_512` は **「添付ファイルをすべて除去したPDF」** の SHA3-512 です。  
> - Prover: 入力PDF（添付なし）をハッシュ化。  
> - Verifier: 受領PDFから添付を除去 → 得られたPDFをハッシュ化 → `proof.json.public_signals.pdf_sha3_512` と一致確認。  
> これにより、添付（proof/jws/鍵）を加えても本文ハッシュが安定し、ZKPと署名の検証を確実に再現できます。

---

## 実際の出力

### Scholar Prover の出力

- `out.pdf` （PDF/A-3）  
  - 入力 PDF に以下のファイルを**添付**した成果物  
    - **必須**: `proof.json`、`sig.jws`  
    - **推奨**: `webauthn_pub.jwk.json`（検証鍵）、`vkey.json`（検証鍵本体）

- `proof.json`  
  **説明**: Groth16 の証明本体と公開シグナル。`vkey_hash` により VK すり替えを検出。  
  **例**:
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

- `vkey.json` / `vkey_hash.txt`  
  **説明**: snarkjs の検証鍵（JSON）と、その SHA3-256。`vkey_hash` は `proof.json` と `sig_target.json` にも埋め込みます。

- `sig.jws`  
  **説明**: `sig_target.json` を **ES256（WebAuthn）** で JWS 署名したもの（compact 形式推奨）。

- `sig_target.json`（署名対象ペイロード）  
  **説明**: 署名に含める最小メタデータ。`pdf_sha3_512` と `vkey_hash` を必ず持たせ、すり替えを検出します。  
  **例**:
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
  **説明**: 検証用公開鍵（EC P-256, alg: ES256）。`kid` に `credentialId` 由来の識別子を入れて参照性を確保します。

### Verifier UI の出力（任意）
- `verify_report.json`  
  **説明**: `ZKP: OK/NG（理由）`、`Signature: OK/NG（理由）`、使用した `vkey_hash` / `kid` を記録（画面表示のみでも可）。

---

## 回路とデータ結合の最小方針

- **回路**: `commit = Poseidon(owner_secret, pdf_sha3_512)`  
  - ZKフレンドリな Poseidon を利用し、PDF本文ハッシュ（添付除去後）と秘密（owner_secret）を結び付ける。  
  - 出力の `commit` と `pdf_sha3_512` を公開シグナルとして外出し（検証時に再計算）。

- **データ結合**:  
  - `proof.json.public_signals.pdf_sha3_512` と Verifier 側の再計算値を一致確認。  
  - `proof.json.vkey_hash` と `vkey.json` のハッシュを一致確認。  
  - 署名対象 `sig_target.json` にも `pdf_sha3_512` と `vkey_hash` を入れて**二重チェック**。

---

## 検証フロー（Verifier UI）

1. PDF を受領し、**添付ファイルを一時除去**して `pdf_sha3_512` を計算。  
2. PDF から `proof.json`（および `vkey.json`、`webauthn_pub.jwk.json` があればそれも）を抽出。  
3. `vkey.json` を指定（または添付から取得）し、`snarkjs` 互換の `groth16.verify` で ZKP 検証。  
4. `sig.jws` を `webauthn_pub.jwk.json`（または指定鍵）で検証。  
5. `vkey_hash`、`pdf_sha3_512`、`commit` の整合性を最終チェック。

---

## 受け入れ基準（Acceptance Criteria）

- **同一PDF**（添付を除去した本文が同じ）: ZKP 検証・署名検証とも ✅ 成功  
- **PDF本文を1バイト改変**: `pdf_sha3_512` が変化し、ZKP/署名とも ❌ 失敗  
- **添付の入れ替え／横流し**（他PDFの `proof.json`/`sig.jws` を流用）: ❌ 失敗（`pdf_sha3_512` 不一致）  
- **VKのすり替え**（別回路の `vkey.json` を指定）: ❌ 失敗（`vkey_hash` 不一致）

---

## コマンド例（実装のあたり）

- **ZKP 検証**（snarkjs 互換）  
  ```bash
  snarkjs groth16 verify vkey.json public.json proof.json
  ```

- **PDF 添付操作（pdfcpu）**  
  ```bash
  # 添付
  pdfcpu attachments add input.pdf proof.json sig.jws webauthn_pub.jwk.json -o out.pdf
  # 添付一覧
  pdfcpu attachments list out.pdf
  # 添付除去（検証のためのハッシュ再計算時など）
  pdfcpu attachments remove out.pdf -o out_noattach.pdf
  ```

---

## ディレクトリ例（提案）

```
/circuits/
  commitment.circom
  poseidon/              # 依存（サブモジュール可）
  build/                 # wasm, zkey, vkey
/prover/                 # Scholar Prover（PWA/Tauri）
/verifier-ui/            # Next.js（ローカル検証）
/scripts/
  hash-pdf.ts            # 添付除去→SHA3-512
  pdf-attach.ts          # pdfcpu 呼び出し
/dev-plan/
  Phase0-Spec.md         # 本ファイル
```

---

## セキュリティ観点（Phase 0）

- **添付差し替え攻撃**: `pdf_sha3_512` により本文と強結合。横流しは検知される。  
- **VK/回路の不整合**: `vkey_hash` を `proof.json` と `sig_target.json` に埋め込み、UI で一致確認。  
- **見た目同一・内部改変**: 添付を除去して本文ハッシュを算出するため、内部改変も検出可能。  
- **PAdES互換**: Phase 0 は JWS の外部署名。公的PAdES互換は後続フェーズで分岐検討。

---

## 参考（仕様・ツール）
- Circom/snarkjs Groth16 検証コマンド（`snarkjs groth16 verify`）
- Poseidon（ZK向けハッシュ）
- JSON Web Signature (JWS) / RFC 7515（ES256）
- WebAuthn × COSE（ES256/alg=-7）
- pdfcpu（添付 add/list/remove）
- PDF/A-3（ISO 19005-3、任意型の埋め込みを許容）

> 詳細な出典や実装リンクはリポジトリ README にも追記予定です。
