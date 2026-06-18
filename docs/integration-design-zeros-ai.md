# ZEROS-AI × 学習プラットフォーム 統合設計書（役割分担型）

> 作成日: 2026-06-18 / 対象: あわい屋ZEROS 育成エコシステム
> ステータス: ドラフト（コースカタログ単一真実源は **未決**。本書 §5 の比較を経て決定する）

---

## 0. 確定した大前提

| 項目 | 決定 | 根拠 |
|---|---|---|
| 棲み分け方針 | **役割分担** … ZEROS-AI＝診断・処方エンジン / 学習PF＝LMS実行基盤（連携型） | ユーザー意思決定（2026-06-18） |
| 認証・テナント基盤 | **学習PFのSupabase基盤に寄せる**（Supabase Auth ＋ organizations/departments ＋ 3ロール ＋ RLS） | ユーザー意思決定。学習PFのみが組織/部署/多段ロールを保有 |
| コースカタログ単一真実源 | **案B＝学習PF側を正（確定 2026-06-18）** | §5.3 参照。①増減・新シリーズ作成が継続 ②教材が部分的（ワーク無しコース有）→ CRUD編集UIと柔軟なレッスンモデルを持つ学習PFが適。**ZEROS-AIの分類軸(track/band/course_code/slug/series)を学習PF coursesに引き継ぐ**ことが実装条件 |
| 連携方式 | **疎結合API（確定）** | §3-A |

---

## 1. 現状サマリ（出発点）

3システムは **別リポジトリ・別スタック・別Supabaseプロジェクト**で並走している。

| | 学習プラットフォーム | ZEROS-AI 育成診断 | ZEROS Logos Path |
|---|---|---|---|
| Repo | `zeros-awaiya/platform` | `juneinao-collab/ZEROS-AI` | `juneinao-collab/zeros-logos-path` |
| Stack | Next.js16 / React19 / JS | React19+Vite / FastAPI | React19+Vite / FastAPI |
| Supabase PJ | （本番のみ・別PJ） | `rhdsxmxtehzcozcpuuxg` | `ephmnybwviohexcjrllz` |
| 認証 | Supabase Auth (cookie) | 自前HMAC(受講者)＋Supabase Auth(管理) | 自前JWT/bcrypt＋LINE |
| ユーザー | `users`（3ロール/組織/部署） | `persons`（organizations無し） | `sessions`（＝リード） |
| コース/受講 | courses/lessons/quiz/進捗トリガ | **courses 124本/materials/material_progress** | なし |

**重複の核心**：ZEROS-AIと学習PFが「コース＋教材＋受講進捗」という中核レイヤーを**二重に保有**している。本統合の主目的はこの二重投資の解消。

> 本書は ZEROS-AI ⇄ 学習PF の統合に集中する。ZEROS Logos Path は中核機能の重複が小さく（部品レベル）、本フェーズの統合対象外とする（§9 で再利用部品のみ言及）。

---

## 2. ターゲット・アーキテクチャ（役割分担）

```
┌─────────────────────────────┐         ┌──────────────────────────────────┐
│   ZEROS-AI（診断・処方エンジン）  │         │   学習プラットフォーム（LMS実行基盤）    │
│                              │         │                                   │
│  ・キャリア/組織診断フロー        │  処方    │  ・受講者(users)・組織(orgs)・部署     │
│  ・ルールベース・スコアリング      │ ───────▶ │  ・ロードマップ(learning_paths)        │
│  ・triage(route) → 処方courseIds │ (連携IF) │  ・コース/レッスン/クイズ              │
│  ・narrative / AI方向づけ        │         │  ・受講(enrollments/lesson_progress)  │
│  ・伴走者への引き継ぎ(handoff)    │ ◀─────── │  ・進捗集計ダッシュボード(本部/組織)     │
│                              │  進捗参照 │  ・★認証・テナント・ロールの単一基盤★    │
└─────────────────────────────┘         └──────────────────────────────────┘
        強み＝「何を学ぶべきか」を決める           強み＝「学びを届け、進捗を測る」
```

