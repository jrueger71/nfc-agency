import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { generarAutorizacionPDF, generarPoderEspecialPDF } from '../lib/generarAutorizacion'

const GOLD = '#C9A84C'
const INPUT = {
  width: '100%', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(201,168,76,0.2)', borderRadius: 6,
  padding: '9px 12px', fontSize: 13, color: '#fff',
  fontFamily: 'inherit', outline: 'none',
}
const LABEL = {
  fontSize: 10, color: 'rgba(255,255,255,0.45)',
  letterSpacing: 1, display: 'block', marginBottom: 4, fontWeight: 600,
}

function fmtDateLong(dateStr) {
  if (!dateStr) return ''
  // Parse as local date to avoid UTC offset shifting the day
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function DocsEspeciales() {
  const [players, setPlayers] = useState([])
  const [generating, setGenerating] = useState(false)
  const [clubMap, setClubMap] = useState({})
  const [subTab, setSubTab] = useState('autorizacion')
  const [clubInfoMap, setClubInfoMap] = useState({})
  const [msg, setMsg] = useState('')

  // Agente externo
  const [agenteNombre, setAgenteNombre] = useState('')
  const [agenteLicencia, setAgenteLicencia] = useState('')

  // Jugadores seleccionados
  const [jugadoresSeleccionados, setJugadoresSeleccionados] = useState([])
  // Para agregar jugador
  const [playerSearch, setPlayerSearch] = useState('')

  // Clubes
  const [clubes, setClubes] = useState([{ nombre: '', pais: '' }])

  // Comisión
  const [incluyeComision, setIncluyeComision] = useState(true)
  const [firmante, setFirmante] = useState('aldo')
  const [comisionNFC, setComisionNFC] = useState(50)
  const [comisionExterno, setComisionExterno] = useState(50)

  // Fechas y ciudad
  const [ciudad, setCiudad] = useState('Santiago de Chile')
  const [fechaDoc, setFechaDoc] = useState(new Date().toISOString().split('T')[0])
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0])
  const [fechaTermino, setFechaTermino] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('players').select('id,name,rut,estado').order('name'),
      supabase.from('club_info').select('player_id,club_name,contract_active'),
    ]).then(([{data: pl}, {data: ci}]) => {
      setPlayers(pl || [])
      const map = {}
      const fullMap = {}
      if (ci) ci.forEach(c => { if (c.contract_active) { map[c.player_id] = c.club_name; fullMap[c.player_id] = c } })
      setClubMap(map)
      setClubInfoMap(fullMap)
    })
  }, [])

  const filteredPlayers = players.filter(p =>
    !jugadoresSeleccionados.find(j => j.id === p.id) &&
    p.name.toLowerCase().includes(playerSearch.toLowerCase())
  )

  const addJugador = (player) => {
    setJugadoresSeleccionados(prev => [...prev, { id: player.id, nombre: player.name, rut: player.rut || '', clubActual: clubMap[player.id] || '' }])
    setPlayerSearch('')
  }

  const updateJugadorClub = (id, club) => {
    setJugadoresSeleccionados(prev => prev.map(j => j.id === id ? {...j, clubActual: club} : j))
  }

  const removeJugador = (id) => {
    setJugadoresSeleccionados(prev => prev.filter(j => j.id !== id))
  }

  const addClub = () => setClubes(prev => [...prev, { nombre: '', pais: '' }])
  const removeClub = (i) => setClubes(prev => prev.filter((_, idx) => idx !== i))
  const updateClub = (i, field, value) => {
    setClubes(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c))
  }

  const buildDatos = () => ({
    ciudad,
    fecha: fmtDateLong(fechaDoc),
    agenteExterno: { nombre: agenteNombre, licencia: agenteLicencia },
    jugadores: jugadoresSeleccionados,
    clubes: clubes.filter(c => c.nombre),
    incluyeComision,
    comisionNFC: parseInt(comisionNFC),
    comisionExterno: parseInt(comisionExterno),
    fechaInicio: fmtDateLong(fechaInicio),
    fechaTermino: fmtDateLong(fechaTermino),
    firmante,
  })

  const validate = () => {
    if (!agenteNombre) { setMsg('Ingresa el nombre del agente externo'); return false }
    if (!agenteLicencia) { setMsg('Ingresa la licencia FIFA del agente externo'); return false }
    if (jugadoresSeleccionados.length === 0) { setMsg('Agrega al menos un jugador'); return false }
    if (!fechaTermino) { setMsg('Ingresa la fecha de término'); return false }
    return true
  }

  const handleGenerarPoder = async () => {
    if (!validate()) return
    setGenerating(true); setMsg('')
    try {
      const doc = generarPoderEspecialPDF(buildDatos())
      const safeName = agenteNombre.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'')
      doc.save(`PoderEspecial_NFC_${safeName}_${fechaDoc}.pdf`)
      setMsg('✓ Poder Especial generado correctamente')
    } catch(e) { setMsg('Error: ' + e.message) }
    setGenerating(false)
  }

  const handleGenerar = async () => {
    if (!validate()) return
    setGenerating(true); setMsg('')
    try {
      const doc = generarAutorizacionPDF(buildDatos())
      const safeName = agenteNombre.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'')
      doc.save(`Autorizacion_NFC_${safeName}_${fechaDoc}.pdf`)
      setMsg('✓ Autorización generada correctamente')
    } catch(e) { setMsg('Error: ' + e.message) }
    setGenerating(false)
  }

  const GOLD_C = '#C9A84C'
  const TAB_STYLE = (active) => ({
    padding: '7px 14px', fontSize: 11, fontWeight: 600, letterSpacing: .5,
    borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
    background: active ? GOLD_C : 'transparent',
    color: active ? '#0f1a3a' : 'rgba(255,255,255,0.45)',
    border: active ? `1px solid ${GOLD_C}` : '1px solid rgba(201,168,76,0.2)',
  })

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap'}}>
        <button style={TAB_STYLE(subTab==='autorizacion')} onClick={()=>setSubTab('autorizacion')}>Autorización / Poder</button>
        <button style={TAB_STYLE(subTab==='listado')} onClick={()=>setSubTab('listado')}>Nómina de Jugadores</button>
        <button style={TAB_STYLE(subTab==='conflicto')} onClick={()=>setSubTab('conflicto')}>Declaración Conflicto</button>
      </div>

      {subTab === 'listado' && <ListadoJugadores players={players} clubMap={clubInfoMap} />}
      {subTab === 'conflicto' && <DeclaracionConflicto />}
      {subTab === 'autorizacion' && <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="bebas" style={{ fontSize: 18, letterSpacing: 2, color: GOLD }}>
          AUTORIZACIÓN EXCLUSIVA DE GESTIÓN
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-gold" onClick={handleGenerar} disabled={generating}>
            {generating ? 'GENERANDO...' : '📄 AUTORIZACIÓN EXCLUSIVA'}
          </button>
          <button className="btn-ghost" onClick={handleGenerarPoder} disabled={generating}
            style={{ fontSize: 13, padding: '8px 16px' }}>
            {generating ? 'GENERANDO...' : '📄 PODER ESPECIAL'}
          </button>
        </div>
      </div>
      {msg && (
        <div style={{ marginBottom: 16, fontSize: 13, color: msg.startsWith('✓') ? '#4ade80' : '#f87171' }}>
          {msg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Columna izquierda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Agente externo */}
          <div className="card">
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 1.5, marginBottom: 14 }}>
              AGENTE EXTERNO
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={LABEL}>NOMBRE COMPLETO</label>
              <input style={INPUT} value={agenteNombre} onChange={e => setAgenteNombre(e.target.value)}
                placeholder="Ej: LIOR DAHAN" />
            </div>
            <div>
              <label style={LABEL}>LICENCIA FIFA</label>
              <input style={INPUT} value={agenteLicencia} onChange={e => setAgenteLicencia(e.target.value)}
                placeholder="Ej: 202412-9505" />
            </div>
          </div>

          {/* Jugadores */}
          <div className="card">
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 1.5, marginBottom: 14 }}>
              JUGADORES AUTORIZADOS
            </div>

            {/* Seleccionados */}
            {jugadoresSeleccionados.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                {jugadoresSeleccionados.map(j => (
                  <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 5, marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{j.nombre}</div>
                      {j.rut && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>RUT: {j.rut}</div>}
                      <input style={{ ...INPUT, marginTop: 4, fontSize: 11, padding: '4px 8px' }}
                        value={j.clubActual} onChange={e => updateJugadorClub(j.id, e.target.value)}
                        placeholder="Club actual (opcional — dejar vacío si libre)" />
                    </div>
                    <button onClick={() => removeJugador(j.id)}
                      style={{ fontSize: 11, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Buscador */}
            <div style={{ position: 'relative' }}>
              <label style={LABEL}>AGREGAR JUGADOR</label>
              <input style={INPUT} value={playerSearch}
                onChange={e => setPlayerSearch(e.target.value)}
                placeholder="Buscar por nombre..." />
              {playerSearch && filteredPlayers.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1B2B5E', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 5, zIndex: 10, maxHeight: 180, overflowY: 'auto' }}>
                  {filteredPlayers.slice(0, 8).map(p => (
                    <div key={p.id} onClick={() => addJugador(p)}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {p.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Comisión */}
          <div className="card">
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 1.5, marginBottom: 14 }}>
              COMISIÓN
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <input type="checkbox" id="incluyeComision" checked={incluyeComision}
                onChange={e => setIncluyeComision(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: GOLD, cursor: 'pointer' }} />
              <label htmlFor="incluyeComision" style={{ ...LABEL, margin: 0, cursor: 'pointer', fontSize: 12 }}>
                Incluir distribución de comisión
              </label>
            </div>
            {incluyeComision && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={LABEL}>NFC (%)</label>
                  <input style={INPUT} type="number" min="0" max="100" value={comisionNFC}
                    onChange={e => { setComisionNFC(e.target.value); setComisionExterno(100 - parseInt(e.target.value || 0)) }} />
                </div>
                <div>
                  <label style={LABEL}>AGENTE EXTERNO (%)</label>
                  <input style={INPUT} type="number" min="0" max="100" value={comisionExterno}
                    onChange={e => { setComisionExterno(e.target.value); setComisionNFC(100 - parseInt(e.target.value || 0)) }} />
                </div>
              </div>
            )}
            {!incluyeComision && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                Se incluirá cláusula indicando que la comisión será negociada separadamente.
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Clubes */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 1.5 }}>
                CLUBES / LIGAS AUTORIZADOS (opcional)
              </div>
              <button onClick={addClub} className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }}>
                + Agregar club
              </button>
            </div>
            {clubes.map((club, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 30px', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                <div>
                  {i === 0 && <label style={LABEL}>NOMBRE DEL CLUB</label>}
                  <input style={INPUT} value={club.nombre}
                    onChange={e => updateClub(i, 'nombre', e.target.value)}
                    placeholder="Ej: RSC Anderlecht — dejar vacío si es libre" />
                </div>
                <div>
                  {i === 0 && <label style={LABEL}>PAÍS</label>}
                  <input style={INPUT} value={club.pais}
                    onChange={e => updateClub(i, 'pais', e.target.value)}
                    placeholder="Bélgica" />
                </div>
                <button onClick={() => removeClub(i)} disabled={clubes.length === 1}
                  style={{ padding: '9px 6px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 5, color: '#f87171', cursor: clubes.length === 1 ? 'default' : 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Vigencia y lugar */}
          <div className="card">
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 1.5, marginBottom: 14 }}>
              VIGENCIA Y LUGAR
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={LABEL}>CIUDAD</label>
                <input style={INPUT} value={ciudad} onChange={e => setCiudad(e.target.value)} />
              </div>
              <div>
                <label style={LABEL}>FECHA DEL DOCUMENTO</label>
                <input style={INPUT} type="date" value={fechaDoc} onChange={e => setFechaDoc(e.target.value)} />
              </div>
              <div>
                <label style={LABEL}>FECHA DE INICIO</label>
                <input style={INPUT} type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={LABEL}>FECHA DE TÉRMINO</label>
                <input style={INPUT} type="date" value={fechaTermino} onChange={e => setFechaTermino(e.target.value)} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={LABEL}>FIRMANTE POR LA AGENCIA</label>
                <div style={{ display:'flex', gap:6 }}>
                  {[
                    ['aldo', 'Aldo Maldonado'],
                    ['marcos', 'p.p. Marcos González'],
                    ['jorge', 'p.p. Jorge Rueger'],
                  ].map(([val, lbl]) => (
                    <button key={val} onClick={() => setFirmante(val)}
                      style={{ flex:1, padding:'7px 4px', fontSize:11, borderRadius:5,
                        border: `1px solid ${firmante===val ? GOLD_C : 'rgba(255,255,255,0.1)'}`,
                        background: firmante===val ? 'rgba(201,168,76,0.15)' : 'transparent',
                        color: firmante===val ? GOLD_C : 'rgba(255,255,255,0.4)',
                        cursor:'pointer', fontFamily:'inherit', textAlign:'center' }}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preview resumen */}
          <div className="card" style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <div style={{ fontSize: 11, color: GOLD, fontWeight: 600, letterSpacing: 1.5, marginBottom: 10 }}>
              RESUMEN DEL DOCUMENTO
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>
              <div><span style={{ color: 'rgba(255,255,255,0.35)' }}>Agente:</span> {agenteNombre || '—'} {agenteLicencia ? `(Lic. ${agenteLicencia})` : ''}</div>
              <div><span style={{ color: 'rgba(255,255,255,0.35)' }}>Jugadores:</span> {jugadoresSeleccionados.length > 0 ? jugadoresSeleccionados.map(j => j.nombre).join(', ') : '—'}</div>
              <div><span style={{ color: 'rgba(255,255,255,0.35)' }}>Clubes:</span> {clubes.filter(c => c.nombre).map(c => c.nombre).join(', ') || '—'}</div>
              <div><span style={{ color: 'rgba(255,255,255,0.35)' }}>Comisión:</span> {incluyeComision ? `NFC ${comisionNFC}% / Externo ${comisionExterno}%` : 'A negociar'}</div>
              <div><span style={{ color: 'rgba(255,255,255,0.35)' }}>Vigencia:</span> {fechaInicio ? fmtDateLong(fechaInicio) : '—'} → {fechaTermino ? fmtDateLong(fechaTermino) : '—'}</div>
            </div>
          </div>

        </div>
      </div>
    </div>}
    </div>
  )
}

// ─── SUBCOMPONENTES ───────────────────────────────────────────────────────────

export function ListadoJugadores({ players, clubMap }) {
  const [generating, setGenerating] = useState(false)
  const [msg, setMsg] = useState('')
  const [ciudad, setCiudad] = useState('Santiago de Chile')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [seleccionados, setSeleccionados] = useState({})
  const [estadoOverride, setEstadoOverride] = useState({})
  const [initialized, setInitialized] = useState(false)
  const [columnas, setColumnas] = useState({ rut:true, posicion:true, club:true, estado:true })
  const toggleCol = (col) => setColumnas(prev => ({...prev, [col]:!prev[col]}))

  const GOLD_C = '#C9A84C'
  const INPUT = { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(201,168,76,0.2)', borderRadius:6, padding:'9px 12px', fontSize:13, color:'#fff', fontFamily:'inherit', outline:'none' }
  const LABEL = { fontSize:10, color:'rgba(255,255,255,0.45)', letterSpacing:1, display:'block', marginBottom:4, fontWeight:600 }

  // Init: select all by default
  useEffect(() => {
    if (players.length > 0 && !initialized) {
      const init = {}
      players.forEach(p => { init[p.id] = true })
      setSeleccionados(init)
      setInitialized(true)
    }
  }, [players, initialized])

  const toggleAll = (val) => {
    const next = {}
    players.forEach(p => { next[p.id] = val })
    setSeleccionados(next)
  }

  const toggle = (id) => setSeleccionados(prev => ({ ...prev, [id]: !prev[id] }))

  const fmtDate = (d) => {
    if (!d) return ''
    const [y,m,dd] = d.split('-').map(Number)
    return new Date(y,m-1,dd).toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'})
  }

  const jugadoresIncluidos = players.filter(p => seleccionados[p.id])

  const handleGenerar = async () => {
    if (jugadoresIncluidos.length === 0) { setMsg('Selecciona al menos un jugador'); return }
    setGenerating(true); setMsg('')
    try {
      const { generarListadoJugadoresPDF } = await import('../lib/generarDocEspeciales')
      const jugadoresData = jugadoresIncluidos.map(p => ({
        nombre: p.name,
        rut: p.rut || '',
        posicion: clubMap[p.id]?.position || '',
        club: clubMap[p.id]?.club_name || '',
        contractActive: !!clubMap[p.id]?.contract_active,
        estado: estadoOverride[p.id] || p.estado || 'Activo',
      }))
      const doc = generarListadoJugadoresPDF({ jugadores: jugadoresData, fecha: fmtDate(fecha), ciudad, columnas })
      doc.save(`Nomina_Jugadores_NFC_${fecha}.pdf`)
      setMsg('✓ Nómina generada correctamente')
    } catch(e) { setMsg('Error: ' + e.message) }
    setGenerating(false)
  }

  const totalSel = jugadoresIncluidos.length
  const activos = jugadoresIncluidos.filter(p => clubMap[p.id]?.contract_active).length

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:8}}>
        <div className="bebas" style={{fontSize:18,letterSpacing:2,color:GOLD_C}}>NÓMINA DE JUGADORES</div>
        <button className="btn-gold" onClick={handleGenerar} disabled={generating}>
          {generating ? 'GENERANDO...' : `📄 GENERAR PDF (${totalSel} jugadores)`}
        </button>
      </div>
      {msg && <div style={{marginBottom:16,fontSize:13,color:msg.startsWith('✓')?'#4ade80':'#f87171'}}>{msg}</div>}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
        <div className="card">
          <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',fontWeight:600,letterSpacing:1.5,marginBottom:14}}>DATOS DEL DOCUMENTO</div>
          <div style={{marginBottom:10}}>
            <label style={LABEL}>CIUDAD</label>
            <input style={INPUT} value={ciudad} onChange={e=>setCiudad(e.target.value)}/>
          </div>
          <div>
            <label style={LABEL}>FECHA DE EMISIÓN</label>
            <input style={INPUT} type="date" value={fecha} onChange={e=>setFecha(e.target.value)}/>
          </div>
        </div>
        <div className="card">
          <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',fontWeight:600,letterSpacing:1.5,marginBottom:14}}>RESUMEN</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.6)',lineHeight:2}}>
            <div><span style={{color:'rgba(255,255,255,0.35)'}}>Seleccionados:</span> {totalSel} de {players.length}</div>
            <div><span style={{color:'rgba(255,255,255,0.35)'}}>Con contrato activo:</span> {activos}</div>
            <div><span style={{color:'rgba(255,255,255,0.35)'}}>Sin contrato / libre:</span> {totalSel - activos}</div>
          </div>
        </div>
      </div>

      {/* Selector de columnas */}
      <div className="card" style={{marginBottom:12}}>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',fontWeight:600,letterSpacing:1.5,marginBottom:10}}>COLUMNAS A INCLUIR EN EL PDF</div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          {[['rut','RUT'],['posicion','Posición'],['club','Club'],['estado','Estado']].map(([key,lbl])=>(
            <label key={key} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12,color:columnas[key]?GOLD_C:'rgba(255,255,255,0.4)'}}>
              <input type="checkbox" checked={!!columnas[key]} onChange={()=>toggleCol(key)}
                style={{width:14,height:14,accentColor:GOLD_C,cursor:'pointer'}}/>
              {lbl}
            </label>
          ))}
        </div>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.25)',marginTop:8}}>
          La columna Nombre siempre se incluye. Desmarca las que no quieres mostrar en el PDF.
        </div>
      </div>

      {/* Tabla con checkboxes */}
      <div className="card" style={{overflowX:'auto'}}>
        <div style={{display:'flex',gap:8,marginBottom:10,alignItems:'center'}}>
          <span style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>Seleccionar:</span>
          <button onClick={()=>toggleAll(true)} style={{fontSize:11,padding:'3px 10px',borderRadius:4,border:'1px solid rgba(201,168,76,0.3)',background:'rgba(201,168,76,0.1)',color:GOLD_C,cursor:'pointer',fontFamily:'inherit'}}>Todos</button>
          <button onClick={()=>toggleAll(false)} style={{fontSize:11,padding:'3px 10px',borderRadius:4,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontFamily:'inherit'}}>Ninguno</button>
        </div>
        <table>
          <thead>
            <tr><th style={{width:32}}>✓</th><th>Nombre</th><th>RUT</th><th>Posición</th><th>Club</th><th>Estado BD</th><th style={{width:130}}>Estado en doc.</th></tr>
          </thead>
          <tbody>
            {players.map(p=>(
              <tr key={p.id} style={{opacity:seleccionados[p.id]?1:0.35,cursor:'pointer'}} onClick={()=>toggle(p.id)}>
                <td>
                  <input type="checkbox" checked={!!seleccionados[p.id]} onChange={()=>toggle(p.id)}
                    style={{width:15,height:15,accentColor:GOLD_C,cursor:'pointer'}}/>
                </td>
                <td style={{color:'#fff',fontWeight:500}}>{p.name}</td>
                <td style={{fontFamily:'monospace',fontSize:11}}>{p.rut||'—'}</td>
                <td>{clubMap[p.id]?.position||'—'}</td>
                <td>{clubMap[p.id]?.club_name||'—'}</td>
                <td><span className={`pill ${clubMap[p.id]?.contract_active?'pill-ok':'pill-off'}`}>{clubMap[p.id]?.contract_active?'ACTIVO':'—'}</span></td>
                <td onClick={e=>e.stopPropagation()}>
                  <select value={estadoOverride[p.id]||p.estado||'Activo'}
                    onChange={e=>setEstadoOverride(prev=>({...prev,[p.id]:e.target.value}))}
                    style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(201,168,76,0.2)',borderRadius:4,padding:'3px 6px',fontSize:11,color:'#fff',fontFamily:'inherit',cursor:'pointer',width:'100%'}}>
                    <option value="Activo">Activo</option>
                    <option value="Cadete">Cadete</option>
                    <option value="Libre">Libre</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function DeclaracionConflicto() {
  const [generating, setGenerating] = useState(false)
  const [msg, setMsg] = useState('')
  const [ciudad, setCiudad] = useState('Santiago de Chile')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [exigidoPor, setExigidoPor] = useState('FIFA, AFUCH y ANFP')
  const [declarAdicionales, setDeclarAdicionales] = useState('')

  const GOLD_C = '#C9A84C'
  const INPUT = { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(201,168,76,0.2)', borderRadius:6, padding:'9px 12px', fontSize:13, color:'#fff', fontFamily:'inherit', outline:'none' }
  const LABEL = { fontSize:10, color:'rgba(255,255,255,0.45)', letterSpacing:1, display:'block', marginBottom:4, fontWeight:600 }

  const sugerencias = ['FIFA, AFUCH y ANFP', 'FIFA', 'AFUCH', 'ANFP', 'FIFA y AFUCH', 'FIFA y ANFP']

  const fmtDate = (d) => {
    if (!d) return ''
    const [y,m,dd] = d.split('-').map(Number)
    return new Date(y,m-1,dd).toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'})
  }

  const handleGenerar = async () => {
    setGenerating(true); setMsg('')
    try {
      const { generarDeclaracionConflictoPDF } = await import('../lib/generarDocEspeciales')
      const declaraciones = declarAdicionales.trim()
        ? declarAdicionales.split('\n').filter(l=>l.trim())
        : []
      const doc = generarDeclaracionConflictoPDF({
        ciudad, fecha: fmtDate(fecha), exigidoPor,
        declaraciones,
      })
      doc.save(`Declaracion_ConflictoInteres_NFC_${fecha}.pdf`)
      setMsg('✓ Declaración generada correctamente')
    } catch(e) { setMsg('Error: ' + e.message) }
    setGenerating(false)
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div className="bebas" style={{fontSize:18,letterSpacing:2,color:GOLD_C}}>DECLARACIÓN DE CONFLICTO DE INTERÉS</div>
        <button className="btn-gold" onClick={handleGenerar} disabled={generating}>
          {generating ? 'GENERANDO...' : '📄 GENERAR PDF'}
        </button>
      </div>
      {msg && <div style={{marginBottom:16,fontSize:13,color:msg.startsWith('✓')?'#4ade80':'#f87171'}}>{msg}</div>}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="card">
            <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',fontWeight:600,letterSpacing:1.5,marginBottom:14}}>DATOS DEL DOCUMENTO</div>
            <div style={{marginBottom:10}}>
              <label style={LABEL}>CIUDAD</label>
              <input style={INPUT} value={ciudad} onChange={e=>setCiudad(e.target.value)}/>
            </div>
            <div>
              <label style={LABEL}>FECHA</label>
              <input style={INPUT} type="date" value={fecha} onChange={e=>setFecha(e.target.value)}/>
            </div>
          </div>

          <div className="card">
            <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',fontWeight:600,letterSpacing:1.5,marginBottom:14}}>EXIGIDA POR</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:10}}>
              {sugerencias.map(s=>(
                <button key={s} onClick={()=>setExigidoPor(s)}
                  style={{padding:'4px 10px',fontSize:11,borderRadius:20,border:`1px solid ${exigidoPor===s?GOLD_C:'rgba(255,255,255,0.15)'}`,background:exigidoPor===s?'rgba(201,168,76,0.15)':'transparent',color:exigidoPor===s?GOLD_C:'rgba(255,255,255,0.45)',cursor:'pointer',fontFamily:'inherit'}}>
                  {s}
                </button>
              ))}
            </div>
            <input style={INPUT} value={exigidoPor} onChange={e=>setExigidoPor(e.target.value)} placeholder="O escribe manualmente..."/>
          </div>

          <div className="card">
            <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',fontWeight:600,letterSpacing:1.5,marginBottom:6}}>DECLARACIONES ADICIONALES</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginBottom:8}}>Opcional — una por línea. Se agregarán al final del documento.</div>
            <textarea style={{...INPUT,resize:'vertical',minHeight:80}} value={declarAdicionales}
              onChange={e=>setDeclarAdicionales(e.target.value)}
              placeholder="Ej: Que no tengo relación con..."/>
          </div>
        </div>

        {/* Vista previa del contenido */}
        <div className="card" style={{background:'rgba(201,168,76,0.04)',border:'1px solid rgba(201,168,76,0.2)'}}>
          <div style={{fontSize:11,color:GOLD_C,fontWeight:600,letterSpacing:1.5,marginBottom:14}}>CONTENIDO DEL DOCUMENTO</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',lineHeight:1.9}}>
            <div style={{color:'rgba(255,255,255,0.7)',fontWeight:600,marginBottom:6}}>Declarante: ALDO CAMILO MALDONADO REBOLLEDO</div>
            <div style={{marginBottom:4}}>① Sin vínculos con clubes profesionales</div>
            <div style={{marginBottom:4}}>② No es propietario ni directivo de clubes</div>
            <div style={{marginBottom:4}}>③ Sin remuneraciones de clubes</div>
            <div style={{marginBottom:4}}>④ Actúa en defensa exclusiva de sus jugadores</div>
            <div style={{marginBottom:4}}>⑤ Se compromete a informar conflictos futuros</div>
            <div style={{marginBottom:4}}>⑥ Datos verídicos bajo responsabilidad legal</div>
            {declarAdicionales.trim() && declarAdicionales.split('\n').filter(l=>l.trim()).map((l,i)=>(
              <div key={i} style={{marginBottom:4,color:'rgba(201,168,76,0.7)'}}>+{i+1} {l}</div>
            ))}
            <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.3)',fontSize:10}}>
              Incluye espacio para timbre de notaría (opcional)
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
