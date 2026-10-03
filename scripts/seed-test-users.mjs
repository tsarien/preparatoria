// Crea (o verifica) las cuentas de prueba: 1 estudiante y 1 educador.
//
//   node scripts/seed-test-users.mjs --check   # solo comprueba que el esquema existe
//   node scripts/seed-test-users.mjs           # crea las cuentas (requiere SUPABASE_TEST_SEED_ENABLED=true)
//
// El educador se crea siguiendo el MISMO flujo del registro real: invitación
// consumida (crear_invitacion_educador + usada_en) y luego Auth Admin. El trigger
// handle_new_user() (definición vigente: migración 0019) asigna el rol a partir de esa invitación.
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const enModoCheck = process.argv.includes("--check");
const puedeCrearPruebas = process.env.SUPABASE_TEST_SEED_ENABLED === "true";
const enProduccion =
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production";

if (enProduccion || (!enModoCheck && !puedeCrearPruebas)) {
  console.error(
    "Seed cancelado. Solo puede ejecutarse localmente con SUPABASE_TEST_SEED_ENABLED=true.",
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error(
    "Falta configurar URL de Supabase o service-role key en .env.local.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── 1. Comprobación del esquema ───────────────────────────────────────────
const comprobaciones = {
  colegios: "id, nombre, codigo_institucional",
  perfiles:
    "id, rol, colegio_id, avatar_id, cargo_educativo, area_educativa, cursos_educativos, fecha_nacimiento, curso, correo_acudiente, consentimiento_acudiente",
  personajes: "id, usuario_id, saldo_billetera, salario_mensual, nivel, xp",
  modulos: "slug, orden",
  retos: "id, modulo_id, slug, config",
  progreso_usuario_reto: "usuario_id, reto_id, estado, puntaje, feedback_ia",
  transacciones: "personaje_id, tipo, monto",
  metas_ahorro: "personaje_id, monto_objetivo, monto_actual",
  eventos_aleatorios: "personaje_id, tipo, estado",
  solicitudes_consentimiento: "perfil_id, token, estado",
  mensajes_ia_guia: "perfil_id, autor, texto",
  invitaciones_educador: "id, correo_institucional, usada_en, usuario_id",
  informes_educativos: "educador_id, datos_observados, recomendaciones_ia",
  cambios_perfil: "usuario_id, tipo_cambio, creado_en",
};

let esquemaListo = true;
for (const [tabla, columnas] of Object.entries(comprobaciones)) {
  const { error } = await supabase.from(tabla).select(columnas).limit(0);
  if (error) {
    esquemaListo = false;
    console.log(
      `${tabla}: no disponible (${error.code ?? "error de API"}: ${error.message})`,
    );
  } else {
    console.log(`${tabla}: disponible`);
  }
}

if (!esquemaListo) {
  console.error(
    "No se crearon usuarios. Aplica todas las migraciones (0001-0017, o supabase/setup_completo.sql) y vuelve a ejecutar el seed.",
  );
  process.exit(1);
}

if (enModoCheck) {
  console.log("Esquema disponible; --check no crea ni modifica datos.");
  process.exit(0);
}

// ── 2. Definición de las cuentas ──────────────────────────────────────────
const pruebas = [
  {
    claveEmail: "SUPABASE_TEST_STUDENT_EMAIL",
    clavePassword: "SUPABASE_TEST_STUDENT_PASSWORD",
    rol: "estudiante",
    nombre: "Estudiante de Prueba",
    metadata: { fecha_nacimiento: "2008-01-15", curso: "11-A" },
  },
  {
    claveEmail: "SUPABASE_TEST_EDUCATOR_EMAIL",
    clavePassword: "SUPABASE_TEST_EDUCATOR_PASSWORD",
    rol: "educador",
    nombre: "Docente de Prueba",
    metadata: {
      cargo_educativo: "Docente",
      area_educativa: "Educación financiera",
      cursos_educativos: ["11-A"],
    },
  },
];

for (const prueba of pruebas) {
  if (!process.env[prueba.claveEmail] || !process.env[prueba.clavePassword]) {
    console.error(
      `Configura ${prueba.claveEmail} y ${prueba.clavePassword} en .env.local. No se han creado usuarios todavía.`,
    );
    process.exit(1);
  }
}

// Colegio demo sembrado por la migración 0001; si no existe, cae al primero disponible.
let { data: colegio } = await supabase
  .from("colegios")
  .select("id, nombre")
  .eq("codigo_institucional", "DEMO-001")
  .maybeSingle();
if (!colegio) {
  ({ data: colegio } = await supabase
    .from("colegios")
    .select("id, nombre")
    .order("nombre")
    .limit(1)
    .maybeSingle());
}
if (!colegio) {
  console.error("No hay un colegio existente para asociar las cuentas de prueba.");
  process.exit(1);
}
console.log(`Colegio de prueba: ${colegio.nombre}`);

const { data: usuarios, error: errorUsuarios } =
  await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (errorUsuarios) {
  console.error(`No se pudieron comprobar las cuentas existentes (${errorUsuarios.message}).`);
  process.exit(1);
}

// ── 3. Crear / verificar cada cuenta ──────────────────────────────────────
for (const prueba of pruebas) {
  const email = process.env[prueba.claveEmail].trim().toLowerCase();
  const password = process.env[prueba.clavePassword];

  const existente = usuarios.users.find(
    (usuario) => usuario.email?.toLowerCase() === email,
  );
  if (existente) {
    const problema = await verificarCuenta(prueba, existente.id);
    if (!problema) {
      console.log(`${prueba.rol}: cuenta existente verificada, no se modificó.`);
      continue;
    }
    // Cuenta huérfana (típico tras un DROP SCHEMA public): existe en Auth sin perfil.
    // Se elimina para recrearla y que el trigger vuelva a dispararse.
    if (problema.startsWith("sin perfil")) {
      const { error } = await supabase.auth.admin.deleteUser(existente.id);
      if (error) {
        console.error(`${prueba.rol}: no se pudo eliminar la cuenta huérfana (${error.message}).`);
        process.exit(1);
      }
      console.log(`${prueba.rol}: cuenta huérfana eliminada de Auth; se recreará.`);
    } else {
      console.error(`${prueba.rol}: cuenta existente no válida (${problema}); no se modificó.`);
      process.exit(1);
    }
  }

  let invitacionId = null;
  const opciones = {
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre: prueba.nombre, ...prueba.metadata },
  };

  if (prueba.rol === "estudiante") {
    // El registro público envía colegio_id en user_metadata; el seed hace lo mismo.
    opciones.user_metadata.colegio_id = colegio.id;
  } else {
    // Mismo flujo que registrarEducador(): invitación de un solo uso, consumida antes de crear la cuenta.
    const codigo = randomBytes(32).toString("base64url").toLowerCase();
    const hash = createHash("sha256").update(codigo).digest("hex");
    const { data: id, error: errorInvitacion } = await supabase.rpc(
      "crear_invitacion_educador",
      { p_colegio_id: colegio.id, p_correo_institucional: email, p_codigo_hash: hash },
    );
    if (errorInvitacion || !id) {
      console.error(`educador: no se pudo crear la invitación (${errorInvitacion?.message ?? "sin detalle"}).`);
      process.exit(1);
    }
    invitacionId = id;
    const { error: errorUso } = await supabase
      .from("invitaciones_educador")
      .update({ usada_en: new Date().toISOString() })
      .eq("id", invitacionId)
      .is("usada_en", null);
    if (errorUso) {
      console.error(`educador: no se pudo consumir la invitación (${errorUso.message}).`);
      process.exit(1);
    }
    opciones.app_metadata = { rol: "educador", colegio_id: colegio.id };
  }

  const { data, error } = await supabase.auth.admin.createUser(opciones);
  if (error || !data.user) {
    const detalle = error
      ? `${error.code ?? "AuthError"}: ${error.message}`
          .replaceAll(email, "[correo de prueba]")
          .replaceAll(password, "[contraseña oculta]")
          .slice(0, 240)
      : "Supabase no devolvió usuario ni detalle de error.";
    if (invitacionId) {
      await supabase.from("invitaciones_educador").update({ usada_en: null }).eq("id", invitacionId);
    }
    console.error(`${prueba.rol}: alta rechazada por Supabase (${detalle}).`);
    if (/database error saving new user/i.test(detalle)) {
      console.error(
        "  → El trigger handle_new_user() falló o no existe. Revisa que la migración 0017 esté aplicada.",
      );
    }
    process.exit(1);
  }

  const problema = await verificarCuenta(prueba, data.user.id);
  if (problema) {
    const borrado = await supabase.auth.admin.deleteUser(data.user.id);
    console.error(
      `${prueba.rol}: ${problema}; ${
        borrado.error
          ? "la limpieza Auth falló; la cuenta sigue en Auth"
          : "la cuenta Auth incompleta se eliminó"
      }.`,
    );
    process.exit(1);
  }
  console.log(`${prueba.rol}: creada y verificada; trigger correcto.`);
}

console.log("Seed de usuarios de prueba finalizado. No se mostraron contraseñas.");

// ── Utilidades ────────────────────────────────────────────────────────────
async function verificarCuenta(prueba, usuarioId) {
  const { data: perfil, error: errorPerfil } = await supabase
    .from("perfiles")
    .select("rol, colegio_id")
    .eq("id", usuarioId)
    .maybeSingle();
  if (errorPerfil) return `no se pudo leer el perfil (${errorPerfil.message})`;
  if (!perfil) return "sin perfil: el trigger no lo creó (¿migración 0017 aplicada?)";
  if (perfil.rol !== prueba.rol) {
    return `el trigger dejó rol=${perfil.rol}, se esperaba rol=${prueba.rol}; revisa la migración 0017`;
  }
  if (!perfil.colegio_id) return "el perfil quedó sin colegio";

  const { data: personaje, error: errorPersonaje } = await supabase
    .from("personajes")
    .select("usuario_id")
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  if (errorPersonaje) return `no se pudo leer el personaje (${errorPersonaje.message})`;
  if ((prueba.rol === "estudiante") !== Boolean(personaje)) {
    return "el trigger creó (o no creó) un personaje que no corresponde al rol";
  }
  return null;
}
