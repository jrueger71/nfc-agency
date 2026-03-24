import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const GOLD = '#C9A84C'

export default function MediaUploader({ playerId, playerName, onUploadComplete }) {
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [preview, setPreview] = useState(null)
  const photoRef = useRef()
  const videoRef = useRef()

  const uploadFile = async (file, type) => {
    if (!file || !playerId) { setMsg('Selecciona un jugador primero'); return }
    setUploading(true)
    setMsg('')

    const ext = file.name.split('.').pop().toLowerCase()
    const fileName = `${playerId}/${type}_${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('player-media')
      .upload(fileName, file, { upsert: true })

    if (uploadError) { setMsg('Error subiendo archivo: ' + uploadError.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('player-media').getPublicUrl(fileName)

    if (type === 'photo') {
      // Update player photo
      await supabase.from('players').update({ foto_url: publicUrl }).eq('id', playerId)
      // Also insert into player_media
      await supabase.from('player_media').upsert({
        player_id: playerId, media_type: 'photo', url: publicUrl, display_order: 1
      }, { onConflict: 'player_id,media_type' })
    } else {
      // Insert video into player_media
      const { data: existing } = await supabase.from('player_media')
        .select('display_order').eq('player_id', playerId).order('display_order', { ascending: false }).limit(1)
      const nextOrder = (existing?.[0]?.display_order || 0) + 1
      await supabase.from('player_media').insert({
        player_id: playerId, media_type: 'video', url: publicUrl, display_order: nextOrder
      })
    }

    setMsg(`✓ ${type === 'photo' ? 'Foto' : 'Video'} subido correctamente`)
    setUploading(false)
    onUploadComplete?.()
  }

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(file)
    uploadFile(file, 'photo')
  }

  const handleVideo = (e) => {
    const file = e.target.files[0]
    if (!file) return
    uploadFile(file, 'video')
  }

  const INPUT_STYLE = {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)',
    borderRadius: 6, padding: '10px 14px', fontSize: 14, color: '#fff',
    fontFamily: 'inherit', outline: 'none', width: '100%', cursor: 'pointer'
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 1.5, marginBottom: 16 }}>
        MULTIMEDIA — {playerName?.toUpperCase() || 'JUGADOR'}
      </div>

      <div className="grid-2" style={{ gap: 16 }}>
        {/* Photo upload */}
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: 500 }}>
            📷 Foto de perfil
          </div>
          {preview && (
            <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${GOLD}`, marginBottom: 10 }}>
              <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="preview" />
            </div>
          )}
          <input ref={photoRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
          <button onClick={() => photoRef.current?.click()} disabled={uploading}
            style={{ ...INPUT_STYLE, textAlign: 'center', cursor: 'pointer', color: GOLD, borderColor: 'rgba(201,168,76,0.35)' }}>
            {uploading ? 'Subiendo...' : '+ Seleccionar foto'}
          </button>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>JPG, PNG — máx 5MB</div>
        </div>

        {/* Video upload */}
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: 500 }}>
            🎬 Video del jugador
          </div>
          <input ref={videoRef} type="file" accept="video/*" onChange={handleVideo} style={{ display: 'none' }} />
          <button onClick={() => videoRef.current?.click()} disabled={uploading}
            style={{ ...INPUT_STYLE, textAlign: 'center', cursor: 'pointer', color: GOLD, borderColor: 'rgba(201,168,76,0.35)' }}>
            {uploading ? 'Subiendo...' : '+ Seleccionar video'}
          </button>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>MP4, MOV — máx 50MB</div>
        </div>
      </div>

      {msg && (
        <div style={{ marginTop: 14, fontSize: 13, color: msg.startsWith('✓') ? '#4ade80' : '#f87171', fontWeight: 500 }}>
          {msg}
        </div>
      )}
    </div>
  )
}
