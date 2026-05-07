import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, QrCode, Sparkles, Trophy, Info, Pencil, X, Save, Check, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Quiz } from "@/components/Quiz";
import { toast } from "sonner";

export const Route = createFileRoute("/jornada/$dia/$slug")({
  validateSearch: (s: Record<string, unknown>) => {
    const result: { desbloqueado?: "1"; preview?: "1" } = {};
    if (s.desbloqueado === "1") result.desbloqueado = "1";
    if (s.preview === "1") result.preview = "1";
    return result;
  },
  component: TurnoPage,
});

type Jornada = {
  id: string;
  dia_number: number;
  dia_label: string | null;
  titulo: string | null;
  preletores: string[] | null;
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
  video_principal_assistido: boolean;
};

function TurnoPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { dia } = Route.useParams();
  const { desbloqueado, preview } = Route.useSearch();
  const dayNumber = parseInt(dia, 10);

  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [progresso, setProgresso] = useState<Progresso | null>(null);
  const [token, setToken] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const isAdmin = profile?.role === 'admin';
  const isPastor = profile?.role === 'pastor';
  const isPrivileged = isAdmin || isPastor;

  const reload = async () => {
    if (!user) return;
    const { data: j } = await supabase.from("jornadas").select("*").eq("dia_number", dayNumber).maybeSingle();
    if (!j) { setPageLoading(false); return; }
    setJornada(j as Jornada);
    const { data: p } = await supabase
      .from("progresso_usuario")
      .select("id, qr_code_escaneado, quiz_concluido, quiz_score, pontos_acumulados, video_principal_assistido")
      .eq("user_id", user.id)
      .eq("jornada_id", j.id)
      .maybeSingle();
    setProgresso(p as Progresso | null);
    setPageLoading(false);
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [user?.id, dayNumber]);

  useEffect(() => {
    if (desbloqueado || preview) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [desbloqueado, preview]);

  // SSR-safe auth guard — uses navigate() in effect instead of <Navigate> in render body
  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", replace: true });
    }
  }, [loading, user, navigate]);

  if (loading || !user) return <Loader />;

  const unlocked = (isPrivileged && preview === "1") || !!progresso?.qr_code_escaneado;
  const quizDone = !!progresso?.quiz_concluido;
  const videoWatched = !!progresso?.video_principal_assistido;

  const handleVideoWatched = async () => {
    if (!user || !jornada) return;
    const { data, error } = await supabase.functions.invoke("mark-video-watched", {
      body: { jornada_id: jornada.id },
    });
    if (error || !data?.success) return;
    if (data.already_watched || data.preview_mode) return;
    await reload();
    await refreshProfile();
    toast.success("Vídeo assistido! +50 pontos 🎬");
  };

  const handleUnlock = async (inputToken: string) => {
    setUnlocking(true);
    const { data, error } = await supabase.functions.invoke("unlock-checkpoint", {
      body: { day_number: dayNumber, token: inputToken.trim().toUpperCase() },
    });
    setUnlocking(false);
    if (error || (data && !data.success)) {
      const msg = (data && data.error) || error?.message || "Não foi possível desbloquear.";
      toast.error(msg);
      return;
    }
    setToken("");
    setShowCelebration(true);   // cobre a tela antes do reload revelar o conteúdo
    await reload();
    await refreshProfile();
  };

  if (pageLoading || !jornada) return <Loader />;

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Top bar */}
      <header
        className="noise-overlay relative overflow-hidden px-5 pb-6 pt-10"
        style={{ background: unlocked ? "var(--gradient-fire)" : "var(--gradient-festival)" }}
      >
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="relative z-10 mb-3 inline-flex items-center gap-2 text-sm text-white/70 hover:text-white md:mx-auto"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="relative z-10 flex flex-col md:items-center md:text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/60">
            Turno {jornada.dia_number}
          </p>
          <h1 className="mt-1 font-display text-4xl leading-none tracking-wider text-white">
            {(jornada.titulo ?? "").toUpperCase()}
          </h1>
          {jornada.preletores && jornada.preletores.length > 0 && (
            <p className="mt-2 text-sm text-white/60">
              com {jornada.preletores.join(', ')}
            </p>
          )}
          {isPrivileged && (
            <span className="mt-4 inline-block rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
              {isAdmin ? '👑 Admin' : '⛪ Pastor'} · Modo preview
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-6 px-5 py-6">
        {!unlocked ? (
          <UnlockSection 
            token={token} 
            setToken={setToken} 
            unlocking={unlocking} 
            onSubmit={(e) => { e.preventDefault(); handleUnlock(token); }} 
            dayNumber={dayNumber} 
            isPrivileged={isPrivileged}
            onPreview={() => navigate({ to: "/jornada/$dia/$slug", params: { dia: String(dayNumber), slug: "turno" }, search: { preview: "1", desbloqueado: undefined } })}
          />
        ) : (
          <UnlockedContent
            jornada={jornada}
            quizDone={quizDone}
            quizScore={progresso?.quiz_score ?? 0}
            pontos={progresso?.pontos_acumulados ?? 0}
            onStartQuiz={() => setShowQuiz(true)}
            isAdmin={isAdmin}
            onEdit={() => setShowEdit(true)}
            videoWatched={videoWatched}
            onVideoWatched={handleVideoWatched}
          />
        )}
      </main>

      {showCelebration && (
        <CelebrationSplash
          onDone={() => {
            setShowCelebration(false);
            navigate({ to: "/jornada/$dia/$slug", params: { dia: String(dayNumber), slug: "turno" }, search: { desbloqueado: "1", preview: undefined } });
          }}
        />
      )}

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

      {showEdit && jornada && (
        <EditJornadaModal
          jornada={jornada}
          onClose={() => setShowEdit(false)}
          onSaved={async () => {
            setShowEdit(false);
            await reload();
            toast.success('Dia atualizado!');
          }}
        />
      )}
    </div>
  );
}

