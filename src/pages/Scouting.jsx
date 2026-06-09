import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

function fmtDate(d) {
  if (!d) return '—'
  const fecha = new Date(d.includes('T') ? d : d + 'T12:00:00')
  return fecha.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

function calcEdad(birth_date) {
  if (!birth_date) return '—'
  const hoy = new Date()
  const nac = new Date(birth_date + 'T12:00:00')
  return Math.floor((hoy - nac) / (365.25 * 24 * 3600 * 1000))
}

const GOLD = '#C9A84C'
const INPUT = {
  width: '100%', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(201,168,76,0.2)', borderRadius: 5,
  padding: '8px 12px', fontSize: 13, color: '#fff',
  fontFamily: 'inherit', outline: 'none',
}
const LABEL = {
  fontSize: 10, color: 'rgba(255,255,255,0.45)',
  letterSpacing: 1, display: 'block', marginBottom: 4, fontWeight: 600,
}
const TAB_STYLE = (active) => ({
  padding: '6px 14px', fontSize: 11, fontWeight: 600, letterSpacing: .5,
  borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
  background: active ? GOLD : 'transparent',
  color: active ? '#0f1a3a' : 'rgba(255,255,255,0.45)',
  border: active ? `1px solid ${GOLD}` : '1px solid rgba(201,168,76,0.2)',
})

const ESTADOS = ['Observación', 'Contactado', 'Negociando', 'Libre', 'Incorporado', 'Archivado']
const ESTADOS_ACTIVOS = ['Observación', 'Contactado', 'Negociando', 'Libre', 'Incorporado']
const PRIORIDADES = ['Alta', 'Normal', 'Baja']
const POSICIONES = ['Portero', 'Defensa', 'Mediocampista', 'Delantero']
const TIPOS_CONTACTO = ['Llamada', 'Reunión', 'Email', 'WhatsApp', 'Partido observado', 'Otro']

const ESTADO_COLORS = {
  'Observación': { bg: 'rgba(201,168,76,0.15)', color: '#C9A84C' },
  'Contactado':  { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
  'Negociando':  { bg: 'rgba(251,146,60,0.15)', color: '#fb923c' },
  'Libre':       { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
  'Incorporado': { bg: 'rgba(74,222,128,0.15)', color: '#4ade80' },
  'Archivado':   { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)' },
}

const PRIORIDAD_COLORS = {
  'Alta':   { color: '#f87171' },
  'Normal': { color: 'rgba(255,255,255,0.4)' },
  'Baja':   { color: 'rgba(255,255,255,0.2)' },
}

const EMPTY_FORM = {
  name: '', birth_date: '', nationality: 'Chile', gender: 'M',
  position: '', club_name: '', contract_until: '', contract_option: '',
  last_extension: '', fichado_fecha: '', agente_actual: '',
  transfermarkt_profile: '', transfermarkt_valuation: '',
  estado: 'Observación', prioridad: 'Normal',
  telefono: '', email: '', notas: '', edad_referencial: '',
}

const EMPTY_CONTACT = {
  fecha: new Date().toISOString().split('T')[0],
  tipo: 'Llamada', descripcion: '', resultado: '',
}

// ── Modal Historial Contactos ─────────────────────────────────────────────────
function ModalContactos({ jugador, onClose }) {
  const [contacts, setContacts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_CONTACT)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const { data } = await supabase.from('scouting_contacts')
      .select('*').eq('scouting_id', jugador.id)
      .order('fecha', { ascending: false })
    setContacts(data || [])
  }

  useEffect(() => { load() }, [jugador.id])

  const handleSave = async () => {
    if (!form.descripcion) { setMsg('Ingresa una descripción'); return }
    setSaving(true)
    const { error } = await supabase.from('scouting_contacts').insert({
      scouting_id: jugador.id,
      fecha: form.fecha,
      tipo: form.tipo,
      descripcion: form.descripcion,
      resultado: form.resultado || null,
    })
    setSaving(false)
    if (error) { setMsg('Error: ' + error.message); return }
    setForm(EMPTY_CONTACT)
    setShowForm(false)
    load()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este contacto?')) return
    await supabase.from('scouting_contacts').delete().eq('id', id)
    load()
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#0f1a3a', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 12,
        padding: 24, width: '100%', maxWidth: 580, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: GOLD, fontWeight: 600, letterSpacing: 1 }}>HISTORIAL DE CONTACTOS</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{jugador.name} · {jugador.club_name || '—'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-gold" onClick={() => setShowForm(s => !s)}>+ NUEVO</button>
            <button className="btn-ghost" onClick={onClose}>✕</button>
          </div>
        </div>

        {msg && <div style={{ fontSize: 12, color: '#f87171', marginBottom: 10 }}>{msg}</div>}

        {showForm && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)',
            borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={LABEL}>FECHA</label>
                <input style={INPUT} type="date" value={form.fecha}
                  onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
              </div>
              <div>
                <label style={LABEL}>TIPO</label>
                <select style={INPUT} value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  {TIPOS_CONTACTO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={LABEL}>DESCRIPCIÓN</label>
                <textarea style={{ ...INPUT, resize: 'vertical', minHeight: 60 }}
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="¿Qué ocurrió en este contacto?" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={LABEL}>RESULTADO</label>
                <input style={INPUT} value={form.resultado}
                  onChange={e => setForm(f => ({ ...f, resultado: e.target.value }))}
                  placeholder="Ej: Interesado, Pendiente respuesta, No disponible..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-gold" onClick={handleSave} disabled={saving}>
                {saving ? 'GUARDANDO...' : 'GUARDAR'}
              </button>
              <button className="btn-ghost" onClick={() => setShowForm(false)}>CANCELAR</button>
            </div>
          </div>
        )}

        {contacts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
            Sin contactos registrados
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {contacts.map(c => (
              <div key={c.id} style={{ background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                      background: 'rgba(201,168,76,0.15)', color: GOLD,
                      border: '1px solid rgba(201,168,76,0.3)' }}>{c.tipo}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{fmtDate(c.fecha)}</span>
                  </div>
                  <button onClick={() => handleDelete(c.id)}
                    style={{ fontSize: 10, color: '#f87171', background: 'none', border: 'none',
                      cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                </div>
                <div style={{ fontSize: 12, color: '#fff', marginBottom: 4 }}>{c.descripcion}</div>
                {c.resultado && (
                  <div style={{ fontSize: 11, color: '#4ade80', fontStyle: 'italic' }}>→ {c.resultado}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Formulario jugador ────────────────────────────────────────────────────────
function ScoutingForm({ jugador, userEmail, onSave, onCancel }) {
  const isEdit = !!jugador?.id
  const [form, setForm] = useState({ ...EMPTY_FORM, ...jugador })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name) { setMsg('El nombre es requerido'); return }
    setSaving(true); setMsg('')
    const payload = {
      name: form.name,
      birth_date: form.birth_date || null,
      edad_referencial: form.edad_referencial ? parseInt(form.edad_referencial) : null,
      nationality: form.nationality || 'Chile',
      gender: form.gender || 'M',
      position: form.position || null,
      club_name: form.club_name || null,
      contract_until: form.contract_until || null,
      contract_option: form.contract_option || null,
      last_extension: form.last_extension || null,
      fichado_fecha: form.fichado_fecha || null,
      agente_actual: form.agente_actual || null,
      transfermarkt_profile: form.transfermarkt_profile || null,
      transfermarkt_valuation: form.transfermarkt_valuation || null,
      estado: form.estado || 'Observación',
      prioridad: form.prioridad || 'Normal',
      telefono: form.telefono || null,
      email: form.email || null,
      notas: form.notas || null,
      updated_by_email: userEmail || null,
      updated_at: new Date().toISOString(),
    }

    let error
    if (isEdit) {
      ;({ error } = await supabase.from('scouting').update(payload).eq('id', jugador.id))
    } else {
      ;({ error } = await supabase.from('scouting').insert({
        ...payload,
        created_by_email: userEmail || null,
      }))
    }
    setSaving(false)
    if (error) { setMsg('Error: ' + error.message); return }
    onSave()
  }

  return (
    <div className="card" style={{ maxWidth: 700 }}>
      <div className="bebas" style={{ fontSize: 15, letterSpacing: 2, marginBottom: 20, color: GOLD }}>
        {isEdit ? 'EDITAR JUGADOR' : 'AGREGAR JUGADOR AL RADAR'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Estado */}
        <div>
          <label style={LABEL}>ESTADO</label>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {ESTADOS.map(e => (
              <button key={e} onClick={() => set('estado', e)}
                style={{ padding: '4px 10px', fontSize: 10, fontWeight: 600, borderRadius: 4,
                  cursor: 'pointer', fontFamily: 'inherit',
                  background: form.estado === e ? (ESTADO_COLORS[e]?.bg || 'rgba(201,168,76,0.15)') : 'transparent',
                  color: form.estado === e ? (ESTADO_COLORS[e]?.color || GOLD) : 'rgba(255,255,255,0.35)',
                  border: `1px solid ${form.estado === e ? (ESTADO_COLORS[e]?.color || GOLD) + '66' : 'rgba(255,255,255,0.1)'}` }}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Prioridad */}
        <div>
          <label style={LABEL}>PRIORIDAD</label>
          <div style={{ display: 'flex', gap: 5 }}>
            {PRIORIDADES.map(p => (
              <button key={p} onClick={() => set('prioridad', p)}
                style={{ padding: '4px 16px', fontSize: 11, fontWeight: 600, borderRadius: 4,
                  cursor: 'pointer', fontFamily: 'inherit',
                  background: form.prioridad === p ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: form.prioridad === p ? (PRIORIDAD_COLORS[p]?.color || '#fff') : 'rgba(255,255,255,0.25)',
                  border: `1px solid ${form.prioridad === p ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                {p === 'Alta' ? '🔴' : p === 'Normal' ? '🟡' : '⚪'} {p}
              </button>
            ))}
          </div>
        </div>

        {/* Nombre */}
        <div style={{ gridColumn: '1/-1' }}>
          <label style={LABEL}>NOMBRE COMPLETO *</label>
          <input style={INPUT} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nombre Apellido" />
        </div>

        <div>
          <label style={LABEL}>FECHA NACIMIENTO</label>
          <input style={INPUT} type="date" value={form.birth_date || ''}
            onChange={e => set('birth_date', e.target.value)} />
        </div>

        <div>
          <label style={LABEL}>EDAD REFERENCIAL</label>
          <input style={INPUT} type="number" value={form.edad_referencial || ''}
            onChange={e => set('edad_referencial', e.target.value)}
            placeholder="Ej: 24 (si no hay fecha de nac.)" />
        </div>

        <div>
          <label style={LABEL}>GÉNERO</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['M', 'Masculino'], ['F', 'Femenino']].map(([v, l]) => (
              <button key={v} onClick={() => set('gender', v)}
                style={{ flex: 1, padding: '8px', fontSize: 12, borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit',
                  border: `1px solid ${form.gender === v ? GOLD : 'rgba(255,255,255,0.1)'}`,
                  background: form.gender === v ? 'rgba(201,168,76,0.15)' : 'transparent',
                  color: form.gender === v ? GOLD : 'rgba(255,255,255,0.4)' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={LABEL}>NACIONALIDAD</label>
          <input style={INPUT} value={form.nationality || ''} onChange={e => set('nationality', e.target.value)} placeholder="Chile" />
        </div>

        <div>
          <label style={LABEL}>POSICIÓN</label>
          <select style={INPUT} value={form.position || ''} onChange={e => set('position', e.target.value)}>
            <option value="">Seleccionar</option>
            {POSICIONES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Club */}
        <div style={{ gridColumn: '1/-1' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 1.5, marginBottom: 8,
            borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 6 }}>INFORMACIÓN DE CLUB</div>
        </div>

        <div>
          <label style={LABEL}>CLUB ACTUAL</label>
          <input style={INPUT} value={form.club_name || ''} onChange={e => set('club_name', e.target.value)} placeholder="Nombre del club" />
        </div>
        <div>
          <label style={LABEL}>FECHA FICHADO AL CLUB</label>
          <input style={INPUT} type="date" value={form.fichado_fecha || ''} onChange={e => set('fichado_fecha', e.target.value)} />
        </div>
        <div>
          <label style={LABEL}>CONTRATO HASTA</label>
          <input style={INPUT} type="date" value={form.contract_until || ''} onChange={e => set('contract_until', e.target.value)} />
        </div>
        <div>
          <label style={LABEL}>ÚLTIMA AMPLIACIÓN</label>
          <input style={INPUT} type="date" value={form.last_extension || ''} onChange={e => set('last_extension', e.target.value)} />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={LABEL}>OPCIÓN DE CONTRATO</label>
          <input style={INPUT} value={form.contract_option || ''} onChange={e => set('contract_option', e.target.value)}
            placeholder="Ej: +1 año opcional, cláusula de salida..." />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={LABEL}>AGENTE ACTUAL</label>
          <input style={INPUT} value={form.agente_actual || ''} onChange={e => set('agente_actual', e.target.value)}
            placeholder="Nombre del agente o agencia actual" />
        </div>

        <div>
          <label style={LABEL}>VALOR TRANSFERMARKT</label>
          <input style={INPUT} value={form.transfermarkt_valuation || ''} onChange={e => set('transfermarkt_valuation', e.target.value)} placeholder="500K €" />
        </div>
        <div>
          <label style={LABEL}>PERFIL TRANSFERMARKT</label>
          <input style={INPUT} value={form.transfermarkt_profile || ''} onChange={e => set('transfermarkt_profile', e.target.value)} placeholder="https://www.transfermarkt.com/..." />
        </div>

        {/* Contacto */}
        <div style={{ gridColumn: '1/-1' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 1.5, marginBottom: 8,
            borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 6 }}>DATOS DE CONTACTO</div>
        </div>
        <div>
          <label style={LABEL}>TELÉFONO</label>
          <input style={INPUT} value={form.telefono || ''} onChange={e => set('telefono', e.target.value)} placeholder="+56 9 xxxx xxxx" />
        </div>
        <div>
          <label style={LABEL}>EMAIL</label>
          <input style={INPUT} type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="jugador@email.com" />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={LABEL}>NOTAS</label>
          <textarea style={{ ...INPUT, resize: 'vertical', minHeight: 70 }}
            value={form.notas || ''} onChange={e => set('notas', e.target.value)}
            placeholder="Observaciones, características del jugador, contexto..." />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 20, alignItems: 'center' }}>
        <button className="btn-gold" onClick={handleSave} disabled={saving}>
          {saving ? 'GUARDANDO...' : isEdit ? 'GUARDAR CAMBIOS' : 'AGREGAR AL RADAR'}
        </button>
        <button className="btn-ghost" onClick={onCancel}>CANCELAR</button>
        {msg && <span style={{ fontSize: 12, color: '#f87171', marginLeft: 8 }}>{msg}</span>}
      </div>

      {isEdit && jugador.updated_by_email && (
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 12 }}>
          Última modificación: {jugador.updated_by_email} · {fmtDate(jugador.updated_at)}
        </div>
      )}
    </div>
  )
}

// ── Scouting principal ────────────────────────────────────────────────────────
export default function Scouting() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const userEmail = session?.user?.email || null

  const [jugadores, setJugadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [filterEstado, setFilterEstado] = useState('Todos')
  const [filterPos, setFilterPos] = useState('Todos')
  const [filterPrioridad, setFilterPrioridad] = useState('Todos')
  const [filterGenero, setFilterGenero] = useState('Todos')
  const [showArchivados, setShowArchivados] = useState(false)
  const [search, setSearch] = useState('')
  const [contactCounts, setContactCounts] = useState({})

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('scouting').select('*').order('created_at', { ascending: false })
    setJugadores(data || [])
    const { data: counts } = await supabase.from('scouting_contacts').select('scouting_id')
    const map = {}
    if (counts) counts.forEach(c => { map[c.scouting_id] = (map[c.scouting_id] || 0) + 1 })
    setContactCounts(map)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCambiarEstado = async (j, nuevoEstado) => {
    const confirmMsg = nuevoEstado === 'Incorporado'
      ? `¿Incorporar a ${j.name} como representado?`
      : `¿Archivar a ${j.name}? El registro se mantendrá pero no aparecerá en la lista activa.`
    if (!window.confirm(confirmMsg)) return
    await supabase.from('scouting').update({
      estado: nuevoEstado,
      updated_by_email: userEmail,
      updated_at: new Date().toISOString(),
    }).eq('id', j.id)
    load()
  }

  const closeModal = () => { setModal(null); load() }

  const filtered = jugadores.filter(j => {
    if (!showArchivados && j.estado === 'Archivado') return false
    const matchSearch = !search || j.name?.toLowerCase().includes(search.toLowerCase()) || j.club_name?.toLowerCase().includes(search.toLowerCase())
    const matchEstado = filterEstado === 'Todos' || j.estado === filterEstado
    const matchPos = filterPos === 'Todos' || j.position === filterPos
    const matchPrio = filterPrioridad === 'Todos' || j.prioridad === filterPrioridad
    const matchGenero = filterGenero === 'Todos' || j.gender === filterGenero
    return matchSearch && matchEstado && matchPos && matchPrio && matchGenero
  })

  const alertas = jugadores.filter(j => {
    if (!j.contract_until || ['Archivado', 'Incorporado'].includes(j.estado)) return false
    const dias = Math.floor((new Date(j.contract_until + 'T12:00:00') - Date.now()) / (24 * 3600 * 1000))
    return dias >= 0 && dias <= 180
  })

  const totalArchivados = jugadores.filter(j => j.estado === 'Archivado').length

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, fontFamily: 'Bebas Neue', color: GOLD, letterSpacing: 3 }}>CARGANDO...</div>
  )

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px' }}>

      {/* Modals */}
      {modal?.type === 'form' && (
        <div onClick={e => e.target === e.currentTarget && closeModal()}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxHeight: '90vh', overflowY: 'auto', width: '100%', maxWidth: 720 }}>
            <ScoutingForm jugador={modal.data} userEmail={userEmail} onSave={closeModal} onCancel={closeModal} />
          </div>
        </div>
      )}
      {modal?.type === 'contactos' && (
        <ModalContactos jugador={modal.data} onClose={closeModal} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <button onClick={() => navigate('/dashboard')}
            style={{ fontSize: 11, color: GOLD, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, letterSpacing: .5, fontFamily: 'inherit', marginBottom: 6, display: 'block' }}>
            ← VOLVER AL PANEL
          </button>
          <div className="bebas" style={{ fontSize: 22, letterSpacing: 3, color: '#fff' }}>
            RADAR DE SCOUTING
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'inherit', marginLeft: 12, fontWeight: 400, letterSpacing: 1 }}>
              {jugadores.filter(j => !['Archivado'].includes(j.estado)).length} activos · {jugadores.length} total
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {userEmail && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', padding: '4px 8px',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4 }}>
              👤 {userEmail}
            </span>
          )}
          <button className="btn-gold" onClick={() => setModal({ type: 'form', data: null })}>+ AGREGAR JUGADOR</button>
        </div>
      </div>

      {/* Alertas contratos por vencer */}
      {alertas.length > 0 && (
        <div style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)',
          borderRadius: 8, padding: '10px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#fb923c', fontWeight: 600, marginBottom: 6 }}>
            ⚡ {alertas.length} jugador(es) con contrato venciendo en menos de 6 meses
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {alertas.map(j => {
              const dias = Math.floor((new Date(j.contract_until + 'T12:00:00') - Date.now()) / (24 * 3600 * 1000))
              return (
                <span key={j.id} style={{ fontSize: 11, color: '#fb923c',
                  background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)',
                  borderRadius: 4, padding: '2px 8px' }}>
                  {j.name} · {dias}d
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Resumen por estado */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 16 }}>
        {ESTADOS_ACTIVOS.map(e => {
          const n = jugadores.filter(j => j.estado === e).length
          const { bg, color } = ESTADO_COLORS[e]
          return (
            <div key={e} onClick={() => setFilterEstado(filterEstado === e ? 'Todos' : e)}
              style={{ background: filterEstado === e ? bg : 'rgba(255,255,255,0.03)',
                border: `1px solid ${filterEstado === e ? color + '44' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 8, padding: '10px 12px', textAlign: 'center', cursor: 'pointer', transition: 'all .15s' }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 24, color: filterEstado === e ? color : 'rgba(255,255,255,0.5)', lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, marginTop: 3 }}>{e.toUpperCase()}</div>
            </div>
          )
        })}
        {/* Archivados toggle */}
        <div onClick={() => { setShowArchivados(s => !s); setFilterEstado('Todos') }}
          style={{ background: showArchivados ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${showArchivados ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.04)'}`,
            borderRadius: 8, padding: '10px 12px', textAlign: 'center', cursor: 'pointer', transition: 'all .15s' }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 24, color: 'rgba(255,255,255,0.25)', lineHeight: 1 }}>{totalArchivados}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginTop: 3 }}>ARCHIVADOS {showArchivados ? '▲' : '▼'}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar jugador o club..."
          style={{ ...INPUT, width: 220, padding: '6px 12px', fontSize: 12 }} />
        <select value={filterPos} onChange={e => setFilterPos(e.target.value)}
          style={{ ...INPUT, width: 'auto', padding: '6px 10px', fontSize: 11 }}>
          <option value="Todos">Todas las posiciones</option>
          {POSICIONES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterPrioridad} onChange={e => setFilterPrioridad(e.target.value)}
          style={{ ...INPUT, width: 'auto', padding: '6px 10px', fontSize: 11 }}>
          <option value="Todos">Toda prioridad</option>
          {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {[['Todos', 'Ambos'], ['M', 'Masculino'], ['F', 'Femenino']].map(([v, l]) => (
          <button key={v} onClick={() => setFilterGenero(v)} style={{ ...TAB_STYLE(filterGenero === v), padding: '5px 12px', fontSize: 10 }}>
            {l}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: 40 }}>
          Sin jugadores en el radar
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Jugador</th>
                <th>Edad</th>
                <th>Nac.</th>
                <th>Posición</th>
                <th>Club</th>
                <th>Fichado</th>
                <th>Contrato hasta</th>
                <th>Agente</th>
                <th>TM</th>
                <th>Estado</th>
                <th>Prior.</th>
                <th>💬</th>
                <th>Ingresó</th>
                <th>Acc.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(j => {
                const { bg, color } = ESTADO_COLORS[j.estado] || ESTADO_COLORS['Observación']
                const diasContrato = j.contract_until
                  ? Math.floor((new Date(j.contract_until + 'T12:00:00') - Date.now()) / (24 * 3600 * 1000))
                  : null
                const contratoAlerta = diasContrato !== null && diasContrato >= 0 && diasContrato <= 180
                const edadMostrar = j.birth_date ? calcEdad(j.birth_date) : (j.edad_referencial ? `~${j.edad_referencial}` : '—')
                const esArchivado = j.estado === 'Archivado'

                return (
                  <tr key={j.id} style={{ opacity: esArchivado ? 0.5 : 1 }}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: 12 }}>{j.name}</div>
                      {j.notas && (
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', maxWidth: 180,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={j.notas}>{j.notas}</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', color: GOLD, fontWeight: 600 }}>{edadMostrar}</td>
                    <td style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{j.nationality || '—'}</td>
                    <td style={{ fontSize: 11 }}>{j.position || '—'}</td>
                    <td style={{ fontSize: 11, color: '#fff', fontWeight: 500 }}>{j.club_name || '—'}</td>
                    <td style={{ fontSize: 11, whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.5)' }}>{fmtDate(j.fichado_fecha)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {j.contract_until ? (
                        <span style={{ fontSize: 11, color: contratoAlerta ? '#fb923c' : 'rgba(255,255,255,0.5)',
                          fontWeight: contratoAlerta ? 600 : 400 }}>
                          {fmtDate(j.contract_until)}
                          {contratoAlerta && <span style={{ fontSize: 9, marginLeft: 4 }}>⚡{diasContrato}d</span>}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{j.agente_actual || '—'}</td>
                    <td>
                      {j.transfermarkt_profile ? (
                        <a href={j.transfermarkt_profile} target="_blank" rel="noreferrer"
                          style={{ fontSize: 10, color: GOLD, textDecoration: 'none' }}>
                          {j.transfermarkt_valuation || 'Ver ↗'}
                        </a>
                      ) : (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{j.transfermarkt_valuation || '—'}</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                        background: bg, color, border: `1px solid ${color}44`, whiteSpace: 'nowrap' }}>
                        {j.estado}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 12 }}>
                        {j.prioridad === 'Alta' ? '🔴' : j.prioridad === 'Normal' ? '🟡' : '⚪'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => setModal({ type: 'contactos', data: j })}
                        style={{ fontSize: 10, padding: '3px 8px', borderRadius: 3,
                          border: `1px solid ${contactCounts[j.id] > 0 ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.1)'}`,
                          background: 'transparent',
                          color: contactCounts[j.id] > 0 ? '#60a5fa' : 'rgba(255,255,255,0.3)',
                          cursor: 'pointer', fontFamily: 'inherit' }}>
                        💬 {contactCounts[j.id] || 0}
                      </button>
                    </td>
                    <td style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>
                      {j.created_by_email
                        ? j.created_by_email.split('@')[0]
                        : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setModal({ type: 'form', data: j })}
                          style={{ fontSize: 10, padding: '3px 6px', borderRadius: 3,
                            border: '1px solid rgba(201,168,76,0.3)', background: 'transparent',
                            color: GOLD, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Editar
                        </button>
                        {!esArchivado && j.estado !== 'Incorporado' && (
                          <button onClick={() => handleCambiarEstado(j, 'Incorporado')}
                            style={{ fontSize: 10, padding: '3px 6px', borderRadius: 3,
                              border: '1px solid rgba(74,222,128,0.3)', background: 'transparent',
                              color: '#4ade80', cursor: 'pointer', fontFamily: 'inherit' }}
                            title="Incorporar como representado">✓</button>
                        )}
                        {!esArchivado && (
                          <button onClick={() => handleCambiarEstado(j, 'Archivado')}
                            style={{ fontSize: 10, padding: '3px 6px', borderRadius: 3,
                              border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                              color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontFamily: 'inherit' }}
                            title="Archivar — el registro se mantiene">
                            📁
                          </button>
                        )}
                        {esArchivado && (
                          <button onClick={() => handleCambiarEstado(j, 'Observación')}
                            style={{ fontSize: 10, padding: '3px 6px', borderRadius: 3,
                              border: '1px solid rgba(201,168,76,0.2)', background: 'transparent',
                              color: GOLD, cursor: 'pointer', fontFamily: 'inherit' }}
                            title="Reactivar al radar">
                            ↩
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
