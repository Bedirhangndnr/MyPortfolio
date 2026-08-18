import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, isConfigured } from '../lib/supabase.js'
import { Users, Trophy, Send, LogIn, Plus, Copy, Check, Loader2, RotateCcw } from 'lucide-react'

function loadNick() {
  try { return localStorage.getItem('bg_nick') || '' } catch { return '' }
}
function saveNick(n) { try { localStorage.setItem('bg_nick', n) } catch {} }

export default function FootballGame() {
  const [nick, setNick] = useState(loadNick())
  const [screen, setScreen] = useState('lobby') // lobby | playing
  const [code, setCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [round, setRound] = useState(null)
  const [players, setPlayers] = useState([])
  const [guess, setGuess] = useState('')
  const [feedback, setFeedback] = useState(null) // {type,msg}
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const chanRef = useRef(null)

  const refresh = useCallback(async (c) => {
    if (!supabase) return
    const { data: r } = await supabase.from('rounds').select('*').eq('room', c).order('id', { ascending: false }).limit(1).maybeSingle()
    if (r) setRound(r)
    const { data: ps } = await supabase.from('room_players').select('nick,score').eq('room', c).order('score', { ascending: false })
    if (ps) setPlayers(ps)
  }, [])

  const subscribe = useCallback((c) => {
    if (!supabase) return
    if (chanRef.current) supabase.removeChannel(chanRef.current)
    const ch = supabase
      .channel('room-' + c)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rounds', filter: `room=eq.${c}` }, () => refresh(c))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room=eq.${c}` }, () => refresh(c))
      .subscribe()
    chanRef.current = ch
  }, [refresh])

  useEffect(() => () => { if (chanRef.current && supabase) supabase.removeChannel(chanRef.current) }, [])

  const createRoom = async () => {
    if (!nick.trim()) return setFeedback({ type: 'warn', msg: 'Önce bir takma ad gir.' })
    saveNick(nick.trim())
    setBusy(true); setFeedback(null)
    const { data, error } = await supabase.rpc('create_room', { nick: nick.trim() })
    setBusy(false)
    if (error) return setFeedback({ type: 'err', msg: 'Hata: ' + error.message })
    setCode(data.code); setRound(data.round); setScreen('playing')
    subscribe(data.code); refresh(data.code)
  }

  const joinRoom = async () => {
    if (!nick.trim()) return setFeedback({ type: 'warn', msg: 'Önce bir takma ad gir.' })
    if (joinCode.trim().length < 3) return setFeedback({ type: 'warn', msg: 'Oda kodu gir.' })
    saveNick(nick.trim())
    setBusy(true); setFeedback(null)
    const { data, error } = await supabase.rpc('join_room', { room_code: joinCode.trim().toUpperCase(), nick: nick.trim() })
    setBusy(false)
    if (error) return setFeedback({ type: 'err', msg: 'Hata: ' + error.message })
    if (data.error) return setFeedback({ type: 'err', msg: data.error })
    setCode(data.code); setRound(data.round); setScreen('playing')
    subscribe(data.code); refresh(data.code)
  }

  const submit = async () => {
    if (!round || round.solved || !guess.trim()) return
    setBusy(true)
    const { data, error } = await supabase.rpc('submit_guess', { round_id: round.id, guess: guess.trim(), nick: nick.trim() })
    setBusy(false)
    if (error) return setFeedback({ type: 'err', msg: 'Hata: ' + error.message })
    setGuess('')
    if (data.result === 'win') setFeedback({ type: 'win', msg: `🎉 Doğru! ${data.answer} — turu kazandın!` })
    else if (data.result === 'too_late') setFeedback({ type: 'warn', msg: `Geç kaldın — ${data.winner} "${data.answer}" ile kazandı.` })
    else if (data.result === 'wrong') setFeedback({ type: 'err', msg: 'Bu futbolcu iki takımda da oynamamış.' })
    else if (data.result === 'not_found') setFeedback({ type: 'err', msg: 'Bu isim listede yok. (Ünlü futbolcuları dene)' })
    refresh(code)
  }

  const nextRound = async () => {
    setBusy(true); setFeedback(null)
    await supabase.rpc('new_round', { room_code: code })
    setBusy(false)
    refresh(code)
  }

  const copyCode = () => {
    try { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }

  // -------- Backend hazir degilse --------
  if (!isConfigured || !supabase) {
    return (
      <div className="py-10 text-center">
        <div className="mb-3 text-4xl">⚽️</div>
        <p className="font-semibold text-white">İki Takım · Ortak Futbolcu</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
          Çok oyunculu futbolcu bilme oyunu. Backend (Supabase) bağlantısı henüz yapılmadı — birazdan aktif olacak.
        </p>
      </div>
    )
  }

  // -------- Lobi --------
  if (screen === 'lobby') {
    return (
      <div className="mx-auto max-w-sm space-y-5">
        <div className="text-center">
          <div className="text-4xl">⚽️</div>
          <p className="mt-2 text-sm text-slate-400">
            İki takım çıkar; <b className="text-white">ikisinde de oynamış</b> bir futbolcuyu ilk yazan kazanır.
          </p>
        </div>

        <div>
          <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-slate-400">Takma adın</label>
          <input
            value={nick}
            onChange={(e) => setNick(e.target.value.slice(0, 16))}
            placeholder="ör. bedo"
            className="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-2.5 text-white outline-none focus:border-accent/50"
          />
        </div>

        <button onClick={createRoom} disabled={busy} className="btn-primary w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Yeni oda kur
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-600">
          <div className="h-px flex-1 bg-white/10" /> veya <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="ODA KODU"
            className="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-2.5 text-center font-mono tracking-widest text-white outline-none focus:border-accent/50"
          />
          <button onClick={joinRoom} disabled={busy} className="btn-ghost shrink-0">
            <LogIn className="h-4 w-4" /> Katıl
          </button>
        </div>

        {feedback && <Feedback f={feedback} />}
        <p className="text-center text-[11px] text-slate-600">Kodu arkadaşlarınla paylaş, aynı odada yarışın.</p>
      </div>
    )
  }

  // -------- Oyun --------
  const solved = round?.solved
  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={copyCode} className="chip font-mono">
          Oda: <span className="text-accent">{code}</span>
          {copied ? <Check className="h-3.5 w-3.5 text-lime-neon" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <span className="flex items-center gap-1.5 text-xs text-slate-400"><Users className="h-4 w-4" /> {players.length} oyuncu</span>
      </div>

      {/* takimlar */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamBox name={round?.club_a} />
        <span className="font-mono text-sm text-slate-500">vs</span>
        <TeamBox name={round?.club_b} />
      </div>
      <p className="text-center text-xs text-slate-500">İki takımda da oynamış bir futbolcu yaz.</p>

      {solved ? (
        <div className="rounded-xl border border-lime-neon/30 bg-lime-neon/5 p-4 text-center">
          <Trophy className="mx-auto h-6 w-6 text-lime-neon" />
          <p className="mt-1 text-sm text-white">
            <b>{round.winner}</b> kazandı — <span className="text-lime-neon">{round.winner_answer}</span>
          </p>
          <button onClick={nextRound} disabled={busy} className="btn-primary mt-3 !py-2 text-xs">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Sonraki tur
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Futbolcu adı…"
            className="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-2.5 text-white outline-none focus:border-accent/50"
            autoFocus
          />
          <button onClick={submit} disabled={busy} className="btn-primary shrink-0">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      )}

      {feedback && <Feedback f={feedback} />}

      {/* skor tablosu */}
      <div className="card p-4">
        <p className="section-label mb-2">Skor tablosu</p>
        <div className="space-y-1.5">
          {players.map((p, i) => (
            <div key={p.nick} className="flex items-center justify-between text-sm">
              <span className={`flex items-center gap-2 ${p.nick === nick ? 'text-accent' : 'text-slate-300'}`}>
                <span className="font-mono text-xs text-slate-600">{i + 1}.</span> {p.nick}
                {p.nick === nick && <span className="text-[10px] text-slate-500">(sen)</span>}
              </span>
              <span className="font-mono text-white">{p.score}</span>
            </div>
          ))}
          {players.length === 0 && <p className="text-xs text-slate-500">Henüz kimse yok.</p>}
        </div>
      </div>
    </div>
  )
}

function TeamBox({ name }) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-850 px-3 py-4 text-center">
      <div className="text-sm font-semibold text-white">{name || '—'}</div>
    </div>
  )
}

function Feedback({ f }) {
  const map = {
    win: 'border-lime-neon/30 bg-lime-neon/10 text-lime-neon',
    err: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    warn: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  }
  return <div className={`rounded-lg border px-3 py-2 text-center text-sm ${map[f.type] || map.warn}`}>{f.msg}</div>
}
