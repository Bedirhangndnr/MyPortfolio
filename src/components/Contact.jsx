import { Mail, Github, Linkedin, Twitter, Link as LinkIcon, ArrowUpRight, Globe, Instagram, Youtube } from 'lucide-react'
import { Reveal, SectionHeader } from './Section.jsx'
import { socials } from '../data/profile.js'

// profile.js'deki "icon" string'ini bilesene eslestir.
const ICONS = { Mail, Github, Linkedin, Twitter, Globe, Instagram, Youtube, Link: LinkIcon }

export default function Contact() {
  return (
    <section id="iletisim" className="container-page py-20 sm:py-28">
      <SectionHeader
        label="İletişim"
        title="Bir fikrin mi var? Konuşalım."
        desc="Aşağıdaki kanallardan bana ulaşabilirsin."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {socials.map((s, i) => {
          const Icon = ICONS[s.icon] || LinkIcon
          return (
            <Reveal key={s.label} delay={i * 0.06}>
              <a
                href={s.href}
                target={s.href.startsWith('mailto') ? undefined : '_blank'}
                rel="noreferrer"
                className="card group flex items-center gap-4 p-5 transition-colors hover:border-accent/40"
              >
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-white/5 text-slate-300 transition-colors group-hover:bg-accent/10 group-hover:text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white">{s.label}</div>
                  <div className="truncate font-mono text-xs text-slate-500">{s.value}</div>
                </div>
                <ArrowUpRight className="ml-auto h-4 w-4 text-slate-600 transition-colors group-hover:text-accent" />
              </a>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
