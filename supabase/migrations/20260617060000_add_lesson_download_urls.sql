-- =====================================================================
-- Migration: Add slide_pdf_url and worksheet_word_url to lessons
-- =====================================================================

ALTER TABLE public.lessons
ADD COLUMN slide_pdf_url TEXT,
ADD COLUMN worksheet_word_url TEXT;
