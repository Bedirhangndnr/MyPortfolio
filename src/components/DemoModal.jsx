import { Suspense, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { demoRegistry } from '../demos/registry.js'

export default function DemoModal({ demoKey, onClose }) {
  const demo = demoKey ? demoRegistry[demoKey] : null

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    if (demo) {
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [demo, onClose])

  return (
    <AnimatePresence>
      {demo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/80 p-4 backdrop-blur-sm sm:p-8"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="card my-auto w-full max-w-3xl overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/5 p-5">
              <div>
                <h3 className="font-semibold text-white">{demo.title}</h3>
                <p className="text-sm text-slate-400">{demo.subtitle}</p>
              </div>
              <button
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" /> Yükleniyor…
                  </div>
                }
              >
                <demo.component />
              </Suspense>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
