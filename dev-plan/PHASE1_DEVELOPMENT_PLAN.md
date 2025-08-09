# Phase 1 開発計画書 - Tri-CertFramework プロトタイプ
**バージョン 2.4 - 最終更新: 2025-08-09**

> **ブロックチェーン統合フェーズ**: Executive Console + スマートコントラクト + Ledger Nano X認証 + 電子署名統合

---

## 🎯 **Phase 1 概要**

### **目標**
- **Executive Console**: Tauri v2 + Ledger Nano X認証 + スマートコントラクトデプロイ
- **Scholar Prover**: ブロックチェーンVK取得機能 + 電子署名機能の完全実装
- **Verifier UI**: ブロックチェーンVK検証 + 電子署名検証機能の完全実装
- **スマートコントラクト**: Polygon zkEVM CardonaでのVK管理 + 検証鍵ハッシュ管理

### **新規追加機能**
- **Ledger Nano X認証**: 責任者の身元確認
- **スマートコントラクト**: VKのブロックチェーン保存・取得
- **Executive Console**: 2025年度回路のデプロイ管理
- **完全Trust Minimized**: ブロックチェーン中心の設計

### **技術制約**
- **バックエンド**: なし（完全フロントエンド）
- **データベース**: なし（ブロックチェーンストレージ）
- **ブロックチェーン**: 必須（Polygon zkEVM Cardona）
- **ハードウェア**: Ledger Nano X（責任者認証用）

---

## 🏗️ **プロジェクト構造（Phase 1）**

```
Tri-CertFramework/
├── dev-plan/
│   ├── PHASE0_DEVELOPMENT_PLAN.md
│   ├── PHASE1_DEVELOPMENT_PLAN.md
│   └── PHASE2_DEVELOPMENT_PLAN.md
├── scholar-prover/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BlockchainVKSelector.tsx
│   │   │   └── NetworkStatus.tsx
│   │   ├── utils/
│   │   │   ├── blockchain-client.ts
│   │   │   └── contract-interaction.ts
│   │   └── config/
│   │       └── blockchain-config.ts
│   └── contracts/
│       └── VKManager.sol
├── executive-console/
│   ├── src-tauri/
│   │   ├── src/
│   │   │   ├── main.rs
│   │   │   ├── ledger.rs
│   │   │   ├── blockchain.rs
│   │   │   └── contract.rs
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── LedgerAuth.tsx
│   │   │   ├── ContractDeployer.tsx
│   │   │   ├── VKUploader.tsx
│   │   │   └── NetworkManager.tsx
│   │   ├── utils/
│   │   │   ├── ledger-connection.ts
│   │   │   ├── contract-deployment.ts
│   │   │   └── vk-validator.ts
│   │   └── config/
│   │       └── executive-config.ts
│   └── package.json
├── verifier-ui/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BlockchainVKSelector.tsx
│   │   │   └── ContractStatus.tsx
│   │   ├── utils/
│   │   │   ├── blockchain-verification.ts
│   │   │   └── contract-reader.ts
│   │   └── config/
│   │       └── verifier-config.ts
│   └── contracts/
│       └── VKManager.sol
└── shared/
    ├── contracts/
    │   ├── VKManager.sol
    │   ├── VKValidator.sol
    │   └── interfaces/
    │       └── IVKManager.sol
    ├── scripts/
    │   ├── deploy.ts
    │   ├── verify.ts
    │   └── test.ts
    └── types/
        └── blockchain.ts
```

---

## 🔧 **スマートコントラクト設計**

### **VKManager.sol - メインコントラクト**
```solidity
// shared/contracts/VKManager.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IVKManager.sol";

contract VKManager is IVKManager, Ownable, ReentrancyGuard {
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

### **IVKManager.sol - インターフェース**
```solidity
// shared/contracts/interfaces/IVKManager.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IVKManager {
    struct VKData {
        string vkJson;
        uint256 timestamp;
        address deployer;
        bool isValid;
        string version;
    }
    
    function deployVK(string memory vkJson, string memory version) external returns (uint256);
    function getVK(uint256 vkId) external view returns (VKData memory);
    function getLatestVK() external view returns (VKData memory);
    function invalidateVK(uint256 vkId) external;
    function authorizeDeployer(address deployer) external;
    function revokeDeployer(address deployer) external;
    function isAuthorized(address deployer) external view returns (bool);
}
```

---

## 📋 **Week 1: Executive Console基盤構築**

### **Day 1-2: Tauri環境セットアップ**

#### **1.1 Executive Console プロジェクト作成**
```bash
# Executive Console作成
cd zk-CertFramework
npm create tauri-app@latest executive-console -- --template react-ts
cd executive-console

