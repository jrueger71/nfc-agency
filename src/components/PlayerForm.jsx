import { useState } from 'react'
import { supabase } from '../lib/supabase'

const INPUT = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(201,168,76,0.2)',
  borderRadius: 5,
  padding: '9px 12px',
  fontSize: 13,
  color: '#fff',
  fontFamily: 'inherit',
  outline: 'none',
}
const LABEL = {
  fontSize: 10,
  color: 'rgba(255,255,255,0.45)',
  letterSpacing: 1,
  display: 'block',
  marginBottom: 4,
  fontWeight: 600,
}
const GOLD = '#C9A84C'

const CAMPOS_PUBLICOS = [
  { key: 'partidos', label: 'Partidos jugados' },
  { key: 'minutos', label: 'Minutos' },
  { key: 'goles', label: 'Goles' },
  { key: 'asistencias', label: 'Asistencias' },
]

export default function PlayerForm({ player, onSave, onCancel }) {
  const isEdit = !!player?.id

  const [form, setForm] = useState({
    name: player?.name || '',
    rut: player?.rut || '',
    birth_date: player?.birth_date || '',
    skill_foot: player?.skill_foot || '',
    shoe_size: player?.shoe_size || '',
    glove_size: player?.glove_size || '',
    height: player?.height || '',
    weight: player?.weight || '',
    gender: player?.gender || 'M',
    estado: player?.estado || 'Activo',
    stats_visible: player?.stats_visible || false,
    stats_campos_publicos: player?.stats_campos_publicos || [],
    api_football_id: player?.api_football_id || '',
  })

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleCampo = (campo) => {
    setForm(f => {
      const campos = f.stats_campos_publicos || []
      return {
        ...f,
        stats_campos_publicos: campos.includes(campo)
          ? campos.filter(c => c !== campo)
          : [...campos, campo]
      }
    })
  }

  const handleSave = async () => {
    if (!form.name) { setMsg('El nombre es requerido'); return }
    setLoading(true)
    setMsg('')

    const payload = {
      name: form.name,
      rut: form.rut || null,
      birth_date: form.birth_date || null,
      skill_foot: form.skill_foot || null,
      shoe_size: form.shoe_size ? parseFloat(form.shoe_size) : null,
      glove_size: form.glove_size ? parseFloat(form.glove_size) : null,
      height: form.height ? parseFloat(form.height) : null,
      weight: form.weight ? parseFloat(form.weight) : null,
      gender: form.gender || 'M',
      estado: form.estado || 'Activo',
      stats_visible: form.stats_visible || false,
      stats_campos_publicos: form.stats_campos_publicos || [],
      api_football_id: form.api_football_id ? parseInt(form.api_football_id) : null,
    }

    let error
    if (isEdit) {
      ;({ error } = await supabase.from('players').update(payload).eq('id', player.id))
    } else {
      ;({ error } = await supabase.from('players').insert(payload))
    }

    setLoading(false)
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg(isEdit ? '✓ Jugador actualizado' : '✓ Jugador agregado')
    setTimeout(() => onSave?.(), 1200)
  }

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <div className="bebas" style={{ fontSize: 16, letterSpacing: 2, marginBottom: 20, color: GOLD }}>
        {isEdit ? 'EDITAR JUGADOR' : 'AGREGAR JUGADOR'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={LABEL}>NOMBRE COMPLETO *</label>
          <input style={INPUT} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Juan Carlos Pérez López" />
        </div>
        <div>
          <label style={LABEL}>RUT</label>
          <input style={INPUT} value={form.rut} onChange={e => set('rut', e.target.value)} placeholder="12.345.678-9" />
        </div>
        <div>
          <label style={LABEL}>FECHA DE NACIMIENTO</label>
          <input style={INPUT} type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
        </div>
        <div>
          <label style={LABEL}>GÉNERO</label>
          <select style={INPUT} value={form.gender} onChange={e => set('gender', e.target.value)}>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
        </div>
        <div>
          <label style={LABEL}>ESTADO</label>
          <select style={INPUT} value={form.estado} onChange={e => set('estado', e.target.value)}>
            <option value="Activo">Activo</option>
            <option value="Cadete">Cadete</option>
            <option value="Libre">Libre</option>
          </select>
        </div>
        <div>
          <label style={LABEL}>PIE HÁBIL</label>
          <select style={INPUT} value={form.skill_foot} onChange={e => set('skill_foot', e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="Derecho">Derecho</option>
            <option value="Izquierdo">Izquierdo</option>
            <option value="Ambos">Ambos</option>
          </select>
        </div>
        <div>
          <label style={LABEL}>ALTURA (cm)</label>
          <input style={INPUT} type="number" value={form.height} onChange={e => set('height', e.target.value)} placeholder="178" />
        </div>
        <div>
          <label style={LABEL}>PESO (kg)</label>
          <input style={INPUT} type="number" value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="75" />
        </div>
        <div>
          <label style={LABEL}>TALLA ZAPATO (UK)</label>
          <input style={INPUT} type="number" step="0.5" value={form.shoe_size} onChange={e => set('shoe_size', e.target.value)} placeholder="8" />
        </div>
        <div>
          <label style={LABEL}>TALLA GUANTE</label>
          <input style={INPUT} type="number" value={form.glove_size} onChange={e => set('glove_size', e.target.value)} placeholder="8" />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={LABEL}>ID API-FOOTBALL (opcional)</label>
          <input style={INPUT} type="number" value={form.api_football_id} onChange={e => set('api_football_id', e.target.value)}
            placeholder="Ej: 12345 — para sincronizar stats automáticamente" />
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>
            Búscalo en dashboard.api-football.com → Players
          </div>
        </div>
      </div>

      {/* Visibilidad pública de estadísticas */}
      <div style={{ marginTop: 20, background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <input type="checkbox" id="stats_visible" checked={form.stats_visible}
            onChange={e => set('stats_visible', e.target.checked)}
            style={{ width: 16, height: 16, accentColor: GOLD, cursor: 'pointer' }} />
          <label htmlFor="stats_visible" style={{ ...LABEL, margin: 0, cursor: 'pointer', fontSize: 12, color: GOLD }}>
            Mostrar estadísticas en perfil público
          </label>
        </div>

        {form.stats_visible && (
          <>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 8, letterSpacing: 1 }}>
              CAMPOS VISIBLES AL PÚBLICO
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CAMPOS_PUBLICOS.map(c => {
                const activo = (form.stats_campos_publicos || []).includes(c.key)
                return (
                  <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                    padding: '5px 10px', borderRadius: 5,
                    background: activo ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${activo ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    transition: 'all .15s' }}>
                    <input type="checkbox" checked={activo} onChange={() => toggleCampo(c.key)}
                      style={{ accentColor: GOLD, width: 14, height: 14 }} />
                    <span style={{ fontSize: 11, color: activo ? GOLD : 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                      {c.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 20, alignItems: 'center' }}>
        <button className="btn-gold" onClick={handleSave} disabled={loading}>
          {loading ? 'GUARDANDO...' : isEdit ? 'GUARDAR CAMBIOS' : 'AGREGAR JUGADOR'}
        </button>
        <button className="btn-ghost" onClick={onCancel}>CANCELAR</button>
        {msg && <span style={{ fontSize: 12, color: msg.startsWith('✓') ? '#4ade80' : '#f87171', marginLeft: 8 }}>{msg}</span>}
      </div>
    </div>
  )
}
