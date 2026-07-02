-- =====================================================================
-- 【ワンペースト実行用】AI活用 PF反映 統合SQL  2026-06-29
-- Supabase SQL Editor にこの全文を貼り付けて Run してください。
-- 前提: ① 既存の catalog/lessons/quiz 等のseedは投入済み
--       ② Storageに slides/AI-0X_slides.pdf と worksheets/AI-0X_worksheet.docx をアップロード済み
-- 構成: (1) 動画解説レッスン投入 → (2) 一本化＋資料付与(全コース。AI含む)
-- 冪等: 何度実行しても同じ結果。
-- =====================================================================

-- ========== (1) seed_ai_video_lessons.sql ==========
-- =====================================================================
-- あわい屋ZEROS  AI（AI活用）動画解説レッスン 追加 seed
-- 範囲   : AI-01〜AI-09 の9本（YouTube限定公開済み・2026-06-29アップ）
-- 設計   : AIは1コース(b0a10000)の中に9本(AI-01〜09)が article レッスンで並ぶ構成。
--          各本の article はそのまま残し、直後に content_type='video' の
--          「動画解説」レッスンを挿入してインターリーブする。
--          → AI-01本編(1)→AI-01動画(2)→AI-02本編(3)→AI-02動画(4)→…→AI-09本編(17)→AI-09動画(18)
-- ID規則 : 本編=b0a10X00 / 動画=b0a10X50（X=コース番号 1〜9）。CB/L0.1と同じ流儀。
-- メディア: NotebookLM動画解説→あわい屋ZEROSブランド版(表紙+本編+outro)→YouTube限定公開。
-- 前提   : seed_themetracks_catalog.sql 実行後に流す。
-- 冪等   : 固定UUID + ON CONFLICT(id) DO UPDATE。再実行で重複しません。
-- 補足   : ※再度 seed_themetracks_catalog.sql を流した場合は本編sortが1〜9に戻るため、
--          その後にこの seed を流し直すこと（インターリーブを復元）。
-- =====================================================================

-- 1. 既存の本編 article レッスンの並び順を更新（インターリーブのため 1,3,5,7,9,11,13,15,17 に）
UPDATE public.lessons SET sort_order=1  WHERE id='b0a10100-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=3  WHERE id='b0a10200-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=5  WHERE id='b0a10300-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=7  WHERE id='b0a10400-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=9  WHERE id='b0a10500-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=11 WHERE id='b0a10600-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=13 WHERE id='b0a10700-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=15 WHERE id='b0a10800-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=17 WHERE id='b0a10900-0000-4000-8000-000000000000';

-- 2. 動画解説レッスンを追加（各本編の直後 2,4,6,8,10,12,14,16,18）
INSERT INTO public.lessons (id, course_id, title, content_type, url, file_path, article_content, estimated_minutes, sort_order)
VALUES
  ('b0a10150-0000-4000-8000-000000000000','b0a10000-0000-4000-8000-000000000000',
   'AIに任せる、任せないの線引き ─ 動画解説','video',
   'https://www.youtube.com/watch?v=41f36_0bebk',NULL,NULL,9,2),
  ('b0a10250-0000-4000-8000-000000000000','b0a10000-0000-4000-8000-000000000000',
   'プロンプトの型 ─ 動画解説','video',
   'https://www.youtube.com/watch?v=uwOfyp-WiCg',NULL,NULL,9,4),
  ('b0a10350-0000-4000-8000-000000000000','b0a10000-0000-4000-8000-000000000000',
   '意思決定をAIで磨く ─ 動画解説','video',
   'https://www.youtube.com/watch?v=OU355UxlU5w',NULL,NULL,9,6),
  ('b0a10450-0000-4000-8000-000000000000','b0a10000-0000-4000-8000-000000000000',
   '文書作成と推敲 ─ 動画解説','video',
   'https://www.youtube.com/watch?v=3Oq4M0D0f3o',NULL,NULL,10,8),
  ('b0a10550-0000-4000-8000-000000000000','b0a10000-0000-4000-8000-000000000000',
   '会議と議事録 ─ 動画解説','video',
   'https://www.youtube.com/watch?v=piSV6WGwW3Y',NULL,NULL,10,10),
  ('b0a10650-0000-4000-8000-000000000000','b0a10000-0000-4000-8000-000000000000',
   '情報収集とファクトチェック ─ 動画解説','video',
   'https://www.youtube.com/watch?v=Wr0YLNuTtDc',NULL,NULL,10,12),
  ('b0a10750-0000-4000-8000-000000000000','b0a10000-0000-4000-8000-000000000000',
   '人材育成にAIを使う ─ 動画解説','video',
   'https://www.youtube.com/watch?v=wK5ic9d__AQ',NULL,NULL,8,14),
  ('b0a10850-0000-4000-8000-000000000000','b0a10000-0000-4000-8000-000000000000',
   'チームにAIを浸透させる ─ 動画解説','video',
   'https://www.youtube.com/watch?v=d9rZtgh0J14',NULL,NULL,8,16),
  ('b0a10950-0000-4000-8000-000000000000','b0a10000-0000-4000-8000-000000000000',
   'AIに思考を奪われない使い方 ─ 動画解説','video',
   'https://www.youtube.com/watch?v=iqqit7KwE7k',NULL,NULL,7,18)
