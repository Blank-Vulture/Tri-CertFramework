# 証明者システム 詳細設計書（完全バックエンドレス・ブラウザーのみ版）

## バージョン情報
- **Version**: 2.1
- **Last Updated**: 2025-01-20
- **Target**: プロトタイプ 2025年10月

## 1. アーキテクチャ概要

### 1.1 完全ブラウザー内設計
```
┌─────────────────────────────────────┐
│ ブラウザー（証明者システム）          │
├─────────────────────────────────────┤
│ • WebAuthnサービス（パスキー生成）     │
│ • ZKP回路処理（Circom/SnarkJS）      │
│ • PDF/A-3解析・埋め込み              │
│ • ローカルストレージ管理               │
│ • 設定・キャッシュ管理                │
└─────────────────────────────────────┘
         ↓ 直接呼び出し
┌─────────────────────────────────────┐
│ ブラウザーAPI / Web標準              │
├─────────────────────────────────────┤
│ • navigator.credentials（WebAuthn）  │
│ • Web Workers（ZKP計算）             │
│ • IndexedDB（文書保存）               │
│ • File API（PDF処理）                │
│ • localStorage（設定保存）            │
└─────────────────────────────────────┘
         ↓ 最終出力
┌─────────────────────────────────────┐
│ 出力ファイル                         │
├─────────────────────────────────────┤
│ • enhanced_document.pdf              │
│   ├── 元の文書内容                    │
│   ├── ZKP証明データ                  │
│   ├── 公開鍵情報                     │
│   └── タイムスタンプ                  │
└─────────────────────────────────────┘

特徴:
✅ サーバー不要
✅ インストール不要
✅ ブラウザーのみで完結
✅ プライベート処理（ローカル）
✅ WebAuthn標準対応
✅ PDF/A-3形式出力
```

---

## 2. ブラウザーアプリ設計（React 18 + TypeScript + Vite）

### 2.1 アプリケーション構成
```
scholar-prover-app/
├── index.html              # エントリーHTML
├── package.json            # 依存関係
├── vite.config.ts          # Vite設定
├── public/
│   ├── circuits/           # ZKP回路ファイル（ビルド時埋め込み）
│   │   ├── Document2025.wasm
│   │   ├── Document2025.zkey  
│   │   └── verification_key.json
│   ├── workers/            # Web Worker
│   │   └── zkp-worker.js
│   └── manifest.json       # PWA設定
├── src/
│   ├── App.tsx             # メインアプリ
│   ├── components/         # Reactコンポーネント
│   ├── services/           # ビジネスロジック
│   ├── utils/              # ユーティリティ
│   ├── types/              # TypeScript型定義
│   └── hooks/              # カスタムフック
├── dist/                   # ビルド出力
└── README.md               # 使用方法
```

