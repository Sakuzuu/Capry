import { signOut } from "@/app/auth/actions";
import Link from "next/link";

export function SiteHeader({ email }: { email?: string }) {
  return (
    <header className="site-header">
      <a className="brand" href="#inicio" aria-label="Capry, ir al inicio">
        <span className="brand-mark" aria-hidden="true">C</span>
        <span>capry<span className="brand-dot">.</span></span>
      </a>
      <div className="header-actions">
        <span className="location-label"><span aria-hidden="true">●</span> Quito, Ecuador</span>
        {email ? (
          <form action={signOut} className="session-actions">
            <span className="session-email" title={email}>{email}</span>
            <button type="submit">Salir</button>
          </form>
        ) : <Link className="session-link" href="/acceder">Entrar</Link>}
      </div>
    </header>
  );
}
