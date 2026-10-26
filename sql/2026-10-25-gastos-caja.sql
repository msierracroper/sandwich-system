-- Gastos rapidos / compras de emergencia desde la caja del tomador.
-- Reusa la tabla "expenses" que ya existe (para que aparezcan tambien en
-- Admin > Gastos y Reportes), bajo una categoria dedicada "Caja chica".
-- Correr en el SQL Editor de Supabase, en cada sede.
-- Seguro de volver a correr.

-- 1. Categoria e insumo dedicados, si no existen ya.
insert into expense_categories (name, color)
select 'Caja chica', '#9A6B12'
where not exists (
  select 1 from expense_categories where name = 'Caja chica'
);

insert into expense_items (category_id, name)
select ec.id, 'Compra de emergencia'
from expense_categories ec
where ec.name = 'Caja chica'
  and not exists (
    select 1 from expense_items ei
    where ei.category_id = ec.id and ei.name = 'Compra de emergencia'
  );

-- 2. Snapshot en el cierre de caja: cuanto se gasto hoy desde la caja chica.
alter table cash_sessions add column if not exists cash_expenses integer;

-- 3. Permisos minimos para el tomador: puede ver el catalogo (para resolver
-- el id de "Caja chica"), puede insertar gastos, y solo puede LEER los
-- gastos del dia de hoy (no el historial completo — nomina, arriendo, etc.
-- siguen siendo visibles solo para admin). No puede editar ni borrar.

drop policy if exists "gastos: catalogo lectura tomador" on expense_categories;
create policy "gastos: catalogo lectura tomador" on expense_categories
  for select
  using (get_my_role() = 'tomador');

drop policy if exists "gastos: catalogo lectura tomador" on expense_items;
create policy "gastos: catalogo lectura tomador" on expense_items
  for select
  using (get_my_role() = 'tomador');

drop policy if exists "gastos: lectura tomador solo hoy" on expenses;
create policy "gastos: lectura tomador solo hoy" on expenses
  for select
  using (
    get_my_role() = 'tomador'
    and date = (now() at time zone 'America/Bogota')::date
  );

drop policy if exists "gastos: insertar tomador caja chica" on expenses;
create policy "gastos: insertar tomador caja chica" on expenses
  for insert
  with check (
    get_my_role() = 'tomador'
    and category = 'Caja chica'
    and date = (now() at time zone 'America/Bogota')::date
  );
