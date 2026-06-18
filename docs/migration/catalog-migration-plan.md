# コースカタログ移行プラン（ZEROS-AI 131本 → 学習PF）— 草案

> 作成: 2026-06-18 / 対象: あわい屋ZEROS 育成エコシステム
> 方針: 案B＝学習PF側を真実源（確定 2026-06-18）。ZEROS-AI の分類軸を学習PF `courses` へ引き継ぐ。
> 本書は草案。既存 migration は変更せず、`docs/migration/catalog-schema-delta.sql` と対で読む。
> 前提: `organization_id = NULL`（本部共通 / HQ）で投入。

---

## 0. 出所（実読・file:line）

| 役割 | ファイル | 該当 |
|---|---|---|
| ZEROS-AI courses 定義 | `ZEROS-AI/backend/migrations/009_create_courses.sql` | テーブル 28-42 / level 66本 90-157 / DD 37本 160-198 / MT 20本 201-222 / KD 1本 225-227 |
| ZEROS-AI awareness 7本 | `ZEROS-AI/backend/migrations/011_seed_awareness.sql` | 5-13 |
| ZEROS-AI 列定義 | `ZEROS-AI/backend/src/models_ikusei.py` | Course 164-194 / CourseMaterial 197-219 |
| 学習PF categories/courses/lessons | `supabase/migrations/20260609000000_init.sql` | categories 36-43 / courses 46-56 / lessons 59-70 / 進捗トリガ 161-235 |
| 学習PF DL列・quiz | `supabase/migrations/20260617050000_add_course_download_urls_and_quizzes.sql` | courses 2列 6-8 / content_type に quiz 追加 11-12 / quiz_questions 15-26 |

本数: level 66 + skill_deepdive 37 + mandatory_training 20 + knowledge_deepdive 1 = **124**（009）+ awareness **7**（011）= **計131本**。

---

## 1. courses カラム写像表

| ZEROS-AI（出所） | 学習PF courses（投入先） | 変換ルール |
|---|---|---|
| `id`(UUID, gen) | `id`(UUID, gen) | 引き継がない（学習PF側で新採番）。突合は slug。 |
| `slug` (`L1_A-1` 等) | **新カラム `slug`** | そのまま。グローバル自然キー＝ON CONFLICT 推論先。 |
| `track` (level/skill_deepdive/…/awareness) | **新カラム `track`** ＋ `category_id`（従属写像） | track 文字列をそのまま `track` へ。さらに track→本部共通カテゴリ名へ写像し `category_id` を解決（§3）。 |
| `band` (L1/L2/L3, level のみ) | **新カラム `band`** | そのまま。level 以外は NULL。 |
| `course_code` (`A-3`/`FB-01`/`C-01`/`AW-01`) | **新カラム `course_code`** | そのまま。**一意制約は張らない**（文脈依存・非グローバル一意）。 |
| `series` (DD: シリーズ名 / MT: 層 / KD: 領域 / AW: 気づきの層 / level: NULL) | **新カラム `series`** | そのまま。 |
| `title` | `title` | そのまま。 |
| `description`（シードは未投入） | `description` | NULL。 |
| `sort_order` | **新カラム `sort_order`** | そのまま（学習PF courses には元々無いため追加）。 |
| `is_published`（全 TRUE） | `is_active` | TRUE 固定（全行 TRUE のため）。 |
| （なし） | `organization_id` | **NULL（本部共通）固定**。 |
| （なし） | `thumbnail_url` | NULL（教材実体投入時に追補）。 |

### 追加するスキーマ差分（ALTER TABLE）

`courses` に以下を追加（詳細は `catalog-schema-delta.sql` PART 1）:
`source TEXT` / `track TEXT(CHECK)` / `band TEXT(CHECK)` / `course_code TEXT` / `slug TEXT` / `series TEXT` / `sort_order INTEGER`。
索引: `ux_courses_slug`（**部分UNIQUE: WHERE slug IS NOT NULL**）/ `idx_courses_track` / `idx_courses_band`。

