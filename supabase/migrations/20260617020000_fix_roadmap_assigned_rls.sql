-- 既存の lp_select ポリシーを削除して再作成
DROP POLICY IF EXISTS lp_select ON public.learning_paths;

CREATE POLICY lp_select ON public.learning_paths FOR SELECT TO authenticated
USING (
    organization_id = public.get_my_org_id()
    OR public.get_my_role() = 'SYSTEM_ADMIN'
    -- 自組織向けに公開されている本部ロードマップ
    OR (organization_id IS NULL AND EXISTS (
        SELECT 1 FROM public.learning_path_visibility lpv 
        WHERE lpv.learning_path_id = id AND lpv.organization_id = public.get_my_org_id())
    )
    -- または、自分自身に直接個別割り当てされているロードマップ
    OR EXISTS (
        SELECT 1 FROM public.user_learning_paths ulp
        WHERE ulp.learning_path_id = id AND ulp.user_id = auth.uid()
    )
);
