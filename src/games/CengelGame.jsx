import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Lock, Check, Lightbulb, Eraser, Heart, PartyPopper, ExternalLink } from 'lucide-react'

// ============================================================
//  ÇENGEL BULMACA — PIN korumalı özel bulmaca (Merve için ❤️)
// ============================================================

const PIN = '1532'

const ENTRIES = [
  { word: 'SAÇRENGİ', clue: 'Doğuştan geldiğine inanılan', r: 9, c: 4, dir: 'A' },
  { word: 'BEDİRHAN', clue: 'Bu bulmacayı hazırlayan yakışıklı', r: 8, c: 8, dir: 'D' },
  { word: 'ÇİKOLATA', clue: 'Barışma hediyelerinin şahı', r: 2, c: 5, dir: 'D' },
  { word: 'GÜLAYCAN', clue: 'Acıların kadını 2', r: 14, c: 5, dir: 'A' },
  { word: 'BATUHAN', clue: 'Muhafazakâr ya da tutucu', r: 7, c: 0, dir: 'A' },
  { word: 'SEVGİLİ', clue: "Merve'nin resmî unvanı", r: 5, c: 11, dir: 'D' },
  { word: 'HAZİRAN', clue: 'Başlangıç', r: 13, c: 11, dir: 'D' },
  { word: 'BERGEN', clue: 'Acıların kadını', r: 6, c: 10, dir: 'A' },
  { word: 'SİNEMA', clue: 'Karanlıkta el ele tutuşulan yer', r: 4, c: 15, dir: 'D' },
  { word: 'KAHVE', clue: 'Kırk yıl hatırı olan', r: 4, c: 5, dir: 'A' },
  { word: 'MERVE', clue: 'Güzel kadın', r: 1, c: 8, dir: 'D' },
  { word: 'MERVE', clue: 'Lisedeki alık, enayi, sessiz kişi (bkz. "Güzel kadın")', r: 1, c: 8, dir: 'A' },
  { word: 'DUMAN', clue: '9 canlı olan hayvan', r: 19, c: 7, dir: 'A' },
  { word: 'DENİZ', clue: 'Yazın çekim merkezi', r: 11, c: 5, dir: 'A' },
  { word: 'PAZAR', clue: 'Kahvaltının öğlene sarktığı gün', r: 6, c: 1, dir: 'D' },
  { word: 'TATİL', clue: 'Hayalini kurduğumuz şey', r: 9, c: 14, dir: 'A' },
  { word: 'MÜZİK', clue: 'Yolculukların vazgeçilmezi', r: 6, c: 17, dir: 'D' },
  { word: 'MRBON', clue: 'Akşam 19.00–00.30 arası oturulan yer', r: 17, c: 10, dir: 'A' },
  { word: 'UYKU', clue: 'Hafta sonunun kutsalı', r: 4, c: 3, dir: 'D' },
  { word: 'KEDİ', clue: "Duman'ın türü", r: 0, c: 12, dir: 'D' },
  { word: 'ONUR', clue: 'Kıskanç erkek', r: 16, c: 14, dir: 'D' },
  { word: 'SEKS', clue: 'Yapılmayı beklenmeyen şey', r: 4, c: 15, dir: 'A' },
  { word: 'GÜL', clue: 'Kırmızısı aşkın simgesi', r: 6, c: 13, dir: 'D' },
  { word: 'ÇAY', clue: 'MrBon oturmalarının demlisi', r: 9, c: 0, dir: 'A' },
  { word: 'AŞK', clue: 'Bu bulmacanın yakıtı', r: 2, c: 17, dir: 'D' },
  { word: 'AY', clue: 'Gecenin lambası', r: 5, c: 2, dir: 'A' },
  { word: 'EV', clue: 'Dünyanın en huzurlu köşesi', r: 11, c: 6, dir: 'D' },
  { word: 'DİZİ', clue: '"Son bölüm" diye diye biten maraton', r: 3, c: 11, dir: 'A' },
  { word: 'PATİ', clue: "Duman'ın imzası", r: 0, c: 14, dir: 'D' },
  { word: 'YAZ', clue: "Haziran'ın müjdecisi", r: 2, c: 16, dir: 'A' },
]

const ROWS = 20
const COLS = 19

// Başlangıçta dolu gelen ipucu kelimeler (hazır çözülmüş)
const GIVEN_WORDS = ['KAHVE', 'AŞK', 'EV', 'AY', 'DENİZ']