### 責務分担（Single Responsibility）

| 機能領域 | 主管 | 従属/参照 |
|---|---|---|
| 診断（career/org quiz・スコアリング・二軸地図） | **ZEROS-AI** | — |
| 処方（route判定・推奨courseIds算出） | **ZEROS-AI** | 学習PFのコースIDを参照 |
| AI方向づけ・伴走引き継ぎ(handoff) | **ZEROS-AI** | — |
| 受講者ID・認証・セッション | **学習PF** | ZEROS-AIは委譲 |
| 組織・部署・ロール（マルチテナント/RLS） | **学習PF** | ZEROS-AIは委譲 |
| コースカタログ（マスタ） | **未決（§5）** | — |
| 受講・進捗・修了 | **学習PF** | ZEROS-AIは進捗を参照表示 |
| ロードマップ（コース順序・ステップロック） | **学習PF** | ZEROS-AIの処方を割当元に |
| 進捗集計・修了率レポート | **学習PF** | ZEROS-AI伴走コンソールは読み取り参照 |

> 設計上の含意：ZEROS-AI の `courses` / `course_materials` / `material_progress`（受講・進捗の実行レイヤー）は**最終的に学習PFへ委譲し廃止**する方向。ZEROS-AIは「処方＝courseIdの集合を出力する」役割に縮小する。

---

## 3. 連携インターフェース設計（診断→受講）

ZEROS-AIの「処方」を学習PFの「受講割当」へ渡す境界。3方式を比較。

| 方式 | 概要 | 長所 | 短所 | 評価 |
|---|---|---|---|---|
| **A. 疎結合API（推奨）** | ZEROS-AIが学習PFのAPIに「この受講者にこの処方コース群を割当」をPOST。または学習PFが処方をGET | スタック差を吸収・境界明確・別Org/別デプロイと相性良 | API設計・認証(サービス間)が必要 | ◎ |
| B. 共有DB直結 | 同一Supabase PJに同居しテーブル直参照 | 実装最短 | 別PJ/別スキーマ前提と矛盾・密結合。**RLS思想が逆**（ZEROS-AI＝`REVOKE ALL`＋アプリ層認可／学習PF＝`authenticated`にRLSで付与）で衝突 | △ |
| C. イベント/Webhook | 診断確定イベントを学習PFが購読 | 非同期・拡張性 | 基盤新設が重い・現規模では過剰 | △（将来） |

### 推奨：方式A の最小インターフェース（v1）

- **割当エンドポイント（学習PF側に新設）**
  `POST /api/integrations/prescriptions`
  ```json
  {
    "person_ref": { "line_user_id": "U...", "email": "x@y.z" },  // §4のID突合キー
    "band": "L2",
    "route": "self_course",
    "prescribed_course_ids": ["<学習PFのcourse_id>", ...],
    "source": "zeros-ai", "diagnosed_at": "..."
  }
  ```
  → 学習PFは person_ref を `users` に突合/プロビジョニングし、`enrollments`（または `user_learning_paths`）に処方コースを登録。
- **サービス間認証**：共有シークレット or Supabase service role 経由の署名。受講者cookieとは別経路。
- **逆方向（進捗参照）**：ZEROS-AI伴走コンソールが受講状況を出すため、学習PF側に読み取りAPI `GET /api/integrations/progress?person_ref=...` を用意（PII最小・集計優先）。

> 重要：処方の `prescribed_course_ids` は **学習PFのcourse_id** でなければならない。これは §5 のカタログ統合（ID写像）が前提。カタログ未統合の間は、ZEROS-AIの `course_code`/`slug` → 学習PF course_id の**変換表**を暫定的に持つ。

---

## 4. 認証・テナント基盤の統合（学習PFへ寄せる）

