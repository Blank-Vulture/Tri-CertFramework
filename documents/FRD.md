
# 機能要件定義書 (Functional Requirements Document)

## 1. 目的
本ドキュメントは、神戸情報大学院大学（KIC）の **ゼロ知識証明 (ZKP) 付き卒業証書発行・検証システム** の機能要件を定義する。学生本人のみが一時 ZKP 証明ファイルを生成でき、検証者はブロックチェーンと PDF だけで真偽を判断できる完全バックエンドレス構成を目指す。

## 2. 範囲
- 卒業証書 PDF 生成
- ZKP 証明ファイル生成・添付
- 年度別 NFT ミントおよびメタデータ管理
- ブラウザのみで完結する検証 UI
- Ledger 署名による Verifying‑Key (VK) 改ざん防止

## 3. 用語
| 用語 | 定義 |
|------|------|
| Passkey | WebAuthn / FIDO2 規格の公開鍵資格情報 |
| Commit | `Poseidon256(pk_passkey)` で得た 32 B 値 |
| MerkleRoot | Poseidon ハッシュ木 (depth 8) のルート |
| VK | Halo 2 回路の Verifying‑Key ファイル |
| Proof | Halo 2 で生成した一時 ZKP 証明バイト列 |

## 4. 機能要件一覧
| 番号 | 要件 | 詳細 |
|------|------|------|
| **F‑1** | ZKP 証明添付 | PDF/A‑3 へ `proof.zkp` を埋め込み、ファイルサイズ ≤ 1 MB |
| **F‑2** | 本人性保証 | Passkey 署名＋Merkle 包含＋ES‑256 検証を ZKP で証明 |
| **F‑3** | 有効期限 | 公開入力 `expireTs` が現時刻を超えている場合のみ検証成功 |
| **F‑4** | 年度別 NFT | ERC‑721 を学年ごとに 1 枚ミントし、`merkleRoot` 等を格納 |
| **F‑5** | バックエンドレス | challenge は `SHA3‑512(pdfHash‖dest‖expire‖salt)` をブラウザ生成 |
| **F‑6** | 量子耐性 | 外部ハッシュに SHA‑3‑512 を採用 |
| **F‑7** | 改ざん検出 | Ledger (EIP‑191) 署名 VK と `vkHash` 照合で検出 |

## 5. ユースケース
1. **学生登録** — Passkey を生成し公開鍵を大学へ登録  
2. **PDF 出力** — 学務システムが PDF 単体を発行  
3. **証明生成** — 学生ブラウザが Passkey 署名 → Proof 生成 → PDF へ添付  
4. **提出** — 学生が企業へ PDF を送付  
5. **検証** — 企業はブラウザ UI で PDF ドロップし検証結果を受領  

## 6. 非機能要件 (抜粋)
- 証明生成 1 Core CPU で 5 s 以内  
- 証明サイズ 50 KB 前後  
- 検証 UI はオフラインでも動作可  
