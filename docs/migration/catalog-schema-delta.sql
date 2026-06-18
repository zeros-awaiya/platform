-- =====================================================================
-- catalog-schema-delta.sql  （草案・適用前レビュー必須）
-- ZEROS-AI コースカタログ（131本）→ 学習PF courses/lessons 移植のための
-- スキーマ差分（ALTER TABLE 等）と冪等な移行 INSERT。
--
-- 方針: 案B＝学習PF側を真実源。ZEROS-AI の分類軸 (track/band/course_code/slug/series)
--       を学習PF courses に「新カラム」として引き継ぐ（category とは別軸で保持）。
-- 前提: organization_id は本部共通＝NULL で投入（HQ / Global）。
-- 出所:
--   - ZEROS-AI: backend/migrations/009_create_courses.sql / 011_seed_awareness.sql
--               backend/src/models_ikusei.py:164-219 (Course / CourseMaterial)
--   - 学習PF : supabase/migrations/20260609000000_init.sql:36-70 (categories/courses/lessons)
--              supabase/migrations/20260617050000_add_course_download_urls_and_quizzes.sql
--
-- 注意: 既存 migration は一切変更しない。本ファイルは docs/migration/ 配下の草案。
--       実適用時は supabase/migrations/ へ正式番号で切り出す（例 202607xx...）。
-- =====================================================================


-- =====================================================================
-- PART 1. スキーマ差分（ZEROS-AI 分類軸カラムの追加）
-- =====================================================================
-- 学習PF courses には track/band/course_code/slug/series が無い。
-- §3 連携IF（処方→受講）が ZEROS-AI の course_code/slug を course_id へ解決
-- できるよう、分類軸を courses に持たせる（category へ畳まず、新カラムで保持）。

ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS source        TEXT,                  -- 出所識別。'zeros-ai' を投入（手動作成コースは NULL）
    ADD COLUMN IF NOT EXISTS track         TEXT,                  -- level / skill_deepdive / mandatory_training / knowledge_deepdive / awareness
    ADD COLUMN IF NOT EXISTS band          TEXT,                  -- L1 / L2 / L3（level のみ。他トラックは NULL）
    ADD COLUMN IF NOT EXISTS course_code   TEXT,                  -- ZEROS-AI 人間可読コード（'A-3' / 'FB-01' / 'C-01' / 'AW-01' 等）
    ADD COLUMN IF NOT EXISTS slug          TEXT,                  -- ZEROS-AI グローバル自然キー（'L1_A-1' / 'DD_フィードバック-01' / 'AW_01'）
    ADD COLUMN IF NOT EXISTS series        TEXT,                  -- DD: シリーズ名 / MT: 層 / KD: 領域 / AW: '気づきの層' / level: NULL
    ADD COLUMN IF NOT EXISTS sort_order    INTEGER NOT NULL DEFAULT 0;  -- ZEROS-AI sort_order（学習PF courses には元々無い）

-- track は列挙相当だが、ZEROS-AI 側の enum 追加（awareness）に追従しやすいよう
-- CHECK で表現（ENUM 型は採らない＝学習PF の他テーブルが TEXT+CHECK 流儀のため踏襲）。
-- 既存行（手動作成・NULL）を弾かないよう NULL 許容。
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_track_check;
ALTER TABLE public.courses ADD CONSTRAINT courses_track_check
    CHECK (track IS NULL OR track IN
        ('level','skill_deepdive','mandatory_training','knowledge_deepdive','awareness'));

ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_band_check;
ALTER TABLE public.courses ADD CONSTRAINT courses_band_check
    CHECK (band IS NULL OR band IN ('L1','L2','L3'));

-- slug はグローバル一意（ZEROS-AI と同じ自然キー思想）。ただし手動作成コースは
-- slug=NULL を許すため「部分 UNIQUE インデックス（NULL 除外）」にする。
-- これが ON CONFLICT の推論先（冪等な再投入のキー）。
CREATE UNIQUE INDEX IF NOT EXISTS ux_courses_slug
    ON public.courses (slug) WHERE slug IS NOT NULL;

-- 一覧・絞り込み用
CREATE INDEX IF NOT EXISTS idx_courses_track ON public.courses (track);
CREATE INDEX IF NOT EXISTS idx_courses_band  ON public.courses (band);

