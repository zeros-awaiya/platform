-- =============================================================================
-- 【任意・一回きり】enrollments 進捗率の一括再計算バックフィル（2026-07-04）
--
-- 目的: 過去のレッスン増減（動画一本化・記事削除・クイズ展開等）で
--       分母が変わったのに残っている古い progress_percent / status を、
--       現在のレッスン構成に基づいて全件計算し直す。
--
-- 実行するかは運用判断（実行しなくてもトリガー適用後の削除分は正しくなる）:
--   - 修了済み(100%)だった受講者が、その後のレッスン追加により
--     100%未満へ「降格」するケースが含まれる点に注意。
--   - completed_at は保持する（降格しても過去の修了日時は消さない）。
--     新たに100%に達する行のみ completed_at を現在時刻で打つ。
--
-- 適用方法: 20260704000000_lesson_delete_recalc_enrollments.sql 適用後に、
--           Supabase ダッシュボード > SQL Editor で実行。冪等・再実行可。
--
-- 事前確認用（何件変わるか見る）:
--   下の UPDATE を実行する前に、この SELECT で影響行を確認できる。
/*
SELECT e.user_id, e.course_id, e.progress_percent AS old_pct, sub.pct AS new_pct, e.status AS old_status
FROM public.enrollments e
JOIN (
    SELECT e2.id AS enrollment_id,
           CASE WHEN t.total = 0 THEN 0
                ELSE ((COALESCE(p.done, 0) * 100) / t.total)::INT END AS pct
    FROM public.enrollments e2
    CROSS JOIN LATERAL (
        SELECT COUNT(*) AS total FROM public.lessons l WHERE l.course_id = e2.course_id
    ) t
    CROSS JOIN LATERAL (
        SELECT COUNT(*) AS done
        FROM public.lesson_progress lp
        JOIN public.lessons l ON l.id = lp.lesson_id
        WHERE lp.user_id = e2.user_id AND l.course_id = e2.course_id
    ) p
) sub ON sub.enrollment_id = e.id
WHERE e.progress_percent <> sub.pct;
*/

UPDATE public.enrollments e
SET progress_percent = sub.pct,
    status = CASE
        WHEN sub.pct = 100 THEN 'completed'
        WHEN sub.pct > 0 THEN 'in_progress'
        ELSE 'not_started'
    END,
    completed_at = CASE
        WHEN sub.pct = 100 AND e.status <> 'completed' THEN NOW()
        ELSE e.completed_at
    END
FROM (
    SELECT e2.id AS enrollment_id,
           CASE WHEN t.total = 0 THEN 0
                ELSE ((COALESCE(p.done, 0) * 100) / t.total)::INT END AS pct
    FROM public.enrollments e2
    CROSS JOIN LATERAL (
        SELECT COUNT(*) AS total FROM public.lessons l WHERE l.course_id = e2.course_id
    ) t
    CROSS JOIN LATERAL (
        SELECT COUNT(*) AS done
        FROM public.lesson_progress lp
        JOIN public.lessons l ON l.id = lp.lesson_id
        WHERE lp.user_id = e2.user_id AND l.course_id = e2.course_id
    ) p
) sub
WHERE e.id = sub.enrollment_id
  AND e.progress_percent <> sub.pct;
