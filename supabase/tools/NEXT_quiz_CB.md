# CB（臨床と経営のあいだ）クイズ展開 ─ 次の一手

QUIZ_ROLLOUT_PLAN.md §7 推奨順の1番目「CB」に着手。`supabase/tools/quiz_CB.mjs` を作成済み（CONFIG記入済み・未実行）。

## できたこと
- 対象コース確定: CB（臨床と経営のあいだ, course_id=b0cb0000-0000-4000-8000-000000000000, 動画9本）
- 動画別クイズ3問×9本＋総合クイズ5問を、既存の検証済み問題バンク `supabase/seed_cb_quiz.sql`（本文準拠・正解キー照合済み）から精選して構成。新規作文なし＝ソース逸脱リスクなし。
- 動画id→クイズidは既存の命名規則（b0cb0X50→b0cb0X90）をそのまま踏襲、総合クイズidは新規 `b0cbf000-0000-4000-8000-000000000000`（AI活用コースの `b0a1f000` 命名規則に倣った）。
- 反映スクリプト `supabase/tools/quiz_CB.mjs` を作成済み（list/apply両モード対応、テンプレの健全性チェック・冪等性ロジックそのまま）。

## 未実行（このセッションではできなかったこと）
本番反映には `SERVICE_ROLE_KEY` が必要（毎回ユーザーから受領する秘匿情報のため、指示箱の自動実行では取得できない）。

## 次にやること（BOSSまたは対話セッションで）
1. `npm i @supabase/supabase-js`（platformリポジトリ直下。未導入の可能性あり）
2. list モードで本番の動画id・sort実測を確認（CONFIGのvideoIdと一致するか）:
   ```
   MODE=list COURSE_ID=b0cb0000-0000-4000-8000-000000000000 SUPABASE_URL=https://wrunobvmzghzwwjtlqry.supabase.co SERVICE_ROLE_KEY=<受領> node supabase/tools/quiz_CB.mjs
   ```
3. 一致していれば apply モードで本番反映:
   ```
   SUPABASE_URL=https://wrunobvmzghzwwjtlqry.supabase.co SERVICE_ROLE_KEY=<受領> node supabase/tools/quiz_CB.mjs
   ```
   → 動画sortを1,3,5..17に更新／quizレッスン9+1を作成／設問36+5を投入／再現SQLを `supabase/quiz_pv/b0cb0000.sql` に自動生成。
4. 検証: 同courseIdでlist再実行し「動画→3問→…→総合5問」の並びと設問数を確認。
5. 生成された `supabase/quiz_pv/b0cb0000.sql` をコミット。
6. QUIZ_ROLLOUT_PLAN.md の該当行を「済」に更新。
7. 次コースへ: NG（調整交渉術）→ 新社会人/L07-D → CC → L1 → L2 → L3 → MT → L07A-C（バンク`seed_ng_quiz.sql`等が使える）。

## BOSS確認事項
- 総合クイズ5問は「精選から漏れた5問」をレッスン横断（CB-01/03/04/06/08）で構成した。AIコースのように独自の横断視点の書き下ろしではないため、必要なら差し替え可。
- SERVICE_ROLE_KEYはこの報告書にもコードにも書いていない（毎回受け渡しが必要）。