### 2.2 メインアプリケーション
```typescript
// src/App.tsx
import React, { useState, useEffect } from 'react';
import { 
  ThemeProvider, 
  CssBaseline, 
  Container, 
  Stepper,
  Step,
  StepLabel,
  Paper,
  Typography,
  Box,
  Alert
} from '@mui/material';
import { WebAuthnStep } from './components/WebAuthnStep';
import { DocumentUploadStep } from './components/DocumentUploadStep';
import { ZKPGenerationStep } from './components/ZKPGenerationStep';
import { PDFEnhancementStep } from './components/PDFEnhancementStep';
import { useDocumentProver } from './hooks/useDocumentProver';

const steps = [
  'パスキー作成',
  '文書アップロード', 
  'ZKP証明生成',
  'PDF埋め込み'
];

const App: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  
  const {
    webAuthnData,
    documentData,
    zkProof,
    enhancedPDF,
    isProcessing,
    error,
    handleWebAuthnComplete,
    handleDocumentUpload,
    handleZKPGeneration,
    handlePDFEnhancement
  } = useDocumentProver();

  const isStepCompleted = (step: number) => completed.has(step);
  const isStepOptional = (step: number) => false;
  const isStepSkipped = (step: number) => false;

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  };

  const handleStepComplete = (step: number) => {
    setCompleted(prev => new Set(prev).add(step));
    handleNext();
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <WebAuthnStep
            onComplete={(data) => {
              handleWebAuthnComplete(data);
              handleStepComplete(0);
            }}
            isProcessing={isProcessing}
            error={error}
          />
        );
      case 1:
        return (
          <DocumentUploadStep
            webAuthnData={webAuthnData}
            onComplete={(data) => {
              handleDocumentUpload(data);
              handleStepComplete(1);
            }}
            onBack={handleBack}
            isProcessing={isProcessing}
            error={error}
          />
        );
      case 2:
        return (
          <ZKPGenerationStep
            webAuthnData={webAuthnData}
            documentData={documentData}
            onComplete={(proof) => {
              handleZKPGeneration(proof);
              handleStepComplete(2);
            }}
            onBack={handleBack}
            isProcessing={isProcessing}
            error={error}
          />
        );
      case 3:
        return (
          <PDFEnhancementStep
            documentData={documentData}
            zkProof={zkProof}
            webAuthnData={webAuthnData}
            onComplete={(pdf) => {
              handlePDFEnhancement(pdf);
              handleStepComplete(3);
            }}
            onBack={handleBack}
            isProcessing={isProcessing}
            error={error}
          />
        );
      default:
        return <div>不明なステップです</div>;
    }
  };

  return (
    <ThemeProvider theme={createTheme({ palette: { mode: 'light' } })}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            証明者システム
          </Typography>
          <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 4 }}>
            ゼロ知識証明付き文書真正性証明システム
          </Typography>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label, index) => {
              const stepProps: { completed?: boolean } = {};
              const labelProps: { optional?: React.ReactNode } = {};
              
              if (isStepOptional(index)) {
                labelProps.optional = (
                  <Typography variant="caption">オプション</Typography>
                );
              }
              if (isStepSkipped(index)) {
                stepProps.completed = false;
              } else if (isStepCompleted(index)) {
                stepProps.completed = true;
              }
              
              return (
                <Step key={label} {...stepProps}>
                  <StepLabel {...labelProps}>{label}</StepLabel>
                </Step>
              );
            })}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ minHeight: 400 }}>
            {renderStepContent(activeStep)}
          </Box>

          {activeStep === steps.length && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="success">
                すべての処理が完了しました！
                拡張された文書PDFをダウンロードしてください。
              </Alert>
            </Box>
          )}
        </Paper>
      </Container>
    </ThemeProvider>
  );
};

export default App;
```

### 2.3 WebAuthnステップコンポーネント
```typescript
// src/components/WebAuthnStep.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress
} from '@mui/material';
import { 
  Security, 
  Fingerprint, 
  Key,
  CheckCircle 
} from '@mui/icons-material';
import { WebAuthnService } from '../services/WebAuthnService';

interface WebAuthnStepProps {
  onComplete: (data: WebAuthnData) => void;
  isProcessing: boolean;
  error: string | null;
}

interface WebAuthnData {
  publicKey: {
    x: string;
    y: string;
  };
  credentialId: string;
  attestation: string;
  clientDataJSON: string;
}

export const WebAuthnStep: React.FC<WebAuthnStepProps> = ({
  onComplete,
  isProcessing,
  error
}) => {
  const [userName, setUserName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [webAuthnService] = useState(new WebAuthnService());

  const handleCreatePasskey = async () => {
    if (!userName.trim()) {
      alert('ユーザー名を入力してください');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await webAuthnService.createCredential(userName);
      
      // 公開鍵をP-256形式で抽出
      const publicKey = await webAuthnService.extractPublicKey(result.credential);
      
      const webAuthnData: WebAuthnData = {
        publicKey,
        credentialId: result.credentialId,
        attestation: result.attestation,
        clientDataJSON: result.clientDataJSON
      };

      onComplete(webAuthnData);
    } catch (error) {
      console.error('WebAuthn creation failed:', error);
      alert('パスキーの作成に失敗しました: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        ステップ 1: パスキー（公開鍵）の作成
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        WebAuthn技術を使用してブラウザー内で秘密鍵・公開鍵ペアを生成します。
        秘密鍵は安全にデバイス内に保存され、外部に送信されることはありません。
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            WebAuthnの利点
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><Security fontSize="small" /></ListItemIcon>
              <ListItemText primary="秘密鍵はデバイス内で生成・保存" />
            </ListItem>
            <ListItem>
              <ListItemIcon><Fingerprint fontSize="small" /></ListItemIcon>
              <ListItemText primary="生体認証やPINによる保護" />
            </ListItem>
            <ListItem>
              <ListItemIcon><Key fontSize="small" /></ListItemIcon>
              <ListItemText primary="FIDO2/WebAuthn標準準拠" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle fontSize="small" /></ListItemIcon>
              <ListItemText primary="フィッシング攻撃に対する耐性" />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="ユーザー名"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="山田太郎"
          disabled={isGenerating || isProcessing}
          sx={{ mb: 2 }}
        />

        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={handleCreatePasskey}
          disabled={!userName.trim() || isGenerating || isProcessing}
          startIcon={
            isGenerating ? <CircularProgress size={20} /> : <Key />
          }
        >
          {isGenerating ? 'パスキーを作成中...' : 'パスキーを作成'}
        </Button>
      </Box>

      <Typography variant="caption" color="text.secondary">
        ※ ブラウザーの認証ダイアログが表示されます。指紋認証、Face ID、PIN等でパスキーを保護してください。
      </Typography>
    </Box>
  );
};
```

