import React from 'react'
import { useLocation } from 'react-router-dom'
import Header from '../Header/Header'
import Router from '../../router/Routers'
import Footer from '../Footer/Footer'
import IntroMandala from '../Atmosphere/IntroMandala'
import KonamiOverlay from '../Easter/KonamiOverlay'
import Concierge from '../ai/Concierge'

const Layout = () => {
  const { pathname } = useLocation()

  // Admin area provides its own chrome (sidebar + topbar), skip the
  // marketing header/footer and atmosphere effects there.
  if (pathname.startsWith('/admin')) {
    return <Router />
  }

  // The conversational planner is a full-height "app" surface: the global header
  // plus one internally-scrolling chat, no marketing footer. The document itself
  // is locked (h-dvh + overflow-hidden) so the ONLY thing that scrolls is the
  // message list, no confusing second scrollbar.
  const appShell = pathname === '/plan'

  return (
    <div className={appShell ? 'flex flex-col h-dvh overflow-hidden' : undefined}>
      <IntroMandala />
      <KonamiOverlay />
      <Header/>
      {appShell ? (
        <main className="flex-1 min-h-0">
          <Router/>
        </main>
      ) : (
        <Router/>
      )}
      {!appShell && <Footer/>}
      {/* RAG concierge, site-wide, but not on the planner (itself a chat). */}
      {!appShell && <Concierge/>}
    </div>
  )
}

export default Layout
