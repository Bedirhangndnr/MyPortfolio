import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { supabase, isConfigured } from '../lib/supabase.js'
import PlayerCard, { PitchToken } from './halisaha/PlayerCard.jsx'
import { overall, tier, STAT_KEYS, labelsFor, POSITIONS, teamStrength, autoBalance, defaultSpot } from './halisaha/core.js'
import {
  Loader2, Plus, Save, Shuffle, Trash2, Upload, X, Lock, ExternalLink, Users, LayoutGrid, Dices, RotateCcw,
} from 'lucide-react'

const PIN_KEY = 'bg_hs_pin'
const loadPin = () => { try { return localStorage.getItem(PIN_KEY) || '' } catch { return '' } }
const savePin = (p) => { try { localStorage.setItem(PIN_KEY, p) } catch {} }

const TEAM_META = {
  A: { ad: 'Takım A', color: '#3987e5', soft: 'rgba(57,135,229,0.16)' },
  B: { ad: 'Takım B', color: '#d95926', soft: 'rgba(217,89,38,0.16)' },
}

export default function HalisahaGame() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('saha') // saha | kartlar
  const [edit, setEdit] = useState(null) // düzenlenen oyuncu
  const [pin, setPin] = useState(loadPin())
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(null) // {id, x, y}
  const pitchRef = useRef(null)
  const dragRef = useRef(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('hs_players').select('*').order('sort')
    if (data) setPlayers(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    load()
    const ch = supabase.channel('hs').on('postgres_changes', { event: '*', schema: 'public', table: 'hs_players' }, load).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  const teamA = useMemo(() => players.filter((p) => p.team === 'A'), [players])
  const teamB = useMemo(() => players.filter((p) => p.team === 'B'), [players])
  const bench = useMemo(() => players.filter((p) => !p.team), [players])
  const sA = teamStrength(teamA)
  const sB = teamStrength(teamB)

  // ---------- sürükle bırak ----------
  const startDrag = (e, p) => {
    if (e.button === 1 || e.button === 2) return
    e.preventDefault()
    const t = e.touches?.[0] || e
    dragRef.current = { id: p.id, moved: false, startX: t.clientX, startY: t.clientY }
    setDrag({ id: p.id, x: t.clientX, y: t.clientY })
  }

  useEffect(() => {
    if (!drag) return
    const move = (e) => {
      const t = e.touches?.[0] || e
      if (dragRef.current) {
        const dx = Math.abs(t.clientX - dragRef.current.startX)
        const dy = Math.abs(t.clientY - dragRef.current.startY)
        if (dx > 4 || dy > 4) dragRef.current.moved = true
      }
      setDrag((d) => (d ? { ...d, x: t.clientX, y: t.clientY } : d))
      if (e.cancelable) e.preventDefault()
    }
    const up = (e) => {
      const t = e.changedTouches?.[0] || e
      const info = dragRef.current
      dragRef.current = null
      setDrag(null)
      if (!info) return
      const rect = pitchRef.current?.getBoundingClientRect()
      if (!info.moved) return // tıklama sayılır, sürükleme değil
      if (rect && t.clientX >= rect.left && t.clientX <= rect.right && t.clientY >= rect.top && t.clientY <= rect.bottom) {
        const fx = Math.min(96, Math.max(4, ((t.clientX - rect.left) / rect.width) * 100))
        const fy = Math.min(94, Math.max(6, ((t.clientY - rect.top) / rect.height) * 100))
        const team = fx < 50 ? 'A' : 'B'
        setPlayers((ps) => ps.map((p) => (p.id === info.id ? { ...p, team, fx, fy } : p)))
      } else {
        setPlayers((ps) => ps.map((p) => (p.id === info.id ? { ...p, team: null, fx: null, fy: null } : p)))
      }
    }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [drag])

  const dragPlayer = drag ? players.find((p) => p.id === drag.id) : null

  // ---------- aksiyonlar ----------
  const needPin = () => {
    let p = pin
    if (!p) {
      p = window.prompt('Düzenleme PIN\'i:') || ''
      if (!p) return null
      setPin(p); savePin(p)
    }
    return p
  }

  const saveSquad = async () => {
    const p = needPin(); if (!p) return
    setBusy(true); setMsg(null)
    const rows = players.map((x) => ({ id: x.id, team: x.team || '', fx: x.fx, fy: x.fy }))
    const { data, error } = await supabase.rpc('hs_save_squad', { p_pin: p, p_rows: rows })
    setBusy(false)
    if (error || data?.error) { setMsg({ t: 'err', m: error?.message || data.error }); if (data?.error) { setPin(''); savePin('') } return }
    setMsg({ t: 'ok', m: 'Kadro kaydedildi — herkes aynı dizilişi görecek.' })
  }

  const doBalance = () => {
    const pool = players.filter((p) => p.active)
    const { A, B } = autoBalance(pool)
    const next = players.map((p) => {
      const ia = A.findIndex((x) => x.id === p.id)
      const ib = B.findIndex((x) => x.id === p.id)
      if (ia >= 0) { const [fx, fy] = defaultSpot(ia, 'A', p.is_gk); return { ...p, team: 'A', fx, fy } }
      if (ib >= 0) { const [fx, fy] = defaultSpot(ib, 'B', p.is_gk); return { ...p, team: 'B', fx, fy } }
      return { ...p, team: null, fx: null, fy: null }
    })
    setPlayers(next)
    setMsg({ t: 'ok', m: 'Takımlar dengelendi. Beğenmezsen kartları sürükleyip değiştir.' })
  }

  const clearPitch = () => setPlayers((ps) => ps.map((p) => ({ ...p, team: null, fx: null, fy: null })))

  const savePlayer = async (form, id) => {
    const p = needPin(); if (!p) return false
    setBusy(true)
    const { data, error } = await supabase.rpc('hs_save_player', { p_pin: p, p_id: id ?? null, p_data: form })
    setBusy(false)
    if (error || data?.error) { setMsg({ t: 'err', m: error?.message || data.error }); if (data?.error) { setPin(''); savePin('') } return false }
    await load()
    return true
  }

  const deletePlayer = async (id) => {
    const p = needPin(); if (!p) return
    if (!window.confirm('Bu oyuncu silinsin mi?')) return
    setBusy(true)
    const { data, error } = await supabase.rpc('hs_delete_player', { p_pin: p, p_id: id })
    setBusy(false)
    if (error || data?.error) return setMsg({ t: 'err', m: error?.message || data.error })
    setEdit(null); load()
  }

  const uploadPhoto = async (file, playerId) => {
    const p = needPin(); if (!p) return null
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `p${playerId || 'yeni'}-${Date.now()}.${ext}`
    setBusy(true)
    const { error } = await supabase.storage.from('halisaha').upload(path, file, { upsert: true, cacheControl: '3600' })
    setBusy(false)
    if (error) { setMsg({ t: 'err', m: 'Foto yüklenemedi: ' + error.message }); return null }
    const { data } = supabase.storage.from('halisaha').getPublicUrl(path)
    return data.publicUrl
  }

  if (!isConfigured || !supabase) return <div className="py-10 text-center text-slate-400">Backend bağlantısı bekleniyor…</div>
  if (loading) return <div className="py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" /></div>

  return (
    <div className="space-y-4">
      {/* üst bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <button onClick={() => setTab('saha')} className={`chip ${tab === 'saha' ? '!border-accent/60 !bg-accent/15 text-accent' : ''}`}>
            <Users className="h-3.5 w-3.5" /> Saha & Takımlar
          </button>
          <button onClick={() => setTab('kartlar')} className={`chip ${tab === 'kartlar' ? '!border-accent/60 !bg-accent/15 text-accent' : ''}`}>
            <LayoutGrid className="h-3.5 w-3.5" /> Kartlar ({players.length})
          </button>
        </div>
        <a href="/oyun/halisaha" target="_blank" rel="noopener noreferrer" className="chip">
          <ExternalLink className="h-3.5 w-3.5" /> Yeni sekmede aç
        </a>
      </div>

      {msg && (
        <div className={`rounded-lg border px-3 py-2 text-center text-xs ${msg.t === 'ok' ? 'border-lime-neon/30 bg-lime-neon/10 text-lime-neon' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'}`}>
          {msg.m}
        </div>
      )}

      {tab === 'saha' ? (
        <>
          {/* takım dengesi */}
          <div className="card p-4">
            <p className="section-label mb-3">Takım Dengesi</p>
            <BalanceBar sA={sA} sB={sB} />
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              {[['A', sA, teamA], ['B', sB, teamB]].map(([k, s, list]) => (
                <div key={k} className="rounded-lg border p-2.5" style={{ borderColor: TEAM_META[k].color + '4d', background: TEAM_META[k].soft }}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{TEAM_META[k].ad}</span>
                    <span className="font-mono text-sm font-black" style={{ color: TEAM_META[k].color }}>{s.ort || '—'}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-400">{s.n} oyuncu · toplam {s.toplam}</p>
                  <div className="mt-1.5 space-y-1">
                    {['hiz', 'sut', 'defans', 'fizik'].map((sk) => (
                      <div key={sk} className="flex items-center gap-1.5">
                        <span className="w-10 text-[9px] uppercase text-slate-500">{sk === 'hiz' ? 'hız' : sk === 'sut' ? 'şut' : sk}</span>
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full" style={{ width: `${s.sat[sk]}%`, background: TEAM_META[k].color }} />
                        </div>
                        <span className="w-5 text-right font-mono text-[9px] text-slate-400">{s.sat[sk]}</span>
                      </div>
                    ))}
                  </div>
                  {list.length > 0 && (
                    <p className="mt-1.5 truncate text-[10px] text-slate-500">{list.map((p) => p.name.split(' ')[0]).join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={doBalance} className="btn-ghost !py-1.5 text-xs"><Dices className="h-3.5 w-3.5" /> Otomatik dengele</button>
              <button onClick={clearPitch} className="btn-ghost !py-1.5 text-xs"><RotateCcw className="h-3.5 w-3.5" /> Sahayı boşalt</button>
              <button onClick={saveSquad} disabled={busy} className="btn-primary !py-1.5 text-xs">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Kadroyu kaydet
              </button>
            </div>
          </div>

          {/* saha */}
          <div
            ref={pitchRef}
            className="relative w-full touch-none select-none overflow-hidden rounded-2xl border border-white/10"
            style={{
              aspectRatio: '16 / 10',
              background: 'repeating-linear-gradient(90deg,#0f2a17 0 8%,#123219 8% 16%)',
            }}
          >
            {/* çizgiler */}
            <div className="pointer-events-none absolute inset-3 rounded-lg border-2 border-white/25" />
            <div className="pointer-events-none absolute inset-y-3 left-1/2 w-0.5 -translate-x-1/2 bg-white/25" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[22%] w-[14%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/25" />
            <div className="pointer-events-none absolute left-3 top-1/2 h-[38%] w-[10%] -translate-y-1/2 border-2 border-l-0 border-white/25" />
            <div className="pointer-events-none absolute right-3 top-1/2 h-[38%] w-[10%] -translate-y-1/2 border-2 border-r-0 border-white/25" />
            <span className="pointer-events-none absolute left-4 top-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: TEAM_META.A.color }}>A tarafı</span>
            <span className="pointer-events-none absolute right-4 top-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: TEAM_META.B.color }}>B tarafı</span>

            {players.filter((p) => p.team).map((p) => (
              <div
                key={p.id}
                onPointerDown={(e) => startDrag(e, p)}
                onClick={() => { if (!dragRef.current) setEdit(p) }}
                className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing ${drag?.id === p.id ? 'opacity-30' : ''}`}
                style={{ left: `${p.fx ?? 50}%`, top: `${p.fy ?? 50}%` }}
              >
                <PitchToken p={p} />
              </div>
            ))}

            {teamA.length === 0 && teamB.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-white/60">
                Aşağıdaki kartları sahaya sürükle — sol yarı A takımı, sağ yarı B takımı olur.<br />Ya da "Otomatik dengele"ye bas.
              </div>
            )}
          </div>

          {/* yedek havuzu */}
          <div className="card p-3">
            <p className="section-label mb-2">Kadro dışı ({bench.length}) <span className="normal-case text-slate-600">— sahaya sürükle</span></p>
            <div className="flex touch-pan-y gap-2 overflow-x-auto pb-1">
              {bench.map((p) => (
                <div key={p.id} onPointerDown={(e) => startDrag(e, p)} onClick={() => { if (!dragRef.current) setEdit(p) }}
                  className={`shrink-0 cursor-grab active:cursor-grabbing ${drag?.id === p.id ? 'opacity-30' : ''}`}>
                  <PlayerCard p={p} size="sm" />
                </div>
              ))}
              {bench.length === 0 && <p className="py-4 text-xs text-slate-500">Herkes sahada.</p>}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            {players.map((p) => (
              <PlayerCard key={p.id} p={p} onClick={() => setEdit(p)} />
            ))}
          </div>
          <button onClick={() => setEdit({ isNew: true, name: '', pos: 'ORT', is_gk: false, hiz: 70, sut: 70, bitiricilik: 70, kafa: 70, defans: 70, fizik: 70, patlayicilik: 70 })}
            className="btn-ghost text-xs"><Plus className="h-4 w-4" /> Yeni oyuncu ekle</button>
        </>
      )}

      {/* sürüklenen hayalet */}
      {drag && dragPlayer && (
        <div className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2" style={{ left: drag.x, top: drag.y }}>
          <PitchToken p={dragPlayer} dragging />
        </div>
      )}

      {edit && (
        <EditModal
          key={edit.id || 'new'}
          player={edit}
          busy={busy}
          onClose={() => setEdit(null)}
          onSave={savePlayer}
          onDelete={deletePlayer}
          onUpload={uploadPhoto}
        />
      )}
    </div>
  )
}

function BalanceBar({ sA, sB }) {
  const tot = sA.toplam + sB.toplam
  const pa = tot ? (sA.toplam / tot) * 100 : 50
  const diff = Math.abs(sA.ort - sB.ort)
  const durum = !sA.n || !sB.n ? 'Takımları kur' : diff <= 1 ? 'Kusursuz denge 🎯' : diff <= 3 ? 'Gayet dengeli 👌' : diff <= 6 ? 'Hafif eğik ⚖️' : 'Bu maç adil değil 🚨'
  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden rounded-lg bg-white/5">
        <div className="flex items-center justify-start pl-2 text-[10px] font-bold text-white transition-all duration-500"
          style={{ width: `${pa}%`, background: TEAM_META.A.color }}>{sA.n ? sA.toplam : ''}</div>
        <div className="flex flex-1 items-center justify-end pr-2 text-[10px] font-bold text-white transition-all duration-500"
          style={{ background: TEAM_META.B.color }}>{sB.n ? sB.toplam : ''}</div>
      </div>
      <p className="mt-1.5 text-center text-xs text-slate-400">
        {durum}{sA.n && sB.n ? ` · ortalama farkı ${diff} puan` : ''}
      </p>
    </div>
  )
}

function EditModal({ player, onClose, onSave, onDelete, onUpload, busy }) {
  const isNew = !!player.isNew
  const [form, setForm] = useState(() => ({
    name: player.name || '', pos: player.pos || 'ORT', is_gk: !!player.is_gk,
    ...Object.fromEntries(STAT_KEYS.map((k) => [k, player[k] ?? 70])),
    photo_url: player.photo_url || null,
  }))
  const fileRef = useRef(null)
  const L = labelsFor(form)
  const ov = overall({ ...form })
  const t = tier(ov)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const randomize = () => {
    const r = (a, b) => Math.round(a + Math.random() * (b - a))
    setForm((f) => ({ ...f, ...Object.fromEntries(STAT_KEYS.map((k) => [k, r(45, 92)])) }))
  }

  const pickFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await onUpload(file, player.id)
    if (url) set('photo_url', url)
  }

  const submit = async () => {
    if (!form.name.trim()) return
    const ok = await onSave({ ...form, name: form.name.trim(), is_gk: form.pos === 'KL' }, isNew ? null : player.id)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        className="my-8 w-full max-w-md rounded-2xl border border-white/10 bg-ink-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <p className="font-bold text-white">{isNew ? 'Yeni oyuncu' : 'Oyuncuyu düzenle'}</p>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-4 flex gap-4">
          <div className="shrink-0">
            <div className="h-24 w-24 overflow-hidden rounded-xl" style={{ background: t.bg, border: `1px solid ${t.ring}66` }}>
              {form.photo_url
                ? <img src={form.photo_url} alt="" className="h-full w-full object-cover" />
                : <div className="flex h-full w-full items-center justify-center text-3xl font-black" style={{ color: t.text }}>{ov}</div>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} className="hidden" />
            <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn-ghost mt-2 w-full !py-1 text-[11px]">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} Foto
            </button>
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">İsim</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-ink-850 px-3 py-2 text-sm text-white outline-none focus:border-accent/50" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">Pozisyon</label>
              <div className="flex flex-wrap gap-1">
                {POSITIONS.map((p) => (
                  <button key={p.key} onClick={() => { set('pos', p.key); set('is_gk', p.key === 'KL') }}
                    className={`chip !py-0.5 text-[10px] ${form.pos === p.key ? '!border-accent/60 !bg-accent/15 text-accent' : ''}`}>{p.kisa}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-ink-850 px-3 py-1.5">
              <span className="text-xs text-slate-400">Genel</span>
              <span className="font-mono text-lg font-black" style={{ color: t.ring }}>{ov}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="section-label">Yetenekler</p>
            <button onClick={randomize} className="chip !py-0.5 text-[10px]"><Shuffle className="h-3 w-3" /> Rastgele</button>
          </div>
          {STAT_KEYS.map((k) => (
            <div key={k} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-[10px] uppercase text-slate-400">{L[k]}</span>
              <input type="range" min="1" max="99" value={form[k]} onChange={(e) => set(k, +e.target.value)} className="flex-1 accent-sky-400" />
              <span className="w-7 text-right font-mono text-xs text-white">{form[k]}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={submit} disabled={busy || !form.name.trim()} className="btn-primary flex-1 !py-2 text-sm disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Kaydet
          </button>
          {!isNew && (
            <button onClick={() => onDelete(player.id)} disabled={busy} className="btn-ghost !py-2 text-sm text-rose-300"><Trash2 className="h-4 w-4" /></button>
          )}
        </div>
        <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-slate-600"><Lock className="h-3 w-3" /> Kaydetmek için PIN gerekir</p>
      </motion.div>
    </div>
  )
}
