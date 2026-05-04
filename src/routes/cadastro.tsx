import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Mail, Lock, User as UserIcon, Phone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/cadastro")({
  component: CadastroPage,
});

function CadastroPage() {
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", isMember: false });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setSubmitting(true);
    const { error } = await signUp(form);
    setSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Conta criada! Você já pode jogar.");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pb-10 pt-12">
      <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="mx-auto w-full max-w-sm">
        <h1 className="mb-1 font-display text-4xl tracking-wider text-orange">CRIAR CONTA</h1>
        <p className="mb-8 text-sm text-muted-foreground">Entre na jornada da Revival 2026.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field icon={<UserIcon size={16} />} label="Nome completo" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Field icon={<Mail size={16} />} label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
          <Field icon={<Phone size={16} />} label="Telefone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="(11) 99999-9999" />
          <Field icon={<Lock size={16} />} label="Senha (mín. 6)" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card/50 p-3">
            <input
              type="checkbox"
              checked={form.isMember}
              onChange={(e) => setForm({ ...form, isMember: e.target.checked })}
              className="h-4 w-4 rounded accent-orange"
            />
            <span className="text-sm text-foreground">Sou membro da Link Church</span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-primary px-6 py-4 font-display text-lg tracking-widest text-primary-foreground shadow-[var(--shadow-glow-orange)] transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? "CRIANDO…" : "CRIAR CONTA"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link to="/login" className="font-semibold text-orange hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ icon, label, type = "text", value, onChange, placeholder, required }: {
  icon: React.ReactNode;
  label: string;
  type?: string;
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
