export default function AuthCard({ children }) {
  return (
    <main className="page-shell">
      <section className="w-full max-w-md rounded-2xl border border-sky-300/10 bg-app-card/95 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
        {children}
      </section>
    </main>
  );
}
