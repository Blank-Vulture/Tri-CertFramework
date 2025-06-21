# 管理者システム 詳細設計書（React + TypeScript + Tauri v2・バックエンドレス版）

## バージョン情報
- **Version**: 2.1
- **Last Updated**: 2025-06-21
- **Target**: プロトタイプ 2025年10月

## 1. アーキテクチャ概要

### 1.1 完全バックエンドレス設計
```
┌─────────────────────────────────────┐
│ 管理者システム (Tauri v2 App)        │
├─────────────────────────────────────┤
│ • 文書所有者公開鍵管理（JSONファイル） │
│ • PDF/A-3生成（ローカル）            │
│ • Merkle Tree構築（ローカル）         │
│ • CSVバルク処理                      │
│ • 設定・データファイル管理             │
└─────────────────────────────────────┘
         ↓ 出力
┌─────────────────────────────────────┐
│ Local File System                   │
├─────────────────────────────────────┤
│ • document_owners_2025.json         │
│ • merkle_tree_2025.json             │
│ • documents_2025/                   │
│   ├── 所有者A_document.pdf           │
│   ├── 所有者B_document.pdf           │
│   └── ...                           │
│ • exports/                          │
│   ├── public_keys_2025.csv          │
│   └── merkle_proof_2025.json        │
└─────────────────────────────────────┘

特徴:
✅ サーバー不要
✅ データベース不要
✅ ローカルJSONファイルのみ
✅ フォルダー構造で管理
✅ CSVインポート/エクスポート
✅ Tauri v2デスクトップアプリ配布
```

### 1.2 アプリケーション構成
```
registrar-console-app/
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
│   ├── hooks/              # カスタムフック
│   ├── services/           # ビジネスロジック
│   ├── stores/             # Zustand ストア
│   └── utils/              # ユーティリティ
├── package.json            # Node.js依存関係
├── vite.config.ts          # Vite設定
├── data/                   # 文書所有者データ（JSON）
│   ├── document_owners_2025.json
│   ├── document_owners_2026.json
│   └── merkle_tree_2025.json
├── templates/              # 文書テンプレート
│   └── document_template.pdf
├── documents/              # 生成された文書
│   ├── 2025/
│   └── 2026/
├── exports/               # エクスポートファイル
└── backups/               # 自動バックアップ
```

---

## 2. データ構造設計（JSONファイルベース）

### 2.1 文書所有者データファイル
```json
// data/document_owners_2025.json
{
  "year": 2025,
  "documentType": "graduation_certificate",
  "lastUpdated": "2025-03-01T10:30:00Z",
  "totalOwners": 150,
  "owners": [
    {
      "id": "2025001",
      "name": "田中太郎",
      "kana": "タナカタロウ",
      "email": "tanaka@example.edu",
      "department": "工学部",
      "major": "情報工学科",
      "publicKey": {
        "x": "0x1234567890abcdef...",
        "y": "0xfedcba0987654321...",
        "format": "secp256r1"
      },
      "enrollmentDate": "2021-04-01",
      "expectedIssueDate": "2025-03-31",
      "documentType": "graduation_certificate",
      "status": "active",
      "documentGenerated": false,
      "documentPath": null,
      "addedAt": "2024-12-01T09:00:00Z",
      "updatedAt": "2024-12-15T14:30:00Z"
    }
  ]
}
```

### 2.2 Merkle Tree データ
```json
// data/merkle_tree_2025.json
{
  "year": 2025,
  "documentType": "graduation_certificate",
  "totalLeaves": 150,
  "treeDepth": 8,
  "root": "0xabcdef1234567890...",
  "leaves": [
    {
      "index": 0,
      "ownerId": "2025001",
      "publicKeyHash": "0x123abc...",
      "leaf": "0x456def..."
    }
  ],
  "tree": {
    "level0": ["0x123...", "0x456...", "..."],
    "level1": ["0xabc...", "0xdef...", "..."],
    "level7": ["0xabcdef1234567890..."]
  },
  "generatedAt": "2025-02-15T10:00:00Z"
}
```

### 2.3 アプリ設定ファイル
```json
// config/registrar-config.json
{
  "version": "2.1.0",
  "currentYear": 2025,
  "institution": {
    "name": "○○大学",
    "department": "工学部",
    "address": "〒123-4567 東京都...",
    "phone": "03-1234-5678",
    "email": "registrar@example.edu"
  },
  "document": {
    "templatePath": "./templates/document_template.pdf",
    "outputPath": "./documents",
    "watermark": true,
    "digitalSignature": true,
    "defaultType": "graduation_certificate"
  },
  "merkleTree": {
    "hashFunction": "poseidon256",
    "treeDepth": 8,
    "autoRebuild": true
  },
  "export": {
    "csvEncoding": "UTF-8",
    "includePersonalInfo": false,
    "timestampFormat": "ISO8601"
  },
  "ui": {
    "theme": "light",
    "language": "ja",
    "autoSave": true,
    "backupInterval": 300
  }
}
```

### 2.3 ローカルデータ管理パターン

