# 責任者システム 詳細設計書（Tauri v2・バックエンドレス版）

## バージョン情報
- **Version**: 2.1
- **Last Updated**: 2025-06-21
- **Target**: プロトタイプ 2025年10月

## 1. アーキテクチャ概要

### 1.1 完全バックエンドレス設計
```
┌─────────────────────────────────────┐
│ 責任者システム (Tauri v2 App)        │
├─────────────────────────────────────┤
│ • 年度別セット管理                    │
│ • ローカルファイルストレージ            │
│ • Web3プロバイダー（読み取り専用）      │
│ • 設定JSONファイル                    │
│ • 回路・キーファイル管理               │
└─────────────────────────────────────┘
         ↓ 読み取り専用接続
┌─────────────────────────────────────┐
│ Blockchain (Polygon zkEVM)          │
├─────────────────────────────────────┤
│ • YearlyDeploymentManager.sol       │
│ • DocumentNFT2025.sol               │
│ • DocumentNFT2026.sol               │
│ • ...                               │
└─────────────────────────────────────┘
         ↓ ローカル保存
┌─────────────────────────────────────┐
│ Local File System                   │
├─────────────────────────────────────┤
│ • circuits/Document2025.circom      │
│ • keys/Document2025.zkey            │
│ • keys/Document2025_vk.json         │
│ • exports/circuit_hashes.json       │
└─────────────────────────────────────┘

特徴:
✅ サーバー不要
✅ データベース不要
✅ API不要
✅ 設定ファイルのみ
✅ デスクトップアプリ配布
✅ Rust + WebViewで軽量・高速
```

---

## 2. スマートコントラクト設計（汎用文書対応版）

### 2.1 YearlyDeploymentManager.sol（文書対応版）
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./DocumentNFT.sol";

contract YearlyDeploymentManager is Ownable {
    struct YearlySet {
        uint256 year;
        address nftContract;
        bytes32 vkHash;
        bytes32 merkleRoot;
        bytes32 circuitHash;        // 完全ローカル化：IPFSハッシュ廃止
        string documentType;        // 文書タイプ（例：graduation, certificate, license）
        uint256 deployedAt;
    }
    
    mapping(uint256 => YearlySet) public yearlySets;
    mapping(string => mapping(uint256 => address)) public documentContracts; // documentType -> year -> contract
    uint256[] public deployedYears;
    
    event YearlySetCreated(
        uint256 indexed year,
        address nftContract,
        bytes32 vkHash,
        bytes32 circuitHash,
        string documentType
    );
    
      /**
   * @dev 新年度セットをワンクリックデプロイ
   */
  function createYearlySet(
      uint256 year,
      bytes32 vkHash,
      bytes32 merkleRoot,
      bytes32 circuitHash,
      string calldata documentType,
      string calldata nftName,
      string calldata nftSymbol
  ) external onlyOwner returns (address) {
      require(yearlySets[year].deployedAt == 0, "Year already exists");
      
      // NFTコントラクトをデプロイ
      DocumentNFT nft = new DocumentNFT(
          year,
          vkHash,
          merkleRoot,
          documentType,
          nftName,
          nftSymbol
      );
      
      // 情報を記録（完全ローカル化）
      yearlySets[year] = YearlySet({
          year: year,
          nftContract: address(nft),
          vkHash: vkHash,
          merkleRoot: merkleRoot,
          circuitHash: circuitHash,
          documentType: documentType,
          deployedAt: block.timestamp
      });
      
      documentContracts[documentType][year] = address(nft);
      deployedYears.push(year);
      
      emit YearlySetCreated(year, address(nft), vkHash, circuitHash, documentType);
      return address(nft);
  }
    
    /**
     * @dev 年度情報取得
     */
    function getYearlySet(uint256 year) external view returns (YearlySet memory) {
        return yearlySets[year];
    }
    
    /**
     * @dev 文書タイプ別コントラクト取得
     */
    function getDocumentContract(string calldata documentType, uint256 year) 
        external view returns (address) {
        return documentContracts[documentType][year];
    }
    
    /**
     * @dev 全年度取得
     */
    function getAllYears() external view returns (uint256[] memory) {
        return deployedYears;
    }
}
```

### 2.2 DocumentNFT.sol（汎用文書対応版）
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DocumentNFT is ERC721, Ownable {
    uint256 public immutable ISSUE_YEAR;
    bytes32 public immutable VK_HASH;
    string public immutable DOCUMENT_TYPE;
    bytes32 public merkleRoot;
    
    mapping(address => bool) public hasClaimed;
    uint256 private _tokenIdCounter;
    
    event DocumentNFTMinted(address indexed owner, uint256 tokenId, string documentType);
    
    constructor(
        uint256 _year,
        bytes32 _vkHash,
        bytes32 _merkleRoot,
        string memory _documentType,
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) {
        ISSUE_YEAR = _year;
        VK_HASH = _vkHash;
        DOCUMENT_TYPE = _documentType;
        merkleRoot = _merkleRoot;
    }
    
    /**
     * @dev 文書NFTをミント（ZKP + Merkle Tree検証）
     */
    function mintDocumentNFT(
        bytes calldata zkProof,
        uint256[] calldata publicInputs,
        bytes32[] calldata merkleProof
    ) external {
        require(!hasClaimed[msg.sender], "Already claimed");
        require(publicInputs[2] / 1000000 == ISSUE_YEAR, "Wrong year");
        
        // ZKP検証（簡略化 - 実際は詳細な検証）
        require(verifyZKProof(zkProof, publicInputs), "Invalid ZK proof");
        
        // Merkle Tree検証
        require(verifyMerkleProof(msg.sender, merkleProof), "Not eligible");
        
        hasClaimed[msg.sender] = true;
        uint256 tokenId = _tokenIdCounter++;
        
        _safeMint(msg.sender, tokenId);
        emit DocumentNFTMinted(msg.sender, tokenId, DOCUMENT_TYPE);
    }
    
    function verifyZKProof(bytes calldata, uint256[] calldata) internal view returns (bool) {
        // 実装は証明者システムで検証済みの証明を信頼
        return true; // 簡略化
    }
    
    function verifyMerkleProof(address user, bytes32[] calldata proof) internal view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(user));
        bytes32 computedHash = leaf;
        
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            computedHash = computedHash <= proofElement 
                ? keccak256(abi.encodePacked(computedHash, proofElement))
                : keccak256(abi.encodePacked(proofElement, computedHash));
        }
        
        return computedHash == merkleRoot;
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
}
```

