# Software Requirements Specification (SRS) — Zero‑Knowledge Certificate Framework 
**Version 2.0 – 2025‑06‑17**

---

## 1 Purpose  
Provide a **trust‑minimized, fully backendless** graduation‑certificate system where **only the student can generate time‑bound zero‑knowledge proofs (ZKP)** using Circom circuits and SnarkJS, with **Ledger Nano X hardware security** for administrative operations. Any verifier can confirm authenticity using only the PDF file and on‑chain Polygon zkEVM data.

## 2 Scope  
### In Scope  
* **Scholar Prover (PWA)**: Passkey registration + Circom/SnarkJS proof generation + PDF/A‑3 embedding
* **Executive Console (Electron)**: Ledger-secured yearly circuit deployment + VK management
* **Registrar Console (Electron)**: Local student key management + Merkle tree + PDF batch generation
* **Verifier UI (SSG)**: Offline verification with SnarkJS + on-chain VK validation
* **Yearly Independence**: Complete separation between graduation years (2025, 2026, etc.)

### Out of Scope  
* Backend servers or databases
* Cloud APIs or external storage (IPFS, AWS, etc.)
* Mobile‑native applications
* Complex key rotation schemes
* Cross-year dependencies

## 3 Definitions  
| Term | Definition |  
|------|-----------|  
| **Passkey** | WebAuthn/FIDO2 credential (ES‑256) stored in browser |  
| **Commit** | Poseidon256(pk_passkey) → 32 bytes |  
| **YearlySet** | Independent circuit + VK + NFT for each graduation year |
| **Proof** | Circom/SnarkJS Groth16 proof, ~2KB JSON |  
| **Ledger EIP-191** | Hardware-signed personal messages for admin authentication |
| **Trust Minimization** | Zero external dependencies except public blockchain |

## 4 Actors & Interests  
* **Student** – generates verifiable certificates; no gas fees, no CLI, browser-only experience
* **Professor** – deploys yearly circuits using Ledger Nano X; minimal setup complexity
* **Staff (Registrar)** – manages student data locally; batch PDF generation
* **Employer** – drags-&-drops PDF and instantly verifies authenticity offline
* **Blockchain (Polygon zkEVM)** – stores yearly NFTs; provides public verifiability

## 5 Four-Component Architecture

### 5.1 Scholar Prover (Student Interface)
- **Type**: Progressive Web App (PWA)
- **Purpose**: ZKP generation and PDF embedding
- **Storage**: Browser localStorage + IndexedDB
- **Dependencies**: WebAuthn + Circom WASM + pdf-lib

### 5.2 Executive Console (Admin Interface)  
- **Type**: Electron desktop application
- **Purpose**: Yearly circuit deployment with Ledger security
- **Storage**: Local JSON files + circuit files
- **Dependencies**: Ledger Nano X + Web3 + Circom compiler

### 5.3 Registrar Console (Staff Interface)
- **Type**: Electron desktop application  
- **Purpose**: Student key management + PDF generation
- **Storage**: Local JSON files + generated PDFs
- **Dependencies**: Poseidon hash + PDF generation libraries

### 5.4 Verifier UI (Employer Interface)
- **Type**: Static site (Next.js SSG)
- **Purpose**: Certificate verification
- **Storage**: No persistent storage
- **Dependencies**: SnarkJS verifier + Polygon zkEVM RPC

## 6 Use‑Case Summary  
1. **UC‑01 Student Passkey Registration** (Scholar Prover)
2. **UC‑02 Yearly Circuit Deployment** (Executive Console + Ledger)
3. **UC‑03 Student Key Import & Merkle Tree** (Registrar Console)
4. **UC‑04 ZKP Generation & PDF Embedding** (Scholar Prover)
5. **UC‑05 Certificate Verification** (Verifier UI)

