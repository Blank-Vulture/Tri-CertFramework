# 技術設計書 (TSD) — Registrar Console  
最終更新: 2025-06-16 Version 2.0

---

## 1. 技術スタック（完全バックエンドレス）
| 層 | 技術 | バージョン |
|----|------|-----------|
| デスクトップ | Tauri v2 + React 18 + TypeScript | 2.0+ / 18.0+ / 5.0+ |
| データ管理 | JSON Files + Node.js fs | Native |
| 認証 | Ledger Nano X + EIP-191 | @ledgerhq/hw-* |
| Merkle Tree | Poseidon256 + circomlibjs | 0.1.7 |
| PDF生成 | PDFtk Server + PDF/A-3 | 3.3+ |
| ZKP | Circom 2.1.4 + SnarkJS 0.7 | Latest |
| ファイル処理 | Papa Parse (CSV) | 5.4+ |

## 2. Tauri アプリケーション設計

### 2.1 Rust Backend構成
```rust
// main.rs - Tauriバックエンド
use tauri::{command, State, Manager, AppHandle};
import { FileManager } from './services/FileManager';
import { MerkleTreeBuilder } from './services/MerkleTreeBuilder';
import { PDFGenerator } from './services/PDFGenerator';

class RegistrarConsoleApp {
  private mainWindow: BrowserWindow;
  private fileManager: FileManager;
  private merkleBuilder: MerkleTreeBuilder;
  private pdfGenerator: PDFGenerator;

  constructor() {
    this.fileManager = new FileManager('./data');
    this.merkleBuilder = new MerkleTreeBuilder();
    this.pdfGenerator = new PDFGenerator('./templates');
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      }
    });
  }

  setupIPC() {
    // 学生データ管理
    ipcMain.handle('students:load', async (event, year) => {
      return await this.fileManager.loadStudents(year);
    });

    ipcMain.handle('students:save', async (event, year, students) => {
      return await this.fileManager.saveStudents(year, students);
    });

    // CSV処理
    ipcMain.handle('csv:import', async (event, filePath) => {
      return await this.fileManager.importCSV(filePath);
    });

    // Merkle Tree構築
    ipcMain.handle('merkle:build', async (event, year) => {
      const students = await this.fileManager.loadStudents(year);
      return await this.merkleBuilder.buildTree(students);
    });

    // PDF生成
    ipcMain.handle('pdf:generate', async (event, studentData, template) => {
      return await this.pdfGenerator.generateCertificate(studentData, template);
    });
  }
}
```

### 2.2 ファイル管理サービス
```typescript
// services/FileManager.ts
import fs from 'fs/promises';
import path from 'path';
import Papa from 'papaparse';
import { Student, MerkleTree, AppConfig } from '../types';

export class FileManager {
  constructor(private dataDir: string) {
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    const dirs = ['data', 'templates', 'certificates', 'exports', 'backups'];
    for (const dir of dirs) {
      await fs.mkdir(path.join(this.dataDir, '..', dir), { recursive: true });
    }
  }

  async loadStudents(year: number): Promise<Student[]> {
    const filePath = path.join(this.dataDir, `students_${year}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      return parsed.students || [];
    } catch (error) {
      if (error.code === 'ENOENT') {
        return []; // ファイルが存在しない場合は空配列
      }
      throw error;
    }
  }

  async saveStudents(year: number, students: Student[]): Promise<void> {
    const filePath = path.join(this.dataDir, `students_${year}.json`);
    const data = {
      version: "2.0",
      year,
      lastUpdated: new Date().toISOString(),
      totalStudents: students.length,
      students
    };
    
    // バックアップ作成
    await this.createBackup(filePath);
    
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async importCSV(filePath: string): Promise<Student[]> {
    const csvData = await fs.readFile(filePath, 'utf-8');
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvData, {
        header: true,
        complete: (results) => {
          try {
            const students = results.data.map((row: any) => ({
              id: row.student_id,
              name_jp: row.name_jp,
              name_en: row.name_en,
              kana: row.kana,
              email: row.email,
              department: row.department,
              major: row.major,
              publicKey: {
                x: row.public_key_x,
                y: row.public_key_y,
                format: 'secp256r1'
              },
              enrollmentDate: row.enrollment_date,
              graduationDate: row.graduation_date,
              gpa: parseFloat(row.gpa) || 0,
              status: row.status || 'active',
              addedAt: new Date().toISOString()
            }));
            resolve(students);
          } catch (error) {
            reject(error);
          }
        },
        error: reject
      });
    });
  }

  private async createBackup(filePath: string): Promise<void> {
    try {
      const backupPath = path.join(
        path.dirname(filePath), 
        '..', 
        'backups', 
        `${path.basename(filePath)}.${Date.now()}.backup`
      );
      await fs.copyFile(filePath, backupPath);
    } catch (error) {
      // バックアップ失敗は警告のみ
      console.warn('Backup creation failed:', error);
    }
  }
}
```

## 3. Poseidon Merkle Tree 実装

### 3.1 Merkle Tree 構築
```typescript
// services/MerkleTreeBuilder.ts
import { poseidon } from 'circomlibjs';
import { Student, MerkleTree, MerkleLeaf } from '../types';

