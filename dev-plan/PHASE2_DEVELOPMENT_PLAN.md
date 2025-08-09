# Phase 2 開発計画書 - Tri-CertFramework プロトタイプ
**バージョン 2.4 - 最終更新: 2025-08-09**

> **完全システム統合フェーズ**: Registrar Console + 検証鍵レジストリ管理 + Merkle Tree + 4システム完全統合

---

## 🎯 **Phase 2 概要**

### **目標**
- **Registrar Console**: Tauri v2 + 検証鍵レジストリ管理 + IPFS/GitHub公開 + Merkle Tree構築
- **4システム完全統合**: Scholar Prover + Executive Console + Registrar Console + Verifier UI
- **検証鍵レジストリ統合**: 検証鍵の効率的な管理・配布・検証
- **教授向けデモ**: 完全なTrust Minimized三層認証システムの実演

### **新規追加機能**
- **Registrar Console**: 学務職員向け検証鍵レジストリ管理システム
- **検証鍵配布**: IPFS/GitHub公開リポジトリ管理
- **Merkle Tree**: 検証鍵データの効率的な管理
- **完全統合**: 4システム間の連携
- **デモンストレーション**: 教授向け三層認証完全デモ

### **技術制約**
- **バックエンド**: なし（完全フロントエンド）
- **データベース**: なし（ブロックチェーン + ローカルJSON）
- **ブロックチェーン**: 必須（Polygon zkEVM Cardona）
- **ハードウェア**: Ledger Nano X（責任者認証用）

---

## 🏗️ **プロジェクト構造（Phase 2）**

```
Tri-CertFramework/
├── dev-plan/
│   ├── PHASE0_DEVELOPMENT_PLAN.md
│   ├── PHASE1_DEVELOPMENT_PLAN.md
│   └── PHASE2_DEVELOPMENT_PLAN.md
├── scholar-prover/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MerkleProofGenerator.tsx
│   │   │   └── StudentDataValidator.tsx
│   │   ├── utils/
│   │   │   ├── merkle-utils.ts
│   │   │   └── student-validator.ts
│   │   └── config/
│   │       └── merkle-config.ts
│   └── data/
│       └── merkle-proofs/
├── executive-console/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MerkleRootManager.tsx
│   │   │   └── SystemStatus.tsx
│   │   ├── utils/
│   │   │   ├── merkle-root-validator.ts
│   │   │   └── system-monitor.ts
│   │   └── config/
│   │       └── system-config.ts
├── registrar-console/
│   ├── src-tauri/
│   │   ├── src/
│   │   │   ├── main.rs
│   │   │   ├── student_manager.rs
│   │   │   ├── merkle_tree.rs
│   │   │   └── data_export.rs
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── VerificationKeyManager.tsx
│   │   │   ├── RepositoryManager.tsx
│   │   │   ├── MerkleTreeBuilder.tsx
│   │   │   ├── DataExporter.tsx
│   │   │   └── SystemIntegrator.tsx
│   │   ├── utils/
│   │   │   ├── verification-key-manager.ts
│   │   │   ├── repository-manager.ts
│   │   │   ├── merkle-tree-builder.ts
│   │   │   └── data-exporter.ts
│   │   └── config/
│   │       └── registrar-config.ts
│   └── package.json
├── verifier-ui/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MerkleProofVerifier.tsx
│   │   │   └── SystemStatus.tsx
│   │   ├── utils/
│   │   │   ├── merkle-verification.ts
│   │   │   └── system-status.ts
│   │   └── config/
│   │       └── verifier-config.ts
│   └── data/
│       └── merkle-roots/
└── shared/
    ├── contracts/
    │   ├── VKManager.sol
    │   ├── MerkleManager.sol
    │   └── interfaces/
    │       ├── IVKManager.sol
    │       └── IMerkleManager.sol
    ├── utils/
    │   ├── merkle-tree.ts
    │   ├── verification-key.ts
    │   └── system-integration.ts
    └── types/
        ├── blockchain.ts
        ├── merkle.ts
        └── verification-key.ts
```

