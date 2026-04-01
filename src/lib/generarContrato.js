// Generador de Contrato de Representación NFC
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const NAVY = [27, 43, 94]
const GOLD = [201, 168, 76]
const BLACK = [0, 0, 0]
const GRAY = [80, 80, 80]

const FONT_SIZE = 9
const LINE_H = 5.2
const X = 15
const W = 180

function addHeader(doc, pageNum, totalPages, logoDataUrl) {
  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, 'JPEG', 15, 2, 18, 10) } catch(e) {}
  } else {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NAVY); doc.text('NFC', 15, 9)
  }
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.8)
  doc.line(35, 12, 195, 12)
  doc.setFontSize(7); doc.setTextColor(...GRAY); doc.setFont('helvetica', 'normal')
  doc.text('CONTRATO DE REPRESENTACIÓN Y PRESTACIÓN DE SERVICIOS — NUEVA FÚTBOL CHILE SpA', 36, 9)
  doc.text(`Página ${pageNum} de ${totalPages}`, 195, 9, { align: 'right' })
  doc.setDrawColor(...GOLD); doc.line(15, 283, 195, 283)
  doc.setFontSize(7); doc.setTextColor(...GRAY)
  doc.text('Nueva Fútbol Chile SpA · RUT 77.971.556-6 · Av. Larraín 5682, Piso 13, La Reina, Santiago · Agente FIFA Lic. 202406-7288', 105, 287, { align: 'center' })
}

