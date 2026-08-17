import { useState, useEffect, useCallback } from 'react'
import { RotateCcw, Trophy } from 'lucide-react'

const ICONS = ['🚀', '🎮', '💡', '⚡', '🧠', '🔥', '🎯', '🛠️']

function shuffled(pairs) {
  const arr = []
  ICONS.slice(0, pairs).forEach((ic, i) => {
    arr.push({ id: i * 2, icon: ic })
    arr.push({ id: i * 2 + 1, icon: ic })
  })
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const PAIRS = 6

export default function MemoryGame() {
  const [cards, setCards] = useState(() => shuffled(PAIRS))
  const [flipped, setFlipped] = useState([]) // index[]
  const [matched, setMatched] = useState([]) // icon[]
  const [moves, setMoves] = useState(0)
  const [lock, setLock] = useState(false)

  const won = matched.length === PAIRS

  const reset = useCallback(() => {
    setCards(shuffled(PAIRS))
    setFlipped([])
    setMatched([])
    setMoves(0)
    setLock(false)
  }, [])

  const onFlip = (idx) => {
    if (lock || flipped.includes(idx) || matched.includes(cards[idx].icon)) return
    const next = [...flipped, idx]
    setFlipped(next)
    if (next.length === 2) {
      setMoves((m) => m + 1)
      setLock(true)
      const [a, b] = next
      if (cards[a].icon === cards[b].icon) {
        setTimeout(() => {
          setMatched((m) => [...m, cards[a].icon])
          setFlipped([])
          setLock(false)
        }, 450)
      } else {
        setTimeout(() => {
          setFlipped([])
          setLock(false)
        }, 800)
      }
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {}, 0)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between text-sm">
        <span className="font-mono text-slate-300">Hamle: <span className="text-accent">{moves}</span></span>
        <span className="font-mono text-slate-500">{matched.length}/{PAIRS} eş</span>
        <button onClick={reset} className="btn-ghost !py-1.5 text-xs">
          <RotateCcw className="h-3.5 w-3.5" /> Yeni
        </button>
      </div>

      <div className="relative grid grid-cols-4 gap-2" style={{ width: 'min(100%, 340px)' }}>
        {cards.map((c, idx) => {
          const isUp = flipped.includes(idx) || matched.includes(c.icon)
          return (
            <button
              key={c.id}
              onClick={() => onFlip(idx)}
              className="relative aspect-square"
              style={{ perspective: '600px' }}
            >
              <div
                className="relative h-full w-full transition-transform duration-300"
                style={{ transformStyle: 'preserve-3d', transform: isUp ? 'rotateY(180deg)' : 'none' }}
              >
                {/* arka */}
                <div
                  className="absolute inset-0 grid place-items-center rounded-xl border border-white/10 bg-ink-800 text-accent/40"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="font-mono text-lg">?</span>
                </div>
                {/* on */}
                <div
                  className={`absolute inset-0 grid place-items-center rounded-xl border text-2xl ${
                    matched.includes(c.icon) ? 'border-lime-neon/50 bg-lime-neon/10' : 'border-accent/40 bg-accent/10'
                  }`}
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  {c.icon}
                </div>
              </div>
            </button>
          )
        })}

        {won && (
          <div className="absolute inset-0 -m-2 flex flex-col items-center justify-center gap-3 rounded-xl bg-ink-950/85 backdrop-blur-sm">
            <Trophy className="h-8 w-8 text-lime-neon" />
            <p className="font-mono text-sm text-white">Kazandın! {moves} hamlede.</p>
            <button onClick={reset} className="btn-primary">
              <RotateCcw className="h-4 w-4" /> Tekrar oyna
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500">Eş kartları bul, en az hamlede bitir.</p>
    </div>
  )
}
