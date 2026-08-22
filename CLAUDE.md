# Nueva Fútbol Chile SpA — Contexto del Proyecto

> **Nota de consolidación (22-ago-2026):** este documento fusiona dos versiones de CLAUDE.md que habían divergido — una traía documentado el módulo de Scouting y el manejo de nacionalidad/contact_info, la otra traía componentes y tablas más nuevos (Cumpleanos, ImageCropper, player_media, etc.) pero sin esas secciones. Jorge confirmó que Scouting sigue vigente en la app, solo faltaba documentarlo. Los puntos marcados **(verificar)** son detalles donde las dos versiones no coincidían del todo y conviene confirmarlos contra el código real la próxima vez que se toquen esos archivos. Según Jorge (22-ago-2026), el proyecto aún está en **estado de desarrollo** — pendiente confirmar cuánto tráfico público real recibe hoy la landing.
>
> **Nota (22-ago-2026, tarde):** esta copia del `CLAUDE.md` vive en el repo (`github.com/jrueger71/nfc-agency`) y se sincronizó a mano contra la versión canónica que se mantiene en el Proyecto de Claude — la del repo llevaba desde el 12-may-2026 sin actualizarse (antes de Scouting, nacionalidad dinámica, contact_info y el fix de seguridad). **La fuente de verdad sigue siendo el documento del Proyecto de Claude** — esta copia del repo es una instantánea para quien abra el código directamente en GitHub; si diverge de nuevo, diferenciar antes de asumir cuál es la vigente (ver Lecciones aprendidas).

## Descripción
Sistema web completo para agencia de representación de futbolistas profesionales.
Desarrollado en React + Vite, conectado a Supabase como backend.

## ✅ Seguridad — RESUELTO (22-ago-2026)
Al revisar el Table Editor se detectó que `player_financial_summary` y `players_full_info` corrían como **Security Definer** (bypasean RLS) y estaban marcadas "Unrestricted". Al conectar el proyecto correcto al conector de Supabase y correr `get_advisors`, se descubrió que el problema real era mucho más amplio: varias tablas tenían **dos políticas RLS superpuestas** — una vieja `allow_all_X` (`qual: true`, abierta a cualquiera, incluso sin login) y una más nueva `auth_all_X` (solo autenticados). Como las políticas RLS se combinan con OR, la vieja anulaba a la nueva. Tablas afectadas, **totalmente abiertas a internet sin login, incluyendo escritura/borrado**, antes del fix:
- `players` (incluía DELETE — un jugador podía ser borrado por cualquiera, cascade se lleva todo el historial)
- `transactions` (movimientos financieros)
- `contact_info` (dirección, teléfono, email de jugadores reales)
- `agency_contracts`, `club_info`
- `user_roles` — el más grave: cualquiera podía insertarse a sí mismo como `admin`

**Fix aplicado** (migración `fix_open_rls_policies_and_security_definer_views` vía `apply_migration`, con backup completo de las 20 tablas ya hecho antes):
- Se eliminaron todas las policies `allow_all_*` (qual `true`) de las tablas de arriba. Quedan protegidas solo para usuarios autenticados.
- `players` ganó una policy de lectura pública **acotada**: `players_public_landing_read` (`mostrar_en_landing = true`) — la landing pública sigue funcionando, pero ya no expone todo ni permite escribir.
- `user_roles` y `player_media` tenían su única policy de escritura en la versión abierta (sin respaldo `auth_all`) — se reemplazó por `auth_all_user_roles`/`auth_all_player_media` (solo autenticados), conservador para no romper la gestión de roles ni la subida de fotos. `player_media` mantiene su lectura pública existente (`public_read_player_media`) intacta.
- `ALTER VIEW ... SET (security_invoker = true)` en `player_financial_summary` y `players_full_info` — ya no bypasean RLS, respetan las políticas reales de las tablas que agregan.
- Verificado con `get_advisors`: los dos hallazgos ERROR (`security_definer_view`) desaparecieron.

**Pendiente de verificar por Jorge:** probar que el login/Dashboard, `Usuarios.jsx` (gestión de roles) y `MediaUploader.jsx` (subida de fotos) sigan funcionando normalmente para usuarios autenticados — el fix fue conservador pero no se probó en la app real todavía.

