# 技術設計書 (TSD) — Tri-CertFramework プロトタイプ版
**バージョン 2.4 最終更新: 2025-08-09**

> **段階的移行対応プロトタイプ** - 技術的複雑性を段階的に導入し、完全Trust Minimized三層認証システム実証に特化

---

## 1. 段階的技術スタック（dev-plan準拠）

| 層 | 技術 | バージョン | 段階的対応 |
|----|------|-----------|-----------|
| デスクトップ | Tauri v2 + React 18 | 2.0+ / 18.0+ | Phase 1～2で追加 |
| フロントエンド | React 18 + TypeScript | 18.0+ / 5.0+ | 全Phase対応 |
| データ管理 | JSON Files + Blockchain | Native + ethers.js | Phase 0: JSON、Phase 1+: Blockchain |
| 認証 | WebAuthn + Ledger Nano X | @ledgerhq/hw-* | Phase 0: WebAuthn、Phase 1+: Ledger |
| ブロックチェーン | Polygon zkEVM Cardona | ethers.js 6.0+ | **Phase 1から導入** |
| ZKP | Circom 2.1.4 + SnarkJS 0.7 | Latest | 全Phase共通 |
| 配布 | GitHub Releases/Pages | - | 変更なし |
| VK管理 | **段階的VK取得システム** | - | **ローカル → ブロックチェーン → ハイブリッド** |
| 電子署名 | **パスキー電子署名 + 検証鍵配布** | ES256 + JWK | **IPFS/GitHub検証鍵リポジトリ** |

## 2. 段階的暗号プリミティブ設計

| 目的 | アルゴリズム | 出力 | 段階的対応 |
|------|-------------|------|-----------|
| 外部ハッシュ | SHA-3-512 | 512 bit | 全Phase共通 |
| 内部ハッシュ | Poseidon-256 | 256 bit | 全Phase共通 |
| Passkey署名 | ES-256 | r,s 32 B | Phase 0から対応 |
| 管理者認証 | EIP-191（Ledger） | 65 B | Phase 1から追加 |
| ZKPシステム | Groth16 | ~2KB JSON | 全Phase共通 |

## 3. 段階的Circom回路設計

### 3.1 共通回路（Document2025.circom）
```circom
pragma circom 2.1.4;

include "poseidon.circom";
include "ecdsa.circom";
include "merkle-tree.circom";

// 段階的対応回路
template Document2025Proof() {
    // 公開入力（全Phase共通）
    signal input vkHash;
    signal input schemaHash; 
    signal input merkleRoot;
    signal input pdfHash;
    signal input destHash;
    signal input expireTs;
    
    // 秘密入力（全Phase共通）
    signal input privateKey;
    signal input signature[2];
    signal input merkleProof[8];
    signal input merkleIndex;
    
    // 出力
    signal output valid;
    
    // 段階的検証（基本→高度）
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

### 3.2 段階的回路仕様
| パラメータ | Phase 0 | Phase 1 | Phase 2 |
|-----------|---------|---------|---------|
| 制約数 | ~45,000 | ~55,000 | ~65,000 |
| 証明サイズ | ~2KB JSON | ~2KB JSON | ~2KB JSON |
| 証明時間 | 30秒以内 | 20秒以内 | 15秒以内 |
| 検証時間 | 200ms | 150ms | 100ms |

## 4. 段階的システム実装

### 4.1 Phase 0: 基盤システム実装
```typescript
// 基盤設定
const PHASE_0_CONFIG = {
  TARGET_YEAR: 2025,
  VK_SOURCE: 'local',
  SYSTEMS: ['Scholar Prover', 'Verifier UI'],
  BLOCKCHAIN: false,
  MAX_PROOF_TIME: 30000 // 30秒
};

// ローカルVK管理
class LocalVKManager {
  async selectVKFile(): Promise<VerifyingKey> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const text = await file.text();
          resolve(JSON.parse(text));
        } else {
          reject(new Error('No file selected'));
        }
      };
      input.click();
    });
  }
}

