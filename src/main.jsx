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

if (import.meta.env.PROD) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      notifyPWAUpdateAvailable(updateSW)
    },
    onOfflineReady() {
      console.info('[PWA] pronto para uso offline (shell)')
    },
    onRegisteredSW(swUrl, registration) {
      console.info('[PWA] service worker registrado', swUrl)
      if (registration) {
        setInterval(() => {
          registration.update().catch(() => {})
        }, 60 * 60 * 1000)
      }
    },
    onRegisterError(error) {
      console.warn('[PWA] falha ao registrar SW', error)
    },
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
)
