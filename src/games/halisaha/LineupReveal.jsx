import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Download, Share2, RotateCcw, Loader2, Check, Video } from 'lucide-react'
import { overall, tier, initials, imgSrc } from './core.js'

// ============================================================
//  Kadro tanıtımı — tamamı canvas üzerinde çizilir ki
//  aynı kareler video olarak da kaydedilebilsin.
// ============================================================

const W = 1280
const H = 720
const FPS = 30

const TEAM_C = {
  A: { ad: 'TAKIM A', renk: '#3987e5' },
  B: { ad: 'TAKIM B', renk: '#d95926' },
}

// zamanlama (saniye)
const T_INTRO = 1.0
const T_PLAYER = 1.0
const T_OUTRO = 4.0

const easeOut = (t) => 1 - Math.pow(1 - t, 3)
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp01 = (t) => Math.max(0, Math.min(1, t))

function yukle(url) {
  return new Promise((res) => {
    if (!url) return res(null)
    const im = new Image()
    im.onload = () => res(im)
    im.onerror = () => res(null)
    im.src = imgSrc(url)
  })
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const soyad = (ad) => {
  const p = (ad || '').trim().split(' ').filter(Boolean)
  const son = p[p.length - 1] || ''
  const kotu = p.length < 2 || /^\d+$/.test(son) || son.length < 3
  return (kotu ? (ad || '').trim() : son).toLocaleUpperCase('tr-TR')
}

export default function LineupReveal({ teamA = [], teamB = [], matchTitle, onClose }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)
  const startRef = useRef(0)
  const recRef = useRef(null)
  const parcaRef = useRef([])

  const [hazir, setHazir] = useState(false)
  const [kayit, setKayit] = useState(false)
  const [videoUrl, setVideoUrl] = useState(null)
  const [blob, setBlob] = useState(null)
  const [mp4, setMp4] = useState(true)
  const mimeRef = useRef('video/mp4')
  const [paylas, setPaylas] = useState(null) // {durum:'yukleniyor'|'ok'|'err', url}
  const varliklarRef = useRef({ stand: {}, yuz: {} })

  // sahne sırası: A soldan sağa, sonra B sağdan sola
  const sahne = useRef({ sira: [], sahada: [] })

  useEffect(() => {
    const a = [...teamA].sort((x, y) => (x.fx ?? 50) - (y.fx ?? 50))
    const b = [...teamB].sort((x, y) => (y.fx ?? 50) - (x.fx ?? 50))
    const sahada = [...a.map((p) => ({ p, t: 'A' })), ...b.map((p) => ({ p, t: 'B' }))]
    // kart yalnızca tam boy görseli olanlar için — görselsizler sahada rozet olarak durur
    const sira = sahada.filter(({ p }) => p.stand_url)
    sahne.current = { sira, sahada }

    let iptal = false
    ;(async () => {
      const v = { stand: {}, yuz: {} }
      await Promise.all(
        sahada.map(async ({ p }) => {
          v.stand[p.id] = await yukle(p.stand_url)
          v.yuz[p.id] = await yukle(p.photo_url)
        })
      )
      if (iptal) return
      varliklarRef.current = v
      setHazir(true)
    })()
    return () => { iptal = true }
  }, [teamA, teamB])

  const sure = T_INTRO + sahne.current.sira.length * T_PLAYER + T_OUTRO

  // ---------------- çizim ----------------
  const ciz = useCallback((t) => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    const { sira, sahada } = sahne.current
    const V = varliklarRef.current

    ctx.clearRect(0, 0, W, H)

    // ---- saha ----
    const introP = clamp01(t / T_INTRO)
    const pad = 26
    const px = pad, py = pad + 46, pw = W - pad * 2, ph = H - py - pad
    // kart aşamasında saha sağa kayar ve küçülür (kamera hareketi)
    const kartSonu = T_INTRO + sira.length * T_PLAYER
    const k = sira.length ? 1 - easeInOut(clamp01((t - kartSonu) / 1.3)) : 0
    // kart varken saha sağ tarafa sığacak şekilde küçülür
    const SOL = 424                      // kartın bittiği yer
    const hedefS = (px + pw - SOL) / pw  // ~0.67
    const sc = 1 - (1 - hedefS) * k
    const tx = px * (1 - sc) + k * (SOL - px)
    const ty = (py + ph / 2) * (1 - sc)

    ctx.save()
    ctx.translate(tx, ty)
    ctx.scale(sc, sc)

    // zemin
    ctx.fillStyle = '#07110b'
    ctx.fillRect(0, 0, W, H)
    ctx.globalAlpha = easeOut(introP)
    const g = ctx.createLinearGradient(0, py, 0, py + ph)
    g.addColorStop(0, '#123a1f')
    g.addColorStop(1, '#0c2716')
    ctx.fillStyle = g
    roundRect(ctx, px, py, pw, ph, 18)
    ctx.fill()

    // biçme şeritleri
    ctx.save()
    roundRect(ctx, px, py, pw, ph, 18)
    ctx.clip()
    const serit = pw / 12
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.028)' : 'rgba(0,0,0,0.05)'
      ctx.fillRect(px + i * serit, py, serit, ph)
    }
    ctx.restore()

    // çizgiler
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'
    ctx.lineWidth = 2.5
    roundRect(ctx, px + 14, py + 14, pw - 28, ph - 28, 8)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(W / 2, py + 14)
    ctx.lineTo(W / 2, py + ph - 14)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(W / 2, py + ph / 2, ph * 0.13, 0, Math.PI * 2)
    ctx.stroke()
    // ceza sahaları
    const cy = py + ph / 2, cyh = ph * 0.42, cw = pw * 0.10
    ctx.strokeRect(px + 14, cy - cyh / 2, cw, cyh)
    ctx.strokeRect(px + pw - 14 - cw, cy - cyh / 2, cw, cyh)
    ctx.globalAlpha = 1

    // ---- oyuncu rozetleri ----
    sahada.forEach(({ p, t: tm }) => {
      const i = sira.findIndex((s) => s.p.id === p.id)
      // kartı olmayanlar en başta belirsin
      const cikis = i < 0 ? T_INTRO : T_INTRO + i * T_PLAYER
      const yerel = clamp01((t - cikis) / 0.55)
      if (yerel <= 0) return
      const e = easeOut(yerel)
      const hx = px + 26 + ((p.fx ?? 50) / 100) * (pw - 52)
      const hy = py + 26 + ((p.fy ?? 50) / 100) * (ph - 52)
      // kenardan süzülerek gelsin
      const bx = tm === 'A' ? px - 60 : px + pw + 60
      const x = bx + (hx - bx) * e
      rozet(ctx, p, x, hy, V.yuz[p.id], e, TEAM_C[tm].renk)
    })

    ctx.restore()

    // ---- portre kartı ----
    const idx = Math.floor((t - T_INTRO) / T_PLAYER)
    if (idx >= 0 && idx < sira.length) {
      const { p, t: tm } = sira[idx]
      const yerel = (t - T_INTRO - idx * T_PLAYER) / T_PLAYER
      // yumuşak giriş / çıkış
      const gir = easeOut(clamp01(yerel / 0.45))
      const cik = 1 - easeInOut(clamp01((yerel - 0.78) / 0.22))
      const a = Math.min(gir, cik)
      if (a > 0.01) kart(ctx, p, V.stand[p.id], a, gir, TEAM_C[tm].renk, py, ph)
    }

    // ---- üst bant ----
    const ub = easeOut(clamp01((t - 0.15) / 0.5))
    ctx.save()
    ctx.globalAlpha = ub
    ctx.translate(0, -30 * (1 - ub))
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(pad, pad, 8, 34)
    ctx.fillRect(pad + 8, pad, 250, 34)
    ctx.fillStyle = '#0b0d14'
    ctx.font = '800 17px system-ui, -apple-system, sans-serif'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText((matchTitle || 'PAYNION').toLocaleUpperCase('tr-TR').slice(0, 22), pad + 22, pad + 18)
    // takım renk blokları
    const bw = (W - pad * 2 - 258) / 2
    ctx.fillStyle = TEAM_C.A.renk
    ctx.fillRect(pad + 258, pad, bw, 34)
    ctx.fillStyle = TEAM_C.B.renk
    ctx.fillRect(pad + 258 + bw, pad, bw, 34)
    ctx.fillStyle = '#fff'
    ctx.font = '800 15px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${TEAM_C.A.ad}  ·  ${teamA.length}`, pad + 258 + bw / 2, pad + 18)
    ctx.fillText(`${TEAM_C.B.ad}  ·  ${teamB.length}`, pad + 258 + bw + bw / 2, pad + 18)
    ctx.restore()

  }, [matchTitle, sure, teamA.length, teamB.length])

  // ---------------- oynat ----------------
  const oynat = useCallback((kaydet) => {
    const cv = canvasRef.current
    if (!cv) return
    setVideoUrl(null); setBlob(null); setPaylas(null)
    parcaRef.current = []
    startRef.current = performance.now()

    if (kaydet) {
      try {
        const stream = cv.captureStream(FPS)
        // MP4 (H.264) varsa onu tercih et — her yerde açılıyor
        const tipler = [
          'video/mp4;codecs=avc1.42E01E',
          'video/mp4;codecs=avc1',
          'video/mp4',
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/webm',
        ]
        const mime = tipler.find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || ''
        const temiz = mime.split(';')[0] || 'video/webm'
        mimeRef.current = temiz
        setMp4(temiz === 'video/mp4')
        const mr = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 8_000_000 } : undefined)
        mr.ondataavailable = (e) => { if (e.data.size) parcaRef.current.push(e.data) }
        mr.onstop = () => {
          const b = new Blob(parcaRef.current, { type: mimeRef.current })
          setBlob(b)
          setVideoUrl(URL.createObjectURL(b))
          setKayit(false)
        }
        mr.start(200)
        recRef.current = mr
        setKayit(true)
      } catch (e) {
        setKayit(false)
      }
    }

    const dongu = () => {
      const t = (performance.now() - startRef.current) / 1000
      ciz(Math.min(t, sure))
      if (t < sure) {
        rafRef.current = requestAnimationFrame(dongu)
      } else if (recRef.current && recRef.current.state === 'recording') {
        recRef.current.stop()
        recRef.current = null
      }
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(dongu)
  }, [ciz, sure])

  useEffect(() => {
    if (!hazir) return
    oynat(false)
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (recRef.current?.state === 'recording') recRef.current.stop()
    }
  }, [hazir, oynat])

  const indir = () => {
    if (!videoUrl) return
    const a = document.createElement('a')
    a.href = videoUrl
    a.download = `${(matchTitle || 'kadro').replace(/\s+/g, '-').toLocaleLowerCase('tr-TR')}-tanitim.${mp4 ? 'mp4' : 'webm'}`
    document.body.appendChild(a); a.click(); a.remove()
  }

  const linkAl = async () => {
    if (!blob) return
    setPaylas({ durum: 'yukleniyor' })
    try {
      const { supabase } = await import('../../lib/supabase.js')
      const uzanti = mp4 ? 'mp4' : 'webm'
      const yol = `video/kadro-${Date.now()}.${uzanti}`
      const { error } = await supabase.storage.from('halisaha').upload(yol, blob, { contentType: mimeRef.current, upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('halisaha').getPublicUrl(yol)
      await navigator.clipboard.writeText(data.publicUrl).catch(() => {})
      setPaylas({ durum: 'ok', url: data.publicUrl })
    } catch (e) {
      setPaylas({ durum: 'err', m: e?.message || 'Yüklenemedi' })
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/94 p-3 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div className="w-full max-w-[1180px]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-white">Kadro tanıtımı</p>
          <button onClick={onClose} className="rounded-lg border border-white/15 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
          <canvas ref={canvasRef} width={W} height={H} className="block w-full" />
          {!hazir && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Görseller hazırlanıyor…
            </div>
          )}
          {kayit && (
            <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-rose-600/90 px-2.5 py-1 text-[11px] font-bold text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> KAYIT
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button onClick={() => oynat(false)} disabled={!hazir || kayit} className="btn-ghost !py-1.5 text-xs disabled:opacity-40">
            <RotateCcw className="h-3.5 w-3.5" /> Baştan oynat
          </button>
          <button onClick={() => oynat(true)} disabled={!hazir || kayit} className="btn-primary !py-1.5 text-xs disabled:opacity-40">
            {kayit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
            {kayit ? 'Kaydediliyor…' : 'Videoyu kaydet'}
          </button>
          {videoUrl && (
            <>
              <button onClick={indir} className="btn-ghost !py-1.5 text-xs"><Download className="h-3.5 w-3.5" /> {mp4 ? 'MP4 indir' : 'Videoyu indir'}</button>
              <button onClick={linkAl} disabled={paylas?.durum === 'yukleniyor'} className="btn-ghost !py-1.5 text-xs">
                {paylas?.durum === 'yukleniyor' ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : paylas?.durum === 'ok' ? <Check className="h-3.5 w-3.5 text-lime-neon" />
                  : <Share2 className="h-3.5 w-3.5" />}
                {paylas?.durum === 'ok' ? 'Link kopyalandı' : 'Paylaşılabilir link'}
              </button>
            </>
          )}
          <span className="text-[11px] text-slate-500">{Math.round(sure)} sn</span>
        </div>

        {paylas?.durum === 'ok' && (
          <p className="mt-2 break-all text-center text-[11px] text-slate-400">{paylas.url}</p>
        )}
        {paylas?.durum === 'err' && (
          <p className="mt-2 text-center text-[11px] text-rose-300">Link oluşturulamadı: {paylas.m}</p>
        )}
      </div>
    </div>
  )
}

// ---------------- saha rozeti ----------------
function rozet(ctx, p, x, y, img, e, renk) {
  const ov = overall(p)
  const t = tier(ov)
  const r = 26
  ctx.save()
  ctx.globalAlpha = e
  ctx.translate(x, y)
  ctx.scale(0.85 + 0.15 * e, 0.85 + 0.15 * e)

  ctx.shadowColor = 'rgba(0,0,0,.6)'
  ctx.shadowBlur = 12
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fillStyle = '#1a1f2b'; ctx.fill()
  ctx.shadowBlur = 0

  if (img) {
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r - 2, 0, Math.PI * 2); ctx.clip()
    const s = Math.max((r * 2) / img.width, (r * 2) / img.height)
    ctx.drawImage(img, -img.width * s / 2, -img.height * s / 2, img.width * s, img.height * s)
    ctx.restore()
  } else {
    ctx.fillStyle = '#94a3b8'
    ctx.font = '800 15px system-ui, sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(initials(p.name), 0, 0)
  }
  ctx.lineWidth = 3
  ctx.strokeStyle = t.ring
  ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, Math.PI * 2); ctx.stroke()

  // reyting
  ctx.fillStyle = t.ring
  roundRect(ctx, r - 16, -r - 6, 30, 17, 5); ctx.fill()
  ctx.fillStyle = '#0b0d14'
  ctx.font = '800 12px system-ui, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(String(ov), r - 1, -r + 2)

  // isim
  const ad = p.name.split(' ')[0]
  ctx.font = '700 12px system-ui, sans-serif'
  const tw = ctx.measureText(ad).width + 14
  ctx.fillStyle = 'rgba(8,10,16,.9)'
  roundRect(ctx, -tw / 2, r + 4, tw, 18, 5); ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.fillText(ad, 0, r + 13)
  ctx.restore()
}

// ---------------- portre kartı ----------------
function kart(ctx, p, img, alpha, gir, renk, py, ph) {
  const cw = 300
  const chh = ph - 30
  const cx = 46
  const cy = py + 15
  const ov = overall(p)
  const t = tier(ov)

  ctx.save()
  ctx.globalAlpha = alpha

  // sahayı hafif karart (soldan)
  const sg = ctx.createLinearGradient(0, 0, cx + cw + 120, 0)
  sg.addColorStop(0, 'rgba(3,6,10,.96)')
  sg.addColorStop(0.75, 'rgba(3,6,10,.8)')
  sg.addColorStop(1, 'rgba(3,6,10,0)')
  ctx.fillStyle = sg
  ctx.fillRect(0, py - 10, cx + cw + 120, H - py + 10)

  ctx.translate(0, 26 * (1 - gir))

  // fotoğraf
  if (img) {
    ctx.save()
    roundRect(ctx, cx, cy, cw, chh, 12)
    ctx.clip()
    const s = Math.max(cw / img.width, chh / img.height)
    const dw = img.width * s, dh = img.height * s
    ctx.drawImage(img, cx + (cw - dw) / 2, cy - 10, dw, dh)
    // alt karartma — isim bandına yumuşak geçiş
    const fg = ctx.createLinearGradient(0, cy + chh - 190, 0, cy + chh)
    fg.addColorStop(0, 'rgba(3,6,10,0)')
    fg.addColorStop(1, 'rgba(3,6,10,.96)')
    ctx.fillStyle = fg
    ctx.fillRect(cx, cy + chh - 190, cw, 190)
    ctx.restore()
  }

  // forma numarası — ALTTA, küçük
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,.92)'
  ctx.font = '900 40px system-ui, -apple-system, sans-serif'
  ctx.fillText(String(p.forma_no ?? ''), cx + 16, cy + chh - 56)

  // isim
  ctx.fillStyle = '#fff'
  ctx.font = '800 26px system-ui, sans-serif'
  ctx.fillText(soyad(p.name), cx + 16, cy + chh - 22)

  // takım rengi alt çizgi
  ctx.fillStyle = renk
  ctx.fillRect(cx + 16, cy + chh - 14, (cw - 32) * gir, 4)

  // reyting
  ctx.fillStyle = t.ring
  roundRect(ctx, cx + cw - 60, cy + 14, 46, 26, 7); ctx.fill()
  ctx.fillStyle = '#0b0d14'
  ctx.font = '800 17px system-ui, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(String(ov), cx + cw - 37, cy + 28)

  ctx.restore()
}
