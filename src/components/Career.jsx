import { Reveal, SectionHeader } from './Section.jsx'
import { career, education } from '../data/career.js'
import { Briefcase, MapPin, Calendar, GraduationCap } from 'lucide-react'

export default function Career() {
  const items = career.filter((c) => c.company)
  if (items.length === 0) return null

  return (
    <section id="kariyer" className="container-page py-20 sm:py-28">
      <SectionHeader label="Kariyerim" title="Nerelerde çalıştım" />

      <div className="relative ml-3 space-y-10 border-l border-white/10 pl-8">
        {items.map((c, i) => (
          <Reveal key={c.company + i} delay={i * 0.08}>
            <div className="relative">
              <span className="absolute -left-[41px] top-1 flex h-6 w-6 items-center justify-center rounded-full border border-accent/40 bg-ink-900">
                <Briefcase className="h-3 w-3 text-accent" />
              </span>

              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-lg font-bold text-white">{c.company}</h3>
                {c.role && <span className="text-sm text-accent">{c.role}</span>}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                {c.period && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {c.period}</span>}
                {c.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.location}</span>}
              </div>

              {c.summary && <p className="mt-2 text-sm text-slate-300">{c.summary}</p>}

              {c.points?.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm text-slate-400">
                  {c.points.map((p, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent/70" />
                      {p}
                    </li>
                  ))}
                </ul>
              )}

              {c.tech?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.tech.map((t) => (
                    <span key={t} className="chip font-mono !py-0.5 text-[11px]">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        ))}

        {education && (
          <Reveal delay={items.length * 0.08}>
            <div className="relative">
              <span className="absolute -left-[41px] top-1 flex h-6 w-6 items-center justify-center rounded-full border border-lime-neon/40 bg-ink-900">
                <GraduationCap className="h-3 w-3 text-lime-neon" />
              </span>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-lg font-bold text-white">{education.school}</h3>
                <span className="text-sm text-lime-neon">{education.degree}</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <Calendar className="h-3 w-3" /> {education.period}
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}