const upTr = (s) => s.toLocaleUpperCase('tr-TR')
const keyOf = (r, c) => `${r},${c}`

function buildGiven() {
  const given = {}
  for (const e of ENTRIES) {
    if (!GIVEN_WORDS.includes(e.word)) continue
    for (let i = 0; i < e.word.length; i++) {
      const r = e.r + (e.dir === 'D' ? i : 0)
      const c = e.c + (e.dir === 'A' ? i : 0)
      given[keyOf(r, c)] = e.word[i]
    }
  }
  return given
}
const GIVEN = buildGiven()

function buildBoard() {
  const cells = new Map() // key -> { letter, entries: [idx] }
  ENTRIES.forEach((e, idx) => {
    for (let i = 0; i < e.word.length; i++) {
      const r = e.r + (e.dir === 'D' ? i : 0)
      const c = e.c + (e.dir === 'A' ? i : 0)
      const k = keyOf(r, c)
      if (!cells.has(k)) cells.set(k, { r, c, letter: e.word[i], entries: [] })
      cells.get(k).entries.push(idx)
    }
  })
  // numaralandırma: başlangıç hücrelerini (r,c) sırasına göre numarala
  const starts = new Map() // key -> number
  const sorted = [...ENTRIES.map((e, i) => ({ ...e, idx: i }))].sort((a, b) => a.r - b.r || a.c - b.c)
  let n = 0
  const numbers = {}
  for (const e of sorted) {
    const k = keyOf(e.r, e.c)
    if (!starts.has(k)) { n++; starts.set(k, n) }
    numbers[e.idx] = starts.get(k)
  }
  return { cells, numbers, starts }
}

