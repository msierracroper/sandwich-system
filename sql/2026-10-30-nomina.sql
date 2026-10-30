-- Modulo de "nomina" por obra labor (no es nomina legal colombiana).
-- Es un libro de movimientos por empleado: lo que se gana, lo que se le
-- paga, anticipos y prestamos con sus cuotas. Los saldos (lo que se le
-- debe, lo que el debe por prestamo) se calculan en la app a partir de
-- estos movimientos, no se guardan como columna.
-- Correr en el SQL Editor de Supabase, en cada sede. Seguro de volver a correr.

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text, -- ej: 'parrillero', 'domiciliario' (texto libre, informativo)
  user_id uuid references users(id), -- opcional: si tambien es usuario del sistema
  pay_schedule text not null default 'diario', -- 'diario' | 'semanal' (informativo, para sugerir cada cuanto pagar)
  daily_rate integer, -- tarifa fija por dia trabajado, si aplica
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists employee_movements (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  date date not null,
  type text not null, -- 'devengado' | 'comision' | 'pago' | 'anticipo' | 'prestamo' | 'cuota_prestamo'
  amount integer not null,
  note text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

alter table employees enable row level security;
alter table employee_movements enable row level security;

-- Solo admin: este modulo no lo usa ningun otro rol.

drop policy if exists "nomina: admin todo empleados" on employees;
create policy "nomina: admin todo empleados" on employees
  for all
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

drop policy if exists "nomina: admin todo movimientos" on employee_movements;
create policy "nomina: admin todo movimientos" on employee_movements
  for all
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');
