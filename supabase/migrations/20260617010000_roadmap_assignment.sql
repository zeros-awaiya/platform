-- 1. 組織出し分け用テーブル
CREATE TABLE IF NOT EXISTS public.learning_path_visibility (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learning_path_id UUID REFERENCES public.learning_paths(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (learning_path_id, organization_id)
);

ALTER TABLE public.learning_path_visibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lpv_select ON public.learning_path_visibility;
CREATE POLICY lpv_select ON public.learning_path_visibility FOR SELECT TO authenticated
USING (organization_id = public.get_my_org_id() OR public.get_my_role() = 'SYSTEM_ADMIN');

DROP POLICY IF EXISTS lpv_write ON public.learning_path_visibility;
CREATE POLICY lpv_write ON public.learning_path_visibility FOR ALL TO authenticated
USING (public.get_my_role() = 'SYSTEM_ADMIN');

-- 2. 個人割り当て用テーブル
CREATE TABLE IF NOT EXISTS public.user_learning_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    learning_path_id UUID REFERENCES public.learning_paths(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (user_id, learning_path_id)
);

ALTER TABLE public.user_learning_paths ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ulp_select ON public.user_learning_paths;
CREATE POLICY ulp_select ON public.user_learning_paths FOR SELECT TO authenticated
USING (
    user_id = auth.uid() 
    OR public.get_my_role() = 'SYSTEM_ADMIN'
    OR (public.get_my_role() = 'ORG_ADMIN' AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = user_id AND u.organization_id = public.get_my_org_id()))
);

DROP POLICY IF EXISTS ulp_write ON public.user_learning_paths;
CREATE POLICY ulp_write ON public.user_learning_paths FOR ALL TO authenticated
USING (
    public.get_my_role() = 'SYSTEM_ADMIN'
    OR (public.get_my_role() = 'ORG_ADMIN' AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = user_id AND u.organization_id = public.get_my_org_id()))
);

-- 3. 既存の lp_select (ロードマップ参照) RLS ポリシーの更新
DROP POLICY IF EXISTS lp_select ON public.learning_paths;

CREATE POLICY lp_select ON public.learning_paths FOR SELECT TO authenticated
USING (
    organization_id = public.get_my_org_id()
    OR public.get_my_role() = 'SYSTEM_ADMIN'
    OR (organization_id IS NULL AND EXISTS (
        SELECT 1 FROM public.learning_path_visibility lpv 
        WHERE lpv.learning_path_id = id AND lpv.organization_id = public.get_my_org_id())
    )
);
