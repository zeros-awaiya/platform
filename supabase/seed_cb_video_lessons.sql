-- =====================================================================
-- あわい屋ZEROS  CB（臨床と経営のあいだ）動画解説レッスン 追加 seed
-- 範囲   : CB-01〜CB-09 の9本（YouTube限定公開済み・2026-06-25アップ）
-- 設計   : CBは1コース(b0cb0000)の中に9本(CB-01〜09)が article レッスンで並ぶ構成。
--          各本の article はそのまま残し、直後に content_type='video' の
--          「動画解説」レッスンを挿入してインターリーブする。
--          → CB-01本編(1)→CB-01動画(2)→CB-02本編(3)→CB-02動画(4)→…→CB-09本編(17)→CB-09動画(18)
-- ID規則 : 本編=b0cb0X00 / 動画=b0cb0X50（X=コース番号 1〜9）。L0.1と同じ流儀。
-- メディア: NotebookLM動画解説→あわい屋ZEROSブランド版(表紙+本編+outro)→YouTube限定公開。
-- 前提   : seed_themetracks_catalog.sql 実行後に流す。
-- 冪等   : 固定UUID + ON CONFLICT(id) DO UPDATE。再実行で重複しません。
-- 補足   : ※再度 seed_themetracks_catalog.sql を流した場合は本編sortが1〜9に戻るため、
--          その後にこの seed を流し直すこと（インターリーブを復元）。
-- =====================================================================

-- 1. 既存の本編 article レッスンの並び順を更新（インターリーブのため 1,3,5,7,9,11,13,15,17 に）
UPDATE public.lessons SET sort_order=1  WHERE id='b0cb0100-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=3  WHERE id='b0cb0200-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=5  WHERE id='b0cb0300-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=7  WHERE id='b0cb0400-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=9  WHERE id='b0cb0500-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=11 WHERE id='b0cb0600-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=13 WHERE id='b0cb0700-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=15 WHERE id='b0cb0800-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=17 WHERE id='b0cb0900-0000-4000-8000-000000000000';

-- 2. 動画解説レッスンを追加（各本編の直後 2,4,6,8,10,12,14,16,18）
INSERT INTO public.lessons (id, course_id, title, content_type, url, file_path, article_content, estimated_minutes, sort_order)
VALUES
  ('b0cb0150-0000-4000-8000-000000000000','b0cb0000-0000-4000-8000-000000000000',
   '臨床の眼と経営の眼 ─ 動画解説','video',
   'https://www.youtube.com/watch?v=JRkLaPCo_PE',NULL,NULL,11,2),
  ('b0cb0250-0000-4000-8000-000000000000','b0cb0000-0000-4000-8000-000000000000',
   '現場の正義と経営の正義 ─ 動画解説','video',
   'https://www.youtube.com/watch?v=SKOWyb_VvjY',NULL,NULL,10,4),
  ('b0cb0350-0000-4000-8000-000000000000','b0cb0000-0000-4000-8000-000000000000',
   '命と数字 ─ 動画解説','video',
   'https://www.youtube.com/watch?v=Te4rdyEtcrQ',NULL,NULL,8,6),
  ('b0cb0450-0000-4000-8000-000000000000','b0cb0000-0000-4000-8000-000000000000',
   '効率と質 ─ 動画解説','video',
   'https://www.youtube.com/watch?v=p5DGbU9CRfI',NULL,NULL,8,8),
  ('b0cb0550-0000-4000-8000-000000000000','b0cb0000-0000-4000-8000-000000000000',
   '専門職と管理職 ─ 動画解説','video',
   'https://www.youtube.com/watch?v=tV_gp6kp6pY',NULL,NULL,7,10),
  ('b0cb0650-0000-4000-8000-000000000000','b0cb0000-0000-4000-8000-000000000000',
   '一人と全体 ─ 動画解説','video',
   'https://www.youtube.com/watch?v=ZNd7Hs6p9oA',NULL,NULL,8,12),
  ('b0cb0750-0000-4000-8000-000000000000','b0cb0000-0000-4000-8000-000000000000',
   '現場の言葉と経営の言葉 ─ 動画解説','video',
   'https://www.youtube.com/watch?v=2HaJORQBT-8',NULL,NULL,9,14),
  ('b0cb0850-0000-4000-8000-000000000000','b0cb0000-0000-4000-8000-000000000000',
   '守ると攻める ─ 動画解説','video',
   'https://www.youtube.com/watch?v=T_gXO0Zghiw',NULL,NULL,8,16),
  ('b0cb0950-0000-4000-8000-000000000000','b0cb0000-0000-4000-8000-000000000000',
   '二つの眼を持つ ─ 動画解説','video',
   'https://www.youtube.com/watch?v=cFH7-0FgJLs',NULL,NULL,9,18)
ON CONFLICT (id) DO UPDATE
  SET course_id = EXCLUDED.course_id, title = EXCLUDED.title,
      content_type = EXCLUDED.content_type, url = EXCLUDED.url,
      estimated_minutes = EXCLUDED.estimated_minutes, sort_order = EXCLUDED.sort_order;

-- 検証:
-- SELECT l.title, l.content_type, l.url, l.sort_order
-- FROM public.lessons l WHERE l.course_id='b0cb0000-0000-4000-8000-000000000000'
-- ORDER BY l.sort_order;
