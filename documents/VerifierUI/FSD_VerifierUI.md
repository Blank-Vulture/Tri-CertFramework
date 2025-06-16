
# 機能設計書 (FSD) — Verifier UI  
最終更新: 2025-06-16

## 1. C4 コンテキスト  
ユーザー → Verifier SPA → pdf.js / Halo2‑WASM / zkEVM RPC

## 2. UI 要件  
- ドロップゾーン  
- 検証結果カード (色: 緑/赤/黄)  
- JSON ダウンロードボタン  

## 3. イベント API  
| イベント | 入力 | 出力 |
|----------|------|------|
| EXTRACT_PROOF | PDF ArrayBuffer | proofBytes, headerJSON |
| VERIFY_ZKP | proofBytes | status |

## 4. JSON 結果  
```json
{
 "status":"OK",
 "issuerYear":2025,
 "expireTs":1893456000,
 "vkHash":"0x...",
 "pdfHash":"0x..."
}
```

## 5. 詳細シーケンス  
```plantuml
User -> UI : drop PDF
UI -> pdf.js : extract EmbeddedFile 
pdf.js --> UI : proof, header
UI -> zkEVM : eth_call getYearInfo
UI -> Halo2 : verify(proof)
Halo2 --> UI : OK/NG
UI -> User : render result
```

## 6. エラーコード  
4001 INVALID_PROOF 4002 EXPIRED 4003 RPC_FAIL
