import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' })
}

export default function PlayersAdmin() {
  const navigate = useNavigate()
  const [players, setPlayers] = useState([])
  const [clubInfo, setClubInfo] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('players').select('*').order('name'),
      supabase.from('club_info').select('*'),
    ]).then(([p, ci]) => {
      setPlayers(p.data || [])
      setClubInfo(ci.data || [])
      setLoading(false)
    })
  }, [])

  const clubMap = {}
  clubInfo.forEach(c => clubMap[c.player_id] = c)

  const filtered = players.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.rut?.includes(search)
  )

  if (loading) return <div style={{ textAlign:'center', padding:60, fontFamily:'Bebas Neue', color:'#C9A84C', letterSpacing:3 }}>CARGANDO...</div>

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'20px 24px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:8 }}>
        <button onClick={() => navigate('/dashboard')} style={{ fontSize:11, color:'#C9A84C', background:'none', border:'none', cursor:'pointer', fontWeight:600, letterSpacing:.5, fontFamily:'inherit' }}>
          ← VOLVER AL PANEL
        </button>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o RUT..."
          style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(201,168,76,0.2)', borderRadius:5, padding:'7px 12px', fontSize:12, color:'#fff', fontFamily:'inherit', outline:'none', width:240 }}
        />
      </div>

      <div className="section-title">PLANTEL COMPLETO — {filtered.length} jugadores</div>

      <div className="card" style={{ overflowX:'auto' }}>
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
              <th>Pie hábil</th>
              <th>Contrato</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const ci = clubMap[p.id] || {}
              return (
                <tr key={p.id} style={{ cursor:'pointer' }} onClick={() => navigate(`/jugador/${p.id}`)}>
                  <td style={{ color:'#fff', fontWeight:500 }}>{p.name}</td>
                  <td style={{ fontFamily:'monospace', fontSize:11, color:'rgba(255,255,255,0.4)' }}>{p.rut || '—'}</td>
                  <td>{ci.position || p.position || '—'}</td>
                  <td>{ci.club_name || '—'}</td>
                  <td>{fmtDate(p.birth_date)}</td>
                  <td>{p.height ? p.height+' cm' : '—'}</td>
                  <td>{p.weight ? p.weight+' kg' : '—'}</td>
                  <td>{p.skill_foot || '—'}</td>
                  <td>
                    <span className={`pill ${ci.contract_active ? 'pill-ok':'pill-off'}`}>
                      {ci.contract_active ? 'ACTIVO' : '—'}
                    </span>
                  </td>
                </tr>
              )
            })}
            {!filtered.length && (
              <tr><td colSpan={9} style={{ textAlign:'center', color:'rgba(255,255,255,0.25)', padding:24 }}>Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
