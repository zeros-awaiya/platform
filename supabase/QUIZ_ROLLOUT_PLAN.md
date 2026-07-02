# クイズ展開プラン（動画3問＋コース末5問）── 次セッション開始用ハンドオフ

最終更新: 2026-06-29 / **A群 全26コース完了**（残り=B群11コースのみ）
- 完了(各動画3問+コース末5問): AI・L07-A/B/C/D・L1全6・L2全6・L3全6・MT-C/M/K = 26コース。
- A群の型: 既存コース末5問は末尾sort99へ、動画別3問(id=動画IDの index5→'9')を追加。台本=`03_教育コース工場/04_courses/<LEVEL>_<AREA>-<n>_*.md`。
- ツール: 作問はサブエージェント並列(台本Read→JSON)、反映は `scratchpad/apply_group_a.mjs`(GA_DIR=json群)。再現SQLは `supabase/quiz_pv/<courseId8>.sql`。
- **B群の動画整理 完了(2026-06-29)**: CC-01〜08(各 動画1・記事削除済・sort1)／L0.1新社会人(動画3・記事削除済・sort1〜3)／CB(seed_cb_video_lessonsで動画9投入・記事削除済・sort1〜9)。→ CB/CC/L0.1 は**クイズ投入可能な状態**になった(バンク: seed_cb_quiz / seed_l01_l07d_quiz / seed_cc_quiz、または本文)。
  - 注意(重要): 記事削除は `lesson_progress` があるとトリガー`trg_update_course_enrollment_progress`が`enrollments.course_id`null違反で失敗する。**先に該当lesson_progressを削除→その後lesson削除**の順で回避(L0.1で対処済)。
- **NG(調整交渉術, b0e90000)は未着手**: 動画レッスンのseedもYouTube URLも存在せず=**動画が未制作**。動画を作って seed(seed_ng_video_lessons相当)を用意するまで動画整理・クイズとも不可。
- **残クイズ対象**: CB(9動画)・CC-01〜08(各1動画)・L0.1(3動画) にA群と同じ要領で動画別3問を付与可能(コース末5問は既存 or CB/L0.1はバンク流用)。

## 実測による分類（2026-06-29・本番DB）
- **A: 即クイズ可（記事0の綺麗な動画コース／バンク無し→台本 `03_教育コース工場/04_courses/*.md` から新規作成）**
  L07-A(3v)・L07-B(3v)・L07-C(2v)・L1-A〜F(16v)・L2-A〜F(25v)・L3-A〜F(23v)・MT-C(10v)・MT-K(5v)・MT-M(5v) … 計22コース・約92本
- **B: 一本化が先（クイズ以前に動画整理が必要）**
  - 記事残存(動画と併存): CC-01〜08(各1v+1a)・L0.1新社会人(3v+3a) … 本編article削除→動画を先頭へ、が未適用
  - 動画0(未一本化): CB(0v+9a)・NG(0v+9a) … 動画レッスンの投入(seed_pf_video_consolidation相当)が未適用
- **済**: AI活用(9v・動画別9+総合1)・L07-D(1v・動画別1+総合1=`seed_l07d_quiz_per_video.sql`)
- バンク有り: CB=seed_cb_quiz / NG=seed_ng_quiz / L0.1=seed_l01_l07d_quiz（ただしBの一本化後に使用）

## 0. これは何
全コースのクイズを次の形に統一する作業の計画書。AIコースを実装済みの「正本」とし、同じ形を他コースへ展開する。
- **各動画の直後に「動画別クイズ（3問）」** を1つ配置
- **コース末に「総合クイズ（5問）」** を1つ配置

## 1. 完了済みの正本（参照せよ）
- 設計・SQL: [seed_ai_quiz_per_video.sql](seed_ai_quiz_per_video.sql)
- 生成/反映スクリプト（汎用テンプレートの元）: `supabase/tools/quiz_apply_template.mjs`
- AIコース最終状態: 動画9 + 動画別クイズ9(各3問) + 総合1(5問)。動画 sort=1,3..17 / 動画別 sort=2,4..18 / 総合 sort=99。

## 2. 反映方法（重要・前提）
この環境には **psql 無し・DB接続文字列(パスワード)無し**。本番反映は **service_role キー + @supabase/supabase-js (REST)** で行う（[[project_zeros_lms_supabase反映]] 参照）。
- service_role キーは秘匿。**毎回ユーザーから受け取る**（リポジトリにも本書にも書かない）。
- SUPABASE_URL = `https://wrunobvmzghzwwjtlqry.supabase.co`
- @supabase/supabase-js はリポジトリの node_modules に導入済み → スクリプトはリポジトリ直下から実行可能。
- 実行例:
  ```bash
  SUPABASE_URL="https://wrunobvmzghzwwjtlqry.supabase.co" SERVICE_ROLE_KEY="＜キー＞" \
    node supabase/tools/quiz_apply_template.mjs
  ```

