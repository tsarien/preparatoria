const resendApiKey = process.env.RESEND_API_KEY;

export const isEmailConfigured = Boolean(resendApiKey);

export interface ResultadoCorreo {
  enviado: boolean;
  error?: string;
}

function construirEnlaceConsentimiento(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/consentimiento/${token}`;
}

/**
 * Envía el correo de autorización al acudiente. Si RESEND_API_KEY no está
 * configurada, no lanza error ni rompe el registro — el flujo de consentimiento
 * sigue existiendo (la solicitud ya quedó creada en la base de datos), solo que
 * el enlace no viaja por correo. La Server Action que llama a esto usa
 * `enlace` para mostrártelo directamente en pantalla en ese caso, así puedes
 * probar el flujo completo sin necesitar una cuenta de Resend todavía.
 */
export async function enviarCorreoConsentimiento(
  correoAcudiente: string,
  nombreEstudiante: string,
  token: string
): Promise<ResultadoCorreo & { enlace: string }> {
  const enlace = construirEnlaceConsentimiento(token);

  if (!resendApiKey) {
    return { enviado: false, error: "RESEND_API_KEY no configurada.", enlace };
  }

  try {
    const respuesta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? "preparatorIA <onboarding@resend.dev>",
        to: correoAcudiente,
        subject: `${nombreEstudiante} quiere registrarse en preparatorIA — necesitamos tu autorización`,
        html: `
          <p>Hola,</p>
          <p><strong>${nombreEstudiante}</strong> quiere crear una cuenta en preparatorIA, una app educativa que enseña finanzas personales, contratos y seguridad digital a través de retos gamificados.</p>
          <p>Por tratarse de un menor de edad, la Ley 1581 de 2012 exige tu autorización antes de activar la cuenta por completo.</p>
          <p><a href="${enlace}">Revisa la solicitud y autoriza o rechaza aquí</a></p>
          <p>Si no reconoces a esta persona o no esperabas este correo, puedes ignorarlo o rechazar la solicitud desde el enlace.</p>
        `,
      }),
    });

    if (!respuesta.ok) {
      const texto = await respuesta.text();
      return { enviado: false, error: `Resend respondió ${respuesta.status}: ${texto}`, enlace };
    }
    return { enviado: true, enlace };
  } catch (error) {
    return {
      enviado: false,
      error: error instanceof Error ? error.message : "Error inesperado al enviar el correo.",
      enlace,
    };
  }
}