function UnlockSection({
  token, setToken, unlocking, onSubmit, dayNumber, isPrivileged, onPreview
}: {
  token: string;
  setToken: (v: string) => void;
  unlocking: boolean;
  onSubmit: (e: React.FormEvent) => void;
  dayNumber: number;
  isPrivileged?: boolean;
  onPreview?: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Instructions Card */}
      <div className="rounded-3xl border border-orange/20 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange/10">
            <Info className="h-5 w-5 text-orange" />
          </div>
          <h2 className="font-display text-xl tracking-wider text-ink">COMO DESBLOQUEAR?</h2>
        </div>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange font-bold text-[10px] text-white">1</div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Localize o <span className="font-bold text-ink">QR Code</span> impresso nos totens ou telões da nave após a ministração.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange font-bold text-[10px] text-white">2</div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Abra o aplicativo de <span className="font-bold text-ink">câmera original</span> do seu próprio celular e aponte para o código.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange font-bold text-[10px] text-white">3</div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Clique no link que aparecerá na tela do celular para ganhar <span className="font-bold text-orange">+100 pontos</span> e liberar o Quiz!
            </p>
          </div>
        </div>
      </div>

      {/* Manual Input fallback */}
      <div className="rounded-3xl border border-border bg-white p-6">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Problemas com a câmera? Digite o código:
        </p>
        <form onSubmit={onSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <QrCode className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={`CÓDIGO EX: RVL${dayNumber}`}
              className="w-full rounded-xl border-[1.5px] border-input bg-muted/30 px-3 py-3 pl-10 font-mono text-sm uppercase tracking-wider text-ink outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={unlocking || !token.trim()}
            className="flex h-[46px] w-[46px] items-center justify-center rounded-xl bg-ink text-white disabled:opacity-40"
          >
            {unlocking ? <RefreshCw className="h-5 w-5 animate-spin" /> : <ArrowLeft className="h-5 w-5 rotate-180" />}
          </button>
        </form>
      </div>

      {isPrivileged && (
        <div className="mt-8 flex flex-col items-center justify-center rounded-3xl border border-orange/20 bg-orange/5 p-6 text-center">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-orange">Área Administrativa</p>
          <p className="mb-4 text-xs text-muted-foreground">Você pode testar o código acima ou pular diretamente para editar o conteúdo.</p>
          <button
            onClick={onPreview}
            className="w-full rounded-xl bg-[linear-gradient(135deg,#EC4228,#EC6B28)] px-4 py-3 text-sm font-bold tracking-widest text-white shadow-[var(--shadow-glow-orange)] transition-transform active:scale-[0.98]"
          >
            ENTRAR NO MODO PREVIEW
          </button>
        </div>
      )}
    </div>
  );
}