**Hallazgos menores que quedaron pendientes (no urgentes):**
- `admin_users` tiene RLS activado pero sin ninguna policy → deniega todo por defecto (seguro, no es una fuga). Sigue sin uso real (0 filas) — revisar si esta tabla se necesita o es remanente de algo viejo.
- Función `update_updated_at_column` sin `search_path` fijo (WARN de Supabase, buena práctica pendiente, no urgente).
- "Leaked Password Protection" desactivada en Auth (toggle en el dashboard de Supabase, no requiere SQL) — revisar si se quiere activar.

## Infraestructura y accesos (actualizado 22-ago-2026)
- El proyecto Supabase de NFC (`qgjdphqmwgrkwfbxbyhc`, nombre interno "Nueva Futbol Chile") **ya fue transferido** de la organización "Rueger.Org" a **"Contacto Org"** — la misma organización que usa el conector de Supabase de Claude para AIPatagonia. Confirmado con `list_projects`: mismo ref, mismo host de base de datos, mismas API keys — la transferencia de Supabase no migra datos, solo cambia el dueño/facturación. Desde ahora, Claude tiene acceso directo (`execute_sql`, `apply_migration`, `get_advisors`, etc.) a este proyecto sin pasos adicionales.
- Verificado antes de transferir: el proyecto NO tenía integración de GitHub ni de Vercel activada dentro de Supabase — no hubo bloqueos.
- **Vercel:** el proyecto original `nfc-agency` vive en la cuenta personal de Jorge (Hobby, sin Team). El conector de Vercel de Claude solo ve el team **AIPATAGONIA** (Hobby). Como workaround rápido se creó un segundo proyecto, `nfc-agency2`, importado directamente desde el mismo repo de GitHub hacia el team AIPATAGONIA — el conector ya lo ve. Es una copia de despliegue separada (dominio propio), apunta a la misma base de Supabase real. Sigue pendiente, sin resolver todavía, la transferencia real del proyecto original (`nfc-agency`) hacia un team compartido — requiere: mover el proyecto de la cuenta personal a un Team propio, activar un trial Pro de 14 días en el team destino (invitar miembros requiere Pro, no hay forma gratuita de invitar a un segundo miembro a un Team ya existente en Hobby), invitar la cuenta de NFC como miembro, y recién ahí ejecutar el Transfer Project real.
- **Backup de la base: LISTO Y COMPLETO (22-ago-2026).** Se intentó `pg_dump` desde la Mac de Jorge (Homebrew falla ahí — ver Dispositivo abajo) y desde el sandbox de Claude (bloqueado por red — solo permite HTTP/HTTPS saliente, no el puerto 5432 de Postgres, ni siquiera contra el pooler IPv4 de Supabase). Se resolvió con un backup manual: Jorge exportó vía Table Editor → Export → CSV las 17 tablas con datos; las 3 restantes (`admin_users`, `player_clauses`, `scouting_contacts`) están vacías (0 filas), nada que exportar ahí. 20/20 tablas cubiertas.
- **Dispositivo:** Jorge trabaja normalmente desde un PC (Windows). La Mac donde vivía el repo corre **macOS 10.15 Catalina** — demasiado antigua para Homebrew (compilación desde código fuente), la app de escritorio de Claude (pide macOS 13+) y las versiones actuales de VS Code (piden macOS 11+ desde la v1.98). Por eso el acceso a código real no pasa por el puente de dispositivo a esa Mac, sino por acceso directo de Claude al repositorio de GitHub (ver más abajo).
- **Acceso directo al repositorio (nuevo, 22-ago-2026):** Claude clona y trabaja directamente sobre `github.com/jrueger71/nfc-agency` usando un GitHub Personal Access Token (fine-grained, scope solo a este repo, permisos Contents: Read and write + Pull requests: Read and write). El flujo de entrega de código cambia respecto a lo anterior: en vez de pegar fragmentos o archivos sueltos en el chat, Claude puede crear una rama, comitear los cambios, y abrir un Pull Request para que Jorge revise el diff en GitHub antes de mergear a `main` (recomendado, dado que hay datos reales en producción). Push directo a `main` queda como opción solo para ajustes triviales una vez validado el flujo.
- El host de conexión directa de Supabase (`db.qgjdphqmwgrkwfbxbyhc.supabase.co`) resuelve **solo a IPv6** — para conexiones IPv4 (o desde entornos sin salida IPv6) hay que usar el "Session pooler" del panel Connect (`aws-1-us-east-2.pooler.supabase.com:5432`, usuario `postgres.qgjdphqmwgrkwfbxbyhc`).

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
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamRwaHFtd2dya3dmYnhieWhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTYzOTYsImV4cCI6MjA4NzUzMjM5Nn0.IIK7YBV8BKdkSEFPi4LrYRV7WBC_nZdEl-UtYIO65ps
VITE_API_FOOTBALL_KEY=41d36cb86fef5e5dd97c63edcfd04b80
```
- API Football: registrado en dashboard.api-football.com (NO vía RapidAPI)
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
│   ├── generarContrato.js         # PDF contrato — logo PNG, nacionalidad dinámica, fmtDate timezone fix
│   ├── generarAnexoA.js           # fmtDate timezone fix
│   ├── generarAutorizacion.js
│   ├── generarDocEspeciales.js
│   └── generarReporteCalzado.js   # PDF reporte calzado — shoe_orders + transactions
├── components/
│   ├── Navbar.jsx                 # + link Scouting (admin/agente/socio)
│   ├── Cumpleanos.jsx
│   ├── ImageCropper.jsx
│   ├── PlayerForm.jsx             # + nationality, contact_info (address, comuna, phone, email, instagram), gender, estado, stats_visible, stats_campos_publicos, api_football_id
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
│   ├── Documentos.jsx             # pasa nationality, gender, comuna real al generador — fmtDate fix
│   ├── RRSS.jsx                   # 10 plantillas, fotos múltiples (hasta 3), paletas por evento
│   ├── Scouting.jsx               # universo creciente, archivar, auditoría usuario, estado Libre
│   └── Usuarios.jsx
└── App.jsx                        # + ruta /admin/scouting
```