// 基本証明生成
class Phase0Prover {
  async generateProof(
    pdfFile: File, 
    destination: string, 
    expiryDays: number = 30
  ): Promise<ProofResult> {
    // 1. ローカルVK選択
    const vkManager = new LocalVKManager();
    const vk = await vkManager.selectVKFile();
    
    // 2. 基本ZKP生成
    const inputs = await this.prepareInputs(pdfFile, destination, expiryDays);
    const proof = await this.generateZKP(inputs);
    
    // 3. PDF埋め込み
    const embeddedPdf = await this.embedProofInPDF(pdfFile, proof);
    
    return { proof, embeddedPdf };
  }
}
```

### 4.2 Phase 1: ブロックチェーン統合実装
```typescript
// ブロックチェーン統合設定
const PHASE_1_CONFIG = {
  TARGET_YEAR: 2025,
  VK_SOURCE: 'blockchain',
  SYSTEMS: ['Scholar Prover', 'Verifier UI', 'Executive Console'],
  BLOCKCHAIN: true,
  NETWORK: 'cardona',
  VK_CONTRACT: '0x...',
  MAX_PROOF_TIME: 25000 // 25秒
};

// ブロックチェーンVK管理
class BlockchainVKManager {
  private contract: ethers.Contract;
  
  constructor(contractAddress: string) {
    const provider = new ethers.JsonRpcProvider('https://rpc.cardona.zkevm-rpc.com');
    this.contract = new ethers.Contract(
      contractAddress,
      VK_MANAGER_ABI,
      provider
    );
  }
  
  async getLatestVK(): Promise<VerifyingKey> {
    const vkData = await this.contract.getLatestVK();
    return JSON.parse(vkData.vkJson);
  }
  
  async deployVK(vkJson: string, version: string, ledgerSigner: LedgerSigner): Promise<number> {
    const contractWithSigner = this.contract.connect(ledgerSigner);
    const tx = await contractWithSigner.deployVK(vkJson, version);
    const receipt = await tx.wait();
    
    const event = receipt.logs.find(log => 
      log.topics[0] === this.contract.interface.getEventTopic('VKDeployed')
    );
    
    if (event) {
      const decoded = this.contract.interface.decodeEventLog('VKDeployed', event.data);
      return decoded.vkId;
    }
    
    throw new Error('VK deployment failed');
  }
}

// Ledger認証統合
class LedgerAuthManager {
  private transport: TransportWebUSB | null = null;
  private ethApp: Eth | null = null;

  async connect(): Promise<boolean> {
    try {
      this.transport = await TransportWebUSB.create();
      this.ethApp = new Eth(this.transport);
      return true;
    } catch (error) {
      console.error('Ledger connection failed:', error);
      return false;
    }
  }

  async getAddress(path: string = "44'/60'/0'/0/0"): Promise<string> {
    if (!this.ethApp) {
      throw new Error('Ledger not connected');
    }
    
    const result = await this.ethApp.getAddress(path);
    return result.address;
  }

  async signTransaction(path: string, transactionHex: string): Promise<LedgerSignature> {
    if (!this.ethApp) {
      throw new Error('Ledger not connected');
    }
    
    const result = await this.ethApp.signTransaction(path, transactionHex);
    return {
      r: result.r,
      s: result.s,
      v: result.v
    };
  }
}

// ハイブリッドVK取得
class HybridVKManager {
  constructor(
    private blockchainManager: BlockchainVKManager,
    private localManager: LocalVKManager
  ) {}

  async getVK(): Promise<VerifyingKey> {
    try {
      // まずブロックチェーンから取得を試行
      return await this.blockchainManager.getLatestVK();
    } catch (error) {
      console.warn('Blockchain VK取得失敗、ローカルVKを使用:', error);
      // フォールバック: ローカルファイル選択
      return await this.localManager.selectVKFile();
    }
  }
}
```

### 4.3 Phase 2: 完全システム統合実装
```typescript
// 完全統合設定
const PHASE_2_CONFIG = {
  TARGET_YEAR: 2025,
  VK_SOURCE: 'hybrid',
  SYSTEMS: ['Scholar Prover', 'Verifier UI', 'Executive Console', 'Registrar Console'],
  BLOCKCHAIN: true,
  NETWORK: 'cardona',
  VK_CONTRACT: '0x...',
  MERKLE_CONTRACT: '0x...',
  MAX_PROOF_TIME: 20000 // 20秒
};

// 学生データ管理
class StudentDataManager {
  private students: StudentData[] = [];

