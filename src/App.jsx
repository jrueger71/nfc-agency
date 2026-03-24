import { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import PlayerDetail from './pages/PlayerDetail'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PlayersAdmin from './pages/PlayersAdmin'
import Finanzas from './pages/Finanzas'
import Noticias from './pages/Noticias'
import Documentos from './pages/Documentos'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function ProtectedRoute({ children, allowedRoles }) {
  const { session, userRole } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return (
      <div style={{ textAlign:'center', padding:60, color:'#f87171', fontFamily:'Bebas Neue', letterSpacing:2, fontSize:18 }}>
        ACCESO RESTRINGIDO — SIN PERMISOS PARA ESTA SECCIÓN
      </div>
    )
  }
  return children
}

export default function App() {
  const [session, setSession] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadRole = async (userId) => {
    if (!userId) { setUserRole(null); return }
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId).single()
    setUserRole(data?.role || 'digitador')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      loadRole(data.session?.user?.id)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      loadRole(s?.user?.id)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'Bebas Neue', color:'#C9A84C', fontSize:20, letterSpacing:3 }}>
      CARGANDO...
    </div>
  )

  return (
    <AuthContext.Provider value={{ session, userRole }}>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/jugador/:id" element={<PlayerDetail />} />
        <Route path="/login" element={session ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/finanzas" element={<ProtectedRoute allowedRoles={['admin','digitador']}><Finanzas /></ProtectedRoute>} />
        <Route path="/admin/jugadores" element={<ProtectedRoute allowedRoles={['admin']}><PlayersAdmin /></ProtectedRoute>} />
        <Route path="/admin/noticias" element={<ProtectedRoute allowedRoles={['admin']}><Noticias /></ProtectedRoute>} />
        <Route path="/admin/documentos/:playerId" element={<ProtectedRoute allowedRoles={['admin']}><Documentos /></ProtectedRoute>} />
      </Routes>
    </AuthContext.Provider>
  )
}
