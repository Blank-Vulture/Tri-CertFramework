# Tri-CertFramework Phase 0 Demo Guide

## 概要
この文書は、Tri-CertFramework Phase 0プロトタイプの5分間デモ手順です。

### デモの流れ
1. **Scholar Prover**: PDFにZKP証明と電子署名を添付
2. **Verifier UI**: 添付されたPDFの証明と署名を検証
3. **結果表示**: 検証結果の確認

---

## 事前準備（デモ実行前）

### 1. 必要ファイルの確認
```bash
# プロジェクトルートで実行
ls circuits/vkey.json                    # 検証鍵
ls circuits/commitment_0001.zkey         # ZKP生成鍵  
ls prover/public/vkey.json              # Prover用VKey
ls prover/public/commitment_0001.zkey   # Prover用ZKey
ls test-sample.pdf                      # テスト用PDF
```

### 2. 依存関係の確認
```bash
# 各ディレクトリで依存関係をチェック
cd prover && npm list
cd ../verifier-ui && npm list
cd ../scripts && npm list
```

---

## 5分間デモ手順

### Phase 1: Scholar Prover（2分）

#### 1-1. Proverアプリケーション起動
```bash
cd prover
npm run dev
```
→ http://localhost:3000 にアクセス

#### 1-2. PDF証明生成デモ
1. **PDFアップロード**
   - `test-sample.pdf`をドラッグ&ドロップ
   - ファイルサイズ確認（数KB程度）

2. **秘密値入力**
   - "Owner Secret"欄に「demo-secret-2024」と入力

3. **証明生成実行**
   - "Generate Proof & Sign"ボタンをクリック
   - 処理状況の表示を確認：
     - "Processing PDF..." 
     - "Calculating PDF hash..."
     - "Generating zero-knowledge proof..."
     - "Creating digital signature..."
     - "Creating output PDF..."
     - "Complete!"

4. **結果ファイルダウンロード**
   - "Secured PDF"で証明付きPDFを取得
   - "ZK Proof"でproof.jsonを取得
   - "Verify Key"でvkey.jsonを取得
   - "Public Key"でwebauthn_pub.jwk.jsonを取得
   - "Signature"でwebauthn_sig.jsonを取得
   - "Sig Target"でsig_target.jsonを取得

### Phase 2: Verifier UI（2分）

#### 2-1. Verifierアプリケーション起動
```bash
cd ../verifier-ui
npm run dev
```
→ http://localhost:3001 にアクセス

#### 2-2. PDF検証デモ
1. **PDFアップロード**
   - Phase 1でダウンロードしたPDFファイルをアップロード

2. **検証鍵設定（任意）**
   - 検証鍵ファイルをアップロード（PDFに埋め込まれているため省略可能）

3. **検証実行**
   - "Verify PDF"ボタンをクリック
   - 検証処理の実行

4. **結果確認**
   - ✅ Zero-Knowledge Proof: Valid
   - ✅ Digital Signature: Valid  
   - ✅ PDF Hash Integrity: PDF hash matches
   - ✅ Verification Key Hash: VKey hash matches
   - 全体結果: "Verification Successful"

### Phase 3: 改ざん検出デモ（1分）

#### 3-1. 改ざんPDFの作成
```bash
# 元のPDFをコピーして1バイト変更
cd ..
cp test-sample.pdf test-modified.pdf
echo "Modified" >> test-modified.pdf
```

#### 3-2. 改ざん検出の確認
1. **改ざんPDFの検証**
   - `test-modified.pdf`をVerifier UIにアップロード
   - 検証実行

2. **失敗結果の確認**
   - ❌ PDF Hash Integrity: PDF hash mismatch
   - 全体結果: "Verification Failed"

---

## デモ中のポイント

### 技術的ハイライト
1. **Zero-Knowledge Proof**
   - Circom + snarkjsによる証明生成
   - Poseidonハッシュによる効率的な計算

2. **電子署名**
   - WebAuthn ES256による署名（アサーション）
   - webauthn_sig.json（署名データ）/ webauthn_pub.jwk.json（公開鍵）として格納

3. **PDF統合**
   - PDF/A-3準拠の添付ファイル機能
   - メタデータ形式での証明保存

4. **セキュリティ**
   - PDF本文ハッシュによる改ざん検出
   - VKハッシュによるすり替え防止

### Phase 0の制約事項
- WebAuthn署名は実装済み（アサーション検証を含む）
- pdfcpuによる本格的な添付は後続フェーズ
- 回路の最適化は今後の改善事項

---

## トラブルシューティング

### 一般的な問題
1. **ポート競合**: 3000/3001が使用中の場合は別ポートを使用
2. **依存関係エラー**: `npm install`を再実行
3. **ファイル見つからず**: パスと存在を確認

### デバッグ用コマンド
```bash
# PDF処理テスト
cd scripts
npx ts-node hash-pdf.ts ../test-sample.pdf

# 統合テスト実行  
npx ts-node integration-test.ts

# プロジェクト構造確認
cd ..
tree -I 'node_modules|.git'
```

---

## デモ完了後のフォローアップ

### 受け入れ基準の確認
- [x] 同一PDF: ZKP/署名とも成功
- [x] 1バイト改変: 失敗（ハッシュ不一致）
- [x] 添付横流し: 失敗（Phase 0では模擬）
- [x] VKすり替え: 失敗（ハッシュ検証）

### 次のステップ
- Phase 1: ブロックチェーン統合
- Phase 2: 本格的なPAdES署名統合
- 性能最適化とセキュリティ監査
