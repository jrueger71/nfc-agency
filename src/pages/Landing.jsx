import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const GOLD = '#C9A84C'
const NAVY2 = '#0f1a3a'

function useCounter(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start || !target) return
    let startTime = null
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
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
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.1,
      gold: Math.random() > 0.6,
    }))
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    window.addEventListener('resize', resize)
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.gold ? `rgba(201,168,76,${p.alpha})` : `rgba(255,255,255,${p.alpha * 0.5})`
        ctx.fill()
      })
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(201,168,76,${0.08 * (1 - dist / 100)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
}

function Player3D() {
  return (
    <svg viewBox="0 0 320 480" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 300, filter: 'drop-shadow(0 0 40px rgba(201,168,76,0.25))' }}>
      <defs>
        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1B2B5E"/><stop offset="100%" stopColor="#0a1020"/>
        </linearGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8c96a"/><stop offset="100%" stopColor="#C9A84C"/>
        </linearGradient>
        <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d4956a"/><stop offset="100%" stopColor="#b87040"/>
        </linearGradient>
        <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(201,168,76,0.12)"/><stop offset="100%" stopColor="rgba(201,168,76,0)"/>
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="420" rx="100" ry="20" fill="rgba(201,168,76,0.12)"/>
      <circle cx="160" cy="240" r="180" fill="url(#glowGrad)"/>
      <ellipse cx="160" cy="455" rx="70" ry="12" fill="rgba(0,0,0,0.35)"/>
      <g transform="translate(95,370) rotate(-15)">
        <circle cx="30" cy="30" r="28" fill="#fff" stroke="rgba(201,168,76,0.4)" strokeWidth="1"/>
        <path d="M30 2 L20 15 L30 28 L40 15 Z" fill="#1B2B5E" opacity="0.7"/>
        <path d="M2 30 L15 20 L28 30 L15 40 Z" fill="#1B2B5E" opacity="0.7"/>
        <path d="M58 30 L45 20 L32 30 L45 40 Z" fill="#1B2B5E" opacity="0.7"/>
        <path d="M30 58 L20 45 L30 32 L40 45 Z" fill="#1B2B5E" opacity="0.7"/>
      </g>
      <path d="M140 330 Q120 370 95 385 Q90 388 88 392 L110 398 Q118 385 135 360 Z" fill="url(#bodyGrad)" stroke="rgba(201,168,76,0.2)" strokeWidth="0.5"/>
      <path d="M85 388 Q75 390 70 398 Q80 405 115 400 L110 392 Z" fill={GOLD} opacity="0.9"/>
      <path d="M160 330 L155 400 L170 402 L175 335 Z" fill="url(#bodyGrad)" stroke="rgba(201,168,76,0.2)" strokeWidth="0.5"/>
      <path d="M152 396 Q145 402 148 410 Q165 412 175 406 L170 396 Z" fill={GOLD} opacity="0.9"/>
      <path d="M130 295 Q125 330 125 345 L175 345 Q175 330 170 295 Z" fill="#C9A84C" opacity="0.9"/>
      <path d="M130 295 L135 345 L155 345 L160 295 Z" fill="rgba(0,0,0,0.15)"/>
      <path d="M118 210 Q110 240 108 270 Q106 290 130 295 L170 295 Q194 290 192 270 Q190 240 182 210 Z" fill="url(#bodyGrad)" stroke="rgba(201,168,76,0.3)" strokeWidth="1"/>
      <path d="M138 212 L135 293" stroke={GOLD} strokeWidth="1.5" opacity="0.4"/>
      <path d="M150 211 L150 294" stroke={GOLD} strokeWidth="1.5" opacity="0.4"/>
      <path d="M162 212 L165 293" stroke={GOLD} strokeWidth="1.5" opacity="0.4"/>
      <rect x="143" y="228" width="24" height="18" rx="2" fill={GOLD} opacity="0.9"/>
      <text x="155" y="241" textAnchor="middle" fontSize="8" fontFamily="Bebas Neue" fill="#0f1a3a" letterSpacing="0.5">NFC</text>
      <path d="M118 218 Q95 215 80 200 Q72 194 68 188" stroke="url(#bodyGrad)" strokeWidth="18" fill="none" strokeLinecap="round"/>
      <circle cx="66" cy="186" r="8" fill="url(#skinGrad)"/>
      <path d="M182 218 Q205 230 218 248 Q224 256 226 264" stroke="url(#bodyGrad)" strokeWidth="18" fill="none" strokeLinecap="round"/>
      <circle cx="227" cy="266" r="8" fill="url(#skinGrad)"/>
      <rect x="145" y="188" width="20" height="24" rx="6" fill="url(#skinGrad)"/>
      <ellipse cx="155" cy="170" rx="32" ry="36" fill="url(#skinGrad)"/>
      <path d="M123 158 Q125 128 155 125 Q185 128 187 158 Q175 140 155 138 Q135 140 123 158 Z" fill="#1a0a00"/>
      <ellipse cx="144" cy="168" rx="4" ry="5" fill="#0a0500" opacity="0.7"/>
      <ellipse cx="166" cy="168" rx="4" ry="5" fill="#0a0500" opacity="0.7"/>
      <path d="M147 182 Q155 187 163 182" stroke="#8b4513" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

const POSITIONS = ['Todos', 'Portero', 'Defensa', 'Mediocampista', 'Delantero']
const AVATAR_COLORS = ['#1B2B5E','#243580','#C9A84C','#7a6025','#0f1a3a','#1B2B5E','#243580']

function initials(name) {
  if (!name) return '?'
  const w = name.trim().split(' ')
  return (w[0][0] + (w[1] ? w[1][0] : '')).toUpperCase()
}

const CLUBS = [
  { name: 'Colo-Colo', abbr: 'CCO' },
  { name: 'U. Católica', abbr: 'UCH' },
  { name: 'U. Española', abbr: 'UES' },
  { name: 'Cobresal', abbr: 'COB' },
  { name: 'D. Concepción', abbr: 'DCO' },
  { name: 'Everton', abbr: 'EVE' },
  { name: 'Audax Italiano', abbr: 'AUD' },
  { name: 'Magallanes', abbr: 'MAG' },
]

const TEAM = [
  {
    name: 'Aldo Maldonado',
    role: 'Fundador · Agente FIFA',
    license: 'Licencia 202406-7288',
    bio: 'Agente FIFA certificado con amplia trayectoria en representación de futbolistas. Fundó Nueva Fútbol Chile SpA en 2023 con el objetivo de profesionalizar la representación del talento joven chileno.',
    initials: 'AM',
    color: '#1B2B5E',
  },
  {
    name: 'Marcos González',
    role: 'Socio · Scout',
    license: 'Scouting & Desarrollo',
    bio: 'Especialista en detección y desarrollo de talento. Responsable de identificar promesas del fútbol masculino y femenino en todo Chile, construyendo el pipeline de jugadores de la agencia.',
    initials: 'MG',
    color: '#243580',
  },
  {
    name: 'Jorge Rueger',
    role: 'Asesor',
    license: 'Gestión & Estrategia',
    bio: 'Asesor estratégico de la agencia. Apoya la gestión operacional, el desarrollo tecnológico y la planificación de largo plazo para consolidar a Nueva Fútbol Chile como referente regional.',
    initials: 'JR',
    color: '#7a6025',
  },
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
  const countCountries = useCounter(5, 2000, statsInView)
  const countContracts = useCounter(players.filter(p => p.club_contract_active).length || 12, 1900, statsInView)

  useEffect(() => {
    setTimeout(() => setHeroVisible(true), 100)
    supabase.from('players_full_info').select('*').order('name').then(({ data }) => {
      setPlayers(data || [])
      setLoading(false)
    })
  }, [])

  const filtered = filter === 'Todos' ? players : players.filter(p => p.position === filter)

  const handleContact = (e) => {
    e.preventDefault()
    setContactMsg('✓ Mensaje recibido. Te contactaremos a la brevedad.')
    setContactForm({ nombre: '', email: '', mensaje: '' })
    setTimeout(() => setContactMsg(''), 5000)
  }

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div style={{ background: '#080e1f', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ===== HERO ===== */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <ParticleField />
        <div style={{ position: 'absolute', top: 0, right: 0, width: '55%', height: '100%', background: 'linear-gradient(135deg, transparent 0%, rgba(27,43,94,0.25) 100%)', clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, opacity: 0.25 }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 60px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center', position: 'relative', zIndex: 1, width: '100%' }}>
          <div style={{ transition: 'all 1s', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(30px)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 4, color: GOLD, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 24, height: 1, background: GOLD }} />
              AGENCIA DE REPRESENTACIÓN · DESDE 2023
            </div>
            <h1 style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(40px, 6vw, 70px)', color: '#fff', lineHeight: 0.95, letterSpacing: 2, marginBottom: 20 }}>
              NUEVA<br /><span style={{ color: GOLD }}>FÚTBOL</span><br />CHILE SPA
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, maxWidth: 400, marginBottom: 32 }}>
              Representamos y desarrollamos carreras de futbolistas profesionales en Chile y el mundo. Agente FIFA certificado.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => scrollTo('plantel')} style={{ background: GOLD, color: NAVY2, border: 'none', borderRadius: 4, padding: '12px 28px', fontFamily: 'Bebas Neue', fontSize: 15, letterSpacing: 2, cursor: 'pointer' }}>
                VER JUGADORES
              </button>
              <button onClick={() => scrollTo('contacto')} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, padding: '12px 28px', fontFamily: 'Bebas Neue', fontSize: 15, letterSpacing: 2, cursor: 'pointer' }}>
                CONTACTO
              </button>
            </div>
            <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', gap: 10, opacity: 0.45 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', border: `1px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontFamily: 'Bebas Neue', color: GOLD }}>FIFA</div>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>AGENTE LICENCIADO · ALDO MALDONADO REBOLLEDO</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', transition: 'all 1.2s', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(20px)', transitionDelay: '0.2s' }}>
            <Player3D />
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section ref={statsRef} style={{ background: '#0a1025', borderTop: `1px solid rgba(201,168,76,0.12)`, borderBottom: `1px solid rgba(201,168,76,0.12)`, padding: '48px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24, textAlign: 'center' }}>
          {[
            { n: countPlayers, s: '+', l: 'JUGADORES' },
            { n: countContracts, s: '', l: 'CON CONTRATO' },
            { n: countCountries, s: '', l: 'PAÍSES' },
            { n: countYears, s: '', l: 'AÑOS DE TRAYECTORIA' },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(34px,5vw,54px)', color: GOLD, lineHeight: 1 }}>{s.n}{s.s}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, marginTop: 6 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== PLANTEL ===== */}
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
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))', gap: 12 }}>
            {filtered.map((p, i) => (
              <div key={p.id} onClick={() => navigate(`/jugador/${p.id}`)}
                style={{ background: '#0f1a3a', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 10, padding: '18px 12px', textAlign: 'center', cursor: 'pointer', transition: 'all .25s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.transform = 'translateY(-3px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.12)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', margin: '0 auto 12px', background: AVATAR_COLORS[i % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue', fontSize: 20, color: '#fff', border: '2px solid rgba(201,168,76,0.2)', overflow: 'hidden' }}>
                  {p.photo_url ? <img src={p.photo_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} /> : initials(p.name)}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 2, lineHeight: 1.3 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>{p.position || '—'}</div>
                <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 3, fontWeight: 600, background: p.club_contract_active ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.04)', color: p.club_contract_active ? GOLD : 'rgba(255,255,255,0.3)', border: p.club_contract_active ? '1px solid rgba(201,168,76,0.25)' : '1px solid rgba(255,255,255,0.08)' }}>
                  {p.club_contract_active ? 'CONTRATO ACTIVO' : 'SIN CONTRATO'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== CLUBES ===== */}
      <section style={{ background: '#060d1f', borderTop: '1px solid rgba(201,168,76,0.08)', padding: '56px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 9, letterSpacing: 4, color: GOLD, marginBottom: 8 }}>HEMOS COLOCADO JUGADORES EN</div>
            <h2 style={{ fontFamily: 'Bebas Neue', fontSize: 30, color: '#fff', letterSpacing: 2 }}>CLUBES ASOCIADOS</h2>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {CLUBS.map(c => (
              <div key={c.name} style={{ background: '#0f1a3a', border: '1px solid rgba(201,168,76,0.1)', borderRadius: 8, padding: '12px 18px', textAlign: 'center', minWidth: 95, transition: 'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.1)' }}>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: 18, color: GOLD, letterSpacing: 1 }}>{c.abbr}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{c.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== NOSOTROS ===== */}
      <section id="nosotros" style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 9, letterSpacing: 4, color: GOLD, marginBottom: 10 }}>QUIÉNES SOMOS</div>
          <h2 style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(28px,4vw,46px)', color: '#fff', letterSpacing: 2, marginBottom: 16 }}>EL EQUIPO</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 600, margin: '0 auto', lineHeight: 1.8 }}>
            Fundada en 2023, Nueva Fútbol Chile SpA nació con la misión de representar el talento joven chileno — masculino y femenino — con estándares profesionales FIFA. Hoy acompañamos a jugadores en activo en clubes de primera división y exterior.
          </p>
          <div style={{ width: 40, height: 2, background: GOLD, margin: '24px auto 0' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {TEAM.map(m => (
            <div key={m.name} style={{ background: '#0f1a3a', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: '28px 24px', textAlign: 'center', transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.transform = 'translateY(-3px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.12)'; e.currentTarget.style.transform = 'translateY(0)' }}>
              {/* Avatar */}
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: m.color, border: `2px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue', fontSize: 26, color: '#fff', margin: '0 auto 16px', overflow: 'hidden' }}>
                {m.photo
                  ? <img src={m.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={m.name} />
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

      {/* ===== CONTACTO ===== */}
      <section id="contacto" style={{ background: '#060d1f', borderTop: '1px solid rgba(201,168,76,0.08)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 9, letterSpacing: 4, color: GOLD, marginBottom: 12 }}>¿ERES JUGADOR O REPRESENTANTE?</div>
          <h2 style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(26px,4vw,42px)', color: '#fff', letterSpacing: 2, marginBottom: 12 }}>CONVERSEMOS</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 40, lineHeight: 1.7 }}>
            Representamos talento en todas las posiciones. Si crees que tienes lo que se necesita para el fútbol profesional, escríbenos.
          </p>

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
            <button type="submit" style={{ background: GOLD, color: NAVY2, border: 'none', borderRadius: 4, padding: 13, fontFamily: 'Bebas Neue', fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>
              ENVIAR MENSAJE
            </button>
            {contactMsg && <div style={{ fontSize: 13, color: '#4ade80', textAlign: 'center' }}>{contactMsg}</div>}
          </form>

          {/* Contact info */}
          <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 24 }}>
            {[
              { icon: '📍', title: 'Dirección', lines: ['Avda. Larraín 5682, Piso 13', 'La Reina, Santiago, Chile'] },
              { icon: '✉', title: 'Correo', lines: ['aldo.maldonado@nuevafutbolspa.com'] },
              { icon: '⚽', title: 'Licencia FIFA', lines: ['202406-7288', 'Agente certificado'] },
            ].map(c => (
              <div key={c.title} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{c.icon}</div>
                <div style={{ fontSize: 11, color: GOLD, fontWeight: 600, marginBottom: 4 }}>{c.title}</div>
                {c.lines.map(l => <div key={l} style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{l}</div>)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{ background: '#030810', borderTop: '1px solid rgba(201,168,76,0.08)', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 14, color: GOLD, letterSpacing: 2, marginBottom: 6 }}>
          NUEVA FÚTBOL CHILE SPA
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginBottom: 4 }}>
          Agencia de Representación Deportiva · Agente FIFA Licencia 202406-7288
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
          Avda. Larraín 5682, Piso 13 · La Reina, Santiago · aldo.maldonado@nuevafutbolspa.com
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.12)', marginTop: 12 }}>© 2026 Nueva Fútbol Chile SpA · Todos los derechos reservados</div>
      </footer>

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(6px)} }
        @media(max-width:640px){
          section > div[style*="grid-template-columns: 1fr 1fr"]{grid-template-columns:1fr!important}
        }
      `}</style>
    </div>
  )
}
