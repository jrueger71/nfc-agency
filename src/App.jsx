import { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import PlayerDetail from './pages/PlayerDetail'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PlayersAdmin from './pages/PlayersAdmin'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function ProtectedRoute({ children }) {
  const { session } = useAuth()
  return session ? children : <Navigate to="/login" replace />
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'Bebas Neue,sans-serif', color:'#C9A84C', fontSize:20, letterSpacing:3 }}>
      CARGANDO...
    </div>
  )

  return (
    <AuthContext.Provider value={{ session }}>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/jugador/:id" element={<PlayerDetail />} />
        <Route path="/login" element={session ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin/jugadores" element={<ProtectedRoute><PlayersAdmin /></ProtectedRoute>} />
      </Routes>
    </AuthContext.Provider>
  )
}
