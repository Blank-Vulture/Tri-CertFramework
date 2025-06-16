
# 技術設計書 (TSD) — Executive Console  
最終更新: 2025-06-16

---

## 1. 技術スタック
| 層 | 技術 |
|----|------|
| フロント | Next.js + Tailwind |
| Ledger 通信 | @ledgerhq/hw-transport-webhid  |
| バックエンド | FastAPI + python-keccak |
| チェーン | Polygon zkEVM Amoy |

## 2. 暗号処理
- VK ハッシュ: `sha3_512(vkBytes)`   
- Ledger 署名: `personal_sign` (EIP‑191)   
- 回路ファイル検査: Poseidon パラメータが IACR 2019/458 推奨値か確認 

## 3. コントラクト ABI 断片
```solidity
event YearMinted(uint16 indexed year, uint256 tokenId);
function mintYear(uint16 y, bytes32 vkHash, bytes32 schemaHash,
                  bytes32 merkleRoot, bytes calldata sig) external;
```

## 4. セキュリティ対策
| 脅威 | 制御策 |
|------|--------|
| 署名使い回し | msg に chainId & contract address を含める |
| 回路偽装 | SHA3‑512 衝突耐性 >2²⁵⁶ |

## 5. CI/CD
- Husky pre‑commit ⇒ ESLint  
- GitHub Actions: pytest → Hardhat → Lighthouse  

## 6. 運用
- Ledger PIN & 24 単語は耐火金庫保管  
- ガス残高監視アラート (Prometheus)