### 4.1 目標状態
- **受講者認証の正＝学習PFの Supabase Auth**。ZEROS-AIの受講者ログイン（HMAC person token：LINE/マジックリンク/メール+PW）は段階的に委譲。
- **組織/部署/ロールの正＝学習PFの `organizations`/`departments`/`users.role`**。ZEROS-AIの緩い `persons.organization_id`(UUID) は学習PFの `organizations.id` に整合させる。

### 4.2 ロール写像

| ZEROS-AI | 学習PF | 備考 |
|---|---|---|
| 伴走者(admin, `app_metadata.role=admin`) | `ORG_ADMIN`（または本部は `SYSTEM_ADMIN`） | `can_export` フラグ→学習PFのCSV権限へ |
| 受講者(person) | `LEARNER` | — |
| （なし） | `SYSTEM_ADMIN` | 本部運営 |

### 4.3 受講者ID突合（移行の肝）
- **【実コード確認】学習PFの `users` テーブルに `line_user_id` カラムは存在しない**（`supabase/migrations/20260609000000_init.sql:22-33`、カラムは id/organization_id/department_id/name/email(UNIQUE)/role/position/is_active のみ）。ZEROS-AI `persons` には `line_user_id` あり（`backend/src/models_ikusei.py:63`）。
- したがって**現状の突合キーは `email` 一択**。`line_user_id` で突合したい場合は、**`users.line_user_id`(nullable・UNIQUE・索引) の新設を Phase 1〜2 の作業項目に追加**することが前提（これをしないと §3 の `person_ref.line_user_id` を学習PFが解決できず実装不能）。
- 突合キー優先度（カラム追加後）：`line_user_id` → `email` / 追加前：`email` のみ。
- **移行フェーズ運用**：ZEROS-AIで診断完了 → 処方時に person_ref(line/email) を学習PFへ送付 → 学習PFが既存 `users` を検索（当面は email）、無ければ provision（仮パスワード or マジックリンク発行）。
- **最終形**：受講者ログインは学習PFに一本化。ZEROS-AI側はログインを廃し「診断は学習PFセッションのトークンで本人特定」する。

### 4.4 注意（実証済みの差分）
- ZEROS-AIは受講者を `persons`、管理者を Supabase Auth と**二系統**。学習PFは Supabase Auth 単一。寄せ先が学習PFのため、ZEROS-AIの person token 機構は**連携完了後に廃止対象**。
- 学習PFは現状 `/admin/*` `/org/*` に**サーバー側ロールゲートが無い**（防御がRLS単層）。基盤を寄せる前に §9-1 で**必ず是正**すること（テナント基盤の前提条件）。

---

## 5. コースカタログ統合 — 単一真実源の決定（未決・要判断）

両システムの `courses` スキーマは表現力が異なる。下表で写像と差分を示し、A/B/C案を比較する。

### 5.1 データモデル写像

| 概念 | ZEROS-AI | 学習PF | 差分メモ |
|---|---|---|---|
| コース識別 | `slug`(自然キー), `course_code`(A-3等) | `id`(UUID) | ZEROS-AIは人間可読コードを持つ |
| 分類 | `track`(level/skill/mandatory/knowledge), `band`(L1-L3), `series` | `category_id`(categories表) | ZEROS-AIは多軸、学習PFはフラットなカテゴリ |
| 教材 | `course_materials`(video/pdf/worksheet, is_required) | `lessons`(video/pdf/word/ppt/url/article/quiz) | 学習PFの方が教材種別が広く、レッスン単位 |
| クイズ | （なし／観測ベース） | `quiz_questions`(4択・**レッスン単位**)。80%合格判定は**アプリ層**（スキーマに合格ライン列なし） | 学習PF独自 |
| 公開制御 | `is_published`（※`organization_id`列なし→テナント別公開**不可**） | `is_active` ＋ `course_visibility`(組織別) | 学習PFはテナント別出し分け可。ZEROS-AI不可（`models_ikusei.py` Course に org列なし） |
| 受講登録 | enrollment無し（処方courseIdsから導出） | `enrollments`(進捗率トリガ) | 思想が異なる |
| 進捗 | `material_progress`(教材単位) | `lesson_progress`＋`enrollments`(自動集計) | 学習PFは自動集計トリガ有 |

