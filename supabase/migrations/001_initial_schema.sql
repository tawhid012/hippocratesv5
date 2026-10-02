create extension if not exists "pgcrypto";

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  active_provider text not null default 'openai',
  openai_api_key text,
  gemini_api_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_settings_active_provider_check check (active_provider in ('openai', 'gemini'))
);

create unique index if not exists app_settings_singleton_idx
  on public.app_settings ((true));

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled Case',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint chat_messages_role_check check (role in ('user', 'assistant', 'system'))
);

create index if not exists chat_sessions_updated_at_idx
  on public.chat_sessions (updated_at desc);

create index if not exists chat_messages_session_created_idx
  on public.chat_messages (session_id, created_at asc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

drop trigger if exists chat_sessions_set_updated_at on public.chat_sessions;
create trigger chat_sessions_set_updated_at
before update on public.chat_sessions
for each row execute function public.set_updated_at();

alter table public.app_settings enable row level security;
alter table public.admin_users enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

insert into public.app_settings (active_provider, openai_api_key, gemini_api_key)
select 'openai', null, null
where not exists (select 1 from public.app_settings);
