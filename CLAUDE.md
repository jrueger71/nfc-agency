# Nueva Fútbol Chile SpA — Contexto del Proyecto

## Descripción
Sistema web completo para agencia de representación de futbolistas profesionales.
Desarrollado en React + Vite, conectado a Supabase como backend.

## Stack tecnológico
- **Frontend:** React 18 + Vite + React Router
- **Base de datos:** Supabase (PostgreSQL)
- **Hosting:** Vercel (dominio futuro: nuevafutbolspa.cl)
- **Repositorio:** github.com/jrueger71/nfc-agency
- **PDF:** jsPDF + jspdf-autotable
- **Gráficos:** Recharts

## Credenciales Supabase
- Ver archivo .env (no subido a GitHub)
- URL proyecto: qgjdphqmwgrkwfbxbyhc.supabase.co
- Usuario admin: jc.rueger@gmail.com

## Variables de entorno (.env)
```
VITE_SUPABASE_URL=https://qgjdphqmwgrkwfbxbyhc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_FOOTBALL_KEY=41d36cb86fef5e5dd97c63edcfd04b80
```
- API Football: registrado en dashboard.api-football.com (NO via RapidAPI)
- Endpoint: https://v3.football.api-sports.io/
- Header: x-apisports-key
- Plan gratuito: solo temporadas 2022-2024. Para 2025-2026 requiere plan Starter (~$9/mes)

## Identidad visual
- **Colores:** Azul marino #1B2B5E + Dorado #C9A84C
- **Tipografía:** Bebas Neue (títulos) + Barlow (cuerpo)
- **Logo:** logo_nfc_transparent.png en bucket player-media (PNG con fondo transparente)

## Equipo de la agencia
- **Aldo Maldonado** — Fundador · Agente FIFA · Licencia 202406-7288 · RUT 10.370.416-2 · Nac: 27-04-1978
- **Marcos González** — Socio · Scout · Nac: 09-06-1980
- **Jorge Rueger** — Asesor · Nac: 30-09-1971
- **Dirección:** Avda. Larraín 5682, Piso 13, La Reina, Santiago
- **Email:** aldo.maldonado@nuevafutbolspa.com
- **RUT empresa:** 77.971.556-6

## Estructura del proyecto
```
src/
├── lib/
│   ├── supabase.js
│   ├── generarContrato.js         # PDF contrato — logo PNG, fmtDate timezone fix
│   ├── generarAnexoA.js           # fmtDate timezone fix
│   ├── generarAutorizacion.js
│   ├── generarDocEspeciales.js
│   └── generarReporteCalzado.js   # PDF reporte calzado — shoe_orders + transactions
├── components/
│   ├── Navbar.jsx
│   ├── Cumpleanos.jsx
│   ├── ImageCropper.jsx
│   ├── PlayerForm.jsx             # + gender, estado, stats_visible, stats_campos_publicos, api_football_id
│   ├── PlayerStats.jsx            # Estadísticas + cláusulas + competencias dinámicas desde BD
│   ├── ClubContractForm.jsx       # → usa club_contracts, tipo (Contrato/Renovación/Préstamo/Cesión)
│   ├── AgencyContractForm.jsx     # + campo tipo (Contrato/Renovación)
│   ├── TransactionForm.jsx
│   ├── MediaUploader.jsx
│   └── DocsEspeciales.jsx
├── pages/
│   ├── Landing.jsx                # Filtra mostrar_en_landing, muestra préstamo/cesión correctamente
│   ├── Login.jsx
│   ├── Dashboard.jsx              # Alertas cláusulas, botines, resumen anual — fmtDate fix
│   ├── PlayersAdmin.jsx           # Historial contratos, pedidos, reporte PDF, ModalVincularFactura
│   ├── PlayerDetail.jsx           # Sección estadísticas — fmtDate fix
│   ├── Finanzas.jsx
│   ├── Noticias.jsx
│   ├── Documentos.jsx             # fmtDate fix
│   ├── RRSS.jsx                   # 10 plantillas, fotos múltiples, paletas por evento
│   └── Usuarios.jsx
```

## Tablas Supabase
| Tabla | Descripción |
|-------|-------------|
| `players` | id, rut, name, birth_date, skill_foot, shoe_size, glove_size, height, weight, foto_url, gender (M/F), estado, mostrar_en_landing, stats_visible, stats_campos_publicos, api_football_id |
| `players_full_info` | Vista LATERAL JOIN doble: cc (Contrato/Renovación) + loan (Préstamo/Cesión activo) |
| `club_contracts` | Historial: tipo, club_name (cedente en préstamo), club_destino (donde juega en préstamo), position, fecha_inicio, fecha_fin, salary, commission_%, transfermarkt_profile, transfermarkt_valuation, contract_pdf_url |
| `club_info` | DEPRECATED — migrado a club_contracts |
| `agency_contracts` | Historial agencia: tipo (Contrato/Renovación) |
| `transactions` | Movimientos financieros |
| `competitions` | **NUEVO** Competencias: nombre, año, pais, genero (M/F/Ambos), categoria (Profesional/Formativo/Amateur), activa |
| `player_stats` | Estadísticas: player_id, temporada, fecha, rival, competencia (texto completo ej: "Liga Segunda División 2026"), titular, minutos, goles, asistencias, tarjetas, fuente, api_fixture_id |
| `player_clauses` | Cláusulas: player_id, tipo, competencia_aplica, minutos_minimos, umbral, monto_activacion, estado |
| `shoe_sizes` | Conversiones tallas UK→marca |
| `shoe_orders` | Pedidos botines + transaction_id (FK → transactions) |
| `shoe_order_groups` | Agrupador de pedidos |
| `player_media` | Fotos y videos |
| `contact_info` | Datos contacto |
| `user_roles` | Roles: admin/agente/socio/digitador/visor |
| `noticias` | Noticias e hitos |

