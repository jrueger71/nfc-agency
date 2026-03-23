import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()

  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const isPublic = location.pathname === '/' || location.pathname.startsWith('/jugador')
  const isAdmin = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/admin')

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: 56, background: '#0f1a3a',
      borderBottom: '1px solid rgba(201,168,76,0.3)',
      position: 'sticky', top: 0, zIndex: 100
    }}>
      <div style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 15, letterSpacing: 2, color: '#fff', lineHeight: 1.1 }}>
          NUEVA <span style={{ color: '#C9A84C' }}>FÚTBOL</span> CHILE
        </div>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 }}>
          AGENCIA DE REPRESENTACIÓN · SPA
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '6px 14px', fontSize: 11, fontWeight: 600, letterSpacing: .5,
            borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
            background: isPublic ? '#C9A84C' : 'transparent',
            color: isPublic ? '#0f1a3a' : 'rgba(255,255,255,0.55)',
            border: isPublic ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.3)'
          }}>
          Jugadores
        </button>

        {session ? (
          <>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '6px 14px', fontSize: 11, fontWeight: 600, letterSpacing: .5,
                borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                background: isAdmin ? '#C9A84C' : 'transparent',
                color: isAdmin ? '#0f1a3a' : 'rgba(255,255,255,0.55)',
                border: isAdmin ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.3)'
              }}>
              Panel Admin
            </button>
            <button onClick={logout} style={{
              padding: '6px 14px', fontSize: 11, fontWeight: 600,
              borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
              background: 'transparent', color: 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              Salir
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '6px 14px', fontSize: 11, fontWeight: 600, letterSpacing: .5,
              borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
              background: 'transparent', color: 'rgba(255,255,255,0.55)',
              border: '1px solid rgba(201,168,76,0.3)'
            }}>
            Admin 🔒
          </button>
        )}
      </div>
    </nav>
  )
}