設計判断:
- **track/band/series/course_code は category に畳まず、独立した列で保持する。** 理由: 案B確定条件が「ZEROS-AIの分類軸(track/band/course_code/slug/series)を学習PF courses に引き継ぐ」こと（integration-design §0 表・§5.1）。category はフラット1軸でこの多軸を表現できない。
- **track → category は「従属写像」**（表示互換用）。真実源の分類は新列。5トラック＝5本部共通カテゴリを用意（`catalog-schema-delta.sql` PART 1b）。
- 型は ENUM ではなく `TEXT + CHECK`。学習PF の既存テーブルが TEXT+CHECK 流儀（`courses.status`/`users.role`/`lessons.content_type`）であり、awareness のような値追加にも追従しやすい。

---

## 2. course_materials → lessons 写像表

| ZEROS-AI course_material | 投入先 | content_type | 備考 |
|---|---|---|---|
| `kind='video'`（Vimeo/YouTube埋込） | `lessons` 行 | `'video'`（url にセット） | 「視聴する」レッスン。 |
| `kind='pdf'`（スライドPDF） | `courses.slide_pdf_url` | （lesson化しない） | 既存DL UIの流儀に整合（20260617050000:6-8）。 |
| `kind='worksheet'`（ワーク） | `courses.worksheet_word_url` | （lesson化しない） | 同上。代替案では lessons `'word'`。 |
| `title` | `lessons.title` / 列名 | — | video のみ lesson title に。 |
| `url`（未入手は NULL） | url / file_path / DL列 | — | **NULL の教材は行を作らない**（空レッスンを作らない）。 |
| `is_required`（既定 TRUE） | （暗黙） | — | 学習PF lessons に該当列なし。**is_required=TRUE のみ lesson 化**＝進捗トリガの「全lesson完了で100%」に合致。FALSE は lesson 化しない。 |
| `sort_order` | `lessons.sort_order` | — | そのまま。 |

写像の根拠:
- ZEROS-AI kind は `{video,pdf,worksheet}`（009:14, models_ikusei.py:34）、1コース×kindごと最大1教材（ux_course_materials_course_kind / 009:85）。
- 学習PF content_type は `{video,pdf,word,powerpoint,url,article,quiz}`（init.sql:63 + 20260617050000:12）。
- 学習PF は course レベルのDL列（`slide_pdf_url`/`worksheet_word_url`）と lesson 単位の両方を持つ。**動画＝lesson、スライド/ワーク＝DL列**が既存UIと最整合（推奨＝3-A案）。

is_required・完了判定の差（重要）:
- ZEROS-AI は教材単位 `is_required` で完了対象を選別（009:62）。
- 学習PF はトリガが「course 内の **全 lessons** が lesson_progress 済みで 100%」（init.sql:178-198）。is_required 列はない。
- → **is_required=TRUE の教材だけを lessons 行にする**ことで意味を保存する。video が任意（is_required=FALSE）のコースは lesson が 0 行になり得る（完了率が定義不能）→ §課題で扱う。

教材URL未設定（ワーク無し）の扱い:
- `url IS NULL` の course_material は **lessons 行も DL列も作らない**（埋めない・刹那性）。
- 後から実体が揃ったら本スクリプト/取込を**再実行**すれば冪等に追補される。

---

## 3. category 対応方針

- **track を本部共通カテゴリ（organization_id=NULL）へ写像**する（表示互換）。真実源は courses.track 列。
- 用意するカテゴリ（5本）: レベル別（管理・経営）/ スキル深堀 / 必須研修 / 知識深堀 / 気づきの層。
- `categories` に自然キー UNIQUE が無いため、冪等性は `WHERE NOT EXISTS (name, organization_id IS NULL)` で担保（`catalog-schema-delta.sql` PART 1b の冪等版を使用。素の `ON CONFLICT DO NOTHING` は効かない＝再実行で重複する）。

---

## 4. 投入手順

