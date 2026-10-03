import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const raiz = (ruta: string) => fileURLToPath(new URL(ruta, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": raiz("./"),
      // "server-only" lanza un error fuera de un servidor de React; en pruebas se neutraliza.
      "server-only": raiz("./test/stubs/server-only.ts"),
    },
  },
  test: {
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.next/**"],
  },
});
