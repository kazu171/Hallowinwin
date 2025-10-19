# AGENTS.md

エージェント（Codex など）がこのリポジトリで安全かつ効率よく作業するための手順・規約をまとめています。README は人間向け、AGENTS.md はエージェント向けの運用指針です。

## プロジェクト概要
- Stack: React + TypeScript + Vite + Tailwind + Supabase
- パスエイリアス: `@/*`（`vite-tsconfig-paths` 経由）
- ルート構成の例:
  - `src/` アプリ本体
  - `supabase/` ローカル開発用設定・マイグレーション
  - `public/`, `index.html` など

## セットアップ/実行コマンド
- パッケージマネージャ: pnpm
- 依存関係のインストール: `pnpm install`
- 開発サーバー起動: `pnpm dev`
- 型チェック: `pnpm run check`
- Lint: `pnpm run lint`
- ビルド: `pnpm run build`
- プレビュー: `pnpm run preview`

## テスト方針
- 現時点では自動テストのスクリプトは未設定です。
- 代替として、以下が「合格条件」です:
  1) `pnpm run lint` がエラーなく終了すること
  2) `pnpm run check` がエラーなく終了すること（型チェック）
  3) `pnpm run build` が成功すること
- 将来的にテストフレームワーク導入時は、テスト実行コマンド・合格基準・失敗時の再試行方針を本ファイルに追記してください。

## コードスタイル/型の方針
- ESLint 設定: `eslint.config.js` に準拠（`@eslint/js`, `typescript-eslint`, `react-hooks`, `react-refresh`）
- TypeScript: 現在 `strict: false`（将来 `true` への切替を検討）。型エラーは許容しない方針で修正を優先。
- インポート: `@/*` のパスエイリアスを使用可能（`tsconfig.json`/`vite-tsconfig-paths`）。

## PR/コミット規約
- 変更を提案する前に必ず以下をローカルで通してください:
  - `pnpm run lint`
  - `pnpm run check`
  - `pnpm run build`
- PR タイトル例: `[app] フィーチャー説明` / `[db] マイグレーション説明`
- PR 説明には最低限以下を含めてください:
  - 変更概要（Why/What）
  - 影響範囲（どのページ/モジュールに影響するか）
  - ローカル確認手順（起動・確認のステップ）

## セキュリティ/環境変数
- `.env` や秘密鍵はコミット禁止。ログにも出力しないでください。
- Supabase をローカルで利用する場合は、適切な環境変数の設定と `supabase/config.toml` の値に注意してください（本アプリのビルド/型/Lintには必須ではありませんが、機能確認には必要な場合があります）。
- フロントエンド実行に必要な環境変数（.env に配置し Git 管理外）:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- サンプル: `.env.example` を参照し、実値は `.env` に設定（コミット禁止）。
- 注意: `.env.example` はテンプレートです。実値（特にトークンや鍵）は記載しないでください。
- Supabase CLI 認証（PAT）はリポジトリに保存しないでください。推奨運用:
  - 対話式: `supabase login`（端末の安全な保管に委ねる）
  - もしくはシェル環境変数: `SUPABASE_ACCESS_TOKEN`（.env ではなく、シェルのローカル設定に）

## Supabase CLI（Codex/エージェント向け）
目的: マイグレーション管理・ローカル DB 起動・型生成を自動化し、アプリとスキーマの齟齬を防ぐ。

- 前提条件
  - Supabase CLI が導入済み（ローカル環境）。ローカル DB 起動には Docker が必要です。
  - 本リポジトリは `supabase/` ディレクトリ構成を採用しています。

- 認証/プロジェクトリンク
  - 認証: `supabase login`（推奨） または `SUPABASE_ACCESS_TOKEN` をシェルに設定
  - リンク: `supabase link --project-ref <プロジェクトREF>` または package script: `pnpm run db:link`
    - `pnpm run db:link` は PROJECT_REF が未設定の場合、`supabase/.temp/project-ref` を自動参照します。
    - 参考: プロジェクト REF はローカルに保存されている場合があります（例: `supabase/.temp/project-ref`）。

- ローカル DB 起動/停止
  - 起動: `supabase start`
  - 状態確認: `supabase status`
  - 停止: `supabase stop`
  - 注意: ローカル用途のみ。CI/CD での常時起動は避ける。

- マイグレーション運用
  - 既存を最新へ適用（ローカル）: `supabase migration up`
  - 状態確認: `supabase migration list`（CLI v2.40+ 推奨。旧: `status`）
  - 新規作成（空の SQL 生成）: `supabase migration new "<説明>"`
  - 生成した SQL は `supabase/migrations/` に配置。PR では SQL のレビューを必須。
  - 命名規則: ファイル名は `YYYYMMDDHHMMSS_description.sql` 形式。命名規則に合わない SQL は CLI によりスキップされます（必要に応じてリネーム、または CLI 管理外のフォルダへ移動）。
  - 重要: リモート（本番/ステージング）への適用や `db push` は「明示的な指示がある場合のみ」実行可。

- 型生成（アプリとスキーマの同期）
  - パッケージスクリプトで実行: `pnpm run types:gen`
  - 直接実行する場合: `supabase gen types typescript --linked > src/types/database.ts`
  - 型生成後は `pnpm run check` で型不整合がないことを確認。

- 失敗時の対処
  1) CLI のエラーログから原因特定（ポート競合、Docker 未起動、認証エラー等）。また、`supabase migration list` でスキップされたファイルがないかを確認。
  2) 必要なら `supabase stop` → `start` の再起動、または `docker` 側の再起動
  3) マイグレーション失敗は対象 SQL を部分的にロールバック/修正して再実行
  4) 解決しない場合は、実施コマンド・ログ要約・暫定回避策を記録して報告

## 自動実行してよいコマンド（エージェント向け）
- 依存関係: `pnpm install`
- 静的解析/型チェック: `pnpm run lint && pnpm run check`
- ビルド/プレビュー: `pnpm run build`（必要に応じて `pnpm run preview`）
- Supabase CLI（ローカルに限定）:
  - `supabase login`（対話式、または既存のログイン状態の確認）
  - `pnpm run db:link`（PROJECT_REF を使ってリンク）
  - `pnpm run db:start` / `pnpm run db:status` / `pnpm run db:stop`
  - `pnpm run db:migrate:status`（内部で `supabase migration list` を実行） / `pnpm run db:migrate:up` / `pnpm run db:migrate:new`
  - `pnpm run types:gen`

要承認コマンド（明示指示がある場合のみ）
- リモートへ影響する操作全般（例: `supabase db push`, リモートへの migration apply / secrets 設定 など）
- データ破壊を伴う操作（例: `supabase db reset`）

## 禁止/注意事項
- 機密情報（API キー等）の生成・記録・ハードコードは厳禁。
- `dist/` の生成物をコミットしないでください。
- Supabase のマイグレーション変更は明示的に依頼されたタスク以外で行わないでください。
- 画像や静的アセットの大量追加は、依頼がない限り行わないでください。

## モノレポ/スコープ
- 本リポジトリは現状シングルパッケージ構成です。ルートの AGENTS.md を参照してください。
- 将来パッケージが増えた場合は、各パッケージ直下にも AGENTS.md を置き、近接優先（編集中のファイルに最も近い AGENTS.md を採用）で運用してください。

## 失敗時の基本方針（エージェント）
1) `pnpm run lint`/`pnpm run check`/`pnpm run build` の失敗原因をログから特定
2) 自動修正を試みる（最小差分での修正を優先）
3) コマンドを再実行して成功を確認
4) それでも解決しない場合は、失敗理由・試行内容・残課題を明記して結果を出力