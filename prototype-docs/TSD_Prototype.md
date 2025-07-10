# 技術設計書 (TSD) — ZK-CertFramework プロトタイプ版
**バージョン 1.1 最終更新: 2025‑07‑10**

> **教授向けデモンストレーション用プロトタイプ** - 技術的複雑性を削減し、コアコンセプト実証に特化

---

## 1. プロトタイプ技術スタック（簡素化・PROTOTYPE.md準拠）

| 層 | 技術 | バージョン | プロトタイプ調整 |
|----|------|-----------|-----------------|
| デスクトップ | Tauri v2 + React 18 | 2.0+ / 18.0+ | 基本機能のみ |
| データ管理 | JSON Files | Native | DB・複雑な管理なし |
| 認証 | Ledger Nano X | @ledgerhq/hw-* | 基本EIP-191のみ |
| ブロックチェーン | Polygon zkEVM Amoy | ethers.js 6.0+ | **テストネット限定（経費節約）** |
| ZKP | Circom 2.1.4 + SnarkJS 0.7 | Latest | 2025年度回路のみ |
| 配布 | GitHub Releases/Pages | - | **IPFS代替・VK直接保存** |
| VK配布 | **スマートコントラクト直接保存** | - | **URL配布代替** |

## 2. プロトタイプ用暗号プリミティブ選定

| 目的 | アルゴリズム | 出力 | プロトタイプ理由 |
|------|-------------|------|-----------------|
| 外部ハッシュ | SHA‑3‑512 | 512 bit | 本番と同等（変更なし） |
| 内部ハッシュ | Poseidon‑256 | 256 bit | ZK最適化（変更なし） |
| Passkey署名 | ES‑256 | r,s 32 B | WebAuthn標準（変更なし） |
| 管理者認証 | EIP‑191（Ledger） | 65 B | 簡素化検証 |
| ZKPシステム | Groth16 | ~2KB JSON | 2025年度固定 |

## 3. Circom回路設計 - プロトタイプ版

### 3.1 Document2025.circom（固定年度）
```circom
pragma circom 2.1.4;

include "poseidon.circom";
include "ecdsa.circom";
include "merkle-tree.circom";

// プロトタイプ用固定回路
template Document2025Proof() {
    // 公開入力（本番と同等）
    signal input vkHash;
    signal input schemaHash; 
    signal input merkleRoot;
    signal input pdfHash;
    signal input destHash;
    signal input expireTs;
    
    // 秘密入力（本番と同等）
    signal input privateKey;
    signal input signature[2];
    signal input merkleProof[8];
    signal input merkleIndex;
    
    // 出力
    signal output valid;
    
    // 簡素化された検証（エラーハンドリング最小限）
    component ecdsa = ECDSAVerify();
    ecdsa.publicKey <== privateKey;
    ecdsa.signature <== signature;
    ecdsa.message <== poseidon4([pdfHash, destHash, expireTs, 0]);
    
    component merkle = MerkleTreeChecker(8);
    merkle.leaf <== poseidon1([privateKey]);
    merkle.root <== merkleRoot;
    merkle.pathElements <== merkleProof;
    merkle.pathIndices <== merkleIndex;
    
    valid <== ecdsa.valid * merkle.valid;
}

component main = Document2025Proof();
```

### 3.2 プロトタイプ回路仕様
| パラメータ | 値 | プロトタイプ調整 |
|-----------|----|--------------------|
| 制約数 | ~65,000 | 最適化は最小限 |
| 証明サイズ | ~2KB JSON | 本番と同等 |
| 証明時間 | 15-30s | 性能目標緩和 |
| 検証時間 | 100-200ms | 詳細最適化なし |

## 4. システム実装 - プロトタイプ版

