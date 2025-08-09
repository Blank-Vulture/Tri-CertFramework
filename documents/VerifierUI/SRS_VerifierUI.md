# 要件定義書 (SRS) — Verifier UI  
**zk‑CertFramework / 検証者システム** 最終更新: 2025-08-09 (Version 2.4)

## 1. 目的  
Verifier UI は企業の採用担当者が学生提出 PDF をブラウザのみで検証し、真偽・有効期限・改竄有無を 5 秒以内に判定するツールである。サーバやウォレット拡張不要で PDF/A‑3 に埋込まれた Halo 2 証明と Polygon YearNFT を組み合わせて検証する。PDF から添付抽出するため PDF/A‑3 仕様を遵守する。

## 2. スコープ  
| 含む | 含まれない |
|------|------------|
| PDF drop & extraction | PDF 電子署名 |
| Circom‑SnarkJS Verifier | On‑chainトランザクション送信 |
| YearNFT 取得 (JSON‑RPC) | NFT ミント |

## 3. 用語  
- **Assertion**: WebAuthn 署名レスポンス
- **pdf.js**: Mozilla のブラウザ PDF ビューア

## 4. ユースケース  
UC‑VF‑01 PDF 1 枚検証 → 結果表示  
UC‑VF‑02 署名改竄レポート出力  

## 5. 機能要求  
| ID | 要求 |
|----|------|
| FR‑VF‑01 PDF ドロップ後 5 秒以内に結果表示 |
| FR‑VF‑02 OK/NG/EXPIRED の 3 ステータス |
| FR‑VF‑03 結果を JSON でエクスポート |

## 6. 非機能要求  
| 指標 | 目標 |
|------|------|
| CPU 使用率 | 1 Core 50 % 以下 |
| バンドルサイズ | ≤ 1 MB |

## 7. 受入基準  
- 10 種のテストベクトルで期待結果一致  
- Lighthouse PWA スコア ≥ 90
