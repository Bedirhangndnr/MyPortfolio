import { useState, useRef, useCallback, useEffect } from 'react'
import { Zap } from 'lucide-react'

// durumlar: idle | waiting | ready | result | early
export default function ReactionGame() {
  const [state, setState] = useState('idle')
  const [ms, setMs] = useState(0)
  const [best, setBest] = useState(null)
  const startRef = useRef(0)
  const timerRef = useRef(null)

  const clear = () => timerRef.current && clearTimeout(timerRef.current)

  const arm = useCallback(() => {
    setState('waiting')
    clear()
    const delay = 1200 + Math.random() * 2600
    timerRef.current = setTimeout(() => {
      startRef.current = performance.now()
      setState('ready')
    }, delay)
  }, [])

  useEffect(() => () => clear(), [])

  const onClick = () => {
    if (state === 'idle' || state === 'result' || state === 'early') {
      arm()
    } else if (state === 'waiting') {
      clear()
      setState('early')
    } else if (state === 'ready') {
      const t = Math.round(performance.now() - startRef.current)
      setMs(t)
      setBest((b) => (b == null ? t : Math.min(b, t)))
      setState('result')
    }
  }

  const cfg = {
    idle: { bg: 'bg-ink-800', title: 'Refleks Testi', sub: 'Başlamak için tıkla' },
    waiting: { bg: 'bg-rose-600/80', title: 'Bekle…', sub: 'Yeşili bekle, erken tıklama!' },
    ready: { bg: 'bg-lime-neon', title: 'TIKLA!', sub: '' },
    result: { bg: 'bg-ink-800', title: `${ms} ms`, sub: 'Tekrar için tıkla' },
    early: { bg: 'bg-amber-500/80', title: 'Çok erken!', sub: 'Tekrar dene, tıkla' },
  }[state]

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between text-sm">
        <span className="font-mono text-slate-300 flex items-center gap-1.5"><Zap className="h-4 w-4 text-accent" /> Refleks</span>
        <span className="font-mono text-slate-500">En iyi: {best != null ? `${best} ms` : '—'}</span>
      </div>

      <button
        onClick={onClick}
        className={`grid h-64 w-full max-w-md place-items-center rounded-2xl text-center transition-colors ${cfg.bg} ${
          state === 'ready' ? 'text-ink-950' : 'text-white'
        }`}
      >
        <div>
          <div className={`text-3xl font-extrabold ${state === 'ready' ? 'animate-pulse' : ''}`}>{cfg.title}</div>
          {cfg.sub && <div className="mt-2 text-sm opacity-80">{cfg.sub}</div>}
        </div>
      </button>

      <p className="text-xs text-slate-500">İyi bir refleks ~200-300 ms civarıdır.</p>
    </div>
  )
}
