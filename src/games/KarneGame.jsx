import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { supabase, isConfigured } from '../lib/supabase.js'
import { QUESTIONS, DERSLER, AXES } from './karne/questions.js'
import { Users, Loader2, Plus, LogIn, Copy, Check, ExternalLink, Heart, GraduationCap, RotateCcw, Trophy } from 'lucide-react'

// Doğrulanmış grafik paleti (koyu yüzey): oyuncu A mavi, oyuncu B turuncu;
// ayrışma şeridi mavi↔kırmızı diverging, nötr orta gri.
const COL_A = '#3987e5'
const COL_B = '#d95926'
const DIV_NEG = 'e66767'
const DIV_MID = '383835'
const DIV_POS = '3987e5'
const SURFACE = '#0b0d14'

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

const PERSONA_TOP = {
  emek: ['Emek Şampiyonu 💪', 'Bu ilişkinin hamalı — ne varsa sırtlıyor.'],
  sadakat: ['Kale Duvarı 🛡️', 'Şüpheye geçit yok; güven onda vücut bulmuş.'],
  romantizm: ['Klip Başrolü 🌹', 'Hayat onun için yavaş çekim bir aşk sahnesi.'],
  sabir: ['Zen Ustası 🪨', 'Krizi tebessümle karşılayan taraf.'],
  cesaret: ['Filtresiz Mikrofon 🦁', 'Aklındakini söylemekten bir an bile çekinmiyor.'],
  uyum: ['Orta Yol Mimarı 🤝', 'Her kavganın çıkışını o buluyor.'],
}
const PERSONA_LOW = {
  emek: 'Emek departmanında biraz mesaiye kalması lazım.',
  sadakat: 'Bazı sorularda güven barı hafif titredi. 👀',
  romantizm: 'Son çiçeği ne zaman aldığını bir düşünsün…',
  sabir: 'Story beğenilerini hâlâ tarıyor olabilir.',
  cesaret: 'Birkaç soruda topu taca attı, görmedik değil.',
  uyum: 'Kumandayı paylaşmayı öğrenmesi gerekebilir.',
}

function archetypeOf(uyum, avgAx) {
  if (uyum >= 85) return ['👯', 'Ruh İkizleri', 'Aynı beyni paylaşıyorsunuz; iki ayrı telefon israf olmuş.']
  if (uyum >= 70 && avgAx.romantizm >= 70) return ['🎬', 'Rom-Com Başrolleri', 'Senaryo hazır, çekimlere başlayabiliriz.']
  if (uyum >= 70) return ['🧩', 'Uyumlu Ekip', 'Fikir ayrılıkları var ama makine tıkır tıkır çalışıyor.']
  if (avgAx.sabir < 45) return ['🕵️', 'Dedektiflik Ajansı', 'İkiniz de dosya kabartıyorsunuz; ofisi resmileştirin artık.']
  if (avgAx.cesaret >= 70) return ['🔥', 'Filtresiz Çift', 'Her şey masada — sansür kurulu istifa etmiş.']
  if (uyum < 40) return ['🌪️', 'Tatlı Kaos', 'Zıt kutuplar çeker derler… bol şans diliyoruz.']
  return ['⚖️', 'Dengede Duo', 'Ne tam melek ne tam şeytan; tadında bir ortaklık.']
}

