# Technical Design Specification (TSD) — ZK‑GradCert System  
**Version 1.0 – 2025‑06‑17**

---

## 1 Cryptographic Primitives  

| Purpose | Algorithm | Output | Rationale |  
|---------|-----------|--------|-----------|  
| External hash | SHA‑3‑512 | 512 bit | Grover ⇒ 256‑bit quantum security |  
| Internal hash | Poseidon‑256 | 256 bit | ZK‑friendly; low constraints |  
| Passkey sign | ES‑256 | r,s 32 B | WebAuthn L2 standard |  
| VK sign | EIP‑191 (domain) | 65 B | Ledger personal msg |

---

## 2 ZKP Circuit  

```text
Public  = [vkHash, schemaHash, commit,
           pdfHash, destHash, expireTs, merkleRoot]
Private = [pk, sig_r, sig_s, leaf, path[8]]

Constraints:
  VerifyES256(pk, sig, challenge) == 1 &&
  Poseidon256(pk) == leaf &&
  MerkleInclusion(leaf, path, merkleRoot) == 1
```

*Constraints*: 65 k  
*Proof size*: 45 KB  
*Prover*: 4.5 s @ M1 (1 core)  
*Verifier*: 30 ms WASM  

### 2.1 Challenge Calculation  
`challenge = SHA3‑512(pdfHash | destHash | expireTs | salt)`  

---

## 3 Poseidon Merkle Tree  

| Parameter | Value |  
|-----------|-------|  
| depth | 8 (256 leaves) |  
| zeroLeaf | `0x0` |  
| hash | Poseidon‑256 |  

---

## 4 Smart‑Contract Specification  

```solidity
struct YearInfo {
  bytes32 vkHash;
  bytes32 schemaHash;
  bytes32 merkleRoot;
}
mapping(uint16 => YearInfo) public yearInfo;

/// gas: 43 914 ±100
function mintYear(uint16 yr, YearInfo calldata info)
  external onlyOwner returns(uint256);
```

*Security*: Checks‑Effects‑Interactions; `reentrancyGuard`.

---

## 5 Ledger VK Signature Domain  

```
msg = keccak256(
       "KIC-VK",    // domain separator
       vkHash,
       chainId,
       address(this))
sig = ledger.signPersonalMessage(msg)
```
Verifier checks `ecrecover(sig) == ownerAddress`.

---

## 6 CI/CD Pipeline  

```
name: zk-gradcert
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Swatinem/rust-cache@v2
      - run: cargo test --release
      - run: wasm-pack build frontend
      - run: npx hardhat test
```

---

## 7 Test Vectors  

Directory `test_vectors/` contains  
* `sample.pdf`, `header.json`, `proof.bin`, `yearNFT.json`, `vk.bin`  
CI asserts round‑trip proof passes & tampered variants fail.

---

