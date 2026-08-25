// Normaliza un RUT chileno a formato XX.XXX.XXX-X para mostrar/imprimir.
// Tolera RUTs guardados sin puntos o con formato distinto (ej. datos importados
// desde Excel) — no valida el dígito verificador, solo reformatea la apariencia.
// Solo aplica a jugadores chilenos: el número de identificación de un jugador
// extranjero (pasaporte, CPF, DNI, etc.) no sigue la convención de RUT chileno
// (dígitos + dígito verificador) y reformatearlo produce un resultado incorrecto.
// Ver CLAUDE.md — "Formato de RUT" (23-ago-2026, ajustado 25-ago-2026).
export function formatRut(rut, nationality) {
  if (!rut) return rut
  const esChileno = !nationality || String(nationality).trim().toLowerCase() === 'chile'
  if (!esChileno) return rut
  const clean = String(rut).replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length < 2) return rut
  const dv = clean.slice(-1)
  let num = clean.slice(0, -1).replace(/^0+/, '') || '0'
  let out = ''
  while (num.length > 3) {
    out = '.' + num.slice(-3) + out
    num = num.slice(0, -3)
  }
  return `${num}${out}-${dv}`
}
