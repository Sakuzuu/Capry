export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="#inicio" aria-label="Capry, ir al inicio">
        <span className="brand-mark" aria-hidden="true">C</span>
        <span>capry<span className="brand-dot">.</span></span>
      </a>
      <span className="location-label"><span aria-hidden="true">●</span> Quito, Ecuador</span>
    </header>
  );
}
