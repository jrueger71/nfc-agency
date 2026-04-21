// Generador de Autorización Exclusiva de Gestión — NFC
import jsPDF from 'jspdf'

const NAVY = [27, 43, 94]
const GOLD = [201, 168, 76]
const BLACK = [0, 0, 0]
const GRAY = [80, 80, 80]

const FONT_SIZE = 9
const LINE_H = 5.2
const X = 15
const W = 180

function addHeader(doc, pageNum, totalPages) {
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.8)
  doc.line(15, 12, 195, 12)
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.setFont('helvetica', 'normal')
  doc.text('AUTORIZACIÓN EXCLUSIVA DE GESTIÓN — NUEVA FÚTBOL CHILE SpA', 15, 9)
  doc.text(`Página ${pageNum} de ${totalPages}`, 195, 9, { align: 'right' })
  doc.setDrawColor(...GOLD)
  doc.line(15, 283, 195, 283)
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
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
      if (words.length <= 1) {
        doc.text(line, x, y)
      } else {
        const lineWidth = doc.getStringUnitWidth(line.replace(/ /g, '')) * FONT_SIZE / doc.internal.scaleFactor
        const totalSpace = maxWidth - lineWidth
        const spacePerGap = totalSpace / (words.length - 1)
        let curX = x
        words.forEach((word, wi) => {
          doc.text(word, curX, y)
          if (wi < words.length - 1) {
            curX += doc.getStringUnitWidth(word) * FONT_SIZE / doc.internal.scaleFactor + spacePerGap
          }
        })
      }
    }
    y += lineH
  })
  return y
}

