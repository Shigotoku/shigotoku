-- ============================================================
-- Migration 006: 会社作成のRLSエラーを修正
-- SECURITY DEFINER関数でcompanies + company_members を一括作成
-- ============================================================

-- 既存のINSERTポリシーを再作成（念のため）
DROP POLICY IF EXISTS "companies_insert_authenticated" ON public.companies;
CREATE POLICY "companies_insert_authenticated"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 会社作成用のSECURITY DEFINER関数
-- RLSをバイパスして、companies + company_members を一度に作成
CREATE OR REPLACE FUNCTION public.create_company_with_member(
  p_name text,
  p_name_kana text DEFAULT '',
  p_industry text DEFAULT '',
  p_phase text DEFAULT 'idea',
  p_is_medical_mode boolean DEFAULT false,
  p_medical_fields text[] DEFAULT '{}',
  p_founded_date date DEFAULT NULL,
  p_postal_code text DEFAULT '',
  p_address text DEFAULT '',
  p_representative_name text DEFAULT '',
  p_capital_amount bigint DEFAULT 0,
  p_employee_count integer DEFAULT 1,
  p_description text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_company public.companies%ROWTYPE;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- 会社を作成
  INSERT INTO public.companies (
    name, name_kana, industry, phase,
    is_medical_mode, medical_fields, founded_date,
    postal_code, address, representative_name,
    capital_amount, employee_count, description
  ) VALUES (
    p_name, p_name_kana, p_industry, p_phase,
    p_is_medical_mode, p_medical_fields, p_founded_date,
    p_postal_code, p_address, p_representative_name,
    p_capital_amount, p_employee_count, p_description
  )
  RETURNING * INTO v_company;

  -- オーナーとしてメンバー追加
  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (v_company.id, v_uid, 'owner');

  -- 結果を返す
  RETURN jsonb_build_object(
    'id', v_company.id,
    'name', v_company.name,
    'name_kana', v_company.name_kana,
    'industry', v_company.industry,
    'phase', v_company.phase,
    'is_medical_mode', v_company.is_medical_mode,
    'medical_fields', v_company.medical_fields,
    'founded_date', v_company.founded_date,
    'postal_code', v_company.postal_code,
    'address', v_company.address,
    'representative_name', v_company.representative_name,
    'capital_amount', v_company.capital_amount,
    'employee_count', v_company.employee_count,
    'description', v_company.description,
    'created_at', v_company.created_at,
    'updated_at', v_company.updated_at
  );
END;
$$;

-- 認証済みユーザーのみ実行可能
REVOKE ALL ON FUNCTION public.create_company_with_member(text, text, text, text, boolean, text[], date, text, text, text, bigint, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_company_with_member(text, text, text, text, boolean, text[], date, text, text, text, bigint, integer, text) TO authenticated, service_role;
