# AI活用 PF反映 実行ランブック（2026-06-29）

AIの動画レッスン投入＋一本化（本編記事→動画＋スライド／ワークシート）を本番（Supabase）へ反映する手順。所要 約10分。

## 事前にあるもの
- 統合SQL: `supabase/RUN_ai_pf反映_combined.sql`（これ1本を貼って実行すればOK）
- アップロード素材（統一名・準備済み）:
  - スライド9本 … `01_動画作成（教育コンテンツ動画作成）/output/pf_upload/AI/slides/AI-01_slides.pdf 〜 AI-09_slides.pdf`
  - ワークシート9本 … `01_動画作成（教育コンテンツ動画作成）/output/pf_upload/AI/worksheets/AI-01_worksheet.docx 〜 AI-09_worksheet.docx`

---

## STEP 1 ─ Storage に素材をアップロード（先に必須）
Supabase ダッシュボード → **Storage** → バケット **course-materials** を開く。

1. `slides` フォルダを開き、上記 `pf_upload/AI/slides/` の **AI-01〜09_slides.pdf（9本）** をアップロード。
2. `worksheets` フォルダを開き、`pf_upload/AI/worksheets/` の **AI-01〜09_worksheet.docx（9本）** をアップロード。

※ ファイル名はSQL内のURLと一字一句一致させること（`AI-0X_slides.pdf` / `AI-0X_worksheet.docx`）。同名があれば上書きでOK。

## STEP 2 ─ SQL を実行
Supabase ダッシュボード → **SQL Editor** → New query。
`RUN_ai_pf反映_combined.sql` の**全文**を貼り付けて **Run**。

- 内容:(1) AI動画解説9本を投入 →(2) AI本編記事を削除し動画へ一本化、動画にスライド＋ワークシートを付与（CC/L0.1/CBの一本化も冪等に再適用）。
- 冪等なので複数回流しても安全。
- ⚠️ 実行順の注意: `seed_themetracks_catalog.sql` を後から流し直すと本編sortが戻るため、その場合はこの統合SQLを流し直すこと。

## STEP 3 ─ 反映の確認（任意）
SQL Editor で以下を実行し、AIコースが「動画9本（sort1〜9）＋確認テスト9本（91〜99）」、本編articleが消えていることを確認。

```sql
SELECT l.title, l.content_type, l.sort_order,
       l.slide_pdf_url IS NOT NULL AS slide,
       l.worksheet_word_url IS NOT NULL AS ws
FROM public.lessons l
WHERE l.course_id='b0a10000-0000-4000-8000-000000000000'
ORDER BY l.sort_order;
```

期待: content_type='video' が9行（sort 1〜9・slide=true・ws=true）、'quiz' が9行（sort 91〜99）、'article' は0行。

---

## 補足（Webからの確認）
アプリの公開URLでAI活用コースを開き、各レッスンが「動画＋上部にスライド/ワークシート」表示になっていればOK。画像（スライド/ワークシート）が開けない場合は STEP1 のファイル名・パス不一致を疑う。
