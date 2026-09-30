-- preparatorIA — Reinicio LIMPIO del esquema public (destruye todos los datos de la app).
-- Ejecútalo en Supabase > SQL Editor, y después corre supabase/setup_completo.sql.

drop schema public cascade;
create schema public;

-- Permisos por defecto para que la API de Supabase funcione
grant all on schema public to postgres, anon, authenticated, service_role;

-- OPCIONAL: DROP SCHEMA no borra auth.users. Las cuentas creadas antes del reinicio
-- quedan sin perfil (la app las manda a /login). Si no necesitas conservarlas, borra
-- también los usuarios de Auth (o hazlo desde Authentication > Users). El seed ya
-- elimina y recrea las cuentas de prueba huérfanas por su cuenta.
-- delete from auth.users;
