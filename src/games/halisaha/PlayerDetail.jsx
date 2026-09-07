import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { X, Pencil, Trophy, Zap, Shield, Target, Wind, Dumbbell, Flame, Star, Check } from 'lucide-react'
import { overall, tier, initials, labelsFor, shortFor, STAT_KEYS, imgSrc } from './core.js'

// ============================================================
//  OYUNCU DETAYI — La Liga / FIFA tarzı animasyonlu kart açılışı
//  3D tilt + holografik parlama + radar + dairesel göstergeler
// ============================================================

const AXIS_ICON = { hiz: Wind, sut: Target, bitiricilik: Flame, kafa: Zap, defans: Shield, fizik: Dumbbell, patlayicilik: Zap }

function badgesFor(p, all) {
  const b = []
  const ov = overall(p)
  const others = all.filter((x) => x.id !== p.id && x.is_gk === p.is_gk)
  const isTop = (k) => others.every((x) => (x[k] || 0) <= (p[k] || 0))
  const L = labelsFor(p)
  if (isTop('hiz')) b.push({ t: p.is_gk ? 'En Cesur Çıkış' : 'Kadronun Fişeği', s: L.hiz, c: '#3987e5' })
  if (isTop('sut')) b.push({ t: p.is_gk ? 'Ayağı Sağlam' : 'Top Patlatan', s: L.sut, c: '#d95926' })
  if (isTop('defans')) b.push({ t: p.is_gk ? 'Refleks Canavarı' : 'Geçilmez Duvar', s: L.defans, c: '#1baf7a' })
  if (isTop('fizik')) b.push({ t: 'Kale Gibi', s: L.fizik, c: '#eda100' })
  if (isTop('bitiricilik') && !p.is_gk) b.push({ t: 'Soğukkanlı Bitirici', s: L.bitiricilik, c: '#e87ba4' })
  if (ov >= 80) b.push({ t: 'Yıldız Oyuncu', s: `Genel ${ov}`, c: '#e8cd6a' })
  return b.slice(0, 4)
}

