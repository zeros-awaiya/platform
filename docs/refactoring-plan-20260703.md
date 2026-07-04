# リファクタリング計画書（2026-07-03 作成）

対象リポジトリ: `あわい屋ZEROSの学習プラットフォーム`（このファイルがあるリポジトリ）
作成方法: 全ソース精読＋3系統の横断調査（重複/エラー処理・デッドコード/直値散在）＋ビルド・lint実測
実行者への合格条件: **この計画書とコードだけで、迷わず安全に全項目を完遂できること**

---

## 1. 現状理解（実行者への文脈共有）

### 1.1 何のアプリか
医療・介護組織向けLMS。組織ごとに受講者・コース・ロードマップ・必須研修を管理し、動画＋確認クイズで学習を進める。本番は Vercel（git push で自動デプロイ）＋ Supabase。**このリポジトリは本番稼働中**。挙動を変えない変更のみが許される。

### 1.2 技術スタックと構造
- Next.js 16 App Router / **JavaScript（TypeScriptではない）** / React 19 / Tailwind 4 + CSS Modules / @supabase/ssr
- 画面の型は3点セット: `page.js`（Server Component・データ取得）＋ `XxxClientPage.js`（'use client'・UI）＋ `actions.js`（'use server'・書き込み）
- ルート構成:
  - `/login` … 全員
  - `/dashboard/**` … 受講者(LEARNER)。コース受講・クイズ・履歴・プロフィール
  - `/org/**` … 組織管理者(ORG_ADMIN)。自組織ユーザー管理
  - `/admin/**` … システム管理者(SYSTEM_ADMIN)。コース/カテゴリ/ロードマップ/組織/ユーザー/通知/必須研修/監査
  - `/api/health` … keep-alive。`/api/integrations/*` … 外部連携（Bearerトークン認可 `src/utils/integrationAuth.js`）

### 1.3 認証・認可の全体像（重要）
- セッション: `src/middleware.js` → `src/utils/supabase/middleware.js` の `updateSession()`。未認証は `/login` へリダイレクト。
- 画面ガード: 各エリアの `layout.js` が `src/utils/auth/guard.js` の `requireRole([...])` を呼ぶ（例: `admin/layout.js` は `['SYSTEM_ADMIN']`）。
- Server Action ガード: `guard.js` の `assertRole([...])`。**ただし現状使っているのは `admin/users/actions.js` のみ**（→ 作業項目 R3）。
- 最終防衛線は Supabase RLS（`supabase/migrations/20260609000000_init.sql` 271行目以降）。書き込み系は `get_my_role()` ベースで役割制限されているため、**アプリ層のガード漏れは「即・脆弱性」ではなく「多層防御の欠け」**である。この事実を前提に優先度を付けている。
- 例外: `admin/users` と `org/users` のユーザー作成だけは service_role クライアント（`src/utils/supabase/admin.js` の `provisionUser`）を使い RLS をバイパスする。ここだけはアプリ層ガードが唯一の防御なので、既に `assertRole` / 独自ガードが入っている。

### 1.4 モックモード（ローカル動作の前提）
- `.env.local` はプレースホルダーのみ → ローカルでは **モックモード** で動く（本番キーは Vercel にのみある）。
- 判定ロジック `isMockMode`（「envが無い or プレースホルダー文字列」）が **4か所に重複実装**されている: `src/utils/supabase/server.js:10-14` / `admin.js:4-11` / `supabase/middleware.js:13-17` / `app/api/health/route.js:17-21`（→ R5）。
- モックDB: `src/utils/supabase/mock_client.js`（440行）＋ `mock_db.json`。**ログインは既知メールなら任意のパスワードで通る**（`mock_client.js:406-415` がパスワードを検証しないため）。検証用アカウント:
  - `sysadmin@zeros.jp`（SYSTEM_ADMIN → /admin へ）
  - `orgadmin@zeros.jp`（ORG_ADMIN → /org へ）
  - `learner@zeros.jp`（LEARNER → /dashboard へ）
- この性質を「特性テスト」の土台に使う（項目0）。**mock_client.js は本番では到達しないコードだが、ローカル検証の生命線なので削除・変更禁止。**

### 1.5 データモデル要点
`categories → courses → lessons`（`lessons.content_type` ∈ video/article/quiz/pdf/word/powerpoint/url）。ロードマップ=`learning_paths`系。進捗=`lesson_progress`（insert/deleteで`enrollments`を更新するDBトリガーあり）。クイズ=`quiz_questions`/`quiz_attempts`、**合格ライン80%**（`src/app/dashboard/courses/[id]/lessons/[lessonId]/actions.js:78`）。

