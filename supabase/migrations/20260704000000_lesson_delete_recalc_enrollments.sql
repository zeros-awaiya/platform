-- =============================================================================
-- レッスン削除時の enrollments 進捗再計算（2026-07-04）
--
-- 問題1: レッスンを削除しても enrollments.progress_percent が再計算されず、
--        分母（コースの総レッスン数）が変わったのに古い%が残る。
-- 問題2: 受講進捗(lesson_progress)が残るレッスンを直接 DELETE すると、
--        FKカスケードで消える lesson_progress 行に対して
--        trg_update_course_enrollment_progress が発火し、消滅済み lesson の
--        course_id を引けず enrollments へ NULL INSERT して失敗する
--        （AGENTS.md 記載の既知の落とし穴）。
--
-- 対応:
--   (1) 既存トリガー関数に「lesson が見つからなければ何もしない」ガードを追加
--       → seed SQL 等でレッスンを直接 DELETE しても落ちなくなる
--   (2) lessons の AFTER DELETE トリガーを新設し、該当コース全受講者の
--       enrollments（progress_percent / status / completed_at）を再計算する
--
-- 適用方法: Supabase ダッシュボード > SQL Editor でこのファイル全文を実行。
--           冪等（CREATE OR REPLACE / DROP IF EXISTS）なので再実行可。
-- 注意: レッスン「追加」時の再計算は意図的に含めない（クイズ展開等で
--       レッスンを追加すると修了済み受講者が一斉に「受講中」へ降格するため。
--       必要になったら別途判断する）。
-- =============================================================================

-- (1) 既存関数のパッチ: lesson 消滅後のカスケード発火を安全にスキップ
--     （本体は 20260609000000_init.sql のものに v_course_id ガードを足しただけ）
CREATE OR REPLACE FUNCTION public.update_course_enrollment_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_course_id UUID;
    v_total_lessons INT;
    v_completed_lessons INT;
    v_progress_percent INT;
    v_status TEXT;
BEGIN
    -- Get course_id for the lesson
    IF TG_OP = 'DELETE' THEN
        SELECT course_id INTO v_course_id FROM public.lessons WHERE id = OLD.lesson_id;
    ELSE
        SELECT course_id INTO v_course_id FROM public.lessons WHERE id = NEW.lesson_id;
    END IF;

    -- レッスン自体が削除済み（FKカスケード経由の発火）なら何もしない。
    -- コース全体の再計算は lessons 側の AFTER DELETE トリガーが行う。
    IF v_course_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Count total lessons in the course
    SELECT COUNT(*) INTO v_total_lessons FROM public.lessons WHERE course_id = v_course_id;

    -- Count completed lessons by the user
    IF TG_OP = 'DELETE' THEN
        SELECT COUNT(*) INTO v_completed_lessons
        FROM public.lesson_progress lp
        JOIN public.lessons l ON lp.lesson_id = l.id
        WHERE lp.user_id = OLD.user_id AND l.course_id = v_course_id;
    ELSE
        SELECT COUNT(*) INTO v_completed_lessons
        FROM public.lesson_progress lp
        JOIN public.lessons l ON lp.lesson_id = l.id
        WHERE lp.user_id = NEW.user_id AND l.course_id = v_course_id;
    END IF;

    -- Calculate percentage
    IF v_total_lessons > 0 THEN
        v_progress_percent := (v_completed_lessons * 100) / v_total_lessons;
    ELSE
        v_progress_percent := 0;
    END IF;

    -- Determine enrollment status
    IF v_progress_percent = 100 THEN
        v_status := 'completed';
    ELSIF v_progress_percent > 0 THEN
        v_status := 'in_progress';
    ELSE
        v_status := 'not_started';
    END IF;

    -- Insert or update enrollment
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.enrollments (user_id, course_id, status, progress_percent, started_at, completed_at, last_accessed_at)
        VALUES (OLD.user_id, v_course_id, v_status, v_progress_percent, NOW(), CASE WHEN v_status = 'completed' THEN NOW() ELSE NULL END, NOW())
        ON CONFLICT (user_id, course_id) DO UPDATE SET
            status = EXCLUDED.status,
            progress_percent = EXCLUDED.progress_percent,
            completed_at = CASE WHEN EXCLUDED.status = 'completed' AND enrollments.status <> 'completed' THEN NOW() ELSE enrollments.completed_at END,
            last_accessed_at = NOW();
    ELSE
        INSERT INTO public.enrollments (user_id, course_id, status, progress_percent, started_at, completed_at, last_accessed_at)
        VALUES (NEW.user_id, v_course_id, v_status, v_progress_percent, NOW(), CASE WHEN v_status = 'completed' THEN NOW() ELSE NULL END, NOW())
        ON CONFLICT (user_id, course_id) DO UPDATE SET
            status = EXCLUDED.status,
            progress_percent = EXCLUDED.progress_percent,
            completed_at = CASE WHEN EXCLUDED.status = 'completed' AND enrollments.status <> 'completed' THEN NOW() ELSE enrollments.completed_at END,
            last_accessed_at = NOW();
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- (2) lessons 削除時に該当コース全受講者の enrollments を再計算
--     SECURITY DEFINER: 実行者のRLSに左右されず全受講者分を確実に更新する
--     （lessons を消せるのは SYSTEM_ADMIN / service_role / ダッシュボードのみ）
CREATE OR REPLACE FUNCTION public.recalc_enrollments_after_lesson_delete()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_lessons INT;
BEGIN
    SELECT COUNT(*) INTO v_total_lessons
    FROM public.lessons WHERE course_id = OLD.course_id;

    IF v_total_lessons = 0 THEN
        -- コースにレッスンが1本も無くなった場合
        UPDATE public.enrollments
        SET progress_percent = 0,
            status = 'not_started'
        WHERE course_id = OLD.course_id;
        RETURN NULL;
    END IF;

    -- 現存レッスンのみを分子に数える（カスケード削除の実行順に依存しない）
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
        SELECT e2.user_id,
               ((COUNT(l.id) * 100) / v_total_lessons)::INT AS pct
        FROM public.enrollments e2
        LEFT JOIN public.lesson_progress lp
               ON lp.user_id = e2.user_id
        LEFT JOIN public.lessons l
               ON l.id = lp.lesson_id AND l.course_id = OLD.course_id
        WHERE e2.course_id = OLD.course_id
        GROUP BY e2.user_id
    ) sub
    WHERE e.course_id = OLD.course_id
      AND e.user_id = sub.user_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalc_enrollments_after_lesson_delete ON public.lessons;
CREATE TRIGGER trg_recalc_enrollments_after_lesson_delete
AFTER DELETE ON public.lessons
FOR EACH ROW
EXECUTE FUNCTION public.recalc_enrollments_after_lesson_delete();
