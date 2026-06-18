-- Quiz Attempts: クイズ採点履歴の永続化
-- 従来、学習PFはクイズ点数を保存せず、合格時に lesson_progress へ完了記録するのみだった。
-- 介護法定研修の監査対応PDF出力に「テスト結果（得点・合否・受験日）」が必要なため、受験履歴を永続化する。

CREATE TABLE public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
    score_percent INTEGER NOT NULL CHECK (score_percent BETWEEN 0 AND 100),
    is_passed BOOLEAN NOT NULL,
    correct_count INTEGER NOT NULL DEFAULT 0,
    total_count INTEGER NOT NULL DEFAULT 0,
    answers JSONB,
    attempted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_quiz_attempts_user ON public.quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_lesson ON public.quiz_attempts(lesson_id);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- 参照: 受講者は自分の受験のみ。ORG_ADMIN は自組織の受講者の受験。SYSTEM_ADMIN は全件。
CREATE POLICY quiz_attempts_select ON public.quiz_attempts FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR public.get_my_role() = 'SYSTEM_ADMIN'
    OR (
        public.get_my_role() = 'ORG_ADMIN'
        AND EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = quiz_attempts.user_id AND u.organization_id = public.get_my_org_id()
        )
    )
);

-- 挿入: 本人の受験のみ記録可能（受講側からの記録）
CREATE POLICY quiz_attempts_insert ON public.quiz_attempts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
