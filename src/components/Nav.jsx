import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const links = [
  { href: '#hakkimda', label: 'Hakkımda' },
  { href: '#projeler', label: 'Projeler' },
  { href: '#demolar', label: 'Demolar' },
  { href: '#oyunlar', label: 'Oyunlar' },
  { href: '#iletisim', label: 'İletişim' },
]

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled ? 'border-b border-white/5 bg-ink-950/80 backdrop-blur-md' : ''
      }`}
    >
      <nav className="container-page flex h-16 items-center justify-between">
        <a href="#top" className="font-mono text-sm font-bold tracking-tight text-white">
          <span className="text-accent">{'</'}</span>bedirhan<span className="text-accent">{'>'}</span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              {l.label}
            </a>
          ))}
          <a href="#iletisim" className="btn-primary ml-2 !py-2 text-sm">
            İletişime geç
          </a>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg border border-white/10 p-2 text-slate-200 md:hidden"
          aria-label="Menü"
        >
          <div className="space-y-1.5">
            <span className={`block h-0.5 w-5 bg-current transition ${open ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`block h-0.5 w-5 bg-current transition ${open ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-5 bg-current transition ${open ? '-translate-y-2 -rotate-45' : ''}`} />
          </div>
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/5 bg-ink-950/95 px-5 py-3 md:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </motion.header>
  )
}
