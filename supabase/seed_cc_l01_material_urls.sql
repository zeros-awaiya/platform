-- =====================================================================
-- CC / L0.1 素材URLバックフィル（スライドPDF・ワークシート・サムネイル）
-- 前提: upload_cc_l01_materials.mjs で各ファイルを Storage(course-materials) へ
--       下記の固定パスで投入済みであること（同スクリプトはPATCHまで行うので、
--       このSQLは「SQLだけで再適用したい」場合や記録用の冪等バックフィル）。
-- 規則: 公開URL = {SB}/storage/v1/object/public/course-materials/<path>
--       CCスライド  : slides/lessons/a500X100.pdf      → lessons.slide_pdf_url（本編lesson a500X100）
--       L01スライド : slides/lessons/a01aN000.pdf      → lessons.slide_pdf_url（本編lesson a01aN000）
--       CCワークシート: worksheets/CC-0X_worksheet.docx → courses.worksheet_word_url（course a500X000）
--       CCサムネイル : thumbnails/thumb_CC-0X.png       → courses.thumbnail_url（course a500X000）
-- 冪等: id固定UPDATEのみ。
-- =====================================================================
\set b 'https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials'

-- ① CC スライドPDF（本編lessonへ）
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/lessons/a5001100.pdf' WHERE id='a5001100-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/lessons/a5002100.pdf' WHERE id='a5002100-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/lessons/a5003100.pdf' WHERE id='a5003100-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/lessons/a5004100.pdf' WHERE id='a5004100-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/lessons/a5005100.pdf' WHERE id='a5005100-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/lessons/a5006100.pdf' WHERE id='a5006100-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/lessons/a5007100.pdf' WHERE id='a5007100-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/lessons/a5008100.pdf' WHERE id='a5008100-0000-4000-8000-000000000000';

-- ② L0.1 スライドPDF（本編lessonへ / A=1, B=2, C=3）
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/lessons/a01a1000.pdf' WHERE id='a01a1000-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/lessons/a01a2000.pdf' WHERE id='a01a2000-0000-4000-8000-000000000000';
UPDATE public.lessons SET slide_pdf_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/slides/lessons/a01a3000.pdf' WHERE id='a01a3000-0000-4000-8000-000000000000';

-- ③ CC ワークシート（courseへ）
UPDATE public.courses SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CC-01_worksheet.docx' WHERE id='a5001000-0000-4000-8000-000000000000';
UPDATE public.courses SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CC-02_worksheet.docx' WHERE id='a5002000-0000-4000-8000-000000000000';
UPDATE public.courses SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CC-03_worksheet.docx' WHERE id='a5003000-0000-4000-8000-000000000000';
UPDATE public.courses SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CC-04_worksheet.docx' WHERE id='a5004000-0000-4000-8000-000000000000';
UPDATE public.courses SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CC-05_worksheet.docx' WHERE id='a5005000-0000-4000-8000-000000000000';
UPDATE public.courses SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CC-06_worksheet.docx' WHERE id='a5006000-0000-4000-8000-000000000000';
UPDATE public.courses SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CC-07_worksheet.docx' WHERE id='a5007000-0000-4000-8000-000000000000';
UPDATE public.courses SET worksheet_word_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/worksheets/CC-08_worksheet.docx' WHERE id='a5008000-0000-4000-8000-000000000000';

-- ④ CC サムネイル（courseへ / 表紙cover_CC流用）
UPDATE public.courses SET thumbnail_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/thumbnails/thumb_CC-01.png' WHERE id='a5001000-0000-4000-8000-000000000000';
UPDATE public.courses SET thumbnail_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/thumbnails/thumb_CC-02.png' WHERE id='a5002000-0000-4000-8000-000000000000';
UPDATE public.courses SET thumbnail_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/thumbnails/thumb_CC-03.png' WHERE id='a5003000-0000-4000-8000-000000000000';
UPDATE public.courses SET thumbnail_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/thumbnails/thumb_CC-04.png' WHERE id='a5004000-0000-4000-8000-000000000000';
UPDATE public.courses SET thumbnail_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/thumbnails/thumb_CC-05.png' WHERE id='a5005000-0000-4000-8000-000000000000';
UPDATE public.courses SET thumbnail_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/thumbnails/thumb_CC-06.png' WHERE id='a5006000-0000-4000-8000-000000000000';
UPDATE public.courses SET thumbnail_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/thumbnails/thumb_CC-07.png' WHERE id='a5007000-0000-4000-8000-000000000000';
UPDATE public.courses SET thumbnail_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/thumbnails/thumb_CC-08.png' WHERE id='a5008000-0000-4000-8000-000000000000';

-- 検証:
-- SELECT c.title, c.thumbnail_url IS NOT NULL thumb, c.worksheet_word_url IS NOT NULL ws,
--        COUNT(l.slide_pdf_url) slides
-- FROM public.courses c LEFT JOIN public.lessons l ON l.course_id=c.id
-- WHERE c.category_id='a5000000-0000-4000-8000-000000000000' GROUP BY 1,2,3 ORDER BY 1;