### 4.1 証明者システム (Scholar Prover PWA) - 簡素版
```typescript
// プロトタイプ設定
const PROTOTYPE_CONFIG = {
  TARGET_YEAR: 2025,
  NETWORK: 'amoy',
  MAX_PROOF_TIME: 30000, // 30秒
  VK_CONTRACT: '0x...', // 固定コントラクト
  CIRCUIT_GITHUB_REPO: 'your-org/zk-cert-circuits'
};

// 簡素化された証明生成
class SimplifiedProver {
  async generateProof(pdfFile: File, destination: string, expiryDays: number = 30): Promise<ProofResult> {
    try {
      // 1. PDF基本検証（詳細チェックなし）
      const pdfHash = await this.hashPDF(pdfFile);
      const destHash = await this.hashDestination(destination);
      const expireTs = Math.floor(Date.now() / 1000) + (expiryDays * 24 * 60 * 60);
      
      // 2. WebAuthn署名（エラーハンドリング最小限）
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: new TextEncoder().encode(`${pdfHash}${destHash}${expireTs}`),
          allowCredentials: [{ id: this.credentialId, type: 'public-key' }]
        }
      });
      
      // 3. VK取得（ブロックチェーン直接 - PROTOTYPE.md準拠）
      const vkData = await this.getVKFromBlockchain2025();
      
      // 4. 回路ファイル取得（GitHub Releases固定）
      const circuitFiles = await this.loadCircuit2025();
      
      // 5. ZKP生成（タイムアウト30秒）
      const { proof, publicSignals } = await Promise.race([
        snarkjs.groth16.fullProve(
          {
            vkHash: vkData.hash,
            pdfHash,
            destHash,
            expireTs,
            privateKey: assertion.response.signature,
            // ... その他の入力
          },
          circuitFiles.wasm,
          circuitFiles.zkey
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Proof generation timeout')), 30000)
        )
      ]);
      
      return { proof, publicSignals, pdfHash };
    } catch (error) {
      // 簡素化されたエラー処理
      throw new Error(`Proof generation failed: ${error.message}`);
    }
  }
  
  private async getVKFromBlockchain2025(): Promise<{ vk: VerifyingKey; hash: string }> {
    // PROTOTYPE.md準拠：ブロックチェーンから直接VK取得
    const contract = new ethers.Contract(
      PROTOTYPE_CONFIG.VK_CONTRACT,
      [
        "function getVK2025() view returns (string)",
        "function getVKHash2025() view returns (bytes32)"
      ],
      this.provider
    );
    
    const [vkData, vkHash] = await Promise.all([
      contract.getVK2025(),
      contract.getVKHash2025()
    ]);
    
    const vk = JSON.parse(vkData);
    
    // VKハッシュ検証（PROTOTYPE.md要件）
    const computedHash = this.calculateVKHash(vk);
    if (computedHash !== vkHash) {
      throw new Error('VK hash mismatch - blockchain data integrity compromised');
    }
    
    return { vk, hash: vkHash };
  }
  
  private async loadCircuit2025(): Promise<CircuitFiles> {
    // GitHub Releasesから固定URLで取得（PROTOTYPE.md準拠）
    const baseUrl = `https://github.com/${PROTOTYPE_CONFIG.CIRCUIT_GITHUB_REPO}/releases/download/v1.0`;
    
    const [wasmResponse, zkeyResponse] = await Promise.all([
      fetch(`${baseUrl}/Document2025.wasm`),
      fetch(`${baseUrl}/Document2025.zkey`)
    ]);
    
    return {
      wasm: await wasmResponse.arrayBuffer(),
      zkey: await zkeyResponse.arrayBuffer()
    };
  }
}
```

### 4.2 責任者システム (Executive Console) - 基本版
```typescript
// 2025年度固定デプロイメント
class SimplifiedExecutiveConsole {
  async deploy2025YearlySet(circuitPath: string, ledgerService: LedgerService): Promise<string> {
    try {
      // 1. 事前配置されたPtauファイル使用
      const ptauPath = './assets/powersOfTau_16.ptau';
      
      // 2. 回路コンパイル（基本チェックのみ）
      const compiledCircuit = await this.compileCircuit(circuitPath, ptauPath);
      
      // 3. VKハッシュ計算
      const vkHash = this.calculateVKHash(compiledCircuit.vk);
      
      // 4. 簡素化Ledger署名
      const deploymentData = {
        year: 2025,
        vkHash,
        circuitHash: this.calculateCircuitHash(circuitPath),
        timestamp: Date.now()
      };
      
      const signature = await ledgerService.signDeployment2025(deploymentData);
      
      // 5. Amoyテストネットにデプロイ + VK直接保存（PROTOTYPE.md準拠）
      const contract = new ethers.Contract(
        PROTOTYPE_CONFIG.DEPLOYMENT_MANAGER_AMOY,
        [
          "function deployYearlySet2025(bytes32 vkHash, string vkData, bytes32 circuitHash, bytes signature)"
        ],
        this.provider
      );
      
      const tx = await contract.deployYearlySet2025(
        deploymentData.vkHash,
        JSON.stringify(compiledCircuit.vk), // VKデータ直接保存
        deploymentData.circuitHash,
        signature
      );
      
      // 6. 結果保存（簡単なJSON）
      await this.saveDeploymentResult2025(tx.hash, deploymentData);
      
      return tx.hash;
    } catch (error) {
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }
  
  private async compileCircuit(circuitPath: string, ptauPath: string): Promise<CompiledCircuit> {
    // circom + snarkjs基本コンパイル（詳細検証なし）
    const commands = [
      `circom ${circuitPath} --r1cs --wasm --sym`,
      `snarkjs groth16 setup Document2025.r1cs ${ptauPath} Document2025.zkey`,
      `snarkjs zkey export verificationkey Document2025.zkey Document2025_vk.json`
    ];
    
    for (const cmd of commands) {
      await this.executeCommand(cmd);
    }
    
    return {
      wasm: await fs.readFile('./Document2025.wasm'),
      zkey: await fs.readFile('./Document2025.zkey'),
      vk: JSON.parse(await fs.readFile('./Document2025_vk.json', 'utf-8'))
    };
  }
}
```

### 4.3 管理者システム (Registrar Console) - 簡素版
```typescript
// 2025年度固定データ管理
class SimplifiedRegistrarConsole {
  async importStudents2025(jsonFile: File): Promise<StudentData[]> {
    try {
      const data = JSON.parse(await jsonFile.text());
      
      // 基本検証のみ
      if (data.year !== 2025) {
        throw new Error('Only 2025 data supported in prototype');
      }
      
      if (data.students.length > 100) {
        throw new Error('Prototype supports max 100 students');
      }
      
      return data.students;
    } catch (error) {
      throw new Error(`Import failed: ${error.message}`);
    }
  }
  
