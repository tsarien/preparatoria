import { describe, expect, it } from "vitest";
import { sanitizarPagina, validarMensajeTicket, validarTicket } from "./soporte";

const BASE = {
  asunto: "No carga el mapa",
  categoria: "error_tecnico",
  descripcion: "Se queda en blanco al abrir el dashboard.",
  prioridad: "media",
  pagina: "/dashboard",
};

describe("validación de tickets", () => {
  it("acepta un ticket completo", () => {
    expect(validarTicket(BASE)).toBeNull();
  });
  it("rechaza asunto corto, categoría/prioridad inventadas y descripción corta", () => {
    expect(validarTicket({ ...BASE, asunto: "ab" })).toMatch(/asunto/);
    expect(validarTicket({ ...BASE, categoria: "hack" })).toMatch(/categoría/);
    expect(validarTicket({ ...BASE, prioridad: "critica" })).toMatch(/prioridad/);
    expect(validarTicket({ ...BASE, descripcion: "corta" })).toMatch(/Describe/);
  });
  it("valida mensajes de respuesta", () => {
    expect(validarMensajeTicket("   ")).toMatch(/Escribe/);
    expect(validarMensajeTicket("x".repeat(2001))).toMatch(/2000/);
    expect(validarMensajeTicket("Gracias")).toBeNull();
  });
});

describe("página de origen del ticket", () => {
  it("solo conserva rutas internas seguras", () => {
    expect(sanitizarPagina("/dashboard/ranking")).toBe("/dashboard/ranking");
    expect(sanitizarPagina("https://evil.com")).toBeNull();
    expect(sanitizarPagina("//evil.com")).toBeNull();
    expect(sanitizarPagina("/ok<script>")).toBeNull();
    expect(sanitizarPagina("/" + "a".repeat(300))).toHaveLength(200);
  });
});
