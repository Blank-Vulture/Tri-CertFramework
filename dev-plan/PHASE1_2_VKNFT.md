# Phase 1.2 - VKNFT 自動配布ワークフロー設計

## ゴール
- `VKNFT/<year>/` フォルダに署名済みバンドル（ZIP + 署名 + manifest + vk.json）を整備する。
- Executive Console からの出力～Ledger 署名～GitHub Releases 公開がワンストップで走るようにする。
- 後続の VKNFT ミント / Verifier 検証で参照できるメタデータを揃える。

## 段取り

### 0. リポジトリ準備
1. `VKNFT/` 直下に年度単位ディレクトリを作成するオーガナイザーを導入。
2. Git 管理対象にするための `.gitkeep` などを配置（必要に応じて）。

### 1. Executive Console 改修
1. Circuit 生成後に、`VKNFT/<year>/` を自動作成。既存ファイルがある場合はバージョン番号付きで退避。
2. 生成物 (`commitment_<year>.wasm`, `commitment_final_<year>.zkey`, `vkey_<year>.json`) をまとめた ZIP を作成。
3. Manifest (`manifest.json`) に以下を記録：
   - SHA3-256 ハッシュ（ZIP / 各ファイル）
   - Ledger 署名者情報（Key ID, 署名アルゴリズム）
   - Git コミット / Circom バージョン / 生成日時などのトレーサビリティ情報
4. Ledger Nano X で ZIP に署名（`.zip.sig`）。失敗した場合はロールバック。
5. 生成ログを `bundle.log` として保存。

### 2. CLI / スクリプト整備
1. `scripts/prepare-vknft.ts` を追加し、指定年度のバンドル生成～署名～manifest 更新を CLI からも実行可能にする。
2. 生成完了後に Git 操作（`release` ブランチへ commit -> push）を半自動化する。

### 3. GitHub Actions ワークフロー
1. `/.github/workflows/release-vknft.yml` を追加。
2. トリガー： `release` ブランチへの push。
3. ジョブ内容：
   - `VKNFT/**` を走査し、`manifest.json` の年度ごとに署名検証＆ZIP 展開テスト。
   - 成功した年度の ZIP / `.sig` / `manifest.json` / `vk.json` を GitHub Releases にアップロード。
   - リリースノートに SHA3 ハッシュ・検証手順を追記。
4. 失敗時はリリースをキャンセルし、通知（Slack/メール）が飛ぶようにする（任意）。

### 4. ドキュメント & UI 反映
1. `dev-plan` と README に VKNFT フロー、検証手順を追記。
2. Executive Console の UI に、生成済みバンドルの一覧と署名検証ステータスを表示。
3. Verifier UI には「GitHub Releases の URL を貼ると自動検証する」補助導線を追加する計画を別途策定。

### 5. 将来拡張メモ
- Phase 2 では web3.storage へのアップロードを追加（CID を manifest に追記）。
- VKNFT コントラクトのミントスクリプトは、ここで生成した `manifest.json` を参照する。

---

## 進捗チェックリスト
- [ ] `VKNFT/<year>/` 自動作成と ZIP/署名出力
- [ ] Manifest & 署名ログの整備
- [ ] CLI スクリプトによる一括実行
- [ ] GitHub Actions リリースワークフロー
- [ ] ドキュメント更新と UI 反映計画

