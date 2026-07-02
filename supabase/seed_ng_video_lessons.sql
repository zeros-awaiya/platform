-- =====================================================================
-- あわい屋ZEROS  NG（調整交渉術）動画解説レッスン 追加 seed  【URL未確定・投稿後に差し替え】
-- 範囲   : NG-01〜NG-09 の9本。
-- ID規則 : 本編=b0e90X00 / 動画=b0e90X50（X=1〜9）。AI/CB/L0.1と同じ流儀。
-- 前提   : NotebookLM解説→ブランド版mp4→YouTube限定公開 で動画を作成し、
--          下の 'https://youtu.be/TBD_NGxx' を実URLに差し替えてから流すこと。
-- 冪等   : 固定UUID + ON CONFLICT(id) DO UPDATE。
-- ※この後に「一本化（本編article削除＋動画をsort1〜9）」と「クイズ（seed_ng_quiz＋動画別3問）」を適用する。
--   反映は service_role API（psql/接続文字列なし環境のため）。手順は QUIZ_ROLLOUT_PLAN.md 参照。
-- estimated_minutes は暫定値。動画尺確定後に更新可。
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
  ('b0e90150-0000-4000-8000-000000000000','b0e90000-0000-4000-8000-000000000000','交渉と調整のあいだ ─ 動画解説','video','https://youtu.be/TBD_NG01',NULL,NULL,9,2),
  ('b0e90250-0000-4000-8000-000000000000','b0e90000-0000-4000-8000-000000000000','立場でなく利害を見る ─ 動画解説','video','https://youtu.be/TBD_NG02',NULL,NULL,9,4),
  ('b0e90350-0000-4000-8000-000000000000','b0e90000-0000-4000-8000-000000000000','代替案を持つ ─ 動画解説','video','https://youtu.be/TBD_NG03',NULL,NULL,9,6),
  ('b0e90450-0000-4000-8000-000000000000','b0e90000-0000-4000-8000-000000000000','感情を扱う ─ 動画解説','video','https://youtu.be/TBD_NG04',NULL,NULL,9,8),
  ('b0e90550-0000-4000-8000-000000000000','b0e90000-0000-4000-8000-000000000000','部門間の利害をまとめる ─ 動画解説','video','https://youtu.be/TBD_NG05',NULL,NULL,9,10),
  ('b0e90650-0000-4000-8000-000000000000','b0e90000-0000-4000-8000-000000000000','上司と現場のあいだを通す ─ 動画解説','video','https://youtu.be/TBD_NG06',NULL,NULL,9,12),
  ('b0e90750-0000-4000-8000-000000000000','b0e90000-0000-4000-8000-000000000000','社外との条件交渉 ─ 動画解説','video','https://youtu.be/TBD_NG07',NULL,NULL,9,14),
  ('b0e90850-0000-4000-8000-000000000000','b0e90000-0000-4000-8000-000000000000','対立を統合に変える ─ 動画解説','video','https://youtu.be/TBD_NG08',NULL,NULL,9,16),
  ('b0e90950-0000-4000-8000-000000000000','b0e90000-0000-4000-8000-000000000000','理不尽な相手と話す ─ 動画解説','video','https://youtu.be/TBD_NG09',NULL,NULL,9,18)
ON CONFLICT (id) DO UPDATE
  SET course_id = EXCLUDED.course_id, title = EXCLUDED.title,
      content_type = EXCLUDED.content_type, url = EXCLUDED.url,
      estimated_minutes = EXCLUDED.estimated_minutes, sort_order = EXCLUDED.sort_order;
