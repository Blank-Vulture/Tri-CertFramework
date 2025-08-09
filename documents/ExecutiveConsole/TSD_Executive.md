# 技術設計書 (TSD) — Executive Console  
最終更新: 2025-08-09 Version 2.4

---

## 1. 技術スタック（完全バックエンドレス）
| 層 | 技術 | バージョン |
|----|------|-----------|
| デスクトップ | Tauri v2 + React 18 + TypeScript | 2.0+ / 18.0+ / 5.0+ |
| データ管理 | JSON Files + Node.js fs | Native |
| 認証 | Ledger Nano X + EIP-191 | @ledgerhq/hw-* |
| ブロックチェーン | Polygon zkEVM + ethers.js | 6.0+ |
| ZKP | Circom 2.1.4 + SnarkJS 0.7 | Latest |
| ハッシュ | SHA3-512 + Poseidon256 | Crypto-js + circomlibjs |

## 2. Tauri アプリケーション設計

### 2.1 年度セット管理（JSONファイル）
```typescript
// services/YearlySetManager.ts
import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

interface YearlySet {
  year: number;
  nftContract: string;
  vkHash: string;
  merkleRoot: string;
  circuitHash: string;
  localFiles: {
    circuit: string;
    vk: string;
    zkey: string;
  };
  deployedAt: string;
  deployTx: string;
  status: 'draft' | 'active' | 'deprecated';
}

export class YearlySetManager {
  private configPath = './config/yearly-sets.json';

  async loadYearlySets(): Promise<Record<string, YearlySet>> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(data);
      return config.sets || {};
    } catch (error) {
      return {};
    }
  }

  async saveYearlySet(year: number, setData: YearlySet): Promise<void> {
    const config = await this.loadConfig();
    config.sets[year] = setData;
    config.version = "2.0";
    config.lastUpdated = new Date().toISOString();
    
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
  }

  async createYearlySet(year: number, circuitPath: string): Promise<YearlySet> {
    // 1. 回路ファイルハッシュ計算
    const circuitContent = await fs.readFile(circuitPath);
    const circuitHash = createHash('sha3-512').update(circuitContent).digest('hex');
    
    // 2. VKハッシュ計算
    const vkPath = circuitPath.replace('.circom', '_vk.json');
    const vkContent = await fs.readFile(vkPath);
    const vkHash = createHash('sha3-512').update(vkContent).digest('hex');
    
    // 3. 年度セット作成
    const yearlySet: YearlySet = {
      year,
      nftContract: '',  // デプロイ後に設定
      vkHash: '0x' + vkHash,
      merkleRoot: '0x' + '0'.repeat(64), // 初期値
      circuitHash: '0x' + circuitHash,
      localFiles: {
        circuit: circuitPath,
        vk: vkPath,
        zkey: circuitPath.replace('.circom', '.zkey')
      },
      deployedAt: '',
      deployTx: '',
      status: 'draft'
    };

    await this.saveYearlySet(year, yearlySet);
    return yearlySet;
  }

  async deployYearlySet(year: number, ledgerService: LedgerService): Promise<string> {
    const sets = await this.loadYearlySets();
    const yearlySet = sets[year];
    
    if (!yearlySet) {
      throw new Error(`Yearly set for ${year} not found`);
    }

    // Ledger署名でデプロイメント実行
    const deploymentData = {
      year,
      vkHash: yearlySet.vkHash,
      circuitHash: yearlySet.circuitHash,
      merkleRoot: yearlySet.merkleRoot
    };

    const signature = await ledgerService.signDeployment(deploymentData);
    
    // ブロックチェーンデプロイメント（実装省略）
    const txHash = await this.deployToBlockchain(deploymentData, signature);
    
    // 状態更新
    yearlySet.deployTx = txHash;
    yearlySet.deployedAt = new Date().toISOString();
    yearlySet.status = 'active';
    
    await this.saveYearlySet(year, yearlySet);
    return txHash;
  }

  private async deployToBlockchain(data: any, signature: string): Promise<string> {
    // ブロックチェーンデプロイメント実装
    // スマートコントラクトの createYearlySet 関数を呼び出し
    return '0x' + Math.random().toString(16).slice(2);
  }
}
```

## 3. Ledger Nano X 統合（EIP-191）

