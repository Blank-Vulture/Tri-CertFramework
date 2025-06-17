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

---

## 3. デスクトップアプリ設計（Electron + Vue.js 3）

### 3.1 状態管理 (Pinia)
```typescript
// stores/students.ts
export const useStudentsStore = defineStore('students', () => {
  const students = ref<Student[]>([]);
  const loading = ref(false);
  const currentPage = ref(1);
  const pageSize = ref(50);
  const totalCount = ref(0);
  const searchQuery = ref('');
  const filters = ref<StudentFilters>({
    department: '',
    graduationYear: null,
    status: 'all'
  });

  const fetchStudents = async () => {
    loading.value = true;
    try {
      const response = await studentAPI.getStudents({
        page: currentPage.value,
        limit: pageSize.value,
        search: searchQuery.value,
        filters: filters.value
      });
      
      students.value = response.data;
      totalCount.value = response.total;
    } catch (error) {
      ElMessage.error('学生データの取得に失敗しました');
    } finally {
      loading.value = false;
    }
  };

  const uploadCSV = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await studentAPI.bulkUpload(formData);
      ElMessage.success(`${response.successCount}件の学生を登録しました`);
      await fetchStudents();
      return response;
    } catch (error) {
      ElMessage.error('CSV アップロードに失敗しました');
      throw error;
    }
  };

  return {
    students: readonly(students),
    loading: readonly(loading),
    currentPage,
    pageSize,
    totalCount: readonly(totalCount),
    searchQuery,
    filters,
    fetchStudents,
    uploadCSV
  };
});
```

### 2.2 コンポーネント設計
```vue
<!-- components/StudentTable.vue -->
<template>
  <div class="student-table">
    <el-table
      :data="students"
      :loading="loading"
      stripe
      border
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      
      <el-table-column
        prop="student_id"
        label="学籍番号"
        width="120"
        fixed="left"
      />
      
      <el-table-column
        prop="name_jp"
        label="氏名（日本語）"
        width="150"
      />
      
      <el-table-column
        prop="name_en"
        label="氏名（英語）"
        width="200"
      />
      
      <el-table-column
        prop="department"
        label="学部・学科"
        width="150"
      />
      
      <el-table-column
        prop="admission_year"
        label="入学年度"
        width="100"
      />
      
      <el-table-column
        prop="graduation_year"
        label="卒業年度"
        width="100"
      />
      
      <el-table-column
        prop="status"
        label="ステータス"
        width="100"
      >
        <template #default="scope">
          <el-tag
            :type="getStatusType(scope.row.status)"
            disable-transitions
          >
            {{ getStatusText(scope.row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column
        label="公開鍵"
        width="120"
        align="center"
      >
        <template #default="scope">
          <el-icon
            :color="scope.row.public_key ? '#67C23A' : '#F56C6C'"
            :size="18"
          >
            <component
              :is="scope.row.public_key ? 'Check' : 'Close'"
            />
          </el-icon>
        </template>
      </el-table-column>
      
      <el-table-column
        label="操作"
        width="150"
        fixed="right"
      >
        <template #default="scope">
          <el-button
            type="primary"
            size="small"
            @click="handleEdit(scope.row)"
          >
            編集
          </el-button>
          <el-button
            type="danger"
            size="small"
            @click="handleDelete(scope.row)"
          >
            削除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="totalCount"
        :page-sizes="[25, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStudentsStore } from '@/stores/students';
import type { Student } from '@/types';

const studentsStore = useStudentsStore();

const students = computed(() => studentsStore.students);
const loading = computed(() => studentsStore.loading);
const currentPage = computed({
  get: () => studentsStore.currentPage,
  set: (value) => studentsStore.currentPage = value
});
const pageSize = computed({
  get: () => studentsStore.pageSize,
  set: (value) => studentsStore.pageSize = value
});
const totalCount = computed(() => studentsStore.totalCount);

const emit = defineEmits<{
  'selection-change': [students: Student[]];
  'edit': [student: Student];
  'delete': [student: Student];
}>();

const handleSelectionChange = (selection: Student[]) => {
  emit('selection-change', selection);
};

const handleEdit = (student: Student) => {
  emit('edit', student);
};

const handleDelete = (student: Student) => {
  emit('delete', student);
};

const handleSizeChange = (size: number) => {
  pageSize.value = size;
  studentsStore.fetchStudents();
};

const handleCurrentChange = (page: number) => {
  currentPage.value = page;
  studentsStore.fetchStudents();
};

const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    'active': 'success',
    'graduated': 'info',
    'suspended': 'warning',
    'deleted': 'danger'
  };
  return types[status] || 'info';
};

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    'active': '在学中',
    'graduated': '卒業',
    'suspended': '休学',
    'deleted': '削除'
  };
  return texts[status] || status;
};
</script>
```

