import { useState, useEffect, useRef } from 'react'
import ImageCropper from '../components/ImageCropper'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const GOLD = '#C9A84C'

function getEmbedUrl(url) {
  if (!url) return null
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0`
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  return null
}
const INPUT = {
  width:'100%', background:'rgba(255,255,255,0.06)',
  border:'1px solid rgba(201,168,76,0.2)', borderRadius:6,
  padding:'10px 14px', fontSize:14, color:'#fff',
  fontFamily:'inherit', outline:'none',
}
const LABEL = { fontSize:10, color:'rgba(255,255,255,0.45)', letterSpacing:1, display:'block', marginBottom:4, fontWeight:600 }

const TIPOS = [
  { value:'noticia', label:'Noticia', icon:'📰', color:'#3b82f6' },
  { value:'cumpleanos', label:'Cumpleaños', icon:'🎂', color:'#f59e0b' },
  { value:'contrato', label:'Contrato firmado', icon:'✍️', color:GOLD },
  { value:'gol', label:'Primer gol', icon:'⚽', color:'#4ade80' },
  { value:'premio', label:'Premio / Distinción', icon:'🏆', color:GOLD },
  { value:'hito', label:'Hito destacado', icon:'⭐', color:'#a78bfa' },
]

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CL', { day:'2-digit', month:'long', year:'numeric' })
}

function TipoTag({ tipo }) {
  const t = TIPOS.find(x => x.value === tipo) || TIPOS[0]
  return (
    <span style={{ fontSize:11, padding:'3px 10px', borderRadius:99, fontWeight:600, background:`${t.color}18`, color:t.color, border:`1px solid ${t.color}40` }}>
      {t.icon} {t.label}
    </span>
  )
}

export default function Noticias({ publicView = false }) {
  const { session, userRole } = useAuth()
  const isAdmin = !publicView && userRole === 'admin'
  const [noticias, setNoticias] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [showCropper, setShowCropper] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoRef = useRef()
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [filterTipo, setFilterTipo] = useState('')
  const [form, setForm] = useState({
    titulo:'', contenido:'', tipo:'noticia',
    jugador_id:'', fecha: new Date().toISOString().split('T')[0], visible:true,
    imagen_url:'', video_url:''
  })
  const setF = (k,v) => setForm(f=>({...f,[k]:v}))

  const load = async () => {
    setLoading(true)
    const query = supabase.from('noticias').select('*,players(name,foto_url)').order('fecha', {ascending:false})
    if (publicView) query.eq('visible', true)
    const [{ data:n }, { data:p }] = await Promise.all([
      query,
      supabase.from('players').select('id,name').order('name')
    ])
    setNoticias(n||[])
    setPlayers(p||[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const uploadPhoto = async (file) => {
    if (!file) return
    setUploadingPhoto(true)
    const ext = file.name.split('.').pop().toLowerCase()
    const path = `noticias/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('player-media').upload(path, file, { upsert:true })
    if (error) { setMsg('Error subiendo foto'); setUploadingPhoto(false); return }
    const { data:{ publicUrl } } = supabase.storage.from('player-media').getPublicUrl(path)
    setF('imagen_url', publicUrl)
    setUploadingPhoto(false)
    setMsg('✓ Foto cargada')
    setTimeout(()=>setMsg(''),2000)
  }

  const handleSave = async () => {
    if (!form.titulo || !form.fecha) { setMsg('Título y fecha son requeridos'); return }
    setSaving(true); setMsg('')
    const { error } = await supabase.from('noticias').insert({
      titulo: form.titulo,
      contenido: form.contenido||null,
      tipo: form.tipo,
      jugador_id: form.jugador_id||null,
      fecha: form.fecha,
      visible: form.visible,
      imagen_url: form.imagen_url||null,
      video_url: form.video_url||null,
    })
    setSaving(false)
    if (error) { setMsg('Error: '+error.message); return }
    setMsg('✓ Publicado')
    setForm({ titulo:'', contenido:'', tipo:'noticia', jugador_id:'', fecha:new Date().toISOString().split('T')[0], visible:true, imagen_url:'', video_url:'' })
    setShowForm(false)
    load()
    setTimeout(()=>setMsg(''),3000)
  }

  const handleDelete = async (id) => {
    await supabase.from('noticias').delete().eq('id', id)
    setDeleteConfirm(null)
    load()
  }

  const toggleVisible = async (n) => {
    await supabase.from('noticias').update({ visible: !n.visible }).eq('id', n.id)
    load()
  }

  const filtered = filterTipo ? noticias.filter(n=>n.tipo===filterTipo) : noticias

  if (loading) return <div style={{textAlign:'center',padding:60,fontFamily:'Bebas Neue',color:GOLD,letterSpacing:3}}>CARGANDO...</div>

  return (
    <div className={publicView ? '' : 'page'} style={publicView ? {padding:'72px 24px',maxWidth:1100,margin:'0 auto'} : {}}>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div onClick={()=>setDeleteConfirm(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div onClick={e=>e.stopPropagation()} className="card" style={{maxWidth:380,width:'100%',padding:28,textAlign:'center'}}>
            <div className="bebas" style={{fontSize:18,color:'#f87171',marginBottom:8}}>ELIMINAR NOTICIA</div>
            <p style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginBottom:20}}>{deleteConfirm.titulo}</p>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <button onClick={()=>handleDelete(deleteConfirm.id)} style={{background:'#f87171',color:'#fff',border:'none',borderRadius:5,padding:'9px 20px',fontFamily:'Bebas Neue',fontSize:14,letterSpacing:1,cursor:'pointer'}}>ELIMINAR</button>
              <button className="btn-ghost" onClick={()=>setDeleteConfirm(null)}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{textAlign:'center',marginBottom:48}}>
        {publicView && <div style={{fontSize:9,letterSpacing:4,color:GOLD,marginBottom:10}}>ÚLTIMAS NOVEDADES</div>}
        <h2 style={{fontFamily:'Bebas Neue',fontSize:publicView?'clamp(30px,5vw,50px)':'22px',color:publicView?'#fff':'var(--color-text-primary)',letterSpacing:2}}>
          {publicView ? 'NOTICIAS & HITOS' : 'GESTIÓN DE NOTICIAS'}
        </h2>
        {publicView && <div style={{width:40,height:2,background:GOLD,margin:'16px auto 0'}}/>}
      </div>

      {/* Admin controls */}
      {isAdmin && (
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8}}>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            <button style={{fontSize:10,padding:'4px 10px',borderRadius:3,border:`1px solid ${filterTipo?'rgba(255,255,255,0.1)':'rgba(201,168,76,0.3)'}`,background:!filterTipo?'rgba(201,168,76,0.1)':'transparent',color:!filterTipo?GOLD:'rgba(255,255,255,0.4)',cursor:'pointer',fontFamily:'inherit'}} onClick={()=>setFilterTipo('')}>Todos</button>
            {TIPOS.map(t=>(
              <button key={t.value} style={{fontSize:10,padding:'4px 10px',borderRadius:3,border:`1px solid ${filterTipo===t.value?t.color+'60':'rgba(255,255,255,0.1)'}`,background:filterTipo===t.value?t.color+'18':'transparent',color:filterTipo===t.value?t.color:'rgba(255,255,255,0.4)',cursor:'pointer',fontFamily:'inherit'}} onClick={()=>setFilterTipo(t.value)}>{t.icon} {t.label}</button>
            ))}
          </div>
          <button className="btn-gold" onClick={()=>setShowForm(!showForm)}>
            {showForm ? 'CANCELAR' : '+ PUBLICAR'}
          </button>
        </div>
      )}

      {/* Form */}
      {isAdmin && showForm && (
        <div className="card" style={{marginBottom:20,maxWidth:660}}>
          <div className="bebas" style={{fontSize:15,letterSpacing:2,color:GOLD,marginBottom:16}}>NUEVA PUBLICACIÓN</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div style={{gridColumn:'1/-1'}}>
              <label style={LABEL}>TÍTULO *</label>
              <input style={INPUT} value={form.titulo} onChange={e=>setF('titulo',e.target.value)} placeholder="¡Leonardo marca su primer gol profesional!"/>
            </div>
            <div>
              <label style={LABEL}>TIPO</label>
              <select style={INPUT} value={form.tipo} onChange={e=>setF('tipo',e.target.value)}>
                {TIPOS.map(t=><option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL}>FECHA *</label>
              <input style={INPUT} type="date" value={form.fecha} onChange={e=>setF('fecha',e.target.value)}/>
            </div>
            <div>
              <label style={LABEL}>JUGADOR (opcional)</label>
              <select style={INPUT} value={form.jugador_id} onChange={e=>setF('jugador_id',e.target.value)}>
                <option value="">Sin jugador específico</option>
                {players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,paddingTop:20}}>
              <input type="checkbox" id="visible" checked={form.visible} onChange={e=>setF('visible',e.target.checked)} style={{width:16,height:16,accentColor:GOLD,cursor:'pointer'}}/>
              <label htmlFor="visible" style={{...LABEL,margin:0,cursor:'pointer',fontSize:12}}>Visible al público</label>
            </div>
            <div style={{gridColumn:'1/-1'}}>
              <label style={LABEL}>CONTENIDO</label>
              <textarea style={{...INPUT,resize:'vertical',minHeight:80}} value={form.contenido} onChange={e=>setF('contenido',e.target.value)} placeholder="Detalle de la noticia o hito..."/>
            </div>
            <div>
              <label style={LABEL}>FOTO</label>
              {form.imagen_url ? (
                <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(74,222,128,0.08)',border:'1px solid rgba(74,222,128,0.25)',borderRadius:5,padding:'8px 12px'}}>
                  <img src={form.imagen_url} style={{width:48,height:32,objectFit:'cover',borderRadius:3}} alt="preview"/>
                  <span style={{fontSize:12,color:'#4ade80',flex:1}}>✓ Foto cargada</span>
                  <button type="button" onClick={()=>setF('imagen_url','')} style={{fontSize:10,color:'#f87171',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>Eliminar</button>
                </div>
              ) : showCropper ? (
                <ImageCropper
                  shape="rect"
                  aspectRatio={16/9}
                  storagePath={`noticias/noticia_${Date.now()}.jpg`}
                  label="Seleccionar foto para la noticia"
                  onSave={(url) => { setF('imagen_url', url); setShowCropper(false) }}
                  onCancel={() => setShowCropper(false)}
                />
              ) : (
                <button type="button" onClick={()=>setShowCropper(true)}
                  style={{...INPUT,textAlign:'center',cursor:'pointer',color:GOLD,borderStyle:'dashed'}}>
                  ✂️ Subir y recortar foto
                </button>
              )}
            </div>
            <div>
              <label style={LABEL}>VIDEO (Vimeo o YouTube)</label>
              <input style={INPUT} value={form.video_url||''} onChange={e=>setF('video_url',e.target.value)} placeholder="https://vimeo.com/123456789"/>
            </div>
          </div>
          <div style={{display:'flex',gap:8,marginTop:16,alignItems:'center'}}>
            <button className="btn-gold" onClick={handleSave} disabled={saving}>{saving?'PUBLICANDO...':'PUBLICAR'}</button>
            {msg && <span style={{fontSize:12,color:msg.startsWith('✓')?'#4ade80':'#f87171'}}>{msg}</span>}
          </div>
        </div>
      )}

      {/* News grid */}
      {filtered.length === 0 ? (
        <div style={{textAlign:'center',padding:60,color:'rgba(255,255,255,0.25)',fontSize:14}}>Sin publicaciones aún</div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
          {filtered.map(n => {
            const tipo = TIPOS.find(t=>t.value===n.tipo)||TIPOS[0]
            return (
              <div key={n.id} style={{background:'#0f1a3a',border:`1px solid rgba(201,168,76,0.12)`,borderRadius:10,overflow:'hidden',transition:'all .2s',opacity:!n.visible&&isAdmin?0.5:1}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=GOLD}
                onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(201,168,76,0.12)'}>
                {/* Color accent top */}
                <div style={{height:3,background:tipo.color,opacity:0.7}}/>
                <div style={{padding:'16px 18px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10,gap:8}}>
                    <TipoTag tipo={n.tipo}/>
                    <span style={{fontSize:11,color:'rgba(255,255,255,0.3)',whiteSpace:'nowrap'}}>{fmtDate(n.fecha)}</span>
                  </div>
                  <div style={{fontFamily:'Bebas Neue',fontSize:16,color:'#fff',letterSpacing:.5,lineHeight:1.3,marginBottom:8}}>{n.titulo}</div>
                  {n.players?.name && (
                    <div style={{fontSize:11,color:GOLD,fontWeight:600,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
                      <div style={{width:20,height:20,borderRadius:'50%',background:'#1B2B5E',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,color:'#fff',overflow:'hidden',border:`1px solid rgba(201,168,76,0.3)`}}>
                        {n.players.foto_url ? <img src={n.players.foto_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/> : n.players.name[0]}
                      </div>
                      {n.players.name}
                    </div>
                  )}
                  {n.imagen_url && (
                    <div style={{margin:'10px 0',borderRadius:6,overflow:'hidden',maxHeight:180}}>
                      <img src={n.imagen_url} style={{width:'100%',objectFit:'cover',display:'block'}} alt={n.titulo}/>
                    </div>
                  )}
                  {n.contenido && <p style={{fontSize:13,color:'rgba(255,255,255,0.45)',lineHeight:1.6,marginBottom:n.video_url?8:0}}>{n.contenido}</p>}
                  {n.video_url && getEmbedUrl(n.video_url) && (
                    <div style={{marginTop:8,borderRadius:6,overflow:'hidden'}}>
                      <iframe src={getEmbedUrl(n.video_url)} style={{width:'100%',height:180,border:'none',display:'block'}}
                        allow="autoplay; fullscreen" allowFullScreen title={n.titulo}/>
                    </div>
                  )}
                  {isAdmin && (
                    <div style={{display:'flex',gap:8,marginTop:12,paddingTop:10,borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                      <button onClick={()=>toggleVisible(n)} style={{fontSize:10,padding:'3px 8px',borderRadius:3,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontFamily:'inherit'}}>
                        {n.visible?'Ocultar':'Publicar'}
                      </button>
                      <button onClick={()=>setDeleteConfirm(n)} style={{fontSize:10,padding:'3px 8px',borderRadius:3,border:'1px solid rgba(248,113,113,0.2)',background:'rgba(248,113,113,0.08)',color:'#f87171',cursor:'pointer',fontFamily:'inherit'}}>
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
