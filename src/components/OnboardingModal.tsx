import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QrCode, Trophy, Zap, Star } from "lucide-react";

interface OnboardingModalProps {
  userId: string;
  onClose: () => void;
}

const STEPS = [
  {
    icon: <QrCode className="h-5 w-5 text-orange" />,
    title: "Escaneie o QR Code",
    desc: "Após cada ministração, localize o QR Code na nave e aponte sua câmera para desbloquear o turno.",
  },
  {
    icon: <Star className="h-5 w-5 text-yellow-400" />,
    title: "Ganhe pontos",
    desc: "Cada QR Code desbloqueado vale 100 pontos. Assistir o vídeo do turno vale mais 50!",
  },
  {
    icon: <Zap className="h-5 w-5 text-orange" />,
    title: "Responda o Quiz",
    desc: "Depois de desbloquear, responda o quiz relâmpago sobre a pregação e some ainda mais pontos.",
  },
  {
    icon: <Trophy className="h-5 w-5 text-yellow-400" />,
    title: "Suba no Ranking",
    desc: "Acumule pontos nos 4 turnos e dispute o topo do ranking com os outros participantes da Revival Conference!",
  },
];

export function OnboardingModal({ userId, onClose }: OnboardingModalProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [closing, setClosing] = useState(false);

  const handleClose = async () => {
    setClosing(true);
    await supabase.from("profiles").update({ onboarding_visto: true }).eq("id", userId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div
        className={`w-full max-w-sm rounded-3xl bg-white shadow-2xl transition-opacity duration-200 ${closing ? "opacity-0" : "opacity-100"}`}
      >
        {/* Professor image */}
        <div className="flex justify-center pt-4">
          <div className="relative h-24 w-24">
            <img
              src="/images/rivaldo-png/rivaldo-professor.webp"
              alt=""
              aria-hidden
              draggable={false}
              onLoad={() => setImgLoaded(true)}
              className={`h-full w-full select-none object-contain transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            />
          </div>
        </div>

        <div className="px-5 pb-5 pt-2">
          <h2 className="mb-0.5 text-center font-display text-xl tracking-wider text-gray-900">
            COMO FUNCIONA
          </h2>
          <p className="mb-4 text-center text-[11px] text-gray-400">
            Tudo que você precisa saber para aproveitar ao máximo.
          </p>

          <div className="space-y-3">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-orange-50 border border-orange-100">
                  {step.icon}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-800">
                    {step.title}
                  </p>
                  <p className="text-[11px] leading-relaxed text-gray-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleClose}
            className="mt-5 w-full rounded-2xl bg-[linear-gradient(135deg,#EC6B28,#F6C441)] py-3.5 font-display text-base tracking-widest text-white shadow-[var(--shadow-glow-orange)] transition-transform active:scale-[0.98]"
          >
            ENTENDI, BORA!
          </button>
        </div>
      </div>
    </div>
  );
}
