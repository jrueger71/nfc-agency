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

export default function AgencyContractForm({ contract, playerId, onSave, onCancel }) {
  const isEdit = !!contract?.id
  const [form, setForm] = useState({
    incorporation_date: '',
    contract_date: '',
    contract_duration_months: '',
    contract_active: true,
    contract_pdf_url: '',
    ...contract,
    player_id: playerId || contract?.player_id,
  })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setLoading(true)
    setMsg('')

    const payload = {
      player_id: form.player_id,
      incorporation_date: form.incorporation_date || null,
      contract_date: form.contract_date || null,
      contract_duration_months: form.contract_duration_months ? parseInt(form.contract_duration_months) : null,
      contract_active: form.contract_active,
      contract_pdf_url: form.contract_pdf_url || null,
    }

    let error
    if (isEdit) {
      ;({ error } = await supabase.from('agency_contracts').update(payload).eq('id', form.id))
    } else {
      ;({ error } = await supabase.from('agency_contracts').insert(payload))
    }

    setLoading(false)
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('✓ Contrato de agencia guardado')
    setTimeout(() => onSave?.(), 1200)
  }

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <div className="bebas" style={{ fontSize: 16, letterSpacing: 2, marginBottom: 20, color: '#C9A84C' }}>
        {isEdit ? 'EDITAR CONTRATO AGENCIA' : 'AGREGAR CONTRATO AGENCIA'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={LABEL}>FECHA DE INCORPORACIÓN</label>
          <input style={INPUT} type="date" value={form.incorporation_date || ''} onChange={e => set('incorporation_date', e.target.value)} />
        </div>
        <div>
          <label style={LABEL}>FECHA INICIO CONTRATO</label>
          <input style={INPUT} type="date" value={form.contract_date || ''} onChange={e => set('contract_date', e.target.value)} />
        </div>
        <div>
          <label style={LABEL}>DURACIÓN (meses)</label>
          <input style={INPUT} type="number" value={form.contract_duration_months || ''} onChange={e => set('contract_duration_months', e.target.value)} placeholder="12" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 20 }}>
          <input type="checkbox" id="agactive" checked={form.contract_active} onChange={e => set('contract_active', e.target.checked)}
            style={{ width: 16, height: 16, accentColor: '#C9A84C', cursor: 'pointer' }} />
          <label htmlFor="agactive" style={{ ...LABEL, margin: 0, cursor: 'pointer', fontSize: 12 }}>Contrato activo</label>
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={LABEL}>URL DEL PDF DEL CONTRATO</label>
          <input style={INPUT} value={form.contract_pdf_url || ''} onChange={e => set('contract_pdf_url', e.target.value)} placeholder="https://..." />
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
            Sube el PDF a Supabase Storage y pega el link público aquí
          </div>
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
