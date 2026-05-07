import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Endpoint reached by the printed QR codes:
//   /unlock?day=1&token=RVL2026D1
// Auto-attempts unlock if logged in, otherwise sends to login preserving query.
export const Route = createFileRoute("/unlock")({
  validateSearch: (s: Record<string, unknown>) => {
    const result: { day?: number; token?: string } = {};
    if (s.day) result.day = Number(s.day);
    if (typeof s.token === "string") result.token = s.token;
    return result;
  },
  component: UnlockHandler,
});

function UnlockHandler() {
  const { day, token } = Route.useSearch();
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("Validando QR Code…");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        if (day && token) sessionStorage.setItem("pending_unlock", JSON.stringify({ day, token }));
        navigate({ to: "/login", replace: true });
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
      setStatus("ok");
      setMessage(`Turno ${day} desbloqueado!`);
      toast.success(`+${data.points_earned ?? 100} pontos`);
      setTimeout(() => navigate({ to: "/jornada/$dia/$slug", params: { dia: String(day), slug: "turno" }, search: { desbloqueado: "1" } }), 1200);
    })();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div
        className={`mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
          status === "ok" ? "bg-success/20" : status === "error" ? "bg-destructive/20" : "bg-orange/20"
        }`}
      >
        <span className="font-display text-4xl tracking-wider">
          {status === "ok" ? "✓" : status === "error" ? "!" : "•"}
        </span>
      </div>
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
