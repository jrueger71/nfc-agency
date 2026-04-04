import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { generarContratoPDF } from '../lib/generarContrato'
import { generarAnexoAPDF } from '../lib/generarAnexoA'

const GOLD = '#C9A84C'
const INPUT = {
  width:'100%', background:'rgba(255,255,255,0.06)',
  border:'1px solid rgba(201,168,76,0.2)', borderRadius:6,
  padding:'10px 14px', fontSize:14, color:'#fff',
  fontFamily:'inherit', outline:'none',
}
const LABEL = { fontSize:10, color:'rgba(255,255,255,0.45)', letterSpacing:1, display:'block', marginBottom:4, fontWeight:600 }

function fmtDateLong(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('es-CL', { day:'numeric', month:'long', year:'numeric' })
}

function isMinor(fechaNac) {
  if (!fechaNac) return false
  return Math.floor((Date.now() - new Date(fechaNac)) / (365.25*24*3600*1000)) < 18
}

export default function Documentos() {
  const { playerId } = useParams()
  const navigate = useNavigate()
  const [player, setPlayer] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [contactInfo, setContactInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('contrato')
  const [generating, setGenerating] = useState(false)

  // Contrato form state
  const [contratoForm, setContratoForm] = useState({
    fechaContrato: new Date().toLocaleDateString('es-CL', {day:'numeric',month:'long',year:'numeric'}),
    ciudad: 'Santiago',
    duracionAnios: 2,
    tutor1Nombre: '', tutor1Rut: '',
    tutor2Nombre: '', tutor2Rut: '',
    dosTutores: false,
    tieneDerechosImagen: false,
  })
  const setC = (k,v) => setContratoForm(f=>({...f,[k]:v}))

  // Anexo A form state
  const [anexoForm, setAnexoForm] = useState({
    periodoAnexo: '',
    extraRows: [], // {subtype, description, documento_respaldo, amount, transaction_date}
  })
  const setA = (k,v) => setAnexoForm(f=>({...f,[k]:v}))

  useEffect(() => {
    if (!playerId) return
    Promise.all([
      supabase.from('players_full_info').select('*').eq('id', playerId).single(),
      supabase.from('transactions').select('*').eq('player_id', playerId).eq('type','expense').order('transaction_date'),
      supabase.from('contact_info').select('*').eq('player_id', playerId).single(),
    ]).then(([{data:p},{data:tx},{data:ci}]) => {
      setPlayer(p)
      setTransactions(tx||[])
      setContactInfo(ci)
      if (p) {
        const years = []
        const startYear = p.incorporation_date ? new Date(p.incorporation_date).getFullYear() : new Date().getFullYear() - 1
        for (let y = startYear; y <= new Date().getFullYear(); y++) years.push(y)
        setAnexoForm(f => ({...f, periodoAnexo: years.join('-')}))
      }
      setLoading(false)
    })
  }, [playerId])

  const handleGenerarContrato = async () => {
    if (!player) return
    setGenerating(true)
    try {
      const menor = isMinor(player.birth_date)
      const tutores = []
      if (menor) {
        if (contratoForm.tutor1Nombre) tutores.push({ nombre: contratoForm.tutor1Nombre, rut: contratoForm.tutor1Rut })
        if (contratoForm.dosTutores && contratoForm.tutor2Nombre) tutores.push({ nombre: contratoForm.tutor2Nombre, rut: contratoForm.tutor2Rut })
      }
      const doc = await generarContratoPDF({
        jugador: {
          nombre: player.name,
          rut: player.rut,
          domicilio: contactInfo?.address || 'a indicar',
          comuna: 'Santiago',
          fechaNac: player.birth_date,
        },
        esMenor: menor,
        tutores,
        fechaContrato: contratoForm.fechaContrato,
        duracionAnios: contratoForm.duracionAnios,
        ciudad: contratoForm.ciudad,
        tieneDerechosImagen: contratoForm.tieneDerechosImagen,
        logoUrl: 'https://qgjdphqmwgrkwfbxbyhc.supabase.co/storage/v1/object/public/player-media/logo_nfc.JPG',
      })
      const nombre = player.name.replace(/\s+/g,'_')
      doc.save(`Contrato_NFC_${nombre}_${new Date().getFullYear()}.pdf`)
    } catch(e) {
      console.error(e)
    }
    setGenerating(false)
  }

  const handleGenerarContratoTipo = async () => {
    setGenerating(true)
    try {
      const doc = await generarContratoPDF({
        jugador: {
          nombre: 'NOMBRE DEL JUGADOR',
          rut: 'XX.XXX.XXX-X',
          domicilio: 'Santiago',
          comuna: 'Santiago',
          fechaNac: null,
        },
        esMenor: false,
        tutores: [],
        fechaContrato: new Date().toLocaleDateString('es-CL', {day:'numeric',month:'long',year:'numeric'}),
        duracionAnios: 2,
        ciudad: 'Santiago',
        tieneDerechosImagen: false,
        logoUrl: 'https://qgjdphqmwgrkwfbxbyhc.supabase.co/storage/v1/object/public/player-media/logo_nfc.JPG',
      })
      doc.save(`Contrato_Tipo_NFC_${new Date().getFullYear()}.pdf`)
    } catch(e) { console.error(e) }
    setGenerating(false)
  }

  const handleGenerarAnexo = async () => {
    if (!player) return
    setGenerating(true)
    try {
      const doc = generarAnexoAPDF({
        jugador: { nombre: player.name, rut: player.rut, fechaNac: player.birth_date },
        periodoAnexo: anexoForm.periodoAnexo,
        transacciones: transactions,
        transaccionesExtra: anexoForm.extraRows,
      })
      const nombre = player.name.replace(/\s+/g,'_')
      doc.save(`AnexoA_NFC_${nombre}_${new Date().getFullYear()}.pdf`)
    } catch(e) {
      console.error(e)
    }
    setGenerating(false)
  }

  const addExtraRow = () => {
    setAnexoForm(f => ({...f, extraRows: [...f.extraRows, {
      subtype:'', description:'', documento_respaldo:'', amount:'',
      transaction_date: new Date().toISOString().split('T')[0]
    }]}))
  }

  const updateExtraRow = (idx, key, val) => {
    setAnexoForm(f => {
      const rows = [...f.extraRows]
      rows[idx] = {...rows[idx], [key]: val}
      return {...f, extraRows: rows}
    })
  }

  const removeExtraRow = (idx) => {
    setAnexoForm(f => ({...f, extraRows: f.extraRows.filter((_,i)=>i!==idx)}))
  }

  const TAB = (t) => ({
    padding:'8px 20px', fontSize:12, fontWeight:600, letterSpacing:.5,
    borderRadius:4, cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
    background: tab===t ? GOLD : 'transparent',
    color: tab===t ? '#0f1a3a' : 'rgba(255,255,255,0.5)',
    border: tab===t ? `1px solid ${GOLD}` : '1px solid rgba(201,168,76,0.2)',
  })

  if (loading) return <div style={{textAlign:'center',padding:80,fontFamily:'Bebas Neue',color:GOLD,letterSpacing:3,fontSize:20}}>CARGANDO...</div>
  if (!player) return <div style={{textAlign:'center',padding:80,color:'#94a3b8'}}>Jugador no encontrado</div>

  const menor = isMinor(player.birth_date)
  const totalAnexo = transactions.reduce((a,t)=>a+(parseFloat(t.amount)||0),0) +
    anexoForm.extraRows.reduce((a,t)=>a+(parseFloat(t.amount)||0),0)

  return (
    <div className="page">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <button onClick={() => navigate('/admin/jugadores')} style={{fontSize:13,color:GOLD,background:'none',border:'none',cursor:'pointer',fontWeight:600,letterSpacing:.5,fontFamily:'inherit',padding:0}}>
          ← VOLVER AL PLANTEL
        </button>
        <button onClick={handleGenerarContratoTipo} disabled={generating}
          style={{fontSize:12,padding:'7px 16px',background:'rgba(201,168,76,0.1)',border:'1px solid rgba(201,168,76,0.3)',borderRadius:5,color:GOLD,cursor:'pointer',fontFamily:'Bebas Neue',letterSpacing:1}}>
          📄 CONTRATO TIPO
        </button>
      </div>

      {/* Player header */}
      <div className="card" style={{marginBottom:20,display:'flex',gap:16,alignItems:'center'}}>
        <div style={{width:56,height:56,borderRadius:'50%',background:'#1B2B5E',border:`2px solid ${GOLD}`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bebas Neue',fontSize:18,color:'#fff',flexShrink:0,overflow:'hidden'}}>
          {player.foto_url ? <img src={player.foto_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={player.name}/> : player.name?.[0]}
        </div>
        <div>
          <div className="bebas" style={{fontSize:20,color:'#fff'}}>{player.name}</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.45)'}}>{player.rut} · {player.position||'—'} · {player.club_name||'Sin club'}</div>
          {menor && <span style={{fontSize:11,background:'rgba(251,191,36,0.15)',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.3)',borderRadius:4,padding:'2px 8px',marginTop:4,display:'inline-block'}}>MENOR DE EDAD — requiere datos de tutor</span>}
        </div>
        <div style={{marginLeft:'auto',textAlign:'right'}}>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>DOCUMENTOS</div>
          <div className="bebas" style={{fontSize:18,color:GOLD}}>GENERADOR</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:8,marginBottom:20}}>
        <button style={TAB('contrato')} onClick={()=>setTab('contrato')}>📄 Contrato</button>
        <button style={TAB('anexo')} onClick={()=>setTab('anexo')}>📊 Anexo A</button>
      </div>

      {/* ===== CONTRATO ===== */}
      {tab==='contrato' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <div className="card">
            <div className="bebas" style={{fontSize:15,letterSpacing:2,color:GOLD,marginBottom:16}}>DATOS DEL CONTRATO</div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label style={LABEL}>FECHA DEL CONTRATO</label>
                <input style={INPUT} value={contratoForm.fechaContrato} onChange={e=>setC('fechaContrato',e.target.value)} placeholder="01 de enero de 2026"/>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.25)',marginTop:3}}>Ej: 01 de enero de 2026</div>
              </div>
              <div>
                <label style={LABEL}>CIUDAD</label>
                <input style={INPUT} value={contratoForm.ciudad} onChange={e=>setC('ciudad',e.target.value)}/>
              </div>
              <div>
                <label style={LABEL}>DURACIÓN (años)</label>
                <select style={INPUT} value={contratoForm.duracionAnios} onChange={e=>setC('duracionAnios',parseInt(e.target.value))}>
                  {[1,2,3,4,5].map(n=><option key={n} value={n}>{n} año{n>1?'s':''}</option>)}
                </select>
              </div>

              {/* Derechos de imagen */}
              <div style={{background:'rgba(201,168,76,0.06)',border:'1px solid rgba(201,168,76,0.2)',borderRadius:6,padding:14}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                  <input type="checkbox" id="derechosImagen" checked={contratoForm.tieneDerechosImagen}
                    onChange={e=>setC('tieneDerechosImagen',e.target.checked)}
                    style={{width:16,height:16,accentColor:GOLD,cursor:'pointer',marginTop:2,flexShrink:0}}/>
                  <div>
                    <label htmlFor="derechosImagen" style={{...LABEL,margin:0,cursor:'pointer',fontSize:12,color:GOLD}}>
                      Jugador con contratos de imagen / auspicios activos
                    </label>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',marginTop:4,lineHeight:1.5}}>
                      Activa el <strong style={{color:'rgba(255,255,255,0.5)'}}>Artículo 11</strong> — compensación fija USD 150.000 a todo evento.<br/>
                      <span style={{color:'rgba(255,255,255,0.25)'}}>Excluye el Artículo 10 (Anexo A) para materias de imagen y auspicios.</span>
                    </div>
                  </div>
                </div>
              </div>

              {menor && (
                <div style={{background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.25)',borderRadius:6,padding:14}}>
                  <div style={{fontSize:11,color:'#fbbf24',fontWeight:600,marginBottom:12}}>DATOS DEL TUTOR / REPRESENTANTE LEGAL</div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <div>
                      <label style={{...LABEL,color:'rgba(251,191,36,0.7)'}}>NOMBRE TUTOR 1</label>
                      <input style={INPUT} value={contratoForm.tutor1Nombre} onChange={e=>setC('tutor1Nombre',e.target.value)} placeholder="Nombre completo"/>
                    </div>
                    <div>
                      <label style={{...LABEL,color:'rgba(251,191,36,0.7)'}}>RUT TUTOR 1</label>
                      <input style={INPUT} value={contratoForm.tutor1Rut} onChange={e=>setC('tutor1Rut',e.target.value)} placeholder="12.345.678-9"/>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <input type="checkbox" id="dosTutores" checked={contratoForm.dosTutores} onChange={e=>setC('dosTutores',e.target.checked)} style={{accentColor:GOLD,width:16,height:16}}/>
                      <label htmlFor="dosTutores" style={{...LABEL,margin:0,cursor:'pointer',fontSize:12}}>Agregar segundo tutor</label>
                    </div>
                    {contratoForm.dosTutores && (
                      <>
                        <div>
                          <label style={{...LABEL,color:'rgba(251,191,36,0.7)'}}>NOMBRE TUTOR 2</label>
                          <input style={INPUT} value={contratoForm.tutor2Nombre} onChange={e=>setC('tutor2Nombre',e.target.value)} placeholder="Nombre completo"/>
                        </div>
                        <div>
                          <label style={{...LABEL,color:'rgba(251,191,36,0.7)'}}>RUT TUTOR 2</label>
                          <input style={INPUT} value={contratoForm.tutor2Rut} onChange={e=>setC('tutor2Rut',e.target.value)} placeholder="12.345.678-9"/>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="bebas" style={{fontSize:15,letterSpacing:2,color:GOLD,marginBottom:16}}>VISTA PREVIA</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.8,marginBottom:20}}>
              <div><span style={{color:'rgba(255,255,255,0.35)'}}>Jugador:</span> {player.name}</div>
              <div><span style={{color:'rgba(255,255,255,0.35)'}}>RUT:</span> {player.rut}</div>
              <div><span style={{color:'rgba(255,255,255,0.35)'}}>Domicilio:</span> {contactInfo?.address||'Sin registrar'}</div>
              <div><span style={{color:'rgba(255,255,255,0.35)'}}>Fecha contrato:</span> {contratoForm.fechaContrato}</div>
              <div><span style={{color:'rgba(255,255,255,0.35)'}}>Duración:</span> {contratoForm.duracionAnios} año{contratoForm.duracionAnios>1?'s':''}</div>
              <div><span style={{color:'rgba(255,255,255,0.35)'}}>Firmantes:</span> {menor ? `Jugador + ${1+(contratoForm.dosTutores?1:0)} tutor(es) + Agencia` : 'Jugador + Agencia'}</div>
              <div><span style={{color:'rgba(255,255,255,0.35)'}}>Cláusula imagen:</span> {contratoForm.tieneDerechosImagen ? <span style={{color:GOLD}}>Art. 11 — USD 150.000 fijo</span> : <span style={{color:'rgba(255,255,255,0.3)'}}>Art. 10 — Anexo A</span>}</div>
            </div>
            <div style={{background:'rgba(255,255,255,0.03)',borderRadius:6,padding:12,fontSize:11,color:'rgba(255,255,255,0.3)',marginBottom:20,lineHeight:1.6}}>
              El PDF incluirá todos los artículos del contrato estándar NFC (Arts. I al XIII) con los datos del jugador precargados. La sección de firmas se adaptará automáticamente según sea menor de edad o no.
            </div>
            <button className="btn-gold" onClick={handleGenerarContrato} disabled={generating} style={{width:'100%',padding:12,fontSize:15}}>
              {generating ? 'GENERANDO...' : '⬇ DESCARGAR CONTRATO PDF'}
            </button>
          </div>
        </div>
      )}

      {/* ===== ANEXO A ===== */}
      {tab==='anexo' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <div>
            <div className="card" style={{marginBottom:16}}>
              <div className="bebas" style={{fontSize:15,letterSpacing:2,color:GOLD,marginBottom:16}}>CONFIGURACIÓN ANEXO A</div>
              <div>
                <label style={LABEL}>PERÍODO DEL ANEXO</label>
                <input style={INPUT} value={anexoForm.periodoAnexo} onChange={e=>setA('periodoAnexo',e.target.value)} placeholder="2022-2026"/>
              </div>
            </div>

            {/* Transactions from DB */}
            <div className="card" style={{marginBottom:16}}>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',fontWeight:600,letterSpacing:1.5,marginBottom:12}}>
                TRANSACCIONES DEL SISTEMA ({transactions.length})
              </div>
              {transactions.length === 0 ? (
                <div style={{fontSize:12,color:'rgba(255,255,255,0.25)',textAlign:'center',padding:16}}>Sin transacciones registradas para este jugador</div>
              ) : (
                <div style={{maxHeight:200,overflowY:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                    <thead><tr>
                      <th style={{textAlign:'left',color:'rgba(255,255,255,0.35)',padding:'4px 6px',borderBottom:'1px solid rgba(255,255,255,0.06)',fontSize:10}}>Fecha</th>
                      <th style={{textAlign:'left',color:'rgba(255,255,255,0.35)',padding:'4px 6px',borderBottom:'1px solid rgba(255,255,255,0.06)',fontSize:10}}>Concepto</th>
                      <th style={{textAlign:'right',color:'rgba(255,255,255,0.35)',padding:'4px 6px',borderBottom:'1px solid rgba(255,255,255,0.06)',fontSize:10}}>Monto</th>
                    </tr></thead>
                    <tbody>
                      {transactions.map(t=>(
                        <tr key={t.id}>
                          <td style={{padding:'5px 6px',color:'rgba(255,255,255,0.5)',borderBottom:'1px solid rgba(255,255,255,0.03)'}}>{new Date(t.transaction_date).toLocaleDateString('es-CL')}</td>
                          <td style={{padding:'5px 6px',color:'rgba(255,255,255,0.7)',borderBottom:'1px solid rgba(255,255,255,0.03)'}}>{t.subtype}</td>
                          <td style={{padding:'5px 6px',color:'#f87171',borderBottom:'1px solid rgba(255,255,255,0.03)',textAlign:'right'}}>$ {Math.round(parseFloat(t.amount)).toLocaleString('es-CL')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Extra rows */}
            <div className="card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',fontWeight:600,letterSpacing:1.5}}>AGREGAR MANUALMENTE</div>
                <button onClick={addExtraRow} style={{fontSize:11,color:GOLD,background:'rgba(201,168,76,0.1)',border:`1px solid rgba(201,168,76,0.3)`,borderRadius:4,padding:'4px 10px',cursor:'pointer',fontFamily:'inherit'}}>+ Fila</button>
              </div>
              {anexoForm.extraRows.map((row,idx)=>(
                <div key={idx} style={{background:'rgba(255,255,255,0.03)',borderRadius:6,padding:10,marginBottom:8}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:6}}>
                    <div>
                      <label style={{...LABEL,fontSize:9}}>FECHA</label>
                      <input style={{...INPUT,padding:'6px 10px',fontSize:12}} type="date" value={row.transaction_date} onChange={e=>updateExtraRow(idx,'transaction_date',e.target.value)}/>
                    </div>
                    <div>
                      <label style={{...LABEL,fontSize:9}}>MONTO CLP</label>
                      <input style={{...INPUT,padding:'6px 10px',fontSize:12}} type="number" value={row.amount} onChange={e=>updateExtraRow(idx,'amount',e.target.value)} placeholder="150000"/>
                    </div>
                    <div>
                      <label style={{...LABEL,fontSize:9}}>CONCEPTO</label>
                      <input style={{...INPUT,padding:'6px 10px',fontSize:12}} value={row.subtype} onChange={e=>updateExtraRow(idx,'subtype',e.target.value)} placeholder="Implementación Deportiva..."/>
                    </div>
                    <div>
                      <label style={{...LABEL,fontSize:9}}>DOC. RESPALDO</label>
                      <input style={{...INPUT,padding:'6px 10px',fontSize:12}} value={row.documento_respaldo} onChange={e=>updateExtraRow(idx,'documento_respaldo',e.target.value)} placeholder="Boleta 1234"/>
                    </div>
                  </div>
                  <div>
                    <label style={{...LABEL,fontSize:9}}>DESCRIPCIÓN</label>
                    <input style={{...INPUT,padding:'6px 10px',fontSize:12}} value={row.description} onChange={e=>updateExtraRow(idx,'description',e.target.value)} placeholder="Descripción del gasto..."/>
                  </div>
                  <button onClick={()=>removeExtraRow(idx)} style={{fontSize:10,color:'#f87171',background:'none',border:'none',cursor:'pointer',marginTop:6,fontFamily:'inherit'}}>✕ Eliminar fila</button>
                </div>
              ))}
              {anexoForm.extraRows.length === 0 && (
                <div style={{fontSize:11,color:'rgba(255,255,255,0.2)',textAlign:'center',padding:12}}>Agrega filas para incluir gastos no registrados en el sistema</div>
              )}
            </div>
          </div>

          <div className="card" style={{alignSelf:'start'}}>
            <div className="bebas" style={{fontSize:15,letterSpacing:2,color:GOLD,marginBottom:16}}>RESUMEN ANEXO A</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.8,marginBottom:16}}>
              <div><span style={{color:'rgba(255,255,255,0.35)'}}>Jugador:</span> {player.name}</div>
              <div><span style={{color:'rgba(255,255,255,0.35)'}}>RUT:</span> {player.rut}</div>
              <div><span style={{color:'rgba(255,255,255,0.35)'}}>Período:</span> {anexoForm.periodoAnexo}</div>
              <div><span style={{color:'rgba(255,255,255,0.35)'}}>Registros sistema:</span> {transactions.length}</div>
              <div><span style={{color:'rgba(255,255,255,0.35)'}}>Registros manuales:</span> {anexoForm.extraRows.length}</div>
            </div>
            <div style={{background:'rgba(201,168,76,0.08)',border:'1px solid rgba(201,168,76,0.25)',borderRadius:8,padding:16,marginBottom:20,textAlign:'center'}}>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginBottom:4}}>TOTAL INVERSIÓN DOCUMENTADA</div>
              <div className="bebas" style={{fontSize:32,color:GOLD}}>
                $ {Math.round(totalAnexo).toLocaleString('es-CL')}
              </div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>CLP</div>
            </div>
            <div style={{background:'rgba(255,255,255,0.03)',borderRadius:6,padding:12,fontSize:11,color:'rgba(255,255,255,0.3)',marginBottom:20,lineHeight:1.6}}>
              El PDF incluirá: resumen consolidado por categoría, detalle de cada gasto con fecha y documento de respaldo, y sección de firmas (jugador + agencia).
            </div>
            <button className="btn-gold" onClick={handleGenerarAnexo} disabled={generating} style={{width:'100%',padding:12,fontSize:15}}>
              {generating ? 'GENERANDO...' : '⬇ DESCARGAR ANEXO A PDF'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
