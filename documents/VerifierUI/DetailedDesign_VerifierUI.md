# 検証者システム 詳細設計書（Next.js 15 + App Router・静的サイト版）

## バージョン情報
- **Version**: 2.1
- **Last Updated**: 2025-01-20
- **Target**: プロトタイプ 2025年10月

## 1. アーキテクチャ概要

### 1.1 完全静的サイト設計
```
┌─────────────────────────────────────┐
│ 静的サイト（検証者システム）          │
├─────────────────────────────────────┤
│ • PDF/A-3解析（ブラウザー内）         │
│ • ZKP検証（Circom/SnarkJS）          │
│ • ブロックチェーン検証（Web3）         │
│ • Merkle Tree検証                   │
│ • 結果表示・レポート生成              │
└─────────────────────────────────────┘
         ↓ 直接接続
┌─────────────────────────────────────┐
│ 外部API（読み取り専用・最小限）       │
├─────────────────────────────────────┤
│ • Polygon zkEVM RPC                 │
│ • ブロックエクスプローラーAPI         │
│ • GitHub Pages（回路ファイル配信）    │
└─────────────────────────────────────┘
         ↓ 出力
┌─────────────────────────────────────┐
│ 検証結果                            │
├─────────────────────────────────────┤
│ • PDF検証レポート                    │
│ • ZKP検証結果                       │
│ • ブロックチェーン確認                │
│ • 信頼度スコア                       │
│ • 検証証明書（JSON）                 │
└─────────────────────────────────────┘

特徴:
✅ サーバー不要
✅ API不要
✅ 静的ホスティング
✅ CDN配信可能
✅ 完全パブリック
✅ 高速・安全
```

---

## 2. 静的サイト設計（Next.js 15 + App Router + TypeScript）

### 2.1 アプリケーション構成
```
verifier-ui-app/
├── next.config.js          # Next.js設定（SSG）
├── package.json            # 依存関係
├── app/                    # App Router
│   ├── layout.tsx          # ルートレイアウト
│   ├── page.tsx            # ホームページ
│   ├── verify/
│   │   ├── page.tsx        # 検証ページ
│   │   └── loading.tsx     # ローディング
│   ├── report/
│   │   └── [id]/
│   │       └── page.tsx    # 検証結果ページ
│   └── globals.css         # グローバルスタイル
├── components/             # Reactコンポーネント
├── lib/                    # ライブラリ・サービス
├── hooks/                  # カスタムフック
├── types/                  # TypeScript型定義
├── public/
│   ├── circuits/           # ZKP検証回路（WASM）
│   │   ├── Document2025.wasm
│   │   └── verification_key.json
│   ├── workers/            # Web Worker
│   │   └── verification-worker.js
│   └── icons/              # アイコン・画像
├── out/                    # 静的ビルド出力
└── README.md               # 使用方法
```

### 2.2 メイン検証ページ
```typescript
// app/verify/page.tsx
'use client';

import React, { useState, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Button,
  LinearProgress
} from '@mui/material';
import { FileUploadZone } from '@/components/FileUploadZone';
import { VerificationProgress } from '@/components/VerificationProgress';
import { VerificationResult } from '@/components/VerificationResult';
import { useVerification } from '@/hooks/useVerification';

const verificationSteps = [
  'PDF解析',
  'ZKP検証',
  'ブロックチェーン検証',
  '結果生成'
];

export default function VerifyPage() {
  const [file, setFile] = useState<File | null>(null);
  const {
    currentStep,
    isVerifying,
    verificationResult,
    error,
    progress,
    startVerification,
    resetVerification
  } = useVerification();

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    resetVerification();
  }, [resetVerification]);

  const handleStartVerification = useCallback(async () => {
    if (file) {
      await startVerification(file);
    }
  }, [file, startVerification]);

  const renderContent = () => {
    if (!file) {
      return (
        <FileUploadZone
          onFileSelect={handleFileSelect}
          acceptedTypes=".pdf"
          maxSize={50 * 1024 * 1024} // 50MB
        />
      );
    }

    if (isVerifying) {
      return (
        <VerificationProgress
          currentStep={currentStep}
          steps={verificationSteps}
          progress={progress}
        />
      );
    }

    if (verificationResult) {
      return (
        <VerificationResult
          result={verificationResult}
          onReset={() => {
            setFile(null);
            resetVerification();
          }}
        />
      );
    }

    return (
      <Box>
        <Alert severity="info" sx={{ mb: 3 }}>
          ファイル「{file.name}」を検証します。
          この処理には数秒かかる場合があります。
        </Alert>
        
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={handleStartVerification}
          disabled={isVerifying}
        >
          検証を開始
        </Button>
      </Box>
    );
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Document Verifier
        </Typography>
        
        <Typography 
          variant="subtitle1" 
          align="center" 
          color="text.secondary" 
          sx={{ mb: 4 }}
        >
          ゼロ知識証明付き文書の真正性を検証します
        </Typography>

        {file && (
          <Stepper activeStep={currentStep} sx={{ mb: 4 }}>
            {verificationSteps.map((label, index) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ minHeight: 400 }}>
          {renderContent()}
        </Box>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            このシステムは完全にブラウザー内で動作し、
            アップロードされたファイルは外部に送信されません。
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
```

