# Software Requirements Specification (SRS) — Zero‑Knowledge Document Authenticity Framework 
**Version 2.2 – 2025‑06‑21**

> **Universal Document Authenticity System** - Adaptable to any document type with graduation certificates as example implementation

---

## 1 Purpose  
Provide a **trust‑minimized, fully backendless** universal document authenticity system where **only the document owner can generate time‑bound zero‑knowledge proofs (ZKP)** using Circom circuits and SnarkJS, with **Ledger Nano X hardware security** for responsible party operations and **QR code-based passkey collection** for efficient administrator workflows. Any verifier can confirm authenticity using only the PDF file and on‑chain Polygon zkEVM data.

## 2 Scope  
### In Scope  
* **Prover System (Scholar Prover PWA)**: Passkey registration + Circom/SnarkJS proof generation + PDF/A‑3 embedding + QR code export
* **Responsible Party System (Executive Console Tauri)**: Ledger-secured yearly circuit deployment + VK management
* **Administrator System (Registrar Console Tauri)**: Local document owner key management + QR code scanning + Merkle tree + PDF batch generation
* **Verifier System (Verifier UI SSG)**: Offline verification with SnarkJS + on-chain VK validation
* **Yearly Independence**: Complete separation between document issuance years (2025, 2026, etc.)
* **QR Code Collection**: Camera-based passkey data collection workflow

### Out of Scope  
* Backend servers or databases
* Cloud APIs or external storage (IPFS, AWS, etc.)
* Mobile‑native applications
* Complex key rotation schemes
* Cross-year dependencies
* Remote QR code processing services

## 3 Definitions  
| Term | Definition |  
|------|-----------|  
| **Passkey** | WebAuthn/FIDO2 credential (ES‑256) stored in browser |  
| **Commit** | Poseidon256(pk_passkey) → 32 bytes |  
| **YearlySet** | Independent circuit + VK + NFT for each document issuance year |
| **Proof** | Circom/SnarkJS Groth16 proof, ~2KB JSON |  
| **Ledger EIP-191** | Hardware-signed personal messages for admin authentication |
| **Trust Minimization** | Zero external dependencies except public blockchain |

## 4 Actors & Interests  
* **Document Owner** – generates verifiable document authenticity proofs; no gas fees, no CLI, browser-only experience
* **Responsible Party** – deploys yearly circuits using Ledger Nano X; minimal setup complexity
* **Administrator (Registrar)** – manages document owner data locally; batch PDF generation
* **Verifier** – drags-&-drops PDF and instantly verifies authenticity offline
* **Blockchain (Polygon zkEVM)** – stores yearly NFTs; provides public verifiability

## 5 Four-System Architecture

### 5.1 Prover System (Document Owner Interface)
- **Type**: Progressive Web App (PWA)
- **Purpose**: ZKP generation and PDF embedding
- **Storage**: Browser localStorage + IndexedDB
- **Dependencies**: WebAuthn + Circom WASM + pdf-lib

### 5.2 Responsible Party System (Responsible Party Interface)  
- **Type**: Tauri desktop application
- **Purpose**: Yearly circuit deployment with Ledger security
- **Storage**: Local JSON files + circuit files
- **Dependencies**: Ledger Nano X + Web3 + Circom compiler

### 5.3 Administrator System (Administrator Interface)
- **Type**: Tauri desktop application  
- **Purpose**: Document owner key management + PDF generation
- **Storage**: Local JSON files + generated PDFs
- **Dependencies**: Poseidon hash + PDF generation libraries

### 5.4 Verifier System (Verifier Interface)
- **Type**: Static site (Next.js 15 SSG + App Router)
- **Purpose**: Document verification
- **Storage**: No persistent storage
- **Dependencies**: SnarkJS verifier + Polygon zkEVM RPC

## 6 Use‑Case Summary  
1. **UC‑01 Document Owner Passkey Registration** (Prover System)
2. **UC‑02 Yearly Circuit Deployment** (Responsible Party System + Ledger)
3. **UC‑03 Document Owner Key Import & Merkle Tree** (Administrator System)
4. **UC‑04 ZKP Generation & PDF Embedding** (Prover System)
5. **UC‑05 Document Verification** (Verifier System)
6. **UC‑06 QR Code Passkey Export** (Prover System)
7. **UC‑07 QR Code Scanning & Collection** (Administrator System)

