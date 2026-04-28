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
const GOLD = '#C9A84C'
const TAB = (active) => ({
  padding: '7px 16px', fontSize: 11, fontWeight: 600, letterSpacing: .5,
  borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
  background: active ? GOLD : 'transparent',
  color: active ? '#0f1a3a' : 'rgba(255,255,255,0.45)',
  border: active ? `1px solid ${GOLD}` : '1px solid rgba(201,168,76,0.2)',
})
const EDIT_BTN = { fontSize: 10, padding: '3px 8px', borderRadius: 3, border: '1px solid rgba(201,168,76,0.3)', background: 'transparent', color: GOLD, cursor: 'pointer', fontFamily: 'inherit' }
const GHOST_BTN = { fontSize: 10, padding: '3px 8px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'inherit' }
const INPUT = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 5, padding: '8px 12px', fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none' }
const LABEL = { fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: 1, display: 'block', marginBottom: 4, fontWeight: 600 }

const MARCAS = ['adidas', 'nike', 'skechers', 'skechers_w']
const MARCAS_LABEL = { adidas: 'Adidas', nike: 'Nike', skechers: 'Skechers', skechers_w: 'Skechers (mujer)' }
const SUELAS = ['FG', 'SG']
const CATEGORIAS = ['Elite', 'Pro']

// ─── Subcomponente Pedidos ────────────────────────────────────────────────────
function PedidosTab({ players }) {
  const [orders, setOrders] = useState([])
  const [shoeSizes, setShoeSizes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editOrder, setEditOrder] = useState(null)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const [form, setForm] = useState({
    player_id: '', marca: 'adidas', uk: '', modelo: '',
    suela: 'FG', categoria: 'Elite', pares: 1,
    fecha_pedido: new Date().toISOString().split('T')[0], notas: '',
  })
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const loadOrders = async () => {
    setLoading(true)
    const { data } = await supabase.from('shoe_orders').select('*').order('fecha_pedido', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadOrders()
    supabase.from('shoe_sizes').select('*').then(({ data }) => setShoeSizes(data || []))
  }, [])

  const getConversion = (marca, uk) => {
    if (!marca || !uk) return null
    return shoeSizes.find(s => s.marca === marca && parseFloat(s.uk) === parseFloat(uk)) || null
  }

  const conversion = getConversion(form.marca, form.uk)

  const openNew = () => {
    setEditOrder(null)
    setForm({ player_id: '', marca: 'adidas', uk: '', modelo: '', suela: 'FG', categoria: 'Elite', pares: 1, fecha_pedido: new Date().toISOString().split('T')[0], notas: '' })
    setShowForm(true); setMsg('')
  }

  const openEdit = (o) => {
    setEditOrder(o)
    setForm({ player_id: o.player_id, marca: o.marca, uk: o.uk, modelo: o.modelo || '', suela: o.suela, categoria: o.categoria, pares: o.pares, fecha_pedido: o.fecha_pedido, notas: o.notas || '' })
    setShowForm(true); setMsg('')
  }

  const handleSave = async () => {
    if (!form.player_id) { setMsg('Selecciona un jugador'); return }
    if (!form.uk) { setMsg('Ingresa la talla UK'); return }
    setSaving(true); setMsg('')
    const conv = getConversion(form.marca, form.uk)
    const payload = {
      player_id: form.player_id, marca: form.marca, uk: parseFloat(form.uk),
      us: conv?.us || null, eu: conv?.eu || null, cms: conv?.cms || null,
      modelo: form.modelo || null, suela: form.suela, categoria: form.categoria,
      pares: parseInt(form.pares) || 1, fecha_pedido: form.fecha_pedido, notas: form.notas || null,
    }
    let error
    if (editOrder) {
      ;({ error } = await supabase.from('shoe_orders').update(payload).eq('id', editOrder.id))
    } else {
      ;({ error } = await supabase.from('shoe_orders').insert(payload))
    }
    setSaving(false)
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('✓ Pedido guardado'); setShowForm(false); loadOrders()
    setTimeout(() => setMsg(''), 3000)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este pedido?')) return
    await supabase.from('shoe_orders').delete().eq('id', id)
    loadOrders()
  }

  const getAlerta = (o) => {
    if (!o.fecha_pedido || !o.pares) return null
    const fecha = new Date(o.fecha_pedido)
    fecha.setMonth(fecha.getMonth() + (o.pares * 2))
    return { fecha, dias: Math.floor((fecha - Date.now()) / (24 * 3600 * 1000)) }
  }

  const playerMap = {}
  players.forEach(p => { playerMap[p.id] = p })

  const filteredOrders = orders.filter(o => {
    const p = playerMap[o.player_id]
    return !search || p?.name?.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 1.5 }}>PEDIDOS DE BOTINES</div>
        <button className="btn-gold" onClick={openNew}>+ NUEVO PEDIDO</button>
      </div>

      {msg && (
        <div style={{ marginBottom: 12, fontSize: 13, padding: '8px 12px', borderRadius: 5,
          background: msg.startsWith('✓') ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
          border: `1px solid ${msg.startsWith('✓') ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
          color: msg.startsWith('✓') ? '#4ade80' : '#f87171' }}>
          {msg}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20, border: '1px solid rgba(201,168,76,0.25)' }}>
          <div style={{ fontSize: 11, color: GOLD, fontWeight: 600, letterSpacing: 1.5, marginBottom: 16 }}>
            {editOrder ? 'EDITAR PEDIDO' : 'NUEVO PEDIDO'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL}>JUGADOR</label>
              <select style={INPUT} value={form.player_id} onChange={e => {
                const p = players.find(x => x.id === e.target.value)
                setF('player_id', e.target.value)
                if (p?.shoe_size) setF('uk', p.shoe_size)
                if (p?.gender === 'F' && form.marca === 'skechers') setF('marca', 'skechers_w')
              }}>
                <option value="">Seleccionar jugador...</option>
                {players.sort((a, b) => a.name?.localeCompare(b.name)).map(p => (
                  <option key={p.id} value={p.id}>{p.name}{p.shoe_size ? ` (UK ${p.shoe_size})` : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={LABEL}>MARCA</label>
              <select style={INPUT} value={form.marca} onChange={e => setF('marca', e.target.value)}>
                {MARCAS.map(m => <option key={m} value={m}>{MARCAS_LABEL[m]}</option>)}
              </select>
            </div>

            <div>
              <label style={LABEL}>TALLA UK</label>
              <input style={INPUT} type="number" step="0.5" value={form.uk}
                onChange={e => setF('uk', e.target.value)} placeholder="8.0" />
            </div>

            {conversion && (
              <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 6, padding: '8px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, marginBottom: 4 }}>
                  CONVERSIÓN {MARCAS_LABEL[form.marca].toUpperCase()}
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                  <span style={{ color: GOLD }}>US {conversion.us}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>EU {conversion.eu}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>{conversion.cms} cm</span>
                </div>
              </div>
            )}

            <div>
              <label style={LABEL}>MODELO</label>
              <input style={INPUT} value={form.modelo} onChange={e => setF('modelo', e.target.value)} placeholder="Predator, Mercurial..." />
            </div>

            <div>
              <label style={LABEL}>TIPO SUELA</label>
              <select style={INPUT} value={form.suela} onChange={e => setF('suela', e.target.value)}>
                {SUELAS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label style={LABEL}>CATEGORÍA</label>
              <select style={INPUT} value={form.categoria} onChange={e => setF('categoria', e.target.value)}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label style={LABEL}>CANTIDAD DE PARES</label>
              <input style={INPUT} type="number" min="1" max="10" value={form.pares}
                onChange={e => setF('pares', e.target.value)} />
              {form.pares > 0 && (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>
                  Duración estimada: ~{parseInt(form.pares) * 2} meses
                </div>
              )}
            </div>

            <div>
              <label style={LABEL}>FECHA PEDIDO</label>
              <input style={INPUT} type="date" value={form.fecha_pedido}
                onChange={e => setF('fecha_pedido', e.target.value)} />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL}>NOTAS</label>
              <input style={INPUT} value={form.notas} onChange={e => setF('notas', e.target.value)}
                placeholder="Observaciones opcionales..." />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-gold" onClick={handleSave} disabled={saving}>
              {saving ? 'GUARDANDO...' : 'GUARDAR PEDIDO'}
            </button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>CANCELAR</button>
          </div>
        </div>
      )}

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por jugador..."
        style={{ ...INPUT, width: 240, marginBottom: 12 }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: GOLD, fontFamily: 'Bebas Neue', letterSpacing: 2 }}>CARGANDO...</div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Jugador</th><th>Marca</th><th>UK</th><th>US</th><th>EU</th>
                <th>Modelo</th><th>Suela</th><th>Cat.</th><th>Pares</th>
                <th>Fecha</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => {
                const p = playerMap[o.player_id]
                const alerta = getAlerta(o)
                const agotado = alerta && alerta.dias <= 0
                const porAgotar = alerta && alerta.dias > 0 && alerta.dias <= 30
                return (
                  <tr key={o.id}>
                    <td style={{ color: '#fff', fontWeight: 500 }}>{p?.name || '—'}</td>
                    <td>{MARCAS_LABEL[o.marca] || o.marca}</td>
                    <td style={{ color: GOLD, fontWeight: 600 }}>{o.uk}</td>
                    <td>{o.us || '—'}</td>
                    <td>{o.eu || '—'}</td>
                    <td>{o.modelo || '—'}</td>
                    <td>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                        background: o.suela === 'FG' ? 'rgba(96,165,250,0.15)' : 'rgba(52,211,153,0.15)',
                        color: o.suela === 'FG' ? '#60a5fa' : '#34d399',
                        border: `1px solid ${o.suela === 'FG' ? 'rgba(96,165,250,0.3)' : 'rgba(52,211,153,0.3)'}` }}>
                        {o.suela}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                        background: o.categoria === 'Elite' ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.06)',
                        color: o.categoria === 'Elite' ? GOLD : 'rgba(255,255,255,0.5)',
                        border: `1px solid ${o.categoria === 'Elite' ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
                        {o.categoria}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{o.pares}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(o.fecha_pedido)}</td>
                    <td>
                      {agotado
                        ? <span className="pill pill-urg">⚠ AGOTADO</span>
                        : porAgotar
                          ? <span className="pill pill-warn">⚡ {alerta.dias}d</span>
                          : alerta
                            ? <span className="pill pill-ok">OK · {Math.floor(alerta.dias / 30)}m</span>
                            : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button style={EDIT_BTN} onClick={() => openEdit(o)}>Editar</button>
                        <button onClick={() => handleDelete(o.id)}
                          style={{ fontSize: 10, padding: '3px 8px', borderRadius: 3, border: '1px solid rgba(248,113,113,0.3)', background: 'transparent', color: '#f87171', cursor: 'pointer', fontFamily: 'inherit' }}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!filteredOrders.length && (
                <tr><td colSpan={12} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: 24 }}>Sin pedidos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla de referencia de tallas */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 1.5, marginBottom: 12 }}>
          TALLAS REGISTRADAS POR JUGADOR
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Jugador</th><th>UK</th>
                <th>Adidas US</th><th>Adidas EU</th>
                <th>Nike US</th><th>Nike EU</th>
                <th>Skechers US</th><th>Skechers EU</th>
              </tr>
            </thead>
            <tbody>
              {players.filter(p => p.shoe_size).sort((a, b) => a.name?.localeCompare(b.name)).map(p => {
                const uk = parseFloat(p.shoe_size)
                const marcaSketch = p.gender === 'F' ? 'skechers_w' : 'skechers'
                const adidas = shoeSizes.find(s => s.marca === 'adidas' && parseFloat(s.uk) === uk)
                const nike = shoeSizes.find(s => s.marca === 'nike' && parseFloat(s.uk) === uk)
                const skechers = shoeSizes.find(s => s.marca === marcaSketch && parseFloat(s.uk) === uk)
                return (
                  <tr key={p.id}>
                    <td style={{ color: '#fff', fontWeight: 500 }}>{p.name}</td>
                    <td style={{ color: GOLD, fontWeight: 700 }}>{p.shoe_size}</td>
                    <td>{adidas?.us || '—'}</td>
                    <td>{adidas?.eu || '—'}</td>
                    <td>{nike?.us || '—'}</td>
                    <td>{nike?.eu || '—'}</td>
                    <td>{skechers?.us || '—'}{p.gender === 'F' ? ' W' : ''}</td>
                    <td>{skechers?.eu || '—'}</td>
                  </tr>
                )
              })}
              {!players.filter(p => p.shoe_size).length && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: 16 }}>
                  Sin tallas registradas — edita cada jugador para agregar su talla UK
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
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

  if (loading) return <div style={{ textAlign: 'center', padding: 60, fontFamily: 'Bebas Neue', color: GOLD, letterSpacing: 3 }}>CARGANDO...</div>

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px' }}>

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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <button onClick={() => navigate('/dashboard')} style={{ fontSize: 11, color: GOLD, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, letterSpacing: .5, fontFamily: 'inherit' }}>← VOLVER AL PANEL</button>
        <div style={{ display: 'flex', gap: 6 }}>
          {tab === 'players' && <button className="btn-gold" onClick={() => setModal({ type: 'player', data: null })}>+ JUGADOR</button>}
          {tab === 'contracts' && <>
            <button className="btn-gold" onClick={() => setModal({ type: 'club', data: null, playerId: null })}>+ CONTRATO CLUB</button>
            <button className="btn-ghost" onClick={() => setModal({ type: 'agency', data: null, playerId: null })}>+ CONTRATO AGENCIA</button>
          </>}
          {tab === 'transactions' && <button className="btn-gold" onClick={() => setModal({ type: 'transaction', data: null })}>+ TRANSACCIÓN</button>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button style={TAB(tab === 'players')} onClick={() => setTab('players')}>Plantel ({players.length})</button>
        <button style={TAB(tab === 'contracts')} onClick={() => setTab('contracts')}>Contratos ({clubInfo.length + agencyContracts.length})</button>
        <button style={TAB(tab === 'transactions')} onClick={() => setTab('transactions')}>Transacciones ({transactions.length})</button>
        <button style={TAB(tab === 'docs')} onClick={() => setTab('docs')}>Docs Especiales</button>
        <button style={TAB(tab === 'pedidos')} onClick={() => setTab('pedidos')}>👟 Pedidos</button>
      </div>

      {tab === 'players' && (
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o RUT..."
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 5, padding: '7px 12px', fontSize: 12, color: '#fff', fontFamily: 'inherit', outline: 'none', width: 260, marginBottom: 12 }} />
          <div className="card" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Nombre</th><th>RUT</th><th>Posición</th><th>Club</th>
                  <th>Nacimiento</th><th>Altura</th><th>Peso</th><th>Pie</th>
                  <th>Estado</th><th>Landing</th><th>Acciones</th>
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
                      <td><span className={`pill ${ci.contract_active ? 'pill-ok' : 'pill-off'}`}>{ci.contract_active ? 'ACTIVO' : '—'}</span></td>
                      <td>
                        <button onClick={async () => { await supabase.from('players').update({ mostrar_en_landing: !p.mostrar_en_landing }).eq('id', p.id); load() }}
                          style={{ fontSize: 10, padding: '3px 8px', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
                            border: p.mostrar_en_landing ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.1)',
                            background: p.mostrar_en_landing ? 'rgba(74,222,128,0.1)' : 'transparent',
                            color: p.mostrar_en_landing ? '#4ade80' : 'rgba(255,255,255,0.3)' }}>
                          {p.mostrar_en_landing ? '✓ VISIBLE' : 'OCULTO'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button style={EDIT_BTN} onClick={() => setModal({ type: 'player', data: p })}>Editar</button>
                          <button style={GHOST_BTN} onClick={() => setModal({ type: 'club', data: ci.id ? ci : null, playerId: p.id })}>Club</button>
                          <button style={GHOST_BTN} onClick={() => setModal({ type: 'agency', data: null, playerId: p.id, playerName: p.name })}>Agencia</button>
                          <button onClick={() => navigate(`/admin/documentos/${p.id}`)}
                            style={{ fontSize: 10, padding: '3px 8px', borderRadius: 3, border: '1px solid rgba(201,168,76,0.4)', background: 'rgba(201,168,76,0.1)', color: GOLD, cursor: 'pointer', fontFamily: 'inherit' }}>
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
                      <td>{c.club_name || '—'}</td><td>{c.position || '—'}</td>
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
                      <td>{fmtDate(c.incorporation_date)}</td><td>{fmtDate(c.contract_date)}</td>
                      <td>{c.contract_duration_months ? c.contract_duration_months + ' meses' : '—'}</td>
                      <td>{c.contract_pdf_url ? <a href={c.contract_pdf_url} target="_blank" rel="noreferrer" style={{ color: GOLD, fontSize: 10 }}>Ver PDF</a> : '—'}</td>
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

      {tab === 'docs' && <DocsEspeciales />}
      {tab === 'pedidos' && <PedidosTab players={players} />}
    </div>
  )
}
