# ZK-CertFramework Design System Rules
**Trust Minimized Zero-Knowledge Document Authenticity Framework**

> **AI読み込み用デザインルール** - プロンプトエンジニアリング最適化版  
> Version 2.2 | 最終更新: 2025年6月 | AI開発アシスタント用完全仕様

---

## 🎯 Design System Core Philosophy

### Trust Minimization Design Principles
**すべてのデザイン決定は「Trust Minimization（信頼最小化）」原則に基づく**

```yaml
Core Values:
  - User Control: ユーザーが完全制御権を持つ
  - Transparency: すべての処理が可視化・検証可能
  - Security First: セキュリティが最優先事項
  - Offline First: 外部依存なしで完全動作
  - Hardware Trust: 物理的セキュリティデバイス依存
```

### Design Language Hierarchy
```
1. Security & Trust Indicators (最重要)
2. User Control & Feedback (重要)  
3. Visual Consistency (標準)
4. Aesthetic Enhancement (補助)
```

---

## 🏗️ Component Architecture Design Rules

### Four-System Visual Identity
各システムは**独立したアイデンティティ**を持ちながら**統一されたデザイン言語**を共有

| システム | プライマリカラー | 象徴的アイコン | UI特性 |
|---------|---------------|-------------|--------|
| **Scholar Prover PWA** | `#2563EB` (Blue) | 🎓 Graduation | Consumer-friendly, Mobile-first |
| **Executive Console** | `#DC2626` (Red) | 🏛️ Institution | Enterprise, Security-focused |
| **Registrar Console** | `#059669` (Green) | 📋 Management | Administrative, Efficient |
| **Verifier UI** | `#7C3AED` (Purple) | ✅ Verification | Clean, Minimal, Fast |

---

## 🎨 Visual Design Foundation

### Color System (セキュリティ重視パレット)

#### Primary Colors
```css
/* Trust Indicators */
--color-trust-high: #10B981;     /* Verified/Secure状態 */
--color-trust-medium: #F59E0B;   /* Pending/Warning状態 */
--color-trust-low: #EF4444;      /* Error/Insecure状態 */
--color-trust-unknown: #6B7280;  /* Unknown/Loading状態 */

/* System Colors */
--color-scholar: #2563EB;        /* Scholar Prover */
--color-executive: #DC2626;      /* Executive Console */
--color-registrar: #059669;      /* Registrar Console */
--color-verifier: #7C3AED;       /* Verifier UI */

/* Neutral Foundation */
--color-background: #FFFFFF;
--color-background-secondary: #F9FAFB;
--color-background-tertiary: #F3F4F6;
--color-text-primary: #111827;
--color-text-secondary: #6B7280;
--color-text-tertiary: #9CA3AF;
```

#### Security State Colors
```css
/* Hardware Security States */
--color-ledger-connected: #10B981;
--color-ledger-disconnected: #EF4444;
--color-ledger-signing: #F59E0B;

/* ZKP Process States */
--color-proof-generating: #F59E0B;
--color-proof-valid: #10B981;
--color-proof-invalid: #EF4444;
--color-proof-expired: #6B7280;

/* QR Code States */
--color-qr-scanning: #2563EB;
--color-qr-success: #10B981;
--color-qr-error: #EF4444;
```

#### Dark Mode Adaptation
```css
/* Dark Mode Support (全システム対応) */
[data-theme="dark"] {
  --color-background: #0F172A;
  --color-background-secondary: #1E293B;
  --color-background-tertiary: #334155;
  --color-text-primary: #F8FAFC;
  --color-text-secondary: #CBD5E1;
  --color-text-tertiary: #64748B;
}
```

### Typography System

#### Font Hierarchy
```css
/* Primary Font Stack (システム全体) */
--font-family-primary: 
  "Inter", 
  "SF Pro Display", 
  -apple-system, 
  BlinkMacSystemFont, 
  "Segoe UI", 
  "Roboto", 
  sans-serif;

/* Monospace Font (コード・ハッシュ表示用) */
--font-family-mono: 
  "SF Mono", 
  "Monaco", 
  "Inconsolata", 
  "Roboto Mono", 
  monospace;

/* Font Weights */
--font-weight-light: 300;
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

#### Type Scale (Material Design 3ベース)
```css
/* Heading Scale */
--text-display-large: 57px/64px, weight: 400;
--text-display-medium: 45px/52px, weight: 400;
--text-display-small: 36px/44px, weight: 400;

--text-headline-large: 32px/40px, weight: 400;
--text-headline-medium: 28px/36px, weight: 400;
--text-headline-small: 24px/32px, weight: 400;

