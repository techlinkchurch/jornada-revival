import { useEffect, useRef, useState } from "react";
import { X, Check, Zap, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Pergunta = {
  id: string;
  pergunta: string;
  alternativas: string[];
  explicacao: string | null;
};

type AnswerLog = { answer: string; time_taken: number };

type ServerResult = {
  success: boolean;
  total_score: number;
  correct_count: number;
  answers: { question_number: number; answer: string; time_taken: number; score: number; is_correct: boolean }[];
};

const TIME_LIMIT = 60;

export function Quiz({ jornadaId, onClose, onComplete }: {
  jornadaId: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerLog[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ServerResult | null>(null);
  const startRef = useRef<number>(Date.now());

  // Load questions
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("perguntas_quiz")
        .select("id, pergunta, alternativas, explicacao")
        .eq("jornada_id", jornadaId)
        .order("created_at");
      if (error) {
        toast.error("Erro ao carregar perguntas.");
        onClose();
        return;
      }
      setPerguntas((data ?? []) as Pergunta[]);
      setLoading(false);
      startRef.current = Date.now();
    })();
  }, [jornadaId, onClose]);

  // Timer
  useEffect(() => {
    if (loading || result) return;
    setTimeLeft(TIME_LIMIT);
    startRef.current = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const remaining = Math.max(0, TIME_LIMIT - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        handleAnswer(null, true);
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [currentIdx, loading, result]);

  const handleAnswer = async (idx: number | null, timeout = false) => {
    if (selected !== null) return;
    const timeTaken = Math.min(TIME_LIMIT, (Date.now() - startRef.current) / 1000);
    setSelected(idx);
    const newAnswers = [...answers, { answer: idx === null ? "" : String(idx), time_taken: timeTaken }];
    setAnswers(newAnswers);

    // Brief feedback delay then advance
    setTimeout(async () => {
      if (currentIdx + 1 >= perguntas.length) {
        await submit(newAnswers);
      } else {
        setCurrentIdx(currentIdx + 1);
        setSelected(null);
      }
    }, timeout ? 600 : 900);
  };

  const submit = async (allAnswers: AnswerLog[]) => {
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("submit-quiz", {
      body: { jornada_id: jornadaId, answers: allAnswers },
    });
    setSubmitting(false);
    if (error || !data?.success) {
      toast.error(data?.error || error?.message || "Erro ao enviar quiz.");
      return;
    }
    setResult(data as ServerResult);
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

  if (result) return <ResultScreen result={result} onClose={onComplete} />;

  const q = perguntas[currentIdx];
  const progressPct = ((currentIdx) / perguntas.length) * 100;
  const timePct = (timeLeft / TIME_LIMIT) * 100;

  return (
    <Modal>
      {/* Header w/ progress */}
      <div className="px-5 pt-12">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Pergunta {currentIdx + 1} de {perguntas.length}
          </span>
          <span className={`font-display text-2xl tracking-wider ${timeLeft < 10 ? "text-red animate-pulse" : "text-orange"}`}>
            {Math.ceil(timeLeft)}s
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1 overflow-hidden rounded-full bg-cream/10">
          <div className="h-full transition-all duration-300" style={{ width: `${progressPct}%`, background: "var(--gradient-progress)" }} />
        </div>
        {/* Time bar */}
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-cream/10">
          <div
            className="h-full transition-all"
            style={{ width: `${timePct}%`, background: timeLeft < 10 ? "var(--brand-red)" : "var(--brand-blue)" }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex flex-1 flex-col justify-center px-5 py-8">
        <h2 className="mb-8 font-display text-3xl leading-tight tracking-wider text-foreground">
          {q.pergunta}
        </h2>

        <div className="space-y-3">
          {q.alternativas.map((alt, idx) => {
            const isSelected = selected === idx;
            return (
              <button
                key={idx}
                disabled={selected !== null}
                onClick={() => handleAnswer(idx)}
                className={`group flex w-full items-center gap-3 rounded-xl border-[1.5px] px-4 py-4 text-left transition-all active:scale-[0.99] ${
                  isSelected
                    ? "border-orange bg-orange/15 animate-celebrate"
                    : selected !== null
                    ? "border-border bg-card opacity-50"
                    : "border-input bg-card hover:border-orange/60 hover:bg-orange/5"
                }`}
              >
                <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-display text-base ${
                  isSelected ? "bg-orange text-primary-foreground" : "bg-cream/10 text-muted-foreground group-hover:bg-orange/20 group-hover:text-orange"
                }`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1 text-sm leading-relaxed text-foreground">{alt}</span>
              </button>
            );
          })}
        </div>

        {submitting && currentIdx === perguntas.length - 1 && selected !== null && (
          <p className="mt-6 text-center text-sm text-muted-foreground">Enviando suas respostas…</p>
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
            <div key={a.question_number} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
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