-- 注意（course_code の一意制約は張らない）：
--   ZEROS-AI の course_code は (band, course_code) 内でのみ一意であり、グローバル一意ではない。
--   例: 'A-1' は L1/L2/L3 に各々存在、'D-01' は KD と MT('M-01' 等)で衝突しうる文脈依存コード。
--   よって UNIQUE(course_code) は不可。一意性は slug に集約する（§課題3 参照）。


-- =====================================================================
-- PART 1b. category の対応方針
-- =====================================================================
-- 方針: track を category に「写像」する（フラットな表示用カテゴリ）。
--       ただし真実源の分類は上記 track/band/series 列であり、category は
--       学習PF 既存UI（categories ドリルダウン）との互換のための従属表現。
--       5 トラック＝5 カテゴリを本部共通（organization_id = NULL）で用意。
INSERT INTO public.categories (organization_id, name, description, sort_order) VALUES
    (NULL, 'レベル別（管理・経営）',   'ZEROS-AI level トラック（L1/L2/L3）',       1),
    (NULL, 'スキル深堀',             'ZEROS-AI skill_deepdive トラック',          2),
    (NULL, '必須研修',               'ZEROS-AI mandatory_training トラック',      3),
    (NULL, '知識深堀',               'ZEROS-AI knowledge_deepdive トラック',      4),
    (NULL, '気づきの層',             'ZEROS-AI awareness トラック',               5)
ON CONFLICT DO NOTHING;
-- 注意: categories には自然キー UNIQUE が無いため、ON CONFLICT DO NOTHING は
--       実質効かない（再実行で重複行が増える）。冪等性のため下の WHERE NOT EXISTS 版を推奨。
-- 冪等版（こちらを実適用で使う。上の INSERT はコメントアウト前提）:
--   INSERT INTO public.categories (organization_id, name, description, sort_order)
--   SELECT NULL, v.name, v.description, v.sort_order
--   FROM (VALUES
--     ('レベル別（管理・経営）','ZEROS-AI level トラック（L1/L2/L3）',1),
--     ('スキル深堀','ZEROS-AI skill_deepdive トラック',2),
--     ('必須研修','ZEROS-AI mandatory_training トラック',3),
--     ('知識深堀','ZEROS-AI knowledge_deepdive トラック',4),
--     ('気づきの層','ZEROS-AI awareness トラック',5)
--   ) AS v(name,description,sort_order)
--   WHERE NOT EXISTS (
--     SELECT 1 FROM public.categories c
--     WHERE c.organization_id IS NULL AND c.name = v.name);


-- =====================================================================
-- PART 2. 移行 INSERT（courses 131本）— 冪等（slug で ON CONFLICT）
-- =====================================================================
-- track→category_id 解決は本部共通カテゴリ（organization_id IS NULL）名で引く。
-- description は ZEROS-AI シードでは未設定（009/011 とも description 列に投入なし）→ NULL。
-- is_active=TRUE（ZEROS-AI is_published は全行 TRUE）。
-- ON CONFLICT(slug) DO UPDATE で再実行時は分類軸・タイトルを最新化（冪等＋追従）。

-- 共通の category_id 解決用ヘルパ式（インラインで使用）:
--   (SELECT id FROM public.categories WHERE organization_id IS NULL AND name = '...' LIMIT 1)

-- ---- 2-A. level（66本）→ category 'レベル別（管理・経営）'
INSERT INTO public.courses
    (organization_id, category_id, title, description, is_active,
     source, track, band, course_code, slug, series, sort_order)
SELECT
    NULL,
    (SELECT id FROM public.categories WHERE organization_id IS NULL AND name='レベル別（管理・経営）' LIMIT 1),
    v.title, NULL, TRUE,
    'zeros-ai', 'level', v.band, v.course_code, v.slug, NULL, v.sort_order
