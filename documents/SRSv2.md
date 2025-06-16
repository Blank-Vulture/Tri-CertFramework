# Software Requirements Specification (SRS) — Zero‑Knowledge Certificate Framework 
**Version 1.0 – 2025‑06‑17**

---

## 1 Purpose  
Provide a trust‑less, backend‑less graduation‑certificate system in which **only the student can generate a time‑bound zero‑knowledge proof (ZKP)** and any verifier can confirm authenticity using nothing more than the PDF file and an on‑chain NFT.

## 2 Scope  
### In Scope  
* Passkey (WebAuthn) registration UI  
* PDF/A‑3 generation by university MIS  
* Browser‑only ZKP generation (Halo 2 WASM)  
* Year‑wise ERC‑721 NFT mint & metadata  
* Offline verification UI  

### Out of Scope  
* Student-information master DB  
* Mobile‑native verifier app  
* On‑prem key‑server infrastructure  

## 3 Definitions  
| Term | Definition |  
|------|-----------|  
| **Passkey** | WebAuthn/FIDO2 credential (ES‑256) |  
| **Commit** | Poseidon256(pk_passkey) → 32 bytes |  
| **YearNFT** | One ERC‑721 per academic year containing `vkHash`, `schemaHash`, `merkleRoot` |  
| **Proof** | Halo 2 SNARK byte stream, ≈ 45 KB |  

## 4 Actors & Interests  
* **Student** – wants to issue verifiable certificate; no gas fees or CLI.  
* **University** – issues PDF and YearNFT; minimal on‑chain gas; no backend.  
* **Employer** – drags-&-drops PDF and instantly trusts result.  
* **Blockchain (Polygon zkEVM)** – stores YearNFT; network gas ≈ 0.  

## 5 Use‑Case Summary  
1. **UC‑01 Register Passkey**  
2. **UC‑02 Mint YearNFT**  
3. **UC‑03 Generate ZKP + embed PDF**  
4. **UC‑04 Verify PDF offline**  

## 6 Functional Requirements  
| ID | Requirement | Fit Crit (TestID) |  
|----|-------------|------------------|  
| FR‑01 | System shall embed `proof.zkp` into PDF/A‑3 | TC‑P01 |  
| FR‑02 | Proof shall verify ES‑256 signature & Merkle inclusion inside ZKP | TC‑P02 |  
| FR‑03 | Proof expires when `expireTs < now()` | TC‑N03 |  
| FR‑04 | Verifier shall read YearNFT and reject if `vkHash` mismatch | TC‑N04 |  

## 7 Non‑Functional Requirements  
| Cat | Metric | Target |  
|----|--------|--------|  
| Performance | Proof generation | ≤ 5 s @ M1/1‑core |  
| Security | Quantum resistance | SHA‑3‑512 external hash |  
| UX | Offline verification | Works in airplane‑mode |  

## 8 Acceptance Criteria  
All critical test cases (TC‑P01…TC‑N04) pass; Slither/Mythril audit reveals no Critical vulnerabilities.

## 9 Constraints  
* Browser ≥ Chrome 111/Edge 111  
* Testnet = Polygon zkEVM Amoy (0 gas)

## 10 Risks  
| ID | Risk | Mitigation |  
|----|------|-----------|  
| R‑1 | Passkey loss | Re‑registration + MerkleRoot refresh |  
| R‑2 | Ledger supply‑chain | Hash‑check firmware; physical delivery protocol |

---