### 2.3 検証サービス
```typescript
// src/services/VerificationService.ts
import { PDFDocument } from 'pdf-lib';
import { ethers } from 'ethers';

export interface VerificationResult {
  isValid: boolean;
  confidence: number; // 0-100
  checks: {
    pdfIntegrity: boolean;
    zkpProof: boolean;
    publicKey: boolean;
    blockchain: boolean;
    merkleTree: boolean;
    timestamp: boolean;
  };
  metadata: {
    ownerName?: string;
    documentYear?: number;
    documentType?: string;
    institution?: string;
    issueDate?: string;
    verificationDate: string;
  };
  details: {
    zkProof?: any;
    publicKey?: { x: string; y: string };
    nftContract?: string;
    blockNumber?: number;
    transactionHash?: string;
  };
  warnings: string[];
  errors: string[];
}

export class VerificationService {
  private worker: Worker | null = null;
  private web3Provider: ethers.Provider;

  constructor() {
    this.initializeWorker();
    this.web3Provider = new ethers.JsonRpcProvider('https://zkevm-rpc.com');
  }

  private initializeWorker() {
    this.worker = new Worker('/workers/verification-worker.js');
  }

  async verifyDocument(
    pdfFile: File,
    onProgress?: (step: number, message: string) => void
  ): Promise<VerificationResult> {
    const result: VerificationResult = {
      isValid: false,
      confidence: 0,
      checks: {
        pdfIntegrity: false,
        zkpProof: false,
        publicKey: false,
        blockchain: false,
        merkleTree: false,
        timestamp: false
      },
      metadata: {
        verificationDate: new Date().toISOString()
      },
      details: {},
      warnings: [],
      errors: []
    };

    try {
      // ステップ1: PDF解析
      onProgress?.(0, 'PDF解析中...');
      const pdfData = await this.extractPDFData(pdfFile);
      result.checks.pdfIntegrity = true;
      result.metadata = { ...result.metadata, ...pdfData.metadata };
      result.details = { ...result.details, ...pdfData.details };

      // ステップ2: ZKP検証
      onProgress?.(1, 'ゼロ知識証明を検証中...');
      if (pdfData.zkProof) {
        result.checks.zkpProof = await this.verifyZKProof(pdfData.zkProof);
      } else {
        result.errors.push('ZKP証明データが見つかりません');
      }

      // ステップ3: ブロックチェーン検証
      onProgress?.(2, 'ブロックチェーンで確認中...');
      if (pdfData.publicKey && result.metadata.documentYear) {
        const blockchainResult = await this.verifyOnBlockchain(
          pdfData.publicKey,
          result.metadata.documentYear
        );
        result.checks.blockchain = blockchainResult.isValid;
        result.details = { ...result.details, ...blockchainResult.details };
      }

      // ステップ4: 総合評価
      onProgress?.(3, '結果を生成中...');
      result.confidence = this.calculateConfidence(result.checks);
      result.isValid = result.confidence >= 80;

      // タイムスタンプ検証
      result.checks.timestamp = this.verifyTimestamp(result.metadata);

    } catch (error) {
      result.errors.push(`検証エラー: ${error.message}`);
    }

    return result;
  }

  private async extractPDFData(file: File): Promise<{
    metadata: any;
    details: any;
    zkProof?: any;
    publicKey?: { x: string; y: string };
  }> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const infoDict = pdfDoc.getInfoDict();

    const getInfoValue = (key: string): string | null => {
      const value = infoDict.get(key);
      return value?.toString() || null;
    };

    const zkProofStr = getInfoValue('ZKProof');
    const zkPublicInputsStr = getInfoValue('ZKPublicInputs');
    const publicKeyX = getInfoValue('PublicKeyX');
    const publicKeyY = getInfoValue('PublicKeyY');

    return {
      metadata: {
        ownerName: getInfoValue('OwnerName'),
        documentYear: parseInt(getInfoValue('DocumentYear') || '0'),
        documentType: getInfoValue('DocumentType'),
        issueDate: getInfoValue('ZKDocTimestamp')
      },
      details: {
        zkProof: zkProofStr && zkPublicInputsStr ? {
          proof: zkProofStr,
          publicInputs: JSON.parse(zkPublicInputsStr)
        } : null,
        publicKey: publicKeyX && publicKeyY ? {
          x: publicKeyX,
          y: publicKeyY
        } : null
      },
      zkProof: zkProofStr && zkPublicInputsStr ? {
        proof: zkProofStr,
        publicInputs: JSON.parse(zkPublicInputsStr)
      } : null,
      publicKey: publicKeyX && publicKeyY ? {
        x: publicKeyX,
        y: publicKeyY
      } : null
    };
  }

  private async verifyZKProof(zkProof: { proof: string; publicInputs: string[] }): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error('ZKP verification timeout'));
      }, 15000);

      this.worker.onmessage = (event) => {
        clearTimeout(timeoutId);
        
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.result);
        }
      };

      this.worker.postMessage({
        type: 'VERIFY_PROOF',
        proof: zkProof
      });
    });
  }

  private async verifyOnBlockchain(
    publicKey: { x: string; y: string },
    documentYear: number
  ): Promise<{ isValid: boolean; details: any }> {
    try {
      // 年度別NFTコントラクトのアドレスを取得（ハードコード化されたアドレス）
      const deploymentManagerAddress = await this.getDeploymentManagerAddress();
      const deploymentManager = new ethers.Contract(
        deploymentManagerAddress,
        [
          'function getYearlySet(uint256 year) view returns (tuple(uint256 year, address nftContract, bytes32 vkHash, bytes32 merkleRoot, bytes32 circuitHash, string documentType, uint256 deployedAt))'
        ],
        this.web3Provider
      );

      const yearlySet = await deploymentManager.getYearlySet(documentYear);
      
      if (yearlySet.nftContract === ethers.ZeroAddress) {
        return {
          isValid: false,
          details: { error: `${documentYear}年度のNFTコントラクトが見つかりません` }
        };
      }

      // NFTコントラクトで公開鍵を確認
      const nftContract = new ethers.Contract(
        yearlySet.nftContract,
        [
          'function hasClaimed(address user) view returns (bool)',
          'function ISSUE_YEAR() view returns (uint256)',
          'function VK_HASH() view returns (bytes32)',
          'function DOCUMENT_TYPE() view returns (string)'
        ],
        this.web3Provider
      );

      // 公開鍵からアドレスを計算
      const address = this.publicKeyToAddress(publicKey);
      const hasClaimed = await nftContract.hasClaimed(address);
      const contractYear = await nftContract.ISSUE_YEAR();
      const vkHash = await nftContract.VK_HASH();
      const documentType = await nftContract.DOCUMENT_TYPE();

      return {
        isValid: hasClaimed && contractYear.toString() === documentYear.toString(),
        details: {
          nftContract: yearlySet.nftContract,
          hasClaimed,
          contractYear: contractYear.toString(),
          vkHash,
          documentType,
          ownerAddress: address
        }
      };

    } catch (error) {
      return {
        isValid: false,
        details: { error: error.message }
      };
    }
  }

  private publicKeyToAddress(publicKey: { x: string; y: string }): string {
    // secp256r1公開鍵からEthereumアドレスを計算
    // 実際の実装では適切なライブラリを使用
    const combined = publicKey.x + publicKey.y.slice(2);
    const hash = ethers.keccak256('0x' + combined);
    return ethers.getAddress('0x' + hash.slice(-40));
  }

  private calculateConfidence(checks: any): number {
    const weights = {
      pdfIntegrity: 10,
      zkpProof: 40,
      publicKey: 20,
      blockchain: 25,
      merkleTree: 3,
      timestamp: 2
    };

    let score = 0;
    let totalWeight = 0;

    Object.entries(checks).forEach(([key, passed]) => {
      if (key in weights) {
        totalWeight += weights[key as keyof typeof weights];
        if (passed) {
          score += weights[key as keyof typeof weights];
        }
      }
    });

    return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
  }

  private verifyTimestamp(metadata: any): boolean {
    if (!metadata.issueDate) return false;
    
    const issueDate = new Date(metadata.issueDate);
    const now = new Date();
    
    // 未来の日付は無効
    if (issueDate > now) return false;
    
    // 10年以上前も警告
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    
    return issueDate > tenYearsAgo;
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// public/workers/verification-worker.js
importScripts('/circuits/snarkjs.min.js');

let vkBuffer = null;

async function loadVerificationKey() {
  if (!vkBuffer) {
    const response = await fetch('/circuits/verification_key.json');
    vkBuffer = await response.json();
  }
}

self.onmessage = async function(event) {
  const { type, proof } = event.data;

  try {
    if (type === 'VERIFY_PROOF') {
      await loadVerificationKey();

      const isValid = await snarkjs.groth16.verify(
        vkBuffer,
        proof.publicInputs,
        JSON.parse(proof.proof)
      );

      self.postMessage({
        result: isValid
      });
    }

  } catch (error) {
    self.postMessage({
      error: error.message
    });
  }
};
```

