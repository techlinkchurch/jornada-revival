import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CheckpointCard, type CheckpointStatus } from "@/components/CheckpointCard";
import { BottomNav } from "@/components/BottomNav";
import { OnboardingModal } from "@/components/OnboardingModal";
import { Trophy, Flame, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

type Jornada = {
  id: string;
  dia_number: number;
  dia_label: string | null;
  titulo: string | null;
  preletores: string[] | null;
  data_real: string | null;
  censored: boolean;
};

type Progresso = {
  jornada_id: string;
  qr_code_escaneado: boolean;
  quiz_concluido: boolean;
  pontos_acumulados: number;
};

const slugify = (text: string) => 
  text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

function Dashboard() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [progresso, setProgresso] = useState<Record<string, Progresso>>({});
  const [rank, setRank] = useState<{ position: number; total: number } | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [revealedJornadas, setRevealedJornadas] = useState<Record<string, { titulo: string | null; preletores: string[] | null }>>({});
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      console.log("No user found, redirecting to login...");
      navigate({ to: "/login", replace: true });
    }
  }, [user, loading, navigate]);

  // Abre onboarding automaticamente no primeiro acesso
  useEffect(() => {
    if (profile && profile.onboarding_visto === false) {
      setShowOnboarding(true);
    }
  }, [profile?.onboarding_visto]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setDataLoading(true);
        console.log("Fetching dashboard data for user:", user.id);
        const [{ data: js }, { data: pg }, { data: rk }] = await Promise.all([
          supabase.rpc("get_jornadas_seguras", { p_user_id: user.id }),
          supabase.from("progresso_usuario").select("jornada_id, qr_code_escaneado, quiz_concluido, pontos_acumulados").eq("user_id", user.id),
          supabase.rpc("get_user_rank", { target_user_id: user.id }),
        ]);
        
        console.log("Jornadas fetched:", js?.length);
        setJornadas((js ?? []) as Jornada[]);
        
        const map: Record<string, Progresso> = {};
        (pg ?? []).forEach((p) => { map[p.jornada_id] = p as Progresso; });
        setProgresso(map);
        
        if (rk && rk[0]) {
          setRank({ position: Number(rk[0].position), total: Number(rk[0].total_users) });
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setDataLoading(false);
      }
    })();
  }, [user?.id]);

  if (loading || (!user && !loading)) return <FullScreenLoader />;
  if (!user) return null;

  // Determine status: locked / live / unlocked / done
  // "live" = current turn the user can scan now (first not-yet-unlocked turn)
  const computeStatus = (j: Jornada): CheckpointStatus => {
    const p = progresso[j.id];
    if (p?.quiz_concluido) return "done";
    if (p?.qr_code_escaneado) return "unlocked";
    // not unlocked yet — is previous turn unlocked or this is turn 1?
    if (j.dia_number === 1) return "live";
    const prev = jornadas.find((x) => x.dia_number === j.dia_number - 1);
    if (prev && progresso[prev.id]?.qr_code_escaneado) return "live";
    return "locked";
  };

  const handleReveal = async (jornadaId: string) => {
    const { data } = await supabase.from("jornadas").select("titulo, preletores").eq("id", jornadaId).single();
    if (data) setRevealedJornadas((prev) => ({ ...prev, [jornadaId]: data as { titulo: string | null; preletores: string[] | null } }));
  };

  const totalPoints = profile?.total_points ?? 0;
  const completedDays = profile?.completed_days ?? 0;
  const isPrivileged = profile?.role === 'admin' || profile?.role === 'pastor';

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header
        className="noise-overlay relative animate-gradient overflow-hidden px-5 pb-6 pt-10"
        style={{ background: "var(--gradient-festival)" }}
      >
        <div className="relative z-10">
          <p className="font-script text-lg text-white opacity-80">Olá,</p>
          <h1 className="font-display text-3xl leading-tight tracking-wider text-white">
            {((profile?.full_name ?? "Avivado").split(" ")[0]).toUpperCase()}
          </h1>
        </div>
        <style>{`
          @keyframes rvl-spy {
            0%,100% { transform: translateY(0px)  rotate(0deg); }
            35%     { transform: translateY(-7px) rotate(-1.5deg); }
            70%     { transform: translateY(-3px) rotate(1deg); }
          }
          .rvl-espionando { animation: rvl-spy 3.8s ease-in-out infinite; transform-origin: bottom center; }
        `}</style>
        {/* Wrapper empurra além da borda direita; overflow-hidden do header recorta */}
        <div
          className="pointer-events-none absolute bottom-0 right-0"
          style={{ transform: "translateX(55px)" }}
        >
          <img
            src="/images/rivaldo-png/rivaldo-espionando-2.webp"
            alt=""
            aria-hidden
            draggable={false}
            className="rvl-espionando block select-none"
            style={{ height: "148px", width: "148px", objectFit: "contain" }}
          />
        </div>
      </header>

      {/* Stats */}
      <section className="-mt-4 relative z-20 px-5">
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-background p-4 shadow-sm">
          <Stat icon={<Flame className="h-4 w-4 text-orange" />} label="Pontos" value={totalPoints} />
          <Stat icon={<Trophy className="h-4 w-4 text-yellow" />} label="Posição" value={rank ? `${rank.position}º` : "—"} />
          <Stat label="Turnos" value={`${completedDays}/3`} />
        </div>
      </section>

      {/* Checkpoints */}
      <section className="px-5 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl tracking-wider text-orange">SUA JORNADA</h2>
            <button
              onClick={() => setShowOnboarding(true)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-orange/10 text-orange transition-colors hover:bg-orange/20 active:scale-95"
              aria-label="Como funciona"
            >
              <GraduationCap className="h-4 w-4" />
            </button>
          </div>
          <Link to="/ranking" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-orange">
            Ver ranking →
          </Link>
        </div>

        {dataLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-black/[0.06]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {jornadas.map((j) => {
              const revealed = revealedJornadas[j.id];
              const isCensored = j.censored && !revealed;
              return (
                <CheckpointCard
                  key={j.id}
                  dayNumber={j.dia_number}
                  dayLabel={j.dia_label ?? `Turno ${j.dia_number}`}
                  title={revealed?.titulo ?? j.titulo}
                  slug={slugify(j.dia_label ?? `turno-${j.dia_number}`)}
                  preletores={revealed?.preletores ?? j.preletores}
                  pontos={progresso[j.id]?.pontos_acumulados ?? 0}
                  status={computeStatus(j)}
                  isPrivileged={isPrivileged}
                  isCensored={isCensored}
                  onReveal={isPrivileged && j.censored && !revealed ? () => handleReveal(j.id) : undefined}
                />
              );
            })}
          </div>
        )}
      </section>

      <BottomNav />

      {showOnboarding && user && (
        <OnboardingModal
          userId={user.id}
          onClose={() => { setShowOnboarding(false); refreshProfile(); }}
        />
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center justify-center py-2">
      <div className="mb-1.5 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-foreground opacity-60">
        {icon} <span>{label}</span>
      </div>
      <div className="font-display text-3xl font-bold tracking-wider text-ink">{value}</div>
    </div>
  );
}

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="font-display text-2xl tracking-widest text-orange">CARREGANDO…</div>
    </div>
  );
}
