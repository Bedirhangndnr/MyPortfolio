// ============================================================
//  KISISEL BILGILER — burayi kendine gore duzenle.
// ============================================================

export const profile = {
  name: 'Bedirhan',
  role: 'Bilgisayar Mühendisi Adayı & Geliştirici',
  // Hero'da daktilo efektiyle donen kisa etiketler:
  taglines: [
    'Bilgisayar mühendisliği öğrencisi',
    'Yazılım & makine öğrenmesi',
    '.NET · Blazor · React',
    'Fikirden ürüne',
  ],
  location: 'İstanbul, Türkiye',
  university: 'İstanbul Medeniyet Üniversitesi',
  available: true, // yeni islere acik misin? (Hero'daki yesil nokta)

  // Hakkimda bolumu (birden fazla paragraf yazabilirsin)
  bio: [
    'Merhaba! Ben Bedirhan. İstanbul Medeniyet Üniversitesi’nde bilgisayar mühendisliği öğrencisiyim ve zamanımı yazılım ile makine öğrenmesine ayırmayı seviyorum.',
    'Fikirleri hızlıca prototipe döküp yayınlamak en sevdiğim şey. .NET/Blazor ile kurumsal uygulamalardan, Python ile makine öğrenmesi projelerine kadar epey şey deniyorum. Bu site de hem beni tanıtan bir portföy, hem de üzerinde çalıştığım işleri ve ufak oyunları yayınladığım bir vitrin.',
  ],

  // Yetenekler / kullandigin teknolojiler
  skills: [
    'C#',
    '.NET',
    'Blazor',
    'ABP Framework',
    'JavaScript',
    'React',
    'Python',
    'Makine Öğrenmesi',
    'SQL',
    'HTML / CSS',
    'Git',
  ],

  // Kucuk istatistikler (istedigini degistir/sil)
  stats: [
    { value: '20+', label: 'Repo' },
    { value: '3+', label: 'Yıl kod' },
    { value: '∞', label: 'Fikir' },
  ],
}

// Iletisim & sosyal linkler — ikon adlari lucide-react'ten geliyor.
export const socials = [
  { label: 'E-posta', value: 'bedirhangndnr@gmail.com', href: 'mailto:bedirhangndnr@gmail.com', icon: 'Mail' },
  { label: 'GitHub', value: 'github.com/Bedirhangndnr', href: 'https://github.com/Bedirhangndnr', icon: 'Github' },
  { label: 'LinkedIn', value: 'in/bedirhan-gundoner', href: 'https://www.linkedin.com/in/bedirhan-gundoner/', icon: 'Linkedin' },
  { label: 'Instagram', value: '@__nahridebren', href: 'https://www.instagram.com/__nahridebren/', icon: 'Instagram' },
]