---

## 3. デスクトップアプリ設計（Tauri v2 + React + TypeScript）

### 3.1 アプリケーション構成
```
executive-console-app/
├── src-tauri/              # Tauriバックエンド（Rust）
│   ├── src/
│   │   ├── main.rs         # Tauriメインプロセス
│   │   ├── commands.rs     # ファイル操作コマンド
│   │   └── lib.rs          # ライブラリ
│   ├── Cargo.toml          # Rust依存関係
│   └── tauri.conf.json     # Tauri設定
├── src/                    # Reactフロントエンド
│   ├── main.tsx            # React エントリーポイント
│   ├── App.tsx             # メインアプリ
│   ├── components/         # Reactコンポーネント
│   ├── services/           # Web3・ローカルファイル操作
│   ├── hooks/              # カスタムフック
│   └── utils/              # ユーティリティ
├── package.json            # Node.js依存関係
├── vite.config.ts          # Vite設定
├── config/
│   └── app-config.json     # アプリ設定（DB代替）
├── circuits/               # 回路ファイル保存
├── keys/                   # キーファイル保存
└── dist/                   # ビルド済みファイル
```

### 3.2 設定ファイル（DB代替）
```json
// config/app-config.json
{
  "version": "1.0.0",
  "network": {
    "chainId": 1101,
    "rpcUrl": "https://zkevm-rpc.com",
    "deploymentManagerAddress": "0x..."
  },
  "storage": {
    "circuitsDir": "./circuits",
    "keysDir": "./keys",
    "exportsDir": "./exports"
  },
  "deployedYears": [
    {
      "year": 2025,
      "nftContract": "0x...",
      "vkHash": "0x...",
      "circuitHash": "0x...",
      "localCircuitPath": "./circuits/Document2025.circom",
      "localVKPath": "./keys/Document2025_vk.json",
      "localZkeyPath": "./keys/Document2025.zkey",
      "merkleRoot": "0x...",
      "deployedAt": 1640995200
    }
  ],
  "userSettings": {
    "privateKey": "encrypted_key_here",
    "autoSave": true,
    "theme": "dark"
  }
}
```

