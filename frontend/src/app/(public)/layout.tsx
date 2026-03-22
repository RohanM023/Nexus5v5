import { Navbar } from "@/components/ui/navbar";
import { LegalFooter } from "@/components/ui/legal-footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <Navbar />
      <main className="flex-1">{children}</main>
      <LegalFooter />
    </div>
  );
}
