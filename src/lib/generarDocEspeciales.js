// Generador de Documentos Especiales — NFC
// 1. Listado de Jugadores Representados
// 2. Declaración de Conflicto de Interés

import jsPDF from 'jspdf'
import 'jspdf-autotable'

const NAVY = [27, 43, 94]
const GOLD = [201, 168, 76]
const BLACK = [0, 0, 0]
const GRAY = [80, 80, 80]
const LIGHT = [245, 245, 245]

const FONT_SIZE = 9
const LINE_H = 5.2
const X = 15
const W = 180

function addHeaderDoc(doc, titulo, pageNum, totalPages) {
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.8)
  doc.line(15, 12, 195, 12)
  doc.setFontSize(7); doc.setTextColor(...GRAY); doc.setFont('helvetica', 'normal')
  doc.text(titulo + ' — NUEVA FÚTBOL CHILE SpA', 15, 9)
  doc.text(`Página ${pageNum} de ${totalPages}`, 195, 9, { align: 'right' })
  doc.setDrawColor(...GOLD); doc.line(15, 283, 195, 283)
  doc.setFontSize(7); doc.setTextColor(...GRAY)
  doc.text('Nueva Fútbol Chile SpA · RUT 77.971.556-6 · Av. Larraín 5682, Piso 13, La Reina, Santiago · Agente FIFA Lic. 202406-7288', 105, 287, { align: 'center' })
}

function drawJustified(doc, text, x, y, maxWidth, lineH, checkPage, addPageFn) {
  doc.setFontSize(FONT_SIZE)
  const lines = doc.splitTextToSize(text, maxWidth)
  lines.forEach((line, idx) => {
    if (checkPage(y)) { addPageFn(); y = 20 }
    const isLast = idx === lines.length - 1
    if (isLast || line.trim().length < 20) {
      doc.text(line, x, y)
    } else {
      const words = line.split(' ').filter(w => w.length > 0)
      if (words.length <= 1) { doc.text(line, x, y) }
      else {
        const lineWidth = doc.getStringUnitWidth(line.replace(/ /g,'')) * FONT_SIZE / doc.internal.scaleFactor
        const spacePerGap = (maxWidth - lineWidth) / (words.length - 1)
        let curX = x
        words.forEach((word, wi) => {
          doc.text(word, curX, y)
          if (wi < words.length - 1)
            curX += doc.getStringUnitWidth(word) * FONT_SIZE / doc.internal.scaleFactor + spacePerGap
        })
      }
    }
    y += lineH
  })
  return y
}

