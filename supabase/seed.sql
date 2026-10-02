-- Temporary beta administrator.
-- Replace this with Supabase Auth or another production auth provider before launch.
-- Username: Oracle Core
-- Password: Oracle@123
insert into public.admin_users (username, password_hash)
values (
  'Oracle Core',
  '$2b$10$JivspfVyS5IRcddMgw.9jeQ7a8SSbvPTYl1.n23fV.U063wWmLRRW'
)
on conflict (username) do update
set password_hash = excluded.password_hash;
