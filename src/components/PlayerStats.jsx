import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const GOLD = '#C9A84C'
const INPUT = {
  width: '100%', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(201,168,76,0.2)', borderRadius: 5,
  padding: '8px 12px', fontSize: 13, color: '#fff',
  fontFamily: 'inherit', outline: 'none',
}
const LABEL = {
  fontSize: 10, color: 'rgba(255,255,255,0.45)',
  letterSpacing: 1, display: 'block', marginBottom: 4, fontWeight: 600,
}

const TIPOS_CLAUSULA = ['partidos', 'minutos', 'goles', 'asistencias']
const TEMPORADA_ACTUAL = new Date().getFullYear().toString()
const API_KEY = import.meta.env.VITE_API_FOOTBALL_KEY

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

// Color por competencia — dinámico según nombre
function compColor(nombre) {
  const n = nombre?.toLowerCase() || ''
  if (n.includes('primera') || n.includes('liga') && !n.includes('femenina') && !n.includes('ascenso') && !n.includes('segunda')) return { bg: 'rgba(201,168,76,0.15)', color: '#C9A84C' }
  if (n.includes('femenina')) return { bg: 'rgba(244,114,182,0.15)', color: '#f472b6' }
  if (n.includes('ascenso')) return { bg: 'rgba(251,146,60,0.15)', color: '#fb923c' }
  if (n.includes('segunda')) return { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' }
  if (n.includes('copa')) return { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
  if (n.includes('formativo') || n.includes('sub')) return { bg: 'rgba(52,211,153,0.15)', color: '#34d399' }
  if (n.includes('internacional')) return { bg: 'rgba(52,211,153,0.15)', color: '#34d399' }
  if (n.includes('amistoso')) return { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }
  return { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }
}

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

export default function PlayerStats({ player, canEdit = false }) {
  const [stats, setStats] = useState([])
  const [clauses, setClauses] = useState([])
  const [competitions, setCompetitions] = useState([]) // desde Supabase
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('stats')
  const [showStatForm, setShowStatForm] = useState(false)
  const [showClauseForm, setShowClauseForm] = useState(false)
  const [editStat, setEditStat] = useState(null)
  const [editClause, setEditClause] = useState(null)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [filterTemporada, setFilterTemporada] = useState(TEMPORADA_ACTUAL)
  const [filterComp, setFilterComp] = useState('Todas')

  const [statForm, setStatForm] = useState({
    temporada: TEMPORADA_ACTUAL, fecha: new Date().toISOString().split('T')[0],
    rival: '', competencia: '', titular: true,
    minutos: 90, goles: 0, asistencias: 0,
    tarjeta_amarilla: false, tarjeta_roja: false, notas: '',
  })
  const setSF = (k, v) => setStatForm(f => ({ ...f, [k]: v }))

  const [clauseForm, setClauseForm] = useState({
    descripcion: '', tipo: 'partidos', competencia_aplica: 'Todas',
    minutos_minimos: 45, umbral: 10, monto_activacion: '',
    estado: 'pendiente', notas: '',
  })
  const setCF = (k, v) => setClauseForm(f => ({ ...f, [k]: v }))

  // Competencias filtradas por género del jugador y año actual
  const competenciasFiltradas = competitions.filter(c => {
    if (c.genero !== 'Ambos' && c.genero !== player.gender) return false
    return true
  })

  // Etiqueta de competencia: "Liga Segunda División 2026"
  const compLabel = (c) => `${c.nombre} ${c.año}`

  const load = async () => {
    setLoading(true)
    const [{ data: s }, { data: cl }, { data: comp }] = await Promise.all([
      supabase.from('player_stats').select('*').eq('player_id', player.id).order('fecha', { ascending: false }),
      supabase.from('player_clauses').select('*').eq('player_id', player.id).order('created_at'),
      supabase.from('competitions').select('*').eq('activa', true).order('año', { ascending: false }).order('nombre'),
    ])
    setStats(s || [])
    setClauses(cl || [])
    setCompetitions(comp || [])
    // Pre-seleccionar primera competencia disponible si no hay una seleccionada
    if (comp && comp.length > 0 && !statForm.competencia) {
      const primera = comp.find(c => c.genero === 'Ambos' || c.genero === player.gender)
      if (primera) setSF('competencia', compLabel(primera))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [player.id])

  // Actualizar competencia por defecto cuando carguen las competencias
  useEffect(() => {
    if (competitions.length > 0 && !statForm.competencia) {
      const primera = competenciasFiltradas[0]
      if (primera) setStatForm(f => ({ ...f, competencia: compLabel(primera) }))
    }
  }, [competitions])

  const handleSaveStat = async () => {
    if (!statForm.rival) { setMsg('Ingresa el rival'); return }
    if (!statForm.competencia) { setMsg('Selecciona una competencia'); return }
    setSaving(true); setMsg('')
    const payload = {
      player_id: player.id,
      temporada: statForm.temporada,
      fecha: statForm.fecha,
      rival: statForm.rival,
      competencia: statForm.competencia,
      titular: statForm.titular,
      minutos: parseInt(statForm.minutos) || 0,
      goles: parseInt(statForm.goles) || 0,
      asistencias: parseInt(statForm.asistencias) || 0,
      tarjeta_amarilla: statForm.tarjeta_amarilla,
      tarjeta_roja: statForm.tarjeta_roja,
      notas: statForm.notas || null,
      fuente: 'manual',
    }
    let error
    if (editStat) {
      ;({ error } = await supabase.from('player_stats').update(payload).eq('id', editStat.id))
    } else {
      ;({ error } = await supabase.from('player_stats').insert(payload))
    }
    setSaving(false)
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('✓ Partido guardado')
    setShowStatForm(false); setEditStat(null)
    load()
    setTimeout(() => setMsg(''), 3000)
    await checkClauses(payload)
  }

  const checkClauses = async (newStat) => {
    const { data: allStats } = await supabase.from('player_stats').select('*').eq('player_id', player.id)
    const { data: pendingClauses } = await supabase.from('player_clauses').select('*')
      .eq('player_id', player.id).eq('estado', 'pendiente')
    if (!pendingClauses || !allStats) return
    for (const c of pendingClauses) {
      const { valor } = calcularProgreso(c, allStats)
      if (valor >= c.umbral) {
        await supabase.from('player_clauses').update({
          estado: 'activada',
          fecha_activacion: new Date().toISOString().split('T')[0]
        }).eq('id', c.id)
      }
    }
    load()
  }

  const handleSaveClause = async () => {
    if (!clauseForm.descripcion) { setMsg('Ingresa una descripción'); return }
    setSaving(true); setMsg('')
    const payload = {
      player_id: player.id,
      descripcion: clauseForm.descripcion,
      tipo: clauseForm.tipo,
      competencia_aplica: clauseForm.competencia_aplica,
      minutos_minimos: parseInt(clauseForm.minutos_minimos) || 45,
      umbral: parseInt(clauseForm.umbral) || 10,
      monto_activacion: clauseForm.monto_activacion ? parseFloat(clauseForm.monto_activacion) : null,
      estado: clauseForm.estado,
      notas: clauseForm.notas || null,
    }
    let error
    if (editClause) {
      ;({ error } = await supabase.from('player_clauses').update(payload).eq('id', editClause.id))
    } else {
      ;({ error } = await supabase.from('player_clauses').insert(payload))
    }
    setSaving(false)
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('✓ Cláusula guardada')
    setShowClauseForm(false); setEditClause(null)
    load()
    setTimeout(() => setMsg(''), 3000)
  }

  const openEditStat = (s) => {
    setEditStat(s)
    setStatForm({ ...s, tarjeta_amarilla: s.tarjeta_amarilla || false, tarjeta_roja: s.tarjeta_roja || false })
    setShowStatForm(true)
  }

  const openEditClause = (c) => {
    setEditClause(c)
    setClauseForm({ ...c, monto_activacion: c.monto_activacion || '' })
    setShowClauseForm(true)
  }

  const handleDeleteStat = async (id) => {
    if (!window.confirm('¿Eliminar este partido?')) return
    await supabase.from('player_stats').delete().eq('id', id)
    load()
  }

  const handleDeleteClause = async (id) => {
    if (!window.confirm('¿Eliminar esta cláusula?')) return
    await supabase.from('player_clauses').delete().eq('id', id)
    load()
  }

  const handleMarcarPagada = async (id) => {
    await supabase.from('player_clauses').update({ estado: 'pagada' }).eq('id', id)
    load()
  }

  const handleSync = async () => {
    if (!player.api_football_id) {
      setSyncMsg('Este jugador no tiene ID de API-Football. Agrégalo en Editar Jugador.')
      setTimeout(() => setSyncMsg(''), 4000)
      return
    }
    setSyncing(true); setSyncMsg('')
    try {
      const season = filterTemporada || TEMPORADA_ACTUAL
      const res = await fetch(
        `https://v3.football.api-sports.io/players?id=${player.api_football_id}&season=${season}`,
        { headers: { 'x-apisports-key': API_KEY } }
      )
      const data = await res.json()
      const playerData = data?.response?.[0]
      if (!playerData) { setSyncMsg('Jugador no encontrado en API-Football'); setSyncing(false); return }

      const statsAPI = playerData.statistics || []
      let imported = 0

      for (const st of statsAPI) {
        const leagueName = st.league?.name || ''
        let competencia = 'Internacional'
        if (leagueName.toLowerCase().includes('primera') || leagueName.toLowerCase().includes('chile')) competencia = 'Liga'
        else if (leagueName.toLowerCase().includes('copa')) competencia = 'Copa Chile'

        const appearances = st.games?.appearences || 0
        if (!appearances) continue

        const fixtureId = st.league?.id ? parseInt(`${st.league.id}${season}`) : null

        if (fixtureId) {
          const { data: existing } = await supabase.from('player_stats')
            .select('id').eq('player_id', player.id).eq('api_fixture_id', fixtureId).single()
          if (existing) continue
        }

        const payload = {
          player_id: player.id, temporada: season,
          fecha: `${season}-01-01`,
          rival: `Resumen ${leagueName} ${season}`,
          competencia, titular: true,
          minutos: st.games?.minutes || 0,
          goles: st.goals?.total || 0,
          asistencias: st.goals?.assists || 0,
          tarjeta_amarilla: false, tarjeta_roja: false,
          fuente: 'api', api_fixture_id: fixtureId,
          notas: `Importado desde API-Football. Partidos: ${appearances}. Titular: ${st.games?.lineups || 0}`,
        }
        await supabase.from('player_stats').insert(payload)
        imported++
      }

      setSyncMsg(imported > 0
        ? `✓ ${imported} registro(s) importados desde API-Football`
        : 'No hay datos nuevos para importar en esta temporada')
      load()
    } catch (e) {
      setSyncMsg('Error al conectar con API-Football: ' + e.message)
    }
    setSyncing(false)
    setTimeout(() => setSyncMsg(''), 5000)
  }

  // Competencias únicas presentes en los stats del jugador (para filtros)
  const competenciasEnStats = ['Todas', ...new Set(stats.map(s => s.competencia).filter(Boolean))]

  const temporadas = [...new Set(stats.map(s => s.temporada))].sort((a, b) => b.localeCompare(a))
  if (!temporadas.includes(TEMPORADA_ACTUAL)) temporadas.unshift(TEMPORADA_ACTUAL)

  const statsFiltradas = stats.filter(s => {
    const matchT = !filterTemporada || s.temporada === filterTemporada
    const matchC = filterComp === 'Todas' || s.competencia === filterComp
    return matchT && matchC
  })

  const totales = {
    partidos: statsFiltradas.length,
    minutos: statsFiltradas.reduce((a, s) => a + (s.minutos || 0), 0),
    goles: statsFiltradas.reduce((a, s) => a + (s.goles || 0), 0),
    asistencias: statsFiltradas.reduce((a, s) => a + (s.asistencias || 0), 0),
    titulares: statsFiltradas.filter(s => s.titular).length,
    amarillas: statsFiltradas.filter(s => s.tarjeta_amarilla).length,
    rojas: statsFiltradas.filter(s => s.tarjeta_roja).length,
  }

  const TAB = (active) => ({
    padding: '6px 16px', fontSize: 11, fontWeight: 600, letterSpacing: .5,
    borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
    background: active ? GOLD : 'transparent',
    color: active ? '#0f1a3a' : 'rgba(255,255,255,0.45)',
    border: active ? `1px solid ${GOLD}` : '1px solid rgba(201,168,76,0.2)',
  })

  const resetStatForm = () => {
    const primera = competenciasFiltradas[0]
    setStatForm({
      temporada: TEMPORADA_ACTUAL,
      fecha: new Date().toISOString().split('T')[0],
      rival: '', competencia: primera ? compLabel(primera) : '',
      titular: true, minutos: 90, goles: 0, asistencias: 0,
      tarjeta_amarilla: false, tarjeta_roja: false, notas: '',
    })
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 32, color: GOLD, fontFamily: 'Bebas Neue', letterSpacing: 2 }}>
      CARGANDO ESTADÍSTICAS...
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={TAB(tab === 'stats')} onClick={() => setTab('stats')}>
            📊 Estadísticas ({stats.length})
          </button>
          <button style={TAB(tab === 'clausulas')} onClick={() => setTab('clausulas')}>
            📋 Cláusulas ({clauses.length})
          </button>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tab === 'stats' && (
              <>
                <button className="btn-gold" onClick={() => { setEditStat(null); resetStatForm(); setShowStatForm(true) }}>
                  + PARTIDO
                </button>
                <button onClick={handleSync} disabled={syncing}
                  style={{ fontSize: 11, padding: '6px 14px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {syncing ? '⏳ Sincronizando...' : '🔄 API-Football'}
                </button>
              </>
            )}
            {tab === 'clausulas' && (
              <button className="btn-gold" onClick={() => {
                setEditClause(null)
                setClauseForm({ descripcion: '', tipo: 'partidos', competencia_aplica: 'Todas', minutos_minimos: 45, umbral: 10, monto_activacion: '', estado: 'pendiente', notas: '' })
                setShowClauseForm(true)
              }}>
                + CLÁUSULA
              </button>
            )}
          </div>
        )}
      </div>

      {msg && (
        <div style={{ marginBottom: 12, fontSize: 13, padding: '8px 12px', borderRadius: 5,
          background: msg.startsWith('✓') ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
          border: `1px solid ${msg.startsWith('✓') ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
          color: msg.startsWith('✓') ? '#4ade80' : '#f87171' }}>
          {msg}
        </div>
      )}

      {syncMsg && (
        <div style={{ marginBottom: 12, fontSize: 13, padding: '8px 12px', borderRadius: 5,
          background: syncMsg.startsWith('✓') ? 'rgba(74,222,128,0.08)' : 'rgba(201,168,76,0.08)',
          border: `1px solid ${syncMsg.startsWith('✓') ? 'rgba(74,222,128,0.2)' : 'rgba(201,168,76,0.2)'}`,
          color: syncMsg.startsWith('✓') ? '#4ade80' : GOLD }}>
          {syncMsg}
        </div>
      )}

      {/* ── TAB ESTADÍSTICAS ─────────────────────────────────────────────────── */}
      {tab === 'stats' && (
        <>
          {/* Formulario nuevo/editar partido */}
          {showStatForm && canEdit && (
            <div className="card" style={{ marginBottom: 16, border: '1px solid rgba(201,168,76,0.25)' }}>
              <div style={{ fontSize: 11, color: GOLD, fontWeight: 600, letterSpacing: 1.5, marginBottom: 14 }}>
                {editStat ? 'EDITAR PARTIDO' : 'REGISTRAR PARTIDO'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={LABEL}>TEMPORADA</label>
                  <input style={INPUT} value={statForm.temporada} onChange={e => setSF('temporada', e.target.value)} placeholder="2026" />
                </div>
                <div>
                  <label style={LABEL}>FECHA</label>
                  <input style={INPUT} type="date" value={statForm.fecha} onChange={e => setSF('fecha', e.target.value)} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={LABEL}>RIVAL</label>
                  <input style={INPUT} value={statForm.rival} onChange={e => setSF('rival', e.target.value)} placeholder="Colo-Colo, U. Católica..." />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={LABEL}>COMPETENCIA</label>
                  <select style={INPUT} value={statForm.competencia} onChange={e => setSF('competencia', e.target.value)}>
                    <option value="">— Seleccionar —</option>
                    {/* Competencias del año actual primero */}
                    {competenciasFiltradas
                      .filter(c => c.año === parseInt(TEMPORADA_ACTUAL))
                      .map(c => (
                        <option key={c.id} value={compLabel(c)}>{compLabel(c)}</option>
                      ))
                    }
                    {/* Años anteriores agrupados */}
                    {[...new Set(competenciasFiltradas
                      .filter(c => c.año !== parseInt(TEMPORADA_ACTUAL))
                      .map(c => c.año))]
                      .sort((a, b) => b - a)
                      .map(año => (
                        <optgroup key={año} label={`── ${año} ──`}>
                          {competenciasFiltradas
                            .filter(c => c.año === año)
                            .map(c => (
                              <option key={c.id} value={compLabel(c)}>{compLabel(c)}</option>
                            ))
                          }
                        </optgroup>
                      ))
                    }
                  </select>
                  {statForm.competencia && (
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
                      ✓ {statForm.competencia}
                    </div>
                  )}
                </div>
                <div>
                  <label style={LABEL}>MINUTOS</label>
                  <input style={INPUT} type="number" min="0" max="120" value={statForm.minutos} onChange={e => setSF('minutos', e.target.value)} />
                </div>
                <div>
                  <label style={LABEL}>GOLES</label>
                  <input style={INPUT} type="number" min="0" value={statForm.goles} onChange={e => setSF('goles', e.target.value)} />
                </div>
                <div>
                  <label style={LABEL}>ASISTENCIAS</label>
                  <input style={INPUT} type="number" min="0" value={statForm.asistencias} onChange={e => setSF('asistencias', e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'flex-end' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                    <input type="checkbox" checked={statForm.titular} onChange={e => setSF('titular', e.target.checked)} style={{ accentColor: GOLD }} />
                    Titular
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#fbbf24' }}>
                    <input type="checkbox" checked={statForm.tarjeta_amarilla} onChange={e => setSF('tarjeta_amarilla', e.target.checked)} style={{ accentColor: '#fbbf24' }} />
                    🟨 Amarilla
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#f87171' }}>
                    <input type="checkbox" checked={statForm.tarjeta_roja} onChange={e => setSF('tarjeta_roja', e.target.checked)} style={{ accentColor: '#f87171' }} />
                    🟥 Roja
                  </label>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={LABEL}>NOTAS</label>
                  <input style={INPUT} value={statForm.notas} onChange={e => setSF('notas', e.target.value)} placeholder="Observaciones opcionales..." />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-gold" onClick={handleSaveStat} disabled={saving}>
                  {saving ? 'GUARDANDO...' : 'GUARDAR PARTIDO'}
                </button>
                <button className="btn-ghost" onClick={() => { setShowStatForm(false); setEditStat(null) }}>CANCELAR</button>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={filterTemporada} onChange={e => setFilterTemporada(e.target.value)}
              style={{ ...INPUT, width: 'auto', padding: '5px 10px', fontSize: 11 }}>
              <option value="">Todas las temporadas</option>
              {temporadas.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {competenciasEnStats.map(c => (
              <button key={c} onClick={() => setFilterComp(c)}
                style={{ ...TAB(filterComp === c), padding: '4px 12px', fontSize: 10 }}>
                {c === 'Todas' ? 'Todas' : c.replace(/\s\d{4}$/, '')} {/* Quita el año en los botones */}
              </button>
            ))}
          </div>

          {/* Totales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8, marginBottom: 14 }}>
            {[
              { l: 'PARTIDOS', v: totales.partidos, c: '#fff' },
              { l: 'TITULARES', v: totales.titulares, c: 'rgba(255,255,255,0.6)' },
              { l: 'MINUTOS', v: totales.minutos, c: GOLD },
              { l: 'GOLES', v: totales.goles, c: '#4ade80' },
              { l: 'ASISTENCIAS', v: totales.asistencias, c: '#60a5fa' },
              { l: 'AMARILLAS', v: totales.amarillas, c: '#fbbf24' },
              { l: 'ROJAS', v: totales.rojas, c: '#f87171' },
            ].map(s => (
              <div key={s.l} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, color: s.c, lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 3 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Tabla de partidos */}
          {statsFiltradas.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: 24, fontSize: 13 }}>
              Sin partidos registrados
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th><th>Rival</th><th>Competencia</th><th>T.</th>
                    <th>Min</th><th>G</th><th>A</th><th>Tarj.</th><th>Fuente</th>
                    {canEdit && <th>Acc.</th>}
                  </tr>
                </thead>
                <tbody>
                  {statsFiltradas.map(s => {
                    const { bg, color } = compColor(s.competencia)
                    // Mostrar nombre corto (sin año) en la tabla
                    const compNombre = s.competencia?.replace(/\s\d{4}$/, '') || s.competencia
                    return (
                      <tr key={s.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 11 }}>{fmtDate(s.fecha)}</td>
                        <td style={{ color: '#fff', fontWeight: 500 }}>{s.rival}</td>
                        <td>
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600,
                            background: bg, color }} title={s.competencia}>
                            {compNombre}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', color: s.titular ? '#4ade80' : 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                          {s.titular ? '●' : '○'}
                        </td>
                        <td style={{ textAlign: 'center', color: GOLD, fontWeight: 600 }}>{s.minutos}'</td>
                        <td style={{ textAlign: 'center', color: s.goles > 0 ? '#4ade80' : 'rgba(255,255,255,0.3)', fontWeight: s.goles > 0 ? 700 : 400 }}>{s.goles}</td>
                        <td style={{ textAlign: 'center', color: s.asistencias > 0 ? '#60a5fa' : 'rgba(255,255,255,0.3)', fontWeight: s.asistencias > 0 ? 700 : 400 }}>{s.asistencias}</td>
                        <td style={{ textAlign: 'center' }}>
                          {s.tarjeta_roja ? '🟥' : s.tarjeta_amarilla ? '🟨' : '—'}
                        </td>
                        <td>
                          <span style={{ fontSize: 9, padding: '2px 5px', borderRadius: 3,
                            background: s.fuente === 'api' ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.04)',
                            color: s.fuente === 'api' ? '#60a5fa' : 'rgba(255,255,255,0.3)',
                            border: `1px solid ${s.fuente === 'api' ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                            {s.fuente === 'api' ? 'API' : 'Manual'}
                          </span>
                        </td>
                        {canEdit && (
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => openEditStat(s)}
                                style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, border: `1px solid rgba(201,168,76,0.3)`, background: 'transparent', color: GOLD, cursor: 'pointer', fontFamily: 'inherit' }}>
                                Editar
                              </button>
                              <button onClick={() => handleDeleteStat(s.id)}
                                style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, border: '1px solid rgba(248,113,113,0.3)', background: 'transparent', color: '#f87171', cursor: 'pointer', fontFamily: 'inherit' }}>
                                ✕
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── TAB CLÁUSULAS ────────────────────────────────────────────────────── */}
      {tab === 'clausulas' && (
        <>
          {showClauseForm && canEdit && (
            <div className="card" style={{ marginBottom: 16, border: '1px solid rgba(201,168,76,0.25)' }}>
              <div style={{ fontSize: 11, color: GOLD, fontWeight: 600, letterSpacing: 1.5, marginBottom: 14 }}>
                {editClause ? 'EDITAR CLÁUSULA' : 'NUEVA CLÁUSULA'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={LABEL}>DESCRIPCIÓN</label>
                  <input style={INPUT} value={clauseForm.descripcion} onChange={e => setCF('descripcion', e.target.value)}
                    placeholder="Ej: Bono por 10 partidos jugados en Liga" />
                </div>
                <div>
                  <label style={LABEL}>TIPO</label>
                  <select style={INPUT} value={clauseForm.tipo} onChange={e => setCF('tipo', e.target.value)}>
                    {TIPOS_CLAUSULA.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={LABEL}>COMPETENCIA QUE APLICA</label>
                  <select style={INPUT} value={clauseForm.competencia_aplica} onChange={e => setCF('competencia_aplica', e.target.value)}>
                    <option value="Todas">Todas</option>
                    {competenciasFiltradas.map(c => (
                      <option key={c.id} value={compLabel(c)}>{compLabel(c)}</option>
                    ))}
                  </select>
                </div>
                {clauseForm.tipo === 'partidos' && (
                  <div>
                    <label style={LABEL}>MINUTOS MÍNIMOS</label>
                    <input style={INPUT} type="number" value={clauseForm.minutos_minimos} onChange={e => setCF('minutos_minimos', e.target.value)} />
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>Para que cuente el partido</div>
                  </div>
                )}
                <div>
                  <label style={LABEL}>UMBRAL ({clauseForm.tipo})</label>
                  <input style={INPUT} type="number" value={clauseForm.umbral} onChange={e => setCF('umbral', e.target.value)} />
                </div>
                <div>
                  <label style={LABEL}>MONTO ACTIVACIÓN (CLP)</label>
                  <input style={INPUT} type="number" value={clauseForm.monto_activacion} onChange={e => setCF('monto_activacion', e.target.value)} placeholder="50000" />
                </div>
                <div>
                  <label style={LABEL}>ESTADO</label>
                  <select style={INPUT} value={clauseForm.estado} onChange={e => setCF('estado', e.target.value)}>
                    <option value="pendiente">Pendiente</option>
                    <option value="activada">Activada</option>
                    <option value="pagada">Pagada</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={LABEL}>NOTAS</label>
                  <input style={INPUT} value={clauseForm.notas} onChange={e => setCF('notas', e.target.value)} placeholder="Referencia al contrato, observaciones..." />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-gold" onClick={handleSaveClause} disabled={saving}>
                  {saving ? 'GUARDANDO...' : 'GUARDAR CLÁUSULA'}
                </button>
                <button className="btn-ghost" onClick={() => { setShowClauseForm(false); setEditClause(null) }}>CANCELAR</button>
              </div>
            </div>
          )}

          {clauses.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: 24, fontSize: 13 }}>
              Sin cláusulas registradas
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {clauses.map(c => {
                const { valor, porcentaje } = calcularProgreso(c, stats)
                const colorEstado = c.estado === 'pagada' ? '#94a3b8' : c.estado === 'activada' ? '#4ade80' : GOLD
                return (
                  <div key={c.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${c.estado === 'activada' ? 'rgba(74,222,128,0.25)' : c.estado === 'pagada' ? 'rgba(148,163,184,0.15)' : 'rgba(201,168,76,0.15)'}`, borderRadius: 8, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, color: '#fff', fontWeight: 600, marginBottom: 4 }}>{c.descripcion}</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                            {c.tipo.charAt(0).toUpperCase() + c.tipo.slice(1)} · {c.competencia_aplica}
                            {c.tipo === 'partidos' && ` · Min. ${c.minutos_minimos}'`}
                          </span>
                          {c.monto_activacion && (
                            <span style={{ fontSize: 10, color: GOLD, fontWeight: 600 }}>{fmt$(c.monto_activacion)}</span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                          background: colorEstado + '22', color: colorEstado, border: `1px solid ${colorEstado}44` }}>
                          {c.estado.toUpperCase()}
                        </span>
                        {canEdit && (
                          <>
                            {c.estado === 'activada' && (
                              <button onClick={() => handleMarcarPagada(c.id)}
                                style={{ fontSize: 10, padding: '3px 8px', borderRadius: 3, border: '1px solid rgba(148,163,184,0.3)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit' }}>
                                Marcar pagada
                              </button>
                            )}
                            <button onClick={() => openEditClause(c)}
                              style={{ fontSize: 10, padding: '3px 6px', borderRadius: 3, border: `1px solid rgba(201,168,76,0.3)`, background: 'transparent', color: GOLD, cursor: 'pointer', fontFamily: 'inherit' }}>
                              Editar
                            </button>
                            <button onClick={() => handleDeleteClause(c.id)}
                              style={{ fontSize: 10, padding: '3px 6px', borderRadius: 3, border: '1px solid rgba(248,113,113,0.3)', background: 'transparent', color: '#f87171', cursor: 'pointer', fontFamily: 'inherit' }}>
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {c.estado !== 'pagada' && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                            Progreso: {valor} / {c.umbral} {c.tipo}
                          </span>
                          <span style={{ fontSize: 11, color: porcentaje >= 100 ? '#4ade80' : porcentaje >= 80 ? GOLD : 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                            {Math.round(porcentaje)}%
                          </span>
                        </div>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 3, transition: 'width .5s', width: `${porcentaje}%`,
                            background: porcentaje >= 100 ? '#4ade80' : porcentaje >= 80 ? GOLD : 'rgba(201,168,76,0.5)' }} />
                        </div>
                        {porcentaje >= 80 && porcentaje < 100 && (
                          <div style={{ fontSize: 10, color: GOLD, marginTop: 4 }}>
                            ⚡ Faltan {c.umbral - valor} {c.tipo} para activar
                          </div>
                        )}
                        {porcentaje >= 100 && c.estado === 'pendiente' && (
                          <div style={{ fontSize: 10, color: '#4ade80', marginTop: 4 }}>
                            ✓ Umbral alcanzado — cláusula lista para activar
                          </div>
                        )}
                      </div>
                    )}

                    {c.fecha_activacion && (
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                        Activada el {fmtDate(c.fecha_activacion)}
                      </div>
                    )}
                    {c.notas && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6, fontStyle: 'italic' }}>{c.notas}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