# 依存関係インストール
npm install ethers @ledgerhq/hw-transport-webusb @ledgerhq/hw-app-eth
npm install -D @types/node
```

#### **1.2 Tauri設定**
```json
// executive-console/src-tauri/tauri.conf.json
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
        "scope": ["$APPDATA/*", "$APPDATA/contracts/*"]
      }
    },
    "bundle": {
      "active": true,
      "targets": "all",
      "identifier": "com.zkcertframework.executive",
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
        "title": "ZK-CertFramework Executive Console",
        "width": 1200,
        "height": 800
      }
    ]
  }
}
```

### **Day 3-4: Ledger Nano X統合**

#### **1.3 Ledger接続管理**
```typescript
// executive-console/src/utils/ledger-connection.ts
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import Eth from '@ledgerhq/hw-app-eth';

export class LedgerManager {
  private transport: TransportWebUSB | null = null;
  private ethApp: Eth | null = null;

  async connect(): Promise<boolean> {
    try {
      this.transport = await TransportWebUSB.create();
      this.ethApp = new Eth(this.transport);
      
      // アプリケーション情報取得
      const appInfo = await this.ethApp.getAppConfiguration();
      console.log('Ledger connected:', appInfo);
      
      return true;
    } catch (error) {
      console.error('Ledger connection failed:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
      this.ethApp = null;
    }
  }

  async getAddress(path: string = "44'/60'/0'/0/0"): Promise<string> {
    if (!this.ethApp) {
      throw new Error('Ledger not connected');
    }
    
    const result = await this.ethApp.getAddress(path);
    return result.address;
  }

  async signTransaction(
    path: string,
    transactionHex: string
  ): Promise<{ r: string; s: string; v: number }> {
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

  async signMessage(
    path: string,
    messageHex: string
  ): Promise<{ r: string; s: string; v: number }> {
    if (!this.ethApp) {
      throw new Error('Ledger not connected');
    }
    
    const result = await this.ethApp.signPersonalMessage(path, messageHex);
    return {
      r: result.r,
      s: result.s,
      v: result.v
    };
  }

  isConnected(): boolean {
    return this.transport !== null && this.ethApp !== null;
  }
}
```

#### **1.4 Ledger認証コンポーネント**
```typescript
// executive-console/src/components/LedgerAuth.tsx
import React, { useState, useEffect } from 'react';
import { LedgerManager } from '../utils/ledger-connection';

interface LedgerAuthProps {
  onAuthenticated: (address: string) => void;
}

export const LedgerAuth: React.FC<LedgerAuthProps> = ({ onAuthenticated }) => {
  const [ledgerManager] = useState(() => new LedgerManager());
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleConnect = async () => {
    setIsConnecting(true);
    setError('');
    
    try {
      const connected = await ledgerManager.connect();
      if (connected) {
        const addr = await ledgerManager.getAddress();
        setAddress(addr);
        setIsConnected(true);
        onAuthenticated(addr);
      } else {
        setError('Ledger接続に失敗しました');
      }
    } catch (err) {
      setError(`接続エラー: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await ledgerManager.disconnect();
    setIsConnected(false);
    setAddress('');
  };

  return (
    <div className="ledger-auth">
      <h2 className="text-xl font-bold mb-4">Ledger Nano X認証</h2>
      
      {!isConnected ? (
        <div className="space-y-4">
          <p className="text-gray-600">
            Ledger Nano Xを接続し、Ethereumアプリを開いてください
          </p>
          
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
          >
            {isConnecting ? '接続中...' : 'Ledger接続'}
          </button>
          
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded">
            <p className="text-green-800 font-medium">接続済み</p>
            <p className="text-sm text-green-600 break-all">{address}</p>
          </div>
          
          <button
            onClick={handleDisconnect}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            切断
          </button>
        </div>
      )}
    </div>
  );
};
```

### **Day 5-7: スマートコントラクト統合**

#### **1.5 コントラクトデプロイ管理**
```typescript
// executive-console/src/utils/contract-deployment.ts
import { ethers } from 'ethers';
import { LedgerManager } from './ledger-connection';

export class ContractDeployer {
  private provider: ethers.JsonRpcProvider;
  private ledgerManager: LedgerManager;
  private wallet: ethers.Wallet | null = null;

  constructor(ledgerManager: LedgerManager) {
    this.provider = new ethers.JsonRpcProvider('https://rpc.cardona.zkevm-rpc.com');
    this.ledgerManager = ledgerManager;
  }

  async setupWallet(path: string = "44'/60'/0'/0/0"): Promise<void> {
    const address = await this.ledgerManager.getAddress(path);
    
    this.wallet = new ethers.Wallet(
      new ethers.HDNodeWallet(
        ethers.HDNodeWallet.createRandom(),
        path
      ),
      this.provider
    );
  }

  async deployVKManager(): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not setup');
    }

    const vkManagerFactory = new ethers.ContractFactory(
      VK_MANAGER_ABI,
      VK_MANAGER_BYTECODE,
      this.wallet
    );

    const contract = await vkManagerFactory.deploy();
    await contract.waitForDeployment();
    
    return await contract.getAddress();
  }

  async deployVK(
    contractAddress: string,
    vkJson: string,
    version: string
  ): Promise<number> {
    if (!this.wallet) {
      throw new Error('Wallet not setup');
    }

    const contract = new ethers.Contract(
      contractAddress,
      VK_MANAGER_ABI,
      this.wallet
    );

    const tx = await contract.deployVK(vkJson, version);
    const receipt = await tx.wait();
    
    // VKDeployedイベントからVK IDを取得
    const event = receipt.logs.find(log => 
      log.topics[0] === contract.interface.getEventTopic('VKDeployed')
    );
    
    if (event) {
      const decoded = contract.interface.decodeEventLog('VKDeployed', event.data);
      return decoded.vkId;
    }
    
    throw new Error('VK deployment failed');
  }

  async authorizeDeployer(
    contractAddress: string,
    deployerAddress: string
  ): Promise<void> {
    if (!this.wallet) {
      throw new Error('Wallet not setup');
    }

    const contract = new ethers.Contract(
      contractAddress,
      VK_MANAGER_ABI,
      this.wallet
    );

    const tx = await contract.authorizeDeployer(deployerAddress);
    await tx.wait();
  }
}

// コントラクトABIとバイトコード（実際のコンパイル結果を使用）
const VK_MANAGER_ABI = [
  "function deployVK(string memory vkJson, string memory version) external returns (uint256)",
  "function getVK(uint256 vkId) external view returns (VKData memory)",
  "function getLatestVK() external view returns (VKData memory)",
  "function authorizeDeployer(address deployer) external",
  "event VKDeployed(uint256 indexed vkId, address indexed deployer, string version)"
];

const VK_MANAGER_BYTECODE = "0x..."; // 実際のバイトコード
```

---

## 📋 **Week 2: Scholar Prover・Verifier UI統合**

### **Day 8-10: ブロックチェーンVK取得実装**

#### **2.1 Scholar Prover - ブロックチェーンVK取得**
```typescript
// scholar-prover/src/utils/blockchain-client.ts
import { ethers } from 'ethers';
import { VerifyingKey } from '../types';

export class BlockchainVKClient {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract | null = null;

  constructor(contractAddress: string) {
    this.provider = new ethers.JsonRpcProvider('https://rpc.cardona.zkevm-rpc.com');
    this.contract = new ethers.Contract(
      contractAddress,
      VK_MANAGER_ABI,
      this.provider
    );
  }

  async getLatestVK(): Promise<VerifyingKey> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    const vkData = await this.contract.getLatestVK();
    return JSON.parse(vkData.vkJson);
  }

  async getVKById(vkId: number): Promise<VerifyingKey> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    const vkData = await this.contract.getVK(vkId);
    return JSON.parse(vkData.vkJson);
  }

  async getVKMetadata(vkId: number): Promise<{
    timestamp: number;
    deployer: string;
    version: string;
    isValid: boolean;
  }> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    const vkData = await this.contract.getVK(vkId);
    return {
      timestamp: Number(vkData.timestamp),
      deployer: vkData.deployer,
      version: vkData.version,
      isValid: vkData.isValid
    };
  }

  async getCurrentVKId(): Promise<number> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    return await this.contract.currentVKId();
  }
}
```

#### **2.2 Verifier UI - ブロックチェーンVK検証**
```typescript
// verifier-ui/src/utils/blockchain-verification.ts
import { ethers } from 'ethers';
import { VerifyingKey, ProofData } from '../types';

export class BlockchainVerifier {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract | null = null;

  constructor(contractAddress: string) {
    this.provider = new ethers.JsonRpcProvider('https://rpc.cardona.zkevm-rpc.com');
    this.contract = new ethers.Contract(
      contractAddress,
      VK_MANAGER_ABI,
      this.provider
    );
  }

  async verifyProofWithBlockchainVK(
    proof: ProofData,
    vkId: number
  ): Promise<{
    isValid: boolean;
    vkMetadata: any;
    verificationTime: number;
  }> {
    const startTime = Date.now();

    // 1. ブロックチェーンからVK取得
    const vkData = await this.contract!.getVK(vkId);
    if (!vkData.isValid) {
      throw new Error('VK is invalid on blockchain');
    }

    const vk: VerifyingKey = JSON.parse(vkData.vkJson);

    // 2. ZKP検証
    const { verifyProof } = await import('snarkjs');
    const isValid = await verifyProof(vk, proof.publicSignals, proof.proof);

    const verificationTime = Date.now() - startTime;

    return {
      isValid,
      vkMetadata: {
        timestamp: Number(vkData.timestamp),
        deployer: vkData.deployer,
        version: vkData.version,
        vkId
      },
      verificationTime
    };
  }

  async getVKHistory(): Promise<Array<{
    vkId: number;
    timestamp: number;
    deployer: string;
    version: string;
    isValid: boolean;
  }>> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    const currentId = await this.contract.currentVKId();
    const history = [];

    for (let i = 1; i <= currentId; i++) {
      try {
        const vkData = await this.contract.getVK(i);
        history.push({
          vkId: i,
          timestamp: Number(vkData.timestamp),
          deployer: vkData.deployer,
          version: vkData.version,
          isValid: vkData.isValid
        });
      } catch (error) {
        console.warn(`Failed to get VK ${i}:`, error);
      }
    }

    return history.sort((a, b) => b.timestamp - a.timestamp);
  }
}
```

### **Day 11-12: UI統合**

#### **2.3 Executive Console - メイン画面**
```typescript
// executive-console/src/App.tsx
import React, { useState } from 'react';
import { LedgerAuth } from './components/LedgerAuth';
import { ContractDeployer } from './components/ContractDeployer';
import { VKUploader } from './components/VKUploader';
import { NetworkManager } from './components/NetworkManager';
import { LedgerManager } from './utils/ledger-connection';
import { ContractDeployer as ContractDeployerUtil } from './utils/contract-deployment';

export default function App() {
  const [ledgerManager] = useState(() => new LedgerManager());
  const [contractDeployer, setContractDeployer] = useState<ContractDeployerUtil | null>(null);
  const [authenticatedAddress, setAuthenticatedAddress] = useState<string>('');
  const [deployedContract, setDeployedContract] = useState<string>('');

  const handleAuthenticated = async (address: string) => {
    setAuthenticatedAddress(address);
    
    // ウォレットセットアップ
    const deployer = new ContractDeployerUtil(ledgerManager);
    await deployer.setupWallet();
    setContractDeployer(deployer);
  };

  const handleContractDeployed = (contractAddress: string) => {
    setDeployedContract(contractAddress);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">ZK-CertFramework Executive Console</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <LedgerAuth onAuthenticated={handleAuthenticated} />
            
            {authenticatedAddress && (
              <NetworkManager />
            )}
          </div>
          
          <div className="space-y-6">
            {contractDeployer && (
              <ContractDeployer
                deployer={contractDeployer}
                onDeployed={handleContractDeployed}
              />
            )}
            
            {deployedContract && (
              <VKUploader
                contractAddress={deployedContract}
                deployer={contractDeployer!}
              />
            )}
          </div>
        </div>
        
        {deployedContract && (
          <div className="mt-8 p-4 bg-green-50 rounded">
            <h3 className="font-medium text-green-800">デプロイ済みコントラクト</h3>
            <p className="text-sm text-green-600 break-all">{deployedContract}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 📋 **Week 3: 統合・テスト**

### **Day 15-17: 統合テスト**

#### **3.1 ブロックチェーン統合テスト**
```typescript
// 統合テストシナリオ
const blockchainIntegrationTest = async () => {
  console.log("=== ブロックチェーン統合テスト ===");
  
  // 1. Executive Consoleでコントラクトデプロイ
  const contractAddress = await deployVKManager();
  console.log("コントラクトデプロイ:", contractAddress);
  
  // 2. VKアップロード
  const vkId = await uploadVK(contractAddress);
  console.log("VKアップロード:", vkId);
  
  // 3. Scholar ProverでブロックチェーンVK取得
  const vk = await getVKFromBlockchain(contractAddress);
  console.log("ブロックチェーンVK取得:", vk);
  
  // 4. Verifier UIでブロックチェーン検証
  const result = await verifyWithBlockchainVK(contractAddress);
  console.log("ブロックチェーン検証:", result);
};
```

### **Day 18-21: 改善・ドキュメント**

#### **3.2 セキュリティ改善**
```typescript
// セキュリティ検証
export class SecurityValidator {
  static validateVK(vk: VerifyingKey): boolean {
    // VK形式検証
    const requiredFields = ['protocol', 'curve', 'nPublic', 'IC'];
    return requiredFields.every(field => field in vk);
  }

  static validateContractAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  static validateDeployerAuthorization(
    contract: ethers.Contract,
    deployer: string
  ): Promise<boolean> {
    return contract.isAuthorized(deployer);
  }
}
```

---

## 🎯 **成功基準・受入テスト**

### **技術的成功基準**
- [ ] Ledger Nano X認証成功
- [ ] スマートコントラクトデプロイ成功
- [ ] VKブロックチェーン保存・取得成功
- [ ] Scholar Prover・Verifier UI統合成功
- [ ] 完全Trust Minimized動作確認

### **デモンストレーション成功基準**
- [ ] **Ledger認証**: ハードウェア認証の実感
- [ ] **コントラクトデプロイ**: ブロックチェーン操作の実感
- [ ] **VK管理**: Trust Minimized設計の実感
- [ ] **統合動作**: 完全システムの威力

### **受入テスト**
```typescript
const phase1AcceptanceTests = [
  {
    name: "Ledger認証テスト",
    steps: ["Ledger接続", "アドレス取得", "認証確認"],
    expected: "Ledger Nano Xで正常に認証される"
  },
  {
    name: "コントラクトデプロイテスト",
    steps: ["VKManagerデプロイ", "権限設定", "動作確認"],
    expected: "スマートコントラクトが正常にデプロイされる"
  },
  {
    name: "VK管理テスト",
    steps: ["VKアップロード", "ブロックチェーン保存", "取得検証"],
    expected: "VKがブロックチェーンで正常に管理される"
  },
  {
    name: "統合検証テスト",
    steps: ["Scholar Prover生成", "Verifier UI検証", "ブロックチェーン確認"],
    expected: "完全なTrust Minimized検証が動作する"
  }
];
```

---

## 🚀 **開発開始手順**

### **1. Executive Consoleセットアップ**
```bash
cd executive-console
npm install
npm run tauri dev
```

### **2. スマートコントラクトデプロイ**
```bash
cd shared/contracts
npm install hardhat
npx hardhat compile
npx hardhat deploy --network cardona
```

### **3. 統合テスト実行**
```bash
npm run test:blockchain
npm run test:integration
```

---

## 📝 **次のフェーズ準備**

Phase 1完了後、以下のフェーズに進む準備：

### **Phase 2: 完全システム**
- Registrar Console実装
- Merkle Tree統合
- 4システム完全統合
- 教授向けデモ準備

---

**Phase 1目標**: ブロックチェーン統合とExecutive Consoleを完成させ、完全なTrust Minimizedシステムの基盤を構築する。 