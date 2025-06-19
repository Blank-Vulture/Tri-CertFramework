# Registrar Console 詳細設計書（完全バックエンドレス・デスクトップアプリ版）

## 1. アーキテクチャ概要

### 1.1 完全バックエンドレス設計
```
┌─────────────────────────────────────┐
│ Registrar Console (Electron App)    │
├─────────────────────────────────────┤
│ • 学生公開鍵管理（JSONファイル）       │
│ • PDF/A-3生成（ローカル）            │
│ • Merkle Tree構築（ローカル）         │
│ • CSVバルク処理                      │
│ • 設定・データファイル管理             │
└─────────────────────────────────────┘
         ↓ 出力
┌─────────────────────────────────────┐
│ Local File System                   │
├─────────────────────────────────────┤
│ • students_2025.json                │
│ • merkle_tree_2025.json             │
│ • certificates_2025/                │
│   ├── 学生A_certificate.pdf         │
│   ├── 学生B_certificate.pdf         │
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
✅ デスクトップアプリ配布
```

### 1.2 アプリケーション構成
```
registrar-console-app/
├── main.js                 # Electronメインプロセス
├── package.json            # 依存関係
├── config/
│   └── registrar-config.json
├── data/                   # 学生データ（JSON）
│   ├── students_2025.json
│   ├── students_2026.json
│   └── merkle_tree_2025.json
├── templates/              # 証明書テンプレート
│   └── certificate_template.pdf
├── certificates/           # 生成された証明書
│   ├── 2025/
│   └── 2026/
├── exports/               # エクスポートファイル
├── backups/               # 自動バックアップ
├── src/
│   ├── main.ts            # Vue.js エントリーポイント
│   ├── App.vue            # メインアプリ
│   ├── components/        # Vueコンポーネント
│   ├── stores/            # Pinia ストア
│   ├── services/          # ビジネスロジック
│   └── utils/             # ユーティリティ
└── dist/                  # ビルド出力
```

---

## 2. データ構造設計（JSONファイルベース）

### 2.1 学生データファイル
```json
// data/students_2025.json
{
  "year": 2025,
  "lastUpdated": "2025-03-01T10:30:00Z",
  "totalStudents": 150,
  "students": [
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
      "expectedGraduation": "2025-03-31",
      "status": "active",
      "certificateGenerated": false,
      "certificatePath": null,
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
  "totalLeaves": 150,
  "treeDepth": 8,
  "root": "0xabcdef1234567890...",
  "leaves": [
    {
      "index": 0,
      "studentId": "2025001",
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
  "version": "1.0.0",
  "currentYear": 2025,
  "institution": {
    "name": "○○大学",
    "department": "工学部",
    "address": "〒123-4567 東京都...",
    "phone": "03-1234-5678",
    "email": "registrar@example.edu"
  },
  "certificate": {
    "templatePath": "./templates/certificate_template.pdf",
    "outputPath": "./certificates",
    "watermark": true,
    "digitalSignature": true
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
// Student Data Management (Local JSON)
interface StudentRecord {
  id: string;
  name: string;
  email: string;
  passkeyPublicKey: string;
  passkeyCredentialId: string;
  registrationDate: string;
  graduationYear: number;
}

class StudentDataManager {
  private dataPath: string;
  private students: Map<string, StudentRecord> = new Map();

  constructor(year: number) {
    this.dataPath = `./data/students-${year}.json`;
    this.loadStudents();
  }

  async addStudent(student: StudentRecord): Promise<void> {
    this.students.set(student.id, student);
    await this.saveToFile();
  }

  async bulkImport(csvData: string): Promise<ImportResult> {
    const results = { success: 0, errors: [] };
    const rows = csvData.split('\n').slice(1); // Skip header
    
    for (const row of rows) {
      try {
        const [id, name, email, publicKey, credentialId] = row.split(',');
        await this.addStudent({
          id, name, email,
          passkeyPublicKey: publicKey.trim(),
          passkeyCredentialId: credentialId.trim(),
          registrationDate: new Date().toISOString(),
          graduationYear: 2025
        });
        results.success++;
      } catch (error) {
        results.errors.push(`Error importing ${row}: ${error.message}`);
      }
    }
    
    return results;
  }

  private async saveToFile(): Promise<void> {
    const data = Object.fromEntries(this.students);
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

  buildFromStudents(students: StudentRecord[]): MerkleTreeData {
    // Convert passkey public keys to Poseidon hashes
    const leaves = students.map(student => 
      poseidon1([BigInt('0x' + student.passkeyPublicKey)])
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
  async generateCertificates(
    students: StudentRecord[],
    merkleTree: MerkleTreeData,
    template: PDFTemplate
  ): Promise<GenerationResult> {
    const results = { generated: 0, errors: [] };
    
    for (let i = 0; i < students.length; i++) {
      try {
        const student = students[i];
        const merkleProof = this.generateMerkleProof(merkleTree, i);
        
        const pdf = await this.createCertificatePDF(
          student,
          merkleProof,
          template
        );
        
        const outputPath = `./generated-pdfs/${student.graduationYear}/${student.id}_certificate.pdf`;
        await fs.writeFile(outputPath, pdf);
        
        results.generated++;
      } catch (error) {
        results.errors.push(`Error generating PDF for ${students[i].id}: ${error.message}`);
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
│   ├── students-2025.json      # 2025年度学生データ
│   ├── students-2026.json      # 2026年度学生データ
│   ├── merkle-tree-2025.json   # 2025年度Merkle Tree
│   ├── merkle-tree-2026.json   # 2026年度Merkle Tree
│   └── config.json             # アプリケーション設定
├── generated-pdfs/
│   ├── 2025/                   # 2025年度生成PDF
│   └── 2026/                   # 2026年度生成PDF
├── templates/
│   └── certificate-template.pdf # PDF/A-3テンプレート
└── logs/
    └── operations.log          # 操作ログ
```

### 3.2 年度別独立データ管理
- 各卒業年度のデータは完全に分離
- 年度間での依存関係なし
- 簡単なバックアップとアーカイブ
- 監査証跡の明確な分離