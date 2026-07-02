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
2. この環境には **psql も DB接続文字列も無い**。反映は **service_role キー + `@supabase/supabase-js`(REST)** で行う:
   ```bash
   SUPABASE_URL=https://wrunobvmzghzwwjtlqry.supabase.co SERVICE_ROLE_KEY="<毎回ユーザーから受領>" node <script.mjs>
   ```
3. `SERVICE_ROLE_KEY` は毎回ユーザーから受け取る。**保存・コミット・メモリ記録は禁止**。使用後は `.sbkey` 等のキャッシュを削除。
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
