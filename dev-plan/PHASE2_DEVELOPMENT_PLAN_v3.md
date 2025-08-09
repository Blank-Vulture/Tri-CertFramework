# Phase 2 開発計画書 v3.0 - Tri-CertFramework 完全統合
**バージョン 2.4 - 最終更新: 2025-08-09**

> **高度機能・完全統合**: パスキー認証 + Merkle Tree + Ledger認証 + エンタープライズ機能で完全なプロダクションシステムを実現

---

## 🎯 **Phase 2 概要**

### **目標**
- **高度認証**: パスキー（WebAuthn）+ Ledger Nano X の多要素認証
- **Merkle Tree統合**: 効率的なデータ管理・プライバシー保護
- **エンタープライズ機能**: 大学での本格運用に向けた機能
- **完全統合**: 4システムの完全連携・教授向けデモ完成

### **機能拡張**
- **Scholar Prover**: パスキー認証 + Merkle Proof生成
- **Executive Console**: Ledger認証 + Merkle Root管理 + システム監視
- **Registrar Console**: 完全な学生データ管理 + Merkle Tree構築
- **Verifier UI**: 完全検証 + 透明性追跡 + 監査機能

### **技術制約**
- **バックエンド**: なし（完全フロントエンド）
- **データベース**: なし（ブロックチェーン + Merkle Tree）
- **ブロックチェーン**: 必須（Polygon zkEVM Cardona）
- **ハードウェア**: パスキー対応デバイス + Ledger Nano X

---

## 🏗️ **Phase 2 プロジェクト構造**

```
Tri-CertFramework/
├── scholar-prover/
│   ├── src/
│   │   ├── components/
│   │   │   ├── PasskeyAuth.tsx
│   │   │   ├── MerkleProofGenerator.tsx
│   │   │   └── BiometricVerifier.tsx
│   │   ├── utils/
│   │   │   ├── webauthn.ts
│   │   │   ├── merkle-proof.ts
│   │   │   └── biometric.ts
│   │   └── config/
│   │       └── auth-config.ts
├── executive-console/
│   ├── src-tauri/
│   │   ├── src/
│   │   │   ├── main.rs
│   │   │   ├── ledger.rs
│   │   │   └── system_monitor.rs
│   │   └── Cargo.toml
│   ├── src/
│   │   ├── components/
│   │   │   ├── LedgerAuth.tsx
│   │   │   ├── SystemDashboard.tsx
│   │   │   ├── MerkleRootManager.tsx
│   │   │   └── SecurityAudit.tsx
│   │   ├── utils/
│   │   │   ├── ledger-connection.ts
│   │   │   ├── system-monitor.ts
│   │   │   └── audit-logger.ts
│   │   └── config/
│   │       └── executive-config.ts
├── registrar-console/
│   ├── src-tauri/
│   │   ├── src/
│   │   │   ├── main.rs
│   │   │   ├── merkle_tree.rs
│   │   │   └── data_manager.rs
│   │   └── Cargo.toml
│   ├── src/
│   │   ├── components/
│   │   │   ├── StudentDataManager.tsx
│   │   │   ├── MerkleTreeBuilder.tsx
│   │   │   ├── DataExporter.tsx
│   │   │   └── SystemIntegrator.tsx
│   │   ├── utils/
│   │   │   ├── student-manager.ts
│   │   │   ├── merkle-builder.ts
│   │   │   └── data-exporter.ts
│   │   └── config/
│   │       └── registrar-config.ts
├── verifier-ui/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ComprehensiveVerifier.tsx
│   │   │   ├── TransparencyTracker.tsx
│   │   │   ├── AuditViewer.tsx
│   │   │   └── ReportGenerator.tsx
│   │   ├── utils/
│   │   │   ├── comprehensive-verification.ts
│   │   │   ├── transparency-tracker.ts
│   │   │   └── audit-system.ts
│   │   └── config/
│   │       └── verifier-config.ts
└── shared/
    ├── contracts/
    │   ├── VKManager.sol
    │   ├── MerkleManager.sol
    │   ├── StudentRegistry.sol
    │   └── AuditLogger.sol
    ├── utils/
    │   ├── merkle-tree.ts
    │   ├── webauthn.ts
    │   ├── biometric.ts
    │   └── audit.ts
    └── types/
        ├── auth.ts
        ├── merkle.ts
        └── audit.ts
```

