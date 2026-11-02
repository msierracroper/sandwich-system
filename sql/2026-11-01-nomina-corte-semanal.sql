-- Dia de "corte" semanal configurable por empleado (0=domingo..6=sabado).
-- Solo aplica cuando pay_schedule='semanal' — es lo que la app usa para
-- calcular el rango de la semana actual y acumular dia a dia cuanto se le
-- debe, hasta el dia de pago.
-- Correr en el SQL Editor de Supabase, en cada sede. Seguro de volver a correr.

alter table employees add column if not exists pay_cutoff_weekday smallint;