const hexLerp = (a, b, t) => {
  const pa = a.match(/\w\w/g).map((x) => parseInt(x, 16))
  const pb = b.match(/\w\w/g).map((x) => parseInt(x, 16))
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')
}
const matchColor = (m) => (m < 50 ? hexLerp(DIV_NEG, DIV_MID, m / 50) : hexLerp(DIV_MID, DIV_POS, (m - 50) / 50))

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
    // kişi istatistikleri
    const stat = {}
    ;[A, B].forEach((n) => {
      const mine = perQ.map((x) => (x.a.nick === n ? x.a : x.b))
      const avgConf = Math.round(mine.reduce((s, m) => s + m.conf, 0) / mine.length)
      const yesRate = Math.round((100 * mine.filter((m) => m.yn).length) / mine.length)
      const conf = perQ.filter((x) => x.q.a === 'cesaret')
      const confessRate = conf.length
        ? Math.round((100 * conf.filter((x) => (x.a.nick === n ? x.a : x.b).yn === x.q.p).length) / conf.length)
        : null
      stat[n] = { avgConf, yesRate, confessRate }
    })
    // kişilik kartları
    const personas = [A, B].map((n, i) => {
      const entries = AXES.map((ax) => [ax.key, radar[n][ax.key]]).sort((x, y) => y[1] - x[1])
      const top = entries[0], low = entries[entries.length - 1]
      const facts = []
      const other = n === A ? B : A
      if (stat[n].avgConf >= stat[other].avgConf + 8) facts.push(`Kalıbını basan taraf — ortalama emin olma %${stat[n].avgConf}.`)
      else if (stat[other].avgConf >= stat[n].avgConf + 8) facts.push(`Kararsız ruh — ortalama emin olma %${stat[n].avgConf}.`)
      if (stat[n].yesRate >= 65) facts.push(`"Evet" makinesi: soruların %${stat[n].yesRate}'ine evet dedi.`)
      else if (stat[n].yesRate <= 35) facts.push(`Zorlu jüri: soruların sadece %${stat[n].yesRate}'ine evet dedi.`)
      if (stat[n].confessRate !== null && stat[n].confessRate >= stat[other].confessRate + 15) facts.push(`İtiraf şampiyonu — cesaret sorularının %${stat[n].confessRate}'inde dürüst çıktı.`)
      if (facts.length < 2) facts.push(`En güçlü alanı ${AXES.find((a) => a.key === top[0]).ad} (%${top[1]}).`)
      return { nick: n, color: i === 0 ? COL_A : COL_B, title: PERSONA_TOP[top[0]][0], sub: PERSONA_TOP[top[0]][1], roast: PERSONA_LOW[low[0]], facts: facts.slice(0, 3) }
    })
    const avgAx = {}
    AXES.forEach((ax) => { avgAx[ax.key] = Math.round((radar[A][ax.key] + radar[B][ax.key]) / 2) })
    const archetype = archetypeOf(uyum, avgAx)
    return { A, B, perQ, uyum, dersNot, radar, titles, enAyrisan, enZor, enUyumlu, stat, personas, archetype }
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
    const { A, B, uyum, dersNot, radar, perQ, enAyrisan, enZor, enUyumlu, stat, personas, archetype } = result
    const Sec = ({ children, i = 0 }) => (
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.5, delay: i * 0.05 }}>
        {children}
      </motion.div>
    )
    return (
      <div className="relative mx-auto max-w-lg space-y-6">
        {uyum >= 70 && <Confetti />}
        {header}
        <div className="text-center">
          <GraduationCap className="mx-auto h-8 w-8 text-accent" />
          <p className="mt-1 text-lg font-bold text-white">Dönem Sonu Karnesi</p>
          <p className="text-xs text-slate-500">
            <span className="inline-block h-2 w-2 rounded-full align-middle" style={{ background: COL_A }} /> {A}
            <span className="mx-1.5 text-rose-400">♥</span>
            <span className="inline-block h-2 w-2 rounded-full align-middle" style={{ background: COL_B }} /> {B}
          </p>
        </div>

        {/* HERO: uyum göstergesi */}
        <Sec>
          <div className="card p-6 text-center">
            <Gauge value={uyum} />
            <p className="mt-2 text-sm font-semibold text-white">
              {uyum >= 85 ? 'Müdür sizi örnek çift ilan etti. 🏆' : uyum >= 70 ? 'Takdir belgesi yolda. 🎉' : uyum >= 55 ? 'Teşekkür alırsınız ama etüt şart. 📚' : uyum >= 40 ? 'Veli toplantısı isteniyor. 😬' : 'İkmale kaldınız — telafi sınavı şart! 🚨'}
            </p>
          </div>
        </Sec>

        {/* ÇİFT ARKETİPİ */}
        <Sec i={1}>
          <div className="card relative overflow-hidden p-5 text-center">
            <div className="pointer-events-none absolute -right-6 -top-6 text-8xl opacity-10">{archetype[0]}</div>
            <p className="section-label">Çift Tipiniz</p>
            <p className="mt-1 text-2xl font-black text-white">{archetype[0]} {archetype[1]}</p>
            <p className="mt-1 text-xs text-slate-400">{archetype[2]}</p>
          </div>
        </Sec>

        {/* RADAR */}
        <Sec i={2}>
          <div className="card p-4">
            <p className="section-label mb-1 text-center">Duygusal Profil</p>
            <Radar radar={radar} A={A} B={B} />
          </div>
        </Sec>

        {/* EKSEN DÜELLOSU */}
        <Sec i={3}>
          <div className="card p-4">
            <p className="section-label mb-3">Eksen Düellosu</p>
            <Dumbbells radar={radar} A={A} B={B} />
          </div>
        </Sec>

        {/* SINAVIN NABZI */}
        <Sec i={4}>
          <div className="card p-4">
            <p className="section-label mb-2">Sınavın Nabzı <span className="normal-case text-slate-600">— her kutu bir soru</span></p>
            <MatchStrip perQ={perQ} />
          </div>
        </Sec>

        {/* KPI KARTLARI */}
        <Sec i={5}>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Kalıbını basan" value={stat[A].avgConf >= stat[B].avgConf ? A : B}
              sub={`ort. emin olma %${Math.max(stat[A].avgConf, stat[B].avgConf)} vs %${Math.min(stat[A].avgConf, stat[B].avgConf)}`} emoji="🔨" />
            <StatTile label="Evet'çi taraf" value={stat[A].yesRate >= stat[B].yesRate ? A : B}
              sub={`evet oranı %${Math.max(stat[A].yesRate, stat[B].yesRate)} vs %${Math.min(stat[A].yesRate, stat[B].yesRate)}`} emoji="✅" />
            <StatTile label="Zirve ders" value={`${dersNot[0].ders.emoji} ${dersNot[0].ders.ad}`} sub={`${dersNot[0].grade} · %${dersNot[0].avg}`} emoji="🏆" />
            <StatTile label="Riskli ders" value={`${dersNot[dersNot.length - 1].ders.emoji} ${dersNot[dersNot.length - 1].ders.ad}`} sub={`${dersNot[dersNot.length - 1].grade} · %${dersNot[dersNot.length - 1].avg}`} emoji="🧨" />
          </div>
        </Sec>

        {/* KİŞİ ANALİZLERİ */}
        <Sec i={6}>
          <div className="grid gap-3 sm:grid-cols-2">
            {personas.map((p) => (
              <div key={p.nick} className="card p-4" style={{ borderColor: p.color + '4d' }}>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                  <p className="font-bold text-white">{p.nick}</p>
                </div>
                <p className="mt-1.5 text-sm font-semibold text-slate-200">{p.title}</p>
                <p className="text-[11px] text-slate-500">{p.sub}</p>
                <ul className="mt-2 space-y-1 text-[11px] text-slate-400">
                  {p.facts.map((f, i) => (
                    <li key={i} className="flex gap-1.5"><span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-white/25" />{f}</li>
                  ))}
                  <li className="flex gap-1.5 text-slate-500"><span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-rose-500/50" />{p.roast}</li>
                </ul>
              </div>
            ))}
          </div>
        </Sec>

        {/* DERS NOTLARI (tablo görünümü) */}
        <Sec i={7}>
          <div className="card p-4">
            <p className="section-label mb-2">Ders Notları (uyum bazlı)</p>
            <div className="space-y-2">
              {dersNot.map((d) => (
                <div key={d.ders.id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">{d.ders.emoji} {d.ders.ad} <span className="text-[10px] text-slate-600">({d.n} soru)</span></span>
                    <span className={`font-mono font-bold ${gradeCls(d.grade)}`}>{d.grade} <span className="text-[10px] font-normal text-slate-500">%{d.avg}</span></span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <motion.div className="h-full rounded-full" style={{ background: matchColor(d.avg) }}
                      initial={{ width: 0 }} whileInView={{ width: `${d.avg}%` }} viewport={{ once: true }} transition={{ duration: 0.7 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Sec>

        {/* ÖNE ÇIKANLAR */}
        <Sec i={8}>
          <div className="card space-y-3 p-4">
            <p className="section-label">Öne Çıkanlar</p>
            {enUyumlu && <QHigh label="En uyumlu cevap 💚" x={enUyumlu} />}
            {enAyrisan && enAyrisan.match < 60 && <QHigh label="En çok ayrışılan soru ⚡" x={enAyrisan} showAnswers />}
            {enZor && <QHigh label="En kararsız kalınan soru 🤔" x={enZor} />}
          </div>
        </Sec>

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

function useCountUp(target, ms = 1400) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf
    const t0 = performance.now()
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / ms)
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

function Gauge({ value }) {
  const v = useCountUp(value)
  const R = 84
  const C = 2 * Math.PI * R
  const frac = Math.min(100, Math.max(0, value)) / 100
  return (
    <div className="relative mx-auto h-52 w-52">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
        <motion.circle cx="100" cy="100" r={R} fill="none" stroke={matchColor(value)} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - frac) }}
          transition={{ duration: 1.4, ease: 'easeOut' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-black tabular-nums text-white">%{v}</span>
        <span className="mt-0.5 text-[10px] uppercase tracking-[0.25em] text-slate-500">genel uyum</span>
      </div>
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
  return (
    <div>
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto block w-full max-w-[320px]">
        {rings.map((r) => (
          <polygon key={r} points={AXES.map((_, i) => pt(i, (r / 100) * R).join(',')).join(' ')} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        ))}
        {AXES.map((_, i) => {
          const [x, y] = pt(i, R)
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        })}
        {rings.slice(0, 3).map((r) => (
          <text key={r} x={cx + 4} y={cy - (r / 100) * R - 2} fontSize="7" className="fill-slate-600">{r}</text>
        ))}
        {[[radar[A], COL_A, 0], [radar[B], COL_B, 0.25]].map(([vals, col, delay], k) => (
          <g key={k}>
            <motion.polygon points={poly(vals)} fill={col} fillOpacity="0.13" stroke={col} strokeWidth="2" strokeLinejoin="round"
              initial={{ opacity: 0, scale: 0.55 }} animate={{ opacity: 1, scale: 1 }} style={{ transformOrigin: `${cx}px ${cy}px` }}
              transition={{ duration: 0.8, delay, ease: 'easeOut' }} />
            {AXES.map((ax, i) => {
              const [x, y] = pt(i, (Math.max(5, vals[ax.key]) / 100) * R)
              return (
                <motion.circle key={ax.key} cx={x} cy={y} r="4" fill={col} stroke={SURFACE} strokeWidth="2"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + 0.6 }}>
                  <title>{`${ax.ad}: %${vals[ax.key]}`}</title>
                </motion.circle>
              )
            })}
          </g>
        ))}
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
        <span className="flex items-center gap-1.5 text-slate-300"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COL_A }} /> {A}</span>
        <span className="flex items-center gap-1.5 text-slate-300"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COL_B }} /> {B}</span>
      </div>
    </div>
  )
}