// Justified text renderer — returns new Y position
function drawJustified(doc, text, x, y, maxWidth, lineH, checkPage, addPageFn) {
  doc.setFontSize(FONT_SIZE)
  const lines = doc.splitTextToSize(text, maxWidth)
  lines.forEach((line, idx) => {
    if (checkPage(y)) { addPageFn(); y = 20 }
    const isLast = idx === lines.length - 1
    // Don't justify last line or very short lines
    if (isLast || line.trim().length < 20) {
      doc.text(line, x, y)
    } else {
      // Justify: calculate word spacing
      const words = line.split(' ').filter(w => w.length > 0)
      if (words.length <= 1) {
        doc.text(line, x, y)
      } else {
        const lineWidth = doc.getStringUnitWidth(line.replace(/ /g,'')) * FONT_SIZE / doc.internal.scaleFactor
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

async function loadImageAsBase64(url) {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch(e) { return null }
}

export async function generarContratoPDF(datos) {
  const {
    jugador,
    esMenor,
    tutores,
    fechaContrato,
    duracionAnios,
    ciudad,
    tieneDerechosImagen = false, // nuevo flag
  } = datos

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const logoUrl = datos.logoUrl || null
  const logoData = logoUrl ? await loadImageAsBase64(logoUrl) : null

  let page = 1

  const checkPage = (y) => y > 270
  const addPageFn = () => {
    addHeader(doc, page, 99, logoData)
    doc.addPage()
    page++
  }

  const ageCalc = (fechaNac) => {
    const hoy = new Date(); const nac = new Date(fechaNac)
    return Math.floor((hoy - nac) / (365.25 * 24 * 3600 * 1000))
  }

  const nombreJugador = jugador.nombre.toUpperCase()
  const rutJugador = jugador.rut
  const domicilio = jugador.domicilio || 'a indicar'
  const comuna = jugador.comuna || 'Santiago'
  const fechaNacStr = jugador.fechaNac
    ? new Date(jugador.fechaNac).toLocaleDateString('es-CL', { day:'2-digit', month:'long', year:'numeric' })
    : '[FECHA NACIMIENTO]'

  let compareciente = ''
  if (esMenor && tutores && tutores.length > 0) {
    const tutorStr = tutores.map(t => `don/doña ${t.nombre}, cédula de identidad número ${t.rut}`).join('; y ')
    compareciente = `En ${ciudad || 'SANTIAGO'}, a ${fechaContrato}, entre don ${nombreJugador}, chileno/a, estudiante, cédula de identidad número ${rutJugador}, nacido/a el ${fechaNacStr}, y ${tutorStr}, en su calidad de padre/madre/representante legal, todos domiciliados para estos efectos en ${domicilio}, ${comuna}, en adelante también e indistintamente el "Jugador", representado por sus padres/tutores por ser menor de edad; y por la otra la SOCIEDAD NUEVA FUTBOL CHILE SpA, Rol Único Tributario Número 77.971.556-6, representada por don ALDO CAMILO MALDONADO REBOLLEDO, chileno, factor de comercio, cédula nacional de identidad número 10.370.416-2, Agente FIFA, Licencia número 202406-7288, domiciliado para estos efectos en Avenida Larraín #5682, Piso 13, La Reina, Región Metropolitana, en adelante también la "Agencia".`
  } else {
    compareciente = `En ${ciudad || 'SANTIAGO'}, a ${fechaContrato}, entre don/doña ${nombreJugador}, chileno/a, futbolista profesional, cédula de identidad número ${rutJugador}, nacido/a el ${fechaNacStr}, domiciliado/a para estos efectos en ${domicilio}, ${comuna}, en adelante también e indistintamente el "Jugador"; y por la otra la SOCIEDAD NUEVA FUTBOL CHILE SpA, Rol Único Tributario Número 77.971.556-6, representada por don ALDO CAMILO MALDONADO REBOLLEDO, chileno, factor de comercio, cédula nacional de identidad número 10.370.416-2, Agente FIFA, Licencia número 202406-7288, domiciliado para estos efectos en Avenida Larraín #5682, Piso 13, La Reina, Región Metropolitana, en adelante también la "Agencia".`
  }

  // Art. 10 varía según si tiene derechos de imagen
  const art10 = tieneDerechosImagen
    ? {
        titulo: 'DÉCIMO: COMPENSACIÓN POR INVERSIONES Y TERMINACIÓN UNILATERAL.',
        texto: '10.1. La Agencia se compromete a prestar servicios de valor que incluyen asesoramiento técnico, planificación de carrera y, en su caso, inversiones directas en el desarrollo del Jugador, según el Anexo A: Detalle de Inversiones.\n\n10.2. En caso de terminación unilateral por parte del Jugador (Art. 9.5), deberá compensar a la Agencia por el valor de las inversiones realizadas y los servicios ya ejecutados, detallados en el Anexo A.\n\n10.3. La compensación se calculará sumando: (a) La totalidad de los costes documentados e invertidos directamente en su desarrollo profesional que no hayan sido amortizados; más (b) un monto equivalente al 10% de la comisión promedio anual proyectada por los meses restantes, con límite máximo de 6 meses.\n\n10.4. El pago de esta compensación será exigible dentro de los 30 días siguientes a la fecha de terminación efectiva del Contrato.\n\n10.5. IMPORTANTE: Las disposiciones del presente Artículo Décimo NO serán aplicables a este Contrato en lo relativo a contratos de imagen, auspicios y patrocinios. Para dichas materias, rige exclusivamente lo establecido en el Artículo Décimo Primero siguiente.'
      }
    : {
        titulo: 'DÉCIMO: COMPENSACIÓN POR INVERSIONES Y TERMINACIÓN UNILATERAL.',
        texto: '10.1. La Agencia se compromete a prestar servicios de valor que incluyen asesoramiento técnico, planificación de carrera y, en su caso, inversiones directas en el desarrollo del Jugador, según el Anexo A: Detalle de Inversiones.\n\n10.2. En caso de terminación unilateral por parte del Jugador (Art. 9.5), deberá compensar a la Agencia por el valor de las inversiones realizadas y los servicios ya ejecutados, detallados en el Anexo A.\n\n10.3. La compensación se calculará sumando: (a) La totalidad de los costes documentados e invertidos directamente en su desarrollo profesional que no hayan sido amortizados; más (b) un monto equivalente al 10% de la comisión promedio anual proyectada por los meses restantes, con límite máximo de 6 meses.\n\n10.4. El pago de esta compensación será exigible dentro de los 30 días siguientes a la fecha de terminación efectiva del Contrato.'
      }

  const art11ImagenOpcional = tieneDerechosImagen ? [{
    titulo: 'DÉCIMO PRIMERO: COMPENSACIÓN POR DERECHOS DE IMAGEN Y CONTRATOS COMERCIALES.',
    texto: '11.1. Ámbito de Aplicación. Las disposiciones del presente artículo se aplicarán exclusivamente respecto del presente Contrato, en atención a que el Jugador cuenta, al momento de su suscripción o durante su vigencia, con contratos de derechos de imagen, auspicios, patrocinios o acuerdos comerciales vinculados a su actividad deportiva, gestionados total o parcialmente por la Agencia. Las disposiciones del Artículo Décimo precedente no son aplicables a estas materias.\n\n11.2. Compensación a Todo Evento. En caso de terminación unilateral del Contrato por parte del Jugador conforme a lo establecido en el Artículo Noveno, y siempre que a la fecha de dicha terminación se encuentren vigentes uno o más contratos de imagen, auspicio o patrocinio gestionados por la Agencia, el Jugador deberá pagar a la Agencia, con independencia de cualquier otra compensación establecida en este instrumento, una suma fija equivalente a USD 150.000 (ciento cincuenta mil dólares de los Estados Unidos de América), o su equivalente en pesos chilenos al tipo de cambio oficial del Banco Central de Chile a la fecha de pago.\n\n11.3. Exigibilidad. El pago establecido en el artículo 11.2 será exigible dentro de los 30 días corridos siguientes a la fecha de término efectivo del Contrato, independientemente de si los contratos de imagen o auspicio continúan vigentes con posterioridad a dicha fecha.\n\n11.4. Independencia de Obligaciones. El pago de esta compensación no exime al Jugador de las comisiones devengadas y pendientes de pago generadas durante la vigencia del Contrato.\n\n11.5. No Acumulación. En ningún caso la suma total de compensaciones exigibles al Jugador bajo este artículo podrá exceder el valor de mercado del Jugador según su última valorización en Transfermarkt a la fecha de terminación, salvo acuerdo expreso entre las partes.'
  }] : []

  const numerosExtra = tieneDerechosImagen
    ? { jurisdiccion: 'DÉCIMO SEGUNDO', normativa: 'DÉCIMO TERCERO', domicilio: 'DÉCIMO CUARTO' }
    : { jurisdiccion: 'DÉCIMO PRIMERO', normativa: 'DÉCIMO SEGUNDO', domicilio: 'DÉCIMO TERCERO' }

  const articulos = [
    { titulo: 'PRIMERO: ANTECEDENTES DE LA SOCIEDAD.', texto: 'La Agencia presta los servicios de representación de Jugadores Profesionales de Fútbol, dedicándose de forma profesional al asesoramiento y representación de éstos, comprendiendo este servicio: a) La representación del Jugador ante su club y/o terceros clubes interesados en contar con los servicios de jugador profesional de fútbol; b) El asesoramiento y negociación de sus contratos profesionales como futbolista profesional y; c) El asesoramiento y negociación de sus contratos publicitarios o de imagen que celebre el Jugador con empresas publicitarias; y, d) En general, la defensa de los intereses profesionales del Jugador que contrate sus servicios.' },
    { titulo: 'SEGUNDO: OBJETO DEL CONTRATO.', texto: 'Por el presente Contrato, el Jugador contrata los servicios de la Agencia, quien, a través de su representante compareciente, acepta prestar sus servicios profesionales, siendo el cometido fundamental de los Agentes de Fútbol que de ella dependen, la promoción y renovación de contratos profesionales para el Jugador en su condición de jugador de fútbol profesional, así como también la promoción y renovación de contratos para el Jugador que tengan por objeto la explotación comercial de su imagen y/o cualquier otro acuerdo comercial en que se pueda ver involucrado a través de su carrera como jugador profesional de fútbol.' },
    { titulo: 'TERCERO: DURACIÓN.', texto: `El presente contrato de prestación de servicios tendrá una duración de ${duracionAnios || 2} años, a contar de la fecha del presente instrumento. Este plazo sólo podrá prorrogarse por medio de un nuevo contrato de representación.` },
    { titulo: 'CUARTO: EXCLUSIVIDAD, ÁMBITO TERRITORIAL Y RECONOCIMIENTO DE OPERACIONES.', texto: 'Los derechos del presente contrato y el encargo otorgado por el Jugador a la Sociedad, son absolutamente EXCLUSIVOS, de forma y manera que el Jugador encarga a la Sociedad la representación, defensa, negociación y renovación de sus contratos profesionales y de imagen, con un ámbito mundial y con exclusión de otras personas naturales o jurídicas en lo que diga relación con su profesión de jugador profesional de fútbol.\n\nPara el caso de incumplimiento del Jugador de la exclusividad otorgada a la Sociedad, esto es cuando terceros distintos de la Agencia intervengan, promuevan o celebren contratos en representación y beneficio del Jugador, éste acepta y se obliga expresamente a pagar a la Agencia una indemnización equivalente al 10% (diez por ciento) de la totalidad de las cantidades de dinero que perciba por la celebración de dichos contratos, sin perjuicio de la facultad de la Sociedad y su Representante de resolver el presente Contrato.' },
    { titulo: 'QUINTO: REMUNERACIÓN Y FORMA DE PAGO.', texto: 'Como consecuencia del presente Contrato de Representación y Prestación de Servicios, por la actividad de la Agencia en la negociación, suscripción y renovación de contratos profesionales para el Jugador, el Jugador se obliga a pagar a la Agencia el siguiente honorario:\n\na.- Cinco por ciento (5%) del sueldo bruto anual igual o inferior a 200.000 USD que perciba contractualmente el Jugador durante las temporadas deportivas que se desarrollen en Chile. Por las sumas superiores a los 200.000 USD pagará un honorario del tres por ciento (3%) del referido exceso.\n\nb.- Cinco por ciento (5%) del sueldo bruto anual igual o inferior a 200.000 USD del sueldo bruto anual que perciba contractualmente el Jugador durante las temporadas deportivas en el extranjero. Por las sumas superiores a los 200.000 USD pagará un honorario del tres por ciento (3%).\n\nAsimismo, el Jugador abonará a la Agencia un diez por ciento (10%) de las retribuciones que por contratos de imagen perciba durante toda la vigencia de dichos contratos.' },
    { titulo: 'SEXTO: FUNCIONES Y OBLIGACIONES DE LOS REPRESENTANTES.', texto: 'La Agencia realizará las actividades y gestiones comerciales necesarias para dar cumplimiento a los servicios contratados, prestando sus servicios de forma diligente y con lealtad. Actuará siempre en defensa de los intereses que se le confían y desarrollará sus actividades dentro de las normas e instrucciones que reciba del Jugador, guardando el buen nombre y prestigio de su representado en todas las actuaciones que realice.' },
    { titulo: 'SÉPTIMO: DECLARACIÓN.', texto: 'El Jugador, en este acto y por medio del presente instrumento declara expresamente no tener firmado ningún otro Contrato de Representación con otra Agencia o Agentes de Fútbol.' },
    { titulo: 'OCTAVO: OBLIGACIONES DEL JUGADOR.', texto: 'El Jugador asume las siguientes obligaciones:\n\n8.1. Exclusividad. Respetar estrictamente la exclusividad conferida a la Agencia, absteniéndose de contratar o negociar directamente o a través de terceros sin conocimiento y autorización expresa de la Agencia.\n\n8.2. Información. Informar oportunamente a la Agencia sobre cualquier oferta de contrato, negociación o propuesta que reciba de terceros.\n\n8.3. Diligencia. Actuar con la máxima diligencia y buena fe en el cumplimiento de sus compromisos deportivos.\n\n8.4. Cumplimiento de Compromisos. Respetar y cumplir cabalmente todos los contratos laborales y compromisos comerciales y deportivos que se celebren con la intermediación de la Agencia.' },
    { titulo: 'NOVENO: TERMINACIÓN DEL CONTRATO.', texto: `El presente Contrato terminará por: 9.1. Vencimiento del plazo establecido. 9.2. Acuerdo mutuo escrito entre las partes. 9.3. Incumplimiento grave de la Agencia, debidamente notificado y acreditado. 9.4. Incumplimiento grave del Jugador, en particular el incumplimiento de la obligación de exclusividad. 9.5. Terminación unilateral del Jugador, notificada por escrito con antelación mínima de 30 días, sujeta a compensación según Artículo Décimo${tieneDerechosImagen ? ' y Décimo Primero según corresponda' : ''}. 9.6. Fallecimiento del Jugador.` },
    art10,
    ...art11ImagenOpcional,
    { titulo: `${numerosExtra.jurisdiccion}: JURISDICCIÓN.`, texto: 'Las partes acuerdan someter cualquier controversia a la jurisdicción de la FIFA y de sus órganos con competencia en la materia, de acuerdo a lo establecido en el Reglamento Nacional de Agentes de Fútbol.' },
    { titulo: `${numerosExtra.normativa}: NORMATIVA APLICABLE.`, texto: 'Las partes se comprometen a respetar los estatutos, reglamentos, directivas y decisiones de los órganos competentes de la FIFA, así como aquellos de la ANFP y FFCH, además de las disposiciones legales de aplicación obligatoria. El Jugador y la Agencia declaran expresamente que no existen conflictos de intereses reales o potenciales a la fecha de la suscripción de este instrumento.' },
    { titulo: `${numerosExtra.domicilio}: LEGISLACIÓN APLICABLE Y DOMICILIO.`, texto: 'Las partes fijan, para todos los efectos legales y contractuales, su domicilio en la ciudad de Santiago, Región Metropolitana, Chile.\n\nEl presente Contrato de Prestación de Servicios de Representación se firma por cuadruplicado, quedando uno en poder del Jugador, y tres en poder de la Agencia, quien es la encargada de entregar las restantes copias a las entidades que legal y reglamentariamente correspondan.' },
  ]

  // ---- RENDER ----
  let y = 20
  doc.setFont('helvetica', 'normal')

  // Title
  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY)
  doc.text('CONTRATO DE REPRESENTACIÓN', 105, y, { align: 'center' })
  doc.text('Y PRESTACIÓN DE OTROS SERVICIOS', 105, y + 8, { align: 'center' })
  y += 20

  // Parties
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY)
  doc.text(nombreJugador, 105, y, { align: 'center' })
  y += 5
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY)
  doc.text('Y', 105, y, { align: 'center' })
  y += 5
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY)
  doc.text('NUEVA FÚTBOL CHILE SpA', 105, y, { align: 'center' })
  y += 10

  // Intro — justified
  doc.setFontSize(FONT_SIZE); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BLACK)
  y = drawJustified(doc, compareciente, X, y, W, LINE_H, checkPage, addPageFn)
  y += 4

  // Articles
  for (const art of articulos) {
    if (checkPage(y)) { addPageFn(); y = 20 }

    // Title
    doc.setFontSize(FONT_SIZE); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY)
    const titleLines = doc.splitTextToSize(art.titulo, W)
    titleLines.forEach(tl => {
      if (checkPage(y)) { addPageFn(); y = 20 }
      doc.text(tl, X, y)
      y += LINE_H
    })

    // Body — justified, paragraph by paragraph
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...BLACK)
    const paragraphs = art.texto.split('\n')
    for (const para of paragraphs) {
      if (!para.trim()) { y += 2; continue }
      if (checkPage(y)) { addPageFn(); y = 20 }
      y = drawJustified(doc, para, X, y, W, LINE_H, checkPage, addPageFn)
    }
    y += 4
  }

  // Signatures page
  addHeader(doc, page, 99, logoData)
  doc.addPage(); page++
  y = 30

  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY)
  doc.text('FIRMAS', 105, y, { align: 'center' })
  y += 15

  const sigBlocks = []
  if (esMenor && tutores && tutores.length > 0) {
    sigBlocks.push({ nombre: nombreJugador, rut: rutJugador, label: 'JUGADOR' })
    tutores.forEach(t => sigBlocks.push({ nombre: t.nombre.toUpperCase(), rut: t.rut, label: 'REPRESENTANTE LEGAL' }))
    sigBlocks.push({ nombre: 'ALDO CAMILO MALDONADO REBOLLEDO', rut: '10.370.416-2', label: 'NUEVA FÚTBOL CHILE SpA' })
  } else {
    sigBlocks.push({ nombre: nombreJugador, rut: rutJugador, label: 'JUGADOR' })
    sigBlocks.push({ nombre: 'ALDO CAMILO MALDONADO REBOLLEDO', rut: '10.370.416-2', label: 'NUEVA FÚTBOL CHILE SpA' })
  }

  const colW = W / 2
  let col = 0; let rowY = y
  sigBlocks.forEach((sig) => {
    const sigX = X + (col * colW)
    doc.setDrawColor(...NAVY); doc.setLineWidth(0.5)
    doc.line(sigX + 5, rowY + 25, sigX + colW - 10, rowY + 25)
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY)
    doc.text(sig.nombre, sigX + colW / 2, rowY + 30, { align: 'center', maxWidth: colW - 10 })
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY)
    doc.text(`Cédula de Identidad: ${sig.rut}`, sigX + colW / 2, rowY + 36, { align: 'center' })
    doc.text(sig.label, sigX + colW / 2, rowY + 41, { align: 'center' })
    col++
    if (col >= 2) { col = 0; rowY += 60 }
  })

  // Fix page numbers
  const totalPgs = doc.getNumberOfPages()
  for (let i = 1; i <= totalPgs; i++) {
    doc.setPage(i)
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 280, 210, 20, 'F')
    doc.rect(0, 0, 210, 15, 'F')
    addHeader(doc, i, totalPgs, logoData)
  }

  return doc
}