### 5.2 案比較

| 観点 | 案A：ZEROS-AIの124本を正 | 案B：学習PF側を正 | 案C：新設の共通カタログ |
|---|---|---|---|
| 既存コンテンツ資産 | ◎ 124本シード済を即活用 | △ 移植が必要 | △ 移植が必要 |
| 処方ロジックとの結合 | ◎ track/band/course_code が処方に直結 | ○ 写像表が要る | ○ 写像表が要る |
| テナント別公開/RLS | △ organizations非対応・要拡張 | ◎ course_visibility完備 | ○ 新設すれば可 |
| 教材表現力(レッスン/クイズ) | △ video/pdf/worksheetのみ | ◎ 広い＋クイズ＋自動集計 | ○ 設計次第 |
| 運用編集UI | △ 管理UI弱い | ◎ admin/coursesでCRUD | △ 新設 |
| 基盤(認証/テナント=学習PF)との整合 | △ 別基盤に資産が残る | ◎ 基盤と同居 | ○ |
| 移行コスト | コンテンツ移植 小／基盤整合 大 | コンテンツ移植 大／基盤整合 小 | 両方 中〜大 |

### 5.3 中立的な見立て（決定は保留）
- **基盤を学習PFに寄せる決定**と整合性が高いのは **案B（学習PF側を正）**。テナント別公開・レッスン/クイズ・進捗自動集計・編集UIが既に学習PFにあり、認証/組織と同居できる。
- ただし**最大の資産＝ZEROS-AIの既存コース定義**。実シードは **level/skill/mandatory/knowledge の124本（`migrations/009`）＋ awareness 7本（`migrations/011`）＝計131本**。案Bを採るなら「131本を学習PFの courses/lessons へ移植する変換スクリプト」が成否を握る（§7 Phase 3）。
- **案A**は資産活用は最速だが、テナント/RLS/編集UI/基盤整合で逆流コストが大きく、「基盤＝学習PF」の決定と相反しやすい。

> **決定に必要な追加情報（ユーザーへ）**
> 1. ZEROS-AIの124本は「今後も増減・編集」されるか？（編集UIの所在＝正の所在に直結）
> 2. 124本の教材実体（動画URL/PDF/ワーク）は既に揃っているか、これからか？
> 3. クイズ・テナント別公開を全コースに広げたいか？（広げたい＝案B優位）

---

## 6. 受講・進捗の単一化

- 基盤＝学習PF のため、**進捗の正＝学習PFの `enrollments` + `lesson_progress`（自動集計トリガ）**。
- ZEROS-AIの「処方→受講対象」は、学習PFで **enrollment（受講登録）として明示化**する（ZEROS-AIは enrollment 概念を持たず courseIds から導出していた差分を埋める）。
- ZEROS-AI `material_progress` は連携完了後に廃止。移行時は person 突合で既存進捗を学習PF `lesson_progress` へ片道移送（任意）。

---

## 7. 移行計画（フェーズ）

| Phase | 目的 | 主な作業 | 成果物 | 検証 |
|---|---|---|---|---|
| **0** | カタログ真実源の決定 | §5 の追加情報を回収し A/B/C 確定 | 決定メモ | レビュー承認 |
| **1** | 学習PFの前提整備（先行） | ①`/admin/*``/org/*` サーバー側ロールゲート追加 ②`getServiceRoleClient`/ユーザー作成ロジックの重複解消 ③admin/users に検索/ページネーション/編集・削除 | 修正PR | E2E(権限境界) |
| **2** | 認証・テナント基盤統合 | ロール写像実装・person↔users 突合・organizations整合・**`users.line_user_id` カラム新設**(LINE突合する場合) | 突合バッチ＋API | E2E(ログイン/権限) |
| **3** | コースカタログ統合 | 確定案に基づく移植/写像スクリプト・course_id正規化（移植対象 **計131本**＝124+awareness7） | 変換スクリプト＋カタログ | データ整合チェック |
| **4** | 連携IF構築 | `POST /api/integrations/prescriptions` ＋ 進捗参照API ＋ サービス間認証 | 連携API | E2E(診断→受講割当) |
| **5** | ZEROS-AI受講機能の委譲 | ZEROS-AI courses/materials/material_progress を段階停止・処方出力に縮小 | 縮小PR | リグレッション |

