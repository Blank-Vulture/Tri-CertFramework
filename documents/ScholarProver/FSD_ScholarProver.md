
# 機能設計書 (FSD) — Scholar Prover  
最終更新: 2025-06-16

## 1. システム構成 (C4 コンテキスト)  
ユーザー → ブラウザ SPA → WebAuthn API / Halo2 WASM / pdf-lib

## 2. UI フロー  
1. PDF ドロップ  
2. 提出先 & 期限入力  
3. [証明生成] ボタンを押下  
4. ダウンロードポップアップ

## 3. ローカル API イベント  
| イベント | データ | 説明 |
|----------|--------|------|
| GET_SIGNATURE | challenge | Passkey 署名取得 |
| PROVE_ZKP | pk,sig,pdfHash | Halo2 証明生成 |
| EMBED_PDF | pdf,proof | pdf-lib attach |

## 4. JSON ヘッダー (proof‑header.json)  
```json
{
 "vkHash":"HEX...",
 "commit":"HEX...",
 "expireTs":1893456000,
 "pdfHash":"HEX..."
}
```

## 5. シーケンス (正常)  
```plantuml
Student -> UI : Drop PDF
UI -> BrowserAPI : getSignature
BrowserAPI -> Student : Touch ID
Student -> BrowserAPI : sig
UI -> Halo2 : prove
Halo2 --> UI : proof.bin
UI -> pdf-lib : embed
UI --> Student : download
```

## 6. エラーコード  
3001 SIGNATURE_ABORT  
3002 PROOF_FAIL  