### 3.1 EIP-191 署名実装
```typescript
// services/LedgerService.ts
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import Eth from '@ledgerhq/hw-app-eth';
import { ethers } from 'ethers';

export class LedgerService {
  private transport: TransportWebHID | null = null;
  private eth: Eth | null = null;
  private readonly CHAIN_ID = 1442; // Polygon zkEVM
  private readonly CONTRACT_ADDRESS = '0x...'; // YearlyDeploymentManager

  async connect(): Promise<boolean> {
    try {
      this.transport = await TransportWebHID.create();
      this.eth = new Eth(this.transport);
      
      // 接続確認
      const address = await this.getAddress();
      console.log('Ledger connected:', address);
      return true;
    } catch (error) {
      console.error('Ledger connection failed:', error);
      return false;
    }
  }

  async getAddress(): Promise<string> {
    if (!this.eth) throw new Error('Ledger not connected');
    
    const result = await this.eth.getAddress("44'/60'/0'/0/0");
    return result.address;
  }

  async signDeployment(deploymentData: any): Promise<string> {
    if (!this.eth) throw new Error('Ledger not connected');

    // EIP-191フォーマットメッセージ作成
    const message = this.formatEIP191Message('DEPLOY_YEARLY_SET', deploymentData);
    
    // メッセージハッシュ計算
    const messageHash = ethers.hashMessage(message);
    
    // Ledger署名
    const signature = await this.eth.signPersonalMessage(
      "44'/60'/0'/0/0",
      Buffer.from(messageHash.slice(2), 'hex')
    );

    return this.formatSignature(signature);
  }

  async signRootUpdate(year: number, merkleRoot: string): Promise<string> {
    if (!this.eth) throw new Error('Ledger not connected');

    const updateData = {
      year,
      merkleRoot,
      timestamp: Date.now()
    };

    const message = this.formatEIP191Message('UPDATE_MERKLE_ROOT', updateData);
    const messageHash = ethers.hashMessage(message);
    
    const signature = await this.eth.signPersonalMessage(
      "44'/60'/0'/0/0",
      Buffer.from(messageHash.slice(2), 'hex')
    );

    return this.formatSignature(signature);
  }

  private formatEIP191Message(operation: string, data: any): string {
    return `Executive Console Operation
Operation: ${operation}
Chain ID: ${this.CHAIN_ID}
Contract: ${this.CONTRACT_ADDRESS}
Data: ${JSON.stringify(data, null, 2)}
Timestamp: ${new Date().toISOString()}

WARNING: Only sign if you trust this operation!`;
  }

  private formatSignature(signature: any): string {
    return ethers.Signature.from({
      r: '0x' + signature.r,
      s: '0x' + signature.s,
      v: signature.v
    }).serialized;
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
      this.eth = null;
    }
  }
}
```

## 4. 回路ハッシュ検証（SHA3-512）

### 4.1 回路検証サービス
```typescript
// services/CircuitValidator.ts
import fs from 'fs/promises';
import { createHash } from 'crypto';
import { poseidon } from 'circomlibjs';

export class CircuitValidator {
  async validateCircuitFile(circuitPath: string): Promise<boolean> {
    try {
      const circuitContent = await fs.readFile(circuitPath, 'utf-8');
      
      // 1. SHA3-512ハッシュ計算
      const hash = createHash('sha3-512').update(circuitContent).digest('hex');
      console.log('Circuit hash:', '0x' + hash);
      
      // 2. Poseidon パラメータ検証
      const isPoseidonValid = this.validatePoseidonParameters(circuitContent);
      
      // 3. 回路構造検証
      const isStructureValid = this.validateCircuitStructure(circuitContent);
      
      return isPoseidonValid && isStructureValid;
    } catch (error) {
      console.error('Circuit validation failed:', error);
      return false;
    }
  }

  private validatePoseidonParameters(circuitContent: string): boolean {
    // IACR 2019/458 推奨値検証
    const requiredPatterns = [
      /include\s+"circomlib\/circuits\/poseidon\.circom"/,
      /component\s+poseidon\s*=\s*Poseidon\(2\)/,
      /component\s+merkleProof\s*=\s*MerkleTreeChecker\(8\)/
    ];

    return requiredPatterns.every(pattern => pattern.test(circuitContent));
  }

  private validateCircuitStructure(circuitContent: string): boolean {
    // 必要なシグナル・コンポーネントの存在確認
    const requiredElements = [
      'signal input publicKey[2]',
      'signal input merkleProof[8]',
      'signal input merkleRoot',
      'signal output commitment',
      'component poseidon',
      'component merkleChecker'
    ];

    return requiredElements.every(element => 
      circuitContent.includes(element.replace(/\s+/g, '\\s*'))
    );
  }

  async generateVKHash(vkPath: string): Promise<string> {
    const vkContent = await fs.readFile(vkPath);
    const hash = createHash('sha3-512').update(vkContent).digest('hex');
    return '0x' + hash;
  }
}
```

