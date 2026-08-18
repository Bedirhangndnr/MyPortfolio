import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase, isConfigured } from '../lib/supabase.js'
import { QUESTIONS, DERSLER, AXES } from './karne/questions.js'
import { Users, Loader2, Plus, LogIn, Copy, Check, ExternalLink, Heart, GraduationCap, RotateCcw, Trophy } from 'lucide-react'

// ============================================================
//  AŞK KARNESİ — sevgililer için senkron "emek testi"
//  İki telefon, oda kodu, Evet/Hayır + 0-100 emin olma barı.
//  Sonuç: ders ders notlu karne + radar + eğlenceli istatistik.
// ============================================================

function loadNick() { try { return localStorage.getItem('bg_nick') || '' } catch { return '' } }
function saveNick(n) { try { localStorage.setItem('bg_nick', n) } catch {} }

const LEVELS = [
  { v: 1, ad: 'Tatlı', desc: 'Isınma turları', emoji: '🍬' },
  { v: 2, ad: 'Cesur', desc: 'Biraz ter attırır', emoji: '🌶️' },
  { v: 3, ad: 'Acımasız', desc: 'Kavga çıkabilir, karışmayız', emoji: '🔥' },
]
const COUNTS = [10, 20, 30, 50]

const gradeOf = (m) => (m >= 90 ? 'AA' : m >= 80 ? 'BA' : m >= 70 ? 'BB' : m >= 60 ? 'CB' : m >= 50 ? 'CC' : m >= 40 ? 'DC' : m >= 30 ? 'DD' : 'FF')
const gradeCls = (g) => (['AA', 'BA'].includes(g) ? 'text-lime-neon' : ['BB', 'CB'].includes(g) ? 'text-accent' : ['CC', 'DC'].includes(g) ? 'text-amber-300' : 'text-rose-400')

const TITLES = {
  emek: 'Emek Şampiyonu 🏗️', sadakat: 'Sadakat Bekçisi 🛡️', romantizm: 'Romantizm Bakanı 🌹',
  sabir: 'Sabır Taşı 🪨', cesaret: 'Cesur Yürek 🦁', uyum: 'Uyum Ustası 🤝',
}