ON CONFLICT (id) DO UPDATE
  SET course_id = EXCLUDED.course_id, title = EXCLUDED.title,
      content_type = EXCLUDED.content_type, url = EXCLUDED.url,
      estimated_minutes = EXCLUDED.estimated_minutes, sort_order = EXCLUDED.sort_order;

-- 検証:
-- SELECT l.title, l.content_type, l.url, l.sort_order
-- FROM public.lessons l WHERE l.course_id='b0a10000-0000-4000-8000-000000000000'
-- ORDER BY l.sort_order;

-- ========== (2) seed_pf_video_consolidation.sql ==========
-- =====================================================================
-- あわい屋ZEROS  動画レッスン一本化＋資料付与 consolidation seed  2026-06-25
-- 方針(ユーザー確定):
--  ・動画と本編記事が並存するコース(CC / L0.1 / CB)は【本編記事を削除して動画に一本化】し、
--    スライドPDF＋ワークシートを【動画レッスン】に付与（上部に資料を出す）。
--  ・video中心コース(L1/L2/L3/MT/L07)は【各動画レッスンにもコース資料を付与】。
-- 実行順序: 他の全seed（catalog/lessons/video_lessons/quiz/material_urls/thumbnails）を流した後、最後にこれを流す。
-- 冪等: DELETEは自然冪等 / UPDATEは固定値。再実行可。
-- 注意: 削除は本編article。動画・クイズ・スライド/ワークシートのファイル本体には影響しない。
-- 別途ストレージ作業(ZEROS): CBワークシート worksheets/CB-0X_worksheet.docx を要アップロード（下のURLが有効化される）。
--                            AI スライド slides/AI-0X_slides.pdf ＋ ワークシート worksheets/AI-0X_worksheet.docx を要アップロード（PART A4のURLが有効化される。
--                            素材は 01_動画作成…/output/pf_upload/AI/slides|worksheets に統一名で用意済み）。
--                            L07-D の slide/worksheet 素材は未作成（別途）。
-- =====================================================================

-- ───────── PART A1: CC（全社必須研修・8コース）本編→動画 一本化 ─────────
-- 動画 a500X200 に「本編にあったスライド(slides/lessons/a500X100.pdf)」＋コースのワークシートを付与し、先頭(sort 1)へ。

UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/lessons/a5001100.pdf', worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CC-01_worksheet.docx', sort_order=1 WHERE id='a5001200-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/lessons/a5002100.pdf', worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CC-02_worksheet.docx', sort_order=1 WHERE id='a5002200-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/lessons/a5003100.pdf', worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CC-03_worksheet.docx', sort_order=1 WHERE id='a5003200-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/lessons/a5004100.pdf', worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CC-04_worksheet.docx', sort_order=1 WHERE id='a5004200-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/lessons/a5005100.pdf', worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CC-05_worksheet.docx', sort_order=1 WHERE id='a5005200-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/lessons/a5006100.pdf', worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CC-06_worksheet.docx', sort_order=1 WHERE id='a5006200-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/lessons/a5007100.pdf', worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CC-07_worksheet.docx', sort_order=1 WHERE id='a5007200-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/lessons/a5008100.pdf', worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CC-08_worksheet.docx', sort_order=1 WHERE id='a5008200-0000-4000-8000-000000000000';

