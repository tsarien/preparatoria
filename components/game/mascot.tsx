import Image from "next/image";
import { cn } from "@/lib/utils";

type ExpresionMascota = "neutral" | "celebrando" | "pensativo";

interface GameMascotProps {
  /** Contexto semántico — elige la expresión por ti. */
  contexto: "saludo" | "acierto" | "acompanamiento" | "duda" | "cierre";
  /** Override explícito (ignora `contexto`). */
  expresion?: ExpresionMascota;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const MAPA_CONTEXTO: Record<GameMascotProps["contexto"], ExpresionMascota> = {
  saludo: "neutral",
  acierto: "celebrando",
  acompanamiento: "neutral",
  duda: "pensativo",
  cierre: "celebrando",
};

const RUTAS: Record<ExpresionMascota, string> = {
  neutral: "/mascota/mascota-neutral.png",
  celebrando: "/mascota/mascota-celebrando.png",
  pensativo: "/mascota/mascota-pensativo.png",
};

const TAMANOS = {
  sm: "h-12 w-auto",
  md: "h-20 w-auto",
  lg: "h-28 w-auto sm:h-32",
};

/**
 * Mascota oficial de preparatorIA. NO es una mascota alternativa: solo
 * delega en uno de los 3 PNGs oficiales según el contexto. Centraliza la
 * elección de expresión que hoy está dispersa en 8+ archivos.
 *
 * Cuando llegue una nueva pose (mascota-senalando, mascota-saludando), se
 * añade aquí como expresión nueva sin tocar los consumidores.
 */
export function GameMascot({
  contexto,
  expresion,
  size = "md",
  className,
}: GameMascotProps) {
  const elegida = expresion ?? MAPA_CONTEXTO[contexto];
  return (
    <Image
      src={RUTAS[elegida]}
      alt=""
      width={320}
      height={315}
      className={cn(TAMANOS[size], className)}
    />
  );
}
