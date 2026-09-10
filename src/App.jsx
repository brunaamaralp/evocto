import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import PWAInstallBanner from "@/components/pwa/PWAInstallBanner"

function App() {
  return (
    <>
      <Pages />
      <Toaster />
      <PWAInstallBanner />
    </>
  )
}

export default App