### 3.3 メインアプリケーション
```typescript
// src/App.tsx
import React, { useState, useEffect } from 'react';
import { 
  ThemeProvider, 
  CssBaseline, 
  Container, 
  AppBar, 
  Toolbar, 
  Typography,
  Tab,
  Tabs,
  Box
} from '@mui/material';
import { YearlySetManager } from './components/YearlySetManager';
import { SystemStatus } from './components/SystemStatus';
import { Settings } from './components/Settings';
import { ConfigService } from './services/ConfigService';
import { Web3Service } from './services/Web3Service';

interface AppConfig {
  network: any;
  deployedYears: any[];
  userSettings: any;
}

const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [web3Service, setWeb3Service] = useState<Web3Service | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const configService = new ConfigService();
      const appConfig = await configService.loadConfig();
      setConfig(appConfig);
      
      // Web3サービス初期化
      const web3 = new Web3Service(appConfig.network);
      setWeb3Service(web3);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const saveConfig = async (newConfig: AppConfig) => {
    const configService = new ConfigService();
    await configService.saveConfig(newConfig);
    setConfig(newConfig);
  };

  if (!config || !web3Service) {
    return <div>Loading...</div>;
  }

  return (
    <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
      <CssBaseline />
      <Container maxWidth="lg">
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              責任者システム - 年次セット管理
            </Typography>
          </Toolbar>
        </AppBar>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
          <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
            <Tab label="年次セット管理" />
            <Tab label="システム状態" />
            <Tab label="設定" />
          </Tabs>
        </Box>

        <Box sx={{ mt: 3 }}>
          {activeTab === 0 && (
            <YearlySetManager 
              config={config}
              web3Service={web3Service}
              onConfigUpdate={saveConfig}
            />
          )}
          {activeTab === 1 && (
            <SystemStatus 
              config={config}
              web3Service={web3Service}
            />
          )}
          {activeTab === 2 && (
            <Settings 
              config={config}
              onConfigUpdate={saveConfig}
            />
          )}
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default App;
```

### 3.4 年次セット管理コンポーネント
```typescript
// src/components/YearlySetManager.tsx
import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Grid,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton
} from '@mui/material';
import { Add, Launch, Folder } from '@mui/icons-material';
import { CreateYearlySetDialog } from './CreateYearlySetDialog';
import { Web3Service } from '../services/Web3Service';

interface YearlySetManagerProps {
  config: any;
  web3Service: Web3Service;
  onConfigUpdate: (config: any) => void;
}

export const YearlySetManager: React.FC<YearlySetManagerProps> = ({
  config,
  web3Service,
  onConfigUpdate
}) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deployedYears] = useState(config.deployedYears || []);

  const handleCreateNewSet = async (yearData: {
    year: number;
    circuitFile: File;
    vkFile: File;
    studentListFile: File;
    nftName: string;
    nftSymbol: string;
  }) => {
    try {
      // 1. ローカルにファイル保存
      await saveFilesLocally(yearData);
      
      // 2. 回路ファイルハッシュ計算（IPFS不要）
      const circuitHash = await calculateFileHash(yearData.circuitFile);
      
      // 3. VKハッシュ計算
      const vkHash = await calculateVKHash(yearData.vkFile);
      
      // 4. Merkle Tree構築
      const merkleRoot = await buildMerkleTree(yearData.studentListFile);
      
      // 5. ブロックチェーンデプロイ（ローカルファイル参照）
      const nftAddress = await web3Service.createYearlySet(
        yearData.year,
        vkHash,
        merkleRoot,
        circuitHash,
        yearData.nftName,
        yearData.nftSymbol
      );
      
      // 6. 設定ファイル更新（完全ローカル）
      const newYearData = {
        year: yearData.year,
        nftContract: nftAddress,
        vkHash,
        circuitHash,
        localCircuitPath: `./circuits/Document${yearData.year}.circom`,
        localVKPath: `./keys/Document${yearData.year}_vk.json`,
        localZkeyPath: `./keys/Document${yearData.year}.zkey`,
        merkleRoot,
        deployedAt: Date.now()
      };
      
      const updatedConfig = {
        ...config,
        deployedYears: [...config.deployedYears, newYearData]
      };
      
      onConfigUpdate(updatedConfig);
      setCreateDialogOpen(false);
      
    } catch (error) {
      console.error('Failed to create yearly set:', error);
    }
  };

  const openCircuitFolder = (year: number) => {
    // Tauriのシェル機能でフォルダを開く
    window.__TAURI__.shell.open(`./circuits/`);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">年次セット管理</Typography>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          新年度セット作成
        </Button>
      </Box>

      <Grid container spacing={3}>
        {deployedYears.map((yearSet: any) => (
          <Grid item xs={12} md={6} key={yearSet.year}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">{yearSet.year}年度</Typography>
                  <Chip label="デプロイ済み" color="success" size="small" />
                </Box>
                
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="NFTコントラクト"
                      secondary={
                        <code style={{ fontSize: '0.8em' }}>
                          {yearSet.nftContract}
                        </code>
                      }
                    />
                    <IconButton 
                      size="small"
                      onClick={() => window.open(`https://zkevm.polygonscan.com/address/${yearSet.nftContract}`)}
                    >
                      <Launch />
                    </IconButton>
                  </ListItem>
                  
                                      <ListItem>
                    <ListItemText
                      primary="回路ファイル"
                      secondary={`Document${yearSet.year}.circom`}
                    />
                    <IconButton 
                      size="small"
                      onClick={() => openCircuitFolder(yearSet.year)}
                    >
                      <Folder />
                    </IconButton>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText
                      primary="回路ハッシュ"
                      secondary={
                        <code style={{ fontSize: '0.8em' }}>
                          {yearSet.circuitHash}
                        </code>
                      }
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <CreateYearlySetDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateNewSet}
      />
    </Box>
  );
};
```

### 3.5 サービスクラス（シンプル版）
```typescript
// src/services/ConfigService.ts
import fs from 'fs/promises';
import path from 'path';

