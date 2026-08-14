import { profile } from '../data/profile.js'

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-8">
      <div className="container-page flex flex-col items-center justify-between gap-3 text-sm text-slate-500 sm:flex-row">
        <span className="font-mono">
          <span className="text-accent">{'</'}</span>
          {profile.name.toLowerCase()}
          <span className="text-accent">{'>'}</span> · {new Date().getFullYear()}
        </span>
        <span className="text-xs">React · Vite · Tailwind · Framer Motion ile yapıldı.</span>
      </div>
    </footer>
  )
}
