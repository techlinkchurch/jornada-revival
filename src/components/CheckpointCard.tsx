import { Link } from "@tanstack/react-router";
import { Lock, Check, QrCode } from "lucide-react";

export type CheckpointStatus = "locked" | "live" | "unlocked" | "done";

export type CheckpointCardProps = {
  dayNumber: number;
  dayLabel: string;
  title: string;
  preletor?: string | null;
  pontos?: number;
  status: CheckpointStatus;
};

export function CheckpointCard({
  dayNumber,
  dayLabel,
  title,
  preletor,
  pontos = 0,
  status,
}: CheckpointCardProps) {
  const baseCard = "relative overflow-hidden rounded-2xl border bg-card transition-transform";
  const isInteractive = status !== "locked";

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    isInteractive ? (
      <Link
        to="/jornada/$dia"
        params={{ dia: String(dayNumber) }}
        className="block active:scale-[0.98]"
      >
        {children}
      </Link>
    ) : (
      <div className="opacity-60">{children}</div>
    );

  return (
    <Wrapper>
      <article
        className={`${baseCard} ${
          status === "live"
            ? "border-blue/60 shadow-[var(--shadow-glow-blue)]"
            : status === "unlocked"
            ? "border-orange/40"
            : status === "done"
            ? "border-success/40"
            : "border-border"
        }`}
      >
        {/* Top banner */}
        <div
          className={`relative overflow-hidden px-5 py-5 ${
            status === "live"
              ? "noise-overlay"
              : status === "unlocked"
              ? "noise-overlay"
              : ""
          }`}
          style={{
            background:
              status === "live"
                ? "var(--gradient-aurora)"
                : status === "unlocked"
                ? "var(--gradient-fire)"
                : status === "done"
                ? "linear-gradient(135deg,#2a6b30,#1a4820)"
                : "linear-gradient(135deg,#2a2a2a,#1a1a1a)",
          }}
        >
          <div className="relative z-10">
            <p
              className={`mb-1 text-[9px] font-extrabold uppercase tracking-[0.18em] ${
                status === "done" ? "text-cream/40" : "text-ink/60"
              } ${status === "locked" ? "text-cream/40" : ""}`}
            >
              Turno {dayNumber}
            </p>
            <h3
              className={`font-display text-2xl leading-none ${
                status === "done" ? "text-cream" : "text-ink"
              } ${status === "locked" ? "text-cream" : ""}`}
            >
              {title}
            </h3>
            <p
              className={`mt-1 text-[11px] ${
                status === "done" ? "text-cream/40" : "text-ink/50"
              } ${status === "locked" ? "text-cream/40" : ""}`}
            >
              {dayLabel}
            </p>
          </div>

          {status === "live" && (
            <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-ink/30 px-2.5 py-1 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-live-pulse rounded-full bg-cream" />
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-ink">Ao vivo</span>
            </div>
          )}
          {status === "done" && (
            <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-success/30">
              <Check className="h-3.5 w-3.5 text-success" strokeWidth={3} />
            </div>
          )}
          {status === "locked" && (
            <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-cream/10">
              <Lock className="h-3.5 w-3.5 text-cream/60" />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-4">
          {preletor && (
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              Preletor: <span className="text-foreground">{preletor}</span>
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="font-display text-xl tracking-wider text-orange">
              {pontos > 0 ? `+${pontos} PTS` : status === "done" ? "CONCLUÍDO" : "ATÉ 450 PTS"}
            </span>
            {status === "live" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue/40 bg-blue/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue">
                <QrCode className="h-3 w-3" /> Escanear
              </span>
            )}
          </div>
        </div>
      </article>
    </Wrapper>
  );
}
