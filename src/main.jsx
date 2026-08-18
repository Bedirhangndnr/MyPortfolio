import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const FootballGame = lazy(() => import('./games/FootballGame.jsx'))
const CengelGame = lazy(() => import('./games/CengelGame.jsx'))
const KarneGame = lazy(() => import('./games/KarneGame.jsx'))

// /oyun/... -> oyunu tam ekran, tek başına (ayrı sekmede paylaşılabilir link)
function Standalone({ children }) {
  return (
    <div className="min-h-screen bg-ink-950 px-4 py-10 sm:py-16">
      <Suspense fallback={<div className="py-20 text-center text-slate-400">Yükleniyor…</div>}>
        {children}
      </Suspense>
    </div>
  )
}

const path = window.location.pathname
let page = <App />
if (path.startsWith('/oyun/futbol')) page = <Standalone><FootballGame /></Standalone>
else if (path.startsWith('/oyun/cengel')) page = <Standalone><CengelGame /></Standalone>
else if (path.startsWith('/oyun/karne')) page = <Standalone><KarneGame /></Standalone>

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {page}
  </React.StrictMode>,
)
