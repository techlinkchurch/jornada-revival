import { Link, useLocation } from "@tanstack/react-router";
import { Home, Trophy, User, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const items = [
  { to: "/dashboard" as const, label: "Jornada", icon: Home },
  { to: "/ranking" as const, label: "Ranking", icon: Trophy },
  { to: "/perfil" as const, label: "Perfil", icon: User },
];

export function BottomNav() {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white/80 backdrop-blur-lg pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 py-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                active ? "text-orange" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
        <button
          onClick={signOut}
          className="flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-red-400"
          aria-label="Sair"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </nav>
  );
}
