import React from 'react'
import { NavLink } from 'react-router-dom'

const ITEMS = [
  { to: '/', icon: '🏠', label: 'Home' },
  { to: '/vocabulary', icon: '📚', label: 'Words' },
  { to: '/speaking', icon: '🎙️', label: 'Speak' },
  { to: '/conversation', icon: '💬', label: 'AI Chat' },
  { to: '/progress', icon: '📈', label: 'Progress' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span className="nav-icon" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