ZEROS-AI と学習PF は**別Supabaseプロジェクト**（integration-design §1 表: ZEROS-AI=`rhdsxmxteh…` / 学習PF=本番別PJ）。クロスDB JOIN は不可。手順は2系統。

### 4-A. courses マスタ（131本）— SQL のみで完結
`courses`/`categories` の131本は **009/011 の静的シードから手起こし済み**（`catalog-schema-delta.sql` PART 2 に VALUES 直書き）。クロスDB不要。

1. `catalog-schema-delta.sql` PART 1（ALTER TABLE + 索引）を適用。
2. PART 1b（カテゴリ5本・冪等版）を適用。
3. PART 2-A〜2-E（courses 131本・`ON CONFLICT(slug) DO UPDATE`）を適用。
4. 検証クエリ（下記 §5）。

### 4-B. 教材（lessons / DL列）— 実体URLの移送（別途）
ZEROS-AI `course_materials.url` は実体入手後に投入される運用（009:60）。本タスク時点で url が揃っているとは限らない。移送は:

- (a) ZEROS-AI から `course_materials`（kind/url/title/sort_order/is_required + 親 courses.slug）を CSV/JSON エクスポート。
- (b) 学習PF 側で slug をキーに `courses.id` を解決し、`url IS NOT NULL` の行のみ:
  - `kind='video' AND is_required` → `lessons`（content_type='video'）に upsert。
  - `kind='pdf'` → `courses.slide_pdf_url` を UPDATE。
  - `kind='worksheet'` → `courses.worksheet_word_url` を UPDATE。
- 実装は Node 取込スクリプト推奨（lessons に自然キーが無く SQL 単独では冪等にしづらいため。§冪等性参照）。`catalog-schema-delta.sql` PART 3 に同一DB前提の参考SQLを併記。

---

## 5. 冪等性

| 対象 | 冪等キー | 仕組み | 注意 |
|---|---|---|---|
| courses | `slug`（部分UNIQUE索引） | `ON CONFLICT (slug) WHERE slug IS NOT NULL DO UPDATE` | 再実行で分類軸・titleを最新化（追従）。 |
| categories | `(name, organization_id IS NULL)` | `WHERE NOT EXISTS` | 素の ON CONFLICT は UNIQUE 無しのため**不可**。 |
| lessons | **自然キーが無い** | — | **要対策**。下記。 |

lessons の冪等化（課題）:
- 学習PF `lessons` に自然キー（UNIQUE）が無い（init.sql:59-70）。素の INSERT を再実行すると重複行が増える。
- 対策案: 取込前に `DELETE FROM lessons WHERE course_id IN (zeros-ai courses) AND <識別>` してから挿入、または lessons に `(course_id, external_ref)` UNIQUE を新設（別スキーマ差分）。**推奨は Node 側で「course_id + content_type + url」存在チェック upsert**。実装方針を Phase 3 で確定する。

---

## 6. ロールバック

`catalog-schema-delta.sql` 末尾の ROLLBACK セクション参照。`source='zeros-ai'` で投入行を一括特定できる設計:
- データのみ: `DELETE FROM lessons WHERE course_id IN (SELECT id FROM courses WHERE source='zeros-ai')` → `DELETE FROM courses WHERE source='zeros-ai'` → カテゴリ5本削除。
- スキーマ完全撤去: 索引→CHECK→ADD した7列を DROP。
- フィーチャーフラグ: integration-design §7 の通り、Phase 4 まで ZEROS-AI 既存受講を温存し独立PRで切替可能に。

---

## 7. リスク・未確定事項

