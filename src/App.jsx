import { useState, useCallback } from 'react'
import Nav from './components/Nav.jsx'
import Hero from './components/Hero.jsx'
import About from './components/About.jsx'
import Projects from './components/Projects.jsx'
import Demos from './components/Demos.jsx'
import Games from './components/Games.jsx'
import Contact from './components/Contact.jsx'
import Footer from './components/Footer.jsx'
import ItemModal from './components/ItemModal.jsx'
import { demoRegistry } from './demos/registry.js'
import { gameRegistry } from './games/registry.js'

export default function App() {
  const [modalItem, setModalItem] = useState(null)

  const openDemo = useCallback((key) => setModalItem(demoRegistry[key] || null), [])
  const openGame = useCallback((key) => setModalItem(gameRegistry[key] || null), [])

  return (
    <div className="min-h-screen">
      <Nav />
      <main>
        <Hero />
        <About />
        <Projects onOpenDemo={openDemo} />
        <Demos onOpenDemo={openDemo} />
        <Games onOpenGame={openGame} />
        <Contact />
      </main>
      <Footer />
      <ItemModal item={modalItem} onClose={() => setModalItem(null)} />
    </div>
  )
}
