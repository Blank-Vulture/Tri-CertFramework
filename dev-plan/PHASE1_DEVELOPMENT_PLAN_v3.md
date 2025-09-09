# Phase 1 開発計画書 v3.0 - Tri-CertFramework ブロックチェーン統合
**バージョン 2.4 - 最終更新: 2025-08-09（更新: Hardhat/Hardhat Network をデフォルトに）**

> **ブロックチェーン統合**: Phase 0の4システムにブロックチェーン機能を追加し、Trust Minimized設計を実現

---

## 🎯 **Phase 1 概要**

### **目標**
- **ブロックチェーン統合**: Phase 0の4システムにブロックチェーン機能を追加
- **Trust Minimized**: 中央集権的な信頼を排除した設計
- **スマートコントラクト**: VK管理のブロックチェーン実装
- **実用性向上**: より本格的な証明書システムの実現

### **機能拡張**
- **Scholar Prover**: ブロックチェーンVK取得 + メタマスク連携
- **Executive Console**: スマートコントラクトデプロイ + VK管理
- **Registrar Console**: ブロックチェーンVKレジストリ管理
- **Verifier UI**: ブロックチェーン検証 + 透明性確保

### **技術制約**
- **バックエンド**: なし（完全フロントエンド）
- **データベース**: なし（ブロックチェーンストレージ）
- **ブロックチェーン**: 必須（デフォルトは Hardhat/Hardhat Network、zkEVM Cardona はオプション）
- **ハードウェア**: メタマスク（Ledger認証は Phase 2）

---

## 🏗️ **Phase 1 プロジェクト構造**

```
Tri-CertFramework/
├── scholar-prover/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BlockchainVKSelector.tsx
│   │   │   ├── MetaMaskConnector.tsx
│   │   │   └── NetworkStatus.tsx
│   │   ├── utils/
│   │   │   ├── blockchain-client.ts
│   │   │   └── contract-interaction.ts
│   │   └── config/
│   │       └── blockchain-config.ts
├── executive-console/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ContractDeployer.tsx
│   │   │   ├── VKManager.tsx
│   │   │   └── BlockchainStatus.tsx
│   │   ├── utils/
│   │   │   ├── contract-deployment.ts
│   │   │   └── vk-uploader.ts
│   │   └── config/
│   │       └── executive-config.ts
├── registrar-console/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BlockchainVKRegistry.tsx
│   │   │   └── ContractInteraction.tsx
│   │   ├── utils/
│   │   │   ├── blockchain-registry.ts
│   │   │   └── contract-reader.ts
│   │   └── config/
│   │       └── registrar-config.ts
├── verifier-ui/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BlockchainVerifier.tsx
│   │   │   └── TransparencyViewer.tsx
│   │   ├── utils/
│   │   │   ├── blockchain-verification.ts
│   │   │   └── transparency-tracker.ts
│   │   └── config/
│   │       └── verifier-config.ts
└── shared/
    ├── contracts/
    │   ├── VKManager.sol
    │   └── VKRegistry.sol
    ├── scripts/
    │   ├── deploy.ts
    │   └── verify.ts
    └── types/
        └── blockchain.ts
```

---

## 🔧 **スマートコントラクト設計**

### **VKManager.sol - シンプルなVK管理**
```solidity
// shared/contracts/VKManager.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract VKManager {
    struct VKData {
        string vkJson;
        uint256 timestamp;
        address deployer;
        string version;
    }
    
    mapping(uint256 => VKData) public vkRegistry;
    uint256 public currentVKId;
    address public owner;
    
    event VKDeployed(uint256 indexed vkId, address indexed deployer, string version);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        currentVKId = 0;
    }
    
    function deployVK(string memory vkJson, string memory version) external onlyOwner returns (uint256) {
        currentVKId++;
        
        vkRegistry[currentVKId] = VKData({
            vkJson: vkJson,
            timestamp: block.timestamp,
            deployer: msg.sender,
            version: version
        });
        
        emit VKDeployed(currentVKId, msg.sender, version);
        return currentVKId;
    }
    
    function getVK(uint256 vkId) external view returns (VKData memory) {
        require(vkId > 0 && vkId <= currentVKId, "Invalid VK ID");
        return vkRegistry[vkId];
    }
    
    function getLatestVK() external view returns (VKData memory) {
        require(currentVKId > 0, "No VK deployed");
        return vkRegistry[currentVKId];
    }
    
    function getCurrentVKId() external view returns (uint256) {
        return currentVKId;
    }
}
```

---

## 📋 **実装スケジュール（2週間）**

### **Week 1: ブロックチェーン基盤**

#### **Day 1-2: 環境セットアップ**

##### **1.1 ブロックチェーン依存関係追加（Hardhat）**
```bash
npm i -D hardhat @nomicfoundation/hardhat-ethers ethers
npx hardhat init
npx hardhat node # RPC: http://127.0.0.1:8545, chainId: 31337
```