- **ロールバック方針**：各Phaseは独立PRかつフィーチャーフラグで切替可能に。Phase 4までは ZEROS-AI 既存受講を温存し、Phase 5 で初めて切替。
- **別Org/別リポジトリ/別Supabase**であることに留意。CI・デプロイ境界は分離したまま、連携はAPI契約で結ぶ（§3-A）。

---

## 8. リスク・未決事項

| # | 項目 | 影響 | 対応 |
|---|---|---|---|
| 1 | コースカタログ真実源 **未決** | 全体設計の分岐点 | Phase 0 で最優先決定（§5.3 の3問） |
| 2 | 学習PFのロールゲート欠如 | 基盤を寄せる前提が崩れる/情報漏洩 | Phase 1 で先行是正（必須） |
| 3 | 認証方式差（cookie vs HMAC person token） | 受講者ID統合の複雑性 | line_user_id/email 突合＋段階委譲（§4.3） |
| 4 | スタック差（Next.js/JS vs FastAPI/Py） | コード直接共有不可 | API連携で吸収（§3-A）。共有は契約のみ |
| 5 | 別Supabase PJ・別Org | デプロイ/権限境界 | サービス間認証で疎結合維持 |
| 6 | ZEROS-AI `audit_logs` 書込未確認（推測） | 監査要件 | Phase 2 で実装状況を実証確認 |

---

## 9. 即時アクション（Phase 1：統合前提の整備）

統合可否に関わらず**今やる価値が高い**もの。学習PFリポジトリ単体で着手可能。

1. **🔒 サーバー側ロールゲート**：`src/app/admin/layout.js` `src/app/org/layout.js`（ともに認証/ロール検証ゼロ・描画のみ）と**各 server action**で呼び出し元ロールを検証（`middleware.js:67-71` は未認証→/loginのみでロール制御なし／LEARNERが管理画面を描画可能）。**特に `getServiceRoleClient()`(RLSバイパス) を使う action（`createUser`、`assignRoadmapsToUser` 等）はロール未検証だと致命的**——layout だけ塞いでも action を直叩きされれば素通り。
2. **重複解消**：`getServiceRoleClient`（定義2ファイル・**呼び出し5箇所**）＋モック判定の重複と、ユーザー作成ロジックを共通サービス化。※`createUser`は admin 側、`inviteUser`/`importUsersFromCSV`は org 側に分かれ**組織スコープが異なる**ため、共通化時はスコープを引数化。
3. **admin/users 機能補完**：編集・削除・検索・ページネーション・`position`表示。
4. `assignRoadmapsToUser` の全削除→再insert をトランザクション化。

> 参考：ZEROS Logos Path / ZEROS-AI に再利用価値のある部品 … PIIマスキング(`utils/pii.py`)・退会CASCADE削除・LINE OAuth/マジックリンク・分析UI(recharts)・認証ロック機構。本フェーズ対象外だが横展開候補。

---

## 10. ユーザーの決定待ち事項

1. **コースカタログ単一真実源**（案A/B/C）← §5.3 の3問への回答で確定
2. **連携方式**：方式A（疎結合API）でよいか
3. **Phase 1（前提整備）を先行着手**してよいか（統合判断と独立で価値あり）

---

*本書は調査（学習PF / ZEROS-AI / ZEROS Logos Path の実コードを file:line で実証）に基づく。スタックバージョン等は各リポジトリの実体を採用（各CLAUDE.md記載は陳腐化箇所あり）。*