---

## 🔧 **Merkle Tree統合設計**

### **MerkleManager.sol - Merkle Tree管理コントラクト**
```solidity
// shared/contracts/MerkleManager.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IMerkleManager.sol";

contract MerkleManager is IMerkleManager, Ownable, ReentrancyGuard {
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

### **IMerkleManager.sol - インターフェース**
```solidity
// shared/contracts/interfaces/IMerkleManager.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IMerkleManager {
    struct MerkleRoot {
        bytes32 root;
        uint256 timestamp;
        address deployer;
        bool isValid;
        string version;
        uint256 studentCount;
    }
    
    function deployMerkleRoot(bytes32 root, string memory version, uint256 studentCount) external returns (uint256);
    function getMerkleRoot(uint256 rootId) external view returns (MerkleRoot memory);
    function getLatestMerkleRoot() external view returns (MerkleRoot memory);
    function verifyMerkleProof(bytes32 root, bytes32 leaf, bytes32[] memory proof) external pure returns (bool);
    function invalidateMerkleRoot(uint256 rootId) external;
    function authorizeRegistrar(address registrar) external;
    function revokeRegistrar(address registrar) external;
    function isAuthorized(address registrar) external view returns (bool);
}
```

---

## 📋 **Week 1: Registrar Console基盤構築**

### **Day 1-2: Registrar Console環境セットアップ**

#### **1.1 Registrar Console プロジェクト作成**
```bash
# Registrar Console作成
cd zk-CertFramework
npm create tauri-app@latest registrar-console -- --template react-ts
cd registrar-console

# 依存関係インストール
npm install ethers @tauri-apps/api
npm install -D @types/node
```

#### **1.2 Tauri設定**
```json
// registrar-console/src-tauri/tauri.conf.json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:1420",
    "distDir": "../dist"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true
      },
      "fs": {
        "all": true,
        "scope": ["$APPDATA/*", "$APPDATA/students/*", "$APPDATA/merkle/*"]
      },
      "dialog": {
        "all": true
      }
    },
    "bundle": {
      "active": true,
      "targets": "all",
      "identifier": "com.zkcertframework.registrar",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ]
    },
    "security": {
      "csp": null
    },
    "windows": [
      {
        "fullscreen": false,
        "resizable": true,
        "title": "ZK-CertFramework Registrar Console",
        "width": 1400,
        "height": 900
      }
    ]
  }
}
```

### **Day 3-4: 学生データ管理システム**

#### **1.3 検証鍵レジストリ管理**
```typescript
// registrar-console/src/utils/verification-key-manager.ts
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/api/fs';

export interface VerificationKeyData {
  id: string;
  name: string;
  email: string;
  department: string;
  graduationYear: number;
  verificationKey: {
    kty: string;
    crv: string;
    x: string;
    y: string;
    keyHash: string;
  };
  commit: string;
  merkleIndex: number;
}

export class VerificationKeyManager {
  private keys: VerificationKeyData[] = [];

  async loadVerificationKeysFromFile(): Promise<VerificationKeyData[]> {
    try {
      const filePath = await open({
        multiple: false,
        filters: [{
          name: 'JSON Files',
          extensions: ['json']
        }]
      });

      if (filePath) {
        const content = await readTextFile(filePath as string);
        this.keys = JSON.parse(content);
        return this.keys;
      }
      return [];
    } catch (error) {
      console.error('Failed to load verification keys:', error);
      return [];
    }
  }

  async saveVerificationKeysToFile(keys: VerificationKeyData[]): Promise<void> {
    try {
      const filePath = await open({
        multiple: false,
        filters: [{
          name: 'JSON Files',
          extensions: ['json']
        }]
      });

      if (filePath) {
        await writeTextFile(filePath as string, JSON.stringify(keys, null, 2));
      }
    } catch (error) {
      console.error('Failed to save verification keys:', error);
    }
  }