FROM (VALUES
    ('L1_A-1','L1','A-1','1on1の始め方',1),
    ('L1_A-2','L1','A-2','フィードバックの型（SBI）',2),
    ('L1_A-3','L1','A-3','部下を信じて任せる（委任の段階設計）',3),
    ('L1_A-4','L1','A-4','評価面談の組み立て方',4),
    ('L1_A-5','L1','A-5','難しい会話の進め方',5),
    ('L1_B-1','L1','B-1','会議の設計と運営',1),
    ('L1_B-2','L1','B-2','役割分担と権限委譲',2),
    ('L1_B-3','L1','B-3','進捗管理（管理されない進捗）',3),
    ('L1_B-4','L1','B-4','チームのルールづくり',4),
    ('L1_C-1','L1','C-1','予算とは何か',1),
    ('L1_C-2','L1','C-2','KPIの読み方と作り方',2),
    ('L1_C-3','L1','C-3','簡単な事業計画（ワンページプラン）',3),
    ('L1_D-1','L1','D-1','P/Lのざっくり読み',1),
    ('L1_D-2','L1','D-2','キャッシュと利益の違い',2),
    ('L1_E-1','L1','E-1','3C/SWOT/5フォース（名前と使い方）',1),
    ('L1_E-2','L1','E-2','自社の戦略を「読める」ようになる',2),
    ('L1_F-1','L1','F-1','主任が知らないとまずい労基法の基本',1),
    ('L1_F-2','L1','F-2','ハラスメント予防',2),
    ('L2_A-1','L2','A-1','評価制度の運用',1),
    ('L2_A-2','L2','A-2','後継者育成（次の主任）',2),
    ('L2_A-3','L2','A-3','ハイ/ローパフォーマー対応',3),
    ('L2_A-4','L2','A-4','退職・異動の意思決定',4),
    ('L2_A-5','L2','A-5','ハラスメント対応',5),
    ('L2_B-1','L2','B-1','組織設計の基本',1),
    ('L2_B-2','L2','B-2','MBO/OKR 目標管理',2),
    ('L2_B-3','L2','B-3','心理的安全性を文化に',3),
    ('L2_B-4','L2','B-4','部門間の調整',4),
    ('L2_B-5','L2','B-5','変革をリードする',5),
    ('L2_C-1','L2','C-1','事業計画の策定（3〜5年）',1),
    ('L2_C-2','L2','C-2','予算策定と予実管理',2),
    ('L2_C-3','L2','C-3','プロジェクトマネジメント',3),
    ('L2_C-4','L2','C-4','業績会議の設計',4),
    ('L2_D-1','L2','D-1','財務三表を読む',1),
    ('L2_D-2','L2','D-2','損益分岐点と原価管理',2),
    ('L2_D-3','L2','D-3','投資判断の基礎（ROI/NPV）',3),
    ('L2_D-4','L2','D-4','資金繰りの基本',4),
    ('L2_E-1','L2','E-1','競合分析と差別化戦略',1),
    ('L2_E-2','L2','E-2','顧客分析（STP/ペルソナ）',2),
    ('L2_E-3','L2','E-3','マーケティング基礎（4P/4C）',3),
    ('L2_E-4','L2','E-4','事業ポートフォリオの考え方',4),
    ('L2_F-1','L2','F-1','契約書の読み方',1),
    ('L2_F-2','L2','F-2','就業規則・労務管理の実務',2),
    ('L2_F-3','L2','F-3','コンプライアンスとリスクマネジメント',3),
    ('L3_A-1','L3','A-1','組織開発',1),
    ('L3_A-2','L3','A-2','経営チームの組み立て',2),
    ('L3_A-3','L3','A-3','後継者選定と承継',3),
    ('L3_A-4','L3','A-4','組織文化の設計',4),
    ('L3_B-1','L3','B-1','大組織の運営',1),
    ('L3_B-2','L3','B-2','組織再編・統合（PMI）',2),
    ('L3_B-3','L3','B-3','ガバナンスの設計',3),
    ('L3_B-4','L3','B-4','危機管理',4),
    ('L3_C-1','L3','C-1','中期経営計画',1),
    ('L3_C-2','L3','C-2','事業ポートフォリオマネジメント',2),
    ('L3_C-3','L3','C-3','新規事業の立ち上げ',3),
    ('L3_C-4','L3','C-4','業績マネジメントシステム',4),
    ('L3_D-1','L3','D-1','企業価値評価（DCF等）',1),
    ('L3_D-2','L3','D-2','資本政策',2),
    ('L3_D-3','L3','D-3','M&Aの財務',3),
    ('L3_D-4','L3','D-4','経営者のための管理会計',4),
    ('L3_E-1','L3','E-1','経営戦略の策定',1),
    ('L3_E-2','L3','E-2','M&A戦略',2),
    ('L3_E-3','L3','E-3','アライアンス・提携戦略',3),
    ('L3_E-4','L3','E-4','デジタル/AI戦略',4),
    ('L3_F-1','L3','F-1','経営者の法的責任',1),
    ('L3_F-2','L3','F-2','内部統制とコンプラ体制',2),
    ('L3_F-3','L3','F-3','ステークホルダーマネジメント',3)
) AS v(slug,band,course_code,title,sort_order)
ON CONFLICT (slug) WHERE slug IS NOT NULL DO UPDATE SET
    title=EXCLUDED.title, track=EXCLUDED.track, band=EXCLUDED.band,
    course_code=EXCLUDED.course_code, series=EXCLUDED.series,
    category_id=EXCLUDED.category_id, sort_order=EXCLUDED.sort_order,
    source=EXCLUDED.source, updated_at=NOW();