function UnlockedContent({
  jornada, quizDone, quizScore, pontos, onStartQuiz, isAdmin, onEdit, videoWatched, onVideoWatched,
}: {
  jornada: Jornada;
  quizDone: boolean;
  quizScore: number;
  pontos: number;
  onStartQuiz: () => void;
  isAdmin: boolean;
  onEdit: () => void;
  videoWatched: boolean;
  onVideoWatched: () => void;
}) {
  return (
    <>
      {/* Score banner with Progress Bar */}
      <div className="flex flex-col rounded-3xl border border-orange/20 bg-white px-6 py-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Seu progresso no turno</p>
            <div className="flex items-baseline gap-1.5">
              <p className="font-display text-4xl text-orange">{Math.round(pontos)}</p>
              <p className="text-xs font-bold text-orange/50 uppercase tracking-widest">/ 450 pts</p>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow/10">
            <Sparkles className="h-6 w-6 text-yellow" />
          </div>
        </div>

        {/* Progress Bar Track */}
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/20">
          <div
            className="h-full bg-[linear-gradient(90deg,#EC6B28,#F6C441)] transition-all duration-1000 ease-out"
            style={{ width: `${Math.min(100, (pontos / 450) * 100)}%` }}
          />
        </div>

        <div className="mt-2.5 flex justify-between text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground/50">
          <span>Check-in</span>
          <span>Meta do Turno</span>
        </div>
      </div>

      {/* Versículo */}
      {jornada.versiculo_texto && (
        <div className="rounded-3xl border border-border bg-white p-7">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.14em] text-orange">Versículo Chave</p>
          <p className="text-lg leading-relaxed text-ink italic">"{jornada.versiculo_texto}"</p>
          {jornada.versiculo_referencia && (
            <p className="mt-4 font-display text-lg tracking-wider text-ink/40">— {jornada.versiculo_referencia}</p>
          )}
        </div>
      )}

      {/* Vídeo */}
      {jornada.video_url_proximo_dia && (
        <VideoPlayer
          url={jornada.video_url_proximo_dia}
          alreadyWatched={videoWatched}
          onWatched={onVideoWatched}
        />
      )}

      {/* Ensinamentos */}
      {jornada.ensinamentos && jornada.ensinamentos.length > 0 && (
        <div className="rounded-3xl border border-border bg-white p-6">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.14em] text-orange">Ensinamentos</p>
          <ul className="space-y-3">
            {jornada.ensinamentos.map((e, i) => (
              <li key={i} className="flex gap-4 text-sm leading-relaxed text-ink/80">
                <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange" />
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
          className="group relative w-full overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#EC6B28,#F6C441)] px-6 py-6 text-white shadow-[var(--shadow-glow-orange)] transition-all active:scale-[0.98]"
        >
          <div className="relative z-10 flex flex-col items-center">
            <span className="font-display text-3xl tracking-[0.1em]">JOGAR QUIZ</span>
            <span className="text-[11px] font-bold uppercase tracking-widest opacity-80 underline underline-offset-4">Até +300 pontos</span>
          </div>
        </button>
      ) : (
        <div className="rounded-3xl border border-success/20 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <Trophy className="h-6 w-6" />
          </div>
          <p className="font-display text-2xl tracking-wider text-ink">QUIZ CONCLUÍDO</p>
          <p className="mt-1 text-sm text-muted-foreground">Você marcou <span className="font-bold text-orange">{Math.round(quizScore)} pontos</span></p>
        </div>
      )}

      <Link to="/ranking" className="block text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-orange">
        Ver ranking →
      </Link>

      {isAdmin && (
        <button
          onClick={onEdit}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-orange/30 bg-orange/5 px-6 py-4 text-orange transition-colors hover:border-orange/60 hover:bg-orange/10"
        >
          <Pencil className="h-4 w-4" />
          <span className="font-display text-lg tracking-wider">EDITAR DIA</span>
        </button>
      )}
    </>
  );
}

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="font-display text-2xl tracking-widest text-orange animate-pulse">CARREGANDO…</div>
    </div>
  );
}

