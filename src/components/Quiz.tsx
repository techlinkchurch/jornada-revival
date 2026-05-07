import { useEffect, useRef, useState } from "react";
import { X, Check, Zap, Trophy, Clock, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Pergunta = {
  id: string;
  pergunta: string;
  alternativas: string[];
  explicacao: string | null;
  resposta_correta: number;
};

type AnswerLog = { answer: string; time_taken: number };

type ServerResult = {
  success: boolean;
  total_score: number;
  correct_count: number;
  answers: { question_number: number; answer: string; time_taken: number; score: number; is_correct: boolean }[];
};

type QuizSettings = { timeLimit: number; penaltyTime: number };

type Phase = "instructions" | "quiz" | "calculating" | "result";

type FeedbackState = {
  isCorrect: boolean;
  timeTaken: number;
  penaltyTime: number;
  timeLimit: number;
} | null;

function estimateScore(timeTaken: number, timeLimit: number, penaltyTime: number): number {
  if (timeTaken <= penaltyTime) return 100;
  const decay = (timeTaken - penaltyTime) / (timeLimit - penaltyTime);
  return Math.max(10, Math.round(100 * (1 - decay * 0.9)));
}

function getFeedbackMessage(isCorrect: boolean, timeTaken: number, penaltyTime: number): string {
  if (!isCorrect) {
    const msgs = [
      "Não foi dessa vez! Continue firme na jornada, a próxima é sua! 💪",
      "Quase! Deus usa cada momento para nos ensinar. Próxima! 🙏",
      "Tudo bem! Siga em frente com fé, você está na jornada certa! ✨",
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
  if (timeTaken <= penaltyTime) {
    return "Incrível! Você acertou rápido e garantiu os pontos máximos! 🔥";
  }
  return "Você acertou! Mas tente ser mais rápido na próxima para garantir mais pontos ⚡";
}

export function Quiz({ jornadaId, onClose, onComplete }: {
  jornadaId: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [settings, setSettings] = useState<QuizSettings>({ timeLimit: 60, penaltyTime: 15 });
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("instructions");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerLog[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<ServerResult | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const startRef = useRef<number>(Date.now());
  const answersRef = useRef<AnswerLog[]>([]);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [{ data: qs }, { data: cfg }] = await Promise.all([
        supabase
          .from("perguntas_quiz")
          .select("id, pergunta, alternativas, explicacao, resposta_correta")
          .eq("jornada_id", jornadaId)
          .order("created_at"),
        supabase
          .from("jornadas")
          .select("quiz_time_limit, quiz_penalty_time")
          .eq("id", jornadaId)
          .single(),
      ]);
      if (!qs) { toast.error("Erro ao carregar perguntas."); onClose(); return; }
      setPerguntas(qs as Pergunta[]);
      if (cfg) {
        setSettings({
          timeLimit: cfg.quiz_time_limit ?? 60,
          penaltyTime: cfg.quiz_penalty_time ?? 15,
        });
      }
      setLoading(false);
    })();
  }, [jornadaId, onClose]);

  // Scroll to feedback when it appears
  useEffect(() => {
    if (feedback && feedbackRef.current) {
      setTimeout(() => {
        feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 50);
    }
  }, [feedback]);

  // Timer — só roda durante o quiz, quando não há feedback visível
  useEffect(() => {
    if (phase !== "quiz" || loading || result || feedback) return;
    setTimeLeft(settings.timeLimit);
    startRef.current = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const remaining = Math.max(0, settings.timeLimit - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        handleAnswer(null, true);
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [currentIdx, phase, loading, result, feedback, settings.timeLimit]);

  const handleAnswer = (idx: number | null, _timeout = false) => {
    if (selected !== null) return;
    const timeTaken = Math.min(settings.timeLimit, (Date.now() - startRef.current) / 1000);
    setSelected(idx ?? -1);
    const newAnswers = [...answers, { answer: idx === null ? "" : String(idx), time_taken: timeTaken }];
    setAnswers(newAnswers);
    answersRef.current = newAnswers;
    const q = perguntas[currentIdx];
    const isCorrect = idx !== null && idx === q.resposta_correta;
    setFeedback({ isCorrect, timeTaken, penaltyTime: settings.penaltyTime, timeLimit: settings.timeLimit });
  };

  const handleNext = () => {
    if (currentIdx + 1 >= perguntas.length) {
      setPhase("calculating");
      submit(answersRef.current);
    } else {
      setFeedback(null);
      setSelected(null);
      setCurrentIdx((c) => c + 1);
    }
  };

  const submit = async (allAnswers: AnswerLog[]) => {
    const { data, error } = await supabase.functions.invoke("submit-quiz", {
      body: { jornada_id: jornadaId, answers: allAnswers },
    });
    if (error || !data?.success) {
      const msg = data?.error || error?.message || "Erro ao enviar quiz.";
      toast.error(msg);
      setSubmitError(msg);
      return;
    }
    setResult(data as ServerResult);
    setPhase("result");
  };

  if (loading) {
    return (
      <Modal>
        <div className="flex flex-1 items-center justify-center">
          <p className="font-display text-2xl tracking-widest text-orange">CARREGANDO QUIZ…</p>
        </div>
      </Modal>
    );
  }

  if (perguntas.length === 0) {
    return (
      <Modal onClose={onClose}>
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p className="text-muted-foreground">Nenhuma pergunta cadastrada para este turno ainda.</p>
        </div>
      </Modal>
    );
  }

  if (phase === "instructions") {
    return <InstructionsScreen settings={settings} onStart={() => setPhase("quiz")} onClose={onClose} />;
  }

  if (phase === "calculating") return <CalculatingScreen error={submitError} onClose={onClose} />;

  if (phase === "result" && result) {
    return <ResultScreen result={result} onClose={onComplete} />;
  }

  const q = perguntas[currentIdx];
  const progressPct = (currentIdx / perguntas.length) * 100;
  const timePct = (timeLeft / settings.timeLimit) * 100;
  const isUrgent = timeLeft < 10;
  const inBonus = timeLeft > settings.timeLimit - settings.penaltyTime;

  return (
    <Modal>
      <style>{`
        @keyframes rvl-reaction {
          from { opacity: 0; transform: scale(0.3) translateY(20px); }
          to   { opacity: 1; transform: scale(1)   translateY(0); }
        }
      `}</style>
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-12">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Pergunta {currentIdx + 1} de {perguntas.length}
          </span>
          <div className="flex items-center gap-1.5">
            {inBonus && !isUrgent && !feedback && (
              <span className="rounded-full bg-yellow/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-yellow">
                pts máx
              </span>
            )}
            {!feedback && (
              <span className={`font-display text-2xl tracking-wider ${isUrgent ? "text-red animate-pulse" : inBonus ? "text-yellow" : "text-orange"}`}>
                {Math.ceil(timeLeft)}s
              </span>
            )}
          </div>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-cream/10">
          <div className="h-full transition-all duration-300" style={{ width: `${progressPct}%`, background: "var(--gradient-progress)" }} />
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-cream/10">
          <div
            className="h-full transition-all"
            style={{
              width: `${timePct}%`,
              background: isUrgent ? "var(--brand-red)" : inBonus ? "var(--brand-yellow, #F6C441)" : "var(--brand-blue)",
            }}
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-5 py-8">
        <h2 className="mb-8 font-display text-3xl leading-tight tracking-wider text-foreground">
          {q.pergunta}
        </h2>

        <div className="space-y-3">
          {q.alternativas.map((alt, idx) => {
            const isSelected = selected === idx;
            const showResult = feedback !== null && isSelected;
            return (
              <button
                key={idx}
                disabled={selected !== null}
                onClick={() => handleAnswer(idx)}
                className={`group flex w-full items-center gap-3 rounded-xl border-[1.5px] px-4 py-4 text-left transition-all active:scale-[0.99] ${
                  showResult
                    ? feedback.isCorrect
                      ? "border-success bg-success/15"
                      : "border-red bg-red/15"
                    : isSelected
                    ? "border-orange bg-orange/15 animate-celebrate"
                    : selected !== null
                    ? "border-border bg-white opacity-50"
                    : "border-input bg-white hover:border-orange/60 hover:bg-orange/5"
                }`}
              >
                <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-display text-base ${
                  showResult
                    ? feedback.isCorrect ? "bg-success text-white" : "bg-red text-white"
                    : isSelected ? "bg-orange text-primary-foreground" : "bg-cream/10 text-muted-foreground group-hover:bg-orange/20 group-hover:text-orange"
                }`}>
                  {showResult ? (
                    feedback.isCorrect ? <Check className="h-4 w-4" strokeWidth={3} /> : <X className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    String.fromCharCode(65 + idx)
                  )}
                </span>
                <span className="flex-1 text-sm leading-relaxed text-foreground">{alt}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback + Next button */}
        {feedback && (
          <div
            ref={feedbackRef}
            className={`mt-5 rounded-xl px-4 py-4 ${feedback.isCorrect ? "bg-success/10" : "bg-red/10"}`}
          >
            {/* Mascote de reação */}
            <div className="mb-2 flex justify-center">
              <img
                src={!feedback.isCorrect
                  ? "/images/rivaldo-png/rivaldo-chorando.png"
                  : feedback.timeTaken <= feedback.penaltyTime
                  ? "/images/rivaldo-png/rivaldo-explodindo.png"
                  : "/images/rivaldo-png/rivaldo-feliz.png"}
                alt=""
                aria-hidden
                draggable={false}
                className="h-24 w-24 select-none object-contain"
                style={{ animation: "rvl-reaction 0.45s cubic-bezier(0.34,1.56,0.64,1) both" }}
              />
            </div>

            {/* Points badge */}
            <div className="mb-3 flex items-center justify-center gap-2">
              {feedback.isCorrect ? (
                <>
                  <span className={`rounded-full px-3 py-1 font-display text-sm font-bold tracking-wider ${
                    feedback.timeTaken <= feedback.penaltyTime
                      ? "bg-yellow/20 text-yellow"
                      : "bg-success/20 text-success"
                  }`}>
                    +~{estimateScore(feedback.timeTaken, feedback.timeLimit, feedback.penaltyTime)} pts
                  </span>
                  {feedback.timeTaken <= feedback.penaltyTime && (
                    <span className="rounded-full bg-yellow/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-yellow">
                      máximos!
                    </span>
                  )}
                </>
              ) : (
                <span className="rounded-full bg-red/20 px-3 py-1 font-display text-sm font-bold tracking-wider text-red">
                  +0 pts
                </span>
              )}
            </div>

            <p className={`text-center text-sm font-medium ${feedback.isCorrect ? "text-success" : "text-red"}`}>
              {getFeedbackMessage(feedback.isCorrect, feedback.timeTaken, feedback.penaltyTime)}
            </p>

            <button
              onClick={handleNext}
              className="mt-4 w-full rounded-xl bg-primary px-6 py-3 font-display text-base tracking-widest text-primary-foreground transition-transform active:scale-[0.98]"
            >
              {currentIdx + 1 >= perguntas.length ? "VER RESULTADO →" : "PRÓXIMA →"}
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onClose}
        aria-label="Sair do quiz"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-cream/10 text-foreground transition-colors hover:bg-cream/20"
      >
        <X className="h-4 w-4" />
      </button>
    </Modal>
  );
}

function InstructionsScreen({ settings, onStart, onClose }: {
  settings: QuizSettings;
  onStart: () => void;
  onClose: () => void;
}) {
  return (
    <Modal>
      <style>{`
        @keyframes rvl-quiz-shake {
          0%,100% { transform: rotate(0deg) scale(1); }
          20%     { transform: rotate(-2deg) scale(1.03); }
          40%     { transform: rotate(2deg) scale(1.03); }
          60%     { transform: rotate(-1.5deg) scale(1.02); }
          80%     { transform: rotate(1.5deg) scale(1.02); }
        }
        @keyframes rvl-quiz-in {
          from { opacity: 0; transform: scale(0.85) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .rvl-quiz-mascot {
          animation:
            rvl-quiz-in 0.5s cubic-bezier(0.16,1,0.3,1) both,
            rvl-quiz-shake 2.8s ease-in-out 0.8s infinite;
        }
      `}</style>
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="relative mb-4">
          {/* Glow atrás do mascote */}
          <div
            className="absolute inset-0 -z-10 rounded-full blur-2xl opacity-60"
            style={{ background: "var(--gradient-fire)", transform: "scale(0.8)" }}
          />
          <img
            src="/images/rivaldo-png/rivaldo-focado.png"
            alt="Rivaldo focado"
            className="rvl-quiz-mascot h-36 w-36 select-none object-contain drop-shadow-xl"
            draggable={false}
          />
        </div>

        <h2 className="mb-2 font-display text-4xl tracking-wider text-foreground">QUIZ DO TURNO</h2>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          Responda as perguntas sobre o conteúdo do turno e ganhe pontos!
        </p>

        <div className="mb-8 w-full max-w-xs space-y-3">
          <Rule
            icon={<Clock className="h-5 w-5 text-orange" />}
            title={`${settings.timeLimit} segundos por pergunta`}
            desc="O tempo começa a contar assim que a pergunta aparece."
          />
          <Rule
            icon={<Star className="h-5 w-5 text-yellow" />}
            title={`Primeiros ${settings.penaltyTime}s = até +100 pts`}
            desc="Responda rápido para garantir todos os pontos!"
          />
          <Rule
            icon={<Zap className="h-5 w-5 text-blue-400" />}
            title="Depois disso, pontos diminuem"
            desc="Quanto mais tarde responder, menos pontos você ganha."
          />
        </div>

        <button
          onClick={onStart}
          className="w-full max-w-xs rounded-xl bg-[linear-gradient(135deg,#EC6B28,#F6C441)] px-6 py-4 font-display text-xl tracking-widest text-white shadow-[var(--shadow-glow-orange)] transition-transform active:scale-[0.98]"
        >
          ENTENDI, VAMOS LÁ!
        </button>
      </div>

      <button
        onClick={onClose}
        aria-label="Fechar"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-cream/10 text-foreground transition-colors hover:bg-cream/20"
      >
        <X className="h-4 w-4" />
      </button>
    </Modal>
  );
}

function Rule({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-white px-4 py-3">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function ResultScreen({ result, onClose }: { result: ServerResult; onClose: () => void }) {
  const total = result.total_score;
  const tier = total >= 250 ? "perfeito" : total >= 150 ? "bom" : "fraco";

  return (
    <Modal>
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <div
          className="noise-overlay relative mb-6 flex h-32 w-32 items-center justify-center rounded-full"
          style={{ background: tier === "perfeito" ? "var(--gradient-gold)" : "var(--gradient-fire)" }}
        >
          {tier === "perfeito" ? (
            <Trophy className="h-14 w-14 text-ink" strokeWidth={2.5} />
          ) : (
            <Zap className="h-14 w-14 text-ink" strokeWidth={2.5} />
          )}
        </div>

        <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {result.correct_count} de {result.answers.length} corretas
        </p>
        <h2 className="mb-2 font-display text-6xl leading-none tracking-wider text-orange animate-celebrate">
          +{total}
        </h2>
        <p className="mb-8 text-sm uppercase tracking-widest text-foreground">PONTOS</p>

        <div className="mb-8 w-full max-w-xs space-y-2">
          {result.answers.map((a) => (
            <div key={a.question_number} className="flex items-center justify-between rounded-lg border border-border bg-white px-3 py-2 text-sm">
              <span className="text-muted-foreground">Pergunta {a.question_number}</span>
              <span className="flex items-center gap-2">
                {a.is_correct ? (
                  <Check className="h-4 w-4 text-success" strokeWidth={3} />
                ) : (
                  <X className="h-4 w-4 text-red" strokeWidth={3} />
                )}
                <span className="font-display text-base text-orange">+{a.score}</span>
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full max-w-xs rounded-xl bg-primary px-6 py-4 font-display text-lg tracking-widest text-primary-foreground transition-transform active:scale-[0.98]"
        >
          CONTINUAR
        </button>
      </div>
    </Modal>
  );
}

function CalculatingScreen({ error, onClose }: { error: string | null; onClose: () => void }) {
  return (
    <Modal>
      <style>{`
        @keyframes rvl-calc-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-14px); }
        }
        @keyframes rvl-dot-pulse {
          0%, 80%, 100% { opacity: 0.2; }
          40%            { opacity: 1; }
        }
        .rvl-calc-float { animation: rvl-calc-float 2s ease-in-out infinite; }
        .rvl-dot-1 { animation: rvl-dot-pulse 1.4s ease-in-out infinite; }
        .rvl-dot-2 { animation: rvl-dot-pulse 1.4s ease-in-out 0.2s infinite; }
        .rvl-dot-3 { animation: rvl-dot-pulse 1.4s ease-in-out 0.4s infinite; }
      `}</style>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        {error ? (
          <>
            <p className="mb-4 font-display text-2xl tracking-wider text-red">ALGO DEU ERRADO</p>
            <p className="mb-8 text-sm text-muted-foreground">{error}</p>
            <button
              onClick={onClose}
              className="rounded-xl bg-primary px-6 py-3 font-display text-base tracking-widest text-primary-foreground"
            >
              FECHAR
            </button>
          </>
        ) : (
          <>
            <img
              src="/images/rivaldo-png/rivaldo-espionando-2.png"
              alt=""
              aria-hidden
              draggable={false}
              className="rvl-calc-float mb-8 h-40 w-40 select-none object-contain"
            />
            <p className="font-display text-3xl tracking-wider text-foreground">
              CALCULANDO
              <span className="rvl-dot-1">.</span>
              <span className="rvl-dot-2">.</span>
              <span className="rvl-dot-3">.</span>
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-cream/10 text-foreground hover:bg-cream/20"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {children}
    </div>
  );
}