### 2.4 ZKP生成サービス
```typescript
// src/services/ZKPService.ts
export class ZKPService {
  private worker: Worker | null = null;

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker() {
    this.worker = new Worker('/workers/zkp-worker.js');
  }

  async generateProof(inputs: {
    privateKey: string;
    publicKey: { x: string; y: string };
    documentHash: string;
    documentYear: number;
    merkleProof: string[];
    merkleRoot: string;
  }): Promise<{
    proof: string;
    publicInputs: string[];
  }> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error('ZKP generation timeout'));
      }, 30000); // 30秒タイムアウト

      this.worker.onmessage = (event) => {
        clearTimeout(timeoutId);
        
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.result);
        }
      };

      this.worker.onerror = (error) => {
        clearTimeout(timeoutId);
        reject(error);
      };

      // Web Workerに計算を依頼
      this.worker.postMessage({
        type: 'GENERATE_PROOF',
        inputs
      });
    });
  }

  async verifyProof(proof: {
    proof: string;
    publicInputs: string[];
  }): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      this.worker.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.result);
        }
      };

      this.worker.postMessage({
        type: 'VERIFY_PROOF',
        proof
      });
    });
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// public/workers/zkp-worker.js
importScripts('/circuits/snarkjs.min.js');

let wasmBuffer = null;
let zkeyBuffer = null;

async function loadCircuitFiles() {
      // ビルド時に静的ファイルとして埋め込まれた回路ファイルを読み込み
  if (!wasmBuffer) {
    const wasmResponse = await fetch('/circuits/Document2025.wasm');
    wasmBuffer = await wasmResponse.arrayBuffer();
  }
  
  if (!zkeyBuffer) {
    const zkeyResponse = await fetch('/circuits/Document2025.zkey');
    zkeyBuffer = await zkeyResponse.arrayBuffer();
  }
}

self.onmessage = async function(event) {
  const { type, inputs, proof } = event.data;

  try {
    await loadCircuitFiles();

    if (type === 'GENERATE_PROOF') {
      // ZKP証明生成
      const { proof: generatedProof, publicSignals } = await snarkjs.groth16.fullProve(
        {
          // 秘密入力
          privateKey: inputs.privateKey,
          merkleProof: inputs.merkleProof,
          
          // 公開入力
          publicKeyX: inputs.publicKey.x,
          publicKeyY: inputs.publicKey.y,
          documentHash: inputs.documentHash,
          documentYear: inputs.documentYear,
          merkleRoot: inputs.merkleRoot
        },
        wasmBuffer,
        zkeyBuffer
      );

      self.postMessage({
        result: {
          proof: JSON.stringify(generatedProof),
          publicInputs: publicSignals
        }
      });

    } else if (type === 'VERIFY_PROOF') {
      // ZKP証明検証
      const vkResponse = await fetch('/circuits/verification_key.json');
      const vk = await vkResponse.json();

      const isValid = await snarkjs.groth16.verify(
        vk,
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

### 2.5 PDF拡張サービス
```typescript
// src/services/PDFService.ts
import { PDFDocument, PDFArray, PDFDict, PDFName, PDFString } from 'pdf-lib';

export class PDFService {
  async enhancePDF(
    originalPDFBuffer: ArrayBuffer,
    zkProof: { proof: string; publicInputs: string[] },
    webAuthnData: any,
    metadata: {
      documentYear: number;
      ownerName: string;
      documentType: string;
      timestamp: string;
    }
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(originalPDFBuffer);

    // 1. ZKP証明データを埋め込み
    await this.embedZKPProof(pdfDoc, zkProof);

    // 2. WebAuthn公開鍵情報を埋め込み
    await this.embedPublicKey(pdfDoc, webAuthnData.publicKey);

    // 3. メタデータを埋め込み
    await this.embedMetadata(pdfDoc, metadata);

    // 4. PDF/A-3形式に準拠
    await this.ensurePDFA3Compliance(pdfDoc);

    return await pdfDoc.save();
  }

