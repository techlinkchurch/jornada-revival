import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Award, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/perfil")({
  component: PerfilPage,
});

type Journey = { day_number: number; title: string | null; completed: boolean; points_earned: number };
type Conquista = { id: string; name: string | null; description: string | null };

function PerfilPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [journey, setJourney] = useState<Journey[]>([]);
  const [conquistas, setConquistas] = useState<Conquista[]>([]);
  const [rank, setRank] = useState<{ position: number; total: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: jd }, { data: cq }, { data: rk }] = await Promise.all([
        supabase.rpc("get_user_journey_details", { target_user_id: user.id }),
        supabase.from("conquistas_config").select("id, name, description"),
        supabase.rpc("get_user_rank", { target_user_id: user.id }),
      ]);
      setJourney((jd ?? []) as Journey[]);
      setConquistas((cq ?? []) as Conquista[]);
      if (rk && rk[0]) setRank({ position: Number(rk[0].position), total: Number(rk[0].total_users) });
    })();
  }, [user]);

  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" />;

  const userAchievements = profile?.achievements ?? [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header
        className="noise-overlay relative overflow-hidden px-5 pb-10 pt-10"
        style={{ background: "var(--gradient-fire)" }}
      >
        <Link to="/dashboard" className="relative z-10 mb-4 inline-flex items-center gap-2 text-sm text-ink/70 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Jornada
        </Link>
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-2 border-ink/20 bg-ink/10 font-display text-2xl text-ink">
            {(profile?.full_name ?? "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl leading-tight tracking-wider text-ink">
              {(profile?.full_name ?? "Avivado").toUpperCase()}
            </h1>
            <p className="truncate text-xs text-ink/60">{profile?.email}</p>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="-mt-6 px-5">
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-4 shadow-lg">
          <Stat label="Pontos" value={profile?.total_points ?? 0} />
          <Stat label="Posição" value={rank ? `${rank.position}º` : "—"} />
          <Stat label="Turnos" value={`${profile?.completed_days ?? 0}/4`} />
        </div>
      </div>

      {/* Jornada */}
      <section className="px-5 py-6">
        <h2 className="mb-3 font-display text-2xl tracking-wider text-orange">MINHA JORNADA</h2>
        <ul className="space-y-2">
          {journey.map((j) => (
            <li
              key={j.day_number}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                j.completed ? "border-success/40 bg-success/5" : "border-border bg-card"
              }`}
            >
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full font-display text-base ${
                j.completed ? "bg-success/30 text-success" : "bg-cream/10 text-muted-foreground"
              }`}>
                {j.completed ? <Check className="h-4 w-4" strokeWidth={3} /> : j.day_number}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{j.title ?? `Turno ${j.day_number}`}</p>
                <p className="text-[11px] text-muted-foreground">
                  {j.completed ? "Quiz concluído" : "Aguardando"}
                </p>
              </div>
              <span className="font-display text-lg tracking-wider text-orange">{Math.round(j.points_earned)}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Conquistas */}
      <section className="px-5 pb-8">
        <h2 className="mb-3 font-display text-2xl tracking-wider text-orange">CONQUISTAS</h2>
        <div className="grid grid-cols-2 gap-3">
          {conquistas.map((c) => {
            const unlocked = userAchievements.includes(c.id);
            return (
              <div
                key={c.id}
                className={`rounded-2xl border p-4 ${
                  unlocked ? "border-yellow/40 bg-yellow/5" : "border-border bg-card opacity-60"
                }`}
              >
                <Award className={`mb-2 h-6 w-6 ${unlocked ? "text-yellow" : "text-muted-foreground"}`} />
                <p className="text-sm font-bold text-foreground">{c.name}</p>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{c.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="px-5 pb-2">
        <button
          onClick={signOut}
          className="w-full rounded-xl border border-border px-6 py-3 text-sm font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-red/50 hover:text-red"
        >
          Sair da conta
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-2xl tracking-wider text-foreground">{value}</div>
    </div>
  );
}

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="font-display text-2xl tracking-widest text-orange">CARREGANDO…</div>
    </div>
  );
}
