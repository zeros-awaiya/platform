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
