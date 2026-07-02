# あわい屋ZEROS 学習プラットフォーム

医療・介護組織向けのLMS（学習管理システム）。組織ごとに受講者・コース・ロードマップ（学習パス）・必須研修を管理し、動画＋確認クイズで学習を進める。

- 本番: https://platform-1iec.vercel.app/
- 技術: Next.js 16 (App Router, JavaScript) + Supabase (Auth/DB/Storage) + Tailwind CSS 4

## 画面構成

| ルート | 対象ロール | 内容 |
|---|---|---|
| `/login` | 全員 | ログイン |
| `/dashboard` | LEARNER | コース受講・ロードマップ・学習履歴・プロフィール |
| `/org` | ORG_ADMIN | 自組織のユーザー管理・ダッシュボード |
| `/admin` | SYSTEM_ADMIN | コース/カテゴリ/ロードマップ/組織/ユーザー/通知/必須研修/監査エクスポート |
| `/api/health` | - | DB keep-alive 用ヘルスチェック |
| `/api/integrations/*` | - | 外部システム連携API（コース取得・ロードマップ割当） |

## 開発

```bash
npm install
npm run dev    # http://localhost:3000
npm run build
npm run lint
```

環境変数（`.env.local`）:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## データベース

- スキーマ: `supabase/migrations/`（RLSは組織ID＋ロール関数ベース）
- 初期データ・コース投入: `supabase/seed_*.sql`（固定UUID・冪等）
- クイズ展開の計画・規約: `supabase/QUIZ_ROLLOUT_PLAN.md`
- 反映ツール: `supabase/tools/quiz_apply_template.mjs`（service_role キー + REST）

## デプロイ

`main` への push で Vercel が自動デプロイ。初期セットアップと Supabase 無料枠の休止防止（UptimeRobot による `/api/health` 監視）は `deploy_guide.md` を参照。

## AI エージェント向け

作業規約・データモデル・本番DB操作ルールは `AGENTS.md`（Claude Code / Antigravity 共通の正本）を参照。