function Dumbbells({ radar, A, B }) {
  return (
    <div className="space-y-3">
      {AXES.map((ax, i) => {
        const va = radar[A][ax.key], vb = radar[B][ax.key]
        const lead = va === vb ? null : va > vb ? A : B
        const diff = Math.abs(va - vb)
        return (
          <div key={ax.key} className="flex items-center gap-3 text-xs">
            <span className="w-20 shrink-0 text-slate-400">{ax.ad}</span>
            <div className="relative h-6 flex-1">
              <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/8" />
              <motion.div className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded bg-white/20"
                style={{ left: `${Math.min(va, vb)}%`, width: 0 }}
                whileInView={{ width: `${diff}%` }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.06 }} />
              {[[va, COL_A, A], [vb, COL_B, B]].map(([v, col, n]) => (
                <motion.span key={n} className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ left: `${v}%`, background: col, boxShadow: `0 0 0 2px ${SURFACE}` }}
                  initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06 + 0.25 }}
                  title={`${n}: %${v}`} />
              ))}
            </div>
            <span className="w-16 shrink-0 text-right font-mono text-[10px] text-slate-500">
              {lead ? `${lead} +${diff}` : 'berabere'}
            </span>
          </div>
        )
      })}
      <p className="text-center text-[10px] text-slate-600">Her eksende iki nokta — kim önde, aradaki çizgi ne kadar açık, bak gör.</p>
    </div>
  )
}

