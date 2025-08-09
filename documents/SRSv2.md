# Software Requirements Specification (SRS) — Tri-CertFramework 
**Version 2.4 – 2025‑08‑09**

> **Tri-Certification Framework** - ZKP + Blockchain + Digital Signature for Universal Document Authenticity

---

## 1 Purpose  
Provide a **trust‑minimized, fully backendless** universal document authenticity system where **only the document owner can generate time‑bound zero‑knowledge proofs (ZKP) and digital signatures** using Circom circuits, SnarkJS, and passkey-based cryptography, with **Ledger Nano X hardware security** for responsible party operations and **public key repository management** for efficient verification workflows. Any verifier can confirm authenticity using the PDF file, on‑chain Polygon zkEVM data, and publicly accessible verification keys.

## 2 Scope  
### In Scope  
* **Prover System (Scholar Prover PWA)**: Digital signature key generation + Circom/SnarkJS proof generation + PDF/A‑3 embedding + verification key export
* **Responsible Party System (Executive Console Tauri)**: Ledger-secured yearly circuit deployment + VK management
* **Administrator System (Registrar Console Tauri)**: Verification key registry management + public repository publication + Merkle tree + PDF batch generation
* **Verifier System (Verifier UI SSG)**: Offline verification with SnarkJS + digital signature verification + public key retrieval
* **Yearly Independence**: Complete separation between document issuance years (2025, 2026, etc.)
* **Public Key Repository**: IPFS/GitHub-based verification key distribution

### Out of Scope  
* Backend servers or databases
* Cloud APIs or proprietary storage services
* Mobile‑native applications
* Complex key rotation schemes
* Cross-year dependencies
* Centralized key management services

## 3 Definitions  
| Term | Definition |  
|------|-----------|  
| **Passkey** | WebAuthn/FIDO2 credential (ES‑256) used for digital signatures |  
| **Digital Signature** | Cryptographic signature of PDF hash using passkey private key |
| **Verification Key** | Public key derived from passkey for signature verification |
| **Commit** | Poseidon256(verification_key) → 32 bytes |  
| **YearlySet** | Independent circuit + VK + NFT for each document issuance year |
| **Proof** | Circom/SnarkJS Groth16 proof, ~2KB JSON |  
| **Ledger EIP-191** | Hardware-signed personal messages for admin authentication |
| **Trust Minimization** | Minimal external dependencies (public blockchain + repositories) |
| **Key Registry** | Publicly accessible collection of verification keys |

## 4 Actors & Interests  
* **Document Owner** – generates verifiable document authenticity proofs and digital signatures; exports verification keys; no gas fees, no CLI, browser-only experience
* **Responsible Party** – deploys yearly circuits using Ledger Nano X; minimal setup complexity
* **Administrator (Registrar)** – manages verification key registries; publishes keys to public repositories; batch PDF generation
* **Verifier** – drags-&-drops PDF and instantly verifies authenticity and digital signatures using public keys
* **Blockchain (Polygon zkEVM)** – stores yearly NFTs; provides public verifiability
* **Public Repository (IPFS/GitHub)** – stores verification key registries; provides decentralized access

## 5 Four-System Architecture

### 5.1 Prover System (Document Owner Interface)
- **Type**: Progressive Web App (PWA)
- **Purpose**: ZKP generation, digital signature creation, and PDF embedding
- **Storage**: Browser localStorage + IndexedDB
- **Dependencies**: WebAuthn + Circom WASM + pdf-lib + crypto libraries

### 5.2 Responsible Party System (Responsible Party Interface)  
- **Type**: Tauri desktop application
- **Purpose**: Yearly circuit deployment with Ledger security
- **Storage**: Local JSON files + circuit files
- **Dependencies**: Ledger Nano X + Web3 + Circom compiler

### 5.3 Administrator System (Administrator Interface)
- **Type**: Tauri desktop application  
- **Purpose**: Verification key registry management + public repository publication + PDF generation
- **Storage**: Local JSON files + generated PDFs + published registries
- **Dependencies**: Poseidon hash + PDF generation libraries + IPFS/GitHub APIs

### 5.4 Verifier System (Verifier Interface)
- **Type**: Static site (Next.js 15 SSG + App Router)
- **Purpose**: Document verification + digital signature validation
- **Storage**: No persistent storage
- **Dependencies**: SnarkJS verifier + Polygon zkEVM RPC + crypto libraries for signature verification

## 6 Use‑Case Summary  
1. **UC‑01 Digital Signature Key Generation** (Prover System)
2. **UC‑02 Yearly Circuit Deployment** (Responsible Party System + Ledger)
3. **UC‑03 Verification Key Registry Management** (Administrator System)
4. **UC‑04 ZKP Generation & Digital Signature** (Prover System)
5. **UC‑05 Document & Signature Verification** (Verifier System)
6. **UC‑06 Verification Key Export** (Prover System)
7. **UC‑07 Public Repository Publication** (Administrator System)

