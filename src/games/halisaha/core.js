// ============================================================
//  HALISAHA — ortak hesaplar, etiketler, kart tipleri
// ============================================================

export const POSITIONS = [
  { key: 'KL', ad: 'Kaleci', kisa: 'KL' },
  { key: 'DEF', ad: 'Defans', kisa: 'DEF' },
  { key: 'ORT', ad: 'Orta Saha', kisa: 'ORT' },
  { key: 'KAN', ad: 'Kanat', kisa: 'KAN' },
  { key: 'FRV', ad: 'Forvet', kisa: 'FRV' },
]

// skill kolonları sabit; kaleci için etiketler değişir
export const STAT_KEYS = ['hiz', 'sut', 'bitiricilik', 'kafa', 'defans', 'fizik', 'patlayicilik']

export const LABELS = {
  outfield: { hiz: 'HIZ', sut: 'ŞUT', bitiricilik: 'BİTİRİCİLİK', kafa: 'KAFA', defans: 'DEFANS', fizik: 'FİZİK', patlayicilik: 'PATLAYICILIK' },
  gk: { hiz: 'ÇIKIŞ', sut: 'AYAK', bitiricilik: 'DAĞITIM', kafa: 'HAVA TOPU', defans: 'REFLEKS', fizik: 'EL GÜCÜ', patlayicilik: 'POZİSYON' },
}
export const SHORT = {
  outfield: { hiz: 'HIZ', sut: 'ŞUT', bitiricilik: 'BİT', kafa: 'KFA', defans: 'DEF', fizik: 'FİZ', patlayicilik: 'PAT' },
  gk: { hiz: 'ÇIK', sut: 'AYK', bitiricilik: 'DAĞ', kafa: 'HAV', defans: 'REF', fizik: 'ELG', patlayicilik: 'POZ' },
}
export const labelsFor = (p) => (p.is_gk ? LABELS.gk : LABELS.outfield)
export const shortFor = (p) => (p.is_gk ? SHORT.gk : SHORT.outfield)

const W = {
  FRV: { sut: 0.24, bitiricilik: 0.26, hiz: 0.18, patlayicilik: 0.14, kafa: 0.12, fizik: 0.04, defans: 0.02 },
  KAN: { hiz: 0.28, patlayicilik: 0.22, sut: 0.16, bitiricilik: 0.14, fizik: 0.1, defans: 0.06, kafa: 0.04 },
  ORT: { hiz: 0.15, sut: 0.16, bitiricilik: 0.14, kafa: 0.12, defans: 0.16, fizik: 0.15, patlayicilik: 0.12 },
  DEF: { defans: 0.3, fizik: 0.22, kafa: 0.18, hiz: 0.12, patlayicilik: 0.1, sut: 0.05, bitiricilik: 0.03 },
  KL: { defans: 0.26, fizik: 0.22, patlayicilik: 0.2, kafa: 0.16, hiz: 0.1, bitiricilik: 0.04, sut: 0.02 },
}

export function overall(p) {
  const w = W[p.pos] || W.ORT
  let s = 0
  for (const k of STAT_KEYS) s += (p[k] || 0) * (w[k] || 0)
  return Math.round(s)
}

// kart teması: FIFA benzeri kademeler
export function tier(ov) {
  if (ov >= 86) return { key: 'icon', ad: 'İkon', bg: 'linear-gradient(160deg,#2a2118 0%,#5c4a22 45%,#c9a227 100%)', ring: '#f0d47a', text: '#fdf3d0' }
  if (ov >= 78) return { key: 'gold', ad: 'Altın', bg: 'linear-gradient(160deg,#3a2f14 0%,#7a6320 50%,#d8b73f 100%)', ring: '#e8cd6a', text: '#fff6db' }
  if (ov >= 68) return { key: 'silver', ad: 'Gümüş', bg: 'linear-gradient(160deg,#242830 0%,#4d5563 50%,#a9b4c4 100%)', ring: '#cbd5e1', text: '#f1f5f9' }
  return { key: 'bronze', ad: 'Bronz', bg: 'linear-gradient(160deg,#2b1d14 0%,#5a3a22 50%,#a9702f 100%)', ring: '#d19a5e', text: '#fbeadb' }
}

export const initials = (name) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toLocaleUpperCase('tr-TR')

// takım gücü: kadro ortalaması + pozisyon dengesi cezası
export function teamStrength(list) {
  if (!list.length) return { ort: 0, toplam: 0, n: 0, sat: { hiz: 0, sut: 0, defans: 0, fizik: 0 } }
  const ovs = list.map(overall)
  const toplam = ovs.reduce((a, b) => a + b, 0)
  const avg = (k) => Math.round(list.reduce((s, p) => s + (p[k] || 0), 0) / list.length)
  return {
    ort: Math.round(toplam / list.length),
    toplam,
    n: list.length,
    sat: { hiz: avg('hiz'), sut: avg('sut'), defans: avg('defans'), fizik: avg('fizik') },
  }
}

// yılan sıralaması ile dengeli dağıtım
export function autoBalance(players) {
  const gks = players.filter((p) => p.is_gk).sort((a, b) => overall(b) - overall(a))
  const rest = players.filter((p) => !p.is_gk).sort((a, b) => overall(b) - overall(a))
  const A = [], B = []
  gks.forEach((g, i) => (i % 2 === 0 ? A : B).push(g))
  rest.forEach((p, i) => {
    const round = Math.floor(i / 2)
    const first = round % 2 === 0 ? A : B
    const second = round % 2 === 0 ? B : A
    ;(i % 2 === 0 ? first : second).push(p)
  })
  // ince ayar: fark büyükse en yakın iki oyuncuyu takasla
  for (let iter = 0; iter < 60; iter++) {
    const sa = teamStrength(A).toplam, sb = teamStrength(B).toplam
    const d = sa - sb
    if (Math.abs(d) <= 2) break
    let best = null
    for (let i = 0; i < A.length; i++) {
      for (let j = 0; j < B.length; j++) {
        if (A[i].is_gk !== B[j].is_gk) continue
        const nd = d - 2 * (overall(A[i]) - overall(B[j]))
        if (Math.abs(nd) < Math.abs(d) && (!best || Math.abs(nd) < Math.abs(best.nd))) best = { i, j, nd }
      }
    }
    if (!best) break
    const tmp = A[best.i]; A[best.i] = B[best.j]; B[best.j] = tmp
  }
  return { A, B }
}

// sahada varsayılan diziliş noktaları (yüzde) — soldaki A, sağdaki B
export function defaultSpot(index, team, isGk) {
  const spotsA = [[16, 50], [30, 25], [30, 75], [42, 50], [40, 12], [40, 88], [48, 35], [48, 65]]
  const spotsB = spotsA.map(([x, y]) => [100 - x, y])
  if (isGk) return team === 'A' ? [5, 50] : [95, 50]
  const arr = team === 'A' ? spotsA : spotsB
  const s = arr[index % arr.length]
  return [s[0], s[1]]
}
