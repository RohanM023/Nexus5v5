-- Nexus-5v5 Initial Schema for Supabase
-- Supabase Auth manages auth.users (id, email, password, etc.)
-- This migration creates application tables in the public schema.

-- =============================================================================
-- 1. PROFILES (extends auth.users with app-specific data)
-- =============================================================================

create table public.profiles (
    id           uuid primary key references auth.users(id) on delete cascade,
    display_name text not null,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'User profiles extending Supabase Auth. One row per auth.users entry.';

-- Auto-create a profile row when a new user signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
    insert into public.profiles (id, display_name)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
    );
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- =============================================================================
-- 2. RIOT ACCOUNTS (many-to-one with profiles)
-- =============================================================================

create table public.riot_accounts (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references public.profiles(id) on delete cascade,
    puuid       text not null unique,
    game_name   text not null,
    tag_line    text not null,
    region      text not null,
    is_primary  boolean not null default false,
    verified    boolean not null default false,
    verified_at timestamptz,
    linked_at   timestamptz not null default now()
);

comment on table public.riot_accounts is 'Riot accounts linked to a user profile. Each PUUID is globally unique.';

-- Ensure only one primary account per user (partial unique index).
create unique index idx_one_primary_per_user
    on public.riot_accounts (user_id)
    where is_primary = true;

-- =============================================================================
-- 3. IDENTITY LINKS (verification audit trail)
-- =============================================================================

