-- ============================================================
-- company_members の RLS が自分自身を参照して無限再帰になる問題を修正
-- SECURITY DEFINER 関数内では RLS がバイパスされ、安全にメンバー判定できる
-- ============================================================

-- 現在ユーザーが会社のメンバーか
CREATE OR REPLACE FUNCTION public.user_is_member_of_company(_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id
      AND user_id = auth.uid()
  );
$$;

-- 現在ユーザーがその会社の owner か
CREATE OR REPLACE FUNCTION public.user_is_owner_of_company(_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id
      AND user_id = auth.uid()
      AND role = 'owner'
  );
$$;

REVOKE ALL ON FUNCTION public.user_is_member_of_company(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_is_owner_of_company(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_member_of_company(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_is_owner_of_company(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "members_select_same_company" ON public.company_members;
DROP POLICY IF EXISTS "members_update_owner" ON public.company_members;
DROP POLICY IF EXISTS "members_delete_owner" ON public.company_members;

CREATE POLICY "members_select_same_company"
  ON public.company_members FOR SELECT
  USING (public.user_is_member_of_company(company_id));

CREATE POLICY "members_update_owner"
  ON public.company_members FOR UPDATE
  USING (public.user_is_owner_of_company(company_id));

CREATE POLICY "members_delete_owner"
  ON public.company_members FOR DELETE
  USING (public.user_is_owner_of_company(company_id));
