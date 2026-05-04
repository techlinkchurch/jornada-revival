import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, QrCode, Lock, Sparkles, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Quiz } from "@/components/Quiz";
import { toast } from "sonner";

export const Route = createFileRoute("/jornada/$dia")({
  component: TurnoPage,
});

type Jornada = {
  id: string;
  dia_number: number;
  dia_label: string | null;
  titulo: string | null;
  preletor: string | null;
  igreja_preletor: string | null;
  versiculo_texto: string | null;
  versiculo_referencia: string | null;
  ensinamentos: string[] | null;
  video_url_proximo_dia: string | null;
};

type Progresso = {
  id: string;
  qr_code_escaneado: boolean;
  quiz_concluido: boolean;
  quiz_score: number;
  pontos_acumulados: number;
};

function TurnoPage() {
  const { user, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { dia } = Route.useParams();
  const dayNumber = parseInt(dia, 10);

  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [progresso, setProgresso] = useState<Progresso | null>(null);
  const [token, setToken] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const reload = async () => {
    if (!user) return;
    const { data: j } = await supabase.from("jornadas").select("*").eq("dia_number", dayNumber).maybeSingle();
    if (!j) { setPageLoading(false); return; }
    setJornada(j as Jornada);
    const { data: p } = await supabase
      .from("progresso_usuario")
      .select("id, qr_code_escaneado, quiz_concluido, quiz_score, pontos_acumulados")
      .eq("user_id", user.id)
      .eq("jornada_id", j.id)
      .maybeSingle();
    setProgresso(p as Progresso | null);
    setPageLoading(false);
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [user, dayNumber]);

  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" />;

  const unlocked = !!progresso?.qr_code_escaneado;
  const quizDone = !!progresso?.quiz_concluido;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlocking(true);
    const { data, error } = await supabase.functions.invoke("unlock-checkpoint", {
      body: { day_number: dayNumber, token: token.trim().toUpperCase() },
    });
    setUnlocking(false);
    if (error || (data && !data.success)) {
      const msg = (data && data.error) || error?.message || "Não foi possível desbloquear.";
      toast.error(msg);
      return;
    }
    toast.success("Turno desbloqueado! +100 pontos");
    setToken("");
    await reload();
    await refreshProfile();
  };

  if (pageLoading || !jornada) return <Loader />;

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Top bar */}
      <header
        className="noise-overlay relative overflow-hidden px-5 pb-6 pt-10"
        style={{ background: unlocked ? "var(--gradient-fire)" : "linear-gradient(135deg,#2a2a2a,#1a1a1a)" }}
      >
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className={`relative z-10 mb-3 inline-flex items-center gap-2 text-sm ${unlocked ? "text-ink/70 hover:text-ink" : "text-muted-foreground hover:text-foreground"}`}
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="relative z-10">
          <p className={`text-[10px] font-extrabold uppercase tracking-[0.2em] ${unlocked ? "text-ink/60" : "text-muted-foreground"}`}>
            Turno {jornada.dia_number} · {jornada.dia_label}
          </p>
          <h1 className={`mt-1 font-display text-4xl leading-none tracking-wider ${unlocked ? "text-ink" : "text-foreground"}`}>
            {(jornada.titulo ?? "").toUpperCase()}
          </h1>
          {jornada.preletor && (
            <p className={`mt-2 text-sm ${unlocked ? "text-ink/60" : "text-muted-foreground"}`}>
              com {jornada.preletor}
              {jornada.igreja_preletor && ` · ${jornada.igreja_preletor}`}
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-6 px-5 py-6">
        {!unlocked ? (
          <UnlockSection token={token} setToken={setToken} unlocking={unlocking} onSubmit={handleUnlock} dayNumber={dayNumber} />
        ) : (
          <UnlockedContent
            jornada={jornada}
            quizDone={quizDone}
            quizScore={progresso?.quiz_score ?? 0}
            pontos={progresso?.pontos_acumulados ?? 0}
            onStartQuiz={() => setShowQuiz(true)}
          />
        )}
      </main>

      {showQuiz && jornada && (
        <Quiz
          jornadaId={jornada.id}
          onClose={() => setShowQuiz(false)}
          onComplete={async () => {
            setShowQuiz(false);
            await reload();
            await refreshProfile();
          }}
        />
      )}
    </div>
  );
}