MetaMask 接続: ネットワーク追加 → RPC `http://127.0.0.1:8545` / Chain ID `31337` / Symbol `ETH`

zkEVM Cardona を利用する場合は、`.env` に RPC と鍵を設定して `hardhat.config.ts` にネットワークを追記する。
# 全プロジェクトにethers追加
cd scholar-prover && npm install ethers
cd executive-console && npm install ethers
cd registrar-console && npm install ethers  
cd verifier-ui && npm install ethers

# 開発環境セットアップ
npm install -g hardhat
mkdir -p shared/contracts
npm init -y && npm install hardhat ethers
```

##### **1.2 スマートコントラクト開発**
```bash
# Hardhat環境構築
cd shared
npx hardhat init
# VKManager.solの実装
npx hardhat compile
npx hardhat test
```

#### **Day 3-4: MetaMask統合**

##### **1.3 Scholar Prover - ブロックチェーン対応**
```typescript
// scholar-prover/src/utils/blockchain-client.ts
import { ethers } from 'ethers';

export class BlockchainVKClient {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private contract: ethers.Contract | null = null;

  async connectWallet(): Promise<boolean> {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask not installed');
    }

    try {
      this.provider = new ethers.BrowserProvider(window.ethereum);
      await this.provider.send("eth_requestAccounts", []);
      this.signer = await this.provider.getSigner();
      
      // Polygon zkEVM Cardona に接続
      await this.switchToCardona();
      
      // コントラクト接続
      const contractAddress = "0x..."; // デプロイ後のアドレス
      const abi = [...]; // VKManager ABI
      this.contract = new ethers.Contract(contractAddress, abi, this.signer);
      
      return true;
    } catch (error) {
      console.error('Wallet connection failed:', error);
      return false;
    }
  }

  async switchToCardona(): Promise<void> {
    const cardonaConfig = {
      chainId: '0x844', // 2132 in hex
      chainName: 'Polygon zkEVM Cardona',
      nativeCurrency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18
      },
      rpcUrls: ['https://rpc.cardona.zkevm-rpc.com'],
      blockExplorerUrls: ['https://cardona-zkevm.polygonscan.com/']
    };

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: cardonaConfig.chainId }]
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [cardonaConfig]
        });
      }
    }
  }

  async getLatestVK(): Promise<any> {
    if (!this.contract) throw new Error('Contract not connected');
    
    const vkData = await this.contract.getLatestVK();
    return JSON.parse(vkData.vkJson);
  }

  async getVKById(vkId: number): Promise<any> {
    if (!this.contract) throw new Error('Contract not connected');
    
    const vkData = await this.contract.getVK(vkId);
    return JSON.parse(vkData.vkJson);
  }

  isConnected(): boolean {
    return this.provider !== null && this.signer !== null;
  }
}
```

##### **1.4 MetaMask接続コンポーネント**
```typescript
// scholar-prover/src/components/MetaMaskConnector.tsx
import React, { useState, useEffect } from 'react';
import { BlockchainVKClient } from '../utils/blockchain-client';

interface MetaMaskConnectorProps {
  onConnectionChange: (connected: boolean, client: BlockchainVKClient | null) => void;
}