## 7 Functional Requirements  
| ID | Requirement | Implementation | Fit Crit (TestID) |  
|----|-------------|---------------|------------------|  
| FR‑01 | System shall embed SnarkJS `proof.json` into PDF/A‑3 | Prover System | TC‑P01 |  
| FR‑02 | Proof shall verify ES‑256 signature & Merkle inclusion in Circom circuit | All circuits | TC‑P02 |  
| FR‑03 | Proof expires when `expireTs < now()` | Verifier System | TC‑N03 |  
| FR‑04 | Verifier shall query YearNFT and reject if `vkHash` mismatch | Verifier System | TC‑N04 |
| FR‑05 | All responsible party operations shall require Ledger Nano X EIP-191 signature | Responsible Party System | TC‑P05 |
| FR‑06 | Each document issuance year shall be completely independent | All systems | TC‑P06 |
| FR‑07 | System shall work without any backend servers | Architecture | TC‑P07 |
| FR‑08 | Prover System shall generate QR codes containing passkey data | Prover System | TC‑Q01 |
| FR‑09 | Administrator System shall scan QR codes using device camera | Administrator System | TC‑Q02 |
| FR‑10 | QR code collection shall detect and prevent duplicate entries | Administrator System | TC‑Q03 |
| FR‑11 | QR codes shall contain integrity verification (checksums) | Both systems | TC‑Q04 |
| FR‑12 | Camera access shall be local-only with no external transmission | Administrator System | TC‑Q05 |

## 8 Non‑Functional Requirements  
| Category | Metric | Target | Notes |
|----|--------|--------|-------|  
| Performance | Circom proof generation | ≤ 10s @ M1/1‑core | SnarkJS WASM optimization |
| Performance | SnarkJS verification | ≤ 100ms | Browser WASM |
| Performance | QR code generation | ≤ 500ms | Local generation only |
| Performance | QR code scanning | ≤ 1s per scan | Real-time camera processing |
| Security | Quantum resistance | SHA‑3‑512 hashes | 256-bit post-quantum security |
| Security | Hardware security | Ledger Nano X required | EIP-191 personal message signing |
| Security | QR code integrity | SHA-3 checksums | Tamper detection |
| UX | Offline verification | 100% air-gapped | No network dependencies |  
| UX | QR scanning success rate | ≥ 95% | Normal lighting conditions |
| Trust | External dependencies | Polygon zkEVM only | Zero cloud services |
| Storage | Local file limits | <100MB per year | Circuit + key files |
| Privacy | Camera data | No storage/transmission | Local processing only |

## 9 Security Requirements

### 9.1 Trust Minimization Principles
| Principle | Implementation |
|-----------|---------------|
| **No Servers** | All systems run locally (Tauri/PWA/SSG) |
| **No Databases** | JSON files + browser storage only |
| **No APIs** | Direct blockchain RPC only |
| **Hardware Security** | Ledger Nano X for all responsible party operations |
| **Yearly Independence** | No shared secrets between years |
| **Local QR Processing** | Camera data processed locally, no uploads |

### 9.2 QR Code Security Requirements
| Requirement | Implementation |
|-------------|---------------|
| **Local Generation** | QR codes generated client-side using qrcode.js |
| **Integrity Verification** | SHA-3 checksums embedded in QR payload |
| **Camera Privacy** | No image storage, no network transmission |
| **Session Management** | Time-bounded collection sessions |
| **Duplicate Prevention** | Real-time duplicate detection during scanning |
| **Data Validation** | Strict JSON schema validation on scan |

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

## 10 QR Code Collection Requirements

### 10.1 UC-06: QR Code Passkey Export (Prover System)
**Primary Actor**: Document Owner (Student)
**Preconditions**: 
- WebAuthn passkey registration completed
- Scholar Prover PWA loaded
- Device camera/screen available

**Main Flow**:
1. Student accesses passkey export feature
2. System generates QR code containing passkey data
3. QR code displayed on screen with instructions
4. Student presents QR code to administrator
5. Administrator scans QR code with Registrar Console
6. System provides success/failure feedback

**Postconditions**: 
- Passkey data successfully transmitted via QR
- No sensitive data stored in QR history

### 10.2 UC-07: QR Code Scanning & Collection (Administrator System)
**Primary Actor**: Administrator (University Staff)
**Preconditions**:
- Registrar Console application running
- Device camera available and accessible
- Target year selected for collection

