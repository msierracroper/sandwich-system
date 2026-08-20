# Contexto del Proyecto: Sistema POS para Sanduchería / Granizados

## Descripción general

Sistema completo de punto de venta (POS) y gestión operativa para un negocio familiar de sándwiches y granizados. Se está construyendo para una **segunda sede** (la primera la maneja un hermano/a con cuaderno de papel). El sistema está **en producción**, siendo usado activamente en operación real.

## Stack tecnológico

- **Frontend**: React (PWA), desplegado en Vercel
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **Integraciones**: Exportación a Google Sheets vía Supabase Edge Functions
- **Costo**: Todo en capas gratuitas (free tier) — es una restricción dura del proyecto, cero costo mensual de infraestructura

## Estructura de base de datos (tablas principales)

- `users` (con roles)
- `products`
- `tables` (mesas)
- `orders`
- `order_items`
- `daily_summaries`
- `expenses`
- `inventory_items`
- `product_recipes`
- `inventory_movements`

`orders` tiene además (agregado 2026-08-20, solo relevante para `type='domicilio'`): `address`, `customer_name`, `customer_phone`. El `payment_method` (columna que ya existía, normalmente se llena al cerrar el pedido) para domicilio se captura desde la creación — es informativo para el domiciliario (si debe cobrar en efectivo o ya está pagado por transferencia).

## Roles de usuario activos

1. **Tomador** (order taker): PWA móvil para gestión de mesas y creación/edición de pedidos
2. **Preparador**: tablet en horizontal con pantalla dividida para cola de fríos/calientes, actualizaciones en tiempo real, temporizador de preparación. El layout de estaciones debe poder configurarse (columna izq/der) para reflejar la disposición física de la cocina
3. **Admin**: control total — productos, usuarios, mesas, reportes diarios, gastos con utilidad/pérdida, CRUD de pedidos, inventario con recetas y alertas de stock
4. **Domiciliario** (agregado 2026-08-20): ve solo pedidos `type='domicilio'` con `status='listo'`, ordenados igual que el preparador (más antiguo primero). Card con dirección (botón copiar para pegar en Waze/Maps), nombre y teléfono del cliente (tocable, `tel:`), medio de pago informativo, items e nota. Botón "Marcar como entregado" cierra el pedido (`status='cerrado'`). No existe concepto de domiciliario asignado — es una cola compartida, igual que la de preparación.

## Decisiones técnicas clave (aprendizajes resueltos)

1. **React StrictMode removido** de `main.jsx` — causaba corrupción del cliente de Supabase al refrescar la página.
2. **RLS policies usan `get_my_role()`**, una función que lee el rol directo del JWT — NO consulta la tabla `users` — para evitar deadlocks circulares.
3. **Manejo de timezone estandarizado** usando `toLocaleDateString('en-CA', {timeZone: 'America/Bogota'})`.
4. **Se usa `fetch()` nativo con Bearer tokens** para TODAS las consultas de datos, en lugar del cliente JS de Supabase — el cliente JS se cuelga después de refrescar la página en rutas profundas. Esto incluye el `loadProfile` del `AuthProvider`.
5. Colombia usa moneda sin decimales (COP) — los precios se guardan como enteros simples.
6. **El código de la app nunca revisa el `error` que devuelven las llamadas `.update()`/`.insert()` de Supabase** — si una policy de RLS bloquea silenciosamente una escritura, no hay ningún síntoma visible hasta que alguien nota que un dato nunca cambió (así estuvo roto por meses que el preparador pudiera actualizar `orders.status`: no existía policy de UPDATE para su rol, y nadie lo notó porque el flujo no dependía de ese campo). Al agregar una escritura nueva desde un rol, verificar explícitamente que existe la policy de RLS correspondiente (`select * from pg_policies where tablename=...`) en vez de asumir que si el código "no truena" es porque funcionó.
7. **`create_user_by_admin` (función RPC) crea usuarios rotos si no se le presta atención**: inserta directo en `auth.users` sin pasar por la Admin API de Supabase, así que hay que llenar a mano varios campos que de otra forma quedarían en `NULL` y rompen el login con `"Database error querying schema"` — puntualmente `recovery_token`, `email_change_token_new`, `email_change` (deben ser `''`, no `NULL`) y `raw_app_meta_data` (debe ser `{"provider":"email","providers":["email"]}`, no `NULL`). Además hay que insertar manualmente en `auth.identities` (provider `'email'`) porque sin eso el usuario tampoco puede autenticarse. La función ya se corrigió (2026-08-20) para hacer esto — si se vuelve a tocar esa función, no quitar esas partes.

## Trabajo en curso / próximos pasos

- **Facturación electrónica** (DIAN) para pedidos grandes de catering — pendiente de requisitos de registro DIAN. Candidatos evaluados: Alegra, Siigo.
- **Réplica de configuración**: se está montando un **segundo proyecto de Supabase independiente** para la sede del hermano/a, replicando políticas RLS, triggers y funciones helper.
- Ajustes menores de UI: tamaño de fuente en etiquetas de mesas (ej. "Mesa 1", "Mesa 2", "Para llevar").

## Principios de desarrollo del proyecto

- Desarrollo iterativo guiado por necesidades reales del negocio (no se construyó todo de una vez).
- Cada módulo grande (gastos, inventario, recetas, reportes) se agregó como módulo independiente después de estabilizar el core.
- Restricción de costo cero filtra todas las decisiones de arquitectura.

---

## Instrucciones para Claude Code

Al retomar este proyecto en el editor de código:

1. Revisar la estructura real del repo (carpetas `src/`, componentes por rol: tomador/preparador/admin).
2. Verificar el archivo `.env` / variables de entorno de Supabase (URL + anon key) — no están documentadas aquí por seguridad, deben tomarse del proyecto real.
3. Respetar los patrones ya establecidos arriba (fetch nativo, RLS por JWT, sin StrictMode) al modificar o agregar código — no revertir estas decisiones sin que el usuario lo pida explícitamente.
4. El usuario se comunica en español y prefiere iteración práctica basada en necesidades reales de operación del negocio.
