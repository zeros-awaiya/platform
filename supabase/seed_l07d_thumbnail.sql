-- =====================================================================
-- あわい屋ZEROS  L07-D「数字と、向き合う」サムネ(thumbnail_url) 補完 seed
-- 背景 : seed_course_thumbnails.sql は L07-A/B/C のみで、L07-D が抜けていた。
-- 画像 : output/course_thumbs/thumb_L07-D.png（ブランド表紙・L07グリーン基調）を
--        Supabase Storage の course-materials/thumbnails/thumb_L07-D.png へアップ後に有効化。
-- 前提 : seed_l07_d1.sql 実行後（コース a07d0000... が存在）に流す。冪等。
-- =====================================================================
UPDATE public.courses
   SET thumbnail_url='https://wrunobvmzghzwwjtlqry.supabase.co/storage/v1/object/public/course-materials/thumbnails/thumb_L07-D.png',
       updated_at=NOW()
 WHERE id='a07d0000-0000-4000-8000-000000000000';

-- 検証: SELECT id, title, thumbnail_url FROM public.courses WHERE id='a07d0000-0000-4000-8000-000000000000';