### 1.6 実測ベースライン（2026-07-03、コミット 6e4c3ba 時点）
- `npm run build` … **成功（exit 0）**。全18ルート生成。
- `npm run lint` … **7エラー・7警告**（エラーの内訳は項目0参照。これが基準値。増やしたら失敗）。
- git状態: main ブランチ。`supabase/seed_ng_video_lessons.sql` と `supabase/seed_pf_video_consolidation.sql` に**未コミットの変更があるが、これはリポジトリ所有者の作業中ファイル。絶対に触らない・コミットしない・stashしない**（本計画は `src/` と `docs/` と `scripts/` のみ触る）。

---

## 2. 項目0: 安全網の構築（最初に必ず実行）

### 0-1. 作業ブランチとコミット
```bash
git checkout main
git checkout -b refactor/plan-20260703
# 以後のコミットは必ずファイル指定で行う。git add -A / git add . は禁止
# （所有者の未コミットSQLを巻き込まないため）
```

### 0-2. ベースライン記録
```bash
npm run build   # exit 0 を確認。失敗したら作業開始せず中断・報告
npm run lint    # 「7 errors」を確認。数が違ったら中断・報告（前提が変わっている）
```
lint 7エラーの内訳（これと一致すること）:
1. `src/app/admin/AdminSidebar.js:16` … setState-in-effect
2. `src/app/dashboard/LearnerSidebar.js:16` … setState-in-effect
3. `src/app/org/OrgSidebar.js:16` … setState-in-effect
4. `src/app/admin/mandatory/MandatoryClientPage.js:26` … 宣言前アクセス（lint上のみ。実行時は非同期コールバックなので落ちない）
5. `src/app/dashboard/history/page.js:69` … try/catch内でJSX構築
6. `src/app/dashboard/profile/page.js:25` … 同上
7. `src/app/dashboard/profile/page.js:32` … 同上

### 0-3. 特性テスト（スモークスクリプト）の作成
テストフレームワークは存在しない。導入もしない（やらないこと参照）。代わりに Node 標準のみで `scripts/smoke.mjs` を新規作成する。**以下の仕様をそのままコードにすること:**

- 前提: 別ターミナルで `npm run dev` が起動済み（`http://localhost:3000`、モックモード）。
- 各チェックは `fetch`（redirect: 'manual'）で行い、PASS/FAIL を1行ずつ出力、1つでもFAILなら exit 1。

| # | リクエスト | 期待結果 |
|---|---|---|
| S1 | GET `/` | status 200 |
| S2 | GET `/login` | status 200 |
| S3 | GET `/dashboard`（Cookieなし） | status 307 かつ Location ヘッダに `/login` を含む |
| S4 | GET `/admin`（Cookieなし） | status 307 かつ Location に `/login` を含む |
| S5 | GET `/api/health` | status 200、JSONで `status:"ok"` かつ `mode:"mock"` |
| S6 | GET `/api/integrations/courses`（Authorizationなし） | status 500（INTEGRATION_TOKEN未設定のため。ローカルの期待値） |

- あわせて **手動チェックリスト**（ブラウザ、各項目の完了条件で「手動確認」と指定された時のみ実施）:
  - M1: `sysadmin@zeros.jp`＋任意パスワードでログイン → `/admin` に着地し、サイドバーに9項目のメニューが見える
  - M2: `orgadmin@zeros.jp` → `/org` に着地
  - M3: `learner@zeros.jp` → `/dashboard` に着地し、コース一覧カードが表示される
  - M4: `/admin/courses` でコースを1つ選択 → レッスン一覧テーブルが表示され、「レッスンを追加」モーダルが開閉できる
  - M5: ログアウト → `/login` に戻る

### 0-4. コミット
```bash
git add scripts/smoke.mjs
git commit -m "chore: add smoke test script (refactor baseline)"
```
以後、**各作業項目の完了条件は共通で「`npm run build` exit 0」「lintエラー数が項目に書かれた期待値以下」「`node scripts/smoke.mjs` 全PASS」＋項目固有の条件**とする。

---

## 3. 作業項目リスト（実行順・1項目=1コミット)

> 行番号は 2026-07-03 時点のもの。先行項目の変更でズレるため、**行番号は目安、関数名・コード片で特定**すること。