-- ---- 2-B. skill_deepdive（37本）→ category 'スキル深堀'
INSERT INTO public.courses
    (organization_id, category_id, title, description, is_active,
     source, track, band, course_code, slug, series, sort_order)
SELECT
    NULL,
    (SELECT id FROM public.categories WHERE organization_id IS NULL AND name='スキル深堀' LIMIT 1),
    v.title, NULL, TRUE,
    'zeros-ai', 'skill_deepdive', NULL, v.course_code, v.slug, v.series, v.sort_order
FROM (VALUES
    ('DD_フィードバック-01','FB-01','フィードバック','受け手で型を変える',1),
    ('DD_フィードバック-02','FB-02','フィードバック','ネガティブを伝えきる',2),
    ('DD_フィードバック-03','FB-03','フィードバック','立場を超えて返す',3),
    ('DD_フィードバック-04','FB-04','フィードバック','チームに返す',4),
    ('DD_フィードバック-05','FB-05','フィードバック','リモートで返す',5),
    ('DD_傾聴-01','KE-01','傾聴','沈黙を扱う',6),
    ('DD_傾聴-02','KE-02','傾聴','本音に降りる聴き方',7),
    ('DD_傾聴-03','KE-03','傾聴','評価者の顔を外す',8),
    ('DD_傾聴-04','KE-04','傾聴','細切れの時間で聴く',9),
    ('DD_問いかけ-01','QN-01','問いかけ','答えを渡さない問い',10),
    ('DD_問いかけ-02','QN-02','問いかけ','詰問にならない問い',11),
    ('DD_問いかけ-03','QN-03','問いかけ','問いを一歩に変える',12),
    ('DD_問いかけ-04','QN-04','問いかけ','答えのない問いを共に持つ',13),
    ('DD_委任-01','DL-01','委任','抱え込みを手放す',14),
    ('DD_委任-02','DL-02','委任','任せて失敗した時',15),
    ('DD_委任-03','DL-03','委任','どこを握りどこを任せるか',16),
    ('DD_委任-04','DL-04','委任','委任を育成に変える',17),
    ('DD_難しい会話-01','DC-01','難しい会話','高ぶった場を鎮める',18),
    ('DD_難しい会話-02','DC-02','難しい会話','対立を統合する',19),
    ('DD_難しい会話-03','DC-03','難しい会話','厳しさと尊重を両立する',20),
    ('DD_難しい会話-04','DC-04','難しい会話','利害が絡む相手と話す',21),
    ('DD_会議ファシリ-01','MF-01','会議ファシリ','発言が出ない会議を動かす',22),
    ('DD_会議ファシリ-02','MF-02','会議ファシリ','結論が出ない会議を決めきる',23),
    ('DD_会議ファシリ-03','MF-03','会議ファシリ','荒れる場を捌く',24),
    ('DD_会議ファシリ-04','MF-04','会議ファシリ','画面越しの会議を回す',25),
    ('DD_評価-01','EV-01','評価','バイアスを外して人を見る',26),
    ('DD_評価-02','EV-02','評価','可能性とパフォーマンスを分ける',27),
    ('DD_評価-03','EV-03','評価','評価の納得を作る',28),
    ('DD_評価-04','EV-04','評価','評価の前に期待を握る',29),
    ('DD_変革-01','CH-01','変革','抵抗を力に変える',30),
    ('DD_変革-02','CH-02','変革','小さな勝ちで巻き込む',31),
    ('DD_変革-03','CH-03','変革','変革の物語を語り続ける',32),
    ('DD_変革-04','CH-04','変革','変革の谷を越える',33),
    ('DD_伝える-01','TR-01','伝える','要点を一行に削る',34),
    ('DD_伝える-02','TR-02','伝える','物語で動かす',35),
    ('DD_伝える-03','TR-03','伝える','構造で分かりやすく伝える',36),
    ('DD_伝える-04','TR-04','伝える','相手の言葉に翻訳する',37)
) AS v(slug,course_code,series,title,sort_order)
ON CONFLICT (slug) WHERE slug IS NOT NULL DO UPDATE SET
    title=EXCLUDED.title, track=EXCLUDED.track, band=EXCLUDED.band,
    course_code=EXCLUDED.course_code, series=EXCLUDED.series,
    category_id=EXCLUDED.category_id, sort_order=EXCLUDED.sort_order,
    source=EXCLUDED.source, updated_at=NOW();

