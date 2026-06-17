-- 既存のポリシーを削除して、シンプルで確実なポリシーに再作成
DROP POLICY IF EXISTS ulp_select ON public.user_learning_paths;
DROP POLICY IF EXISTS ulp_write ON public.user_learning_paths;

-- SELECT: 受講者本人のデータ、または管理者（本部・組織）であれば参照可能
CREATE POLICY ulp_select ON public.user_learning_paths FOR SELECT TO authenticated
USING (
    user_id = auth.uid() 
    OR public.get_my_role() IN ('SYSTEM_ADMIN', 'ORG_ADMIN')
);

-- WRITE (INSERT/UPDATE/DELETE): 管理者（本部・組織）のみ書き込み可能
CREATE POLICY ulp_write ON public.user_learning_paths FOR ALL TO authenticated
USING (
    public.get_my_role() IN ('SYSTEM_ADMIN', 'ORG_ADMIN')
);
