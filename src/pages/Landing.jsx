import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Noticias from './Noticias'

const GOLD = '#C9A84C'
const NAVY2 = '#0f1a3a'

function useCounter(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start || !target) return
    let startTime = null
    const step = (ts) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, start, duration])
  return count
}

function useInView(threshold = 0.3) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView]
}

function ParticleField() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.offsetWidth, y: Math.random() * canvas.offsetHeight,
      r: Math.random() * 2 + 0.5, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.1, gold: Math.random() > 0.6,
    }))
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    window.addEventListener('resize', resize)
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.gold ? `rgba(201,168,76,${p.alpha})` : `rgba(255,255,255,${p.alpha * 0.5})`
        ctx.fill()
      })
      for (let i = 0; i < particles.length; i++) for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 100) {
          ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y)
          ctx.strokeStyle = `rgba(201,168,76,${0.07 * (1 - dist / 100)})`; ctx.lineWidth = 0.5; ctx.stroke()
        }
      }
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
}

function initials(name) {
  if (!name) return '?'
  const w = name.trim().split(' ')
  return (w[0][0] + (w[1] ? w[1][0] : '')).toUpperCase()
}

// Muestra el club actual considerando préstamos/cesiones
function clubDisplay(p) {
  if (!p.club_name && !p.loan_club_name) return null
  if (p.loan_club_name) {
    const tipo = p.loan_tipo?.toLowerCase() || 'préstamo'
    return {
      principal: p.loan_club_name,
      secundario: `${tipo} de ${p.club_name}`,
    }
  }
  return { principal: p.club_name, secundario: null }
}

const POSITIONS = ['Todos', 'Portero', 'Defensa', 'Mediocampista', 'Delantero']

const CLUBS = [
  { name: 'Colo-Colo', abbr: 'CCO' }, { name: 'U. Católica', abbr: 'UCH' },
  { name: 'U. Española', abbr: 'UES' }, { name: 'Cobresal', abbr: 'COB' },
  { name: 'D. Concepción', abbr: 'DCO' }, { name: 'Everton', abbr: 'EVE' },
  { name: 'Audax Italiano', abbr: 'AUD' }, { name: 'Magallanes', abbr: 'MAG' },
]

const TEAM = [
  { name: 'Aldo Maldonado', role: 'Fundador · Agente FIFA', license: 'Licencia FIFA 202406-7288', bio: 'Agente FIFA certificado con amplia trayectoria en representación de futbolistas. Fundó Nueva Fútbol Chile SpA en 2023 con el objetivo de profesionalizar la representación del talento joven chileno.', initials: 'AM', color: '#1B2B5E', photo: 'https://qgjdphqmwgrkwfbxbyhc.supabase.co/storage/v1/object/public/player-media/equipo_aldo.jpg' },
  { name: 'Marcos González', role: 'Socio · Scout', license: 'Scouting & Desarrollo', bio: 'Especialista en detección y desarrollo de talento. Responsable de identificar promesas del fútbol masculino y femenino en todo Chile, construyendo el pipeline de jugadores de la agencia.', initials: 'MG', color: '#243580', photo: 'https://qgjdphqmwgrkwfbxbyhc.supabase.co/storage/v1/object/public/player-media/equipo_marcos.jpg' },
  { name: 'Jorge Rueger', role: 'Asesor', license: 'Gestión & Estrategia', bio: 'Asesor estratégico de la agencia. Apoya la gestión operacional, el desarrollo tecnológico y la planificación de largo plazo para consolidar a Nueva Fútbol Chile como referente regional.', initials: 'JR', color: '#7a6025', photo: 'https://qgjdphqmwgrkwfbxbyhc.supabase.co/storage/v1/object/public/player-media/equipo_jorge.jpg' },
]