  async loadStudentsFromFile(): Promise<StudentData[]> {
    // Tauriファイルシステム統合
    const filePath = await invoke('select_file', {
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    
    if (filePath) {
      const content = await invoke('read_file', { path: filePath });
      this.students = JSON.parse(content);
      return this.students;
    }
    return [];
  }

  async saveStudentsToFile(students: StudentData[]): Promise<void> {
    const filePath = await invoke('save_file', {
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    
    if (filePath) {
      await invoke('write_file', { 
        path: filePath, 
        contents: JSON.stringify(students, null, 2) 
      });
    }
  }

  async addStudent(student: Omit<StudentData, 'merkleIndex'>): Promise<void> {
    const newStudent: StudentData = {
      ...student,
      merkleIndex: this.students.length
    };
    this.students.push(newStudent);
  }
}

// Merkle Tree構築
class MerkleTreeBuilder {
  private leaves: string[] = [];
  private tree: string[][] = [];

  constructor(students: StudentData[]) {
    this.buildTree(students);
  }

  private buildTree(students: StudentData[]): void {
    // 学生データからリーフを生成
    this.leaves = students.map(student => 
      ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(student)))
    );

    // Merkle Treeを構築
    this.tree = [this.leaves];
    let currentLevel = this.leaves;

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        
        const combined = ethers.keccak256(ethers.concat([left, right]));
        nextLevel.push(combined);
      }
      
      this.tree.push(nextLevel);
      currentLevel = nextLevel;
    }
  }

  getRoot(): string {
    if (this.tree.length === 0) {
      throw new Error('Merkle tree not built');
    }
    return this.tree[this.tree.length - 1][0];
  }

  getProof(index: number): MerkleProof {
    if (index >= this.leaves.length) {
      throw new Error('Index out of bounds');
    }

    const proof: string[] = [];
    let currentIndex = index;

    for (let level = 0; level < this.tree.length - 1; level++) {
      const currentLevel = this.tree[level];
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

      if (siblingIndex < currentLevel.length) {
        proof.push(currentLevel[siblingIndex]);
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      leaf: this.leaves[index],
      proof,
      index
    };
  }
}

// システム統合マネージャー
class SystemIntegrationManager {
  constructor(
    private studentManager: StudentDataManager,
    private merkleBuilder: MerkleTreeBuilder,
    private vkManager: BlockchainVKManager,
    private merkleManager: MerkleManager
  ) {}

  async performCompleteIntegration(): Promise<IntegrationResult> {
    // 1. 学生データ読み込み
    const students = await this.studentManager.loadStudentsFromFile();
    
    // 2. Merkle Tree構築
    const merkleTree = new MerkleTreeBuilder(students);
    const merkleRoot = merkleTree.getRoot();
    
    // 3. Merkle Rootをブロックチェーンにデプロイ
    const merkleRootId = await this.merkleManager.deployMerkleRoot(
      merkleRoot,
      '1.0',
      students.length
    );
    
    // 4. VKもブロックチェーンに保存済みであることを確認
    const vk = await this.vkManager.getLatestVK();
    
    return {
      students,
      merkleRoot,
      merkleRootId,
      vk,
      timestamp: new Date().toISOString()
    };
  }
}
```

## 5. 段階的スマートコントラクト実装

### 5.1 Phase 1: VKManager.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract VKManager is Ownable, ReentrancyGuard {
    struct VKData {
        string vkJson;
        uint256 timestamp;
        address deployer;
        bool isValid;
        string version;
    }
    
    mapping(uint256 => VKData) public vkRegistry;
    mapping(address => bool) public authorizedDeployers;
    uint256 public currentVKId;
    
    event VKDeployed(uint256 indexed vkId, address indexed deployer, string version);
    event VKInvalidated(uint256 indexed vkId, address indexed invalidator);
    event DeployerAuthorized(address indexed deployer);
    event DeployerRevoked(address indexed deployer);
    
    modifier onlyAuthorized() {
        require(authorizedDeployers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }
    
    constructor() {
        currentVKId = 0;
    }
    
    function deployVK(
        string memory vkJson,
        string memory version
    ) external onlyAuthorized nonReentrant returns (uint256) {
        require(bytes(vkJson).length > 0, "VK JSON cannot be empty");
        require(bytes(version).length > 0, "Version cannot be empty");
        
        currentVKId++;
        
        vkRegistry[currentVKId] = VKData({
            vkJson: vkJson,
            timestamp: block.timestamp,
            deployer: msg.sender,
            isValid: true,
            version: version
        });
        
        emit VKDeployed(currentVKId, msg.sender, version);
        return currentVKId;
    }
    
    function getVK(uint256 vkId) external view returns (VKData memory) {
        require(vkId > 0 && vkId <= currentVKId, "Invalid VK ID");
        VKData memory vk = vkRegistry[vkId];
        require(vk.isValid, "VK is invalid");
        return vk;
    }
    
    function getLatestVK() external view returns (VKData memory) {
        require(currentVKId > 0, "No VK deployed");
        VKData memory vk = vkRegistry[currentVKId];
        require(vk.isValid, "Latest VK is invalid");
        return vk;
    }
    
    function invalidateVK(uint256 vkId) external onlyOwner {
        require(vkId > 0 && vkId <= currentVKId, "Invalid VK ID");
        require(vkRegistry[vkId].isValid, "VK already invalid");
        
        vkRegistry[vkId].isValid = false;
        emit VKInvalidated(vkId, msg.sender);
    }
    
    function authorizeDeployer(address deployer) external onlyOwner {
        require(deployer != address(0), "Invalid deployer address");
        authorizedDeployers[deployer] = true;
        emit DeployerAuthorized(deployer);
    }
    
    function revokeDeployer(address deployer) external onlyOwner {
        require(deployer != address(0), "Invalid deployer address");
        authorizedDeployers[deployer] = false;
        emit DeployerRevoked(deployer);
    }
    
    function isAuthorized(address deployer) external view returns (bool) {
        return authorizedDeployers[deployer] || deployer == owner();
    }
}
```

### 5.2 Phase 2: MerkleManager.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MerkleManager is Ownable, ReentrancyGuard {
    struct MerkleRoot {
        bytes32 root;
        uint256 timestamp;
        address deployer;
        bool isValid;
        string version;
        uint256 studentCount;
    }
    
