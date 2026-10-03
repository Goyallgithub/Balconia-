import { DiwaliRibbon } from "@/components/DiwaliRibbon";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { DesktopWhatsApp } from "@/components/DesktopWhatsApp";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DiwaliRibbon />
      <Nav />
      <main id="main" className="min-h-[60svh]">
        {children}
      </main>
      <Footer />
      <CartDrawer />
      <MobileBottomBar />
      <DesktopWhatsApp />
    </>
  );
}
