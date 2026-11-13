export function AttendanceCard() {
  return (
    <article className="signal-card">
      <span className="signal-number">01 / ANTES</span>
      <div className="attendance-preview" aria-hidden="true">
        <span className="attendance-preview-icon">↗</span>
        <span className="attendance-preview-line" />
        <span className="attendance-preview-point one" />
        <span className="attendance-preview-point two" />
        <span className="attendance-preview-point three" />
      </div>
      <h3>Personas que planean ir</h3>
      <p>Consulta cuántas personas han indicado que quieren asistir a una fiesta futura.</p>
    </article>
  );
}
