import { useEffect, useRef, useState, useCallback } from 'react'
import { Play, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'

const SIZE = 15
const START = [{ x: 7, y: 7 }]
const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

function randFood(snake, seed) {
  // deterministik-ish: seed'e gore bir hucre bul (Math.random kullanmadan)
  let n = (seed * 9301 + 49297) % 233280
  for (let tries = 0; tries < 300; tries++) {
    n = (n * 9301 + 49297) % 233280
    const x = Math.floor((n / 233280) * SIZE)
    const m = (n * 7 + 13) % 233280
    const y = Math.floor((m / 233280) * SIZE)
    if (!snake.some((s) => s.x === x && s.y === y)) return { x, y }
  }
  return { x: 0, y: 0 }
}

export default function SnakeGame() {
  const [snake, setSnake] = useState(START)
  const [food, setFood] = useState({ x: 3, y: 3 })
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const dirRef = useRef('right')
  const nextDirRef = useRef('right')
  const tickRef = useRef(0)

  const reset = useCallback(() => {
    setSnake(START)
    setFood({ x: 3, y: 3 })
    setScore(0)
    setOver(false)
    dirRef.current = 'right'
    nextDirRef.current = 'right'
    tickRef.current = 0
    setRunning(true)
  }, [])

  const turn = useCallback((d) => {
    const cur = dirRef.current
    if ((d === 'up' && cur === 'down') || (d === 'down' && cur === 'up')) return
    if ((d === 'left' && cur === 'right') || (d === 'right' && cur === 'left')) return
    nextDirRef.current = d
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }
      if (map[e.key]) {
        e.preventDefault()
        turn(map[e.key])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [turn])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setSnake((prev) => {
        dirRef.current = nextDirRef.current
        const dir = DIRS[dirRef.current]
        const head = { x: prev[0].x + dir.x, y: prev[0].y + dir.y }
        // duvar / kendine carpma
        if (
          head.x < 0 || head.x >= SIZE || head.y < 0 || head.y >= SIZE ||
          prev.some((s) => s.x === head.x && s.y === head.y)
        ) {
          setRunning(false)
          setOver(true)
          setBest((b) => Math.max(b, prev.length - 1))
          return prev
        }
        const ate = head.x === food.x && head.y === food.y
        const next = [head, ...prev]
        if (ate) {
          tickRef.current += 1
          setScore((s) => s + 1)
          setFood(randFood(next, tickRef.current + head.x + head.y))
        } else {
          next.pop()
        }
        return next
      })
    }, 130)
    return () => clearInterval(id)
  }, [running, food])

  const head = snake[0]

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between text-sm">
        <span className="font-mono text-slate-300">Skor: <span className="text-accent">{score}</span></span>
        <span className="font-mono text-slate-500">Rekor: {best}</span>
      </div>

      <div
        className="relative grid gap-px rounded-lg border border-white/10 bg-ink-950 p-1"
        style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, width: 'min(100%, 360px)', aspectRatio: '1' }}
      >
        {Array.from({ length: SIZE * SIZE }).map((_, idx) => {
          const x = idx % SIZE
          const y = Math.floor(idx / SIZE)
          const isHead = head.x === x && head.y === y
          const isBody = !isHead && snake.some((s) => s.x === x && s.y === y)
          const isFood = food.x === x && food.y === y
          return (
            <div
              key={idx}
              className={`rounded-[2px] ${
                isHead ? 'bg-accent' : isBody ? 'bg-accent/60' : isFood ? 'bg-lime-neon' : 'bg-white/5'
              }`}
              style={isFood ? { boxShadow: '0 0 8px #c6f24e' } : undefined}
            />
          )
        })}

        {(!running || over) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-ink-950/80 backdrop-blur-sm">
            {over && <p className="font-mono text-sm text-slate-300">Oyun bitti · Skor {score}</p>}
            <button onClick={reset} className="btn-primary">
              {over ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {over ? 'Tekrar' : 'Başla'}
            </button>
            <p className="text-xs text-slate-500">Ok tuşları veya aşağıdaki düğmeler</p>
          </div>
        )}
      </div>

      {/* Mobil / dokunmatik kontroller */}
      <div className="grid grid-cols-3 gap-1.5" style={{ width: 150 }}>
        <span />
        <DBtn onClick={() => turn('up')}><ArrowUp className="h-4 w-4" /></DBtn>
        <span />
        <DBtn onClick={() => turn('left')}><ArrowLeft className="h-4 w-4" /></DBtn>
        <DBtn onClick={() => turn('down')}><ArrowDown className="h-4 w-4" /></DBtn>
        <DBtn onClick={() => turn('right')}><ArrowRight className="h-4 w-4" /></DBtn>
      </div>
    </div>
  )
}

function DBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="grid aspect-square place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 transition-colors hover:border-accent/40 hover:text-accent active:bg-accent/20"
    >
      {children}
    </button>
  )
}
