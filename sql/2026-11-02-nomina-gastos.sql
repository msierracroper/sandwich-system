-- Los pagos y anticipos de nomina son plata que de verdad sale del negocio,
-- asi que deben contar como gasto en Admin > Reportes (utilidad = ingresos -
-- gastos). Se reusa la tabla "expenses" (igual que la caja chica del
-- tomador), bajo una categoria dedicada "Nomina" — asi aparecen solos en
-- Reportes y en Admin > Gastos sin tocar esa logica.
--
-- Prestamos y cuotas de prestamo NO se tratan como gasto aqui: un prestamo
-- es dinero que se espera recuperar, no una perdida.
-- Correr en el SQL Editor de Supabase, en cada sede. Seguro de volver a correr.

insert into expense_categories (name, color)
select 'Nómina', '#5B4FBF'
where not exists (
  select 1 from expense_categories where name = 'Nómina'
);

insert into expense_items (category_id, name)
select ec.id, 'Pago empleado'
from expense_categories ec
where ec.name = 'Nómina'
  and not exists (
    select 1 from expense_items ei
    where ei.category_id = ec.id and ei.name = 'Pago empleado'
  );

-- Vincula cada movimiento de nomina con el gasto que genero (si aplica), para
-- poder editarlo/borrarlo en conjunto en vez de que queden huerfanos.
alter table employee_movements add column if not exists expense_id uuid references expenses(id);
