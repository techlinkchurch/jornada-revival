import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Endpoint reached by the printed QR codes:
//   /unlock?day=1&token=RVL2026D1
export const Route = createFileRoute("/unlock")({
  validateSearch: (s: Record<string, unknown>) => {
    const result: { day?: number; token?: string } = {};
    if (s.day) result.day = Number(s.day);
    if (typeof s.token === "string") result.token = s.token;
    return result;
  },
  component: UnlockHandler,
});

type Status = "working" | "auth_required" | "ok" | "error";
type UnlockResult = { day: number; points: number };

function UnlockHandler() {
  const { day, token } = Route.useSearch();
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("working");
  const [message, setMessage] = useState("Validando QR Code…");
  const [unlockResult, setUnlockResult] = useState<UnlockResult | null>(null);

  useEffect(() => {
    (async () => {
      // Mostra animação de carregamento por pelo menos 1.5s antes de checar auth
      const [{ data: { session } }] = await Promise.all([
        supabase.auth.getSession(),
        new Promise((r) => setTimeout(r, 1500)),
      ]);

      if (!session) {
        if (day && token) sessionStorage.setItem("pending_unlock", JSON.stringify({ day, token }));
        setStatus("auth_required");
        return;
      }

      if (!day || !token) {
        setStatus("error");
        setMessage("QR Code inválido.");
        return;
      }

      const { data, error } = await supabase.functions.invoke("unlock-checkpoint", {
        body: { day_number: day, token },
      });

      if (error || !data?.success) {
        setStatus("error");
        setMessage(data?.error || error?.message || "Não foi possível desbloquear.");
        return;
      }

      sessionStorage.removeItem("pending_unlock");
      await refreshProfile();
      setUnlockResult({ day, points: data.points_earned ?? 100 });
      setStatus("ok");
    })();
    // eslint-disable-next-line
  }, []);

  if (status === "auth_required") {
    return <AuthRequiredScreen day={day} navigate={navigate} />;
  }

  if (status === "ok" && unlockResult) {
    return <SuccessScreen result={unlockResult} navigate={navigate} />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <style>{`
        @keyframes rvl-surf {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          30%       { transform: translateY(-10px) rotate(1deg); }
          60%       { transform: translateY(-5px) rotate(-1deg); }
        }
        .rvl-surf { animation: rvl-surf 2.2s ease-in-out infinite; }
      `}</style>

      {status === "working" && (
        <div className="rvl-surf relative mb-6 h-36 w-36">
          <img
            src="/images/rivaldo-png/rivaldo-qrcode.png"
            alt=""
            aria-hidden
            draggable={false}
            className="h-full w-full select-none object-contain"
          />
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background to-transparent" />
        </div>
      )}

      {status === "error" && (
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/20">
          <span className="font-display text-4xl tracking-wider">!</span>
        </div>
      )}

      <h1 className="font-display text-3xl tracking-wider text-foreground">{message}</h1>

      {status === "error" && (
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="mt-8 rounded-xl bg-primary px-6 py-3 font-display text-base tracking-widest text-primary-foreground"
        >
          IR PARA JORNADA
        </button>
      )}
    </div>
  );
}

function SuccessScreen({ result, navigate }: { result: UnlockResult; navigate: ReturnType<typeof useNavigate> }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown <= 0) {
      navigate({ to: "/dashboard" });
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, navigate]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{ background: "linear-gradient(160deg, #C0392B 0%, #EC6B28 50%, #F6C441 100%)" }}>
      <style>{`
        @keyframes rvl-celebrate {
          0%, 100% { transform: translateY(0px) rotate(-3deg) scale(1); }
          25%       { transform: translateY(-18px) rotate(2deg) scale(1.04); }
          60%       { transform: translateY(-8px) rotate(-1deg) scale(1.02); }
        }
        .rvl-celebrate { animation: rvl-celebrate 2.4s ease-in-out infinite; }
        @keyframes pts-pop {
          0%   { opacity: 0; transform: scale(0.5) translateY(20px); }
          70%  { transform: scale(1.08) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .pts-pop { animation: pts-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both; }
      `}</style>

      <div className="rvl-celebrate relative mb-4 h-56 w-56">
        <img
          src="/images/rivaldo-png/rivaldo-surf.png"
          alt=""
          aria-hidden
          draggable={false}
          className="h-full w-full select-none object-contain"
        />
      </div>

      <p className="mb-1 font-display text-xs tracking-[0.25em] text-white/70">TURNO {result.day} DESBLOQUEADO</p>

      <div className="pts-pop flex flex-col items-center">
        <span className="font-display text-[5rem] leading-none tracking-wider text-white drop-shadow-lg">
          +{result.points}
        </span>
        <span className="font-display text-2xl tracking-[0.3em] text-white/90">PONTOS!</span>
      </div>

      <button
        onClick={() => navigate({ to: "/dashboard" })}
        className="mt-10 rounded-2xl border-2 border-white/30 bg-white/15 px-10 py-4 font-display text-base tracking-widest text-white backdrop-blur-sm transition-transform active:scale-[0.97]"
      >
        CONTINUAR ({countdown}s)
      </button>
    </div>
  );
}

function AuthRequiredScreen({ day, navigate }: { day?: number; navigate: ReturnType<typeof useNavigate> }) {
  const goTo = (to: "/login" | "/cadastro") => {
    navigate({ to });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <style>{`
        @keyframes rvl-feliz-in {
          from { opacity: 0; transform: scale(0.7) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes rvl-feliz-bob {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        .rvl-feliz {
          animation:
            rvl-feliz-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both,
            rvl-feliz-bob 2.5s ease-in-out 0.6s infinite;
        }
      `}</style>

      <div className="rvl-feliz relative mb-6 h-36 w-36">
        <img
          src="/images/rivaldo-png/rivaldo-quasela.png"
          alt=""
          aria-hidden
          draggable={false}
          className="h-full w-full select-none object-contain"
        />
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background to-transparent" />
      </div>

      <h1 className="mb-2 font-display text-4xl tracking-wider text-foreground">
        VOCÊ ESTÁ QUASE LÁ!
      </h1>
      <p className="mb-8 max-w-xs text-sm leading-relaxed text-muted-foreground">
        {day
          ? `Entre ou crie sua conta para desbloquear o Turno ${day} e garantir seus pontos na jornada.`
          : "Entre ou crie sua conta para desbloquear o turno e garantir seus pontos na jornada."}
      </p>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          onClick={() => goTo("/cadastro")}
          className="w-full rounded-xl bg-[linear-gradient(135deg,#EC6B28,#F6C441)] py-4 font-display text-lg tracking-widest text-white shadow-[var(--shadow-glow-orange)] transition-transform active:scale-[0.98]"
        >
          CRIAR CONTA
        </button>
        <button
          onClick={() => goTo("/login")}
          className="w-full rounded-xl border border-border bg-background py-4 font-display text-lg tracking-widest text-foreground transition-transform active:scale-[0.98]"
        >
          JÁ TENHO CONTA
        </button>
      </div>
    </div>
  );
}
