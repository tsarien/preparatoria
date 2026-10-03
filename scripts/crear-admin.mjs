// Crea (o verifica) la cuenta de ADMINISTRADOR de preparatorIA.
//
// Uso:  npm run admin:crear
//   (carga .env.local con `node --env-file=.env.local`; nunca pases la contraseña como argumento)
//
// Variables requeridas (solo por entorno, JAMÁS en el repositorio):
//   NEXT_PUBLIC_SUPABASE_URL        URL del proyecto de Supabase
//   SUPABASE_SERVICE_ROLE_KEY       llave service-role (solo servidor / tu máquina)
//   ADMIN_EMAIL                     correo del administrador
//   ADMIN_PASSWORD                  contraseña inicial (≥ 12 caracteres)
//
// La contraseña la guarda Supabase Auth (hash); no se imprime ni se escribe en ningún archivo.
// El rol se asigna en app_metadata (solo la service-role puede escribirlo) y el trigger
// handle_new_user() (migración 0019) crea el perfil con rol 'administrador'.
// El script es idempotente: si el administrador ya existe, no hace nada.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
const correo = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const clave = process.env.ADMIN_PASSWORD ?? "";

function salir(mensaje) {
  console.error(`✘ ${mensaje}`);
  process.exit(1);
}

if (!url || !llave) salir("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) salir("ADMIN_EMAIL no es un correo válido.");
if (clave.length < 12) salir("ADMIN_PASSWORD debe tener al menos 12 caracteres.");

const supabase = createClient(url, llave, { auth: { autoRefreshToken: false, persistSession: false } });

async function buscarUsuarioPorCorreo(email) {
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) salir(`No se pudo consultar Supabase Auth: ${error.message}`);
    const hallado = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (hallado) return hallado;
    if (data.users.length < 200) return null;
  }
  return null;
}

const existente = await buscarUsuarioPorCorreo(correo);

if (existente) {
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, activo")
    .eq("id", existente.id)
    .maybeSingle();
  if (perfil?.rol === "administrador") {
    console.log(`✔ El administrador ${correo} ya existe${perfil.activo ? "" : " (pero está INACTIVO)"}. No se hicieron cambios.`);
    process.exit(0);
  }
  salir(
    `Ya existe una cuenta con ${correo} y NO es administrador (rol: ${perfil?.rol ?? "sin perfil"}). ` +
      "Por seguridad el script no promueve cuentas existentes: usa otro correo para el administrador.",
  );
}

const { data, error } = await supabase.auth.admin.createUser({
  email: correo,
  password: clave,
  email_confirm: true,
  app_metadata: { rol: "administrador" },
  user_metadata: { nombre: "Administrador" },
});
if (error || !data.user) salir(`No se pudo crear el administrador: ${error?.message ?? "error desconocido"}`);

const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", data.user.id).maybeSingle();
if (perfil?.rol !== "administrador") {
  salir(
    "La cuenta se creó pero el perfil no quedó como administrador. ¿Aplicaste las migraciones hasta la 0019? " +
      "Revisa public.perfiles antes de continuar.",
  );
}
console.log(`✔ Administrador creado: ${correo}. Inicia sesión en /login; serás llevado a /dashboard/admin.`);
