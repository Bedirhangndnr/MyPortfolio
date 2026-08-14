import { useRef, useState, useCallback } from 'react'
import { Upload, Wand2, Download, ImageIcon } from 'lucide-react'

// ------------------------------------------------------------
//  Foto Edit Eslestirici (demo)
//  "Kaynak" fotografin renk istatistiklerini (kanal bazinda ortalama
//  ve standart sapma) "referans" fotografa benzetir. Klasik color
//  transfer yaklasimi. Tamamen tarayicida, sunucusuz calisir.
// ------------------------------------------------------------

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

function stats(data) {
  // data: Uint8ClampedArray (RGBA). Kanal bazinda mean & std dondur.
  const sum = [0, 0, 0]
  const sumSq = [0, 0, 0]
  const n = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = data[i + c]
      sum[c] += v
      sumSq[c] += v * v
    }
  }
  const mean = sum.map((s) => s / n)
  const std = sumSq.map((sq, c) => Math.sqrt(Math.max(sq / n - mean[c] * mean[c], 1)))
  return { mean, std }
}

function UploadBox({ label, onFile, previewUrl }) {
  const inputRef = useRef(null)
  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      const f = e.dataTransfer.files?.[0]
      if (f && f.type.startsWith('image/')) onFile(f)
    },
    [onFile],
  )
  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      className="group relative flex aspect-video cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-ink-900/60 text-center transition-colors hover:border-accent/50"
    >
      {previewUrl ? (
        <img src={previewUrl} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-2 p-4 text-slate-400">
          <ImageIcon className="h-6 w-6" />
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-slate-500">Tıkla veya sürükle-bırak</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
    </div>
  )
}

export default function PhotoMatchDemo() {
  const [sourceUrl, setSourceUrl] = useState(null)
  const [refUrl, setRefUrl] = useState(null)
  const [resultUrl, setResultUrl] = useState(null)
  const [strength, setStrength] = useState(100)
  const [busy, setBusy] = useState(false)
  const sourceImgRef = useRef(null)
  const refImgRef = useRef(null)

  const handleSource = async (file) => {
    const img = await loadImage(file)
    sourceImgRef.current = img
    setSourceUrl(img.src)
    setResultUrl(null)
  }
  const handleRef = async (file) => {
    const img = await loadImage(file)
    refImgRef.current = img
    setRefUrl(img.src)
    setResultUrl(null)
  }

  const process = async () => {
    if (!sourceImgRef.current || !refImgRef.current) return
    setBusy(true)
    // Kisa bir gecikme -> spinner gorunsun
    await new Promise((r) => setTimeout(r, 60))

    const src = sourceImgRef.current
    const ref = refImgRef.current

    const cSrc = document.createElement('canvas')
    cSrc.width = src.naturalWidth
    cSrc.height = src.naturalHeight
    const ctxSrc = cSrc.getContext('2d', { willReadFrequently: true })
    ctxSrc.drawImage(src, 0, 0)
    const srcData = ctxSrc.getImageData(0, 0, cSrc.width, cSrc.height)

    // Referansi kucuk boyutta ornekle (istatistik icin yeterli, hizli)
    const rw = Math.min(ref.naturalWidth, 400)
    const rh = Math.round((rw / ref.naturalWidth) * ref.naturalHeight)
    const cRef = document.createElement('canvas')
    cRef.width = rw
    cRef.height = rh
    const ctxRef = cRef.getContext('2d', { willReadFrequently: true })
    ctxRef.drawImage(ref, 0, 0, rw, rh)
    const refData = ctxRef.getImageData(0, 0, rw, rh)

    const s = stats(srcData.data)
    const r = stats(refData.data)
    const k = strength / 100

    const d = srcData.data
    for (let i = 0; i < d.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const orig = d[i + c]
        const transferred = ((orig - s.mean[c]) * (r.std[c] / s.std[c])) + r.mean[c]
        // "strength" ile orijinal ve donusturulmus arasinda karistir
        const val = orig * (1 - k) + transferred * k
        d[i + c] = val < 0 ? 0 : val > 255 ? 255 : val
      }
    }
    ctxSrc.putImageData(srcData, 0, 0)
    setResultUrl(cSrc.toDataURL('image/png'))
    setBusy(false)
  }

  const canRun = sourceUrl && refUrl

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-slate-400">1 · Kaynak (senin fotoğrafın)</p>
          <UploadBox label="Kaynak fotoğraf" onFile={handleSource} previewUrl={sourceUrl} />
        </div>
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-slate-400">2 · Referans (benzemek istediğin edit)</p>
          <UploadBox label="Referans fotoğraf" onFile={handleRef} previewUrl={refUrl} />
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <label className="flex flex-1 items-center gap-3 text-sm text-slate-300">
          <span className="whitespace-nowrap font-mono text-xs text-slate-400">Etki: {strength}%</span>
          <input
            type="range"
            min="0"
            max="100"
            value={strength}
            onChange={(e) => setStrength(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-accent"
          />
        </label>
        <button onClick={process} disabled={!canRun || busy} className="btn-primary disabled:cursor-not-allowed disabled:opacity-40">
          <Wand2 className="h-4 w-4" />
          {busy ? 'İşleniyor…' : 'Eşleştir'}
        </button>
      </div>

      {resultUrl && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-wider text-accent">Sonuç</p>
            <a href={resultUrl} download="eslestirilmis.png" className="btn-ghost text-xs">
              <Download className="h-4 w-4" /> İndir
            </a>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <img src={resultUrl} alt="Sonuç" className="w-full" />
          </div>
        </div>
      )}

      <p className="flex items-start gap-2 text-xs text-slate-500">
        <Upload className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Not: Bu bir demo. Fotoğrafların renk istatistiklerini (ortalama & kontrast) referansa benzetir; tamamen tarayıcında çalışır, hiçbir görsel sunucuya gönderilmez.
      </p>
    </div>
  )
}
