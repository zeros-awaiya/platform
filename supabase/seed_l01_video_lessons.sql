-- =====================================================================
-- あわい屋ZEROS  L0.1（新社会人基礎力）動画解説レッスン 追加 seed
-- 範囲   : L0.1-A/B/C の3本（YouTube限定公開済み・2026-06-23アップ）
-- 設計   : L0.1は1コース(a01a0000)の中に3部(A/B/C)が article レッスンで並ぶ構成。
--          各部の article はそのまま残し、直後に content_type='video' の
--          「動画解説」レッスンを挿入してインターリーブする。
--          → A本編(1)→A動画(2)→B本編(3)→B動画(4)→C本編(5)→C動画(6)
-- ID規則 : 本編=a01aN000 / 動画=a01aN500（N=1:A, 2:B, 3:C）。
-- メディア: NotebookLM動画解説→あわい屋ZEROSブランド版→YouTube限定公開。
-- 前提   : seed_l01_catalog.sql 実行後に流す。
-- 冪等   : 固定UUID + ON CONFLICT(id) DO UPDATE。再実行で重複しません。
-- 補足   : まとめ動画（既存）とは別。これは各部の個別動画解説。
-- =====================================================================

-- 1. 既存の本編 article レッスンの並び順を更新（インターリーブのため 1,3,5 に）
UPDATE public.lessons SET sort_order=1 WHERE id='a01a1000-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=3 WHERE id='a01a2000-0000-4000-8000-000000000000';
UPDATE public.lessons SET sort_order=5 WHERE id='a01a3000-0000-4000-8000-000000000000';

-- 2. 動画解説レッスンを追加（本編の直後 2,4,6）
INSERT INTO public.lessons (id, course_id, title, content_type, url, file_path, article_content, estimated_minutes, sort_order)
VALUES
  ('a01a1500-0000-4000-8000-000000000000','a01a0000-0000-4000-8000-000000000000',
   '前に踏み出す力 ─ 動画解説','video',
   'https://www.youtube.com/watch?v=LbFRsUxyt_I',NULL,NULL,10,2),
  ('a01a2500-0000-4000-8000-000000000000','a01a0000-0000-4000-8000-000000000000',
   '考え抜く力 ─ 動画解説','video',
   'https://www.youtube.com/watch?v=evGcXK4txgc',NULL,NULL,9,4),
  ('a01a3500-0000-4000-8000-000000000000','a01a0000-0000-4000-8000-000000000000',
   'チームで働く力 ─ 動画解説','video',
   'https://www.youtube.com/watch?v=iwQJK_eTQ_w',NULL,NULL,8,6)
ON CONFLICT (id) DO UPDATE
  SET course_id = EXCLUDED.course_id, title = EXCLUDED.title,
      content_type = EXCLUDED.content_type, url = EXCLUDED.url,
      estimated_minutes = EXCLUDED.estimated_minutes, sort_order = EXCLUDED.sort_order;

-- 検証:
-- SELECT l.title, l.content_type, l.url, l.sort_order
-- FROM public.lessons l WHERE l.course_id='a01a0000-0000-4000-8000-000000000000'
-- ORDER BY l.sort_order;