## 5. スマートコントラクト ABI

### 5.1 YearlyDeploymentManager ABI
```typescript
// contracts/YearlyDeploymentManager.abi.ts
export const YEARLY_DEPLOYMENT_MANAGER_ABI = [
  {
    "type": "function",
    "name": "createYearlySet",
    "inputs": [
      {"name": "year", "type": "uint256"},
      {"name": "vkHash", "type": "bytes32"},
      {"name": "merkleRoot", "type": "bytes32"},
      {"name": "circuitHash", "type": "bytes32"},
      {"name": "nftName", "type": "string"},
      {"name": "nftSymbol", "type": "string"}
    ],
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "updateMerkleRoot",
    "inputs": [
      {"name": "year", "type": "uint256"},
      {"name": "newRoot", "type": "bytes32"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getYearlySet",
    "inputs": [{"name": "year", "type": "uint256"}],
    "outputs": [{
      "type": "tuple",
      "components": [
        {"name": "year", "type": "uint256"},
        {"name": "nftContract", "type": "address"},
        {"name": "vkHash", "type": "bytes32"},
        {"name": "merkleRoot", "type": "bytes32"},
        {"name": "circuitHash", "type": "bytes32"},
        {"name": "deployedAt", "type": "uint256"}
      ]
    }],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "YearlySetCreated",
    "inputs": [
      {"name": "year", "type": "uint256", "indexed": true},
      {"name": "nftContract", "type": "address", "indexed": false},
      {"name": "vkHash", "type": "bytes32", "indexed": false},
      {"name": "circuitHash", "type": "bytes32", "indexed": false}
    ]
  }
] as const;
```

## 6. セキュリティ対策

### 6.1 署名検証・リプレイ防止
```typescript
// utils/SecurityUtils.ts
export class SecurityUtils {
  static validateEIP191Message(message: string, signature: string, expectedSigner: string): boolean {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
    } catch (error) {
      return false;
    }
  }

  static formatSecureMessage(operation: string, data: any, chainId: number, contractAddress: string): string {
    const nonce = Date.now();
    return `${operation}
Chain ID: ${chainId}
Contract: ${contractAddress}
Nonce: ${nonce}
Data: ${JSON.stringify(data, (key, value) => 
  typeof value === 'bigint' ? value.toString() : value
)}`;
  }

  static validateChainId(expectedChainId: number): boolean {
    // 実装: 現在のチェーンIDを確認
    return true; // 簡略化
  }

  static checkGasBalance(address: string): Promise<boolean> {
    // 実装: ガス残高確認
    return Promise.resolve(true); // 簡略化
  }
}
```

## 7. React フロントエンド

