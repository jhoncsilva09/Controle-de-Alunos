create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cpf text not null unique,
  last_class date not null,
  last_test date,
  created_at timestamptz not null default now()
);

alter table public.students enable row level security;

-- Para uma aplicação sem login, libera o CRUD usando a chave anon.
-- Em produção, troque estas políticas por regras vinculadas ao usuário autenticado.
create policy "public can read students"
  on public.students for select
  to anon, authenticated
  using (true);

create policy "public can insert students"
  on public.students for insert
  to anon, authenticated
  with check (true);

create policy "public can update students"
  on public.students for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "public can delete students"
  on public.students for delete
  to anon, authenticated
  using (true);
