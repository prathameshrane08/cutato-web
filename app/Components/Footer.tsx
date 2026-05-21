export default function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-white/60">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} CUTATO</p>
          <p className="text-white/50">Haircut booking & salon finder • Web version</p>
        </div>
      </div>
    </footer>
  );
}