import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from '@/App.jsx'
import '@/index.css'
/* Depois do Tailwind preflight — formulários/botões legados (Settings/Financeiro) */
import '@/styles/forms.css'
import '@/styles/legacy-ui.css'
import '@/styles/buttons.css'
import { client } from '@/lib/appwrite'
import { notifyPWAUpdateAvailable } from '@/hooks/usePWA'

// Verifica a conexão com o Appwrite ao abrir o app (não bloqueia o render)
try {
  client.ping().then(
    () => console.info('[Appwrite] ping ok'),
    (err) => console.warn('[Appwrite] ping falhou', err)
  )
} catch (err) {
  console.warn('[Appwrite] ping falhou', err)
}

async function purgeStalePwa() {
  if (typeof window === 'undefined') return
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch (err) {
    console.warn('[PWA] purge falhou', err)
  }
}

if (import.meta.env.PROD) {
  // Limpa SW/cache antigos antes de registrar o self-destroying SW
  purgeStalePwa().finally(() => {
    registerSW({
      immediate: true,
      onRegisteredSW(swUrl) {
        console.info('[PWA] service worker (self-destroying) registrado', swUrl)
      },
      onRegisterError(error) {
        console.warn('[PWA] falha ao registrar SW', error)
      },
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
)