---

### R1: ロール文字列の定数化
- **対象**: 新規 `src/lib/constants.js` ＋ `src/utils/auth/guard.js:5-9` / `src/app/login/actions.js:52-54` / `src/app/page.js:29-31` / `src/app/admin/layout.js:12` / `src/app/org/layout.js:12` / `src/app/admin/users/actions.js`（5か所の `assertRole(['SYSTEM_ADMIN'])`）/ `src/app/org/users/actions.js:18,40`
  （注: `dashboard/layout.js` には requireRole が無いので対象外。これは既知の観察事項として第4章末尾に記載）
- **問題**: 'SYSTEM_ADMIN'/'ORG_ADMIN'/'LEARNER' がサーバー側だけで22か所以上直書き。タイポが認可バグに直結する。
- **変更**:
  ```js
  // src/lib/constants.js（新規）
  export const ROLES = {
    SYSTEM_ADMIN: 'SYSTEM_ADMIN',
    ORG_ADMIN: 'ORG_ADMIN',
    LEARNER: 'LEARNER',
  }
  export const ROLE_HOME = {
    [ROLES.SYSTEM_ADMIN]: '/admin',
    [ROLES.ORG_ADMIN]: '/org',
    [ROLES.LEARNER]: '/dashboard',
  }
  ```
  - `guard.js` のローカル `ROLE_HOME` 定義を削除し constants から import。
  - 上記対象ファイルの role 文字列リテラルを `ROLES.XXX` に置換。**対象はサーバー側ファイルとlayoutのみ**。ClientPage内のUIラベル用三項演算子（例: `AdminUsersClientPage.js:270-274` の色分け）は今回触らない（表示に影響しうるため）。
- **完了条件**: 共通条件＋ `grep -rn "'SYSTEM_ADMIN'" src/app/*/layout.js src/app/login src/utils/auth src/app/page.js` が0件。lintエラー7以下。手動確認M1〜M3（3ロールのリダイレクト先が変わっていないこと）。
- **リスク/戻し方**: 置換ミスでリダイレクトループの恐れ → M1〜M3で検出。戻す時は `git revert <このコミット>`。
- **依存**: 項目0のみ。

---

### R2: org/users の独自認可を guard.js に統一 ＋ メールtrim欠落の修正
- **対象**: `src/app/org/users/actions.js:8-22`（`requireOrgAdmin`）、同 `inviteUser`（24行〜）、`importUsersFromCSV`（90行〜）
- **問題**: (1) `guard.js` と同じ責務の独自実装 `requireOrgAdmin` があり、しかも `assertRole` が行う **呼び出し元の `is_active` チェックが欠けている**（無効化された組織管理者が操作できてしまう）。(2) AGENTS.md に「メールはtrimしてから認証（過去に空白で認証失敗のバグ）」と明記があるのに、`inviteUser` と `importUsersFromCSV` は email を trim せずに `provisionUser` へ渡す（`admin/users/actions.js:16` は trim 済み）。
- **変更**（スケッチ）:
  ```js
  // before（org/users/actions.js 冒頭）
  async function requireOrgAdmin(supabase) { ...独自実装... }
  const gate = await requireOrgAdmin(supabase)
  if (gate.error) return { error: gate.error }
  const orgId = gate.orgId

  // after
  import { assertRole } from '@/utils/auth/guard'
  import { ROLES } from '@/lib/constants'
  const auth = await assertRole([ROLES.ORG_ADMIN])
  if (!auth.ok) return { error: auth.error }
  const orgId = auth.profile.organization_id
  ```
  - `requireOrgAdmin` 関数は削除。3関数（inviteUser / toggleUserActive / importUsersFromCSV）すべて置換。
  - `inviteUser` は `email` を使う直前に `const trimmedEmail = email?.trim()`、`importUsersFromCSV` はループ内で `email?.trim()` に置換。
  - **注記**: これは純粋リファクタではなく2点の軽微な挙動修正（無効アカウント遮断・trim）を含む。どちらも AGENTS.md 記載のルール・既存 `admin/users` 実装への整合であり、仕様変更ではない。
- **完了条件**: 共通条件＋ `grep -n "requireOrgAdmin" src -r` が0件。手動確認: M2でログイン後、/org/users で「メンバーを招待」モーダルが開くこと（送信までは不要）。
- **リスク/戻し方**: `assertRole` は `role`＋`is_active` を見るが org スコープは見ない → orgId を profile から取る形を維持しないと他組織を操作しうる。スケッチ通り `auth.profile.organization_id` を使えば従来と同一スコープ。戻すのは revert。
- **依存**: R1（ROLES を使うため）。

