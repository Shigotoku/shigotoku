-- =====================================================
-- Migration 003: Admin read policies
-- 管理者（admin@shigotoku.com）が全データを参照できるRLSポリシー
-- =====================================================

-- profiles: 管理者は全ユーザーのプロフィールを参照可能
CREATE POLICY "admin_read_all_profiles"
  ON public.profiles FOR SELECT
  USING ( (auth.jwt() ->> 'email') = 'admin@shigotoku.com' );

-- companies: 管理者は全会社を参照可能
CREATE POLICY "admin_read_all_companies"
  ON public.companies FOR SELECT
  USING ( (auth.jwt() ->> 'email') = 'admin@shigotoku.com' );

-- company_members: 管理者は全メンバーシップを参照可能
CREATE POLICY "admin_read_all_company_members"
  ON public.company_members FOR SELECT
  USING ( (auth.jwt() ->> 'email') = 'admin@shigotoku.com' );

-- subscriptions: 管理者は全サブスクリプションを参照可能
CREATE POLICY "admin_read_all_subscriptions"
  ON public.subscriptions FOR SELECT
  USING ( (auth.jwt() ->> 'email') = 'admin@shigotoku.com' );

-- audit_logs: 管理者は全ログを参照可能
CREATE POLICY "admin_read_all_audit_logs"
  ON public.audit_logs FOR SELECT
  USING ( (auth.jwt() ->> 'email') = 'admin@shigotoku.com' );

-- invitations: 管理者は全招待を参照可能
CREATE POLICY "admin_read_all_invitations"
  ON public.invitations FOR SELECT
  USING ( (auth.jwt() ->> 'email') = 'admin@shigotoku.com' );