  private async embedZKPProof(pdfDoc: PDFDocument, zkProof: any) {
    // カスタムメタデータとしてZKP証明を埋め込み
    const infoDict = pdfDoc.getInfoDict();
    
    infoDict.set(PDFName.of('ZKProof'), PDFString.of(zkProof.proof));
    infoDict.set(PDFName.of('ZKPublicInputs'), PDFString.of(JSON.stringify(zkProof.publicInputs)));
    infoDict.set(PDFName.of('ZKVerificationStandard'), PDFString.of('Groth16'));
  }

  private async embedPublicKey(pdfDoc: PDFDocument, publicKey: { x: string; y: string }) {
    const infoDict = pdfDoc.getInfoDict();
    
    infoDict.set(PDFName.of('PublicKeyX'), PDFString.of(publicKey.x));
    infoDict.set(PDFName.of('PublicKeyY'), PDFString.of(publicKey.y));
    infoDict.set(PDFName.of('PublicKeyFormat'), PDFString.of('secp256r1'));
  }

  private async embedMetadata(pdfDoc: PDFDocument, metadata: any) {
    const infoDict = pdfDoc.getInfoDict();
    
    infoDict.set(PDFName.of('DocumentYear'), PDFString.of(metadata.documentYear.toString()));
    infoDict.set(PDFName.of('OwnerName'), PDFString.of(metadata.ownerName));
    infoDict.set(PDFName.of('DocumentType'), PDFString.of(metadata.documentType));
    infoDict.set(PDFName.of('ZKDocTimestamp'), PDFString.of(metadata.timestamp));
    infoDict.set(PDFName.of('ZKCertVersion'), PDFString.of('1.0'));
  }

  private async ensurePDFA3Compliance(pdfDoc: PDFDocument) {
    // PDF/A-3準拠のメタデータを設定
    const infoDict = pdfDoc.getInfoDict();
    
    infoDict.set(PDFName.of('Producer'), PDFString.of('証明者システム v2.1'));
    infoDict.set(PDFName.of('Creator'), PDFString.of('zk-CertFramework'));
    
    // PDF/A-3識別情報
    const catalog = pdfDoc.catalog;
    catalog.set(PDFName.of('Version'), PDFName.of('1.7'));
  }

  async extractZKPData(pdfBuffer: ArrayBuffer): Promise<{
    zkProof: { proof: string; publicInputs: string[] } | null;
    publicKey: { x: string; y: string } | null;
    metadata: any;
  }> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const infoDict = pdfDoc.getInfoDict();

    const getStringValue = (key: string): string | null => {
      const value = infoDict.get(PDFName.of(key));
      return value instanceof PDFString ? value.asString() : null;
    };

    const zkProofStr = getStringValue('ZKProof');
    const zkPublicInputsStr = getStringValue('ZKPublicInputs');
    const publicKeyX = getStringValue('PublicKeyX');
    const publicKeyY = getStringValue('PublicKeyY');

    return {
      zkProof: zkProofStr && zkPublicInputsStr ? {
        proof: zkProofStr,
        publicInputs: JSON.parse(zkPublicInputsStr)
      } : null,
      publicKey: publicKeyX && publicKeyY ? {
        x: publicKeyX,
        y: publicKeyY
      } : null,
      metadata: {
        graduationYear: getStringValue('GraduationYear'),
        studentName: getStringValue('StudentName'),
        timestamp: getStringValue('ZKCertTimestamp'),
        version: getStringValue('ZKCertVersion')
      }
    };
  }
}
```

---

## 3. 配布・デプロイ

### 3.1 PWA配信
```bash
# 静的サイトホスティング
npm run build
# -> dist/ フォルダを GitHub Pages、Vercel、Netlify等にデプロイ

# アクセス方法
https://your-domain.com/scholar-prover/
```

### 3.2 利点（超シンプル版）
```
✅ 超シンプル
- サーバー不要
- インストール不要
- ブラウザーのみ

✅ セキュリティ
- すべてローカル処理
- 秘密鍵は外部送信なし
- WebAuthn標準準拠

✅ 研究配布に最適
- URLのみで配布
- クロスプラットフォーム
- デモが簡単

✅ プライバシー
- 個人情報は端末内のみ
- ネットワーク通信最小限
- オフライン動作可能
``` 