---

### R3: admin系 Server Actions 全25関数に assertRole を追加（多層防御の統一）
- **対象と関数**（すべて `assertRole([ROLES.SYSTEM_ADMIN])` を関数先頭に追加）:
  - `src/app/admin/categories/actions.js` … createCategory / deleteCategory
  - `src/app/admin/courses/actions.js` … createCourse / updateCourse / deleteCourse / createLesson / updateLesson / deleteLesson / reorderLessons / saveQuizQuestions
  - `src/app/admin/mandatory/actions.js` … createMandatoryCourse / deleteMandatoryCourse
  - `src/app/admin/notifications/actions.js` … createNotification / deleteNotification
  - `src/app/admin/organizations/actions.js` … createOrganization / updateOrganization / deleteOrganization
  - `src/app/admin/organizations/[id]/actions.js` … createDepartment / deleteDepartment
  - `src/app/admin/roadmaps/actions.js` … createRoadmap / updateRoadmap / deleteRoadmap / addCourseToRoadmap / removeCourseFromRoadmap / reorderRoadmapCourses（8/28/74/92/133/150行）
- **問題**: Server Action はURLを知る誰でも（認証済みなら）直接呼べる。現状 RLS が実書き込みを防ぐが、アプリ層ガードが `admin/users` にしか無く、防御が単層かつ実装方針が不統一。
- **変更**（全関数共通の定型。判断の余地なし）:
  ```js
  import { assertRole } from '@/utils/auth/guard'
  import { ROLES } from '@/lib/constants'

  export async function createCourse(...) {
    const auth = await assertRole([ROLES.SYSTEM_ADMIN])
    if (!auth.ok) return { error: auth.error }
    // ...既存処理そのまま...
  ```
- **挙動変化**: SYSTEM_ADMIN が操作する正規ルートでは一切変化なし。非管理者が直接叩いた場合のみ「RLSで空振り/エラー」→「権限がありません。」の即時返却に変わる（望ましい変化）。
- **完了条件**: 共通条件＋ `grep -L "assertRole" src/app/admin/*/actions.js src/app/admin/*/*/actions.js` が0件（全actions.jsがassertRoleを含む）。手動確認M4（コースビルダーの表示・モーダル開閉が正常）。
- **リスク/戻し方**: import追加漏れでビルドエラー→即検出。revert可。
- **依存**: R1。

---

### R4: admin/courses のクライアント⇔サーバー引数不一致の解消
- **対象**: `src/app/admin/courses/CourseBuilderClientPage.js:71-114`（handleCreateCourseSubmit / handleUpdateCourseSubmit）と `src/app/admin/courses/actions.js:8,34`（createCourse / updateCourse のシグネチャ）
- **問題**: クライアントは `createCourse(title, categoryId, description, thumbnailUrl, slidePdfUrl, worksheetWordUrl)` と6引数で呼ぶが、サーバーは4引数しか受けない（updateCourse も同様に8引数→6引数）。余分な引数は**黙って捨てられている**。さらに `formData.get('slide_pdf_url')` 等はフォームに存在しないフィールドの取得で常に null。将来「保存されるはず」と誤解する温床。
- **変更**: クライアント側から余分を削る（サーバーは触らない）:
  ```js
  // before (CourseBuilderClientPage.js:78-83)
  const slidePdfUrl = formData.get('slide_pdf_url')
  const worksheetWordUrl = formData.get('worksheet_word_url')
  const res = await createCourse(title, categoryId, description, thumbnailUrl, slidePdfUrl, worksheetWordUrl)
  // after
  const res = await createCourse(title, categoryId, description, thumbnailUrl)
  ```
  updateCourse 呼び出しも同様に `(selectedCourse.id, title, categoryId, description, thumbnailUrl, isActive)` の6引数へ。**レッスン系（createLesson/updateLesson）の slidePdfUrl/worksheetWordUrl はサーバーが受けて保存している正当な引数なので触らない。**
- **完了条件**: 共通条件＋手動確認M4、および `/admin/courses` でコース情報を開いて「コース情報を保存」を押しエラーが出ない（モック環境）。
- **リスク/戻し方**: 低。revert可。
- **依存**: なし（ただしR7より先に行うこと。R7はこの状態を前提にモーダルを再構成する）。

