import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast.error(error === "Invalid login credentials" ? "Email ou senha inválidos" : error);
      return;
    }
    toast.success("Bem-vindo de volta!");
    const pending = sessionStorage.getItem("pending_unlock");
    if (pending) {
      try {
        const { day, token } = JSON.parse(pending);
        sessionStorage.removeItem("pending_unlock");
        navigate({ to: "/unlock", search: { day, token } });
      } catch {
        navigate({ to: "/dashboard", replace: true });
      }
    } else {
      navigate({ to: "/dashboard", replace: true });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <div className="rounded-3xl border border-white/5 bg-card p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-8 flex justify-center">
            <img src="/images/logo-revival.png" alt="Revival Conference" className="h-16 w-auto object-contain" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Field icon={<Mail size={16} />} label="Email" type="email" value={email} onChange={setEmail} required placeholder="voce@email.com" />
            <Field icon={<Lock size={16} />} label="Senha" type="password" value={password} onChange={setPassword} required placeholder="••••••••" />

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-xl bg-[linear-gradient(135deg,#EC6B28,#F6C441)] px-6 py-4 font-display text-xl tracking-widest text-white shadow-[var(--shadow-glow-orange)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? "ENTRANDO…" : "ENTRAR"}
            </button>
          </form>

          <div className="mt-8 flex flex-col items-center gap-4 text-sm text-card-foreground opacity-80">
            <Link to="/forgot-password" className="hover:text-orange hover:underline">Esqueci minha senha</Link>
            <span className="h-px w-16 bg-white/10"></span>
            <span>
              Ainda não tem conta?{" "}
              <Link to="/cadastro" className="font-semibold text-orange hover:underline opacity-100">Criar conta</Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}



function Field({ icon, label, type, value, onChange, placeholder, required }: {
  icon: React.ReactNode;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const currentType = isPassword ? (show ? "text" : "password") : type;

  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-card-foreground opacity-70">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-card-foreground opacity-50">{icon}</span>
        <input
          type={currentType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 pl-10 ${isPassword ? 'pr-10' : ''} text-sm text-card-foreground outline-none transition-all placeholder:text-card-foreground placeholder:opacity-40 focus:border-orange focus:ring-4 focus:ring-orange/20`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-card-foreground opacity-50 hover:opacity-100 transition-opacity focus:outline-none"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </label>
  );
}
