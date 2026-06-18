-- =====================================================================
-- あわい屋ZEROS  L1（初級・主任/リーダー級）カタログ投入 seed
-- 範囲   : L1 18コース（パイロット）
-- 構造   : カテゴリ「L1 初級」→ 領域A〜Fの6コース → 各トピック=レッスン(video)
-- メディア: まずカタログ構造のみ。動画レッスンは url=NULL（後でYouTube限定URL等をバックフィル）
-- 権限   : Global(HQ)コース（organization_id = NULL）。SYSTEM_ADMINで実行する想定。
-- 実行   : Supabase ダッシュボード > SQL Editor に貼り付けて Run
-- 冪等性 : 全行 固定UUID + ON CONFLICT(id) DO UPDATE。何度流しても重複しません。
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. カテゴリ（Global / organization_id = NULL）
-- ---------------------------------------------------------------------
INSERT INTO public.categories (id, organization_id, name, description, sort_order)
VALUES
  ('a1000000-0000-4000-8000-000000000000', NULL,
   'L1 初級（主任・リーダー級）',
   '8〜15年プレイヤーをやってきて突然主任を任された人向け。1on1・評価・予算など「組織の言葉」を最低限の負荷で身につける初級コース群（A対人〜F法務の18本）。',
   10)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------
-- 2. コース（領域A〜F / Global）
-- ---------------------------------------------------------------------
INSERT INTO public.courses (id, organization_id, category_id, title, description, is_active)
VALUES
  ('a1a00000-0000-4000-8000-000000000000', NULL, 'a1000000-0000-4000-8000-000000000000',
   'L1-A 対人マネジメント',
   '主任が最も困る対人領域。1on1・フィードバック・委任・評価面談・難しい会話の5本。', true),
  ('a1b00000-0000-4000-8000-000000000000', NULL, 'a1000000-0000-4000-8000-000000000000',
   'L1-B 組織・チーム運営',
   '会議設計・役割分担と権限委譲・進捗管理・チームのルールづくりの4本。', true),
  ('a1c00000-0000-4000-8000-000000000000', NULL, 'a1000000-0000-4000-8000-000000000000',
   'L1-C 事業マネジメント入門',
   '予算・KPI・ワンページ事業計画。主任が知っておくべき範囲に絞った入門3本。', true),
  ('a1d00000-0000-4000-8000-000000000000', NULL, 'a1000000-0000-4000-8000-000000000000',
   'L1-D 財務・会計の入門',
   'P/Lのざっくり読みと、キャッシュと利益の違い。数字アレルギーを外す入門2本。', true),
  ('a1e00000-0000-4000-8000-000000000000', NULL, 'a1000000-0000-4000-8000-000000000000',
   'L1-E 戦略の基礎語彙',
   '3C/SWOT/5フォースの名前と使い方、自社の戦略を読めるようになる最低限の2本。', true),
  ('a1f00000-0000-4000-8000-000000000000', NULL, 'a1000000-0000-4000-8000-000000000000',
   'L1-F 法務・労務の最低限',
   '主任が知らないとまずい労基法の基本と、ハラスメント予防の2本。', true)
ON CONFLICT (id) DO UPDATE
  SET category_id = EXCLUDED.category_id, title = EXCLUDED.title,
      description = EXCLUDED.description, is_active = EXCLUDED.is_active,
      updated_at = NOW();

