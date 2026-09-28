import Ajv, { type AnySchema } from "ajv";

const ajv = new Ajv({ allErrors: true, strict: false });

export function validarRespuestaEstructurada<T>(
  texto: string,
  schema: object,
): T | null {
  try {
    const value: unknown = JSON.parse(texto);
    const validate = ajv.compile<T>(schema as AnySchema);
    return validate(value) ? (value as T) : null;
  } catch {
    return null;
  }
}
