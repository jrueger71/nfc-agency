// Generador de Documentos de Autorización — NFC
import jsPDF from 'jspdf'
import { formatRut } from './formatRut'

const NAVY = [27, 43, 94]
const GOLD = [201, 168, 76]
const BLACK = [0, 0, 0]
const GRAY = [80, 80, 80]

const FONT_SIZE = 9
const LINE_H = 5.2
const X = 15
const W = 180

function addHeader(doc, pageNum, totalPages, tipo) {
  const titulo = tipo === 'poder'
    ? 'PODER ESPECIAL — NUEVA FÚTBOL CHILE SpA'
    : 'AUTORIZACIÓN EXCLUSIVA DE GESTIÓN — NUEVA FÚTBOL CHILE SpA'
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.8)
  doc.line(15, 12, 195, 12)
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.setFont('helvetica', 'normal')
  doc.text(titulo, 15, 9)
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

function drawArticulo(doc, numero, texto, x, y, W, LINE_H, checkPage, addPageFn) {
  if (checkPage(y)) { addPageFn(); y = 20 }
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  doc.text(`${numero}:`, x, y)
  y += LINE_H
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BLACK)
  y = drawJustified(doc, texto, x, y, W, LINE_H, checkPage, addPageFn)
  return y + 4
}

const FIRMANTES = {
  aldo: {
    nombre: 'ALDO CAMILO MALDONADO REBOLLEDO',
    rut: '10.370.416-2',
    cargo: 'Agente FIFA · Licencia Nº 202406-7288',
    cargo2: 'Sociedad Nueva Fútbol Chile SpA',
    pp: false,
  },
  marcos: {
    nombre: 'MARCOS GONZÁLEZ',
    rut: '—',
    cargo: 'p.p. ALDO CAMILO MALDONADO REBOLLEDO',
    cargo2: 'Agente FIFA · Licencia Nº 202406-7288',
    pp: true,
  },
  jorge: {
    nombre: 'JORGE RUEGER',
    rut: '—',
    cargo: 'p.p. ALDO CAMILO MALDONADO REBOLLEDO',
    cargo2: 'Agente FIFA · Licencia Nº 202406-7288',
    pp: true,
  },
}

function drawFirmas(doc, y, firmante = 'aldo') {
  if (y > 240) { doc.addPage(); y = 30 }
  else y += 12

  const f = FIRMANTES[firmante] || FIRMANTES.aldo
  const sigW = 90

  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...NAVY)
  doc.text('En señal de conformidad, firma la Agencia:', X, y)
  y += 16

  doc.setDrawColor(...NAVY); doc.setLineWidth(0.5)
  doc.line(X, y + 20, X + sigW, y + 20)

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY)
  doc.text(f.nombre, X + sigW / 2, y + 26, { align: 'center', maxWidth: sigW })
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY); doc.setFontSize(7.5)
  if (f.rut !== '—') doc.text(`RUT: ${formatRut(f.rut)}`, X + sigW / 2, y + 31, { align: 'center' })
  doc.text(f.cargo, X + sigW / 2, y + 36, { align: 'center', maxWidth: sigW })
  doc.text(f.cargo2, X + sigW / 2, y + 41, { align: 'center', maxWidth: sigW })
}

