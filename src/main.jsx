import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const FootballGame = lazy(() => import('./games/FootballGame.jsx'))

// /oyun/futbol -> oyunu tam ekran, tek başına (ayrı sekmede paylaşılabilir link)
function StandaloneFootball() {
  return (
    <div className="min-h-screen bg-ink-950 px-4 py-10 sm:py-16">
      <Suspense fallback={<div className="py-20 text-center text-slate-400">Yükleniyor…</div>}>
        <FootballGame />
      </Suspense>
    </div>
  )
}

const isStandaloneFootball = window.location.pathname.startsWith('/oyun/futbol')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isStandaloneFootball ? <StandaloneFootball /> : <App />}
  </React.StrictMode>,
)
