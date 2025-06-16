# 技術要件定義書 (TRD) — 完全版
## 1. 暗号プリミティブ
| 項目 | アルゴリズム | 根拠 |
|------|-------------|------|
| 外部ハッシュ | SHA‑3‑512 | FIPS 202【turn0search1】 |
| 内部ハッシュ | Poseidon‑256 | IACR 2019/458【turn0search2】 |
| 署名 | ES‑256 | WebAuthn L2【turn0search0】 |
| Ledger 署名 | EIP‑191 (改良版) | Prefix + Domain【turn0search7】 |

## 2. 回路構成
```
├── es256_verify.gadget
├── poseidon_merkle_depth8.gadget
└── sha3_512_sponge.gadget
```
* 証明サイズ ~45 KB、Prover ≈ 4.2 s@M1  
* Verifier 30 ms (WASM)

## 3. スキーマ
JSON Keys / 型は FRD §6 を参照。

## 4. スマートコントラクト
* YearNFT (ERC‑721): `year ⇒ (vkHash, schemaHash, merkleRoot)`
* vkHash & schemaHash は SHA‑3‑512  
* Function `mintYear(uint16, YearInfo)` onlyOwner  
* ガス見積: デプロイ 0.18 M, mintYear 0.09 M (Amoy)

## 5. インフラ & 開発
| 項目 | 技術 |
|------|------|
| チェーン | Polygon zkEVM Amoy【turn0search4】 |
| ウォレット | Ledger Nano X (VK 署名) |
| フロント | SvelteKit + halo2‑wasm |
| CI/CD | GitHub Actions+PNPM+Rust |

## 6. セキュリティ
* Replay: challenge に salt  
* Malleability: `s < n/2` チェック  
* Supply‑chain: Hash pin `pdf-lib` / `halo2` crates

## 7. テスト計画
1. 改竄 PDF → invalid  
2. 期限切れ → expired  
3. Merkle path 改竄 → invalid  
4. 署名の r,s 値入替 → invalid  

