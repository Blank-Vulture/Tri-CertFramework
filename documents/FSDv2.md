# Functional Design Specification (FSD) — ZK-CertFramework
**Version 2.0 – 2025‑06‑17**

---

## 1 Context Diagram  

```mermaid
graph TD
  subgraph "Scholar Prover (PWA)"
    A[PDF + inputs] --> B[Circom-SnarkJS Prover]
    B --> C{proof.json}
    C --> D[PDF/A‑3 writer]
  end
  subgraph "Executive Console (Electron)"
    E[Circuit Files] --> F[Ledger Nano X]
    F --> G[Yearly Set Deployment]
  end
  subgraph "Registrar Console (Electron)"
    H[Student Keys JSON] --> I[Merkle Tree Builder]
    I --> J[PDF/A-3 Generator]
  end
  subgraph "Verifier UI (SSG)"
    K[PDF Input] --> L[SnarkJS Verifier]
    L --> M[Verification Result]
  end
  D -->|send| K
  G -->|deploy| N[Polygon zkEVM YearNFT]
  L -->|query| N
```

## 2 User‑Interface Specifications  
### 2.1 Passkey Registration (Scholar Prover)
| Element ID | Type | Description |  
|------------|------|-------------|  
| `btnRegister` | button | initiates `navigator.credentials.create()` |  
| `txtStudentId` | input | student ID (validation: numeric) |  
| `localStorageKey` | storage | stores passkey info locally |

### 2.2 Proof Generator (Scholar Prover)
| ID | Type | Validation |  
|----|------|------------|  
| `dropPdf` | drag‑zone | MIME `application/pdf` |  
| `txtDest` | text | SHA‑3‑512(dest) computed on blur |  
| `dateExpire` | date | must be ≤ 365 days future |  
| `btnGenerate` | button | disabled until inputs valid |  

### 2.3 Yearly Set Management (Executive Console)
| ID | Type | Description |
|----|------|-------------|
| `fileCircuit` | file | Certificate{Year}.circom upload |
| `filePtau` | file | Powers of Tau ceremony file |
| `btnLedgerSign` | button | triggers Ledger Nano X EIP-191 signature |
| `yearInput` | number | graduation year (2025+) |

### 2.4 Student Key Management (Registrar Console)  
| ID | Type | Description |
|----|------|-------------|
| `fileStudentKeys` | file | JSON file with student passkey data |
| `btnBuildMerkle` | button | constructs Poseidon Merkle Tree |
| `btnGeneratePDFs` | button | batch PDF/A-3 generation |

## 3 Detailed Workflow – Proof Generation  

```plantuml
@startuml
actor Student
participant "Scholar Prover PWA" as PWA
participant "Local Storage" as LS
participant "Circom Circuit" as Circuit

Student -> PWA : drag PDF + dest + expiry
PWA -> PWA : calc pdfHash + destHash
PWA -> Student : WebAuthn getAssertion()
Student --> PWA : pk, sig
PWA -> LS : load circuit files
LS --> PWA : circuit.wasm, circuit.zkey
PWA -> Circuit : snarkjs.groth16.fullProve()
Circuit --> PWA : proof.json + publicSignals
PWA -> PWA : embed proof in PDF/A-3
PWA --> Student : download enhanced PDF
@enduml
```

## 4 Yearly Set Deployment (Executive Console)

```plantuml
@startuml
actor Professor
participant "Executive Console" as EC
participant "Ledger Nano X" as Ledger
participant "Polygon zkEVM" as Chain

Professor -> EC : upload Circuit{Year}.circom
EC -> EC : compile with circom + snarkjs
EC -> EC : calculate VK hash
Professor -> EC : initiate yearly set deployment
EC -> Ledger : request EIP-191 signature
Ledger -> Professor : display operation details
Professor -> Ledger : confirm on device
Ledger --> EC : signed message
EC -> Chain : deploy YearlySet{Year}
Chain --> EC : contract addresses
EC -> EC : save to local JSON config
@enduml
```

## 5 Data Dictionary  

| Field | Type | Notes |  
|-------|------|-------|  
| `commit` | hex(64) | Poseidon256(pk) |  
| `vkHash` | hex(128) | SHA‑3‑512 of VK |  
| `merkleRoot` | hex(64) | Poseidon256 |  
| `yearlySetAddr` | hex(40) | deployed contract address |
| `circuitHash` | hex(128) | SHA‑3‑512 of circuit file |
| `ledgerSignature` | hex(130) | EIP-191 signature from Ledger |

## 6 Local Storage Architecture

### 6.1 Executive Console (Electron)
```
config/
├── yearly-sets.json          # deployed yearly sets
├── circuits/Certificate{Year}.circom
├── build/Certificate{Year}.zkey
├── build/Certificate{Year}_vk.json
└── signatures/operations.log  # Ledger signature log
```

### 6.2 Registrar Console (Electron)  
```
data/
├── students-{year}.json       # student passkey data
├── merkle-tree-{year}.json    # computed Merkle tree
├── generated-pdfs/{year}/     # batch generated PDFs
└── config.json               # app configuration
```

### 6.3 Scholar Prover (PWA)
```
localStorage:
- passkey_info: {publicKey, credentialId}
- circuit_cache: {wasm, zkey, vk} 
- proof_history: [{pdfHash, timestamp, proofId}]
```

## 7 Error Handling  

| Code | Message | UI Action |  
|------|---------|-----------|  
| 1001 | INVALID_PDF_HASH | show red banner |  
| 1002 | EXPIRED | show yellow banner |  
| 1003 | LEDGER_DISCONNECTED | show connection dialog |
| 1004 | CIRCUIT_COMPILE_FAILED | show error details |
| 1005 | SNARKJS_PROOF_FAILED | retry with different inputs |

## 8 Trust Minimization Features

### 8.1 No External Dependencies
- ✅ Zero backend servers
- ✅ Zero databases  
- ✅ Zero cloud APIs
- ✅ Zero IPFS/external storage

### 8.2 Trusted Components Only
- 🔐 Polygon zkEVM (public blockchain)
- 📱 Ledger Nano X (hardware verified)
- 🌐 npm packages (build-time verified)
- 💻 Browser standard APIs

### 8.3 Yearly Independence
- Each year = completely separate circuit + VK + NFT
- No key rotation complexity
- No cross-year dependencies
- Simple verification logic

## 9 Traceability Matrix  

| ReqID | TestID | Module/Implementation |  
|-------|--------|-----------------------|  
| FR‑01 | TC‑P01 | `scholar-prover/pdf-embedder.ts` |
| FR‑02 | TC‑P02 | `circuits/Certificate{Year}.circom` |  
| FR‑03 | TC‑N03 | `verifier-ui/expiry-check.ts` |  
| FR‑04 | TC‑N04 | `verifier-ui/vk-verification.ts` |
| FR‑05 | TC‑P05 | `executive-console/ledger-integration.ts` |

---