  async addVerificationKey(keyData: Omit<VerificationKeyData, 'merkleIndex'>): Promise<void> {
    const newKeyData: VerificationKeyData = {
      ...keyData,
      merkleIndex: this.keys.length
    };
    this.keys.push(newKeyData);
  }

  async updateVerificationKey(id: string, updates: Partial<VerificationKeyData>): Promise<void> {
    const index = this.keys.findIndex(k => k.id === id);
    if (index !== -1) {
      this.keys[index] = { ...this.keys[index], ...updates };
    }
  }

  async removeVerificationKey(id: string): Promise<void> {
    this.keys = this.keys.filter(k => k.id !== id);
    // Merkle indexを再計算
    this.keys.forEach((keyData, index) => {
      keyData.merkleIndex = index;
    });
  }

  getVerificationKeys(): VerificationKeyData[] {
    return this.keys;
  }

  getVerificationKeyById(id: string): VerificationKeyData | undefined {
    return this.keys.find(k => k.id === id);
  }

  getVerificationKeyCount(): number {
    return this.keys.length;
  }
}
```

#### **1.4 Merkle Tree構築**
```typescript
// registrar-console/src/utils/merkle-tree-builder.ts
import { ethers } from 'ethers';
import { StudentData } from './student-data-manager';

export interface MerkleProof {
  leaf: string;
  proof: string[];
  index: number;
}

export class MerkleTreeBuilder {
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

  verifyProof(proof: MerkleProof, root: string): boolean {
    let computedHash = proof.leaf;

    for (const proofElement of proof.proof) {
      const left = computedHash < proofElement ? computedHash : proofElement;
      const right = computedHash < proofElement ? proofElement : computedHash;
      computedHash = ethers.keccak256(ethers.concat([left, right]));
    }

    return computedHash === root;
  }

  getTreeHeight(): number {
    return this.tree.length;
  }

  getLeafCount(): number {
    return this.leaves.length;
  }
}
```

### **Day 5-7: UI実装**

#### **1.5 学生管理コンポーネント**
```typescript
// registrar-console/src/components/StudentManager.tsx
import React, { useState, useEffect } from 'react';
import { StudentDataManager, StudentData } from '../utils/student-data-manager';

