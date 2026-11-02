import { redirect } from "next/navigation";
import Link from "next/link";
import { signIn, signUp } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";

const messages: Record<string, string> = {
  datos: "Revisa el correo y usa una contraseña de 8 a 128 caracteres.",
  acceso: "No se pudo iniciar sesión. Revisa tus datos y confirma tu correo si es necesario.",
  registro: "No se pudo crear la cuenta. Inténtalo de nuevo.",
  confirmacion: "No pudimos confirmar el correo. Vuelve a intentar el registro.",
};

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mensaje?: string }>;
}) {
  if (await getCurrentUser()) redirect("/");
  const params = await searchParams;
  const message = params.error ? messages[params.error] : null;

  return (
    <main className="access-page">
      <Link className="access-back" href="/">← Volver a Capry</Link>
      <div className="access-intro">
        <p className="eyebrow">Tu cuenta</p>
        <h1>Comparte lo que pasa en Quito.</h1>
        <p>Explorar es libre. Necesitas una cuenta para publicar, confirmar asistencia o reportar el aforo.</p>
      </div>
      {message && <p className="form-message" role="alert">{message}</p>}
      {params.mensaje === "correo" && (
        <p className="form-message" role="status">Revisa tu correo para confirmar la cuenta antes de entrar.</p>
      )}
      <div className="access-forms">
        <section className="access-card" aria-labelledby="login-title">
          <h2 id="login-title">Iniciar sesión</h2>
          <form action={signIn}>
            <label htmlFor="login-email">Correo</label>
            <input id="login-email" name="email" type="email" autoComplete="email" required maxLength={254} />
            <label htmlFor="login-password">Contraseña</label>
            <input id="login-password" name="password" type="password" autoComplete="current-password" required minLength={8} maxLength={128} />
            <button type="submit">Entrar</button>
          </form>
        </section>
        <section className="access-card" aria-labelledby="signup-title">
          <h2 id="signup-title">Crear cuenta</h2>
          <form action={signUp}>
            <label htmlFor="signup-email">Correo</label>
            <input id="signup-email" name="email" type="email" autoComplete="email" required maxLength={254} />
            <label htmlFor="signup-password">Contraseña</label>
            <input id="signup-password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
            <button type="submit">Registrarme</button>
          </form>
        </section>
      </div>
    </main>
  );
}
