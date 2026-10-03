/** Estado devuelto por las acciones administrativas (formularios con useActionState). */
export interface EstadoAdmin {
  error?: string;
  mensaje?: string;
  /** Código de invitación en claro: se muestra UNA sola vez y nunca se guarda. */
  codigo?: string;
  codigoCorreo?: string;
}

export const ESTADO_ADMIN_INICIAL: EstadoAdmin = {};
