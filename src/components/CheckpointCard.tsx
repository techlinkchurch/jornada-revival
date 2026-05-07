import { Link } from "@tanstack/react-router";
import { Lock, Check, QrCode } from "lucide-react";

export type CheckpointStatus = "locked" | "live" | "unlocked" | "done";

export type CheckpointCardProps = {
  dayNumber: number;
  dayLabel: string;
  title: string;
  slug: string;
  preletores?: string[] | null;
  pontos?: number;
  status: CheckpointStatus;
  isPrivileged?: boolean;
};

export function CheckpointCard({
  dayNumber,
  dayLabel,
  title,
  slug,
  preletores,
  pontos = 0,
  status,
  isPrivileged = false,
}: CheckpointCardProps) {
  const isInteractive = isPrivileged || status !== "locked";

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    isInteractive ? (
      <Link
        to="/jornada/$dia/$slug"
        params={{ dia: String(dayNumber), slug: slug }}
        className="block active:scale-[0.98]"
      >
        {children}
      </Link>
    ) : (
      <div className="opacity-70">{children}</div>
    );

  return (
    <Wrapper>
      <article
        className={`relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-3xl border p-5 transition-transform ${
          status === "live"
            ? "border-orange/40 bg-gradient-to-br from-white to-orange/5 shadow-md"
            : status === "unlocked"
            ? "border-orange/20 bg-gradient-to-br from-white to-yellow/5 shadow-sm"
            : status === "done"
            ? "border-success/20 bg-gradient-to-br from-white to-success/5 shadow-sm"
            : "border-border bg-white shadow-sm"
        }`}
      >
        {/* Header / Title */}
        <div className="relative z-10 pr-8">
          <p
            className={`mb-1 text-[10px] font-extrabold uppercase tracking-[0.18em] ${
              status === "done" ? "text-success/80" : "text-muted-foreground"
            }`}
          >
            Turno {dayNumber}
          </p>
          <h3 className="font-display text-3xl leading-none text-ink">
            {title}
          </h3>
          <p className="mt-2 text-xs text-muted-foreground">
            {dayLabel.split("• ")[1] ?? dayLabel}
          </p>
        </div>

        {/* Badges on Top Right */}
        {status === "live" && (
          <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full border border-orange/20 bg-orange/10 px-2.5 py-1 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-live-pulse rounded-full bg-orange" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-orange">Ao vivo</span>
          </div>
        )}
        {status === "done" && (
          <div className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-success/10">
            <Check className="h-4 w-4 text-success" strokeWidth={3} />
          </div>
        )}
        {status === "locked" && (
          <div className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-muted/30">
            <Lock className="h-4 w-4 text-muted-foreground/50" />
          </div>
        )}

        <div className="mt-auto pt-6 flex flex-col gap-4">
          {preletores && preletores.length > 0 && (
            <p className="text-sm font-medium text-muted-foreground">
              {preletores.length > 1 ? "Preletores: " : "Preletor: "}
              <span className="text-ink">{preletores.join(', ')}</span>
            </p>
          )}
          
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {status === "done" ? "Ganhos" : "Recompensa"}
              </span>
              <span className="font-display text-2xl tracking-wider text-orange">
                {pontos > 0 ? `+${pontos} PTS` : status === "done" ? "CONCLUÍDO" : "ATÉ 450 PTS"}
              </span>
            </div>
            
            {status === "live" && (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-[linear-gradient(135deg,#EC6B28,#F6C441)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-[var(--shadow-glow-orange)]">
                <QrCode className="h-4 w-4" /> Escanear
              </span>
            )}
          </div>
        </div>
      </article>
    </Wrapper>
  );
}