// ─── 1. LISTADO DE JUGADORES ─────────────────────────────────────────────────
export function generarListadoJugadoresPDF(datos) {
  const { jugadores, fecha, ciudad = 'Santiago de Chile' } = datos
  // jugadores: [{ nombre, rut, club, posicion, contractActive }]

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let page = 1
  const checkPage = y => y > 270
  const addPageFn = () => {
    addHeaderDoc(doc, 'NÓMINA DE JUGADORES REPRESENTADOS', page, 99)
    doc.addPage(); page++
  }

  // Título
  let y = 22
  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY)
  doc.text('NÓMINA DE JUGADORES REPRESENTADOS', 105, y, { align: 'center' })
  y += 8
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY)
  doc.text(`Nueva Fútbol Chile SpA · Emitido en ${ciudad}, a ${fecha}`, 105, y, { align: 'center' })
  y += 12

  // Info agencia
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2])
  doc.roundedRect(X, y, W, 22, 2, 2, 'F')
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
  doc.text('NUEVA FÚTBOL CHILE SpA', X + 5, y + 7)
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(GOLD[0], GOLD[1], GOLD[2])
  doc.text('RUT: 77.971.556-6  ·  Representante: Aldo Camilo Maldonado Rebolledo  ·  Agente FIFA Lic. 202406-7288', X + 5, y + 13)
  doc.setTextColor(200, 200, 200)
  doc.text('Av. Larraín 5682, Piso 13, La Reina, Santiago  ·  aldo.maldonado@nuevafutbolspa.com', X + 5, y + 19)
  y += 28

  // Resumen
  const activos = jugadores.filter(j => j.contractActive).length
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY)
  doc.text(`Total jugadores representados: ${jugadores.length}   ·   Con contrato activo: ${activos}   ·   En negociación / libre: ${jugadores.length - activos}`, X, y)
  y += 8

  // Tabla
  const tableData = jugadores.map((j, i) => [
    i + 1,
    j.nombre || '—',
    j.rut || '—',
    j.posicion || '—',
    j.club || '—',
    j.estado || (j.contractActive ? 'Activo' : 'Libre'),
  ])

  doc.autoTable({
    startY: y,
    head: [['N°', 'Nombre completo', 'RUT', 'Posición', 'Club actual', 'Estado']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: BLACK,
      lineColor: [220, 220, 220],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 58 },
      2: { cellWidth: 28 },
      3: { cellWidth: 24 },
      4: { cellWidth: 40 },
      5: { cellWidth: 22, halign: 'center' },
    },
    alternateRowStyles: { fillColor: LIGHT },
    didParseCell: (data) => {
      if (data.column.index === 5 && data.section === 'body') {
        const val = data.cell.raw
        if (val === 'Activo') data.cell.styles.textColor = [22, 163, 74]
        else if (val === 'Cadete') data.cell.styles.textColor = [201, 168, 76]
        else data.cell.styles.textColor = [107, 114, 128]
        data.cell.styles.fontStyle = 'bold'
      }
    },
    margin: { left: X, right: X },
  })

  y = doc.lastAutoTable.finalY + 10

  // Firma
  if (y > 240) { addPageFn(); y = 30 }
  doc.setDrawColor(...NAVY); doc.setLineWidth(0.5)
  doc.line(X, y + 20, X + 70, y + 20)
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY)
  doc.text('ALDO CAMILO MALDONADO REBOLLEDO', X + 35, y + 26, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY); doc.setFontSize(7.5)
  doc.text('Agente FIFA · Licencia Nº 202406-7288', X + 35, y + 31, { align: 'center' })
  doc.text('Nueva Fútbol Chile SpA', X + 35, y + 36, { align: 'center' })

  // Pie de página con nota legal
  doc.setFontSize(7); doc.setTextColor(...GRAY); doc.setFont('helvetica', 'italic')
  doc.text('Documento emitido con fines informativos y de acreditación. La información contenida es confidencial y de uso exclusivo del destinatario.', 105, y + 45, { align: 'center', maxWidth: W })

  // Fix pages
  const totalPgs = doc.getNumberOfPages()
  for (let i = 1; i <= totalPgs; i++) {
    doc.setPage(i)
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, 210, 15, 'F'); doc.rect(0, 280, 210, 20, 'F')
    addHeaderDoc(doc, 'NÓMINA DE JUGADORES REPRESENTADOS', i, totalPgs)
  }
  return doc
}

