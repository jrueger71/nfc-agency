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
  const fecha = new Date(d.includes('T') ? d : d + 'T12:00:00')
  return fecha.toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' })
}
const GOLD = '#C9A84C'
const PIE_COLORS = ['#C9A84C','#1B2B5E','#243580','#7a6025','#e8c96a','#555']
const ROL_COLORS = { admin:'#f87171', agente:'#C9A84C', socio:'#60a5fa', digitador:'#34d399', visor:'#94a3b8' }
const MARCAS_LABEL = { adidas:'Adidas', nike:'Nike', skechers:'Skechers', skechers_w:'Skechers (M)' }

function calcularProgreso(clausula, stats) {
  const statsAplican = stats.filter(s => {
    if (clausula.competencia_aplica !== 'Todas' && s.competencia !== clausula.competencia_aplica) return false
    if (clausula.tipo === 'partidos' && s.minutos < (clausula.minutos_minimos || 0)) return false
    return true
  })
  let valor = 0
  if (clausula.tipo === 'partidos') valor = statsAplican.length
  else if (clausula.tipo === 'minutos') valor = statsAplican.reduce((a, s) => a + (s.minutos || 0), 0)
  else if (clausula.tipo === 'goles') valor = statsAplican.reduce((a, s) => a + (s.goles || 0), 0)
  else if (clausula.tipo === 'asistencias') valor = statsAplican.reduce((a, s) => a + (s.asistencias || 0), 0)
  return { valor, porcentaje: Math.min((valor / clausula.umbral) * 100, 100) }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [players, setPlayers] = useState([])
  const [clubInfo, setClubInfo] = useState([])
  const [agencyContracts, setAgencyContracts] = useState([])
  const [finSummary, setFinSummary] = useState([])
  const [transactions, setTransactions] = useState([])
  const [shoeOrders, setShoeOrders] = useState([])
  const [clauses, setClauses] = useState([])
  const [allStats, setAllStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [shoeAnio, setShoeAnio] = useState(new Date().getFullYear())

  useEffect(() => {
    Promise.all([
      supabase.from('players').select('id,name,rut,birth_date,height,weight,skill_foot,foto_url'),
      supabase.from('club_info').select('id,player_id,club_name,position,contract_active,contract_date,contract_duration_months,salary,commission_percentage,commission_fixed,transfermarkt_valuation,transfermarkt_profile').order('club_name'),
      supabase.from('agency_contracts').select('id,player_id,incorporation_date,contract_date,contract_duration_months,contract_active,contract_pdf_url').order('contract_date', { ascending:false }),
      supabase.from('player_financial_summary').select('player_id,player_name,total_income,total_expenses,balance').order('balance', { ascending:false }),
      supabase.from('transactions').select('id,player_id,transaction_date,type,subtype,description,amount,moneda').order('transaction_date', { ascending:false }).limit(8),
      supabase.from('shoe_orders').select('*').order('fecha_pedido', { ascending:false }),
      supabase.from('player_clauses').select('*').eq('estado', 'pendiente'),
      supabase.from('player_stats').select('*'),
    ]).then(([p, ci, ac, fs, tx, so, cl, ps]) => {
      setPlayers(p.data || [])
      setClubInfo(ci.data || [])
      setAgencyContracts(ac.data || [])
      setFinSummary(fs.data || [])
      setTransactions(tx.data || [])
      setShoeOrders(so.data || [])
      setClauses(cl.data || [])
      setAllStats(ps.data || [])
      setLoading(false)
    })
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('user_roles').select('role').eq('user_id', user.id).single()
        .then(({ data }) => setUserRole(data?.role || null))
    })
  }, [])

  useEffect(() => {
    if (userRole === 'admin') {
      supabase.from('user_roles').select('*').order('created_at', { ascending:false })
        .then(({ data }) => setUsuarios(data || []))
    }
  }, [userRole])

  const totalIncome = finSummary.reduce((a,r) => a+(parseFloat(r.total_income)||0), 0)
  const totalExpenses = finSummary.reduce((a,r) => a+(parseFloat(r.total_expenses)||0), 0)
  const totalBalance = finSummary.reduce((a,r) => a+(parseFloat(r.balance)||0), 0)
  const activeContracts = clubInfo.filter(c => c.contract_active).length

  const urgentContracts = agencyContracts.filter(c => {
    if (!c.contract_date || !c.contract_duration_months) return false
    const end = new Date(c.contract_date)
    end.setMonth(end.getMonth() + c.contract_duration_months)
    return (end - Date.now()) / (24*3600*1000) < 90 && (end - Date.now()) > 0
  })

  // ── Alertas cláusulas: pendientes con progreso ≥ 75% ─────────────────────
  const playerMap = {}
  players.forEach(p => { playerMap[p.id] = p })

  const clauseAlerts = clauses.map(c => {
    const statsJugador = allStats.filter(s => s.player_id === c.player_id)
    const { valor, porcentaje } = calcularProgreso(c, statsJugador)
    return { ...c, valor, porcentaje }
  }).filter(c => c.porcentaje >= 75).sort((a, b) => b.porcentaje - a.porcentaje)

  const clausesActivadas = clauses.filter(c => {
    const statsJugador = allStats.filter(s => s.player_id === c.player_id)
    const { porcentaje } = calcularProgreso(c, statsJugador)
    return porcentaje >= 100
  })

  // ── Alertas zapatos ───────────────────────────────────────────────────────
  const lastDeliveredByPlayer = {}
  shoeOrders.filter(o => o.estado === 'entregado' && o.fecha_entrega).forEach(o => {
    const prev = lastDeliveredByPlayer[o.player_id]
    if (!prev || new Date(o.fecha_entrega) > new Date(prev.fecha_entrega)) {
      lastDeliveredByPlayer[o.player_id] = o
    }
  })
  const paresEntregadosByPlayer = {}
  shoeOrders.filter(o => o.estado === 'entregado' && o.fecha_entrega).forEach(o => {
    const last = lastDeliveredByPlayer[o.player_id]
    if (last && o.group_id === last.group_id) {
      if (!paresEntregadosByPlayer[o.player_id]) paresEntregadosByPlayer[o.player_id] = { pares: 0, fecha: last.fecha_entrega }
      paresEntregadosByPlayer[o.player_id].pares += o.pares || 0
    }
  })
  const shoeAlerts = Object.entries(paresEntregadosByPlayer).map(([pid, info]) => {
    const agotamiento = new Date(info.fecha)
    agotamiento.setMonth(agotamiento.getMonth() + (info.pares * 2))
    return { player_id: pid, dias: Math.floor((agotamiento - Date.now()) / (24*3600*1000)) }
  }).filter(a => a.dias <= 30).sort((a, b) => a.dias - b.dias)

  // ── Resumen anual botines ─────────────────────────────────────────────────
  const ordersAnio = shoeOrders.filter(o =>
    o.estado === 'entregado' && o.fecha_entrega &&
    new Date(o.fecha_entrega).getFullYear() === shoeAnio
  )
  const shoeResumenByPlayer = {}
  ordersAnio.forEach(o => {
    if (!shoeResumenByPlayer[o.player_id]) shoeResumenByPlayer[o.player_id] = { elite: 0, pro: 0, entregas: [] }
    const r = shoeResumenByPlayer[o.player_id]
    if (o.categoria === 'Elite') r.elite += o.pares || 0
    else r.pro += o.pares || 0
    r.entregas.push({ fecha: o.fecha_entrega, pares: o.pares, categoria: o.categoria, marca: o.marca, modelo: o.modelo, suela: o.suela })
  })
  const aniosDisponibles = [...new Set(shoeOrders.filter(o => o.fecha_entrega).map(o => new Date(o.fecha_entrega).getFullYear()))].sort((a,b) => b-a)
  if (!aniosDisponibles.includes(new Date().getFullYear())) aniosDisponibles.unshift(new Date().getFullYear())

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

      {/* Alerta contratos */}
      {urgentContracts.length > 0 && (
        <div style={{ background:'rgba(201,168,76,0.07)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:8, padding:'12px 16px', fontSize:14, color:GOLD, marginBottom:16 }}>
          ⚠ {urgentContracts.length} contrato(s) de agencia vencen en menos de 90 días
        </div>
      )}

      {/* ── Alerta cláusulas ────────────────────────────────────────────────── */}
      {clauseAlerts.length > 0 && (
        <div style={{ background:'rgba(52,211,153,0.06)', border:'1px solid rgba(52,211,153,0.25)', borderRadius:8, padding:'12px 16px', marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'#34d399', letterSpacing:1, marginBottom:10 }}>
            📋 CLÁUSULAS DE RENDIMIENTO — {clausesActivadas.length > 0 ? `${clausesActivadas.length} activada(s)` : `${clauseAlerts.length} próxima(s) a activarse`}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {clauseAlerts.map(c => {
              const p = playerMap[c.player_id]
              const activada = c.porcentaje >= 100
              return (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
                  padding:'8px 12px', borderRadius:6,
                  background: activada ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${activada ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                  <span style={{ fontSize:16 }}>{activada ? '🟢' : '🟡'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:'#fff', fontWeight:600 }}>
                      {p?.name || '—'} — {c.descripcion}
                    </div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:2 }}>
                      {c.valor} / {c.umbral} {c.tipo} · {c.competencia_aplica}
                      {c.monto_activacion && <span style={{ color:GOLD, marginLeft:8 }}>→ {fmt$(c.monto_activacion)}</span>}
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:120 }}>
                    <div style={{ flex:1, height:4, background:'rgba(255,255,255,0.06)', borderRadius:2 }}>
                      <div style={{ height:'100%', borderRadius:2, width:`${c.porcentaje}%`,
                        background: activada ? '#4ade80' : c.porcentaje >= 90 ? GOLD : 'rgba(201,168,76,0.5)' }} />
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color: activada ? '#4ade80' : GOLD, minWidth:35 }}>
                      {Math.round(c.porcentaje)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          <button onClick={() => navigate('/admin/jugadores')}
            style={{ marginTop:10, fontSize:11, color:'#34d399', background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.25)', borderRadius:4, padding:'4px 12px', cursor:'pointer', fontFamily:'inherit' }}>
            Ver fichas de jugadores →
          </button>
        </div>
      )}

      {/* Alerta zapatos */}
      {shoeAlerts.length > 0 && (
        <div style={{ background:'rgba(248,113,113,0.07)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:8, padding:'12px 16px', marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'#f87171', letterSpacing:1, marginBottom:10 }}>
            👟 ALERTA DE BOTINES — {shoeAlerts.length} jugador(es) necesitan reposición
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {shoeAlerts.map(a => {
              const p = playerMap[a.player_id]
              return (
                <div key={a.player_id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px',
                  background: a.dias <= 0 ? 'rgba(248,113,113,0.12)' : 'rgba(251,191,36,0.08)',
                  border:`1px solid ${a.dias <= 0 ? 'rgba(248,113,113,0.3)' : 'rgba(251,191,36,0.25)'}`, borderRadius:6 }}>
                  <span>{a.dias <= 0 ? '🔴' : '🟡'}</span>
                  <div>
                    <div style={{ fontSize:12, color:'#fff', fontWeight:600 }}>{p?.name || '—'}</div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)' }}>
                      {a.dias <= 0 ? <span style={{ color:'#f87171', fontWeight:600 }}>AGOTADO</span>
                        : <span style={{ color:'#fbbf24' }}>{a.dias} días restantes</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <button onClick={() => navigate('/admin/jugadores')}
            style={{ marginTop:10, fontSize:11, color:GOLD, background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:4, padding:'4px 12px', cursor:'pointer', fontFamily:'inherit' }}>
            Ir a Pedidos →
          </button>
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div className="section-title" style={{ margin:0, flex:1 }}>PANEL ADMINISTRATIVO</div>
        <button className="btn-gold" onClick={() => navigate('/admin/jugadores')}>VER PLANTEL</button>
      </div>

      {/* KPIs */}
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

      {/* Charts */}
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

      {/* Resumen financiero */}
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

      {/* Resumen anual botines */}
      <div className="card" style={{ marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:8 }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontWeight:600, letterSpacing:1.5 }}>
            👟 BOTINES ENTREGADOS POR JUGADOR
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            {aniosDisponibles.map(y => (
              <button key={y} onClick={() => setShoeAnio(y)}
                style={{ fontSize:11, padding:'4px 12px', borderRadius:4, cursor:'pointer', fontFamily:'inherit',
                  background: shoeAnio===y ? GOLD : 'transparent',
                  color: shoeAnio===y ? '#0f1a3a' : 'rgba(255,255,255,0.45)',
                  border: shoeAnio===y ? `1px solid ${GOLD}` : '1px solid rgba(201,168,76,0.2)' }}>
                {y}
              </button>
            ))}
          </div>
        </div>
        {Object.keys(shoeResumenByPlayer).length === 0 ? (
          <div style={{ textAlign:'center', color:'rgba(255,255,255,0.25)', fontSize:13, padding:16 }}>
            Sin botines entregados en {shoeAnio}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {Object.entries(shoeResumenByPlayer)
              .sort(([a],[b]) => (playerMap[a]?.name||'').localeCompare(playerMap[b]?.name||''))
              .map(([pid, res]) => {
                const p = playerMap[pid]
                const total = res.elite + res.pro
                return (
                  <div key={pid} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8, padding:'10px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                      <div style={{ fontWeight:600, color:'#fff', fontSize:13, minWidth:160 }}>{p?.name || '—'}</div>
                      <div style={{ display:'flex', gap:8, flex:1, flexWrap:'wrap' }}>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10,
                          background:'rgba(201,168,76,0.15)', color:GOLD, border:'1px solid rgba(201,168,76,0.3)', fontWeight:600 }}>
                          {res.elite} Elite
                        </span>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10,
                          background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.1)', fontWeight:600 }}>
                          {res.pro} Pro
                        </span>
                        <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>{total} par{total!==1?'es':''} total</span>
                      </div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', whiteSpace:'nowrap' }}>
                        Última entrega: {fmtDate(res.entregas.sort((a,b) => new Date(b.fecha)-new Date(a.fecha))[0]?.fecha)}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* Contratos clubes */}
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
                    <td>{c.club_name||'—'}</td><td>{c.position||'—'}</td>
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

      {/* Contratos agencia */}
      <div className="section-title">CONTRATOS CON AGENCIA</div>
      <div className="card" style={{ marginBottom:20 }}>
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
                    <td>{fmtDate(c.incorporation_date)}</td><td>{fmtDate(c.contract_date)}</td>
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

      {/* Widget usuarios admin */}
      {userRole === 'admin' && (
        <div className="card" style={{ marginBottom:20, border:'1px solid rgba(201,168,76,0.15)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontWeight:600, letterSpacing:1.5 }}>USUARIOS DEL SISTEMA</div>
            <button onClick={() => navigate('/admin/usuarios')}
              style={{ fontSize:11, padding:'4px 12px', borderRadius:4, border:`1px solid rgba(201,168,76,0.3)`,
                background:'rgba(201,168,76,0.08)', color:GOLD, cursor:'pointer', fontFamily:'inherit' }}>
              Gestionar →
            </button>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {!usuarios.length && <div style={{ fontSize:12, color:'rgba(255,255,255,0.25)' }}>Sin usuarios registrados</div>}
            {usuarios.map(u => (
              <div key={u.user_id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px',
                background:'rgba(255,255,255,0.04)', borderRadius:6, border:'1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center',
                  justifyContent:'center', fontWeight:700, fontSize:12,
                  background:(ROL_COLORS[u.role]||'#94a3b8')+'22', color:ROL_COLORS[u.role]||'#94a3b8' }}>
                  {(u.nombre||u.email||'?')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize:12, color:'#fff', fontWeight:500 }}>{u.nombre||u.email}</div>
                  <div style={{ fontSize:10, color:ROL_COLORS[u.role]||'#94a3b8', fontWeight:600 }}>{(u.role||'visor').toUpperCase()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Cumpleanos />
    </div>
  )
}