export class MerkleTreeBuilder {
  private readonly TREE_DEPTH = 8;
  private readonly TOTAL_LEAVES = 2 ** this.TREE_DEPTH; // 256

  async buildTree(students: Student[]): Promise<MerkleTree> {
    // 1. 公開鍵からコミットメント計算
    const leaves = await this.generateLeaves(students);
    
    // 2. ゼロパディング
    const paddedLeaves = this.padLeaves(leaves);
    
    // 3. Merkle Tree構築
    const tree = await this.buildMerkleTree(paddedLeaves);
    
    // 4. 結果データ作成
    return {
      version: "2.0",
      year: students[0]?.graduationDate ? new Date(students[0].graduationDate).getFullYear() : new Date().getFullYear(),
      totalLeaves: this.TOTAL_LEAVES,
      actualStudents: students.length,
      treeDepth: this.TREE_DEPTH,
      hashFunction: "poseidon256",
      root: tree[tree.length - 1][0],
      leaves: leaves,
      tree: this.formatTreeData(tree),
      generatedAt: new Date().toISOString()
    };
  }

  private async generateLeaves(students: Student[]): Promise<MerkleLeaf[]> {
    const leaves: MerkleLeaf[] = [];
    
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      
      // 公開鍵のハッシュ計算
      const publicKeyHash = poseidon([
        BigInt(student.publicKey.x),
        BigInt(student.publicKey.y)
      ]);
      
      const commitment = poseidon([publicKeyHash]);
      
      leaves.push({
        index: i,
        studentId: student.id,
        publicKeyHash: '0x' + publicKeyHash.toString(16),
        commitment: '0x' + commitment.toString(16),
        leaf: '0x' + commitment.toString(16)
      });
      
      // 学生データにコミットメント追加
      student.commitment = '0x' + commitment.toString(16);
      student.merkleIndex = i;
    }
    
    return leaves;
  }

  private padLeaves(leaves: MerkleLeaf[]): string[] {
    const paddedLeaves: string[] = [];
    
    // 実際の葉
    for (const leaf of leaves) {
      paddedLeaves.push(leaf.leaf);
    }
    
    // ゼロパディング
    const zeroLeaf = '0x' + BigInt(0).toString(16).padStart(64, '0');
    while (paddedLeaves.length < this.TOTAL_LEAVES) {
      paddedLeaves.push(zeroLeaf);
    }
    
    return paddedLeaves;
  }

  private async buildMerkleTree(leaves: string[]): Promise<string[][]> {
    const tree: string[][] = [];
    tree.push(leaves);
    
    for (let level = 0; level < this.TREE_DEPTH; level++) {
      const currentLevel = tree[level];
      const nextLevel: string[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = BigInt(currentLevel[i]);
        const right = BigInt(currentLevel[i + 1]);
        const parent = poseidon([left, right]);
        nextLevel.push('0x' + parent.toString(16));
      }
      
      tree.push(nextLevel);
    }
    
    return tree;
  }

  private formatTreeData(tree: string[][]): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};
    
    for (let i = 0; i < tree.length; i++) {
      formatted[`level${i}`] = tree[i];
    }
    
    return formatted;
  }

  async generateMerkleProof(tree: MerkleTree, leafIndex: number): Promise<string[]> {
    const proof: string[] = [];
    let currentIndex = leafIndex;
    
    for (let level = 0; level < this.TREE_DEPTH; level++) {
      const levelData = tree.tree[`level${level}`];
      const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
      
      if (siblingIndex < levelData.length) {
        proof.push(levelData[siblingIndex]);
      }
      
      currentIndex = Math.floor(currentIndex / 2);
    }
    
    return proof;
  }
}
```

## 4. PDF/A-3 証明書生成

### 4.1 PDF生成サービス
```typescript
// services/PDFGenerator.ts
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { Student } from '../types';