## Competencias en tabla competitions (2026)
- Liga de Primera Mercado Libre 2026 (M, Profesional)
- Liga de Ascenso Caixun 2026 (M, Profesional)
- Liga Segunda División 2026 (M, Profesional)
- Liga Femenina 2026 (F, Profesional)
- Copa de la Liga 2026 (Ambos, Profesional)
- Copa Chile 2026 (Ambos, Profesional)
- Fútbol Formativo Sub 20 2026 (Ambos, Formativo)
- Amistoso 2026 (Ambos, Profesional)
- Internacional 2026 (Ambos, Profesional)
- Copa Libertadores 2026 (Ambos, Profesional)
- Copa Sudamericana 2026 (Ambos, Profesional)
- Citación Selección 2026 (Ambos, Profesional)
- Liga de Naciones Femenina 2026 (F, Profesional)
- CONMEBOL Sub 17 Femenino 2026 (F, Formativo)
- CONMEBOL Sub 20 Femenino 2026 (F, Formativo)
- CONMEBOL Sub 17 2026 (M, Formativo)
- CONMEBOL Sub 20 2026 (M, Formativo)

**PENDIENTE:** Algunos duplicados visibles en el selector — algunas competencias tienen genero='Ambos' y otras específicas que se solapan. Revisar y limpiar.

## Vista players_full_info — lógica préstamo/cesión
```sql
-- loan_club_name = COALESCE(loan.club_destino, loan.club_name) → donde juega
-- loan_club_origen = loan.club_name → cedente
-- Landing: muestra loan_club_name + "cesión/préstamo de loan_club_origen"
-- En ClubContractForm: club_name = cedente, club_destino = donde juega
```

## Fix timezone fmtDate (aplicado en todos los archivos con fechas)
```js
function fmtDate(d) {
  if (!d) return '—'
  const fecha = new Date(d.includes('T') ? d : d + 'T12:00:00')
  return fecha.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}
```

## Módulo Pedidos de Botines
- Pedido múltiple, estado pendiente → entregado
- Vínculo factura por ítem — botón 📎, guarda transaction_id en shoe_orders
- Reporte PDF — shoe_orders entregados + transactions históricas zapatos/botines
- Alerta Dashboard ≤30 días stock

## Historial de Contratos
- Al crear nuevo desde historial → `openNuevoClub()` / `openNuevoAgency()` heredan datos anteriores
- Se limpia: fechas, salario, comisiones, PDF
- Se mantiene: club, posición, TM, notas

## RRSS — Generador
- 10 plantillas con paleta distinta por evento
- Fotos múltiples (hasta 3) desde galería del jugador
- Roadmap: fondos por club con Midjourney + foto recortada

## Edge Functions
- **clever-task** → `https://qgjdphqmwgrkwfbxbyhc.supabase.co/functions/v1/clever-task`

## Storage (bucket: player-media)
- Logo: `logo_nfc_transparent.png`
- Fotos perfil: `{player_id}/profile_{timestamp}.jpg`
- Contratos agencia: `contratos/{Tipo}_NFC_{Jugador}_{año}.pdf`
- Contratos club: `contratos/{Tipo}_Club_{Club}_{Jugador}_{año}.pdf`
- Fondos RRSS (pendiente): `rrss-backgrounds/{club_name}_bg.jpg`

## Lecciones aprendidas — CRÍTICAS
- **NUNCA copiar src completo** — siempre archivos individuales
- **NUNCA eliminar desde `players`** — cascade borra todo
- Edge Function se llama `clever-task` (no `crear-usuario`)
- Fotos perfil usan `profile_{timestamp}.jpg` para evitar cache
- `.env` no va a GitHub
- API Football: header es `x-apisports-key`
- Archivos se entregan organizados: src/components/ y src/pages/
- Al crear contrato nuevo → usar openNuevoClub/openNuevoAgency para heredar datos
- Préstamo/Cesión: club_name = cedente, club_destino = donde juega
- fmtDate requiere `+ 'T12:00:00'` para timezone Chile (UTC-4)
- Competencias en player_stats se guardan como texto completo: "Liga Segunda División 2026"

## Pendientes
- [ ] Fix duplicados en selector de competencias (genero Ambos vs específico)
- [ ] Exportar Anexo A a Word (.docx)
- [ ] Limpieza fotos antiguas en Storage al cambiar foto perfil
- [ ] Imagen hero landing con foto real
- [ ] Plantillas RRSS con fondos por club (Midjourney) + foto recortada
- [ ] HTML standalone generador RRSS
- [ ] Upgrade API-Football plan Starter (2025-2026)
- [ ] Problema visual Dashboard: filas con "—" en contratos agencia