export default function CengelGame() {
  const { cells, numbers, starts } = useMemo(buildBoard, [])
  const [unlocked, setUnlocked] = useState(false)
  const [pin, setPin] = useState('')
  const [pinErr, setPinErr] = useState(false)
  const [values, setValues] = useState({ ...GIVEN }) // key -> letter
  const [checked, setChecked] = useState(false)
  const [sel, setSel] = useState(null) // {r,c}
  const [dirPref, setDirPref] = useState('A')
  const [won, setWon] = useState(false)
  const inputRef = useRef(null)

  const tryPin = (p) => {
    if (p === PIN) { setUnlocked(true); setPinErr(false) }
    else if (p.length === 4) { setPinErr(true); setPin('') }
  }

  const activeEntryIdx = useMemo(() => {
    if (!sel) return null
    const cell = cells.get(keyOf(sel.r, sel.c))
    if (!cell) return null
    const pref = cell.entries.find((i) => ENTRIES[i].dir === dirPref)
    return pref ?? cell.entries[0]
  }, [sel, dirPref, cells])

  const activeCells = useMemo(() => {
    if (activeEntryIdx == null) return new Set()
    const e = ENTRIES[activeEntryIdx]
    const s = new Set()
    for (let i = 0; i < e.word.length; i++) s.add(keyOf(e.r + (e.dir === 'D' ? i : 0), e.c + (e.dir === 'A' ? i : 0)))
    return s
  }, [activeEntryIdx])

  const focusInput = () => { try { inputRef.current?.focus() } catch {} }

  const clickCell = (r, c) => {
    const cell = cells.get(keyOf(r, c))
    if (!cell) return
    if (sel && sel.r === r && sel.c === c && cell.entries.length > 1) {
      setDirPref((d) => (d === 'A' ? 'D' : 'A')) // aynı hücreye tekrar tıkla -> yön değiştir
    } else if (cell.entries.length === 1) {
      setDirPref(ENTRIES[cell.entries[0]].dir)
    }
    setSel({ r, c })
    focusInput()
  }

  const move = useCallback((from, delta) => {
    if (activeEntryIdx == null) return
    const e = ENTRIES[activeEntryIdx]
    const dr = e.dir === 'D' ? delta : 0
    const dc = e.dir === 'A' ? delta : 0
    const nr = from.r + dr, nc = from.c + dc
    if (cells.has(keyOf(nr, nc))) setSel({ r: nr, c: nc })
  }, [activeEntryIdx, cells])

  const typeChar = (ch) => {
    if (!sel) return
    const k = keyOf(sel.r, sel.c)
    if (GIVEN[k]) { move(sel, 1); return } // hazır gelen harf değişmez, atla
    const L = upTr(ch)
    if (!/^[A-ZÇĞİIÖŞÜ]$/.test(L)) return
    setValues((v) => ({ ...v, [k]: L }))
    setChecked(false)
    move(sel, 1)
  }

  const backspace = () => {
    if (!sel) return
    const k = keyOf(sel.r, sel.c)
    if (GIVEN[k]) { move(sel, -1); return }
    setValues((v) => {
      const nv = { ...v }
      if (nv[k]) delete nv[k]
      return nv
    })
    setChecked(false)
    move(sel, -1)
  }

  const onKeyDown = (ev) => {
    if (ev.key === 'Backspace') { ev.preventDefault(); backspace(); return }
    if (ev.key === 'ArrowRight' && sel) { setDirPref('A'); const k = keyOf(sel.r, sel.c + 1); if (cells.has(k)) setSel({ r: sel.r, c: sel.c + 1 }); return }
    if (ev.key === 'ArrowLeft' && sel) { setDirPref('A'); const k = keyOf(sel.r, sel.c - 1); if (cells.has(k)) setSel({ r: sel.r, c: sel.c - 1 }); return }
    if (ev.key === 'ArrowDown' && sel) { setDirPref('D'); const k = keyOf(sel.r + 1, sel.c); if (cells.has(k)) setSel({ r: sel.r + 1, c: sel.c }); return }
    if (ev.key === 'ArrowUp' && sel) { setDirPref('D'); const k = keyOf(sel.r - 1, sel.c); if (cells.has(k)) setSel({ r: sel.r - 1, c: sel.c }); return }
    if (ev.key.length === 1) { ev.preventDefault(); typeChar(ev.key) }
  }

  const check = () => { setChecked(true) }

  const hint = () => {
    if (!sel) return
    const cell = cells.get(keyOf(sel.r, sel.c))
    if (!cell) return
    setValues((v) => ({ ...v, [keyOf(sel.r, sel.c)]: cell.letter }))
    move(sel, 1)
  }

  const clearAll = () => { setValues({ ...GIVEN }); setChecked(false) }

  // kazanma kontrolü
  useEffect(() => {
    if (won) return
    for (const [k, cell] of cells) {
      if (values[k] !== cell.letter) return
    }
    setWon(true)
  }, [values, cells, won])

  const openTab = (
    <a
      href="/oyun/cengel"
      target="_blank"
      rel="noopener noreferrer"
      title="Bulmacayı yeni sekmede/link olarak aç"
      className="chip"
    >
      <ExternalLink className="h-3.5 w-3.5" /> Yeni sekmede aç
    </a>
  )

  // ---------- PIN ekranı ----------
  if (!unlocked) {
    return (
      <div className="mx-auto max-w-xs space-y-5 text-center">
        <div className="text-4xl">🧩</div>
        <p className="font-semibold text-white">Çengel Bulmaca</p>
        <p className="text-sm text-slate-400">Bu bulmaca özel birine ait. Girmek için PIN gerekli.</p>
        <div className="flex items-center justify-center gap-2">
          <Lock className="h-4 w-4 text-slate-500" />
          <input
            value={pin}
            onChange={(e) => { const p = e.target.value.replace(/\D/g, '').slice(0, 4); setPin(p); tryPin(p) }}
            placeholder="••••"
            inputMode="numeric"
            className={`w-32 rounded-xl border bg-ink-900 px-4 py-2.5 text-center font-mono text-xl tracking-[0.5em] text-white outline-none ${pinErr ? 'border-rose-500/60' : 'border-white/10 focus:border-accent/50'}`}
            autoFocus
          />
        </div>
        {pinErr && <p className="text-xs text-rose-400">Yanlış PIN. Tekrar dene.</p>}
        <div className="flex justify-center">{openTab}</div>
      </div>
    )
  }

  // ---------- Kazanma ekranı ----------
  if (won) {
    return (
      <div className="mx-auto max-w-sm space-y-4 py-8 text-center">
        <PartyPopper className="mx-auto h-10 w-10 text-amber-300" />
        <p className="text-2xl font-bold text-white">Tebrikler! 🎉</p>
        <p className="text-slate-300">
          Bulmacanın tamamını çözdün.
        </p>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5">
          <Heart className="mx-auto h-6 w-6 text-rose-400" />
          <p className="mt-2 text-sm text-rose-200">
            Merve — güzel kadın, 1. sorunun ve bu bulmacayı hazırlatanın kalbinin tek doğru cevabı. ❤️
          </p>
          <p className="mt-1 text-xs text-slate-500">— Bedirhan</p>
        </div>
        <button onClick={() => { setWon(false); clearAll() }} className="btn-ghost mx-auto text-xs">Baştan çöz</button>
      </div>
    )
  }

  // ---------- Bulmaca ----------
  const across = ENTRIES.map((e, i) => ({ ...e, idx: i })).filter((e) => e.dir === 'A').sort((a, b) => numbers[a.idx] - numbers[b.idx])
  const down = ENTRIES.map((e, i) => ({ ...e, idx: i })).filter((e) => e.dir === 'D').sort((a, b) => numbers[a.idx] - numbers[b.idx])

  return (
    <div className="space-y-5">
      {/* gizli input: mobil klavye için */}
      <input
        ref={inputRef}
        onKeyDown={onKeyDown}
        onChange={(e) => { const ch = e.target.value.slice(-1); e.target.value = ''; if (ch) typeChar(ch) }}
        className="fixed -top-20 left-0 h-px w-px opacity-0"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-400">
          Hücreye tıkla, yaz. Aynı hücreye tekrar tıklayınca yön değişir.
          {activeEntryIdx != null && (
            <span className="ml-2 text-accent">
              {numbers[activeEntryIdx]}. {ENTRIES[activeEntryIdx].dir === 'A' ? 'Soldan Sağa' : 'Yukarıdan Aşağıya'}: {ENTRIES[activeEntryIdx].clue}
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {openTab}
          <button onClick={hint} className="btn-ghost !py-1.5 text-xs" title="Seçili hücrenin harfini ver"><Lightbulb className="h-3.5 w-3.5" /> Harf</button>
          <button onClick={check} className="btn-ghost !py-1.5 text-xs"><Check className="h-3.5 w-3.5" /> Kontrol</button>
          <button onClick={clearAll} className="btn-ghost !py-1.5 text-xs"><Eraser className="h-3.5 w-3.5" /> Temizle</button>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div
          className="mx-auto grid w-max gap-[2px]"
          style={{ gridTemplateRows: `repeat(${ROWS}, 26px)`, gridTemplateColumns: `repeat(${COLS}, 26px)` }}
        >
          {Array.from({ length: ROWS }).map((_, r) =>
            Array.from({ length: COLS }).map((_, c) => {
              const k = keyOf(r, c)
              const cell = cells.get(k)
              if (!cell) return <div key={k} />
              const val = values[k] || ''
              const isSel = sel && sel.r === r && sel.c === c
              const inActive = activeCells.has(k)
              const num = starts.get(k)
              const isGiven = !!GIVEN[k]
              let cls = 'relative flex cursor-pointer select-none items-center justify-center rounded-[4px] border text-[13px] font-bold '
              if (isGiven) cls += isSel || inActive ? 'border-amber-400/50 bg-amber-400/15 text-amber-200 ' : 'border-amber-400/25 bg-amber-400/10 text-amber-200/90 '
              else if (checked && val) cls += val === cell.letter ? 'border-lime-neon/50 bg-lime-neon/15 text-lime-neon ' : 'border-rose-500/60 bg-rose-500/15 text-rose-300 '
              else if (isSel) cls += 'border-accent bg-accent/25 text-white '
              else if (inActive) cls += 'border-accent/40 bg-accent/10 text-white '
              else cls += 'border-white/15 bg-ink-850 text-white '
              return (
                <div key={k} className={cls} onClick={() => clickCell(r, c)}>
                  {num && <span className="absolute left-[1px] top-[-1px] text-[7px] font-normal text-slate-500">{num}</span>}
                  {val}
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <p className="section-label mb-2">Soldan Sağa</p>
          <div className="space-y-1">
            {across.map((e) => (
              <button key={e.idx} onClick={() => { setSel({ r: e.r, c: e.c }); setDirPref('A'); focusInput() }}
                className={`block w-full text-left text-xs ${activeEntryIdx === e.idx ? 'text-accent' : 'text-slate-400 hover:text-slate-200'}`}>
                <b className="font-mono">{numbers[e.idx]}.</b> {e.clue} <span className="text-slate-600">({e.word.length})</span>
              </button>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <p className="section-label mb-2">Yukarıdan Aşağıya</p>
          <div className="space-y-1">
            {down.map((e) => (
              <button key={e.idx} onClick={() => { setSel({ r: e.r, c: e.c }); setDirPref('D'); focusInput() }}
                className={`block w-full text-left text-xs ${activeEntryIdx === e.idx ? 'text-accent' : 'text-slate-400 hover:text-slate-200'}`}>
                <b className="font-mono">{numbers[e.idx]}.</b> {e.clue} <span className="text-slate-600">({e.word.length})</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
