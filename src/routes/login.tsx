import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, ArrowLeft } from "lucide-react";
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
    if (user) navigate({ to: "/dashboard" });
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
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pb-10 pt-12">
      <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="mx-auto w-full max-w-sm">
        <h1 className="mb-1 font-display text-4xl tracking-wider text-orange">ENTRAR</h1>
        <p className="mb-8 text-sm text-muted-foreground">Continue sua jornada na Revival.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field icon={<Mail size={16} />} label="Email" type="email" value={email} onChange={setEmail} required placeholder="voce@email.com" />
          <Field icon={<Lock size={16} />} label="Senha" type="password" value={password} onChange={setPassword} required placeholder="••••••••" />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-primary px-6 py-4 font-display text-lg tracking-widest text-primary-foreground shadow-[var(--shadow-glow-orange)] transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? "ENTRANDO…" : "ENTRAR"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link to="/cadastro" className="font-semibold text-orange hover:underline">Cadastre-se</Link>
        </p>
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
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-lg border-[1.5px] border-input bg-input px-3 py-3 pl-10 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-orange focus:ring-4 focus:ring-orange/20"
        />
      </div>
    </label>
  );
}