### 2.3 CSV アップロード機能
```vue
<!-- components/CSVUploader.vue -->
<template>
  <div class="csv-uploader">
    <el-upload
      ref="uploadRef"
      class="upload-demo"
      drag
      :auto-upload="false"
      :on-change="handleFileChange"
      :on-remove="handleFileRemove"
      accept=".csv"
      :limit="1"
    >
      <el-icon class="el-icon--upload">
        <upload-filled />
      </el-icon>
      <div class="el-upload__text">
        CSVファイルをドラッグするか、<em>クリックしてアップロード</em>
      </div>
      <template #tip>
        <div class="el-upload__tip">
          CSV形式のファイル (UTF-8エンコーディング)
        </div>
      </template>
    </el-upload>
    
    <div v-if="previewData.length > 0" class="preview-section">
      <h3>プレビュー (最大5件)</h3>
      <el-table :data="previewData.slice(0, 5)" border>
        <el-table-column
          v-for="column in columns"
          :key="column.key"
          :prop="column.key"
          :label="column.label"
          :width="column.width"
        />
      </el-table>
      
      <div class="upload-actions">
        <el-button @click="handleCancel">キャンセル</el-button>
        <el-button
          type="primary"
          :loading="uploading"
          @click="handleUpload"
        >
          アップロード ({{ previewData.length }}件)
        </el-button>
      </div>
    </div>
    
    <el-dialog
      v-model="showResults"
      title="アップロード結果"
      width="60%"
    >
      <div v-if="uploadResults">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="総件数">
            {{ uploadResults.totalCount }}
          </el-descriptions-item>
          <el-descriptions-item label="成功">
            {{ uploadResults.successCount }}
          </el-descriptions-item>
          <el-descriptions-item label="失敗">
            {{ uploadResults.errorCount }}
          </el-descriptions-item>
          <el-descriptions-item label="スキップ">
            {{ uploadResults.skipCount }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div v-if="uploadResults.errors.length > 0" class="error-section">
          <h4>エラー詳細</h4>
          <el-table :data="uploadResults.errors" max-height="300">
            <el-table-column prop="row" label="行" width="60" />
            <el-table-column prop="field" label="フィールド" width="120" />
            <el-table-column prop="message" label="エラー内容" />
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import Papa from 'papaparse';
import { useStudentsStore } from '@/stores/students';

const studentsStore = useStudentsStore();
const uploadRef = ref();
const uploading = ref(false);
const showResults = ref(false);
const previewData = ref<any[]>([]);
const uploadResults = ref<any>(null);

const columns = [
  { key: 'student_id', label: '学籍番号', width: 120 },
  { key: 'name_jp', label: '氏名（日本語）', width: 150 },
  { key: 'name_en', label: '氏名（英語）', width: 180 },
  { key: 'department', label: '学部・学科', width: 150 },
  { key: 'admission_year', label: '入学年度', width: 100 },
  { key: 'graduation_year', label: '卒業年度', width: 100 },
  { key: 'public_key', label: '公開鍵', width: 200 }
];

const handleFileChange = (file: any) => {
  if (file.raw) {
    parseCSV(file.raw);
  }
};

const handleFileRemove = () => {
  previewData.value = [];
};

const parseCSV = (file: File) => {
  Papa.parse(file, {
    header: true,
    encoding: 'UTF-8',
    complete: (results) => {
      if (results.errors.length > 0) {
        ElMessage.error('CSVファイルの解析に失敗しました');
        return;
      }
      
      previewData.value = results.data.filter(row => 
        Object.values(row).some(value => value !== '')
      );
    },
    error: (error) => {
      ElMessage.error(`ファイル読み込みエラー: ${error.message}`);
    }
  });
};

const handleCancel = () => {
  previewData.value = [];
  uploadRef.value.clearFiles();
};

const handleUpload = async () => {
  uploading.value = true;
  
  try {
    const csvData = previewData.value.map(row => ({
      student_id: row.student_id?.trim(),
      name_jp: row.name_jp?.trim(),
      name_en: row.name_en?.trim(),
      department: row.department?.trim(),
      admission_year: parseInt(row.admission_year),
      graduation_year: row.graduation_year ? parseInt(row.graduation_year) : null,
      public_key: row.public_key?.trim()
    }));
    
    const results = await studentsStore.uploadCSV(csvData);
    uploadResults.value = results;
    showResults.value = true;
    
    if (results.errorCount === 0) {
      handleCancel();
    }
  } catch (error) {
    console.error('Upload failed:', error);
  } finally {
    uploading.value = false;
  }
};
</script>
```