export function generarAutorizacionPDF(datos) {
  const {
    ciudad = 'Santiago de Chile',
    fecha,
    agenteExterno,     // { nombre, licencia }
    jugadores,         // [{ nombre, rut }]
    clubes,            // [{ nombre, pais }]
    incluyeComision,
    comisionNFC,       // número ej: 50
    comisionExterno,   // número ej: 50
    fechaInicio,
    fechaTermino,
  } = datos

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let page = 1

  const checkPage = (y) => y > 270
  const addPageFn = () => {
    addHeader(doc, page, 99)
    doc.addPage()
    page++
  }

  // ---- TÍTULO ----
  let y = 22
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  doc.text('AUTORIZACIÓN EXCLUSIVA DE GESTIÓN', 105, y, { align: 'center' })
  y += 7
  doc.setFontSize(10)
  doc.setTextColor(...GOLD[0], ...GOLD.slice(1))
  doc.setTextColor(GOLD[0], GOLD[1], GOLD[2])
  doc.text('CARTERA DE JUGADORES', 105, y, { align: 'center' })
  y += 12

  // ---- COMPARECIENTES ----
  doc.setFontSize(FONT_SIZE)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BLACK)

  const compareciente = `En ${ciudad}, a ${fecha}, entre SOCIEDAD NUEVA FUTBOL CHILE SpA, Rol Único Tributario Número 77.971.556-6, representada por don ALDO CAMILO MALDONADO REBOLLEDO, chileno, cédula nacional de identidad número 10.370.416-2, Agente FIFA, Licencia número 202406-7288, en adelante "la Agencia"; y por la otra parte el Agente FIFA don ${agenteExterno.nombre.toUpperCase()}, Licencia número ${agenteExterno.licencia}, en adelante "el Agente Externo".`

  y = drawJustified(doc, compareciente, X, y, W, LINE_H, checkPage, addPageFn)
  y += 5

  // ---- ARTÍCULOS ----

  // PRIMERO
  const jugadoresStr = jugadores.map((j, i) =>
    `${j.nombre.toUpperCase()}${j.rut ? `, RUT: ${j.rut}` : ''}`
  ).join('; ')

  const textoJugadores = jugadores.length === 1
    ? `para el jugador ${jugadoresStr}`
    : `para los siguientes jugadores del pool de la Agencia: ${jugadoresStr}`

  const art1 = `Por medio del presente acuerdo, la Agencia autoriza de manera EXCLUSIVA al Agente Externo don ${agenteExterno.nombre.toUpperCase()} a participar en una base exploratoria y de negociación en un esfuerzo por determinar oportunidades de empleo y transferencia ${textoJugadores}.`

  if (checkPage(y)) { addPageFn(); y = 20 }
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  doc.text('PRIMERO:', X, y)
  y += LINE_H
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BLACK)
  y = drawJustified(doc, art1, X, y, W, LINE_H, checkPage, addPageFn)
  y += 4

  // SEGUNDO — clubes
  if (checkPage(y)) { addPageFn(); y = 20 }
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  doc.text('SEGUNDO:', X, y)
  y += LINE_H
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BLACK)
  const art2intro = 'Esta autorización se limita estrictamente a las gestiones ante los siguientes clubes:'
  y = drawJustified(doc, art2intro, X, y, W, LINE_H, checkPage, addPageFn)
  y += 2
  clubes.forEach((club, i) => {
    if (checkPage(y)) { addPageFn(); y = 20 }
    const linea = `${i + 1}.  ${club.nombre}${club.pais ? ` (${club.pais})` : ''}.`
    doc.text(linea, X + 5, y)
    y += LINE_H
  })
  y += 3

  // TERCERO — comisión
  if (checkPage(y)) { addPageFn(); y = 20 }
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  doc.text('TERCERO:', X, y)
  y += LINE_H
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BLACK)

  let art3
  if (incluyeComision) {
    art3 = `El presente acuerdo establece que, en caso de concretarse cualquier transacción, transferencia y/o firma de contrato fruto de esta gestión, la comisión percibida por concepto de honorarios de agente se compartirá de la siguiente forma: ${comisionNFC}% para Nueva Fútbol Chile SpA y ${comisionExterno}% para ${agenteExterno.nombre.toUpperCase()}.`
  } else {
    art3 = 'El presente acuerdo no establece distribución de comisiones entre las partes. Cualquier acuerdo económico derivado de esta gestión será objeto de negociación separada entre las partes al momento de concretarse una operación.'
  }
  y = drawJustified(doc, art3, X, y, W, LINE_H, checkPage, addPageFn)
  y += 4

  // CUARTO — vigencia
  if (checkPage(y)) { addPageFn(); y = 20 }
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  doc.text('CUARTO:', X, y)
  y += LINE_H
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BLACK)
  const art4 = `Esta autorización tiene una vigencia definitiva desde ${fechaInicio} hasta el ${fechaTermino}.`
  y = drawJustified(doc, art4, X, y, W, LINE_H, checkPage, addPageFn)
  y += 4

  // QUINTO — declaraciones
  if (checkPage(y)) { addPageFn(); y = 20 }
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  doc.text('QUINTO:', X, y)
  y += LINE_H
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BLACK)
  const art5 = 'Las partes declaran y garantizan que son libres de celebrar este acuerdo y que no existen compromisos previos que entren en conflicto con las obligaciones aquí estipuladas.'
  y = drawJustified(doc, art5, X, y, W, LINE_H, checkPage, addPageFn)
  y += 8

  // ---- FIRMAS ----
  if (checkPage(y + 40)) { addPageFn(); y = 20 }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...NAVY)
  doc.text('En señal de conformidad, firman las partes:', X, y)
  y += 14

  // Dos columnas de firma
  const col1X = X
  const col2X = X + W / 2 + 5
  const colW = W / 2 - 10

  // Líneas
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.5)
  doc.line(col1X, y + 20, col1X + colW, y + 20)
  doc.line(col2X, y + 20, col2X + colW, y + 20)

  // Nombres
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  doc.text('ALDO CAMILO MALDONADO REBOLLEDO', col1X + colW / 2, y + 26, { align: 'center', maxWidth: colW })
  doc.text(agenteExterno.nombre.toUpperCase(), col2X + colW / 2, y + 26, { align: 'center', maxWidth: colW })

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.setFontSize(7.5)
  doc.text('AGENTE FIFA LICENCIA Nº 202406-7288', col1X + colW / 2, y + 32, { align: 'center' })
  doc.text('SOCIEDAD NUEVA FÚTBOL CHILE SpA', col1X + colW / 2, y + 37, { align: 'center' })

  doc.text(`AGENTE FIFA LICENCIA Nº ${agenteExterno.licencia}`, col2X + colW / 2, y + 32, { align: 'center' })

  // Fix page numbers
  const totalPgs = doc.getNumberOfPages()
  for (let i = 1; i <= totalPgs; i++) {
    doc.setPage(i)
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, 210, 15, 'F')
    doc.rect(0, 280, 210, 20, 'F')
    addHeader(doc, i, totalPgs)
  }

  return doc
}
