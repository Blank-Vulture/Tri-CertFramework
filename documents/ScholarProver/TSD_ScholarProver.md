
# 技術設計書 (TSD) — Scholar Prover  
最終更新: 2025-06-16

## 1. ランタイム  
- React + Vite  
- halo2_proofs wasm build 手順  
- pdf-lib embedFile API

## 2. 署名仕様  
ES‑256 (secp256r1) per WebAuthn spec

## 3. 証明生成  
- バンドル `circuit.wasm` + `pk.bin`  
- Prover 呼び出し: `halo2_prove(pk, witness)`  

## 4. チャレンジ計算  
`SHA3‑512(pdfHash||destHash||expireTs||salt)`

## 5. バンドルサイズ最適化  
- Tree‑shaking  
- wasm‑opt `-Oz`

## 6. テスト  
- jest: WebAuthn mock  
- playwright: drag&drop E2E  