export const MetaMaskConnector: React.FC<MetaMaskConnectorProps> = ({ onConnectionChange }) => {
  const [client] = useState(() => new BlockchainVKClient());
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      const connected = await client.connectWallet();
      if (connected) {
        setIsConnected(true);
        // アドレス取得
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        setAddress(accounts[0]);
        onConnectionChange(true, client);
      }
    } catch (error) {
      console.error('Connection failed:', error);
      onConnectionChange(false, null);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setAddress('');
    onConnectionChange(false, null);
  };

  return (
    <div className="metamask-connector">
      <h3 className="text-lg font-medium mb-4">ブロックチェーン接続</h3>
      
      {!isConnected ? (
        <div className="space-y-4">
          <p className="text-gray-600">
            MetaMaskを接続してブロックチェーンVKを取得
          </p>
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="bg-orange-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
          >
            {isConnecting ? '接続中...' : 'MetaMask接続'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded">
            <p className="text-green-800 font-medium">接続済み</p>
            <p className="text-sm text-green-600 break-all">{address}</p>
            <p className="text-sm text-green-600">Polygon zkEVM Cardona</p>
          </div>
          <button
            onClick={disconnectWallet}
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

### **Week 2: 各システム統合**

#### **Day 8-10: Executive Console強化**

##### **2.1 コントラクトデプロイ機能**
```typescript
// executive-console/src/components/ContractDeployer.tsx
import React, { useState } from 'react';
import { ethers } from 'ethers';

export const ContractDeployer: React.FC = () => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState<string>('');
  const [deploymentTx, setDeploymentTx] = useState<string>('');

  const deployContract = async () => {
    setIsDeploying(true);
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // VKManagerコントラクトのデプロイ
      const contractFactory = new ethers.ContractFactory(
        VK_MANAGER_ABI,
        VK_MANAGER_BYTECODE,
        signer
      );

      const contract = await contractFactory.deploy();
      const receipt = await contract.waitForDeployment();
      
      const address = await contract.getAddress();
      setDeployedAddress(address);
      setDeploymentTx(contract.deploymentTransaction()?.hash || '');
      
    } catch (error) {
      console.error('Deployment failed:', error);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="contract-deployer">
      <h3 className="text-lg font-medium mb-4">スマートコントラクトデプロイ</h3>
      
      <div className="space-y-4">
        <button
          onClick={deployContract}
          disabled={isDeploying}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
        >
          {isDeploying ? 'デプロイ中...' : 'VKManagerデプロイ'}
        </button>

        {deployedAddress && (
          <div className="p-4 bg-green-50 rounded">
            <h4 className="font-medium text-green-800 mb-2">デプロイ完了</h4>
            <p className="text-sm text-green-600 break-all">
              コントラクトアドレス: {deployedAddress}
            </p>
            <p className="text-sm text-green-600 break-all">
              トランザクション: {deploymentTx}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// コントラクトABI（コンパイル結果から取得）
const VK_MANAGER_ABI = [
  "function deployVK(string memory vkJson, string memory version) external returns (uint256)",
  "function getVK(uint256 vkId) external view returns (tuple(string vkJson, uint256 timestamp, address deployer, string version))",
  "function getLatestVK() external view returns (tuple(string vkJson, uint256 timestamp, address deployer, string version))",
  "function getCurrentVKId() external view returns (uint256)",
  "event VKDeployed(uint256 indexed vkId, address indexed deployer, string version)"
];

const VK_MANAGER_BYTECODE = "0x..."; // 実際のコンパイル結果
```

#### **Day 11-14: 統合・テスト**

##### **2.2 ブロックチェーン統合テスト**
```typescript
// 統合テストシナリオ
const blockchainIntegrationFlow = async () => {
  console.log("=== ブロックチェーン統合テスト ===");
  
  // 1. Executive Console: コントラクトデプロイ
  const contractAddress = await deployVKManagerContract();
  console.log("コントラクトデプロイ完了:", contractAddress);
  
  // 2. Executive Console: VKアップロード
  const vkId = await uploadVKToBlockchain(contractAddress, sampleVK);
  console.log("VKアップロード完了:", vkId);
  
  // 3. Registrar Console: ブロックチェーンVK取得・管理
  const registryVKs = await fetchVKsFromBlockchain(contractAddress);
  console.log("VKレジストリ取得完了:", registryVKs.length);
  
  // 4. Scholar Prover: ブロックチェーンVK使用でZKP生成
  const proof = await generateProofWithBlockchainVK(contractAddress, vkId);
  console.log("ブロックチェーンVKでZKP生成完了");
  
  // 5. Verifier UI: ブロックチェーン検証
  const verificationResult = await verifyWithBlockchainVK(proof, contractAddress, vkId);
  console.log("ブロックチェーン検証完了:", verificationResult);
};
```

---

## 🎯 **成功基準**

### **技術的成功基準**
- [ ] MetaMask接続・Polygon zkEVM Cardona統合成功
- [ ] スマートコントラクトデプロイ成功
- [ ] VKのブロックチェーン保存・取得成功
- [ ] 4システムでのブロックチェーン統合成功
- [ ] Trust Minimized動作確認

### **理解度成功基準**
- [ ] **ブロックチェーンの価値**: 中央集権排除の理解
- [ ] **Trust Minimized**: 分散化設計の実感
- [ ] **透明性**: ブロックチェーンによる検証可能性
- [ ] **実用性**: より本格的なシステムの実感

### **デモンストレーション成功基準**
- [ ] **ブロックチェーン操作**: MetaMask連携・コントラクト操作
- [ ] **Trust Minimized実演**: 中央集権なしでの動作
- [ ] **透明性確認**: ブロックエクスプローラーでの確認
- [ ] **価値説明**: 従来システムとの違い

---

## 🚀 **開発開始手順**

### **1. ブロックチェーン環境セットアップ**
```bash
# 依存関係追加
npm install ethers hardhat

# スマートコントラクト開発
cd shared/contracts
npx hardhat compile
npx hardhat test --network cardona

# 各システムにブロックチェーン機能追加
npm run upgrade:blockchain
```

### **2. デプロイ・統合テスト**
```bash
# コントラクトデプロイ
npx hardhat run scripts/deploy.ts --network cardona

# 統合テスト
npm run test:blockchain
npm run test:integration
```

---

## 📝 **Phase 2準備**

Phase 1完了後、以下の機能を Phase 2 で追加：

### **高度認証機能**
- Ledger Nano X認証
- パスキー統合
- 多要素認証

### **Merkle Tree統合**
- 効率的なデータ管理
- スケーラビリティ向上
- プライバシー保護

### **完全システム統合**
- 4システム完全連携
- エンタープライズ機能
- 教授向けデモ完成

---

**Phase 1目標**: ブロックチェーン統合により Trust Minimized設計を実現し、分散化の価値を実感する。
