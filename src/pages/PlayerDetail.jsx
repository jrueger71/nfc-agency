import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ImageCropper from '../components/ImageCropper'
import { useAuth } from '../App'

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
  return Math.floor((Date.now() - new Date(bd)) / (365.25*24*3600*1000))
}
function initials(name) {
  if (!name) return '?'
  const w = name.trim().split(' ')
  return (w[0][0] + (w[1] ? w[1][0] : '')).toUpperCase()
}
function getEmbedUrl(url) {
  if (!url) return null
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0`
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  return null
}
function getVideoSource(url) {
  if (!url) return 'Video'
  if (url.includes('vimeo')) return 'Vimeo'
  if (url.includes('youtube') || url.includes('youtu.be')) return 'YouTube'
  return 'Video'
}

const GOLD = '#C9A84C'
const INPUT = {
  width:'100%', background:'rgba(255,255,255,0.06)',
  border:'1px solid rgba(201,168,76,0.2)', borderRadius:6,
  padding:'10px 14px', fontSize:14, color:'#fff',
  fontFamily:'inherit', outline:'none'
}

export default function PlayerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [player, setPlayer] = useState(null)
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(true)
  const [videoUrl, setVideoUrl] = useState('')
  const [savingVideo, setSavingVideo] = useState(false)
  const [videoMsg, setVideoMsg] = useState('')
  const [uploadMsg, setUploadMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showCropper, setShowCropper] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const profilePhotoRef = useRef()
  const extraPhotoRef = useRef()

  const load = async () => {
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase.from('players_full_info').select('*').eq('id', id).single(),
      supabase.from('player_media').select('*').eq('player_id', id).order('display_order'),
    ])
    setPlayer(p)
    setMedia(m || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  // Handle cropped profile photo save
  const handleCropSave = async (publicUrl) => {
    console.log('Saving foto_url:', publicUrl, 'for player id:', id)
    const { error } = await supabase.from('players').update({ foto_url: publicUrl }).eq('id', id)
    if (error) {
      console.error('Error updating foto_url:', error)
      alert('Error guardando foto: ' + error.message)
      return
    }
    const existing = media.find(m => m.media_type === 'photo' && m.display_order === 1)
    if (existing) {
      await supabase.from('player_media').update({ url: publicUrl }).eq('id', existing.id)
    } else {
      await supabase.from('player_media').insert({ player_id: id, media_type: 'photo', url: publicUrl, display_order: 1 })
    }
    setShowCropper(false)
    load()
  }

  // Upload photo to Supabase Storage
  const uploadPhoto = async (file, isProfile = false) => {
    if (!file) return
    setUploading(true)
    setUploadMsg('Subiendo foto...')
    const ext = file.name.split('.').pop().toLowerCase()
    const path = `${id}/${isProfile ? 'profile' : 'gallery'}_${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('player-media')
      .upload(path, file, { upsert: true })

    if (error) {
      setUploadMsg('❌ ' + error.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('player-media').getPublicUrl(path)

    if (isProfile) {
      // Update main profile photo
      await supabase.from('players').update({ foto_url: publicUrl }).eq('id', id)
      // Update or insert in player_media as profile
      const existing = media.find(m => m.media_type === 'photo' && m.display_order === 1)
      if (existing) {
        await supabase.from('player_media').update({ url: publicUrl }).eq('id', existing.id)
      } else {
        await supabase.from('player_media').insert({ player_id: id, media_type: 'photo', url: publicUrl, display_order: 1 })
      }
    } else {
      // Gallery photo — find next order
      const photos = media.filter(m => m.media_type === 'photo')
      const nextOrder = photos.length > 0 ? Math.max(...photos.map(p => p.display_order)) + 1 : 2
      await supabase.from('player_media').insert({
        player_id: id, media_type: 'photo', url: publicUrl, display_order: nextOrder
      })
    }

    setUploadMsg('✓ Foto subida correctamente')
    setUploading(false)
    load()
    setTimeout(() => setUploadMsg(''), 3000)
  }

  const deleteMedia = async (mediaId) => {
    await supabase.from('player_media').delete().eq('id', mediaId)
    load()
  }

  const addVideo = async () => {
    if (!videoUrl) { setVideoMsg('Pega un link de Vimeo o YouTube'); return }
    const embed = getEmbedUrl(videoUrl)
    if (!embed) { setVideoMsg('Link no válido — usa Vimeo o YouTube'); return }
    setSavingVideo(true)
    const videos = media.filter(m => m.media_type === 'video')
    await supabase.from('player_media').insert({
      player_id: id, media_type: 'video', url: videoUrl,
      display_order: videos.length + 1
    })
    setSavingVideo(false)
    setVideoMsg('✓ Video agregado')
    setVideoUrl('')
    load()
    setTimeout(() => setVideoMsg(''), 3000)
  }

  if (loading) return (
    <div style={{ textAlign:'center', padding:80, fontFamily:'Bebas Neue', color:GOLD, letterSpacing:3, fontSize:20 }}>CARGANDO...</div>
  )
  if (!player) return (
    <div style={{ textAlign:'center', padding:80, color:'#94a3b8' }}>Jugador no encontrado</div>
  )

  const photos = media.filter(m => m.media_type === 'photo')
  const videos = media.filter(m => m.media_type === 'video')
  const profilePhoto = photos.find(p => p.display_order === 1)?.url || player.photo_url
  const galleryPhotos = photos.filter(p => p.display_order > 1)

  return (
    <div className="page">
      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', zIndex:999,
          display:'flex', alignItems:'center', justifyContent:'center', padding:20
        }}>
          <img src={lightbox} style={{ maxWidth:'90vw', maxHeight:'90vh', borderRadius:8, objectFit:'contain' }} alt="foto" />
          <button onClick={() => setLightbox(null)} style={{
            position:'absolute', top:20, right:20, background:'none', border:'none',
            color:'#fff', fontSize:28, cursor:'pointer'
          }}>✕</button>
        </div>
      )}

      <button onClick={() => navigate('/')} style={{
        fontSize:13, color:GOLD, background:'none', border:'none',
        cursor:'pointer', fontWeight:600, letterSpacing:.5,
        marginBottom:16, fontFamily:'inherit', padding:0
      }}>← VOLVER AL PLANTEL</button>

      {/* Header */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', gap:20, alignItems:'flex-start', flexWrap:'wrap' }}>
          {/* Profile photo */}
          <div style={{ position:'relative', flexShrink:0 }}>
            <div style={{
              width:100, height:100, borderRadius:'50%', border:`2px solid ${GOLD}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'Bebas Neue', fontSize:32, color:'#fff',
              overflow:'hidden', background:'#1B2B5E',
              cursor: session ? 'pointer' : 'default'
            }} onClick={() => session && profilePhotoRef.current?.click()}>
              {profilePhoto
                ? <img src={profilePhoto} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt={player.name} onError={e => e.target.style.display='none'} />
                : initials(player.name)
              }
            </div>
            {session && (
              <div style={{
                position:'absolute', bottom:2, right:2, width:26, height:26,
                borderRadius:'50%', background:GOLD, display:'flex',
                alignItems:'center', justifyContent:'center', fontSize:12,
                cursor:'pointer', border:'2px solid #0f1a3a'
              }} onClick={() => profilePhotoRef.current?.click()}>📷</div>
            )}
            <input ref={profilePhotoRef} type="file" accept="image/*" style={{ display:'none' }}
              onChange={e => uploadPhoto(e.target.files[0], true)} />
          </div>

          <div style={{ flex:1, minWidth:200 }}>
            <div className="bebas" style={{ fontSize:28, color:'#fff', marginBottom:4 }}>{player.name}</div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,0.45)', marginBottom:12 }}>
              {player.position || '—'} · {player.club_name || 'Sin club'} · {age(player.birth_date)} años
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
              <span className={`pill ${player.club_contract_active ? 'pill-ok' : 'pill-off'}`}>
                {player.club_contract_active ? 'CONTRATO ACTIVO' : 'SIN CONTRATO'}
              </span>
              {player.transfermarkt_valuation && (
                <span className="pill pill-warn">TM: {player.transfermarkt_valuation}</span>
              )}
              {player.transfermarkt_profile && (
                <a href={player.transfermarkt_profile} target="_blank" rel="noreferrer" style={{
                  fontSize:12, color:GOLD, fontWeight:600,
                  display:'inline-flex', alignItems:'center', gap:4,
                  background:'rgba(201,168,76,0.1)', padding:'4px 10px',
                  borderRadius:4, border:`1px solid rgba(201,168,76,0.3)`, textDecoration:'none'
                }}>🔗 Transfermarkt</a>
              )}
            </div>
            {uploadMsg && (
              <div style={{ fontSize:13, color: uploadMsg.startsWith('✓') ? '#4ade80':'#f87171', marginTop:8 }}>
                {uploadMsg}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Physical stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10, marginBottom:16 }}>
        {[
          { n: player.height ? player.height+' cm' : '—', l:'ALTURA' },
          { n: player.weight ? player.weight+' kg' : '—', l:'PESO' },
          { n: player.skill_foot || '—', l:'PIE HÁBIL' },
          { n: player.shoe_size || '—', l:'TALLA ZAPATO' },
        ].map(s => (
          <div key={s.l} className="card" style={{ textAlign:'center', padding:14 }}>
            <div className="bebas" style={{ fontSize:24, color:GOLD }}>{s.n}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', letterSpacing:1 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Public info — club + transfermarkt */}
      <div className="grid-2" style={{ marginBottom:16 }}>
        <div className="card">
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontWeight:600, letterSpacing:1.5, marginBottom:14 }}>INFORMACIÓN DEPORTIVA</div>
          {[
            ['Club actual', player.club_name || '—'],
            ['Posición', player.position || '—'],
            ['Edad', age(player.birth_date) !== '—' ? age(player.birth_date) + ' años' : '—'],
            ['Nacionalidad', player.nationality || 'Chileno/a'],
          ].map(([l,v]) => (
            <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:14 }}>
              <span style={{ color:'rgba(255,255,255,0.35)' }}>{l}</span>
              <span style={{ color:'rgba(255,255,255,0.8)', fontWeight:500 }}>{v}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontWeight:600, letterSpacing:1.5, marginBottom:14 }}>TRANSFERMARKT</div>
          {player.transfermarkt_valuation && (
            <div style={{ textAlign:'center', padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginBottom:4 }}>VALORIZACIÓN DE MERCADO</div>
              <div style={{ fontFamily:'Bebas Neue', fontSize:28, color:GOLD }}>{player.transfermarkt_valuation}</div>
            </div>
          )}
          {player.transfermarkt_profile ? (
            <a href={player.transfermarkt_profile} target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:14, padding:'10px', background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.25)', borderRadius:6, color:GOLD, textDecoration:'none', fontSize:13, fontWeight:600 }}>
              🔗 Ver perfil en Transfermarkt
            </a>
          ) : (
            <div style={{ textAlign:'center', padding:'14px 0', color:'rgba(255,255,255,0.2)', fontSize:13 }}>
              Sin perfil Transfermarkt
            </div>
          )}
          <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.05)' }}/>
            <span style={{ fontSize:10, color:'rgba(255,255,255,0.2)', letterSpacing:1 }}>REPRESENTADO POR</span>
            <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.05)' }}/>
          </div>
          <div style={{ textAlign:'center', marginTop:8 }}>
            <div style={{ fontFamily:'Bebas Neue', fontSize:13, color:GOLD, letterSpacing:1 }}>NUEVA FÚTBOL CHILE SpA</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>Agente FIFA · Lic. 202406-7288</div>
          </div>
        </div>
      </div>

      {/* Gallery — public */}
      {galleryPhotos.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div className="section-title">GALERÍA</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10 }}>
            {galleryPhotos.map(p => (
              <div key={p.id} style={{ position:'relative', borderRadius:8, overflow:'hidden', aspectRatio:'1', border:`1px solid rgba(201,168,76,0.15)`, cursor:'pointer' }}
                onClick={() => setLightbox(p.url)}>
                <img src={p.url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="foto" />
                {session && (
                  <button onClick={e => { e.stopPropagation(); deleteMedia(p.id) }} style={{
                    position:'absolute', top:6, right:6, background:'rgba(0,0,0,0.7)',
                    border:'none', borderRadius:'50%', width:24, height:24,
                    color:'#f87171', fontSize:12, cursor:'pointer', display:'flex',
                    alignItems:'center', justifyContent:'center'
                  }}>✕</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Videos — public */}
      {videos.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div className="section-title">VIDEOS</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
            {videos.map((v, i) => {
              const embedUrl = getEmbedUrl(v.url)
              return (
                <div key={v.id} className="card" style={{ padding:0, overflow:'hidden' }}>
                  {embedUrl ? (
                    <iframe src={embedUrl} style={{ width:'100%', height:200, border:'none', display:'block' }}
                      allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={`Video ${i+1}`} />
                  ) : (
                    <div style={{ height:120, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.3)', fontSize:13 }}>
                      Link no válido
                    </div>
                  )}
                  <div style={{ padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{getVideoSource(v.url)} · Video {i+1}</span>
                    {session && (
                      <button onClick={() => deleteMedia(v.id)} style={{ fontSize:11, color:'#f87171', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Admin media panel */}
      {session && (
        <div className="card" style={{ border:`1px solid rgba(201,168,76,0.25)` }}>
          <div style={{ fontSize:11, color:GOLD, fontWeight:600, letterSpacing:1.5, marginBottom:20 }}>
            GESTIÓN DE MULTIMEDIA
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:20 }}>

            {/* Profile photo */}
            <div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', fontWeight:600, marginBottom:10 }}>📷 Foto de perfil</div>
              {showCropper ? (
                <ImageCropper
                  shape="rect"
                  aspectRatio={3/4}
                  storagePath={`${id}/profile.jpg`}
                  label="Seleccionar foto de perfil"
                  onSave={handleCropSave}
                  onCancel={() => setShowCropper(false)}
                />
              ) : (
                <>
                  <button onClick={() => setShowCropper(true)}
                    style={{ width:'100%', background:'rgba(201,168,76,0.08)', border:'1px dashed rgba(201,168,76,0.35)',
                      borderRadius:6, padding:14, fontSize:14, color:GOLD, cursor:'pointer', fontFamily:'inherit' }}>
                    ✂️ Subir foto de perfil (3/4)
                  </button>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginTop:4 }}>JPG, PNG — formato 3/4 — ideal para foto de cuerpo completo</div>
                </>
              )}
            </div>

            {/* Gallery photos */}
            <div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', fontWeight:600, marginBottom:10 }}>
                🖼 Fotos adicionales ({galleryPhotos.length}/5)
              </div>
              <input ref={extraPhotoRef} type="file" accept="image/*" multiple style={{ display:'none' }}
                onChange={async e => {
                  const files = Array.from(e.target.files).slice(0, 5 - galleryPhotos.length)
                  for (const f of files) await uploadPhoto(f, false)
                }} />
              <button
                onClick={() => extraPhotoRef.current?.click()}
                disabled={uploading || galleryPhotos.length >= 5}
                style={{ width:'100%', background:'rgba(201,168,76,0.08)', border:'1px dashed rgba(201,168,76,0.35)',
                  borderRadius:6, padding:14, fontSize:14, color: galleryPhotos.length >= 5 ? 'rgba(255,255,255,0.2)' : GOLD,
                  cursor: galleryPhotos.length >= 5 ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
                {galleryPhotos.length >= 5 ? 'Máximo 5 fotos alcanzado' : uploading ? 'Subiendo...' : '+ Agregar fotos a galería'}
              </button>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginTop:4 }}>Puedes seleccionar varias a la vez</div>
            </div>

            {/* Video link */}
            <div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', fontWeight:600, marginBottom:10 }}>🎬 Agregar video</div>
              <input style={{ ...INPUT, marginBottom:8 }} value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                placeholder="https://vimeo.com/123456789" />
              <button className="btn-gold" onClick={addVideo} disabled={savingVideo} style={{ width:'100%' }}>
                {savingVideo ? 'GUARDANDO...' : '+ AGREGAR VIDEO'}
              </button>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginTop:4 }}>Vimeo o YouTube</div>
              {videoMsg && <div style={{ fontSize:13, color: videoMsg.startsWith('✓') ? '#4ade80':'#f87171', marginTop:6 }}>{videoMsg}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
