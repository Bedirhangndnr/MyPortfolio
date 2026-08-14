# Bedirhan — Portföy

Koyu/teknik temada, animasyonlu, içine yeni projeler ve interaktif demolar gömebileceğin bir portföy sitesi.
React + Vite + Tailwind CSS + Framer Motion ile yapıldı.

## Çalıştırma

```bash
npm install     # bağımlılıkları kur (ilk seferde)
npm run dev     # geliştirme sunucusu -> http://localhost:5173
```

## Yayına alma (build)

```bash
npm run build   # üretim çıktısı -> dist/ klasörü
npm run preview # build çıktısını yerel önizle
```

`dist/` klasörünü Vercel, Netlify veya GitHub Pages gibi herhangi bir statik hosting'e atabilirsin.

## Nasıl özelleştirilir?

Kod bilmeden bile çoğu şeyi değiştirebilmen için içerik veriden ayrıldı:

| Ne değiştirmek istiyorsun?         | Dosya                          |
| ---------------------------------- | ------------------------------ |
| İsim, bio, yetenekler, istatistik  | `src/data/profile.js`          |
| Sosyal / iletişim linkleri         | `src/data/profile.js` (socials)|
| Projeler (kartlar)                 | `src/data/projects.js`         |
| Renkler ve tema                    | `tailwind.config.js`           |

### Yeni proje eklemek

`src/data/projects.js` içindeki listeye bir obje ekle:

```js
{
  title: 'Proje adı',
  description: 'Kısa açıklama.',
  tags: ['React', 'Node'],
  status: 'Geliştiriliyor',   // Yayında | Geliştiriliyor | Planlanıyor
  year: 2026,
  link: 'https://...',        // (opsiyonel) canlı link
  repo: 'https://github.com/...', // (opsiyonel)
  demo: 'photo-match',        // (opsiyonel) gömülü demo anahtarı
}
```

### Yeni interaktif demo eklemek (siteye gömülü çalışan)

1. `src/demos/` altında bir React bileşeni yaz, örn. `MyDemo.jsx` (default export).
2. `src/demos/registry.js` içine ekle:

```js
'benim-demom': {
  title: 'Demo başlığı',
  subtitle: 'Kısa açıklama.',
  component: lazy(() => import('./MyDemo.jsx')),
},
```

3. İstersen bir projeye bağla: `projects.js` içinde `demo: 'benim-demom'`.

Demo, proje/demolar bölümündeki butona basınca site içinde bir pencerede açılır.

## Şu an gömülü demo

**Foto Edit Eşleştirici** (`src/demos/PhotoMatchDemo.jsx`): Bir kaynak fotoğrafın renk/ton
istatistiklerini bir referans görsele benzetir. Tamamen tarayıcıda çalışır, hiçbir görsel
sunucuya gönderilmez. Senin bahsettiğin "bir fotoğrafı başka bir editin stiline benzetme"
fikrinin ilk temel sürümü — buradan geliştirebilirsin.