export const StudentManager: React.FC = () => {
  const [studentManager] = useState(() => new StudentDataManager());
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const loadedStudents = await studentManager.loadStudentsFromFile();
      setStudents(loadedStudents);
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStudent = async () => {
    const newStudent: Omit<StudentData, 'merkleIndex'> = {
      id: `2025${String(students.length + 1).padStart(3, '0')}`,
      name: '',
      email: '',
      department: '',
      graduationYear: 2025,
      passkey: {
        publicKey: '',
        credentialId: '',
        algorithm: -7
      },
      commit: ''
    };

    await studentManager.addStudent(newStudent);
    setStudents(studentManager.getStudents());
  };

  const handleUpdateStudent = async (id: string, updates: Partial<StudentData>) => {
    await studentManager.updateStudent(id, updates);
    setStudents(studentManager.getStudents());
  };

  const handleRemoveStudent = async (id: string) => {
    await studentManager.removeStudent(id);
    setStudents(studentManager.getStudents());
  };

  const handleSaveStudents = async () => {
    await studentManager.saveStudentsToFile(students);
  };

  return (
    <div className="student-manager">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">学生データ管理</h2>
        <div className="space-x-2">
          <button
            onClick={loadStudents}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
          >
            {isLoading ? '読み込み中...' : 'ファイル読み込み'}
          </button>
          <button
            onClick={handleAddStudent}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            学生追加
          </button>
          <button
            onClick={handleSaveStudents}
            className="bg-purple-500 text-white px-4 py-2 rounded"
          >
            保存
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-4">学生一覧</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {students.map((student) => (
              <div
                key={student.id}
                className={`p-3 border rounded cursor-pointer ${
                  selectedStudent?.id === student.id ? 'bg-blue-50 border-blue-300' : 'bg-white'
                }`}
                onClick={() => setSelectedStudent(student)}
              >
                <div className="font-medium">{student.name}</div>
                <div className="text-sm text-gray-600">{student.id}</div>
                <div className="text-sm text-gray-600">{student.email}</div>
              </div>
            ))}
          </div>
        </div>

        {selectedStudent && (
          <div>
            <h3 className="text-lg font-medium mb-4">学生詳細</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">ID</label>
                <input
                  type="text"
                  value={selectedStudent.id}
                  onChange={(e) => handleUpdateStudent(selectedStudent.id, { id: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">名前</label>
                <input
                  type="text"
                  value={selectedStudent.name}
                  onChange={(e) => handleUpdateStudent(selectedStudent.id, { name: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">メール</label>
                <input
                  type="email"
                  value={selectedStudent.email}
                  onChange={(e) => handleUpdateStudent(selectedStudent.id, { email: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">学部</label>
                <input
                  type="text"
                  value={selectedStudent.department}
                  onChange={(e) => handleUpdateStudent(selectedStudent.id, { department: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <button
                onClick={() => handleRemoveStudent(selectedStudent.id)}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                削除
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded">
        <p className="text-sm text-gray-600">
          学生数: {students.length}人
        </p>
      </div>
    </div>
  );
};
```

---

## 📋 **Week 2: Merkle Tree統合・システム連携**

### **Day 8-10: Merkle Tree統合**

#### **2.1 Merkle Tree構築コンポーネント**
```typescript
// registrar-console/src/components/MerkleTreeBuilder.tsx
import React, { useState, useEffect } from 'react';
import { MerkleTreeBuilder } from '../utils/merkle-tree-builder';
import { StudentData } from '../utils/student-data-manager';

interface MerkleTreeBuilderProps {
  students: StudentData[];
  onMerkleRootGenerated: (root: string, proof: any) => void;
}

export const MerkleTreeBuilderComponent: React.FC<MerkleTreeBuilderProps> = ({
  students,
  onMerkleRootGenerated
}) => {
  const [merkleTree, setMerkleTree] = useState<MerkleTreeBuilder | null>(null);
  const [root, setRoot] = useState<string>('');
  const [isBuilding, setIsBuilding] = useState(false);

  useEffect(() => {
    if (students.length > 0) {
      buildMerkleTree();
    }
  }, [students]);

  const buildMerkleTree = () => {
    setIsBuilding(true);
    try {
      const tree = new MerkleTreeBuilder(students);
      const merkleRoot = tree.getRoot();
      
      setMerkleTree(tree);
      setRoot(merkleRoot);
      
      // サンプル証明を生成
      const sampleProof = tree.getProof(0);
      onMerkleRootGenerated(merkleRoot, sampleProof);
    } catch (error) {
      console.error('Failed to build Merkle tree:', error);
    } finally {
      setIsBuilding(false);
    }
  };

  const generateProofForStudent = (studentId: string) => {
    if (!merkleTree) return null;
    
    const studentIndex = students.findIndex(s => s.id === studentId);
    if (studentIndex === -1) return null;
    
    return merkleTree.getProof(studentIndex);
  };

  return (
    <div className="merkle-tree-builder">
      <h3 className="text-lg font-medium mb-4">Merkle Tree構築</h3>
      
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded">
          <p className="text-sm text-blue-800">
            学生数: {students.length}人
          </p>
          {merkleTree && (
            <p className="text-sm text-blue-800">
              ツリー高さ: {merkleTree.getTreeHeight()}レベル
            </p>
          )}
        </div>

        {isBuilding && (
          <div className="text-center text-gray-600">
            Merkle Tree構築中...
          </div>
        )}

        {root && (
          <div className="p-4 bg-green-50 rounded">
            <h4 className="font-medium text-green-800 mb-2">Merkle Root</h4>
            <p className="text-sm text-green-600 break-all font-mono">{root}</p>
          </div>
        )}

        <button
          onClick={buildMerkleTree}
          disabled={students.length === 0 || isBuilding}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
        >
          Merkle Tree再構築
        </button>
      </div>
    </div>
  );
};
```

#### **2.2 データエクスポート機能**
```typescript
// registrar-console/src/utils/data-exporter.ts
import { writeTextFile } from '@tauri-apps/api/fs';
import { StudentData } from './student-data-manager';
import { MerkleTreeBuilder } from './merkle-tree-builder';

export interface ExportData {
  students: StudentData[];
  merkleRoot: string;
  merkleProofs: Array<{
    studentId: string;
    proof: any;
  }>;
  exportDate: string;
  version: string;
}

export class DataExporter {
  async exportStudentData(
    students: StudentData[],
    merkleTree: MerkleTreeBuilder
  ): Promise<void> {
    const merkleProofs = students.map((student, index) => ({
      studentId: student.id,
      proof: merkleTree.getProof(index)
    }));

    const exportData: ExportData = {
      students,
      merkleRoot: merkleTree.getRoot(),
      merkleProofs,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    const jsonData = JSON.stringify(exportData, null, 2);
    await writeTextFile('student-data-export.json', jsonData);
  }

  async exportMerkleRootForBlockchain(
    merkleRoot: string,
    studentCount: number
  ): Promise<string> {
    const blockchainData = {
      merkleRoot,
      studentCount,
      timestamp: Math.floor(Date.now() / 1000),
      version: '1.0'
    };

    return JSON.stringify(blockchainData, null, 2);
  }
}
```

### **Day 11-12: システム統合**

#### **2.3 システム統合コンポーネント**
```typescript
// registrar-console/src/components/SystemIntegrator.tsx
import React, { useState } from 'react';
import { ethers } from 'ethers';
import { StudentData } from '../utils/student-data-manager';
import { MerkleTreeBuilder } from '../utils/merkle-tree-builder';
import { DataExporter } from '../utils/data-exporter';

interface SystemIntegratorProps {
  students: StudentData[];
  onIntegrationComplete: (data: any) => void;
}

export const SystemIntegrator: React.FC<SystemIntegratorProps> = ({
  students,
  onIntegrationComplete
}) => {
  const [isIntegrating, setIsIntegrating] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<string>('');

  const performSystemIntegration = async () => {
    setIsIntegrating(true);
    setIntegrationStatus('システム統合を開始しています...');

    try {
      // 1. Merkle Tree構築
      setIntegrationStatus('Merkle Treeを構築しています...');
      const merkleTree = new MerkleTreeBuilder(students);
      const merkleRoot = merkleTree.getRoot();

      // 2. データエクスポート
      setIntegrationStatus('データをエクスポートしています...');
      const exporter = new DataExporter();
      await exporter.exportStudentData(students, merkleTree);

      // 3. ブロックチェーン用データ準備
      setIntegrationStatus('ブロックチェーン用データを準備しています...');
      const blockchainData = await exporter.exportMerkleRootForBlockchain(
        merkleRoot,
        students.length
      );

      // 4. 統合完了
      setIntegrationStatus('統合が完了しました！');
      
      const integrationResult = {
        merkleRoot,
        studentCount: students.length,
        blockchainData,
        timestamp: new Date().toISOString()
      };

      onIntegrationComplete(integrationResult);

    } catch (error) {
      setIntegrationStatus(`統合エラー: ${error.message}`);
    } finally {
      setIsIntegrating(false);
    }
  };

  return (
    <div className="system-integrator">
      <h3 className="text-lg font-medium mb-4">システム統合</h3>
      
      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 rounded">
          <p className="text-sm text-yellow-800">
            この操作により、学生データとMerkle Treeが統合され、
            他のシステムで使用できる形式でエクスポートされます。
          </p>
        </div>

        <button
          onClick={performSystemIntegration}
          disabled={students.length === 0 || isIntegrating}
          className="bg-purple-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
        >
          {isIntegrating ? '統合中...' : 'システム統合実行'}
        </button>

        {integrationStatus && (
          <div className="p-3 bg-blue-50 rounded">
            <p className="text-sm text-blue-800">{integrationStatus}</p>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## 📋 **Week 3: 完全統合・デモ準備**

### **Day 15-17: 4システム完全統合**

#### **3.1 システム間連携テスト**
```typescript
// 完全統合テストシナリオ
const fullSystemIntegrationTest = async () => {
  console.log("=== 4システム完全統合テスト ===");
  
  // 1. Registrar Consoleで学生データ管理
  const students = await manageStudentData();
  console.log("学生データ管理:", students.length, "人");
  
  // 2. Merkle Tree構築
  const merkleTree = new MerkleTreeBuilder(students);
  const merkleRoot = merkleTree.getRoot();
  console.log("Merkle Tree構築:", merkleRoot);
  
  // 3. Executive ConsoleでMerkle Rootデプロイ
  const merkleRootId = await deployMerkleRoot(merkleRoot);
  console.log("Merkle Rootデプロイ:", merkleRootId);
  
  // 4. Scholar ProverでMerkle Proof生成
  const proof = await generateMerkleProof(students[0], merkleTree);
  console.log("Merkle Proof生成:", proof);
  
  // 5. Verifier UIで完全検証
  const result = await verifyCompleteSystem(proof, merkleRootId);
  console.log("完全検証結果:", result);
};
```

### **Day 18-21: デモンストレーション準備**

#### **3.2 デモンストレーションシナリオ**
```typescript
// 教授向けデモンストレーション
const professorDemonstration = async () => {
  console.log("=== 教授向けデモンストレーション ===");
  
  // デモ1: 基本概念の説明
  await demonstrateBasicConcepts();
  
  // デモ2: Trust Minimized設計
  await demonstrateTrustMinimized();
  
  // デモ3: 完全システム動作
  await demonstrateCompleteSystem();
  
  // デモ4: セキュリティ検証
  await demonstrateSecurityFeatures();
};
```

---

## 🎯 **成功基準・受入テスト**

### **技術的成功基準**
- [ ] Registrar Console完全動作
- [ ] Merkle Tree構築・検証成功
- [ ] 4システム完全統合成功
- [ ] ブロックチェーン統合成功
- [ ] デモンストレーション準備完了

### **デモンストレーション成功基準**
- [ ] **基本概念**: ZKP・ブロックチェーンの理解
- [ ] **Trust Minimized**: 完全な分散化設計の実感
- [ ] **システム統合**: 4システム連携の威力
- [ ] **実用性**: 実際の大学での運用可能性

### **受入テスト**
```typescript
const phase2AcceptanceTests = [
  {
    name: "Registrar Consoleテスト",
    steps: ["学生データ管理", "Merkle Tree構築", "データエクスポート"],
    expected: "学務職員が学生データを効率的に管理できる"
  },
  {
    name: "Merkle Tree統合テスト",
    steps: ["学生データ入力", "Merkle Tree構築", "証明生成", "検証"],
    expected: "Merkle Treeによる効率的なデータ管理・検証が動作する"
  },
  {
    name: "4システム統合テスト",
    steps: ["Registrar Console", "Executive Console", "Scholar Prover", "Verifier UI"],
    expected: "4システムが完全に連携して動作する"
  },
  {
    name: "デモンストレーションテスト",
    steps: ["基本概念説明", "Trust Minimized実演", "完全システム動作"],
    expected: "教授がシステムの価値を理解できる"
  }
];
```

---

## 🚀 **開発開始手順**

### **1. Registrar Consoleセットアップ**
```bash
cd registrar-console
npm install
npm run tauri dev
```

### **2. Merkle Tree統合テスト**
```bash
npm run test:merkle
npm run test:integration
```

### **3. デモンストレーション準備**
```bash
npm run demo:prepare
npm run demo:test
```

---

## 📝 **最終目標**

Phase 2完了後、以下の目標を達成：

### **完全なTrust Minimizedシステム**
- 4システム完全統合
- ブロックチェーン中心の設計
- 教授向けデモンストレーション
- 実用可能なプロトタイプ

---

**Phase 2目標**: 完全なTrust Minimizedシステムを構築し、教授向けデモンストレーションを成功させる。 