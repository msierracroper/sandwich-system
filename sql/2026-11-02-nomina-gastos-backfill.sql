-- Backfill: los movimientos de nomina tipo 'pago'/'anticipo' que ya
-- existian ANTES de correr 2026-11-02-nomina-gastos.sql no tienen gasto
-- espejo en "expenses", asi que todavia no restan de la utilidad en
-- Reportes. Este script los recorre uno por uno y crea ese gasto faltando,
-- enlazandolo via expense_id — igual que hace la app de ahora en adelante.
-- Correr DESPUES de 2026-11-02-nomina-gastos.sql, en cada sede.
-- Seguro de volver a correr: la segunda vez no encuentra nada pendiente.

do $$
declare
  item_id uuid;
  r record;
  new_expense_id uuid;
begin
  select ei.id into item_id
  from expense_items ei
  join expense_categories ec on ec.id = ei.category_id
  where ec.name = 'Nómina' and ei.name = 'Pago empleado';

  for r in
    select em.id as movement_id, em.date, em.amount, em.type, em.note, em.created_by, e.name as employee_name
    from employee_movements em
    join employees e on e.id = em.employee_id
    where em.type in ('pago', 'anticipo') and em.expense_id is null
  loop
    insert into expenses (date, category, description, amount, expense_item_id, created_by)
    values (
      r.date,
      'Nómina',
      r.employee_name
        || coalesce(' — ' || r.note, '')
        || (case when r.type = 'anticipo' then ' (anticipo)' else '' end),
      r.amount,
      item_id,
      r.created_by
    )
    returning id into new_expense_id;

    update employee_movements set expense_id = new_expense_id where id = r.movement_id;
  end loop;
end $$;
