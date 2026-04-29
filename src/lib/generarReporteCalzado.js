// Generador de Reporte de Calzado — Nueva Fútbol Chile SpA
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const NAVY = [27, 43, 94]
const GOLD = [201, 168, 76]
const GRAY = [80, 80, 80]
const LIGHT = [245, 245, 250]

const MARCAS_LABEL = {
  adidas: 'Adidas', nike: 'Nike',
  skechers: 'Skechers', skechers_w: 'Skechers (M)'
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function addHeader(doc, page, total) {
  // Barra azul superior
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, 210, 14, 'F')
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
  doc.text('REPORTE DE CALZADO · NUEVA FÚTBOL CHILE SpA', 105, 6, { align: 'center' })
  doc.text(`Página ${page} de ${total}`, 195, 9, { align: 'right' })

  // Línea dorada
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.6)
  doc.line(15, 14, 195, 14)
}

function addFooter(doc) {
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.4)
  doc.line(15, 283, 195, 283)
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY)
  doc.text('Nueva Fútbol Chile SpA · RUT 77.971.556-6 · Agente FIFA Lic. 202406-7288', 105, 287, { align: 'center' })
  doc.text(new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }), 15, 287)
}

export function generarReporteCalzadoPDF({ jugadores, ordenes }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let page = 1

  const checkPage = (y) => y > 270
  const newPage = () => {
    addFooter(doc)
    doc.addPage()
    page++
    return 22
  }

  // ── PORTADA ───────────────────────────────────────────────────────────────
  // Fondo azul completo en portada
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, 210, 297, 'F')

  // Línea dorada decorativa
  doc.setDrawColor(...GOLD); doc.setLineWidth(1.5)
  doc.line(20, 80, 190, 80)
  doc.line(20, 200, 190, 200)

  doc.setFontSize(28); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GOLD)
  doc.text('REPORTE', 105, 100, { align: 'center' })
  doc.text('DE CALZADO', 105, 118, { align: 'center' })

  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(255, 255, 255)
  doc.text('NUEVA FÚTBOL CHILE SpA', 105, 140, { align: 'center' })
  doc.text('Agencia de Representación Deportiva', 105, 148, { align: 'center' })
  doc.text('Agente FIFA Lic. 202406-7288', 105, 156, { align: 'center' })

  doc.setFontSize(9); doc.setTextColor(...GOLD)
  doc.text(`Generado el ${new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}`, 105, 175, { align: 'center' })
  doc.text(`${jugadores.length} jugador(es) incluido(s)`, 105, 183, { align: 'center' })

  // ── RESUMEN GENERAL ───────────────────────────────────────────────────────
  doc.addPage(); page++
  addHeader(doc, page, 99)
  let y = 22

  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY)
  doc.text('RESUMEN GENERAL', 15, y); y += 6

  // Tabla resumen por jugador
  const resumenRows = jugadores.map(jugador => {
    const ordenesJugador = ordenes.filter(o =>
      o.player_id === jugador.id && o.estado === 'entregado' && o.fecha_entrega
    )
    const totalPares = ordenesJugador.reduce((a, o) => a + (o.pares || 0), 0)
    const elite = ordenesJugador.filter(o => o.categoria === 'Elite').reduce((a, o) => a + (o.pares || 0), 0)
    const pro = ordenesJugador.filter(o => o.categoria === 'Pro').reduce((a, o) => a + (o.pares || 0), 0)
    const ultEntrega = ordenesJugador.sort((a, b) => new Date(b.fecha_entrega) - new Date(a.fecha_entrega))[0]

    // Calcular alerta
    let alerta = '—'
    if (ultEntrega) {
      const agotamiento = new Date(ultEntrega.fecha_entrega)
      agotamiento.setMonth(agotamiento.getMonth() + (totalPares * 2))
      const dias = Math.floor((agotamiento - Date.now()) / (24 * 3600 * 1000))
      alerta = dias <= 0 ? '⚠ AGOTADO' : dias <= 30 ? `⚡ ${dias}d` : `OK (${Math.floor(dias / 30)}m)`
    }

    return [
      jugador.name,
      totalPares.toString(),
      elite.toString(),
      pro.toString(),
      ultEntrega ? fmtDate(ultEntrega.fecha_entrega) : '—',
      alerta,
    ]
  })

  doc.autoTable({
    startY: y,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    head: [['JUGADOR', 'TOTAL PARES', 'ELITE', 'PRO', 'ÚLT. ENTREGA', 'ESTADO']],
    body: resumenRows,
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 30, halign: 'center' },
      5: { cellWidth: 37, halign: 'center' },
    },
  })
  y = doc.lastAutoTable.finalY + 12

  // ── DETALLE POR JUGADOR ───────────────────────────────────────────────────
  for (const jugador of jugadores) {
    const ordenesJugador = ordenes
      .filter(o => o.player_id === jugador.id && o.estado === 'entregado' && o.fecha_entrega)
      .sort((a, b) => new Date(b.fecha_entrega) - new Date(a.fecha_entrega))

    if (!ordenesJugador.length) continue

    if (checkPage(y)) { y = newPage() }

    // Header jugador
    doc.setFillColor(...NAVY)
    doc.rect(15, y - 1, 180, 10, 'F')
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
    doc.text(jugador.name.toUpperCase(), 19, y + 6)

    // Totales del jugador
    const totalPares = ordenesJugador.reduce((a, o) => a + (o.pares || 0), 0)
    const elite = ordenesJugador.filter(o => o.categoria === 'Elite').reduce((a, o) => a + (o.pares || 0), 0)
    const pro = ordenesJugador.filter(o => o.categoria === 'Pro').reduce((a, o) => a + (o.pares || 0), 0)
    doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    doc.text(`${totalPares} pares totales · ${elite} Elite · ${pro} Pro`, 195, y + 6, { align: 'right' })
    y += 14

    // Agrupar por año
    const porAnio = {}
    ordenesJugador.forEach(o => {
      const anio = new Date(o.fecha_entrega).getFullYear().toString()
      if (!porAnio[anio]) porAnio[anio] = []
      porAnio[anio].push(o)
    })

    for (const [anio, ordenes_anio] of Object.entries(porAnio).sort((a, b) => b[0].localeCompare(a[0]))) {
      if (checkPage(y)) { y = newPage() }

      // Sub-header año
      doc.setFillColor(...GOLD)
      doc.rect(15, y - 1, 180, 7, 'F')
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0)
      const paresAnio = ordenes_anio.reduce((a, o) => a + (o.pares || 0), 0)
      const eliteAnio = ordenes_anio.filter(o => o.categoria === 'Elite').reduce((a, o) => a + (o.pares || 0), 0)
      const proAnio = ordenes_anio.filter(o => o.categoria === 'Pro').reduce((a, o) => a + (o.pares || 0), 0)
      doc.text(`AÑO ${anio}`, 19, y + 4)
      doc.text(`${paresAnio} pares · ${eliteAnio} Elite · ${proAnio} Pro`, 195, y + 4, { align: 'right' })
      y += 9

      // Filas de entregas
      const rows = ordenes_anio.map(o => [
        fmtDate(o.fecha_entrega),
        MARCAS_LABEL[o.marca] || o.marca,
        o.modelo || '—',
        o.suela || '—',
        o.categoria || '—',
        o.pares?.toString() || '1',
        `UK ${o.uk}${o.us ? ` / US ${o.us}` : ''}${o.eu ? ` / EU ${o.eu}` : ''}`,
      ])

      doc.autoTable({
        startY: y,
        margin: { left: 15, right: 15 },
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: LIGHT, textColor: [...NAVY], fontStyle: 'bold', fontSize: 7.5 },
        head: [['F. ENTREGA', 'MARCA', 'MODELO', 'SUELA', 'CAT.', 'PARES', 'TALLA']],
        body: rows,
        columnStyles: {
          0: { cellWidth: 22, halign: 'center' },
          1: { cellWidth: 25 },
          2: { cellWidth: 40 },
          3: { cellWidth: 16, halign: 'center' },
          4: { cellWidth: 16, halign: 'center' },
          5: { cellWidth: 14, halign: 'center' },
          6: { cellWidth: 47 },
        },
      })
      y = doc.lastAutoTable.finalY + 6
    }

    y += 6
  }

  // Fix headers/footers en todas las páginas
  const totalPgs = doc.getNumberOfPages()
  for (let i = 2; i <= totalPgs; i++) {
    doc.setPage(i)
    addHeader(doc, i, totalPgs)
    addFooter(doc)
  }

  return doc
}
