import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const GOLD = '#C9A84C'
const NAVY2 = '#0f1a3a'

const INPUT = {
  width:'100%', background:'rgba(255,255,255,0.06)',
  border:'1px solid rgba(201,168,76,0.2)', borderRadius:6,
  padding:'10px 14px', fontSize:14, color:'#fff',
  fontFamily:'inherit', outline:'none',
}
const LABEL = {
  fontSize:10, color:'rgba(255,255,255,0.45)',
  letterSpacing:1, display:'block', marginBottom:4, fontWeight:600,
}

const INCOME_CATS = [
  'Comisión Sueldo',
  'Comisión Traspaso',
  'Comisión Imagen / Marketing',
  'Comisión Otros',
]
const EXPENSE_CATS = [
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
const ANEXO_CATS = [
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
]

function fmt$(n, moneda) {
  if (!n && n !== 0) return '—'
  const v = parseFloat(n)
  const isCLP = !moneda || moneda === 'CLP'
  if (isCLP) {
    if (Math.abs(v) >= 1000000) return '$ ' + (v/1000000).toFixed(2) + 'M CLP'
    return '$ ' + Math.round(v).toLocaleString('es-CL') + ' CLP'
  }
  if (Math.abs(v) >= 1000000) return 'USD ' + (v/1000000).toFixed(1) + 'M'
  if (Math.abs(v) >= 1000) return 'USD ' + (v/1000).toFixed(0) + 'K'
  return 'USD ' + v.toFixed(0)
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' })
}

export default function Finanzas() {
  const { userRole } = useAuth()
  const isAdmin = userRole === 'admin'
  const [players, setPlayers] = useState([])
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState([])
  const [tab, setTab] = useState('resumen')
  const [filterPlayer, setFilterPlayer] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterMoneda, setFilterMoneda] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [anexoPlayer, setAnexoPlayer] = useState('')
  const [anexoData, setAnexoData] = useState([])

  const [form, setForm] = useState({
    player_id:'', type:'income', subtype:'',
    description:'', amount:'', moneda:'CLP',
    transaction_date: new Date().toISOString().split('T')[0],
    documento_respaldo:'',
  })
  const setF = (k,v) => setForm(f => ({...f,[k]:v}))

  const load = async () => {
    setLoading(true)
    const [p, tx, sm] = await Promise.all([
      supabase.from('players').select('id,name').order('name'),
      supabase.from('transactions').select('*,players(name)').order('transaction_date', {ascending:false}),
      supabase.from('player_financial_summary').select('*').order('balance', {ascending:false}),
    ])
    setPlayers(p.data||[])
    setTransactions(tx.data||[])
    setSummary(sm.data||[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!anexoPlayer) { setAnexoData([]); return }
    setAnexoData(transactions.filter(t => t.player_id===anexoPlayer && t.type==='expense' && ANEXO_CATS.includes(t.subtype)))
  }, [anexoPlayer, transactions])

  const totalIncome = transactions.filter(t=>t.type==='income').reduce((a,t)=>a+(parseFloat(t.amount)||0),0)
  const totalExpense = transactions.filter(t=>t.type==='expense').reduce((a,t)=>a+(parseFloat(t.amount)||0),0)
  const balance = totalIncome - totalExpense

  const filtered = transactions.filter(t => {
    if (filterPlayer && t.player_id!==filterPlayer) return false
    if (filterType && t.type!==filterType) return false
    if (filterMoneda && (t.moneda||'CLP')!==filterMoneda) return false
    return true
  })

  const handleSave = async () => {
    if (!form.amount || !form.transaction_date || !form.subtype) { setMsg('Completa fecha, categoría y monto'); return }
    setSaving(true); setMsg('')
    const { error } = await supabase.from('transactions').insert({
      player_id: form.player_id||null,
      type: form.type,
      subtype: form.subtype,
      description: form.description||null,
      amount: parseFloat(form.amount),
      transaction_date: form.transaction_date,
      moneda: form.moneda,
      documento_respaldo: form.documento_respaldo||null,
    })
    setSaving(false)
    if (error) { setMsg('Error: '+error.message); return }
    setMsg('✓ Transacción registrada')
    setForm({ player_id:'', type:'income', subtype:'', description:'', amount:'', moneda:'CLP', transaction_date:new Date().toISOString().split('T')[0], documento_respaldo:'' })
    load()
    setTimeout(()=>setMsg(''),3000)
  }

  const handleDelete = async (id) => {
    await supabase.from('transactions').delete().eq('id', id)
    setDeleteConfirm(null)
    load()
  }

  const TAB = (t) => ({
    padding:'7px 16px', fontSize:11, fontWeight:600, letterSpacing:.5,
    borderRadius:3, cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
    background: tab===t ? GOLD : 'transparent',
    color: tab===t ? NAVY2 : 'rgba(255,255,255,0.45)',
    border: tab===t ? `1px solid ${GOLD}` : '1px solid rgba(201,168,76,0.2)',
  })

  const cats = form.type==='income' ? INCOME_CATS : EXPENSE_CATS

  if (loading) return <div style={{textAlign:'center',padding:60,fontFamily:'Bebas Neue',color:GOLD,letterSpacing:3,fontSize:20}}>CARGANDO...</div>

  return (
    <div className="page">
      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div onClick={()=>setDeleteConfirm(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div onClick={e=>e.stopPropagation()} className="card" style={{maxWidth:400,width:'100%',padding:28,textAlign:'center'}}>
            <div style={{fontSize:20,marginBottom:12}}>⚠</div>
            <div className="bebas" style={{fontSize:18,color:'#f87171',letterSpacing:1,marginBottom:8}}>ELIMINAR TRANSACCIÓN</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginBottom:8}}>
              {deleteConfirm.subtype} — {fmtDate(deleteConfirm.transaction_date)}
            </div>
            <div style={{fontSize:14,color:deleteConfirm.type==='income'?'#4ade80':'#f87171',fontWeight:600,marginBottom:20}}>
              {deleteConfirm.type==='income'?'+':'−'}{fmt$(Math.abs(deleteConfirm.amount), deleteConfirm.moneda)}
            </div>
            <p style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginBottom:24}}>Esta acción no se puede deshacer.</p>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <button onClick={()=>handleDelete(deleteConfirm.id)} style={{background:'#f87171',color:'#fff',border:'none',borderRadius:5,padding:'9px 20px',fontFamily:'Bebas Neue',fontSize:14,letterSpacing:1,cursor:'pointer'}}>SÍ, ELIMINAR</button>
              <button className="btn-ghost" onClick={()=>setDeleteConfirm(null)}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8}}>
        <div className="section-title" style={{margin:0,flex:1}}>GESTIÓN DE FINANZAS</div>
      </div>

      {/* Metric cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10,marginBottom:20}}>
        <div className="card" style={{padding:14}}>
          <div style={{fontSize:9,color:'rgba(255,255,255,0.35)',marginBottom:3,fontWeight:600,letterSpacing:1}}>INGRESOS TOTALES</div>
          <div className="bebas" style={{fontSize:26,color:'#4ade80'}}>{fmt$(totalIncome,'CLP')}</div>
        </div>
        <div className="card" style={{padding:14}}>
          <div style={{fontSize:9,color:'rgba(255,255,255,0.35)',marginBottom:3,fontWeight:600,letterSpacing:1}}>GASTOS TOTALES</div>
          <div className="bebas" style={{fontSize:26,color:'#f87171'}}>{fmt$(totalExpense,'CLP')}</div>
        </div>
        <div className="card" style={{padding:14}}>
          <div style={{fontSize:9,color:'rgba(255,255,255,0.35)',marginBottom:3,fontWeight:600,letterSpacing:1}}>BALANCE NETO</div>
          <div className="bebas" style={{fontSize:26,color:balance>=0?'#4ade80':'#f87171'}}>{fmt$(balance,'CLP')}</div>
        </div>
        <div className="card" style={{padding:14}}>
          <div style={{fontSize:9,color:'rgba(255,255,255,0.35)',marginBottom:3,fontWeight:600,letterSpacing:1}}>TRANSACCIONES</div>
          <div className="bebas" style={{fontSize:26,color:'#fff'}}>{transactions.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap'}}>
        <button style={TAB('resumen')} onClick={()=>setTab('resumen')}>Resumen por jugador</button>
        <button style={TAB('nueva')} onClick={()=>setTab('nueva')}>+ Nueva transacción</button>
        <button style={TAB('historial')} onClick={()=>setTab('historial')}>Historial ({transactions.length})</button>
        <button style={TAB('anexo')} onClick={()=>setTab('anexo')}>Anexo A</button>
      </div>

      {/* RESUMEN */}
      {tab==='resumen' && (
        <div className="card" style={{overflowX:'auto'}}>
          <table>
            <thead><tr><th>Jugador</th><th>Ingresos</th><th>Gastos</th><th>Balance</th></tr></thead>
            <tbody>
              {summary.map(r=>(
                <tr key={r.player_id}>
                  <td style={{color:'#fff',fontWeight:500}}>{r.player_name||'—'}</td>
                  <td style={{color:'#4ade80'}}>{fmt$(r.total_income,'CLP')}</td>
                  <td style={{color:'#f87171'}}>{fmt$(r.total_expenses,'CLP')}</td>
                  <td style={{color:r.balance>=0?'#4ade80':'#f87171',fontWeight:600}}>{fmt$(r.balance,'CLP')}</td>
                </tr>
              ))}
              {!summary.length && <tr><td colSpan={4} style={{textAlign:'center',color:'rgba(255,255,255,0.25)',padding:24}}>Sin datos financieros</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* NUEVA TRANSACCIÓN */}
      {tab==='nueva' && (
        <div className="card" style={{maxWidth:680}}>
          <div className="bebas" style={{fontSize:15,letterSpacing:2,color:GOLD,marginBottom:20}}>REGISTRAR TRANSACCIÓN</div>
          <div style={{marginBottom:16}}>
            <label style={LABEL}>TIPO</label>
            <div style={{display:'flex',gap:8}}>
              {[['income','INGRESO','#4ade80'],['expense','GASTO','#f87171']].map(([val,lbl,col])=>(
                <button key={val} onClick={()=>{setF('type',val);setF('subtype','')}} style={{
                  flex:1,padding:10,fontSize:13,fontWeight:600,letterSpacing:1,
                  borderRadius:5,cursor:'pointer',fontFamily:'Bebas Neue',transition:'all .15s',
                  background:form.type===val?`rgba(${val==='income'?'74,222,128':'248,113,113'},0.15)`:'rgba(255,255,255,0.04)',
                  color:form.type===val?col:'rgba(255,255,255,0.4)',
                  border:form.type===val?`1px solid ${col}`:'1px solid rgba(255,255,255,0.08)',
                }}>{lbl}</button>
              ))}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div>
              <label style={LABEL}>JUGADOR</label>
              <select style={INPUT} value={form.player_id} onChange={e=>setF('player_id',e.target.value)}>
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
              <select style={INPUT} value={form.subtype} onChange={e=>setF('subtype',e.target.value)}>
                <option value="">Seleccionar categoría</option>
                {cats.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL}>MONEDA</label>
              <select style={INPUT} value={form.moneda} onChange={e=>setF('moneda',e.target.value)}>
                <option value="CLP">$ CLP — Peso chileno</option>
                <option value="USD">USD — Dólar</option>
              </select>
            </div>
            <div>
              <label style={LABEL}>MONTO * ({form.moneda})</label>
              <input style={INPUT} type="number" step="1" value={form.amount} onChange={e=>setF('amount',e.target.value)}
                placeholder={form.moneda==='CLP'?'150.000':'1500'}/>
            </div>
            <div>
              <label style={LABEL}>N° DOCUMENTO (Boleta/Factura)</label>
              <input style={INPUT} value={form.documento_respaldo} onChange={e=>setF('documento_respaldo',e.target.value)}
                placeholder="Ej: Boleta 1234, Factura 567"/>
            </div>
            <div style={{gridColumn:'1/-1'}}>
              <label style={LABEL}>DESCRIPCIÓN</label>
              <textarea style={{...INPUT,resize:'vertical',minHeight:72}}
                value={form.description} onChange={e=>setF('description',e.target.value)}
                placeholder="Detalle de la transacción..."/>
            </div>
          </div>
          <div style={{display:'flex',gap:8,marginTop:20,alignItems:'center'}}>
            <button className="btn-gold" onClick={handleSave} disabled={saving} style={{fontSize:14}}>
              {saving?'REGISTRANDO...':'REGISTRAR TRANSACCIÓN'}
            </button>
            {msg && <span style={{fontSize:12,color:msg.startsWith('✓')?'#4ade80':'#f87171'}}>{msg}</span>}
          </div>
        </div>
      )}

      {/* HISTORIAL */}
      {tab==='historial' && (
        <>
          <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
            <select value={filterPlayer} onChange={e=>setFilterPlayer(e.target.value)}
              style={{...INPUT,width:'auto',padding:'6px 10px',fontSize:12}}>
              <option value="">Todos los jugadores</option>
              {players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={filterType} onChange={e=>setFilterType(e.target.value)}
              style={{...INPUT,width:'auto',padding:'6px 10px',fontSize:12}}>
              <option value="">Ingreso y Gasto</option>
              <option value="income">Solo Ingresos</option>
              <option value="expense">Solo Gastos</option>
            </select>
            <select value={filterMoneda} onChange={e=>setFilterMoneda(e.target.value)}
              style={{...INPUT,width:'auto',padding:'6px 10px',fontSize:12}}>
              <option value="">Todas las monedas</option>
              <option value="CLP">CLP</option>
              <option value="USD">USD</option>
            </select>
            {(filterPlayer||filterType||filterMoneda) && (
              <button onClick={()=>{setFilterPlayer('');setFilterType('');setFilterMoneda('')}}
                style={{fontSize:11,color:GOLD,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                ✕ Limpiar
              </button>
            )}
          </div>
          <div className="card" style={{overflowX:'auto'}}>
            <table>
              <thead>
                <tr><th>Fecha</th><th>Jugador</th><th>Tipo</th><th>Categoría</th><th>Documento</th><th>Descripción</th><th>Moneda</th><th>Monto</th>{isAdmin&&<th>Acción</th>}</tr>
              </thead>
              <tbody>
                {filtered.map(t=>(
                  <tr key={t.id}>
                    <td style={{whiteSpace:'nowrap'}}>{fmtDate(t.transaction_date)}</td>
                    <td>{t.players?.name||'—'}</td>
                    <td><span className={`pill ${t.type==='income'?'pill-ok':'pill-urg'}`}>{t.type==='income'?'INGRESO':'GASTO'}</span></td>
                    <td style={{whiteSpace:'nowrap'}}>{t.subtype||'—'}</td>
                    <td style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{t.documento_respaldo||'—'}</td>
                    <td style={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'rgba(255,255,255,0.5)'}}>{t.description||'—'}</td>
                    <td style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{t.moneda||'CLP'}</td>
                    <td style={{color:t.type==='income'?'#4ade80':'#f87171',fontWeight:600,whiteSpace:'nowrap'}}>
                      {t.type==='income'?'+':'−'}{fmt$(Math.abs(t.amount),t.moneda||'CLP')}
                    </td>
                    {isAdmin && (
                      <td>
                        <button onClick={()=>setDeleteConfirm(t)}
                          style={{fontSize:11,color:'#f87171',background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:4,padding:'3px 8px',cursor:'pointer',fontFamily:'inherit'}}>
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={isAdmin?9:8} style={{textAlign:'center',color:'rgba(255,255,255,0.25)',padding:24}}>Sin transacciones</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ANEXO A */}
      {tab==='anexo' && (
        <>
          <div style={{marginBottom:16}}>
            <label style={{...LABEL,fontSize:11}}>SELECCIONAR JUGADOR</label>
            <select value={anexoPlayer} onChange={e=>setAnexoPlayer(e.target.value)}
              style={{...INPUT,maxWidth:340}}>
              <option value="">Seleccionar jugador...</option>
              {players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {anexoPlayer && (
            <>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:8,marginBottom:16}}>
                {ANEXO_CATS.map(cat=>{
                  const items=anexoData.filter(t=>t.subtype===cat)
                  const total=items.reduce((a,t)=>a+(parseFloat(t.amount)||0),0)
                  if(!total) return null
                  return (
                    <div key={cat} className="card" style={{padding:12}}>
                      <div style={{fontSize:9,color:'rgba(255,255,255,0.35)',fontWeight:600,letterSpacing:.5,marginBottom:4,lineHeight:1.4}}>{cat.toUpperCase()}</div>
                      <div className="bebas" style={{fontSize:20,color:'#f87171'}}>{fmt$(total,'CLP')}</div>
                    </div>
                  )
                })}
              </div>
              <div className="card" style={{padding:14,marginBottom:16,borderColor:'rgba(201,168,76,0.4)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div className="bebas" style={{fontSize:14,letterSpacing:2,color:GOLD}}>TOTAL INVERSIÓN (ANEXO A)</div>
                  <div className="bebas" style={{fontSize:28,color:GOLD}}>{fmt$(anexoData.reduce((a,t)=>a+(parseFloat(t.amount)||0),0),'CLP')}</div>
                </div>
              </div>
              <div className="card" style={{overflowX:'auto'}}>
                <table>
                  <thead><tr><th>Fecha</th><th>Concepto</th><th>Documento</th><th>Descripción</th><th>Moneda</th><th>Monto</th></tr></thead>
                  <tbody>
                    {anexoData.map(t=>(
                      <tr key={t.id}>
                        <td style={{whiteSpace:'nowrap'}}>{fmtDate(t.transaction_date)}</td>
                        <td style={{whiteSpace:'nowrap'}}>{t.subtype}</td>
                        <td style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{t.documento_respaldo||'—'}</td>
                        <td style={{color:'rgba(255,255,255,0.5)',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.description||'—'}</td>
                        <td style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{t.moneda||'CLP'}</td>
                        <td style={{color:'#f87171',fontWeight:600}}>{fmt$(t.amount,t.moneda||'CLP')}</td>
                      </tr>
                    ))}
                    {!anexoData.length && <tr><td colSpan={6} style={{textAlign:'center',color:'rgba(255,255,255,0.25)',padding:24}}>Sin registros de inversión</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
// v2
