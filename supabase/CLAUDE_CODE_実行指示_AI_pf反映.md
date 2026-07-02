# Claude Code 実行指示 ── AI活用 PF反映（動画一本化＋資料付与）

> この内容を、`あわい屋ZEROSの学習プラットフォーム` リポジトリで起動した Claude Code にそのまま貼って依頼してください。

## ゴール
AI活用コース（course_id=`b0a10000-0000-4000-8000-000000000000`）を、本番Supabaseで「本編記事→動画レッスンへ一本化＋各動画にスライドPDF・ワークシート添付」状態にする。具体的には ① 動画解説9本をlessonsに投入 ② 本編article9本を削除し動画をsort1〜9へ ③ 各動画に slide_pdf_url / worksheet_word_url を付与 ④ Storageに素材18本をアップロード。

## 必要な認証情報（手元の.env.localには無い。Supabaseダッシュボードから取得）
- **DB接続文字列**: Supabase → Project Settings → Database → Connection string（`psql` 用、パスワード付き）。プロジェクトref=`wrunobvmzghzwwjtlqry`。
- **service_role キー**: Supabase → Project Settings → API → `service_role`（Storageアップロード用。anonキーでは不可）。
- ※これらは秘匿情報。リポジトリにはコミットしないこと（環境変数で渡す）。

## 手順1: Storage アップロード（先に実施）
バケット **course-materials** に以下を upsert アップロード（同名上書き可）。アップロード先キーは下表（SQL内URLと一致必須）。

| ローカルファイル(絶対パス) | アップロード先キー |
|---|---|
| `C:\Users\admin\Dropbox\あわい屋ZEROSのコンテンツ\01_動画作成（教育コンテンツ動画作成）\output\pf_upload\AI\slides\AI-0X_slides.pdf`（X=01〜09） | `slides/AI-0X_slides.pdf` |
| `C:\Users\admin\Dropbox\あわい屋ZEROSのコンテンツ\01_動画作成（教育コンテンツ動画作成）\output\pf_upload\AI\worksheets\AI-0X_worksheet.docx`（X=01〜09） | `worksheets/AI-0X_worksheet.docx` |

実装例（Node・@supabase/supabase-js は導入済み）:
```js
// upload_ai_materials.mjs  ―  SUPABASE_URL と SERVICE_ROLE_KEY を環境変数で渡して実行
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
const sb = createClient(process.env.SUPABASE_URL, process.env.SERVICE_ROLE_KEY);
const base = 'C:/Users/admin/Dropbox/あわい屋ZEROSのコンテンツ/01_動画作成（教育コンテンツ動画作成）/output/pf_upload/AI';
for (let i=1;i<=9;i++){
  const n = String(i).padStart(2,'0');
  for (const [dir,ext,ct] of [['slides','pdf','application/pdf'],['worksheets','docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document']]){
    const key = `${dir}/AI-${n}_${dir==='slides'?'slides':'worksheet'}.${ext}`;
    const file = readFileSync(`${base}/${dir}/AI-${n}_${dir==='slides'?'slides':'worksheet'}.${ext}`);
    const { error } = await sb.storage.from('course-materials').upload(key, file, { upsert:true, contentType:ct });
    console.log(key, error ? 'ERR '+error.message : 'ok');
  }
}
```

## 手順2: SQL 実行（Storageアップロード後）
冪等な統合SQLを流す。`psql` に接続文字列を渡して:
```bash
psql "<DB接続文字列>" -f "supabase/RUN_ai_pf反映_combined.sql"
```
（内容: 動画レッスン投入 → 全コース一本化＋資料付与。AIはPART A4。複数回実行可）

⚠️ 注意: 後で `seed_themetracks_catalog.sql` を流し直すと本編sortが戻るため、その場合はこの統合SQLを流し直すこと。

## 手順3: 検証
```sql
SELECT l.title, l.content_type, l.sort_order,
       l.slide_pdf_url IS NOT NULL AS slide,
       l.worksheet_word_url IS NOT NULL AS ws
FROM public.lessons l
WHERE l.course_id='b0a10000-0000-4000-8000-000000000000'
ORDER BY l.sort_order;
```
期待: video 9行(sort1〜9・slide=true・ws=true)、quiz 9行(sort91〜99)、article 0行。
さらに公開アプリでAI活用コースを開き、各動画レッスン上部にスライド/ワークシートのリンクが表示・ダウンロードできることを確認。

## 関連ファイル
- 統合SQL: `supabase/RUN_ai_pf反映_combined.sql`
- 個別: `supabase/seed_ai_video_lessons.sql`, `supabase/seed_pf_video_consolidation.sql`(PART A4=AI)
- 手順(ダッシュボード手動版): `supabase/RUN_ai_pf反映_手順.md`
