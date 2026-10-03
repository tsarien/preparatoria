// Tipos escritos a mano para las tablas núcleo del modelo de datos (ver PLAN_DESARROLLO.md, sección 4).
// Una vez tengas el proyecto de Supabase creado, puedes regenerar esto automáticamente con:
//   npx supabase gen types typescript --project-id TU_PROJECT_ID > types/database.ts

export interface Colegio {
  id: string;
  nombre: string;
  ciudad: string | null;
  codigo_institucional: string | null;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface CursoColegio {
  id: string;
  colegio_id: string;
  nombre: string;
  activo: boolean;
  creado_en: string;
}

export type RolPerfil = "estudiante" | "educador" | "administrador";

export interface Perfil {
  id: string;
  nombre: string;
  fecha_nacimiento: string | null;
  colegio_id: string | null;
  curso: string | null;
  rol: RolPerfil;
  correo_acudiente: string | null;
  consentimiento_acudiente: "pendiente" | "aprobado";
  cargo_educativo: string | null;
  area_educativa: string | null;
  cursos_educativos: string[];
  avatar_id: string;
  activo: boolean;
  creado_en: string;
}

export interface CambioPerfil {
  id: string;
  usuario_id: string;
  tipo_cambio:
    | "nombre_modificado"
    | "correo_modificado"
    | "colegio_modificado"
    | "curso_modificado"
    | "avatar_modificado";
  descripcion: string;
  creado_en: string;
}

export interface SolicitudConsentimiento {
  id: string;
  perfil_id: string;
  token: string;
  estado: "pendiente" | "aprobado" | "rechazado";
  creado_en: string;
  resuelto_en: string | null;
}

export interface InvitacionEducador {
  id: string;
  colegio_id: string;
  correo_institucional: string;
  codigo_hash: string;
  expira_en: string;
  usada_en: string | null;
  usuario_id: string | null;
  creada_en: string;
  revocada_en: string | null;
  creada_por: string | null;
}

export interface InformeEducativo {
  id: string;
  educador_id: string;
  colegio_id: string;
  estudiante_id: string | null;
  curso: string | null;
  periodo: string;
  datos_observados: unknown;
  recomendaciones_ia: unknown;
  creado_en: string;
}

export interface Personaje {
  id: string;
  usuario_id: string;
  saldo_billetera: number;
  salario_mensual: number;
  nivel: number;
  xp: number;
  modo_juego: "estudiante" | "educador_demo";
  creado_en: string;
}

export interface Transaccion {
  id: string;
  personaje_id: string;
  tipo: "ingreso" | "gasto";
  categoria: string | null;
  monto: number;
  descripcion: string | null;
  origen: string | null;
  creado_en: string;
}

export interface Modulo {
  id: string;
  slug: string;
  grupo: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  estado: "mvp" | "roadmap";
}

export interface Reto {
  id: string;
  modulo_id: string;
  slug: string;
  nombre: string;
  tipo: string;
  dificultad: string;
  config: unknown;
  orden: number;
}

export interface ProgresoUsuarioReto {
  id: string;
  usuario_id: string;
  reto_id: string;
  estado: "no_iniciado" | "en_progreso" | "completado";
  intentos: number;
  puntaje: number | null;
  feedback_ia: unknown;
  completado_en: string | null;
  actualizado_en: string;
}

export interface MetaAhorro {
  id: string;
  personaje_id: string;
  nombre: string;
  monto_objetivo: number;
  monto_actual: number;
  aporte_mensual_planeado: number;
  creado_en: string;
}

export interface EventoAleatorio {
  id: string;
  personaje_id: string;
  tipo:
    | "factura_inesperada"
    | "imprevisto_medico"
    | "bono_inesperado"
    | "oferta_sospechosa";
  descripcion: string;
  impacto_monto: number;
  estado: "pendiente" | "resuelto";
  creado_en: string;
  resuelto_en: string | null;
}

export interface RankingFila {
  nombre: string;
  curso: string | null;
  nivel: number;
  xp: number;
  avatar_id: string | null;
  es_usuario_actual: boolean;
}

export type EstadoTicket = "abierto" | "en_proceso" | "respondido" | "cerrado";
export type PrioridadTicket = "baja" | "media" | "alta" | "urgente";
export type CategoriaTicket =
  | "cuenta"
  | "error_tecnico"
  | "ia"
  | "contenido"
  | "sugerencia"
  | "otro";

export interface TicketSoporte {
  id: string;
  usuario_id: string;
  asunto: string;
  categoria: CategoriaTicket;
  descripcion: string;
  pagina: string | null;
  estado: EstadoTicket;
  prioridad: PrioridadTicket;
  creado_en: string;
  actualizado_en: string;
  cerrado_en: string | null;
  administrador_asignado_id: string | null;
}

export interface TicketMensaje {
  id: string;
  ticket_id: string;
  autor_id: string;
  autor_rol: RolPerfil;
  mensaje: string;
  creado_en: string;
}

export interface ActividadSistema {
  id: string;
  actor_id: string | null;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  detalle: string | null;
  creado_en: string;
}

export interface ConversacionIA {
  id: string;
  perfil_id: string;
  tipo: "guia" | "educativa";
  titulo: string;
  creado_en: string;
  actualizado_en: string;
}

export interface MensajeIAEducativa {
  id: string;
  educador_id: string;
  conversacion_id: string;
  autor: "educador" | "ia";
  texto: string;
  contexto: unknown;
  creado_en: string;
}

export interface SolicitudConsentimiento {
  id: string;
  perfil_id: string;
  token: string;
  estado: "pendiente" | "aprobado" | "rechazado";
  creado_en: string;
  resuelto_en: string | null;
}

// Forma mínima que espera @supabase/supabase-js (necesita Row/Insert/Update/Relationships
// en cada tabla, y las claves Views/Functions/Enums/CompositeTypes aunque estén vacías,
// o el tipado de los resultados de `.select()` colapsa a `never`).
// Se irá ampliando fase a fase (modulos, retos, progreso_usuario_reto, eventos_aleatorios, logros).
type SupabaseRow<T> = T & Record<string, unknown>;
type SupabaseWrite<T> = Partial<T> & Record<string, unknown>;

export interface Database {
  public: {
    Tables: {
      colegios: {
        Row: SupabaseRow<Colegio>;
        Insert: SupabaseWrite<Colegio>;
        Update: SupabaseWrite<Colegio>;
        Relationships: [];
      };
      cursos_colegio: {
        Row: SupabaseRow<CursoColegio>;
        Insert: SupabaseWrite<CursoColegio>;
        Update: SupabaseWrite<CursoColegio>;
        Relationships: [];
      };
      tickets_soporte: {
        Row: SupabaseRow<TicketSoporte>;
        Insert: SupabaseWrite<TicketSoporte>;
        Update: SupabaseWrite<TicketSoporte>;
        Relationships: [];
      };
      tickets_mensajes: {
        Row: SupabaseRow<TicketMensaje>;
        Insert: SupabaseWrite<TicketMensaje>;
        Update: SupabaseWrite<TicketMensaje>;
        Relationships: [];
      };
      actividad_sistema: {
        Row: SupabaseRow<ActividadSistema>;
        Insert: SupabaseWrite<ActividadSistema>;
        Update: SupabaseWrite<ActividadSistema>;
        Relationships: [];
      };
      conversaciones_ia: {
        Row: SupabaseRow<ConversacionIA>;
        Insert: SupabaseWrite<ConversacionIA>;
        Update: SupabaseWrite<ConversacionIA>;
        Relationships: [];
      };
      mensajes_ia_educativa: {
        Row: SupabaseRow<MensajeIAEducativa>;
        Insert: SupabaseWrite<MensajeIAEducativa>;
        Update: SupabaseWrite<MensajeIAEducativa>;
        Relationships: [];
      };
      invitaciones_educador: {
        Row: SupabaseRow<InvitacionEducador>;
        Insert: SupabaseWrite<InvitacionEducador>;
        Update: SupabaseWrite<InvitacionEducador>;
        Relationships: [];
      };
      solicitudes_consentimiento: {
        Row: SupabaseRow<SolicitudConsentimiento>;
        Insert: SupabaseWrite<SolicitudConsentimiento>;
        Update: SupabaseWrite<SolicitudConsentimiento>;
        Relationships: [];
      };
      informes_educativos: {
        Row: SupabaseRow<InformeEducativo>;
        Insert: SupabaseWrite<InformeEducativo>;
        Update: SupabaseWrite<InformeEducativo>;
        Relationships: [];
      };
      cambios_perfil: {
        Row: SupabaseRow<CambioPerfil>;
        Insert: SupabaseWrite<CambioPerfil>;
        Update: SupabaseWrite<CambioPerfil>;
        Relationships: [];
      };
      perfiles: {
        Row: SupabaseRow<Perfil>;
        Insert: SupabaseWrite<Perfil>;
        Update: SupabaseWrite<Perfil>;
        Relationships: [];
      };
      personajes: {
        Row: SupabaseRow<Personaje>;
        Insert: SupabaseWrite<Personaje>;
        Update: SupabaseWrite<Personaje>;
        Relationships: [];
      };
      transacciones: {
        Row: SupabaseRow<Transaccion>;
        Insert: SupabaseWrite<Transaccion>;
        Update: SupabaseWrite<Transaccion>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      actualizar_perfil: {
        Args: {
          p_nombre: string;
          p_curso: string | null;
          p_colegio_id: string | null;
          p_avatar_id: string;
        };
        Returns: string[];
      };
      registrar_cambio_correo: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      obtener_estudiantes_educador: {
        Args: Record<string, never>;
        Returns: unknown[];
      };
      completar_reto_primer_empleo: {
        Args: { p_slug: string; p_puntaje: number; p_feedback: unknown };
        Returns: ProgresoUsuarioReto;
      };
      crear_meta_ahorro: {
        Args: {
          p_nombre: string;
          p_monto_objetivo: number;
          p_aporte_mensual: number;
        };
        Returns: MetaAhorro;
      };
      [key: string]: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
