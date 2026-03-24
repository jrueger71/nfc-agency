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

export default function ClubContractForm({ contract, playerId, onSave, onCancel }) {
  const isEdit = !!contract?.id
  const [form, setForm] = useState({
    club_name: '', position: '', contract_active: true,
    contract_date: '', contract_duration_months: '',
    salary: '', commission_percentage: '', commission_fixed: '',
    transfermarkt_profile: '', transfermarkt_valuation: '',
    ...contract,
    player_id: playerId || contract?.player_id,
  })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.club_name) { setMsg('El nombre del club es requerido'); return }
    setLoading(true)
    setMsg('')

    const payload = {
      player_id: form.player_id,
      club_name: form.club_name,
      position: form.position || null,
      contract_active: form.contract_active,
      contract_date: form.contract_date || null,
      contract_duration_months: form.contract_duration_months ? parseInt(form.contract_duration_months) : null,
      salary: form.salary ? parseFloat(form.salary) : null,
      commission_percentage: form.commission_percentage ? parseFloat(form.commission_percentage) : null,
      commission_fixed: form.commission_fixed ? parseFloat(form.commission_fixed) : null,
      transfermarkt_profile: form.transfermarkt_profile || null,
      transfermarkt_valuation: form.transfermarkt_valuation || null,
    }

    let error
    if (isEdit) {
      ;({ error } = await supabase.from('club_info').update(payload).eq('id', form.id))
    } else {
      ;({ error } = await supabase.from('club_info').insert(payload))
    }

    setLoading(false)
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('✓ Contrato guardado')
    setTimeout(() => onSave?.(), 1200)
  }

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <div className="bebas" style={{ fontSize: 16, letterSpacing: 2, marginBottom: 20, color: '#C9A84C' }}>
        {isEdit ? 'EDITAR CONTRATO CLUB' : 'AGREGAR CONTRATO CLUB'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={LABEL}>NOMBRE DEL CLUB *</label>
          <input style={INPUT} value={form.club_name} onChange={e => set('club_name', e.target.value)} placeholder="Colo-Colo" />
        </div>
        <div>
          <label style={LABEL}>POSICIÓN</label>
          <select style={INPUT} value={form.position || ''} onChange={e => set('position', e.target.value)}>
            <option value="">Seleccionar</option>
            <option>Portero</option>
            <option>Defensa</option>
            <option>Mediocampista</option>
            <option>Delantero</option>
          </select>
        </div>
        <div>
          <label style={LABEL}>FECHA INICIO CONTRATO</label>
          <input style={INPUT} type="date" value={form.contract_date || ''} onChange={e => set('contract_date', e.target.value)} />
        </div>
        <div>
          <label style={LABEL}>DURACIÓN (meses)</label>
          <input style={INPUT} type="number" value={form.contract_duration_months || ''} onChange={e => set('contract_duration_months', e.target.value)} placeholder="24" />
        </div>
        <div>
          <label style={LABEL}>SALARIO MENSUAL (USD)</label>
          <input style={INPUT} type="number" value={form.salary || ''} onChange={e => set('salary', e.target.value)} placeholder="5000" />
        </div>
        <div>
          <label style={LABEL}>COMISIÓN AGENCIA (%)</label>
          <input style={INPUT} type="number" step="0.1" value={form.commission_percentage || ''} onChange={e => set('commission_percentage', e.target.value)} placeholder="10" />
        </div>
        <div>
          <label style={LABEL}>COMISIÓN FIJA (USD)</label>
          <input style={INPUT} type="number" value={form.commission_fixed || ''} onChange={e => set('commission_fixed', e.target.value)} placeholder="0" />
        </div>
        <div>
          <label style={LABEL}>VALOR TRANSFERMARKT</label>
          <input style={INPUT} value={form.transfermarkt_valuation || ''} onChange={e => set('transfermarkt_valuation', e.target.value)} placeholder="500K €" />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={LABEL}>LINK PERFIL TRANSFERMARKT</label>
          <input style={INPUT} value={form.transfermarkt_profile || ''} onChange={e => set('transfermarkt_profile', e.target.value)} placeholder="https://www.transfermarkt.com/..." />
        </div>
        <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" id="active" checked={form.contract_active} onChange={e => set('contract_active', e.target.checked)}
            style={{ width: 16, height: 16, accentColor: '#C9A84C', cursor: 'pointer' }} />
          <label htmlFor="active" style={{ ...LABEL, margin: 0, cursor: 'pointer', fontSize: 12 }}>Contrato activo</label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 20, alignItems: 'center' }}>
        <button className="btn-gold" onClick={handleSave} disabled={loading}>
          {loading ? 'GUARDANDO...' : 'GUARDAR CONTRATO'}
        </button>
        <button className="btn-ghost" onClick={onCancel}>CANCELAR</button>
        {msg && <span style={{ fontSize: 12, color: msg.startsWith('✓') ? '#4ade80' : '#f87171', marginLeft: 8 }}>{msg}</span>}
      </div>
    </div>
  )
}