--text-title-large: 22px/28px, weight: 400;
--text-title-medium: 16px/24px, weight: 500;
--text-title-small: 14px/20px, weight: 500;

/* Body Scale */
--text-body-large: 16px/24px, weight: 400;
--text-body-medium: 14px/20px, weight: 400;
--text-body-small: 12px/16px, weight: 400;

/* Label Scale */
--text-label-large: 14px/20px, weight: 500;
--text-label-medium: 12px/16px, weight: 500;
--text-label-small: 11px/16px, weight: 500;
```

### Spacing System (8pt Grid)

#### Base Spacing Scale
```css
/* 8pt Grid System (Apple HIG準拠) */
--space-0: 0px;
--space-1: 4px;      /* 0.5 × base */
--space-2: 8px;      /* 1 × base */
--space-3: 12px;     /* 1.5 × base */
--space-4: 16px;     /* 2 × base */
--space-5: 20px;     /* 2.5 × base */
--space-6: 24px;     /* 3 × base */
--space-8: 32px;     /* 4 × base */
--space-10: 40px;    /* 5 × base */
--space-12: 48px;    /* 6 × base */
--space-16: 64px;    /* 8 × base */
--space-20: 80px;    /* 10 × base */
--space-24: 96px;    /* 12 × base */
```

#### Component Spacing Rules
```css
/* Card Padding */
--card-padding-sm: var(--space-4);   /* 16px */
--card-padding-md: var(--space-6);   /* 24px */
--card-padding-lg: var(--space-8);   /* 32px */

/* Form Spacing */
--form-item-gap: var(--space-4);     /* 16px */
--form-section-gap: var(--space-8);  /* 32px */

/* Button Padding */
--button-padding-sm: var(--space-2) var(--space-3);  /* 8px 12px */
--button-padding-md: var(--space-3) var(--space-4);  /* 12px 16px */
--button-padding-lg: var(--space-4) var(--space-6);  /* 16px 24px */
```

---

## 🧩 Component Library Standards

### Button System

#### Button Hierarchy
```css
/* Primary Actions (高優先度) */
.btn-primary {
  background: var(--color-system-primary);
  color: white;
  /* Ledger署名、ZKP生成など重要な操作 */
}

/* Secondary Actions (中優先度) */
.btn-secondary {
  background: transparent;
  border: 1px solid var(--color-system-primary);
  color: var(--color-system-primary);
  /* キャンセル、リセットなど */
}

/* Destructive Actions (破壊的操作) */
.btn-destructive {
  background: var(--color-trust-low);
  color: white;
  /* 削除、リセットなど */
}

/* Hardware Security Button (特別カテゴリ) */
.btn-hardware {
  background: linear-gradient(135deg, #1e3a8a, #3730a3);
  border: 2px solid var(--color-ledger-connected);
  /* Ledger操作専用ボタン */
}
```

#### Security State Indicators
```css
/* Security State Button Modifiers */
.btn--secure::before {
  content: "🔒";
  margin-right: var(--space-2);
}

.btn--hardware-required::before {
  content: "🔑";
  margin-right: var(--space-2);
}

.btn--zk-proof::before {
  content: "⚡";
  margin-right: var(--space-2);
}
```

### Form System

#### Input Components
```css
/* Standard Input */
.input-field {
  border: 1px solid var(--color-text-tertiary);
  border-radius: 8px;
  padding: var(--space-3);
  transition: border-color 0.2s ease;
}

.input-field:focus {
  border-color: var(--color-system-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-system-primary) 20%, transparent);
}

/* Secure Input (パスフレーズ等) */
.input-secure {
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border: 2px solid var(--color-trust-high);
}

/* Hash Display Input (読み取り専用) */
.input-hash {
  font-family: var(--font-family-mono);
  background: var(--color-background-tertiary);
  border: 1px dashed var(--color-text-tertiary);
}
```

#### Validation States
```css
/* Success State */
.input--success {
  border-color: var(--color-trust-high);
}

/* Error State */
.input--error {
  border-color: var(--color-trust-low);
}

