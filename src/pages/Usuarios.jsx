import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const GOLD = '#C9A84C'
const INPUT = {
  width: '100%', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(201,168,76,0.2)', borderRadius: 6,
  padding: '9px 12px', fontSize: 13, color: '#fff',
  fontFamily: 'inherit', outline: 'none',
}
const LABEL = {
  fontSize: 10, color: 'rgba(255,255,255,0.45)',
  letterSpacing: 1, display: 'block', marginBottom: 4, fontWeight: 600,
}

const ROLES = [
  {
    id: 'admin',
    label: 'Admin',
    color: '#f87171',
    desc: 'Acceso total — gestión de usuarios, eliminar registros, configuración del sistema',
  },
  {
    id: 'agente',
    label: 'Agente',
    color: GOLD,
    desc: 'Crear/editar jugadores, contratos, transacciones, documentos y RRSS. No puede eliminar ni gestionar usuarios',
  },
  {
    id: 'socio',
    label: 'Socio',
    color: '#60a5fa',
    desc: 'Crear/editar jugadores, subir documentos, ver finanzas. No puede eliminar ni gestionar usuarios',
  },
  {
    id: 'digitador',
    label: 'Digitador',
    color: '#34d399',
    desc: 'Solo registrar transacciones y subir documentos',
  },
  {
    id: 'visor',
    label: 'Visor',
    color: '#94a3b8',
    desc: 'Solo lectura — no puede modificar ningún dato',
  },
]

function RolBadge({ rol }) {
  const r = ROLES.find(x => x.id === rol) || ROLES.find(x => x.id === 'visor')
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
      background: r.color + '22', color: r.color,
      border: `1px solid ${r.color}44`,
    }}>
      {r.label.toUpperCase()}
    </span>
  )
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  // Form state
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState('visor')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsuarios(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCrear = async () => {
    if (!email) { setMsg('Ingresa un email'); return }
    if (!nombre) { setMsg('Ingresa el nombre'); return }
    setSaving(true); setMsg('')

    try {
      // 1. Create user via Supabase Auth Admin API
      const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: { nombre },
      })

      if (authError) throw new Error(authError.message)

      // 2. Assign role in user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({ user_id: user.id, email, nombre, role: rol })

      if (roleError) throw new Error(roleError.message)

      // 3. Send password reset email so user can set their password
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      })

      setMsg(`✓ Usuario creado. Se envió un email a ${email} para establecer contraseña.`)
      setEmail(''); setNombre(''); setRol('visor')
      setShowForm(false)
      load()
    } catch (e) {
      setMsg('Error: ' + e.message)
    }
    setSaving(false)
  }

  const handleCambiarRol = async (userId, nuevoRol) => {
    await supabase.from('user_roles').update({ role: nuevoRol }).eq('user_id', userId)
    load()
  }

  const handleDesactivar = async (userId, email) => {
    if (!window.confirm(`¿Desactivar el acceso de ${email}?`)) return
    await supabase.from('user_roles').delete().eq('user_id', userId)
    load()
  }

  const handleReenviarEmail = async (email) => {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    setMsg(`✓ Email de contraseña reenviado a ${email}`)
    setTimeout(() => setMsg(''), 4000)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="section-title" style={{ margin: 0 }}>GESTIÓN DE USUARIOS</div>
        <button className="btn-gold" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'CANCELAR' : '+ NUEVO USUARIO'}
        </button>
      </div>

      {msg && (
        <div style={{ marginBottom: 16, fontSize: 13, padding: '10px 14px', borderRadius: 6,
          background: msg.startsWith('✓') ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
          border: `1px solid ${msg.startsWith('✓') ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
          color: msg.startsWith('✓') ? '#4ade80' : '#f87171' }}>
          {msg}
        </div>
      )}

      {/* Formulario nuevo usuario */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20, border: '1px solid rgba(201,168,76,0.25)' }}>
          <div style={{ fontSize: 11, color: GOLD, fontWeight: 600, letterSpacing: 1.5, marginBottom: 16 }}>
            CREAR NUEVO USUARIO
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={LABEL}>NOMBRE COMPLETO</label>
              <input style={INPUT} value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Marcos González" />
            </div>
            <div>
              <label style={LABEL}>EMAIL</label>
              <input style={INPUT} type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com" />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={LABEL}>ROL</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ROLES.map(r => (
                <label key={r.id} onClick={() => setRol(r.id)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
                    padding: '10px 12px', borderRadius: 6,
                    background: rol === r.id ? `${r.color}11` : 'transparent',
                    border: `1px solid ${rol === r.id ? r.color + '44' : 'rgba(255,255,255,0.06)'}`,
                    transition: 'all .15s' }}>
                  <input type="radio" checked={rol === r.id} onChange={() => setRol(r.id)}
                    style={{ accentColor: r.color, marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: rol === r.id ? r.color : '#fff', marginBottom: 2 }}>
                      {r.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{r.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn-gold" onClick={handleCrear} disabled={saving}>
              {saving ? 'CREANDO...' : 'CREAR Y ENVIAR EMAIL'}
            </button>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
              El usuario recibirá un email para establecer su contraseña
            </div>
          </div>
        </div>
      )}

      {/* Lista usuarios */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: GOLD, fontFamily: 'Bebas Neue', letterSpacing: 2 }}>
          CARGANDO...
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Cambiar rol</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.user_id}>
                  <td style={{ color: '#fff', fontWeight: 500 }}>{u.nombre || '—'}</td>
                  <td style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{u.email}</td>
                  <td><RolBadge rol={u.role} /></td>
                  <td>
                    <select
                      value={u.role}
                      onChange={e => handleCambiarRol(u.user_id, e.target.value)}
                      style={{ ...INPUT, padding: '4px 8px', fontSize: 11, width: 'auto' }}>
                      {ROLES.map(r => (
                        <option key={r.id} value={r.id}>{r.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleReenviarEmail(u.email)}
                        style={{ fontSize: 10, padding: '3px 8px', borderRadius: 3,
                          border: '1px solid rgba(201,168,76,0.3)', background: 'transparent',
                          color: GOLD, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Reenviar email
                      </button>
                      <button onClick={() => handleDesactivar(u.user_id, u.email)}
                        style={{ fontSize: 10, padding: '3px 8px', borderRadius: 3,
                          border: '1px solid rgba(248,113,113,0.3)', background: 'transparent',
                          color: '#f87171', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Desactivar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!usuarios.length && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: 24 }}>
                    No hay usuarios registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Referencia de roles */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 1.5, marginBottom: 12 }}>
          REFERENCIA DE ROLES
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          {ROLES.map(r => (
            <div key={r.id} style={{ padding: '8px 12px', borderRadius: 6,
              background: `${r.color}08`, border: `1px solid ${r.color}22` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: r.color, marginBottom: 4 }}>{r.label.toUpperCase()}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