## 3. ID・sort 規約（コースごとに踏襲）
- 動画レッスン id は既存（コースごとに異なる）。これを **奇数 sort (1,3,5…)** に並べ替える。
- **動画別クイズ id**: 各動画 id から決定論的に1つ割り当てる（AI例: 動画 `b0a10X50` → クイズ `b0a10X90`）。コースごとにスキームを明示し、衝突しないこと。
- **コース末総合クイズ id**: コースごとに固定の専用UUIDを1つ（AI例: `b0a1f000-...`）。
- 動画別クイズ sort = その動画 sort + 1（偶数）。総合クイズ sort = 99。
- 冪等性: 動画 sort=固定値 / quizレッスン=ON CONFLICT(id) DO UPDATE / 設問=lesson_id単位で DELETE→INSERT。

## 4. 設問の作り方（品質担保）
- **本文ソース**: [seed_themetracks_catalog.sql](seed_themetracks_catalog.sql)（全コースの `article_content` 600KB）。憶測で作らず必ず本文準拠。
- **正解キーは1問ずつ内容照合**（旧seedにはキー誤りの実績あり。AI-05で発見・回避済み）。
- 設問数は厳守: 動画別=3問 / 総合=5問（quiz_questions は各3〜5問の範囲）。
- **既存の問題バンクを再利用できるコースあり**（旧設計の各5問seed。動画別3問はここから精選、総合5問は横断構成 or 既存5問を流用）:
  | コース | 問題バンク(旧設計seed・未適用) | 形式 |
  |---|---|---|
  | CB（臨床と経営のあいだ, b0cb0000) | [seed_cb_quiz.sql](seed_cb_quiz.sql) | 9レッスン×5問 |
  | NG（調整交渉術, b0e90000) | [seed_ng_quiz.sql](seed_ng_quiz.sql) | 9レッスン×5問 |
  | L0.1（新社会人, a01a0000)・L07-D(a07d0000) | [seed_l01_l07d_quiz.sql](seed_l01_l07d_quiz.sql) | 計4レッスン×5問 |
  | CC-01〜08 | [seed_cc_quiz.sql](seed_cc_quiz.sql) | コース末5問(適用済) |
  | L1系 | [seed_quiz_l1.sql](seed_quiz_l1.sql) | コース末5問(適用済) |
  | L2/L3/MT/L07系 | [seed_quiz_rest.sql](seed_quiz_rest.sql) | コース末5問(適用済) |
  バンクが無い動画には catalog本文から新規作成。

## 5. 残作業インベントリ（2026-06-29 時点の本番DB実測）
**全36コースで「動画別3問」は未実装**（どのコースにも動画単位クイズが無い）。
**「コース末5問」が未実装のコース（4つ）**: 新社会人(L0.1)・L07-D・CB・NG。他32コースは適用済み。

| 区分 | コース | content本数 | 動画別3問 | コース末5問 |
|---|---|---|---|---|
| 済 | AI活用 | 9 | ✅完了 | ✅完了 |
| 要 | 新社会人の教科書(L0.1) | 6 | 未 | **未** |
| 要 | L07-A / L07-B / L07-C | 3/3/2 | 未 | 済 |
| 要 | L07-D 数字と、向き合う | 1 | 未 | **未** |
| 要 | L1-A〜F | 5/4/3/2/2/2 | 未 | 済 |
| 要 | L2-A〜F | 5/5/4/4/4/3 | 未 | 済 |
| 要 | L3-A〜F | 4/4/4/4/4/3 | 未 | 済 |
| 要 | MT-C / MT-M / MT-K | 10/5/5 | 未 | 済 |
| 要 | CC-01〜08 | 各2 | 未 | 済 |
| 要 | CB(臨床と経営のあいだ) | 9 | 未 | **未** |
| 要 | NG(調整交渉術) | 9 | 未 | **未** |

合計の目安: 動画別 ≈ (全動画106本)×3問、コース末 4コース×5問。

> ⚠️ **動画の有無を必ず先に確認**: 一部コースは一本化(本編article→動画)が本番未適用で、本番DBに動画レッスンが存在しない。
> 例: **CB は本番で video=0・article=9**（動画未投入）。この状態では「動画別クイズ」を付けられないので、先に動画レッスンの投入（= seed_pf_video_consolidation.sql 相当の一本化）が必要。
> `MODE=list` で各コースの video 本数を確認してから着手すること（テンプレは apply 時に video 不在を検知して停止する）。

## 6. 1コースを処理する手順（チェックリスト）
1. `quiz_apply_template.mjs` を該当コース用にコピー（例 `quiz_CB.mjs`）。
2. `MODE=list` で対象コースの video レッスン（id/title/sort）を取得 → 設問作成の足場にする。
3. catalog本文 or 問題バンクseed を読み、各動画3問＋総合5問を作成（キー照合）。
4. configに動画id→クイズidスキーム・総合クイズid・設問を記入。
5. `MODE=apply` で本番反映（service_roleキーをユーザーから受領）。
6. 検証: コース内 lessons を sort 順表示し「動画→3問→…→総合5問」と各設問数を確認。
7. 再現用 SQL seed を `seed_<course>_quiz_per_video.sql` として出力・コミット。

## 7. 次セッションの開始トリガー
「クイズ展開を始めて」と言われたら本書 §5 の上から着手。推奨順: **CB → NG → 新社会人/L07-D（バンク有り＝速い）→ CC → L1 → L2 → L3 → MT → L07A-C**。
1コースずつ反映・検証・コミットして進める。
