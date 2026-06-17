-- 既存の select ポリシーを削除して再作成
DROP POLICY IF EXISTS course_select ON public.courses;

CREATE POLICY course_select ON public.courses FOR SELECT TO authenticated 
USING (
    organization_id = public.get_my_org_id() 
    OR public.get_my_role() = 'SYSTEM_ADMIN' 
    OR (organization_id IS NULL AND is_active = true)
    OR (organization_id IS NULL AND EXISTS (SELECT 1 FROM public.course_visibility cv WHERE cv.course_id = id AND cv.organization_id = public.get_my_org_id()))
);
