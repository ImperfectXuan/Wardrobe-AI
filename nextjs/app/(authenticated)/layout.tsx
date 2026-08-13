import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <Navbar />
      <div className="flex min-h-[calc(100dvh-3.5rem)]">
        <Sidebar />
        <main className="min-w-0 flex-1 p-4 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] md:px-6 md:pt-6 lg:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