---

## 🔧 **高度機能設計**

### **1. パスキー認証（WebAuthn）**

#### **Scholar Prover - パスキー統合**
```typescript
// scholar-prover/src/utils/webauthn.ts
export class WebAuthnManager {
  async createCredential(userId: string, userName: string): Promise<{
    credentialId: string;
    publicKey: string;
    attestation: any;
  }> {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'ZK-CertFramework',
          id: window.location.hostname
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: userName,
          displayName: userName
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        },
        timeout: 60000,
        attestation: 'direct'
      }
    }) as PublicKeyCredential;

    const response = credential.response as AuthenticatorAttestationResponse;
    const publicKey = this.extractPublicKey(response.getPublicKey()!);
    
    return {
      credentialId: this.arrayBufferToBase64(credential.rawId),
      publicKey,
      attestation: {
        clientDataJSON: this.arrayBufferToBase64(response.clientDataJSON),
        attestationObject: this.arrayBufferToBase64(response.attestationObject)
      }
    };
  }

  async authenticateUser(credentialId: string, challenge: string): Promise<{
    signature: string;
    authenticatorData: string;
    clientDataJSON: string;
  }> {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: new TextEncoder().encode(challenge),
        allowCredentials: [{
          id: this.base64ToArrayBuffer(credentialId),
          type: 'public-key'
        }],
        userVerification: 'required',
        timeout: 60000
      }
    }) as PublicKeyCredential;

    const response = assertion.response as AuthenticatorAssertionResponse;
    
    return {
      signature: this.arrayBufferToBase64(response.signature),
      authenticatorData: this.arrayBufferToBase64(response.authenticatorData),
      clientDataJSON: this.arrayBufferToBase64(response.clientDataJSON)
    };
  }

  private extractPublicKey(publicKeyBuffer: ArrayBuffer): string {
    // COSE公開鍵をJWK形式に変換
    const publicKeyBytes = new Uint8Array(publicKeyBuffer);
    // 実装は複雑なので、ライブラリを使用することを推奨
    return this.arrayBufferToBase64(publicKeyBuffer);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
```

#### **パスキー認証コンポーネント**
```typescript
// scholar-prover/src/components/PasskeyAuth.tsx
import React, { useState } from 'react';
import { WebAuthnManager } from '../utils/webauthn';

interface PasskeyAuthProps {
  userId: string;
  userName: string;
  onAuthenticated: (credentials: any) => void;
}

export const PasskeyAuth: React.FC<PasskeyAuthProps> = ({
  userId,
  userName,
  onAuthenticated
}) => {
  const [webauthnManager] = useState(() => new WebAuthnManager());
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);

  const registerPasskey = async () => {
    setIsRegistering(true);
    try {
      const creds = await webauthnManager.createCredential(userId, userName);
      setCredentials(creds);
      console.log('パスキー登録完了:', creds);
    } catch (error) {
      console.error('パスキー登録失敗:', error);
    } finally {
      setIsRegistering(false);
    }
  };

  const authenticatePasskey = async () => {
    if (!credentials) return;
    
    setIsAuthenticating(true);
    try {
      const challenge = `auth-${Date.now()}`;
      const auth = await webauthnManager.authenticateUser(
        credentials.credentialId,
        challenge
      );
      
      const authResult = {
        ...credentials,
        authentication: auth,
        timestamp: new Date().toISOString()
      };
      
      onAuthenticated(authResult);
      console.log('パスキー認証完了:', authResult);
    } catch (error) {
      console.error('パスキー認証失敗:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="passkey-auth">
      <h3 className="text-lg font-medium mb-4">パスキー認証</h3>
      
      <div className="space-y-4">
        {!credentials ? (
          <div>
            <p className="text-gray-600 mb-4">
              指紋・顔認証などの生体認証でパスキーを登録
            </p>
            <button
              onClick={registerPasskey}
              disabled={isRegistering}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
            >
              {isRegistering ? '登録中...' : 'パスキー登録'}
            </button>
          </div>
        ) : (
          <div>
            <div className="p-3 bg-green-50 rounded mb-4">
              <p className="text-green-800 font-medium">パスキー登録済み</p>
              <p className="text-sm text-green-600">
                ID: {credentials.credentialId.substring(0, 16)}...
              </p>
            </div>
            
            <button
              onClick={authenticatePasskey}
              disabled={isAuthenticating}
              className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
            >
              {isAuthenticating ? '認証中...' : 'パスキー認証'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
```