---

### R5: isMockMode 判定の単一実装化
- **対象**: 新規 `src/utils/supabase/mockMode.js` ＋ 重複4か所: `server.js:10-14` / `admin.js:4-11` / `supabase/middleware.js:13-17` / `app/api/health/route.js:17-21`
- **問題**: 同一ロジックが4回コピペされており、環境変数名の追加・判定変更時に修正漏れが起きる。
- **変更**:
  ```js
  // src/utils/supabase/mockMode.js（新規）
  export function isMockMode() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    return !url || url.includes('your-supabase-project') || !key || key === 'your-supabase-anon-key'
  }
  ```
  - 注意: 既存 `admin.js` の判定は `SUPABASE_URL` フォールバックを見ていない（`NEXT_PUBLIC_` のみ）。上記統一版は server.js/middleware.js 版に合わせる。Vercel には `NEXT_PUBLIC_*` が設定済みのため実質差はないが、**統一版の採用が正**とする。
  - 4か所を `import { isMockMode } from './mockMode'`（相対パスは各ファイルに合わせる）に置換。`admin.js` の `export function isMockMode` は re-export に変更（`export { isMockMode } from './mockMode'`）— `admin/users/actions.js` が import しているため既存 import を壊さない。
- **完了条件**: 共通条件＋S5（health が `mode:"mock"`）PASS＋ `grep -rn "your-supabase-project" src | wc -l` が 1件（mockMode.js のみ）。
- **リスク/戻し方**: middleware は Edge 実行だが本モジュールは process.env 参照のみで問題なし。revert可。
- **依存**: なし。

---

### R6: auditData.js の Supabase エラー無視（8か所）を解消
- **対象**: `src/app/admin/audit-export/auditData.js`（`(await supabase.from(...)).data` 形式の全クエリ）と `src/app/admin/audit-export/print/route.js`
- **問題**: error を一切見ず `.data` を直接使うため、クエリ失敗時に null に対する `.map()`/`.find()` で監査PDF生成がクラッシュ、または**欠落データの監査レポートが「正常な顔」で出力される**（監査文書として最悪）。
- **変更**: ファイル冒頭にヘルパーを追加し、全クエリを包む:
  ```js
  // auditData.js 冒頭に追加
  function must({ data, error }, label) {
    if (error) throw new Error(`監査データ取得失敗(${label}): ${error.message}`)
    return data ?? []
  }
  // before
  const orgs = (await supabase.from('organizations').select('...')).data
  // after
  const orgs = must(await supabase.from('organizations').select('...'), 'organizations')
  ```
  - `print/route.js` 側は `getAuditReport()` 呼び出しを try/catch で包み、catch では `console.error` の上で status 500 とエラーメッセージ入りの簡素なHTML（またはJSON）を返す。既に try/catch がある場合はそのままでよい（実装を確認して判断ではなく: **無ければ追加、あれば変更しない**）。
- **完了条件**: 共通条件＋手動確認: M1でログイン→ /admin/audit-export で組織・年度を選び「監査PDFを出力」→ モック環境で印刷用ページがエラーなく開く。
- **リスク/戻し方**: これまで「静かに欠落」していたケースが「明示的な500」になる（望ましい変化・監査の正確性優先）。revert可。
- **依存**: なし。

---

### R7: CourseBuilderClientPage（888行）の分割と重複除去
- **対象**: `src/app/admin/courses/CourseBuilderClientPage.js`
- **問題**:
  1. 「レッスン追加モーダル」(533-708行)と「レッスン編集モーダル」(711-885行)が約175行×2でほぼ完全重複（差分は defaultValue、radioのname接頭辞、送信ハンドラのみ）
  2. クイズ設問エディタ部分(594-689行 と 771-866行)が逐語的重複
  3. content_type の選択肢リスト(554-560行 と 732-738行)が二重定義
  4. 17行目 `const [courses, setCourses] = useState(initialCourses)` の `courses` は一度も参照されない未使用state
