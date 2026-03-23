import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

function fmt$(n) {
  if (!n && n !== 0) return '—'
  const v = parseFloat(n)
  if (Math.abs(v) >= 1000000) return '$' + (v/1000000).toFixed(1) + 'M'
  if (Math.abs(v) >= 1000) return '$' + (v/1000).toFixed(0) + 'K'
  return '$' + v.toFixed(0)
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' })
}

const GOLD = '#C9A84C'
const PIE_COLORS = ['#C9A84C','#1B2B5E','#243580','#7a6025','#e8c96a','#555']

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState({ players:[], clubInfo:[], agencyContracts:[], finSummary:[], transactions:[] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('players').select('id,name,rut,birth_date,position,height,weight,skill_foot'),
      supabase.from('club_info').select('*').order('club_name'),
      supabase.from('agency_contracts').select('*,players(name)').order('contract_date', { ascending:false }),
      supabase.from('player_financial_summary').select('*').order('balance', { ascending:false }),
      supabase.from('transactions').select('*,players(name)').order('transaction_date', { ascending:false }).limit(8),
    ]).then(([p, ci, ac, fs, tx]) => {
      setData({
        players: p.data||[], clubInfo: ci.data||[],
        agencyContracts: ac.data||[], finSummary: fs.data||[], transactions: tx.data||[]
      })
      setLoading(false)
    })
  }, [])

  const { players, clubInfo, agencyContracts, finSummary, transactions } = data
  const totalIncome = finSummary.reduce((a,r) => a + (parseFloat(r.total_income)||0), 0)
  const totalExpenses = finSummary.reduce((a,r) => a + (parseFloat(r.total_expenses)||0), 0)
  const totalBalance = finSummary.reduce((a,r) => a + (parseFloat(r.balance)||0), 0)
  const activeContracts = clubInfo.filter(c => c.contract_active).length

  const urgentContracts = agencyContracts.filter(c => {
    if (!c.contract_date || !c.contract_duration_months) return false
    const end = new Date(c.contract_date)
    end.setMonth(end.getMonth() + c.contract_duration_months)
    const days = (end - Date.now()) / (24*3600*1000)
    return days > 0 && days < 90
  })

  // Tx chart data by month
  const txByMonth = {}
  transactions.forEach(t => {
    const m = t.transaction_date ? new Date(t.transaction_date).toLocaleDateString('es-CL',{month:'short'}) : '?'
    if (!txByMonth[m]) txByMonth[m] = { mes:m, ingresos:0, gastos:0 }
    if (t.type === 'income') txByMonth[m].ingresos += parseFloat(t.amount)||0
    else txByMonth[m].gastos += parseFloat(t.amount)||0
  })
  const chartData = Object.values(txByMonth).slice(-6)

  const pieData = [
    { name:'Ingresos', value: Math.round(totalIncome) },
    { name:'Gastos', value: Math.round(totalExpenses) },
  ]

  if (loading) return <div style={{ textAlign:'center', padding:60, fontFamily:'Bebas Neue', color:GOLD, letterSpacing:3 }}>CARGANDO PANEL...</div>

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'20px 24px' }}>
      {/* Alert */}
      {urgentContracts.length > 0 && (
        <div style={{ background:'rgba(201,168,76,0.07)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:6, padding:'10px 14px', fontSize:12, color:GOLD, marginBottom:16 }}>
          ⚠ {urgentContracts.length} contrato(s) de agencia vencen en menos de 90 días
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:8 }}>
        <div className="section-title" style={{ margin:0, flex:1 }}>PANEL ADMINISTRATIVO</div>
        <div style={{ display:'flex', gap:6 }}>
          <button className="btn-gold" onClick={() => navigate('/admin/jugadores')}>VER PLANTEL</button>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px,1fr))', gap:10, marginBottom:20 }}>
        {[
          { l:'TOTAL JUGADORES', v: players.length },
          { l:'CON CONTRATO CLUB', v: activeContracts },
          { l:'INGRESOS TOTALES', v: fmt$(totalIncome) },
          { l:'GASTOS TOTALES', v: fmt$(totalExpenses) },
          { l:'BALANCE NETO', v: fmt$(totalBalance), color: totalBalance >= 0 ? '#4ade80' : '#f87171' },
        ].map(m => (
          <div key={m.l} className="card" style={{ padding:14 }}>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', marginBottom:3, fontWeight:600, letterSpacing:1 }}>{m.l}</div>
            <div className="bebas" style={{ fontSize:24, color: m.color || '#fff' }}>{m.v}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
        <div className="card">
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', fontWeight:600, letterSpacing:1.5, marginBottom:12 }}>TRANSACCIONES RECIENTES</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData}>
              <XAxis dataKey="mes" tick={{ fill:'rgba(255,255,255,0.35)', fontSize:9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'rgba(255,255,255,0.35)', fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={v=>'$'+Math.round(v/1000)+'K'} />
              <Tooltip contentStyle={{ background:'#0f1a3a', border:'1px solid rgba(201,168,76,0.3)', borderRadius:5, fontSize:11 }} formatter={v=>fmt$(v)} />
              <Bar dataKey="ingresos" fill={GOLD} radius={[3,3,0,0]} />
              <Bar dataKey="gastos" fill="#1B2B5E" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', fontWeight:600, letterSpacing:1.5, marginBottom:12 }}>BALANCE GENERAL</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background:'#0f1a3a', border:'1px solid rgba(201,168,76,0.3)', borderRadius:5, fontSize:11 }} formatter={v=>fmt$(v)} />
              <Legend iconSize={8} iconType="square" wrapperStyle={{ fontSize:11, color:'rgba(255,255,255,0.5)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Financial summary table */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
        <div className="card">
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', fontWeight:600, letterSpacing:1.5, marginBottom:10 }}>RESUMEN POR JUGADOR</div>
          <table>
            <thead><tr><th>Jugador</th><th>Ingresos</th><th>Gastos</th><th>Balance</th></tr></thead>
            <tbody>
              {finSummary.slice(0,8).map(r => (
                <tr key={r.player_id}>
                  <td style={{ color:'#fff' }}>{r.player_name || '—'}</td>
                  <td style={{ color:'#4ade80' }}>{fmt$(r.total_income)}</td>
                  <td style={{ color:'#f87171' }}>{fmt$(r.total_expenses)}</td>
                  <td style={{ color: r.balance>=0 ? '#4ade80':'#f87171', fontWeight:600 }}>{fmt$(r.balance)}</td>
                </tr>
              ))}
              {!finSummary.length && <tr><td colSpan={4} style={{ textAlign:'center', color:'rgba(255,255,255,0.25)', padding:12 }}>Sin datos financieros</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', fontWeight:600, letterSpacing:1.5, marginBottom:10 }}>ÚLTIMAS TRANSACCIONES</div>
          <table>
            <thead><tr><th>Fecha</th><th>Descripción</th><th>Monto</th></tr></thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id}>
                  <td>{fmtDate(t.transaction_date)}</td>
                  <td>{t.description || t.subtype || t.type || '—'}</td>
                  <td style={{ color: t.type==='income' ? '#4ade80':'#f87171', fontWeight:600 }}>
                    {t.type==='income' ? '+' : '−'}{fmt$(Math.abs(t.amount))}
                  </td>
                </tr>
              ))}
              {!transactions.length && <tr><td colSpan={3} style={{ textAlign:'center', color:'rgba(255,255,255,0.25)', padding:12 }}>Sin transacciones</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Club contracts */}
      <div className="section-title">CONTRATOS CON CLUBES</div>
      <div className="card" style={{ marginBottom:16, overflowX:'auto' }}>
        <table>
          <thead><tr><th>Jugador</th><th>Club</th><th>Posición</th><th>Salario</th><th>Comisión</th><th>Valor TM</th><th>Estado</th></tr></thead>
          <tbody>
            {clubInfo.map(c => {
              const p = players.find(x => x.id === c.player_id)
              return (
                <tr key={c.id}>
                  <td style={{ color:'#fff', fontWeight:500 }}>{p?.name || '—'}</td>
                  <td>{c.club_name || '—'}</td>
                  <td>{c.position || '—'}</td>
                  <td>{fmt$(c.salary)}</td>
                  <td>{c.commission_percentage ? c.commission_percentage+'%' : fmt$(c.commission_fixed)}</td>
                  <td>{c.transfermarkt_valuation || '—'}</td>
                  <td><span className={`pill ${c.contract_active ? 'pill-ok':'pill-urg'}`}>{c.contract_active ? 'VIGENTE':'INACTIVO'}</span></td>
                </tr>
              )
            })}
            {!clubInfo.length && <tr><td colSpan={7} style={{ textAlign:'center', color:'rgba(255,255,255,0.25)', padding:16 }}>Sin contratos</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Agency contracts */}
      <div className="section-title">CONTRATOS CON AGENCIA</div>
      <div className="card" style={{ overflowX:'auto' }}>
        <table>
          <thead><tr><th>Jugador</th><th>Incorporación</th><th>Inicio</th><th>Duración</th><th>PDF</th><th>Estado</th></tr></thead>
          <tbody>
            {agencyContracts.map(c => {
              const end = c.contract_date && c.contract_duration_months ? new Date(c.contract_date) : null
              if (end) end.setMonth(end.getMonth() + c.contract_duration_months)
              const days = end ? Math.floor((end - Date.now())/(24*3600*1000)) : null
              const pillClass = !end ? 'pill-warn' : days > 90 ? 'pill-ok' : days > 0 ? 'pill-warn' : 'pill-urg'
              const estado = !end ? 'SIN FECHA' : days > 90 ? 'VIGENTE' : days > 0 ? 'POR VENCER' : 'VENCIDO'
              return (
                <tr key={c.id}>
                  <td style={{ color:'#fff', fontWeight:500 }}>{c.players?.name || '—'}</td>
                  <td>{fmtDate(c.incorporation_date)}</td>
                  <td>{fmtDate(c.contract_date)}</td>
                  <td>{c.contract_duration_months ? c.contract_duration_months+' meses' : '—'}</td>
                  <td>{c.contract_pdf_url ? <a href={c.contract_pdf_url} target="_blank" rel="noreferrer" style={{ color:GOLD, fontSize:10 }}>Ver PDF</a> : '—'}</td>
                  <td><span className={`pill ${pillClass}`}>{estado}</span></td>
                </tr>
              )
            })}
            {!agencyContracts.length && <tr><td colSpan={6} style={{ textAlign:'center', color:'rgba(255,255,255,0.25)', padding:16 }}>Sin contratos de agencia</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
