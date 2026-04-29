import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const NAVY = '#1B2B5E', GOLD = '#C9A84C', BG = '#06090f'
const INPUT = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none' }
const LABEL = { fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: 1, display: 'block', marginBottom: 4, fontWeight: 600 }

// Paletas por plantilla: [colorBeam1, colorBeam2, colorTag, colorName]
const PALETTES = {
  welcome:     { b1: '27,43,94',    b2: '201,168,76', tag: '#C9A84C', name: '#C9A84C', glow: '27,43,200' },
  birthday:    { b1: '120,40,180',  b2: '201,168,76', tag: '#a855f7', name: '#e9d5ff', glow: '120,40,180' },
  contract:    { b1: '20,120,60',   b2: '201,168,76', tag: '#4ade80', name: '#C9A84C', glow: '20,120,60' },
  goal_first:  { b1: '180,20,20',   b2: '201,168,76', tag: '#f87171', name: '#C9A84C', glow: '180,20,20' },
  renewal:     { b1: '27,43,94',    b2: '201,168,76', tag: '#60a5fa', name: '#C9A84C', glow: '27,80,200' },
  selection:   { b1: '180,10,10',   b2: '201,168,76', tag: '#ef4444', name: '#C9A84C', glow: '200,0,0' },
  debut:       { b1: '180,160,40',  b2: '255,255,255', tag: '#fff',   name: '#C9A84C', glow: '200,180,50' },
  goal:        { b1: '200,30,30',   b2: '201,168,76', tag: '#f87171', name: '#C9A84C', glow: '200,30,30' },
  assist:      { b1: '20,100,180',  b2: '201,168,76', tag: '#38bdf8', name: '#C9A84C', glow: '20,100,200' },
  transfer:    { b1: '180,80,10',   b2: '201,168,76', tag: '#fb923c', name: '#C9A84C', glow: '180,80,10' },
}

const TMPLS = [
  { id: 'welcome',   label: 'Bienvenida',    icon: '🤝', tag: 'NUEVO REPRESENTADO',          msg: '¡Bienvenido a la familia NFC!' },
  { id: 'birthday',  label: 'Cumpleaños',    icon: '🎂', tag: '¡FELIZ CUMPLEAÑOS!',           msg: '¡Un gran año te espera!' },
  { id: 'contract',  label: '1er Contrato',  icon: '✍️', tag: 'PRIMER CONTRATO PROFESIONAL',  msg: '¡El primer paso de muchos!' },
  { id: 'goal_first',label: '1er Gol',       icon: '⚽', tag: 'PRIMER GOL PROFESIONAL',       msg: '¡El primero de muchos!' },
  { id: 'renewal',   label: 'Renovación',    icon: '🔄', tag: 'RENOVACIÓN DE CONTRATO',       msg: '¡Seguimos construyendo juntos!' },
  { id: 'selection', label: 'Convocatoria',  icon: '🏴', tag: 'CONVOCATORIA SELECCIÓN',       msg: '¡Orgullo nacional!' },
  { id: 'debut',     label: 'Debut',         icon: '🌟', tag: 'DEBUT PROFESIONAL',            msg: '¡Comienza la historia!' },
  { id: 'goal',      label: 'Gol',           icon: '⚽', tag: 'GOL',                          msg: '¡Así se hace!' },
  { id: 'assist',    label: 'Asistencia',    icon: '🎯', tag: 'ASISTENCIA',                   msg: '¡La visión de un crack!' },
  { id: 'transfer',  label: 'Traspaso',      icon: '✈️', tag: 'NUEVO DESTINO',                msg: '¡A por el siguiente reto!' },
]

