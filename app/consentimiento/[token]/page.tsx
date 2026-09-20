import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getSolicitud } from "./actions";
import { BotonesConsentimiento } from "./botones-consentimiento";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default async function ConsentimientoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const solicitud = await getSolicitud(token);

  if (!solicitud) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 py-16">
      <Link href="/">
        <Image src="/logo-stacked.png" alt="preparatorIA" width={700} height={667} className="h-24 w-auto" />
      </Link>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Autorización de acudiente</CardTitle>
          <CardDescription>
            <strong className="text-ink">{solicitud.nombreEstudiante}</strong> quiere usar
            preparatorIA, una app educativa de finanzas personales, contratos y seguridad digital
            para adolescentes. Por ser menor de edad, la Ley 1581 de 2012 exige tu autorización.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            Los datos que recolecta la app y para qué se usan están en nuestra{" "}
            <Link href="/privacidad" className="underline underline-offset-2">
              política de privacidad
            </Link>
            .
          </p>

          {solicitud.estado === "pendiente" ? (
            <BotonesConsentimiento token={token} />
          ) : (
            <p className="text-sm text-ink-soft">
              Esta solicitud ya fue {solicitud.estado === "aprobado" ? "autorizada" : "rechazada"}{" "}
              anteriormente.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