### 7.1 年度セット管理コンポーネント
```tsx
// components/YearlySetManager.tsx
import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Alert, Modal, Form, Input } from 'antd';
import { YearlySetManager } from '../services/YearlySetManager';
import { LedgerService } from '../services/LedgerService';

interface YearlySet {
  year: number;
  status: 'draft' | 'active' | 'deprecated';
  vkHash: string;
  nftContract: string;
  deployedAt: string;
}

export const YearlySetManagerComponent: React.FC = () => {
  const [yearlySets, setYearlySets] = useState<YearlySet[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [ledgerConnected, setLedgerConnected] = useState(false);

  const yearlySetManager = new YearlySetManager();
  const ledgerService = new LedgerService();

  useEffect(() => {
    loadYearlySets();
    checkLedgerConnection();
  }, []);

  const loadYearlySets = async () => {
    try {
      const sets = await yearlySetManager.loadYearlySets();
      setYearlySets(Object.values(sets));
    } catch (error) {
      console.error('Failed to load yearly sets:', error);
    }
  };

  const checkLedgerConnection = async () => {
    const connected = await ledgerService.connect();
    setLedgerConnected(connected);
  };

  const handleCreateYearlySet = async (values: { year: number; circuitPath: string }) => {
    if (!ledgerConnected) {
      Alert.error('Ledger not connected');
      return;
    }

    setLoading(true);
    try {
      const yearlySet = await yearlySetManager.createYearlySet(values.year, values.circuitPath);
      await loadYearlySets();
      setCreateModalVisible(false);
      Alert.success(`Yearly set for ${values.year} created successfully`);
    } catch (error) {
      Alert.error('Failed to create yearly set');
    } finally {
      setLoading(false);
    }
  };

  const handleDeployYearlySet = async (year: number) => {
    if (!ledgerConnected) {
      Alert.error('Ledger not connected');
      return;
    }

    setLoading(true);
    try {
      const txHash = await yearlySetManager.deployYearlySet(year, ledgerService);
      await loadYearlySets();
      Alert.success(`Yearly set deployed. Transaction: ${txHash}`);
    } catch (error) {
      Alert.error('Failed to deploy yearly set');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Year', dataIndex: 'year', key: 'year' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    { title: 'VK Hash', dataIndex: 'vkHash', key: 'vkHash', ellipsis: true },
    { title: 'NFT Contract', dataIndex: 'nftContract', key: 'nftContract', ellipsis: true },
    {
      title: 'Actions',
      key: 'actions',
      render: (text: any, record: YearlySet) => (
        <>
          {record.status === 'draft' && (
            <Button 
              type="primary" 
              onClick={() => handleDeployYearlySet(record.year)}
              loading={loading}
            >
              Deploy
            </Button>
          )}
        </>
      )
    }
  ];

  return (
    <div>
      <Card 
        title="Yearly Set Management" 
        extra={
          <Button 
            type="primary" 
            onClick={() => setCreateModalVisible(true)}
            disabled={!ledgerConnected}
          >
            Create New Set
          </Button>
        }
      >
        {!ledgerConnected && (
          <Alert 
            message="Ledger not connected" 
            type="warning" 
            showIcon 
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Table 
          dataSource={yearlySets} 
          columns={columns} 
          rowKey="year"
          loading={loading}
        />
      </Card>

      <Modal
        title="Create New Yearly Set"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
      >
        <Form onFinish={handleCreateYearlySet}>
          <Form.Item name="year" label="Year" rules={[{ required: true }]}>
            <Input type="number" placeholder="2025" />
          </Form.Item>
          <Form.Item name="circuitPath" label="Circuit Path" rules={[{ required: true }]}>
            <Input placeholder="./circuits/Certificate2025.circom" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Create
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
```

## 8. ビルド・配布

### 8.1 Tauri Builder 設定
```json
{
  "main": "dist/main.js",
  "scripts": {
    "dev": "tauri dev",
    "build": "npm run build:react && npm run build:tauri",
    "build:react": "vite build",
    "build:tauri": "tauri build"
  },
  "build": {
    "appId": "edu.university.executive-console",
    "productName": "Executive Console",
    "directories": { "output": "release" },
    "files": [
      "dist/**/*",
      "config/**/*",
      "circuits/**/*",
      "keys/**/*"
    ],
    "extraResources": [
      { "from": "circuits/", "to": "circuits/" },
      { "from": "keys/", "to": "keys/" }
    ]
  }
}
```

## 9. CI/CD パイプライン

### 9.1 GitHub Actions
```yaml
name: Build Executive Console

on:
  push: { branches: [main] }
  
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm test
      - run: npm run lint
      
  build:
    needs: test
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run build
      - run: npm run dist
      - uses: actions/upload-artifact@v4
        with:
          name: executive-console-${{ matrix.os }}
          path: release/
```

## 10. 運用・監視

### 10.1 ガス残高監視
```typescript
// utils/GasMonitor.ts
export class GasMonitor {
  private readonly provider = new ethers.JsonRpcProvider('https://polygon-zkevm.drpc.org');
  private readonly alertThreshold = ethers.parseEther('0.1'); // 0.1 ETH

  async checkBalance(address: string): Promise<boolean> {
    try {
      const balance = await this.provider.getBalance(address);
      return balance >= this.alertThreshold;
    } catch (error) {
      console.error('Gas balance check failed:', error);
      return false;
    }
  }

  async setupAlerts(address: string, intervalMs: number = 300000): Promise<void> {
    setInterval(async () => {
      const sufficient = await this.checkBalance(address);
      if (!sufficient) {
        this.sendAlert(address);
      }
    }, intervalMs);
  }

  private sendAlert(address: string): void {
    console.warn(`⚠️ Low gas balance for ${address}`);
    // 実装: Slack/Discord通知等
  }
}
```
