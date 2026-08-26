import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const INPUT = {
  width: '100%', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(201,168,76,0.2)', borderRadius: 5,
  padding: '9px 12px', fontSize: 13, color: '#fff',
  fontFamily: 'inherit', outline: 'none',
}
const LABEL = {
  fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: 1,
  display: 'block', marginBottom: 4,
}

export default function ActualizarPassword() {
  const [ready, setReady] = useState(false)
  const [checked, setChecked] = useState(false)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    // El link de recuperación (o de invitación) ya deja la sesión abierta,
    // porque el cliente tiene detectSessionInUrl: true. Solo confirmamos
    // que efectivamente llegó con una sesión válida antes de mostrar el formulario.
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) setReady(true)
    })

    const timeout = setTimeout(() => { if (!cancelled) setChecked(true) }, 3000)

    return () => { cancelled = true; subscription.unsubscribe(); clearTimeout(timeout) }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (password !== password2) { setError('Las contraseñas no coinciden'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) { setError(error.message); return }
    setOk(true)
    setTimeout(() => navigate('/dashboard'), 1800)
  }

  return (
    <div style={{ maxWidth: 360, margin: '56px auto', padding: '0 16px' }}>
      <div className="card" style={{ textAlign: 'center', padding: 32 }}>
        <div className="bebas" style={{ fontSize: 22, color: '#fff', letterSpacing: 2, marginBottom: 2 }}>
          NUEVA CONTRASEÑA
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, marginBottom: 28 }}>
          NUEVA FÚTBOL CHILE SPA
        </div>

        {ok ? (
          <div style={{ fontSize: 13, color: '#4ade80' }}>
            ✓ Contraseña actualizada. Ingresando...
          </div>
        ) : ready ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ textAlign: 'left' }}>
              <label style={LABEL}>NUEVA CONTRASEÑA</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••" style={INPUT}
              />
            </div>
            <div style={{ textAlign: 'left' }}>
              <label style={LABEL}>REPETIR CONTRASEÑA</label>
              <input
                type="password" value={password2} onChange={e => setPassword2(e.target.value)} required
                placeholder="••••••••" style={INPUT}
              />
            </div>
            {error && <div style={{ fontSize: 12, color: '#f87171' }}>{error}</div>}
            <button type="submit" className="btn-gold" style={{ width: '100%', padding: 11, fontSize: 16, marginTop: 4 }} disabled={loading}>
              {loading ? 'GUARDANDO...' : 'GUARDAR CONTRASEÑA'}
            </button>
          </form>
        ) : checked ? (
          <div style={{ fontSize: 12, color: '#f87171' }}>
            Este enlace no es válido o ya expiró. Solicita uno nuevo desde "¿Olvidaste tu contraseña?" en el login.
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            Verificando enlace...
          </div>
        )}
      </div>
    </div>
  )
}