export default function Landing() {
  const [players, setPlayers] = useState([])
  const [filter, setFilter] = useState('Todos')
  const [loading, setLoading] = useState(true)
  const [heroVisible, setHeroVisible] = useState(false)
  const [statsRef, statsInView] = useInView(0.4)
  const [contactForm, setContactForm] = useState({ nombre: '', email: '', mensaje: '' })
  const [contactMsg, setContactMsg] = useState('')
  const navigate = useNavigate()

  const countPlayers = useCounter(players.length || 20, 1800, statsInView)
  const countYears = useCounter(3, 1600, statsInView)
  const countContracts = useCounter(players.filter(p => p.club_contract_active).length || 12, 1900, statsInView)

  const [noticias, setNoticias] = useState([])

  useEffect(() => {
    setTimeout(() => setHeroVisible(true), 100)
    Promise.all([
      supabase.from('players_full_info').select('id,name,position,club_name,club_contract_active,loan_club_name,loan_tipo').order('name'),
      supabase.from('players').select('id,foto_url,mostrar_en_landing'),
      supabase.from('noticias').select('*,players(name,foto_url)').eq('visible', true).order('fecha', { ascending: false }).limit(6),
    ]).then(([{ data: pfi }, { data: pp }, { data: nn }]) => {
      const fotoMap = {}
      const landingMap = {}
      if (pp) pp.forEach(p => {
        fotoMap[p.id] = p.foto_url
        landingMap[p.id] = p.mostrar_en_landing
      })
      const merged = (pfi || [])
        .map(p => ({ ...p, foto_url: fotoMap[p.id] || null }))
        .filter(p => landingMap[p.id] === true)
      setPlayers(merged)
      setNoticias(nn || [])
      setLoading(false)
    })
  }, [])

  const filtered = filter === 'Todos' ? players : players.filter(p => p.position === filter)
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  const handleContact = (e) => {
    e.preventDefault()
    setContactMsg('✓ Mensaje recibido. Te contactaremos a la brevedad.')
    setContactForm({ nombre: '', email: '', mensaje: '' })
    setTimeout(() => setContactMsg(''), 5000)
  }

  return (
    <div style={{ background: '#080e1f', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* HERO */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <ParticleField />
        <div style={{ position: 'absolute', top: 0, right: 0, width: '55%', height: '100%', background: 'linear-gradient(135deg, transparent 0%, rgba(27,43,94,0.25) 100%)', clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 60px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center', position: 'relative', zIndex: 1, width: '100%' }}>
          <div style={{ transition: 'all 1s', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(30px)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 4, color: GOLD, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 24, height: 1, background: GOLD }} />
              AGENCIA DE REPRESENTACIÓN · DESDE 2023
            </div>
            <h1 style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(40px,6vw,70px)', color: '#fff', lineHeight: 0.95, letterSpacing: 2, marginBottom: 20 }}>
              NUEVA<br /><span style={{ color: GOLD }}>FÚTBOL</span><br />CHILE SPA
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, maxWidth: 400, marginBottom: 32 }}>
              Representamos y desarrollamos carreras de futbolistas profesionales en Chile y el mundo. Agente FIFA certificado.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => scrollTo('plantel')} style={{ background: GOLD, color: NAVY2, border: 'none', borderRadius: 4, padding: '12px 28px', fontFamily: 'Bebas Neue', fontSize: 15, letterSpacing: 2, cursor: 'pointer' }}>VER JUGADORES</button>
              <button onClick={() => scrollTo('contacto')} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, padding: '12px 28px', fontFamily: 'Bebas Neue', fontSize: 15, letterSpacing: 2, cursor: 'pointer' }}>CONTACTO</button>
            </div>
            <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', gap: 10, opacity: 0.4 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', border: `1px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontFamily: 'Bebas Neue', color: GOLD }}>FIFA</div>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>AGENTE LICENCIADO · ALDO MALDONADO REBOLLEDO</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, transition: 'all 1.2s', opacity: heroVisible ? 1 : 0, transitionDelay: '0.3s' }}>
            {[
              { n: players.length || '20+', l: 'Jugadores representados' },
              { n: players.filter(p => p.club_contract_active).length || '12', l: 'Con contrato activo' },
              { n: '3', l: 'Años de trayectoria' },
            ].map(s => (
              <div key={s.l} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 8, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: 42, color: GOLD, lineHeight: 1, minWidth: 70 }}>{s.n}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS COUNTER */}
      <section ref={statsRef} style={{ background: '#0a1025', borderTop: `1px solid rgba(201,168,76,0.12)`, borderBottom: `1px solid rgba(201,168,76,0.12)`, padding: '48px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 24, textAlign: 'center' }}>
          {[
            { n: countPlayers, s: '+', l: 'JUGADORES' },
            { n: countContracts, s: '', l: 'CON CONTRATO' },
            { n: countYears, s: '', l: 'AÑOS DE TRAYECTORIA' },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(34px,5vw,54px)', color: GOLD, lineHeight: 1 }}>{s.n}{s.s}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, marginTop: 6 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PLANTEL */}
      <section id="plantel" style={{ padding: '72px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 9, letterSpacing: 4, color: GOLD, marginBottom: 10 }}>NUESTROS REPRESENTADOS</div>
          <h2 style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(30px,5vw,50px)', color: '#fff', letterSpacing: 2 }}>EL PLANTEL</h2>
          <div style={{ width: 40, height: 2, background: GOLD, margin: '16px auto 0' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
          {POSITIONS.map(pos => (
            <button key={pos} onClick={() => setFilter(pos)} style={{
              padding: '6px 18px', fontSize: 11, fontWeight: 600, letterSpacing: .5,
              borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
              background: filter === pos ? GOLD : 'transparent',
              color: filter === pos ? NAVY2 : 'rgba(255,255,255,0.45)',
              border: filter === pos ? `1px solid ${GOLD}` : '1px solid rgba(201,168,76,0.2)'
            }}>{pos}</button>
          ))}
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, fontFamily: 'Bebas Neue', color: GOLD, letterSpacing: 3 }}>CARGANDO...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, fontFamily: 'Bebas Neue', color: 'rgba(255,255,255,0.2)', letterSpacing: 3 }}>SIN JUGADORES EN ESTA CATEGORÍA</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
            {filtered.map((p) => {
              const club = clubDisplay(p)
              return (
                <div key={p.id} onClick={() => navigate(`/jugador/${p.id}`)}
                  style={{ background: '#0f1a3a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'border-color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = GOLD}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}>
                  {/* Photo 3/4 */}
                  <div style={{ aspectRatio: '3/4', background: '#1a2540', position: 'relative', overflow: 'hidden' }}>
                    {p.foto_url ? (
                      <img src={p.foto_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                        onError={e => e.target.style.display = 'none'} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue', fontSize: 36, color: 'rgba(201,168,76,0.4)' }}>
                        {initials(p.name)}
                      </div>
                    )}
                    {/* Badge contrato */}
                    <span style={{
                      position: 'absolute', top: 8, left: 8,
                      background: p.club_contract_active ? 'rgba(201,168,76,0.9)' : 'rgba(0,0,0,0.6)',
                      color: p.club_contract_active ? '#0f1a3a' : 'rgba(255,255,255,0.5)',
                      fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 10, letterSpacing: .5,
                    }}>
                      {p.club_contract_active ? 'CONTRATO ACTIVO' : 'SIN CONTRATO'}
                    </span>
                    {/* Badge préstamo */}
                    {p.loan_club_name && (
                      <span style={{
                        position: 'absolute', top: 8, right: 8,
                        background: 'rgba(52,211,153,0.85)',
                        color: '#0f1a3a',
                        fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 10, letterSpacing: .5,
                      }}>
                        {p.loan_tipo?.toUpperCase() || 'PRÉSTAMO'}
                      </span>
                    )}
                  </div>
                  {/* Info */}
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>
                      {p.position || '—'}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#ddd', lineHeight: 1.3 }}>
                      {p.name}
                    </div>
                    {club && (
                      <div style={{ marginTop: 4 }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                          {club.principal}
                        </div>
                        {club.secundario && (
                          <div style={{ fontSize: 10, color: 'rgba(52,211,153,0.7)', marginTop: 2 }}>
                            {club.secundario}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* CLUBES */}
      <section style={{ background: '#060d1f', borderTop: '1px solid rgba(201,168,76,0.08)', padding: '56px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 9, letterSpacing: 4, color: GOLD, marginBottom: 8 }}>HEMOS COLOCADO JUGADORES EN</div>
            <h2 style={{ fontFamily: 'Bebas Neue', fontSize: 30, color: '#fff', letterSpacing: 2 }}>CLUBES ASOCIADOS</h2>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {CLUBS.map(c => (
              <div key={c.name} style={{ background: '#0f1a3a', border: '1px solid rgba(201,168,76,0.1)', borderRadius: 8, padding: '12px 18px', textAlign: 'center', minWidth: 95, transition: 'border-color .2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = GOLD}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.1)'}>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: 18, color: GOLD, letterSpacing: 1 }}>{c.abbr}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{c.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NOSOTROS */}
      <section id="nosotros" style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 9, letterSpacing: 4, color: GOLD, marginBottom: 10 }}>QUIÉNES SOMOS</div>
          <h2 style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(28px,4vw,46px)', color: '#fff', letterSpacing: 2, marginBottom: 16 }}>EL EQUIPO</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 600, margin: '0 auto', lineHeight: 1.8 }}>
            Fundada en 2023, Nueva Fútbol Chile SpA nació con la misión de representar el talento joven chileno con estándares profesionales FIFA. Hoy acompañamos a jugadores en activo en primera división y exterior.
          </p>
          <div style={{ width: 40, height: 2, background: GOLD, margin: '24px auto 0' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))', gap: 20 }}>
          {TEAM.map(m => (
            <div key={m.name} style={{ background: '#0f1a3a', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: '28px 24px', textAlign: 'center', transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.transform = 'translateY(-3px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.12)'; e.currentTarget.style.transform = 'translateY(0)' }}>
              <div style={{ width: 88, height: 88, borderRadius: '50%', background: m.color, border: `2px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue', fontSize: 26, color: '#fff', margin: '0 auto 16px', overflow: 'hidden' }}>
                {m.photo
                  ? <img src={m.photo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} onError={e => { e.target.style.display = 'none' }} />
                  : m.initials
                }
              </div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 18, color: '#fff', letterSpacing: 1, marginBottom: 4 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: GOLD, fontWeight: 600, marginBottom: 4 }}>{m.role}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginBottom: 14 }}>{m.license}</div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{m.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CONTACTO */}
      <section id="contacto" style={{ background: '#060d1f', borderTop: '1px solid rgba(201,168,76,0.08)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 9, letterSpacing: 4, color: GOLD, marginBottom: 12 }}>¿ERES JUGADOR O REPRESENTANTE?</div>
          <h2 style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(26px,4vw,42px)', color: '#fff', letterSpacing: 2, marginBottom: 12 }}>CONVERSEMOS</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 40, lineHeight: 1.7 }}>Representamos talento en todas las posiciones. Si crees que tienes lo que se necesita, escríbenos.</p>
          <form onSubmit={handleContact} style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[['NOMBRE', 'nombre', 'text', 'Tu nombre completo'], ['EMAIL', 'email', 'email', 'tu@email.com']].map(([lbl, key, type, ph]) => (
                <div key={key}>
                  <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, display: 'block', marginBottom: 4 }}>{lbl}</label>
                  <input required type={type} value={contactForm[key]} onChange={e => setContactForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 5, padding: '10px 12px', fontSize: 14, color: '#fff', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              ))}
            </div>
            <div>
              <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, display: 'block', marginBottom: 4 }}>MENSAJE</label>
              <textarea required value={contactForm.mensaje} onChange={e => setContactForm(f => ({ ...f, mensaje: e.target.value }))} placeholder="Cuéntanos sobre ti — posición, edad, club actual..."
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 5, padding: '10px 12px', fontSize: 14, color: '#fff', fontFamily: 'inherit', outline: 'none', resize: 'vertical', minHeight: 100 }} />
            </div>
            <button type="submit" style={{ background: GOLD, color: NAVY2, border: 'none', borderRadius: 4, padding: 13, fontFamily: 'Bebas Neue', fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>ENVIAR MENSAJE</button>
            {contactMsg && <div style={{ fontSize: 13, color: '#4ade80', textAlign: 'center' }}>{contactMsg}</div>}
          </form>
          <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 24 }}>
            {[
              { icon: '📍', title: 'Dirección', lines: ['Avda. Larraín 5682, Piso 13', 'La Reina, Santiago, Chile'] },
              { icon: '✉', title: 'Correo', lines: ['aldo.maldonado@nuevafutbolspa.com'] },
              { icon: '⚽', title: 'Licencia FIFA', lines: ['202406-7288'] },
            ].map(c => (
              <div key={c.title} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{c.icon}</div>
                <div style={{ fontSize: 11, color: GOLD, fontWeight: 600, marginBottom: 4 }}>{c.title}</div>
                {c.lines.map(l => <div key={l} style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{l}</div>)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NOTICIAS */}
      {noticias.length > 0 && (
        <Noticias publicView={true} />
      )}

      {/* FOOTER */}
      <footer style={{ background: '#030810', borderTop: '1px solid rgba(201,168,76,0.08)', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 14, color: GOLD, letterSpacing: 2, marginBottom: 6 }}>NUEVA FÚTBOL CHILE SPA</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginBottom: 4 }}>Agencia de Representación Deportiva · Agente FIFA Licencia 202406-7288</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Avda. Larraín 5682, Piso 13 · La Reina, Santiago · aldo.maldonado@nuevafutbolspa.com</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.1)', marginTop: 12 }}>© 2026 Nueva Fútbol Chile SpA · Todos los derechos reservados</div>
      </footer>

      <style>{`@media(max-width:640px){section>div[style*="grid-template-columns: 1fr 1fr"]{grid-template-columns:1fr!important}}`}</style>
    </div>
  )
}