- **変更**（この構成に固定。命名も含め判断の余地なし）:
  1. `src/app/admin/courses/QuizQuestionsEditor.js` を新規作成（'use client'）。props: `{ questions, onAdd, onUpdate, onRemove, radioNamePrefix }`。現在の594-689行のJSXをそのまま移し、`new_correct_${qIdx}` の接頭辞部分を `${radioNamePrefix}_${qIdx}` に置換。
  2. `src/app/admin/courses/LessonFormModal.js` を新規作成（'use client'）。props: `{ mode /* 'add' | 'edit' */, lesson /* editのみ。addはnull */, activeContentType, onContentTypeChange, quizEditorProps, errorMsg, isPending, onSubmit, onClose }`。現在の追加モーダルJSXを土台に、defaultValue を `lesson?.title ?? ''` 形式で吸収。ヘッダー文言とボタン文言は `mode` で分岐（'レッスンを追加'/'レッスンを編集'、'追加中...'/'保存中...'）。
  3. content_type 選択肢は `src/lib/constants.js` に追加して両者から参照:
     ```js
     export const CONTENT_TYPE_OPTIONS = [
       { value: 'video',      label: 'YouTube動画 (埋め込み)' },
       { value: 'article',    label: 'システム内解説記事 (Markdown)' },
       { value: 'url',        label: '外部リンク (Web記事・リソース)' },
       { value: 'pdf',        label: 'PDFドキュメント (外部リンク)' },
       { value: 'word',       label: 'Wordファイル (外部リンク)' },
       { value: 'powerpoint', label: 'PowerPoint (外部リンク)' },
       { value: 'quiz',       label: '確認テスト (QUIZ)' },
     ]
     ```
     **ラベル文字列は現状と一字一句同じにする**（上記は現ソースからの転記）。
  4. 未使用の `courses` state と `setCourses` を削除。
  5. 本体は2つの新コンポーネントを `mode` 違いで呼び出す形にし、**本体を500行以下**にする。
- **完了条件**: 共通条件＋ `wc -l src/app/admin/courses/CourseBuilderClientPage.js` が500未満＋手動確認M4を拡張: 追加モーダルで「確認テスト (QUIZ)」を選ぶと設問エディタが出る／既存レッスンの「編集」でタイトル・形式が既値表示される／▲▼で並び替えが動く。
- **リスク/戻し方**: 最大の項目。フォームの name 属性を1つでも変えると保存が壊れる → **name属性・id属性は一切変更しない**こと。失敗時は `git revert`（このコミット単独で戻る。R1/R4完了後の状態が前提のため、部分適用はしない）。
- **依存**: R4（引数整理後の呼び出し形が前提）。R1（constants.js が存在すること）。

---

### R8: サイドバー3枚の共通化
- **対象**: `src/app/admin/AdminSidebar.js`(156行) / `src/app/dashboard/LearnerSidebar.js`(149行) / `src/app/org/OrgSidebar.js`(148行)
- **問題**: state管理・テーマ切替（3ファイルで完全同一の `handleThemeChange`、19-23行）・モバイル開閉・ログアウトフォームが3重コピー。リンク配列とバッジ文言とCSSモジュール参照だけが異なる。
- **変更**:
  1. `src/components/AppSidebar.js` を新規作成（'use client'）。props: `{ links /* [{href,label}] */, logoBadge, styles /* CSSモジュールオブジェクト */ }`。3ファイルの共通JSX（モバイルヘッダー/ナビ/テーマ選択/ログアウト）を移す。テーマ関連stateとlocalStorage処理もここに含める（現行ロジックのまま移動。lint対応はR9で行う）。
  2. 既存3ファイルは「links配列＋バッジ文言を定義して `<AppSidebar styles={styles} .../>` を返すだけ」の薄いファイルに書き換える（各30行程度になる想定）。**CSSモジュールは従来どおり各エリアのものを渡す＝見た目の変化ゼロ**。
  3. アクティブリンク判定など3ファイル間に差分があった場合は **AdminSidebar.js の実装を正として統一**し、差分内容をコミットメッセージに列挙する。
- **完了条件**: 共通条件＋手動確認M1〜M3で3エリアのサイドバー表示・テーマ3色切替・モバイル幅(375px)での開閉・ログアウト(M5)がすべて従来どおり。
- **リスク/戻し方**: 視覚回帰。確認は3エリア×（デスクトップ/モバイル幅）。revert可。
- **依存**: なし（R9より先）。

---

