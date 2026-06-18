-- =====================================================================
-- あわい屋ZEROS  L0.7（入門・主任になる前夜）カタログ投入 seed
-- 範囲   : L0.7 8コース
-- 構造   : カテゴリ「L0.7 入門」→ 領域A〜Cの3コース → 各トピック=レッスン(video)
-- メディア: 動画mp4(自前ビルド8本)は完成済みだが YouTube未アップのため url=NULL。
--          アップ後に末尾雛形で UPDATE lessons SET url=... をバックフィル。
-- 権限   : Global(HQ)コース（organization_id = NULL）。SYSTEM_ADMINで実行。
-- 冪等性 : 固定UUID + ON CONFLICT(id) DO UPDATE。再実行で重複しません。
-- =====================================================================

-- 1. カテゴリ
INSERT INTO public.categories (id, organization_id, name, description, sort_order)
VALUES
  ('a0700000-0000-4000-8000-000000000000', NULL,
   'L0.7 入門（主任になる前夜）',
   '気づきの層(L0)と主任の教科書(L1)の“あいだ”。まだ役職・権限がない前提で、段取り・対人・小さな場の仕切りを学ぶ入口教材8本。対象：シニアプレイヤー／リーダー候補／新人指導係。',
   5)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- 2. コース（領域A〜C）
INSERT INTO public.courses (id, organization_id, category_id, title, description, is_active)
VALUES
  ('a07a0000-0000-4000-8000-000000000000', NULL, 'a0700000-0000-4000-8000-000000000000', 'L07-A 自分を、まず回す', '段取りと優先順位・経験から学ぶ・感情と信頼の自己管理の3本。', true),
  ('a07b0000-0000-4000-8000-000000000000', NULL, 'a0700000-0000-4000-8000-000000000000', 'L07-B 人と、向き合う（権限なしの対人）', '報連相・後輩を導く・権限がなくても巻き込むの3本。', true),
  ('a07c0000-0000-4000-8000-000000000000', NULL, 'a0700000-0000-4000-8000-000000000000', 'L07-C 小さな場を、持つ', '小さな場を仕切る・主任の打診が来たら の2本（L1への橋）。', true)
ON CONFLICT (id) DO UPDATE
  SET category_id = EXCLUDED.category_id, title = EXCLUDED.title,
      description = EXCLUDED.description, is_active = EXCLUDED.is_active, updated_at = NOW();

-- 3. レッスン（content_type='video', url は後でバックフィル）
INSERT INTO public.lessons (id, course_id, title, content_type, url, file_path, article_content, estimated_minutes, sort_order)
VALUES
  ('a07a1000-0000-4000-8000-000000000000','a07a0000-0000-4000-8000-000000000000','段取りと優先順位 ─ 追われる側から、捌く側へ','video',NULL,NULL,NULL,10,1),
  ('a07a2000-0000-4000-8000-000000000000','a07a0000-0000-4000-8000-000000000000','経験から学ぶ ─ 教わる人から、自分で伸びる人へ','video',NULL,NULL,NULL,10,2),
  ('a07a3000-0000-4000-8000-000000000000','a07a0000-0000-4000-8000-000000000000','感情と信頼の自己管理 ─ 「約束を守る」を武器にする','video',NULL,NULL,NULL,10,3),
  ('a07b1000-0000-4000-8000-000000000000','a07b0000-0000-4000-8000-000000000000','報連相を武器にする ─ 依頼・相談・断り方','video',NULL,NULL,NULL,10,1),
  ('a07b2000-0000-4000-8000-000000000000','a07b0000-0000-4000-8000-000000000000','後輩を導く ─ 「見せる・やらせる・任せてみる」','video',NULL,NULL,NULL,10,2),
  ('a07b3000-0000-4000-8000-000000000000','a07b0000-0000-4000-8000-000000000000','権限がなくても巻き込む ─ フォロワーシップから始まる影響力','video',NULL,NULL,NULL,10,3),
  ('a07c1000-0000-4000-8000-000000000000','a07c0000-0000-4000-8000-000000000000','小さな場を仕切る ─ 申し送り・ミーティング・段取りの主導','video',NULL,NULL,NULL,10,1),
  ('a07c2000-0000-4000-8000-000000000000','a07c0000-0000-4000-8000-000000000000','主任の打診が来たら ─ 役割が変わる、その前夜に','video',NULL,NULL,NULL,10,2)
ON CONFLICT (id) DO UPDATE
  SET course_id = EXCLUDED.course_id, title = EXCLUDED.title,
      content_type = EXCLUDED.content_type,
      estimated_minutes = EXCLUDED.estimated_minutes, sort_order = EXCLUDED.sort_order;

-- 4. 可視性（デモ組織に公開）
INSERT INTO public.course_visibility (course_id, organization_id)
SELECT c.id, '77777777-7777-7777-7777-777777777777'
FROM public.courses c
WHERE c.category_id = 'a0700000-0000-4000-8000-000000000000'
ON CONFLICT (course_id, organization_id) DO NOTHING;

-- URLバックフィル雛形：
-- UPDATE public.lessons SET url='https://www.youtube.com/watch?v=XXXX' WHERE id='a07a1000-0000-4000-8000-000000000000';
