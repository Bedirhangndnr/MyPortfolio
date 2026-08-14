// ============================================================
//  DEMO REGISTRY
//  Siteye gomulu interaktif demolar burada kayitli.
//  Yeni demo eklemek icin:
//    1) src/demos/ altinda bir React bileseni yaz (orn. MyDemo.jsx)
//    2) Asagida lazy import ile ekle ve bir anahtar ver.
//    3) projects.js icinde ilgili projeye  demo: 'anahtar'  yaz.
// ============================================================
import { lazy } from 'react'

export const demoRegistry = {
  'photo-match': {
    title: 'Foto Edit Eşleştirici',
    subtitle: 'Bir fotoğrafın renk/tonunu referans bir görsele benzet.',
    component: lazy(() => import('./PhotoMatchDemo.jsx')),
  },
}
