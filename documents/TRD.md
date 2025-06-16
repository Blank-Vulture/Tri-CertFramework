
# 技術要件定義書 (Technical Requirements Document)

## 1. 暗号プリミティブ
| 項目 | 採用アルゴリズム | 理由 |
|------|-----------------|------|
| 外部ハッシュ | SHA‑3‑512 | 量子下でも 256‑bit 安全 — FIPS 202 【turn0search0】 |
| ZKP 内部ハッシュ | Poseidon‑256 | ZK‑friendly 最小回路 — IACR 2019/458 【turn0search1】 |
| 署名 | ES‑256 (P‑256+SHA‑256) | WebAuthn Level 2 標準 【turn0search3】 |

## 2. ZKP 回路
- **Halo 2** 言語 (Rust) → `halo2_wasm` でブラウザ実行【turn0search2】  
- コンポーネント  
  1. ES‑256 Verify Gadget  
  2. Poseidon Merkle 包含 (depth 8)  
  3. SHA‑3‑512 Sponge (pdfHash / destHash)  

## 3. スキーマ (`proof-schema.json`)
| フィールド | 型 | 説明 |
|------------|----|------|
| `vkHash` | hex‑128 | SHA3‑512(VK) |
| `schemaHash` | hex‑128 | SHA3‑512(schema) |
| `commit` | hex‑64 | Poseidon(pk) |
| `expireTs` | uint64 | 有効期限 |
| `salt` | hex‑32 | 16 B 乱数 |
| `pdfHash` | hex‑128 | SHA3‑512(PDF) |
| `destHash` | hex‑128 | SHA3‑512(dest) |

## 4. NFT コントラクト
- Solidity ^0.8, OpenZeppelin ERC‑721  
- `mintYear(uint16, YearInfo)` で学年 NFT を発行  
```solidity
struct YearInfo {
  bytes32 vkHash;
  bytes32 schemaHash;
  bytes32 merkleRoot;
}
```
- VK 署名は `hash = keccak256("KIC-VK", vkHash, chainId, address(this))` を Ledger で署名しメタデータへ保存【turn0search8】  

## 5. インフラ
| コンポーネント | 技術 | 備考 |
|----------------|------|------|
| テストネット | Polygon zkEVM Amoy Faucet【turn0search5】 | ガス無料 |
| クライアント | SvelteKit + halo2‑wasm | 検証 UI |
| PDF ライブラリ | pdf‑lib / pdfcpu | EmbeddedFile 挿入【turn0search7】 |

## 6. セキュリティ対策
- **Replay 対策**: challenge に `salt` を含め毎回一意  
- **EIP‑191 misuse**: ドメイン区分文字列と `chainId`, コントラクトアドレスをハッシュに含める  
- **Signature malleability**: コントラクト側で `require(s < secp256r1n/2)`  

## 7. 量子耐性考察
- SHA‑3‑512 出力 512 bit → Grover で実効 256 bit【turn0search0】  
- Poseidon 内部は field‑based：量子攻撃で 128‑bit 相当保持  
