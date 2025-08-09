# Technical Design Specification (TSD) — Tri-CertFramework
**Version 2.4 – 2025‑08‑09**

> **Tri-Certification Framework** - ZKP + Blockchain + Digital Signature for Universal Document Authenticity

---

## 1 Cryptographic Primitives  

| Purpose | Algorithm | Output | Rationale |  
|---------|-----------|--------|-----------|  
| External hash | SHA‑3‑512 | 512 bit | Grover ⇒ 256‑bit quantum security |  
| Internal hash | Poseidon‑256 | 256 bit | ZK‑friendly; low constraints |  
| Digital signature | ES‑256 (ECDSA) | r,s 32 B | WebAuthn L2 + RFC 7515 |  
| Verification key | P‑256 public key | 64 B | RFC 7517 JWK format |
| Admin auth | EIP‑191 (Ledger) | 65 B | Hardware personal message signing |
| ZKP system | Groth16 | ~2KB JSON | Circom + SnarkJS standard |
| Key integrity | SHA‑3‑512 | 512 bit | Registry integrity verification |

---

## 2 Circom Circuit Design

### 2.1 Document{Year}.circom Template
```circom
pragma circom 2.1.4;

include "poseidon.circom";
include "ecdsa.circom";
include "merkle-tree.circom";

template DocumentProof() {
    // Public inputs
    signal input vkHash;
    signal input schemaHash; 
    signal input merkleRoot;
    signal input pdfHash;
    signal input destHash;
    signal input expireTs;
    
    // Private inputs (for ZKP)
    signal input privateKey;
    signal input signature[2]; // [r, s] - digital signature
    signal input merkleProof[8];
    signal input merkleIndex;
    
    // Outputs
    signal output valid;
    
    // 1. Verify digital signature (ES256/ECDSA)
    component ecdsa = ECDSAVerify();
    ecdsa.publicKey <== privateKey;
    ecdsa.signature <== signature;
    ecdsa.message <== poseidon4([pdfHash, destHash, expireTs, 0]);
    
    // 2. Verify Merkle inclusion (verification key in registry)
    component merkle = MerkleTreeChecker(8);
    merkle.leaf <== poseidon1([privateKey]); // verification key hash
    merkle.root <== merkleRoot;
    merkle.pathElements <== merkleProof;
    merkle.pathIndices <== merkleIndex;
    
    // 3. Combine ZKP and signature verifications
    valid <== ecdsa.valid * merkle.valid;
}
```

### 2.2 Circuit Specifications
| Parameter | Value | Notes |
|-----------|-------|-------|
| Constraints | ~65,000 | Optimized for browser |
| Proof size | ~2KB JSON | Groth16 serialized |
| Proving time | 5-15s | M1 MacBook, 1 core |
| Verification | 50-100ms | SnarkJS WASM |

---

## 3 System Technology Stacks

### 3.1 Prover System (Scholar Prover PWA)
```typescript
// Technology Stack
- Framework: React 18 + Vite 4
- ZKP: Circom 2.1.4 + SnarkJS 0.7
- PDF: pdf-lib + PDF/A-3 embedder
- Storage: IndexedDB + localStorage
- Auth: WebAuthn Level 2
- Digital Signature: Web Crypto API + JWK format
- Build: Vite PWA plugin

// Circuit Integration with Digital Signature
import { groth16 } from "snarkjs";

const generateProofWithSignature = async (
  inputs: CircuitInputs,
  pdfHash: string
) => {
  // Generate ZKP
  const { proof, publicSignals } = await groth16.fullProve(
    inputs,
    "/circuit.wasm",
    "/circuit_final.zkey"
  );
  
  // Generate digital signature of PDF hash
  const signature = await generateDigitalSignature(pdfHash);
  
  return { proof, publicSignals, digitalSignature: signature };
};

// Digital Signature Implementation
const generateDigitalSignature = async (data: string) => {
  const credential = await navigator.credentials.get({
    publicKey: { challenge: new TextEncoder().encode(data) }
  });
  return credential.response.signature;
};
```

### 3.2 Responsible Party System (Executive Console Tauri)
```typescript
// Technology Stack  
- Framework: React 18 + TypeScript + Tauri v2
- Ledger: @ledgerhq/hw-transport-node-hid
- Web3: ethers.js v6
- Compiler: circom CLI + snarkjs
- Storage: Tauri fs API + JSON files

// Ledger EIP-191 Integration
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import AppEth from "@ledgerhq/hw-app-eth";

const signWithLedger = async (message: string) => {
  const transport = await TransportNodeHid.create();
  const eth = new AppEth(transport);
  
  const signature = await eth.signPersonalMessage(
    "44'/60'/0'/0/0",
    Buffer.from(message, 'utf8').toString('hex')
  );
  
  return `0x${signature.r}${signature.s}${signature.v.toString(16)}`;
};
```

