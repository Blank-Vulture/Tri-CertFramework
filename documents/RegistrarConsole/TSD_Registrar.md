
# 技術設計書 (TSD) — Registrar Console  
最終更新: 2025-06-16

## 1. 技術スタック  
Vue3 + Pinia / FastAPI / PostgreSQL / pdfcpu CLI / Poseidon WASM / Polygon zkEVM RPC  

## 2. markle tree実装  
Python WASM ラッパで Poseidon256 計算  
欠損葉は zeroLeaf=0x00..00。  

## 3. YearNFT ABI  
`function updateRoot(uint16 year, bytes32 root) external onlyOwner`  

## 4. チャレンジ安全性  
SHA‑3‑512 出力 512 bit で Grover 実効 256 bit  

## 5. 署名標準  
EIP‑191 personal_sign + chainId 埋込でリプレイ防止  

## 6. CI  
pytest → Merkle vectors (100) → Hardhat gas → pdfcpu validate  

