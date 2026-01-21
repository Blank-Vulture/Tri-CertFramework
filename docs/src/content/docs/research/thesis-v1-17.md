---
title: "修士論文 v1.17"
description: "デジタル文書の真正性検証: ３層認証アーキテクチャの設計と実装 - ゼロ知識証明を用いた分散型証明システム Tri-CertFramework"
tableOfContents:
  minHeadingLevel: 2
  maxHeadingLevel: 3
sidebar:
  badge:
    text: "過去版"
    variant: "caution"
---

:::caution[過去バージョン]
これは過去バージョン（v1.17）です。最新版は [v2.45](./thesis-v2-45/) をご覧ください。
:::

# デジタル文書の真正性検証: ３層認証アーキテクチャの設計と実装

神戸情報大学院大学
情報技術研究科 情報システム専攻

学籍番号：24024
氏名：白石鷹也

提出日：2026年1月16日

---

## 内容梗概

卒業証明書や資格証明書の真正性検証には3つの課題がある。第一に、印刷技術の発達により偽造が容易となり目視では真偽判定が困難である。第二に、発行機関への照会には1〜2週間と手数料が必要で非効率である。第三に、検証に際し不要な個人情報の開示を求められる場合がある。本研究では、ゼロ知識証明とWebAuthn認証を組み合わせた文書真正性検証フレームワーク「Tri-CertFramework」を提案した。本フレームワークは、発行機関登録・ゼロ知識証明・WebAuthn署名の3層認証で偽造を暗号学的に不可能とし、証明データをPDFに埋め込み即時検証を実現し、最小限の情報開示でプライバシーを保護する。システムは、利用者登録のRegistrar Console、検証鍵管理のExecutive Console、証明生成のProver、検証のVerifierで構成される。卒業証明書を対象に実装し、医療事務従事者を含む協力者での評価を実施した。検証の結果、従来1〜2週間要した検証が約3秒で完了し、「実務と心理両面の負担軽減になる」との評価を得た。本フレームワークは医療資格証明など多様な文書に応用可能である。

---

---

# 目次