export default function PlayerDetail({ player, allPlayers, onClose, onEdit, vote, myVote, onVote }) {
  const p = player
  const ov = overall(p)
  const t = tier(ov)
  const L = labelsFor(p)
  const S = shortFor(p)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [shine, setShine] = useState({ x: 50, y: 50 })
  const cardRef = useRef(null)
  const badges = useMemo(() => badgesFor(p, allPlayers), [p, allPlayers])
  const [myScore, setMyScore] = useState(myVote ?? overall(p))
  const [sent, setSent] = useState(false)
  useEffect(() => { setMyScore(myVote ?? overall(p)); setSent(false) }, [p.id]) // eslint-disable-line

  // kadro ortalamasına göre fark
  const avg = useMemo(() => {
    const pool = allPlayers.filter((x) => x.is_gk === p.is_gk)
    const o = {}
    STAT_KEYS.forEach((k) => { o[k] = Math.round(pool.reduce((s, x) => s + (x[k] || 0), 0) / Math.max(1, pool.length)) })
    return o
  }, [allPlayers, p.is_gk])

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const onMove = (e) => {
    const r = cardRef.current?.getBoundingClientRect()
    if (!r) return
    const px = ((e.clientX - r.left) / r.width) * 100
    const py = ((e.clientY - r.top) / r.height) * 100
    setTilt({ x: (py - 50) / -4, y: (px - 50) / 4 })
    setShine({ x: px, y: py })
  }
  const reset = () => { setTilt({ x: 0, y: 0 }); setShine({ x: 50, y: 50 }) }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
        {/* arka plan ışıması */}
        <motion.div
          className="pointer-events-none fixed inset-0"
          initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}
          style={{ background: `radial-gradient(60% 50% at 50% 40%, ${t.ring}22 0%, transparent 70%)` }}
        />
        <Sparkles color={t.ring} />

        <div className="relative mx-auto flex min-h-full max-w-4xl flex-col items-center gap-6 p-4 py-10 lg:flex-row lg:items-start" onClick={(e) => e.stopPropagation()}>
          {/* ---- KART ---- */}
          <motion.div
            className="relative shrink-0"
            style={{ perspective: 1200 }}
            initial={{ opacity: 0, y: 60, scale: 0.7, rotateY: -40 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateY: 0 }}
            transition={{ type: 'spring', stiffness: 90, damping: 14, mass: 0.9 }}
          >
            <div
              ref={cardRef}
              onMouseMove={onMove}
              onMouseLeave={reset}
              className="relative w-[280px] overflow-hidden rounded-2xl sm:w-[330px]"
              style={{
                transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                transition: 'transform 120ms ease-out',
                transformStyle: 'preserve-3d',
                boxShadow: `0 30px 70px -20px ${t.ring}66, 0 0 0 1px ${t.ring}44`,
                background: t.bg,
              }}
            >
              {p.card_url ? (
                <img src={imgSrc(p.card_url)} alt={p.name} className="block w-full" draggable="false" />
              ) : (
                <BigCard p={p} ov={ov} t={t} S={S} />
              )}
              {/* holografik parlama */}
              <div
                className="pointer-events-none absolute inset-0 mix-blend-overlay"
                style={{ background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.08) 30%, transparent 60%)` }}
              />
              <motion.div
                className="pointer-events-none absolute inset-y-0 w-1/3 skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                initial={{ left: '-40%' }} animate={{ left: '130%' }}
                transition={{ delay: 0.5, duration: 1.1, ease: 'easeInOut' }}
              />
            </div>
            <p className="mt-3 text-center text-[11px] uppercase tracking-[0.2em] text-slate-500">
              {t.ad} kart · {p.pos}
            </p>
          </motion.div>

          {/* ---- İSTATİSTİKLER ---- */}
          <div className="w-full space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <motion.h2 initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
                  className="text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">{p.name}</motion.h2>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="text-xs text-slate-400">
                  {p.is_gk ? 'Kaleci' : { FRV: 'Forvet', KAN: 'Kanat', ORT: 'Orta Saha', DEF: 'Defans' }[p.pos] || p.pos} · halısaha kadrosu
                </motion.p>
              </div>
              <div className="flex gap-1.5">
                <button onClick={onEdit} className="chip !py-1 text-[11px]"><Pencil className="h-3 w-3" /> Düzenle</button>
                <button onClick={onClose} className="chip !py-1"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            {/* dairesel göstergeler */}
            <div className="card p-4">
              <div className="flex items-center gap-4">
                <Ring value={ov} color={t.ring} label="GENEL" big />
                <div className="grid flex-1 grid-cols-3 gap-2">
                  {(p.is_gk ? ['defans', 'fizik', 'patlayicilik'] : ['hiz', 'sut', 'defans']).map((k, i) => (
                    <Ring key={k} value={p[k]} color={t.ring} label={S[k]} delay={0.2 + i * 0.1} />
                  ))}
                </div>
              </div>
            </div>

            {/* radar */}
            <div className="card p-4">
              <p className="section-label mb-1 text-center">Yetenek Haritası</p>
              <Radar p={p} avg={avg} color={t.ring} />
            </div>

            {/* barlar + kadro farkı */}
            <div className="card space-y-2 p-4">
              <p className="section-label">Detaylı Değerler <span className="normal-case text-slate-600">— kadro ortalamasına göre</span></p>
              {STAT_KEYS.map((k, i) => {
                const d = p[k] - avg[k]
                const Icon = AXIS_ICON[k] || Zap
                return (
                  <div key={k} className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <span className="w-24 shrink-0 text-[10px] uppercase tracking-wide text-slate-400">{L[k]}</span>
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/6">
                      <motion.div className="absolute inset-y-0 left-0 rounded-full"
                        style={{ background: t.ring }}
                        initial={{ width: 0 }} animate={{ width: `${p[k]}%` }}
                        transition={{ delay: 0.3 + i * 0.06, duration: 0.7, ease: 'easeOut' }} />
                      <div className="absolute inset-y-0 w-px bg-white/40" style={{ left: `${avg[k]}%` }} title={`kadro ort. ${avg[k]}`} />
                    </div>
                    <span className="w-7 text-right font-mono text-xs font-bold text-white">{p[k]}</span>
                    <span className={`w-9 text-right font-mono text-[10px] ${d > 0 ? 'text-lime-neon' : d < 0 ? 'text-rose-400' : 'text-slate-600'}`}>
                      {d > 0 ? '+' : ''}{d}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* halk oylaması */}
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <p className="section-label flex items-center gap-1.5"><Star className="h-3.5 w-3.5" /> Halkın Puanı</p>
                {vote ? (
                  <span className="text-xs text-slate-400">
                    <b className="font-mono text-base text-amber-300">{vote.ort}</b> <span className="text-[10px]">({vote.adet} oy)</span>
                  </span>
                ) : <span className="text-[10px] text-slate-600">henüz oy yok</span>}
              </div>

              {vote && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/6">
                  <motion.div className="h-full rounded-full bg-amber-300" initial={{ width: 0 }} animate={{ width: `${vote.ort}%` }} transition={{ duration: 0.8 }} />
                </div>
              )}

              <div className="mt-3 rounded-lg border border-white/10 bg-ink-900/60 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Sence kaç eder?</span>
                  <span className="font-mono text-lg font-black" style={{ color: t.ring }}>{myScore}</span>
                </div>
                <input type="range" min="1" max="99" value={myScore} onChange={(e) => { setMyScore(+e.target.value); setSent(false) }}
                  className="mt-1.5 w-full accent-amber-300" />
                <button
                  onClick={() => { onVote(p.id, myScore); setSent(true) }}
                  className={`btn-ghost mt-2 w-full !py-1.5 text-xs ${sent ? 'text-lime-neon' : ''}`}>
                  {sent ? <><Check className="h-3.5 w-3.5" /> Oyun kaydedildi</> : <><Star className="h-3.5 w-3.5" /> {myVote ? 'Oyunu güncelle' : 'Oy ver'}</>}
                </button>
                {myVote != null && !sent && <p className="mt-1 text-center text-[10px] text-slate-600">önceki oyun: {myVote}</p>}
              </div>
            </div>

            {/* rozetler */}
            {badges.length > 0 && (
              <div className="card p-4">
                <p className="section-label mb-2 flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5" /> Rozetler</p>
                <div className="flex flex-wrap gap-2">
                  {badges.map((b, i) => (
                    <motion.span key={b.t} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + i * 0.1, type: 'spring', stiffness: 200 }}
                      className="rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold"
                      style={{ borderColor: b.c + '55', background: b.c + '18', color: b.c }}>
                      {b.t} <span className="ml-1 font-normal opacity-70">{b.s}</span>
                    </motion.span>
                  ))}
                </div>
              </div>
            )}
          </div>
      </div>
    </div>
  )
}

// dairesel gösterge
function Ring({ value, color, label, big, delay = 0 }) {
  const R = big ? 42 : 24
  const C = 2 * Math.PI * R
  const size = big ? 110 : 66
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90">
          <circle cx="55" cy="55" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={big ? 9 : 8} />
          <motion.circle cx="55" cy="55" r={R} fill="none" stroke={color} strokeWidth={big ? 9 : 8} strokeLinecap="round"
            strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - value / 100) }}
            transition={{ delay, duration: 1.1, ease: 'easeOut' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-black tabular-nums text-white ${big ? 'text-3xl' : 'text-base'}`}>{value}</span>
        </div>
      </div>
      <span className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-500">{label}</span>
    </div>
  )
}

