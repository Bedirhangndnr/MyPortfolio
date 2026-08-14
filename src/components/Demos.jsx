import { motion } from 'framer-motion'
import { Reveal, SectionHeader } from './Section.jsx'
import { demoRegistry } from '../demos/registry.js'
import { Play, Terminal } from 'lucide-react'

export default function Demos({ onOpenDemo }) {
  const entries = Object.entries(demoRegistry)

  return (
    <section id="demolar" className="border-y border-white/5 bg-ink-900/40 py-20 sm:py-28">
      <div className="container-page">
        <SectionHeader
          label="İnteraktif Demolar"
          title="Tarayıcında dene"
          desc="Siteye gömülü, kurulum gerektirmeyen mini uygulamalar. Kart üzerindeki butona bas, hemen açılır."
        />

        <div className="grid gap-5 sm:grid-cols-2">
          {entries.map(([key, d], i) => (
            <Reveal key={key} delay={i * 0.08}>
              <motion.button
                whileHover={{ y: -4 }}
                onClick={() => onOpenDemo(key)}
                className="card group flex w-full items-center gap-4 p-6 text-left transition-shadow hover:shadow-glow"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                  <Terminal className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{d.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{d.subtitle}</p>
                </div>
                <span className="btn-primary !py-2 text-xs opacity-0 transition-opacity group-hover:opacity-100">
                  <Play className="h-3.5 w-3.5" /> Aç
                </span>
              </motion.button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