    mapping(uint256 => MerkleRoot) public merkleRoots;
    mapping(address => bool) public authorizedRegistrars;
    uint256 public currentRootId;
    
    event MerkleRootDeployed(uint256 indexed rootId, address indexed deployer, string version, uint256 studentCount);
    event MerkleRootInvalidated(uint256 indexed rootId, address indexed invalidator);
    event RegistrarAuthorized(address indexed registrar);
    event RegistrarRevoked(address indexed registrar);
    
    modifier onlyAuthorized() {
        require(authorizedRegistrars[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }
    
    constructor() {
        currentRootId = 0;
    }
    
    function deployMerkleRoot(
        bytes32 root,
        string memory version,
        uint256 studentCount
    ) external onlyAuthorized nonReentrant returns (uint256) {
        require(root != bytes32(0), "Root cannot be zero");
        require(bytes(version).length > 0, "Version cannot be empty");
        require(studentCount > 0, "Student count must be positive");
        
        currentRootId++;
        
        merkleRoots[currentRootId] = MerkleRoot({
            root: root,
            timestamp: block.timestamp,
            deployer: msg.sender,
            isValid: true,
            version: version,
            studentCount: studentCount
        });
        
        emit MerkleRootDeployed(currentRootId, msg.sender, version, studentCount);
        return currentRootId;
    }
    
    function getMerkleRoot(uint256 rootId) external view returns (MerkleRoot memory) {
        require(rootId > 0 && rootId <= currentRootId, "Invalid root ID");
        MerkleRoot memory root = merkleRoots[rootId];
        require(root.isValid, "Root is invalid");
        return root;
    }
    
    function getLatestMerkleRoot() external view returns (MerkleRoot memory) {
        require(currentRootId > 0, "No merkle root deployed");
        MerkleRoot memory root = merkleRoots[currentRootId];
        require(root.isValid, "Latest root is invalid");
        return root;
    }
    
    function verifyMerkleProof(
        bytes32 root,
        bytes32 leaf,
        bytes32[] memory proof
    ) external pure returns (bool) {
        bytes32 computedHash = leaf;
        
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }
        
        return computedHash == root;
    }
    
    function invalidateMerkleRoot(uint256 rootId) external onlyOwner {
        require(rootId > 0 && rootId <= currentRootId, "Invalid root ID");
        require(merkleRoots[rootId].isValid, "Root already invalid");
        
        merkleRoots[rootId].isValid = false;
        emit MerkleRootInvalidated(rootId, msg.sender);
    }
    
    function authorizeRegistrar(address registrar) external onlyOwner {
        require(registrar != address(0), "Invalid registrar address");
        authorizedRegistrars[registrar] = true;
        emit RegistrarAuthorized(registrar);
    }
    
    function revokeRegistrar(address registrar) external onlyOwner {
        require(registrar != address(0), "Invalid registrar address");
        authorizedRegistrars[registrar] = false;
        emit RegistrarRevoked(registrar);
    }
    
    function isAuthorized(address registrar) external view returns (bool) {
        return authorizedRegistrars[registrar] || registrar == owner();
    }
}
```

## 6. 段階的パフォーマンス最適化

### 6.1 Phase 0パフォーマンス
```typescript
// 基本的なキャッシュ機能
class Phase0Cache {
  private circuitCache = new Map<string, ArrayBuffer>();
  
