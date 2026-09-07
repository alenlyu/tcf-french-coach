import React from 'react'
import { Route, Routes } from 'react-router-dom'
import { useApp } from './store/AppContext'
import BottomNav from './components/BottomNav'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Vocabulary from './pages/Vocabulary'
import MistakeBank from './pages/MistakeBank'
import Speaking from './pages/Speaking'
import Session from './pages/Session'
import Progress from './pages/Progress'
import Settings from './pages/Settings'
import Conversation from './pages/Conversation'

export default function App() {
  const { profile, loading } = useApp()

  if (loading) {
    return <div className="app-shell"><div className="app-content center-col"><p>Loading…</p></div></div>
  }

  if (!profile) {
    return (
      <div className="app-shell">
        <Onboarding />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/vocabulary" element={<Vocabulary />} />
        <Route path="/mistakes" element={<MistakeBank />} />
        <Route path="/speaking" element={<Speaking />} />
        <Route path="/session" element={<Session />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/conversation" element={<Conversation />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <BottomNav />
    </div>
  )
}
