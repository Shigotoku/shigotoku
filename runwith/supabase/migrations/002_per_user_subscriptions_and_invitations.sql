-- ============================================================
-- Migration 002: サブスクリプションをユーザー単位に変更 + 招待機能追加
-- ============================================================

-- ①  既存の会社単位 subscriptions テーブルを削除して再作成
--    (まだ本番データはないので DROP & CREATE で問題なし)
drop table if exists public.subscriptions;

create table public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  plan text not null default 'free'
    check (plan in ('free', 'growth', 'pro')),
  medical_addon boolean default false not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false not null,
  status text default 'active' not null
    check (status in ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_subscriptions_user on public.subscriptions(user_id);
create index idx_subscriptions_stripe_customer on public.subscriptions(stripe_customer_id);

-- ② サインアップ時にデフォルトサブスクリプションを自動作成
--    既存の handle_new_user トリガーを拡張
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- プロフィール作成
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );

  -- デフォルトのFreeプランを作成
  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active');

  return new;
end;
$$ language plpgsql security definer;

-- ③ RLS for subscriptions (ユーザー自身のみアクセス)
alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "subscriptions_update_own"
  on public.subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ④ 招待テーブル
create table public.invitations (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies on delete cascade not null,
  invited_by uuid references auth.users on delete set null,
  email text not null,
  role text not null default 'member'
    check (role in ('admin', 'member', 'viewer')),
  token text unique not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz default now() not null,
  unique(company_id, email)
);

create index idx_invitations_token on public.invitations(token);
create index idx_invitations_email on public.invitations(email);
create index idx_invitations_company on public.invitations(company_id);

alter table public.invitations enable row level security;

-- 招待を送れる: ownerまたはadmin
create policy "invitations_select_member"
  on public.invitations for select
  using (
    exists (
      select 1 from public.company_members
      where company_members.company_id = invitations.company_id
        and company_members.user_id = auth.uid()
    )
  );

create policy "invitations_insert_admin"
  on public.invitations for insert
  with check (
    exists (
      select 1 from public.company_members
      where company_members.company_id = invitations.company_id
        and company_members.user_id = auth.uid()
        and company_members.role in ('owner', 'admin')
    )
  );

create policy "invitations_delete_admin"
  on public.invitations for delete
  using (
    exists (
      select 1 from public.company_members
      where company_members.company_id = invitations.company_id
        and company_members.user_id = auth.uid()
        and company_members.role in ('owner', 'admin')
    )
  );

-- 招待承認は匿名でもトークンがあればOK (関数経由で実行)
create policy "invitations_update_by_token"
  on public.invitations for update
  using (accepted_at is null and expires_at > now());

-- ⑤ 招待承認関数（セキュリティデファイナーで実行）
create or replace function public.accept_invitation(p_token text)
returns jsonb as $$
declare
  v_inv public.invitations%rowtype;
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('error', 'Unauthorized');
  end if;

  -- トークン検索
  select * into v_inv
  from public.invitations
  where token = p_token
    and accepted_at is null
    and expires_at > now()
  for update;

  if not found then
    return jsonb_build_object('error', 'Invalid or expired invitation');
  end if;

  -- 既にメンバーか確認
  if exists (
    select 1 from public.company_members
    where company_id = v_inv.company_id and user_id = v_uid
  ) then
    return jsonb_build_object('error', 'Already a member');
  end if;

  -- メンバー追加
  insert into public.company_members (company_id, user_id, role)
  values (v_inv.company_id, v_uid, v_inv.role);

  -- 招待を承認済みにする
  update public.invitations
  set accepted_at = now()
  where id = v_inv.id;

  return jsonb_build_object(
    'success', true,
    'company_id', v_inv.company_id,
    'role', v_inv.role
  );
end;
$$ language plpgsql security definer;

-- ⑥ updated_at トリガー
create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.handle_updated_at();
