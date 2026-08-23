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

const TIPOS = ['Contrato', 'Renovación', 'Préstamo', 'Cesión']

export default function ClubContractForm({ contract, playerId, playerName, players, onSave, onCancel }) {
  const isEdit = !!contract?.id
  const [form, setForm] = useState({
    tipo: 'Contrato',
    club_name: '',
    club_destino: '',
    position: '',
    contract_active: true,
    fecha_inicio: '',
    fecha_fin: '',
    salary: '',
    commission_percentage: '',
    commission_fixed: '',
    transfermarkt_profile: '',
    transfermarkt_valuation: '',
    contract_pdf_url: '',
    notas: '',
    ...contract,
    player_id: playerId || contract?.player_id || '',
  })
  // Sin playerId fijo (ej. boton "+ CONTRATO CLUB" general): hay que elegir el jugador aqui.
  const necesitaSelector = !playerId && !contract?.player_id
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const fileRef = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const getPdfName = (url) => {
    if (!url) return null
    const parts = url.split('/')
    return decodeURIComponent(parts[parts.length - 1])
  }

  const handleUploadPdf = async (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') { setMsg('Solo se permiten archivos PDF'); return }
    setUploading(true); setMsg('')
    const year = new Date().getFullYear()
    const safeClub = (form.club_name || 'Club').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    const safeName = (playerName || 'Jugador').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    const tipoSlug = form.tipo.replace(/[^a-zA-Z]/g, '')
    const fileName = `contratos/${tipoSlug}_Club_${safeClub}_${safeName}_${year}.pdf`

    const { error } = await supabase.storage.from('player-media').upload(fileName, file, { upsert: true })
    if (error) { setUploading(false); setMsg('Error: ' + error.message); return }
    const { data: { publicUrl } } = supabase.storage.from('player-media').getPublicUrl(fileName)
    set('contract_pdf_url', publicUrl)
    setUploading(false)
    setMsg('✓ PDF subido correctamente')
    setTimeout(() => setMsg(''), 3000)
  }

  const handleRemovePdf = async () => {
    if (!window.confirm('¿Eliminar el PDF de este contrato?')) return
    const url = form.contract_pdf_url
    if (url) {
      const path = url.split('/player-media/')[1]
      if (path) await supabase.storage.from('player-media').remove([path])
    }
    set('contract_pdf_url', '')
  }

  const handleSave = async () => {
    if (!form.player_id) { setMsg('Error: debes seleccionar un jugador'); return }
    if (!form.club_name) { setMsg('El nombre del club es requerido'); return }
    setLoading(true); setMsg('')

    const payload = {
      player_id: form.player_id,
      tipo: form.tipo || 'Contrato',
      club_name: form.club_name,
      club_destino: form.club_destino || null,
      position: form.position || null,
      contract_active: form.contract_active,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
      salary: form.salary ? parseFloat(form.salary) : null,
      commission_percentage: form.commission_percentage ? parseFloat(form.commission_percentage) : null,
      commission_fixed: form.commission_fixed ? parseFloat(form.commission_fixed) : null,
      transfermarkt_profile: form.transfermarkt_profile || null,
      transfermarkt_valuation: form.transfermarkt_valuation || null,
      contract_pdf_url: form.contract_pdf_url || null,
      notas: form.notas || null,
    }

    let error
    if (isEdit) {
      ;({ error } = await supabase.from('club_contracts').update(payload).eq('id', form.id))
    } else {
      ;({ error } = await supabase.from('club_contracts').insert(payload))
    }

    setLoading(false)
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('✓ Contrato guardado')
    setTimeout(() => onSave?.(), 1200)
  }

  const esPrestamo = form.tipo === 'Préstamo' || form.tipo === 'Cesión'

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <div className="bebas" style={{ fontSize: 16, letterSpacing: 2, marginBottom: 20, color: GOLD }}>
        {isEdit ? 'EDITAR CONTRATO CLUB' : 'NUEVO CONTRATO CLUB'}
      </div>

      {playerName && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
          Jugador: <span style={{ color: '#fff', fontWeight: 600 }}>{playerName}</span>
        </div>
      )}

      {necesitaSelector && (
        <div style={{ marginBottom: 16 }}>
          <label style={LABEL}>JUGADOR</label>
          <select style={INPUT} value={form.player_id || ''} onChange={e => set('player_id', e.target.value)}>
            <option value="">— Selecciona un jugador —</option>
            {(players || []).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Tipo */}
        <div style={{ gridColumn: '1/-1' }}>
          <label style={LABEL}>TIPO</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TIPOS.map(t => (
              <button key={t} onClick={() => set('tipo', t)}
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 4,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                  background: form.tipo === t ? GOLD : 'transparent',
                  color: form.tipo === t ? '#0f1a3a' : 'rgba(255,255,255,0.45)',
                  border: form.tipo === t ? `1px solid ${GOLD}` : '1px solid rgba(201,168,76,0.2)' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={LABEL}>{esPrestamo ? 'CLUB CEDENTE' : 'NOMBRE DEL CLUB *'}</label>
          <input style={INPUT} value={form.club_name} onChange={e => set('club_name', e.target.value)}
            placeholder={esPrestamo ? 'Club de origen' : 'Colo-Colo'} />
        </div>

        {esPrestamo && (
          <div>
            <label style={LABEL}>CLUB DESTINO</label>
            <input style={INPUT} value={form.club_destino || ''} onChange={e => set('club_destino', e.target.value)}
              placeholder="Club que recibe al jugador" />
          </div>
        )}

        <div>
          <label style={LABEL}>POSICIÓN</label>
          <select style={INPUT} value={form.position || ''} onChange={e => set('position', e.target.value)}>
            <option value="">Seleccionar</option>
            <option>Portero</option>
            <option>Defensa</option>
            <option>Mediocampista</option>
            <option>Delantero</option>
          </select>
        </div>

        <div>
          <label style={LABEL}>FECHA INICIO</label>
          <input style={INPUT} type="date" value={form.fecha_inicio || ''} onChange={e => set('fecha_inicio', e.target.value)} />
        </div>

        <div>
          <label style={LABEL}>FECHA FIN</label>
          <input style={INPUT} type="date" value={form.fecha_fin || ''} onChange={e => set('fecha_fin', e.target.value)} />
        </div>

        <div>
          <label style={LABEL}>SALARIO MENSUAL (USD)</label>
          <input style={INPUT} type="number" value={form.salary || ''} onChange={e => set('salary', e.target.value)} placeholder="5000" />
        </div>

        <div>
          <label style={LABEL}>COMISIÓN AGENCIA (%)</label>
          <input style={INPUT} type="number" step="0.1" value={form.commission_percentage || ''} onChange={e => set('commission_percentage', e.target.value)} placeholder="10" />
        </div>

        <div>
          <label style={LABEL}>COMISIÓN FIJA (USD)</label>
          <input style={INPUT} type="number" value={form.commission_fixed || ''} onChange={e => set('commission_fixed', e.target.value)} placeholder="0" />
        </div>

        <div>
          <label style={LABEL}>VALOR TRANSFERMARKT</label>
          <input style={INPUT} value={form.transfermarkt_valuation || ''} onChange={e => set('transfermarkt_valuation', e.target.value)} placeholder="500K €" />
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <label style={LABEL}>LINK PERFIL TRANSFERMARKT</label>
          <input style={INPUT} value={form.transfermarkt_profile || ''} onChange={e => set('transfermarkt_profile', e.target.value)} placeholder="https://www.transfermarkt.com/..." />
        </div>

        {/* PDF */}
        <div style={{ gridColumn: '1/-1' }}>
          <label style={LABEL}>CONTRATO PDF</label>
          <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }}
            onChange={e => handleUploadPdf(e.target.files[0])} />
          {form.contract_pdf_url ? (
            <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>📄</span>
                <div>
                  <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 600 }}>{getPdfName(form.contract_pdf_url)}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>PDF subido · listo para usar</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={form.contract_pdf_url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 11, color: GOLD, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 4, padding: '4px 10px', textDecoration: 'none' }}>
                  Ver PDF
                </a>
                <button onClick={handleRemovePdf}
                  style={{ fontSize: 11, color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Eliminar
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ ...INPUT, textAlign: 'center', cursor: uploading ? 'wait' : 'pointer', borderStyle: 'dashed', color: uploading ? 'rgba(255,255,255,0.3)' : GOLD, background: 'rgba(201,168,76,0.05)' }}>
              {uploading ? '⏳ Subiendo PDF...' : '📎 Seleccionar PDF del contrato'}
            </button>
          )}
        </div>

        {/* Notas */}
        <div style={{ gridColumn: '1/-1' }}>
          <label style={LABEL}>NOTAS</label>
          <input style={INPUT} value={form.notas || ''} onChange={e => set('notas', e.target.value)}
            placeholder="Observaciones, condiciones especiales..." />
        </div>

        {/* Activo */}
        <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" id="active" checked={form.contract_active}
            onChange={e => set('contract_active', e.target.checked)}
            style={{ width: 16, height: 16, accentColor: GOLD, cursor: 'pointer' }} />
          <label htmlFor="active" style={{ ...LABEL, margin: 0, cursor: 'pointer', fontSize: 12 }}>
            Contrato activo
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 20, alignItems: 'center' }}>
        <button className="btn-gold" onClick={handleSave} disabled={loading || uploading}>
          {loading ? 'GUARDANDO...' : 'GUARDAR CONTRATO'}
        </button>
        <button className="btn-ghost" onClick={onCancel}>CANCELAR</button>
        {msg && (
          <span style={{ fontSize: 12, color: msg.startsWith('✓') ? '#4ade80' : '#f87171', marginLeft: 8 }}>
            {msg}
          </span>
        )}
      </div>
    </div>
  )
}
