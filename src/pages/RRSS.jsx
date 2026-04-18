import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const NAVY='#1B2B5E', GOLD='#C9A84C', BG='#06090f'
const GOLD_C='#C9A84C'
const INPUT={width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(201,168,76,0.2)',borderRadius:6,padding:'8px 12px',fontSize:13,color:'#fff',fontFamily:'inherit',outline:'none'}
const LABEL={fontSize:10,color:'rgba(255,255,255,0.45)',letterSpacing:1,display:'block',marginBottom:4,fontWeight:600}

const TMPLS=[
  {id:'welcome',label:'Bienvenida',icon:'🤝',tag:'NUEVO REPRESENTADO',msg:'¡Bienvenido a la familia!'},
  {id:'birthday',label:'Cumpleaños',icon:'🎂',tag:'¡FELIZ CUMPLEAÑOS!',msg:'¡Un gran año te espera!'},
  {id:'contract',label:'1er Contrato',icon:'✍️',tag:'PRIMER CONTRATO PROFESIONAL',msg:'¡El primer paso de muchos!'},
  {id:'goal',label:'1er Gol',icon:'⚽',tag:'PRIMER GOL PROFESIONAL',msg:'¡El primero de muchos!'},
  {id:'renewal',label:'Renovación',icon:'🔄',tag:'RENOVACIÓN DE CONTRATO',msg:'¡Seguimos construyendo juntos!'},
]

export default function RRSS() {
  const [players, setPlayers] = useState([])
  const [tmpl, setTmpl] = useState(TMPLS[0])
  const [fmt, setFmt] = useState('sq')
  const [photoObj, setPhotoObj] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [st, setSt] = useState({name:'NOMBRE JUGADOR',club:'Club',msg:'¡Bienvenido a la familia!'})
  const canvasRef = useRef()
  const fileRef = useRef()

  useEffect(() => {
    supabase.from('players_full_info').select('id,name,club_name,foto_url').order('name')
      .then(({data})=>setPlayers(data||[]))
  }, [])

  const loadPlayer = async (player) => {
    setSt(s=>({...s, name:player.name.toUpperCase(), club:player.club_name||''}))
    setPhotoObj(null); setPhotoPreview(null)
    if (player.foto_url) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => { setPhotoObj(img); setPhotoPreview(player.foto_url) }
      img.onerror = () => {}
      img.src = player.foto_url
    }
  }

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onload = () => { setPhotoObj(img); setPhotoPreview(ev.target.result) }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  const draw = useCallback(() => {
    const cvs = canvasRef.current; if (!cvs) return
    const ctx = cvs.getContext('2d')
    const w=1080, h=fmt==='sq'?1080:1920
    cvs.width=w; cvs.height=h

    // Background
    ctx.fillStyle=BG; ctx.fillRect(0,0,w,h)
    const tg=ctx.createRadialGradient(w/2,0,0,w/2,0,h*0.7)
    tg.addColorStop(0,NAVY+'99'); tg.addColorStop(1,'transparent')
    ctx.fillStyle=tg; ctx.fillRect(0,0,w,h)

    // Beams
    const beam=(cx,cy,angle,len,rgb,a)=>{
      ctx.save();ctx.translate(cx,cy);ctx.rotate(angle)
      const g=ctx.createLinearGradient(0,0,len,0)
      g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(1,`rgba(${rgb},0)`)
      ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,-80);ctx.lineTo(len,0);ctx.lineTo(0,80);ctx.closePath();ctx.fill();ctx.restore()
    }
    beam(w*0.2,h*0.05,0.25,w*1.3,'100,140,255',0.06)
    beam(w*0.8,h*0.03,-0.3,w*1.2,'201,168,76',0.05)

    // Stars
    const rng=(()=>{let s=42;return()=>{s=(s*9301+49297)%233280;return s/233280}})()
    for(let i=0;i<120;i++){
      ctx.beginPath();ctx.arc(rng()*w,rng()*h*0.75,rng()*1.8+0.2,0,Math.PI*2)
      ctx.fillStyle=`rgba(255,255,255,${rng()*0.5+0.1})`;ctx.fill()
    }

    // Photo
    if (photoObj) {
      const ph=fmt==='sq'?h*0.65:h*0.58
      const ia=photoObj.naturalWidth/photoObj.naturalHeight, ca=w/ph
      let sx=0,sy=0,sw=photoObj.naturalWidth,sh=photoObj.naturalHeight
      if(ia>ca){sw=sh*ca;sx=(photoObj.naturalWidth-sw)/2}else{sh=sw/ca;sy=0}
      ctx.drawImage(photoObj,sx,sy,sw,sh,0,0,w,ph)
      const fg=ctx.createLinearGradient(0,ph*0.35,0,ph)
      fg.addColorStop(0,'rgba(6,9,15,0)');fg.addColorStop(0.7,'rgba(6,9,15,0.75)');fg.addColorStop(1,'rgba(6,9,15,1)')
      ctx.fillStyle=fg;ctx.fillRect(0,0,w,ph)
      const lgL=ctx.createLinearGradient(0,0,w*0.18,0);lgL.addColorStop(0,'rgba(6,9,15,0.6)');lgL.addColorStop(1,'rgba(6,9,15,0)')
      ctx.fillStyle=lgL;ctx.fillRect(0,0,w*0.18,ph)
      const lgR=ctx.createLinearGradient(w,0,w*0.82,0);lgR.addColorStop(0,'rgba(6,9,15,0.6)');lgR.addColorStop(1,'rgba(6,9,15,0)')
      ctx.fillStyle=lgR;ctx.fillRect(w*0.82,0,w*0.18,ph)
    } else {
      ctx.font=`900 ${w*0.45}px sans-serif`;ctx.textAlign='center'
      ctx.fillStyle='rgba(27,43,94,0.2)';ctx.fillText('NFC',w/2,h*0.52)
    }

    // Text block
    const isStory=fmt==='st'
    const blockY=photoObj?(isStory?h*0.56:h*0.63):h*0.36

    const wrapLines=(text,maxW,font)=>{
      ctx.font=font
      const words=text.split(' '),lines=[];let line=''
      for(const wd of words){const t=line?line+' '+wd:wd;if(ctx.measureText(t).width>maxW){if(line)lines.push(line);line=wd}else line=t}
      if(line)lines.push(line);return lines
    }

    // Tag pill
    const tagSize=w*0.026;ctx.font=`700 ${tagSize}px sans-serif`
    const tagTxt=tmpl.tag,tagW=ctx.measureText(tagTxt).width+w*0.06,tagH=tagSize*1.9
    ctx.fillStyle=GOLD;ctx.beginPath();ctx.roundRect((w-tagW)/2,blockY,tagW,tagH,tagH/2);ctx.fill()
    ctx.fillStyle=NAVY;ctx.textAlign='center';ctx.fillText(tagTxt,w/2,blockY+tagH*0.7)

    // Message
    const msgSize=isStory?w*0.052:w*0.046
    const msgLines=wrapLines(st.msg,w*0.84,`500 ${msgSize}px sans-serif`)
    ctx.font=`500 ${msgSize}px sans-serif`;ctx.fillStyle='rgba(255,255,255,0.9)';ctx.textAlign='center'
    const msgY=blockY+tagH+msgSize*1.1
    msgLines.forEach((l,i)=>ctx.fillText(l,w/2,msgY+i*msgSize*1.2))
    const afterMsg=msgY+msgLines.length*msgSize*1.2

    // Player name
    const nameSize=isStory?w*0.098:w*0.086
    const nameLines=wrapLines(st.name,w*0.88,`900 ${nameSize}px sans-serif`)
    ctx.font=`900 ${nameSize}px sans-serif`;ctx.fillStyle=GOLD;ctx.textAlign='center'
    const nameY=afterMsg+nameSize*0.35
    nameLines.forEach((l,i)=>ctx.fillText(l,w/2,nameY+i*nameSize*1.05))
    const afterName=nameY+nameLines.length*nameSize*1.05

    // Club
    if(st.club){
      ctx.font=`400 ${w*0.028}px sans-serif`;ctx.fillStyle='rgba(255,255,255,0.45)';ctx.textAlign='center'
      ctx.fillText(st.club,w/2,afterName+w*0.012)
    }

    // Footer
    ctx.strokeStyle=GOLD;ctx.lineWidth=2;ctx.globalAlpha=0.45
    ctx.beginPath();ctx.moveTo(w*0.08,h-w*0.095);ctx.lineTo(w*0.92,h-w*0.095);ctx.stroke()
    ctx.globalAlpha=1;ctx.textAlign='center'
    ctx.font=`700 ${w*0.032}px sans-serif`;ctx.fillStyle=GOLD
    ctx.fillText('NUEVA FÚTBOL CHILE SpA',w/2,h-w*0.058)
    ctx.font=`400 ${w*0.02}px sans-serif`;ctx.fillStyle='rgba(255,255,255,0.4)'
    ctx.fillText('Agencia de Representación · Agente FIFA Lic. 202406-7288',w/2,h-w*0.034)
    ctx.fillText('@nuevafutbolspa · nuevafutbolspa.com',w/2,h-w*0.013)
  }, [photoObj, tmpl, fmt, st])

  useEffect(() => { draw() }, [draw])

  const download = () => {
    const a = document.createElement('a')
    a.download = `NFC_${tmpl.id}_${st.name.replace(/\s+/g,'_')}_${fmt}.png`
    a.href = canvasRef.current.toDataURL('image/png',1); a.click()
  }

  return (
    <div className="page">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8}}>
        <div className="section-title" style={{margin:0}}>GENERADOR REDES SOCIALES</div>
        <button onClick={download} className="btn-gold">⬇ DESCARGAR PNG</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'290px 1fr',gap:16,alignItems:'start'}}>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>

          <div className="card">
            <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',fontWeight:600,letterSpacing:1.5,marginBottom:10}}>PLANTILLA</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5}}>
              {TMPLS.map(t=>(
                <button key={t.id} onClick={()=>{setTmpl(t);setSt(s=>({...s,msg:t.msg}))}}
                  style={{padding:'6px 4px',fontSize:10,borderRadius:5,border:`1px solid ${tmpl.id===t.id?GOLD_C:'rgba(255,255,255,0.1)'}`,background:tmpl.id===t.id?'rgba(201,168,76,0.15)':'transparent',color:tmpl.id===t.id?GOLD_C:'rgba(255,255,255,0.4)',cursor:'pointer',fontFamily:'inherit',textAlign:'center',lineHeight:1.5}}>
                  {t.icon}<br/>{t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',fontWeight:600,letterSpacing:1.5,marginBottom:10}}>JUGADOR</div>
            <div style={{marginBottom:8}}>
              <label style={LABEL}>CARGAR DESDE PLANTEL</label>
              <select style={INPUT} onChange={e=>{const p=players.find(x=>x.id===e.target.value);if(p)loadPlayer(p)}}>
                <option value="">— Seleccionar —</option>
                {players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{marginBottom:8}}>
              <label style={LABEL}>NOMBRE</label>
              <input style={INPUT} value={st.name} onChange={e=>setSt(s=>({...s,name:e.target.value.toUpperCase()}))}/>
            </div>
            <div style={{marginBottom:8}}>
              <label style={LABEL}>CLUB</label>
              <input style={INPUT} value={st.club} onChange={e=>setSt(s=>({...s,club:e.target.value}))}/>
            </div>
            <div>
              <label style={LABEL}>MENSAJE</label>
              <textarea style={{...INPUT,resize:'vertical',minHeight:56}} value={st.msg} onChange={e=>setSt(s=>({...s,msg:e.target.value}))}/>
            </div>
          </div>

          <div className="card">
            <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',fontWeight:600,letterSpacing:1.5,marginBottom:10}}>FOTO</div>
            {photoPreview ? (
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <img src={photoPreview} style={{width:44,height:58,objectFit:'cover',objectPosition:'top',borderRadius:4}} alt=""/>
                <div style={{flex:1,fontSize:11,color:'#4ade80'}}>✓ Foto cargada</div>
                <button onClick={()=>{setPhotoObj(null);setPhotoPreview(null);if(fileRef.current)fileRef.current.value=''}}
                  style={{fontSize:10,color:'#f87171',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>Quitar</button>
              </div>
            ) : (
              <div style={{border:'1.5px dashed rgba(201,168,76,0.3)',borderRadius:6,padding:14,textAlign:'center',cursor:'pointer',position:'relative'}}
                onClick={()=>fileRef.current?.click()}>
                <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
                <div style={{fontSize:12,color:GOLD_C}}>📷 Subir foto</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.25)',marginTop:2}}>O selecciona un jugador arriba</div>
              </div>
            )}
          </div>

          <div className="card">
            <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',fontWeight:600,letterSpacing:1.5,marginBottom:10}}>FORMATO</div>
            <div style={{display:'flex',gap:6}}>
              {[['sq','1:1 Feed'],['st','9:16 Story']].map(([id,lbl])=>(
                <button key={id} onClick={()=>setFmt(id)}
                  style={{flex:1,padding:8,fontSize:12,borderRadius:5,border:`1px solid ${fmt===id?GOLD_C:'rgba(255,255,255,0.1)'}`,background:fmt===id?'rgba(201,168,76,0.15)':'transparent',color:fmt===id?GOLD_C:'rgba(255,255,255,0.4)',cursor:'pointer',fontFamily:'inherit'}}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,position:'sticky',top:70}}>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.3)',letterSpacing:1}}>VISTA PREVIA</div>
          <canvas ref={canvasRef} style={{borderRadius:8,boxShadow:'0 4px 24px rgba(0,0,0,0.5)',width:fmt==='sq'?'min(400px,100%)':'min(260px,100%)',height:'auto'}}/>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.2)'}}>{fmt==='sq'?'1080 × 1080':'1080 × 1920'} px · PNG</div>
        </div>
      </div>
    </div>
  )
}
