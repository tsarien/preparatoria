import { cn } from "@/lib/utils";

interface PhoneMessageCardProps {
  canal: string; // "sms" | "correo" | "mensaje" | cualquier otro
  remitente: string;
  mensaje: string;
  /** Cuando es true, resalta visualmente el borde — NUNCA revela qué es sospechoso. */
  alerta?: boolean;
  className?: string;
}

/**
 * Presenta un mensaje entrante como objeto visual dentro del mundo del juego
 * (una pantalla de teléfono / bandeja de correo). Es puramente presentación:
 * no marca señales específicas, no resalta palabras, no evalúa nada.
 *
 * La "sospechosidad" real la evalúa la IA — aquí solo se ambienta la
 * investigación.
 */
export function PhoneMessageCard({
  canal,
  remitente,
  mensaje,
  alerta = false,
  className,
}: PhoneMessageCardProps) {
  const esCorreo = canal.toLowerCase() === "correo";
  const canalLabel = esCorreo
    ? "Correo"
    : canal.toLowerCase() === "sms"
      ? "SMS"
      : "Mensaje";
  const hora = "9:42"; // fija — decorativa, no depende del reloj real

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-sm overflow-hidden rounded-3xl border-2 shadow-[0_6px_0_rgba(31,36,48,0.25)]",
        alerta
          ? "border-alert/50 bg-[#1a1626]"
          : "border-primary/40 bg-[#1a1626]",
        className,
      )}
    >
      {/* Bisel superior — brillo tipo "pantalla" */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />

      {/* Barra de estado tipo teléfono */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/60">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-white/40"
          />
          {canalLabel}
        </span>
        <span className="font-mono">{hora}</span>
      </div>

      {/* Remitente */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span
          aria-hidden="true"
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 font-display text-base font-bold",
            alerta
              ? "border-alert/50 bg-alert/15 text-alert"
              : "border-primary/40 bg-primary/20 text-primary",
          )}
        >
          {remitente.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
            {esCorreo ? "De" : "Remitente"}
          </p>
          <p className="wrap-break-word text-sm font-medium text-white/90">
            {remitente}
          </p>
        </div>
      </div>

      {/* Burbuja del mensaje */}
      <div className="px-4 pb-5">
        <div className="rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.04] px-4 py-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/90">
            {mensaje}
          </p>
        </div>
      </div>
    </div>
  );
}
