// ============================================================
//  OYUN REGISTRY — siteye gomulu mini oyunlar.
//  Yeni oyun: src/games/ altina bir bilesen yaz, buraya ekle.
// ============================================================
import { lazy } from 'react'

export const gameRegistry = {
  snake: {
    key: 'snake',
    title: 'Yılan',
    subtitle: 'Klasik yılan oyunu — ok tuşlarıyla oyna.',
    emoji: '🐍',
    level: 1,
    component: lazy(() => import('./SnakeGame.jsx')),
  },
  memory: {
    key: 'memory',
    title: 'Hafıza',
    subtitle: 'Eş kartları en az hamlede bul.',
    emoji: '🧠',
    level: 2,
    component: lazy(() => import('./MemoryGame.jsx')),
  },
  reaction: {
    key: 'reaction',
    title: 'Refleks',
    subtitle: 'Yeşil olunca en hızlı sen tıkla.',
    emoji: '⚡',
    level: 3,
    component: lazy(() => import('./ReactionGame.jsx')),
  },
  football: {
    key: 'football',
    title: 'İki Takım · Ortak Futbolcu',
    subtitle: 'Çok oyunculu! İki takımda da oynamış futbolcuyu ilk yazan kazanır.',
    emoji: '⚽️',
    level: 4,
    component: lazy(() => import('./FootballGame.jsx')),
  },
}

export const gameList = Object.values(gameRegistry)
