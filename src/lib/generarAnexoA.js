// Generador de Anexo A — Detalle de Inversión
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const NAVY = [27, 43, 94]
const GOLD = [201, 168, 76]
const BLACK = [0, 0, 0]
const GRAY = [80, 80, 80]

function fmtCLP(n) {
  if (!n) return '$ 0'
  return '$ ' + Math.round(parseFloat(n)).toLocaleString('es-CL')
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Map app categories to Anexo A sections
const SECTION_MAP = {
  'Implementación Deportiva (Zapatos)': 'INSUMOS DEPORTIVOS',
  'Implementación Deportiva (Guantes)': 'INSUMOS DEPORTIVOS',
  'Implementación Deportiva (Equipamiento)': 'INSUMOS DEPORTIVOS',
  'Vestuario / Indumentaria': 'INSUMOS DEPORTIVOS',
  'Accesorios deportivos': 'INSUMOS DEPORTIVOS',
  'Apoyo económico directo': 'APOYO FINANCIERO',
  'Alimentación': 'APOYO FINANCIERO',
  'Gimnasio / Preparación física': 'GIMNASIO Y PREPARACIÓN FÍSICA',
  'Arriendo / Alojamiento': 'ARRIENDOS Y ALOJAMIENTO',
  'Traslados / Transporte': 'TRASLADOS Y TRANSPORTE',
  'Gestión legal': 'GESTIÓN LEGAL',
  'Gestión comercial (Auspicio en especie)': 'GESTIÓN COMERCIAL',
  'Pérdida patrimonial': 'PÉRDIDA PATRIMONIAL',
}

const SECTION_ORDER = [
  'APOYO FINANCIERO',
  'INSUMOS DEPORTIVOS',
  'GIMNASIO Y PREPARACIÓN FÍSICA',
  'ARRIENDOS Y ALOJAMIENTO',
  'GESTIÓN COMERCIAL',
  'GESTIÓN LEGAL',
  'TRASLADOS Y TRANSPORTE',
  'PÉRDIDA PATRIMONIAL',
]

export function generarAnexoAPDF(datos) {
  const {
    jugador, // { nombre, rut, fechaNac }
    periodoAnexo, // ej: '2022-2026'
    transacciones, // array from DB
    transaccionesExtra, // array agregadas manualmente
  } = datos

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const allTx = [...(transacciones || []), ...(transaccionesExtra || [])]

  // Group by section
  const sections = {}
  SECTION_ORDER.forEach(s => { sections[s] = [] })

  allTx.forEach(t => {
    const sec = SECTION_MAP[t.subtype] || 'OTROS'
    if (!sections[sec]) sections[sec] = []
    sections[sec].push(t)
  })

  // Calculate totals per section
  const sectionTotals = {}
  Object.keys(sections).forEach(sec => {
    sectionTotals[sec] = sections[sec].reduce((a, t) => a + (parseFloat(t.amount) || 0), 0)
  })
  const totalGeneral = Object.values(sectionTotals).reduce((a, v) => a + v, 0)

  // ---- HEADER ----
  let y = 15

  // Title box
  doc.setFillColor(...NAVY)
  doc.rect(15, y, 180, 16, 'F')
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('ANEXO A', 105, y + 6, { align: 'center' })
  doc.setFontSize(9)
  doc.text('DETALLE DE INVERSIÓN Y APOYO AL DESARROLLO DEL JUGADOR', 105, y + 12, { align: 'center' })
  y += 22

  // Player info table
  doc.autoTable({
    startY: y,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: GOLD, textColor: [0, 0, 0], fontStyle: 'bold' },
    body: [
      ['Nombre del jugador:', jugador.nombre.toUpperCase()],
      ['RUT:', jugador.rut],
      ['Fecha de nacimiento:', jugador.fechaNac ? fmtDate(jugador.fechaNac) : '—'],
      ['Período del anexo:', periodoAnexo || new Date().getFullYear().toString()],
      ['Agencia:', 'SOCIEDAD NUEVA FÚTBOL CHILE SpA'],
    ],
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, fillColor: [240, 240, 245] },
      1: { cellWidth: 125 },
    },
  })
  y = doc.lastAutoTable.finalY + 8

  // ---- RESUMEN CONSOLIDADO ----
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  doc.text('1. RESUMEN CONSOLIDADO', 15, y)
  y += 4

  const resumenRows = SECTION_ORDER
    .filter(sec => sectionTotals[sec] > 0)
    .map(sec => [sec, fmtCLP(sectionTotals[sec])])

  resumenRows.push(['', ''])
  resumenRows.push([{ content: 'TOTAL INVERSIÓN', styles: { fontStyle: 'bold', fillColor: NAVY, textColor: [255,255,255] } },
    { content: fmtCLP(totalGeneral), styles: { fontStyle: 'bold', fillColor: NAVY, textColor: [255,255,255], halign: 'right' } }])

  doc.autoTable({
    startY: y,
    margin: { left: 15, right: 15 },
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: GOLD, textColor: [0,0,0], fontStyle: 'bold' },
    head: [['CONCEPTO', 'MONTO CLP']],
    body: resumenRows,
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 50, halign: 'right' },
    },
  })
  y = doc.lastAutoTable.finalY + 10

  // ---- DETALLE POR SECCIÓN ----
  let secNum = 2
  for (const sec of SECTION_ORDER) {
    if (!sections[sec] || sections[sec].length === 0) continue

    if (y > 240) { doc.addPage(); y = 20 }

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NAVY)
    doc.text(`${secNum}. DETALLE DE ${sec}`, 15, y)
    y += 4
    secNum++

    const rows = sections[sec].map(t => [
      fmtDate(t.transaction_date),
      t.description || t.subtype || '—',
      t.documento_respaldo || '—',
      fmtCLP(t.amount),
    ])

    // Total row
    const secTotal = sections[sec].reduce((a, t) => a + (parseFloat(t.amount) || 0), 0)
    rows.push([
      { content: 'SUBTOTAL', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', fillColor: [230, 230, 240] } },
      { content: fmtCLP(secTotal), styles: { fontStyle: 'bold', halign: 'right', fillColor: [230, 230, 240] } },
    ])

    doc.autoTable({
      startY: y,
      margin: { left: 15, right: 15 },
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [240, 240, 245], textColor: [...NAVY], fontStyle: 'bold', fontSize: 8 },
      head: [['FECHA', 'DESCRIPCIÓN', 'DOC. RESPALDO', 'MONTO CLP']],
      body: rows,
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 90 },
        2: { cellWidth: 33 },
        3: { cellWidth: 35, halign: 'right' },
      },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // ---- DECLARACIÓN ----
  if (y > 230) { doc.addPage(); y = 20 }

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  doc.text(`${secNum}. DECLARACIÓN`, 15, y)
  y += 6

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BLACK)
  const declaracion = 'El presente Anexo A forma parte integrante del contrato de representación suscrito entre el jugador y SOCIEDAD NUEVA FÚTBOL CHILE SpA, y tiene por objeto documentar y cuantificar la inversión económica, gestión profesional y apoyo integral entregado al jugador durante su proceso de desarrollo deportivo.\n\nLos montos aquí indicados constituyen el registro formal de las inversiones realizadas por la Agencia, y podrán ser utilizados como base para cualquier compensación, restitución o ejecución contractual, según lo establecido en el contrato principal y la normativa FIFA aplicable.'
  const decLines = doc.splitTextToSize(declaracion, 180)
  decLines.forEach(l => { doc.text(l, 15, y); y += 5 })
  y += 10

  // ---- FIRMAS ----
  if (y > 240) { doc.addPage(); y = 20 }

  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.4)
  doc.line(15, y + 20, 85, y + 20)
  doc.line(115, y + 20, 195, y + 20)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  doc.text('Firma Jugador', 50, y + 25, { align: 'center' })
  doc.text('Firma Agencia', 155, y + 25, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text(`Nombre: ${jugador.nombre}`, 50, y + 30, { align: 'center' })
  doc.text(`RUT: ${jugador.rut}`, 50, y + 35, { align: 'center' })
  doc.text('SOCIEDAD NUEVA FÚTBOL CHILE SpA', 155, y + 30, { align: 'center' })
  doc.text('RUT: 77.971.556-6', 155, y + 35, { align: 'center' })

  // Footer on all pages
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.5)
    doc.line(15, 285, 195, 285)
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.text('Nueva Fútbol Chile SpA · RUT 77.971.556-6 · Agente FIFA Lic. 202406-7288', 105, 289, { align: 'center' })
    doc.text(`Página ${i} de ${totalPages}`, 195, 289, { align: 'right' })
  }

  return doc
}
