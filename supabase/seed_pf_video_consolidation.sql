-- =====================================================================
-- あわい屋ZEROS  動画レッスン一本化＋資料付与 consolidation seed  2026-06-25
-- 方針(ユーザー確定):
--  ・動画と本編記事が並存するコース(CC / L0.1 / CB / NG)は【本編記事を削除して動画に一本化】し、
--    スライドPDF＋ワークシートを【動画レッスン】に付与（上部に資料を出す）。
--  ・video中心コース(L1/L2/L3/MT/L07)は【各動画レッスンにもコース資料を付与】。
-- 実行順序: 他の全seed（catalog/lessons/video_lessons/quiz/material_urls/thumbnails）を流した後、最後にこれを流す。
-- 冪等: DELETEは自然冪等 / UPDATEは固定値。再実行可。
-- 注意: 削除は本編article。動画・クイズ・スライド/ワークシートのファイル本体には影響しない。
-- 別途ストレージ作業(ZEROS): CBワークシート worksheets/CB-0X_worksheet.docx を要アップロード（下のURLが有効化される）。
--                            AI スライド slides/AI-0X_slides.pdf ＋ ワークシート worksheets/AI-0X_worksheet.docx を要アップロード（PART A4のURLが有効化される。
--                            素材は 01_動画作成…/output/pf_upload/AI/slides|worksheets に統一名で用意済み）。
--                            NG ワークシート worksheets/NG-0X_worksheet.docx を要アップロード（PART A5のURLが有効化される。
--                            素材は 03_教育コース工場…/05_outputs/NG_0X_*_実践ワークシート.docx にあり、要リネームしてアップロード）。
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

-- ───────── PART A5: NG（調整交渉術・1コース9本）本編→動画 一本化 ─────────
-- NGはCBと同型（スライドPDF無し・読み物＋動画）。ワークシートのみ付与（※worksheets/NG-0X_worksheet.docx を要アップロード）。動画を先頭(sort 1〜9)へ。
-- 前提: seed_ng_video_lessons.sql を流した後（動画レッスン b0e90X50 が存在）に、この consolidation を流すこと。
-- 注意: 本編article(b0e90100〜0900)に lesson_progress が既にあると、削除時にトリガー(trg_update_course_enrollment_progress)が
--       cascade削除のlesson_progress行ごとに発火し、その時点でlessons行が既に消えているためcourse_id NULLでenrollments NOT NULL違反になる。
--       → 先にlesson_progressを明示的に削除してから、本編lessonsを削除する（下の順で実行）。
DELETE FROM public.lesson_progress WHERE lesson_id IN ('b0e90100-0000-4000-8000-000000000000','b0e90200-0000-4000-8000-000000000000','b0e90300-0000-4000-8000-000000000000','b0e90400-0000-4000-8000-000000000000','b0e90500-0000-4000-8000-000000000000','b0e90600-0000-4000-8000-000000000000','b0e90700-0000-4000-8000-000000000000','b0e90800-0000-4000-8000-000000000000','b0e90900-0000-4000-8000-000000000000');

UPDATE public.lessons SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/NG-01_worksheet.docx', sort_order=1 WHERE id='b0e90150-0000-4000-8000-000000000000';
UPDATE public.lessons SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/NG-02_worksheet.docx', sort_order=2 WHERE id='b0e90250-0000-4000-8000-000000000000';
UPDATE public.lessons SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/NG-03_worksheet.docx', sort_order=3 WHERE id='b0e90350-0000-4000-8000-000000000000';
UPDATE public.lessons SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/NG-04_worksheet.docx', sort_order=4 WHERE id='b0e90450-0000-4000-8000-000000000000';
UPDATE public.lessons SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/NG-05_worksheet.docx', sort_order=5 WHERE id='b0e90550-0000-4000-8000-000000000000';
UPDATE public.lessons SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/NG-06_worksheet.docx', sort_order=6 WHERE id='b0e90650-0000-4000-8000-000000000000';
UPDATE public.lessons SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/NG-07_worksheet.docx', sort_order=7 WHERE id='b0e90750-0000-4000-8000-000000000000';
UPDATE public.lessons SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/NG-08_worksheet.docx', sort_order=8 WHERE id='b0e90850-0000-4000-8000-000000000000';
UPDATE public.lessons SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/NG-09_worksheet.docx', sort_order=9 WHERE id='b0e90950-0000-4000-8000-000000000000';

-- 本編article削除（NG）
DELETE FROM public.lessons WHERE id IN ('b0e90100-0000-4000-8000-000000000000','b0e90200-0000-4000-8000-000000000000','b0e90300-0000-4000-8000-000000000000','b0e90400-0000-4000-8000-000000000000','b0e90500-0000-4000-8000-000000000000','b0e90600-0000-4000-8000-000000000000','b0e90700-0000-4000-8000-000000000000','b0e90800-0000-4000-8000-000000000000','b0e90900-0000-4000-8000-000000000000');

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