## Tablas Supabase (20/20 confirmadas contra el dashboard, 22-ago-2026)
| Tabla | Descripción |
|-------|-------------|
| `players` | id, rut, name, birth_date, nationality, skill_foot, shoe_size, glove_size, height, weight, foto_url, gender (M/F), estado, mostrar_en_landing, stats_visible, stats_campos_publicos, api_football_id. RLS: lectura pública solo si `mostrar_en_landing=true`, resto solo autenticados |
| `players_full_info` | Vista LATERAL JOIN doble: cc (Contrato/Renovación) + loan (Préstamo/Cesión activo) + contact_info. Ahora `security_invoker=true` — respeta RLS real de las tablas base |
| `club_contracts` | Historial: tipo, club_name (cedente en préstamo), club_destino (donde juega), position, fecha_inicio, fecha_fin, salary, commission_percentage, commission_fixed, transfermarkt_profile, transfermarkt_valuation, contract_pdf_url. RLS: solo autenticados (ya estaba bien) |
| `club_info` | **DEPRECATED** — migrado a club_contracts. RLS: solo autenticados |
| `agency_contracts` | Historial agencia: tipo (Contrato/Renovación). RLS: solo autenticados |
| `transactions` | Movimientos financieros (type income/expense, amount, moneda). RLS: solo autenticados |
| `contact_info` | id, player_id, address, comuna, phone, email, instagram. RLS: solo autenticados |
| `competitions` | nombre, año, pais, genero (M/F/Ambos), categoria (Profesional/Formativo/Amateur), activa. RLS: lectura pública intencional (dato no sensible) |
| `player_stats` | player_id, temporada, fecha, rival, competencia (texto completo ej: "Liga Segunda División 2026"), titular, minutos, goles, asistencias, tarjeta_amarilla, tarjeta_roja, fuente, api_fixture_id. RLS: patrón correcto ya existente — lectura pública solo si el jugador tiene `stats_visible=true` |
| `player_clauses` | player_id, tipo, competencia_aplica, minutos_minimos, umbral, monto_activacion, estado, fecha_activacion. **Vacía (0 filas) al 22-ago-2026.** RLS: solo autenticados |
| `player_financial_summary` | Vista (antes Security Definer, ahora `security_invoker=true`): player_id, player_name, total_income, total_expenses, balance — agrega `players` + `transactions` |
| `admin_users` | id, email, password_hash, created_at, last_login. RLS activado pero sin policies (deniega todo por defecto). **Vacía, sin uso real** — revisar si se necesita |
| `shoe_sizes` | Conversiones tallas UK→marca. RLS: lectura pública intencional |
| `shoe_orders` | Pedidos botines + transaction_id (FK → transactions). RLS: solo autenticados |
| `shoe_order_groups` | Agrupador de pedidos. RLS: solo autenticados |
| `player_media` | Fotos y videos. RLS: lectura pública, escritura solo autenticados |
| `user_roles` | user_id, email, role (admin/agente/socio/digitador/visor), nombre. RLS: solo autenticados (antes: cualquiera podía insertarse como admin — corregido) |
| `noticias` | Noticias e hitos. RLS: lectura pública solo si `visible=true`, resto autenticados |
| `scouting` | name, birth_date, edad_referencial, nationality, gender, position, club_name, fichado_fecha, contract_until, last_extension, contract_option, agente_actual, transfermarkt_profile, transfermarkt_valuation, estado, prioridad, telefono, email, notas, created_by, created_by_email, updated_by_email, updated_at. RLS: solo autenticados |
| `scouting_contacts` | scouting_id, fecha, tipo, descripcion, resultado. **Vacía (0 filas) al 22-ago-2026** — módulo de contactos aún sin uso, aunque `scouting` sí tiene 866 registros cargados. RLS: solo autenticados |