  async getCircuitFile(path: string): Promise<ArrayBuffer> {
    if (this.circuitCache.has(path)) {
      return this.circuitCache.get(path)!;
    }
    
    const response = await fetch(path);
    const buffer = await response.arrayBuffer();
    this.circuitCache.set(path, buffer);
    return buffer;
  }
}
```

### 6.2 Phase 1パフォーマンス
```typescript
// ブロックチェーン接続プーリング
class Phase1Optimization {
  private connectionPool: ethers.JsonRpcProvider[] = [];
  
  constructor() {
    // 複数RPC接続でロードバランシング
    this.connectionPool = [
      new ethers.JsonRpcProvider('https://rpc.cardona.zkevm-rpc.com'),
      new ethers.JsonRpcProvider('https://rpc2.cardona.zkevm-rpc.com')
    ];
  }
  
  getProvider(): ethers.JsonRpcProvider {
    return this.connectionPool[Math.floor(Math.random() * this.connectionPool.length)];
  }
}
```

### 6.3 Phase 2パフォーマンス
```typescript
// 並列処理最適化
class Phase2Optimization {
  async parallelVKAndMerkleRetrieval(
    vkManager: BlockchainVKManager,
    merkleManager: MerkleManager
  ): Promise<[VerifyingKey, MerkleRoot]> {
    const [vkData, merkleData] = await Promise.all([
      vkManager.getLatestVK(),
      merkleManager.getLatestMerkleRoot()
    ]);
    
    return [vkData, merkleData];
  }
}
```

## 7. 段階的エラーハンドリング

### 7.1 段階的エラー定義
```typescript
export enum PhaseError {
  // Phase 0エラー
  LOCAL_VK_NOT_FOUND = 'LOCAL_VK_NOT_FOUND',
  CIRCUIT_LOAD_FAILED = 'CIRCUIT_LOAD_FAILED',
  PROOF_GENERATION_FAILED = 'PROOF_GENERATION_FAILED',
  
  // Phase 1エラー
  LEDGER_NOT_CONNECTED = 'LEDGER_NOT_CONNECTED',
  BLOCKCHAIN_CONNECTION_FAILED = 'BLOCKCHAIN_CONNECTION_FAILED',
  VK_CONTRACT_NOT_FOUND = 'VK_CONTRACT_NOT_FOUND',
  VK_DEPLOYMENT_FAILED = 'VK_DEPLOYMENT_FAILED',
  
