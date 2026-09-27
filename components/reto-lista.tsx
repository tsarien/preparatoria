import Image from "next/image";
import { ProgressBar } from "@/components/ui/progress-bar";
import { GameChallengeCard } from "@/components/game/game-challenge-card";

interface RetoItem {
  id: string;
  slug: string;
  nombre: string;
  dificultad: string;
}

interface ProgresoItem {
  estado: string;
  puntaje: number | null;
}

interface RetoListaProps {
  retos: RetoItem[];
  progresoPorReto: Map<string, ProgresoItem>;
  basePath: string;
  etiquetaCompletado?: string;
}

export function RetoLista({
  retos,
  progresoPorReto,
  basePath,
  etiquetaCompletado = "Completado",
}: RetoListaProps) {
  if (retos.length === 0) {
    return (
      <div className="game-card flex flex-col items-center gap-3 rounded-2xl border-dashed p-8 text-center">
        <Image
          src="/mascota/mascota-pensativo.png"
          alt=""
          width={320}
          height={319}
          className="h-16 w-auto"
        />
        <p className="text-sm text-ink-soft">
          Este módulo todavía no tiene retos. Vuelve pronto.
        </p>
      </div>
    );
  }

  const completados = retos.filter(
    (r) => progresoPorReto.get(r.id)?.estado === "completado",
  ).length;

  return (
    <div className="flex flex-col gap-4">
      {retos.length > 1 && (
        <ProgressBar
          value={completados}
          max={retos.length}
          label={`${completados} de ${retos.length} desafíos completados`}
          animado
        />
      )}

      <ol className="flex flex-col gap-3">
        {retos.map((reto, i) => {
          const progreso = progresoPorReto.get(reto.id);
          const completado = progreso?.estado === "completado";
          return (
            <GameChallengeCard
              key={reto.id}
              href={`${basePath}/${reto.slug}`}
              numero={i + 1}
              titulo={reto.nombre}
              dificultad={reto.dificultad}
              completado={completado}
              puntaje={progreso?.puntaje}
              etiquetaCompletado={etiquetaCompletado}
              index={i}
            />
          );
        })}
      </ol>
    </div>
  );
}