function MatchStrip({ perQ }) {
  return (
    <div>
      <div className="flex flex-wrap gap-[3px]">
        {perQ.map((x, i) => (
          <motion.div key={x.qid} className="h-7 w-4 rounded-[3px]"
            style={{ background: matchColor(x.match) }}
            initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.015 }}
            title={`${i + 1}. ${x.q.t}\n${x.a.nick}: ${x.a.yn ? 'Evet' : 'Hayır'} (%${x.a.conf}) · ${x.b.nick}: ${x.b.yn ? 'Evet' : 'Hayır'} (%${x.b.conf})\nUyum: %${x.match}`} />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-slate-500">
        <span>çatışma</span>
        <span className="h-2 w-16 rounded-full" style={{ background: `linear-gradient(90deg, #${DIV_NEG}, #${DIV_MID}, #${DIV_POS})` }} />
        <span>uyum</span>
      </div>
    </div>
  )
}

function StatTile({ label, value, sub, emoji }) {
  return (
    <div className="card p-3.5">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{emoji} {label}</p>
      <p className="mt-1 truncate text-sm font-bold text-white">{value}</p>
      <p className="text-[10px] text-slate-500">{sub}</p>
    </div>
  )
}

function Confetti() {
  const parts = Array.from({ length: 26 }, (_, i) => i)
  const cols = [COL_A, COL_B, '#c6f24e', '#e87ba4', '#eda100']
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-72 overflow-hidden">
      {parts.map((i) => (
        <motion.span key={i} className="absolute h-2 w-1.5 rounded-sm"
          style={{ left: `${(i * 137) % 100}%`, background: cols[i % cols.length] }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: 300, opacity: 0, rotate: (i % 2 ? 1 : -1) * 260 }}
          transition={{ duration: 2 + (i % 5) * 0.35, delay: (i % 7) * 0.18, ease: 'easeIn' }} />
      ))}
    </div>
  )
}

function ErrBox({ msg }) {
  return <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-center text-sm text-rose-300">{msg}</div>
}
