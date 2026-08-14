import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, Sparkles } from 'lucide-react'
import { profile } from '../data/profile.js'

function useTypewriter(words, speed = 90, pause = 1400) {
  const [text, setText] = useState('')
  const [i, setI] = useState(0)
  const [del, setDel] = useState(false)

  useEffect(() => {
    const current = words[i % words.length]
    let t
    if (!del && text === current) {
      t = setTimeout(() => setDel(true), pause)
    } else if (del && text === '') {
      setDel(false)
      setI((v) => v + 1)
    } else {
      t = setTimeout(() => {
        setText(del ? current.slice(0, text.length - 1) : current.slice(0, text.length + 1))
      }, del ? speed / 2 : speed)
    }
    return () => clearTimeout(t)
  }, [text, del, i, words, speed, pause])

  return text
}

export default function Hero() {
  const typed = useTypewriter(profile.taglines)

  return (
    <section id="top" className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* arka plan grid */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-60 [mask-image:radial-gradient(60%_60%_at_50%_30%,black,transparent)]" />

      <div className="container-page relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          {profile.available && (
            <span className="chip mb-6">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-neon opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-neon" />
              </span>
              Yeni projelere açık
            </span>
          )}

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
            Merhaba, ben <span className="text-accent">{profile.name}</span>.
          </h1>

          <p className="mt-4 flex min-h-[2rem] items-center font-mono text-lg text-slate-300 sm:text-xl">
            <span className="text-accent/70">&gt;&nbsp;</span>
            {typed}
            <span className="ml-1 inline-block h-5 w-2 animate-pulse bg-accent align-middle" />
          </p>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            {profile.bio[0]}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="#projeler" className="btn-primary">
              <Sparkles className="h-4 w-4" /> Projelerimi gör
            </a>
            <a href="#iletisim" className="btn-ghost">
              İletişime geç
            </a>
          </div>

          <div className="mt-12 flex flex-wrap gap-8">
            {profile.stats.map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-bold text-white">{s.value}</div>
                <div className="font-mono text-xs uppercase tracking-wider text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <a
        href="#hakkimda"
        className="absolute inset-x-0 bottom-6 mx-auto flex w-fit flex-col items-center gap-1 text-slate-500 transition-colors hover:text-accent"
      >
        <span className="font-mono text-[10px] uppercase tracking-widest">kaydır</span>
        <ArrowDown className="h-4 w-4 animate-float" />
      </a>
    </section>
  )
}