---

## 3. バックエンド詳細設計

### 3.1 Express.js API Controller
```typescript
// controllers/studentsController.ts
import { Request, Response } from 'express';
import { StudentsService } from '../services/StudentsService';
import { CSVProcessor } from '../services/CSVProcessor';
import { validateStudentData } from '../validators/studentValidator';

export class StudentsController {
  private studentsService: StudentsService;
  private csvProcessor: CSVProcessor;

  constructor() {
    this.studentsService = new StudentsService();
    this.csvProcessor = new CSVProcessor();
  }

  // 学生一覧取得
  public getStudents = async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 50,
        search = '',
        department = '',
        graduationYear = null,
        status = 'all'
      } = req.query;

      const filters = {
        department: department as string,
        graduationYear: graduationYear ? parseInt(graduationYear as string) : null,
        status: status as string
      };

      const result = await this.studentsService.getStudents({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        filters
      });

      res.json(result);
    } catch (error) {
      console.error('Error getting students:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // 学生個別取得
  public getStudent = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const student = await this.studentsService.getStudentById(parseInt(id));
      
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      
      res.json(student);
    } catch (error) {
      console.error('Error getting student:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // 学生登録
  public createStudent = async (req: Request, res: Response) => {
    try {
      const validation = validateStudentData(req.body);
      if (!validation.isValid) {
        return res.status(400).json({ errors: validation.errors });
      }

      const student = await this.studentsService.createStudent(req.body);
      res.status(201).json(student);
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({ error: 'Student ID already exists' });
      }
      console.error('Error creating student:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // CSV一括アップロード
  public bulkUpload = async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const csvData = await this.csvProcessor.parseCSV(req.file.buffer);
      const results = await this.studentsService.bulkCreate(csvData);

      res.json({
        totalCount: results.totalCount,
        successCount: results.successCount,
        errorCount: results.errorCount,
        skipCount: results.skipCount,
        errors: results.errors
      });
    } catch (error) {
      console.error('Error bulk uploading students:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // 学生更新
  public updateStudent = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validation = validateStudentData(req.body);
      
      if (!validation.isValid) {
        return res.status(400).json({ errors: validation.errors });
      }

      const student = await this.studentsService.updateStudent(
        parseInt(id),
        req.body
      );
      
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      
      res.json(student);
    } catch (error) {
      console.error('Error updating student:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // 学生削除
  public deleteStudent = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const success = await this.studentsService.deleteStudent(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ error: 'Student not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting student:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
```