```typescript
// Document Owner Data Management (Local JSON)
interface DocumentOwnerRecord {
  id: string;
  name: string;
  email: string;
  passkeyPublicKey: string;
  passkeyCredentialId: string;
  registrationDate: string;
  issueYear: number;
  documentType: string;
}

class DocumentOwnerDataManager {
  private dataPath: string;
  private owners: Map<string, DocumentOwnerRecord> = new Map();

  constructor(year: number, documentType: string) {
    this.dataPath = `./data/document_owners_${year}_${documentType}.json`;
    this.loadOwners();
  }

  async addOwner(owner: DocumentOwnerRecord): Promise<void> {
    this.owners.set(owner.id, owner);
    await this.saveToFile();
  }

  async bulkImport(csvData: string): Promise<ImportResult> {
    const results = { success: 0, errors: [] };
    const rows = csvData.split('\n').slice(1); // Skip header
    
    for (const row of rows) {
      try {
        const [id, name, email, publicKey, credentialId] = row.split(',');
        await this.addOwner({
          id, name, email,
          passkeyPublicKey: publicKey.trim(),
          passkeyCredentialId: credentialId.trim(),
          registrationDate: new Date().toISOString(),
          issueYear: 2025,
          documentType: "graduation_certificate"
        });
        results.success++;
      } catch (error) {
        results.errors.push(`Error importing ${row}: ${error.message}`);
      }
    }
    
    return results;
  }

  private async saveToFile(): Promise<void> {
    const data = Object.fromEntries(this.owners);
    await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
  }
}
```

### 2.4 Merkle Tree生成とPDF一括作成

```typescript
// Poseidon Merkle Tree Builder
import { poseidon1, poseidon2 } from '@noble/hashes/poseidon';

class PoseidonMerkleTreeBuilder {
  private depth = 8; // 256 leaves maximum
  private zeroValue = BigInt(0);

  buildFromOwners(owners: DocumentOwnerRecord[]): MerkleTreeData {
    // Convert passkey public keys to Poseidon hashes
    const leaves = owners.map(owner => 
      poseidon1([BigInt('0x' + owner.passkeyPublicKey)])
    );

    // Pad to full capacity
    while (leaves.length < 256) {
      leaves.push(this.zeroValue);
    }

    return this.computeTree(leaves);
  }

  private computeTree(leaves: bigint[]): MerkleTreeData {
    const tree: bigint[][] = [leaves];
    
    for (let level = 0; level < this.depth; level++) {
      const currentLevel = tree[level];
      const nextLevel: bigint[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1];
        nextLevel.push(poseidon2([left, right]));
      }
      
      tree.push(nextLevel);
    }

    return {
      root: tree[this.depth][0],
      tree,
      leaves
    };
  }
}

// PDF/A-3 Batch Generator
class BatchPDFGenerator {
  async generateDocuments(
    owners: DocumentOwnerRecord[],
    merkleTree: MerkleTreeData,
    template: PDFTemplate
  ): Promise<GenerationResult> {
    const results = { generated: 0, errors: [] };
    
    for (let i = 0; i < owners.length; i++) {
      try {
        const owner = owners[i];
        const merkleProof = this.generateMerkleProof(merkleTree, i);
        
        const pdf = await this.createDocumentPDF(
          owner,
          merkleProof,
          template
        );
        
        const outputPath = `./generated-documents/${owner.issueYear}/${owner.id}_document.pdf`;
        await fs.writeFile(outputPath, pdf);
        
        results.generated++;
      } catch (error) {
        results.errors.push(`Error generating PDF for ${owners[i].id}: ${error.message}`);
      }
    }
    
    return results;
  }

  private generateMerkleProof(tree: MerkleTreeData, leafIndex: number): MerkleProof {
    const proof: bigint[] = [];
    let index = leafIndex;
    
    for (let level = 0; level < this.depth; level++) {
      const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
      proof.push(tree.tree[level][siblingIndex]);
      index = Math.floor(index / 2);
    }
    
    return {
      pathElements: proof,
      pathIndices: this.getPathIndices(leafIndex)
    };
  }
}
```

---

## 3. バックエンドレス・アーキテクチャ

### 3.1 ローカルファイルシステム構造
```
registrar-console/
├── data/
│   ├── document_owners-2025.json      # 2025年度文書所有者データ
│   ├── document_owners-2026.json      # 2026年度文書所有者データ
│   ├── merkle-tree-2025.json          # 2025年度Merkle Tree
│   ├── merkle-tree-2026.json          # 2026年度Merkle Tree
│   └── config.json                   # アプリケーション設定
├── generated-documents/
│   ├── 2025/                          # 2025年度生成文書
│   └── 2026/                          # 2026年度生成文書
├── templates/
│   └── document-template.pdf           # PDF/A-3テンプレート
└── logs/
    └── operations.log                 # 操作ログ
```

### 3.2 年度別独立データ管理
- 各卒業年度のデータは完全に分離
- 年度間での依存関係なし
- 簡単なバックアップとアーカイブ
- 監査証跡の明確な分離