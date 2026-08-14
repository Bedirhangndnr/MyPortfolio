import { useState } from 'react'
import Nav from './components/Nav.jsx'
import Hero from './components/Hero.jsx'
import About from './components/About.jsx'
import Projects from './components/Projects.jsx'
import Demos from './components/Demos.jsx'
import Contact from './components/Contact.jsx'
import Footer from './components/Footer.jsx'
import DemoModal from './components/DemoModal.jsx'

export default function App() {
  const [demoKey, setDemoKey] = useState(null)

  return (
    <div className="min-h-screen">
      <Nav />
      <main>
        <Hero />
        <About />
        <Projects onOpenDemo={setDemoKey} />
        <Demos onOpenDemo={setDemoKey} />
        <Contact />
      </main>
      <Footer />
      <DemoModal demoKey={demoKey} onClose={() => setDemoKey(null)} />
    </div>
  )
}
