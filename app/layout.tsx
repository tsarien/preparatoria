import type { Metadata } from "next";
import "./globals.css";
import { TEMA_STORAGE_KEY } from "@/lib/theme";
import { ThemeSystemListener } from "@/components/theme-system-listener";

export const metadata: Metadata = {
  title: "preparatorIA",
  description: "Aprende a manejar la plata, los contratos y las decisiones de la vida adulta, jugando.",
};

// Corre ANTES de que React hidrate, para que la página no aparezca en un tema
// y luego "parpadee" al otro. Por eso es un <script> aparte y no un useEffect.
const scriptInicioTema = `
(function () {
  try {
    var tema = localStorage.getItem(${JSON.stringify(TEMA_STORAGE_KEY)}) || "sistema";
    var prefiereOscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var esOscuro = tema === "oscuro" || (tema === "sistema" && prefiereOscuro);
    if (esOscuro) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptInicioTema }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeSystemListener />
        {children}
      </body>
    </html>
  );
}