export class ConfigService {
  private configPath = path.join(process.cwd(), 'config', 'app-config.json');

  async loadConfig(): Promise<any> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // デフォルト設定を返す
      return this.getDefaultConfig();
    }
  }

  async saveConfig(config: any): Promise<void> {
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
  }

  private getDefaultConfig() {
    return {
      version: "1.0.0",
      network: {
        chainId: 1101,
        rpcUrl: "https://zkevm-rpc.com"
      },
      deployedYears: [],
      userSettings: {
        theme: "dark",
        autoSave: true
      }
    };
  }
}

// src/services/LedgerWeb3Service.ts
import { ethers } from 'ethers';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import AppEth from '@ledgerhq/hw-app-eth';

export class LedgerWeb3Service {
  private provider: ethers.Provider;
  private ledgerApp: AppEth | null = null;
  private ledgerAddress: string = '';
  private deploymentManager: ethers.Contract;
  private usedNonces: Set<string> = new Set();

  constructor(networkConfig: any) {
    this.provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    this.deploymentManager = new ethers.Contract(
      networkConfig.deploymentManagerAddress,
      YearlyDeploymentManagerABI,
      this.provider // Providerのみ、署名はLedgerで
    );
  }

  async connectLedger(): Promise<string> {
    try {
      const transport = await TransportWebUSB.create();
      this.ledgerApp = new AppEth(transport);
      
      // アドレス取得（path: m/44'/60'/0'/0/0）
      const result = await this.ledgerApp.getAddress("44'/60'/0'/0/0");
      this.ledgerAddress = result.address;
      
      return this.ledgerAddress;
    } catch (error) {
      throw new Error(`Ledger接続失敗: ${error.message}`);
    }
  }

  async signEIP191Message(message: string): Promise<string> {
    if (!this.ledgerApp) {
      throw new Error('Ledger未接続');
    }

    try {
      // EIP-191 Personal Sign
      const result = await this.ledgerApp.signPersonalMessage(
        "44'/60'/0'/0/0",
        Buffer.from(message, 'utf8').toString('hex')
      );
      
      // 署名をethers形式に変換
      const signature = `0x${result.r}${result.s}${result.v.toString(16)}`;
      return signature;
    } catch (error) {
      throw new Error(`Ledger署名失敗: ${error.message}`);
    }
  }