-- ---- 2-C. mandatory_training（20本）→ category '必須研修'
INSERT INTO public.courses
    (organization_id, category_id, title, description, is_active,
     source, track, band, course_code, slug, series, sort_order)
SELECT
    NULL,
    (SELECT id FROM public.categories WHERE organization_id IS NULL AND name='必須研修' LIMIT 1),
    v.title, NULL, TRUE,
    'zeros-ai', 'mandatory_training', NULL, v.course_code, v.slug, v.series, v.sort_order
FROM (VALUES
    ('MT_C-01','C-01','共通','感染対策の基礎',1),
    ('MT_C-02','C-02','共通','虐待防止の基礎',2),
    ('MT_C-03','C-03','共通','身体拘束適正化',3),
    ('MT_C-04','C-04','共通','ハラスメント防止',4),
    ('MT_C-05','C-05','共通','個人情報保護',5),
    ('MT_C-06','C-06','共通','安全管理と事故防止',6),
    ('MT_C-07','C-07','共通','倫理の四原則',7),
    ('MT_C-08','C-08','共通','接遇とコミュニケーション',8),
    ('MT_C-09','C-09','共通','看取りとターミナルケア',9),
    ('MT_C-10','C-10','共通','災害対応とBCP',10),
    ('MT_K-01','K-01','介護','認知症ケアの基礎',11),
    ('MT_K-02','K-02','介護','食中毒と衛生管理',12),
    ('MT_K-03','K-03','介護','介護事故防止',13),
    ('MT_K-04','K-04','介護','介護現場の倫理',14),
    ('MT_K-05','K-05','介護','介護独自の看取りケア',15),
    ('MT_M-01','M-01','医療','医療安全',16),
    ('MT_M-02','M-02','医療','医薬品安全管理',17),
    ('MT_M-03','M-03','医療','医療機器安全管理',18),
    ('MT_M-04','M-04','医療','患者の権利とIC',19),
    ('MT_M-05','M-05','医療','精神科の身体拘束',20)
) AS v(slug,course_code,series,title,sort_order)
ON CONFLICT (slug) WHERE slug IS NOT NULL DO UPDATE SET
    title=EXCLUDED.title, track=EXCLUDED.track, band=EXCLUDED.band,
    course_code=EXCLUDED.course_code, series=EXCLUDED.series,
    category_id=EXCLUDED.category_id, sort_order=EXCLUDED.sort_order,
    source=EXCLUDED.source, updated_at=NOW();

-- ---- 2-D. knowledge_deepdive（1本）→ category '知識深堀'
INSERT INTO public.courses
    (organization_id, category_id, title, description, is_active,
     source, track, band, course_code, slug, series, sort_order)
SELECT
    NULL,
    (SELECT id FROM public.categories WHERE organization_id IS NULL AND name='知識深堀' LIMIT 1),
    v.title, NULL, TRUE,
    'zeros-ai', 'knowledge_deepdive', NULL, v.course_code, v.slug, v.series, v.sort_order
