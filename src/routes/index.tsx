import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="font-display text-2xl tracking-widest text-orange animate-pulse">CARREGANDO…</div>
      </div>
    );
  }

  // If user is not logged in, show landing page
  if (!user) {
    return (
      <div className="relative flex min-h-screen flex-col bg-background">
        {/* Hero */}
        <header
          className="noise-overlay relative animate-gradient overflow-hidden px-6 pb-10 pt-16 text-center"
          style={{ background: "var(--gradient-festival)" }}
        >
          <div className="relative z-10 mx-auto max-w-md">
            <p className="mb-3 font-script text-2xl text-white opacity-80">a sua jornada na</p>
            <h1 className="font-display text-6xl leading-none tracking-wider text-white sm:text-7xl">
              REVIVAL
              <br />
              CONFERENCE
            </h1>
            <p className="mx-auto mt-4 max-w-xs text-sm font-semibold uppercase tracking-[0.18em] text-white opacity-80">
              2 dias · 3 turnos · 1 jornada
            </p>
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-center px-6 py-10">
          <div className="mx-auto w-full max-w-md space-y-4 text-center">
            <h2 className="font-display text-3xl tracking-wider text-foreground">
              JOGUE, APRENDA, VIVA O AVIVAMENTO
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Escaneie o QR Code na nave após cada pregação, libere conteúdos
              exclusivos, responda quizzes-relâmpago e suba no ranking do evento.
            </p>

            <div className="space-y-3 pt-4">
              <Link
                to="/cadastro"
                className="block rounded-xl bg-primary px-6 py-4 text-center font-display text-xl tracking-widest text-primary-foreground shadow-[var(--shadow-glow-orange)] transition-transform active:scale-[0.98]"
              >
                CRIAR MINHA CONTA
              </Link>
              <Link
                to="/login"
                className="block rounded-xl border-2 border-cream/30 px-6 py-4 text-center font-display text-xl tracking-widest text-foreground transition-colors hover:border-orange/60 hover:text-orange"
              >
                JÁ TENHO CONTA
              </Link>
            </div>
          </div>
        </main>

        <footer className="px-6 pb-6 pt-2 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Link Church · Revival Conference 2026
        </footer>
      </div>
    );
  }

  return null;
}
