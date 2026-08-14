import { motion } from 'framer-motion'

export function Reveal({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function SectionHeader({ label, title, desc }) {
  return (
    <Reveal className="mb-10 max-w-2xl">
      <span className="section-label">
        <span className="h-px w-6 bg-accent/60" /> {label}
      </span>
      <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
      {desc && <p className="mt-3 text-slate-400">{desc}</p>}
    </Reveal>
  )
}