FROM (VALUES
    ('KD_D-01','D-01','財務・会計','企業価値評価',1)
) AS v(slug,course_code,series,title,sort_order)
ON CONFLICT (slug) WHERE slug IS NOT NULL DO UPDATE SET
    title=EXCLUDED.title, track=EXCLUDED.track, band=EXCLUDED.band,
    course_code=EXCLUDED.course_code, series=EXCLUDED.series,
    category_id=EXCLUDED.category_id, sort_order=EXCLUDED.sort_order,
    source=EXCLUDED.source, updated_at=NOW();

-- ---- 2-E. awareness（7本）→ category '気づきの層'
INSERT INTO public.courses
    (organization_id, category_id, title, description, is_active,
     source, track, band, course_code, slug, series, sort_order)
SELECT
    NULL,
    (SELECT id FROM public.categories WHERE organization_id IS NULL AND name='気づきの層' LIMIT 1),
    v.title, NULL, TRUE,
    'zeros-ai', 'awareness', NULL, v.course_code, v.slug, v.series, v.sort_order
FROM (VALUES
    ('AW_01','AW-01','気づきの層','キャリアを自分で設計する（市場価値と個人ブランド）',1),
    ('AW_02','AW-02','気づきの層','リーダーのコミュニケーション術（部下・上司・チームを動かす）',2),
    ('AW_03','AW-03','気づきの層','心を整える心理学（疲れたあなたの処方箋）',3),
    ('AW_04','AW-04','気づきの層','実行力・成果創出（動き続ける人の習慣と戦略）',4),
    ('AW_05','AW-05','気づきの層','疲弊する「実行者」からしなやかな「設計者」へ',5),
    ('AW_06','AW-06','気づきの層','リーダーのコミュニケーション設計',6),
    ('AW_07','AW-07','気づきの層','人を動かす前に、自分を知る（リーダーシップの土台）',7)
) AS v(slug,course_code,series,title,sort_order)
ON CONFLICT (slug) WHERE slug IS NOT NULL DO UPDATE SET
    title=EXCLUDED.title, track=EXCLUDED.track, band=EXCLUDED.band,
    course_code=EXCLUDED.course_code, series=EXCLUDED.series,
    category_id=EXCLUDED.category_id, sort_order=EXCLUDED.sort_order,
    source=EXCLUDED.source, updated_at=NOW();


-- =====================================================================
-- PART 3. course_materials → lessons 写像（教材実体投入時）
-- =====================================================================
-- ZEROS-AI course_materials は kind ∈ {video, pdf, worksheet}（009:14, models_ikusei.py:34）。
-- 1コースにつき kind ごと最大1教材（ux_course_materials_course_kind / 009:85）。
-- url は実体入手後に投入、未入手は NULL（009:60, models_ikusei.py:210）。
--
-- 学習PF lessons.content_type ∈ {video,pdf,word,powerpoint,url,article,quiz}
--   （init.sql:63 + 20260617050000:12）。content_type の写像:
--     video     → 'video'      （lessons.url にVimeo/YouTube埋込）
--     pdf       → 'pdf'         （lessons.url または file_path）
--     worksheet → 'word'        （ワークはWord/ワークシート想定。'pdf'/'url'も可。下記注記参照）
--
-- 重要な設計判断（学習PF 既存の二重表現）:
--   学習PF は「DLリンク」を courses.slide_pdf_url / courses.worksheet_word_url
--   （course レベルの列・20260617050000:6-8）と lessons（レッスン単位）の両方で持てる。
--   ・スライドPDF/ワークWord の「ダウンロード」用途 → courses の2列に入れるのが既存UI流儀。
--   ・「レッスンとして視聴/学習する動画」      → lessons 行を作る。
--   → ZEROS-AI の pdf=スライドPDF / worksheet=ワークは courses.*_url に寄せ、
--      video のみ lessons 行（content_type='video'）を作る、という写像が
--      学習PF の既存DL UIと最も整合する（下記 3-A）。
--   → 代替として「全教材をlessons行で表現」する案も可（下記 3-B、コメント）。
--
-- is_required の扱い:
--   学習PF lessons には is_required 列が無い（進捗トリガは「全lesson完了で100%」前提
--   / init.sql:178-198）。ZEROS-AI is_required=TRUE の教材だけを lessons 行にすれば、
--   「必須教材＝完了対象」という意味が自動的に保たれる。is_required=FALSE の教材は
--   lessons 化しない（または content_type='url' の任意リンクとして別管理）。
--   → 完了判定ロジックの差は §課題 で明記。
--
-- sort_order: ZEROS-AI course_materials.sort_order をそのまま lessons.sort_order へ。
--             video=1, pdf=2, worksheet=3 など kind 順を踏襲（実データ依存）。
--
-- 教材URL未設定（ワーク無し）の扱い:
--   ・url IS NULL の course_material は lessons 行を作らない（空レッスンは作らない＝刹那性）。
--   ・slide_pdf_url / worksheet_word_url も NULL のままにする（埋めない）。
--   ・後から教材が揃った時点で、本スクリプトを再実行（冪等）すれば追補される。

