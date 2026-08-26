import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [modoRecuperar, setModoRecuperar] = useState(false)
  const [recuperarMsg, setRecuperarMsg] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Credenciales incorrectas')
    else navigate('/dashboard')
    setLoading(false)
  }

  const handleRecuperar = async (e) => {
    e.preventDefault()
    setLoading(true)
    setRecuperarMsg('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/actualizar-password`,
    })
    setLoading(false)
    if (error) setRecuperarMsg('Error: ' + error.message)
    else setRecuperarMsg('✓ Si el correo existe, te enviamos un link para restablecer tu contraseña.')
  }

  return (
    <div style={{ maxWidth: 360, margin: '56px auto', padding: '0 16px' }}>
      <div className="card" style={{ textAlign: 'center', padding: 32 }}>
        <div className="bebas" style={{ fontSize: 22, color: '#fff', letterSpacing: 2, marginBottom: 2 }}>
          {modoRecuperar ? 'RECUPERAR ACCESO' : 'ACCESO ADMIN'}
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, marginBottom: 28 }}>
          NUEVA FÚTBOL CHILE SPA
        </div>

        {modoRecuperar ? (
          <form onSubmit={handleRecuperar} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: 1, display: 'block', marginBottom: 4 }}>EMAIL</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="jc.rueger@gmail.com"
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 5, padding: '9px 12px', fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none' }}
              />
            </div>
            {recuperarMsg && (
              <div style={{ fontSize: 12, color: recuperarMsg.startsWith('✓') ? '#4ade80' : '#f87171' }}>{recuperarMsg}</div>
            )}
            <button type="submit" className="btn-gold" style={{ width: '100%', padding: 11, fontSize: 16, marginTop: 4 }} disabled={loading}>
              {loading ? 'ENVIANDO...' : 'ENVIAR LINK'}
            </button>
            <button type="button" onClick={() => { setModoRecuperar(false); setRecuperarMsg('') }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', marginTop: 4, fontFamily: 'inherit' }}>
              ← Volver a ingresar
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: 1, display: 'block', marginBottom: 4 }}>EMAIL</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="jc.rueger@gmail.com"
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 5, padding: '9px 12px', fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none' }}
              />
            </div>
            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: 1, display: 'block', marginBottom: 4 }}>CONTRASEÑA</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 5, padding: '9px 12px', fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none' }}
              />
            </div>
            {error && <div style={{ fontSize: 12, color: '#f87171' }}>{error}</div>}
            <button type="submit" className="btn-gold" style={{ width: '100%', padding: 11, fontSize: 16, marginTop: 4 }} disabled={loading}>
              {loading ? 'INGRESANDO...' : 'INGRESAR'}
            </button>
            <button type="button" onClick={() => { setModoRecuperar(true); setError('') }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', marginTop: 4, fontFamily: 'inherit' }}>
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
