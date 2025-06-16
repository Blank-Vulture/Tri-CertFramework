# 機能要件定義書 (FRD) — 完全版
## 1. 目的
本書は **バックエンドレス型 ZKP‑卒業証書システム** の全機能を初学者でも理解できるよう詳細に定義する。システムは次のビジネスゴールを満たす。

* 学生本人のみが有効な ZKP 証明ファイルを生成できる  
* 検証者はブロックチェーン/NFT と PDF だけで真偽を判定  
* 運用者を信頼の根から排除 (Trustless)

## 2. スコープ
|     | 含む | 含まない |
|-----|------|---------|
| PDF 出力 | 学務基幹システムからの PDF/A‑3 生成 | 基幹システムそのもの |
| 証明生成 | ブラウザ内 Halo 2/WASM で一時 ZKP を作成 | ネイティブ CLI |
| 検証 | ブラウザ UI で ZKP & NFT 照合 | モバイル専用アプリ |
| NFT 管理 | 年度ごと ERC‑721 ミント | 落単者個別 NFT |

## 3. 用語／略語
| 用語 | 定義 |
|------|------|
| **Passkey** | WebAuthn / FIDO2 資格情報【turn0search0】 |
| **Commit** | Poseidon256(pk_passkey) |
| **MerkleRoot** | Poseidon depth‑8 木のルートハッシュ |
| **VK** | Verifying‑Key (Halo 2) |
| **Proof** | Halo 2 生成 ZK‑SNARK |

## 4. アクター
| アクター | 説明 |
|----------|------|
| 学生 | 証明生成・提出 |
| 発行者 | PDF 発行＆NFT ミント |
| 検証者 | PDF 真偽判定 |
| チェーン | Polygon zkEVM Amoy |

## 5. ユースケース
1. **UC‑01 学生登録** – Passkey を生成、公開鍵を大学へ渡す  
2. **UC‑02 PDF 発行** – 学務システムが PDF/A‑3 を生成  
3. **UC‑03 証明生成** – ブラウザで Passkey 署名 → ZKP 生成 → PDF に添付  
4. **UC‑04 証明検証** – 企業が PDF をドラッグ & ドロップし検証  
5. **UC‑05 学年 NFT ミント** – Ledger で署名済み VK を登録

## 6. 機能要件
| 番号 | 要件 | 詳細 |
|------|------|------|
| F‑01 | 証明添付 | PDF EmbeddedFile, Size ≤ 1 MB |
| F‑02 | 本人性保証 | ZKP: ES‑256 署名 + Merkle 包含 |
| F‑03 | 有効期限 | expireTs ≤ 現時刻 ⇒ invalid |
| F‑04 | VK 改竄検出 | Ledger EIP‑191 署名入り |
| F‑05 | オフライン検証 | JS/WASM のみで完結 |
| F‑06 | 量子耐性 | SHA‑3‑512 外部ハッシュ |
| F‑07 | スケーラビリティ | depth‑8 Merkle (256 名の学生) |

## 7. 非機能要件
| 区分 | 指標 | 目標 |
|------|------|------|
| 性能 | Proof 生成 ≤ 5 s | M1/1core |
|      | 検証 ≤ 150 ms | Chrome |
| セキュリティ | 乱数 | salt 128‑bit |
| UX | 証明 UI | JP/EN 切替 |

## 8. 受け入れ基準
* 10 件の E2E テストが全合格  
* Slither & Mythril Critical = 0

## 9. 依存・制約
* Chrome 111+ / Edge 111+  
* pdf-lib@^1.17 with EmbeddedFile  