const CELEBRATION_CSS = `
  @keyframes rvl-in {
    from { opacity: 0; transform: scale(0.96) translateY(12px); }
    to   { opacity: 1; transform: scale(1)    translateY(0); }
  }
  @keyframes rvl-out {
    from { opacity: 1; transform: scale(1); }
    to   { opacity: 0; transform: scale(1.04); }
  }
  @keyframes rvl-float {
    0%,100% { transform: translateY(0px)   rotate(-2deg); }
    50%     { transform: translateY(-18px) rotate(2.5deg); }
  }
  @keyframes rvl-text {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes rvl-spark-up {
    0%   { opacity: 1; transform: scale(0.4) translateY(0px); }
    100% { opacity: 0; transform: scale(1.3) translateY(-52px); }
  }
  @keyframes rvl-spark-side {
    0%   { opacity: 1; transform: scale(0.4) translate(0px, 0px); }
    100% { opacity: 0; transform: scale(1.2) translate(30px, -24px); }
  }
  @keyframes rvl-drop {
    0%   { opacity: 0.9; transform: translate(0,0) scale(1); }
    100% { opacity: 0;   transform: translate(var(--dx), var(--dy)) scale(0.4); }
  }
  @keyframes rvl-glow {
    0%,100% { opacity: 0.4; transform: translateX(-50%) scaleX(1); }
    50%     { opacity: 0.8; transform: translateX(-50%) scaleX(1.15); }
  }

  .rvl-enter { animation: rvl-in 0.55s cubic-bezier(0.16,1,0.3,1) forwards; }
  .rvl-leave { animation: rvl-out 0.4s ease-in forwards; }
  .rvl-mascot { animation: rvl-float 3.2s ease-in-out infinite; transform-origin: center bottom; }

  .rvl-t1 { animation: rvl-text 0.55s cubic-bezier(0.16,1,0.3,1) 0.25s both; }
  .rvl-t2 { animation: rvl-text 0.55s cubic-bezier(0.16,1,0.3,1) 0.38s both; }
  .rvl-t3 { animation: rvl-text 0.55s cubic-bezier(0.16,1,0.3,1) 0.50s both; }

  .rvl-sp1 { animation: rvl-spark-up   1.5s ease-out infinite 0.0s; }
  .rvl-sp2 { animation: rvl-spark-side 1.7s ease-out infinite 0.3s; }
  .rvl-sp3 { animation: rvl-spark-up   1.4s ease-out infinite 0.6s; }
  .rvl-sp4 { animation: rvl-spark-side 1.6s ease-out infinite 0.9s; }
  .rvl-sp5 { animation: rvl-spark-up   1.8s ease-out infinite 0.2s; }
  .rvl-sp6 { animation: rvl-spark-side 1.5s ease-out infinite 0.7s; }
  .rvl-drop { animation: rvl-drop 1.3s ease-out infinite; }
  .rvl-glow { animation: rvl-glow 2.4s ease-in-out infinite; }
`;

const SPARKS: { cls: string; style: React.CSSProperties; char: string; size: string; color: string }[] = [
  { cls: "rvl-sp1", style: { top: "-12px", left:   "60px"  }, char: "✦", size: "text-lg",   color: "text-yellow-300" },
  { cls: "rvl-sp2", style: { top:  "20px", right:  "-8px"  }, char: "✦", size: "text-sm",   color: "text-white"      },
  { cls: "rvl-sp3", style: { top: "-20px", right:  "48px"  }, char: "★", size: "text-xs",   color: "text-yellow-200" },
  { cls: "rvl-sp4", style: { top:  "60px", left:   "-8px"  }, char: "✦", size: "text-base", color: "text-white/80"   },
  { cls: "rvl-sp5", style: { top:  "-6px", left:  "112px"  }, char: "★", size: "text-xs",   color: "text-yellow-300" },
  { cls: "rvl-sp6", style: { top:  "80px", right:  "12px"  }, char: "✦", size: "text-sm",   color: "text-white/70"   },
];

const DROPS: { style: React.CSSProperties }[] = [
  { style: { bottom:  "8px", left:  "30px", "--dx": "-14px", "--dy": "20px" } as React.CSSProperties },
  { style: { bottom: "12px", left:  "68px", "--dx":   "8px", "--dy": "24px", animationDelay: "0.4s" } as React.CSSProperties },
  { style: { bottom:  "6px", right: "40px", "--dx":  "16px", "--dy": "20px", animationDelay: "0.2s" } as React.CSSProperties },
  { style: { bottom: "14px", right: "18px", "--dx":   "6px", "--dy": "18px", animationDelay: "0.7s" } as React.CSSProperties },
];

