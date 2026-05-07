import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Award, Check, Camera, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";

export const Route = createFileRoute("/perfil")({
  component: PerfilPage,
});

type Journey = { day_number: number; title: string | null; completed: boolean; points_earned: number };
type Conquista = { id: string; name: string | null; description: string | null };

function PerfilPage() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [journey, setJourney] = useState<Journey[]>([]);
  const [conquistas, setConquistas] = useState<Conquista[]>([]);
  const [rank, setRank] = useState<{ position: number; total: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [{ data: jd }, { data: cq }, { data: rk }] = await Promise.all([
          supabase.rpc("get_user_journey_details", { target_user_id: user.id }),
          supabase.from("conquistas_config").select("id, name, description"),
          supabase.rpc("get_user_rank", { target_user_id: user.id }),
        ]);
        setJourney((jd ?? []) as Journey[]);
        setConquistas((cq ?? []) as Conquista[]);
        if (rk && rk[0]) setRank({ position: Number(rk[0].position), total: Number(rk[0].total_users) });
      } catch (err) {
        console.error("Error loading profile data:", err);
      }
    })();
  }, [user?.id]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 2 MB.");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      toast.error("Erro ao enviar foto. Tente novamente.");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (updateError) {
      toast.error("Foto enviada, mas não foi possível atualizar o perfil.");
    } else {
      await refreshProfile();
      toast.success("Foto atualizada!");
    }

    setUploading(false);
    // Reset input so the same file can be re-selected after an error
    e.target.value = "";
  };

  if (loading) return <Loader />;
  if (!user) return null;

  const userAchievements = profile?.achievements ?? [];
  const avatarUrl = profile?.image_url ?? null;
  const initials = (profile?.full_name ?? "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header
        className="noise-overlay relative overflow-hidden px-5 pb-10 pt-10"
        style={{ background: "var(--gradient-fire)" }}
      >
        <Link to="/dashboard" className="relative z-10 mb-4 inline-flex items-center gap-2 text-sm text-white/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Jornada
        </Link>
        <div className="relative z-10 flex items-center gap-4">
          {/* Avatar with upload button */}
          <div className="relative flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={profile?.full_name ?? ""} className="h-16 w-16 rounded-full object-cover border-2 border-white/20" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/20 bg-white/10 font-display text-2xl text-white">
                {initials}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="Alterar foto"
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-orange shadow-md transition-transform active:scale-95 disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5 text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl leading-tight tracking-wider text-white">
              {(profile?.full_name ?? "Avivado").toUpperCase()}
            </h1>
            <p className="truncate text-xs text-white/60">{profile?.email}</p>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="-mt-6 relative z-20 px-5">
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-background p-4 shadow-sm">
          <Stat label="Pontos" value={profile?.total_points ?? 0} />
          <Stat label="Posição" value={rank ? `${rank.position}º` : "—"} />
          <Stat label="Turnos" value={`${profile?.completed_days ?? 0}/4`} />
        </div>
      </div>

      {/* Jornada */}
      <section className="px-5 py-6">
        <h2 className="mb-3 font-display text-2xl tracking-wider text-orange">MINHA JORNADA</h2>
        <ul className="space-y-2">
          {journey.map((j) => (
            <li
              key={j.day_number}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm ${
                j.completed ? "border-success/40 bg-success/5" : "border-border bg-white"
              }`}
            >
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full font-display text-base ${
                j.completed ? "bg-success/20 text-success" : "bg-muted/30 text-ink/70"
              }`}>
                {j.completed ? <Check className="h-4 w-4" strokeWidth={3} /> : j.day_number}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{j.title ?? `Turno ${j.day_number}`}</p>
                <p className="text-[11px] text-muted-foreground">
                  {j.completed ? "Quiz concluído" : "Aguardando"}
                </p>
              </div>
              <span className="font-display text-lg tracking-wider text-orange">{Math.round(j.points_earned)}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Conquistas */}
      <section className="px-5 pb-8">
        <h2 className="mb-3 font-display text-2xl tracking-wider text-orange">CONQUISTAS</h2>
        <div className="grid grid-cols-2 gap-3">
          {conquistas.map((c) => {
            const unlocked = userAchievements.includes(c.id);
            return (
              <div
                key={c.id}
                className={`rounded-2xl border p-4 shadow-sm ${
                  unlocked ? "border-yellow/40 bg-yellow/5" : "border-border bg-white opacity-60"
                }`}
              >
                <Award className={`mb-2 h-6 w-6 ${unlocked ? "text-yellow" : "text-muted-foreground"}`} />
                <p className="text-sm font-bold text-foreground">{c.name}</p>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{c.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="px-5 pb-2">
        <button
          onClick={signOut}
          className="w-full rounded-xl bg-[linear-gradient(135deg,#EC4228,#EC6B28)] px-6 py-4 font-display text-lg tracking-widest text-white shadow-md transition-transform active:scale-[0.98]"
        >
          SAIR DA CONTA
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-[10px] font-bold uppercase tracking-widest text-ink/60">{label}</div>
      <div className="font-display text-2xl tracking-wider text-ink">{value}</div>
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