### **2. Merkle Tree統合**

#### **MerkleManager.sol - 高度なMerkle Tree管理**
```solidity
// shared/contracts/MerkleManager.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MerkleManager is Ownable {
    struct MerkleRoot {
        bytes32 root;
        uint256 timestamp;
        address deployer;
        uint256 studentCount;
        string version;
        bool isActive;
    }
    
    mapping(uint256 => MerkleRoot) public merkleRoots;
    mapping(bytes32 => uint256) public rootToId;
    uint256 public currentRootId;
    
    event MerkleRootDeployed(uint256 indexed rootId, bytes32 indexed root, uint256 studentCount);
    event MerkleRootActivated(uint256 indexed rootId);
    event MerkleRootDeactivated(uint256 indexed rootId);
    
    constructor() {
        currentRootId = 0;
    }
    
    function deployMerkleRoot(
        bytes32 root,
        uint256 studentCount,
        string memory version
    ) external onlyOwner returns (uint256) {
        require(root != bytes32(0), "Invalid root");
        require(rootToId[root] == 0, "Root already exists");
        
        currentRootId++;
        
        merkleRoots[currentRootId] = MerkleRoot({
            root: root,
            timestamp: block.timestamp,
            deployer: msg.sender,
            studentCount: studentCount,
            version: version,
            isActive: true
        });
        
        rootToId[root] = currentRootId;
        
        emit MerkleRootDeployed(currentRootId, root, studentCount);
        return currentRootId;
    }
    
    function verifyMerkleProof(
        bytes32 root,
        bytes32 leaf,
        bytes32[] memory proof
    ) external view returns (bool) {
        require(rootToId[root] != 0, "Root not found");
        require(merkleRoots[rootToId[root]].isActive, "Root not active");
        
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
    
    function getMerkleRoot(uint256 rootId) external view returns (MerkleRoot memory) {
        require(rootId > 0 && rootId <= currentRootId, "Invalid root ID");
        return merkleRoots[rootId];
    }
    
    function getActiveMerkleRoot() external view returns (MerkleRoot memory) {
        for (uint256 i = currentRootId; i > 0; i--) {
            if (merkleRoots[i].isActive) {
                return merkleRoots[i];
            }
        }
        revert("No active root found");
    }
}
```

#### **Merkle Tree Builder**
```typescript
// registrar-console/src/utils/merkle-builder.ts
import { ethers } from 'ethers';

export interface StudentData {
  id: string;
  name: string;
  email: string;
  department: string;
  graduationYear: number;
  passkeyCredentialId: string;
  passkeyPublicKey: string;
  merkleIndex: number;
}

export interface MerkleProof {
  leaf: string;
  proof: string[];
  index: number;
  root: string;
}

export class MerkleTreeBuilder {
  private leaves: string[] = [];
  private tree: string[][] = [];
  private students: StudentData[] = [];

  constructor(students: StudentData[]) {
    this.students = students;
    this.buildTree();
  }

  private buildTree(): void {
    // 学生データからリーフハッシュを生成
    this.leaves = this.students.map(student => 
      ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({
        id: student.id,
        name: student.name,
        email: student.email,
        passkeyCredentialId: student.passkeyCredentialId,
        passkeyPublicKey: student.passkeyPublicKey
      })))
    );

    // Merkle Treeを構築
    this.tree = [this.leaves];
    let currentLevel = [...this.leaves];

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        
        // 小さい方を左に配置（決定論的な順序）
        const [leftHash, rightHash] = left <= right ? [left, right] : [right, left];
        const combined = ethers.keccak256(ethers.solidityPacked(['bytes32', 'bytes32'], [leftHash, rightHash]));
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

  getProof(studentId: string): MerkleProof {
    const studentIndex = this.students.findIndex(s => s.id === studentId);
    if (studentIndex === -1) {
      throw new Error('Student not found');
    }

    return this.getProofByIndex(studentIndex);
  }

  getProofByIndex(index: number): MerkleProof {
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
      index,
      root: this.getRoot()
    };
  }

  verifyProof(proof: MerkleProof): boolean {
    let computedHash = proof.leaf;

    for (const proofElement of proof.proof) {
      const [left, right] = computedHash <= proofElement 
        ? [computedHash, proofElement] 
        : [proofElement, computedHash];
      
      computedHash = ethers.keccak256(ethers.solidityPacked(['bytes32', 'bytes32'], [left, right]));
    }

    return computedHash === proof.root;
  }

  getStudentCount(): number {
    return this.students.length;
  }

  getTreeHeight(): number {
    return this.tree.length;
  }

  exportTreeData(): {
    root: string;
    studentCount: number;
    treeHeight: number;
    leaves: string[];
    students: StudentData[];
  } {
    return {
      root: this.getRoot(),
      studentCount: this.getStudentCount(),
      treeHeight: this.getTreeHeight(),
      leaves: this.leaves,
      students: this.students
    };
  }
}
```

