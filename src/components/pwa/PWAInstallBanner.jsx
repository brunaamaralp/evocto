import { useEffect, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/usePWA';
import { toast } from 'sonner';

const DISMISS_KEY = 'pwa_install_dismissed_at';
const DISMISS_DAYS = 14;

function wasRecentlyDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Banner flutuante: instalar PWA ou aplicar atualização do service worker.
 */
export default function PWAInstallBanner() {
  const {
    isInstallable,
    isInstalled,
    isUpdateAvailable,
    install,
    update,
    dismissInstall,
  } = usePWA();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    setHidden(wasRecentlyDismissed());
  }, []);

  const showInstall = isInstallable && !isInstalled && !hidden;
  const showUpdate = isUpdateAvailable;

  if (!showInstall && !showUpdate) return null;

  const handleInstall = async () => {
    try {
      await install();
      toast.success('Evocto instalada');
    } catch {
      /* usuário cancelou ou prompt indisponível */
    }
  };

  const handleUpdate = async () => {
    try {
      await update();
    } catch {
      toast.error('Não foi possível atualizar agora');
    }
  };

  const handleDismiss = () => {
    dismissInstall();
    setHidden(true);
  };

  return (
    <div className="fixed bottom-24 left-3 right-3 sm:left-auto sm:right-6 sm:w-[22rem] z-[70] pb-[env(safe-area-inset-bottom)]">
      <div className="rounded-2xl border border-[#E8E5F5] bg-white/95 backdrop-blur px-4 py-3 shadow-[0_8px_30px_rgba(24,22,42,0.12)]">
        {showUpdate ? (
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#18162A]">Atualização disponível</p>
              <p className="text-xs text-[#7A7595] mt-0.5">
                Há uma nova versão da Evocto pronta para carregar.
              </p>
            </div>
            <Button size="sm" className="shrink-0" onClick={handleUpdate}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Atualizar
            </Button>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#18162A]">Instalar Evocto</p>
              <p className="text-xs text-[#7A7595] mt-0.5">
                Acesso rápido na tela inicial, como um app.
              </p>
              <div className="mt-2.5 flex gap-2">
                <Button size="sm" onClick={handleInstall}>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Instalar
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDismiss}>
                  Agora não
                </Button>
              </div>
            </div>
            <button
              type="button"
              aria-label="Fechar"
              className="rounded-full p-1 text-[#7A7595] hover:bg-black/5 shrink-0"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
