import { motion } from 'framer-motion'
import { Reveal, SectionHeader } from './Section.jsx'
import { projects } from '../data/projects.js'
import { ArrowUpRight, Github, Play } from 'lucide-react'

const statusColor = {
  'Yayında': 'text-lime-neon',
  'Geliştiriliyor': 'text-accent',
  'Planlanıyor': 'text-slate-400',
}

export default function Projects({ onOpenDemo }) {
  return (
    <section id="projeler" className="container-page py-20 sm:py-28">
      <SectionHeader
        label="Projeler"
        title="Üzerinde çalıştıklarım"
        desc="Aklıma gelip hayata geçirdiğim projeler. Bazılarını doğrudan burada, tarayıcında deneyebilirsin."
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.06}>
            <motion.article
              whileHover={{ y: -4 }}
              className="card group flex h-full flex-col p-6 transition-shadow hover:shadow-glow"
            >
              <div className="mb-3 flex items-center justify-between">
                {p.status && (
                  <span className={`font-mono text-xs ${statusColor[p.status] || 'text-slate-400'}`}>
                    ● {p.status}
                  </span>
                )}
                {p.year && <span className="font-mono text-xs text-slate-600">{p.year}</span>}
              </div>

              <h3 className="text-lg font-semibold text-white">{p.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{p.description}</p>

              {p.tags && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <span key={t} className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[11px] text-slate-400">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-5 flex items-center gap-2">
                {p.demo && (
                  <button onClick={() => onOpenDemo(p.demo)} className="btn-primary !py-2 text-xs">
                    <Play className="h-3.5 w-3.5" /> Demoyu aç
                  </button>
                )}
                {p.link && (
                  <a href={p.link} target="_blank" rel="noreferrer" className="btn-ghost !py-2 text-xs">
                    Canlı <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                )}
                {p.repo && (
                  <a href={p.repo} target="_blank" rel="noreferrer" className="btn-ghost !py-2 text-xs">
                    <Github className="h-3.5 w-3.5" /> Kod
                  </a>
                )}
              </div>
            </motion.article>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
