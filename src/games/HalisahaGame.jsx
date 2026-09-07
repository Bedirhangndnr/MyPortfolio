import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { supabase, isConfigured } from '../lib/supabase.js'
import PlayerCard, { PitchToken } from './halisaha/PlayerCard.jsx'
import PlayerDetail from './halisaha/PlayerDetail.jsx'
import { overall, tier, STAT_KEYS, labelsFor, POSITIONS, teamStrength, autoBalance, defaultSpot, imgSrc } from './halisaha/core.js'
import {
  Loader2, Plus, Save, Shuffle, Trash2, Upload, X, ExternalLink, Users, LayoutGrid, Dices, RotateCcw, Share2, Check, Star, Shield, CalendarClock,
} from 'lucide-react'

const VOTER_KEY = 'bg_hs_voter'
const getVoterId = () => {
  try {
    let v = localStorage.getItem(VOTER_KEY)
    if (!v) { v = 'v-' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(VOTER_KEY, v) }
    return v
  } catch { return 'v-anon-' + Date.now() }
}


function tomorrowStr() {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}
function formatMatchTime(start, end, uzun) {
  try {
    const s = new Date(start)
    const gun = s.toLocaleDateString('tr-TR', uzun ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'short' })
    const sa = s.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    const bit = end ? new Date(end).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : null
    return `${gun} ${sa}${bit ? '–' + bit : ''}`
  } catch { return '' }
}

const TEAM_META = {
  A: { ad: 'Takım A', color: '#3987e5', soft: 'rgba(57,135,229,0.16)' },
  B: { ad: 'Takım B', color: '#d95926', soft: 'rgba(217,89,38,0.16)' },
}