---

## 📋 **実装スケジュール（3週間）**

### **Week 1: 認証機能実装**

#### **Day 1-3: パスキー認証**
- WebAuthn統合
- Scholar Proverでのパスキー登録・認証
- 生体認証データの暗号化保存

#### **Day 4-7: Ledger認証**
- Executive Console Tauri化
- Ledger Nano X統合
- ハードウェアセキュリティモジュール統合

### **Week 2: Merkle Tree統合**

#### **Day 8-10: Merkle Tree実装**
- Registrar Console強化
- 学生データMerkle Tree構築
- 効率的な証明生成

#### **Day 11-14: ブロックチェーン統合**
- MerkleManagerコントラクト
- Merkle Root管理
- 証明検証の最適化

### **Week 3: 完全統合・最適化**

#### **Day 15-17: システム統合**
- 4システム完全連携
- エラーハンドリング強化
- パフォーマンス最適化

#### **Day 18-21: 教授向けデモ準備**
- デモンストレーションシナリオ作成
- UI/UX最適化
- ドキュメント整備

---

## 🎯 **最終成功基準**

### **技術的成功基準**
- [ ] パスキー認証完全動作
- [ ] Ledger Nano X認証完全動作
- [ ] Merkle Tree構築・検証完全動作
- [ ] 4システム完全統合動作
- [ ] エンタープライズ級パフォーマンス

### **プロダクション準備基準**
- [ ] **セキュリティ**: 多要素認証・暗号化保護
- [ ] **スケーラビリティ**: 大規模学生データ対応
- [ ] **監査可能性**: 完全な透明性・追跡可能性
- [ ] **運用性**: 大学での実際の運用可能

### **教授向けデモ成功基準**
- [ ] **技術的優位性**: 従来システムとの明確な違い
- [ ] **実用性**: 実際の大学での導入可能性
- [ ] **革新性**: Trust Minimized設計の価値
- [ ] **将来性**: Web3・ブロックチェーン時代への対応

---

## 🚀 **最終開発手順**

### **1. 高度機能統合**
```bash
# パスキー・Ledger統合
npm run integrate:advanced-auth

# Merkle Tree統合
npm run integrate:merkle-tree

# エンタープライズ機能
npm run integrate:enterprise
```

### **2. 最終統合テスト**
```bash
# 完全統合テスト
npm run test:complete-integration

# パフォーマンステスト
npm run test:performance

# セキュリティテスト
npm run test:security
```

### **3. プロダクション準備**
```bash
# 最適化ビルド
npm run build:production

# デモ準備
npm run demo:professor-ready
```

---

## 📝 **最終目標**

### **完全なTrust Minimizedシステム**
- 中央集権的な信頼を完全に排除
- ブロックチェーン・暗号学・分散システムの統合
- 大学での実際の運用可能なプロダクション品質

### **教授向けデモンストレーション**
- 従来の証明書システムとの明確な違い
- Web3時代の大学教育インフラの提案
- 実用的かつ革新的なソリューションの提示

---

**Phase 2目標**: 完全なTrust Minimizedシステムを完成させ、大学教育の未来を示すプロダクションレベルのデモンストレーションを実現する。