## Estados Scouting
- **Observación** — en radar, sin contacto
- **Contactado** — se inició conversación
- **Negociando** — interés concreto
- **Libre** — sin agencia, oportunidad activa
- **Incorporado** — pasó a ser representado
- **Archivado** — no activo por ahora, registro se mantiene (NUNCA se elimina)

(La columna `estado` en BD también acepta `Descartado`, sin documentar antes de hoy — revisar si se usa en la UI.)

## Filosofía Scouting — CRÍTICA
- El universo de jugadores SIEMPRE crece, NUNCA se elimina
- Archivar = ocultar de la lista activa, pero el registro persiste
- Jugadores archivados se pueden reactivar con botón ↩
- Contratos FIFA duran 2 años → un jugador con agencia hoy puede quedar libre mañana
- Auditoría: created_by_email y updated_by_email registran quién hizo cada acción

## Datos Scouting cargados
- 28 jugadores Santiago Wanderers (carga inicial)
- 838 jugadores Primera A y Primera B Chile 2026 (Planilla_Scouting_V2.xlsx)
- Import protegido con WHERE NOT EXISTS para evitar duplicados

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

**PENDIENTE:** Duplicados visibles en el selector — competencias con genero='Ambos' que se solapan con las específicas. Revisar y limpiar.

## Vista players_full_info — lógica préstamo/cesión
```sql
-- cc → último Contrato/Renovación activo
-- loan → último Préstamo/Cesión activo
-- loan_club_name = COALESCE(loan.club_destino, loan.club_name) → donde juega
-- loan_club_origen = loan.club_name → cedente
-- Landing: muestra loan_club_name + "cesión/préstamo de loan_club_origen"
-- En ClubContractForm: club_name = cedente, club_destino = donde juega
```

## REGLA CRÍTICA — Fechas y Timezone
**Las fechas se usan EXACTAMENTE como se ingresan. NUNCA ajustar por zona horaria.**
- Las fechas vienen como 'YYYY-MM-DD' desde Supabase
- La fecha que el usuario ingresa ES la fecha correcta, siempre
- Esta técnica NO cambia la fecha, solo evita que el parseo UTC la corra un día

```js
function fmtDate(d) {
  if (!d) return '—'
  const fecha = new Date(d.includes('T') ? d : d + 'T12:00:00')
  return fecha.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}
```

## Nacionalidad dinámica en contratos
```js
// generarContrato.js — función nacionalidadAdjetivo(nationality, gender)
// Convierte "Uruguay" → "uruguayo/a" según género del jugador
// Documentos.jsx debe pasar: nationality: player.nationality, gender: player.gender
// Y también: comuna: contactInfo?.comuna (NO hardcodeado 'Santiago')
```

## Historial de Contratos
- Al crear nuevo desde historial → `openNuevoClub()` / `openNuevoAgency()` heredan datos anteriores
- Se limpia: fechas, salario, comisiones, PDF
- Se mantiene: club, posición, TM, notas
- Préstamo/Cesión: `club_name` = cedente, `club_destino` = donde juega

## Módulo Pedidos de Botines
- Pedido múltiple, estado pendiente → entregado
- Vínculo factura por ítem — botón 📎, guarda transaction_id en shoe_orders
- Reporte PDF — shoe_orders entregados + transactions históricas
- Alerta Dashboard ≤30 días stock