-- ---------------------------------------------------------------------
-- 3. レッスン（各トピック / content_type='video', url は後でバックフィル）
-- ---------------------------------------------------------------------
-- url: YouTube視聴URL（あわい屋ZEROS / zeros.js2025）。出典=2026-06-15 YouTube/Notion棚卸し。
--      公開11本＝全体公開 / 限定7本＝限定公開（リンクを知っていれば視聴可）。
INSERT INTO public.lessons (id, course_id, title, content_type, url, file_path, article_content, estimated_minutes, sort_order)
VALUES
  -- A. 対人マネジメント（全て全体公開）
  ('a1a10000-0000-4000-8000-000000000000','a1a00000-0000-4000-8000-000000000000','1on1の始め方 ─ 最初の30分で何を話すか','video','https://www.youtube.com/watch?v=mfRGubUsILE',NULL,NULL,12,1),
  ('a1a20000-0000-4000-8000-000000000000','a1a00000-0000-4000-8000-000000000000','フィードバックの型 ─ SBIフィードバックの実践','video','https://www.youtube.com/watch?v=pivqpLQYlL4',NULL,NULL,12,2),
  ('a1a30000-0000-4000-8000-000000000000','a1a00000-0000-4000-8000-000000000000','部下を信じて任せる ─ 委任の段階設計','video','https://www.youtube.com/watch?v=Woo0I8RlCvM',NULL,NULL,12,3),
  ('a1a40000-0000-4000-8000-000000000000','a1a00000-0000-4000-8000-000000000000','評価面談の組み立て方','video','https://www.youtube.com/watch?v=PcSrVUCjwu0',NULL,NULL,12,4),
  ('a1a50000-0000-4000-8000-000000000000','a1a00000-0000-4000-8000-000000000000','難しい会話の進め方（問題行動・退職相談・パフォーマンス低下）','video','https://www.youtube.com/watch?v=xzHky4ke9LI',NULL,NULL,12,5),
  -- B. 組織・チーム運営（全て全体公開）
  ('a1b10000-0000-4000-8000-000000000000','a1b00000-0000-4000-8000-000000000000','会議の設計と運営 ─ 目的別の3つの型','video','https://www.youtube.com/watch?v=RF4-Q4VbjEg',NULL,NULL,12,1),
  ('a1b20000-0000-4000-8000-000000000000','a1b00000-0000-4000-8000-000000000000','役割分担と権限委譲','video','https://www.youtube.com/watch?v=vBk65Gp1Oi4',NULL,NULL,12,2),
  ('a1b30000-0000-4000-8000-000000000000','a1b00000-0000-4000-8000-000000000000','進捗管理 ─ 管理されない進捗の作り方','video','https://www.youtube.com/watch?v=vGThOCnhb70',NULL,NULL,12,3),
  ('a1b40000-0000-4000-8000-000000000000','a1b00000-0000-4000-8000-000000000000','チームのルールづくり','video','https://www.youtube.com/watch?v=lp4U60AHpzA',NULL,NULL,12,4),
  -- C. 事業マネジメント入門（C-1/C-2=公開, C-3=限定公開）
  ('a1c10000-0000-4000-8000-000000000000','a1c00000-0000-4000-8000-000000000000','予算とは何か ─ 主任が知っておくべき範囲','video','https://www.youtube.com/watch?v=LDvfREiZbeY',NULL,NULL,12,1),
  ('a1c20000-0000-4000-8000-000000000000','a1c00000-0000-4000-8000-000000000000','KPIの読み方と作り方','video','https://www.youtube.com/watch?v=FJPh-9UiBs4',NULL,NULL,12,2),
  ('a1c30000-0000-4000-8000-000000000000','a1c00000-0000-4000-8000-000000000000','簡単な事業計画（ワンページプラン）','video','https://www.youtube.com/watch?v=SVthpe-Tasw',NULL,NULL,12,3),
  -- D. 財務・会計の入門（全て限定公開）
  ('a1d10000-0000-4000-8000-000000000000','a1d00000-0000-4000-8000-000000000000','P/Lのざっくり読み ─ 3つの数字だけで読む','video','https://www.youtube.com/watch?v=TlECN7zWil0',NULL,NULL,12,1),
  ('a1d20000-0000-4000-8000-000000000000','a1d00000-0000-4000-8000-000000000000','キャッシュと利益の違い','video','https://www.youtube.com/watch?v=VT6WqSp9h90',NULL,NULL,12,2),
  -- E. 戦略の基礎語彙（全て限定公開）
  ('a1e10000-0000-4000-8000-000000000000','a1e00000-0000-4000-8000-000000000000','3C/SWOT/5フォース ─ 名前と使い方の最低限','video','https://www.youtube.com/watch?v=SmvNfC2dgDA',NULL,NULL,12,1),
  ('a1e20000-0000-4000-8000-000000000000','a1e00000-0000-4000-8000-000000000000','自社の戦略を「読める」ようになる','video','https://www.youtube.com/watch?v=BAOJZL4U5mE',NULL,NULL,12,2),
  -- F. 法務・労務の最低限（全て限定公開）
  ('a1f10000-0000-4000-8000-000000000000','a1f00000-0000-4000-8000-000000000000','主任が知らないとまずい労基法の基本','video','https://www.youtube.com/watch?v=hTvByJfxT5o',NULL,NULL,12,1),
  ('a1f20000-0000-4000-8000-000000000000','a1f00000-0000-4000-8000-000000000000','ハラスメント予防 ─ 加害者にも被害者にもしないために','video','https://www.youtube.com/watch?v=qDwxsa0pkGY',NULL,NULL,12,2)
ON CONFLICT (id) DO UPDATE
  SET course_id = EXCLUDED.course_id, title = EXCLUDED.title,
      content_type = EXCLUDED.content_type, url = EXCLUDED.url,
      estimated_minutes = EXCLUDED.estimated_minutes,
      sort_order = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------
-- 4. 可視性（任意）：HQコースをデモ組織「あわい屋総合病院」の学習者に公開
--    ※SYSTEM_ADMINは可視性に関係なく全件見えます。学習者に出すには下記が必要。
--    別組織で使う場合は organization_id を差し替えてください。
-- ---------------------------------------------------------------------
INSERT INTO public.course_visibility (course_id, organization_id)
SELECT c.id, '77777777-7777-7777-7777-777777777777'
FROM public.courses c
WHERE c.id IN (
  'a1a00000-0000-4000-8000-000000000000','a1b00000-0000-4000-8000-000000000000',
  'a1c00000-0000-4000-8000-000000000000','a1d00000-0000-4000-8000-000000000000',
  'a1e00000-0000-4000-8000-000000000000','a1f00000-0000-4000-8000-000000000000')
ON CONFLICT (course_id, organization_id) DO NOTHING;

-- 確認用：投入結果
-- SELECT cat.name, c.title, COUNT(l.id) AS lessons
-- FROM public.courses c
-- JOIN public.categories cat ON cat.id = c.category_id
-- LEFT JOIN public.lessons l ON l.course_id = c.id
-- WHERE cat.id = 'a1000000-0000-4000-8000-000000000000'
-- GROUP BY cat.name, c.title ORDER BY c.title;
