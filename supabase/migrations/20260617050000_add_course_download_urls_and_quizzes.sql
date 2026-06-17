-- =====================================================================
-- Migration: Add course download URLs and quiz tables
-- =====================================================================

-- 1. Add download URL columns to courses table
ALTER TABLE public.courses
ADD COLUMN slide_pdf_url TEXT,
ADD COLUMN worksheet_word_url TEXT;

-- 2. Modify check constraint on lessons.content_type to allow 'quiz'
ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_content_type_check;
ALTER TABLE public.lessons ADD CONSTRAINT lessons_content_type_check CHECK (content_type IN ('video', 'pdf', 'word', 'powerpoint', 'url', 'article', 'quiz'));

-- 3. Create quiz_questions table
CREATE TABLE public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option VARCHAR(10) NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for quiz_questions
-- SELECT policy: Any authenticated user can read questions
CREATE POLICY quiz_questions_select ON public.quiz_questions
    FOR SELECT TO authenticated USING (true);

-- ALL policy: System Admins, or Org Admins edit questions for their own organization courses
CREATE POLICY quiz_questions_all ON public.quiz_questions
    FOR ALL TO authenticated USING (
        public.get_my_role() = 'SYSTEM_ADMIN'
        OR EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.courses c ON l.course_id = c.id
            WHERE l.id = quiz_questions.lesson_id
              AND c.organization_id = public.get_my_org_id()
              AND public.get_my_role() = 'ORG_ADMIN'
        )
    );