  async createYearlySetWithLedger(
    year: number,
    vkHash: string,
    merkleRoot: string,
    circuitHash: string,
    nftName: string,
    nftSymbol: string
  ): Promise<string> {
    // 1. EIP-191署名による認証
    const authMessage = this.generateAuthMessage('deploy_yearly_set', {
      year,
      vkHash,
      merkleRoot,
      circuitHash,
      nftName,
      nftSymbol
    });
    
    console.log('🔐 Ledger Nano Xでの署名が必要です...');
    const signature = await this.signEIP191Message(authMessage);
    
    // 2. 署名検証
    const recovered = ethers.verifyMessage(authMessage, signature);
    if (recovered.toLowerCase() !== this.ledgerAddress.toLowerCase()) {
      throw new Error('署名検証失敗');
    }
    
    // 3. トランザクション作成
    const tx = await this.deploymentManager.createYearlySet.populateTransaction(
      year,
      vkHash,
      merkleRoot,
      circuitHash,
      nftName,
      nftSymbol
    );
    
    // 4. Ledgerでトランザクション署名
    console.log('📱 Ledger Nano Xでトランザクションを確認してください...');
    const signedTx = await this.signTransactionWithLedger(tx);
    
    // 5. トランザクション送信
    const receipt = await this.provider.broadcastTransaction(signedTx);
    await receipt.wait();
    
    const event = receipt.logs?.find((log: any) => 
      log.topics[0] === ethers.id('YearlySetCreated(uint256,address,bytes32,bytes32)')
    );
    
    return ethers.AbiCoder.defaultAbiCoder().decode(['address'], event?.data || '')[0];
  }

  private generateAuthMessage(operation: string, params: any): string {
    const timestamp = Date.now();
    const nonce = crypto.randomUUID();
    
    return `
🔐 zk-CertFramework Executive Console v1.0.0

⚠️  SECURITY WARNING ⚠️
Only sign if you initiated this action!

Operation: ${operation}
Year: ${params.year}
Circuit Hash: ${params.circuitHash}
VK Hash: ${params.vkHash}
Merkle Root: ${params.merkleRoot}
NFT Name: ${params.nftName}
NFT Symbol: ${params.nftSymbol}
Timestamp: ${new Date(timestamp).toISOString()}
Nonce: ${nonce}
Domain: zk-cert-framework.local

📱 Verify on Ledger screen:
- Operation matches your intention
- Year is correct: ${params.year}
- All parameters are expected

❌ NEVER sign if:
- You didn't initiate this action
- Parameters don't match
- Domain is not zk-cert-framework.local
`;
  }

  private async signTransactionWithLedger(tx: any): Promise<string> {
    if (!this.ledgerApp) {
      throw new Error('Ledger未接続');
    }

    // ガス設定
    tx.gasLimit = await this.provider.estimateGas(tx);
    tx.gasPrice = await this.provider.getGasPrice();
    tx.nonce = await this.provider.getTransactionCount(this.ledgerAddress);
    tx.chainId = (await this.provider.getNetwork()).chainId;

    // Ledgerで署名
    const serializedTx = ethers.Transaction.from(tx).unsignedSerialized;
    const result = await this.ledgerApp.signTransaction(
      "44'/60'/0'/0/0",
      serializedTx.slice(2) // 0x除去
    );

    // 署名をトランザクションに適用
    const signature = {
      r: '0x' + result.r,
      s: '0x' + result.s,
      v: parseInt(result.v, 16)
    };

    const signedTx = ethers.Transaction.from({
      ...tx,
      signature
    });

    return signedTx.serialized;
  }

  async verifyConnection(): Promise<boolean> {
    try {
      return this.ledgerApp !== null && this.ledgerAddress !== '';
    } catch {
      return false;
    }
  }
}
```

---

## 4. 配布・デプロイ

### 4.1 Tauriアプリビルド
```bash
# パッケージ化
npm run build
npm run tauri build

# 出力ファイル
dist/
├── ExecutiveConsole-1.0.0.exe     # Windows
├── ExecutiveConsole-1.0.0.dmg     # macOS  
└── ExecutiveConsole-1.0.0.AppImage # Linux
```

### 4.2 利点
```
✅ 超シンプル
- データベース不要
- サーバー不要
- 設定ファイルのみ

✅ 研究配布に最適
- 単一実行ファイル
- インストール簡単
- デモが簡単

✅ セキュリティ
- ローカル実行
- 秘密鍵ローカル保存
- 外部依存なし

✅ 開発効率
- 年度別完全独立
- キーローテ不要
- 複雑な状態管理なし