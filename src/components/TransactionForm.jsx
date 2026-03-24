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

const INCOME_TYPES = ['Comisión transferencia', 'Comisión renovación', 'Comisión marketing', 'Bono representación', 'Otro ingreso']
const EXPENSE_TYPES = ['Viajes', 'Honorarios legales', 'Marketing / publicidad', 'Médico / preparación física', 'Gestión de imagen', 'Gastos administrativos', 'Otro gasto']

export default function TransactionForm({ transaction, onSave, onCancel }) {
  const isEdit = !!transaction?.id
  const [players, setPlayers] = useState([])
  const [form, setForm] = useState({
    player_id: '', type: 'income', subtype: '',
    description: '', amount: '', transaction_date: new Date().toISOString().split('T')[0],
    ...transaction,
  })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.from('players').select('id,name').order('name').then(({ data }) => setPlayers(data || []))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.amount || !form.transaction_date) { setMsg('Monto y fecha son requeridos'); return }
    setLoading(true)
    setMsg('')

    const payload = {
      player_id: form.player_id || null,
      type: form.type,
      subtype: form.subtype || null,
      description: form.description || null,
      amount: parseFloat(form.amount),
      transaction_date: form.transaction_date,
    }

    let error
    if (isEdit) {
      ;({ error } = await supabase.from('transactions').update(payload).eq('id', form.id))
    } else {
      ;({ error } = await supabase.from('transactions').insert(payload))
    }

    setLoading(false)
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('✓ Transacción guardada')
    setTimeout(() => onSave?.(), 1200)
  }

  const subtypes = form.type === 'income' ? INCOME_TYPES : EXPENSE_TYPES

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <div className="bebas" style={{ fontSize: 16, letterSpacing: 2, marginBottom: 20, color: '#C9A84C' }}>
        {isEdit ? 'EDITAR TRANSACCIÓN' : 'NUEVA TRANSACCIÓN'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Tipo ingreso/gasto */}
        <div style={{ gridColumn: '1/-1' }}>
          <label style={LABEL}>TIPO</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['income','INGRESO'],['expense','GASTO']].map(([val, lbl]) => (
              <button key={val} onClick={() => { set('type', val); set('subtype', '') }}
                style={{
                  flex: 1, padding: '9px', fontSize: 12, fontWeight: 600, letterSpacing: 1,
                  borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                  background: form.type === val ? (val==='income' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)') : 'rgba(255,255,255,0.04)',
                  color: form.type === val ? (val==='income' ? '#4ade80' : '#f87171') : 'rgba(255,255,255,0.4)',
                  border: form.type === val ? `1px solid ${val==='income' ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.4)'}` : '1px solid rgba(255,255,255,0.08)',
                }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={LABEL}>JUGADOR (opcional)</label>
          <select style={INPUT} value={form.player_id || ''} onChange={e => set('player_id', e.target.value)}>
            <option value="">Sin jugador específico</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <label style={LABEL}>FECHA *</label>
          <input style={INPUT} type="date" value={form.transaction_date} onChange={e => set('transaction_date', e.target.value)} />
        </div>

        <div>
          <label style={LABEL}>CATEGORÍA</label>
          <select style={INPUT} value={form.subtype || ''} onChange={e => set('subtype', e.target.value)}>
            <option value="">Seleccionar categoría</option>
            {subtypes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label style={LABEL}>MONTO (USD) *</label>
          <input style={INPUT} type="number" step="0.01" value={form.amount || ''} onChange={e => set('amount', e.target.value)} placeholder="1500.00" />
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <label style={LABEL}>DESCRIPCIÓN</label>
          <textarea style={{ ...INPUT, resize: 'vertical', minHeight: 72 }}
            value={form.description || ''} onChange={e => set('description', e.target.value)}
            placeholder="Detalle de la transacción..." />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 20, alignItems: 'center' }}>
        <button className="btn-gold" onClick={handleSave} disabled={loading}>
          {loading ? 'GUARDANDO...' : isEdit ? 'GUARDAR CAMBIOS' : 'REGISTRAR TRANSACCIÓN'}
        </button>
        <button className="btn-ghost" onClick={onCancel}>CANCELAR</button>
        {msg && <span style={{ fontSize: 12, color: msg.startsWith('✓') ? '#4ade80' : '#f87171', marginLeft: 8 }}>{msg}</span>}
      </div>
    </div>
  )
}
