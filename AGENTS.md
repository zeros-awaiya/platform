<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# あわい屋ZEROS 学習プラットフォーム

医療・介護組織向けのLMS（学習管理システム）。このファイルが **Claude Code と Antigravity 共通の正本**（CLAUDE.md は `@AGENTS.md` でここを参照）。編集したら両方のツールに効く。

- 本番: https://platform-1iec.vercel.app/ （Vercel、git push で自動デプロイ）
- 技術: Next.js 16 App Router（**JavaScript、TypeScriptではない**）+ Supabase（Auth/DB/Storage）+ Tailwind 4 + CSS Modules
- Supabase: ref=`wrunobvmzghzwwjtlqry` / URL=`https://wrunobvmzghzwwjtlqry.supabase.co`
- 開発: `npm run dev` / `npm run build` / `npm run lint`

## アプリ構成（src/）

| ルート | 対象 | 備考 |
|---|---|---|
| `app/login` | 全員 | メールはtrimしてから認証（過去に空白で認証失敗のバグ） |
| `app/dashboard` | 受講者(LEARNER) | コース受講・ロードマップ・履歴・プロフィール |
| `app/org` | 組織管理者(ORG_ADMIN) | 自組織のユーザー管理 |
| `app/admin` | システム管理者(SYSTEM_ADMIN) | コース/カテゴリ/ロードマップ/組織/ユーザー/通知/必須研修/監査 |
| `app/api` | - | `health`（keep-alive用）、`integrations/*`（外部連携API、認可は `utils/integrationAuth.js`） |

- ページの型: `page.js`（Server Component）＋ `XxxClientPage.js`（Client）＋ `actions.js`（Server Actions）。新画面もこの3点セットに従う。
- 認可ガード: `src/utils/auth/guard.js`。Supabaseクライアントは `src/utils/supabase/{client,server,middleware,admin}.js` を使い分け（新規に生成しない）。
- ロールは `SYSTEM_ADMIN` / `ORG_ADMIN` / `LEARNER`。RLSは `get_my_role()` / `get_my_org_id()` 関数ベース（`supabase/migrations/20260609000000_init.sql`）。

## データモデル（要点）

- 階層: `categories` → `courses` → `lessons`。ロードマップは `learning_paths`（+`learning_path_courses`, `user_learning_paths`）。他に `organizations`, `departments`, `users`, `enrollments`, `lesson_progress`, `mandatory_courses`, `course_visibility`, `notifications`, `audit_logs`, `quiz_questions`, `quiz_attempts`。
- `lessons.content_type` ∈ {video, article, quiz, pdf, word, powerpoint, url}。
- ID規約: `<8桁prefix>-0000-4000-8000-000000000000`（例: コースL1-A=`a1a00000`、AIコース=`b0a10000`）。
- クイズ設計（全コース統一）: 動画レッスン=奇数sort(1,3,5…)、直後に動画別クイズ3問(sort=動画+1)、コース末に総合クイズ5問(sort=99)。設問は `quiz_questions`(lesson_id, question, option_a〜d, correct_option, sort_order)。
- ⚠️ **lessons削除の落とし穴**: `lesson_progress` が残っていると `trg_update_course_enrollment_progress` が course_id null違反で失敗する。**先に lesson_progress を削除 → lesson を削除**。

## 本番DBの操作ルール（最重要）

1. **本番DBへの書き込みは、必ずZEROS（ユーザー）の了承を得てから実行する。** SQL・スクリプトの生成までは自由。
2. この環境には **psql も DB接続文字列も無い**。反映は **service_role キー + `@supabase/supabase-js`(REST)** で行う。
   ⚠️ **鍵をコマンド文字列に直接書かない。必ず一時ファイル経由で渡す**:
   ```bash
   # 1) 受領した鍵を一時ファイルへ（リポジトリ外・Dropbox外。セッション用 scratchpad が最適）
   #    ★ここでも鍵はコマンド文字列に載せない。エディタ/Write ツールでファイルに書く。
   # 2) 実行（鍵は $(cat) で読ませる。コマンド文字列には鍵が現れない）
   SUPABASE_URL=https://wrunobvmzghzwwjtlqry.supabase.co \
     SERVICE_ROLE_KEY="$(cat "$SBKEY_FILE")" node <script.mjs>
   # 3) 使い終わったら即削除
   rm -f "$SBKEY_FILE"
   ```
