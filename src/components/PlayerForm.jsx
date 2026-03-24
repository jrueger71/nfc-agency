import { useState, useEffect } from 'react'
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

export default function PlayerForm({ player, onSave, onCancel }) {
  const isEdit = !!player?.id
  const [form, setForm] = useState({
    name: '', rut: '', birth_date: '', skill_foot: '',
    shoe_size: '', glove_size: '', height: '', weight: '',
    ...player,
  })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

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
    }

    let error
    if (isEdit) {
      ;({ error } = await supabase.from('players').update(payload).eq('id', form.id))
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
      <div className="bebas" style={{ fontSize: 16, letterSpacing: 2, marginBottom: 20, color: '#C9A84C' }}>
        {isEdit ? 'EDITAR JUGADOR' : 'AGREGAR JUGADOR'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={LABEL}>NOMBRE COMPLETO *</label>
          <input style={INPUT} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Juan Carlos Pérez López" />
        </div>
        <div>
          <label style={LABEL}>RUT</label>
          <input style={INPUT} value={form.rut || ''} onChange={e => set('rut', e.target.value)} placeholder="12.345.678-9" />
        </div>
        <div>
          <label style={LABEL}>FECHA DE NACIMIENTO</label>
          <input style={INPUT} type="date" value={form.birth_date || ''} onChange={e => set('birth_date', e.target.value)} />
        </div>
        <div>
          <label style={LABEL}>PIE HÁBIL</label>
          <select style={INPUT} value={form.skill_foot || ''} onChange={e => set('skill_foot', e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="Derecho">Derecho</option>
            <option value="Izquierdo">Izquierdo</option>
            <option value="Ambos">Ambos</option>
          </select>
        </div>
        <div>
          <label style={LABEL}>ALTURA (cm)</label>
          <input style={INPUT} type="number" value={form.height || ''} onChange={e => set('height', e.target.value)} placeholder="178" />
        </div>
        <div>
          <label style={LABEL}>PESO (kg)</label>
          <input style={INPUT} type="number" value={form.weight || ''} onChange={e => set('weight', e.target.value)} placeholder="75" />
        </div>
        <div>
          <label style={LABEL}>TALLA ZAPATO</label>
          <input style={INPUT} type="number" value={form.shoe_size || ''} onChange={e => set('shoe_size', e.target.value)} placeholder="42" />
        </div>
        <div>
          <label style={LABEL}>TALLA GUANTE</label>
          <input style={INPUT} type="number" value={form.glove_size || ''} onChange={e => set('glove_size', e.target.value)} placeholder="8" />
        </div>
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