-- 本編article削除（CC）
DELETE FROM public.lessons WHERE id IN ('a5001100-0000-4000-8000-000000000000','a5002100-0000-4000-8000-000000000000','a5003100-0000-4000-8000-000000000000','a5004100-0000-4000-8000-000000000000','a5005100-0000-4000-8000-000000000000','a5006100-0000-4000-8000-000000000000','a5007100-0000-4000-8000-000000000000','a5008100-0000-4000-8000-000000000000');

-- ───────── PART A2: L0.1（新社会人・1コース3本）本編→動画 一本化 ─────────
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/lessons/a01a1000.pdf', sort_order=1 WHERE id='a01a1500-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/lessons/a01a2000.pdf', sort_order=2 WHERE id='a01a2500-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/lessons/a01a3000.pdf', sort_order=3 WHERE id='a01a3500-0000-4000-8000-000000000000';

-- 本編article削除（L0.1）
DELETE FROM public.lessons WHERE id IN ('a01a1000-0000-4000-8000-000000000000','a01a2000-0000-4000-8000-000000000000','a01a3000-0000-4000-8000-000000000000');

-- ───────── PART A3: CB（臨床と経営のあいだ・1コース9本）本編→動画 一本化 ─────────
-- CBはスライドPDF無し（読み物＋動画）。ワークシートのみ付与（※worksheets/CB-0X_worksheet.docx を要アップロード）。動画を先頭(sort 1〜9)へ。
UPDATE public.lessons SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CB-01_worksheet.docx', sort_order=1 WHERE id='b0cb0150-0000-4000-8000-000000000000';
UPDATE public.lessons SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CB-02_worksheet.docx', sort_order=2 WHERE id='b0cb0250-0000-4000-8000-000000000000';
UPDATE public.lessons SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CB-03_worksheet.docx', sort_order=3 WHERE id='b0cb0350-0000-4000-8000-000000000000';
UPDATE public.lessons SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CB-04_worksheet.docx', sort_order=4 WHERE id='b0cb0450-0000-4000-8000-000000000000';
UPDATE public.lessons SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CB-05_worksheet.docx', sort_order=5 WHERE id='b0cb0550-0000-4000-8000-000000000000';
UPDATE public.lessons SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CB-06_worksheet.docx', sort_order=6 WHERE id='b0cb0650-0000-4000-8000-000000000000';
UPDATE public.lessons SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CB-07_worksheet.docx', sort_order=7 WHERE id='b0cb0750-0000-4000-8000-000000000000';
UPDATE public.lessons SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CB-08_worksheet.docx', sort_order=8 WHERE id='b0cb0850-0000-4000-8000-000000000000';
UPDATE public.lessons SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CB-09_worksheet.docx', sort_order=9 WHERE id='b0cb0950-0000-4000-8000-000000000000';

-- 本編article削除（CB）
DELETE FROM public.lessons WHERE id IN ('b0cb0100-0000-4000-8000-000000000000','b0cb0200-0000-4000-8000-000000000000','b0cb0300-0000-4000-8000-000000000000','b0cb0400-0000-4000-8000-000000000000','b0cb0500-0000-4000-8000-000000000000','b0cb0600-0000-4000-8000-000000000000','b0cb0700-0000-4000-8000-000000000000','b0cb0800-0000-4000-8000-000000000000','b0cb0900-0000-4000-8000-000000000000');

