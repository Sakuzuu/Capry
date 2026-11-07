import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/features/home/hero";
import { SignalsSection } from "@/features/home/signals-section";
import { MapSection } from "@/features/map/map-section";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  return (
    <div className="site-shell">
      <SiteHeader email={user?.email} />
      <main id="inicio">
        <Hero />
        <MapSection canPublish={Boolean(user)} />
        <SignalsSection />
      </main>
      <SiteFooter />
    </div>
  );
}