## 7 Functional Requirements  
| ID | Requirement | Implementation | Fit Crit (TestID) |  
|----|-------------|---------------|------------------|  
| FR‑01 | System shall embed SnarkJS `proof.json` and digital signature into PDF/A‑3 | Prover System | TC‑P01 |  
| FR‑02 | Proof shall verify ES‑256 signature & Merkle inclusion in Circom circuit | All circuits | TC‑P02 |  
| FR‑03 | Proof expires when `expireTs < now()` | Verifier System | TC‑N03 |  
| FR‑04 | Verifier shall query YearNFT and reject if `vkHash` mismatch | Verifier System | TC‑N04 |
| FR‑05 | All responsible party operations shall require Ledger Nano X EIP-191 signature | Responsible Party System | TC‑P05 |
| FR‑06 | Each document issuance year shall be completely independent | All systems | TC‑P06 |
| FR‑07 | System shall work without any backend servers | Architecture | TC‑P07 |
| FR‑08 | Prover System shall generate digital signatures of PDF hashes | Prover System | TC‑S01 |
| FR‑09 | Administrator System shall publish verification keys to public repositories | Administrator System | TC‑S02 |
| FR‑10 | Verifier System shall retrieve verification keys from public repositories | Verifier System | TC‑S03 |
| FR‑11 | Digital signatures shall be verified using corresponding public keys | Verifier System | TC‑S04 |
| FR‑12 | Verification key registries shall contain integrity verification | Administrator System | TC‑S05 |

## 8 Non‑Functional Requirements  
| Category | Metric | Target | Notes |
|----|--------|--------|-------|  
| Performance | Circom proof generation | ≤ 10s @ M1/1‑core | SnarkJS WASM optimization |
| Performance | SnarkJS verification | ≤ 100ms | Browser WASM |
| Performance | Digital signature generation | ≤ 500ms | Local passkey signing |
| Performance | Signature verification | ≤ 200ms | Local crypto operations |
| Performance | Repository publication | ≤ 30s | IPFS/GitHub API calls |
| Performance | Verification key retrieval | ≤ 5s | Repository access |
| Security | Quantum resistance | SHA‑3‑512 hashes | 256-bit post-quantum security |
| Security | Hardware security | Ledger Nano X required | EIP-191 personal message signing |
| Security | Digital signature security | ES256 cryptography | ECDSA with P-256 |
| UX | Offline verification | ZKP verification only | Signature requires key retrieval |  
| Trust | External dependencies | Polygon zkEVM + public repos | Minimal trust assumptions |
| Storage | Local file limits | <100MB per year | Circuit + key registry files |
| Repository | Key registry size | <10MB per registry | Efficient JSON format |

## 9 Security Requirements

### 9.1 Trust Minimization Principles
| Principle | Implementation |
|-----------|---------------|
| **No Servers** | All systems run locally (Tauri/PWA/SSG) |
| **No Databases** | JSON files + browser storage only |
| **Minimal APIs** | Direct blockchain RPC + public repository access only |
| **Hardware Security** | Ledger Nano X for all responsible party operations |
| **Yearly Independence** | No shared secrets between years |
| **Public Key Distribution** | Decentralized repositories (IPFS/GitHub) |

### 9.2 Digital Signature Security Requirements
| Requirement | Implementation |
|-------------|---------------|
| **Local Key Generation** | Passkey-based keys generated client-side |
| **Signature Verification** | ES256 ECDSA signature verification |
| **Public Key Integrity** | SHA-3 checksums embedded in key registries |
| **Repository Security** | IPFS content addressing + GitHub version control |
| **Key Registry Validation** | Cryptographic integrity verification |
| **Tamper Detection** | Hash-based registry validation |

### 9.3 EIP-191 Security Implementation
```
Domain: "zk-cert-framework.local"
Message Structure:
- Operation type (deploy_yearly_set, etc.)
- Timestamp (5-minute validity window)
- Nonce (replay attack prevention)
- Year and circuit parameters
- Warning messages for user verification
```

## 10 Verification Key Management Requirements

### 10.1 UC-06: Verification Key Export (Prover System)
**Primary Actor**: Document Owner (Student)
**Preconditions**: 
- Passkey-based signature keys generated
- Scholar Prover PWA loaded
- Key pair validation completed

**Main Flow**:
1. Student accesses verification key export feature
2. System generates verification key in JWK format
3. Key displayed with integrity hash
4. Student saves key file or copies JSON data
5. Student submits key to administrator via secure channel
6. System provides export confirmation

**Postconditions**: 
- Verification key successfully exported
- No private key data included in export
- Export logged for audit