| # | 項目 | 影響 | 現状の事実 | 対応 |
|---|---|---|---|---|
| 1 | **course_code の一意制約** | UNIQUE を張ると投入失敗 | course_code はグローバル一意でない（`A-1` が L1/L2/L3 に各存在・009:91/109/134、`D-01` も KD/MT 間で文脈依存）。ZEROS-AI 側の一意制約も `(band,course_code)` と slug のみ（009:41,52） | **UNIQUE(course_code) は張らない。** 一意性は slug に集約。処方解決は slug 経由（#3）。 |
| 2 | **slug 衝突** | 投入失敗/上書き | ZEROS-AI 内で slug はグローバル一意（009:52 ux_courses_slug）。学習PF 既存 courses には slug 列が無く衝突源は無い | 部分UNIQUE索引（NULL除外）で担保。手動作成コースは slug=NULL のまま共存可。 |
| 3 | **ZEROS-AI processing 側が参照する course_code/slug の保持** | 処方→受講割当が壊れる | ZEROS-AI 処方は `prescription.courseIds`（`A-3` 形式・帯なし、band は person から解決・009:6-7）。連携IF（integration-design §3）は `prescribed_course_ids` を**学習PFの course_id** に変換する必要 | 学習PF courses に **band+course_code+slug を保持**したので、`(band, course_code)` または slug → 学習PF `course_id` の**変換表/解決クエリ**が成立。Phase 4 のAPIで `SELECT id FROM courses WHERE slug=$1`（または band+course_code）で解決。 |
| 4 | **教材URLの実体の有無** | lessons が空・完了率定義不能 | ZEROS-AI `course_materials.url` は「入手後に投入・未入手NULL」運用（009:60, models_ikusei.py:210）。本数131に対し実体が揃っているか未確認（別PJ・未実証） | url IS NULL は lesson/DL列を作らない。揃い次第 4-B を再実行（冪等）。**実体の充足状況を Phase 3 着手前に ZEROS-AI DB で実証確認**（推測しない）。 |
| 5 | **lessons の冪等キー欠如** | 再実行で重複 lesson | lessons に UNIQUE 無し（init.sql:59-70） | §5 の対策（Node upsert or UNIQUE 新設）。Phase 3 で確定。 |
| 6 | **categories 冪等性** | 再実行でカテゴリ重複 | categories に UNIQUE 無し（init.sql:36-43）。素の ON CONFLICT は効かない | `WHERE NOT EXISTS` 版を使用（PART 1b）。 |
| 7 | **is_required と進捗トリガの不一致** | 任意動画コースの完了率が不定 | 学習PF トリガは「全lesson完了で100%」（init.sql:178-198）、is_required 概念なし | is_required=TRUE のみ lesson 化。lesson 0行コース（例: KD パイロット・実体未投入）は enrollment 完了率が常に 0/0 になる→トリガの `v_total_lessons=0` 分岐で progress=0 固定（init.sql:194-198）。表示上「未受講」のままになる点を運用合意。 |
| 8 | **クイズ/テナント別公開の扱い** | 機能差の取りこぼし | ZEROS-AI にクイズ・組織別公開なし（integration-design §5.1）。学習PF は quiz_questions・course_visibility あり | 移行時はクイズ無し・全コース本部共通(org=NULL)で投入。組織別出し分けは学習PF 側で後付け（course_visibility）。 |
| 9 | **別Supabase PJ・クロスDB不可** | 教材移送が SQL単独で不可 | integration-design §1 表 | courses は静的シードで完結（4-A）。教材のみエクスポート→取込（4-B）。 |
| 10 | **track の category 二重管理** | track 列と category がズレる | 本設計で track が真実源、category は従属 | UI/集計は track 列を正とする。category 編集はカタログ運用ルールで track と同期（または category を表示専用に固定）。 |

---

## 8. 成果物

- `docs/migration/catalog-schema-delta.sql` … ALTER TABLE（分類軸7列＋索引＋CHECK）/ カテゴリ5本 / courses 131本の冪等 INSERT / 教材写像テンプレート / ROLLBACK。
- `docs/migration/catalog-migration-plan.md` … 本書（写像表・手順・冪等性・ロールバック・課題）。

> 実適用時は `catalog-schema-delta.sql` を `supabase/migrations/` へ正式番号で切り出す（本草案は変更しない）。教材移送（4-B）の Node 取込スクリプトは実体URL充足を実証確認してから別途作成する。
