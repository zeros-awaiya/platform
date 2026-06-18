-- =====================================================================
-- L0.7 動画URLバックフィル（YouTube限定公開・2026-06-17検証）
-- 出典: YouTube Studio 実タイトル照合でコース対応を確認済み（全8本 限定公開）
-- 冪等: id固定UPDATEのみ。seed_l07_catalog.sql 実行後に流す。
-- =====================================================================
UPDATE public.lessons SET url='https://www.youtube.com/watch?v=vceFdk5EcKs', content_type='video' WHERE id='a07a1000-0000-4000-8000-000000000000';
UPDATE public.lessons SET url='https://www.youtube.com/watch?v=6-FYLcwCMqY', content_type='video' WHERE id='a07a2000-0000-4000-8000-000000000000';
UPDATE public.lessons SET url='https://www.youtube.com/watch?v=h9LpwnVXb64', content_type='video' WHERE id='a07a3000-0000-4000-8000-000000000000';
UPDATE public.lessons SET url='https://www.youtube.com/watch?v=vnctXLyAfd0', content_type='video' WHERE id='a07b1000-0000-4000-8000-000000000000';
UPDATE public.lessons SET url='https://www.youtube.com/watch?v=cusf1kJoL5Y', content_type='video' WHERE id='a07b2000-0000-4000-8000-000000000000';
UPDATE public.lessons SET url='https://www.youtube.com/watch?v=MrsZ1d7lEnc', content_type='video' WHERE id='a07b3000-0000-4000-8000-000000000000';
UPDATE public.lessons SET url='https://www.youtube.com/watch?v=j0PLwwBUDsE', content_type='video' WHERE id='a07c1000-0000-4000-8000-000000000000';
UPDATE public.lessons SET url='https://www.youtube.com/watch?v=RVRuJ1XDXHE', content_type='video' WHERE id='a07c2000-0000-4000-8000-000000000000';

-- 検証:
-- SELECT cat.name, COUNT(l.id) total, COUNT(l.url) with_url
-- FROM public.lessons l JOIN public.courses c ON c.id=l.course_id
-- JOIN public.categories cat ON cat.id=c.category_id
-- WHERE cat.id='a0700000-0000-4000-8000-000000000000' GROUP BY cat.name;