create table public.identity_links (
    id                  uuid primary key default gen_random_uuid(),
    user_id             uuid not null references public.profiles(id) on delete cascade,
    account_id          uuid not null references public.riot_accounts(id) on delete cascade,
    verification_status text not null default 'pending'
        check (verification_status in ('pending', 'verified', 'failed', 'expired')),
    verification_method text not null default 'icon'
        check (verification_method in ('icon', 'bio', 'rso')),
    verification_token  text,
    encrypted_link_data text,
    verified_at         timestamptz,
    expires_at          timestamptz,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

comment on table public.identity_links is 'Audit trail for Riot account verification attempts.';

-- =============================================================================
-- 4. TEAMS
-- =============================================================================

create table public.teams (
    id         uuid primary key default gen_random_uuid(),
    name       text not null,
    owner_id   uuid not null references public.profiles(id),
    created_at timestamptz not null default now()
);

comment on table public.teams is 'Clash / 5v5 team rosters.';

-- =============================================================================
-- 5. TEAM MEMBERS
-- =============================================================================

create table public.team_members (
    team_id   uuid not null references public.teams(id) on delete cascade,
    user_id   uuid not null references public.profiles(id) on delete cascade,
    role      text not null check (role in ('top', 'jungle', 'mid', 'bot', 'support')),
    joined_at timestamptz not null default now(),
    primary key (team_id, user_id)
);

comment on table public.team_members is 'Junction table linking users to teams with their assigned role.';

-- =============================================================================
-- 6. DRAFT SESSIONS
-- =============================================================================

create table public.draft_sessions (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references public.profiles(id),
    team_id      uuid references public.teams(id),
    mode         text not null default 'clash'
        check (mode in ('clash', 'custom', 'scrim')),
    draft_state  jsonb not null default '{}',
    status       text not null default 'in_progress'
        check (status in ('in_progress', 'completed', 'abandoned')),
    match_id     text,
    created_at   timestamptz not null default now(),
    completed_at timestamptz
);

comment on table public.draft_sessions is 'Tracks a single champion draft session (bans + picks + scores).';

-- =============================================================================
-- 7. SCORE SNAPSHOTS
-- =============================================================================

create table public.score_snapshots (
    id               uuid primary key default gen_random_uuid(),
    draft_session_id uuid not null references public.draft_sessions(id) on delete cascade,
    pick_number      smallint not null,
    total_score      real not null,
    synergy_score    real not null,
    counter_score    real not null,
    comfort_score    real not null,
    recommended_picks jsonb,
    recommended_bans  jsonb,
    created_at       timestamptz not null default now()
);

comment on table public.score_snapshots is 'Snapshot of draft scores after each pick/ban action.';

-- =============================================================================
-- 8. UPDATED_AT TRIGGER (reusable)
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger set_profiles_updated_at
    before update on public.profiles
    for each row execute function public.set_updated_at();

create trigger set_identity_links_updated_at
    before update on public.identity_links
    for each row execute function public.set_updated_at();

-- =============================================================================
-- 9. ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on every table.
alter table public.profiles        enable row level security;
alter table public.riot_accounts   enable row level security;
alter table public.identity_links  enable row level security;
alter table public.teams           enable row level security;
alter table public.team_members    enable row level security;
alter table public.draft_sessions  enable row level security;
alter table public.score_snapshots enable row level security;

-- ---- profiles ----

create policy "Users can view their own profile"
    on public.profiles for select
    using (id = auth.uid());

create policy "Users can update their own profile"
    on public.profiles for update
    using (id = auth.uid())
    with check (id = auth.uid());

-- Insert handled by the trigger (security definer); users do not insert directly.
-- Delete cascades from auth.users; users do not delete profiles directly.

-- ---- riot_accounts ----

create policy "Users can view their own riot accounts"
    on public.riot_accounts for select
    using (user_id = auth.uid());

create policy "Users can link riot accounts"
    on public.riot_accounts for insert
    with check (user_id = auth.uid());

create policy "Users can update their own riot accounts"
    on public.riot_accounts for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

create policy "Users can unlink their own riot accounts"
    on public.riot_accounts for delete
    using (user_id = auth.uid());

-- ---- identity_links ----

create policy "Users can view their own identity links"
    on public.identity_links for select
    using (user_id = auth.uid());

create policy "Users can create identity links"
    on public.identity_links for insert
    with check (user_id = auth.uid());

create policy "Users can update their own identity links"
    on public.identity_links for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

create policy "Users can delete their own identity links"
    on public.identity_links for delete
    using (user_id = auth.uid());

-- ---- teams ----

create policy "Team members can view their team"
    on public.teams for select
    using (
        id in (
            select team_id from public.team_members where user_id = auth.uid()
        )
    );

create policy "Authenticated users can create teams"
    on public.teams for insert
    with check (owner_id = auth.uid());

create policy "Team owner can update team"
    on public.teams for update
    using (owner_id = auth.uid())
    with check (owner_id = auth.uid());

create policy "Team owner can delete team"
    on public.teams for delete
    using (owner_id = auth.uid());

-- ---- team_members ----

create policy "Team members can view their team roster"
    on public.team_members for select
    using (
        team_id in (
            select team_id from public.team_members where user_id = auth.uid()
        )
    );

create policy "Team owner can add members"
    on public.team_members for insert
    with check (
        team_id in (
            select id from public.teams where owner_id = auth.uid()
        )
    );

create policy "Team owner can remove members"
    on public.team_members for delete
    using (
        team_id in (
            select id from public.teams where owner_id = auth.uid()
        )
    );

-- ---- draft_sessions ----

create policy "Users can view their own draft sessions"
    on public.draft_sessions for select
    using (user_id = auth.uid());

create policy "Users can create draft sessions"
    on public.draft_sessions for insert
    with check (user_id = auth.uid());

create policy "Users can update their own draft sessions"
    on public.draft_sessions for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

create policy "Users can delete their own draft sessions"
    on public.draft_sessions for delete
    using (user_id = auth.uid());

-- ---- score_snapshots ----

create policy "Users can view snapshots of their draft sessions"
    on public.score_snapshots for select
    using (
        draft_session_id in (
            select id from public.draft_sessions where user_id = auth.uid()
        )
    );

create policy "Users can create snapshots for their draft sessions"
    on public.score_snapshots for insert
    with check (
        draft_session_id in (
            select id from public.draft_sessions where user_id = auth.uid()
        )
    );

-- Score snapshots are append-only; no update or delete by users.
