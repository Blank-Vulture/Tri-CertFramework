
# 技術設計書 (TSD) — ZKP 付き卒業証書システム
最終更新: 2025‑06‑17

---

## 1. 暗号選定根拠
- **SHA‑3‑512**: Grover 攻撃でも実効 256 bit  
- **Poseidon‑256**: ZK‑SNARK 最適化  
- **ES‑256**: WebAuthn Level‑2 規格  
- **EIP‑191 改**: Ledger 署名にドメイン区分付与  

## 2. ZKP 回路
公開入力: vkHash,schemaHash,commit,pdfHash,destHash,expireTs,merkleRoot  
秘密入力: pk, sig_r, sig_s, leaf, path[]  
制約数 ≈ 65 k、証明 ≈ 45 KB

## 3. MerkleTree
depth=8、hash=Poseidon‑256、zeroLeaf=0

## 4. Solidity コントラクト
```solidity
struct YearInfo { bytes32 vkHash; bytes32 schemaHash; bytes32 merkleRoot; }
function mintYear(uint16 y, YearInfo calldata i) external onlyOwner;
```

## 5. チャレンジ計算
`SHA3‑512(pdfHash||destHash||expireTs||salt)`

## 6. Ledger 署名
```
msg=keccak256("KIC-VK",vkHash,chainId,contract)
sig=ledger.signPersonalMessage(msg)
```

## 7. CI/CD
GitHub Actions:  
1. Rust → wasm-pack build  
2. Hardhat test  
3. Playwright E2E  

## 8. テストベクトル
`test_vectors/` ディレクトリに配置
