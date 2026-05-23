-- ============================================================
-- Startup Builder - Initial Database Schema
-- セキュリティ: RLS (Row Level Security) による完全なテナント分離
-- ============================================================

-- UUID生成用拡張
create extension if not exists "uuid-ossp";

-- ============================================================
-- テーブル定義
-- ============================================================

-- ユーザープロフィール (auth.users を拡張)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 会社情報
create table public.companies (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  name_kana text default '' not null,
  industry text default '' not null,
  phase text default 'idea' not null,
  is_medical_mode boolean default false not null,
  medical_fields text[] default '{}' not null,
  founded_date date,
  postal_code text default '' not null,
  address text default '' not null,
  representative_name text default '' not null,
  capital_amount bigint default 0 not null,
  employee_count integer default 1 not null,
  description text default '' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 会社メンバー (ユーザー ↔ 会社 の多対多)
create table public.company_members (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text not null default 'owner'
    check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz default now() not null,
  unique(company_id, user_id)
);

-- サブスクリプション (会社ごとに1つ)
create table public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies on delete cascade not null unique,
  plan text not null default 'free'
    check (plan in ('free', 'growth', 'pro')),
  medical_addon boolean default false not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  status text default 'active' not null
    check (status in ('active', 'canceled', 'past_due', 'trialing')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 監査ログ
create table public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies on delete set null,
  user_id uuid references auth.users on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  metadata jsonb default '{}' not null,
  ip_address text,
  user_agent text,
  created_at timestamptz default now() not null
);

-- ============================================================
-- インデックス
-- ============================================================

create index idx_company_members_user on public.company_members(user_id);
create index idx_company_members_company on public.company_members(company_id);
create index idx_subscriptions_company on public.subscriptions(company_id);
create index idx_audit_logs_company on public.audit_logs(company_id);
create index idx_audit_logs_user on public.audit_logs(user_id);
create index idx_audit_logs_created on public.audit_logs(created_at desc);

-- ============================================================
-- RLS (Row Level Security) を有効化
-- ============================================================

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.audit_logs enable row level security;

-- ============================================================
-- RLS ポリシー: profiles
-- ============================================================

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- RLS ポリシー: companies
-- ============================================================

create policy "companies_select_member"
  on public.companies for select
  using (
    exists (
      select 1 from public.company_members
      where company_members.company_id = companies.id
        and company_members.user_id = auth.uid()
    )
  );

create policy "companies_insert_authenticated"
  on public.companies for insert
  with check (auth.uid() is not null);

create policy "companies_update_admin"
  on public.companies for update
  using (
    exists (
      select 1 from public.company_members
      where company_members.company_id = companies.id
        and company_members.user_id = auth.uid()
        and company_members.role in ('owner', 'admin')
    )
  );

create policy "companies_delete_owner"
  on public.companies for delete
  using (
    exists (
      select 1 from public.company_members
      where company_members.company_id = companies.id
        and company_members.user_id = auth.uid()
        and company_members.role = 'owner'
    )
  );

-- ============================================================
-- RLS ポリシー: company_members
-- ============================================================

create policy "members_select_same_company"
  on public.company_members for select
  using (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = company_members.company_id
        and cm.user_id = auth.uid()
    )
  );

create policy "members_insert_authenticated"
  on public.company_members for insert
  with check (auth.uid() is not null);

create policy "members_update_owner"
  on public.company_members for update
  using (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = company_members.company_id
        and cm.user_id = auth.uid()
        and cm.role = 'owner'
    )
  );

create policy "members_delete_owner"
  on public.company_members for delete
  using (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = company_members.company_id
        and cm.user_id = auth.uid()
        and cm.role = 'owner'
    )
  );

-- ============================================================
-- RLS ポリシー: subscriptions
-- ============================================================

create policy "subscriptions_select_member"
  on public.subscriptions for select
  using (
    exists (
      select 1 from public.company_members
      where company_members.company_id = subscriptions.company_id
        and company_members.user_id = auth.uid()
    )
  );

create policy "subscriptions_insert_admin"
  on public.subscriptions for insert
  with check (
    exists (
      select 1 from public.company_members
      where company_members.company_id = subscriptions.company_id
        and company_members.user_id = auth.uid()
        and company_members.role in ('owner', 'admin')
    )
  );

create policy "subscriptions_update_admin"
  on public.subscriptions for update
  using (
    exists (
      select 1 from public.company_members
      where company_members.company_id = subscriptions.company_id
        and company_members.user_id = auth.uid()
        and company_members.role in ('owner', 'admin')
    )
  );

-- ============================================================
-- RLS ポリシー: audit_logs
-- ============================================================

create policy "audit_select_admin"
  on public.audit_logs for select
  using (
    exists (
      select 1 from public.company_members
      where company_members.company_id = audit_logs.company_id
        and company_members.user_id = auth.uid()
        and company_members.role in ('owner', 'admin')
    )
  );

create policy "audit_insert_authenticated"
  on public.audit_logs for insert
  with check (auth.uid() is not null);

-- ============================================================
-- トリガー関数
-- ============================================================

-- サインアップ時にプロフィールを自動作成
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at カラムの自動更新
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger set_companies_updated_at
  before update on public.companies
  for each row execute procedure public.handle_updated_at();

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.handle_updated_at();
