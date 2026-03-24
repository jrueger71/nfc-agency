import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const INPUT = {
  width:'100%', background:'rgba(255,255,255,0.06)',
  border:'1px solid rgba(201,168,76,0.2)', borderRadius:5,
  padding:'9px 12px', fontSize:13, color:'#fff',
  fontFamily:'inherit', outline:'none'
}
const LABEL = {
  fontSize:10, color:'rgba(255,255,255,0.45)',
  letterSpacing:1, display:'block', marginBottom:4, fontWeight:600
}

const INCOME_TYPES = [
  'Comisión Sueldo',
  'Comisión Traspaso',
  'Comisión Imagen / Marketing',
  'Comisión Otros',
]
const EXPENSE_TYPES = [
  'Implementación Deportiva (Zapatos)',
  'Implementación Deportiva (Guantes)',
  'Implementación Deportiva (Equipamiento)',
  'Apoyo económico directo',
  'Vestuario / Indumentaria',
  'Accesorios deportivos',
  'Alimentación',
  'Gimnasio / Preparación física',
  'Arriendo / Alojamiento',
  'Traslados / Transporte',
  'Gestión legal',
  'Gestión comercial (Auspicio en especie)',
  'Pérdida patrimonial',
  'Gastos administrativos',
  'Mantención',
  'Otros',
]

export default function TransactionForm({ transaction, onSave, onCancel }) {
  const isEdit = !!transaction?.id
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const [form, setForm] = useState({
    player_id: '',
    type: 'income',
    subtype: '',
    description: '',
    amount: '',
    moneda: 'CLP',
    transaction_date: new Date().toISOString().split('T')[0],
    documento_respaldo: '',
    ...transaction,
  })
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    supabase.from('players').select('id,name').order('name').then(({ data }) => setPlayers(data || []))
  }, [])

  const handleSave = async () => {
    if (!form.amount || !form.transaction_date || !form.subtype) {
      setMsg('Completa fecha, categoría y monto')
      return
    }
    setLoading(true); setMsg('')
    const payload = {
      player_id: form.player_id || null,
      type: form.type,
      subtype: form.subtype,
      description: form.description || null,
      amount: parseFloat(form.amount),
      moneda: form.moneda || 'CLP',
      transaction_date: form.transaction_date,
      documento_respaldo: form.documento_respaldo || null,
    }
    let error
    if (isEdit) {
      ;({ error } = await supabase.from('transactions').update(payload).eq('id', form.id))
    } else {
      ;({ error } = await supabase.from('transactions').insert(payload))
    }
    setLoading(false)
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg(isEdit ? '✓ Transacción actualizada' : '✓ Transacción registrada')
    setTimeout(() => onSave?.(), 1200)
  }

  const subtypes = form.type === 'income' ? INCOME_TYPES : EXPENSE_TYPES

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <div className="bebas" style={{ fontSize: 16, letterSpacing: 2, marginBottom: 20, color: '#C9A84C' }}>
        {isEdit ? 'EDITAR TRANSACCIÓN' : 'NUEVA TRANSACCIÓN'}
      </div>

      {/* Tipo toggle */}
      <div style={{ marginBottom: 14 }}>
        <label style={LABEL}>TIPO</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['income','INGRESO','#4ade80'],['expense','GASTO','#f87171']].map(([val,lbl,col]) => (
            <button key={val} onClick={() => { setF('type', val); setF('subtype', '') }} style={{
              flex:1, padding:'9px', fontSize:12, fontWeight:600, letterSpacing:1,
              borderRadius:5, cursor:'pointer', fontFamily:'Bebas Neue', transition:'all .15s',
              background: form.type===val ? `rgba(${val==='income'?'74,222,128':'248,113,113'},0.15)` : 'rgba(255,255,255,0.04)',
              color: form.type===val ? col : 'rgba(255,255,255,0.4)',
              border: form.type===val ? `1px solid ${col}` : '1px solid rgba(255,255,255,0.08)',
            }}>{lbl}</button>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <label style={LABEL}>JUGADOR (opcional)</label>
          <select style={INPUT} value={form.player_id||''} onChange={e=>setF('player_id',e.target.value)}>
            <option value="">Sin jugador específico</option>
            {players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label style={LABEL}>FECHA *</label>
          <input style={INPUT} type="date" value={form.transaction_date} onChange={e=>setF('transaction_date',e.target.value)}/>
        </div>
        <div>
          <label style={LABEL}>CATEGORÍA *</label>
          <select style={INPUT} value={form.subtype||''} onChange={e=>setF('subtype',e.target.value)}>
            <option value="">Seleccionar categoría</option>
            {subtypes.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={LABEL}>MONEDA</label>
          <select style={INPUT} value={form.moneda||'CLP'} onChange={e=>setF('moneda',e.target.value)}>
            <option value="CLP">$ CLP — Peso chileno</option>
            <option value="USD">USD — Dólar</option>
          </select>
        </div>
        <div>
          <label style={LABEL}>MONTO * ({form.moneda||'CLP'})</label>
          <input style={INPUT} type="number" step="1" value={form.amount||''} onChange={e=>setF('amount',e.target.value)}
            placeholder={form.moneda==='USD'?'1500':'150000'}/>
        </div>
        <div>
          <label style={LABEL}>N° DOCUMENTO (Boleta/Factura)</label>
          <input style={INPUT} value={form.documento_respaldo||''} onChange={e=>setF('documento_respaldo',e.target.value)}
            placeholder="Boleta 1234, Factura 567"/>
        </div>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={LABEL}>DESCRIPCIÓN</label>
          <textarea style={{ ...INPUT, resize:'vertical', minHeight:72 }}
            value={form.description||''} onChange={e=>setF('description',e.target.value)}
            placeholder="Detalle de la transacción..."/>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, marginTop:16, alignItems:'center' }}>
        <button className="btn-gold" onClick={handleSave} disabled={loading}>
          {loading ? 'GUARDANDO...' : isEdit ? 'GUARDAR CAMBIOS' : 'REGISTRAR'}
        </button>
        <button className="btn-ghost" onClick={onCancel}>CANCELAR</button>
        {msg && <span style={{ fontSize:12, color:msg.startsWith('✓')?'#4ade80':'#f87171' }}>{msg}</span>}
      </div>
    </div>
  )
}
