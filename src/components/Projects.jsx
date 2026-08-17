import { motion } from 'framer-motion'
import { Reveal, SectionHeader } from './Section.jsx'
import { projects } from '../data/projects.js'
import { ArrowUpRight, Github, Play, Lock } from 'lucide-react'

const statusColor = {
  'Yayında': 'text-lime-neon',
  'Geliştiriliyor': 'text-accent',
  'Fikir / Demo': 'text-accent',
  'Özel': 'text-amber-300',
  'Arşiv': 'text-slate-500',
}

const MONTHS = ['', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
function fmtDate(d) {
  if (!d) return ''
  const [y, m] = d.split('-')
  return `${MONTHS[parseInt(m, 10)] || ''} ${y}`
}

export default function Projects({ onOpenDemo }) {
  // tarihe gore azalan sirala
  const sorted = [...projects].sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <section id="projeler" className="container-page py-20 sm:py-28">
      <SectionHeader
        label="Projeler"
        title="Zaman çizelgesi"
        desc="GitHub’dan bugüne uzanan projeler — en yeniden en eskiye. Bazılarını doğrudan burada, tarayıcında deneyebilirsin."
      />

      <div className="relative">
        {/* dikey cizgi */}
        <div className="absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-accent/60 via-white/10 to-transparent sm:left-1/2" />

        <div className="space-y-8">
          {sorted.map((p, i) => {
            const side = i % 2 === 0 // sag/sol (desktop)
            return (
              <Reveal key={p.title + i} delay={0.03 * (i % 4)}>
                <div className={`relative flex items-start gap-6 sm:gap-0 ${side ? 'sm:flex-row' : 'sm:flex-row-reverse'}`}>
                  {/* nokta */}
                  <div className="absolute left-[18px] top-6 z-10 -translate-x-1/2 sm:left-1/2">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/50" />
                      <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-ink-950 bg-accent" />
                    </span>
                  </div>

                  {/* kart */}
                  <div className={`w-full pl-10 sm:w-1/2 sm:pl-0 ${side ? 'sm:pr-10' : 'sm:pl-10'}`}>
                    <motion.article
                      whileHover={{ y: -4, scale: 1.01 }}
                      className="card group p-5 transition-shadow hover:shadow-glow"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-mono text-xs text-slate-500">{fmtDate(p.date)}</span>
                        {p.status && (
                          <span className={`font-mono text-xs ${statusColor[p.status] || 'text-slate-400'}`}>
                            ● {p.status}
                          </span>
                        )}
                      </div>

                      <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                        {p.title}
                        {!p.repo && p.status === 'Özel' && <Lock className="h-3.5 w-3.5 text-slate-500" />}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">{p.description}</p>

                      {p.tags && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {p.tags.map((t) => (
                            <span key={t} className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[11px] text-slate-400">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      {(p.demo || p.link || p.repo) && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
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
                      )}
                    </motion.article>
                  </div>

                  {/* karsi bosluk (desktop) */}
                  <div className="hidden sm:block sm:w-1/2" />
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>

      <Reveal delay={0.1}>
        <div className="mt-10 text-center">
          <a href="https://github.com/Bedirhangndnr" target="_blank" rel="noreferrer" className="btn-ghost">
            <Github className="h-4 w-4" /> Tüm repoları GitHub’da gör
          </a>
        </div>
      </Reveal>
    </section>
  )
}