  // Phase 2エラー
  STUDENT_DATA_LOAD_FAILED = 'STUDENT_DATA_LOAD_FAILED',
  MERKLE_TREE_BUILD_FAILED = 'MERKLE_TREE_BUILD_FAILED',
  SYSTEM_INTEGRATION_FAILED = 'SYSTEM_INTEGRATION_FAILED'
}

export class PhaseErrorHandler {
  static handleError(error: PhaseError, phase: string): string {
    const errorMessages = {
      [PhaseError.LOCAL_VK_NOT_FOUND]: 'ローカルVKファイルが見つかりません。VKファイルを選択してください。',
      [PhaseError.LEDGER_NOT_CONNECTED]: 'Ledger Nano Xが接続されていません。デバイスを接続してEthereumアプリを開いてください。',
      [PhaseError.BLOCKCHAIN_CONNECTION_FAILED]: 'ブロックチェーン接続に失敗しました。ネットワーク設定を確認してください。',
      [PhaseError.SYSTEM_INTEGRATION_FAILED]: '4システム統合に失敗しました。各システムの状態を確認してください。'
    };
    
    return errorMessages[error] || '不明なエラーが発生しました。';
  }
}
```

## 8. 段階的テスト実装

### 8.1 Phase 0テスト
```typescript
describe('Phase 0: 基盤システム', () => {
  test('ローカルVK選択・ZKP生成', async () => {
    const prover = new Phase0Prover();
    const result = await prover.generateProof(testPdf, 'テスト提出先', 30);
    
    expect(result.proof).toBeDefined();
    expect(result.embeddedPdf).toBeDefined();
  });
  
  test('VK取得方法選択UI', () => {
    const phaseManager = new PhaseManager('local');
    expect(phaseManager.getVKSource()).toBe('local');
    
    phaseManager.setPhase('blockchain');
    expect(phaseManager.getVKSource()).toBe('blockchain');
  });
});
```

### 8.2 Phase 1テスト
```typescript
describe('Phase 1: ブロックチェーン統合', () => {
  test('VKManagerデプロイ', async () => {
    const deployer = new ContractDeployer(ledgerManager);
    const contractAddress = await deployer.deployVKManager();
    
    expect(ethers.isAddress(contractAddress)).toBe(true);
  });
  
  test('ブロックチェーンVK取得', async () => {
    const vkManager = new BlockchainVKManager(contractAddress);
    const vk = await vkManager.getLatestVK();
    
    expect(vk).toBeDefined();
    expect(vk.protocol).toBe('groth16');
  });
});
```

### 8.3 Phase 2テスト
```typescript
describe('Phase 2: 完全システム統合', () => {
  test('4システム統合', async () => {
    const integrationManager = new SystemIntegrationManager(
      studentManager,
      merkleBuilder,
      vkManager,
      merkleManager
    );
    
    const result = await integrationManager.performCompleteIntegration();
    
    expect(result.students.length).toBeGreaterThan(0);
    expect(result.merkleRoot).toBeDefined();
    expect(result.vk).toBeDefined();
  });
});
```

## 9. 段階的デプロイメント

### 9.1 Phase 0デプロイ
```bash
# Phase 0: 基盤システムのみ
cd scholar-prover
npm run build:phase0
npm run deploy:github-pages

cd ../verifier-ui
npm run build:phase0
npm run deploy:github-pages
```

### 9.2 Phase 1デプロイ
```bash
# Phase 1: ブロックチェーン統合
cd executive-console
npm run build:phase1
npm run tauri:build

# スマートコントラクトデプロイ
cd ../shared/contracts
npx hardhat deploy --network cardona --tags VKManager
```

### 9.3 Phase 2デプロイ
```bash
# Phase 2: 完全システム
cd registrar-console
npm run build:phase2
npm run tauri:build

# 完全統合スマートコントラクトデプロイ
cd ../shared/contracts
npx hardhat deploy --network cardona --tags MerkleManager
```

## 10. 段階的成功基準

### 10.1 技術的成功基準
| Phase | 基準 | 検証方法 |
|-------|------|----------|
| Phase 0 | 基本ZKP機能動作 | ローカルVK→ZKP生成→PDF検証 |
| Phase 1 | ブロックチェーン統合 | Ledger認証→VKデプロイ→ブロックチェーン検証 |
| Phase 2 | 完全システム統合 | 4システム連携→Merkle統合→教授デモ |

### 10.2 パフォーマンス成功基準
| Phase | 指標 | 目標 |
|-------|------|------|
| Phase 0 | ZKP生成時間 | 30秒以内 |
| Phase 1 | ブロックチェーンVK取得 | 10秒以内 |
| Phase 2 | 完全統合実行 | 120秒以内 |

### 10.3 ユーザビリティ成功基準
| Phase | 対象 | 目標 |
|-------|------|------|
| Phase 0 | 基本概念理解 | 30分以内 |
| Phase 1 | Trust Minimized実感 | 教授が価値理解 |
| Phase 2 | 実用可能性 | 大学採用検討レベル |

---

**段階的技術実装目標**: Phase 0で基本的なZKPシステムを構築し、Phase 1でブロックチェーン統合によるTrust Minimized設計を実現し、Phase 2で完全な4システム統合により教授向けデモンストレーションを成功させる。 