-- ───────── PART A4: AI（AI活用・1コース9本）本編→動画 一本化 ─────────
-- AIはスライドPDF＋ワークシート両方あり。動画レッスン(b0a10X50)にslides/AI-0X_slides.pdf＋worksheets/AI-0X_worksheet.docxを付与し、先頭(sort 1〜9)へ。
-- ※ slides/AI-0X_slides.pdf と worksheets/AI-0X_worksheet.docx を course-materials バケットへ要アップロード（下のURLが有効化される）。
-- 前提: seed_ai_video_lessons.sql を流した後（動画レッスン b0a10X50 が存在）に、この consolidation を流すこと。
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/AI-01_slides.pdf', worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/AI-01_worksheet.docx', sort_order=1 WHERE id='b0a10150-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/AI-02_slides.pdf', worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/AI-02_worksheet.docx', sort_order=2 WHERE id='b0a10250-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/AI-03_slides.pdf', worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/AI-03_worksheet.docx', sort_order=3 WHERE id='b0a10350-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/AI-04_slides.pdf', worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/AI-04_worksheet.docx', sort_order=4 WHERE id='b0a10450-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/AI-05_slides.pdf', worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/AI-05_worksheet.docx', sort_order=5 WHERE id='b0a10550-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/AI-06_slides.pdf', worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/AI-06_worksheet.docx', sort_order=6 WHERE id='b0a10650-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/AI-07_slides.pdf', worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/AI-07_worksheet.docx', sort_order=7 WHERE id='b0a10750-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/AI-08_slides.pdf', worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/AI-08_worksheet.docx', sort_order=8 WHERE id='b0a10850-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/AI-09_slides.pdf', worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/AI-09_worksheet.docx', sort_order=9 WHERE id='b0a10950-0000-4000-8000-000000000000';

-- 本編article削除（AI）
DELETE FROM public.lessons WHERE id IN ('b0a10100-0000-4000-8000-000000000000','b0a10200-0000-4000-8000-000000000000','b0a10300-0000-4000-8000-000000000000','b0a10400-0000-4000-8000-000000000000','b0a10500-0000-4000-8000-000000000000','b0a10600-0000-4000-8000-000000000000','b0a10700-0000-4000-8000-000000000000','b0a10800-0000-4000-8000-000000000000','b0a10900-0000-4000-8000-000000000000');

-- ───────── PART B: L1/L2/L3/MT/L07 全動画レッスンにコース資料を付与 ─────────
-- 各コースの slide_pdf_url / worksheet_word_url（コース単位デッキ）を、そのコースの全videoレッスンへコピー。
-- MTはworksheet=NULLのためvideoもNULL（スライドのみ）。L07-Dはコース資料未設定のため当面NULL（別途素材作成後に付与）。
UPDATE public.lessons l
   SET slide_pdf_url      = c.slide_pdf_url,
       worksheet_word_url = c.worksheet_word_url
  FROM public.courses c
 WHERE l.course_id = c.id
   AND l.content_type = 'video'
   AND c.id IN (
'a07a0000-0000-4000-8000-000000000000',
        'a07b0000-0000-4000-8000-000000000000',
        'a07c0000-0000-4000-8000-000000000000',
        'a07d0000-0000-4000-8000-000000000000',
        'a1a00000-0000-4000-8000-000000000000',
        'a1b00000-0000-4000-8000-000000000000',
        'a1c00000-0000-4000-8000-000000000000',
        'a1d00000-0000-4000-8000-000000000000',
        'a1e00000-0000-4000-8000-000000000000',
        'a1f00000-0000-4000-8000-000000000000',
        'a2a00000-0000-4000-8000-000000000000',
        'a2b00000-0000-4000-8000-000000000000',
        'a2c00000-0000-4000-8000-000000000000',
        'a2d00000-0000-4000-8000-000000000000',
        'a2e00000-0000-4000-8000-000000000000',
        'a2f00000-0000-4000-8000-000000000000',
        'a3a00000-0000-4000-8000-000000000000',
        'a3b00000-0000-4000-8000-000000000000',
        'a3c00000-0000-4000-8000-000000000000',
        'a3d00000-0000-4000-8000-000000000000',
        'a3e00000-0000-4000-8000-000000000000',
        'a3f00000-0000-4000-8000-000000000000',
        'a4c00000-0000-4000-8000-000000000000',
        'a4d00000-0000-4000-8000-000000000000',
        'a4e00000-0000-4000-8000-000000000000'
);

-- 検証:
-- SELECT c.title, l.title, l.content_type, l.sort_order,
--        l.slide_pdf_url IS NOT NULL AS slide, l.worksheet_word_url IS NOT NULL AS ws
-- FROM public.lessons l JOIN public.courses c ON c.id=l.course_id
-- WHERE l.content_type IN ('video','quiz') ORDER BY c.title, l.sort_order;
