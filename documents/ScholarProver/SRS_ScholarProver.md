
# 要件定義書 (SRS) — Scholar Prover  
**zk‑CertFramework / 証明者システム** 最終更新: 2025-06-16

## 1. 目的  
Scholar Prover は学生がブラウザのみで \
1) Passkey（WebAuthn ES‑256）署名を生成し、\
2) Halo 2 WASM により ZKP を作成、\
3) 生成した `proof.zkp` を PDF/A‑3 に埋め込む。\
バックエンド不要で本人が何度でも一時証明を作れる環境を提供する。

## 2. スコープ  
| 含む | 含まれない |
|------|------------|
| Passkey 署名呼び出し (navigator.credentials.get) | Passkey 登録 |
| Halo2-WASM Prover/Verifier 内蔵 | オンチェーン検証 |
| PDF/A‑3 添付 | PDF/A-3 長期保存設定 |

## 3. 用語  
- **Passkey**: WebAuthn+CTAP 仕様の資格情報  
- **Proof**: Halo 2 ZK‑SNARK バイナリ  

## 4. ユースケース  
UC‑SP‑01: PDF 選択 → 証明生成 → ダウンロード  
UC‑SP‑02: 期限切れリトライ

## 5. 機能要求  
FR‑SP‑01 PDF ドラッグ＆ドロップ UI  
FR‑SP‑02 Passkey 署名 API 呼び出し  
FR‑SP‑03 Halo2-WASM で 5 s 以内に証明生成  
FR‑SP‑04 pdf-lib で proof.zkp を添付

## 6. 非機能要求  
- バンドルサイズ ≤ 1 MB (WASM+JS)  
- ブラウザ: Chrome/Edge/Safari 現行

## 7. 受入基準  
- 正常系: OK ステータス  
- 改竄系: INVALID_HASH エラー

## 8. 制約  
- WebAuthn Level‑2 実装端末のみ対応  