### 3.2 Business Logic Service
```typescript
// services/StudentsService.ts
import { Database } from '../database/Database';
import { MerkleTreeService } from './MerkleTreeService';
import { CryptoService } from './CryptoService';
import type { Student, StudentCreateData, StudentFilters } from '../../shared/types';

export class StudentsService {
  private db: Database;
  private merkleTreeService: MerkleTreeService;
  private cryptoService: CryptoService;

  constructor() {
    this.db = new Database();
    this.merkleTreeService = new MerkleTreeService();
    this.cryptoService = new CryptoService();
  }

  public async getStudents(params: {
    page: number;
    limit: number;
    search: string;
    filters: StudentFilters;
  }): Promise<{ data: Student[]; total: number; page: number; limit: number }> {
    
    const offset = (params.page - 1) * params.limit;
    
    let query = `
      SELECT 
        id, student_id, name_jp, name_en, department,
        admission_year, graduation_year, status,
        public_key IS NOT NULL as has_public_key,
        created_at, updated_at
      FROM students
      WHERE 1=1
    `;
    
    const queryParams: any[] = [];
    let paramIndex = 1;

    // 検索条件
    if (params.search) {
      query += ` AND (
        student_id ILIKE $${paramIndex} OR 
        name_jp ILIKE $${paramIndex} OR 
        name_en ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    // フィルター条件
    if (params.filters.department) {
      query += ` AND department = $${paramIndex}`;
      queryParams.push(params.filters.department);
      paramIndex++;
    }

    if (params.filters.graduationYear) {
      query += ` AND graduation_year = $${paramIndex}`;
      queryParams.push(params.filters.graduationYear);
      paramIndex++;
    }

    if (params.filters.status !== 'all') {
      query += ` AND status = $${paramIndex}`;
      queryParams.push(params.filters.status);
      paramIndex++;
    }

    // カウントクエリ
    const countQuery = query.replace(
      'SELECT id, student_id, name_jp, name_en, department, admission_year, graduation_year, status, public_key IS NOT NULL as has_public_key, created_at, updated_at',
      'SELECT COUNT(*)'
    );
    
    const countResult = await this.db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // データクエリ
    query += ` ORDER BY student_id ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(params.limit, offset);
    
    const result = await this.db.query(query, queryParams);

    return {
      data: result.rows,
      total,
      page: params.page,
      limit: params.limit
    };
  }

  public async createStudent(data: StudentCreateData): Promise<Student> {
    // 公開鍵検証
    if (data.public_key) {
      const isValid = await this.cryptoService.validatePublicKey(data.public_key);
      if (!isValid) {
        throw new Error('Invalid public key format');
      }
    }

    // Poseidon256 commitment計算
    const commitment = data.public_key 
      ? await this.cryptoService.poseidon256(data.public_key)
      : null;

    const query = `
      INSERT INTO students (
        student_id, name_jp, name_en, department,
        admission_year, graduation_year, public_key, commitment, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      data.student_id,
      data.name_jp,
      data.name_en,
      data.department,
      data.admission_year,
      data.graduation_year,
      data.public_key ? Buffer.from(data.public_key, 'hex') : null,
      commitment,
      data.status || 'active'
    ];

    const result = await this.db.query(query, values);
    
    // Merkle Tree更新をバックグラウンドで実行
    if (data.public_key) {
      this.merkleTreeService.scheduleUpdate();
    }

    return result.rows[0];
  }

  public async bulkCreate(csvData: StudentCreateData[]): Promise<{
    totalCount: number;
    successCount: number;
    errorCount: number;
    skipCount: number;
    errors: Array<{ row: number; field: string; message: string }>;
  }> {
    
    const results = {
      totalCount: csvData.length,
      successCount: 0,
      errorCount: 0,
      skipCount: 0,
      errors: []
    };

    // トランザクション開始
    const client = await this.db.getClient();
    await client.query('BEGIN');

    try {
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const rowNumber = i + 1;

        try {
          // 重複チェック
          const existingQuery = 'SELECT id FROM students WHERE student_id = $1';
          const existing = await client.query(existingQuery, [row.student_id]);
          
          if (existing.rows.length > 0) {
            results.skipCount++;
            continue;
          }

          // バリデーション
          const validation = this.validateStudentRow(row);
          if (!validation.isValid) {
            validation.errors.forEach(error => {
              results.errors.push({
                row: rowNumber,
                field: error.field,
                message: error.message
              });
            });
            results.errorCount++;
            continue;
          }

          // 公開鍵処理
          let commitment = null;
          if (row.public_key) {
            const isValid = await this.cryptoService.validatePublicKey(row.public_key);
            if (!isValid) {
              results.errors.push({
                row: rowNumber,
                field: 'public_key',
                message: 'Invalid public key format'
              });
              results.errorCount++;
              continue;
            }
            commitment = await this.cryptoService.poseidon256(row.public_key);
          }

          // レコード挿入
          const insertQuery = `
            INSERT INTO students (
              student_id, name_jp, name_en, department,
              admission_year, graduation_year, public_key, commitment, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `;

          const values = [
            row.student_id,
            row.name_jp,
            row.name_en,
            row.department,
            row.admission_year,
            row.graduation_year,
            row.public_key ? Buffer.from(row.public_key, 'hex') : null,
            commitment,
            row.status || 'active'
          ];

          await client.query(insertQuery, values);
          results.successCount++;

        } catch (error) {
          results.errors.push({
            row: rowNumber,
            field: 'general',
            message: error.message
          });
          results.errorCount++;
        }
      }

      await client.query('COMMIT');
      
      // Merkle Tree更新スケジュール
      if (results.successCount > 0) {
        this.merkleTreeService.scheduleUpdate();
      }

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return results;
  }

  private validateStudentRow(row: StudentCreateData): {
    isValid: boolean;
    errors: Array<{ field: string; message: string }>;
  } {
    const errors: Array<{ field: string; message: string }> = [];

    if (!row.student_id || !/^[A-Z0-9]+$/.test(row.student_id)) {
      errors.push({ field: 'student_id', message: 'Invalid student ID format' });
    }

    if (!row.name_jp || row.name_jp.length < 2) {
      errors.push({ field: 'name_jp', message: 'Japanese name is required' });
    }

    if (!row.name_en || row.name_en.length < 2) {
      errors.push({ field: 'name_en', message: 'English name is required' });
    }

    if (!row.department) {
      errors.push({ field: 'department', message: 'Department is required' });
    }

    if (!row.admission_year || row.admission_year < 1950 || row.admission_year > new Date().getFullYear() + 1) {
      errors.push({ field: 'admission_year', message: 'Invalid admission year' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
```

### 3.3 PDF生成サービス
```typescript
// services/PDFService.ts
import PDFDocument from 'pdfkit';
import { promises as fs } from 'fs';
import path from 'path';
import { CertificateTemplate, Student } from '../../shared/types';

export class PDFService {
  private templatesPath: string;

  constructor() {
    this.templatesPath = path.join(__dirname, '../templates');
  }

  public async generateCertificate(
    student: Student,
    template: CertificateTemplate
  ): Promise<Buffer> {
    
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `卒業証明書 - ${student.name_jp}`,
        Subject: 'Graduation Certificate',
        Producer: 'zk-CertFramework',
        Creator: 'Registrar Console'
      }
    });

    // PDFコンテンツ生成
    await this.generateCertificateContent(doc, student, template);

    // PDFをBufferとして取得
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      
      doc.on('error', (error) => {
        reject(error);
      });
      
      doc.end();
    });
  }

  private async generateCertificateContent(
    doc: PDFKit.PDFDocument,
    student: Student,
    template: CertificateTemplate
  ): Promise<void> {
    
    // フォント設定
    const fontPath = path.join(this.templatesPath, 'fonts/NotoSansCJK-Regular.otf');
    doc.font(fontPath);

    // 大学ロゴ
    const logoPath = path.join(this.templatesPath, 'images/university-logo.png');
    if (await this.fileExists(logoPath)) {
      doc.image(logoPath, 50, 50, { width: 100 });
    }

    // タイトル
    doc.fontSize(24)
       .text('卒業証明書', 200, 100, { align: 'center' });

    doc.fontSize(18)
       .text('GRADUATION CERTIFICATE', 200, 140, { align: 'center' });

    // 学生情報
    const yStart = 200;
    doc.fontSize(14);
    
    doc.text(`氏名: ${student.name_jp}`, 100, yStart);
    doc.text(`Name: ${student.name_en}`, 100, yStart + 30);
    doc.text(`学籍番号: ${student.student_id}`, 100, yStart + 60);
    doc.text(`学部・学科: ${student.department}`, 100, yStart + 90);
    doc.text(`入学年度: ${student.admission_year}年`, 100, yStart + 120);
    doc.text(`卒業年度: ${student.graduation_year}年`, 100, yStart + 150);

    // 証明文
    const certificationText = `
上記の者は、本学${student.department}を${student.graduation_year}年3月に卒業したことを証明する。

The above named person graduated from ${student.department} 
of this university in March ${student.graduation_year}.
    `.trim();

    doc.fontSize(12)
       .text(certificationText, 100, yStart + 200, { 
         width: 400, 
         align: 'left',
         lineGap: 5
       });

    // 発行日
    const issueDate = new Date();
    doc.fontSize(12)
       .text(`発行日: ${issueDate.getFullYear()}年${issueDate.getMonth() + 1}月${issueDate.getDate()}日`, 
             100, yStart + 320);

    // 大学情報
    doc.fontSize(12)
       .text('○○大学', 350, yStart + 350, { align: 'center' });
    doc.text('学長　○○　○○', 350, yStart + 370, { align: 'center' });

    // QRコード（将来の拡張用）
    if (template.template_data.includeQRCode) {
      // QRコード生成ロジック
    }

    // 透かし（セキュリティ用）
    doc.save();
    doc.opacity(0.1);
    doc.fontSize(48)
       .text('VERIFIED', 200, 400, { 
         align: 'center',
         angle: -45 
       });
    doc.restore();
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
```

### 3.4 Merkle Tree サービス
```typescript
// services/MerkleTreeService.ts
import { Database } from '../database/Database';
import { CryptoService } from './CryptoService';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';

export class MerkleTreeService {
  private db: Database;
  private cryptoService: CryptoService;
  private redis: Redis;
  private updateScheduled: boolean = false;

  constructor() {
    this.db = new Database();
    this.cryptoService = new CryptoService();
    this.redis = new Redis(process.env.REDIS_URL);
    this.setupWorker();
  }

  public scheduleUpdate(): void {
    if (this.updateScheduled) return;
    
    this.updateScheduled = true;
    
    // 5分後に更新実行（バッチ処理）
    setTimeout(() => {
      this.buildMerkleTree();
      this.updateScheduled = false;
    }, 5 * 60 * 1000);
  }

  public async buildMerkleTree(): Promise<string> {
    console.log('Building Merkle Tree...');
    
    // 全学生の公開鍵コミットメントを取得
    const query = `
      SELECT id, commitment 
      FROM students 
      WHERE commitment IS NOT NULL AND status = 'active'
      ORDER BY id ASC
    `;
    
    const result = await this.db.query(query);
    const commitments = result.rows.map(row => row.commitment);
    
    if (commitments.length === 0) {
      throw new Error('No valid commitments found');
    }

    // Merkle Tree構築
    const tree = await this.buildTree(commitments);
    const rootHash = tree.root;
    
    // データベースに保存
    const insertQuery = `
      INSERT INTO merkle_trees (root_hash, tree_data)
      VALUES ($1, $2)
      RETURNING id
    `;
    
    const insertResult = await this.db.query(insertQuery, [
      rootHash,
      JSON.stringify({
        leaves: commitments,
        tree: tree.nodes,
        depth: tree.depth
      })
    ]);

    console.log(`Merkle Tree built with root: ${rootHash}`);
    return rootHash;
  }

  private async buildTree(leaves: string[]): Promise<{
    root: string;
    nodes: string[][];
    depth: number;
  }> {
    if (leaves.length === 0) {
      throw new Error('Cannot build tree with no leaves');
    }

    // リーフノードを最初のレベルとして設定
    let currentLevel = [...leaves];
    const allNodes: string[][] = [currentLevel];
    
    // 2の累乗まで0パディング
    const targetSize = Math.pow(2, Math.ceil(Math.log2(currentLevel.length)));
    while (currentLevel.length < targetSize) {
      currentLevel.push('0x' + '0'.repeat(64));
    }

    // ボトムアップでツリー構築
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1];
        const parent = await this.cryptoService.poseidon256Hash(left, right);
        nextLevel.push(parent);
      }
      
      currentLevel = nextLevel;
      allNodes.push(currentLevel);
    }

    return {
      root: currentLevel[0],
      nodes: allNodes,
      depth: allNodes.length - 1
    };
  }

  public async getMerklePath(commitment: string): Promise<string[]> {
    // 最新のMerkle Treeを取得
    const query = `
      SELECT tree_data 
      FROM merkle_trees 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const result = await this.db.query(query);
    if (result.rows.length === 0) {
      throw new Error('No Merkle tree found');
    }

    const treeData = result.rows[0].tree_data;
    const leaves = treeData.leaves;
    const nodes = treeData.tree;

    // コミットメントのインデックスを見つける
    const leafIndex = leaves.indexOf(commitment);
    if (leafIndex === -1) {
      throw new Error('Commitment not found in tree');
    }

    // Merkle Pathを構築
    const path: string[] = [];
    let currentIndex = leafIndex;

    for (let level = 0; level < nodes.length - 1; level++) {
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
      
      const sibling = nodes[level][siblingIndex];
      path.push(sibling);
      
      currentIndex = Math.floor(currentIndex / 2);
    }

    return path;
  }

  private setupWorker(): void {
    // Redis キューワーカーの設定
    const worker = new Worker('merkle-tree', async (job) => {
      const { type } = job.data;
      
      if (type === 'update') {
        return await this.buildMerkleTree();
      }
    }, {
      connection: this.redis
    });

    worker.on('completed', (job) => {
      console.log(`Merkle tree job ${job.id} completed`);
    });

    worker.on('failed', (job, error) => {
      console.error(`Merkle tree job ${job?.id} failed:`, error);
    });
  }
}
```

この詳細設計書により、Registrar Console の実装に必要な全ての技術詳細が定義されています。 