function genderMsg(msg, tag, gender) {
  if (gender === 'F') {
    return {
      msg: msg.replace('Bienvenido', 'Bienvenida').replace('representado', 'representada'),
      tag: tag.replace('NUEVO REPRESENTADO', 'NUEVA REPRESENTADA').replace('NUEVO', 'NUEVA'),
    }
  }
  return {
    msg: msg.replace('Bienvenida', 'Bienvenido').replace('representada', 'representado'),
    tag: tag.replace('NUEVA REPRESENTADA', 'NUEVO REPRESENTADO').replace('NUEVA', 'NUEVO'),
  }
}

export default function RRSS() {
  const [players, setPlayers] = useState([])
  const [tmpl, setTmpl] = useState(TMPLS[0])
  const [fmt, setFmt] = useState('sq')
  const [photos, setPhotos] = useState([]) // [{img: HTMLImageElement, url: string}]
  const [selectedPhotos, setSelectedPhotos] = useState([]) // índices seleccionados (max 3)
  const [playerPhotos, setPlayerPhotos] = useState([]) // fotos disponibles del jugador
  const [st, setSt] = useState({ name: 'NOMBRE JUGADOR', club: '', msg: '¡Bienvenido a la familia NFC!', tag: 'NUEVO REPRESENTADO', gender: 'M' })
  const canvasRef = useRef()
  const fileRef = useRef()

  useEffect(() => {
    supabase.from('players').select('id,name,foto_url,gender,estado').order('name')
      .then(async ({ data: pl }) => {
        if (!pl) return
        const { data: cc } = await supabase.from('club_contracts')
          .select('player_id,club_name').eq('contract_active', true)
        const clubMap = {}
        if (cc) cc.forEach(c => { clubMap[c.player_id] = c.club_name })
        setPlayers(pl.map(p => ({ ...p, club_name: clubMap[p.id] || '' })))
      })
  }, [])

  const loadPlayerPhotos = async (player) => {
    // Cargar foto principal + fotos de galería desde player_media
    const { data: media } = await supabase.from('player_media')
      .select('url,display_order').eq('player_id', player.id)
      .eq('media_type', 'photo').order('display_order')

    const urls = []
    if (player.foto_url) urls.push(player.foto_url)
    if (media) media.forEach(m => { if (m.url && !urls.includes(m.url)) urls.push(m.url) })

    setPlayerPhotos(urls)
    setSelectedPhotos([])
    setPhotos([])

    // Auto-cargar la primera foto
    if (urls.length > 0) loadPhotoFromUrl(urls[0], 0)
  }

  const loadPhotoFromUrl = (url, idx) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setPhotos(prev => {
        const next = [...prev]
        next[idx] = { img, url }
        return next
      })
    }
    img.src = url
  }

  const togglePhoto = (idx) => {
    setSelectedPhotos(prev => {
      if (prev.includes(idx)) return prev.filter(i => i !== idx)
      if (prev.length >= 3) return prev
      return [...prev, idx]
    })
    if (!photos[idx]) loadPhotoFromUrl(playerPhotos[idx], idx)
  }

  const loadPlayer = (player) => {
    const { msg, tag } = genderMsg(tmpl.msg, tmpl.tag, player.gender || 'M')
    setSt(s => ({ ...s, name: player.name.toUpperCase(), club: player.club_name || '', gender: player.gender || 'M', msg, tag }))
    loadPlayerPhotos(player)
  }

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onload = () => {
        setPhotos(prev => [...prev, { img, url: ev.target.result }])
        setPlayerPhotos(prev => [...prev, ev.target.result])
        setSelectedPhotos(prev => prev.length < 3 ? [...prev, prev.length + playerPhotos.length] : prev)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  // Fotos activas para el canvas
  const activePhotos = selectedPhotos.length > 0
    ? selectedPhotos.map(i => photos[i]).filter(Boolean)
    : photos.slice(0, 1).filter(Boolean)

  const draw = useCallback(() => {
    const cvs = canvasRef.current; if (!cvs) return
    const ctx = cvs.getContext('2d')
    const w = 1080, h = fmt === 'sq' ? 1080 : 1920
    cvs.width = w; cvs.height = h
    const pal = PALETTES[tmpl.id] || PALETTES.welcome
    const isStory = fmt === 'st'

    // ── Fondo ────────────────────────────────────────────────────────────────
    ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h)

    // Gradiente radial superior
    const tg = ctx.createRadialGradient(w / 2, 0, 0, w / 2, 0, h * 0.8)
    tg.addColorStop(0, `rgba(${pal.b1},0.5)`); tg.addColorStop(1, 'transparent')
    ctx.fillStyle = tg; ctx.fillRect(0, 0, w, h)

    // Glow inferior
    const bg2 = ctx.createRadialGradient(w / 2, h, 0, w / 2, h, h * 0.5)
    bg2.addColorStop(0, `rgba(${pal.glow},0.15)`); bg2.addColorStop(1, 'transparent')
    ctx.fillStyle = bg2; ctx.fillRect(0, 0, w, h)

    // ── Beams de luz ─────────────────────────────────────────────────────────
    const beam = (cx, cy, angle, len, rgb, a) => {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle)
      const g = ctx.createLinearGradient(0, 0, len, 0)
      g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`)
      ctx.fillStyle = g; ctx.beginPath()
      ctx.moveTo(0, -100); ctx.lineTo(len, 0); ctx.lineTo(0, 100)
      ctx.closePath(); ctx.fill(); ctx.restore()
    }
    beam(w * 0.15, h * 0.04, 0.22, w * 1.4, pal.b1, 0.12)
    beam(w * 0.85, h * 0.03, -0.28, w * 1.3, pal.b2, 0.08)
    beam(w * 0.5, h * 0.01, 0.05, w * 1.2, pal.b1, 0.06)

    // ── Estrellas ─────────────────────────────────────────────────────────────
    const rng = (() => { let s = 42; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 } })()
    for (let i = 0; i < 140; i++) {
      ctx.beginPath(); ctx.arc(rng() * w, rng() * h * 0.8, rng() * 1.8 + 0.2, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${rng() * 0.5 + 0.1})`; ctx.fill()
    }

    // ── Fotos multicapa ───────────────────────────────────────────────────────
    const photoH = isStory ? h * 0.62 : h * 0.66
    const n = activePhotos.length

    if (n === 0) {
      // Placeholder
      ctx.font = `900 ${w * 0.45}px sans-serif`; ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(27,43,94,0.25)'; ctx.fillText('NFC', w / 2, h * 0.52)
    } else if (n === 1) {
      // Una foto centrada
      drawPhoto(ctx, activePhotos[0].img, 0, 0, w, photoH, 1.0)
    } else if (n === 2) {
      // Foto principal centrada grande + segunda en esquina superior difuminada
      drawPhoto(ctx, activePhotos[0].img, w * 0.1, 0, w * 0.8, photoH, 1.0)
      ctx.save()
      ctx.globalAlpha = 0.45
      ctx.filter = 'blur(1px)'
      drawPhoto(ctx, activePhotos[1].img, 0, 0, w * 0.35, photoH * 0.6, 0.8)
      ctx.filter = 'none'
      ctx.globalAlpha = 1
      ctx.restore()
    } else {
      // 3 fotos: principal centro, dos laterales difuminadas
      // Foto izquierda — difuminada, escala oscura
      ctx.save()
      ctx.globalAlpha = 0.4
      ctx.filter = 'blur(1.5px)'
      drawPhoto(ctx, activePhotos[1].img, -w * 0.05, h * 0.02, w * 0.45, photoH * 0.75, 0.8)
      ctx.filter = 'none'
      ctx.globalAlpha = 1
      ctx.restore()
      // Foto derecha — difuminada
      ctx.save()
      ctx.globalAlpha = 0.4
      ctx.filter = 'blur(1.5px)'
      drawPhoto(ctx, activePhotos[2].img, w * 0.6, h * 0.02, w * 0.45, photoH * 0.75, 0.8)
      ctx.filter = 'none'
      ctx.globalAlpha = 1
      ctx.restore()
      // Foto principal — centro, encima
      drawPhoto(ctx, activePhotos[0].img, w * 0.15, 0, w * 0.7, photoH, 1.0)
    }

    // Degradado sobre foto para fundir con fondo
    const fg = ctx.createLinearGradient(0, photoH * 0.3, 0, photoH)
    fg.addColorStop(0, 'rgba(6,9,15,0)')
    fg.addColorStop(0.65, 'rgba(6,9,15,0.7)')
    fg.addColorStop(1, 'rgba(6,9,15,1)')
    ctx.fillStyle = fg; ctx.fillRect(0, 0, w, photoH)

    // Degradados laterales
    const lgL = ctx.createLinearGradient(0, 0, w * 0.15, 0)
    lgL.addColorStop(0, 'rgba(6,9,15,0.8)'); lgL.addColorStop(1, 'rgba(6,9,15,0)')
    ctx.fillStyle = lgL; ctx.fillRect(0, 0, w * 0.15, photoH)
    const lgR = ctx.createLinearGradient(w, 0, w * 0.85, 0)
    lgR.addColorStop(0, 'rgba(6,9,15,0.8)'); lgR.addColorStop(1, 'rgba(6,9,15,0)')
    ctx.fillStyle = lgR; ctx.fillRect(w * 0.85, 0, w * 0.15, photoH)

    // ── Líneas decorativas ────────────────────────────────────────────────────
    ctx.strokeStyle = `rgba(${pal.b2},0.3)`; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(w * 0.05, photoH * 0.92); ctx.lineTo(w * 0.95, photoH * 0.92); ctx.stroke()

    // ── Bloque de texto ───────────────────────────────────────────────────────
    const blockY = isStory ? h * 0.63 : h * 0.67

    const wrapLines = (text, maxW, font) => {
      ctx.font = font
      const words = text.split(' '), lines = []; let line = ''
      for (const wd of words) {
        const t = line ? line + ' ' + wd : wd
        if (ctx.measureText(t).width > maxW) { if (line) lines.push(line); line = wd } else line = t
      }
      if (line) lines.push(line); return lines
    }

    // Tag pill
    const tagSize = w * 0.027
    ctx.font = `700 ${tagSize}px sans-serif`
    const tagTxt = st.tag, tagW = ctx.measureText(tagTxt).width + w * 0.07, tagH = tagSize * 2
    ctx.fillStyle = pal.tag
    ctx.beginPath(); ctx.roundRect((w - tagW) / 2, blockY, tagW, tagH, tagH / 2); ctx.fill()
    ctx.fillStyle = '#0a0f1a'; ctx.textAlign = 'center'
    ctx.fillText(tagTxt, w / 2, blockY + tagH * 0.72)

    // Mensaje
    const msgSize = isStory ? w * 0.050 : w * 0.044
    const msgLines = wrapLines(st.msg, w * 0.84, `400 ${msgSize}px sans-serif`)
    ctx.font = `400 ${msgSize}px sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.textAlign = 'center'
    const msgY = blockY + tagH + msgSize * 1.1
    msgLines.forEach((l, i) => ctx.fillText(l, w / 2, msgY + i * msgSize * 1.25))
    const afterMsg = msgY + msgLines.length * msgSize * 1.25

    // Nombre jugador — tipografía gigante con sombra de color
    const baseNameSize = isStory ? w * 0.085 : w * 0.075
    const nameLen = st.name.length
    const adaptSize = nameLen > 20 ? baseNameSize * 0.75 : nameLen > 14 ? baseNameSize * 0.87 : baseNameSize
    const nameLines = wrapLines(st.name, w * 0.9, `900 ${adaptSize}px sans-serif`)
    ctx.font = `900 ${adaptSize}px sans-serif`
    // Sombra de color
    ctx.shadowColor = pal.tag; ctx.shadowBlur = 20
    ctx.fillStyle = pal.name; ctx.textAlign = 'center'
    const nameY = afterMsg + adaptSize * 0.4
    nameLines.forEach((l, i) => ctx.fillText(l, w / 2, nameY + i * adaptSize * 1.05))
    ctx.shadowBlur = 0
    const afterName = nameY + nameLines.length * adaptSize * 1.05

    // Club
    if (st.club) {
      ctx.font = `500 ${w * 0.036}px sans-serif`
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.textAlign = 'center'
      ctx.fillText(st.club, w / 2, afterName + w * 0.012)
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = h - w * 0.11
    ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.4
    ctx.beginPath(); ctx.moveTo(w * 0.08, footerY); ctx.lineTo(w * 0.92, footerY); ctx.stroke()
    ctx.globalAlpha = 1; ctx.textAlign = 'center'
    ctx.font = `700 ${w * 0.036}px sans-serif`; ctx.fillStyle = GOLD
    ctx.fillText('NUEVA FÚTBOL CHILE SpA', w / 2, footerY + w * 0.032)
    ctx.font = `400 ${w * 0.024}px sans-serif`; ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText('Agencia de Representación · Agente FIFA Lic. 202406-7288', w / 2, footerY + w * 0.054)
    ctx.fillText('@nuevafutbolspa · nuevafutbolspa.com', w / 2, footerY + w * 0.074)

  }, [activePhotos, tmpl, fmt, st])

  // Helper: dibuja una foto con recorte centrado
  function drawPhoto(ctx, img, x, y, dw, dh, opacity) {
    if (!img) return
    ctx.save()
    ctx.globalAlpha = opacity
    const ia = img.naturalWidth / img.naturalHeight
    const ca = dw / dh
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight
    if (ia > ca) { sw = sh * ca; sx = (img.naturalWidth - sw) / 2 }
    else { sh = sw / ca; sy = 0 }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, dw, dh)
    ctx.restore()
  }

  useEffect(() => { draw() }, [draw])

  const download = () => {
    const a = document.createElement('a')
    a.download = `NFC_${tmpl.id}_${st.name.replace(/\s+/g, '_')}_${fmt}.png`
    a.href = canvasRef.current.toDataURL('image/png', 1); a.click()
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div className="section-title" style={{ margin: 0 }}>GENERADOR REDES SOCIALES</div>
        <button onClick={download} className="btn-gold">⬇ DESCARGAR PNG</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Plantillas */}
          <div className="card">
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 1.5, marginBottom: 10 }}>PLANTILLA</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 5 }}>
              {TMPLS.map(t => (
                <button key={t.id} onClick={() => {
                  setTmpl(t)
                  const { msg, tag } = genderMsg(t.msg, t.tag, st.gender)
                  setSt(s => ({ ...s, msg, tag }))
                }}
                  style={{ padding: '6px 4px', fontSize: 10, borderRadius: 5, border: `1px solid ${tmpl.id === t.id ? GOLD : 'rgba(255,255,255,0.1)'}`, background: tmpl.id === t.id ? 'rgba(201,168,76,0.15)' : 'transparent', color: tmpl.id === t.id ? GOLD : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', lineHeight: 1.5 }}>
                  {t.icon}<br />{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Jugador */}
          <div className="card">
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 1.5, marginBottom: 10 }}>JUGADOR</div>
            <div style={{ marginBottom: 8 }}>
              <label style={LABEL}>CARGAR DESDE PLANTEL</label>
              <select style={INPUT} onChange={e => { const p = players.find(x => x.id === e.target.value); if (p) loadPlayer(p) }}>
                <option value="">— Seleccionar —</option>
                {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={LABEL}>NOMBRE</label>
              <input style={INPUT} value={st.name} onChange={e => setSt(s => ({ ...s, name: e.target.value.toUpperCase() }))} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={LABEL}>GÉNERO</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['M', 'Masculino'], ['F', 'Femenino']].map(([val, lbl]) => (
                  <button key={val} onClick={() => {
                    const { msg, tag } = genderMsg(tmpl.msg, tmpl.tag, val)
                    setSt(s => ({ ...s, gender: val, msg, tag }))
                  }}
                    style={{ flex: 1, padding: '6px', fontSize: 12, borderRadius: 5, border: `1px solid ${st.gender === val ? GOLD : 'rgba(255,255,255,0.1)'}`, background: st.gender === val ? 'rgba(201,168,76,0.15)' : 'transparent', color: st.gender === val ? GOLD : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={LABEL}>CLUB</label>
              <input style={INPUT} value={st.club} onChange={e => setSt(s => ({ ...s, club: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={LABEL}>TAG</label>
              <input style={INPUT} value={st.tag} onChange={e => setSt(s => ({ ...s, tag: e.target.value }))} />
            </div>
            <div>
              <label style={LABEL}>MENSAJE</label>
              <textarea style={{ ...INPUT, resize: 'vertical', minHeight: 56 }} value={st.msg} onChange={e => setSt(s => ({ ...s, msg: e.target.value }))} />
            </div>
          </div>

          {/* Fotos */}
          <div className="card">
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 1.5, marginBottom: 10 }}>
              FOTOS ({selectedPhotos.length > 0 ? selectedPhotos.length : Math.min(photos.length, 1)}/3)
            </div>

            {playerPhotos.length > 0 && (
              <>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
                  Selecciona hasta 3 fotos (la 1ª es la principal)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5, marginBottom: 10 }}>
                  {playerPhotos.map((url, idx) => {
                    const sel = selectedPhotos.includes(idx)
                    const order = selectedPhotos.indexOf(idx)
                    return (
                      <div key={idx} onClick={() => togglePhoto(idx)}
                        style={{ position: 'relative', cursor: 'pointer', borderRadius: 5, overflow: 'hidden', aspectRatio: '3/4', border: `2px solid ${sel ? GOLD : 'rgba(255,255,255,0.1)'}`, transition: 'border-color .15s' }}>
                        <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} alt="" />
                        {sel && (
                          <div style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#0a0f1a' }}>
                            {order + 1}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            <div style={{ border: '1.5px dashed rgba(201,168,76,0.3)', borderRadius: 6, padding: 10, textAlign: 'center', cursor: 'pointer' }}
              onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                onChange={e => Array.from(e.target.files).forEach(f => handleFile(f))} />
              <div style={{ fontSize: 12, color: GOLD }}>📷 Subir foto adicional</div>
            </div>

            {playerPhotos.length === 0 && photos.length === 0 && (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 6, textAlign: 'center' }}>
                Selecciona un jugador o sube una foto
              </div>
            )}
          </div>

          {/* Formato */}
          <div className="card">
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 1.5, marginBottom: 10 }}>FORMATO</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['sq', '1:1 Feed'], ['st', '9:16 Story']].map(([id, lbl]) => (
                <button key={id} onClick={() => setFmt(id)}
                  style={{ flex: 1, padding: 8, fontSize: 12, borderRadius: 5, border: `1px solid ${fmt === id ? GOLD : 'rgba(255,255,255,0.1)'}`, background: fmt === id ? 'rgba(201,168,76,0.15)' : 'transparent', color: fmt === id ? GOLD : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas preview */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'sticky', top: 70 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>VISTA PREVIA</div>
          <canvas ref={canvasRef} style={{ borderRadius: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.5)', width: fmt === 'sq' ? 'min(420px,100%)' : 'min(270px,100%)', height: 'auto' }} />
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{fmt === 'sq' ? '1080 × 1080' : '1080 × 1920'} px · PNG</div>
        </div>
      </div>
    </div>
  )
}
