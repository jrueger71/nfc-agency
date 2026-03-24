import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const GOLD = '#C9A84C'

const EQUIPO = [
  { nombre: 'Aldo Maldonado', rol: 'Fundador · Agente FIFA', fecha_nac: '1978-04-27' },
  { nombre: 'Jorge Rueger', rol: 'Asesor', fecha_nac: '1971-09-30' },
  { nombre: 'Marcos González', rol: 'Socio · Scout', fecha_nac: '1980-06-09' },
]

function getAge(fechaNac) {
  const hoy = new Date()
  const nac = new Date(fechaNac)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad
}

function getDaysUntil(fechaNac) {
  const hoy = new Date()
  const nac = new Date(fechaNac)
  const proxCumple = new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate())
  if (proxCumple < hoy) proxCumple.setFullYear(hoy.getFullYear() + 1)
  return Math.ceil((proxCumple - hoy) / (1000 * 60 * 60 * 24))
}

function fmtFecha(fechaNac) {
  const nac = new Date(fechaNac)
  return nac.toLocaleDateString('es-CL', { day:'2-digit', month:'long' })
}

function initials(name) {
  const w = name.trim().split(' ')
  return (w[0][0] + (w[1] ? w[1][0] : '')).toUpperCase()
}

function BirthdayCard({ nombre, rol, fechaNac, foto, esEquipo }) {
  const days = getDaysUntil(fechaNac)
  const age = getAge(fechaNac)
  const isToday = days === 0
  const isSoon = days <= 7

  const bgColor = isToday ? 'rgba(201,168,76,0.15)' : isSoon ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)'
  const borderColor = isToday ? 'rgba(201,168,76,0.6)' : isSoon ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.06)'

  return (
    <div style={{ background:bgColor, border:`1px solid ${borderColor}`, borderRadius:8, padding:'12px 14px', display:'flex', alignItems:'center', gap:12, transition:'all .2s' }}>
      <div style={{ width:42, height:42, borderRadius:'50%', background: esEquipo ? '#7a6025' : '#1B2B5E', border:`1.5px solid ${isToday?GOLD:'rgba(201,168,76,0.2)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Bebas Neue', fontSize:14, color:'#fff', overflow:'hidden', flexShrink:0 }}>
        {foto ? <img src={foto} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={nombre} onError={e=>e.target.style.display='none'}/> : initials(nombre)}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nombre}</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>{rol} · {fmtFecha(fechaNac)}</div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        {isToday ? (
          <div style={{ fontFamily:'Bebas Neue', fontSize:13, color:GOLD, letterSpacing:1 }}>🎂 HOY!</div>
        ) : (
          <div style={{ fontFamily:'Bebas Neue', fontSize:20, color: isSoon?GOLD:'rgba(255,255,255,0.4)', lineHeight:1 }}>{days}</div>
        )}
        {isToday ? (
          <div style={{ fontSize:10, color:GOLD }}>¡{age} años!</div>
        ) : (
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', letterSpacing:.5 }}>{isToday?'':days===1?'mañana':'días'}</div>
        )}
      </div>
    </div>
  )
}

export default function Cumpleanos() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('players').select('id,name,birth_date,foto_url').not('birth_date','is',null).then(({data}) => {
      setPlayers(data||[])
      setLoading(false)
    })
  }, [])

  // Combine players + equipo
  const todos = [
    ...EQUIPO.map(e => ({ nombre:e.nombre, rol:e.rol, fechaNac:e.fecha_nac, foto:null, esEquipo:true })),
    ...(players.map(p => ({ nombre:p.name, rol:'Jugador representado', fechaNac:p.birth_date, foto:p.foto_url, esEquipo:false }))),
  ]
  .filter(p => p.fechaNac)
  .map(p => ({ ...p, days: getDaysUntil(p.fechaNac) }))
  .sort((a,b) => a.days - b.days)
  .slice(0, 8)

  const hoy = todos.filter(p => p.days === 0)
  const proximos = todos.filter(p => p.days > 0 && p.days <= 30)
  const resto = todos.filter(p => p.days > 30)

  if (loading) return null

  return (
    <div className="card" style={{ marginTop:16 }}>
      <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontWeight:600, letterSpacing:1.5, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
        🎂 CUMPLEAÑOS
      </div>

      {hoy.length > 0 && (
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:9, color:GOLD, letterSpacing:2, fontWeight:600, marginBottom:6 }}>HOY</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {hoy.map(p => <BirthdayCard key={p.nombre} {...p} />)}
          </div>
        </div>
      )}

      {proximos.length > 0 && (
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', letterSpacing:2, fontWeight:600, marginBottom:6 }}>PRÓXIMOS 30 DÍAS</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {proximos.map(p => <BirthdayCard key={p.nombre} {...p} />)}
          </div>
        </div>
      )}

      {resto.length > 0 && (
        <div>
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', letterSpacing:2, fontWeight:600, marginBottom:6 }}>MÁS ADELANTE</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {resto.map(p => <BirthdayCard key={p.nombre} {...p} />)}
          </div>
        </div>
      )}

      {todos.length === 0 && (
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.25)', textAlign:'center', padding:16 }}>Sin fechas de cumpleaños registradas</div>
      )}
    </div>
  )
}