function CelebrationSplash({ onDone }: { onDone: () => void }) {
  const [seconds, setSeconds] = useState(5);
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);

  const handleDone = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    setTimeout(onDone, 420);
  };

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    const timeout = setTimeout(handleDone, 5000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, []); // eslint-disable-line

  return (
    <>
      <style>{CELEBRATION_CSS}</style>
      <div
        className={`noise-overlay fixed inset-0 z-50 flex flex-col items-center justify-center px-6 ${leaving ? "rvl-leave" : "rvl-enter"}`}
        style={{ background: "var(--gradient-fire)" }}
      >
        {/* Mascote + sparks + respingos */}
        <div className="relative">
          {SPARKS.map((s, i) => (
            <span
              key={i}
              className={`${s.cls} ${s.size} ${s.color} pointer-events-none absolute select-none`}
              style={s.style}
            >
              {s.char}
            </span>
          ))}

          <img
            src="/images/rivaldo-png/rivaldo-surfando.png"
            alt="Rivaldo surfando"
            className="rvl-mascot relative z-10 h-64 w-64 select-none object-contain drop-shadow-2xl"
            draggable={false}
          />

          {DROPS.map((d, i) => (
            <span
              key={i}
              className="rvl-drop pointer-events-none absolute z-20 select-none text-[9px] text-blue-200/80"
              style={d.style}
            >
              💧
            </span>
          ))}

          {/* Glow da onda sob o mascote */}
          <div
            className="rvl-glow absolute -bottom-2 left-1/2 h-4 w-44 rounded-full blur-xl"
            style={{ background: "rgba(255,255,255,0.3)" }}
          />
        </div>

        {/* Textos com entrada escalonada */}
        <div className="mt-5 text-center">
          <p className="rvl-t1 font-display text-[11px] uppercase tracking-[0.25em] text-white/60">
            Turno desbloqueado
          </p>
          <p className="rvl-t2 font-display mt-1 text-6xl leading-none tracking-wider text-white">
            +100
          </p>
          <p className="rvl-t3 font-display text-2xl tracking-widest text-white/80">
            PONTOS!
          </p>
        </div>

        <button
          onClick={handleDone}
          className="mt-10 rounded-full border border-white/30 bg-white/10 px-8 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          Continuar ({seconds}s)
        </button>
      </div>
    </>
  );
}

