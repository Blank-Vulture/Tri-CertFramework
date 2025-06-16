
# 技術設計書 (TSD) — Verifier UI  
最終更新: 2025-06-16

## 1. 技術スタック  
| 層 | 技術 |
|----|------|
| フロント | React + Vite |
| PDF 解析 | pdf.js  |
| ZKP 検証 | Halo2 wasm-verifier  |
| RPC | ethers.js + Polygon Amoy  |

## 2. 証明検証フロー  
1. `proof.zkp` と `header.json` を抽出 (EmbedSpec ISO 19005‑3)   
2. `vkHash` 整合確認 → YearNFT RPC で root 取得。  
3. Halo2‑WASM `halo2_verify(proof, public_inputs)` 実行 – 30 ms  
4. 署名ハッシュ衝突耐性: SHA‑3‑512   (Grover 実効 256 bit)

## 3. パフォーマンス  
- WASM multi‑thread (WebWorker) で検証並列化  

## 4. セキュリティ対策  
| 脅威 | 制御策 |
|------|--------|
| PDF 改竄 | header.pdfHash vs actual hash |
| RPC 偽応答 | `eth_getBlockNumber` 同期確認 |
| XSS | DOMPurify sanitization |

## 5. テスト  
- jest: hash calc  
- Cypress: drag&drop シナリオ  
- CI: GitHub Actions Node 20

