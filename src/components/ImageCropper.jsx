import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const GOLD = '#C9A84C'

export default function ImageCropper({ 
  onSave,        // callback(publicUrl)
  onCancel,
  shape = 'circle',   // 'circle' | 'rect'
  aspectRatio = 1,    // 1 for circle, 16/9 or 4/3 for rect
  storagePath,        // e.g. 'jugadores/player-id.jpg'
  label = 'Seleccionar imagen',
}) {
  const [imgSrc, setImgSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0, size: 200 })
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const [dragStart, setDragStart] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 })
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 })

  const canvasRef = useRef()
  const fileRef = useRef()
  const imgRef = useRef()
  const containerRef = useRef()

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setImgSrc(ev.target.result)
    reader.readAsDataURL(file)
  }

  const onImgLoad = (e) => {
    const img = e.target
    setImgNatural({ w: img.naturalWidth, h: img.naturalHeight })
    const maxW = containerRef.current?.offsetWidth || 400
    const scale = Math.min(maxW / img.naturalWidth, 380 / img.naturalHeight)
    const dw = Math.round(img.naturalWidth * scale)
    const dh = Math.round(img.naturalHeight * scale)
    setDisplaySize({ w: dw, h: dh })
    const initSize = Math.round(Math.min(dw, dh) * 0.7)
    setCrop({
      x: Math.round((dw - initSize) / 2),
      y: Math.round((dh - initSize * (shape === 'rect' ? 1/aspectRatio : 1)) / 2),
      size: initSize,
    })
  }

  const cropH = shape === 'rect' ? Math.round(crop.size / aspectRatio) : crop.size

  const getPos = (e, el) => {
    const rect = el.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const onMouseDown = useCallback((e, type) => {
    e.preventDefault()
    const overlay = e.currentTarget.parentElement
    const pos = getPos(e, overlay)
    if (type === 'drag') {
      setDragging(true)
      setDragStart({ mx: pos.x, my: pos.y, cx: crop.x, cy: crop.y })
    } else {
      setResizing(true)
      setDragStart({ mx: pos.x, my: pos.y, size: crop.size })
    }
  }, [crop])

  const onMouseMove = useCallback((e) => {
    if (!dragging && !resizing) return
    e.preventDefault()
    const overlay = containerRef.current?.querySelector('.crop-overlay')
    if (!overlay) return
    const pos = getPos(e, overlay)
    if (dragging && dragStart) {
      const dx = pos.x - dragStart.mx
      const dy = pos.y - dragStart.my
      const newX = Math.max(0, Math.min(dragStart.cx + dx, displaySize.w - crop.size))
      const newY = Math.max(0, Math.min(dragStart.cy + dy, displaySize.h - cropH))
      setCrop(c => ({ ...c, x: newX, y: newY }))
    }
    if (resizing && dragStart) {
      const dx = pos.x - dragStart.mx
      const minSize = 50
      const maxSize = Math.min(
        displaySize.w - crop.x,
        shape === 'rect' ? (displaySize.h - crop.y) * aspectRatio : displaySize.h - crop.y
      )
      const newSize = Math.max(minSize, Math.min(dragStart.size + dx, maxSize))
      setCrop(c => ({ ...c, size: newSize }))
    }
  }, [dragging, resizing, dragStart, crop, displaySize, cropH, shape, aspectRatio])

  const onMouseUp = useCallback(() => {
    setDragging(false)
    setResizing(false)
    setDragStart(null)
  }, [])

  const handleCrop = async () => {
    if (!imgRef.current || !storagePath) return
    setUploading(true)
    setMsg('')

    const canvas = canvasRef.current
    const scaleX = imgNatural.w / displaySize.w
    const scaleY = imgNatural.h / displaySize.h

    const outputSize = shape === 'circle' ? 400 : 800
    const outputH = shape === 'rect' ? Math.round(outputSize / aspectRatio) : outputSize

    canvas.width = outputSize
    canvas.height = outputH
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, outputSize, outputH)

    // Only clip to circle in the canvas output if shape is circle
    // For player profiles shown in grid, CSS handles the circle — save as square
    if (shape === 'circle') {
      ctx.beginPath()
      ctx.arc(outputSize/2, outputH/2, outputSize/2, 0, Math.PI*2)
      ctx.clip()
    }

    ctx.drawImage(
      imgRef.current,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.size * scaleX,
      cropH * scaleY,
      0, 0,
      outputSize, outputH
    )

    const mimeType = shape === 'circle' ? 'image/png' : 'image/jpeg'
    const quality = shape === 'circle' ? undefined : 0.92
    canvas.toBlob(async (blob) => {
      if (!blob) { setMsg('Error generando imagen'); setUploading(false); return }
      const contentType = shape === 'circle' ? 'image/png' : 'image/jpeg'
      const { error } = await supabase.storage
        .from('player-media')
        .upload(storagePath, blob, { upsert: true, contentType })
      if (error) { setMsg('Error: ' + error.message); setUploading(false); return }
      const { data: { publicUrl } } = supabase.storage.from('player-media').getPublicUrl(storagePath)
      setUploading(false)
      onSave?.(publicUrl)
    }, mimeType, quality)
  }

  return (
    <div ref={containerRef} style={{ maxWidth: 480, width: '100%' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {!imgSrc ? (
        <div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
          <button onClick={() => fileRef.current?.click()}
            style={{ width: '100%', padding: '32px 16px', background: 'rgba(201,168,76,0.05)', border: '2px dashed rgba(201,168,76,0.3)', borderRadius: 8, cursor: 'pointer', color: GOLD, fontFamily: 'Bebas Neue', fontSize: 15, letterSpacing: 2 }}>
            📷 {label}
          </button>
          <button onClick={onCancel} style={{ marginTop: 8, width: '100%', padding: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>
            Cancelar
          </button>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textAlign: 'center' }}>
            Arrastra el recuadro para posicionar · Esquina inferior derecha para redimensionar
          </div>

          {/* Image + crop overlay */}
          <div style={{ position: 'relative', display: 'inline-block', userSelect: 'none', touchAction: 'none' }}
            onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
            onTouchMove={onMouseMove} onTouchEnd={onMouseUp}>
            <img
              ref={imgRef}
              src={imgSrc}
              onLoad={onImgLoad}
              alt="crop"
              style={{ display: 'block', width: displaySize.w, height: displaySize.h, borderRadius: 4 }}
              draggable={false}
            />

            {/* Dark overlay */}
            <div className="crop-overlay" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {/* Top */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: crop.y, background: 'rgba(0,0,0,0.55)' }} />
              {/* Bottom */}
              <div style={{ position: 'absolute', top: crop.y + cropH, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)' }} />
              {/* Left */}
              <div style={{ position: 'absolute', top: crop.y, left: 0, width: crop.x, height: cropH, background: 'rgba(0,0,0,0.55)' }} />
              {/* Right */}
              <div style={{ position: 'absolute', top: crop.y, left: crop.x + crop.size, right: 0, height: cropH, background: 'rgba(0,0,0,0.55)' }} />

              {/* Crop box */}
              <div style={{
                position: 'absolute', top: crop.y, left: crop.x,
                width: crop.size, height: cropH,
                border: `2px solid ${GOLD}`,
                borderRadius: shape === 'circle' ? '50%' : 4,
                boxShadow: `0 0 0 1px rgba(0,0,0,0.5)`,
                cursor: 'move',
                pointerEvents: 'all',
              }}
                onMouseDown={e => onMouseDown(e, 'drag')}
                onTouchStart={e => onMouseDown(e, 'drag')}>
                {/* Grid lines */}
                {shape === 'rect' && <>
                  <div style={{ position: 'absolute', top: '33%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.3)' }} />
                  <div style={{ position: 'absolute', top: '66%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.3)' }} />
                  <div style={{ position: 'absolute', left: '33%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.3)' }} />
                  <div style={{ position: 'absolute', left: '66%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.3)' }} />
                </>}
                {/* Corners */}
                {[['0%','0%'],['100%','0%'],['0%','100%'],['100%','100%']].map(([l,t],i) => (
                  <div key={i} style={{ position:'absolute', left:l, top:t, width:10, height:10, background:GOLD, borderRadius:2, transform:'translate(-50%,-50%)' }} />
                ))}
                {/* Resize handle */}
                <div style={{
                  position: 'absolute', bottom: -6, right: -6,
                  width: 16, height: 16, background: GOLD, borderRadius: 3,
                  cursor: 'se-resize', pointerEvents: 'all',
                }}
                  onMouseDown={e => { e.stopPropagation(); onMouseDown(e, 'resize') }}
                  onTouchStart={e => { e.stopPropagation(); onMouseDown(e, 'resize') }} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={handleCrop} disabled={uploading}
              style={{ flex: 1, padding: '10px', background: GOLD, color: '#0f1a3a', border: 'none', borderRadius: 5, fontFamily: 'Bebas Neue', fontSize: 14, letterSpacing: 1, cursor: uploading ? 'wait' : 'pointer' }}>
              {uploading ? 'SUBIENDO...' : '✓ USAR ESTA IMAGEN'}
            </button>
            <button onClick={() => { setImgSrc(null); fileRef.current.value = '' }}
              style={{ padding: '10px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 5, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>
              Cambiar
            </button>
            <button onClick={onCancel}
              style={{ padding: '10px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>
              Cancelar
            </button>
          </div>
          {msg && <div style={{ fontSize: 12, color: msg.startsWith('Error') ? '#f87171' : '#4ade80', marginTop: 8, textAlign: 'center' }}>{msg}</div>}
        </div>
      )}
    </div>
  )
}
