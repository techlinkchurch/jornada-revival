import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Mail, KeyRound, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      email: search.email as string | undefined,
    }
  },
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { verifyPasswordResetOtp, updatePassword } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  
  const [email, setEmail] = useState(search.email || "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [validSession, setValidSession] = useState(false);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Informe seu e-mail.");
      return;
    }
    if (otp.length !== 6) {
      toast.error("O código deve ter 6 dígitos.");
      return;
    }
    setSubmitting(true);
    const { error } = await verifyPasswordResetOtp(email, otp);
    setSubmitting(false);
    if (error) {
      toast.error("Código inválido ou expirado.");
      return;
    }
    setValidSession(true);
  };

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);
    if (error) {
      toast.error("Não foi possível atualizar a senha.");
      return;
    }
    toast.success("Senha atualizada com sucesso!");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-white/5 bg-card p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-8 flex justify-center">
            <img src="/images/logo-revival.png" alt="Revival Conference" className="h-16 w-auto object-contain" />
          </div>

          {!validSession ? (
            <>
              <h2 className="mb-2 font-display text-2xl tracking-wider text-foreground">CÓDIGO DE ACESSO</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Insira o código de 6 dígitos que enviamos para o seu e-mail.
              </p>
              
              <form onSubmit={handleVerifyOtp} className="space-y-5">
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
                
                <label className="block">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-card-foreground opacity-70">Código (6 dígitos)</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-card-foreground opacity-50">
                      <KeyRound size={16} />
                    </span>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      required
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 pl-10 text-sm text-card-foreground outline-none transition-all placeholder:text-card-foreground placeholder:opacity-40 focus:border-orange focus:ring-4 focus:ring-orange/20 tracking-widest"
                    />
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={submitting || otp.length !== 6}
                  className="mt-2 w-full rounded-xl bg-[linear-gradient(135deg,#EC6B28,#F6C441)] px-6 py-4 font-display text-xl tracking-widest text-white shadow-[var(--shadow-glow-orange)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                >
                  {submitting ? "VERIFICANDO…" : "VERIFICAR CÓDIGO"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="mb-2 font-display text-2xl tracking-wider text-foreground">NOVA SENHA</h2>
              <p className="mb-6 text-sm text-muted-foreground">Escolha uma senha segura para sua conta.</p>

              <form onSubmit={handleSubmitPassword} className="space-y-5">
                <PasswordField label="Nova senha" value={password} onChange={setPassword} placeholder="••••••••" />
                <PasswordField label="Confirmar senha" value={confirm} onChange={setConfirm} placeholder="••••••••" />

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 w-full rounded-xl bg-[linear-gradient(135deg,#EC6B28,#F6C441)] px-6 py-4 font-display text-xl tracking-widest text-white shadow-[var(--shadow-glow-orange)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                >
                  {submitting ? "SALVANDO…" : "SALVAR SENHA"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-card-foreground opacity-70">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-card-foreground opacity-50">
          <Lock size={16} />
        </span>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          minLength={6}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 pl-10 pr-10 text-sm text-card-foreground outline-none transition-all placeholder:text-card-foreground placeholder:opacity-40 focus:border-orange focus:ring-4 focus:ring-orange/20"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-card-foreground opacity-50 hover:opacity-100 transition-opacity focus:outline-none"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}
