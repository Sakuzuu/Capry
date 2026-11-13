import { SectionHeading } from "@/components/section-heading";
import { AttendanceCard } from "@/features/attendance/attendance-card";
import { CrowdCard } from "@/features/crowd/crowd-card";

export function SignalsSection() {
  return (
    <section className="signals" id="como-funciona" aria-labelledby="signals-title">
      <SectionHeading
        eyebrow="Dos señales, una mejor idea"
        id="signals-title"
        title="Decide con información de la comunidad"
      />
      <div className="signal-grid">
        <AttendanceCard />
        <CrowdCard />
      </div>
    </section>
  );
}
