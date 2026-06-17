-- =====================================================================
-- FIX: lp_select RLS の相関バグ修正（2026-06-17）
-- 20260617010000_roadmap_assignment.sql の lp_select で、EXISTS サブクエリの
-- 無修飾 `id` が内側テーブル(learning_path_visibility / user_learning_paths)の
-- id 列に束縛され、`lpv.learning_path_id = lpv.id` / `ulp.learning_path_id = ulp.id`
-- という常に偽の条件になっていた。これにより organization_id IS NULL（本部）の
-- ロードマップは、組織公開(learning_path_visibility)・個人割当(user_learning_paths)
-- を行っても学習者の SELECT を通らず、ダッシュボードに一切表示されなかった。
-- 外側 learning_paths.id に明示相関させて修正する。
-- =====================================================================
DROP POLICY IF EXISTS lp_select ON public.learning_paths;
CREATE POLICY lp_select ON public.learning_paths FOR SELECT TO authenticated
USING (
  organization_id = public.get_my_org_id()
  OR public.get_my_role() = 'SYSTEM_ADMIN'
  OR (organization_id IS NULL AND EXISTS (
        SELECT 1 FROM public.learning_path_visibility lpv
        WHERE lpv.learning_path_id = learning_paths.id
          AND lpv.organization_id = public.get_my_org_id()))
  OR EXISTS (
        SELECT 1 FROM public.user_learning_paths ulp
        WHERE ulp.learning_path_id = learning_paths.id
          AND ulp.user_id = auth.uid())
);
