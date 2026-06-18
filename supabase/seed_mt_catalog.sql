-- =====================================================================
-- あわい屋ZEROS  MT（医療・介護 必須研修）カタログ投入 seed
-- 範囲: 20コース（共通10 / 医療5 / 介護5）= 3コース×20レッスン
-- 構造: カテゴリ「MT 医療・介護 必須研修」→ コースC/M/K → レッスン(video)
-- メディア: YouTube限定公開済み（2026-06-17・チャンネル あわい屋ZEROS）
-- 権限: Global(HQ)（organization_id = NULL）
-- 冪等: 全行 固定UUID + ON CONFLICT(id) DO UPDATE
-- 実行: Supabase ダッシュボード > SQL Editor で Run
-- =====================================================================

-- 1. カテゴリ
INSERT INTO public.categories (id, organization_id, name, description, sort_order)
VALUES
  ('a4000000-0000-4000-8000-000000000000', NULL,
   'MT 医療・介護 必須研修',
   '医療・介護の現場で必須となる研修テーマ（感染対策・虐待防止・身体拘束・看取り・医療安全など）を普遍的原理に絞って学ぶシリーズ。全職種共通10本＋医療5本＋介護5本の計20本。',
   40)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- 2. コース（共通C / 医療M / 介護K）
INSERT INTO public.courses (id, organization_id, category_id, title, description, is_active)
VALUES
  ('a4c00000-0000-4000-8000-000000000000', NULL, 'a4000000-0000-4000-8000-000000000000', 'MT-C 共通研修（全職種）', '医療・介護の全職種に共通する必須研修10本（感染対策・虐待防止・身体拘束・ハラスメント・個人情報・安全管理・倫理・接遇・看取り・災害BCP）。', true),
  ('a4d00000-0000-4000-8000-000000000000', NULL, 'a4000000-0000-4000-8000-000000000000', 'MT-M 医療研修', '医療現場の必須研修5本（医療安全・医薬品安全管理・医療機器安全管理・患者の権利とIC・精神科の身体拘束）。', true),
  ('a4e00000-0000-4000-8000-000000000000', NULL, 'a4000000-0000-4000-8000-000000000000', 'MT-K 介護研修', '介護現場の必須研修5本（認知症ケア・食中毒と衛生管理・介護事故防止・介護現場の倫理・介護独自の看取りケア）。', true)
ON CONFLICT (id) DO UPDATE
  SET category_id = EXCLUDED.category_id, title = EXCLUDED.title,
      description = EXCLUDED.description, is_active = EXCLUDED.is_active, updated_at = NOW();

