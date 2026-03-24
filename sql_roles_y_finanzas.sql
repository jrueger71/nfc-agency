-- =============================================
-- NUEVA FÚTBOL CHILE SPA
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- 1. Agregar columna moneda a transactions (si no existe)
alter table transactions add column if not exists moneda varchar default 'CLP';
alter table transactions add column if not exists documento_respaldo text;

-- 2. Tabla de roles de usuarios
create table if not exists user_roles (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  email       varchar not null,
  role        varchar not null default 'digitador',
  -- roles: 'admin' | 'digitador' | 'visor'
  created_at  timestamptz default now(),
  constraint unique_user unique (user_id)
);

-- 3. Habilitar RLS en user_roles
alter table user_roles enable row level security;

-- 4. Solo admins ven los roles
create policy "auth_read_roles"
  on user_roles for select
  using (auth.role() = 'authenticated');

-- 5. Insertar tu usuario como admin
-- REEMPLAZA el email con el tuyo si es distinto
insert into user_roles (user_id, email, role)
select id, email, 'admin'
from auth.users
where email = 'jc.rueger@gmail.com'
on conflict (user_id) do update set role = 'admin';

-- 6. Políticas de transactions para digitador
-- (ya tiene política admin, agregamos para que digitador también pueda insertar)
drop policy if exists "digitador_insert_transactions" on transactions;
create policy "digitador_insert_transactions"
  on transactions for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "digitador_read_transactions" on transactions;
create policy "digitador_read_transactions"
  on transactions for select
  using (auth.role() = 'authenticated');
