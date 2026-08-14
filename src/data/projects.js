// ============================================================
//  PROJELER — yeni proje eklemek icin listeye bir obje ekle.
//  Zorunlu alanlar: title, description. Digerleri opsiyonel.
//  "demo" alanina src/demos/registry.js'deki bir anahtari yazarsan
//  proje kartinda "Demoyu aç" butonu cikar ve demo site icinde acilir.
// ============================================================

export const projects = [
  {
    title: 'Foto Edit Eşleştirici',
    description:
      'Bir kullanıcı, kendi fotoğrafını başka bir forumdaki/edit stilindeki bir referansa benzetmek istediğinde; renk, kontrast ve ton ayarlarını otomatik eşleştiren interaktif bir araç. Şimdilik demo olarak temel bir renk/ton eşleştirme sunuyor.',
    tags: ['React', 'Canvas', 'Görüntü işleme'],
    demo: 'photo-match', // registry.js icindeki anahtar
    status: 'Geliştiriliyor',
    year: 2026,
    // link: 'https://...',   // canli link varsa
    // repo: 'https://github.com/...',
  },
  {
    title: 'Portföy Sitesi',
    description:
      'Şu an baktığın site. Koyu/teknik temada, animasyonlu ve içine yeni projeleri kolayca gömebileceğin şekilde tasarlandı.',
    tags: ['React', 'Vite', 'Tailwind', 'Framer Motion'],
    status: 'Yayında',
    year: 2026,
    repo: 'https://github.com/',
  },
  {
    title: 'Örnek Proje (yer tutucu)',
    description:
      'Buraya kendi projelerini ekleyebilirsin. Her proje bir kart olarak görünür; istersen bir demo bağlar, istersen sadece link/repo verirsin.',
    tags: ['Fikir', 'Yakında'],
    status: 'Planlanıyor',
    year: 2026,
  },
]