### 3.3 Administrator System (Registrar Console Tauri)
```typescript
// Technology Stack
- Framework: React 18 + TypeScript + Tauri v2
- Hash: @noble/hashes (Poseidon implementation)
- PDF: puppeteer + PDF/A-3 templates
- Storage: Tauri fs API + JSON files
- Merkle: Custom Poseidon Merkle tree
- Repository: IPFS HTTP API + GitHub API
- Crypto: Web Crypto API for key validation

// Verification Key Registry Management
import { poseidon2 } from "@noble/hashes/poseidon";

class VerificationKeyRegistry {
  private keys: VerificationKey[] = [];
  
  async loadKeys(filePath: string): Promise<void> {
    const content = await invoke('read_file', { path: filePath });
    this.keys = JSON.parse(content);
    await this.validateKeys();
  }
  
  async publishToGitHub(repoUrl: string, token: string): Promise<string> {
    const registry = this.buildRegistry();
    const response = await fetch(`${repoUrl}/contents/registry.json`, {
      method: 'PUT',
      headers: { 'Authorization': `token ${token}` },
      body: JSON.stringify({
        message: 'Update verification key registry',
        content: btoa(JSON.stringify(registry, null, 2))
      })
    });
    return response.url;
  }
  
  async publishToIPFS(apiUrl: string): Promise<string> {
    const registry = this.buildRegistry();
    const response = await fetch(`${apiUrl}/api/v0/add`, {
      method: 'POST',
      body: JSON.stringify(registry)
    });
    const result = await response.json();
    return result.Hash;
  }
}

// Merkle Tree with Verification Keys
class VerificationKeyMerkleTree {
  buildTree(keys: VerificationKey[]): MerkleTree {
    const leaves = keys.map(key => 
      poseidon2([BigInt(key.keyHash)])
    );
    return this.computeLevels(leaves);
  }
}
```

### 3.4 Verifier System (Verifier UI SSG)
```typescript
// Technology Stack
- Framework: Next.js 15 (SSG mode) + App Router
- ZKP: SnarkJS 0.7 (verification only)
- PDF: PDF.js + attachment extraction
- Web3: ethers.js v6 (read-only)
- Digital Signature: Web Crypto API for ES256 verification
- Repository: HTTP client for IPFS/GitHub access
- Deploy: Static export to GitHub Pages

// Complete Verification Flow (ZKP + Digital Signature)
const verifyDocument = async (pdfFile: File) => {
  // 1. Extract proof and signature from PDF/A-3
  const { proof, publicSignals, digitalSignature } = await extractFromPDF(pdfFile);
  
  // 2. Get VK from blockchain
  const circuitVK = await getCircuitVerifyingKey(publicSignals.year);
  
  // 3. Get verification key registry from repository
  const verificationKeys = await getVerificationKeyRegistry(publicSignals.year);
  
  // 4. Verify ZKP
  const zkpValid = await groth16.verify(circuitVK, publicSignals, proof);
  
  // 5. Verify digital signature
  const signatureValid = await verifyDigitalSignature(
    digitalSignature,
    publicSignals.pdfHash,
    verificationKeys
  );
  
  return { 
    zkpValid, 
    signatureValid, 
    expiry: publicSignals.expireTs,
    isValid: zkpValid && signatureValid
  };
};

// Digital Signature Verification
const verifyDigitalSignature = async (
  signature: ArrayBuffer,
  pdfHash: string,
  keyRegistry: VerificationKeyRegistry
) => {
  const publicKey = await findVerificationKey(signature, keyRegistry);
  if (!publicKey) return false;
  
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    publicKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  );
  
  return await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    signature,
    new TextEncoder().encode(pdfHash)
  );
};

// Repository Access
const getVerificationKeyRegistry = async (year: number) => {
  const registryUrl = `https://ipfs.io/ipfs/${getRegistryHash(year)}`;
  const response = await fetch(registryUrl);
  return await response.json();
};
```

---

## 4 Smart Contract Architecture

### 4.1 YearlyDeploymentManager.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract YearlyDeploymentManager {
    struct YearlySet {
        uint256 year;
        address nftContract;
        bytes32 vkHash;          // SHA3-512 of verifying key
        bytes32 circuitHash;     // SHA3-512 of circuit file  
        bytes32 merkleRoot;      // Poseidon Merkle root
        uint256 deployedAt;
    }
    
    mapping(uint256 => YearlySet) public yearlySets;
    address public immutable deployer;
    
    event YearlySetDeployed(
        uint256 indexed year,
        address nftContract,
        bytes32 vkHash,
        bytes32 circuitHash
    );
    
    modifier onlyDeployer() {
        require(msg.sender == deployer, "Unauthorized");
        _;
    }
    
    constructor() {
        deployer = msg.sender;
    }
    
    function createYearlySet(
        uint256 year,
        bytes32 vkHash,
        bytes32 circuitHash,
        bytes32 merkleRoot,
        string calldata nftName,
        string calldata nftSymbol
    ) external onlyDeployer returns (address) {
        require(yearlySets[year].deployedAt == 0, "Year exists");
        
        // Deploy independent NFT contract
        GraduationNFT nft = new GraduationNFT(
            year,
            vkHash,
            merkleRoot,
            nftName,
            nftSymbol
        );
        
        yearlySets[year] = YearlySet({
            year: year,
            nftContract: address(nft),
            vkHash: vkHash,
            circuitHash: circuitHash,
            merkleRoot: merkleRoot,
            deployedAt: block.timestamp
        });
        
        emit YearlySetDeployed(year, address(nft), vkHash, circuitHash);
        return address(nft);
    }
}
```

