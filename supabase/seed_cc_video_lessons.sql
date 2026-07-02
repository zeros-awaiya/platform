-- =====================================================================
-- あわい屋ZEROS  CC（全社必須研修）動画解説レッスン 追加 seed
-- 範囲   : CC-01〜CC-08 の8本（YouTube限定公開済み・2026-06-23アップ）
-- 設計   : 各CCコースの既存「本編（読む教材）」article レッスン(a500X100)は
--          そのまま残し、別レッスンとして content_type='video' の「動画解説」を追加。
--          → 1コース = 本編(読む, sort 1) ＋ 動画解説(視聴, sort 2)。
-- ID規則 : 本編=a500X100 / 動画=a500X200（X=コース番号）。
-- メディア: NotebookLM動画解説→あわい屋ZEROSブランド版→YouTube限定公開。
-- 前提   : seed_cc_catalog.sql ＋ seed_cc_lessons.sql 実行後に流す。
-- 冪等   : 固定UUID + ON CONFLICT(id) DO UPDATE。再実行で重複しません。
-- 補足   : 動画を本編より前に出したい場合は sort_order を 0 などに変更（任意）。
-- =====================================================================

INSERT INTO public.lessons (id, course_id, title, content_type, url, file_path, article_content, estimated_minutes, sort_order)
VALUES
  ('a5001200-0000-4000-8000-000000000000','a5001000-0000-4000-8000-000000000000',
   'ハラスメント防止（全社版） ─ 動画解説','video',
   'https://www.youtube.com/watch?v=3xybYl0027E',NULL,NULL,9,2),
  ('a5002200-0000-4000-8000-000000000000','a5002000-0000-4000-8000-000000000000',
   '情報セキュリティ・個人情報保護（全社版） ─ 動画解説','video',
   'https://www.youtube.com/watch?v=o-ki59zurU4',NULL,NULL,11,2),
  ('a5003200-0000-4000-8000-000000000000','a5003000-0000-4000-8000-000000000000',
   'コンプライアンス・ビジネス倫理 基礎 ─ 動画解説','video',
   'https://www.youtube.com/watch?v=n096y4JpPWo',NULL,NULL,8,2),
  ('a5004200-0000-4000-8000-000000000000','a5004000-0000-4000-8000-000000000000',
   'メンタルヘルス・セルフケア ─ 動画解説','video',
   'https://www.youtube.com/watch?v=mKcRwEiO0sI',NULL,NULL,10,2),
  ('a5005200-0000-4000-8000-000000000000','a5005000-0000-4000-8000-000000000000',
   '安全衛生・労働災害防止 ─ 動画解説','video',
   'https://www.youtube.com/watch?v=AHvjNcis9Yo',NULL,NULL,10,2),
  ('a5006200-0000-4000-8000-000000000000','a5006000-0000-4000-8000-000000000000',
   'ダイバーシティ＆インクルージョン / 無意識バイアス ─ 動画解説','video',
   'https://www.youtube.com/watch?v=PELMxLx7NAY',NULL,NULL,10,2),
  ('a5007200-0000-4000-8000-000000000000','a5007000-0000-4000-8000-000000000000',
   'カスタマーハラスメント対応 ─ 動画解説','video',
   'https://www.youtube.com/watch?v=j4pcJO5LMeg',NULL,NULL,8,2),
  ('a5008200-0000-4000-8000-000000000000','a5008000-0000-4000-8000-000000000000',
   '事業継続（BCP）全社版 ─ 動画解説','video',
   'https://www.youtube.com/watch?v=Nr_8EKNt3Z4',NULL,NULL,8,2)
ON CONFLICT (id) DO UPDATE
  SET course_id = EXCLUDED.course_id, title = EXCLUDED.title,
      content_type = EXCLUDED.content_type, url = EXCLUDED.url,
      estimated_minutes = EXCLUDED.estimated_minutes, sort_order = EXCLUDED.sort_order;

-- 検証:
-- SELECT c.title, l.title, l.content_type, l.url, l.sort_order
-- FROM public.lessons l JOIN public.courses c ON c.id=l.course_id
-- WHERE c.category_id='a5000000-0000-4000-8000-000000000000'
-- ORDER BY c.title, l.sort_order;
