import Link from "next/link";
import Image from "next/image";

export default function PrivacidadPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-16">
      <Link href="/">
        <Image src="/logo-horizontal.png" alt="preparatorIA" width={900} height={277} className="h-9 w-auto" />
      </Link>

      <div className="rounded-md border border-gold/40 bg-gold-soft p-4 text-sm text-ink">
        Este es un borrador para un proyecto académico (SENA). No reemplaza una revisión legal
        formal — antes de usar esta app con estudiantes reales, valídala con el área jurídica de
        tu institución.
      </div>

      <article className="flex flex-col gap-6 text-sm text-ink">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Política de privacidad</h1>
          <p className="mt-1 text-ink-soft">Última actualización: Fase 8 del proyecto.</p>
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-medium text-ink">¿Qué datos recolectamos?</h2>
          <p>Solo lo necesario para que la app funcione:</p>
          <ul className="list-disc pl-5 text-ink-soft">
            <li>Nombre, fecha de nacimiento, colegio y curso.</li>
            <li>Correo del acudiente, únicamente si eres menor de edad.</li>
            <li>Tu progreso en los retos y los datos de tu personaje simulado (saldo, nivel, XP) — todo esto es dinero y vida ficticios, no información financiera real.</li>
          </ul>
          <p className="text-ink-soft">
            No pedimos número de identificación, dirección física, ni ningún dato financiero real.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-medium text-ink">¿Para qué los usamos?</h2>
          <ul className="list-disc pl-5 text-ink-soft">
            <li>Para que puedas usar tu cuenta y que tu progreso se guarde.</li>
            <li>Para generar retroalimentación personalizada con IA sobre tus decisiones en los retos.</li>
            <li>Para mostrar un ranking con tu nombre, curso y nivel a otros estudiantes de tu mismo colegio (nada más — nunca tu correo, tu fecha de nacimiento, ni el estado de tu consentimiento).</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-medium text-ink">Consentimiento de acudientes (Ley 1581 de 2012)</h2>
          <p className="text-ink-soft">
            Si declaras ser menor de edad al registrarte, tu cuenta queda con acceso limitado hasta
            que tu acudiente autorice el tratamiento de tus datos a través de un enlace que le
            enviamos. Puede autorizar o rechazar la solicitud en cualquier momento.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-medium text-ink">Tus derechos</h2>
          <p className="text-ink-soft">Como titular de los datos (o tu acudiente, si eres menor), puedes:</p>
          <ul className="list-disc pl-5 text-ink-soft">
            <li>Conocer, actualizar y corregir tu información.</li>
            <li>Pedir que eliminemos tu cuenta y tus datos.</li>
            <li>Revocar el consentimiento en cualquier momento.</li>
          </ul>
          <p className="text-ink-soft">
            Para esta versión del proyecto, estas solicitudes se atienden manualmente — escríbenos
            y las procesamos directamente (ver más abajo).
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-medium text-ink">Seguridad</h2>
          <p className="text-ink-soft">
            Cada estudiante solo puede ver y modificar sus propios datos — esto se aplica a nivel de
            base de datos (Row Level Security en Supabase), no solo en la interfaz. Las llaves de la
            API de Claude y las credenciales de la base de datos nunca se exponen al navegador.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-medium text-ink">Contacto</h2>
          <p className="text-ink-soft">
            [Reemplaza esto con un correo de contacto real antes de usar la app con estudiantes.]
          </p>
        </section>
      </article>
    </main>
  );
}
