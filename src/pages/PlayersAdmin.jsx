import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PlayerForm from '../components/PlayerForm'
import ClubContractForm from '../components/ClubContractForm'
import AgencyContractForm from '../components/AgencyContractForm'
import TransactionForm from '../components/TransactionForm'
import DocsEspeciales from '../components/DocsEspeciales'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmt$(n) {
  if (!n && n !== 0) return '—'
  const v = parseFloat(n)
  if (Math.abs(v) >= 1000000) return '$' + (v / 1000000).toFixed(1) + 'M'
  if (Math.abs(v) >= 1000) return '$' + (v / 1000).toFixed(0) + 'K'
  return '$' + v.toFixed(0)
}
const TAB = (active) => ({
  padding: '7px 16px', fontSize: 11, fontWeight: 600, letterSpacing: .5,
  borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
  background: active ? '#C9A84C' : 'transparent',
  color: active ? '#0f1a3a' : 'rgba(255,255,255,0.45)',
  border: active ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.2)',
})
const EDIT_BTN = { fontSize: 10, padding: '3px 8px', borderRadius: 3, border: '1px solid rgba(201,168,76,0.3)', background: 'transparent', color: '#C9A84C', cursor: 'pointer', fontFamily: 'inherit' }
const GHOST_BTN = { fontSize: 10, padding: '3px 8px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'inherit' }

export default function PlayersAdmin() {
  const navigate = useNavigate()
  const [players, setPlayers] = useState([])
  const [clubInfo, setClubInfo] = useState([])
  const [agencyContracts, setAgencyContracts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('players')
  const [modal, setModal] = useState(null)

  const handleDeleteTx = async (id) => {
    if (!window.confirm('¿Eliminar esta transacción? Esta acción no se puede deshacer.')) return
    await supabase.from('transactions').delete().eq('id', id)
    load()
  }

  const load = async () => {
    setLoading(true)
    const [p, ci, ac, tx] = await Promise.all([
      supabase.from('players').select('*').order('name'),
      supabase.from('club_info').select('*'),
      supabase.from('agency_contracts').select('*,players(name)').order('contract_date', { ascending: false }),
      supabase.from('transactions').select('*,players(name)').order('transaction_date', { ascending: false }),
    ])
    setPlayers(p.data || [])
    setClubInfo(ci.data || [])
    setAgencyContracts(ac.data || [])
    setTransactions(tx.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const clubMap = {}
  clubInfo.forEach(c => clubMap[c.player_id] = c)

  const filtered = players.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) || p.rut?.includes(search)
  )

  const closeModal = () => { setModal(null); load() }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, fontFamily: 'Bebas Neue', color: '#C9A84C', letterSpacing: 3 }}>CARGANDO...</div>

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px' }}>

      {/* MODAL */}
      {modal && (
        <div onClick={e => e.target === e.currentTarget && closeModal()}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxHeight: '90vh', overflowY: 'auto', width: '100%', maxWidth: 660 }}>
            {modal.type === 'player' && <PlayerForm player={modal.data} onSave={closeModal} onCancel={closeModal} />}
            {modal.type === 'club' && <ClubContractForm contract={modal.data} playerId={modal.playerId} playerName={modal.playerName} onSave={closeModal} onCancel={closeModal} />}
            {modal.type === 'agency' && <AgencyContractForm contract={modal.data} playerId={modal.playerId} playerName={modal.playerName} onSave={closeModal} onCancel={closeModal} />}
            {modal.type === 'transaction' && <TransactionForm transaction={modal.data} onSave={closeModal} onCancel={closeModal} />}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <button onClick={() => navigate('/dashboard')} style={{ fontSize: 11, color: '#C9A84C', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, letterSpacing: .5, fontFamily: 'inherit' }}>← VOLVER AL PANEL</button>
        <div style={{ display: 'flex', gap: 6 }}>
          {tab === 'players' && <button className="btn-gold" onClick={() => setModal({ type: 'player', data: null })}>+ JUGADOR</button>}
          {tab === 'contracts' && <>
            <button className="btn-gold" onClick={() => setModal({ type: 'club', data: null, playerId: null })}>+ CONTRATO CLUB</button>
            <button className="btn-ghost" onClick={() => setModal({ type: 'agency', data: null, playerId: null })}>+ CONTRATO AGENCIA</button>
          </>}
          {tab === 'transactions' && <button className="btn-gold" onClick={() => setModal({ type: 'transaction', data: null })}>+ TRANSACCIÓN</button>}
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <button style={TAB(tab === 'players')} onClick={() => setTab('players')}>Plantel ({players.length})</button>
        <button style={TAB(tab === 'contracts')} onClick={() => setTab('contracts')}>Contratos ({clubInfo.length + agencyContracts.length})</button>
        <button style={TAB(tab === 'transactions')} onClick={() => setTab('transactions')}>Transacciones ({transactions.length})</button>
        <button style={TAB(tab === 'docs')} onClick={() => setTab('docs')}>Docs Especiales</button>
      </div>

      {/* PLANTEL */}
      {tab === 'players' && (
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o RUT..."
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 5, padding: '7px 12px', fontSize: 12, color: '#fff', fontFamily: 'inherit', outline: 'none', width: 260, marginBottom: 12 }} />
          <div className="card" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>RUT</th>
                  <th>Posición</th>
                  <th>Club</th>
                  <th>Nacimiento</th>
                  <th>Altura</th>
                  <th>Peso</th>
                  <th>Pie</th>
                  <th>Estado</th>
                  <th>Landing</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const ci = clubMap[p.id] || {}
                  return (
                    <tr key={p.id}>
                      <td style={{ color: '#fff', fontWeight: 500 }}>{p.name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{p.rut || '—'}</td>
                      <td>{ci.position || '—'}</td>
                      <td>{ci.club_name || '—'}</td>
                      <td>{fmtDate(p.birth_date)}</td>
                      <td>{p.height ? p.height + ' cm' : '—'}</td>
                      <td>{p.weight ? p.weight + ' kg' : '—'}</td>
                      <td>{p.skill_foot || '—'}</td>
                      <td>
                        <span className={`pill ${ci.contract_active ? 'pill-ok' : 'pill-off'}`}>
                          {ci.contract_active ? 'ACTIVO' : '—'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={async () => {
                            await supabase.from('players').update({ mostrar_en_landing: !p.mostrar_en_landing }).eq('id', p.id)
                            load()
                          }}
                          style={{
                            fontSize: 10, padding: '3px 8px', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
                            border: p.mostrar_en_landing ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.1)',
                            background: p.mostrar_en_landing ? 'rgba(74,222,128,0.1)' : 'transparent',
                            color: p.mostrar_en_landing ? '#4ade80' : 'rgba(255,255,255,0.3)',
                          }}>
                          {p.mostrar_en_landing ? '✓ VISIBLE' : 'OCULTO'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button style={EDIT_BTN} onClick={() => setModal({ type: 'player', data: p })}>Editar</button>
                          <button style={GHOST_BTN} onClick={() => setModal({ type: 'club', data: ci.id ? ci : null, playerId: p.id })}>Club</button>
                          <button style={GHOST_BTN} onClick={() => setModal({ type: 'agency', data: null, playerId: p.id, playerName: p.name })}>Agencia</button>
                          <button onClick={() => navigate(`/admin/documentos/${p.id}`)}
                            style={{ fontSize: 10, padding: '3px 8px', borderRadius: 3, border: '1px solid rgba(201,168,76,0.4)', background: 'rgba(201,168,76,0.1)', color: '#C9A84C', cursor: 'pointer', fontFamily: 'inherit' }}>
                            📄 Docs
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!filtered.length && <tr><td colSpan={11} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: 24 }}>Sin resultados</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* CONTRATOS */}
      {tab === 'contracts' && (
        <>
          <div className="section-title">CONTRATOS CON CLUBES</div>
          <div className="card" style={{ overflowX: 'auto', marginBottom: 20 }}>
            <table>
              <thead><tr><th>Jugador</th><th>Club</th><th>Posición</th><th>Salario</th><th>Comisión</th><th>TM</th><th>Estado</th><th>Acción</th></tr></thead>
              <tbody>
                {clubInfo.map(c => {
                  const p = players.find(x => x.id === c.player_id)
                  return (
                    <tr key={c.id}>
                      <td style={{ color: '#fff', fontWeight: 500 }}>{p?.name || '—'}</td>
                      <td>{c.club_name || '—'}</td>
                      <td>{c.position || '—'}</td>
                      <td>{fmt$(c.salary)}</td>
                      <td>{c.commission_percentage ? c.commission_percentage + '%' : fmt$(c.commission_fixed)}</td>
                      <td>{c.transfermarkt_valuation || '—'}</td>
                      <td><span className={`pill ${c.contract_active ? 'pill-ok' : 'pill-urg'}`}>{c.contract_active ? 'VIGENTE' : 'INACTIVO'}</span></td>
                      <td><button style={EDIT_BTN} onClick={() => setModal({ type: 'club', data: c, playerId: c.player_id })}>Editar</button></td>
                    </tr>
                  )
                })}
                {!clubInfo.length && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: 16 }}>Sin contratos</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="section-title">CONTRATOS CON AGENCIA</div>
          <div className="card" style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Jugador</th><th>Incorporación</th><th>Inicio</th><th>Duración</th><th>PDF</th><th>Estado</th><th>Acción</th></tr></thead>
              <tbody>
                {agencyContracts.map(c => {
                  const end = c.contract_date && c.contract_duration_months ? new Date(c.contract_date) : null
                  if (end) end.setMonth(end.getMonth() + c.contract_duration_months)
                  const days = end ? Math.floor((end - Date.now()) / (24 * 3600 * 1000)) : null
                  const pc = !end ? 'pill-warn' : days > 90 ? 'pill-ok' : days > 0 ? 'pill-warn' : 'pill-urg'
                  const es = !end ? 'SIN FECHA' : days > 90 ? 'VIGENTE' : days > 0 ? 'POR VENCER' : 'VENCIDO'
                  return (
                    <tr key={c.id}>
                      <td style={{ color: '#fff', fontWeight: 500 }}>{c.players?.name || '—'}</td>
                      <td>{fmtDate(c.incorporation_date)}</td>
                      <td>{fmtDate(c.contract_date)}</td>
                      <td>{c.contract_duration_months ? c.contract_duration_months + ' meses' : '—'}</td>
                      <td>{c.contract_pdf_url ? <a href={c.contract_pdf_url} target="_blank" rel="noreferrer" style={{ color: '#C9A84C', fontSize: 10 }}>Ver PDF</a> : '—'}</td>
                      <td><span className={`pill ${pc}`}>{es}</span></td>
                      <td><button style={EDIT_BTN} onClick={() => setModal({ type: 'agency', data: c, playerId: c.player_id, playerName: players.find(x => x.id === c.player_id)?.name })}>Editar</button></td>
                    </tr>
                  )
                })}
                {!agencyContracts.length && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: 16 }}>Sin contratos de agencia</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TRANSACCIONES */}
      {tab === 'transactions' && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Fecha</th><th>Jugador</th><th>Tipo</th><th>Categoría</th><th>Descripción</th><th>Monto</th><th>Acción</th></tr></thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id}>
                  <td>{fmtDate(t.transaction_date)}</td>
                  <td>{t.players?.name || '—'}</td>
                  <td><span className={`pill ${t.type === 'income' ? 'pill-ok' : 'pill-urg'}`}>{t.type === 'income' ? 'INGRESO' : 'GASTO'}</span></td>
                  <td>{t.subtype || '—'}</td>
                  <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description || '—'}</td>
                  <td style={{ color: t.type === 'income' ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                    {t.type === 'income' ? '+' : '−'}{fmt$(Math.abs(t.amount))}
                  </td>
                  <td><button style={EDIT_BTN} onClick={() => setModal({ type: 'transaction', data: t })}>Editar</button></td>
                </tr>
              ))}
              {!transactions.length && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: 24 }}>Sin transacciones</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* DOCS ESPECIALES */}
      {tab === 'docs' && <DocsEspeciales />}
    </div>
  )
}
