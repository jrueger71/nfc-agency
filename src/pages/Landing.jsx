import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const POSITIONS = ['Todos', 'Portero', 'Defensa', 'Mediocampista', 'Delantero']
const COLORS = ['#1B2B5E','#243580','#C9A84C','#7a6025','#0f1a3a']

function initials(name) {
  if (!name) return '?'
  const w = name.trim().split(' ')
  return (w[0][0] + (w[1] ? w[1][0] : '')).toUpperCase()
}

export default function Landing() {
  const [players, setPlayers] = useState([])
  const [filter, setFilter] = useState('Todos')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    supabase
      .from('players_full_info')
      .select('*')
      .order('name')
      .then(({ data }) => {
        setPlayers(data || [])
        setLoading(false)
      })
  }, [])

  const filtered = filter === 'Todos' ? players : players.filter(p => p.position === filter)
  const withContract = players.filter(p => p.club_contract_active).length

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px' }}>
      {/* HERO */}
      <div className="card" style={{ padding: '36px 28px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:180, height:180, borderRadius:'50%', background:'rgba(201,168,76,0.04)', border:'1px solid rgba(201,168,76,0.1)' }} />
        <div style={{ fontSize:9, fontWeight:600, letterSpacing:3, color:'#C9A84C', marginBottom:10 }}>
          AGENCIA DE REPRESENTACIÓN PROFESIONAL
        </div>
        <div className="bebas" style={{ fontSize:40, color:'#fff', lineHeight:1, marginBottom:10 }}>
          NUEVA <span style={{color:'#C9A84C'}}>FÚTBOL</span><br/>CHILE SPA
        </div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', maxWidth:420, lineHeight:1.7, marginBottom:24 }}>
          Representamos y desarrollamos carreras de futbolistas profesionales en Chile y el mundo. Contratos, marketing y gestión integral.
        </div>
        <div style={{ display:'flex', gap:32 }}>
          <div>
            <div className="bebas" style={{ fontSize:30, color:'#C9A84C' }}>{players.length || '—'}</div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', letterSpacing:2 }}>JUGADORES</div>
          </div>
          <div>
            <div className="bebas" style={{ fontSize:30, color:'#C9A84C' }}>{withContract || '—'}</div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', letterSpacing:2 }}>CON CONTRATO</div>
          </div>
          <div>
            <div className="bebas" style={{ fontSize:30, color:'#C9A84C' }}>12</div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', letterSpacing:2 }}>AÑOS</div>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {POSITIONS.map(pos => (
          <button key={pos} onClick={() => setFilter(pos)} style={{
            padding: '5px 14px', fontSize:11, fontWeight:600, letterSpacing:.5,
            borderRadius:3, cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
            background: filter===pos ? '#C9A84C' : 'transparent',
            color: filter===pos ? '#0f1a3a' : 'rgba(255,255,255,0.45)',
            border: filter===pos ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.2)'
          }}>{pos}</button>
        ))}
      </div>

      {/* GRID */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'rgba(255,255,255,0.3)', letterSpacing:2, fontFamily:'Bebas Neue' }}>CARGANDO JUGADORES...</div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(155px,1fr))', gap:12 }}>
          {filtered.map((p, i) => (
            <div key={p.id} onClick={() => navigate(`/jugador/${p.id}`)}
              style={{ background:'#0f1a3a', border:'1px solid rgba(201,168,76,0.12)', borderRadius:8, padding:'18px 12px', textAlign:'center', cursor:'pointer', transition:'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='#C9A84C'; e.currentTarget.style.transform='translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(201,168,76,0.12)'; e.currentTarget.style.transform='translateY(0)' }}>
              <div style={{ width:58, height:58, borderRadius:'50%', margin:'0 auto 12px', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Bebas Neue', fontSize:20, color:'#fff', border:'2px solid rgba(201,168,76,0.25)', background: COLORS[i % COLORS.length], overflow:'hidden' }}>
                {p.photo_url ? <img src={p.photo_url} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'} /> : initials(p.name)}
              </div>
              <div style={{ fontSize:13, fontWeight:600, color:'#fff', marginBottom:2, lineHeight:1.3 }}>{p.name}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginBottom:8 }}>{p.position || '—'}</div>
              <span className={`pill ${p.club_contract_active ? 'pill-ok' : 'pill-off'}`}>
                {p.club_contract_active ? 'CONTRATO ACTIVO' : 'SIN CONTRATO'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
