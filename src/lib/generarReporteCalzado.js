// Generador de Reporte de Calzado — Nueva Fútbol Chile SpA
// Incluye: shoe_orders (entregados) + transactions (Implementación Deportiva - Zapatos)
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

// Subtypes de transacciones que corresponden a calzado
const ZAPATOS_SUBTYPES = [
  'Implementación Deportiva (Zapatos)',
  'Implementación Deportiva (Botines)',
  'Calzado deportivo',
]

function fmtDate(d) {
  if (!d) return '—'
  const fecha = new Date(d.includes('T') ? d : d + 'T12:00:00')
  return fecha.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtCLP(n) {
  if (!n) return '—'
  return '$ ' + Math.round(parseFloat(n)).toLocaleString('es-CL')
}

function addHeader(doc, page, total) {
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, 210, 14, 'F')
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
  doc.text('REPORTE DE CALZADO · NUEVA FÚTBOL CHILE SpA', 105, 6, { align: 'center' })
  doc.text(`Página ${page} de ${total}`, 195, 9, { align: 'right' })
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

export function generarReporteCalzadoPDF({ jugadores, ordenes, transacciones = [] }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let page = 1

  const checkPage = (y) => y > 270
  const newPage = () => {
    addFooter(doc)
    doc.addPage()
    page++
    return 22
  }

  // ── Normalizar datos ───────────────────────────────────────────────────────
  // Convertir transacciones de zapatos al mismo formato que shoe_orders
  const txZapatos = transacciones.filter(t =>
    ZAPATOS_SUBTYPES.some(s => t.subtype?.includes('Zapatos') || t.subtype?.includes('Botines') || t.subtype?.includes('zapatos') || t.subtype?.includes('botines'))
  ).map(t => ({
    player_id: t.player_id,
    fecha_entrega: t.transaction_date,
    marca: '—',
    modelo: t.description || t.subtype || '—',
    suela: '—',
    categoria: '—',
    pares: 1,
    estado: 'entregado',
    fuente: 'transaccion',
    monto: t.amount,
    documento: t.documento_respaldo || '—',
  }))

  // Shoe orders entregados — normalizados
  const ordenesFmt = ordenes.filter(o => o.estado === 'entregado' && o.fecha_entrega).map(o => ({
    player_id: o.player_id,
    fecha_entrega: o.fecha_entrega,
    marca: MARCAS_LABEL[o.marca] || o.marca || '—',
    modelo: o.modelo || '—',
    suela: o.suela || '—',
    categoria: o.categoria || '—',
    pares: o.pares || 1,
    estado: 'entregado',
    fuente: 'pedido',
    monto: null,
    documento: '—',
    uk: o.uk,
    us: o.us,
    eu: o.eu,
  }))

  // Combinar todas las entregas
  const todasEntregas = [...ordenesFmt, ...txZapatos]

  // ── PORTADA ───────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, 210, 297, 'F')
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
  doc.text(`${jugadores.length} jugador(es) · Incluye pedidos y compras históricas`, 105, 183, { align: 'center' })

  // ── RESUMEN GENERAL ───────────────────────────────────────────────────────
  doc.addPage(); page++
  addHeader(doc, page, 99)
  let y = 22

  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY)
  doc.text('RESUMEN GENERAL', 15, y); y += 6

  const resumenRows = jugadores.map(jugador => {
    const entregas = todasEntregas.filter(o => o.player_id === jugador.id)
    const totalPares = entregas.reduce((a, o) => a + (o.pares || 0), 0)
    const elite = entregas.filter(o => o.categoria === 'Elite').reduce((a, o) => a + (o.pares || 0), 0)
    const pro = entregas.filter(o => o.categoria === 'Pro').reduce((a, o) => a + (o.pares || 0), 0)
    const ultEntrega = entregas.sort((a, b) => new Date(b.fecha_entrega) - new Date(a.fecha_entrega))[0]

    // Calcular alerta solo con pedidos formales
    let alerta = '—'
    const pedidosJugador = ordenesFmt.filter(o => o.player_id === jugador.id)
    if (pedidosJugador.length > 0) {
      const totalParesFormales = pedidosJugador.reduce((a, o) => a + (o.pares || 0), 0)
      const ultPedido = pedidosJugador.sort((a, b) => new Date(b.fecha_entrega) - new Date(a.fecha_entrega))[0]
      const agotamiento = new Date(ultPedido.fecha_entrega)
      agotamiento.setMonth(agotamiento.getMonth() + (totalParesFormales * 2))
      const dias = Math.floor((agotamiento - Date.now()) / (24 * 3600 * 1000))
      alerta = dias <= 0 ? '⚠ AGOTADO' : dias <= 30 ? `⚡ ${dias}d` : `OK (${Math.floor(dias / 30)}m)`
    }

    return [
      jugador.name,
      totalPares.toString(),
      elite > 0 ? elite.toString() : '—',
      pro > 0 ? pro.toString() : '—',
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
    const entregas = todasEntregas
      .filter(o => o.player_id === jugador.id)
      .sort((a, b) => new Date(b.fecha_entrega) - new Date(a.fecha_entrega))

    if (!entregas.length) continue

    if (checkPage(y)) { y = newPage() }

    // Header jugador
    doc.setFillColor(...NAVY)
    doc.rect(15, y - 1, 180, 10, 'F')
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
    doc.text(jugador.name.toUpperCase(), 19, y + 6)
    const totalPares = entregas.reduce((a, o) => a + (o.pares || 0), 0)
    const elite = entregas.filter(o => o.categoria === 'Elite').reduce((a, o) => a + (o.pares || 0), 0)
    const pro = entregas.filter(o => o.categoria === 'Pro').reduce((a, o) => a + (o.pares || 0), 0)
    doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    doc.text(`${totalPares} pares totales${elite > 0 ? ` · ${elite} Elite` : ''}${pro > 0 ? ` · ${pro} Pro` : ''}`, 195, y + 6, { align: 'right' })
    y += 14

    // Agrupar por año
    const porAnio = {}
    entregas.forEach(o => {
      const anio = new Date(o.fecha_entrega).getFullYear().toString()
      if (!porAnio[anio]) porAnio[anio] = []
      porAnio[anio].push(o)
    })

    for (const [anio, items] of Object.entries(porAnio).sort((a, b) => b[0].localeCompare(a[0]))) {
      if (checkPage(y)) { y = newPage() }

      // Sub-header año
      doc.setFillColor(...GOLD)
      doc.rect(15, y - 1, 180, 7, 'F')
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0)
      const paresAnio = items.reduce((a, o) => a + (o.pares || 0), 0)
      const eliteAnio = items.filter(o => o.categoria === 'Elite').reduce((a, o) => a + (o.pares || 0), 0)
      const proAnio = items.filter(o => o.categoria === 'Pro').reduce((a, o) => a + (o.pares || 0), 0)
      doc.text(`AÑO ${anio}`, 19, y + 4)
      const resAnio = [
        `${paresAnio} pares`,
        eliteAnio > 0 ? `${eliteAnio} Elite` : null,
        proAnio > 0 ? `${proAnio} Pro` : null,
      ].filter(Boolean).join(' · ')
      doc.text(resAnio, 195, y + 4, { align: 'right' })
      y += 9

      // Filas — columnas distintas según fuente
      const rows = items.map(o => {
        if (o.fuente === 'transaccion') {
          return [
            fmtDate(o.fecha_entrega),
            '—',           // marca
            o.modelo,      // descripción de la transacción
            '—',           // suela
            '—',           // cat
            o.pares.toString(),
            '—',           // talla
            o.monto ? fmtCLP(o.monto) : '—',
          ]
        }
        return [
          fmtDate(o.fecha_entrega),
          o.marca,
          o.modelo,
          o.suela,
          o.categoria,
          o.pares.toString(),
          o.uk ? `UK ${o.uk}${o.us ? ` / US ${o.us}` : ''}${o.eu ? ` / EU ${o.eu}` : ''}` : '—',
          '—',
        ]
      })

      doc.autoTable({
        startY: y,
        margin: { left: 15, right: 15 },
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: LIGHT, textColor: [...NAVY], fontStyle: 'bold', fontSize: 7.5 },
        head: [['F. ENTREGA', 'MARCA', 'MODELO / DESCRIPCIÓN', 'SUELA', 'CAT.', 'PARES', 'TALLA', 'MONTO']],
        body: rows,
        columnStyles: {
          0: { cellWidth: 20, halign: 'center' },
          1: { cellWidth: 20 },
          2: { cellWidth: 48 },
          3: { cellWidth: 13, halign: 'center' },
          4: { cellWidth: 13, halign: 'center' },
          5: { cellWidth: 12, halign: 'center' },
          6: { cellWidth: 32 },
          7: { cellWidth: 22, halign: 'right' },
        },
      })
      y = doc.lastAutoTable.finalY + 6
    }
    y += 6
  }

  // Fix headers/footers
  const totalPgs = doc.getNumberOfPages()
  for (let i = 2; i <= totalPgs; i++) {
    doc.setPage(i)
    addHeader(doc, i, totalPgs)
    addFooter(doc)
  }

  return doc
}