export default function HalisahaGame() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('saha') // saha | kartlar
  const [edit, setEdit] = useState(null) // düzenlenen oyuncu
  const [detail, setDetail] = useState(null) // detay gösterilen oyuncu
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(null) // {id, x, y}
  const [clubs, setClubs] = useState([])
  const [clubId, setClubId] = useState(null)
  const [matches, setMatches] = useState([])
  const [matchCode, setMatchCode] = useState(() => { try { return new URLSearchParams(window.location.search).get('mac')?.toUpperCase() || null } catch { return null } })
  const [newMatch, setNewMatch] = useState(null) // {title, date, time}
  const [votes, setVotes] = useState({}) // {player_id: {ort, adet}}
  const [myVotes, setMyVotes] = useState({}) // {player_id: score}
  const [copied, setCopied] = useState(false)
  const [saveState, setSaveState] = useState('idle') // idle | dirty | saving | saved | err
  const pitchRef = useRef(null)
  const dragRef = useRef(null)
  const dirtyRef = useRef(false)
  const playersRef = useRef([])
  const matchRef = useRef(null)

  const load = useCallback(async () => {
    const [{ data }, { data: vs }, { data: mine }, { data: cl }, { data: mt }] = await Promise.all([
      supabase.from('hs_players').select('*').order('sort'),
      supabase.from('hs_vote_stats').select('*'),
      supabase.from('hs_votes').select('player_id,score').eq('voter', getVoterId()),
      supabase.from('hs_clubs').select('*').order('id'),
      supabase.from('hs_matches').select('*').order('starts_at', { ascending: true }),
    ])
    if (cl) { setClubs(cl); setClubId((c) => c ?? cl[0]?.id ?? null) }
    if (mt) setMatches(mt)
    let list = data || []
    // maç modundaysa kadroyu maçtan al
    const code = new URLSearchParams(window.location.search).get('mac')?.toUpperCase() || null
    if (code && mt) {
      const m = mt.find((x) => x.code === code)
      if (m) {
        const { data: sq } = await supabase.from('hs_match_squad').select('*').eq('match_id', m.id)
        const map = Object.fromEntries((sq || []).map((r) => [r.player_id, r]))
        list = list.map((p) => (map[p.id] ? { ...p, team: map[p.id].team, fx: map[p.id].fx, fy: map[p.id].fy } : { ...p, team: null, fx: null, fy: null }))
        setClubId(m.club_id)
      }
    }
    if (data) setPlayers(list)
    if (vs) setVotes(Object.fromEntries(vs.map((v) => [v.player_id, v])))
    if (mine) setMyVotes(Object.fromEntries(mine.map((v) => [v.player_id, v.score])))
    setLoading(false)
  }, [])

  const sendVote = useCallback(async (playerId, score) => {
    setMyVotes((m) => ({ ...m, [playerId]: score }))
    const { data } = await supabase.rpc('hs_vote', { p_player: playerId, p_voter: getVoterId(), p_score: score })
    if (data?.ok) setVotes((v) => ({ ...v, [playerId]: { player_id: playerId, ort: data.ort, adet: data.adet } }))
  }, [])

  const copyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.origin + '/oyun/halisaha' + (matchCode ? `?mac=${matchCode}` : ''))
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    load()
    const ch = supabase.channel('hs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hs_players' }, () => { if (!dirtyRef.current) load() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hs_votes' }, () => { if (!dirtyRef.current) load() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  useEffect(() => { playersRef.current = players }, [players])
  useEffect(() => { matchRef.current = matchCode }, [matchCode])

  const clubPlayers = useMemo(() => players.filter((p) => !clubId || p.club_id === clubId), [players, clubId])
  const teamA = useMemo(() => clubPlayers.filter((p) => p.team === 'A'), [clubPlayers])
  const teamB = useMemo(() => clubPlayers.filter((p) => p.team === 'B'), [clubPlayers])
  const bench = useMemo(() => clubPlayers.filter((p) => !p.team), [clubPlayers])
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
        markDirty()
      } else {
        setPlayers((ps) => ps.map((p) => (p.id === info.id ? { ...p, team: null, fx: null, fy: null } : p)))
        markDirty()
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
  const pushSquad = useCallback(async (list, code) => {
    const rows = list.map((x) => ({ id: x.id, team: x.team || '', fx: x.fx, fy: x.fy }))
    return code
      ? await supabase.rpc('hs_save_match_squad', { p_code: code, p_rows: rows })
      : await supabase.rpc('hs_save_squad', { p_pin: 'acik', p_rows: rows })
  }, [])

  const saveSquad = async () => {
    setBusy(true); setMsg(null)
    const { data, error } = await pushSquad(players, matchCode)
    setBusy(false)
    if (error || data?.error) { setMsg({ t: 'err', m: error?.message || data.error }); return }
    setSaveState('saved')
    setMsg({ t: 'ok', m: matchCode ? 'Maç kadrosu kaydedildi — linke gelen herkes bu dizilişi görecek.' : 'Kadro kaydedildi.' })
  }

  // diziliş değişince kendiliğinden kaydet — sayfa yenilenince geri gitmesin
  const markDirty = useCallback(() => { dirtyRef.current = true; setSaveState('dirty') }, [])
  useEffect(() => {
    if (!dirtyRef.current || loading) return
    setSaveState('saving')
    const t = setTimeout(async () => {
      const { data, error } = await pushSquad(playersRef.current, matchRef.current)
      if (error || data?.error) { setSaveState('err'); return }
      dirtyRef.current = false
      setSaveState('saved')
    }, 700)
    return () => clearTimeout(t)
  }, [players, matchCode, loading, pushSquad])

  const activeMatch = matches.find((m) => m.code === matchCode) || null

  const createMatch = async (title, dateStr, timeStr, endTimeStr) => {
    if (!clubId) return
    const start = dateStr && timeStr ? new Date(`${dateStr}T${timeStr}`) : null
    const end = dateStr && endTimeStr ? new Date(`${dateStr}T${endTimeStr}`) : null
    if (end && start && end < start) end.setDate(end.getDate() + 1)
    setBusy(true)
    const { data, error } = await supabase.rpc('hs_create_match', {
      p_club: clubId, p_title: title || 'Maç',
      p_start: start ? start.toISOString() : null, p_end: end ? end.toISOString() : null,
    })
    setBusy(false)
    if (error || data?.error) return setMsg({ t: 'err', m: error?.message || data.error })
    setNewMatch(null)
    goMatch(data.code)
  }

  const goMatch = (code) => {
    const url = code ? `${window.location.pathname}?mac=${code}` : window.location.pathname
    window.history.replaceState({}, '', url)
    setMatchCode(code || null)
    setTimeout(load, 50)
  }

  const removeMatch = async (code) => {
    if (!window.confirm('Bu maç silinsin mi?')) return
    await supabase.rpc('hs_delete_match', { p_code: code })
    goMatch(null)
  }

  const createClub = async () => {
    const name = window.prompt('Yeni takımın adı:')
    if (!name) return
    const { data, error } = await supabase.rpc('hs_create_club', { p_name: name })
    if (error || data?.error) return setMsg({ t: 'err', m: error?.message || data.error })
    setMsg({ t: 'ok', m: `"${name}" takımı kuruldu. Kartlar sekmesinden oyuncu ekleyebilirsin.` })
    load(); setClubId(data.id)
  }

  const doBalance = () => {
    const pool = clubPlayers.filter((p) => p.active)
    const { A, B } = autoBalance(pool)
    const next = players.map((p) => {
      const ia = A.findIndex((x) => x.id === p.id)
      const ib = B.findIndex((x) => x.id === p.id)
      if (ia >= 0) { const [fx, fy] = defaultSpot(ia, 'A', p.is_gk); return { ...p, team: 'A', fx, fy } }
      if (ib >= 0) { const [fx, fy] = defaultSpot(ib, 'B', p.is_gk); return { ...p, team: 'B', fx, fy } }
      return { ...p, team: null, fx: null, fy: null }
    })
    setPlayers(next)
    markDirty()
    setMsg({ t: 'ok', m: 'Takımlar dengelendi. Beğenmezsen kartları sürükleyip değiştir.' })
  }

  const clearPitch = () => { setPlayers((ps) => ps.map((p) => ({ ...p, team: null, fx: null, fy: null }))); markDirty() }

  const savePlayer = async (form, id) => {
    setBusy(true)
    const { data, error } = await supabase.rpc('hs_save_player', { p_pin: 'acik', p_id: id ?? null, p_data: form })
    setBusy(false)
    if (error || data?.error) { setMsg({ t: 'err', m: error?.message || data.error }); return false }
    await load()
    return true
  }

  const deletePlayer = async (id) => {
    if (!window.confirm('Bu oyuncu silinsin mi?')) return
    setBusy(true)
    const { data, error } = await supabase.rpc('hs_delete_player', { p_pin: 'acik', p_id: id })
    setBusy(false)
    if (error || data?.error) return setMsg({ t: 'err', m: error?.message || data.error })
    setEdit(null); load()
  }

  const uploadPhoto = async (file, playerId) => {
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
            <LayoutGrid className="h-3.5 w-3.5" /> Kartlar ({clubPlayers.length})
          </button>
        </div>
        <a href="/oyun/halisaha" target="_blank" rel="noopener noreferrer" className="chip">
          <ExternalLink className="h-3.5 w-3.5" /> Yeni sekmede aç
        </a>
      </div>

      {/* takım + maç bandı */}
      <div className="card space-y-2.5 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Takım</span>
          {clubs.map((c) => (
            <button key={c.id} onClick={() => { setClubId(c.id); goMatch(null) }}
              className={`chip !py-1 text-[11px] ${clubId === c.id ? '!border-accent/60 !bg-accent/15 text-accent' : ''}`}>
              <Shield className="h-3 w-3" /> {c.name}
            </button>
          ))}
          <button onClick={createClub} className="chip !py-1 text-[11px] text-slate-400"><Plus className="h-3 w-3" /> Yeni takım</button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-2.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Maç</span>
          <button onClick={() => goMatch(null)} className={`chip !py-1 text-[11px] ${!matchCode ? '!border-accent/60 !bg-accent/15 text-accent' : ''}`}>
            Genel kadro
          </button>
          {matches.filter((m) => m.club_id === clubId).map((m) => (
            <button key={m.code} onClick={() => goMatch(m.code)}
              className={`chip !py-1 text-[11px] ${matchCode === m.code ? '!border-accent/60 !bg-accent/15 text-accent' : ''}`}>
              <CalendarClock className="h-3 w-3" /> {m.title}
              {m.starts_at && <span className="ml-1 opacity-70">{formatMatchTime(m.starts_at, m.ends_at)}</span>}
            </button>
          ))}
          <button onClick={() => setNewMatch({ title: '', date: tomorrowStr(), time: '23:00', end: '00:30' })}
            className="chip !py-1 text-[11px] text-slate-400"><Plus className="h-3 w-3" /> Maç oluştur</button>
        </div>

        {newMatch && (
          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-white/10 bg-ink-900/60 p-2.5">
            <div className="min-w-[130px] flex-1">
              <label className="mb-0.5 block text-[9px] uppercase text-slate-500">Başlık</label>
              <input value={newMatch.title} onChange={(e) => setNewMatch({ ...newMatch, title: e.target.value })}
                placeholder="ör. Salı Maçı" className="w-full rounded-md border border-white/10 bg-ink-850 px-2 py-1 text-xs text-white outline-none focus:border-accent/50" />
            </div>
            <div>
              <label className="mb-0.5 block text-[9px] uppercase text-slate-500">Tarih</label>
              <input type="date" value={newMatch.date} onChange={(e) => setNewMatch({ ...newMatch, date: e.target.value })}
                className="rounded-md border border-white/10 bg-ink-850 px-2 py-1 text-xs text-white outline-none focus:border-accent/50" />
            </div>
            <div>
              <label className="mb-0.5 block text-[9px] uppercase text-slate-500">Başlangıç</label>
              <input type="time" value={newMatch.time} onChange={(e) => setNewMatch({ ...newMatch, time: e.target.value })}
                className="rounded-md border border-white/10 bg-ink-850 px-2 py-1 text-xs text-white outline-none focus:border-accent/50" />
            </div>
            <div>
              <label className="mb-0.5 block text-[9px] uppercase text-slate-500">Bitiş</label>
              <input type="time" value={newMatch.end} onChange={(e) => setNewMatch({ ...newMatch, end: e.target.value })}
                className="rounded-md border border-white/10 bg-ink-850 px-2 py-1 text-xs text-white outline-none focus:border-accent/50" />
            </div>
            <button onClick={() => createMatch(newMatch.title, newMatch.date, newMatch.time, newMatch.end)} disabled={busy}
              className="btn-primary !py-1.5 text-xs">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Oluştur</button>
            <button onClick={() => setNewMatch(null)} className="btn-ghost !py-1.5 text-xs"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}

        {activeMatch && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/30 bg-accent/8 px-3 py-2">
            <div className="text-xs">
              <b className="text-white">{activeMatch.title}</b>
              {activeMatch.starts_at && <span className="ml-2 text-slate-300">{formatMatchTime(activeMatch.starts_at, activeMatch.ends_at, true)}</span>}
              <span className="ml-2 font-mono text-[10px] text-slate-500">#{activeMatch.code}</span>
            </div>
            <div className="flex gap-1.5">
              <button onClick={copyLink} className="chip !py-1 text-[11px]">
                {copied ? <Check className="h-3 w-3 text-lime-neon" /> : <Share2 className="h-3 w-3" />} {copied ? 'Kopyalandı' : 'Maç linkini kopyala'}
              </button>
              <button onClick={() => removeMatch(activeMatch.code)} className="chip !py-1 text-[11px] text-rose-300"><Trash2 className="h-3 w-3" /></button>
            </div>
          </div>
        )}
      </div>

      {msg && (
        <div className={`rounded-lg border px-3 py-2 text-center text-xs ${msg.t === 'ok' ? 'border-lime-neon/30 bg-lime-neon/10 text-lime-neon' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'}`}>
          {msg.m}
        </div>
      )}

      {tab === 'saha' ? (
        <>
          {/* denge şeridi */}
          <div className="card p-3">
            <BalanceBar sA={sA} sB={sB} />
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button onClick={doBalance} className="btn-ghost !py-1.5 text-xs"><Dices className="h-3.5 w-3.5" /> Otomatik dengele</button>
              <button onClick={clearPitch} className="btn-ghost !py-1.5 text-xs"><RotateCcw className="h-3.5 w-3.5" /> Sahayı boşalt</button>
              <button onClick={saveSquad} disabled={busy} className="btn-primary !py-1.5 text-xs">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Kadroyu kaydet
              </button>
              <span className="flex items-center gap-1 self-center text-[11px] text-slate-500">
                {saveState === 'saving' && <><Loader2 className="h-3 w-3 animate-spin" /> kaydediliyor…</>}
                {saveState === 'saved' && <><Check className="h-3 w-3 text-lime-neon" /> diziliş kaydedildi</>}
                {saveState === 'err' && <span className="text-rose-300">kaydedilemedi</span>}
              </span>
              <button onClick={copyLink} className="btn-ghost !py-1.5 text-xs">
                {copied ? <Check className="h-3.5 w-3.5 text-lime-neon" /> : <Share2 className="h-3.5 w-3.5" />} {copied ? 'Link kopyalandı' : 'Linki paylaş'}
              </button>
            </div>
          </div>

          {/* takım A · saha · takım B */}
          <div className="grid items-start gap-3 lg:grid-cols-[190px_minmax(0,1fr)_190px]">
            <TeamPanel k="A" s={sA} list={teamA} votes={votes} onPick={setDetail} />

            <div
              ref={pitchRef}
              className="relative mx-auto w-full max-w-[640px] touch-none select-none rounded-2xl border border-white/10"
              style={{ aspectRatio: '5 / 4', background: 'repeating-linear-gradient(90deg,#0f2a17 0 8%,#123219 8% 16%)', backgroundClip: 'padding-box', borderRadius: 16 }}
            >
              <div className="pointer-events-none absolute inset-2 rounded-lg border-2 border-white/25" />
              <div className="pointer-events-none absolute inset-y-2 left-1/2 w-0.5 -translate-x-1/2 bg-white/25" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[24%] w-[16%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/25" />
              <div className="pointer-events-none absolute left-2 top-1/2 h-[40%] w-[11%] -translate-y-1/2 border-2 border-l-0 border-white/25" />
              <div className="pointer-events-none absolute right-2 top-1/2 h-[40%] w-[11%] -translate-y-1/2 border-2 border-r-0 border-white/25" />
              <span className="pointer-events-none absolute left-3 top-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: TEAM_META.A.color }}>A</span>
              <span className="pointer-events-none absolute right-3 top-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: TEAM_META.B.color }}>B</span>

              {clubPlayers.filter((p) => p.team).map((p) => (
                <div
                  key={p.id}
                  onPointerDown={(e) => startDrag(e, p)}
                  onClick={() => { if (!dragRef.current) setDetail(p) }}
                  className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing ${drag?.id === p.id ? 'opacity-30' : ''}`}
                  style={{ left: `${p.fx ?? 50}%`, top: `${p.fy ?? 50}%` }}
                >
                  <PitchToken p={p} vote={votes[p.id]} />
                </div>
              ))}

              {teamA.length === 0 && teamB.length === 0 && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-[11px] text-white/60">
                  Kartları sahaya sürükle — sol yarı A, sağ yarı B.<br />Ya da "Otomatik dengele".
                </div>
              )}
            </div>

            <TeamPanel k="B" s={sB} list={teamB} votes={votes} onPick={setDetail} />
          </div>

          {/* yedek havuzu */}
          <div className="card p-3">
            <p className="section-label mb-2">Kadro dışı ({bench.length}) <span className="normal-case text-slate-600">— sahaya sürükle</span></p>
            <div className="flex touch-pan-y gap-2 overflow-x-auto pb-1">
              {bench.map((p) => (
                <div key={p.id} onPointerDown={(e) => startDrag(e, p)} onClick={() => { if (!dragRef.current) setDetail(p) }}
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
            {clubPlayers.map((p) => (
              <PlayerCard key={p.id} p={p} onClick={() => setDetail(p)} />
            ))}
          </div>
          <button onClick={() => setEdit({ isNew: true, club_id: clubId, name: '', pos: 'ORT', is_gk: false, hiz: 70, sut: 70, bitiricilik: 70, kafa: 70, defans: 70, fizik: 70, patlayicilik: 70 })}
            className="btn-ghost text-xs"><Plus className="h-4 w-4" /> Yeni oyuncu ekle</button>
        </>
      )}

      {/* sürüklenen hayalet */}
      {drag && dragPlayer && (
        <div className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2" style={{ left: drag.x, top: drag.y }}>
          <PitchToken p={dragPlayer} dragging />
        </div>
      )}

      {detail && (
        <PlayerDetail
          player={players.find((x) => x.id === detail.id) || detail}
          allPlayers={players}
          vote={votes[detail.id]}
          myVote={myVotes[detail.id]}
          onVote={sendVote}
          onClose={() => setDetail(null)}
          onEdit={() => { setEdit(detail); setDetail(null) }}
        />
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

function TeamPanel({ k, s, list, votes, onPick }) {
  const meta = TEAM_META[k]
  return (
    <div className="card p-3" style={{ borderColor: meta.color + '3d' }}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-bold text-white">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} /> {meta.ad}
        </span>
        <span className="font-mono text-lg font-black" style={{ color: meta.color }}>{s.ort || '—'}</span>
      </div>
      <p className="text-[10px] text-slate-500">{s.n} oyuncu · toplam {s.toplam}</p>

      <div className="mt-2 space-y-1">
        {['hiz', 'sut', 'defans', 'fizik'].map((sk) => (
          <div key={sk} className="flex items-center gap-1.5">
            <span className="w-8 text-[9px] uppercase text-slate-500">{sk === 'hiz' ? 'hız' : sk === 'sut' ? 'şut' : sk === 'defans' ? 'def' : 'fiz'}</span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.sat[sk]}%`, background: meta.color }} />
            </div>
            <span className="w-5 text-right font-mono text-[9px] text-slate-400">{s.sat[sk]}</span>
          </div>
        ))}
      </div>

      <div className="mt-2.5 space-y-1">
        {list.map((p) => {
          const ov = overall(p)
          const v = votes?.[p.id]
          return (
            <button key={p.id} onClick={() => onPick(p)} className="flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left transition hover:bg-white/5">
              <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-ink-850" style={{ border: `1px solid ${tier(ov).ring}66` }}>
                {p.photo_url
                  ? <img src={imgSrc(p.photo_url)} alt="" className="h-full w-full object-cover" />
                  : <span className="flex h-full w-full items-center justify-center text-[8px] font-bold text-slate-400">{p.name.slice(0,2).toLocaleUpperCase('tr-TR')}</span>}
              </span>
              <span className="flex-1 truncate text-[11px] text-slate-300">{p.name.split(' ')[0]}</span>
              {v && <span className="flex items-center gap-0.5 text-[9px] text-amber-300"><Star className="h-2.5 w-2.5 fill-amber-300" />{v.ort}</span>}
              <span className="font-mono text-[11px] font-bold" style={{ color: tier(ov).ring }}>{ov}</span>
            </button>
          )
        })}
        {list.length === 0 && <p className="py-2 text-center text-[10px] text-slate-600">boş</p>}
      </div>
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
    card_url: player.card_url || null,
    club_id: player.club_id ?? null,
  }))
  const fileRef = useRef(null)
  const cardRef = useRef(null)
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

  const pickCard = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await onUpload(file, player.id)
    if (url) set('card_url', url)
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
                ? <img src={imgSrc(form.photo_url)} alt="" className="h-full w-full object-cover" />
                : <div className="flex h-full w-full items-center justify-center text-3xl font-black" style={{ color: t.text }}>{ov}</div>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} className="hidden" />
            <input ref={cardRef} type="file" accept="image/*" onChange={pickCard} className="hidden" />
            <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn-ghost mt-2 w-full !py-1 text-[11px]">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} Yüz fotosu
            </button>
            <button onClick={() => cardRef.current?.click()} disabled={busy} className="btn-ghost mt-1 w-full !py-1 text-[11px]">
              <Upload className="h-3 w-3" /> {form.card_url ? 'Kart ✓' : 'Kart görseli'}
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
      </motion.div>
    </div>
  )
}