### 4.2 GraduationNFT{Year}.sol
```solidity
contract GraduationNFT is ERC721 {
    uint256 public immutable GRADUATION_YEAR;
    bytes32 public immutable VK_HASH;
    bytes32 public merkleRoot;
    
    mapping(address => bool) public hasClaimed;
    uint256 private _tokenIdCounter;
    
    constructor(
        uint256 _year,
        bytes32 _vkHash,
        bytes32 _merkleRoot,
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) {
        GRADUATION_YEAR = _year;
        VK_HASH = _vkHash;
        merkleRoot = _merkleRoot;
    }
    
    function mintGraduationNFT(
        bytes calldata snarkProof,
        uint256[] calldata publicInputs,
        bytes32[] calldata merkleProof
    ) external {
        require(!hasClaimed[msg.sender], "Already claimed");
        
        // Simple validation (full verification in Scholar Prover)
        require(publicInputs[5] / 1000000 == GRADUATION_YEAR, "Wrong year");
        require(block.timestamp < publicInputs[5], "Expired");
        
        hasClaimed[msg.sender] = true;
        uint256 tokenId = _tokenIdCounter++;
        
        _safeMint(msg.sender, tokenId);
    }
}
```

---

## 5 Ledger Nano X Security Implementation

### 5.1 EIP-191 Message Structure
```typescript
interface LedgerAuthMessage {
  domain: "zk-cert-framework.local";
  operation: "deploy_yearly_set" | "update_config" | "export_data";
  year: number;
  timestamp: number;
  nonce: string;
  parameters: {
    vkHash?: string;
    circuitHash?: string;
    merkleRoot?: string;
  };
}

const generateEIP191Message = (auth: LedgerAuthMessage): string => {
  return `
🔐 zk-CertFramework Executive Console v2.0

⚠️  SECURITY WARNING ⚠️
Only sign if you initiated this action!

Operation: ${auth.operation}
Year: ${auth.year}
Timestamp: ${new Date(auth.timestamp).toISOString()}
Nonce: ${auth.nonce}
Domain: ${auth.domain}

VK Hash: ${auth.parameters.vkHash || 'N/A'}
Circuit Hash: ${auth.parameters.circuitHash || 'N/A'}

📱 Verify on Ledger screen:
- Operation matches your intention
- Year is correct: ${auth.year}
- Timestamp is recent

❌ NEVER sign if:
- You didn't initiate this action
- Domain is not zk-cert-framework.local
- Parameters don't match your intent
`;
};
```

### 5.2 Security Countermeasures
| Attack Vector | Countermeasure | Implementation |
|---------------|----------------|---------------|
| Replay attacks | Timestamp + nonce | 5-minute validity window |
| Phishing | Domain validation | Strict domain checking |
| Message tampering | Structured format | Human-readable verification |
| Device spoofing | Hardware verification | Ledger device verification |

---

