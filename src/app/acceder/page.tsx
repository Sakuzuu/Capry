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
  searchParams: Promise<{ error?: string; mensaje?: string; modo?: string }>;
}) {
  if (await getCurrentUser()) redirect("/");
  const params = await searchParams;
  const isSigningUp = params.modo === "registro";
  const message = params.error ? messages[params.error] : null;

  return (
    <div className="access-page">
      <header className="access-header">
        <Link className="brand" href="/" aria-label="Capry, ir al inicio">
          <span className="brand-mark" aria-hidden="true">C</span>
          <span>capry<span className="brand-dot">.</span></span>
        </Link>
        <Link className="access-back" href="/">Volver al mapa <span aria-hidden="true">↗</span></Link>
      </header>
      <main className="access-main">
        <div className="access-content">
          <div className="access-content-inner">
            <div className="access-intro">
              <p className="eyebrow">Tu cuenta en Capry</p>
              <h1 id="access-title">{isSigningUp ? "Crea tu cuenta." : "Iniciar sesión."}</h1>
              <p>Explora las fiestas de Quito libremente. Entra para publicar, confirmar tu asistencia y reportar el aforo.</p>
            </div>
            {message && <p className="form-message" role="alert">{message}</p>}
            {params.mensaje === "correo" && (
              <p className="form-message" role="status">Revisa tu correo para confirmar la cuenta antes de entrar.</p>
            )}
            {isSigningUp ? (
              <>
                <form className="access-form" action={signUp} aria-labelledby="access-title">
                  <label htmlFor="signup-email">Correo electrónico</label>
                  <input id="signup-email" name="email" type="email" autoComplete="email" placeholder="tu@correo.com" required maxLength={254} />
                  <label htmlFor="signup-password">Contraseña</label>
                  <input id="signup-password" name="password" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" required minLength={8} maxLength={128} />
                  <button type="submit">Crear cuenta</button>
                </form>
                <Link className="access-switch" href="/acceder">Ya tengo cuenta · Iniciar sesión</Link>
              </>
            ) : (
              <>
                <form className="access-form" action={signIn} aria-labelledby="access-title">
                  <label htmlFor="login-email">Correo electrónico</label>
                  <input id="login-email" name="email" type="email" autoComplete="email" placeholder="tu@correo.com" required maxLength={254} />
                  <label htmlFor="login-password">Contraseña</label>
                  <input id="login-password" name="password" type="password" autoComplete="current-password" placeholder="Tu contraseña" required minLength={8} maxLength={128} />
                  <button type="submit">Iniciar sesión</button>
                </form>
                <Link className="access-switch" href="/acceder?modo=registro">Registrarme</Link>
              </>
            )}
          </div>
        </div>
        <div className="access-visual" aria-hidden="true" />
      </main>
    </div>
  );
}
