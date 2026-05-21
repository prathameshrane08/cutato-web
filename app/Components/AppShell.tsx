import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({
  children,
  title,
  showSearch = true,
}: {
  children: React.ReactNode;
  title?: string;
  showSearch?: boolean;
}) {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          <aside className="hidden md:block">
            <Sidebar />
          </aside>

          <section className="min-w-0">
            <Topbar title={title} showSearch={showSearch} />
            <div className="mt-6">{children}</div>
          </section>
        </div>
      </div>
    </main>
  );
}