## 6 Local Storage Architecture

### 6.1 File Structure Standards
```bash
# Executive Console
~/.zk-cert-framework/
├── config/
│   ├── yearly-sets.json
│   ├── network-config.json
│   └── ledger-settings.json
├── circuits/
│   ├── Document2025.circom
│   ├── Document2026.circom
│   └── common/poseidon.circom
├── build/
│   ├── Document2025.wasm
│   ├── Document2025.zkey
│   ├── Document2025_vk.json
│   └── powersOfTau_bn128_16.ptau
└── logs/
    ├── operations.log
    └── signatures.log

# Registrar Console  
~/.zk-cert-registrar/
├── data/
│   ├── owners-2025.json
│   ├── owners-2026.json
│   └── merkle-trees/
├── generated/
│   ├── pdfs-2025/
│   └── pdfs-2026/
└── config/
    └── settings.json
```

### 6.2 JSON Schema Standards
```typescript
// yearly-sets.json
interface YearlySetConfig {
  version: "2.4";
  sets: {
    [year: number]: {
      nftContract: string;
      vkHash: string;
      circuitHash: string;
      merkleRoot: string;
      deployedAt: number;
      txHash: string;
      registryUrl?: string; // IPFS/GitHub registry URL
    };
  };
}

// verification-keys-{year}.json
interface VerificationKeyData {
  version: "2.4";
  framework: "Tri-CertFramework";
  year: number;
  registryMetadata: {
    totalKeys: number;
    administrator: string;
    repositoryType: 'ipfs' | 'github';
    publishedAt: number;
    registryHash: string;
  };
  verificationKeys: {
    studentId: string;
    studentName: string;
    email: string;
    verificationKey: {
      kty: "EC";
      crv: "P-256";
      x: string;  // base64url
      y: string;  // base64url
      use: "sig";
      alg: "ES256";
    };
    keyHash: string;       // SHA-3-512(verification_key)
    commit: string;        // Poseidon(verification_key)
    generatedAt: number;
  }[];
  integrity: {
    registryHash: string;
    adminSignature: string;
  };
}

// published-registries/{year}/github-{repo}.json
interface PublicationRecord {
  repositoryType: 'github' | 'ipfs';
  url: string;
  hash: string;
  publishedAt: number;
  status: 'published' | 'failed' | 'updating';
}
```

---

## 7 Build & Deployment

### 7.1 Circuit Compilation Pipeline
```bash
# Powers of Tau (one-time setup)
snarkjs powersoftau new bn128 16 pot16_0000.ptau
snarkjs powersoftau contribute pot16_0000.ptau pot16_0001.ptau

# Per-year circuit compilation
circom Document2025.circom --r1cs --wasm --sym -o build/
snarkjs groth16 setup build/Document2025.r1cs pot16_final.ptau Document2025_0000.zkey
snarkjs zkey contribute Document2025_0000.zkey Document2025_final.zkey
snarkjs zkey export verificationkey Document2025_final.zkey Document2025_vk.json
```

### 7.2 Application Distribution
```bash
# Responsible Party System (Tauri)
npm run build:tauri
npm run tauri build

# Prover System (PWA)
npm run build:pwa
npm run deploy:gh-pages

# Administrator System (Tauri)  
npm run build:tauri-registrar
npm run tauri build --config tauri-registrar.config.js

# Verifier System (SSG)
npm run build:next
npm run export:static
```

---

## 8 Performance Optimizations

### 8.1 Circuit Optimization
- Constraint minimization: 65k → 45k constraints
- WASM optimization: `-O3` + `wasm-opt`
- Proof caching: Browser IndexedDB storage
- Parallel worker threads for proving

### 8.2 Application Performance
| System | Optimization | Target |
|-----------|-------------|--------|
| Prover System | WASM threading | <10s proof time |
| Responsible Party System | Native deps | <2s circuit compile |
| Administrator System | Batch processing | 100 PDFs/min |
| Verifier System | Static prerender | <100ms verification |

---

## 9 Testing Strategy

### 9.1 Circuit Testing
```bash
# Unit tests for each circuit component
npm run test:circuit -- --verbose

# Integration tests with sample data
npm run test:integration

# Performance benchmarks
npm run benchmark:circuits
```

### 9.2 E2E Testing
- Playwright: Cross-browser automation
- Hardware simulation: Mock Ledger interactions  
- PDF validation: Automated PDF/A-3 compliance
- Blockchain integration: Local hardhat node

---

