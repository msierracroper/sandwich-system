-- Asegura que "orders" y "order_items" esten habilitadas para Realtime.
-- Si una tabla no esta en la publicacion "supabase_realtime", Postgres
-- nunca emite el evento y ningun cliente se entera del cambio sin refrescar
-- manualmente — sospecha #1 de por que el preparador no ve pedidos nuevos
-- en vivo. Seguro de volver a correr (no truena si ya estaban agregadas).

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table orders;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'order_items'
  ) then
    alter publication supabase_realtime add table order_items;
  end if;
end $$;

-- Para confirmar que ambas quedaron habilitadas:
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;
