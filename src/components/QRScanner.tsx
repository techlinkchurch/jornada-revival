import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Camera, RefreshCw } from "lucide-react";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Configurações do scanner
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    };

    const scanner = new Html5QrcodeScanner("reader", config, false);
    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        // Sucesso no scan
        onScan(decodedText);
        scanner.clear().catch(console.error);
      },
      (errorMessage) => {
        // Erro silencioso durante a busca (comum)
        // console.warn(errorMessage);
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
            <Camera className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-display text-xl tracking-wider text-white">SCANNER</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Posicione o QR Code</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Camera Feed Container */}
      <div className="relative flex flex-1 flex-col items-center justify-center p-6">
        <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border-2 border-white/20 bg-white/5 shadow-2xl">
          <div id="reader" className="w-full" />
          
          {/* Overlay customizado */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="h-64 w-64 rounded-3xl border-2 border-orange/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
              <div className="absolute -left-1 -top-1 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-orange" />
              <div className="absolute -right-1 -top-1 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-orange" />
              <div className="absolute -bottom-1 -left-1 h-8 w-8 rounded-bl-2xl border-l-4 border-b-4 border-orange" />
              <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-br-2xl border-r-4 border-b-4 border-orange" />
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 max-w-xs text-center">
          <p className="text-sm leading-relaxed text-white/80">
            Aponte sua câmera para o <span className="font-bold text-orange">QR Code</span> impresso no templo para liberar seu acesso e pontos.
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-white/5 p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
          <RefreshCw className="h-3 w-3" />
          <span>Processamento em tempo real</span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        #reader { border: none !important; }
        #reader video { border-radius: 24px; object-fit: cover !important; }
        #reader__dashboard { display: none !important; }
        #reader__status_span { display: none !important; }
        #reader img { display: none !important; }
      `}} />
    </div>
  );
}
