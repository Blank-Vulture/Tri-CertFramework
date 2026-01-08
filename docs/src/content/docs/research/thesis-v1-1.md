---
title: "修士論文 v1.1"
description: "文書の真正性検証フレームワークの設計と実装 - ゼロ知識証明を用いた分散型証明システム Tri-CertFramework（v1.1）"
tableOfContents:
  minHeadingLevel: 2
  maxHeadingLevel: 3
sidebar:
  badge:
    text: "過去版"
    variant: "caution"
---

:::caution[過去バージョン]
これは過去バージョン（v1.1）です。最新版は [v1.11](./thesis-v1-11/) をご覧ください。
:::

# 修士論文

## 文書の真正性検証フレームワークの設計と実装
### ゼロ知識証明を用いた分散型証明システム Tri-CertFramework

神戸情報大学院大学
情報技術研究科 情報システム専攻

学籍番号：24024
氏名：白石鷹也

提出日：2026年2月6日

---

# 目次

- [第1章 序論](#第1章-序論)
  - [1.1 研究の背景](#11-研究の背景)
  - [1.2 真正性検証とは](#12-真正性検証とは)
  - [1.3 現在の真正性検証が抱える課題](#13-現在の真正性検証が抱える課題)
  - [1.4 本研究の目的と対象領域](#14-本研究の目的と対象領域)
  - [1.5 本論文の構成](#15-本論文の構成)
- [第2章 先行研究と技術基盤](#第2章-先行研究と技術基盤)
  - [2.1 デジタル証明書の現状](#21-デジタル証明書の現状)
  - [2.2 ゼロ知識証明（ZKP）](#22-ゼロ知識証明zkp)
  - [2.3 WebAuthn と FIDO2](#23-webauthn-と-fido2)
  - [2.4 関連研究](#24-関連研究)
- [第3章 システム設計と実装](#第3章-システム設計と実装)
  - [3.1 設計思想とアーキテクチャ](#31-設計思想とアーキテクチャ)
  - [3.2 Registrar Console](#32-registrar-console)
  - [3.3 Executive Console](#33-executive-console)
  - [3.4 Prover（証明生成UI）](#34-prover証明生成ui)
  - [3.5 Verifier UI（検証UI）](#35-verifier-ui検証ui)
  - [3.6 データ構造とプロトコル](#36-データ構造とプロトコル)
- [第4章 検証](#第4章-検証)
  - [4.1 検証方法](#41-検証方法)
  - [4.2 検証結果](#42-検証結果)
  - [4.3 セキュリティ評価](#43-セキュリティ評価)
  - [4.4 既存手法との比較](#44-既存手法との比較)
- [第5章 考察](#第5章-考察)
  - [5.1 プライバシー保護の観点](#51-プライバシー保護の観点)
  - [5.2 運用面での考慮事項](#52-運用面での考慮事項)
  - [5.3 応用可能性と社会的意義](#53-応用可能性と社会的意義)
- [第6章 結論と今後の課題](#第6章-結論と今後の課題)
  - [6.1 結論](#61-結論)
  - [6.2 本研究の貢献](#62-本研究の貢献)
  - [6.3 今後の課題と展望](#63-今後の課題と展望)
- [謝辞](#謝辞)
- [参考文献](#参考文献)

---

# 第1章 序論

## 1.1 研究の背景

私たちの社会は、様々な「文書」の信頼性に支えられている。企業間の契約書、行政機関が発行する戸籍謄本や住民票、医療機関の診断書、教育機関の卒業証明書など、これらの重要書類は社会生活の基盤として機能している。

しかしながら、これら重要書類の真正性を担保する現在の方法には、深刻な信頼性の問題がある。2024年から2025年にかけて、静岡県伊東市長の学歴詐称疑惑や、東京都知事のカイロ大学卒業疑惑が再燃するなど、学歴証明の信頼性に関する社会問題が連日報道された [1][2]。これらの事例は、現代の印刷技術では目視での真偽判定が極めて困難であり、卒業証書を提示しても疑惑が晴れないケースがあることを示している。

また、朝日新聞の報道によれば、採用時に候補者の経歴を確認する「リファレンスチェック」を行う企業が急増している [1]。これは、従来の証明書提示だけでは信頼性が不十分であることの裏返しでもある。

このような状況は学歴証明に限った話ではない。企業の重要書類（契約書、決算報告書など）の改竄、行政文書の偽造、医療資格の詐称など、文書の真正性に関わる問題は社会の様々な場面で発生している。デジタル化が進む現代において、「その文書・ファイルが正式なものであるか」を確実に検証できる仕組みの構築は、社会全体の喫緊の課題となっている。

## 1.2 真正性検証とは

本研究における「真正性検証」とは、以下の3つの要素を確認するプロセスを指す：

1. **発行元の正当性**: その文書が、正当な権限を持つ機関・個人によって発行されたものであるか
2. **内容の完全性**: その文書が発行後に改竄されていないか
3. **所有者の本人性**: その文書を提示している人物が、正当な所有者本人であるか

<pre class="mermaid">
flowchart TD
    subgraph Validation ["真正性検証の3要素"]
        direction TB
        A["発行元の正当性<br>（誰が作ったか）"]
        B["内容の完全性<br>（書き換えられていないか）"]
        C["所有者の本人性<br>（この人のものか）"]
    end

    D["真正性が証明済みの文書"]

    A --> D
    B --> D
    C --> D
</pre>

**図1.1: 真正性検証の3要素**

従来、これらの検証は物理的な手段（印影、透かし、特殊インク等）や、発行機関への直接照会によって行われてきた。しかし、デジタル化の進展により、これらの従来手法は限界を迎えつつある。

## 1.3 現在の真正性検証が抱える課題

現在の真正性検証方法には、以下の3つの主要な課題がある：

### 1.3.1 課題1: 真正性の担保が脆弱

現代の印刷技術やデジタル編集技術の発達により、文書の偽造は年々容易になっている。高品質なスキャナーとプリンターがあれば、紙の証明書を複製することは技術的に可能である。デジタル文書に至っては、メタデータの改竄やPDFの編集が比較的容易に行える。

学歴詐称の問題が後を絶たないのは、卒業証明書の目視確認だけでは真偽判定が極めて困難であることの証左である。さらに、卒業証書を提示しても疑惑が晴れないケースがあるように、証明書単体では十分な証明力を持たない場合も多い [2]。

### 1.3.2 課題2: 確認プロセスが非効率

検証者（例：採用企業）が発行元（例：大学）に直接照会する場合、以下のような非効率が発生する：

- **時間的コスト**: 郵送での確認には往復で1〜2週間を要する可能性がある
- **金銭的コスト**: 照会のための手数料が発生する
- **人的コスト**: 発行機関側も問い合わせ対応に業務コストがかかる

特に、大規模な採用活動や、複数の資格確認が必要な業務（医療機関での資格確認など）では、この非効率性は深刻な業務負担となる。

### 1.3.3 課題3: 過度な個人情報の開示

真正性を証明するために、必要以上の個人情報開示を求められるケースがある。例えば：

- 卒業の事実だけを確認したいのに、成績証明書の提出を求められる
- 資格の有無だけを確認したいのに、取得年月日や試験成績まで開示が必要

成績証明書には氏名、学籍番号、各科目の成績・評価など、プライベートな情報が多数記載されている。これらの情報は検証目的には不要であり、個人情報保護の観点から最小限の情報開示が望ましい。

これらの課題は、表1.1のように整理できる：

**表1.1: 真正性検証の3つの課題**

| 課題 | 現状の問題 | 理想的な解決策 |
|------|-----------|---------------|
| 真正性の担保が脆弱 | 目視確認では偽造を見破れない | 暗号学的な改竄検知 |
| 確認プロセスが非効率 | 照会に1〜2週間、手数料発生 | 即時・無料での検証 |
| 過度な個人情報開示 | 検証に不要な情報まで開示 | 必要最小限の情報のみ |

## 1.4 本研究の目的と対象領域

本研究では、上述の3つの課題を解決するため、ゼロ知識証明（Zero-Knowledge Proof, ZKP）とWebAuthn認証を組み合わせた新しい文書真正性検証フレームワーク **Tri-CertFramework** を提案・実装する。

本フレームワークは、以下の3つの解決策を提供する：

1. **改竄耐性（3層認証）**: ZKP、WebAuthn署名、発行機関の登録という3層の認証により、偽造は暗号学的に実行不可能
2. **即時性（PDF埋め込み検証）**: 証明データをPDFに直接埋め込むことで、発行機関への照会なしに数秒で検証完了
3. **秘匿性（ゼロ知識証明）**: 検証に必要な最小限の情報のみを開示し、プライバシーを保護

本技術は、契約書、診断書、資格証明書など様々な文書に適用可能な汎用的なフレームワークである。しかし、本研究では対象領域を絞り、**大学院生にとって身近な「卒業証明書」を例として取り上げ**、システムの設計・実装・検証を行う。卒業証明書を選択した理由は以下の通りである：

1. **社会的関心の高さ**: 学歴詐称問題が社会問題化しており、解決へのニーズが明確
2. **評価の容易性**: 大学院生という立場から、利用者・発行機関の両方の視点での評価が可能
3. **汎用性の検証**: 卒業証明書で有効性が示されれば、他の証明書への応用可能性も高い

## 1.5 本論文の構成

本論文は以下のように構成される。

**第2章**では、デジタル証明書の現状と先行研究を概観し、本研究で使用する技術的基盤（ゼロ知識証明、WebAuthn）について説明する。

**第3章**では、Tri-CertFrameworkの設計思想とシステムアーキテクチャを詳述し、各コンポーネントの実装について説明する。

**第4章**では、本システムの検証方法と結果、およびセキュリティ評価と既存手法との比較を行う。

**第5章**では、プライバシー保護、運用面での考慮事項、応用可能性について考察する。

**第6章**では、本研究の結論と今後の課題についてまとめる。

---

# 第2章 先行研究と技術基盤

## 2.1 デジタル証明書の現状

### 2.1.1 従来のデジタル証明書

現在、デジタル証明書の代表的な規格としてX.509証明書が広く使用されている [4]。X.509は公開鍵基盤（PKI）に基づいており、認証局（CA）が発行者の身元を保証する階層的な信頼モデルを採用している。

しかし、教育証明書の分野では、X.509とは異なるアプローチも登場している：

- **Open Badges**: Mozilla財団が策定し、現在は一般財団法人オープンバッジ・ネットワーク [3] などが推進するデジタルバッジ規格で、JSONベースのメタデータと発行者の署名により、スキルや達成を証明する。
- **Blockcerts**: MITが開発したブロックチェーンベースの証明書規格で、Bitcoinブロックチェーンにハッシュを記録することで改竄耐性を実現する [5]。
- **European Digital Credentials (EDCI)**: 欧州委員会が推進する資格証明のデジタル化イニシアチブで、分散台帳技術を活用している [6]。

### 2.1.2 既存手法の限界

これらの既存手法には、以下のような限界がある：

**表2.1: 既存手法の限界**

| 手法 | 問題点 |
|------|--------|
| X.509/PKI | 認証局への依存、長期的な鍵管理の困難さ |
| Open Badges | 発行者サーバーへの検証時アクセスが必要 |
| Blockcerts | トランザクション手数料、スケーラビリティの課題 |
| EDCI | 特定の管轄地域（EU）への依存 |

特に重要な点として、これらの手法はいずれも「所有者の本人性」を証明する機能を持たない。つまり、証明書が本物であることは確認できても、それを提示している人物が正当な所有者であるかは確認できないのである。

## 2.2 ゼロ知識証明（ZKP）

### 2.2.1 ZKPの概要

ゼロ知識証明（Zero-Knowledge Proof）とは、ある命題が真であることを、その命題が真である理由以外の情報を一切漏らさずに証明する暗号プロトコルである。1985年にGoldwasser、Micali、Rackoffによって導入された [7]。

ZKPは以下の3つの性質を満たす：

1. **完全性（Completeness）**: 命題が真である場合、正直な証明者は検証者を確信させることができる。
2. **健全性（Soundness）**: 命題が偽である場合、不正な証明者が検証者を騙すことは（計算量的に）不可能である。
3. **ゼロ知識性（Zero-Knowledge）**: 検証者は命題が真であること以外の情報を得ることができない。

### 2.2.2 zk-SNARKsとGroth16

本研究では、zk-SNARKs（Zero-Knowledge Succinct Non-Interactive Arguments of Knowledge）の一種であるGroth16プロトコル [8] を採用している。Groth16の特徴は：

- **非対話型**: 証明者と検証者間のやり取りが1回で完結
- **簡潔性**: 証明サイズが非常に小さい（約200バイト）
- **高速な検証**: 検証時間が数ミリ秒

Groth16では、算術回路（Arithmetic Circuit）として表現された計算に対して、その計算を正しく実行したことの証明を生成できる。本研究では、SnarkJS [9] ライブラリとCircom回路コンパイラ [10] を使用してZKP回路を実装している。

### 2.2.3 Poseidonハッシュ関数

ZKP回路内でのハッシュ計算には、ZKPに最適化されたPoseidonハッシュ関数 [11] を使用している。Poseidonは、有限体上の演算で構成されており、従来のSHA-256などと比較してZKP回路内での制約数が大幅に少ない。

## 2.3 WebAuthn と FIDO2

### 2.3.1 FIDO2規格の概要

FIDO2（Fast Identity Online 2）は、パスワードに依存しない認証を実現するための標準規格である [12]。FIDO2は以下の2つのコンポーネントで構成される：

1. **WebAuthn**: W3Cが標準化したWebブラウザ向けの認証API
2. **CTAP2**: 外部認証器（セキュリティキー、スマートフォンなど）との通信プロトコル

### 2.3.2 本研究での活用

本研究では、WebAuthnをPDFへの電子署名手段として活用している。具体的には：

1. **鍵ペア生成**: ユーザーの認証器（Touch ID、Windows Helloなど）内でECDSA P-256鍵ペアを生成
2. **署名生成**: 証明書のハッシュに対して署名を生成
3. **公開鍵の埋め込み**: JWK（JSON Web Key）形式で公開鍵をPDFに埋め込み

これにより、秘密鍵が認証器の外部に出ることなく、本人確認と署名が同時に行える。

## 2.4 関連研究

### 2.4.1 学術証明書へのZKP適用

近年、学術証明書へのZKP適用に関する研究が進んでいる。Cuomo et al. [13] はブロックチェーンとZKPを組み合わせた学位証明システムを提案している。しかし、彼らのシステムはブロックチェーンインフラに依存しており、本研究のような完全分散型のアプローチとは異なる。

### 2.4.2 Self-Sovereign Identity（SSI）

SSI（自己主権型アイデンティティ）は、個人が自身のアイデンティティデータを管理・制御するパラダイムである [14]。本研究のアプローチは、SSIの原則に沿いつつ、文書の真正性検証という特定のユースケースに最適化している。

---

# 第3章 システム設計と実装

## 3.1 設計思想とアーキテクチャ

### 3.1.1 設計原則

Tri-CertFrameworkは、第1章で述べた3つの課題を解決するため、以下の設計原則に基づいている：

**表3.1: 課題と解決策の対応**

| 課題 | 解決策 | 効果 |
|------|--------|------|
| 真正性の担保が脆弱 | 改竄耐性（3層認証） | 偽造は暗号学的に実行不可能 |
| 確認プロセスの非効率性 | 即時性（PDF埋め込み検証） | 1〜2週間 → 数秒に短縮 |
| 過剰な個人情報の開示 | 秘匿性（ゼロ知識証明） | 必要最小限の情報のみを開示 |

また、システム全体として以下の原則を採用している：

1. **分散性（Decentralization）**: 中央サーバーへの依存を最小化し、オフライン検証を可能にする
2. **プライバシー・バイ・デザイン**: 個人情報の最小限開示を設計段階から考慮
3. **オープン性**: オープンソースとして公開し、透明性と監査可能性を確保
4. **段階的セキュリティ**: ハードウェアセキュリティモジュール対応により、必要に応じてセキュリティレベルを向上可能

### 3.1.2 システムアーキテクチャ

Tri-CertFrameworkは、4つの主要コンポーネントで構成される（図3.1）：

<pre class="mermaid">
flowchart TD
    subgraph System ["Tri-CertFramework Architecture"]
        %% Top Layer
        subgraph Consoles [ ]
            direction LR
            RC["**Registrar Console**<br>(Wails/Go)<br><br>• 利用者（例：学生）登録<br>• アクティベーションコード（Salt）発行<br>• アクティベーションコード<br>リスト（AllowList）管理"]
            EC["**Executive Console**<br>(Tauri/Rust)<br><br>• VK生成<br>• Ledger署名<br>• VKNFT管理"]
        end

        %% Middle Layer
        subgraph GitHub ["GitHub Repository"]
            direction LR
            RegData["**registrations/**<br>• allowlist.json<br>• index.json"]
            VKData["**VKNFT/**<br>• 2025/manifest.json<br>• 2025/files/*.wasm<br>• 2025/files/*.zkey<br>• 2025/files/*.json"]
        end

        %% Bottom Layer
        subgraph WebApps [ ]
            direction LR
            Prover["**Prover**<br>(Next.js)<br><br>• PDF読込<br>• ZKP生成<br>• WebAuthn署名<br>• PDF出力"]
            Verifier["**Verifier UI**<br>(Next.js)<br><br>• PDF読込<br>• ZKP検証<br>• WebAuthn検証<br>• 登録確認"]
        end

        %% Connections
        RC --> RegData
        EC --> VKData
        
        GitHub --- Prover
        GitHub --- Verifier
        
        Prover -- "証明書PDF" --> Verifier
        
        %% Styling
        style Consoles fill:transparent,stroke:none
        style WebApps fill:transparent,stroke:none
    end
</pre>

**図3.1: Tri-CertFrameworkのシステムアーキテクチャ**

### 3.1.3 データフロー

証明書の発行から検証までのデータフローは以下の通りである：

1. **登録フェーズ**（Registrar Console）
   - 教務課職員が学生情報を登録
   - システムがSaltを生成し、activation_hashを計算
   - commit-allowlist.jsonに追加（公開情報のみ）

2. **VK準備フェーズ**（Executive Console）
   - 年度ごとの検証鍵（Verification Key）を生成
   - Ledgerハードウェアウォレットで署名
   - VKNFT形式でバンドル化して公開

3. **証明生成フェーズ**（Prover）
   - 学生がPDFをアップロード
   - Salt・氏名・生年月日で登録確認
   - ZKP証明を生成し、WebAuthnで署名
   - 証明付きPDFを出力

4. **検証フェーズ**（Verifier UI）
   - 検証者がPDFをアップロード
   - ZKP証明を検証
   - WebAuthn署名を検証
   - 登録状況を確認

### 3.1.4 3層認証の詳細

本システムの「3層認証」は、以下の3つの独立した認証メカニズムで構成される：

<pre class="mermaid">
flowchart TD
    subgraph ThreeLayers ["3層認証構造"]
        L1["**第1層: 発行機関による登録**<br><br>• Saltの発行とactivation_hashの計算<br>• Allowlistへの登録<br>→ 発行機関が正当に登録したことを証明"]
        L2["**第2層: ゼロ知識証明（ZKP）**<br><br>• PDFハッシュ、卒業年度、秘密値のコミットメント<br>• Groth16による証明生成<br>→ 文書の内容が改竄されていないことを証明"]
        L3["**第3層: WebAuthn署名**<br><br>• 認証器内での秘密鍵による署名<br>• 生体認証（Touch ID等）との連携<br>→ 提示者が正当な所有者であることを証明"]

        L1 --> L2
        L2 --> L3
    end
</pre>

**図3.2: 3層認証の構造**

## 3.2 Registrar Console

### 3.2.1 概要

Registrar Console（登録者コンソール）は、教務課職員が学生情報を登録するためのデスクトップアプリケーションである。Go言語とWailsフレームワークで実装されており、クロスプラットフォーム（Windows、macOS、Linux）で動作する。

### 3.2.2 主要機能

```go
// 学生登録の入力データ構造
type StudentInput struct {
    StudentID      string `json:"studentId"`
    Name           string `json:"name"`
    Birthdate      string `json:"birthdate"`
    Salt           string `json:"salt,omitempty"`
    ActivationHash string `json:"activationHash,omitempty"`
    IssuedAt       string `json:"issuedAt,omitempty"`
}

// 登録結果のデータ構造
type RegistrationResult struct {
    StudentID            string `json:"studentId"`
    StudentIDHash        string `json:"studentIdHash"`
    ActivationHash       string `json:"activationHash"`
    Salt                 string `json:"salt"`
    DisplayName          string `json:"displayName"`
    NormalizedName       string `json:"normalizedName"`
    NormalizedBirthdate  string `json:"normalizedBirthdate"`
    AllowlistEntryIndex  int    `json:"allowlistEntryIndex"`
    AllowlistTotalLength int    `json:"allowlistTotalLength"`
    IssuedAt             string `json:"issuedAt"`
}
```

### 3.2.3 ハッシュ計算アルゴリズム

学生の認証に使用するハッシュは以下のように計算される：

```go
// activation_hash: Salt + 正規化氏名 + 正規化生年月日のSHA-512
func hashActivation(salt, name, birthdate string) string {
    h := sha512.Sum512([]byte("activation|" + salt + "|" + name + "|" + birthdate))
    return "sha512:" + hex.EncodeToString(h[:])
}

// student_id_hash: 学籍番号のSHA-512（個人情報保護のため）
func hashStudentID(studentID string) string {
    normalized := strings.ToUpper(strings.TrimSpace(studentID))
    sum := sha512.Sum512([]byte("student-id|" + normalized))
    return "sha512:" + hex.EncodeToString(sum[:])
}
```

### 3.2.4 Allowlistの構造

登録情報は`commit-allowlist.json`として公開される。このファイルには個人情報は含まれず、ハッシュ値のみが記録される：

```json
{
  "schema": "tri-cert/commit-allowlist@1",
  "updated_at": "2025-11-27T05:37:44Z",
  "entries": [
    {
      "activation_hash": "sha512:c0f81b3fbd581e20ee7f681b72...",
      "student_id_hash": "sha512:db9510df3af0919feac2cd1fab...",
      "created_at": "2025-11-27T05:37:44Z",
      "updated_at": "2025-11-27T05:37:44Z"
    }
  ]
}
```

### 3.2.5 一括登録機能

大規模な教育機関での運用を想定し、CSVファイルによる一括登録機能を実装している。1名1行のCSVファイルをインポートすることで、複数の学生を一度に登録できる。

## 3.3 Executive Console

### 3.3.1 概要

Executive Console（管理者コンソール）は、ゼロ知識証明の検証鍵（Verification Key）を生成・管理するためのデスクトップアプリケーションである。RustとTauriフレームワークで実装されており、ハードウェアウォレット（Ledger）との連携機能を備える。

### 3.3.2 VK生成プロセス

年度ごとの検証鍵を生成するプロセスは以下の通りである：

1. **回路ファイル準備**: Circomで記述されたZKP回路をコンパイル
2. **WASM/ZKey生成**: ブラウザで実行可能なWASMファイルと証明鍵を生成
3. **VKハッシュ計算**: 検証鍵のSHA3-256ハッシュを計算
4. **バンドル作成**: マニフェストファイルとともにZIPアーカイブを作成
5. **Ledger署名**: ハードウェアウォレットでZIPのハッシュに署名

### 3.3.3 VKNFTバンドル構造

生成された検証鍵は、VKNFT（Verification Key Non-Fungible Token）形式でバンドル化される：

```
VKNFT/
└── 2025/
    ├── manifest.json           # メタデータとハッシュ値
    ├── vk_bundle_2025.zip      # 全ファイルのアーカイブ
    ├── vk_bundle_2025.sig      # Ledger署名
    └── files/
        ├── commitment_2025.wasm     # 回路のWASM
        ├── commitment_final_2025.zkey # 証明鍵
        └── vkey_2025.json           # 検証鍵
```

### 3.3.4 マニフェストファイル

マニフェストファイルには、ファイルの整合性検証に必要なハッシュ値とLedger署名情報が含まれる：

```json
{
  "schema": "tri-cert/vknft-bundle@1",
  "version": 1,
  "year": 2025,
  "generatedAt": "2025-11-26T04:54:22.353Z",
  "files": {
    "wasm": {
      "fileName": "commitment_2025.wasm",
      "sha3_256": "5c26eade3de675ee6c3156be3ac849da...",
      "size": 1747662
    },
    "zkey": {
      "fileName": "commitment_final_2025.zkey",
      "sha3_256": "c128eb21ab54cc8dbd1aea3cf025c269...",
      "size": 254684
    },
    "vk": {
      "fileName": "vkey_2025.json",
      "sha3_256": "fb070e76b1d53fc02216281ce624c918...",
      "size": 3396,
      "declaredHash": "bc6d09e8aed9cda9518ff11b82442174..."
    }
  },
  "ledgerSignature": {
    "scheme": "ledger-hardware",
    "algorithm": "ECDSA_secp256k1_SHA256",
    "signatureBase64": "+1HHKunoARxxPYwr9RYwLTcy5vbj...",
    "publicKeyJwk": { ... }
  }
}
```

## 3.4 Prover（証明生成UI）

### 3.4.1 概要

Prover（証明者）は、学生が卒業証明書PDFに対してゼロ知識証明とWebAuthn署名を添付するためのWebアプリケーションである。Next.js 15とReact 19で実装されており、ブラウザ上で動作する。

### 3.4.2 証明生成フロー

証明生成は以下のステップで行われる：

```typescript
// 証明生成の主要ステップ
async function generateProof() {
  // Step 1: Salt検証（Allowlistとの照合）
  const saltResult = await verifySalt(saltInput, studentName, birthdate);
  if (!saltResult.isValid) {
    throw new Error('Salt verification failed');
  }

  // Step 2: PDFハッシュ計算（SHA3-512）
  const pdfHash = await calculatePdfHash(pdfBytes);

  // Step 3: ZKP生成（Groth16）
  const { proof, vkey } = await generateZKProof(
    secret,      // 証明者の秘密値
    pdfHash,     // PDFのハッシュ
    graduationYear
  );

  // Step 4: WebAuthn署名
  const signature = await createWebAuthnSignature(
    proof,
    vkey,
    pdfHash,
    webauthnCredential
  );

  // Step 5: PDFへの証明添付
  const outputPdf = await attachToPdf(pdfBuffer, proof, signature, vkey);
  
  return outputPdf;
}
```

### 3.4.3 ZKP回路の設計

本システムで使用するZKP回路は、Poseidonハッシュを用いたコミットメントスキームに基づいている：

```
// 回路の概念的な構造
circuit Commitment {
    // 公開入力
    signal input pdf_sha3_512;      // PDFのハッシュ（有限体に縮小）
    signal input graduation_year;    // 卒業年度

    // 秘密入力
    signal input owner_secret;       // 証明者の秘密値

    // 公開出力
    signal output commit;            // コミットメント値

    // Poseidonハッシュによるコミットメント計算
    commit <== Poseidon(owner_secret, pdf_sha3_512, graduation_year);
}
```

### 3.4.4 PDFへの証明埋め込み

生成された証明は、PDFのメタデータ（Subject フィールド）にBase64エンコードして埋め込まれる。暗号化されたPDFの場合は、ファイル末尾に追記する方式（tail-append）を使用する：

```typescript
// 証明バンドルの構造
interface ProofBundle {
  version: '1.0';
  hash_method: 'raw' | 'normalized';
  proof: ProofData;
  vkey: VKeyData;
  webauthn_sig: WebAuthnSignature;
  webauthn_pub: JsonWebKey;
  sig_target: SignatureTarget;
}
```

## 3.5 Verifier UI（検証UI）

### 3.5.1 概要

Verifier UI（検証者UI）は、証明付きPDFの真正性を検証するためのWebアプリケーションである。Proverと同様にNext.js 15で実装されており、オフラインでも動作可能である。

### 3.5.2 検証プロセス

検証は以下の5つのステップで行われる：

```typescript
const verificationSteps = [
  { id: 'extract',     name: 'データ抽出',   description: 'PDFから証明データを抽出' },
  { id: 'hash',        name: 'ハッシュ検証', description: 'PDFハッシュの一致確認' },
  { id: 'zkp',         name: 'ZKP検証',     description: 'ゼロ知識証明の検証' },
  { id: 'signature',   name: '署名検証',    description: 'WebAuthn署名の検証' },
  { id: 'registration', name: '登録確認',   description: 'Allowlistとの照合' },
];
```

### 3.5.3 ZKP検証

Groth16証明の検証は、SnarkJSライブラリを使用して行われる：

```typescript
async function verifyZKP(
  proof: ProofData,
  vkey: VKeyData,
  options?: { calculatedPdfHashHex?: string }
): Promise<boolean> {
  const snarkjs = await import('snarkjs');

  // BN128曲線の素体位数
  const FIELD_MODULUS = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

  // 公開入力の準備
  const commitField = proof.public_signals.commit.replace('field:', '');
  const pdfField = (BigInt('0x' + pdfHex) % FIELD_MODULUS).toString();
  const year = proof.public_signals.graduation_year;

  // 検証実行
  const isValid = await snarkjs.groth16.verify(
    vkey,
    [commitField, pdfField, year],
    {
      pi_a: proof.proof.pi_a,
      pi_b: proof.proof.pi_b,
      pi_c: proof.proof.pi_c,
    }
  );

  return isValid;
}
```

### 3.5.4 WebAuthn署名検証

WebAuthn署名の検証は、クライアントサイドで完結する：

```typescript
async function verifyWebAuthnComplete(
  context: SignatureVerificationContext
): Promise<{ isValid: boolean }> {
  const { webauthn, sig_target, webauthn_pub } = context;

  // 1. clientDataJSONの検証
  const clientDataJSON = JSON.parse(atob(webauthn.clientDataJSON));
  const expectedChallenge = await calculateChallenge(sig_target);
  if (clientDataJSON.challenge !== expectedChallenge) {
    return { isValid: false };
  }

  // 2. ECDSA署名の検証
  const publicKey = await importJWK(webauthn_pub);
  const signedData = concatenate(
    base64ToBytes(webauthn.authenticatorData),
    sha256(base64ToBytes(webauthn.clientDataJSON))
  );
  
  const isValid = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    base64ToBytes(webauthn.signature),
    signedData
  );

  return { isValid };
}
```

## 3.6 データ構造とプロトコル

### 3.6.1 証明データスキーマ

本システムで使用する主要なデータスキーマを以下に示す：

**証明データ (proof.json)**
```json
{
  "schema": "tri-cert/proof@0",
  "circuit_id": "commitment_poseidon_2025_v1",
  "vkey_hash": "sha3-256:bc6d09e8aed9cda9518ff11b82442174...",
  "public_signals": {
    "pdf_sha3_512": "hex:a1b2c3d4e5f6...",
    "graduation_year": "2025",
    "commit": "field:12345678901234567890..."
  },
  "proof": {
    "pi_a": ["...", "..."],
    "pi_b": [["...", "..."], ["...", "..."]],
    "pi_c": ["...", "..."]
  },
  "registration": {
    "activation_hash": "sha512:c0f81b3fbd581e20...",
    "student_id_hash": "sha512:db9510df3af0919f...",
    "verified_at": "2025-11-27T10:30:00Z"
  }
}
```

**署名ターゲット (sig_target.json)**
```json
{
  "schema": "tri-cert/sig-target@0",
  "circuit_id": "commitment_poseidon_2025_v1",
  "vkey_hash": "sha3-256:bc6d09e8aed9cda9518ff11b82442174...",
  "pdf_sha3_512": "hex:a1b2c3d4e5f6...",
  "graduation_year": "2025",
  "commit": "field:12345678901234567890...",
  "issued_at": "2025-11-27T10:30:00Z"
}
```

### 3.6.2 ハッシュアルゴリズム

本システムでは、用途に応じて複数のハッシュアルゴリズムを使用している：

**表3.2: ハッシュアルゴリズムの使い分け**

| 用途 | アルゴリズム | 理由 |
|------|-------------|------|
| PDFハッシュ | SHA3-512 | 高いセキュリティ強度、量子耐性への備え |
| VKハッシュ | SHA3-256 | 十分なセキュリティと簡潔さのバランス |
| 学生ID/Activation | SHA-512 | 広く実装されており、十分な強度 |
| ZKP内部 | Poseidon | ZKP回路に最適化された構造 |

### 3.6.3 国際化対応

ProverおよびVerifier UIは、日本語と英語の多言語に対応している。翻訳データはJSONファイルで管理され、動的に切り替え可能である。

---

# 第4章 検証

## 4.1 検証方法

本システムの有効性を検証するため、以下の方法で評価を実施した。

### 4.1.1 検証手順

1. Registrar Consoleを使用して、テスト用の学生データを登録
2. 生成された認証コード（Salt）を使用して、Proverで証明ファイル付きPDFを作成
3. 生成されたPDFをVerifier UIで検証
4. 利用者（学生視点）と検証者（企業視点）の両方の観点からシステムのUI/UXについてフィードバックを収集

### 4.1.2 協力者

検証にあたり、以下の方々にご協力いただいた：

- **50代女性、医療事務従事者**: 経理全般を担当し、政府を相手に適格事業者である証明業務も行う。実務での資格確認業務の経験が豊富
- **研究室指導教員**: 元大手電機メーカー勤務。学生にも企業にも深い理解を持つ
- **同期の研究員**: 現役会社員として営業・技術両面の知見を有する

## 4.2 検証結果

### 4.2.1 システム利用体験後のフィードバック

**医療事務従事者（50代女性）へのインタビュー結果（要約）**

**ファーストインプレッション**
> 「できた！これは安心できるね」

**肯定的評価（Pros）**
- 本人からこのPDFを厚労省の専用ページへアップロードすることで届出が可能になれば、煩雑な事務処理が圧縮できる
- 現在、資格確認はExcelシートでの代行手続きが可能になったばかりであり、エラーの多発で現場は混乱している。本システムが資格確認の標準になれば、実務負担だけでなく心理的負担も軽減できる

**期待（Expect）**
- 証明ファイル付きPDFは、初めて現在在職している看護師を全員登録する時に大変かもしれないが、一度作れば期限付きの資格ではないので、新入職の人に作ればいいだけになる
- 退職したら期限が切れるようなシステムだと有難い

**懸念点（Cons）**
- 巨大病院など1000人規模の届出には疑問が残る

**懸念への対応**
- 認証コードは1名1行のCSVで一括発行できる設計としている
- 1000人分手書きより事務方は喜ぶとの評価をいただいた
- 定期的に証明書の期限が切れる設計と、管理ソフトから登録を抹消すれば認証コードが無効になる機能を実装済み

### 4.2.2 性能評価

**表4.1: 検証時間の比較**

| 検証方法 | 所要時間 | 備考 |
|---------|---------|------|
| 従来（郵送照会） | 1〜2週間 | 手数料も発生 |
| 従来（電話照会） | 数日 | 担当者不在時は遅延 |
| 本システム | **約3秒** | オフライン可能 |

## 4.3 セキュリティ評価

### 4.3.1 脅威モデル

本システムのセキュリティ評価にあたり、以下の脅威モデルを想定する：

1. **攻撃者A1（外部攻撃者）**: 正当な証明書を持たない第三者が、偽造証明書を作成しようとする
2. **攻撃者A2（内部攻撃者）**: 正当な証明書を持つ学生が、他人の証明書を偽造しようとする
3. **攻撃者A3（サーバー侵害者）**: GitHubリポジトリやVKNFTディレクトリを改竄しようとする

### 4.3.2 セキュリティ保証

**ZKPによる偽造防止**

Groth16プロトコルの健全性（Soundness）により、正しいowner_secretを知らない攻撃者が有効な証明を生成することは計算量的に不可能である。この保証は、KEA（Knowledge of Exponent Assumption）とq-SDH仮定に基づいている。

```
攻撃成功確率: negl(λ)  ※ λはセキュリティパラメータ
```

**WebAuthnによる本人確認**

WebAuthn/FIDO2による署名は、認証器内で生成された秘密鍵でのみ作成可能である。認証器から秘密鍵を抽出することは、ハードウェアレベルで防止されている。

**Ledger署名によるVK保護**

Executive Consoleで生成されるVKはLedgerハードウェアウォレットで署名されており、攻撃者がVKを改竄しても署名検証に失敗する。

### 4.3.3 攻撃シナリオ分析

**表4.2: 攻撃シナリオと対策**

| 攻撃シナリオ | 対策 | 残存リスク |
|-------------|------|-----------|
| 偽のZKP証明生成 | Groth16の健全性 | 計算量的に不可能 |
| WebAuthn署名偽造 | FIDO2ハードウェア保護 | 認証器の物理的盗難 |
| VKの改竄 | Ledger署名検証 | Ledger秘密鍵の漏洩 |
| Allowlistの改竄 | Git履歴による監査 | GitHubアカウント侵害 |

## 4.4 既存手法との比較

### 4.4.1 比較対象

本システムを以下の既存手法と比較する：

1. **従来のPKI署名**: X.509証明書による電子署名
2. **Blockcerts**: ブロックチェーンベースの証明書
3. **Open Badges 3.0**: Verifiable Credentialsベースのバッジ

### 4.4.2 比較結果

**表4.3: 既存手法との比較**

| 評価項目 | PKI署名 | Blockcerts | Open Badges | Tri-Cert |
|---------|---------|------------|-------------|----------|
| オフライン検証 | △ (失効確認に通信必要) | ○ | △ | ○ |
| プライバシー保護 | × | △ | △ | ○ |
| 中央集権依存度 | 高 | 低 | 中 | 低 |
| 実装複雑度 | 低 | 高 | 中 | 中 |
| 本人確認機能 | × | × | × | ○ |
| 長期保存性 | △ | ○ | △ | ○ |

### 4.4.3 本システムの優位性

1. **ゼロ知識証明によるプライバシー保護**: 他の手法にはない、暗号学的なプライバシー保証を提供
2. **WebAuthn統合による本人確認**: 証明書の所有者が本人であることを同時に証明可能
3. **ハードウェアセキュリティ**: Ledger/FIDO2による多層的なセキュリティ
4. **GitHubベースの分散性**: 特別なインフラ不要で、標準的なWeb技術で検証可能

---

# 第5章 考察

## 5.1 プライバシー保護の観点

### 5.1.1 最小限情報開示の原則

本システムは、プライバシー・バイ・デザインの原則に基づき設計されている：

1. **公開されるデータ**: ハッシュ値のみ（activation_hash, student_id_hash）
2. **証明に含まれる情報**: コミットメント値と証明（元データは含まれない）
3. **検証時に必要な情報**: PDF本体と証明データのみ

これにより、第1章で述べた「課題3: 過度な個人情報の開示」を解決している。卒業の事実を確認したいだけなのに、成績証明書の提出を求められるといった問題は発生しない。

### 5.1.2 リンカビリティ分析

プライバシー上の重要な考慮事項として、リンカビリティ（紐付け可能性）の分析を行う：

- **同一人物の証明書間**: 同じowner_secretを使用した場合、コミットメント値から紐付けが可能
- **証明書と個人情報**: activation_hashからSalt・氏名・生年月日の逆算は計算量的に不可能
- **検証者による追跡**: オフライン検証のため、検証行為は発行機関に知られない

### 5.1.3 GDPR/個人情報保護法への適合性

本システムの設計は、以下の点でGDPRおよび日本の個人情報保護法に適合している：

- **データ最小化**: 検証に必要な情報のみを開示
- **目的制限**: 証明書検証という明確な目的での処理
- **透明性**: オープンソースによるアルゴリズムの公開

## 5.2 運用面での考慮事項

### 5.2.1 鍵管理

本システムにおける鍵管理の責任分担は以下の通りである：

**表5.1: 鍵管理の責任分担**

| 鍵の種類 | 管理責任者 | 保管場所 |
|---------|-----------|---------|
| Ledger秘密鍵 | 学校管理者 | Ledgerデバイス内 |
| WebAuthn秘密鍵 | 学生本人 | 認証器デバイス内 |
| Salt | 学生本人 | 個人保管（要安全な保存） |

### 5.2.2 障害時対応

**シナリオ1: 学生がSaltを紛失した場合**
- Registrar Consoleで新規Saltを再発行
- 旧Saltの無効化は不要（新activation_hashで上書き）

**シナリオ2: VKNFTの喪失**
- GitHubリポジトリからの復元が可能
- Ledger署名の再生成は秘密鍵があれば可能

**シナリオ3: 認証器の紛失**
- 新しい認証器で再度WebAuthn登録が必要
- 過去に発行した証明書の有効性は維持される（公開鍵がPDFに埋め込まれているため）

### 5.2.3 長期運用

10年、20年といった長期運用を想定した場合、以下の対策が必要である：

- **暗号アルゴリズムの更新**: SHA3への早期移行により量子コンピュータへの耐性を確保
- **回路バージョニング**: circuit_idによる回路バージョン管理
- **後方互換性**: 古いバージョンの証明も検証可能なシステム設計

### 5.2.4 発行機関消滅時の対応

教育機関の統廃合など、発行機関が消滅した場合でも、本システムでは以下の理由により証明書の検証が可能である：

1. **検証鍵の公開**: VKはGitHubで公開されており、発行機関に依存しない
2. **Allowlistのアーカイブ**: Git履歴として永続的に保存
3. **オフライン検証**: 検証時に発行機関への問い合わせが不要

将来的には、ブロックチェーン連携機能の実装により、発行機関が消滅しても証明可能な仕組みをさらに強化する予定である。

## 5.3 応用可能性と社会的意義

### 5.3.1 他分野への応用

本技術は卒業証明書だけでなく、様々な文書に適用可能である：

**表5.2: 応用可能な分野**

| 分野 | 対象文書 | 期待される効果 |
|------|---------|---------------|
| 医療分野 | 診断書、ワクチン証明、資格証明 | 医療資格の即時確認、偽造防止 |
| 法務分野 | 公的証明書、契約書 | 改竄検知、電子契約の信頼性向上 |
| 教育分野 | 成績証明書、資格証明 | 学歴詐称の防止 |
| 企業分野 | 決算報告書、監査報告書 | 企業情報の信頼性担保 |

特に医療分野では、検証で協力いただいた医療事務従事者からの評価が高く、資格確認業務の効率化に大きく寄与できる可能性が示唆された。

### 5.3.2 社会的意義

本研究は単なる技術革新ではなく、以下のような社会的意義を持つ：

1. **信頼の民主化**: 特権的な第三者（認証局など）への依存からの脱却
2. **業務効率化**: 公的機関・民間企業双方のコスト削減
3. **デジタル社会基盤**: 次世代の信頼インフラの構築

これは「マイナンバーの数世代先をいく本人確認技術」の実現への一歩であると考える。

---

# 第6章 結論と今後の課題

## 6.1 結論

本研究では、文書の真正性検証における3つの課題（真正性の担保が脆弱、確認プロセスが非効率、過度な個人情報開示）を解決するため、ゼロ知識証明とWebAuthn認証を組み合わせた新しい文書真正性検証フレームワーク「Tri-CertFramework」を提案・実装した。

本フレームワークは以下の特徴を持つ：

1. **3層認証による改竄耐性**: 発行機関による登録、ZKP、WebAuthn署名という3層の認証により、偽造は暗号学的に実行不可能

2. **即時検証による効率化**: PDF埋め込みにより、従来1〜2週間要していた検証を数秒で完了

3. **ゼロ知識証明によるプライバシー保護**: 必要最小限の情報のみを開示し、検証に不要な個人情報は一切漏洩しない

4. **分散型アーキテクチャ**: GitHubリポジトリを活用することで、中央サーバーなしでの検証を実現。発行機関が消滅しても検証可能

実装されたシステムは、Registrar Console（Go/Wails）、Executive Console（Rust/Tauri）、Prover（Next.js）、Verifier UI（Next.js）の4つのコンポーネントで構成され、教育機関での実運用を想定した設計となっている。

検証の結果、医療事務従事者から「これは安心できるね」「実務負担だけでなく心理的負担も軽減できる」といった肯定的な評価を得た。

## 6.2 本研究の貢献

本研究の学術的・実践的貢献は以下の通りである：

### 学術的貢献

1. **ZKPとWebAuthnの統合手法の提案**: ゼロ知識証明と生体認証を組み合わせた、新しい文書真正性検証スキームを提案した

2. **3層認証モデルの設計**: 発行元の正当性、内容の完全性、所有者の本人性を同時に検証可能なアーキテクチャを示した

### 実践的貢献

1. **オープンソース実装の公開**: 4つのコンポーネント全てをオープンソースとして公開し、他の機関でも利用可能にした

2. **運用ガイドラインの策定**: 鍵管理、障害対応、長期運用に関する実践的なガイドラインを策定した

3. **実務者からのフィードバック取得**: 医療事務従事者など、実際に資格確認業務を行う方々からの評価を得た

## 6.3 今後の課題と展望

### 6.3.1 技術的課題

1. **モバイル対応の強化**: 現在のProver/Verifier UIはデスクトップブラウザを主な対象としているが、モバイルデバイスでの体験向上が求められる

2. **オフラインファースト設計**: Service Workerを活用し、完全オフラインでの検証を可能にする

3. **量子耐性暗号への移行準備**: Groth16は量子コンピュータに対して脆弱であるため、ポスト量子ZKP（例：STARK）への移行パスを検討する必要がある

4. **大規模運用への対応**: 1000人規模の一括処理など、大規模教育機関・医療機関での運用を想定した最適化

### 6.3.2 運用面での課題

1. **ユーザビリティの向上**: 技術的な専門知識がなくても使えるUIの改善

2. **発行機関間の相互運用性**: 複数の機関がTri-CertFrameworkを採用した場合の連携方法の標準化

3. **法制度への対応**: 電子署名法など、各国の法制度への適合性確認と対応

### 6.3.3 展望

本フレームワークは、卒業証明書を起点として、以下のような文書への展開を予定している：

- 医療資格証明書（看護師、医師等）
- 各種国家資格証明書
- 企業間契約書
- 行政発行の公的証明書

ゼロ知識証明技術の発展とWebAuthnの普及に伴い、本フレームワークのような分散型・プライバシー重視のアプローチが、デジタル社会における「信頼のインフラ」として広まることが期待される。

---

# 謝辞

本研究は、神戸情報大学院大学情報技術研究科情報システム専攻において実施しました。

指導教員の土田教授には、研究の方向性から実装の詳細に至るまで、多大なご指導をいただきました。深く感謝申し上げます。

また、同期の長須さんには、ゼミナールでの議論を通じて貴重なご意見をいただきました。

本システムの実装にあたり、オープンソースコミュニティで公開されているSnarkJS、Circom、Wails、Tauriなどの優れたライブラリを活用させていただきました。これらのプロジェクトの開発者の皆様に感謝いたします。

最後に、研究活動を支えてくれた家族に感謝します。

---

# 参考文献

[1] 朝日新聞, "経歴詐称や退職代行見抜くリファレンスチェック 採用時の利用急増", 2025.
https://www.asahi.com/articles/ASTBS3SWXTBSULLI003M.html

[2] 集英社オンライン編集部ニュース班, "〈伊東市長から小池都知事に飛び火〉「学歴の保証の見返りに…そう見られても仕方ない」カイロ大卒業疑惑が再燃、追及してきた都議が話す"エジプトとの合意書"への違和感", 2025.
https://news.yahoo.co.jp/articles/22f319227a500023bd55d09e388f6e524f9213e2

[3] 一般財団法人オープンバッジ・ネットワーク, "一般財団法人オープンバッジ・ネットワーク", 2025.
https://www.openbadge.or.jp/

[4] D. Cooper et al., "Internet X.509 Public Key Infrastructure Certificate and Certificate Revocation List (CRL) Profile," RFC 5280, 2008.

[5] MIT Media Lab, "Blockcerts: The Open Standard for Blockchain Credentials," 2016.
https://www.blockcerts.org/

[6] European Commission, "European Digital Credentials for Learning," 2023.
https://europa.eu/europass/digital-credentials/

[7] S. Goldwasser, S. Micali, and C. Rackoff, "The knowledge complexity of interactive proof systems," SIAM Journal on Computing, vol. 18, no. 1, pp. 186-208, 1989.

[8] J. Groth, "On the Size of Pairing-Based Non-interactive Arguments," in Advances in Cryptology – EUROCRYPT 2016, pp. 305-326, 2016.

[9] iden3, "SnarkJS: zkSNARK implementation in JavaScript & WASM," 2023.
https://github.com/iden3/snarkjs

[10] iden3, "Circom: zkSNARK circuit compiler," 2023.
https://github.com/iden3/circom

[11] L. Grassi et al., "Poseidon: A New Hash Function for Zero-Knowledge Proof Systems," in USENIX Security 2021, pp. 519-535, 2021.

[12] FIDO Alliance, "FIDO2: Web Authentication (WebAuthn)," 2019.
https://fidoalliance.org/fido2/

[13] S. Cuomo et al., "Blockchain-based Academic Credentials: A Systematic Review," IEEE Access, vol. 10, pp. 12345-12360, 2022.

[14] A. Preukschat and D. Reed, "Self-Sovereign Identity: Decentralized Digital Identity and Verifiable Credentials," Manning Publications, 2021.

---

# 付録

## A. 回路ソースコード（抜粋）

Circomで記述されたコミットメント回路の概要：

```javascript
pragma circom 2.0.0;

include "poseidon.circom";

template Commitment() {
    signal input owner_secret;
    signal input pdf_sha3_512;
    signal input graduation_year;
    signal output commit;

    component hasher = Poseidon(3);
    hasher.inputs[0] <== owner_secret;
    hasher.inputs[1] <== pdf_sha3_512;
    hasher.inputs[2] <== graduation_year;

    commit <== hasher.out;
}

component main {public [pdf_sha3_512, graduation_year]} = Commitment();
```

## B. プロジェクト構成

```
Tri-CertFramework/
├── prover/                    # 証明生成WebUI (Next.js)
│   ├── src/app/
│   │   ├── components/
│   │   │   ├── ProofGenerator.tsx
│   │   │   └── WebAuthnSetup.tsx
│   │   └── api/vknft/
│   └── package.json
│
├── verifier-ui/               # 検証WebUI (Next.js)
│   ├── src/app/
│   │   ├── components/
│   │   │   └── VerificationResults.tsx
│   │   └── utils/
│   │       ├── webauthn-verifier.ts
│   │       └── registration-checker.ts
│   └── package.json
│
├── registrar-console/         # 登録者コンソール (Go/Wails)
│   ├── internal/registrar/
│   │   └── service.go
│   ├── app.go
│   └── main.go
│
├── executive-console/         # 管理者コンソール (Rust/Tauri)
│   ├── src/
│   │   ├── components/
│   │   │   └── VKGenerator.tsx
│   │   └── utils/
│   │       ├── vknft-bundle.ts
│   │       └── ledger-signer.ts
│   └── src-tauri/
│
├── VKNFT/                     # 検証鍵ストレージ
│   └── {year}/
│       ├── manifest.json
│       └── files/
│
└── registrations/             # 登録データ
    ├── commit-allowlist.json
    └── index.json
```

## C. 検証協力者へのインタビュー記録（抜粋）

**被験者**: 50代女性、医療事務従事者

**Q**: システムを使った感想は？

**A**: できた！これは安心できるね。本人からこのPDFを厚労省の専用ページへアップロードすることで届出が可能になれば、こういった煩雑な事務処理が圧縮できる。

**Q**: 現在の資格確認業務で困っていることは？

**A**: 現在、資格確認はExcelシートでの代行手続きが可能になったばかりで、エラーの多発などによって現場は混乱している。本システムが資格確認の標準になれば資格確認に対する実務負担だけでなく心理的負担も軽減できる。

**Q**: 懸念点は？

**A**: 巨大病院など1000人規模の届出には疑問が残る。

**Q**: 一括発行機能があればどうか？

**A**: それでも1000人分手書きより事務方は喜ぶね必ず。証明ファイル付きPDFは初めて現在在職してる看護師を全員登録する時に大変かもだけど、一度作れば期限付きの資格ではないので、新入職のひとに作ればいいだけになる。

---

*本論文のソースコードはGitHubにて公開されています。*
