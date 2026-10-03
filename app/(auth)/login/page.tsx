import { LoginForm } from "./login-form";

const AVISOS: Record<string, string> = {
  cuenta_desactivada:
    "Tu cuenta fue desactivada. Si crees que es un error, contacta a tu institución.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>;
}) {
  const { motivo } = await searchParams;
  return <LoginForm aviso={motivo ? AVISOS[motivo] : undefined} />;
}
