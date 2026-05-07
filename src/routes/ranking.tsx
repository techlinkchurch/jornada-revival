import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
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
  position?: number;
  rank_pos?: number;
};

function RankingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<RankRow[]>([]);
  const [meRank, setMeRank] = useState<{ position: number; total: number; points: number } | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoadingData(true);
    (async () => {
      try {
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
      } catch (err) {
        console.error("Error loading ranking data:", err);
      } finally {
        setLoadingData(false);
      }
    })();
  }, [user?.id]);

  if (loading) return <Loader />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header
        className="noise-overlay relative animate-gradient overflow-hidden px-5 pb-8 pt-10"
        style={{ background: "var(--gradient-festival)" }}
      >
        <Link to="/dashboard" className="relative z-10 mb-3 inline-flex items-center gap-2 text-sm text-white/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Jornada
        </Link>
        <div className="relative z-10 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/60">Pódio</p>
            <h1 className="font-display text-4xl leading-none tracking-wider text-white">RANKING</h1>
          </div>
        </div>
        {/* Rivaldo no pódio — empurrado além da borda direita, recortado pelo overflow-hidden */}
        <div
          className="pointer-events-none absolute bottom-0 right-0"
          style={{ transform: "translateX(20px)" }}
        >
          <img
            src="/images/rivaldo-png/rivaldo-podio.webp"
            alt=""
            aria-hidden
            draggable={false}
            className="block select-none"
            style={{ height: "140px", width: "140px", objectFit: "contain" }}
          />
        </div>
      </header>

      {/* Self position banner */}
      {meRank && (
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
            {[0,1,2,3,4].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-black/[0.06]" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-muted-foreground shadow-sm">
            Ainda não há pontuação para este turno.
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((r, i) => {
              const pos = Number(r.position ?? r.rank_pos ?? i + 1);
              const id = r.id ?? r.user_id;
              const name = (r.name ?? r.full_name ?? r.email ?? "Anônimo")!;
              const pts = Math.round(Number(r.total_points ?? 0));
              const isMe = id === user.id;
              return (
                <li
                  key={`${id}-${i}`}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors shadow-sm ${
                    isMe ? "border-orange/50 bg-orange/5"
                    : pos <= 3 ? "border-yellow/30 bg-yellow/5" : "border-border bg-white"
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

function PositionBadge({ pos, isMe }: { pos: number; isMe: boolean }) {
  let style = "bg-muted/30 text-ink/70";
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