## RRSS
**Generador de piezas (in-app):**
- 10 plantillas con paleta distinta por evento
- Fotos múltiples (hasta 3) desde galería del jugador
- Roadmap: fondos por club con Midjourney + foto recortada
- Pendiente: versión HTML standalone del generador

**Mensajes de prospección (fuera de la app):**
- Documento Word: NFC_Mensajes_Prospeccion_RRSS.docx
- Flujo DM: Mensaje inicial neutro → Si/No/No me interesa
- Norma FIFA: primer contacto NO menciona a Aldo, solo NFC SpA
- Si el jugador tiene agencia: NO preguntar sobre ella ni su contrato

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
- **NUNCA eliminar desde `scouting`** — el universo solo crece, usar Archivar
- **NUNCA hardcodear 'Santiago' como comuna** — leer de contactInfo?.comuna
- **NUNCA hardcodear 'chileno/a'** — usar nacionalidadAdjetivo()
- Edge Function se llama `clever-task` (no `crear-usuario`)
- Fotos perfil usan `profile_{timestamp}.jpg` para evitar cache
- `.env` no va a GitHub
- API Football: header es `x-apisports-key`
- fmtDate requiere `+ 'T12:00:00'` para timezone Chile (UTC-4) — NO cambia la fecha
- Competencias en player_stats se guardan como texto completo: "Liga Segunda División 2026"
- contact_info columnas: id, player_id, address, comuna, phone, email, instagram
- Al importar scouting: usar WHERE NOT EXISTS para evitar duplicados
- Al crear contrato nuevo → usar openNuevoClub()/openNuevoAgency() para heredar datos
- Archivos se entregan organizados: src/components/ y src/pages/
- Al recibir un CLAUDE.md nuevo o "actualizado", diferenciarlo contra el vigente antes de reemplazarlo — un archivo con menos líneas puede ser una rama de documentación distinta, no un resumen (pasó el 22-ago-2026, ver nota de consolidación arriba). Esto incluye la copia de este mismo archivo dentro del repo: puede quedar desactualizada respecto al Proyecto de Claude si no se sincroniza a mano.
- El host directo de Supabase (`db.xxx.supabase.co`) es IPv6-only; para pg_dump/herramientas IPv4 usar el Session Pooler del panel Connect
- El backup manual vía Table Editor → Export CSV cae por defecto en la carpeta Descargas del navegador, no deja elegir destino salvo que se cambie la config del navegador primero
- **RLS — revisar SIEMPRE que no queden políticas `allow_all_*`/`qual: true` conviviendo con políticas más estrictas** — en Postgres las policies se combinan con OR, así que una policy abierta anula a cualquier otra más restrictiva en la misma tabla. Este bug afectó a 6 tablas reales en producción (ver sección Seguridad arriba)
- Antes de tocar RLS en una tabla, correr `get_advisors` (type security) — detecta exactamente este tipo de problema
- Vercel: agregar un segundo miembro a un Team ya existente en plan Hobby no es gratis — requiere Pro (pago) o el trial de 14 días, y el trial solo se puede activar al crear un Team nuevo, no sobre uno existente
- VS Code actual (desde 1.98) ya no soporta macOS Catalina (10.15) — pide macOS 11+

## Pendientes
- [ ] Verificar en la app real (con Jorge) que el fix de RLS del 22-ago-2026 no rompió Usuarios.jsx (gestión de roles) ni MediaUploader.jsx (subida de fotos)
- [ ] Resolver transferencia real de Vercel (`nfc-agency` sigue en cuenta personal; `nfc-agency2` en AIPATAGONIA es solo una copia de despliegue, no la transferencia definitiva)
- [ ] Revisar `admin_users` (sin uso, sin policies) — definir si se necesita o se elimina
- [ ] Fix duplicados en selector de competencias (genero Ambos vs específico)
- [ ] Activar "Leaked Password Protection" en Auth (toggle en dashboard, no requiere SQL)
- [ ] Fijar `search_path` en la función `update_updated_at_column` (buena práctica, no urgente)
- [ ] Presentación PDF de la agencia (historia, misión, visión)
- [ ] Exportar Anexo A a Word (.docx)
- [ ] Limpieza fotos antiguas en Storage al cambiar foto perfil
- [ ] Imagen hero landing con foto real
- [ ] Plantillas RRSS con fondos por club (Midjourney) + foto recortada
- [ ] HTML standalone generador RRSS
- [ ] Upgrade API-Football plan Starter (2025-2026)
- [ ] Problema visual Dashboard: filas con "—" en contratos agencia
