# CBコース クイズ展開 ─ 作業メモ（2026-08-06指示箱処理分）

## やったこと
- `supabase/QUIZ_ROLLOUT_PLAN.md` §7の推奨順（CB→NG→…）に従い、**次コース=CB（臨床と経営のあいだ, b0cb0000）**と判定。
- CBの動画id/URL（`seed_cb_video_lessons.sql`）と旧問題バンク（`seed_cb_quiz.sql`・9レッスン×5問）を突き合わせ、
  動画別クイズ（各3問・既存の正解キーと1問ずつ照合済み）とコース末総合クイズ（新規5問・9レッスンを横断する構成）を設計。
- 反映スクリプト `supabase/tools/quiz_CB.mjs` を作成済み（`quiz_apply_template.mjs` をCB用にCONFIG記入したもの。そのまま実行可能）。

## 成果物
- `C:\Users\admin\dev\platform\supabase\tools\quiz_CB.mjs`（反映スクリプト、CONFIG記入済み）

## 未実施（本番反映は行っていない）
理由: 本番Supabase反映には `SERVICE_ROLE_KEY`（秘匿・毎回ユーザーから受領する運用）が必須だが、
今回は指示箱の自動処理（非対話）のため受け取れない。加えてユーザーの作業ルールで
「本番反映（Supabase反映）は実行前に必ず確認」となっているため、BOSS確認なしに進めない。

## 次の一手（BOSSにお願いしたいこと）
1. まず現況確認（本番の動画id/sortが本メモの前提と一致するか）:
   ```
   MODE=list COURSE_ID=b0cb0000-0000-4000-8000-000000000000 \
     SUPABASE_URL=https://wrunobvmzghzwwjtlqry.supabase.co SERVICE_ROLE_KEY="<受領>" \
     node supabase/tools/quiz_CB.mjs
   ```
2. 問題なければ本番反映（このコマンドは動画9本のsort更新＋クイズ10本(動画別9+総合1)の作成＋設問45問の投入を行う）:
   ```
   SUPABASE_URL=https://wrunobvmzghzwwjtlqry.supabase.co SERVICE_ROLE_KEY="<受領>" \
     node supabase/tools/quiz_CB.mjs
   ```
   → 成功すると `supabase/quiz_pv/b0cb0000.sql`（再現用SQL）が自動生成される。それをコミット。
3. 検証: MODE=listを再実行し「動画→3問→…×9→総合5問」の並びと各設問数を確認。
4. 完了したら `QUIZ_ROLLOUT_PLAN.md` の該当行（CB）を「済」に更新し、次は **NG（調整交渉術, b0e90000）** へ進む
   （バンク `seed_ng_quiz.sql` あり。CBと同じ手順で `quiz_NG.mjs` を作る）。

## BOSS確認事項
- 動画別クイズの3問選定（各5問バンクから3問を精選）は機械的な均一ルール（1問目=定義, 2問目=特徴の除外式, 4問目=手順/応用）で選んだため、
  内容の重要度で差し替えたい設問があれば `quiz_CB.mjs` の該当 `Q:[...]` 配列を直接編集してから反映してください。
- コース末総合5問は新規作成（9レッスンを横断するテーマ）。既存バンクには総合5問が無いため、内容の確認をお願いします。

STATUS: partial
