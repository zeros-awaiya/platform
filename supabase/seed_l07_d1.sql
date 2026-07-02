-- =====================================================================
-- あわい屋ZEROS  L0.7 領域D「数字と、向き合う」D-1 追加 seed
-- 範囲   : L07-D（新領域）／D-1「財務リテラシー基礎」1コース・1レッスン
-- 背景   : コンテンツ充実計画で「財務リテラシー基礎の配置=L0.7 領域D D-1」に決定。
--          既存 seed_l07_catalog.sql は A/B/C の3コース8レッスンのみ。本SQLでDを追加。
-- メディア: 動画=NotebookLM動画解説（2026-06-20生成）→ YouTube限定公開。
--          URLは末尾の UPDATE でバックフィル（アップ後に確定値へ差し替え）。
-- 権限   : Global(HQ)コース（organization_id = NULL）。SYSTEM_ADMINで実行。
-- 冪等性 : 固定UUID + ON CONFLICT(id) DO UPDATE。再実行で重複しません。
-- 前提   : seed_l07_catalog.sql 実行後（カテゴリ a0700000... が存在する）に流す。
-- =====================================================================

-- 1. コース（領域D）
INSERT INTO public.courses (id, organization_id, category_id, title, description, is_active)
VALUES
  ('a07d0000-0000-4000-8000-000000000000', NULL, 'a0700000-0000-4000-8000-000000000000',
   'L07-D 数字と、向き合う',
   '権限を持つ前に、数字への苦手意識をほどく入口。財務リテラシーの基礎1本（L1財務領域への橋）。',
   true)
ON CONFLICT (id) DO UPDATE
  SET category_id = EXCLUDED.category_id, title = EXCLUDED.title,
      description = EXCLUDED.description, is_active = EXCLUDED.is_active, updated_at = NOW();

-- 2. レッスン（D-1）
INSERT INTO public.lessons (id, course_id, title, content_type, url, file_path, article_content, estimated_minutes, sort_order)
VALUES
  ('a07d1000-0000-4000-8000-000000000000','a07d0000-0000-4000-8000-000000000000',
   '財務リテラシー基礎 ─ 数字が読めない、を卒業する','video',NULL,NULL,NULL,10,1)
ON CONFLICT (id) DO UPDATE
  SET course_id = EXCLUDED.course_id, title = EXCLUDED.title,
      content_type = EXCLUDED.content_type,
      estimated_minutes = EXCLUDED.estimated_minutes, sort_order = EXCLUDED.sort_order;

-- 3. 可視性（デモ組織に公開）
INSERT INTO public.course_visibility (course_id, organization_id)
VALUES ('a07d0000-0000-4000-8000-000000000000', '77777777-7777-7777-7777-777777777777')
ON CONFLICT (course_id, organization_id) DO NOTHING;

-- 4. 動画URLバックフィル（YouTube限定公開・2026-06-21アップ）
-- 動画: https://youtu.be/AwuiINwXgMk （あわい屋ZEROS／限定公開）
UPDATE public.lessons SET url='https://www.youtube.com/watch?v=AwuiINwXgMk', content_type='video'
  WHERE id='a07d1000-0000-4000-8000-000000000000';