### 10.2 UC-07: Public Repository Publication (Administrator System)
**Primary Actor**: Administrator (University Staff)
**Preconditions**:
- Registrar Console application running
- Verification keys collected from students
- Repository credentials configured

**Main Flow**:
1. Administrator compiles verification key registry
2. System validates all key formats and integrity
3. Administrator selects publication target (IPFS/GitHub)
4. System generates registry with metadata
5. System publishes to selected repository
6. System receives publication confirmation and URL
7. Administrator distributes access information

**Postconditions**:
- All verification keys publicly accessible
- Registry integrity verified
- Publication logged for audit

### 10.3 Verification Key Registry Requirements
```json
{
  "version": "2.4",
  "framework": "Tri-CertFramework",
  "year": 2025,
  "registryMetadata": {
    "totalKeys": 150,
    "administrator": "university-admin",
    "repositoryType": "github",
    "publishedAt": 1704067200000
  },
  "verificationKeys": [
    {
      "studentId": "2025001",
      "studentName": "Student Name",
      "verificationKey": {
        "kty": "EC", "crv": "P-256",
        "x": "base64-x-coordinate",
        "y": "base64-y-coordinate",
        "use": "sig", "alg": "ES256"
      },
      "keyHash": "sha3-512-hash-of-key"
    }
  ],
  "integrity": {
    "registryHash": "sha3-512-hash-of-registry",
    "adminSignature": "admin-signature"
  }
}
```

## 11 Repository & Publication Requirements

### 11.1 Repository Access Requirements
- **REP-01**: Repositories shall provide public read-only access
- **REP-02**: GitHub repositories shall use version control for key updates
- **REP-03**: IPFS repositories shall use content addressing for immutability
- **REP-04**: Repository URLs shall be deterministic and predictable
- **REP-05**: System shall gracefully handle repository access failures

### 11.2 Publication Security Requirements
- **PUB-01**: All registry publications shall include integrity verification
- **PUB-02**: Private keys shall never be included in published registries
- **PUB-03**: Registry updates shall be cryptographically signed
- **PUB-04**: Publication sessions shall be logged without storing private data
- **PUB-05**: Students shall be informed about public key publication

## 12 Acceptance Criteria  
- All critical test cases (TC‑P01…TC‑P07, TC‑S01…TC‑S05) pass on multiple browsers
- Ledger Nano X integration works on Windows/macOS/Linux
- Complete ZKP verification succeeds offline
- Digital signature verification succeeds with public keys
- Yearly circuit deployment creates independent NFT contracts
- Minimal external API calls (blockchain + repositories only) detected in network monitoring
- Tauri apps build to single executable files
- Verification key publication and retrieval work reliably
- Repository publication security verified through integrity checks
- Registry management handles 100+ students without performance degradation

## 13 Constraints  
- **Hardware**: Ledger Nano X required for Responsible Party System
- **Browser**: Chrome 111+/Edge 111+/Safari 16.4+ (WebAuthn Level 2)
- **Network**: Polygon zkEVM (mainnet for production, Cardona for testing)
- **Network**: IPFS/GitHub access required for key registry publication and retrieval
- **File Size**: Circuit files <50MB, proof files <5MB, key registries <10MB
- **Yearly Limit**: Maximum 10,000 document owners per issuance year
- **Repository**: Public repository access required for verification key distribution

## 14 Risk Management
| ID | Risk | Probability | Impact | Mitigation |  
|----|------|-----------|--------|-----------|  
| R‑1 | Passkey device loss | Medium | High | Re‑registration flow + Merkle root update |  
| R‑2 | Ledger supply chain attack | Low | Critical | Firmware verification + secure delivery |
| R‑3 | Circom circuit bugs | Medium | High | Formal verification + extensive testing |
| R‑4 | Browser compatibility | Low | Medium | Feature detection + graceful degradation |
| R‑5 | Polygon zkEVM outage | Low | Medium | Local verification mode + RPC fallbacks |
| R‑6 | Repository unavailability | Medium | Medium | Multiple repository mirrors + local cache |
| R‑7 | Key registry corruption | Low | High | Cryptographic integrity verification + backup repositories |
| R‑8 | Private key compromise | Low | Critical | Key rotation + registry updates |

## 15 Compliance & Standards
- **PDF**: ISO 32000-2 (PDF 2.0) + ISO 19005-3 (PDF/A-3)
- **Cryptography**: FIPS 186-4 (ES-256), NIST SP 800-185 (SHA-3)
- **Digital Signatures**: RFC 7517 (JSON Web Key), RFC 7515 (JSON Web Signature)
- **WebAuthn**: W3C Web Authentication Level 2
- **ZKP**: Groth16 (standardized) + Powers of Tau ceremony
- **EIP**: EIP-191 (Ethereum personal message signing)
- **Repository**: IPFS (RFC content addressing), Git (version control)

---