## 7 Functional Requirements  
| ID | Requirement | Implementation | Fit Crit (TestID) |  
|----|-------------|---------------|------------------|  
| FR‑01 | System shall embed SnarkJS `proof.json` into PDF/A‑3 | Scholar Prover | TC‑P01 |  
| FR‑02 | Proof shall verify ES‑256 signature & Merkle inclusion in Circom circuit | All circuits | TC‑P02 |  
| FR‑03 | Proof expires when `expireTs < now()` | Verifier UI | TC‑N03 |  
| FR‑04 | Verifier shall query YearNFT and reject if `vkHash` mismatch | Verifier UI | TC‑N04 |
| FR‑05 | All admin operations shall require Ledger Nano X EIP-191 signature | Executive Console | TC‑P05 |
| FR‑06 | Each graduation year shall be completely independent | All components | TC‑P06 |
| FR‑07 | System shall work without any backend servers | Architecture | TC‑P07 |

## 8 Non‑Functional Requirements  
| Category | Metric | Target | Notes |
|----|--------|--------|-------|  
| Performance | Circom proof generation | ≤ 10s @ M1/1‑core | SnarkJS WASM optimization |
| Performance | SnarkJS verification | ≤ 100ms | Browser WASM |
| Security | Quantum resistance | SHA‑3‑512 hashes | 256-bit post-quantum security |
| Security | Hardware security | Ledger Nano X required | EIP-191 personal message signing |
| UX | Offline verification | 100% air-gapped | No network dependencies |  
| Trust | External dependencies | Polygon zkEVM only | Zero cloud services |
| Storage | Local file limits | <100MB per year | Circuit + key files |

## 9 Security Requirements

### 9.1 Trust Minimization Principles
| Principle | Implementation |
|-----------|---------------|
| **No Servers** | All components run locally (Electron/PWA/SSG) |
| **No Databases** | JSON files + browser storage only |
| **No APIs** | Direct blockchain RPC only |
| **Hardware Security** | Ledger Nano X for all admin operations |
| **Yearly Independence** | No shared secrets between years |

### 9.2 EIP-191 Security Implementation
```
Domain: "zk-cert-framework.local"
Message Structure:
- Operation type (deploy_yearly_set, etc.)
- Timestamp (5-minute validity window)
- Nonce (replay attack prevention)
- Year and circuit parameters
- Warning messages for user verification
```

## 10 Acceptance Criteria  
- All critical test cases (TC‑P01…TC‑P07) pass on multiple browsers
- Ledger Nano X integration works on Windows/macOS/Linux
- Complete air-gapped verification succeeds
- Yearly circuit deployment creates independent NFT contracts
- Zero external API calls detected in network monitoring
- Electron apps build to single executable files

## 11 Constraints  
- **Hardware**: Ledger Nano X required for Executive Console
- **Browser**: Chrome 111+/Edge 111+/Safari 16.4+ (WebAuthn Level 2)
- **Network**: Polygon zkEVM (mainnet for production, Amoy for testing)
- **File Size**: Circuit files <50MB, proof files <5MB
- **Yearly Limit**: Maximum 10,000 students per graduation year

## 12 Risk Management
| ID | Risk | Probability | Impact | Mitigation |  
|----|------|-----------|--------|-----------|  
| R‑1 | Passkey device loss | Medium | High | Re‑registration flow + Merkle root update |  
| R‑2 | Ledger supply chain attack | Low | Critical | Firmware verification + secure delivery |
| R‑3 | Circom circuit bugs | Medium | High | Formal verification + extensive testing |
| R‑4 | Browser compatibility | Low | Medium | Feature detection + graceful degradation |
| R‑5 | Polygon zkEVM outage | Low | Medium | Local verification mode + RPC fallbacks |

## 13 Compliance & Standards
- **PDF**: ISO 32000-2 (PDF 2.0) + ISO 19005-3 (PDF/A-3)
- **Cryptography**: FIPS 186-4 (ES-256), NIST SP 800-185 (SHA-3)
- **WebAuthn**: W3C Web Authentication Level 2
- **ZKP**: Groth16 (standardized) + Powers of Tau ceremony
- **EIP**: EIP-191 (Ethereum personal message signing)

---

