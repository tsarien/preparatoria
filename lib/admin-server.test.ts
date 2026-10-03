import { beforeEach, describe, expect, it, vi } from "vitest";

// Sesión simulada de Supabase: controla quién está autenticado y qué perfil devuelve la BD.
const estado = {
  cliente: null as unknown,
  usuario: null as { id: string } | null,
  perfil: null as { rol: string; activo: boolean; nombre: string } | null,
};

function clienteSimulado() {
  return {
    auth: { getUser: async () => ({ data: { user: estado.usuario } }) },
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: estado.perfil }) }),
      }),
    }),
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => estado.cliente,
}));
const crearServicio = vi.fn(() => {
  throw new Error("la service-role NO debe usarse sin autorización");
});
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => crearServicio() }));
vi.mock("next/navigation", () => ({
  redirect: (ruta: string) => {
    throw new Error(`REDIRECT:${ruta}`);
  },
}));

import { autorizarAdmin, requireAdmin } from "./admin-server";

beforeEach(() => {
  estado.cliente = clienteSimulado();
  estado.usuario = { id: "u-1" };
  estado.perfil = { rol: "administrador", activo: true, nombre: "Admin" };
  crearServicio.mockClear();
});

describe("autorizarAdmin (autorización real en servidor)", () => {
  it("acepta a un administrador activo", async () => {
    const ctx = await autorizarAdmin();
    expect(ctx?.usuarioId).toBe("u-1");
    expect(ctx?.nombre).toBe("Admin");
  });
  it("rechaza sin conexión a Supabase", async () => {
    estado.cliente = null;
    expect(await autorizarAdmin()).toBeNull();
  });
  it("rechaza sin sesión", async () => {
    estado.usuario = null;
    expect(await autorizarAdmin()).toBeNull();
  });
  it("rechaza a estudiantes y educadores", async () => {
    for (const rol of ["estudiante", "educador"]) {
      estado.perfil = { rol, activo: true, nombre: "X" };
      expect(await autorizarAdmin()).toBeNull();
    }
  });
  it("rechaza a un administrador desactivado", async () => {
    estado.perfil = { rol: "administrador", activo: false, nombre: "Admin" };
    expect(await autorizarAdmin()).toBeNull();
  });
  it("rechaza si el perfil no existe", async () => {
    estado.perfil = null;
    expect(await autorizarAdmin()).toBeNull();
  });
});

describe("requireAdmin (páginas)", () => {
  it("manda a /login sin sesión y a /dashboard si no es administrador", async () => {
    estado.usuario = null;
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/login");
    estado.usuario = { id: "u-2" };
    estado.perfil = { rol: "estudiante", activo: true, nombre: "E" };
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/dashboard");
  });
});

describe("las acciones administrativas se detienen antes de usar la service-role", () => {
  it("un estudiante no puede crear colegios ni gestionar tickets ni cuentas", async () => {
    estado.perfil = { rol: "estudiante", activo: true, nombre: "E" };
    const acciones = await import("@/app/dashboard/admin/actions");
    const datos = new FormData();
    datos.set("nombre", "Colegio Intruso");
    datos.set("id", "11111111-1111-1111-1111-111111111111");
    datos.set("ticket_id", "11111111-1111-1111-1111-111111111111");
    for (const accion of [
      acciones.crearColegio,
      acciones.actualizarColegio,
      acciones.eliminarColegio,
      acciones.generarInvitacion,
      acciones.crearEstudiante,
      acciones.crearEducador,
      acciones.cambiarEstadoCuenta,
      acciones.eliminarCuenta,
      acciones.responderTicketAdmin,
      acciones.gestionarTicketAdmin,
    ]) {
      const resultado = await accion({}, datos);
      expect(resultado.error).toMatch(/permiso/i);
    }
    expect(crearServicio).not.toHaveBeenCalled();
  });
  it("sin sesión tampoco", async () => {
    estado.usuario = null;
    const { crearColegio } = await import("@/app/dashboard/admin/actions");
    expect((await crearColegio({}, new FormData())).error).toMatch(/permiso/i);
    expect(crearServicio).not.toHaveBeenCalled();
  });
});
