import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await sendPasswordReset(email);
    setSubmitting(false);
    if (error) {
      toast.error("Não foi possível enviar o e-mail. Tente novamente.");
      return;
    }
    toast.success("E-mail enviado! Verifique sua caixa de entrada.");
    navigate({ to: "/reset-password", search: { email } });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao login
        </Link>

        <div className="rounded-3xl border border-white/5 bg-card p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-8 flex justify-center">
            <img src="/images/logo-revival.png" alt="Revival Conference" className="h-16 w-auto object-contain" />
          </div>

          <h2 className="mb-2 font-display text-2xl tracking-wider text-foreground">RECUPERAR SENHA</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Informe seu e-mail e enviaremos um código para redefinir sua senha.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-card-foreground opacity-70">Email</span>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-card-foreground opacity-50">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  required
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 pl-10 text-sm text-card-foreground outline-none transition-all placeholder:text-card-foreground placeholder:opacity-40 focus:border-orange focus:ring-4 focus:ring-orange/20"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-xl bg-[linear-gradient(135deg,#EC6B28,#F6C441)] px-6 py-4 font-display text-xl tracking-widest text-white shadow-[var(--shadow-glow-orange)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? "ENVIANDO…" : "ENVIAR CÓDIGO"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
