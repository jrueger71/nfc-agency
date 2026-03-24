import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Cumpleanos from '../components/Cumpleanos'
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
  const [players, setPlayers] = useState([])
  const [clubInfo, setClubInfo] = useState([])
  const [agencyContracts, setAgencyContracts] = useState([])
  const [finSummary, setFinSummary] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('players').select('id,name,rut,birth_date,height,weight,skill_foot,foto_url'),
      supabase.from('club_info').select('id,player_id,club_name,position,contract_active,contract_date,contract_duration_months,salary,commission_percentage,commission_fixed,transfermarkt_valuation,transfermarkt_profile').order('club_name'),
      supabase.from('agency_contracts').select('id,player_id,incorporation_date,contract_date,contract_duration_months,contract_active,contract_pdf_url').order('contract_date', { ascending:false }),
      supabase.from('player_financial_summary').select('player_id,player_name,total_income,total_expenses,balance').order('balance', { ascending:false }),
      supabase.from('transactions').select('id,player_id,transaction_date,type,subtype,description,amount,moneda').order('transaction_date', { ascending:false }).limit(8),
    ]).then(([p, ci, ac, fs, tx]) => {
      setPlayers(p.data || [])
      setClubInfo(ci.data || [])
      setAgencyContracts(ac.data || [])
      setFinSummary(fs.data || [])
      setTransactions(tx.data || [])
      setLoading(false)
    })
  }, [])

  const totalIncome = finSummary.reduce((a,r) => a+(parseFloat(r.total_income)||0), 0)
  const totalExpenses = finSummary.reduce((a,r) => a+(parseFloat(r.total_expenses)||0), 0)
  const totalBalance = finSummary.reduce((a,r) => a+(parseFloat(r.balance)||0), 0)
  const activeContracts = clubInfo.filter(c => c.contract_active).length

  const urgentContracts = agencyContracts.filter(c => {
    if (!c.contract_date || !c.contract_duration_months) return false
    const end = new Date(c.contract_date)
    end.setMonth(end.getMonth() + c.contract_duration_months)
    const days = (end - Date.now()) / (24*3600*1000)
    return days > 0 && days < 90
  })

  const txByMonth = {}
  transactions.forEach(t => {
    const m = t.transaction_date ? new Date(t.transaction_date).toLocaleDateString('es-CL',{month:'short'}) : '?'
    if (!txByMonth[m]) txByMonth[m] = { mes:m, ingresos:0, gastos:0 }
    if (t.type==='income') txByMonth[m].ingresos += parseFloat(t.amount)||0
    else txByMonth[m].gastos += parseFloat(t.amount)||0
  })
  const chartData = Object.values(txByMonth).slice(-6)
  const pieData = [{ name:'Ingresos', value:Math.round(totalIncome) }, { name:'Gastos', value:Math.round(totalExpenses) }]

  if (loading) return <div style={{ textAlign:'center', padding:60, fontFamily:'Bebas Neue', color:GOLD, letterSpacing:3, fontSize:20 }}>CARGANDO...</div>

  return (
    <div className="page">
      {urgentContracts.length > 0 && (
        <div style={{ background:'rgba(201,168,76,0.07)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:8, padding:'12px 16px', fontSize:14, color:GOLD, marginBottom:16 }}>
          ⚠ {urgentContracts.length} contrato(s) de agencia vencen en menos de 90 días
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div className="section-title" style={{ margin:0, flex:1 }}>PANEL ADMINISTRATIVO</div>
        <button className="btn-gold" onClick={() => navigate('/admin/jugadores')}>VER PLANTEL</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:10, marginBottom:20 }}>
        {[
          { l:'TOTAL JUGADORES', v:players.length, c:'#fff' },
          { l:'CON CONTRATO CLUB', v:activeContracts, c:'#fff' },
          { l:'INGRESOS', v:fmt$(totalIncome), c:'#4ade80' },
          { l:'GASTOS', v:fmt$(totalExpenses), c:'#f87171' },
          { l:'BALANCE NETO', v:fmt$(totalBalance), c:totalBalance>=0?'#4ade80':'#f87171' },
        ].map(m => (
          <div key={m.l} className="card" style={{ padding:16 }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginBottom:4, fontWeight:600, letterSpacing:1 }}>{m.l}</div>
            <div className="bebas" style={{ fontSize:28, color:m.c }}>{m.v}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom:20 }}>
        <div className="card">
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontWeight:600, letterSpacing:1.5, marginBottom:12 }}>TRANSACCIONES RECIENTES</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <XAxis dataKey="mes" tick={{ fill:'rgba(255,255,255,0.35)', fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:'rgba(255,255,255,0.35)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>'$'+Math.round(v/1000)+'K'}/>
              <Tooltip contentStyle={{ background:'#0f1a3a', border:'1px solid rgba(201,168,76,0.3)', borderRadius:6, fontSize:13 }} formatter={v=>fmt$(v)}/>
              <Bar dataKey="ingresos" fill={GOLD} radius={[3,3,0,0]}/>
              <Bar dataKey="gastos" fill="#1B2B5E" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontWeight:600, letterSpacing:1.5, marginBottom:12 }}>BALANCE GENERAL</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="value" paddingAngle={3}>
                {pieData.map((_,i) => <Cell key={i} fill={PIE_COLORS[i]}/>)}
              </Pie>
              <Tooltip contentStyle={{ background:'#0f1a3a', border:'1px solid rgba(201,168,76,0.3)', borderRadius:6, fontSize:13 }} formatter={v=>fmt$(v)}/>
              <Legend iconSize={10} iconType="square" wrapperStyle={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom:20 }}>
        <div className="card">
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontWeight:600, letterSpacing:1.5, marginBottom:12 }}>RESUMEN POR JUGADOR</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Jugador</th><th>Ingresos</th><th>Gastos</th><th>Balance</th></tr></thead>
              <tbody>
                {finSummary.slice(0,8).map(r => (
                  <tr key={r.player_id}>
                    <td style={{ color:'#fff', fontWeight:500 }}>{r.player_name||'—'}</td>
                    <td style={{ color:'#4ade80' }}>{fmt$(r.total_income)}</td>
                    <td style={{ color:'#f87171' }}>{fmt$(r.total_expenses)}</td>
                    <td style={{ color:r.balance>=0?'#4ade80':'#f87171', fontWeight:600 }}>{fmt$(r.balance)}</td>
                  </tr>
                ))}
                {!finSummary.length && <tr><td colSpan={4} style={{ textAlign:'center', color:'rgba(255,255,255,0.25)', padding:16 }}>Sin datos</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontWeight:600, letterSpacing:1.5, marginBottom:12 }}>ÚLTIMAS TRANSACCIONES</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Descripción</th><th>Monto</th></tr></thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id}>
                    <td style={{ whiteSpace:'nowrap' }}>{fmtDate(t.transaction_date)}</td>
                    <td style={{ maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.description||t.subtype||'—'}</td>
                    <td style={{ color:t.type==='income'?'#4ade80':'#f87171', fontWeight:600, whiteSpace:'nowrap' }}>
                      {t.type==='income'?'+':'−'}{fmt$(Math.abs(t.amount))}
                    </td>
                  </tr>
                ))}
                {!transactions.length && <tr><td colSpan={3} style={{ textAlign:'center', color:'rgba(255,255,255,0.25)', padding:16 }}>Sin transacciones</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="section-title">CONTRATOS CON CLUBES</div>
      <div className="card" style={{ marginBottom:16 }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Jugador</th><th>Club</th><th>Posición</th><th>Salario</th><th>Comisión</th><th>TM</th><th>Estado</th></tr></thead>
            <tbody>
              {clubInfo.map(c => {
                const p = players.find(x => x.id === c.player_id)
                return (
                  <tr key={c.id}>
                    <td style={{ color:'#fff', fontWeight:500 }}>{p?.name||'—'}</td>
                    <td>{c.club_name||'—'}</td>
                    <td>{c.position||'—'}</td>
                    <td>{fmt$(c.salary)}</td>
                    <td>{c.commission_percentage ? c.commission_percentage+'%' : fmt$(c.commission_fixed)}</td>
                    <td>{c.transfermarkt_valuation||'—'}</td>
                    <td><span className={`pill ${c.contract_active?'pill-ok':'pill-urg'}`}>{c.contract_active?'VIGENTE':'INACTIVO'}</span></td>
                  </tr>
                )
              })}
              {!clubInfo.length && <tr><td colSpan={7} style={{ textAlign:'center', color:'rgba(255,255,255,0.25)', padding:16 }}>Sin contratos</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-title">CONTRATOS CON AGENCIA</div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Jugador</th><th>Incorporación</th><th>Inicio</th><th>Duración</th><th>PDF</th><th>Estado</th></tr></thead>
            <tbody>
              {agencyContracts.map(c => {
                const p = players.find(x => x.id === c.player_id)
                const end = c.contract_date && c.contract_duration_months ? new Date(c.contract_date) : null
                if (end) end.setMonth(end.getMonth()+c.contract_duration_months)
                const days = end ? Math.floor((end-Date.now())/(24*3600*1000)) : null
                const pc = !end?'pill-warn':days>90?'pill-ok':days>0?'pill-warn':'pill-urg'
                const es = !end?'SIN FECHA':days>90?'VIGENTE':days>0?'POR VENCER':'VENCIDO'
                return (
                  <tr key={c.id}>
                    <td style={{ color:'#fff', fontWeight:500 }}>{p?.name||'—'}</td>
                    <td>{fmtDate(c.incorporation_date)}</td>
                    <td>{fmtDate(c.contract_date)}</td>
                    <td>{c.contract_duration_months ? c.contract_duration_months+' meses' : '—'}</td>
                    <td>{c.contract_pdf_url ? <a href={c.contract_pdf_url} target="_blank" rel="noreferrer" style={{ color:GOLD }}>Ver PDF</a> : '—'}</td>
                    <td><span className={`pill ${pc}`}>{es}</span></td>
                  </tr>
                )
              })}
              {!agencyContracts.length && <tr><td colSpan={6} style={{ textAlign:'center', color:'rgba(255,255,255,0.25)', padding:16 }}>Sin contratos</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Cumpleanos />
    </div>
  )
}
