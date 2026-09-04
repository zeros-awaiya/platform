# NGコース（調整交渉術） クイズ展開 ─ 作業メモ（2026-08-24指示箱処理分）

## やったこと
- 指示「学習PFの次コースにクイズを展開する」を受け、`supabase/QUIZ_ROLLOUT_PLAN.md` §7の推奨順（CB→NG→…）と
  `quiz_CB_ROLLOUT_NOTE.md`「次はNG」を確認。CBは既に反映スクリプト作成済み・本番反映は未実施（BOSS承認待ち）のため、
  今回は**次コース=NG（調整交渉術, b0e90000）**のクイズ展開スクリプトを新規作成。
- NGの動画id/URL（`seed_ng_video_lessons.sql`）と旧問題バンク（`seed_ng_quiz.sql`・9レッスン×5問）を突き合わせ、
  動画別クイズ（各3問・CBと同じ機械的ルール＝各レッスンの1問目・2問目・4問目を採用、正解キーは元seedのkeyコメントと1問ずつ照合済み）と
  コース末総合クイズ（新規5問・9レッスンを横断する構成）を設計。
- 反映スクリプト `supabase/tools/quiz_NG.mjs` を作成済み（`quiz_apply_template.mjs`／`quiz_CB.mjs`と同一構造でNG用にCONFIG記入）。`node --check`で構文確認済み。

## 成果物
- `C:\Users\admin\dev\platform\supabase\tools\quiz_NG.mjs`（反映スクリプト、CONFIG記入済み）
- `C:\Users\admin\dev\platform\supabase\quiz_NG_ROLLOUT_NOTE.md`（本メモ）

## 未実施（本番反映は行っていない）
理由: 本番Supabase反映には `SERVICE_ROLE_KEY`（秘匿・毎回ユーザーから受領する運用）が必須だが、
今回は指示箱の自動処理（非対話）のため受け取れない。加えてユーザーの作業ルールで
「本番反映（Supabase反映）は実行前に必ず確認」となっているため、BOSS確認なしに進めない。
（CBも同じ理由で2026-08-06〜08-21に反映待ちのまま停滞中。CBとNG、2コース分がBOSS承認待ちで並んでいる状態。）

## 次の一手（BOSSにお願いしたいこと）
1. まずCBとNG、どちらから本番反映するか（または両方まとめて）を決めていただく。
2. 各コースで現況確認（本番の動画id/sortが前提と一致するか）:
   ```
   MODE=list COURSE_ID=b0e90000-0000-4000-8000-000000000000 \
     SUPABASE_URL=https://wrunobvmzghzwwjtlqry.supabase.co SERVICE_ROLE_KEY="<受領>" \
     node supabase/tools/quiz_NG.mjs
   ```
3. 問題なければ本番反映（動画9本のsort更新＋クイズ10本(動画別9+総合1)の作成＋設問45問の投入）:
   ```
   SUPABASE_URL=https://wrunobvmzghzwwjtlqry.supabase.co SERVICE_ROLE_KEY="<受領>" \
     node supabase/tools/quiz_NG.mjs
   ```
   → 成功すると `supabase/quiz_pv/b0e90000.sql`（再現用SQL）が自動生成される。それをコミット。
4. 検証: MODE=listを再実行し「動画→3問→…×9→総合5問」の並びと各設問数を確認。
5. 完了したら `QUIZ_ROLLOUT_PLAN.md` の該当行（NG）を「済」に更新し、次は**新社会人/L07-D（バンク有り）→CC→L1〜MT**へ進む。

## BOSS確認事項
- 動画別クイズの3問選定は、CBと同じ機械的ルール（1問目=定義、2問目=具体例/特徴、4問目=手順/応用の位置）で
  旧5問バンクから精選した。内容の重要度で差し替えたい設問があれば `quiz_NG.mjs` の該当 `Q:[...]` 配列を直接編集してから反映してください。
- コース末総合5問は新規作成（9レッスンを横断するテーマ：交渉vs調整の姿勢／立場と利害／代替案の役割／感情の扱い／妥協と統合）。
  既存バンクには総合5問が無いため、内容の確認をお願いします。
- CBの本番反映も未着手のまま並んでいます。着手順（CB先行 or NG先行）の指示をお願いします。

STATUS: partial
