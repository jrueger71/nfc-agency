// Normaliza un RUT chileno a formato XX.XXX.XXX-X para mostrar/imprimir.
// Tolera RUTs guardados sin puntos o con formato distinto (ej. datos importados
// desde Excel) — no valida el dígito verificador, solo reformatea la apariencia.
// Ver CLAUDE.md — "Formato de RUT" (23-ago-2026).
export function formatRut(rut) {
  if (!rut) return rut
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