3. `SERVICE_ROLE_KEY` は毎回ユーザーから受け取る。**保存・コミット・メモリ記録は禁止**。使用後は鍵の一時ファイル・`.sbkey` 等のキャッシュを削除。
   **★なぜコマンド文字列に載せてはいけないか（2026-09-15 の実測）**:
   Claude Code の権限モデルは**コマンド文字列そのものを同一性の単位にする**ため、
   `SERVICE_ROLE_KEY="eyJ..." node x.mjs` を一度許可すると、**その文字列が丸ごと
   `settings.local.json` の `permissions.allow` に平文で保存される**（＝許可ルールが鍵になる）。
   実際に 4 件の allow エントリに service ロールキーが平文で残り、Dropbox 同期・
   週次バックアップ・会話ログへ複製されていた。この運用ルールは **git に対しては完璧に機能した**
   （45リポジトリ全履歴で0件）が、許可ルール経由の経路だけが塞がっていなかった。
   上の `$(cat ...)` 形なら、実行されるコマンド文字列に鍵が一度も現れないので、
   許可ルールに保存されても無害になる（＝構造的に漏れない）。
   入口には PreToolUse フック（`~/.claude/hooks/guard-secret-in-command.js`）と
   `permissions.deny` の `Bash(*eyJ*)` が入っており、鍵を載せたコマンドは**実行前に拒否される**。
4. 汎用反映ツール: `supabase/tools/quiz_apply_template.mjs`（`MODE=list` で実測 → CONFIG記入 → apply）。
5. seed は `supabase/seed_*.sql`（固定UUID・冪等）。**正本=`seed_ai_quiz_per_video.sql`、旧 `seed_ai_quiz.sql` は廃止**（流すと現行設計を破壊）。再現SQLは `supabase/quiz_pv/<courseId8>.sql`。
6. クイズ展開の残作業インベントリ: `supabase/QUIZ_ROLLOUT_PLAN.md`（着手前に必ず読む）。

## デプロイ・運用

- Vercel 環境変数: `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`（ローカル `.env.local` はプレースホルダーのみ）。
- Supabase無料枠の休止防止: UptimeRobot が `/api/health` を定期打鍵。手順は `deploy_guide.md`。
- リモート: https://github.com/zeros-awaiya/platform

## 関連システム・スキル

- コンテンツ制作の上流は別フォルダ `Dropbox/あわい屋ZEROSのコンテンツ`（ハブ）。教材・動画を作ってから本リポジトリのDBへ投入する流れ。工程はハブの router スキルの4パイプライン（A教材/B動画化/C記事/Dリサーチ）に固定。
- Claude Code 用スキル（Antigravity はドキュメントとして参照可）:
  - `platform-deploy`（ハブ `.claude/skills/`）… コース・メディアのDB/Storage投入手順の地図
  - `zeros-quiz-rollout`（`~/.claude/skills/`）… クイズ作成・反映の正本
- 設計ドキュメント: `docs/training-framework-and-skillmap.md`（研修体系・スキルマップ）、`docs/integration-design-*.md`（外部連携設計）。

## 情報循環グラフ（AI組織の記憶）

- 生成: `npm run graph`（本リポジトリ対象）/ `npm run graph -- --root "<ハブのパス>"`（ハブ対象）。ハブ初期化は `npm run graph:init -- --root <パス>`（冪等・上書きなし）。生成物は `<対象ルート>/graph/current/`。
- 質問: `npm run graph:query -- <質問> [--root <パス>]`。質問= `awaiting-approval`（承認待ち）/ `unsupported-decisions`（根拠なし判断）/ `unreviewed-artifacts`（未確認成果物）/ `impact --target <パス|ID>`（影響先）/ `stale-tasks`（停滞タスク）/ `diff`（時間差分）。日次スナップショットは `npm run graph:snapshot`。試験は `npm run graph:test`（一時ディレクトリのみ使用・本物のハブには書かない）。
- 運用: AI作業の節目（採用・却下・方針決定）には判断記録をハブの `decisions/` に書く（`_TEMPLATE.md` を複製）。新規成果物には来歴フロントマター（`outputs/_TEMPLATE.md`）を付け、更新は上書きせず `supersedes` で旧版を指す。チャットで決まったことをチャットに置いたままにしない。
- 設計・手順: `docs/ai-org-knowledge-graph-plan.md`（計画と実現可能性判断）/ `docs/ai-org-knowledge-graph-phase2-guide.md`（ハブ展開のローカル手順）。
