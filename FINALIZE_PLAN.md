# Tri-CertFramework UI/UX 改善計画

## 概要

システムアーキテクチャを変更せずに行える3つの改善を実施する。

---

## 改善1: Executive Console ダッシュボード改善

### 現状
- `Dashboard()`関数（App.tsx:127-145）は静的なウェルカムメッセージと操作説明のみ

### 改善内容
VK生成状況のサマリーを表示する動的なダッシュボードに改善

**表示項目:**
- 生成済みVK数と対応年度一覧（バッジ表示）
- 最新生成日時
- VKNFT保存先パス
- クイックアクションボタン（VK生成、VK管理へのショートカット）

### 変更ファイル
| ファイル | 変更内容 |
|---------|---------|
| `/executive-console/src/App.tsx` | Dashboard関数を拡張、vkListを受け取る |
| 新規: `/executive-console/src/components/DashboardStats.tsx` | 統計表示コンポーネント |

### 実装詳細
```typescript
// App.tsx - Dashboard関数の修正
function Dashboard({ vkList }: { vkList: VKInfo[] }) {
  // vkListから統計情報を計算
  const years = vkList.map(v => v.year).sort();
  const latestVk = vkList.reduce((a, b) => 
    new Date(a.createdAt) > new Date(b.createdAt) ? a : b, vkList[0]);
  // ...
}
```

**工数**: 2-3h | **優先度**: 高

---

## 改善2: Verifier UI 検証情報の明示化

### 2.1 年度情報の表示

#### 現状
- 年度は`circuit_id`から内部的に検出されるが、ユーザーには表示されない
- `detectGraduationYear()`で検出（page.tsx:142-155）

#### 改善内容
検証結果に「証明書情報」セクションを追加し、年度・回路ID・VKeyハッシュを明示表示

### 2.2 PDFから抽出した内容の確認表示

#### 現状
- PDFから抽出されたデータ（proof, vkey, 署名等）はユーザーに見えない

#### 改善内容
折りたたみ可能な「抽出されたデータ」プレビューセクションを追加

**表示項目:**
- 含まれるデータのチェックリスト（✅ ZKP証明、✅ 検証鍵、✅ 署名、✅ 公開鍵）
- スキーマ、回路ID、ハッシュ方式
- 年度情報（`graduation_year`または`circuit_id`から検出）

### 変更ファイル
| ファイル | 変更内容 |
|---------|---------|
| `/verifier-ui/src/app/page.tsx` | 抽出データ・年度情報の保持、新コンポーネント組み込み |
| `/verifier-ui/src/app/components/VerificationResults.tsx` | 年度情報表示セクション追加 |
| 新規: `/verifier-ui/src/app/components/ExtractedDataPreview.tsx` | 抽出データプレビュー |
| `/verifier-ui/src/i18n/ja.json`, `en.json` | 翻訳キー追加 |

### 実装詳細

```typescript
// VerificationResult インターフェースに追加
interface VerificationResult {
  // 既存フィールド...
  certificateInfo?: {
    graduationYear: number | null;
    circuitId: string;
    vkeyHash: string;
    hashMethod: 'raw' | 'normalized';
  };
}

// ExtractedDataPreview コンポーネント
interface ExtractedDataPreviewProps {
  hasProof: boolean;
  hasVkey: boolean;
  hasSignature: boolean;
  hasPublicKey: boolean;
  circuitId?: string;
  graduationYear?: number | null;
  hashMethod?: 'raw' | 'normalized';
}
```

**工数**: 3-4h | **優先度**: 高

---

## 改善3: 検証キーと学生年度の紐付け

### 現状
- `commit-allowlist.json`（schema: tri-cert/commit-allowlist@2）には年度情報がない
- 学生が任意の年度で証明を生成可能な状態

### 改善内容
Allowlistスキーマを拡張し、年度情報を追加。検証時に年度照合を行う。

### スキーマ変更
```json
// commit-allowlist.json (schema: tri-cert/commit-allowlist@3)
{
  "schema": "tri-cert/commit-allowlist@3",
  "entries": [
    {
      "activation_hash": "sha512:...",
      "student_id_hash": "sha512:...",
      "graduation_year": 2025,  // 新規追加
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### 変更ファイル
| ファイル | 変更内容 |
|---------|---------|
| `/registrations/commit-allowlist.json` | スキーマv3へ更新、`graduation_year`追加 |
| `/verifier-ui/src/utils/registration-checker.ts` | 年度照合ロジック追加 |
| `/verifier-ui/src/app/page.tsx` | 年度照合結果の表示 |
| `/verifier-ui/src/app/components/VerificationResults.tsx` | 年度一致/不一致の表示 |

### 実装詳細

```typescript
// registration-checker.ts
interface AllowlistEntry {
  activation_hash: string;
  student_id_hash: string;
  graduation_year?: number;  // 新規
  created_at: string;
  updated_at: string;
}

interface ActivationHashCheckResult {
  isValid: boolean;
  issuerName?: string;
  issuerId?: string;
  graduationYear?: number;      // 新規
  yearMatchesProof?: boolean;   // 新規：証明の年度と一致するか
  error?: string;
}

export async function verifyProofRegistration(
  registration: ProofRegistration,
  proofGraduationYear?: number  // 新規：証明から抽出した年度
): Promise<ActivationHashCheckResult> {
  // ... 既存の検証ロジック ...
  
  // 年度照合（新規）
  if (entry.graduation_year && proofGraduationYear) {
    result.graduationYear = entry.graduation_year;
    result.yearMatchesProof = entry.graduation_year === proofGraduationYear;
  }
  
  return result;
}
```

### 追加の信頼性評価

**得られる信頼性**: 中程度

| 効果 | 説明 |
|------|------|
| ✅ 年度整合性確認 | 証明の年度と登録情報の年度が一致することを確認可能 |
| ✅ 不正利用検出 | 異なる年度のVKeyで署名された証明書を検出可能 |
| ✅ 監査証跡強化 | 年度情報が記録されることで追跡が容易 |

| 限界 | 説明 |
|------|------|
| ⚠️ 暗号学的強度不変 | ZKP自体の暗号学的強度は変わらない |
| ⚠️ 発行者依存 | 年度情報は発行者が設定するため、発行者の信頼性に依存 |
| ⚠️ メタデータレベル | 暗号学的に年度を証明しているわけではない |

**工数**: 4-6h | **優先度**: 中-高

---

## 実装順序

| 順序 | 改善項目 | 理由 |
|------|---------|------|
| 1 | ダッシュボード改善 | 独立して実装可能、即効性あり |
| 2 | 年度情報の表示 | ユーザー要求の中核、比較的シンプル |
| 3 | 年度紐付けスキーマ拡張 | 他の改善と統合必要 |
| 4 | 抽出データプレビュー | 透明性向上、優先度やや低め |

---

## 総工数見積もり

| 項目 | 工数 |
|------|------|
| 改善1: ダッシュボード | 2-3h |
| 改善2.1: 年度情報表示 | 2-3h |
| 改善2.2: 抽出データプレビュー | 3-4h |
| 改善3: 年度紐付け | 4-6h |
| **合計** | **11-16h** |
