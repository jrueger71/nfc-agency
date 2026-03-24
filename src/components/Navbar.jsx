import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, userRole } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/')
    setMenuOpen(false)
  }

  const is = (path) => location.pathname === path || location.pathname.startsWith(path + '/')
  const isPublic = location.pathname === '/' || is('/jugador')

  const navItems = [
    { label: 'Jugadores', path: '/', show: true },
    { label: 'Dashboard', path: '/dashboard', show: !!session },
    { label: 'Finanzas', path: '/finanzas', show: !!session && (userRole === 'admin' || userRole === 'digitador') },
    { label: 'Plantel Admin', path: '/admin/jugadores', show: !!session && userRole === 'admin' },
  ]

  const go = (path) => { navigate(path); setMenuOpen(false) }

  return (
    <>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: 56, background: '#0f1a3a',
        borderBottom: '1px solid rgba(201,168,76,0.3)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        {/* Logo */}
        <div style={{ cursor: 'pointer' }} onClick={() => go('/')}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 15, letterSpacing: 2, color: '#fff', lineHeight: 1.1 }}>
            NUEVA <span style={{ color: '#C9A84C' }}>FÚTBOL</span> CHILE
          </div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 }}>
            AGENCIA DE REPRESENTACIÓN · SPA
          </div>
        </div>

        {/* Desktop menu */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} className="desktop-nav">
          {navItems.filter(i => i.show).map(item => (
            <button key={item.path} onClick={() => go(item.path)} style={{
              padding: '7px 14px', fontSize: 12, fontWeight: 600, letterSpacing: .5,
              borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
              background: is(item.path) && (item.path !== '/' || isPublic) ? '#C9A84C' : 'transparent',
              color: is(item.path) && (item.path !== '/' || isPublic) ? '#0f1a3a' : 'rgba(255,255,255,0.6)',
              border: is(item.path) && (item.path !== '/' || isPublic) ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.25)',
            }}>{item.label}</button>
          ))}
          {session ? (
            <button onClick={logout} style={{
              padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 4,
              cursor: 'pointer', fontFamily: 'inherit', background: 'transparent',
              color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)'
            }}>Salir</button>
          ) : (
            <button onClick={() => go('/login')} style={{
              padding: '7px 14px', fontSize: 12, fontWeight: 600, letterSpacing: .5,
              borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
              background: 'transparent', color: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(201,168,76,0.3)'
            }}>Admin 🔒</button>
          )}
        </div>

        {/* Hamburger — mobile only */}
        <button onClick={() => setMenuOpen(!menuOpen)} style={{
          display: 'none', background: 'none', border: 'none', cursor: 'pointer',
          padding: 8, color: '#C9A84C', fontSize: 22, lineHeight: 1
        }} className="hamburger">
          {menuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: 56, left: 0, right: 0, zIndex: 99,
          background: '#0a1530', borderBottom: '1px solid rgba(201,168,76,0.2)',
          padding: '8px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}>
          {navItems.filter(i => i.show).map(item => (
            <button key={item.path} onClick={() => go(item.path)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '14px 20px', fontSize: 15, fontWeight: 600, letterSpacing: .5,
              background: is(item.path) ? 'rgba(201,168,76,0.1)' : 'transparent',
              color: is(item.path) ? '#C9A84C' : 'rgba(255,255,255,0.7)',
              border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
              cursor: 'pointer', fontFamily: 'inherit'
            }}>{item.label}</button>
          ))}
          {session ? (
            <button onClick={logout} style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '14px 20px', fontSize: 15, fontWeight: 600,
              background: 'transparent', color: 'rgba(255,255,255,0.4)',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit'
            }}>Salir</button>
          ) : (
            <button onClick={() => go('/login')} style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '14px 20px', fontSize: 15, fontWeight: 600,
              background: 'transparent', color: '#C9A84C',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit'
            }}>Admin 🔒</button>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .desktop-nav { display: none !important; }
          .hamburger { display: block !important; }
        }
      `}</style>
    </>
  )
}
