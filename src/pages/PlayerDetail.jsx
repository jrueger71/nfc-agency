import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

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

function age(bd) {
  if (!bd) return '—'
  return Math.floor((Date.now() - new Date(bd)) / (365.25 * 24 * 3600 * 1000))
}

function initials(name) {
  if (!name) return '?'
  const w = name.trim().split(' ')
  return (w[0][0] + (w[1] ? w[1][0] : '')).toUpperCase()
}

export default function PlayerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('players_full_info')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => { setPlayer(data); setLoading(false) })
  }, [id])

  if (loading) return <div style={{ textAlign:'center', padding:60, fontFamily:'Bebas Neue', color:'#C9A84C', letterSpacing:3 }}>CARGANDO...</div>
  if (!player) return <div style={{ textAlign:'center', padding:60, color:'#94a3b8' }}>Jugador no encontrado</div>

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'20px 24px' }}>
      <button onClick={() => navigate('/')} style={{ fontSize:11, color:'#C9A84C', background:'none', border:'none', cursor:'pointer', fontWeight:600, letterSpacing:.5, marginBottom:16, fontFamily:'inherit' }}>
        ← VOLVER AL PLANTEL
      </button>

      {/* Header */}
      <div className="card" style={{ display:'flex', gap:20, alignItems:'flex-start', flexWrap:'wrap', marginBottom:16 }}>
        <div style={{ width:88, height:88, borderRadius:'50%', border:'2px solid #C9A84C', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Bebas Neue', fontSize:28, color:'#fff', flexShrink:0, overflow:'hidden', background:'#1B2B5E' }}>
          {player.photo_url ? <img src={player.photo_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={player.name} /> : initials(player.name)}
        </div>
        <div>
          <div className="bebas" style={{ fontSize:26, color:'#fff', marginBottom:2 }}>{player.name}</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:10 }}>
            {player.position || '—'} · {player.club_name || 'Sin club'} · {age(player.birth_date)} años
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <span className={`pill ${player.club_contract_active ? 'pill-ok' : 'pill-off'}`}>
              {player.club_contract_active ? 'CONTRATO ACTIVO' : 'SIN CONTRATO'}
            </span>
            {player.transfermarkt_valuation && (
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:3, border:'1px solid rgba(201,168,76,0.2)', color:'rgba(255,255,255,0.45)' }}>
                TM: {player.transfermarkt_valuation}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
        {[
          { n: player.height ? player.height+' cm' : '—', l:'ALTURA' },
          { n: player.weight ? player.weight+' kg' : '—', l:'PESO' },
          { n: player.skill_foot || '—', l:'PIE HÁBIL' },
          { n: player.shoe_size || '—', l:'TALLA ZAPATO' },
        ].map(s => (
          <div key={s.l} className="card" style={{ textAlign:'center', padding:14 }}>
            <div className="bebas" style={{ fontSize:22, color:'#C9A84C' }}>{s.n}</div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', letterSpacing:1 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Contract info */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div className="card">
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', fontWeight:600, letterSpacing:1.5, marginBottom:12 }}>CONTRATO CLUB</div>
          {[
            ['Club', player.club_name || '—'],
            ['Salario', fmt$(player.salary)],
            ['Inicio', fmtDate(player.agency_contract_date)],
            ['Duración', player.agency_contract_duration ? player.agency_contract_duration + ' meses' : '—'],
          ].map(([l,v]) => (
            <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:12 }}>
              <span style={{ color:'rgba(255,255,255,0.35)' }}>{l}</span>
              <span style={{ color:'rgba(255,255,255,0.75)', fontWeight:500 }}>{v}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', fontWeight:600, letterSpacing:1.5, marginBottom:12 }}>CONTRATO AGENCIA</div>
          {[
            ['Incorporación', fmtDate(player.incorporation_date)],
            ['Inicio', fmtDate(player.agency_contract_date)],
            ['Comisión %', player.commission_percentage ? player.commission_percentage + '%' : '—'],
            ['Comisión fija', fmt$(player.commission_fixed)],
          ].map(([l,v]) => (
            <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:12 }}>
              <span style={{ color:'rgba(255,255,255,0.35)' }}>{l}</span>
              <span style={{ color:'rgba(255,255,255,0.75)', fontWeight:500 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
