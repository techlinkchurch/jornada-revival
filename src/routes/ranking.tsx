import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/ranking")({
  component: RankingPage,
});

type RankRow = {
  id?: string;
  user_id?: string;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  image_url?: string | null;
  total_points?: number;
  points_in_turno?: number;
  position?: number;
  rank_pos?: number;
};

type Turno = { dia_number: number; dia_label: string | null };

function RankingPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"geral" | number>("geral");
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [rows, setRows] = useState<RankRow[]>([]);
  const [meRank, setMeRank] = useState<{ position: number; total: number; points: number } | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    supabase.from("jornadas").select("dia_number, dia_label").order("dia_number").then(({ data }) => {
      setTurnos((data ?? []) as Turno[]);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoadingData(true);
    (async () => {
      if (tab === "geral") {
        const [{ data }, { data: me }] = await Promise.all([
          supabase.rpc("get_ranking", { limit_count: 100 }),
          supabase.rpc("get_user_rank", { target_user_id: user.id }),
        ]);
        setRows((data ?? []) as RankRow[]);
        if (me && me[0]) {
          setMeRank({
            position: Number(me[0].position),
            total: Number(me[0].total_users),
            points: Number(me[0].user_total_points),
          });
        }
      } else {
        const { data } = await supabase.rpc("get_turno_ranking", { p_turno_number: tab, p_limit: 100 });
        setRows((data ?? []) as RankRow[]);
        setMeRank(null);
      }
      setLoadingData(false);
    })();
  }, [tab, user]);

  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header
        className="noise-overlay relative animate-gradient overflow-hidden px-5 pb-8 pt-10"
        style={{ background: "var(--gradient-festival)" }}
      >
        <Link to="/dashboard" className="relative z-10 mb-3 inline-flex items-center gap-2 text-sm text-ink/70 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Jornada
        </Link>
        <div className="relative z-10 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-ink/60">Pódio</p>
            <h1 className="font-display text-4xl leading-none tracking-wider text-ink">RANKING</h1>
          </div>
          <Trophy className="h-10 w-10 text-ink/70" />
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-0 z-20 -mt-4 px-5">
        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-2 shadow-lg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabBtn active={tab === "geral"} onClick={() => setTab("geral")}>Geral</TabBtn>
          {turnos.map((t) => (
            <TabBtn key={t.dia_number} active={tab === t.dia_number} onClick={() => setTab(t.dia_number)}>
              T{t.dia_number}
            </TabBtn>
          ))}
        </div>
      </div>

      {/* Self position banner */}
      {tab === "geral" && meRank && (
        <div className="mx-5 mt-4 flex items-center justify-between rounded-2xl border border-orange/40 bg-orange/5 px-5 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sua posição</p>
            <p className="font-display text-3xl tracking-wider text-orange">
              {meRank.position}º <span className="text-sm text-muted-foreground">/ {meRank.total}</span>
            </p>
          </div>
          <span className="font-display text-2xl text-yellow">{meRank.points} PTS</span>
        </div>
      )}

      {/* List */}
      <section className="px-5 py-5">
        {loadingData ? (
          <div className="space-y-2">
            {[0,1,2,3,4].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-card" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Ainda não há pontuação para este turno.
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((r, i) => {
              const pos = Number(r.position ?? r.rank_pos ?? i + 1);
              const id = r.id ?? r.user_id;
              const name = (r.name ?? r.full_name ?? r.email ?? "Anônimo")!;
              const pts = Math.round(Number(r.total_points ?? r.points_in_turno ?? 0));
              const isMe = id === user.id;
              return (
                <li
                  key={`${id}-${i}`}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                    isMe ? "border-orange/50 bg-orange/5"
                    : pos <= 3 ? "border-yellow/30 bg-yellow/5" : "border-border bg-card"
                  }`}
                >
                  <PositionBadge pos={pos} isMe={isMe} />
                  <Avatar name={name} url={r.avatar_url ?? r.image_url ?? null} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {name} {isMe && <span className="text-[10px] font-bold uppercase tracking-widest text-orange">· você</span>}
                    </p>
                  </div>
                  <span className={`font-display text-xl tracking-wider ${
                    pos === 1 ? "text-yellow" : pos === 2 ? "text-cream/70" : pos === 3 ? "text-[#CD9F5A]" : "text-orange"
                  }`}>
                    {pts}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <BottomNav />
    </div>
  );
}

function TabBtn({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 rounded-lg px-4 py-2 font-display text-sm tracking-wider transition-all ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function PositionBadge({ pos, isMe }: { pos: number; isMe: boolean }) {
  let style = "bg-cream/10 text-muted-foreground";
  if (pos === 1) style = "text-ink";
  else if (pos === 2) style = "text-ink";
  else if (pos === 3) style = "text-cream";
  if (isMe) style = "border-[1.5px] border-orange/50 bg-cream/5 text-orange";

  return (
    <div
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-display text-sm ${style}`}
      style={{
        background: isMe ? undefined
          : pos === 1 ? "var(--gradient-gold)"
          : pos === 2 ? "var(--gradient-silver)"
          : pos === 3 ? "var(--gradient-bronze)"
          : undefined,
      }}
    >
      {pos}
    </div>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const initials = name.split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
  if (url) {
    return <img src={url} alt={name} className="h-9 w-9 flex-shrink-0 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-primary-foreground" style={{ background: "var(--gradient-fire)" }}>
      {initials}
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
