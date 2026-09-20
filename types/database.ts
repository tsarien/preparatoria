// Tipos escritos a mano para las tablas núcleo del modelo de datos (ver PLAN_DESARROLLO.md, sección 4).
// Una vez tengas el proyecto de Supabase creado, puedes regenerar esto automáticamente con:
//   npx supabase gen types typescript --project-id TU_PROJECT_ID > types/database.ts

export interface Colegio {
  id: string;
  nombre: string;
  ciudad: string | null;
  codigo_institucional: string | null;
}

export interface Perfil {
  id: string;
  nombre: string;
  fecha_nacimiento: string | null;
  colegio_id: string | null;
  curso: string | null;
  rol: string;
  correo_acudiente: string | null;
  consentimiento_acudiente: "pendiente" | "aprobado";
  creado_en: string;
}

export interface Personaje {
  id: string;
  usuario_id: string;
  saldo_billetera: number;
  salario_mensual: number;
  nivel: number;
  xp: number;
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
  tipo: "factura_inesperada" | "imprevisto_medico" | "bono_inesperado" | "oferta_sospechosa";
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
export interface Database {
  public: {
    Tables: {
      colegios: {
        Row: Colegio;
        Insert: Partial<Colegio>;
        Update: Partial<Colegio>;
        Relationships: [];
      };
      perfiles: {
        Row: Perfil;
        Insert: Partial<Perfil>;
        Update: Partial<Perfil>;
        Relationships: [];
      };
      personajes: {
        Row: Personaje;
        Insert: Partial<Personaje>;
        Update: Partial<Personaje>;
        Relationships: [];
      };
      transacciones: {
        Row: Transaccion;
        Insert: Partial<Transaccion>;
        Update: Partial<Transaccion>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
