-- Apertura y cierre de caja (fase de prueba, no obligatoria)
-- Correr en el SQL Editor de Supabase, en cada sede.
-- Seguro de volver a correr (todo usa IF NOT EXISTS).

create table if not exists cash_sessions (
  id uuid primary key default gen_random_uuid(),

  -- un solo registro por dia (fecha Bogota, formato 'YYYY-MM-DD')
  date date not null unique,
  status text not null default 'abierta' check (status in ('abierta', 'cerrada')),

  -- apertura
  opened_by uuid references users(id),
  opened_at timestamptz not null default now(),
  opening_cash integer not null default 0,       -- con cuanto dinero se inicia
  domiciliario_base integer not null default 0,   -- base entregada al domiciliario
  domiciliario_note text,                         -- a quien / para que (libre)
  opening_note text,

  -- cierre — caja general
  closed_by uuid references users(id),
  closed_at timestamptz,
  counted_cash integer,        -- dinero fisico contado en caja al cerrar
  sales_total integer,         -- snapshot de ventas del dia al momento de cerrar
  sales_cash integer,
  sales_transfer integer,
  orders_count integer,
  expected_cash integer,       -- lo que deberia haber en caja segun el sistema
  cash_difference integer,     -- counted_cash - expected_cash
  closing_note text,

  created_at timestamptz not null default now()
);

-- cierre — cuentas del domiciliario: el devuelve la base + lo que cobro en
-- efectivo durante las entregas, eso NO se resta de la caja general porque
-- vuelve completo (solo pasa por fuera mientras el reparte).
alter table cash_sessions add column if not exists domiciliario_cash_sales integer;
alter table cash_sessions add column if not exists domiciliario_should_return integer;
alter table cash_sessions add column if not exists domiciliario_returned integer;
alter table cash_sessions add column if not exists domiciliario_difference integer;

alter table cash_sessions enable row level security;

drop policy if exists "caja: lectura tomador y admin" on cash_sessions;
create policy "caja: lectura tomador y admin" on cash_sessions
  for select
  using (get_my_role() in ('tomador', 'admin'));

drop policy if exists "caja: apertura tomador y admin" on cash_sessions;
create policy "caja: apertura tomador y admin" on cash_sessions
  for insert
  with check (get_my_role() in ('tomador', 'admin'));

drop policy if exists "caja: cierre tomador y admin" on cash_sessions;
create policy "caja: cierre tomador y admin" on cash_sessions
  for update
  using (get_my_role() in ('tomador', 'admin'))
  with check (get_my_role() in ('tomador', 'admin'));
