# Functional Design Specification (FSD) — ZK Document Authenticity Framework
**Version 2.1 – 2025‑01‑20**

> **Universal Document Authenticity System** - Adaptable to any document type with graduation certificates as example implementation

---

## 1 Context Diagram  

```mermaid
graph TD
  subgraph "Prover System (Scholar Prover PWA)"
    A[PDF + inputs] --> B[Circom-SnarkJS Prover]
    B --> C{proof.json}
    C --> D[PDF/A‑3 writer]
  end
  subgraph "Responsible Party System (Executive Console Tauri)"
    E[Circuit Files] --> F[Ledger Nano X]
    F --> G[Yearly Set Deployment]
  end
  subgraph "Administrator System (Registrar Console Tauri)"
    H[Document Owner Keys JSON] --> I[Merkle Tree Builder]
    I --> J[PDF/A-3 Generator]
  end
  subgraph "Verifier System (Verifier UI SSG)"
    K[PDF Input] --> L[SnarkJS Verifier]
    L --> M[Verification Result]
  end
  D -->|send| K
  G -->|deploy| N[Polygon zkEVM YearNFT]
  L -->|query| N
```

## 2 User‑Interface Specifications  
### 2.1 Passkey Registration (Prover System)
| Element ID | Type | Description |  
|------------|------|-------------|  
| `btnRegister` | button | initiates `navigator.credentials.create()` |  
| `txtOwnerId` | input | document owner ID (validation: numeric) |  
| `localStorageKey` | storage | stores passkey info locally |

### 2.2 Proof Generator (Prover System)
| ID | Type | Validation |  
|----|------|------------|  
| `dropPdf` | drag‑zone | MIME `application/pdf` |  
| `txtDest` | text | SHA‑3‑512(dest) computed on blur |  
| `dateExpire` | date | must be ≤ 365 days future |  
| `btnGenerate` | button | disabled until inputs valid |  

### 2.3 Yearly Set Management (Responsible Party System)
| ID | Type | Description |
|----|------|-------------|
| `fileCircuit` | file | Document{Year}.circom upload |
| `filePtau` | file | Powers of Tau ceremony file |
| `btnLedgerSign` | button | triggers Ledger Nano X EIP-191 signature |
| `yearInput` | number | document issuance year (2025+) |

### 2.4 Document Owner Key Management (Administrator System)  
| ID | Type | Description |
|----|------|-------------|
| `fileOwnerKeys` | file | JSON file with document owner passkey data |
| `btnBuildMerkle` | button | constructs Poseidon Merkle Tree |
| `btnGeneratePDFs` | button | batch PDF/A-3 generation |

## 3 Detailed Workflow – Proof Generation  

```mermaid
sequenceDiagram
    participant Owner as Document Owner
    participant PWA as Prover System PWA
    participant LS as Local Storage
    participant Circuit as Circom Circuit

    Owner->>PWA: drag PDF + dest + expiry
    PWA->>PWA: calc pdfHash + destHash
    PWA->>Owner: WebAuthn getAssertion()
    Owner-->>PWA: pk, sig
    PWA->>LS: load circuit files
    LS-->>PWA: circuit.wasm, circuit.zkey
    PWA->>Circuit: snarkjs.groth16.fullProve()
    Circuit-->>PWA: proof.json + publicSignals
    PWA->>PWA: embed proof in PDF/A-3
    PWA-->>Owner: download enhanced PDF
```

## 4 Yearly Set Deployment (Responsible Party System)

```mermaid
sequenceDiagram
    participant RP as Responsible Party
    participant RPS as Responsible Party System
    participant Ledger as Ledger Nano X
    participant Chain as Polygon zkEVM

    RP->>RPS: upload Document{Year}.circom
    RPS->>RPS: compile with circom + snarkjs
    RPS->>RPS: calculate VK hash
    RP->>RPS: initiate yearly set deployment
    RPS->>Ledger: request EIP-191 signature
    Ledger->>RP: display operation details
    RP->>Ledger: confirm on device
    Ledger-->>RPS: signed message
    RPS->>Chain: deploy YearlySet{Year}
    Chain-->>RPS: contract addresses
    RPS->>RPS: save to local JSON config
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

### 6.1 Responsible Party System (Tauri)
```
config/
├── yearly-sets.json          # deployed yearly sets
├── circuits/Document{Year}.circom
├── build/Document{Year}.zkey
├── build/Document{Year}_vk.json
└── signatures/operations.log  # Ledger signature log
```

### 6.2 Administrator System (Tauri)  
```
data/
├── owners-{year}.json         # document owner passkey data
├── merkle-tree-{year}.json    # computed Merkle tree
├── generated-pdfs/{year}/     # batch generated PDFs
└── config.json               # app configuration
```

### 6.3 Prover System (PWA)
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
| FR‑02 | TC‑P02 | `circuits/Document{Year}.circom` |  
| FR‑03 | TC‑N03 | `verifier-ui/expiry-check.ts` |  
| FR‑04 | TC‑N04 | `verifier-ui/vk-verification.ts` |
| FR‑05 | TC‑P05 | `executive-console/ledger-integration.ts` |

---

