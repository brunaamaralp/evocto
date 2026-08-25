import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { client } from '@/lib/appwrite'

// Verifica a conexão com o Appwrite ao abrir o app
client.ping().then(
  () => console.info('[Appwrite] ping ok'),
  (err) => console.warn('[Appwrite] ping falhou', err)
)

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
) 