function UnlockSection({
  token, setToken, unlocking, onSubmit, dayNumber,
}: {
  token: string;
  setToken: (v: string) => void;
  unlocking: boolean;
  onSubmit: (e: React.FormEvent) => void;
  dayNumber: number;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange/10">
          <Lock className="h-6 w-6 text-orange" />
        </div>
        <h2 className="mb-2 font-display text-2xl tracking-wider text-foreground">CHECKPOINT BLOQUEADO</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Encontre o QR Code no templo após a pregação para liberar o conteúdo deste turno e ganhar <span className="font-semibold text-orange">+100 pontos</span>.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Não consegue escanear? Digite o código:
        </p>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="relative">
            <QrCode className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={`RVL2026D${dayNumber}`}
              className="w-full rounded-lg border-[1.5px] border-input bg-input px-3 py-3 pl-10 font-mono text-sm uppercase tracking-wider text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-4 focus:ring-orange/20"
              required
            />
          </div>
          <button
            type="submit"
            disabled={unlocking || !token.trim()}
            className="w-full rounded-xl bg-primary px-6 py-3 font-display text-base tracking-widest text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {unlocking ? "DESBLOQUEANDO…" : "DESBLOQUEAR"}
          </button>
        </form>
      </div>
    </div>
  );
}

function UnlockedContent({
  jornada, quizDone, quizScore, pontos, onStartQuiz,
}: {
  jornada: Jornada;
  quizDone: boolean;
  quizScore: number;
  pontos: number;
  onStartQuiz: () => void;
}) {
  return (
    <>
      {/* Score banner */}
      <div className="flex items-center justify-between rounded-2xl border border-orange/40 bg-orange/5 px-5 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pontos no turno</p>
          <p className="font-display text-3xl text-orange">{Math.round(pontos)} PTS</p>
        </div>
        <Sparkles className="h-6 w-6 text-yellow" />
      </div>

      {/* Versículo */}
      {jornada.versiculo_texto && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-orange">Versículo Chave</p>
          <p className="text-base leading-relaxed text-foreground">"{jornada.versiculo_texto}"</p>
          {jornada.versiculo_referencia && (
            <p className="mt-3 font-script text-xl text-yellow">— {jornada.versiculo_referencia}</p>
          )}
        </div>
      )}

      {/* Vídeo */}
      {jornada.video_url_proximo_dia && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-orange">Vídeo do Preletor</p>
          <div className="aspect-video overflow-hidden rounded-lg bg-black">
            <iframe
              src={jornada.video_url_proximo_dia}
              className="h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title="Vídeo do turno"
            />
          </div>
        </div>
      )}

      {/* Ensinamentos */}
      {jornada.ensinamentos && jornada.ensinamentos.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-orange">Ensinamentos</p>
          <ul className="space-y-2">
            {jornada.ensinamentos.map((e, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange" />
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quiz CTA */}
      {!quizDone ? (
        <button
          onClick={onStartQuiz}
          className="w-full rounded-2xl bg-gradient-to-br from-orange to-red px-6 py-5 font-display text-2xl tracking-widest text-primary-foreground shadow-[var(--shadow-glow-orange)] transition-transform active:scale-[0.98]"
          style={{ backgroundImage: "var(--gradient-fire)" }}
        >
          <span className="block">JOGAR QUIZ</span>
          <span className="block text-xs font-sans font-semibold tracking-wider opacity-80">Até +300 pontos · seja rápido!</span>
        </button>
      ) : (
        <div className="rounded-2xl border border-success/40 bg-success/5 p-5 text-center">
          <Trophy className="mx-auto mb-2 h-8 w-8 text-yellow" />
          <p className="font-display text-2xl tracking-wider text-foreground">QUIZ CONCLUÍDO</p>
          <p className="mt-1 text-sm text-muted-foreground">Você marcou <span className="font-semibold text-orange">{Math.round(quizScore)} pontos</span> neste quiz.</p>
        </div>
      )}

      <Link to="/ranking" className="block text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-orange">
        Ver ranking →
      </Link>
    </>
  );
}

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="font-display text-2xl tracking-widest text-orange">CARREGANDO…</div>
    </div>
  );
}
