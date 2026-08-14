// ============================================================
//  KISISEL BILGILER — burayi kendine gore duzenle.
// ============================================================

export const profile = {
  name: 'Bedirhan',
  role: 'Geliştirici & Yaratıcı',
  // Hero'da daktilo efektiyle donen kisa etiketler:
  taglines: [
    'Web geliştirici',
    'İnteraktif deneyim tasarımcısı',
    'Fikirleri ürüne çeviririm',
  ],
  location: 'İstanbul, Türkiye',
  available: true, // yeni islere acik misin? (Hero'daki yesil nokta)

  // Hakkimda bolumu (birden fazla paragraf yazabilirsin)
  bio: [
    'Merhaba! Ben Bedirhan. Web tabanlı, interaktif ürünler geliştiriyorum. Aklıma gelen fikirleri hızlıca prototipe döküp yayınlamayı seviyorum.',
    'Bu site hem beni tanıtan bir portföy, hem de üzerinde çalıştığım küçük projeleri ve interaktif demoları yayınladığım bir vitrin. Aşağıda birkaç örnek bulabilirsin.',
  ],

  // Yetenekler / kullandigin teknolojiler
  skills: [
    'JavaScript',
    'React',
    'Node.js',
    'HTML / CSS',
    'UI / UX',
    'Framer Motion',
    'Python',
    'Git',
  ],

  // Kucuk istatistikler (istedigini degistir/sil)
  stats: [
    { value: '5+', label: 'Proje' },
    { value: '3+', label: 'Yıl deneyim' },
    { value: '∞', label: 'Fikir' },
  ],
}

// Iletisim & sosyal linkler — ikon adlari lucide-react'ten geliyor.
export const socials = [
  { label: 'E-posta', value: 'bedirhangndnr@gmail.com', href: 'mailto:bedirhangndnr@gmail.com', icon: 'Mail' },
  { label: 'GitHub', value: 'github.com/kullanici', href: 'https://github.com/', icon: 'Github' },
  { label: 'LinkedIn', value: 'linkedin.com/in/kullanici', href: 'https://linkedin.com/', icon: 'Linkedin' },
  { label: 'X / Twitter', value: '@kullanici', href: 'https://x.com/', icon: 'Twitter' },
]