// ─── AUTORIZACIÓN EXCLUSIVA ───────────────────────────────────────────────────
export function generarAutorizacionPDF(datos) {
  const { ciudad='Santiago de Chile', fecha, agenteExterno, jugadores, clubes,
    incluyeComision, comisionNFC, comisionExterno, fechaInicio, fechaTermino,
    firmante = 'aldo' } = datos

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let page = 1
  const checkPage = (y) => y > 270
  const addPageFn = () => { addHeader(doc, page, 99, 'autorizacion'); doc.addPage(); page++ }

  let y = 22
  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY)
  doc.text('AUTORIZACIÓN EXCLUSIVA DE GESTIÓN', 105, y, { align: 'center' })
  y += 7
  doc.setFontSize(10); doc.setTextColor(GOLD[0], GOLD[1], GOLD[2])
  doc.text('CARTERA DE JUGADORES', 105, y, { align: 'center' })
  y += 12

  // Comparecientes
  doc.setFontSize(FONT_SIZE); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BLACK)
  const comp = `En ${ciudad}, a ${fecha}, entre SOCIEDAD NUEVA FUTBOL CHILE SpA, Rol Único Tributario Número 77.971.556-6, representada por don ALDO CAMILO MALDONADO REBOLLEDO, chileno, cédula nacional de identidad número 10.370.416-2, Agente FIFA, Licencia número 202406-7288, en adelante "la Agencia"; y por la otra parte el Agente FIFA don ${agenteExterno.nombre.toUpperCase()}, Licencia número ${agenteExterno.licencia}, en adelante "el Agente Externo".`
  y = drawJustified(doc, comp, X, y, W, LINE_H, checkPage, addPageFn)
  y += 5

  // Art. 1
  const jugadoresStr = jugadores.map(j => {
    let str = `${j.nombre.toUpperCase()}${j.rut ? `, RUT: ${formatRut(j.rut)}` : ''}`
    if (j.clubActual) str += `, actualmente con contrato en ${j.clubActual.toUpperCase()}`
    return str
  }).join('; ')
  const textoJ = jugadores.length === 1 ? `para el jugador ${jugadoresStr}` : `para los siguientes jugadores del pool de la Agencia: ${jugadoresStr}`
  y = drawArticulo(doc, 'PRIMERO', `Por medio del presente acuerdo, la Agencia autoriza de manera EXCLUSIVA al Agente Externo don ${agenteExterno.nombre.toUpperCase()} a participar en una base exploratoria y de negociación en un esfuerzo por determinar oportunidades de empleo y transferencia ${textoJ}.`, X, y, W, LINE_H, checkPage, addPageFn)

  // Art. 2 — clubes
  const clubesFiltrados = (clubes || []).filter(c => c.nombre && c.nombre.trim())
  if (clubesFiltrados.length > 0) {
    if (checkPage(y)) { addPageFn(); y = 20 }
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY)
    doc.text('SEGUNDO:', X, y); y += LINE_H
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...BLACK)
    y = drawJustified(doc, 'Esta autorización se limita estrictamente a las gestiones ante los siguientes clubes y/o ligas:', X, y, W, LINE_H, checkPage, addPageFn)
    y += 2
    clubesFiltrados.forEach((club, i) => {
      if (checkPage(y)) { addPageFn(); y = 20 }
      doc.text(`${i + 1}.  ${club.nombre}${club.pais ? ` (${club.pais})` : ''}.`, X + 5, y)
      y += LINE_H
    })
    y += 4
  } else {
    y = drawArticulo(doc, 'SEGUNDO', 'Esta autorización no se limita a clubes específicos, pudiendo el Agente Externo realizar gestiones ante cualquier club o liga que estime conveniente para los intereses del Jugador y de la Agencia.', X, y, W, LINE_H, checkPage, addPageFn)
  }

  // Art. 3 — comisión
  const art3 = incluyeComision
    ? `El presente acuerdo establece que, en caso de concretarse cualquier transacción, transferencia y/o firma de contrato fruto de esta gestión, la comisión percibida por concepto de honorarios de agente se compartirá de la siguiente forma: ${comisionNFC}% para Nueva Fútbol Chile SpA y ${comisionExterno}% para ${agenteExterno.nombre.toUpperCase()}.`
    : 'El presente acuerdo no establece distribución de comisiones entre las partes. Cualquier acuerdo económico derivado de esta gestión será objeto de negociación separada entre las partes al momento de concretarse una operación.'
  y = drawArticulo(doc, 'TERCERO', art3, X, y, W, LINE_H, checkPage, addPageFn)

  // Art. 4 — vigencia
  y = drawArticulo(doc, 'CUARTO', `Esta autorización tiene una vigencia definitiva desde ${fechaInicio} hasta el ${fechaTermino}.`, X, y, W, LINE_H, checkPage, addPageFn)

  // Art. 5
  y = drawArticulo(doc, 'QUINTO', 'Las partes declaran y garantizan que son libres de celebrar este acuerdo y que no existen compromisos previos que entren en conflicto con las obligaciones aquí estipuladas.', X, y, W, LINE_H, checkPage, addPageFn)

  drawFirmas(doc, y, firmante)

  const totalPgs = doc.getNumberOfPages()
  for (let i = 1; i <= totalPgs; i++) {
    doc.setPage(i)
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, 210, 15, 'F'); doc.rect(0, 280, 210, 20, 'F')
    addHeader(doc, i, totalPgs, 'autorizacion')
  }
  return doc
}

