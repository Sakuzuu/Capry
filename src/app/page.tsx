import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/features/home/hero";
import { SignalsSection } from "@/features/home/signals-section";
import { MapSection } from "@/features/map/map-section";

export default function HomePage() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main id="inicio">
        <Hero />
        <MapSection />
        <SignalsSection />
      </main>
      <SiteFooter />
    </div>
  );
}