- [第1章 序論](#第1章-序論)
  - [1.1 研究の背景](#11-研究の背景)
  - [1.2 真正性検証とは](#12-真正性検証とは)
  - [1.3 現在の真正性検証が抱える課題](#13-現在の真正性検証が抱える課題)
    - [1.3.1 課題1： 真正性の担保が脆弱](#131-課題1：-真正性の担保が脆弱)
    - [1.3.2 課題2： 確認プロセスが非効率](#132-課題2：-確認プロセスが非効率)
    - [1.3.3 課題3： 過度な個人情報の開示](#133-課題3：-過度な個人情報の開示)
  - [1.4 本研究の目的と対象領域](#14-本研究の目的と対象領域)
  - [1.5 本研究の特徴](#15-本研究の特徴)
  - [1.6 本論文の構成](#16-本論文の構成)
- [第2章 先行研究と技術基盤](#第2章-先行研究と技術基盤)
  - [2.1 デジタル証明書の現状](#21-デジタル証明書の現状)
    - [2.1.1 従来のデジタル証明書](#211-従来のデジタル証明書)
    - [2.1.2 既存手法の限界](#212-既存手法の限界)
  - [2.2 ゼロ知識証明（ZKP）](#22-ゼロ知識証明（zkp）)
    - [2.2.1 ZKPの概要](#221-zkpの概要)
    - [2.2.2 zk-SNARKsとGroth16](#222-zk-snarksとgroth16)
    - [2.2.3 Poseidonハッシュ関数](#223-poseidonハッシュ関数)
  - [2.3 WebAuthn と FIDO2](#23-webauthn-と-fido2)
    - [2.3.1 FIDO2規格の概要](#231-fido2規格の概要)
    - [2.3.2 本研究での活用](#232-本研究での活用)
  - [2.4 関連研究](#24-関連研究)
    - [2.4.1 学術証明書へのZKP適用](#241-学術証明書へのzkp適用)
    - [2.4.2 Self-Sovereign Identity（SSI）](#242-self-sovereign-identity（ssi）)
  - [2.5 本研究のポジショニング](#25-本研究のポジショニング)
    - [2.5.1 既存手法との比較](#251-既存手法との比較)
- [第3章 システム設計と実装](#第3章-システム設計と実装)
  - [3.1 設計思想とアーキテクチャ](#31-設計思想とアーキテクチャ)
    - [3.1.1 設計原則](#311-設計原則)
    - [3.1.2 システムアーキテクチャ](#312-システムアーキテクチャ)
    - [3.1.3 データフロー](#313-データフロー)
    - [3.1.4 3層認証の詳細](#314-3層認証の詳細)
  - [3.2 Registrar Console](#32-registrar-console)
    - [3.2.1 概要](#321-概要)
    - [3.2.2 主要機能](#322-主要機能)
    - [3.2.3 ハッシュ計算アルゴリズム](#323-ハッシュ計算アルゴリズム)
    - [3.2.4 Allowlistの構造](#324-allowlistの構造)
    - [3.2.5 一括登録機能](#325-一括登録機能)
  - [3.3 Executive Console](#33-executive-console)
    - [3.3.1 概要](#331-概要)
    - [3.3.2 VK生成プロセス](#332-vk生成プロセス)
    - [3.3.3 VKNFTバンドル構造](#333-vknftバンドル構造)
    - [3.3.4 マニフェストファイル](#334-マニフェストファイル)
  - [3.4 Prover（証明生成UI）](#34-prover（証明生成ui）)
    - [3.4.1 概要](#341-概要)
    - [3.4.2 証明生成フロー](#342-証明生成フロー)
    - [3.4.3 ZKP回路の設計](#343-zkp回路の設計)
    - [3.4.4 PDFへの証明埋め込み](#344-pdfへの証明埋め込み)
  - [3.5 Verifier UI（検証UI）](#35-verifier-ui（検証ui）)
    - [3.5.1 概要](#351-概要)
    - [3.5.2 検証プロセス](#352-検証プロセス)
    - [3.5.3 ZKP検証](#353-zkp検証)
    - [3.5.4 WebAuthn署名検証](#354-webauthn署名検証)
  - [3.6 データ構造とプロトコル](#36-データ構造とプロトコル)
    - [3.6.1 証明データスキーマ](#361-証明データスキーマ)
    - [3.6.2 ハッシュアルゴリズム](#362-ハッシュアルゴリズム)
    - [3.6.3 国際化対応](#363-国際化対応)
- [第4章 検証](#第4章-検証)
  - [4.1 検証方法](#41-検証方法)
    - [4.1.1 検証手順](#411-検証手順)
    - [4.1.2 協力者](#412-協力者)
  - [4.2 検証結果](#42-検証結果)
    - [4.2.1 システム利用体験後のフィードバック](#421-システム利用体験後のフィードバック)
    - [4.2.2 性能評価](#422-性能評価)
  - [4.3 セキュリティ評価](#43-セキュリティ評価)
    - [4.3.1 脅威モデル](#431-脅威モデル)
    - [4.3.2 セキュリティ保証](#432-セキュリティ保証)
    - [4.3.3 攻撃シナリオ分析](#433-攻撃シナリオ分析)
  - [4.4 既存手法との比較](#44-既存手法との比較)
    - [4.4.1 比較対象](#441-比較対象)
    - [4.4.2 比較結果](#442-比較結果)
    - [4.4.3 本システムの優位性](#443-本システムの優位性)
- [第5章 考察](#第5章-考察)
  - [5.1 プライバシー保護の観点](#51-プライバシー保護の観点)
    - [5.1.1 最小限情報開示の原則](#511-最小限情報開示の原則)
    - [5.1.2 リンカビリティ分析](#512-リンカビリティ分析)
    - [5.1.3 GDPR・個人情報保護法への適合性](#513-gdpr・個人情報保護法への適合性)
  - [5.2 運用面での考慮事項](#52-運用面での考慮事項)
    - [5.2.1 鍵管理](#521-鍵管理)
    - [5.2.2 障害時対応](#522-障害時対応)
    - [5.2.3 長期運用](#523-長期運用)
    - [5.2.4 発行機関消滅時の対応](#524-発行機関消滅時の対応)
  - [5.3 応用可能性と社会的意義](#53-応用可能性と社会的意義)
    - [5.3.1 他分野への応用](#531-他分野への応用)
    - [5.3.2 社会的意義](#532-社会的意義)
  - [5.4 本システムの限界と課題](#54-本システムの限界と課題)
    - [5.4.1 技術的な限界](#541-技術的な限界)
    - [5.4.2 運用上の課題](#542-運用上の課題)
    - [5.4.3 検証から得られた反省点](#543-検証から得られた反省点)
- [第6章 結論と今後の課題](#第6章-結論と今後の課題)
  - [6.1 結論](#61-結論)
  - [6.2 本研究の貢献](#62-本研究の貢献)
  - [6.3 今後の課題と展望](#63-今後の課題と展望)
    - [6.3.1 技術的課題](#631-技術的課題)
    - [6.3.2 運用面での課題](#632-運用面での課題)
    - [6.3.3 展望](#633-展望)
- [謝辞](#謝辞)
- [参考文献](#参考文献)
- [付録](#付録)

---

# 第1章 序論

## 1.1 研究の背景

現代社会は、様々な「文書」の信頼性によって支えられている。企業間の契約書、行政機関が発行する戸籍謄本や住民票、医療機関の診断書、教育機関の卒業証明書など、これらの重要書類は社会生活の基盤として機能している。

しかしながら、これら重要書類の真正性を担保する現在の方法には、深刻な信頼性の問題がある。2024年から2025年にかけて、静岡県伊東市長の学歴詐称疑惑や、東京都知事のカイロ大学卒業疑惑が再燃するなど、学歴証明の信頼性に関する社会問題が連日報道された [1][2]。これらの事例は、現代の印刷技術では目視での真偽判定が極めて困難であり、卒業証書を提示しても疑惑が晴れないケースがあることを示している。

また、朝日新聞の報道によれば、採用時に候補者の経歴を確認する「リファレンスチェック」を行う企業が急増している [1]。これは、従来の証明書提示だけでは信頼性が不十分であることの裏返しでもある。

このような状況は学歴証明に限定されるものではない。企業の重要書類（契約書、決算報告書など）の改竄、行政文書の偽造、医療資格の詐称など、文書の真正性に関わる問題は社会の様々な場面で発生している。デジタル化が進む現代において、「その文書・ファイルが正式なものであるか」を確実に検証できる仕組みの構築は、社会全体の喫緊の課題となっている。

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

<p align="center"><strong>図1.1: 真正性検証の3要素</strong></p>

従来、これらの検証は物理的な手段（印影、透かし、特殊インク等）や、発行機関への直接照会によって行われてきた。しかし、デジタル化の進展により、これらの従来手法は限界を迎えつつある。

## 1.3 現在の真正性検証が抱える課題

### 1.3.1 課題1： 真正性の担保が脆弱

現代の印刷技術やデジタル編集技術の発達により、文書の偽造は年々容易になっている。高品質なスキャナーとプリンターがあれば、紙の証明書を複製することは技術的に可能である。デジタル文書に至っては、メタデータの改竄やPDFの編集が比較的容易に行える。

学歴詐称の問題が後を絶たないのは、卒業証明書の目視確認だけでは真偽判定が極めて困難であることの証左である。さらに、卒業証書を提示しても疑惑が晴れないケースがあるように、証明書単体では十分な証明力を持たない場合も多い [2]。

### 1.3.2 課題2： 確認プロセスが非効率

検証者（例：採用企業）が発行元（例：大学）に直接照会する場合、以下のような非効率が発生する：

- **時間的コスト**: 郵送での確認には往復で1〜2週間を要する
- **金銭的コスト**: 照会のための手数料が発生する
- **人的コスト**: 発行機関側においても問い合わせ対応に業務コストが発生する

特に、大規模な採用活動や、複数の資格確認が必要な業務（医療機関での資格確認など）では、この非効率性は深刻な業務負担となる。

### 1.3.3 課題3： 過度な個人情報の開示

真正性を証明するために、必要以上の個人情報開示を求められるケースがある。例えば：

- 卒業の事実だけを確認したいのに、成績証明書の提出を求められる
- 資格の有無だけを確認したいのに、取得年月日や試験成績まで開示が必要

成績証明書には氏名、学籍番号、各科目の成績・評価など、プライベートな情報が多数記載されている。これらの情報は検証目的には不要であり、個人情報保護の観点から最小限の情報開示が望ましい。

これらの課題は、表1.1のように整理できる：

<p align="center"><strong>表1.1: 真正性検証の3つの課題</strong></p>

| 課題 | 現状の問題 | 理想的な解決策 |
|------|-----------|---------------|
| 真正性の担保が脆弱 | 目視確認では偽造を見破れない | 暗号学的な改竄検知 |
| 確認プロセスが非効率 | 照会に1〜2週間、手数料発生 | 即時・無料での検証 |
| 過度な個人情報開示 | 検証に不要な情報まで開示 | 必要最小限の情報のみ |

本研究は、これらの課題に対して「利用者のプライバシーを確保した偽造対策システム」という提供価値を実現することを目指す。図1.2に、本研究の探究チャートを示す。

![本研究の探究チャート](../../../assets/tankyu-chart.png)

<p align="center"><strong>図1.2: 本研究の探究チャート</strong></p>

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

## 1.5 本研究の特徴

本研究の特徴として、以下の4点が挙げられる。

**1. プライバシー保護と真正性検証の両立**

従来の電子署名やブロックチェーン証明書は、証明書の真正性を保証するために証明書の内容をそのまま開示する必要があった。本研究では、ゼロ知識証明を用いることで、「卒業の事実」を証明しながら、成績や学籍番号などの詳細情報を一切開示しないことを可能にした。これは、GDPR（EU一般データ保護規則）や日本の個人情報保護法が求める「データ最小化の原則」に適合するアプローチである。

**2. 所有者の本人性確認機能の統合**

既存のデジタル証明書規格（X.509、Open Badges、Blockcerts等）は、いずれも「証明書が本物であること」は確認できても、「それを提示している人物が正当な所有者であるか」は確認できない。本研究では、WebAuthn/FIDO2による生体認証を統合することで、証明書の真正性と所有者の本人性を同時に検証可能にした。これにより、他人の証明書を不正利用する「なりすまし」を防止できる。

**3. 完全分散型アーキテクチャ**

本システムは、検証時に発行機関のサーバーへの問い合わせを必要としない。検証に必要な情報（検証鍵、登録リスト）はGitHubリポジトリで公開されており、オフライン環境でも検証が可能である。これにより、発行機関のサーバー障害や、極端な場合には発行機関の消滅後も、証明書の検証が継続可能となる。

**4. 実用的なシステムとしての完成度**

本研究は理論提案にとどまらず、4つのコンポーネント（Registrar Console、Executive Console、Prover、Verifier）を実装し、実際に動作するシステムとして完成させた。医療事務従事者を含む協力者による評価では、「実務負担だけでなく心理的負担も軽減できる」との肯定的な評価を得ており、実用化への道筋を示すことができた。

## 1.6 本論文の構成

本論文は以下のように構成される。

**第1章**では、本研究の背景、目的、及び課題設定について述べた。

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

しかし、教育証明書の分野では、X.509とは異なるアプローチも登場している。

- **Open Badges**: Mozilla財団が策定し、現在は一般財団法人オープンバッジ・ネットワーク [3] などが推進するデジタルバッジ規格で、JSONベースのメタデータと発行者の署名により、スキルや達成を証明する。
- **Blockcerts**: MITが開発したブロックチェーンベースの証明書規格で、Bitcoinブロックチェーンにハッシュを記録することで改竄耐性を実現する [5]。
- **European Digital Credentials (EDCI)**: 欧州委員会が推進する資格証明のデジタル化イニシアチブで、分散台帳技術を活用している [6]。

### 2.1.2 既存手法の限界

これらの既存手法には、以下のような限界がある：

<p align="center"><strong>表2.1: 既存手法の限界と本研究のアプローチ</strong></p>

| 手法 | 問題点 | 本研究での対応 |
|------|--------|---------------|
| X.509/PKI | 認証局への依存、長期的な鍵管理の困難さ | GitHubベースの分散管理、Ledger署名による鍵保護 |
| Open Badges | 発行者サーバーへの検証時アクセスが必要 | PDF埋め込みによるオフライン検証 |
| Blockcerts | トランザクション手数料、スケーラビリティの課題 | ブロックチェーン不要、無料で即時検証 |
| EDCI | 特定の管轄地域（EU）への依存 | 地域に依存しないオープンな規格 |

特に重要な点として、これらの手法はいずれも「所有者の本人性」を証明する機能を持たない。すなわち、証明書が本物であることは確認できても、それを提示している人物が正当な所有者であるかは確認できない。本研究では、WebAuthn/FIDO2による生体認証を統合することで、この根本的な課題に対処する。

## 2.2 ゼロ知識証明（ZKP）

### 2.2.1 ZKPの概要

ゼロ知識証明（Zero-Knowledge Proof）とは、ある命題が真であることを、その命題が真である理由以外の情報を一切漏らさずに証明する暗号プロトコルである。1985年にGoldwasser、Micali、Rackoffによって導入された [7]。

ZKPは以下の3つの性質を満たす：

1. **完全性（Completeness）**: 命題が真である場合、正直な証明者は検証者を確信させることができる。
2. **健全性（Soundness）**: 命題が偽である場合、不正な証明者が検証者を騙すことは（計算量的に）不可能である。
3. **ゼロ知識性（Zero-Knowledge）**: 検証者は命題が真であること以外の情報を得ることができない。

### 2.2.2 zk-SNARKsとGroth16

本研究では、zk-SNARKs（Zero-Knowledge Succinct Non-Interactive Arguments of Knowledge）の一種であるGroth16プロトコル [8] を採用している。Groth16の特徴を以下に示す。

- **非対話型**: 証明者と検証者間のやり取りが1回で完結する
- **簡潔性**: 証明サイズが極めて小さい（約200バイト）
- **高速な検証**: 検証時間が数ミリ秒である

Groth16では、算術回路（Arithmetic Circuit）として表現された計算に対して、その計算を正しく実行したことの証明を生成できる。本研究では、SnarkJS [9] ライブラリとCircom回路コンパイラ [10] を使用してZKP回路を実装している。

### 2.2.3 Poseidonハッシュ関数

ZKP回路内でのハッシュ計算には、ZKPに最適化されたPoseidonハッシュ関数 [11] を使用している。Poseidonは、有限体上の演算で構成されており、従来のSHA-256などと比較してZKP回路内での制約数が大幅に少ない。

## 2.3 WebAuthn と FIDO2

### 2.3.1 FIDO2規格の概要

FIDO2（Fast Identity Online 2）は、パスワードに依存しない認証を実現するための標準規格である [12]。FIDO2は以下の2つのコンポーネントで構成される。

1. **WebAuthn**: W3Cが標準化したWebブラウザ向けの認証API
2. **CTAP2**: 外部認証器（セキュリティキー、スマートフォンなど）との通信プロトコル

### 2.3.2 本研究での活用

本研究では、WebAuthnをPDFへの電子署名手段として活用している。具体的には以下の処理を行う。

1. **鍵ペア生成**: ユーザーの認証器（Touch ID、Windows Helloなど）内でECDSA P-256鍵ペアを生成
2. **署名生成**: 証明書のハッシュに対して署名を生成
3. **公開鍵の埋め込み**: JWK（JSON Web Key）形式で公開鍵をPDFに埋め込み

これにより、秘密鍵が認証器の外部に出ることなく、本人確認と署名が同時に行える。

## 2.4 関連研究

### 2.4.1 学術証明書へのZKP適用

近年、学術証明書へのZKP適用に関する研究が進展している。代表的な研究を以下に示す。

**Cuomo et al. (2023)** [13] は、ブロックチェーンとZKPを組み合わせた学位証明システムを提案している。このシステムでは、Ethereumスマートコントラクト上に証明書のコミットメントを記録し、学位取得の事実をZKPで証明する。しかし、以下の課題が残されている。

- ブロックチェーンインフラへの依存（ガス代、ネットワーク停止リスク）
- オフライン環境での検証が不可能
- 所有者の本人性確認機能が欠如

**ZK-Creds (Rosenberg et al., 2023)** [15] は、属性ベースの資格証明にZKPを適用した研究である。選択的開示（例：「卒業年度は2020年以降」のみを証明）を実現しているが、検証には中央サーバーへのアクセスが必要であり、完全なオフライン検証は実現していない。

<p align="center"><strong>表2.2: 学術証明書へのZKP適用研究の比較</strong></p>

| 研究 | ZKPプロトコル | インフラ依存 | オフライン検証 | 本人性確認 |
|------|-------------|-------------|--------------|----------|
| Cuomo et al. [13] | zk-SNARK | ブロックチェーン | × | × |
| ZK-Creds [15] | Bulletproofs | 中央サーバー | △ | × |
| **本研究** | Groth16 | GitHubのみ | ○ | ○（WebAuthn） |

本研究は、これらの先行研究と比較して、以下の点で独自性を有する。

1. **完全なインフラ独立性**: ブロックチェーンや中央サーバーを必要とせず、GitHubの静的ファイルホスティングのみで運用可能である
2. **真のオフライン検証**: PDFに埋め込まれた情報のみで完結する検証プロセスを実現している
3. **WebAuthnによる本人性確認**: 証明書の所有者が正当な保持者であることを生体認証により証明可能である

### 2.4.2 Self-Sovereign Identity（SSI）

SSI（Self-Sovereign Identity、自己主権型アイデンティティ）は、個人が自身のアイデンティティデータを管理・制御するパラダイムである [14]。従来の中央集権型アイデンティティ管理（企業や政府がデータを保持）に対し、SSIでは個人がデータの主権者となる。

### SSIの基本原則

SSIは以下の原則に基づいている。

1. **存在性（Existence）**: アイデンティティは独立して存在する
2. **制御性（Control）**: ユーザーが自身のアイデンティティを制御する
3. **アクセス性（Access）**: ユーザーは自身のデータにアクセスできる
4. **最小化（Minimization）**: 開示は必要最小限にとどめる

### 主要なSSI実装

現在、SSIの実装として複数のプロジェクトが存在する。

<p align="center"><strong>表2.3: 主要なSSI実装の比較</strong></p>

| プロジェクト | 技術基盤 | 特徴 | 限界 |
|-------------|---------|------|------|
| Hyperledger Indy | 許可型DLT | 企業向け、高信頼性 | 参加障壁が高い |
| uPort/Veramo | Ethereum | 開発者フレンドリー | ガス代、スケーラビリティ |
| ION (Microsoft) | Bitcoin | 高いセキュリティ | トランザクション遅延 |

これらのSSI実装は、W3CのDID（Decentralized Identifiers）仕様 [16] およびVerifiable Credentials Data Model [17] に準拠している。

### 本研究とSSIの関係

本研究のアプローチは、SSIの原則に沿いつつ、以下の点で差別化される。

1. **文書真正性への特化**: SSIは汎用的なアイデンティティ管理を目指すが、本研究は「文書の真正性検証」という特定のユースケースに最適化している。
2. **ZKP+WebAuthnの統合**: 既存SSI実装にはない、ゼロ知識証明と生体認証の組み合わせを実現している。
3. **実装の簡素さ**: DLT不要のアーキテクチャにより、導入・運用コストを大幅に削減している。


## 2.5 本研究のポジショニング

### 2.5.1 既存手法との比較

以上の先行研究・技術基盤の分析を踏まえ、本研究の位置づけを明確にする。

### デジタル証明書システムの比較

既存のデジタル証明書システムと本研究を、「分散性」と「プライバシー保護」の2軸で比較する。

<pre class="mermaid">
quadrantChart
    title "デジタル証明書システムの比較"
    x-axis "中央集権型" --> "分散型"
    y-axis "プライバシー低" --> "プライバシー高"
    quadrant-1 "理想領域"
    quadrant-2 "従来型"
    quadrant-3 "非推奨"
    quadrant-4 "部分的解決"
    "X.509/PKI": [0.2, 0.3]
    "Open Badges": [0.4, 0.2]
    Blockcerts: [0.7, 0.4]
    "SSI Hyperledger": [0.6, 0.6]
    "本研究": [0.85, 0.9]
</pre>

<p align="center"><strong>図2.1: デジタル証明書システムの比較</strong></p>

図2.1に示すように、本研究は「分散型」かつ「プライバシー保護」の両方を高い水準で実現している。従来のX.509/PKIは認証局への依存度が高く、Open Badgesは発行者サーバーへの依存がある。BlockcertsやHyperledger系のSSIはブロックチェーンにより分散性を確保しているが、プライバシー保護は限定的である。

### 本研究の独自性（新規性）

<p align="center"><strong>表2.4: 本研究の独自性</strong></p>

| 観点 | 既存手法の限界 | 本研究の解決策 |
|------|--------------|---------------|
| プライバシー | 属性が全て開示される | ZKPによる選択的証明 |
| 本人性確認 | 証明書の所有者を確認できない | WebAuthn署名の統合 |
| インフラ依存 | ブロックチェーン/サーバー必須 | GitHubのみで運用可能 |
| 検証環境 | オンライン接続が必要 | 完全オフライン検証対応 |
| 鍵管理 | ユーザーによる秘密鍵管理 | 認証器内で鍵を保護 |

本研究は、**ZKPによるプライバシー保護**と**WebAuthnによる本人性確認**を統合した初めての文書真正性検証システムであり、既存手法では達成できなかった「プライバシーと信頼性の両立」を実現する。

### 技術的差異のまとめ

本研究と既存手法の技術的差異を以下にまとめる。

<p align="center"><strong>表2.5: 技術的特徴の詳細比較</strong></p>

| 特徴 | X.509 | Open Badges | Blockcerts | SSI | 本研究 |
|------|-------|-------------|------------|-----|--------|
| 証明方式 | PKI署名 | JSON署名 | ブロックチェーン | DID/VC | ZKP |
| 検証鍵管理 | CA | 発行者サーバー | スマートコントラクト | DLT | GitHub |
| オフライン検証 | △ | × | × | △ | ○ |
| 選択的開示 | × | × | × | △ | ○ |
| 本人性確認 | × | × | × | × | ○ |
| 導入コスト | 高 | 低 | 高 | 高 | 低 |

この比較から明らかなように、本研究は既存手法の限界を克服しつつ、実用性も確保したバランスの取れたアプローチである。

---

# 第3章 システム設計と実装

## 3.1 設計思想とアーキテクチャ

### 3.1.1 設計原則

Tri-CertFrameworkは、第1章で述べた3つの課題を解決するため、以下の設計原則に基づいている：

<p align="center"><strong>表3.1: 課題と解決策の対応</strong></p>

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

<p align="center"><strong>図3.1: Tri-CertFrameworkのシステムアーキテクチャ</strong></p>

### 3.1.3 データフロー

証明書の発行から検証までのデータフローは以下の通りである：

1. **登録フェーズ**（Registrar Console）
   - 教務課職員が学生情報を登録
   - システムがSaltを生成し、activation_hashを計算
   - commit-allowlist.jsonに追加（公開情報のみ）

2. **VK準備フェーズ**（Executive Console）
   - 年度ごとの検証鍵（Verification Key）を生成
   - Ledgerハードウェアウォレットで署名
   - VKNFT（Verification Key NFT）形式でバンドル化して公開

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

<p align="center"><strong>図3.2: 3層認証の構造</strong></p>

## 3.2 Registrar Console

### 3.2.1 概要

Registrar Console（登録者コンソール）は、教務課職員が学生情報を登録するためのデスクトップアプリケーションである。Go言語とWailsフレームワークで実装されており、クロスプラットフォーム（Windows、macOS、Linux）で動作する。

### 画面構成

図3.3 にRegistrar Consoleのメイン画面を示す。

![Registrar Console メイン画面](../../../assets/screenshot/registrar-console/default.png)

<p align="center"><strong>図3.3: Registrar Console メイン画面</strong></p>

画面左側に登録フォーム、右側に登録済み学生の一覧が表示される。職員は学籍番号、氏名、生年月日を入力し、「登録」ボタンを押すことで学生をAllowlistに追加する。

### 技術スタック

<p align="center"><strong>表3.2: Registrar Consoleの技術スタック</strong></p>

| コンポーネント | 技術 |
|--------------|------|
| バックエンド | Go 1.21 |
| フロントエンド | React + TypeScript |
| デスクトップフレームワーク | Wails v2 |
| ハッシュ関数 | SHA3-512 (Keccak) |

Wailsフレームワークを採用した理由は、Goの高速なバックエンド処理とWebベースのUI開発の柔軟性を両立可能であるためである。また、単一バイナリとして配布可能であり、インストールの手間を軽減できる点も利点として挙げられる。

### 学生登録機能

学生登録の入力データと出力データは以下の構造を持つ。

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

### 登録フロー

図3.4 に登録完了後のアクティベーションコード表示画面を示す。

![登録完了・アクティベーションコード表示画面](../../../assets/screenshot/registrar-console/registar.png)

<p align="center"><strong>図3.4: 登録完了・アクティベーションコード表示画面</strong></p>

登録が完了すると、学生に配布するアクティベーションコード（Salt）が生成される。このアクティベーションコードは学生本人のみに安全な方法で伝達され、証明生成時に必要となる。アクティベーションコードは一度しか表示されないため、職員は学生に確実に伝達する必要がある。

### 学生削除機能

図3.5 に学生削除画面を示す。

![学生削除確認画面](../../../assets/screenshot/registrar-console/delete.png)

<p align="center"><strong>図3.5: 学生削除確認画面</strong></p>

誤って登録した学生の削除も可能である。削除時には確認ダイアログが表示され、誤操作を防止する設計となっている。

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

大規模な教育機関での運用を想定し、CSVファイルによる一括登録機能を実装している。1名1行のCSVファイルをインポートすることで、複数の学生を一括登録可能である。

### CSV一括登録画面

図3.6 にCSV一括登録画面を示す。

![CSV一括登録画面](../../../assets/screenshot/registrar-console/csv_registar.png)

<p align="center"><strong>図3.6: CSV一括登録画面</strong></p>

CSVファイルの形式は以下の通りである：

```csv
studentId,name,birthdate
24001,山田太郎,1999-04-15
24002,佐藤花子,2000-01-20
24003,鈴木一郎,1999-12-01
```

### 処理フロー

一括登録は以下の手順で処理される：

1. **CSVパース**: ファイルを読み込み、各行を解析
2. **バリデーション**: 学籍番号の重複チェック、日付形式の検証
3. **ハッシュ計算**: 各学生のactivationHashを計算
4. **アクティベーションコード生成**: 暗号学的に安全な乱数でアクティベーションコード（Salt）を生成
5. **Allowlist更新**: GitHubリポジトリのJSONファイルを更新
6. **結果出力**: 各学生のアクティベーションコードをCSVファイルとして出力

一括登録完了後、各学生のアクティベーションコードを含むCSVファイルのエクスポートが可能である。このファイルは厳重に管理し、各学生に個別に配布する必要がある。

## 3.3 Executive Console

### 3.3.1 概要

Executive Console（管理者コンソール）は、ゼロ知識証明の検証鍵（Verification Key, VK）を生成・管理するためのデスクトップアプリケーションである。RustとTauriフレームワークで実装されており、ハードウェアウォレット（Ledger）との連携機能を備える。

### 画面構成

図3.7 にExecutive Consoleのメイン画面を示す。

![Executive Console メイン画面](../../../assets/screenshot/executive-console/default.png)

<p align="center"><strong>図3.7: Executive Console メイン画面</strong></p>

Executive Consoleは3つのタブで構成される：

1. **VK生成タブ**: 年度ごとの検証鍵バンドルを生成
2. **VK管理タブ**: 発行済みの検証鍵を一覧表示・管理
3. **設定タブ**: Ledger接続やGitHub連携の設定

### 技術スタック

<p align="center"><strong>表3.3: Executive Consoleの技術スタック</strong></p>

| コンポーネント | 技術 |
|--------------|------|
| バックエンド | Rust 1.75 |
| フロントエンド | React + TypeScript |
| デスクトップフレームワーク | Tauri v2 |
| ZKP回路 | Circom 2.1 |
| 証明システム | snarkjs (Groth16) |
| 署名 | Ledger (ECDSA secp256k1) |

Tauriフレームワークを採用した理由は、Rustの安全性とパフォーマンスを活用しつつ、Ledgerとの低レベル通信を実装可能であるためである。また、Electronと比較してバイナリサイズが小さく、メモリ使用量も少ないという利点がある。

### 3.3.2 VK生成プロセス

年度ごとの検証鍵を生成するプロセスは以下の通りである：

1. **回路ファイル準備**: Circomで記述されたZKP回路をコンパイル
2. **WASM/ZKey生成**: ブラウザで実行可能なWASMファイルと証明鍵を生成
3. **VKハッシュ計算**: 検証鍵のSHA3-256ハッシュを計算
4. **バンドル作成**: マニフェストファイルとともにZIPアーカイブを作成
5. **Ledger署名**: ハードウェアウォレットでZIPのハッシュに署名

### VK生成画面

図3.8 にVK生成画面を示す。

![VK生成画面](../../../assets/screenshot/executive-console/vk_generator.png)

<p align="center"><strong>図3.8: VK生成画面</strong></p>

管理者は年度を選択し、「生成」ボタンを押すことでVKバンドルの生成を開始する。生成には数分を要し、進捗状況がリアルタイムで表示される。

### バンドル生成完了画面

図3.9 にバンドル生成完了画面を示す。

![VKバンドル生成完了](../../../assets/screenshot/executive-console/vk_generated.png)

<p align="center"><strong>図3.9: VKバンドル生成完了画面</strong></p>

生成が完了すると、VKバンドルのハッシュ値とLedger署名が表示される。管理者はこの情報を確認し、GitHubリポジトリにアップロードする。

### Ledger署名プロセス

VKバンドルの署名には、ハードウェアウォレットLedgerを使用する。図3.10〜3.15 にLedger署名プロセスを示す。

![Ledger署名待機画面](../../../assets/screenshot/executive-console/hw-wallet/waiting_sign_task.png)

<p align="center"><strong>図3.10: Ledger署名待機画面</strong></p>

![Ledger署名タスク受信](../../../assets/screenshot/executive-console/hw-wallet/received_sign_task.png)

<p align="center"><strong>図3.11: Ledger署名タスク受信</strong></p>

Ledgerデバイスが接続されると、署名タスクがデバイスに送信される。

![署名詳細確認（1/2）](../../../assets/screenshot/executive-console/hw-wallet/sign_details_1.png)

<p align="center"><strong>図3.12: 署名詳細確認（1/2）</strong></p>

![署名詳細確認（2/2）](../../../assets/screenshot/executive-console/hw-wallet/sign_details_2.png)

<p align="center"><strong>図3.13: 署名詳細確認（2/2）</strong></p>

管理者はLedgerの画面でハッシュ値を確認し、物理ボタンで署名を承認する。

![署名確認](../../../assets/screenshot/executive-console/hw-wallet/sign_confirm.png)

<p align="center"><strong>図3.14: 署名確認</strong></p>

![署名完了](../../../assets/screenshot/executive-console/hw-wallet/signed_message.png)

<p align="center"><strong>図3.15: 署名完了</strong></p>

この物理的な承認プロセスにより、秘密鍵がLedgerの外部に出ることなく、安全に署名が行われる。

### 署名ログ

図3.16 に署名処理のログを示す。

![署名処理ログ](../../../assets/screenshot/executive-console/signing_logs/signing_log.png)

<p align="center"><strong>図3.16: 署名処理ログ</strong></p>

署名プロセスの各ステップがログに記録され、監査可能性を確保している。

### 3.3.3 VKNFTバンドル構造

生成された検証鍵は、VKNFT（Verification Key Non-Fungible Token）形式でバンドル化される。なお、現時点ではブロックチェーン上のNFTとしての実装は行っていないが、将来的なオンチェーン管理への拡張を想定してこの名称を採用している：

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

### 画面構成

図3.17 にProverの初期画面を示す。

![Prover 初期画面](../../../assets/screenshot/prover/default.png)

<p align="center"><strong>図3.17: Prover 初期画面</strong></p>

初期画面では、PDFファイルのドラッグアンドドロップエリアが表示される。ユーザーは卒業証明書のPDFをアップロードすることで、証明生成プロセスを開始する。

### 技術スタック

<p align="center"><strong>表3.4: Proverの技術スタック</strong></p>

| コンポーネント | 技術 |
|--------------|------|
| フレームワーク | Next.js 15 (App Router) |
| UIライブラリ | React 19 |
| スタイリング | Tailwind CSS |
| ZKP生成 | snarkjs (WebAssembly) |
| 署名 | WebAuthn API |
| PDF操作 | pdf-lib |

### セキュリティ設計

Proverはクライアントサイドで完全に動作し、サーバーに機密情報を送信しない設計である：

- **アクティベーションコード**: ユーザーの入力値はブラウザ内でのみ処理
- **秘密鍵**: WebAuthn認証器内で生成・保持
- **PDFコンテンツ**: サーバーにアップロードされない

この設計により、中間者攻撃やサーバー侵害による情報漏洩のリスクを排除している。

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

### アクティベーションコード入力画面

図3.18、図3.19 にアクティベーションコード入力画面を示す。

![アクティベーションコード入力画面（入力前）](../../../assets/screenshot/prover/input_before.png)

<p align="center"><strong>図3.18: アクティベーションコード入力画面（入力前）</strong></p>

ユーザーはPDFをアップロード後、教務課から配布されたアクティベーションコード（Salt）を入力する。アクティベーションコードは学籍番号、氏名、生年月日と組み合わせてハッシュ化され、Allowlistとの照合に使用される。

![アクティベーションコード入力画面（入力後）](../../../assets/screenshot/prover/input_after.png)

<p align="center"><strong>図3.19: アクティベーションコード入力画面（入力後）</strong></p>

アクティベーションコードの検証が成功すると、「検証成功」のメッセージが表示され、証明生成ボタンが有効化される。

### WebAuthn認証

図3.20 にWebAuthn認証ダイアログを示す。

![WebAuthn認証ダイアログ](../../../assets/screenshot/prover/webauthn_dialog.png)

<p align="center"><strong>図3.20: WebAuthn認証ダイアログ</strong></p>

証明生成時にWebAuthn認証が要求される。ユーザーはTouch ID、Face ID、Windows Hello、またはセキュリティキーを使用して認証を行う。この認証により、証明書の所有者が本人であることが暗号学的に証明される。

### 証明生成完了

図3.21 に証明生成完了画面を示す。

![証明生成完了画面](../../../assets/screenshot/prover/output.png)

<p align="center"><strong>図3.21: 証明生成完了画面</strong></p>

証明生成が完了すると、証明付きPDFのダウンロードボタンが表示される。生成されたPDFには、ゼロ知識証明とWebAuthn署名が埋め込まれており、Verifier UIで検証可能である。

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

### 画面構成

図3.22 にVerifier UIの初期画面を示す。

![Verifier UI 初期画面](../../../assets/screenshot/verifier/default.png)

<p align="center"><strong>図3.22: Verifier UI 初期画面</strong></p>

初期画面では、PDFファイルのアップロードエリアが表示される。検証者（採用担当者など）は、受け取った卒業証明書PDFをアップロードすることで、検証プロセスを開始する。

### 技術スタック

<p align="center"><strong>表3.5: Verifier UIの技術スタック</strong></p>

| コンポーネント | 技術 |
|--------------|------|
| フレームワーク | Next.js 15 (App Router) |
| UIライブラリ | React 19 |
| スタイリング | Tailwind CSS |
| ZKP検証 | snarkjs (WebAssembly) |
| 署名検証 | WebCrypto API |
| PDF操作 | pdf-lib |

### オフライン動作

Verifier UIはService Workerを使用してオフラインでも動作する。検証に必要なファイル（検証鍵、WASM）は初回アクセス時にキャッシュされ、インターネット接続がない環境でも検証を実行可能である。これは、セキュリティが重視される企業内ネットワークでの運用を想定した設計である。

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

### 検証中の画面

図3.23 に検証中の5ステップ表示を示す。

![検証プロセス表示](../../../assets/screenshot/verifier/verified_1.png)

<p align="center"><strong>図3.23: 検証プロセス表示</strong></p>

検証は自動的に5つのステップを順番に実行する。各ステップの進捗状況がリアルタイムで表示され、ユーザーは検証の進行状況を視覚的に把握可能である。

### 検証成功時の画面

図3.24 に検証成功時の結果画面を示す。

![検証成功画面（詳細情報）](../../../assets/screenshot/verifier/verified_2.png)

<p align="center"><strong>図3.24: 検証成功画面（詳細情報）</strong></p>

検証が成功すると、以下の情報が表示される：

- **検証ステータス**: 5つのステップすべてが成功
- **証明書情報**: 卒業年度、発行機関名
- **公開鍵情報**: WebAuthn署名に使用された公開鍵のフィンガープリント

### 検証結果の詳細説明

図3.25 に検証結果の詳細説明画面を示す。

![検証結果の説明](../../../assets/screenshot/verifier/explain_output.png)

<p align="center"><strong>図3.25: 検証結果の詳細説明</strong></p>

検証者は各検証ステップの詳細を確認可能である。これにより、非技術者であっても検証結果の意味を理解することが可能となる。

### 検証失敗時の画面

図3.26、図3.27 に検証失敗時の画面を示す。

![検証失敗画面（概要）](../../../assets/screenshot/verifier/failure_verified_1.png)

<p align="center"><strong>図3.26: 検証失敗画面（概要）</strong></p>

![検証失敗画面（詳細）](../../../assets/screenshot/verifier/failure_verified_2.png)

<p align="center"><strong>図3.27: 検証失敗画面（詳細）</strong></p>

検証が失敗した場合、失敗したステップが明確に表示される。失敗の原因として想定されるケースを表3.6に示す。

<p align="center"><strong>表3.6: 検証失敗時の原因一覧</strong></p>

| 失敗ステップ | 考えられる原因 |
|------------|--------------|
| データ抽出 | PDFが証明付きでない、またはファイルが破損 |
| ハッシュ検証 | PDFが改竄されている |
| ZKP検証 | 証明データが不正、または検証鍵が不一致 |
| 署名検証 | 署名が無効、または公開鍵が改竄されている |
| 登録確認 | Allowlistに登録されていない |

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

<p align="center"><strong>表3.7: ハッシュアルゴリズムの使い分け</strong></p>

| 用途 | アルゴリズム | 理由 |
|------|-------------|------|
| PDFハッシュ | SHA3-512 | 高いセキュリティ強度、量子耐性への備え |
| VKハッシュ | SHA3-256 | 十分なセキュリティと簡潔さのバランス |
| 学生ID/Activation | SHA-512 | 広く実装されており、十分な強度 |
| ZKP内部 | Poseidon | ZKP回路に最適化された構造 |

### 3.6.3 国際化対応

ProverおよびVerifier UIは、日本語と英語の2言語に対応している。翻訳データはJSONファイルで管理され、動的な切り替えが可能である。


---

# 第4章 検証

## 4.1 検証方法

### 4.1.1 検証手順

本システムの検証は、以下の手順で実施した。

1. Registrar Consoleを使用し、テスト用の学生データを登録する
2. 生成された認証コード（Salt）を用いて、Proverにおいて証明ファイル付きPDFを作成する
3. 作成されたPDFをVerifier UIで検証する
4. 利用者（学生視点）および検証者（企業視点）の双方の観点から、システムのUI/UXに関するフィードバックを収集する

### 4.1.2 協力者

本検証にあたり、以下の協力者の参加を得た。

- **協力者A**: 医療関連資格確認業務における実務経験を有する
- **協力者B**: 学生および企業双方の立場に対する深い理解を有する
- **協力者C**: 現役会社員として営業・技術両面の知見を有する
- **協力者D**: セキュリティ分野に精通している

## 4.2 検証結果

### 4.2.1 システム利用体験後のフィードバック

**協力者A**

**初見時の所感**
> 「できた！これは安心できるね」

**肯定的評価**
- 本人がこのPDFを厚生労働省の専用ページへアップロードすることで届出が可能となれば、煩雑な事務処理を大幅に削減できる
- 現在、資格確認はExcelシートによる代行手続きが導入されたばかりであり、エラーの多発により現場は混乱している。本システムが資格確認の標準となれば、実務負担のみならず心理的負担も軽減される可能性がある

**今後への期待**
- 証明ファイル付きPDFは、現在在職中の看護師全員を初回登録する際には負担が生じるものの、一度作成すれば期限付きの資格ではないため、以降は新入職者のみを登録すればよい
- 退職時に証明書の有効期限が失効するシステムであれば、より実用的である

**懸念点**
- 大規模病院等における1000人規模の届出に対応可能かという疑問が残る

**懸念への対応**
- 認証コードは1名1行のCSV形式で一括発行できる設計としている
- 1000人分を手書きで処理する場合と比較して、事務担当者の負担軽減につながるとの評価を得た
- 定期的に証明書の有効期限が満了する設計を採用し、管理ソフトから登録を抹消することで認証コードが無効となる機能を実装済みである

---

**協力者B**

**定量評価（5段階評価）**

<p align="center"><strong>表4.2: 協力者Bによるシステム評価</strong></p>

| 評価項目 | スコア |
|---------|--------|
| Proverの理解しやすさ | 4 / 5 |
| Proverの操作しやすさ | 5 / 5 |
| Verifierの理解しやすさ | 4 / 5 |
| Verifierの操作しやすさ | 5 / 5 |

**肯定的評価**
- 円滑に動作した

**懸念点**
- ガイドのみでは仕組みの理解が困難である可能性がある
- ZKP等の複雑な技術を簡潔に説明することは困難である

**今後への期待**
- 応用例（他分野への適用可能性）の拡大

---

**協力者C**

**定量評価（5段階評価）**

<p align="center"><strong>表4.3: 協力者Cによるシステム評価</strong></p>

| 評価項目 | スコア |
|---------|--------|
| Proverの理解しやすさ | 4 / 5 |
| Proverの操作しやすさ | 2.5 / 5 |
| Verifierの理解しやすさ | 2 / 5 |
| Verifierの操作しやすさ | 5 / 5 |

**肯定的評価**
- ステップ形式で進行し、各タスクの完了後に自動的に次のステップへ遷移するため、操作手順が明確である

**改善要望**

*Prover関連:*
- 氏名入力時に姓と名の間に空白を挿入しないことを明記する必要がある
- 認証器を使用できない環境ではProverが利用不可であることを明記する必要がある
- 「ファイルを選択」ボタンがタップ可能であることが視認しにくい（アイコンの拡大、PDFファイルのみ受付可能である旨の明示等）
- 生年月日の入力が煩雑である（年・月・日を一括入力可能なUIが望ましい）
- 日付選択時に再選択が必要となる点が円滑な操作の妨げとなる

*Verifier関連:*
- 応募者の学歴を検証する立場（人事担当者）として、教育機関もTri-Cert Frameworkを導入しているという実感を得られる表示が必要である
- Proverで付与された証明ファイルが信頼に値する理由が不明確である
- 「オープンソースであるため安全である」という説明は、非エンジニアには理解しにくい
- 発行機関が学生をシステムに登録した事実を明示する必要がある
- 契約者情報（教育機関側と取り決めた公開情報）の表示が必要である（例：神戸情報大学院大学 学生課 電話番号）

### 4.2.2 性能評価

<p align="center"><strong>表4.1: 検証時間の比較</strong></p>

| 検証方法 | 所要時間 | 備考 |
|---------|---------|------|
| 従来（郵送照会） | 1〜2週間 | 手数料も発生 |
| 従来（電話照会） | 数日 | 担当者不在時は遅延 |
| 本システム | **約3秒** | オフライン可能 |

## 4.3 セキュリティ評価

### 4.3.1 脅威モデル

本システムのセキュリティ評価にあたり、以下の脅威モデルを想定する。

1. **攻撃者A1（外部攻撃者）**: 正当な証明書を保持しない第三者が、偽造証明書の作成を試みる
2. **攻撃者A2（内部攻撃者）**: 正当な証明書を保持する学生が、他者の証明書の偽造を試みる
3. **攻撃者A3（サーバー侵害者）**: GitHubリポジトリまたはVKNFTディレクトリの改竄を試みる

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

<p align="center"><strong>表4.4: 攻撃シナリオと対策</strong></p>

| 攻撃シナリオ | 対策 | 残存リスク |
|-------------|------|-----------|
| 偽のZKP証明生成 | Groth16の健全性 | 計算量的に不可能 |
| WebAuthn署名偽造 | FIDO2ハードウェア保護 | 認証器の物理的盗難 |
| VKの改竄 | Ledger署名検証 | Ledger秘密鍵の漏洩 |
| Allowlistの改竄 | Git履歴による監査 | GitHubアカウント侵害 |

## 4.4 既存手法との比較

### 4.4.1 比較対象

本システムを以下の既存手法と比較する。

1. **従来のPKI署名**: X.509証明書による電子署名
2. **Blockcerts**: ブロックチェーン基盤の証明書システム
3. **Open Badges 3.0**: Verifiable Credentials（検証可能な資格情報）に基づくデジタルバッジ

### 4.4.2 比較結果

<p align="center"><strong>表4.5: 既存手法との比較</strong></p>

| 評価項目 | PKI署名 | Blockcerts | Open Badges | Tri-Cert |
|---------|---------|------------|-------------|----------|
| オフライン検証 | △ (失効確認に通信必要) | ○ | △ | ○ |
| プライバシー保護 | × | △ | △ | ○ |
| 中央集権依存度 | 高 | 低 | 中 | 低 |
| 実装複雑度 | 低 | 高 | 中 | 中 |
| 本人確認機能 | × | × | × | ○ |
| 長期保存性 | △ | ○ | △ | ○ |

### 4.4.3 本システムの優位性

本システムの既存手法に対する優位性を以下に示す。

1. **ゼロ知識証明によるプライバシー保護**: 他の手法では実現困難な、暗号学的に保証されたプライバシー保護を提供する
2. **WebAuthn統合による本人確認**: 証明書の所有者が本人であることを同時に証明することが可能である
3. **ハードウェアセキュリティ**: LedgerおよびFIDO2認証器による多層的なセキュリティを実現する
4. **GitHubベースの分散性**: 特別なインフラストラクチャを必要とせず、標準的なWeb技術のみで検証が可能である


---

# 第5章 考察

## 5.1 プライバシー保護の観点

### 5.1.1 最小限情報開示の原則

本システムは、プライバシー・バイ・デザインの原則に基づき設計されている。

1. **公開されるデータ**: ハッシュ値のみ（activation_hash, student_id_hash）
2. **証明に含まれる情報**: コミットメント値と証明（元データは含まれない）
3. **検証時に必要な情報**: PDF本体と証明データのみ

これにより、第1章で述べた「課題3: 過度な個人情報の開示」を解決している。従来、卒業の事実を確認するためだけに成績証明書の提出を求められるといった問題が存在したが、本システムではそのような過度な情報開示は発生しない。

### 5.1.2 リンカビリティ分析

プライバシー上の重要な考慮事項として、リンカビリティ（紐付け可能性）の分析を行った。

- **同一人物の証明書間**: 同一のowner_secretを使用した場合、コミットメント値から紐付けが可能である
- **証明書と個人情報**: activation_hashからSalt、氏名、生年月日を逆算することは計算量的に困難である
- **検証者による追跡**: オフライン検証であるため、検証行為は発行機関に通知されない

### 5.1.3 GDPR・個人情報保護法への適合性

本システムの設計は、以下の点でGDPR（General Data Protection Regulation、EU一般データ保護規則）および日本の個人情報保護法に適合している。

- **データ最小化**: 検証に必要な情報のみを開示する
- **目的制限**: 証明書検証という明確な目的に限定して処理する
- **透明性**: オープンソースによりアルゴリズムを公開している

## 5.2 運用面での考慮事項

### 5.2.1 鍵管理

本システムにおける鍵管理の責任分担は以下の通りである。

<p align="center"><strong>表5.1: 鍵管理の責任分担</strong></p>

| 鍵の種類 | 管理責任者 | 保管場所 |
|---------|-----------|---------|
| Ledger秘密鍵 | 学校管理者 | Ledgerデバイス内 |
| WebAuthn秘密鍵 | 学生本人 | 認証器デバイス内 |
| Salt | 学生本人 | 個人保管（安全な保存が必要） |

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

10年、20年といった長期運用を想定した場合、以下の対策が必要である。

- **暗号アルゴリズムの更新**: SHA-3への早期移行により量子コンピュータへの耐性を確保する
- **回路バージョニング**: circuit_idによる回路バージョン管理を行う
- **後方互換性**: 旧バージョンの証明も検証可能なシステム設計を維持する

### 5.2.4 発行機関消滅時の対応

教育機関の統廃合など、発行機関が消滅した場合においても、本システムでは以下の理由により証明書の検証が可能である。

1. **検証鍵の公開**: VKはGitHubで公開されており、発行機関の存続に依存しない
2. **Allowlistのアーカイブ**: Git履歴として永続的に保存される
3. **オフライン検証**: 検証時に発行機関への問い合わせが不要である

将来的には、ブロックチェーン連携機能の実装により、発行機関が消滅した場合においても証明可能な仕組みをさらに強化することが考えられる。

## 5.3 応用可能性と社会的意義

### 5.3.1 他分野への応用

本技術は卒業証明書のみならず、多様な文書に適用可能である。

<p align="center"><strong>表5.2: 応用可能な分野</strong></p>

| 分野 | 対象文書 | 期待される効果 |
|------|---------|---------------|
| 医療分野 | 診断書、ワクチン証明、資格証明 | 医療資格の即時確認、偽造防止 |
| 法務分野 | 公的証明書、契約書 | 改竄検知、電子契約の信頼性向上 |
| 教育分野 | 成績証明書、資格証明 | 学歴詐称の防止 |
| 企業分野 | 決算報告書、監査報告書 | 企業情報の信頼性担保 |

特に医療分野では、検証に協力した医療事務従事者から高い評価を得ており、資格確認業務の効率化に寄与できる可能性が示唆された。

### 5.3.2 社会的意義

本研究は単なる技術革新にとどまらず、以下のような社会的意義を有する。

1. **信頼の民主化**: 特権的な第三者（認証局等）への依存からの脱却
2. **業務効率化**: 公的機関および民間企業双方のコスト削減
3. **デジタル社会基盤**: 次世代の信頼インフラの構築

本研究は、マイナンバー制度を超える次世代の本人確認技術の実現に向けた一歩であると考えられる。


## 5.4 本システムの限界と課題

### 5.4.1 技術的な限界

本システムには以下の技術的限界が存在する。

**量子コンピュータへの脆弱性**

本システムで採用しているGroth16プロトコルは、楕円曲線上の離散対数問題の困難性に基づいている。量子コンピュータが実用化された場合、Shorのアルゴリズムによりこの前提が崩れる可能性がある。現時点では実用的な量子コンピュータは存在しないものの、10年から20年の長期運用を想定した場合、ポスト量子暗号（zk-STARKs等）への移行が必要となる。本システムでは、circuit_idによるバージョン管理を導入しており、将来的な暗号方式の更新に対応可能な設計としている。

**証明生成の計算コスト**

ZKP証明の生成には一定の計算リソースを要する。現在の実装では、デスクトップブラウザ上で証明生成に約2秒から3秒を要する。低性能なモバイルデバイスや旧式のブラウザでは、処理時間が長くなる可能性がある。ただし、検証処理は数十ミリ秒で完了するため、検証者の体験には影響を与えない。

**認証器の互換性**

WebAuthn認証は、Touch ID（macOS/iOS）、Windows Hello、Android生体認証等の主要なプラットフォームに対応しているが、旧式のデバイスや一部のブラウザでは動作しない場合がある。第4章の検証において、協力者Cから「認証器が使用できない環境ではProverが利用できないことを明記すべき」との指摘を受けた。認証器を持たないユーザーへの代替手段の提供は今後の課題である。

### 5.4.2 運用上の課題

運用面では、以下の課題が残されている。

**導入コストと運用体制**

発行機関がTri-CertFrameworkを導入するには、Registrar ConsoleおよびExecutive Consoleのセットアップ、Ledgerハードウェアウォレットの調達、GitHubリポジトリの管理体制の構築が必要となる。大規模な教育機関であれば既存のIT部門で対応可能であるが、小規模な機関にとっては負担となる可能性がある。将来的には、複数機関で共有可能なSaaS型の提供形態も検討すべきである。

**ユーザビリティの課題**

第4章の検証において、協力者Cから以下の改善要望が挙げられた。

- 名前入力時に姓と名の間に空白を入れないことの明記
- 「ファイルを選択」ボタンがタップ可能であることの視覚的明示
- 生年月日の入力UIの改善（年・月・日の一括入力）

これらは技術的には軽微な修正で対応可能であるが、非技術者ユーザーにとっての使いやすさを検証段階で十分に考慮できていなかった点は反省すべきである。

**信頼性の可視化**

同じく協力者Cから、「Proverで付与された証明ファイルがなぜ信頼に値するのか分かりにくい」「発行機関が学生をシステムに登録したという事実を強調すべき」との指摘があった。技術的には3層認証により高いセキュリティを実現しているものの、その安全性を非技術者に伝える「信頼の可視化」が不足している。検証結果画面において、発行機関の情報（機関名、連絡先等）をより明確に表示する等の改善が必要である。

### 5.4.3 検証から得られた反省点

本研究の検証プロセスを通じて、以下の反省点が明らかになった。

**検証規模の限界**

今回の検証は4名の協力者に限定された。医療事務従事者、会社員、セキュリティ専門家等、多様な背景を持つ協力者を選定したものの、統計的な有意性を示すには不十分なサンプル数であった。ユーザビリティ評価においては、一般的に5名程度で約85%の問題を発見できるとされるが[18]、本研究の目的である「多様なユーザー層における操作性の検証」を十分に達成するには、各ユーザー層（学生、企業人事担当者、発行機関職員等）から複数名ずつ、合計15名から20名程度の協力者を確保すべきであった。限られた時間と人脈の中での検証となったが、より多くの協力者からフィードバックを収集することで、UIの改善点やシステムの理解容易性について、より信頼性の高い知見が得られたと考えられる。

**定量評価の不統一**

第4章で示した5段階評価（理解しやすさ、操作しやすさ）は協力者B、Cの2名分のみであり、協力者Aからは定性的なフィードバックのみを収集した。評価項目を事前に統一し、全協力者から同一基準での定量データを収集すべきであった。これにより、改善点の優先順位付けがより客観的に行えたと考えられる。

**発行機関視点の不足**

協力者は主に「利用者（学生）」と「検証者（企業）」の視点からの評価であり、実際の発行機関（大学教務課職員等）からのフィードバックは得られなかった。Registrar Consoleの運用負担、一括登録機能の実用性、既存業務フローとの統合可能性等、発行機関視点での評価が不足している。

**長期運用の検証不足**

本研究では、システムの機能検証と短期的なユーザー評価を実施したが、数ヶ月から数年にわたる長期運用での課題（鍵の更新、バージョンアップ対応、データ移行等）は検証できていない。実際の教育機関での試験運用を通じた長期的な評価が今後の課題である。

これらの反省点は、今後の研究においてより体系的な評価手法を採用する際の教訓となる。


---

# 第6章 結論と今後の課題

## 6.1 結論

本研究では、文書の真正性検証における3つの課題、すなわち真正性の担保が脆弱であること、確認プロセスが非効率であること、および過度な個人情報開示が生じることを解決するため、ゼロ知識証明とWebAuthn認証を組み合わせた文書真正性検証フレームワーク「Tri-CertFramework」を提案し、実装した。

本フレームワークは以下の特徴を有する。

1. **3層認証による改竄耐性**: 発行機関による登録、ZKP、WebAuthn署名という3層の認証により、偽造は暗号学的に実行不可能である

2. **即時検証による効率化**: PDF埋め込みにより、従来1〜2週間を要していた検証を数秒で完了可能である

3. **ゼロ知識証明によるプライバシー保護**: 必要最小限の情報のみを開示し、検証に不要な個人情報は一切漏洩しない

4. **分散型アーキテクチャ**: GitHubリポジトリを活用することで、中央サーバーを介さない検証を実現し、発行機関が消滅した場合においても検証が可能である

実装したシステムは、Registrar Console（Go/Wails）、Executive Console（Rust/Tauri）、Prover（Next.js）、Verifier（Next.js）の4つのコンポーネントで構成され、教育機関での実運用を想定した設計となっている。

検証の結果、医療事務従事者から「これは安心できる」「実務負担のみならず心理的負担も軽減できる」といった肯定的な評価を得た。

## 6.2 本研究の貢献

本研究の学術的・実践的貢献は以下の通りである。

### 学術的貢献

1. **ZKPとWebAuthnの統合手法の提案**: ゼロ知識証明とパスキー認証を組み合わせた文書真正性検証スキームを提案した

2. **3層認証モデルの設計**: 発行元の正当性、内容の完全性、所有者の本人性を同時に検証可能なアーキテクチャを提示した

### 実践的貢献

1. **オープンソース実装の公開**: 4つのコンポーネントすべてをオープンソースとして公開し、他機関での利用を可能とした

2. **運用ガイドラインの策定**: 鍵管理、障害対応、長期運用に関する実践的なガイドラインを策定した

3. **実務者からのフィードバック取得**: 医療事務従事者など、資格確認業務に従事する実務者からの評価を得た

## 6.3 今後の課題と展望

### 6.3.1 技術的課題

1. **モバイル対応の強化**: 現在のProver/Verifier UIはデスクトップブラウザを主な対象としているが、モバイルデバイスにおける操作性の向上が求められる

2. **オフラインファースト設計**: Service Workerを活用し、完全なオフライン環境での検証を実現する必要がある

3. **量子耐性暗号への移行準備**: Groth16は量子コンピュータに対して脆弱であるため、ポスト量子ZKP（例：STARK）への移行計画を策定する必要がある

4. **大規模運用への対応**: 1000人規模の一括処理など、大規模教育機関および医療機関での運用を想定した最適化が必要である

### 6.3.2 運用面での課題

1. **ユーザビリティの向上**: 技術的な専門知識を有さない利用者でも操作可能なUIへの改善が求められる

2. **発行機関間の相互運用性**: 複数の機関がTri-CertFrameworkを採用した場合における連携方法の標準化が必要である

3. **法制度への対応**: 電子署名法をはじめとする各国の法制度への適合性確認および対応が求められる

### 6.3.3 展望

本フレームワークは、卒業証明書を起点として、以下の文書への展開を想定している。

- 医療資格証明書（看護師、医師等）
- 各種国家資格証明書
- 企業間契約書
- 行政機関が発行する公的証明書

ゼロ知識証明技術の発展とWebAuthnの普及に伴い、本フレームワークのような分散型かつプライバシーを重視したアプローチが、デジタル社会における信頼基盤として普及することが期待される。


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
https://www.asahi.com/articles/ASTBS3SWXTBSULLI003M.html （最終アクセス: 2026年1月9日）

[2] 集英社オンライン編集部ニュース班, "〈伊東市長から小池都知事に飛び火〉「学歴の保証の見返りに…そう見られても仕方ない」カイロ大卒業疑惑が再燃、追及してきた都議が話す"エジプトとの合意書"への違和感", 2025.
https://news.yahoo.co.jp/articles/22f319227a500023bd55d09e388f6e524f9213e2 （最終アクセス: 2026年1月9日）

[3] 一般財団法人オープンバッジ・ネットワーク, "一般財団法人オープンバッジ・ネットワーク", 2025.
https://www.openbadge.or.jp/ （最終アクセス: 2026年1月9日）

[4] D. Cooper et al., "Internet X.509 Public Key Infrastructure Certificate and Certificate Revocation List (CRL) Profile," RFC 5280, 2008.
https://datatracker.ietf.org/doc/html/rfc5280 （最終アクセス: 2026年1月9日）

[5] MIT Media Lab, "Blockcerts: The Open Standard for Blockchain Credentials," 2016.
https://www.blockcerts.org/ （最終アクセス: 2026年1月9日）

[6] European Commission, "European Digital Credentials for Learning," 2023.
https://europass.europa.eu/en/european-digital-credentials-learning （最終アクセス: 2026年1月9日）

[7] S. Goldwasser, S. Micali, and C. Rackoff, "The knowledge complexity of interactive proof systems," SIAM Journal on Computing, vol. 18, no. 1, pp. 186-208, 1989.
https://people.csail.mit.edu/silvio/Selected%20Scientific%20Papers/Proof%20Systems/The_Knowledge_Complexity_Of_Interactive_Proof_Systems.pdf （最終アクセス: 2026年1月9日）

[8] J. Groth, "On the Size of Pairing-Based Non-interactive Arguments," in Advances in Cryptology – EUROCRYPT 2016, pp. 305-326, 2016.
https://eprint.iacr.org/2016/260.pdf （最終アクセス: 2026年1月9日）

[9] iden3, "SnarkJS: zkSNARK implementation in JavaScript & WASM," 2023.
https://github.com/iden3/snarkjs （最終アクセス: 2026年1月9日）

[10] iden3, "Circom: zkSNARK circuit compiler," 2023.
https://github.com/iden3/circom （最終アクセス: 2026年1月9日）

[11] L. Grassi et al., "Poseidon: A New Hash Function for Zero-Knowledge Proof Systems," in USENIX Security 2021, pp. 519-535, 2021.
https://www.usenix.org/system/files/sec21-grassi.pdf （最終アクセス: 2026年1月9日）

[12] FIDO Alliance, "FIDO2: Web Authentication (WebAuthn)," 2019.
https://fidoalliance.org/fido2/ （最終アクセス: 2026年1月9日）

[13] O. Yilmaz et al., "A Systematic Literature Review on Blockchain-Based Systems for Academic Certificate Verification," IEEE Access, vol. 11, pp. 64679-64696, 2023.
https://ieeexplore.ieee.org/document/10163764/ （最終アクセス: 2026年1月9日）

[14] Sovrin Foundation, "Sovrin: A Protocol and Token for Self-Sovereign Identity and Decentralized Trust," Sovrin Foundation Whitepaper, 2018.
https://sovrin.org/library/ （最終アクセス: 2026年1月9日）

[15] M. Rosenberg et al., "ZK-Creds: Flexible Anonymous Credentials from zkSNARKs and Existing Identity Infrastructure," in IEEE Symposium on Security and Privacy (SP), 2023, pp. 1-18.
https://eprint.iacr.org/2022/878.pdf （最終アクセス: 2026年1月9日）

[16] W3C, "Decentralized Identifiers (DIDs) v1.0," W3C Recommendation, 2022.
https://www.w3.org/TR/did-core/ （最終アクセス: 2026年1月9日）

[17] W3C, "Verifiable Credentials Data Model v1.1," W3C Recommendation, 2022.
https://www.w3.org/TR/vc-data-model/ （最終アクセス: 2026年1月9日）

[18] J. Nielsen, "Why You Only Need to Test with 5 Users," Nielsen Norman Group, 2000.
https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/ （最終アクセス: 2026年1月9日）


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