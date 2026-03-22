import { Navbar } from "@/components/ui/navbar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
