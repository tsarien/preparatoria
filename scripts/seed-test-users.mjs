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

const comprobaciones = [
  ["colegios", () => supabase.from("colegios").select("id, nombre").limit(0)],
  [
    "perfiles",
    () =>
      supabase
        .from("perfiles")
        .select(
          "id, rol, colegio_id, avatar_id, cargo_educativo, area_educativa, cursos_educativos, fecha_nacimiento, curso, correo_acudiente, consentimiento_acudiente",
        )
        .limit(0),
  ],
  [
    "personajes",
    () =>
      supabase
        .from("personajes")
        .select("id, usuario_id, saldo_billetera, salario_mensual, nivel, xp")
        .limit(0),
  ],
  ["modulos", () => supabase.from("modulos").select("slug, orden").limit(0)],
  [
    "retos",
    () => supabase.from("retos").select("id, modulo_id, slug, config").limit(0),
  ],
  [
    "progreso_usuario_reto",
    () =>
      supabase
        .from("progreso_usuario_reto")
        .select("usuario_id, reto_id, estado, puntaje, feedback_ia")
        .limit(0),
  ],
  [
    "transacciones",
    () =>
      supabase
        .from("transacciones")
        .select("personaje_id, tipo, monto")
        .limit(0),
  ],
  [
    "metas_ahorro",
    () =>
      supabase
        .from("metas_ahorro")
        .select("personaje_id, monto_objetivo, monto_actual")
        .limit(0),
  ],
  [
    "eventos_aleatorios",
    () =>
      supabase
        .from("eventos_aleatorios")
        .select("personaje_id, tipo, estado")
        .limit(0),
  ],
  [
    "solicitudes_consentimiento",
    () =>
      supabase
        .from("solicitudes_consentimiento")
        .select("perfil_id, token, estado")
        .limit(0),
  ],
  [
    "mensajes_ia_guia",
    () =>
      supabase
        .from("mensajes_ia_guia")
        .select("perfil_id, autor, texto")
        .limit(0),
  ],
  [
    "invitaciones_educador",
    () => supabase.from("invitaciones_educador").select("id").limit(0),
  ],
  [
    "informes_educativos",
    () =>
      supabase
        .from("informes_educativos")
        .select("educador_id, datos_observados, recomendaciones_ia")
        .limit(0),
  ],
  [
    "cambios_perfil",
    () =>
      supabase
        .from("cambios_perfil")
        .select("usuario_id, tipo_cambio, creado_en")
        .limit(0),
  ],
];

let esquemaListo = true;
for (const [nombre, consultar] of comprobaciones) {
  const { error } = await consultar();
  if (error) {
    esquemaListo = false;
    console.log(`${nombre}: no disponible (${error.code ?? "error de API"})`);
  } else {
    console.log(`${nombre}: disponible`);
  }
}

if (!esquemaListo) {
  console.error(
    "No se crearon usuarios. Aplica las migraciones 0001-0017 y vuelve a ejecutar el seed.",
  );
  process.exit(1);
}

if (enModoCheck) {
  console.log(
    "Schema de prueba disponible; --check no crea ni modifica datos.",
  );
  process.exit(0);
}

const pruebas = [
  {
    claveEmail: "SUPABASE_TEST_STUDENT_EMAIL",
    clavePassword: "SUPABASE_TEST_STUDENT_PASSWORD",
    rol: "estudiante",
    nombre: "Estudiante de Prueba",
    metadata: {
      fecha_nacimiento: "2008-01-15",
      curso: "11-A",
    },
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

const { data: colegio, error: errorColegio } = await supabase
  .from("colegios")
  .select("id")
  .order("nombre")
  .limit(1)
  .maybeSingle();

if (errorColegio || !colegio) {
  console.error(
    "No hay un colegio existente para asociar las cuentas de prueba.",
  );
  process.exit(1);
}

const { data: usuarios, error: errorUsuarios } =
  await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (errorUsuarios) {
  console.error("No se pudieron comprobar las cuentas existentes.");
  process.exit(1);
}

for (const prueba of pruebas) {
  const email = process.env[prueba.claveEmail].trim().toLowerCase();
  const existente = usuarios.users.find(
    (usuario) => usuario.email?.toLowerCase() === email,
  );
  if (existente) {
    const errorVerificacion = await verificarCuenta(prueba, existente.id);
    if (errorVerificacion) {
      if (errorVerificacion.includes("rol=sin perfil")) {
        const { error: errorBorrado } = await supabase.auth.admin.deleteUser(
          existente.id,
        );
        if (errorBorrado) {
          console.error(
            `${prueba.rol}: la cuenta de prueba huérfana no se pudo recrear (${errorBorrado.code ?? "AuthError"}).`,
          );
          process.exit(1);
        }
        console.log(
          `${prueba.rol}: cuenta de prueba huérfana eliminada de Auth; se recreará para que dispare el trigger.`,
        );
      } else {
        console.error(
          `${prueba.rol}: cuenta existente no válida (${errorVerificacion}); no se modificó.`,
        );
        process.exit(1);
      }
    } else {
      console.log(
        `${prueba.rol}: cuenta existente verificada, no se modificó.`,
      );
      continue;
    }
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: process.env[prueba.clavePassword],
    email_confirm: true,
    app_metadata: {
      rol: prueba.rol,
      colegio_id: colegio.id,
    },
    user_metadata: {
      nombre: prueba.nombre,
      ...prueba.metadata,
    },
  });

  if (error || !data.user) {
    const detalle = error
      ? `${error.code ?? "AuthError"}: ${error.message}`
          .replaceAll(email, "[correo de prueba]")
          .replaceAll(process.env[prueba.clavePassword], "[contraseña oculta]")
          .slice(0, 240)
      : "Supabase no devolvió usuario ni detalle de error.";
    console.error(`${prueba.rol}: alta rechazada por Supabase (${detalle}).`);
    process.exit(1);
  }

  if (prueba.rol === "educador" && data.user.app_metadata?.rol !== "educador") {
    const borrado = await supabase.auth.admin.deleteUser(data.user.id);
    console.error(
      `educador: Auth no devolvió app_metadata.rol=educador desde admin.createUser; ${describirLimpieza(borrado.error)}.`,
    );
    process.exit(1);
  }

  const errorVerificacion = await verificarCuenta(prueba, data.user.id);
  if (errorVerificacion) {
    const borrado = await supabase.auth.admin.deleteUser(data.user.id);
    console.error(
      `${prueba.rol}: ${errorVerificacion}; ${describirLimpieza(borrado.error)}.`,
    );
    process.exit(1);
  }

  console.log(`${prueba.rol}: creada y verificada; trigger correcto.`);
}

console.log(
  "Seed de usuarios de prueba finalizado. No se mostraron contraseñas.",
);

async function verificarCuenta(prueba, usuarioId) {
  const { data: perfil, error: errorPerfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", usuarioId)
    .maybeSingle();
  if (errorPerfil || perfil?.rol !== prueba.rol) {
    return `el trigger dejó rol=${perfil?.rol ?? "sin perfil"}, se esperaba rol=${prueba.rol}; revisa la migración 0017`;
  }

  const { data: personaje, error: errorPersonaje } = await supabase
    .from("personajes")
    .select("usuario_id")
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  if (errorPersonaje || (prueba.rol === "estudiante") !== Boolean(personaje)) {
    return "el trigger creó un personaje que no corresponde al rol";
  }
  return null;
}

function describirLimpieza(error) {
  return error
    ? `la limpieza Auth falló (${error.code ?? "error"}); la cuenta sigue en Auth`
    : "la cuenta Auth incompleta se eliminó";
}