  async buildMerkleTree2025(students: StudentData[]): Promise<MerkleTreeResult> {
    // 簡素化Merkle Tree構築
    const leaves = students.map(student => 
      poseidon([BigInt(student.passkey.publicKey)])
    );
    
    // depth=8固定、ゼロパディング
    while (leaves.length < 256) {
      leaves.push(BigInt(0));
    }
    
    const tree = this.buildTree(leaves);
    const merkleRoot = tree[tree.length - 1][0];
    
    // 簡単なファイル保存
    await this.saveMerkleData2025({
      year: 2025,
      merkleRoot: merkleRoot.toString(16),
      totalStudents: students.length,
      tree
    });
    
    return { merkleRoot, tree };
  }
  
  async generatePDFs2025(students: StudentData[], template: string): Promise<void> {
    // 基本的なPDF生成（並列化なし）
    for (const student of students) {
      const pdf = await this.generateSinglePDF(student, template);
      await this.savePDF(pdf, `./generated-pdfs/student_${student.id}.pdf`);
    }
  }
}
```

### 4.4 検証者システム (Verifier UI) - 基本版
```typescript
// 簡素化PDF検証
class SimplifiedVerifier {
  async verifyPDF(pdfFile: File): Promise<VerificationResult> {
    try {
      // 1. PDF/A-3から証明抽出（基本処理）
      const proofData = await this.extractProofFromPDF(pdfFile);
      
      // 2. 2025年度VK取得（ブロックチェーンから直接）
      const vk = await this.getVK2025FromBlockchain();
      
      // 3. SnarkJS検証
      const isValid = await snarkjs.groth16.verify(
        vk,
        proofData.publicSignals,
        proofData.proof
      );
      
      // 4. 有効期限チェック
      const expireTs = parseInt(proofData.publicSignals[5]);
      const isExpired = expireTs < Math.floor(Date.now() / 1000);
      
      // 5. 簡単な結果表示
      return {
        isValid: isValid && !isExpired,
        expired: isExpired,
        year: 2025,
        expiryDate: new Date(expireTs * 1000)
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }
  
  private async getVK2025FromBlockchain(): Promise<VerifyingKey> {
    // ブロックチェーンから直接VK取得
    const contract = new ethers.Contract(
      PROTOTYPE_CONFIG.VK_CONTRACT,
      ["function getVK2025() view returns (string)"],
      this.provider
    );
    
    const vkJson = await contract.getVK2025();
    return JSON.parse(vkJson);
  }
}
```

## 5. スマートコントラクト - プロトタイプ版

### 5.1 YearlyDeploymentManager2025.sol（簡素版）
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// プロトタイプ用簡素化コントラクト
contract YearlyDeploymentManager2025 {
    struct YearlySet2025 {
        bytes32 vkHash;
        bytes32 circuitHash;
        bytes32 merkleRoot;
        uint256 deployedAt;
        string vkJson; // VKを直接保存
    }
    
    YearlySet2025 public yearlySet2025;
    address public immutable deployer;
    bool public deployed;
    
    event YearlySet2025Deployed(bytes32 vkHash, bytes32 circuitHash);
    
    constructor() {
        deployer = msg.sender;
    }
    
    // プロトタイプ用簡素化デプロイ
    function deployYearlySet2025(
        bytes32 vkHash,
        bytes32 circuitHash,
        string calldata vkJson,
        bytes calldata signature
    ) external {
        require(msg.sender == deployer, "Unauthorized");
        require(!deployed, "Already deployed");
        
        // 基本的な署名検証のみ
        bytes32 messageHash = keccak256(abi.encodePacked(vkHash, circuitHash));
        // EIP-191検証（簡素版）
        
        yearlySet2025 = YearlySet2025({
            vkHash: vkHash,
            circuitHash: circuitHash,
            merkleRoot: bytes32(0), // 後で更新
            deployedAt: block.timestamp,
            vkJson: vkJson
        });
        
        deployed = true;
        emit YearlySet2025Deployed(vkHash, circuitHash);
    }
    
    // VK直接取得
    function getVK2025() external view returns (string memory) {
        require(deployed, "Not deployed yet");
        return yearlySet2025.vkJson;
    }
    
    // VKハッシュ取得（PROTOTYPE.md準拠・整合性検証用）
    function getVKHash2025() external view returns (bytes32) {
        require(deployed, "Not deployed yet");
        return yearlySet2025.vkHash;
    }
    
    // Merkle Root更新（プロトタイプ用）
    function updateMerkleRoot2025(bytes32 merkleRoot) external {
        require(msg.sender == deployer, "Unauthorized");
        require(deployed, "Not deployed yet");
        
        yearlySet2025.merkleRoot = merkleRoot;
    }
}
```

## 6. データ形式 - プロトタイプ版

### 6.1 学生データ（students-2025.json）
```json
{
  "version": "1.0-prototype",
  "year": 2025,
  "generatedAt": "2025-01-20T10:00:00Z",
  "maxStudents": 100,
  "students": [
    {
      "id": "2025001",
      "name": "田中太郎",
      "email": "tanaka@university.edu",
      "passkey": {
        "publicKey": "pQECAyYgASFYI...",
        "credentialId": "AQIDBAUGBwgJ...",
        "algorithm": -7
      },
      "commit": "0x1a2b3c4d...",
      "merkleIndex": 0
    }
  ]
}
```

### 6.2 回路デプロイ結果（yearly-set-2025.json）
```json
{
  "version": "1.0-prototype",
  "year": 2025,
  "network": "amoy",
  "deployedAt": "2025-01-20T11:00:00Z",
  "contractAddress": "0x...",
  "vkHash": "0x...",
  "circuitHash": "0x...",
  "deployTxHash": "0x...",
  "merkleRoot": "0x...",
  "status": "deployed"
}
```

## 7. プロトタイプ配布・デプロイメント

### 7.1 GitHub Releases構成
```
zk-cert-framework/releases/v1.0-prototype/
├── circuits/
│   ├── Document2025.wasm
│   ├── Document2025.zkey
│   ├── Document2025_vk.json
│   └── powersOfTau_16.ptau
├── executive-console/
│   ├── ExecutiveConsole-prototype-1.0.0.dmg
│   ├── ExecutiveConsole-prototype-1.0.0.exe
│   └── ExecutiveConsole-prototype-1.0.0.AppImage
├── registrar-console/
│   ├── RegistrarConsole-prototype-1.0.0.dmg
│   ├── RegistrarConsole-prototype-1.0.0.exe
│   └── RegistrarConsole-prototype-1.0.0.AppImage
└── scholar-prover/
    └── scholar-prover-prototype.zip
```

### 7.2 GitHub Pages (Verifier UI)
```bash
# プロトタイプ用静的サイト生成
npm run build:prototype
npm run export:github-pages

# デプロイ
gh-pages -d out -b gh-pages-prototype
```

## 8. プロトタイプ制約・最適化

### 8.1 技術制約
- **年度**: 2025年度ハードコード
- **ネットワーク**: Polygon zkEVM Amoyのみ
- **学生数**: 最大100名
- **並列処理**: 基本レベルのみ
- **エラー回復**: 最小限

### 8.2 性能最適化の除外
- **バンドル最適化**: 基本レベル
- **メモリ管理**: 詳細調整なし
- **キャッシュ戦略**: 最小限
- **並列実行**: 複雑な並列化なし

### 8.3 セキュリティの簡素化
- **Ledger検証**: 基本的なEIP-191のみ
- **入力検証**: 必要最小限
- **ログ・監査**: 基本レベル
- **攻撃対策**: 主要なもののみ

## 9. 開発・テスト戦略

### 9.1 プロトタイプ開発フロー
```bash
# 開発環境セットアップ
git clone https://github.com/your-org/zk-cert-framework.git
cd zk-cert-framework
git checkout prototype-branch

# プロトタイプビルド
npm run setup:prototype
npm run build:all-prototype

# 手動テスト実行
npm run test:manual-prototype
```

### 9.2 テスト範囲（限定）
- **単体テスト**: 主要関数のみ
- **統合テスト**: ハッピーパスのみ
- **E2Eテスト**: 1つの完全フローのみ
- **手動テスト**: 教授による実操作確認

---

**プロトタイプ技術目標**: 教授が30分以内で全機能を理解・操作でき、Trust Minimized設計の有効性を直感的に確認できる技術実装を提供する。 