export class PDFGenerator {
  constructor(private templateDir: string) {}

  async generateCertificate(student: Student, templateType: string = 'graduation'): Promise<string> {
    const templatePath = path.join(this.templateDir, `${templateType}_template.pdf`);
    const outputPath = path.join(
      this.templateDir, 
      '..', 
      'certificates',
      student.graduationDate ? new Date(student.graduationDate).getFullYear().toString() : '2025',
      `${student.id}_${student.name_en.replace(' ', '_')}_certificate.pdf`
    );

    // 1. テンプレートからPDF生成
    await this.fillPDFTemplate(templatePath, outputPath, student);
    
    // 2. ZKP証明データ埋め込み
    await this.embedZKPData(outputPath, student);
    
    // 3. PDF/A-3準拠に変換
    await this.convertToPDFA3(outputPath);

    return outputPath;
  }

  private async fillPDFTemplate(templatePath: string, outputPath: string, student: Student): Promise<void> {
    // PDFtk を使用してフィールド埋め込み
    const fdfData = this.generateFDFData(student);
    const fdfPath = outputPath.replace('.pdf', '.fdf');
    
    await fs.writeFile(fdfPath, fdfData);
    
    const command = `pdftk "${templatePath}" fill_form "${fdfPath}" output "${outputPath}" flatten`;
    
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          // 一時ファイル削除
          fs.unlink(fdfPath).catch(() => {});
          resolve();
        }
      });
    });
  }

  private generateFDFData(student: Student): string {
    return `%FDF-1.2
1 0 obj
<<
/FDF << /Fields [
<< /T (student_name_jp) /V (${student.name_jp}) >>
<< /T (student_name_en) /V (${student.name_en}) >>
<< /T (student_id) /V (${student.id}) >>
<< /T (department) /V (${student.department}) >>
<< /T (major) /V (${student.major}) >>
<< /T (graduation_date) /V (${student.graduationDate}) >>
<< /T (gpa) /V (${student.gpa}) >>
<< /T (issue_date) /V (${new Date().toISOString().split('T')[0]}) >>
] >>
>>
endobj
trailer
<< /Root 1 0 R >>
%%EOF`;
  }

  private async embedZKPData(pdfPath: string, student: Student): Promise<void> {
    // ZKP証明データをPDF/A-3の添付ファイルとして埋め込み
    const zkpData = {
      version: "2.0",
      studentId: student.id,
      publicKeyHash: student.commitment,
      merkleIndex: student.merkleIndex,
      timestamp: new Date().toISOString(),
      format: "zk-certificate-proof"
    };

    const zkpPath = pdfPath.replace('.pdf', '_zkp.json');
    await fs.writeFile(zkpPath, JSON.stringify(zkpData, null, 2));

    // PDFtk attach_files を使用
    const attachCommand = `pdftk "${pdfPath}" attach_files "${zkpPath}" output "${pdfPath}_with_zkp.pdf"`;
    
    return new Promise((resolve, reject) => {
      exec(attachCommand, async (error) => {
        if (error) {
          reject(error);
        } else {
          // 元ファイル置き換え
          await fs.rename(`${pdfPath}_with_zkp.pdf`, pdfPath);
          await fs.unlink(zkpPath).catch(() => {});
          resolve();
        }
      });
    });
  }

  private async convertToPDFA3(pdfPath: string): Promise<void> {
    // Ghostscript を使用してPDF/A-3に変換
    const outputPath = pdfPath.replace('.pdf', '_pdfa3.pdf');
    const command = `gs -dPDFA=3 -dBATCH -dNOPAUSE -dCompatibilityLevel=1.4 -sDEVICE=pdfwrite -sOutputFile="${outputPath}" "${pdfPath}"`;
    
    return new Promise((resolve, reject) => {
      exec(command, async (error) => {
        if (error) {
          reject(error);
        } else {
          await fs.rename(outputPath, pdfPath);
          resolve();
        }
      });
    });
  }
}
```

## 5. Ledger Nano X 統合

### 5.1 ハードウェア署名
```typescript
// services/LedgerService.ts
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import Eth from '@ledgerhq/hw-app-eth';
import { hashMessage } from 'ethers';

export class LedgerService {
  private transport: TransportWebHID | null = null;
  private eth: Eth | null = null;

