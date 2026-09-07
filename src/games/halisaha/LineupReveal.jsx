import { useEffect, useMemo, useState } from 'react'
import { X, Play, RotateCcw } from 'lucide-react'
import { overall, tier, initials, imgSrc } from './core.js'

// LaLiga yayın grafiği tarzı kadro tanıtımı
// Sol: oyuncular sırayla kayarak girer (dev forma no + isim bandı)
// Sağ: diziliş sahası, noktalar sırayla parlar

const TEAM_C = {
  A: { ad: 'Takım A', renk: '#3987e5', koyu: '#0d2137' },
  B: { ad: 'Takım B', renk: '#d95926', koyu: '#2a1409' },
}

export default function LineupReveal({ list, team, matchTitle, onClose }) {
  const [step, setStep] = useState(0) // kaç oyuncu göründü
  const [playing, setPlaying] = useState(true)
  const meta = TEAM_C[team] || TEAM_C.A

  // sahada soldan sağa sırala (A takımı) ya da sağdan sola (B)
  const sirali = useMemo(() => {
    const l = [...list]
    l.sort((a, b) => (a.fx ?? 50) - (b.fx ?? 50))
    return team === 'B' ? l.reverse() : l
  }, [list, team])

  const gorunen = sirali.slice(0, step)
  const bitti = step >= sirali.length

  useEffect(() => {
    if (!playing || bitti) return
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 350 : 620)
    return () => clearTimeout(t)
  }, [playing, step, bitti])

  const tekrar = () => { setStep(0); setPlaying(true) }

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/92 backdrop-blur-sm" onClick={onClose}>
      <style>{`
        @keyframes lr-in { from { opacity:0; transform: translateY(38px) scale(.965) } to { opacity:1; transform:none } }
        @keyframes lr-num { from { opacity:0; transform: translateX(-26px) } to { opacity:.9; transform:none } }
        @keyframes lr-band { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        @keyframes lr-pop { 0%{ transform:scale(0); opacity:0 } 60%{ transform:scale(1.25) } 100%{ transform:scale(1); opacity:1 } }
        @keyframes lr-sweep { from { left:-40% } to { left:140% } }
      `}</style>

      <div className="mx-auto w-full max-w-[1180px] px-3 py-6 sm:py-10" onClick={(e) => e.stopPropagation()}>
        {/* üst bar */}
        <div className="mb-3 flex items-center gap-2">
          <div className="flex flex-1 items-center overflow-hidden rounded-md">
            <span className="h-9 w-1.5 shrink-0" style={{ background: meta.renk }} />
            <span className="flex h-9 items-center bg-white px-3 text-sm font-black uppercase tracking-wide text-ink-950">
              {matchTitle || 'PAYNION'}
            </span>
            <span className="flex h-9 flex-1 items-center justify-end gap-4 px-3 text-sm font-black text-white"
              style={{ background: meta.renk }}>
              {formasyon(list).map((n, i) => <span key={i}>{n}</span>)}
            </span>
          </div>
          <button onClick={onClose} className="rounded-lg border border-white/15 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid items-start gap-3 lg:grid-cols-[1fr_400px]">
          {/* oyuncu şeridi */}
          <div className="relative overflow-hidden rounded-lg" style={{ background: meta.koyu }}>
            <div className="flex">
              {gorunen.map((p, i) => (
                <PlayerSlot key={p.id} p={p} renk={meta.renk} gecikme={0} n={gorunen.length} />
              ))}
              {gorunen.length === 0 && (
                <div className="flex h-[290px] w-full items-center justify-center text-xs text-white/40">Kadro açıklanıyor…</div>
              )}
            </div>
          </div>

          {/* diziliş sahası */}
          <div className="relative overflow-hidden rounded-lg border border-white/10"
            style={{ aspectRatio: '4 / 5', background: 'linear-gradient(160deg,#0f2a17,#123219)' }}>
            <div className="pointer-events-none absolute inset-2 rounded border-2 border-white/20" />
            <div className="pointer-events-none absolute inset-x-2 top-1/2 h-0.5 -translate-y-1/2 bg-white/20" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[14%] w-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20" />
            {sirali.map((p, i) => {
              // sahada dikey diziliş: fx -> dikey, fy -> yatay
              const top = team === 'B' ? (p.fx ?? 50) : 100 - (p.fx ?? 50)
              const left = p.fy ?? 50
              const acik = i < step
              return (
                <div key={p.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ top: `${top}%`, left: `${left}%`, opacity: acik ? 1 : 0.18, transition: 'opacity .35s' }}>
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-black tabular-nums shadow-lg"
                    style={{
                      background: acik ? '#fff' : 'rgba(255,255,255,.25)', color: '#0b0d14',
                      animation: acik ? 'lr-pop .4s ease-out both' : 'none',
                      boxShadow: acik ? `0 0 0 3px ${meta.renk}55` : 'none',
                    }}>
                    {p.forma_no ?? '-'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* kontroller */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button onClick={tekrar} className="btn-ghost !py-1.5 text-xs"><RotateCcw className="h-3.5 w-3.5" /> Baştan oynat</button>
          {!bitti && (
            <button onClick={() => setStep(sirali.length)} className="btn-ghost !py-1.5 text-xs"><Play className="h-3.5 w-3.5" /> Hepsini göster</button>
          )}
          <span className="text-[11px] text-slate-500">{gorunen.length}/{sirali.length}</span>
        </div>
      </div>
    </div>
  )
}

function PlayerSlot({ p, renk }) {
  const ov = overall(p)
  const t = tier(ov)
  return (
    <div className="relative min-w-0 flex-1 overflow-hidden" style={{ animation: 'lr-in .5s cubic-bezier(.2,.9,.3,1) both' }}>
      {/* fotoğraf */}
      <div className="relative h-[248px] w-full sm:h-[320px]">
        {/* dev forma numarası — fotoğrafın üstünde, LaLiga gibi */}
        <span
          className="pointer-events-none absolute -left-1 top-0 z-20 select-none font-black leading-[.8] text-white"
          style={{ fontSize: 'clamp(46px,8.5vw,96px)', animation: 'lr-num .55s .1s ease-out both', textShadow: '0 4px 20px rgba(0,0,0,.75)', WebkitTextStroke: '1px rgba(0,0,0,.25)' }}>
          {p.forma_no ?? ''}
        </span>
        {p.stand_url ? (
          <img src={imgSrc(p.stand_url)} alt={p.name}
            className="h-full w-full object-cover object-top"
            style={{ maskImage: 'linear-gradient(to bottom,#000 78%,transparent)', WebkitMaskImage: 'linear-gradient(to bottom,#000 78%,transparent)' }} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-black text-white/25">{initials(p.name)}</div>
        )}
        {/* ışık süzülmesi */}
        <span className="pointer-events-none absolute top-0 h-full w-1/3 -skew-x-12 bg-white/12 blur-md"
          style={{ animation: 'lr-sweep 1.1s .25s ease-out both' }} />
        {/* reyting rozeti */}
        <span className="absolute right-1.5 top-1.5 z-20 rounded px-1.5 py-0.5 text-[11px] font-black tabular-nums"
          style={{ background: t.ring, color: '#0b0d14' }}>{ov}</span>
      </div>

      {/* isim bandı */}
      <div className="relative origin-left bg-ink-950 px-1 py-1.5 text-center"
        style={{ animation: 'lr-band .35s .2s cubic-bezier(.2,.9,.3,1) both' }}>
        <span className="block truncate text-[11px] font-black uppercase tracking-wide text-white sm:text-[13px]">
          {soyad(p.name)}
        </span>
        <span className="block h-[3px] w-full" style={{ background: renk }} />
      </div>
    </div>
  )
}

const soyad = (ad) => {
  const p = ad.trim().split(' ').filter(Boolean)
  const son = p[p.length - 1]
  // "Kaleci 1" gibi isimlerde sayıyı soyadı sanmayalım
  const kotu = p.length < 2 || /^\d+$/.test(son) || son.length < 3
  return (kotu ? ad.trim() : son).toLocaleUpperCase('tr-TR')
}

// kabaca diziliş: sahadaki fx'e göre 3 banda böl (savunma / orta / hücum)
function formasyon(list) {
  if (!list.length) return []
  const alan = list.filter((p) => !p.is_gk)
  const b = [0, 0, 0]
  for (const p of alan) {
    const x = p.fx ?? 50
    const d = Math.min(...alan.map((q) => q.fx ?? 50))
    const u = Math.max(...alan.map((q) => q.fx ?? 50))
    const oran = u === d ? 0.5 : (x - d) / (u - d)
    b[oran < 0.34 ? 0 : oran < 0.67 ? 1 : 2]++
  }
  return b.filter((n) => n > 0)
}