export default function KarneGame() {
  const [nick, setNick] = useState(loadNick())
  const [screen, setScreen] = useState('lobby') // lobby | setup | wait | quiz | waitpartner | result
  const [code, setCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [players, setPlayers] = useState([])
  const [room, setRoom] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [copied, setCopied] = useState(false)
  const [isHost, setIsHost] = useState(false)
  // ayarlar
  const [count, setCount] = useState(20)
  const [level, setLevel] = useState(2)
  const [selDers, setSelDers] = useState(DERSLER.filter((d) => !d.adult).map((d) => d.id))
  const [adultOk, setAdultOk] = useState(false)
  // sınav
  const [qids, setQids] = useState([])
  const [qIndex, setQIndex] = useState(0)
  const [yn, setYn] = useState(null)
  const [conf, setConf] = useState(70)
  const [answers, setAnswers] = useState(null) // sonuç: tüm cevaplar
  const chanRef = useRef(null)

  useEffect(() => {
    try {
      const c = new URLSearchParams(window.location.search).get('code')
      if (c) setJoinCode(c.toUpperCase().slice(0, 4))
    } catch {}
  }, [])
  useEffect(() => () => { if (chanRef.current && supabase) supabase.removeChannel(chanRef.current) }, [])

  const refresh = useCallback(async (c) => {
    const { data: r } = await supabase.from('ek_rooms').select('*').eq('code', c).maybeSingle()
    const { data: ps } = await supabase.from('ek_players').select('nick,progress,done').eq('room', c).order('joined_at')
    if (ps) setPlayers(ps)
    if (r) {
      setRoom(r)
      if (r.qids?.length) setQids(r.qids)
    }
    return { r, ps }
  }, [])

  const subscribe = useCallback((c) => {
    if (chanRef.current) supabase.removeChannel(chanRef.current)
    const ch = supabase
      .channel('ek-' + c)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ek_rooms', filter: `code=eq.${c}` }, () => refresh(c))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ek_players', filter: `room=eq.${c}` }, () => refresh(c))
      .subscribe()
    chanRef.current = ch
  }, [refresh])

  // oda durumu değişince ekran geçişleri
  useEffect(() => {
    if (!room) return
    if (room.status === 'running' && (screen === 'wait' || screen === 'setup')) {
      setQIndex(0); setYn(null); setConf(70); setScreen('quiz')
    }
    if (room.status === 'done' && screen !== 'result') {
      loadResults(room.code)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status])

  const loadResults = async (c) => {
    const { data } = await supabase.from('ek_answers').select('nick,qid,yn,conf').eq('room', c)
    if (data && data.length) { setAnswers(data); setScreen('result') }
  }

  const createRoom = async () => {
    if (!nick.trim()) return setErr('Önce takma adını yaz.')
    saveNick(nick.trim()); setBusy(true); setErr(null)
    const { data, error } = await supabase.rpc('ek_create_room', { p_nick: nick.trim() })
    setBusy(false)
    if (error || data?.error) return setErr(error?.message || data.error)
    setCode(data.code); setIsHost(true); setScreen('setup')
    subscribe(data.code); refresh(data.code)
  }

  const joinRoom = async () => {
    if (!nick.trim()) return setErr('Önce takma adını yaz.')
    if (joinCode.trim().length < 3) return setErr('Sınıf kodunu gir.')
    saveNick(nick.trim()); setBusy(true); setErr(null)
    const { data, error } = await supabase.rpc('ek_join', { p_code: joinCode.trim().toUpperCase(), p_nick: nick.trim() })
    setBusy(false)
    if (error || data?.error) return setErr(error?.message || data.error)
    setCode(data.code); setIsHost(false)
    subscribe(data.code)
    const { ps } = await refresh(data.code)
    if (data.status === 'running' && data.qids?.length) {
      setQids(data.qids)
      const me = ps?.find((p) => p.nick === nick.trim())
      setQIndex(Math.min(me?.progress || 0, data.qids.length))
      setScreen('quiz')
    } else {
      setScreen('wait')
    }
  }

  const toggleDers = (id) => setSelDers((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const startExam = async () => {
    const allowed = [...selDers, ...(adultOk ? [11] : [])]
    const pool = QUESTIONS.map((q, i) => ({ ...q, id: i })).filter((q) => allowed.includes(q.d) && q.l <= level)
    if (pool.length < count) return setErr(`Bu ayarlarla sadece ${pool.length} soru var — sayıyı düşür ya da ders/seviye ekle.`)
    const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, count).map((q) => q.id)
    setBusy(true); setErr(null)
    const { error } = await supabase.rpc('ek_start', {
      p_code: code,
      p_config: { count, level, dersler: allowed },
      p_qids: shuffled,
    })
    setBusy(false)
    if (error) return setErr(error.message)
    refresh(code)
  }

  const submitAnswer = async () => {
    if (yn === null) return setErr('Önce Evet ya da Hayır seç.')
    setBusy(true); setErr(null)
    const qid = qids[qIndex]
    const { error } = await supabase.rpc('ek_submit', { p_code: code, p_nick: nick.trim(), p_qid: qid, p_yn: yn, p_conf: conf })
    setBusy(false)
    if (error) return setErr(error.message)
    if (qIndex + 1 >= qids.length) {
      const { data } = await supabase.rpc('ek_finish', { p_code: code, p_nick: nick.trim() })
      if (data?.all_done) loadResults(code)
      else setScreen('waitpartner')
    } else {
      setQIndex(qIndex + 1); setYn(null); setConf(70)
    }
    refresh(code)
  }

  const restart = async () => {
    setBusy(true)
    await supabase.rpc('ek_restart', { p_code: code })
    setBusy(false)
    setAnswers(null); setQids([]); setQIndex(0); setYn(null)
    setScreen(isHost ? 'setup' : 'wait')
    refresh(code)
  }

  const copyLink = () => {
    try {
      navigator.clipboard.writeText(`${window.location.origin}/oyun/karne?code=${code}`)
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  // ---------------- SONUÇ HESABI ----------------
  const result = useMemo(() => {
    if (!answers || !qids.length) return null
    const nicks = [...new Set(answers.map((a) => a.nick))]
    if (nicks.length < 2) return null
    const [A, B] = nicks
    const byQ = {}
    answers.forEach((a) => { (byQ[a.qid] = byQ[a.qid] || {})[a.nick] = a })
    const perQ = []
    qids.forEach((qid) => {
      const q = QUESTIONS[qid]
      const a = byQ[qid]?.[A], b = byQ[qid]?.[B]
      if (!q || !a || !b) return
      const match = a.yn === b.yn ? Math.round(100 - Math.abs(a.conf - b.conf) * 0.4) : Math.round(Math.max(0, 35 - (a.conf + b.conf) / 6))
      perQ.push({ qid, q, a, b, match })
    })
    if (!perQ.length) return null
    const uyum = Math.round(perQ.reduce((s, x) => s + x.match, 0) / perQ.length)
    // ders notları
    const dersMap = {}
    perQ.forEach((x) => { (dersMap[x.q.d] = dersMap[x.q.d] || []).push(x.match) })
    const dersNot = Object.entries(dersMap).map(([d, arr]) => {
      const avg = Math.round(arr.reduce((s, v) => s + v, 0) / arr.length)
      return { ders: DERSLER.find((k) => k.id === +d), avg, grade: gradeOf(avg), n: arr.length }
    }).sort((x, y) => y.avg - x.avg)
    // radar
    const radar = {}
    ;[A, B].forEach((n) => {
      radar[n] = {}
      AXES.forEach((ax) => {
        const rel = perQ.filter((x) => x.q.a === ax.key)
        if (!rel.length) { radar[n][ax.key] = 50; return }
        const v = rel.reduce((s, x) => {
          const ans = x.a.nick === n ? x.a : x.b
          return s + (ans.yn === x.q.p ? 50 + ans.conf / 2 : 50 - ans.conf / 2)
        }, 0) / rel.length
        radar[n][ax.key] = Math.round(v)
      })
    })
    // unvanlar
    const titles = AXES.map((ax) => {
      const va = radar[A][ax.key], vb = radar[B][ax.key]
      if (va === vb) return null
      return { title: TITLES[ax.key], who: va > vb ? A : B, diff: Math.abs(va - vb) }
    }).filter(Boolean).sort((x, y) => y.diff - x.diff).slice(0, 4)
    const enAyrisan = [...perQ].sort((x, y) => x.match - y.match)[0]
    const enZor = [...perQ].sort((x, y) => (x.a.conf + x.b.conf) - (y.a.conf + y.b.conf))[0]
    const enUyumlu = [...perQ].sort((x, y) => y.match - x.match)[0]
    return { A, B, perQ, uyum, dersNot, radar, titles, enAyrisan, enZor, enUyumlu }
  }, [answers, qids])

  // ---------------- EKRANLAR ----------------
  if (!isConfigured || !supabase) {
    return <div className="py-10 text-center text-slate-400">Backend bağlantısı bekleniyor…</div>
  }

  const openTab = (
    <a href={code ? `/oyun/karne?code=${code}` : '/oyun/karne'} target="_blank" rel="noopener noreferrer" className="chip" title="Yeni sekmede aç">
      <ExternalLink className="h-3.5 w-3.5" /> Yeni sekmede aç
    </a>
  )

  if (screen === 'lobby') {
    return (
      <div className="mx-auto max-w-sm space-y-5">
        <div className="text-center">
          <div className="text-4xl">💌</div>
          <p className="mt-1 font-semibold text-white">Aşk Karnesi</p>
          <p className="mt-1 text-sm text-slate-400">
            Sevgililer için senkron <b className="text-white">emek testi</b>. Aynı soruları ikiniz de kendi telefonunuzdan cevaplarsınız; sonunda ders ders notlarınızın olduğu bir <b className="text-white">karne</b> ve uyum analizi çıkar.
          </p>
        </div>
        <div>
          <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-slate-400">Takma adın</label>
          <input value={nick} onChange={(e) => setNick(e.target.value.slice(0, 16))} placeholder="ör. bedo"
            className="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-2.5 text-white outline-none focus:border-accent/50" />
        </div>
        <button onClick={createRoom} disabled={busy} className="btn-primary w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Sınıf aç (sınavı sen kur)
        </button>
        <div className="flex items-center gap-3 text-xs text-slate-600"><div className="h-px flex-1 bg-white/10" /> veya <div className="h-px flex-1 bg-white/10" /></div>
        <div className="flex gap-2">
          <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))} placeholder="SINIF KODU"
            className="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-2.5 text-center font-mono tracking-widest text-white outline-none focus:border-accent/50" />
          <button onClick={joinRoom} disabled={busy} className="btn-ghost shrink-0"><LogIn className="h-4 w-4" /> Katıl</button>
        </div>
        {err && <ErrBox msg={err} />}
        <div className="flex justify-center">{openTab}</div>
      </div>
    )
  }

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <button onClick={copyLink} className="chip font-mono" title="Davet linkini kopyala">
          Sınıf: <span className="text-accent">{code}</span>
          {copied ? <Check className="h-3.5 w-3.5 text-lime-neon" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        {openTab}
      </div>
      <span className="flex items-center gap-1.5 text-xs text-slate-400"><Users className="h-4 w-4" /> {players.length}/2</span>
    </div>
  )

  if (screen === 'setup') {
    return (
      <div className="mx-auto max-w-md space-y-5">
        {header}
        <p className="text-sm text-slate-400">Partnerine <b className="text-white">sınıf kodunu</b> ({code}) ya da davet linkini gönder. O katılınca sınavı başlat.</p>
        <div className="card space-y-4 p-4">
          <div>
            <p className="section-label mb-2">Soru sayısı</p>
            <div className="flex gap-2">
              {COUNTS.map((c) => (
                <button key={c} onClick={() => setCount(c)} className={`chip font-mono ${count === c ? '!border-accent/60 !bg-accent/15 text-accent' : ''}`}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="section-label mb-2">Sertlik</p>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <button key={l.v} onClick={() => setLevel(l.v)} title={l.desc}
                  className={`chip ${level === l.v ? '!border-accent/60 !bg-accent/15 text-accent' : ''}`}>{l.emoji} {l.ad}</button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">{LEVELS.find((l) => l.v === level)?.desc} — seçilen seviye ve altındaki sorular gelir.</p>
          </div>
          <div>
            <p className="section-label mb-2">Dersler</p>
            <div className="flex flex-wrap gap-1.5">
              {DERSLER.filter((d) => !d.adult).map((d) => (
                <button key={d.id} onClick={() => toggleDers(d.id)}
                  className={`chip text-[11px] ${selDers.includes(d.id) ? '!border-accent/60 !bg-accent/15 text-accent' : 'opacity-60'}`}>{d.emoji} {d.ad}</button>
              ))}
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-slate-400">
              <input type="checkbox" checked={adultOk} onChange={(e) => setAdultOk(e.target.checked)} className="accent-rose-500" />
              🔞 Yasak Bölge dersini aç <span className="text-slate-600">(ikiniz de 18+ iseniz)</span>
            </label>
          </div>
        </div>
        <div className="card p-4">
          <p className="section-label mb-2">Sınıf</p>
          {players.map((p) => (
            <div key={p.nick} className="flex items-center justify-between text-sm text-slate-300">
              <span>{p.nick} {p.nick === nick.trim() && <span className="text-[10px] text-slate-500">(sen)</span>}</span>
              <span className="text-lime-neon">hazır</span>
            </div>
          ))}
          {players.length < 2 && <p className="mt-1 text-xs text-amber-300/80 animate-pulse">Partner bekleniyor…</p>}
        </div>
        <button onClick={startExam} disabled={busy || players.length < 2} className="btn-primary w-full disabled:opacity-40">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />} Sınavı Başlat
        </button>
        {err && <ErrBox msg={err} />}
      </div>
    )
  }

  if (screen === 'wait') {
    return (
      <div className="mx-auto max-w-sm space-y-5 text-center">
        {header}
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-slate-300">Sınıfa girdin! <b className="text-white">{players.find((p) => p.nick !== nick.trim())?.nick || 'Partnerin'}</b> sınavı ayarlıyor, başlamasını bekle…</p>
      </div>
    )
  }

  if (screen === 'quiz') {
    const q = QUESTIONS[qids[qIndex]]
    if (!q) return <div className="py-10 text-center text-slate-400">Soru yükleniyor…</div>
    const ders = DERSLER.find((d) => d.id === q.d)
    const partner = players.find((p) => p.nick !== nick.trim())
    return (
      <div className="mx-auto max-w-md space-y-5">
        {header}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="chip text-[11px]">{ders?.emoji} {ders?.ad}</span>
          <span className="font-mono">{qIndex + 1} / {qids.length}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
          <div className="h-full bg-accent transition-all" style={{ width: `${(qIndex / qids.length) * 100}%` }} />
        </div>
        <div className="card p-5">
          <p className="text-base font-medium leading-relaxed text-white">{q.t}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={() => setYn(true)} className={`rounded-xl border px-4 py-3 font-semibold transition ${yn === true ? 'border-lime-neon/60 bg-lime-neon/15 text-lime-neon' : 'border-white/10 bg-ink-900 text-white hover:border-white/25'}`}>Evet</button>
            <button onClick={() => setYn(false)} className={`rounded-xl border px-4 py-3 font-semibold transition ${yn === false ? 'border-rose-500/60 bg-rose-500/15 text-rose-300' : 'border-white/10 bg-ink-900 text-white hover:border-white/25'}`}>Hayır</button>
          </div>
          <div className="mt-5">
            <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
              <span>Ne kadar eminsin?</span>
              <span className="font-mono text-accent">{conf}</span>
            </div>
            <input type="range" min="0" max="100" value={conf} onChange={(e) => setConf(+e.target.value)} className="w-full accent-sky-400" />
            <div className="flex justify-between text-[10px] text-slate-600"><span>hiç emin değilim</span><span>kalıbımı basarım</span></div>
          </div>
          <button onClick={submitAnswer} disabled={busy || yn === null} className="btn-primary mt-5 w-full disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Kaydet ve geç
          </button>
        </div>
        {partner && (
          <p className="text-center text-xs text-slate-500">
            {partner.nick}: {partner.done ? 'kağıdını teslim etti ✅' : `${partner.progress}/${qids.length} soruda`}
          </p>
        )}
        {err && <ErrBox msg={err} />}
      </div>
    )
  }

  if (screen === 'waitpartner') {
    const partner = players.find((p) => p.nick !== nick.trim())
    return (
      <div className="mx-auto max-w-sm space-y-5 text-center">
        {header}
        <div className="text-4xl">📝</div>
        <p className="text-sm text-slate-300">Kağıdını teslim ettin! <b className="text-white">{partner?.nick || 'Partnerin'}</b> hâlâ sınavda{partner ? ` (${partner.progress}/${qids.length})` : ''}… Kopya vermek yok. 👀</p>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
      </div>
    )
  }

  if (screen === 'result' && result) {
    const { A, B, uyum, dersNot, radar, titles, enAyrisan, enZor, enUyumlu } = result
    return (
      <div className="mx-auto max-w-lg space-y-6">
        {header}
        <div className="text-center">
          <GraduationCap className="mx-auto h-8 w-8 text-accent" />
          <p className="mt-1 text-lg font-bold text-white">Dönem Sonu Karnesi</p>
          <p className="text-xs text-slate-500">{A} ♥ {B}</p>
        </div>

        {/* uyum */}
        <div className="card p-5 text-center">
          <p className="section-label">Genel Uyum</p>
          <p className={`mt-1 text-5xl font-black ${uyum >= 70 ? 'text-lime-neon' : uyum >= 45 ? 'text-amber-300' : 'text-rose-400'}`}>%{uyum}</p>
          <p className="mt-1 text-xs text-slate-400">
            {uyum >= 85 ? 'Müdür sizi örnek çift ilan etti. 🏆' : uyum >= 70 ? 'Takdir belgesi yolda. 🎉' : uyum >= 55 ? 'Teşekkür alırsınız ama etüt şart. 📚' : uyum >= 40 ? 'Veli toplantısı isteniyor. 😬' : 'İkmale kaldınız — telafi sınavı şart! 🚨'}
          </p>
        </div>

        {/* radar */}
        <div className="card p-4">
          <p className="section-label mb-1 text-center">Duygusal Profil</p>
          <Radar radar={radar} A={A} B={B} />
        </div>

        {/* ders notlari */}
        <div className="card p-4">
          <p className="section-label mb-2">Ders Notları (uyum bazlı)</p>
          <div className="space-y-1.5">
            {dersNot.map((d) => (
              <div key={d.ders.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{d.ders.emoji} {d.ders.ad} <span className="text-[10px] text-slate-600">({d.n} soru)</span></span>
                <span className={`font-mono font-bold ${gradeCls(d.grade)}`}>{d.grade} <span className="text-[10px] font-normal text-slate-500">%{d.avg}</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* unvanlar */}
        {titles.length > 0 && (
          <div className="card p-4">
            <p className="section-label mb-2">Unvanlar</p>
            <div className="space-y-1.5">
              {titles.map((t) => (
                <div key={t.title} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{t.title}</span>
                  <span className="font-semibold text-accent">{t.who}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* öne çıkan sorular */}
        <div className="card space-y-3 p-4">
          <p className="section-label">Öne Çıkanlar</p>
          {enUyumlu && (
            <QHigh label="En uyumlu cevap 💚" x={enUyumlu} />
          )}
          {enAyrisan && enAyrisan.match < 60 && (
            <QHigh label="En çok ayrışılan soru ⚡" x={enAyrisan} showAnswers />
          )}
          {enZor && (
            <QHigh label="En kararsız kalınan soru 🤔" x={enZor} />
          )}
        </div>

        <button onClick={restart} disabled={busy} className="btn-primary w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Yeni sınav (telafi hakkı)
        </button>
      </div>
    )
  }

  return <div className="py-10 text-center text-slate-400"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>
}

function QHigh({ label, x, showAnswers }) {
  return (
    <div className="rounded-lg border border-white/5 bg-ink-900/60 p-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-xs text-slate-300">{x.q.t}</p>
      {showAnswers && (
        <p className="mt-1 text-[11px] text-slate-500">
          {x.a.nick}: <b className={x.a.yn ? 'text-lime-neon' : 'text-rose-400'}>{x.a.yn ? 'Evet' : 'Hayır'}</b> (%{x.a.conf})
          {' · '}
          {x.b.nick}: <b className={x.b.yn ? 'text-lime-neon' : 'text-rose-400'}>{x.b.yn ? 'Evet' : 'Hayır'}</b> (%{x.b.conf})
        </p>
      )}
    </div>
  )
}

function Radar({ radar, A, B }) {
  const size = 300, cx = size / 2, cy = size / 2 + 4, R = 100
  const n = AXES.length
  const pt = (i, r) => {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)]
  }
  const poly = (vals) => AXES.map((ax, i) => pt(i, (Math.max(5, vals[ax.key]) / 100) * R).join(',')).join(' ')
  const rings = [25, 50, 75, 100]
  const colA = '#38bdf8', colB = '#a3e635'
  return (
    <div>
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto block w-full max-w-[320px]">
        {rings.map((r) => (
          <polygon key={r} points={AXES.map((_, i) => pt(i, (r / 100) * R).join(',')).join(' ')} fill="none" stroke="rgba(255,255,255,0.07)" />
        ))}
        {AXES.map((_, i) => {
          const [x, y] = pt(i, R)
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.07)" />
        })}
        <polygon points={poly(radar[A])} fill={colA} fillOpacity="0.14" stroke={colA} strokeWidth="2" />
        <polygon points={poly(radar[B])} fill={colB} fillOpacity="0.14" stroke={colB} strokeWidth="2" />
        {AXES.map((ax, i) => {
          const [x, y] = pt(i, R + 20)
          return (
            <text key={ax.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-slate-400" fontSize="11">
              {ax.ad}
            </text>
          )
        })}
      </svg>
      <div className="mt-2 flex justify-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-slate-300"><span className="h-2.5 w-2.5 rounded-full" style={{ background: '#38bdf8' }} /> {A}</span>
        <span className="flex items-center gap-1.5 text-slate-300"><span className="h-2.5 w-2.5 rounded-full" style={{ background: '#a3e635' }} /> {B}</span>
      </div>
    </div>
  )
}

function ErrBox({ msg }) {
  return <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-center text-sm text-rose-300">{msg}</div>
}