  async connect(): Promise<boolean> {
    try {
      this.transport = await TransportWebHID.create();
      this.eth = new Eth(this.transport);
      return true;
    } catch (error) {
      console.error('Ledger connection failed:', error);
      return false;
    }
  }

  async signOperation(operation: string, data: any): Promise<string> {
    if (!this.eth) {
      throw new Error('Ledger not connected');
    }

    const message = this.formatSigningMessage(operation, data);
    const messageHash = hashMessage(message);
    
    const signature = await this.eth.signPersonalMessage(
      "44'/60'/0'/0/0", // デフォルトパス
      Buffer.from(messageHash.slice(2), 'hex')
    );

    return signature;
  }

  private formatSigningMessage(operation: string, data: any): string {
    return `Registrar Console Operation
Operation: ${operation}
Data: ${JSON.stringify(data, null, 2)}
Timestamp: ${new Date().toISOString()}
Chain ID: 1442`;
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

## 6. React 18 + TypeScript フロントエンド

### 6.1 メインアプリ
```typescript
// src/App.vue
<template>
  <div id="app">
    <el-container>
      <el-header>
        <RegistrarHeader @year-changed="handleYearChange" />
      </el-header>
      
      <el-container>
        <el-aside>
          <RegistrarSidebar @menu-select="handleMenuSelect" />
        </el-aside>
        
        <el-main>
          <router-view :current-year="currentYear" />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRegistrarStore } from './stores/registrar';

const currentYear = ref(new Date().getFullYear());
const registrarStore = useRegistrarStore();

onMounted(async () => {
  await registrarStore.initialize();
});

const handleYearChange = (year: number) => {
  currentYear.value = year;
  registrarStore.setCurrentYear(year);
};

const handleMenuSelect = (menuItem: string) => {
  // メニュー選択処理
};
</script>
```

## 7. ビルド・配布

### 7.1 Tauri Builder設定
```json
// package.json (部分)
{
  "main": "src/main.tsx",
  "scripts": {
    "dev": "tauri dev",
    "build": "npm run build:react && npm run build:tauri",
    "build:react": "vite build",
    "build:tauri": "tauri build",
    "dist": "npm run build && tauri build"
  },
  "build": {
    "appId": "edu.university.registrar-console",
    "productName": "Registrar Console",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "node_modules/**/*",
      "!node_modules/@ledgerhq/hw-transport-node-hid/**/*"
    ],
    "mac": {
      "target": "dmg",
      "category": "public.app-category.education"
    },
    "win": {
      "target": "nsis"
    },
    "linux": {
      "target": "AppImage"
    }
  }
}
```

## 8. セキュリティ

### 8.1 ファイル暗号化
```typescript
// utils/encryption.ts
import crypto from 'crypto';

export class FileEncryption {
  private readonly algorithm = 'aes-256-gcm';
  
  encrypt(data: string, password: string): { encrypted: string; iv: string; tag: string } {
    const key = crypto.scryptSync(password, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, key);
    cipher.setAAD(Buffer.from('registrar-console'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  decrypt(encrypted: string, password: string, iv: string, tag: string): string {
    const key = crypto.scryptSync(password, 'salt', 32);
    const decipher = crypto.createDecipher(this.algorithm, key);
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    decipher.setAAD(Buffer.from('registrar-console'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

## 9. テスト

### 9.1 ユニットテスト
```typescript
// tests/MerkleTreeBuilder.test.ts
import { MerkleTreeBuilder } from '../src/services/MerkleTreeBuilder';
import { Student } from '../src/types';

describe('MerkleTreeBuilder', () => {
  let builder: MerkleTreeBuilder;
  
  beforeEach(() => {
    builder = new MerkleTreeBuilder();
  });

  test('should build correct Merkle tree', async () => {
    const students: Student[] = [
      {
        id: '2025001',
        name_jp: 'テスト太郎',
        publicKey: {
          x: '0x1234567890abcdef',
          y: '0xfedcba0987654321',
          format: 'secp256r1'
        }
      }
    ];

    const tree = await builder.buildTree(students);
    
    expect(tree.totalLeaves).toBe(256);
    expect(tree.actualStudents).toBe(1);
    expect(tree.treeDepth).toBe(8);
    expect(tree.root).toMatch(/^0x[a-f0-9]+$/);
  });
});
```

## 10. CI/CD

### 10.1 GitHub Actions
```yaml
# .github/workflows/build.yml
name: Build Registrar Console

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
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
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm run dist
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: registrar-console-${{ matrix.os }}
          path: release/
```

