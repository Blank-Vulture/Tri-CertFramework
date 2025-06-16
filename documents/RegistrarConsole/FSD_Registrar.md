
# 機能設計書 (FSD) — Registrar Console  
最終更新: 2025-06-16

## 1. システムコンテキスト (C4)  
C4 System Context 図: 学務事務員 → Registrar UI → Backend → zkEVM → PDF Generator  

## 2. 主要画面  
### 公開鍵取込み  
- ファイル選択  
- 行毎バリデーション  
### PDF 発行  
- 確認ボタン  
- プログレスバー  

## 3. API  
`POST /keys/import` → CSV/JSON {"count":n}  
`POST /pdf/batch` → {"year":2025}  

## 4. データ辞書  
`pk` = COSE_Key Base64 (WebAuthn L2)  

## 5. 詳細シーケンス (Root 更新)  
1. 事務員 UI で「更新」押下  
2. Backend が commits 取得 → Poseidon で depth8 木計算  
3. newRoot を YearNFT に送信 (RPC)  
4. zkEVM returns txHash → UI success  

## 6. エラーコード  
2001 INVALID_CSV 2002 MERKLE_TOO_LARGE 2003 TX_FAILED  

