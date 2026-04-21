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
  return new Date(dateStr).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function DocsEspeciales() {
  const [players, setPlayers] = useState([])
  const [generating, setGenerating] = useState(false)
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
  const [comisionNFC, setComisionNFC] = useState(50)
  const [comisionExterno, setComisionExterno] = useState(50)

  // Fechas y ciudad
  const [ciudad, setCiudad] = useState('Santiago de Chile')
  const [fechaDoc, setFechaDoc] = useState(new Date().toISOString().split('T')[0])
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0])
  const [fechaTermino, setFechaTermino] = useState('')

  useEffect(() => {
    supabase.from('players').select('id,name,rut').order('name')
      .then(({ data }) => setPlayers(data || []))
  }, [])

  const filteredPlayers = players.filter(p =>
    !jugadoresSeleccionados.find(j => j.id === p.id) &&
    p.name.toLowerCase().includes(playerSearch.toLowerCase())
  )

  const addJugador = (player) => {
    setJugadoresSeleccionados(prev => [...prev, { id: player.id, nombre: player.name, rut: player.rut || '', clubActual: '' }])
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

  return (
    <div>
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
    </div>
  )
}