-- ※ 注意: 以下は「ZEROS-AI 側に course_materials の実体行が存在する」場合の
--   片道移送テンプレート。本タスク時点では ZEROS-AI の course_materials は
--   url 未投入（実体未入手）の可能性が高く（009:60 の運用注記）、移送対象は
--   実際に url IS NOT NULL の行のみ。クロスDB（別Supabase PJ）のため、
--   実運用は (a) ZEROS-AI から CSV/JSON エクスポート → 学習PF へ取込、
--   または (b) Node 取込スクリプト（PART 4）で行う。下記は同一DBに両者が
--   居る場合の参考SQL（通常は使わない）。

-- 3-A. video を lessons 行に（同一DB前提の参考）
-- INSERT INTO public.lessons (course_id, title, content_type, url, sort_order)
-- SELECT pf.id, cm.title, 'video', cm.url, cm.sort_order
-- FROM zeros_ai.course_materials cm
-- JOIN zeros_ai.courses zc ON zc.id = cm.course_id
-- JOIN public.courses pf  ON pf.slug = zc.slug
-- WHERE cm.kind = 'video' AND cm.url IS NOT NULL AND cm.is_required = TRUE
-- ON CONFLICT DO NOTHING;  -- ※lessons に自然キー無し→冪等性は PART4 のNode側で担保推奨

-- 3-A'. pdf / worksheet を courses のDL列に（同一DB前提の参考）
-- UPDATE public.courses pf SET slide_pdf_url = cm.url
-- FROM zeros_ai.course_materials cm
-- JOIN zeros_ai.courses zc ON zc.id = cm.course_id
-- WHERE pf.slug = zc.slug AND cm.kind = 'pdf' AND cm.url IS NOT NULL;
-- UPDATE public.courses pf SET worksheet_word_url = cm.url
-- FROM zeros_ai.course_materials cm
-- JOIN zeros_ai.courses zc ON zc.id = cm.course_id
-- WHERE pf.slug = zc.slug AND cm.kind = 'worksheet' AND cm.url IS NOT NULL;

-- 3-B.（代替）全教材を lessons 行で表現する場合の content_type 写像:
--   video→'video' / pdf→'pdf' / worksheet→'word'。
--   この案は courses.slide_pdf_url/worksheet_word_url を使わず、
--   「DLもレッスン一覧から」に倒す。UI改修が要るため非推奨（既存DL UIと不整合）。


-- =====================================================================
-- ROLLBACK（草案・適用検証用）
-- =====================================================================
-- データのみ撤去（スキーマ列は他で使われ得るため残す判断も可）:
--   DELETE FROM public.lessons WHERE course_id IN
--     (SELECT id FROM public.courses WHERE source='zeros-ai');
--   DELETE FROM public.courses WHERE source='zeros-ai';
--   DELETE FROM public.categories WHERE organization_id IS NULL
--     AND name IN ('レベル別（管理・経営）','スキル深堀','必須研修','知識深堀','気づきの層');
-- スキーマ差分の撤去（完全ロールバック時のみ）:
--   DROP INDEX IF EXISTS ux_courses_slug;
--   DROP INDEX IF EXISTS idx_courses_track;
--   DROP INDEX IF EXISTS idx_courses_band;
--   ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_track_check;
--   ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_band_check;
--   ALTER TABLE public.courses
--     DROP COLUMN IF EXISTS source, DROP COLUMN IF EXISTS track,
--     DROP COLUMN IF EXISTS band, DROP COLUMN IF EXISTS course_code,
--     DROP COLUMN IF EXISTS slug, DROP COLUMN IF EXISTS series,
--     DROP COLUMN IF EXISTS sort_order;