### 2.4 検証結果コンポーネント
```typescript
// src/components/VerificationResult.tsx
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Alert,
  Divider
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Warning,
  Download,
  Share,
  Refresh
} from '@mui/icons-material';
import { VerificationResult } from '../services/VerificationService';

interface VerificationResultProps {
  result: VerificationResult;
  onReset: () => void;
}

export const VerificationResult: React.FC<VerificationResultProps> = ({
  result,
  onReset
}) => {
  const getOverallStatus = () => {
    if (result.confidence >= 90) return { label: '信頼性: 高', color: 'success', icon: CheckCircle };
    if (result.confidence >= 70) return { label: '信頼性: 中', color: 'warning', icon: Warning };
    return { label: '信頼性: 低', color: 'error', icon: Cancel };
  };

  const status = getOverallStatus();

  const downloadReport = () => {
    const reportData = {
      ...result,
      verificationDate: new Date().toISOString(),
      verifierVersion: '1.0.0'
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      {/* 総合結果 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5">検証結果</Typography>
            <Chip
              icon={<status.icon />}
              label={status.label}
              color={status.color as any}
              size="large"
            />
          </Box>
          
          <Typography variant="h2" component="div" sx={{ mb: 1 }}>
            {result.confidence}%
          </Typography>
          
          <Typography variant="body1" color="text.secondary">
            信頼度スコア
          </Typography>

          {result.metadata.studentName && (
            <Box mt={2}>
              <Typography variant="subtitle1">
                学生名: {result.metadata.studentName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                卒業年度: {result.metadata.graduationYear}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 詳細チェック */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            詳細チェック結果
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                {result.checks.pdfIntegrity ? <CheckCircle color="success" /> : <Cancel color="error" />}
              </ListItemIcon>
              <ListItemText
                primary="PDF整合性"
                secondary="ファイルの破損・改ざんチェック"
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                {result.checks.zkpProof ? <CheckCircle color="success" /> : <Cancel color="error" />}
              </ListItemIcon>
              <ListItemText
                primary="ゼロ知識証明"
                secondary="ZKP証明の数学的検証"
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                {result.checks.blockchain ? <CheckCircle color="success" /> : <Cancel color="error" />}
              </ListItemIcon>
              <ListItemText
                primary="ブロックチェーン確認"
                secondary="NFT発行状況の確認"
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                {result.checks.timestamp ? <CheckCircle color="success" /> : <Warning color="warning" />}
              </ListItemIcon>
              <ListItemText
                primary="タイムスタンプ"
                secondary="発行日時の妥当性"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* 技術詳細 */}
      {result.details.nftContract && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              ブロックチェーン詳細
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  NFTコントラクト
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                  {result.details.nftContract}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  学生アドレス
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                  {result.details.studentAddress}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* 警告・エラー */}
      {result.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            警告:
          </Typography>
          {result.warnings.map((warning, index) => (
            <Typography key={index} variant="body2">
              • {warning}
            </Typography>
          ))}
        </Alert>
      )}

      {result.errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            エラー:
          </Typography>
          {result.errors.map((error, index) => (
            <Typography key={index} variant="body2">
              • {error}
            </Typography>
          ))}
        </Alert>
      )}

      {/* アクションボタン */}
      <Box display="flex" gap={2} justifyContent="center">
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={downloadReport}
        >
          レポートダウンロード
        </Button>
        
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={onReset}
        >
          新しい証明書を検証
        </Button>
      </Box>
    </Box>
  );
};
```

---

## 3. 配布・デプロイ

### 3.1 静的サイト生成
```bash
# Next.js SSG ビルド
npm run build
npm run export

# 出力
out/
├── index.html
├── verify.html
├── _next/
└── ...

# デプロイ先
- GitHub Pages
- Vercel
- Netlify  
- AWS S3 + CloudFront
  - GitHub Pages (静的ファイル配信)
```

### 3.2 利点（超シンプル版）
```
✅ 超シンプル
- サーバー不要
- API不要
- 静的ファイルのみ

✅ 高いパフォーマンス
- CDN配信
- キャッシュ効率
- 高速レスポンス

✅ 研究配布に最適
- URLのみで配布
- 世界中からアクセス
- 無制限同時接続

✅ セキュリティ
- 完全パブリック
- 検証可能性
- データ漏洩リスクなし
``` 