function getYouTubeId(u: string): string | null {
  const patterns = [
    /youtube\.com\/embed\/([^?&/]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/shorts\/([^?&/]+)/,
    /youtu\.be\/([^?&/]+)/,
  ];
  for (const p of patterns) {
    const m = u.match(p);
    if (m) return m[1];
  }
  return null;
}

function loadYouTubeApi(): Promise<void> {
  return new Promise((resolve) => {
    const win = window as any;
    if (win.YT?.Player) { resolve(); return; }
    win.__ytQueue = win.__ytQueue ?? [];
    win.__ytQueue.push(resolve);
    if (!document.getElementById("yt-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
      win.onYouTubeIframeAPIReady = () => {
        (win.__ytQueue as (() => void)[]).forEach((fn) => fn());
        win.__ytQueue = [];
      };
    }
  });
}

function VideoPlayer({ url, alreadyWatched, onWatched }: {
  url: string;
  alreadyWatched: boolean;
  onWatched: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const maxTimeRef = useRef(0);
  const calledRef = useRef(alreadyWatched);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onWatchedRef = useRef(onWatched);

  useEffect(() => { onWatchedRef.current = onWatched; }, [onWatched]);
  useEffect(() => { calledRef.current = alreadyWatched; }, [alreadyWatched]);

  const videoId = getYouTubeId(url);

  useEffect(() => {
    if (!videoId) return;
    let destroyed = false;

    loadYouTubeApi().then(() => {
      if (destroyed || !containerRef.current) return;
      const YTStates = (window as any).YT.PlayerState;

      playerRef.current = new (window as any).YT.Player(containerRef.current, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, fs: 1 },
        events: {
          onStateChange: (event: any) => {
            if (event.data === YTStates.PLAYING) {
              // Inicia polling para bloquear avanço
              if (!pollRef.current) {
                pollRef.current = setInterval(() => {
                  const current: number = playerRef.current?.getCurrentTime?.() ?? 0;
                  if (current > maxTimeRef.current + 2) {
                    // Usuário tentou avançar — volta para o ponto máximo permitido
                    playerRef.current.seekTo(maxTimeRef.current, true);
                  } else {
                    maxTimeRef.current = Math.max(maxTimeRef.current, current);
                  }
                }, 500);
              }
            } else {
              if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            }

            // Vídeo assistido até o fim
            if (event.data === YTStates.ENDED && !calledRef.current) {
              calledRef.current = true;
              onWatchedRef.current();
            }
          },
        },
      });
    });

    return () => {
      destroyed = true;
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [videoId]); // eslint-disable-line

  if (!videoId) return null;

  return (
    <div className="rounded-3xl border border-border bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange">Vídeo do Preletor</p>
        {alreadyWatched && (
          <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-success">
            <Check className="h-3 w-3" strokeWidth={3} /> Assistido · +50 pts
          </span>
        )}
      </div>
      <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-lg">
        <div ref={containerRef} className="h-full w-full" />
      </div>
      {!alreadyWatched && (
        <p className="mt-3 text-center text-[10px] font-medium text-muted-foreground">
          Assista ao vídeo completo para ganhar{" "}
          <span className="font-bold text-orange">+50 pontos</span>
          {" "}· não é possível avançar
        </p>
      )}
    </div>
  );
}

function RefreshCw(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}

function EditJornadaModal({
  jornada,
  onClose,
  onSaved,
}: {
  jornada: Jornada;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [titulo, setTitulo] = useState(jornada.titulo ?? "");
  const [preletores, setPreletores] = useState(jornada.preletores?.join(', ') ?? "");
  const [versiculo, setVersiculo] = useState(jornada.versiculo_texto ?? "");
  const [referencia, setReferencia] = useState(jornada.versiculo_referencia ?? "");
  const [videoUrl, setVideoUrl] = useState(jornada.video_url_proximo_dia ?? "");
  const [saving, setSaving] = useState(false);

  // Quiz state
  type QuizQ = { id?: string; pergunta: string; alternativas: string[]; resposta_correta: number; explicacao: string };
  const [questions, setQuestions] = useState<QuizQ[]>([]);
  const [quizLoaded, setQuizLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from("perguntas_quiz")
      .select("id, pergunta, alternativas, resposta_correta, explicacao")
      .eq("jornada_id", jornada.id)
      .order("created_at")
      .then(({ data }) => {
        setQuestions((data ?? []).map((q: any) => ({
          id: q.id,
          pergunta: q.pergunta ?? "",
          alternativas: q.alternativas ?? ["", "", ""],
          resposta_correta: q.resposta_correta ?? 0,
          explicacao: q.explicacao ?? "",
        })));
        setQuizLoaded(true);
      });
  }, [jornada.id]);

  const addQuestion = () => {
    setQuestions([...questions, { pergunta: "", alternativas: ["", "", ""], resposta_correta: 0, explicacao: "" }]);
  };

  const updateQuestion = (idx: number, field: keyof QuizQ, value: any) => {
    setQuestions(questions.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateAlternativa = (qIdx: number, aIdx: number, value: string) => {
    const newQs = [...questions];
    const alts = [...newQs[qIdx].alternativas];
    alts[aIdx] = value;
    newQs[qIdx] = { ...newQs[qIdx], alternativas: alts };
    setQuestions(newQs);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);

    // Save jornada fields
    const { error } = await supabase
      .from("jornadas")
      .update({
        titulo: titulo || null,
        preletores: preletores ? preletores.split(',').map(s => s.trim()).filter(Boolean) : null,
        versiculo_texto: versiculo || null,
        versiculo_referencia: referencia || null,
        video_url_proximo_dia: videoUrl || null,
      })
      .eq("id", jornada.id);

    if (error) { setSaving(false); toast.error(error.message); return; }

    // Save quiz: delete existing, then insert all
    await supabase.from("perguntas_quiz").delete().eq("jornada_id", jornada.id);
    if (questions.length > 0) {
      const validQs = questions.filter(q => q.pergunta.trim());
      if (validQs.length > 0) {
        const { error: qErr } = await supabase.from("perguntas_quiz").insert(
          validQs.map(q => ({
            jornada_id: jornada.id,
            pergunta: q.pergunta,
            alternativas: q.alternativas.filter(a => a.trim()),
            resposta_correta: q.resposta_correta,
            explicacao: q.explicacao || null,
          }))
        );
        if (qErr) { setSaving(false); toast.error(qErr.message); return; }
      }
    }

    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-lg animate-in slide-in-from-bottom-4 rounded-t-3xl border border-border bg-white p-6 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl tracking-wider text-ink">EDITAR TURNO {jornada.dia_number}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-muted/30 hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {/* --- Dados do Dia --- */}
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange">Dados do Dia</p>
          <Field label="Título" value={titulo} onChange={setTitulo} placeholder="Ex: Encontro de Fogo" />
          <Field label="Preletores (separados por vírgula)" value={preletores} onChange={setPreletores} placeholder="Ex: Pr. João Silva, Pr. Maria" />
          <Field label="Versículo" value={versiculo} onChange={setVersiculo} placeholder="Texto do versículo" multiline />
          <Field label="Referência" value={referencia} onChange={setReferencia} placeholder="Ex: Atos 2:17" />
          <Field label="URL do Vídeo (YouTube embed)" value={videoUrl} onChange={setVideoUrl} placeholder="https://youtube.com/embed/..." />

          {/* --- Quiz --- */}
          <div className="mt-2 border-t border-border pt-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange">Perguntas do Quiz</p>
              <button
                onClick={addQuestion}
                className="inline-flex items-center gap-1 rounded-lg bg-orange/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-orange hover:bg-orange/20"
              >
                <Plus className="h-3 w-3" /> Adicionar
              </button>
            </div>

            {!quizLoaded ? (
              <p className="text-sm text-muted-foreground">Carregando perguntas...</p>
            ) : questions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Nenhuma pergunta cadastrada. Clique em "Adicionar" acima.
              </p>
            ) : (
              <div className="space-y-4">
                {questions.map((q, qi) => (
                  <div key={qi} className="rounded-2xl border border-border bg-muted/10 p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange font-bold text-[10px] text-white">{qi + 1}</span>
                      <button onClick={() => removeQuestion(qi)} className="rounded-full p-1 text-destructive/60 hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <Field
                      label="Pergunta"
                      value={q.pergunta}
                      onChange={(v) => updateQuestion(qi, "pergunta", v)}
                      placeholder="Ex: Quem pregou na sexta?"
                    />
                    <div className="mt-3 space-y-2">
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Alternativas (clique para marcar a correta)</label>
                      {q.alternativas.map((alt, ai) => (
                        <div key={ai} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuestion(qi, "resposta_correta", ai)}
                            className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all ${
                              q.resposta_correta === ai
                                ? "border-success bg-success text-white"
                                : "border-input bg-white text-muted-foreground hover:border-orange"
                            }`}
                          >
                            {String.fromCharCode(65 + ai)}
                          </button>
                          <input
                            value={alt}
                            onChange={(e) => updateAlternativa(qi, ai, e.target.value)}
                            placeholder={`Alternativa ${String.fromCharCode(65 + ai)}`}
                            className="w-full rounded-lg border-[1.5px] border-input bg-white px-3 py-2 text-sm text-ink outline-none placeholder:text-muted-foreground focus:border-orange"
                          />
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const alts = [...q.alternativas, ""];
                          updateQuestion(qi, "alternativas", alts);
                        }}
                        className="text-[10px] font-bold uppercase tracking-widest text-orange hover:underline"
                      >
                        + Alternativa
                      </button>
                    </div>
                    <div className="mt-3">
                      <Field
                        label="Explicação (opcional)"
                        value={q.explicacao}
                        onChange={(v) => updateQuestion(qi, "explicacao", v)}
                        placeholder="Por que essa é a resposta certa?"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#EC4228,#EC6B28)] px-6 py-4 font-display text-xl tracking-widest text-white shadow-[var(--shadow-glow-orange)] transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          {saving ? "SALVANDO..." : "SALVAR TUDO"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const cls = "w-full rounded-xl border-[1.5px] border-input bg-muted/20 px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:bg-white";
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className={cls} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}