/* Warning State */
.input--warning {
  border-color: var(--color-trust-medium);
}
```

### Card System

#### Card Hierarchy
```css
/* Basic Card */
.card {
  background: var(--color-background);
  border: 1px solid var(--color-background-tertiary);
  border-radius: 12px;
  padding: var(--card-padding-md);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Security Card (重要な情報表示) */
.card--security {
  border: 2px solid var(--color-trust-high);
  background: linear-gradient(135deg, #f0fdf4, #f7fee7);
}

/* Warning Card */
.card--warning {
  border: 2px solid var(--color-trust-medium);
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
}

/* Error Card */
.card--error {
  border: 2px solid var(--color-trust-low);
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
}
```

---

## 🔐 Security-First UX Patterns

### Trust Indicators Design

#### Hardware Security Status
```typescript
// Ledger Connection状態の視覚表現
interface LedgerStatus {
  connected: {
    icon: "🔗";
    color: "var(--color-ledger-connected)";
    label: "Ledger Connected";
    description: "Hardware security active";
  };
  disconnected: {
    icon: "⚠️";
    color: "var(--color-ledger-disconnected)";
    label: "Ledger Required";
    description: "Connect your Ledger Nano X";
  };
  signing: {
    icon: "✍️";
    color: "var(--color-ledger-signing)";
    label: "Confirm on Device";
    description: "Check your Ledger screen";
  };
}
```

#### ZKP Process Visualization
```css
/* ZKP生成プロセスの段階的表示 */
.zkp-progress {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.zkp-step {
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  border-radius: 20px;
  background: var(--color-background-secondary);
}

.zkp-step--active {
  background: var(--color-trust-medium);
  color: white;
}

.zkp-step--completed {
  background: var(--color-trust-high);
  color: white;
}
```

### Error Handling & Feedback

#### Error State Hierarchy
```css
/* Critical Error (システム機能に影響) */
.alert--critical {
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
  border: 2px solid var(--color-trust-low);
  border-left: 6px solid var(--color-trust-low);
}

/* Warning (注意喚起) */
.alert--warning {
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  border: 2px solid var(--color-trust-medium);
  border-left: 6px solid var(--color-trust-medium);
}

/* Info (情報提供) */
.alert--info {
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border: 2px solid var(--color-scholar);
  border-left: 6px solid var(--color-scholar);
}

/* Success (成功通知) */
.alert--success {
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border: 2px solid var(--color-trust-high);
  border-left: 6px solid var(--color-trust-high);
}
```

---

## 📱 Responsive Design Rules

### Breakpoint System
```css
/* Mobile First Approach */
--breakpoint-sm: 640px;   /* タブレット縦 */
--breakpoint-md: 768px;   /* タブレット横 */
--breakpoint-lg: 1024px;  /* デスクトップ */
--breakpoint-xl: 1280px;  /* 大型デスクトップ */
--breakpoint-2xl: 1536px; /* ウルトラワイド */
```

### Component Responsive Behavior
```css
/* Card Grid Responsive */
.card-grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .card-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Navigation Responsive */
.nav-desktop {
  display: none;
}

@media (min-width: 768px) {
  .nav-desktop {
    display: flex;
  }
  
  .nav-mobile {
    display: none;
  }
}
```

---

## 🎭 Component-Specific Design Rules

### 1. Scholar Prover PWA Design Rules

#### Consumer-Friendly Interface
```css
/* PWA特化のデザイン要素 */
.scholar-interface {
  /* モバイルファースト */
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  
  /* 大きなタッチターゲット */
  min-height: 44px;
  min-width: 44px;
}

/* ドラッグ&ドロップエリア */
.pdf-drop-zone {
  border: 2px dashed var(--color-scholar);
  border-radius: 12px;
  padding: var(--space-8);
  text-align: center;
  transition: all 0.3s ease;
}

.pdf-drop-zone--active {
  border-style: solid;
  background: color-mix(in srgb, var(--color-scholar) 5%, transparent);
}
```

#### WebAuthn Interface
```css
/* Passkey登録インターフェース */
.passkey-setup {
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border: 2px solid var(--color-scholar);
  border-radius: 16px;
  padding: var(--space-6);
}

.passkey-button {
  background: linear-gradient(135deg, var(--color-scholar), #1d4ed8);
  color: white;
  border: none;
  border-radius: 8px;
  padding: var(--space-4) var(--space-6);
  font-weight: var(--font-weight-medium);
}
```

### 2. Executive Console Design Rules

#### Enterprise Security Interface
```css
/* Enterprise級のセキュリティ表示 */
.executive-interface {
  background: var(--color-background);
  min-height: 100vh;
}

/* Ledger Integration Panel */
.ledger-panel {
  background: linear-gradient(135deg, #1e3a8a, #1e40af);
  color: white;
  border-radius: 12px;
  padding: var(--space-6);
  margin-bottom: var(--space-6);
}

.ledger-status {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-weight: var(--font-weight-semibold);
}

/* Circuit Deployment Interface */
.deployment-steps {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.deployment-step {
  display: flex;
  align-items: center;
  padding: var(--space-4);
  border: 1px solid var(--color-background-tertiary);
  border-radius: 8px;
}

.deployment-step--completed {
  background: var(--color-trust-high);
  color: white;
}
```

### 3. Registrar Console Design Rules

#### Administrative Efficiency Interface
```css
/* 管理者向け効率重視インターフェース */
.registrar-interface {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: var(--space-6);
  min-height: 100vh;
}

/* Sidebar Navigation */
.registrar-sidebar {
  background: var(--color-background-secondary);
  padding: var(--space-6);
  border-right: 1px solid var(--color-background-tertiary);
}

/* QR Scanner Interface */
.qr-scanner {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 1;
  background: #000;
}

.qr-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  border: 2px solid var(--color-registrar);
  border-radius: 8px;
}

/* Data Management Tables */
.data-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-background);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.data-table th {
  background: var(--color-background-secondary);
  padding: var(--space-3);
  text-align: left;
  font-weight: var(--font-weight-semibold);
}

.data-table td {
  padding: var(--space-3);
  border-top: 1px solid var(--color-background-tertiary);
}
```

### 4. Verifier UI Design Rules

#### Minimal Verification Interface
```css
/* 検証者向けミニマルインターフェース */
.verifier-interface {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-6);
}

/* Verification Drop Zone */
.verify-drop-zone {
  border: 3px dashed var(--color-verifier);
  border-radius: 16px;
  padding: var(--space-12);
  text-align: center;
  margin-bottom: var(--space-8);
  transition: all 0.3s ease;
}

.verify-drop-zone--active {
  border-style: solid;
  background: color-mix(in srgb, var(--color-verifier) 5%, transparent);
  transform: scale(1.02);
}

/* Verification Results */
.verification-result {
  padding: var(--space-6);
  border-radius: 12px;
  text-align: center;
}

.verification-result--valid {
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border: 2px solid var(--color-trust-high);
}

.verification-result--invalid {
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
  border: 2px solid var(--color-trust-low);
}

.verification-result--expired {
  background: linear-gradient(135deg, #f9fafb, #f3f4f6);
  border: 2px solid var(--color-trust-unknown);
}
```

---

## ♿ Accessibility & Inclusivity Standards

### WCAG 2.1 AA準拠要件

#### Color Contrast Requirements
```css
/* 最小コントラスト比 4.5:1 */
--color-contrast-normal: 4.5;   /* 通常テキスト */
--color-contrast-large: 3.0;    /* 大きいテキスト (18pt+) */

/* 色だけに依存しない情報伝達 */
.status-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.status-indicator::before {
  content: attr(data-icon);
  font-size: 1.2em;
}
```

#### Keyboard Navigation
```css
/* フォーカス表示の強化 */
:focus-visible {
  outline: 3px solid var(--color-system-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/* スキップリンク */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--color-system-primary);
  color: white;
  padding: 8px;
  text-decoration: none;
  border-radius: 4px;
  z-index: 1000;
}

.skip-link:focus {
  top: 6px;
}
```

#### Screen Reader Support
```css
/* スクリーンリーダー専用テキスト */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ARIAラベルの視覚的表現 */
[aria-pressed="true"] {
  background: var(--color-system-primary);
  color: white;
}

[aria-expanded="true"] .chevron {
  transform: rotate(180deg);
}
```

---

## 🎬 Animation & Interaction Guidelines

### Micro-interactions
```css
/* 基本トランジション */
.transition-base {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ホバー効果 */
.interactive:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* ボタンプレス効果 */
.button:active {
  transform: scale(0.98);
}

/* Loading アニメーション */
.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### Security Process Animations
```css
/* ZKP生成プロセス */
.zkp-generating {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Ledger接続状態 */
.ledger-connecting {
  animation: breathe 3s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

### Reduced Motion Support
```css
/* motion減少の配慮 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 🎯 AI Development Assistant Integration

### Prompt-Optimized Design Tokens
```typescript
// AI読み込み用設計トークン
export const DESIGN_TOKENS = {
  // 必ず使用すべき値
  REQUIRED: {
    colors: {
      trust: {
        high: '#10B981',      // 検証済み・安全
        medium: '#F59E0B',    // 警告・保留
        low: '#EF4444',       // エラー・危険
        unknown: '#6B7280',   // 不明・読み込み中
      },
      system: {
        scholar: '#2563EB',   // Scholar Prover PWA
        executive: '#DC2626', // Executive Console  
        registrar: '#059669', // Registrar Console
        verifier: '#7C3AED',  // Verifier UI
      },
    },
    spacing: {
      base: 8,              // 8pt grid base
      component: 16,        // コンポーネント内余白
      section: 32,          // セクション間隔
    },
    typography: {
      scale: 1.25,          // Type scale ratio
      lineHeight: 1.5,      // Base line height
    },
  },
  
  // コンポーネント別推奨値
  COMPONENTS: {
    button: {
      minHeight: 44,        // タッチターゲット
      padding: '12px 16px', // 標準パディング
      borderRadius: 8,      // 角丸
    },
    card: {
      padding: 24,          // 内側余白
      borderRadius: 12,     // 角丸
      shadow: '0 1px 3px rgba(0, 0, 0, 0.1)', // 影
    },
    form: {
      fieldGap: 16,         // フィールド間隔
      sectionGap: 32,       // セクション間隔
    },
  },
} as const;
```

### Component Generation Templates
```typescript
// AI用コンポーネントテンプレート
interface SecurityComponentProps {
  variant: 'trust-high' | 'trust-medium' | 'trust-low' | 'trust-unknown';
  system: 'scholar' | 'executive' | 'registrar' | 'verifier';
  size: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  isSecure?: boolean;
  requiresHardware?: boolean;
}

// 使用例：AI指示用
/*
SecurityButton生成時の必須指示:
1. variant は trust レベルに応じて選択
2. system は対象システムに応じて選択  
3. requiresHardware=true の場合は Ledger アイコン追加
4. isLoading=true の場合はスピナー表示
5. アクセシビリティ属性を必ず含める
*/
```

---

## 🏆 Success Metrics & Quality Gates

### Design Quality Checklist
```yaml
Visual Consistency:
  - [ ] 全システムで統一された色使用
  - [ ] 8pt gridに準拠したスペーシング
  - [ ] タイポグラフィスケールの一貫性
  - [ ] コンポーネントライブラリからの選択

Security UX:
  - [ ] Trust Minimization原則の視覚的表現
  - [ ] ハードウェアセキュリティ状態の明確な表示
  - [ ] ZKPプロセスの段階的フィードバック
  - [ ] エラー状態の適切な分類と表示

Accessibility:
  - [ ] WCAG 2.1 AA準拠
  - [ ] キーボードナビゲーション対応
  - [ ] スクリーンリーダー対応
  - [ ] 色覚多様性への配慮

Performance:
  - [ ] CSSバンドルサイズ最適化
  - [ ] クリティカルCSSの分離
  - [ ] アニメーション性能の確認
  - [ ] モバイル最適化
```

### Design Review Process
```typescript
// AIコードレビュー用チェックポイント
export const DESIGN_REVIEW_CRITERIA = {
  // 必須チェック項目
  CRITICAL: [
    'セキュリティ状態が明確に表示されているか',
    'Trust Minimization原則に従っているか', 
    'ハードウェア要件が適切に表示されているか',
    'エラー状態が適切に分類されているか',
  ],
  
  // 推奨チェック項目
  RECOMMENDED: [
    'デザイントークンを正しく使用しているか',
    'レスポンシブデザインに対応しているか',
    'アクセシビリティ要件を満たしているか',
    'アニメーションが適切に実装されているか',
  ],
  
  // 最適化項目
  OPTIMIZATION: [
    'パフォーマンスが最適化されているか',
    'バンドルサイズが適切か',
    '再利用可能なコンポーネントになっているか',
    '国際化対応ができているか',
  ],
} as const;
```

---

## 📚 References & Resources

### Design System References
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) - iOS/macOS design principles
- [Material Design 3](https://m3.material.io/) - Google's design system
- [Cloudscape Design](https://cloudscape.design/) - AWS enterprise design system  
- [Fluent 2](https://fluent2.microsoft.design/) - Microsoft's modern design system
- [The Design System Guide](https://thedesignsystem.guide/) - Comprehensive design system resources
- [Nielsen Norman Group Design Systems](https://www.nngroup.com/articles/design-systems-vs-style-guides/) - UX research and guidelines

### Technical Implementation
- CSS Grid Layout
- CSS Custom Properties (CSS Variables)
- Container Queries
- Web Components
- CSS-in-JS solutions
- Design Tokens format

---

**このDESIGN_RULE.mdは、AI開発アシスタントが最大限のパフォーマンスを発揮し、Trust Minimizedな高品質UIを構築するための完全な指針です。全ての設計決定は、セキュリティファースト、ユーザーコントロール、そして検証可能性の原則に基づいています。** 