### R9: lintエラー7件→0件
- **対象と修正法**（判断の余地なし）:
  1. `MandatoryClientPage.js` … `showToast` の宣言（現37-40行）を `useActionState` 呼び出し（現22行）より上へ移動するだけ。
  2. `dashboard/profile/page.js` / `dashboard/history/page.js` … try/catch の中でJSXを return している構造を「try内はデータ取得のみ・取得結果を変数に入れ、JSX構築はtryの外」に並べ替える。表示条件・文言は変えない。
     ```js
     // 形だけ示す（profile/page.js）
     let profile = null, loadError = null
     try { profile = await loadProfile() } catch (e) { loadError = e }
     if (loadError || !profile) return <エラー表示（従来のcatch側JSXをそのまま>
     return <LearnerProfileClientPage profile={profile} />
     ```
  3. サイドバーのテーマ初期化（R8で `AppSidebar.js` に1か所化済み）… `useState('ocean')`＋`useEffect(setState)` を `useSyncExternalStore` に置換:
     ```js
     import { useSyncExternalStore } from 'react'
     const emptySubscribe = () => () => {}
     const activeTheme = useSyncExternalStore(
       emptySubscribe,
       () => localStorage.getItem('zeros-theme') || 'ocean', // client snapshot
       () => 'ocean',                                        // server snapshot
     )
     // handleThemeChange は従来どおり setAttribute + setItem。
     // 再描画が必要なため小さな setVersion(v => v+1) 用stateを1つ置いてよい
     ```
     ※ この置換で見た目・保存挙動は不変（初回描画が'ocean'→保存テーマに切り替わる点も従来と同じ）。
- **完了条件**: `npm run lint` が **0エラー**（警告は不問）＋共通条件＋手動確認: テーマ切替→リロードで選択テーマが維持される。
- **リスク/戻し方**: (3)のみ挙動に敏感。テーマ維持が壊れたらこのコミットだけ revert し、(1)(2)を別コミットで再適用してよい。
- **依存**: R8。

---

### R10: 日付フォーマットの共通化（同一書式の箇所のみ）
- **対象**: 新規 `src/utils/format.js` ＋ 置換対象は**この2書式に完全一致する箇所だけ**:
  - 書式A `{ year:'numeric', month:'2-digit', day:'2-digit' }`（ja-JP）: `LearnerHistoryClientPage.js:102-105` / `MandatoryClientPage.js:56-63` / `NotificationsClientPage.js:43-49`
  - 書式B 同上＋`hour,minute,second`: `admin/audit-logs/page.js:22-29`
- **問題**: 同じ意図の日付整形が6通り以上の書き方で散在。
- **変更**: `formatDate(iso)`（書式A・null/不正値は'-'を返す）と `formatDateTime(iso)`（書式B）を作り、上記列挙箇所のローカル実装を置換・削除。**列挙外（例: `LearnerDashboardClientPage.js:56` のロケール既定書式）は出力が変わるため触らない。**
- **完了条件**: 共通条件＋手動確認: /dashboard/history（M3）と /admin/audit-logs（M1）の日付表示が「YYYY/MM/DD」形式のまま。
- **リスク/戻し方**: 低。revert可。
- **依存**: なし。

---

### 実行順まとめと依存関係

| 順 | ID | 一言 | 依存 | 期待lintエラー数 |
|---|---|---|---|---|
| 0 | R0 | 安全網 | - | 7 |
| 1 | R1 | ロール定数化 | R0 | 7 |
| 2 | R2 | org認可統一+trim | R1 | 7 |
| 3 | R3 | admin全actionsにガード | R1 | 7 |
| 4 | R4 | 引数不一致解消 | - | 7 |
| 5 | R5 | isMockMode一本化 | - | 7 |
| 6 | R6 | 監査データerror処理 | - | 7 |
| 7 | R7 | コースビルダー分割 | R1,R4 | 7 |
| 8 | R8 | サイドバー共通化 | - | 7→5前後(※) |
| 9 | R9 | lint 0化 | R8 | **0** |
| 10 | R10 | 日付整形共通化 | - | 0 |

※R8でsetState-in-effectが3件→1件（AppSidebar内）に減る。R9完了時点で0にする。

**トレース検証済みの注意点**: R7はR4後のコードを前提にスケッチしてある／R9(1)とR10は同じ `MandatoryClientPage.js` を触るが行が重ならない（宣言移動 vs formatDate置換）。順番どおりなら競合しない。

---

## 4. やらないこと（実行者への禁止事項）

善意でも以下をやってはいけない。必要と感じたら**作業を止めて報告**すること。