**Main Flow**:
1. Administrator starts QR collection session
2. System initializes camera and scanning interface
3. For each student:
   a. Student displays QR code on device
   b. Administrator positions camera to scan QR
   c. System decodes and validates QR data
   d. System checks for duplicates
   e. System adds valid data to collection buffer
   f. System provides immediate feedback
4. Administrator completes collection session
5. System saves collected data to owners-{year}.json
6. System generates collection summary report

**Postconditions**:
- All valid passkey data collected and stored
- Duplicate entries prevented
- Collection session logged for audit

### 10.3 QR Code Data Requirements
```json
{
  "version": "2.2",
  "type": "passkey_export", 
  "year": 2025,
  "studentId": "2025001",
  "passkey": {
    "publicKey": "base64-encoded-cose-key",
    "credentialId": "base64-credential-id",
    "algorithm": -7
  },
  "metadata": {
    "name": "Student Name",
    "email": "student@university.edu", 
    "generatedAt": 1704067200000
  },
  "integrity": {
    "checksum": "sha3-512-hash-of-payload",
    "signature": "ed25519-signature"
  }
}
```

## 11 Camera & Privacy Requirements

### 11.1 Camera Access Requirements
- **CAM-01**: Camera access shall be requested only when QR scanning is initiated
- **CAM-02**: Camera preview shall be displayed in real-time during scanning
- **CAM-03**: No camera images shall be saved to disk or transmitted over network
- **CAM-04**: Camera access shall be released immediately after scanning session ends
- **CAM-05**: System shall gracefully handle camera permission denial

### 11.2 Privacy Protection Requirements
- **PRIV-01**: QR scanning shall process frames in memory only
- **PRIV-02**: No personal data shall be extracted from camera frames except QR codes
- **PRIV-03**: QR code content shall be validated before storage
- **PRIV-04**: Collection sessions shall be logged without storing QR image data
- **PRIV-05**: Students shall be informed about data collection before QR generation

## 12 Acceptance Criteria  
- All critical test cases (TC‑P01…TC‑P07, TC‑Q01…TC‑Q05) pass on multiple browsers
- Ledger Nano X integration works on Windows/macOS/Linux
- Complete air-gapped verification succeeds
- Yearly circuit deployment creates independent NFT contracts
- Zero external API calls detected in network monitoring
- Tauri apps build to single executable files
- QR code generation and scanning work in normal lighting conditions
- Camera privacy requirements verified through network monitoring
- Collection session handles 100+ students without performance degradation

## 13 Constraints  
- **Hardware**: Ledger Nano X required for Responsible Party System
- **Hardware**: Device camera required for Administrator System QR scanning
- **Browser**: Chrome 111+/Edge 111+/Safari 16.4+ (WebAuthn Level 2)
- **Camera**: Camera access permissions required for QR scanning
- **Network**: Polygon zkEVM (mainnet for production, Amoy for testing)
- **File Size**: Circuit files <50MB, proof files <5MB
- **Yearly Limit**: Maximum 10,000 document owners per issuance year
- **QR Capacity**: QR codes limited to ~900 characters (Version 3)

## 14 Risk Management
| ID | Risk | Probability | Impact | Mitigation |  
|----|------|-----------|--------|-----------|  
| R‑1 | Passkey device loss | Medium | High | Re‑registration flow + Merkle root update |  
| R‑2 | Ledger supply chain attack | Low | Critical | Firmware verification + secure delivery |
| R‑3 | Circom circuit bugs | Medium | High | Formal verification + extensive testing |
| R‑4 | Browser compatibility | Low | Medium | Feature detection + graceful degradation |
| R‑5 | Polygon zkEVM outage | Low | Medium | Local verification mode + RPC fallbacks |
| R‑6 | Camera access denied | Medium | Medium | Manual file import fallback |
| R‑7 | QR code scanning failure | Low | Low | Multiple scan attempts + manual entry |
| R‑8 | Poor lighting conditions | Medium | Low | Scan guidance + lighting recommendations |

## 15 Compliance & Standards
- **PDF**: ISO 32000-2 (PDF 2.0) + ISO 19005-3 (PDF/A-3)
- **Cryptography**: FIPS 186-4 (ES-256), NIST SP 800-185 (SHA-3)
- **WebAuthn**: W3C Web Authentication Level 2
- **ZKP**: Groth16 (standardized) + Powers of Tau ceremony
- **EIP**: EIP-191 (Ethereum personal message signing)

---

