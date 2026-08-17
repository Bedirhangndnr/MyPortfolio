import { motion } from 'framer-motion'
import { Reveal, SectionHeader } from './Section.jsx'
import { gameList } from '../games/registry.js'
import { Flag, Trophy, Gamepad2 } from 'lucide-react'

export default function Games({ onOpenGame }) {
  return (
    <section id="oyunlar" className="relative overflow-hidden border-y border-white/5 bg-ink-900/40 py-20 sm:py-28">
      {/* arka plan grid */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40 [mask-image:radial-gradient(70%_60%_at_50%_40%,black,transparent)]" />

      <div className="container-page relative">
        <SectionHeader
          label="Oyunlar"
          title="Oyun yolu"
          desc="Küçük bir mola. Yolda ilerle, her durakta oynanabilir bir mini oyun var — hepsi tarayıcında, kurulumsuz."
        />

        <div className="relative mx-auto max-w-2xl">
          {/* orta yol (kesikli, animasyonlu) */}
          <div className="pointer-events-none absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 overflow-hidden rounded-full">
            <div
              className="h-full w-full animate-roadmove"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(to bottom, rgba(110,231,255,0.5) 0 14px, transparent 14px 34px)',
              }}
            />
          </div>

          {/* baslangic */}
          <Reveal className="relative flex justify-center pb-10">
            <div className="flex flex-col items-center gap-1">
              <div className="grid h-12 w-12 place-items-center rounded-full border border-accent/40 bg-ink-850 text-accent shadow-glow">
                <Flag className="h-5 w-5" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">başla</span>
            </div>
          </Reveal>

          {/* duraklar */}
          <div className="space-y-10">
            {gameList.map((g, i) => {
              const left = i % 2 === 0
              return (
                <Reveal key={g.key} delay={i * 0.08}>
                  <div className={`relative flex ${left ? 'justify-start' : 'justify-end'}`}>
                    <motion.button
                      onClick={() => onOpenGame(g.key)}
                      whileHover={{ scale: 1.05, y: -3 }}
                      whileTap={{ scale: 0.97 }}
                      className="group relative flex w-[46%] items-center gap-3 rounded-2xl border border-white/10 bg-ink-850/80 p-4 text-left backdrop-blur-sm transition-colors hover:border-accent/50 hover:shadow-glow"
                    >
                      {/* seviye rozeti */}
                      <span className="absolute -top-2 -left-2 grid h-6 w-6 place-items-center rounded-full bg-accent text-[11px] font-bold text-ink-950">
                        {g.level}
                      </span>
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/5 text-2xl transition-transform group-hover:scale-110">
                        {g.emoji}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white">{g.title}</div>
                        <div className="truncate text-xs text-slate-400">{g.subtitle}</div>
                        <div className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] text-accent opacity-0 transition-opacity group-hover:opacity-100">
                          <Gamepad2 className="h-3 w-3" /> Oyna
                        </div>
                      </div>

                      {/* yola baglayan cizgi */}
                      <span
                        className={`pointer-events-none absolute top-1/2 hidden h-px w-[8%] bg-accent/40 sm:block ${
                          left ? 'left-full' : 'right-full'
                        }`}
                      />
                    </motion.button>
                  </div>
                </Reveal>
              )
            })}
          </div>

          {/* bitis */}
          <Reveal className="relative flex justify-center pt-10">
            <div className="flex flex-col items-center gap-1">
              <div className="grid h-14 w-14 place-items-center rounded-full border border-lime-neon/40 bg-ink-850 text-lime-neon" style={{ boxShadow: '0 0 30px -8px #c6f24e' }}>
                <Trophy className="h-6 w-6" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">bitiş</span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
