import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Mail, Lock, User as UserIcon, Phone, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/cadastro")({
  component: CadastroPage,
});

function CadastroPage() {
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState("");
  const didNavigate = useRef(false);

  // Fallback: se o usuário já estiver logado ao abrir a página, redireciona
  useEffect(() => {
    if (!user || didNavigate.current) return;
    navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const [showConfirm, setShowConfirm] = useState(false);

  const handleNameBlur = () => {
    if (form.name.trim().length > 0) {
      const words = form.name.trim().split(/\s+/);
      if (words.length < 2) {
        setNameError("Insira também o seu sobrenome.");
      } else {
        setNameError("");
      }
    } else {
      setNameError("");
    }
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    const words = form.name.trim().split(/\s+/);
    if (words.length < 2) {
      setNameError("Insira também o seu sobrenome.");
      toast.error("Por favor, insira seu nome e sobrenome.");
      return;
    }

    const formattedName = words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    setForm({ ...form, name: formattedName });
    setNameError("");
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    const { error } = await signUp(form);
    setSubmitting(false);
    if (error) {
      toast.error(error);
      setShowConfirm(false);
      return;
    }
    toast.success("Conta criada! Você já pode jogar.");
    didNavigate.current = true;
    const pending = sessionStorage.getItem("pending_unlock");
    if (pending) {
      try {
        const { day, token } = JSON.parse(pending);
        sessionStorage.removeItem("pending_unlock");
        navigate({ to: "/unlock", search: { day, token } });
        return;
      } catch {}
    }
    navigate({ to: "/dashboard" });
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

          <form onSubmit={handlePreSubmit} className="space-y-5">
            <Field icon={<UserIcon size={16} />} label="Nome completo" value={form.name} onChange={(v) => { setForm({ ...form, name: v }); if (nameError) setNameError(""); }} onBlur={handleNameBlur} error={nameError} required />
            <Field icon={<Mail size={16} />} label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
            <Field icon={<Phone size={16} />} label="Telefone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="(11) 99999-9999" />
            <Field icon={<Lock size={16} />} label="Senha (mín. 6)" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-[linear-gradient(135deg,#EC6B28,#F6C441)] px-6 py-4 font-display text-xl tracking-widest text-white shadow-[var(--shadow-glow-orange)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
            >
              CRIAR CONTA
            </button>
          </form>

          <div className="mt-8 flex flex-col items-center gap-4 text-sm text-card-foreground opacity-80">
            <span>
              Já tem conta?{" "}
              <Link to="/login" className="font-semibold text-orange hover:underline opacity-100">Entrar</Link>
            </span>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-white/5 bg-card p-6 shadow-2xl">
            <h3 className="mb-4 text-center font-display text-2xl text-card-foreground">CONFIRME SEUS DADOS</h3>
            <p className="mb-6 text-center text-sm text-card-foreground opacity-70">
              Por favor, verifique se as informações abaixo estão corretas antes de finalizar.
            </p>
            
            <div className="mb-6 space-y-3 rounded-2xl border border-white/5 bg-white/5 p-4 text-sm">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-card-foreground opacity-50">Nome</span>
                <span className="font-medium text-card-foreground">{form.name}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-card-foreground opacity-50">Email</span>
                <span className="font-medium text-card-foreground">{form.email}</span>
              </div>
              {form.phone && (
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-card-foreground opacity-50">Telefone</span>
                  <span className="font-medium text-card-foreground">{form.phone}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest text-card-foreground hover:bg-white/10 disabled:opacity-50"
              >
                Alterar
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 rounded-xl bg-orange py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-orange/90 disabled:opacity-50"
              >
                {submitting ? "Criando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ icon, label, type = "text", value, onChange, onBlur, placeholder, required, error }: {
  icon: React.ReactNode;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const currentType = isPassword ? (show ? "text" : "password") : type;

  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-card-foreground opacity-70">{label}</span>
      <div className="relative">
        <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${error ? 'text-red-400' : 'text-card-foreground opacity-50'}`}>{icon}</span>
        <input
          type={currentType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          className={`w-full rounded-lg border bg-white/5 px-3 py-3 pl-10 ${isPassword ? 'pr-10' : ''} text-sm text-card-foreground outline-none transition-all placeholder:text-card-foreground placeholder:opacity-40 focus:ring-4 ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-white/10 focus:border-orange focus:ring-orange/20'}`}
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
      {error && <span className="mt-1.5 block text-[11px] text-red-400 font-medium">{error}</span>}
    </label>
  );
}
