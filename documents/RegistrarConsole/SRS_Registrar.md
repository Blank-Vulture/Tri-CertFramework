
# 要件定義書 (SRS) — Registrar Console  
**zk‑CertFramework / 発行者システム** 最終更新: 2025-06-16

## 1. 目的  
Registrar Console は学務・事務員の業務フローを支援し、学生 Passkey 公開鍵をもとに Poseidon Markle Treeを生成して YearNFT に登録し、PDF/A‑3 卒業証書を一括生成する。これにより、ZKP 証明生成フェーズの前提データを整合的に提供する。

## 2. スコープ  
| 含む | 含まれない |
|------|------------|
| 公開鍵インポート (CSV/JSON) | Passkey UI (Student Prover) |
| Poseidon MerkleRoot 計算 | ハッシュアルゴリズム変更 |
| YearNFT merkleRoot 更新 | NFT ミント (Executive Console) |
| PDF/A‑3 出力 | PDF 電子署名 |

## 3. 用語  
- **Poseidon256**: ZK 向けハッシュ関数  
- **PDF/A‑3**: 任意ファイル埋込可能な長期保存形式citeturn0search2turn0search10  

## 4. ユースケース  
UC‑RG‑01 公開鍵取込み → UC‑RG‑02 PDF 発行 → UC‑RG‑03 MerkleRoot 更新  
詳細は FSD 参照。

## 5. 機能要求  
FR‑RG‑01 CSV/JSON 取込み  
FR‑RG‑02 PDF/A‑3 出力 (1 通 ≤0.5 s)  
FR‑RG‑03 Poseidon MerkleDepth8 計算  
FR‑RG‑04 YearNFT ルート更新トランザクション (成功イベント確認)

## 6. 非機能要求  
- 可用性 99.9 %  
- データ整合性: ハッシュ衝突確率 <2⁻¹²⁸  

## 7. 受入基準  
E2E テスト Pass、YearNFT `MerkleRootUpdated` イベント発火を Etherscan で確認

