import { Reveal, SectionHeader } from './Section.jsx'
import { profile } from '../data/profile.js'
import { MapPin } from 'lucide-react'

export default function About() {
  return (
    <section id="hakkimda" className="container-page py-20 sm:py-28">
      <SectionHeader label="Hakkımda" title="Kısaca ben" />

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <div className="space-y-4 text-base leading-relaxed text-slate-300">
            {profile.bio.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
            <MapPin className="h-4 w-4 text-accent" /> {profile.location}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="card p-6">
            <p className="section-label">Yetenekler</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <span key={s} className="chip font-mono">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
