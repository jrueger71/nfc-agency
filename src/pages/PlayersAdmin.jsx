import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatRut } from '../lib/formatRut'
import PlayerForm from '../components/PlayerForm'
import ClubContractForm from '../components/ClubContractForm'
import AgencyContractForm from '../components/AgencyContractForm'
import TransactionForm from '../components/TransactionForm'
import DocsEspeciales from '../components/DocsEspeciales'
import { generarReporteCalzadoPDF } from '../lib/generarReporteCalzado'

function fmtDate(d) {
  if (!d) return '—'
  const fecha = new Date(d.includes('T') ? d : d + 'T12:00:00')
  return fecha.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmt$(n) {
  if (!n && n !== 0) return '—'
  const v = parseFloat(n)
  if (Math.abs(v) >= 1000000) return '$' + (v / 1000000).toFixed(1) + 'M'
  if (Math.abs(v) >= 1000) return '$' + (v / 1000).toFixed(0) + 'K'
  return '$' + v.toFixed(0)
}
function fmtCLP(n) {
  if (!n) return '—'
  return '$ ' + Math.round(parseFloat(n)).toLocaleString('es-CL')
}
const GOLD = '#C9A84C'
const TAB_STYLE = (active) => ({
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
const MARCAS_LABEL = { adidas: 'Adidas', nike: 'Nike', skechers: 'Skechers', skechers_w: 'Skechers (M)' }
const MARCAS = ['adidas', 'nike', 'skechers', 'skechers_w']
const SUELAS = ['FG', 'SG']
const CATEGORIAS = ['Elite', 'Pro']
const EMPTY_ITEM = () => ({ player_id: '', marca: 'adidas', uk: '', modelo: '', suela: 'FG', categoria: 'Elite', pares: 1 })

const TIPO_COLORS = {
  'Contrato': GOLD, 'Renovación': '#60a5fa',
  'Préstamo': '#34d399', 'Cesión': '#f87171',
}

// ─── Modal vinculación factura ────────────────────────────────────────────────
function ModalVincularFactura({ orden, playerName, onVincular, onClose }) {
  const [txList, setTxList] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(orden.transaction_id || '')

  useEffect(() => {
    // Cargar transacciones de zapatos del jugador
    supabase.from('transactions')
      .select('*')
      .eq('player_id', orden.player_id)
      .eq('type', 'expense')
      .order('transaction_date', { ascending: false })
      .then(({ data }) => {
        // Filtrar zapatos/botines
        const zapatos = (data || []).filter(t =>
          t.subtype?.toLowerCase().includes('zapato') ||
          t.subtype?.toLowerCase().includes('botin') ||
          t.description?.toLowerCase().includes('zapato') ||
          t.description?.toLowerCase().includes('botin') ||
          t.description?.toLowerCase().includes('nike') ||
          t.description?.toLowerCase().includes('adidas') ||
          t.description?.toLowerCase().includes('skechers')
        )
        setTxList(zapatos)
        setLoading(false)
      })
  }, [])

  const handleGuardar = async () => {
    await supabase.from('shoe_orders')
      .update({ transaction_id: selected || null })
      .eq('id', orden.id)
    onVincular()
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#0f1a3a', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 560, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 13, color: GOLD, fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>VINCULAR FACTURA</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
          {playerName} · {MARCAS_LABEL[orden.marca] || orden.marca} · {orden.modelo || '—'} · {orden.pares} par(es)
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 24, color: GOLD }}>Cargando transacciones...</div>
        ) : txList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            No hay transacciones de zapatos para este jugador.<br />
            <span style={{ fontSize: 11 }}>Ingresa primero la factura en Transacciones.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {/* Opción desvincular */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
              background: selected === '' ? 'rgba(248,113,113,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${selected === '' ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
              <input type="radio" checked={selected === ''} onChange={() => setSelected('')}
                style={{ accentColor: '#f87171' }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Sin vincular</span>
            </label>
            {txList.map(tx => (
              <label key={tx.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
                background: selected === tx.id ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selected === tx.id ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
                <input type="radio" checked={selected === tx.id} onChange={() => setSelected(tx.id)}
                  style={{ accentColor: GOLD, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>
                      {tx.description || tx.subtype || '—'}
                    </span>
                    <span style={{ fontSize: 12, color: GOLD, fontWeight: 600 }}>{fmtCLP(tx.amount)}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                    {fmtDate(tx.transaction_date)}
                    {tx.documento_respaldo && <span style={{ marginLeft: 8 }}>Doc: {tx.documento_respaldo}</span>}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-gold" onClick={handleGuardar}>GUARDAR VÍNCULO</button>
          <button className="btn-ghost" onClick={onClose}>CANCELAR</button>
        </div>
      </div>
    </div>
  )
}

// ─── PedidosTab ───────────────────────────────────────────────────────────────
function PedidosTab({ players }) {
  const [orders, setOrders] = useState([])
  const [transactions, setTransactions] = useState([])
  const [shoeSizes, setShoeSizes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showReporte, setShowReporte] = useState(false)
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [generando, setGenerando] = useState(false)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [modalFactura, setModalFactura] = useState(null) // orden seleccionada para vincular
  const [fechaPedido, setFechaPedido] = useState(new Date().toISOString().split('T')[0])
  const [notasPedido, setNotasPedido] = useState('')
  const [items, setItems] = useState([EMPTY_ITEM()])

  const loadOrders = async () => {
    setLoading(true)
    const [{ data: ord }, { data: tx }] = await Promise.all([
      supabase.from('shoe_orders').select('*').order('fecha_pedido', { ascending: false }),
      supabase.from('transactions').select('*').eq('type', 'expense'),
    ])
    setOrders(ord || [])
    setTransactions(tx || [])
    setLoading(false)
  }

  useEffect(() => {
    loadOrders()
    supabase.from('shoe_sizes').select('*').then(({ data }) => setShoeSizes(data || []))
    setSelectedPlayers(players.map(p => p.id))
  }, [])

  const getConv = (marca, uk) => {
    if (!marca || !uk) return null
    return shoeSizes.find(s => s.marca === marca && parseFloat(s.uk) === parseFloat(uk)) || null
  }

  const updateItem = (idx, key, val) => {
    setItems(prev => {
      const next = prev.map((item, i) => i === idx ? { ...item, [key]: val } : item)
      if (key === 'player_id') {
        const p = players.find(x => x.id === val)
        if (p?.shoe_size) next[idx].uk = p.shoe_size
        if (p?.gender === 'F' && next[idx].marca === 'skechers') next[idx].marca = 'skechers_w'
      }
      return next
    })
  }

  const addItem = () => setItems(prev => [...prev, EMPTY_ITEM()])
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))

  const openNew = () => {
    setItems([EMPTY_ITEM()])
    setFechaPedido(new Date().toISOString().split('T')[0])
    setNotasPedido('')
    setShowForm(true); setMsg('')
  }

  const handleSave = async () => {
    const valid = items.filter(i => i.player_id && i.uk)
    if (!valid.length) { setMsg('Agrega al menos un jugador con talla UK'); return }
    setSaving(true); setMsg('')
    const { data: grp, error: grpErr } = await supabase.from('shoe_order_groups')
      .insert({ fecha_pedido: fechaPedido, notas: notasPedido || null }).select().single()
    if (grpErr) { setSaving(false); setMsg('Error: ' + grpErr.message); return }
    const rows = valid.map(i => {
      const conv = getConv(i.marca, i.uk)
      return { group_id: grp.id, player_id: i.player_id, marca: i.marca, uk: parseFloat(i.uk), us: conv?.us || null, eu: conv?.eu || null, cms: conv?.cms || null, modelo: i.modelo || null, suela: i.suela, categoria: i.categoria, pares: parseInt(i.pares) || 1, fecha_pedido: fechaPedido, notas: notasPedido || null, estado: 'pendiente' }
    })
    const { error } = await supabase.from('shoe_orders').insert(rows)
    setSaving(false)
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg(`✓ Pedido guardado — ${rows.length} item(s) pendientes`)
    setShowForm(false); loadOrders()
    setTimeout(() => setMsg(''), 4000)
  }

  const handleEntregar = async (id) => {
    const fecha = window.prompt('Fecha de entrega (AAAA-MM-DD):', new Date().toISOString().split('T')[0])
    if (!fecha) return
    await supabase.from('shoe_orders').update({ estado: 'entregado', fecha_entrega: fecha }).eq('id', id)
    loadOrders()
  }

  const handleEntregarGrupo = async (groupId) => {
    const fecha = window.prompt('Fecha de entrega para todo el pedido (AAAA-MM-DD):', new Date().toISOString().split('T')[0])
    if (!fecha) return
    await supabase.from('shoe_orders').update({ estado: 'entregado', fecha_entrega: fecha }).eq('group_id', groupId)
    loadOrders()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este item?')) return
    await supabase.from('shoe_orders').delete().eq('id', id)
    loadOrders()
  }

  const togglePlayer = (id) => {
    setSelectedPlayers(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleGenerarReporte = async () => {
    if (!selectedPlayers.length) { setMsg('Selecciona al menos un jugador'); return }
    setGenerando(true)
    try {
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .in('player_id', selectedPlayers)
        .eq('type', 'expense')

      const jugadoresSeleccionados = players.filter(p => selectedPlayers.includes(p.id))
      const doc = generarReporteCalzadoPDF({
        jugadores: jugadoresSeleccionados,
        ordenes: orders,
        transacciones: txData || [],
      })
      doc.save(`Reporte_Calzado_NFC_${new Date().getFullYear()}.pdf`)
    } catch (e) {
      console.error(e)
      setMsg('Error generando reporte: ' + e.message)
    }
    setGenerando(false)
  }

  const playerMap = {}
  players.forEach(p => { playerMap[p.id] = p })

  // Map transaction_id → transaction para mostrar info de factura
  const txMap = {}
  transactions.forEach(t => { txMap[t.id] = t })

  const filtered = orders.filter(o => {
    const p = playerMap[o.player_id]
    const matchSearch = !search || p?.name?.toLowerCase().includes(search.toLowerCase())
    const matchEstado = filterEstado === 'todos' || o.estado === filterEstado
    return matchSearch && matchEstado
  })

  const groupMap = {}
  filtered.forEach(o => {
    const key = o.group_id || o.id
    if (!groupMap[key]) groupMap[key] = { fecha: o.fecha_pedido, group_id: o.group_id, items: [] }
    groupMap[key].items.push(o)
  })
  const groupList = Object.values(groupMap).sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

  return (
    <div>
      {/* Modal vincular factura */}
      {modalFactura && (
        <ModalVincularFactura
          orden={modalFactura}
          playerName={playerMap[modalFactura.player_id]?.name || '—'}
          onVincular={() => { setModalFactura(null); loadOrders() }}
          onClose={() => setModalFactura(null)}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 1.5 }}>PEDIDOS DE BOTINES</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowReporte(r => !r)}
            style={{ fontSize: 11, padding: '6px 14px', borderRadius: 3, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              border: `1px solid rgba(201,168,76,0.3)`,
              background: showReporte ? 'rgba(201,168,76,0.15)' : 'transparent', color: GOLD }}>
            📄 REPORTE CALZADO
          </button>
          <button className="btn-gold" onClick={openNew}>+ NUEVO PEDIDO</button>
        </div>
      </div>

      {msg && (
        <div style={{ marginBottom: 12, fontSize: 13, padding: '8px 12px', borderRadius: 5,
          background: msg.startsWith('✓') ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
          border: `1px solid ${msg.startsWith('✓') ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
          color: msg.startsWith('✓') ? '#4ade80' : '#f87171' }}>
          {msg}
        </div>
      )}

      {/* Panel reporte */}
      {showReporte && (
        <div className="card" style={{ marginBottom: 16, border: '1px solid rgba(201,168,76,0.25)' }}>
          <div style={{ fontSize: 11, color: GOLD, fontWeight: 600, letterSpacing: 1.5, marginBottom: 12 }}>
            SELECCIONAR JUGADORES PARA EL REPORTE
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={() => setSelectedPlayers(players.map(p => p.id))}
              style={{ fontSize: 11, padding: '4px 12px', borderRadius: 3, border: '1px solid rgba(74,222,128,0.3)', background: 'transparent', color: '#4ade80', cursor: 'pointer', fontFamily: 'inherit' }}>
              Seleccionar todos
            </button>
            <button onClick={() => setSelectedPlayers([])}
              style={{ fontSize: 11, padding: '4px 12px', borderRadius: 3, border: '1px solid rgba(248,113,113,0.3)', background: 'transparent', color: '#f87171', cursor: 'pointer', fontFamily: 'inherit' }}>
              Deseleccionar todos
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6, marginBottom: 14 }}>
            {players.sort((a, b) => a.name?.localeCompare(b.name)).map(p => {
              const sel = selectedPlayers.includes(p.id)
              const tieneOrdenes = orders.some(o => o.player_id === p.id && o.estado === 'entregado')
              return (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 5, cursor: 'pointer',
                  background: sel ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${sel ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  opacity: tieneOrdenes ? 1 : 0.5 }}>
                  <input type="checkbox" checked={sel} onChange={() => togglePlayer(p.id)} style={{ accentColor: GOLD, width: 14, height: 14 }} />
                  <div>
                    <div style={{ fontSize: 12, color: sel ? GOLD : '#fff', fontWeight: 500 }}>{p.name}</div>
                    {!tieneOrdenes && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Sin entregas</div>}
                  </div>
                </label>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn-gold" onClick={handleGenerarReporte} disabled={generando || !selectedPlayers.length}>
              {generando ? 'GENERANDO...' : `⬇ GENERAR PDF (${selectedPlayers.length} jugador${selectedPlayers.length !== 1 ? 'es' : ''})`}
            </button>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Incluye pedidos y compras históricas</span>
          </div>
        </div>
      )}

      {/* Formulario nuevo pedido */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20, border: '1px solid rgba(201,168,76,0.25)' }}>
          <div style={{ fontSize: 11, color: GOLD, fontWeight: 600, letterSpacing: 1.5, marginBottom: 16 }}>NUEVO PEDIDO</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 20 }}>
            <div><label style={LABEL}>FECHA DEL PEDIDO</label><input style={INPUT} type="date" value={fechaPedido} onChange={e => setFechaPedido(e.target.value)} /></div>
            <div><label style={LABEL}>NOTAS</label><input style={INPUT} value={notasPedido} onChange={e => setNotasPedido(e.target.value)} placeholder="Ej: Compra temporada 2026..." /></div>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 1.5, marginBottom: 10 }}>JUGADORES — {items.length} item(s)</div>
          {items.map((item, idx) => {
            const conv = getConv(item.marca, item.uk)
            return (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: GOLD, fontWeight: 600 }}>ITEM {idx + 1}</span>
                  {items.length > 1 && <button onClick={() => removeItem(idx)} style={{ fontSize: 10, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>✕ Quitar</button>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 10 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={LABEL}>JUGADOR</label>
                    <select style={INPUT} value={item.player_id} onChange={e => updateItem(idx, 'player_id', e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {players.sort((a, b) => a.name?.localeCompare(b.name)).map(p => <option key={p.id} value={p.id}>{p.name}{p.shoe_size ? ` (UK ${p.shoe_size})` : ''}</option>)}
                    </select>
                  </div>
                  <div><label style={LABEL}>MARCA</label><select style={INPUT} value={item.marca} onChange={e => updateItem(idx, 'marca', e.target.value)}>{MARCAS.map(m => <option key={m} value={m}>{MARCAS_LABEL[m]}</option>)}</select></div>
                  <div><label style={LABEL}>TALLA UK</label><input style={INPUT} type="number" step="0.5" value={item.uk} onChange={e => updateItem(idx, 'uk', e.target.value)} placeholder="8.0" /></div>
                  {conv && (
                    <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 6, padding: '8px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>CONV.</div>
                      <div style={{ display: 'flex', gap: 8, fontSize: 12 }}><span style={{ color: GOLD }}>US {conv.us}</span><span style={{ color: 'rgba(255,255,255,0.4)' }}>EU {conv.eu}</span></div>
                    </div>
                  )}
                  <div><label style={LABEL}>MODELO</label><input style={INPUT} value={item.modelo} onChange={e => updateItem(idx, 'modelo', e.target.value)} placeholder="Predator..." /></div>
                  <div><label style={LABEL}>SUELA</label><select style={INPUT} value={item.suela} onChange={e => updateItem(idx, 'suela', e.target.value)}>{SUELAS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div><label style={LABEL}>CATEGORÍA</label><select style={INPUT} value={item.categoria} onChange={e => updateItem(idx, 'categoria', e.target.value)}>{CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label style={LABEL}>PARES</label><input style={INPUT} type="number" min="1" max="10" value={item.pares} onChange={e => updateItem(idx, 'pares', e.target.value)} /></div>
                </div>
              </div>
            )
          })}
          <button onClick={addItem} style={{ width: '100%', padding: 8, marginBottom: 16, fontSize: 12, color: GOLD, background: 'rgba(201,168,76,0.06)', border: '1px dashed rgba(201,168,76,0.3)', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>+ Agregar otro jugador</button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn-gold" onClick={handleSave} disabled={saving}>{saving ? 'GUARDANDO...' : `GUARDAR PEDIDO (${items.filter(i => i.player_id && i.uk).length} items)`}</button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>CANCELAR</button>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Se guardará como PENDIENTE</span>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar jugador..." style={{ ...INPUT, width: 200 }} />
        {['todos', 'pendiente', 'entregado'].map(e => (
          <button key={e} onClick={() => setFilterEstado(e)} style={{ ...TAB_STYLE(filterEstado === e), padding: '5px 14px' }}>
            {e.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Pedidos agrupados */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: GOLD, fontFamily: 'Bebas Neue', letterSpacing: 2 }}>CARGANDO...</div>
      ) : groupList.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: 32 }}>Sin pedidos registrados</div>
      ) : (
        groupList.map((grp, gi) => {
          const allOk = grp.items.every(i => i.estado === 'entregado')
          const pendientes = grp.items.filter(i => i.estado === 'pendiente').length
          return (
            <div key={gi} className="card" style={{ marginBottom: 12, border: `1px solid ${allOk ? 'rgba(74,222,128,0.15)' : 'rgba(201,168,76,0.15)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'Bebas Neue', fontSize: 13, color: GOLD, letterSpacing: 1 }}>PEDIDO {fmtDate(grp.fecha)}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{grp.items.length} item(s) · {grp.items.reduce((a, i) => a + (i.pares || 0), 0)} pares</span>
                  <span className={`pill ${allOk ? 'pill-ok' : 'pill-warn'}`}>{allOk ? '✓ ENTREGADO' : `${pendientes} PENDIENTE(S)`}</span>
                </div>
                {pendientes > 0 && grp.group_id && (
                  <button onClick={() => handleEntregarGrupo(grp.group_id)}
                    style={{ fontSize: 10, padding: '4px 10px', borderRadius: 4, border: '1px solid rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.08)', color: '#4ade80', cursor: 'pointer', fontFamily: 'inherit' }}>
                    ✓ Marcar todo entregado
                  </button>
                )}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr><th>Jugador</th><th>Marca</th><th>UK</th><th>US</th><th>EU</th><th>Modelo</th><th>Suela</th><th>Cat.</th><th>Pares</th><th>Estado</th><th>F.Entrega</th><th>Factura</th><th>Acc.</th></tr>
                  </thead>
                  <tbody>
                    {grp.items.map(o => {
                      const p = playerMap[o.player_id]
                      const factura = o.transaction_id ? txMap[o.transaction_id] : null
                      return (
                        <tr key={o.id}>
                          <td style={{ color: '#fff', fontWeight: 500 }}>{p?.name || '—'}</td>
                          <td>{MARCAS_LABEL[o.marca] || o.marca}</td>
                          <td style={{ color: GOLD, fontWeight: 600 }}>{o.uk}</td>
                          <td>{o.us || '—'}</td><td>{o.eu || '—'}</td>
                          <td>{o.modelo || '—'}</td>
                          <td><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: o.suela === 'FG' ? 'rgba(96,165,250,0.15)' : 'rgba(52,211,153,0.15)', color: o.suela === 'FG' ? '#60a5fa' : '#34d399', border: `1px solid ${o.suela === 'FG' ? 'rgba(96,165,250,0.3)' : 'rgba(52,211,153,0.3)'}` }}>{o.suela}</span></td>
                          <td><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: o.categoria === 'Elite' ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.06)', color: o.categoria === 'Elite' ? GOLD : 'rgba(255,255,255,0.5)', border: `1px solid ${o.categoria === 'Elite' ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.1)'}` }}>{o.categoria}</span></td>
                          <td style={{ textAlign: 'center' }}>{o.pares}</td>
                          <td><span className={`pill ${o.estado === 'entregado' ? 'pill-ok' : 'pill-warn'}`}>{o.estado === 'entregado' ? '✓' : 'PEND.'}</span></td>
                          <td style={{ whiteSpace: 'nowrap', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{o.fecha_entrega ? fmtDate(o.fecha_entrega) : '—'}</td>
                          {/* Columna factura */}
                          <td>
                            {factura ? (
                              <div style={{ fontSize: 10 }}>
                                <div style={{ color: '#4ade80', fontWeight: 600 }}>{fmtCLP(factura.amount)}</div>
                                <div style={{ color: 'rgba(255,255,255,0.3)' }}>{factura.documento_respaldo || '—'}</div>
                              </div>
                            ) : (
                              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Sin vincular</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {o.estado === 'pendiente' && (
                                <button onClick={() => handleEntregar(o.id)} style={{ fontSize: 10, padding: '3px 6px', borderRadius: 3, border: '1px solid rgba(74,222,128,0.3)', background: 'transparent', color: '#4ade80', cursor: 'pointer', fontFamily: 'inherit' }}>✓</button>
                              )}
                              {o.estado === 'entregado' && (
                                <button onClick={() => setModalFactura(o)}
                                  style={{ fontSize: 10, padding: '3px 6px', borderRadius: 3, border: `1px solid ${factura ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.2)'}`, background: 'transparent', color: factura ? GOLD : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'inherit' }}>
                                  📎
                                </button>
                              )}
                              <button onClick={() => handleDelete(o.id)} style={{ fontSize: 10, padding: '3px 6px', borderRadius: 3, border: '1px solid rgba(248,113,113,0.3)', background: 'transparent', color: '#f87171', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })
      )}

      {/* Tabla referencia tallas */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 1.5, marginBottom: 12 }}>TALLAS POR JUGADOR</div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Jugador</th><th>UK</th><th>Adidas US</th><th>Adidas EU</th><th>Nike US</th><th>Nike EU</th><th>Skechers US</th><th>Skechers EU</th></tr></thead>
            <tbody>
              {players.filter(p => p.shoe_size).sort((a, b) => a.name?.localeCompare(b.name)).map(p => {
                const uk = parseFloat(p.shoe_size)
                const ms = p.gender === 'F' ? 'skechers_w' : 'skechers'
                const ad = shoeSizes.find(s => s.marca === 'adidas' && parseFloat(s.uk) === uk)
                const nk = shoeSizes.find(s => s.marca === 'nike' && parseFloat(s.uk) === uk)
                const sk = shoeSizes.find(s => s.marca === ms && parseFloat(s.uk) === uk)
                return (
                  <tr key={p.id}>
                    <td style={{ color: '#fff', fontWeight: 500 }}>{p.name}</td>
                    <td style={{ color: GOLD, fontWeight: 700 }}>{p.shoe_size}</td>
                    <td>{ad?.us || '—'}</td><td>{ad?.eu || '—'}</td>
                    <td>{nk?.us || '—'}</td><td>{nk?.eu || '—'}</td>
                    <td>{sk?.us || '—'}{p.gender === 'F' ? ' W' : ''}</td><td>{sk?.eu || '—'}</td>
                  </tr>
                )
              })}
              {!players.filter(p => p.shoe_size).length && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: 16 }}>Sin tallas registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── PlayersAdmin principal ───────────────────────────────────────────────────
export default function PlayersAdmin() {
  const navigate = useNavigate()
  const [players, setPlayers] = useState([])
  const [clubContracts, setClubContracts] = useState([])
  const [agencyContracts, setAgencyContracts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('players')
  const [modal, setModal] = useState(null)
  const [expandedPlayer, setExpandedPlayer] = useState(null)

  const load = async () => {
    setLoading(true)
    const [p, cc, ac, tx] = await Promise.all([
      supabase.from('players').select('*').order('name'),
      supabase.from('club_contracts').select('*').order('fecha_inicio', { ascending: false }),
      supabase.from('agency_contracts').select('*,players(name)').order('contract_date', { ascending: false }),
      supabase.from('transactions').select('*,players(name)').order('transaction_date', { ascending: false }),
    ])
    setPlayers(p.data || [])
    setClubContracts(cc.data || [])
    setAgencyContracts(ac.data || [])
    setTransactions(tx.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const activeClubMap = {}
  clubContracts.forEach(c => {
    if (!activeClubMap[c.player_id] && c.contract_active) activeClubMap[c.player_id] = c
  })

  const openNuevoClub = (playerId, playerName) => {
    const ultimo = clubContracts
      .filter(c => c.player_id === playerId)
      .sort((a, b) => new Date(b.fecha_inicio || b.created_at) - new Date(a.fecha_inicio || a.created_at))[0]
    const base = ultimo ? { ...ultimo, id: null, tipo: 'Renovación', fecha_inicio: '', fecha_fin: '', salary: '', commission_percentage: '', commission_fixed: '', contract_pdf_url: '', contract_active: true } : null
    setModal({ type: 'club', data: base, playerId, playerName })
  }

  const openNuevoAgency = (playerId, playerName) => {
    const ultimo = agencyContracts
      .filter(c => c.player_id === playerId)
      .sort((a, b) => new Date(b.contract_date || b.created_at) - new Date(a.contract_date || a.created_at))[0]
    const base = ultimo ? { ...ultimo, id: null, tipo: 'Renovación', incorporation_date: '', contract_date: '', contract_duration_months: '', contract_pdf_url: '', contract_active: true } : null
    setModal({ type: 'agency', data: base, playerId, playerName })
  }

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
            {modal.type === 'club' && <ClubContractForm contract={modal.data} playerId={modal.playerId} playerName={modal.playerName} players={players} onSave={closeModal} onCancel={closeModal} />}
            {modal.type === 'agency' && <AgencyContractForm contract={modal.data} playerId={modal.playerId} playerName={modal.playerName} players={players} onSave={closeModal} onCancel={closeModal} />}
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
        <button style={TAB_STYLE(tab === 'players')} onClick={() => setTab('players')}>Plantel ({players.length})</button>
        <button style={TAB_STYLE(tab === 'contracts')} onClick={() => setTab('contracts')}>Contratos ({clubContracts.length + agencyContracts.length})</button>
        <button style={TAB_STYLE(tab === 'transactions')} onClick={() => setTab('transactions')}>Transacciones ({transactions.length})</button>
        <button style={TAB_STYLE(tab === 'docs')} onClick={() => setTab('docs')}>Docs Especiales</button>
        <button style={TAB_STYLE(tab === 'pedidos')} onClick={() => setTab('pedidos')}>👟 Pedidos</button>
      </div>

      {/* PLANTEL */}
      {tab === 'players' && (
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o RUT..."
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 5, padding: '7px 12px', fontSize: 12, color: '#fff', fontFamily: 'inherit', outline: 'none', width: 260, marginBottom: 12 }} />
          <div className="card" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr><th>Nombre</th><th>RUT</th><th>Posición</th><th>Club</th><th>Nacimiento</th><th>Altura</th><th>Peso</th><th>Pie</th><th>Estado</th><th>Landing</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const ci = activeClubMap[p.id] || {}
                  return (
                    <tr key={p.id}>
                      <td style={{ color: '#fff', fontWeight: 500 }}>{p.name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{formatRut(p.rut) || '—'}</td>
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
                          <button style={GHOST_BTN} onClick={() => openNuevoClub(p.id, p.name)}>+ Club</button>
                          <button style={GHOST_BTN} onClick={() => openNuevoAgency(p.id, p.name)}>+ Agencia</button>
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

      {/* CONTRATOS */}
      {tab === 'contracts' && (
        <>
          <div className="section-title">HISTORIAL CONTRATOS CON CLUBES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {players.map(p => {
              const contratos = clubContracts.filter(c => c.player_id === p.id)
              if (!contratos.length) return null
              const isOpen = expandedPlayer === `club-${p.id}`
              return (
                <div key={p.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div onClick={() => setExpandedPlayer(isOpen ? null : `club-${p.id}`)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#fff', fontSize: 13 }}>{p.name}</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{contratos.length} contrato(s)</span>
                      {contratos.filter(c => c.contract_active).length > 0 && <span className="pill pill-ok">ACTIVO</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button onClick={e => { e.stopPropagation(); openNuevoClub(p.id, p.name) }}
                        style={{ fontSize: 10, padding: '3px 8px', borderRadius: 3, border: `1px solid rgba(201,168,76,0.3)`, background: 'transparent', color: GOLD, cursor: 'pointer', fontFamily: 'inherit' }}>
                        + Nuevo
                      </button>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
                      <table>
                        <thead><tr><th>Tipo</th><th>Club</th><th>Posición</th><th>Inicio</th><th>Fin</th><th>Salario</th><th>Comisión</th><th>Estado</th><th>PDF</th><th>Acc.</th></tr></thead>
                        <tbody>
                          {contratos.map(c => (
                            <tr key={c.id}>
                              <td><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, color: TIPO_COLORS[c.tipo] || GOLD, background: (TIPO_COLORS[c.tipo] || GOLD) + '22', border: `1px solid ${(TIPO_COLORS[c.tipo] || GOLD)}44` }}>{c.tipo}</span></td>
                              <td style={{ color: '#fff', fontWeight: 500 }}>{c.club_name}{c.club_destino ? ` → ${c.club_destino}` : ''}</td>
                              <td>{c.position || '—'}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(c.fecha_inicio)}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(c.fecha_fin)}</td>
                              <td>{fmt$(c.salary)}</td>
                              <td>{c.commission_percentage ? c.commission_percentage + '%' : fmt$(c.commission_fixed)}</td>
                              <td><span className={`pill ${c.contract_active ? 'pill-ok' : 'pill-off'}`}>{c.contract_active ? 'VIGENTE' : 'INACTIVO'}</span></td>
                              <td>{c.contract_pdf_url ? <a href={c.contract_pdf_url} target="_blank" rel="noreferrer" style={{ color: GOLD, fontSize: 10 }}>Ver PDF</a> : '—'}</td>
                              <td><button style={EDIT_BTN} onClick={() => setModal({ type: 'club', data: c, playerId: p.id, playerName: p.name })}>Editar</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
            {!clubContracts.length && <div className="card" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: 24 }}>Sin contratos de club registrados</div>}
          </div>

          <div className="section-title">HISTORIAL CONTRATOS CON AGENCIA</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {players.map(p => {
              const contratos = agencyContracts.filter(c => c.player_id === p.id)
              if (!contratos.length) return null
              const isOpen = expandedPlayer === `agency-${p.id}`
              return (
                <div key={p.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div onClick={() => setExpandedPlayer(isOpen ? null : `agency-${p.id}`)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#fff', fontSize: 13 }}>{p.name}</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{contratos.length} contrato(s)</span>
                      {contratos.filter(c => c.contract_active).length > 0 && <span className="pill pill-ok">ACTIVO</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button onClick={e => { e.stopPropagation(); openNuevoAgency(p.id, p.name) }}
                        style={{ fontSize: 10, padding: '3px 8px', borderRadius: 3, border: `1px solid rgba(201,168,76,0.3)`, background: 'transparent', color: GOLD, cursor: 'pointer', fontFamily: 'inherit' }}>
                        + Renovar
                      </button>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
                      <table>
                        <thead><tr><th>Tipo</th><th>Incorporación</th><th>Inicio</th><th>Duración</th><th>Estado</th><th>PDF</th><th>Acc.</th></tr></thead>
                        <tbody>
                          {contratos.map(c => {
                            const end = c.contract_date && c.contract_duration_months ? new Date(c.contract_date) : null
                            if (end) end.setMonth(end.getMonth() + c.contract_duration_months)
                            const days = end ? Math.floor((end - Date.now()) / (24 * 3600 * 1000)) : null
                            const pc = !end ? 'pill-warn' : days > 90 ? 'pill-ok' : days > 0 ? 'pill-warn' : 'pill-urg'
                            const es = !end ? 'SIN FECHA' : days > 90 ? 'VIGENTE' : days > 0 ? 'POR VENCER' : 'VENCIDO'
                            return (
                              <tr key={c.id}>
                                <td><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, color: c.tipo === 'Renovación' ? '#60a5fa' : GOLD, background: c.tipo === 'Renovación' ? 'rgba(96,165,250,0.15)' : 'rgba(201,168,76,0.15)', border: `1px solid ${c.tipo === 'Renovación' ? 'rgba(96,165,250,0.3)' : 'rgba(201,168,76,0.3)'}` }}>{c.tipo || 'Contrato'}</span></td>
                                <td>{fmtDate(c.incorporation_date)}</td>
                                <td>{fmtDate(c.contract_date)}</td>
                                <td>{c.contract_duration_months ? c.contract_duration_months + ' meses' : '—'}</td>
                                <td><span className={`pill ${pc}`}>{es}</span></td>
                                <td>{c.contract_pdf_url ? <a href={c.contract_pdf_url} target="_blank" rel="noreferrer" style={{ color: GOLD, fontSize: 10 }}>Ver PDF</a> : '—'}</td>
                                <td><button style={EDIT_BTN} onClick={() => setModal({ type: 'agency', data: c, playerId: p.id, playerName: p.name })}>Editar</button></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
            {!agencyContracts.length && <div className="card" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: 24 }}>Sin contratos de agencia registrados</div>}
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

      {tab === 'docs' && <DocsEspeciales />}
      {tab === 'pedidos' && <PedidosTab players={players} />}
    </div>
  )
}