// ─── 2. DECLARACIÓN DE CONFLICTO DE INTERÉS ──────────────────────────────────
export function generarDeclaracionConflictoPDF(datos) {
  const {
    ciudad = 'Santiago de Chile',
    fecha,
    exigidoPor,     // string: "FIFA, AFUCH y ANFP" etc.
    declaraciones,  // array de strings con declaraciones adicionales opcionales
  } = datos

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let page = 1
  const checkPage = y => y > 270
  const addPageFn = () => {
    addHeaderDoc(doc, 'DECLARACIÓN JURADA DE AUSENCIA DE CONFLICTO DE INTERÉS', page, 99)
    doc.addPage(); page++
  }

  let y = 22
  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY)
  doc.text('DECLARACIÓN JURADA DE', 105, y, { align: 'center' })
  y += 7
  doc.text('AUSENCIA DE CONFLICTO DE INTERÉS', 105, y, { align: 'center' })
  y += 8
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY)
  doc.text(`Exigida por: ${exigidoPor}`, 105, y, { align: 'center' })
  y += 12

  // Recuadro declarante
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2])
  doc.roundedRect(X, y, W, 20, 2, 2, 'F')
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
  doc.text('DECLARANTE', X + 5, y + 6)
  doc.setFont('helvetica', 'normal'); doc.setTextColor(GOLD[0], GOLD[1], GOLD[2])
  doc.text('ALDO CAMILO MALDONADO REBOLLEDO  ·  RUT: 10.370.416-2', X + 5, y + 12)
  doc.setTextColor(200, 200, 200); doc.setFontSize(8)
  doc.text('Agente FIFA · Licencia Nº 202406-7288  ·  Socio y Representante Legal de Nueva Fútbol Chile SpA', X + 5, y + 17)
  y += 26

  // Intro
  doc.setFontSize(FONT_SIZE); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BLACK)
  const intro = `En ${ciudad}, a ${fecha}, yo, ALDO CAMILO MALDONADO REBOLLEDO, chileno, cédula nacional de identidad número 10.370.416-2, Agente FIFA con Licencia número 202406-7288, actuando en mi calidad de Socio Fundador y Representante Legal de la Sociedad NUEVA FÚTBOL CHILE SpA, RUT 77.971.556-6, en cumplimiento de los estándares éticos y profesionales exigidos por ${exigidoPor}, declaro bajo juramento lo siguiente:`
  y = drawJustified(doc, intro, X, y, W, LINE_H, checkPage, addPageFn)
  y += 6

  // Declaraciones
  const decls = [
    'Que no tengo vínculos directos ni indirectos, ya sean de carácter societario, laboral, contractual, familiar o de cualquier otra naturaleza, con clubes de fútbol profesional de Primera División, Segunda División ni categorías formativas que pudieran constituir un conflicto de interés en el ejercicio de mi actividad como Agente FIFA.',
    'Que no soy propietario, accionista, socio, directivo, empleado, asesor ni representante de ningún club de fútbol profesional, ni de ninguna entidad vinculada directa o indirectamente a clubes profesionales.',
    'Que no percibo remuneración, honorarios, comisiones ni ningún tipo de beneficio económico proveniente de clubes de fútbol profesional que pueda afectar la independencia e imparcialidad en la representación de los jugadores a mi cargo.',
    'Que actúo en todo momento en defensa exclusiva de los intereses de los jugadores que represento, conforme a los principios de lealtad, transparencia y buena fe que rigen la actividad de los Agentes FIFA.',
    'Que me comprometo a informar de forma inmediata a las autoridades competentes y a los jugadores representados ante cualquier situación que pudiera generar un conflicto de interés sobreviniente.',
    'Que los datos consignados en la presente declaración son verídicos y que asumo plena responsabilidad legal por su contenido.',
    ...(declaraciones || []).filter(d => d && d.trim()),
  ]

  decls.forEach((decl, i) => {
    if (checkPage(y)) { addPageFn(); y = 20 }
    // Número en GOLD
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2])
    doc.circle(X + 3, y - 1, 3, 'F')
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY)
    doc.text(`${i + 1}`, X + 3, y + 0.5, { align: 'center' })
    // Texto
    doc.setFontSize(FONT_SIZE); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BLACK)
    y = drawJustified(doc, decl, X + 9, y, W - 9, LINE_H, checkPage, addPageFn)
    y += 3
  })

  y += 4

  // Cláusula de veracidad
  if (checkPage(y + 10)) { addPageFn(); y = 20 }
  doc.setFillColor(245, 245, 240)
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.5)
  const clausula = 'El suscrito declara haber leído y comprendido el contenido íntegro de la presente declaración, ratificando su veracidad y suscribiéndola en señal de conformidad, asumiendo las responsabilidades civiles, disciplinarias y/o penales que pudieran derivarse de cualquier inexactitud u omisión.'
  const clausLines = doc.splitTextToSize(clausula, W - 10)
  const clausH = clausLines.length * LINE_H + 8
  doc.roundedRect(X, y, W, clausH, 2, 2, 'FD')
  doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(...GRAY)
  clausLines.forEach((l, i) => doc.text(l, X + 5, y + 5 + i * LINE_H))
  y += clausH + 12

  // Firma
  if (checkPage(y + 40)) { addPageFn(); y = 30 }
  doc.setDrawColor(...NAVY); doc.setLineWidth(0.5)
  doc.line(X, y + 20, X + 80, y + 20)
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY)
  doc.text('ALDO CAMILO MALDONADO REBOLLEDO', X + 40, y + 27, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY); doc.setFontSize(8)
  doc.text('RUT: 10.370.416-2', X + 40, y + 33, { align: 'center' })
  doc.text('Agente FIFA · Licencia Nº 202406-7288', X + 40, y + 38, { align: 'center' })
  doc.text('Nueva Fútbol Chile SpA · RUT 77.971.556-6', X + 40, y + 43, { align: 'center' })

  // Notaría placeholder
  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3)
  doc.rect(X + 100, y + 5, 80, 45)
  doc.setFontSize(7); doc.setTextColor(180, 180, 180); doc.setFont('helvetica', 'italic')
  doc.text('TIMBRE / NOTARÍA', X + 140, y + 20, { align: 'center' })
  doc.text('(opcional)', X + 140, y + 26, { align: 'center' })

  // Fix pages
  const totalPgs = doc.getNumberOfPages()
  for (let i = 1; i <= totalPgs; i++) {
    doc.setPage(i)
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, 210, 15, 'F'); doc.rect(0, 280, 210, 20, 'F')
    addHeaderDoc(doc, 'DECLARACIÓN JURADA DE AUSENCIA DE CONFLICTO DE INTERÉS', i, totalPgs)
  }
  return doc
}
