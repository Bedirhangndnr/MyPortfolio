import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, isConfigured } from '../lib/supabase.js'
import { Users, Trophy, Send, LogIn, Plus, Copy, Check, Loader2, RotateCcw, Mic, MapPin, MessageSquare, ExternalLink } from 'lucide-react'

function loadNick() {
  try { return localStorage.getItem('bg_nick') || '' } catch { return '' }
}
function saveNick(n) { try { localStorage.setItem('bg_nick', n) } catch {} }

const ROUND_SECONDS = 5

export default function FootballGame() {
  const [nick, setNick] = useState(loadNick())
  const [screen, setScreen] = useState('lobby') // lobby | playing
  const [code, setCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [round, setRound] = useState(null)
  const [players, setPlayers] = useState([])
  const [guesses, setGuesses] = useState([])
  const [guess, setGuess] = useState('')
  const [feedback, setFeedback] = useState(null) // {type,msg}
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS)
  const [candidates, setCandidates] = useState(null)
  const [listening, setListening] = useState(false)
  const chanRef = useRef(null)
  const revealingRef = useRef(false)

  // ---- linkten gelen ?code= varsa oda kodunu otomatik doldur ----
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const c = params.get('code')
      if (c) setJoinCode(c.toUpperCase().slice(0, 6))
    } catch {}
  }, [])

  const refresh = useCallback(async (c) => {
    if (!supabase) return
    const { data: r } = await supabase.from('rounds').select('*').eq('room', c).order('id', { ascending: false }).limit(1).maybeSingle()
    if (r) setRound(r)
    const { data: ps } = await supabase.from('room_players').select('nick,score,city').eq('room', c).order('score', { ascending: false })
    if (ps) setPlayers(ps)
    if (r) {
      const { data: gs } = await supabase.from('guesses').select('nick,guess_text,correct,created_at').eq('round_id', r.id).order('created_at', { ascending: false }).limit(12)
      if (gs) setGuesses(gs)
      if (r.candidates) setCandidates(r.candidates)
      else setCandidates(null)
    }
    return r
  }, [])

  const subscribe = useCallback((c) => {
    if (!supabase) return
    if (chanRef.current) supabase.removeChannel(chanRef.current)
    const ch = supabase
      .channel('room-' + c)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rounds', filter: `room=eq.${c}` }, () => refresh(c))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room=eq.${c}` }, () => refresh(c))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guesses', filter: `room=eq.${c}` }, () => refresh(c))
      .subscribe()
    chanRef.current = ch
  }, [refresh])

  useEffect(() => () => { if (chanRef.current && supabase) supabase.removeChannel(chanRef.current) }, [])

  // ---- konum: odaya girince bir kere sor ----
  const shareLocation = useCallback(async (c, n) => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = Math.round(pos.coords.latitude * 10) / 10
      const lng = Math.round(pos.coords.longitude * 10) / 10
      let city = null
      try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=tr`)
        const j = await res.json()
        city = [j.city || j.locality, j.countryName].filter(Boolean).join(', ')
      } catch {}
      supabase.rpc('update_location', { room_code: c, nick: n, lat_in: lat, lng_in: lng, city_in: city })
    }, () => {}, { enableHighAccuracy: false, timeout: 4000 })
  }, [])

  const createRoom = async () => {
    if (!nick.trim()) return setFeedback({ type: 'warn', msg: 'Önce bir takma ad gir.' })
    saveNick(nick.trim())
    setBusy(true); setFeedback(null)
    const { data, error } = await supabase.rpc('create_room', { nick: nick.trim() })
    setBusy(false)
    if (error) return setFeedback({ type: 'err', msg: 'Hata: ' + error.message })
    setCode(data.code); setRound(data.round); setScreen('playing')
    subscribe(data.code); refresh(data.code); shareLocation(data.code, nick.trim())
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
    subscribe(data.code); refresh(data.code); shareLocation(data.code, nick.trim())
  }

  const doSubmit = async (text) => {
    if (!round || round.solved || !text.trim()) return
    setBusy(true)
    const { data, error } = await supabase.rpc('submit_guess', { round_id: round.id, guess: text.trim(), nick: nick.trim() })
    setBusy(false)
    if (error) return setFeedback({ type: 'err', msg: 'Hata: ' + error.message })
    setGuess('')
    if (data.result === 'win') setFeedback({ type: 'win', msg: `🎉 Doğru! ${data.answer} — turu kazandın!` })
    else if (data.result === 'too_late') setFeedback({ type: 'warn', msg: `Geç kaldın — ${data.winner} "${data.answer}" ile kazandı.` })
    else if (data.result === 'wrong') setFeedback({ type: 'err', msg: 'Bu futbolcu iki takımda da oynamamış.' })
    else if (data.result === 'not_found') setFeedback({ type: 'err', msg: 'Bu isim listede yok. (Ünlü futbolcuları dene)' })
    refresh(code)
  }

  const submit = () => doSubmit(guess)
  const pickCandidate = (name) => doSubmit(name)

  const nextRound = async () => {
    setBusy(true); setFeedback(null); setCandidates(null)
    await supabase.rpc('new_round', { room_code: code })
    setBusy(false)
    refresh(code)
  }

  const copyCode = () => {
    try { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }

  // ---- geri sayim + suresi dolunca reveal (tamamen client-local, sunucu saatine bagli degil) ----
  useEffect(() => {
    if (screen !== 'playing' || !round || round.solved) return
    revealingRef.current = false
    const startedAt = Date.now()
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000
      const left = Math.max(0, Math.ceil(ROUND_SECONDS - elapsed))
      setSecondsLeft(left)
      if (left === 0 && !revealingRef.current && !round.candidates) {
        revealingRef.current = true
        supabase.rpc('reveal_candidates', { round_id: round.id }).then(({ data }) => {
          if (data) setCandidates(data)
        })
      }
    }
    setSecondsLeft(ROUND_SECONDS)
    const t = setInterval(tick, 250)
    return () => clearInterval(t)
  }, [screen, round?.id, round?.solved])

  // ---- sesli soyleme ----
  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setFeedback({ type: 'warn', msg: 'Tarayıcın sesli girişi desteklemiyor.' }); return }
    const rec = new SR()
    rec.lang = 'tr-TR'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onstart = () => setListening(true)
    rec.onend = () => setListening(false)
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript
      setGuess(text)
      doSubmit(text)
    }
    rec.start()
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
            İki takım çıkar; <b className="text-white">ikisinde de oynamış</b> bir futbolcuyu ilk yazan kazanır. 5 saniyede kimse bilemezse 5 isim çıkar, doğrusuna ilk tıklayan kazanır.
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
        <p className="text-center text-[11px] text-slate-600">Kodu arkadaşlarınla paylaş, aynı odada yarışın. Katılınca kabaca konumun (şehir) skor tablosunda görünür — izin vermezsen sorun değil.</p>
      </div>
    )
  }

  // -------- Oyun --------
  const solved = round?.solved
  const showReveal = !solved && secondsLeft === 0 && candidates && candidates.length > 0

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button onClick={copyCode} className="chip font-mono">
            Oda: <span className="text-accent">{code}</span>
            {copied ? <Check className="h-3.5 w-3.5 text-lime-neon" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <a
            href={`/oyun/futbol?code=${code}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Bu oyunu yeni sekmede/link olarak aç"
            className="chip"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Yeni sekmede aç
          </a>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-slate-400"><Users className="h-4 w-4" /> {players.length} oyuncu</span>
      </div>

      {/* takimlar */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamBox name={round?.club_a} />
        <span className="font-mono text-sm text-slate-500">vs</span>
        <TeamBox name={round?.club_b} />
      </div>

      {!solved && (
        <div className="text-center">
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 font-mono text-2xl font-bold ${secondsLeft <= 2 ? 'border-rose-500 text-rose-400' : 'border-accent text-accent'}`}>
            {secondsLeft}
          </div>
          <p className="mt-1 text-xs text-slate-500">İki takımda da oynamış bir futbolcu yaz.</p>
        </div>
      )}

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
      ) : showReveal ? (
        <div className="space-y-2">
          <p className="text-center text-xs text-amber-300">Süre doldu! Doğru futbolcuya ilk tıklayan kazanır:</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {candidates.map((name) => (
              <button
                key={name}
                onClick={() => pickCandidate(name)}
                disabled={busy}
                className="rounded-xl border border-white/10 bg-ink-850 px-4 py-3 text-sm font-medium text-white transition hover:border-accent/60 hover:bg-accent/10 disabled:opacity-50"
              >
                {name}
              </button>
            ))}
          </div>
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
          <button onClick={startVoice} disabled={busy || listening} title="Sesli söyle" className="btn-ghost shrink-0">
            <Mic className={`h-4 w-4 ${listening ? 'animate-pulse text-rose-400' : ''}`} />
          </button>
          <button onClick={submit} disabled={busy} className="btn-primary shrink-0">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      )}

      {feedback && <Feedback f={feedback} />}

      {/* tahmin akisi */}
      {guesses.length > 0 && (
        <div className="card p-4">
          <p className="section-label mb-2 flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Tahminler</p>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {guesses.map((g, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-400"><b className="text-slate-300">{g.nick}</b>: {g.guess_text}</span>
                <span className={g.correct ? 'text-lime-neon' : 'text-slate-600'}>{g.correct ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* skor tablosu */}
      <div className="card p-4">
        <p className="section-label mb-2">Skor tablosu</p>
        <div className="space-y-1.5">
          {players.map((p, i) => (
            <div key={p.nick} className="flex items-center justify-between text-sm">
              <span className={`flex items-center gap-2 ${p.nick === nick ? 'text-accent' : 'text-slate-300'}`}>
                <span className="font-mono text-xs text-slate-600">{i + 1}.</span> {p.nick}
                {p.nick === nick && <span className="text-[10px] text-slate-500">(sen)</span>}
                {p.city && <span className="flex items-center gap-0.5 text-[10px] text-slate-600"><MapPin className="h-2.5 w-2.5" />{p.city}</span>}
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
