import { overall, tier, initials, shortFor, STAT_KEYS } from './core.js'

// FIFA tarzı oyuncu kartı
export default function PlayerCard({ p, size = 'md', onClick, selected }) {
  const ov = overall(p)
  const t = tier(ov)
  const L = shortFor(p)
  const sm = size === 'sm'
  const left = STAT_KEYS.slice(0, 4)
  const right = STAT_KEYS.slice(4)

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden text-left transition duration-200 ${sm ? 'w-[108px]' : 'w-[178px]'} ${onClick ? 'hover:-translate-y-1 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.7)]' : ''} ${selected ? 'ring-2 ring-accent' : ''}`}
      style={{
        background: t.bg,
        borderRadius: sm ? 10 : 14,
        border: `1px solid ${t.ring}55`,
        padding: sm ? 8 : 12,
        color: t.text,
      }}
    >
      {/* parlama */}
      <span className="pointer-events-none absolute -left-10 top-0 h-full w-10 rotate-12 bg-white/20 blur-md transition-all duration-700 group-hover:left-[130%]" />

      <div className="flex items-start gap-2">
        <div className="shrink-0 text-center leading-none">
          <div className={`font-black tabular-nums ${sm ? 'text-xl' : 'text-3xl'}`}>{ov}</div>
          <div className={`mt-0.5 font-bold tracking-wide ${sm ? 'text-[8px]' : 'text-[10px]'}`} style={{ color: t.ring }}>{p.pos}</div>
        </div>
        <div
          className={`ml-auto shrink-0 overflow-hidden rounded-lg bg-black/25 ${sm ? 'h-11 w-11' : 'h-16 w-16'}`}
          style={{ border: `1px solid ${t.ring}44` }}
        >
          {p.photo_url ? (
            <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className={`flex h-full w-full items-center justify-center font-black opacity-60 ${sm ? 'text-sm' : 'text-lg'}`}>
              {initials(p.name)}
            </div>
          )}
        </div>
      </div>

      <div className={`mt-1.5 truncate font-bold uppercase tracking-wide ${sm ? 'text-[10px]' : 'text-[11px]'}`} title={p.name}>
        {p.name}
      </div>

      <div className="my-1.5 h-px w-full" style={{ background: `${t.ring}40` }} />

      <div className={`grid grid-cols-2 gap-x-2 ${sm ? 'gap-y-[1px] text-[7px]' : 'gap-y-0.5 text-[9px]'} font-semibold`}>
        <div className="space-y-[1px]">
          {left.map((k) => (
            <div key={k} className="flex justify-between gap-1">
              <span className="opacity-70">{L[k]}</span>
              <span className="tabular-nums">{p[k]}</span>
            </div>
          ))}
        </div>
        <div className="space-y-[1px]">
          {right.map((k) => (
            <div key={k} className="flex justify-between gap-1">
              <span className="opacity-70">{L[k]}</span>
              <span className="tabular-nums">{p[k]}</span>
            </div>
          ))}
        </div>
      </div>
    </button>
  )
}

// sahada kullanılan mini rozet
export function PitchToken({ p, dragging }) {
  const ov = overall(p)
  const t = tier(ov)
  return (
    <div className={`flex w-14 flex-col items-center ${dragging ? 'opacity-90' : ''}`}>
      <div
        className="relative h-11 w-11 overflow-hidden rounded-full shadow-lg"
        style={{ background: t.bg, border: `2px solid ${t.ring}` }}
      >
        {p.photo_url ? (
          <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" draggable="false" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-black" style={{ color: t.text }}>
            {initials(p.name)}
          </div>
        )}
        <span className="absolute -right-0.5 -top-0.5 rounded-full bg-ink-950/90 px-1 text-[9px] font-black tabular-nums" style={{ color: t.ring }}>
          {ov}
        </span>
      </div>
      <span className="mt-0.5 max-w-full truncate rounded bg-ink-950/70 px-1 text-[9px] font-semibold text-white">
        {p.name.split(' ')[0]}
      </span>
    </div>
  )
}