1. **機能追加・仕様変更・文言変更**（エラーメッセージ・ラベル・プレースホルダー含む。計画に明記した箇所以外は一字も変えない）
2. **依存ライブラリの追加・更新・削除**（npm install 禁止。package.json / package-lock.json に触らない）
3. **TypeScript化・ファイル拡張子変更**（.js のまま）
4. **DB関連すべて**: `supabase/` 配下・マイグレーション・RLS・トリガー・seedの変更、および本番DBへのあらゆる接続・書き込み
5. **`.env.local`・環境変数・Vercel設定の変更**
6. **mock_client.js / mock_db.json / client.js の削除・改変**（client.jsは未使用だがAGENTS.mdが将来用途を規定。mock系はローカル検証の土台）
7. **CSSモジュールの統合・整理**（org/admin/dashboardの.module.cssに同一クラスが大量にあるが、視覚回帰リスクが高くROIが低いため今回対象外）
8. **AdminUsersClientPage と OrgUsersClientPage の統合**（機能差が大きく判断が必要。対象外）
9. **actions.js 群のCRUDファクトリ化・エラーハンドリング抽象化**（23か所の同型コードがあるが、抽象の設計判断が必要なため今回対象外）
10. **`supabase/seed_ng_video_lessons.sql` と `seed_pf_video_consolidation.sql` の未コミット変更に触ること**（所有者の作業中ファイル）
11. **git add -A / git add . / git push --force / main への直接コミット**
12. **テストフレームワークの導入**（smoke.mjs は Node 標準のみで書く）

### 発見済みだが本計画では扱わない既知の問題（所有者への報告事項）
- `deleteLesson`（`admin/courses/actions.js:149`）・`deleteCourse` は、受講者の `lesson_progress` が残るレッスンを消すと DBトリガー `trg_update_course_enrollment_progress` が失敗する可能性が高い（AGENTS.md記載の既知の落とし穴と同根）。修正はDB挙動に関わるため本計画から除外。
- 中間の `admin/audit-export/page.js:12-16`・`audit-logs/page.js:13-16` にも error 無視があるが、null ガードがあり実害が小さいため R6 の対象外（将来課題）。
- lint警告7件（`<img>` → `next/image` 推奨）は表示挙動が変わりうるため対象外。
- `src/app/dashboard/layout.js` には `requireRole` が無く、どのロールでも `/dashboard` を閲覧できる（データ自体はRLSで保護）。仕様の可能性が高いため変更しないが、所有者に確認を推奨。

---

## 5. 実行者への指示文（このままコピペして渡す）

```
あなたはこのリポジトリのリファクタリング実行者です。
docs/refactoring-plan-20260703.md を開き、次のルールで作業してください。

1. まず計画書を全文読む。次に「項目0: 安全網」を実行する。
   ベースライン（build成功・lintエラー7件）が一致しない場合は、
   何もせず不一致内容を報告して停止する。
2. 作業項目は R1→R2→…→R10 の順に、必ず1項目ずつ実施する。
   並行作業・順序入れ替え・複数項目の同時コミットは禁止。
3. 1項目終えるごとに、その項目の「完了条件」をすべて実行・確認し、
   満たしたらその項目の変更ファイルだけを git add（add -A 禁止）して
   「refactor(R番号): 内容」の形式でコミットする。
4. 完了条件を満たせない場合は、その項目の変更を破棄（git checkout -- <files>）し、
   何をして何が失敗したかを報告して停止する。次の項目に進んではいけない。
5. 計画書の「やらないこと」に該当する変更は、どんなに正しく見えても行わない。
   計画に書かれていない問題を見つけたら、直さずにメモして最後に報告する。
6. 挙動の正否は「計画書に書いてある期待値」だけで判断する。
   自分の記憶にあるNext.jsの常識と食い違う場合はコード内の実装と
   node_modules/next/dist/docs/ を正とする。
7. 全項目完了後、次を報告する:
   - 各項目のコミットハッシュと完了条件の実行結果（コマンド出力）
   - 手動チェックリストM1〜M5の結果
   - 作業中に見つけたが触らなかった問題のリスト
ブランチは refactor/plan-20260703。main へのマージ・push は行わず、人間のレビューを待つこと。
```

---

## 6. 全体の戻し方

- 項目単位: `git revert <該当コミット>`（各項目は独立コミットのため単独で戻せる。R9はR8に依存するため、R8を戻す場合はR9→R8の順で revert）
- 全体: `git checkout main` すれば作業前の状態（ブランチ `refactor/plan-20260703` は残るので調査可能）
- この計画書自体の削除: `docs/refactoring-plan-20260703.md` を削除するだけ（コードへの影響なし）