// yetenek radarı (oyuncu + kadro ortalaması)
function Radar({ p, avg, color }) {
  const size = 260, cx = 130, cy = 132, R = 88
  const n = STAT_KEYS.length
  const S = shortFor(p)
  const pt = (i, r) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }
  const poly = (get) => STAT_KEYS.map((k, i) => pt(i, (Math.max(5, get(k)) / 100) * R).join(',')).join(' ')
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto block w-full max-w-[290px]">
      {[25, 50, 75, 100].map((r) => (
        <polygon key={r} points={STAT_KEYS.map((_, i) => pt(i, (r / 100) * R).join(',')).join(' ')} fill="none" stroke="rgba(255,255,255,0.07)" />
      ))}
      {STAT_KEYS.map((_, i) => {
        const [x, y] = pt(i, R)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.07)" />
      })}
      {/* kadro ortalaması */}
      <polygon points={poly((k) => avg[k])} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeDasharray="3 3" />
      {/* oyuncu */}
      <motion.polygon points={poly((k) => p[k])} fill={color} fillOpacity="0.16" stroke={color} strokeWidth="2.5" strokeLinejoin="round"
        initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} style={{ transformOrigin: `${cx}px ${cy}px` }}
        transition={{ duration: 0.9, ease: 'easeOut' }} />
      {STAT_KEYS.map((k, i) => {
        const [x, y] = pt(i, (Math.max(5, p[k]) / 100) * R)
        return <circle key={k} cx={x} cy={y} r="3.5" fill={color} stroke="#0b0d14" strokeWidth="2" />
      })}
      {STAT_KEYS.map((k, i) => {
        const [x, y] = pt(i, R + 17)
        return (
          <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="9" className="fill-slate-400">
            {S[k]}
          </text>
        )
      })}
      <text x={cx} y={size - 4} textAnchor="middle" fontSize="8" className="fill-slate-600">— — kadro ortalaması</text>
    </svg>
  )
}

// fotoğrafı olmayanlar için büyük üretilmiş kart
function BigCard({ p, ov, t, S }) {
  return (
    <div className="p-5" style={{ color: t.text }}>
      <div className="flex items-start gap-3">
        <div className="text-center leading-none">
          <div className="text-5xl font-black tabular-nums">{ov}</div>
          <div className="mt-1 text-xs font-bold tracking-widest" style={{ color: t.ring }}>{p.pos}</div>
        </div>
        <div className="ml-auto h-24 w-24 overflow-hidden rounded-xl bg-black/25" style={{ border: `1px solid ${t.ring}55` }}>
          {p.photo_url
            ? <img src={imgSrc(p.photo_url)} alt="" className="h-full w-full object-cover" />
            : <div className="flex h-full w-full items-center justify-center text-2xl font-black opacity-60">{initials(p.name)}</div>}
        </div>
      </div>
      <div className="mt-3 truncate text-lg font-black uppercase tracking-wide">{p.name}</div>
      <div className="my-2 h-px w-full" style={{ background: `${t.ring}44` }} />
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-semibold">
        {STAT_KEYS.map((k) => (
          <div key={k} className="flex justify-between">
            <span className="opacity-70">{S[k]}</span>
            <span className="tabular-nums">{p[k]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Sparkles({ color }) {
  const items = Array.from({ length: 18 }, (_, i) => i)
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {items.map((i) => (
        <motion.span key={i} className="absolute h-1 w-1 rounded-full"
          style={{ left: `${(i * 61) % 100}%`, top: `${(i * 37) % 100}%`, background: color }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 0.9, 0], scale: [0, 1.4, 0] }}
          transition={{ delay: (i % 6) * 0.25, duration: 1.8, repeat: Infinity, repeatDelay: 1.5 }} />
      ))}
    </div>
  )
}