// ─── PODER ESPECIAL ───────────────────────────────────────────────────────────
export function generarPoderEspecialPDF(datos) {
  const { ciudad='Santiago de Chile', fecha, agenteExterno, jugadores, clubes,
    incluyeComision, comisionNFC, comisionExterno, fechaInicio, fechaTermino,
    firmante = 'aldo' } = datos

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let page = 1
  const checkPage = (y) => y > 270
  const addPageFn = () => { addHeader(doc, page, 99, 'poder'); doc.addPage(); page++ }

  let y = 22
  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY)
  doc.text('PODER ESPECIAL', 105, y, { align: 'center' })
  y += 12

  // Comparecientes
  doc.setFontSize(FONT_SIZE); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BLACK)
  const comp = `En ${ciudad}, a ${fecha}, don ALDO CAMILO MALDONADO REBOLLEDO, chileno, cédula nacional de identidad número 10.370.416-2, registrado con Licencia FIFA 202406-7288, en representación de SOCIEDAD NUEVA FUTBOL CHILE SpA, Rol Único Tributario Número 77.971.556-6, en adelante "la Mandante"; expone:`
  y = drawJustified(doc, comp, X, y, W, LINE_H, checkPage, addPageFn)
  y += 5

  // Art. 1 — jugadores con club actual
  const jugadoresStr = jugadores.map(j => {
    let str = `don/doña ${j.nombre.toUpperCase()}${j.rut ? `, RUT ${formatRut(j.rut)}` : ''}`
    if (j.clubActual) str += `, quien se encuentra con contrato vigente con el club ${j.clubActual.toUpperCase()}`
    else str += ', quien se encuentra actualmente en período de negociación libre'
    return str
  }).join('; ')

  y = drawArticulo(doc, '1.-', `Que la Mandante representa como jugador${jugadores.length > 1 ? 'es' : ''} profesional${jugadores.length > 1 ? 'es' : ''} de fútbol a ${jugadoresStr}.`, X, y, W, LINE_H, checkPage, addPageFn)

  // Art. 2 — mandato
  y = drawArticulo(doc, '2.-', `Que, por el presente instrumento, la Mandante autoriza a don ${agenteExterno.nombre.toUpperCase()}, Agente FIFA, Licencia número ${agenteExterno.licencia}, en adelante "el Mandatario", con el objeto que pueda acercar a la Mandante y a su${jugadores.length > 1 ? 's' : ''} representado${jugadores.length > 1 ? 's' : ''} una oferta de empleo y/o transferencia.`, X, y, W, LINE_H, checkPage, addPageFn)

  // Art. 3 — límite facultades
  const clubesFiltrados = (clubes || []).filter(c => c.nombre && c.nombre.trim())
  let art3txt
  if (clubesFiltrados.length > 0) {
    const listaClubes = clubesFiltrados.map((c, i) => `${i + 1}. ${c.nombre}${c.pais ? ` (${c.pais})` : ''}`).join('; ')
    art3txt = `Se limita al Mandatario la facultad de gestionar ante los siguientes clubes y/o ligas: ${listaClubes}. Toda suscripción de actos y contratos deberá ser efectuada exclusivamente por la Mandante.`
  } else {
    art3txt = 'Se limita al Mandatario la facultad de celebrar actos y contratos. Toda suscripción de actos y contratos deberá ser efectuada exclusivamente por la Mandante.'
  }
  y = drawArticulo(doc, '3.-', art3txt, X, y, W, LINE_H, checkPage, addPageFn)

  // Art. 4 — comisión (si aplica)
  if (incluyeComision) {
    y = drawArticulo(doc, '4.-', `En caso de concretarse cualquier transacción, transferencia y/o firma de contrato fruto de esta gestión, la comisión percibida por concepto de honorarios de agente se compartirá de la siguiente forma: ${comisionNFC}% para Nueva Fútbol Chile SpA y ${comisionExterno}% para ${agenteExterno.nombre.toUpperCase()}.`, X, y, W, LINE_H, checkPage, addPageFn)
  }

  // Art. siguiente — vigencia con cláusula de exoneración
  const numVig = incluyeComision ? '5.-' : '4.-'
  y = drawArticulo(doc, numVig, `Esta autorización tendrá una vigencia a contar de ${fechaInicio} hasta el ${fechaTermino}. Se deja expresamente establecido que esta autorización expira para todos los efectos legales en dicha fecha. Cualquier oferta que sea presentada con posterioridad a la fecha de vencimiento, ya sea en forma directa o indirecta, exonera de todo compromiso y/o responsabilidad legal o pecuniaria a la Mandante.`, X, y, W, LINE_H, checkPage, addPageFn)

  // Art. final — declaración
  const numFinal = incluyeComision ? '6.-' : '5.-'
  y = drawArticulo(doc, numFinal, 'Las partes declaran y garantizan que son libres de celebrar este acuerdo y que no existen compromisos previos que entren en conflicto con las obligaciones aquí estipuladas.', X, y, W, LINE_H, checkPage, addPageFn)

  drawFirmas(doc, y, firmante)

  const totalPgs = doc.getNumberOfPages()
  for (let i = 1; i <= totalPgs; i++) {
    doc.setPage(i)
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, 210, 15, 'F'); doc.rect(0, 280, 210, 20, 'F')
    addHeader(doc, i, totalPgs, 'poder')
  }
  return doc
}
