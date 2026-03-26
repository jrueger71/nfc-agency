import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const INPUT = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(201,168,76,0.2)',
  borderRadius: 5,
  padding: '9px 12px',
  fontSize: 13,
  color: '#fff',
  fontFamily: 'inherit',
  outline: 'none',
}
const LABEL = {
  fontSize: 10,
  color: 'rgba(255,255,255,0.45)',
  letterSpacing: 1,
  display: 'block',
  marginBottom: 4,
  fontWeight: 600,
}
const GOLD = '#C9A84C'

export default function AgencyContractForm({ contract, playerId, playerName, onSave, onCancel }) {
  const isEdit = !!contract?.id
  const [form, setForm] = useState({
    incorporation_date: '',
    contract_date: '',
    contract_duration_months: '',
    contract_active: true,
    contract_pdf_url: '',
    ...contract,
    player_id: playerId || contract?.player_id,
  })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const fileRef = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Extract filename from URL
  const getPdfName = (url) => {
    if (!url) return null
    const parts = url.split('/')
    return decodeURIComponent(parts[parts.length - 1])
  }

  const handleUploadPdf = async (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      setMsg('Solo se permiten archivos PDF')
      return
    }

    setUploading(true)
    setMsg('')

    // Build filename: Contrato_NFC_NombreJugador_YYYY.pdf
    const year = new Date().getFullYear()
    const safeName = (playerName || 'Jugador').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    const fileName = `contratos/Contrato_NFC_${safeName}_${year}.pdf`

    // Check if already exists
    const { data: existing } = await supabase.storage
      .from('player-media')
      .list('contratos', { search: `Contrato_NFC_${safeName}_${year}` })

    if (existing && existing.length > 0) {
      // Already exists — just get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('player-media')
        .getPublicUrl(fileName)
      set('contract_pdf_url', publicUrl)
      setUploading(false)
      setMsg('⚠ Ya existe un contrato para este jugador — se usó el archivo existente')
      setTimeout(() => setMsg(''), 4000)
      return
    }

    // Upload new file
    const { error } = await supabase.storage
      .from('player-media')
      .upload(fileName, file, { upsert: false })

    if (error) {
      setUploading(false)
      setMsg('Error al subir: ' + error.message)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('player-media')
      .getPublicUrl(fileName)

    set('contract_pdf_url', publicUrl)
    setUploading(false)
    setMsg('✓ PDF subido correctamente')
    setTimeout(() => setMsg(''), 3000)
  }

  const handleRemovePdf = async () => {
    if (!window.confirm('¿Eliminar el PDF asociado a este contrato?')) return
    const url = form.contract_pdf_url
    if (url) {
      const path = url.split('/player-media/')[1]
      if (path) await supabase.storage.from('player-media').remove([path])
    }
    set('contract_pdf_url', '')
  }

  const handleSave = async () => {
    setLoading(true)
    setMsg('')

    const payload = {
      player_id: form.player_id,
      incorporation_date: form.incorporation_date || null,
      contract_date: form.contract_date || null,
      contract_duration_months: form.contract_duration_months ? parseInt(form.contract_duration_months) : null,
      contract_active: form.contract_active,
      contract_pdf_url: form.contract_pdf_url || null,
    }

    let error
    if (isEdit) {
      ;({ error } = await supabase.from('agency_contracts').update(payload).eq('id', form.id))
    } else {
      ;({ error } = await supabase.from('agency_contracts').insert(payload))
    }

    setLoading(false)
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('✓ Contrato de agencia guardado')
    setTimeout(() => onSave?.(), 1200)
  }

  const pdfName = getPdfName(form.contract_pdf_url)

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <div className="bebas" style={{ fontSize: 16, letterSpacing: 2, marginBottom: 20, color: GOLD }}>
        {isEdit ? 'EDITAR CONTRATO AGENCIA' : 'AGREGAR CONTRATO AGENCIA'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={LABEL}>FECHA DE INCORPORACIÓN</label>
          <input style={INPUT} type="date" value={form.incorporation_date || ''} onChange={e => set('incorporation_date', e.target.value)} />
        </div>
        <div>
          <label style={LABEL}>FECHA INICIO CONTRATO</label>
          <input style={INPUT} type="date" value={form.contract_date || ''} onChange={e => set('contract_date', e.target.value)} />
        </div>
        <div>
          <label style={LABEL}>DURACIÓN (meses)</label>
          <input style={INPUT} type="number" value={form.contract_duration_months || ''} onChange={e => set('contract_duration_months', e.target.value)} placeholder="24" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 20 }}>
          <input type="checkbox" id="agactive" checked={form.contract_active} onChange={e => set('contract_active', e.target.checked)}
            style={{ width: 16, height: 16, accentColor: GOLD, cursor: 'pointer' }} />
          <label htmlFor="agactive" style={{ ...LABEL, margin: 0, cursor: 'pointer', fontSize: 12 }}>Contrato activo</label>
        </div>

        {/* PDF Section */}
        <div style={{ gridColumn: '1/-1' }}>
          <label style={LABEL}>CONTRATO PDF DIGITALIZADO</label>

          {pdfName ? (
            // PDF already uploaded
            <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>📄</span>
                <div>
                  <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 600 }}>{pdfName}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>PDF subido · listo para usar</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={form.contract_pdf_url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 11, color: GOLD, background: 'rgba(201,168,76,0.1)', border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 4, padding: '4px 10px', textDecoration: 'none', fontFamily: 'inherit' }}>
                  Ver PDF
                </a>
                <button onClick={handleRemovePdf}
                  style={{ fontSize: 11, color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Eliminar
                </button>
              </div>
            </div>
          ) : (
            // No PDF yet
            <>
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }}
                onChange={e => handleUploadPdf(e.target.files[0])} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                style={{ ...INPUT, textAlign: 'center', cursor: uploading ? 'wait' : 'pointer', borderStyle: 'dashed', color: uploading ? 'rgba(255,255,255,0.3)' : GOLD, background: 'rgba(201,168,76,0.05)' }}>
                {uploading ? '⏳ Subiendo PDF...' : '📎 Seleccionar PDF del contrato'}
              </button>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
                El archivo se guardará como <strong style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Contrato_NFC_{(playerName || 'Jugador').replace(/\s+/g,'_')}_{new Date().getFullYear()}.pdf
                </strong>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 20, alignItems: 'center' }}>
        <button className="btn-gold" onClick={handleSave} disabled={loading || uploading}>
          {loading ? 'GUARDANDO...' : 'GUARDAR CONTRATO'}
        </button>
        <button className="btn-ghost" onClick={onCancel}>CANCELAR</button>
        {msg && <span style={{ fontSize: 12, color: msg.startsWith('✓') ? '#4ade80' : msg.startsWith('⚠') ? GOLD : '#f87171', marginLeft: 8 }}>{msg}</span>}
      </div>
    </div>
  )
}
