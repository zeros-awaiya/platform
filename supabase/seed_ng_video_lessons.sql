-- =====================================================================
-- あわい屋ZEROS  NG（調整交渉術）動画解説レッスン 追加 seed
-- 範囲   : NG-01〜NG-09 の9本（YouTube限定公開済み・2026-07-03アップ）。
-- ID規則 : 本編=b0e90X00 / 動画=b0e90X50（X=1〜9）。AI/CB/L0.1と同じ流儀。
-- メディア: NotebookLM動画解説→あわい屋ZEROSブランド版(表紙+本編+outro)→YouTube限定公開。
-- 冪等   : 固定UUID + ON CONFLICT(id) DO UPDATE。
-- ※この後に「一本化（本編article削除＋動画をsort1〜9）」は seed_pf_video_consolidation.sql の
--   PART A5（NG）で実施。クイズはコース末5問=seed_ng_quiz.sql（既存・流用）。
-- 反映は service_role API（psql/接続文字列なし環境のため）。
-- estimated_minutes は実尺（分・四捨五入）。
-- =====================================================================

-- 1. 本編 article をインターリーブ用に 1,3,5,…,17 へ
UPDATE public.lessons SET sort_order=1  WHERE id='b0e90100-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=3  WHERE id='b0e90200-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=5  WHERE id='b0e90300-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=7  WHERE id='b0e90400-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=9  WHERE id='b0e90500-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=11 WHERE id='b0e90600-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=13 WHERE id='b0e90700-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=15 WHERE id='b0e90800-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=17 WHERE id='b0e90900-0000-4000-8000-000000000000';

-- 2. 動画解説レッスンを追加（各本編の直後 2,4,…,18）。url は要差し替え。
INSERT INTO public.lessons (id, course_id, title, content_type, url, file_path, article_content, estimated_minutes, sort_order)
VALUES
  ('b0e90150-0000-4000-8000-000000000000','b0e90000-0000-4000-8000-000000000000','交渉と調整のあいだ ─ 動画解説','video','https://www.youtube.com/watch?v=aOZYc0V6IsM',NULL,NULL,8,2),
  ('b0e90250-0000-4000-8000-000000000000','b0e90000-0000-4000-8000-000000000000','立場でなく利害を見る ─ 動画解説','video','https://www.youtube.com/watch?v=nwnB6MGkNbE',NULL,NULL,8,4),
  ('b0e90350-0000-4000-8000-000000000000','b0e90000-0000-4000-8000-000000000000','代替案を持つ ─ 動画解説','video','https://www.youtube.com/watch?v=ALsxx9_iKRw',NULL,NULL,8,6),
  ('b0e90450-0000-4000-8000-000000000000','b0e90000-0000-4000-8000-000000000000','感情を扱う ─ 動画解説','video','https://www.youtube.com/watch?v=I2FtoTrXQSE',NULL,NULL,9,8),
  ('b0e90550-0000-4000-8000-000000000000','b0e90000-0000-4000-8000-000000000000','部門間の利害をまとめる ─ 動画解説','video','https://www.youtube.com/watch?v=4yw0cK-UgdM',NULL,NULL,9,10),
  ('b0e90650-0000-4000-8000-000000000000','b0e90000-0000-4000-8000-000000000000','上司と現場のあいだを通す ─ 動画解説','video','https://www.youtube.com/watch?v=yajFId7Fp8o',NULL,NULL,8,12),
  ('b0e90750-0000-4000-8000-000000000000','b0e90000-0000-4000-8000-000000000000','社外との条件交渉 ─ 動画解説','video','https://www.youtube.com/watch?v=IiLDs-yLw7I',NULL,NULL,11,14),
  ('b0e90850-0000-4000-8000-000000000000','b0e90000-0000-4000-8000-000000000000','対立を統合に変える ─ 動画解説','video','https://www.youtube.com/watch?v=81Tk1REo1VQ',NULL,NULL,8,16),
  ('b0e90950-0000-4000-8000-000000000000','b0e90000-0000-4000-8000-000000000000','理不尽な相手と話す ─ 動画解説','video','https://www.youtube.com/watch?v=bg6ggp3sENU',NULL,NULL,9,18)
ON CONFLICT (id) DO UPDATE
  SET course_id = EXCLUDED.course_id, title = EXCLUDED.title,
      content_type = EXCLUDED.content_type, url = EXCLUDED.url,
      estimated_minutes = EXCLUDED.estimated_minutes, sort_order = EXCLUDED.sort_order;

-- 検証:
-- SELECT l.title, l.content_type, l.url, l.sort_order
-- FROM public.lessons l WHERE l.course_id='b0e90000-0000-4000-8000-000000000000'
-- ORDER BY l.sort_order;