-- 3. レッスン（content_type='video', url=YouTube watch URL）
INSERT INTO public.lessons (id, course_id, title, content_type, url, file_path, article_content, estimated_minutes, sort_order)
VALUES
  ('a4c01000-0000-4000-8000-000000000000','a4c00000-0000-4000-8000-000000000000','感染対策の基礎 ─ 標準予防策と経路別予防','video','https://www.youtube.com/watch?v=DoCUUdS4C-Y',NULL,NULL,9,1),
  ('a4c02000-0000-4000-8000-000000000000','a4c00000-0000-4000-8000-000000000000','虐待防止の基礎','video','https://www.youtube.com/watch?v=prZst4Bfe9g',NULL,NULL,9,2),
  ('a4c03000-0000-4000-8000-000000000000','a4c00000-0000-4000-8000-000000000000','身体拘束の適正化','video','https://www.youtube.com/watch?v=fiEu-121C6Y',NULL,NULL,9,3),
  ('a4c04000-0000-4000-8000-000000000000','a4c00000-0000-4000-8000-000000000000','ハラスメント防止','video','https://www.youtube.com/watch?v=IgiA5Omlwqo',NULL,NULL,9,4),
  ('a4c05000-0000-4000-8000-000000000000','a4c00000-0000-4000-8000-000000000000','個人情報保護','video','https://www.youtube.com/watch?v=DDCCcPS1KUs',NULL,NULL,9,5),
  ('a4c06000-0000-4000-8000-000000000000','a4c00000-0000-4000-8000-000000000000','安全管理と事故防止','video','https://www.youtube.com/watch?v=UCZVn6zWOK0',NULL,NULL,9,6),
  ('a4c07000-0000-4000-8000-000000000000','a4c00000-0000-4000-8000-000000000000','倫理の四原則','video','https://www.youtube.com/watch?v=SC8_W6eCMLM',NULL,NULL,9,7),
  ('a4c08000-0000-4000-8000-000000000000','a4c00000-0000-4000-8000-000000000000','接遇とコミュニケーション','video','https://www.youtube.com/watch?v=vXXXv7o19Cw',NULL,NULL,9,8),
  ('a4c09000-0000-4000-8000-000000000000','a4c00000-0000-4000-8000-000000000000','看取りとターミナルケア','video','https://www.youtube.com/watch?v=PKb5vfH-Fx4',NULL,NULL,9,9),
  ('a4c10000-0000-4000-8000-000000000000','a4c00000-0000-4000-8000-000000000000','災害対応とBCP','video','https://www.youtube.com/watch?v=4cJiCidvSHk',NULL,NULL,9,10),
  ('a4d01000-0000-4000-8000-000000000000','a4d00000-0000-4000-8000-000000000000','医療安全','video','https://www.youtube.com/watch?v=QTKGSnWBgO4',NULL,NULL,9,1),
  ('a4d02000-0000-4000-8000-000000000000','a4d00000-0000-4000-8000-000000000000','医薬品安全管理','video','https://www.youtube.com/watch?v=fE3x2wl262g',NULL,NULL,9,2),
  ('a4d03000-0000-4000-8000-000000000000','a4d00000-0000-4000-8000-000000000000','医療機器安全管理','video','https://www.youtube.com/watch?v=4_O_7K35Ubo',NULL,NULL,9,3),
  ('a4d04000-0000-4000-8000-000000000000','a4d00000-0000-4000-8000-000000000000','患者の権利とインフォームド・コンセント','video','https://www.youtube.com/watch?v=9mLwMhwkwM4',NULL,NULL,9,4),
  ('a4d05000-0000-4000-8000-000000000000','a4d00000-0000-4000-8000-000000000000','精神科の身体拘束','video','https://www.youtube.com/watch?v=DU1Qv1L7TcM',NULL,NULL,9,5),
  ('a4e01000-0000-4000-8000-000000000000','a4e00000-0000-4000-8000-000000000000','認知症ケアの基礎','video','https://www.youtube.com/watch?v=5Z9CPZt_FX0',NULL,NULL,9,1),
  ('a4e02000-0000-4000-8000-000000000000','a4e00000-0000-4000-8000-000000000000','食中毒と衛生管理','video','https://www.youtube.com/watch?v=wUPvNDwv87Q',NULL,NULL,9,2),
  ('a4e03000-0000-4000-8000-000000000000','a4e00000-0000-4000-8000-000000000000','介護事故防止','video','https://www.youtube.com/watch?v=6pOMbysfgJk',NULL,NULL,9,3),
  ('a4e04000-0000-4000-8000-000000000000','a4e00000-0000-4000-8000-000000000000','介護現場の倫理','video','https://www.youtube.com/watch?v=Kb8b2goZ9mc',NULL,NULL,9,4),
  ('a4e05000-0000-4000-8000-000000000000','a4e00000-0000-4000-8000-000000000000','介護独自の看取りケア','video','https://www.youtube.com/watch?v=IfOpaopYWvk',NULL,NULL,9,5)
ON CONFLICT (id) DO UPDATE
  SET course_id = EXCLUDED.course_id, title = EXCLUDED.title,
      content_type = EXCLUDED.content_type, url = EXCLUDED.url,
      estimated_minutes = EXCLUDED.estimated_minutes, sort_order = EXCLUDED.sort_order;

-- 4. 可視性: デモ組織「あわい屋総合病院」の学習者に公開
INSERT INTO public.course_visibility (course_id, organization_id)
SELECT c.id, '77777777-7777-7777-7777-777777777777'
FROM public.courses c
WHERE c.category_id = 'a4000000-0000-4000-8000-000000000000'
ON CONFLICT (course_id, organization_id) DO NOTHING;

-- 検証:
-- SELECT c.title, COUNT(l.id) total, COUNT(l.url) with_url
-- FROM public.courses c LEFT JOIN public.lessons l ON l.course_id=c.id
-- WHERE c.category_id='a4000000-0000-4000-8000-000000000000'
-- GROUP BY c.title ORDER BY c.title;
