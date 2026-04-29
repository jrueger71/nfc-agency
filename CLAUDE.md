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
│   ├── generarContrato.js       # PDF contrato representación
│   ├── generarAnexoA.js
│   ├── generarAutorizacion.js
│   └── generarDocEspeciales.js
├── components/
│   ├── Navbar.jsx               # Logo PNG transparente desde Storage
│   ├── Cumpleanos.jsx
│   ├── ImageCropper.jsx
│   ├── PlayerForm.jsx           # + gender, estado, stats_visible, stats_campos_publicos, api_football_id
│   ├── PlayerStats.jsx          # NUEVO: estadísticas + cláusulas + API-Football sync
│   ├── ClubContractForm.jsx     # → usa club_contracts (historial)
│   ├── AgencyContractForm.jsx   # + campo tipo (Contrato/Renovación)
│   ├── TransactionForm.jsx
│   ├── MediaUploader.jsx
│   └── DocsEspeciales.jsx
├── pages/
│   ├── Landing.jsx              # Filtra por mostrar_en_landing=true
│   ├── Login.jsx
│   ├── Dashboard.jsx            # + alertas cláusulas, alertas botines, resumen anual botines
│   ├── PlayersAdmin.jsx         # + tab Pedidos, historial contratos colapsable por jugador
│   ├── PlayerDetail.jsx         # + sección Estadísticas (con/sin login)
│   ├── Finanzas.jsx
│   ├── Noticias.jsx
│   ├── Documentos.jsx           # Logo PNG en PDFs
│   ├── RRSS.jsx
│   └── Usuarios.jsx
```

## Tablas Supabase
| Tabla | Descripción |
|-------|-------------|
| `players` | id, rut, name, birth_date, skill_foot, shoe_size, glove_size, height, weight, foto_url, gender (M/F), estado (Activo/Cadete/Libre), mostrar_en_landing, stats_visible, stats_campos_publicos (text[]), api_football_id |
| `players_full_info` | Vista completa — usa club_contracts (LATERAL JOIN último activo) |
| `club_contracts` | **NUEVO** Historial contratos club: tipo (Contrato/Renovación/Préstamo/Cesión), club_name, club_destino, position, fecha_inicio, fecha_fin, salary, commission_%, contract_pdf_url |
| `club_info` | **DEPRECATED** — datos migrados a club_contracts. Mantener por ahora |
| `agency_contracts` | Historial contratos agencia: + campo tipo (Contrato/Renovación) |
| `transactions` | Movimientos financieros |
| `player_financial_summary` | Vista resumen financiero |
| `player_media` | Fotos y videos |
| `contact_info` | Datos contacto jugador |
| `user_roles` | id, user_id, email, nombre, role (admin/agente/socio/digitador/visor) |
| `noticias` | Noticias e hitos |
| `shoe_sizes` | Conversiones tallas UK→marca: marca, uk, us, eu, cms |
| `shoe_orders` | Pedidos botines: group_id, player_id, marca, uk, us, eu, modelo, suela (FG/SG), categoria (Elite/Pro), pares, fecha_pedido, estado (pendiente/entregado), fecha_entrega |
| `shoe_order_groups` | Agrupador de pedidos múltiples: fecha_pedido, notas |
| `player_stats` | Estadísticas por partido: player_id, temporada, fecha, rival, competencia, titular, minutos, goles, asistencias, tarjetas, fuente (manual/api), api_fixture_id |
| `player_clauses` | Cláusulas rendimiento: player_id, tipo (partidos/minutos/goles/asistencias), competencia_aplica, minutos_minimos, umbral, monto_activacion, estado (pendiente/activada/pagada) |

## Roles de usuario
| Rol | Perfil | Permisos |
|-----|--------|----------|
| admin | Jorge Rueger | Acceso total |
| agente | Aldo Maldonado | Crear/editar jugadores, contratos, transacciones, docs, RRSS |
| socio | Marcos González | Crear/editar jugadores, docs, ver finanzas |
| digitador | Staff eventual | Solo transacciones y subir documentos |
| visor | Externo/auditor | Solo lectura |

## Edge Functions Supabase
- **clever-task** (nombre real) → crear usuario en Auth + asignar rol
  - URL: `https://qgjdphqmwgrkwfbxbyhc.supabase.co/functions/v1/clever-task`
  - En Usuarios.jsx usar esta URL (no "crear-usuario")

## Storage Supabase (bucket: player-media)
- Logo: `logo_nfc_transparent.png` (PNG fondo transparente)
- Fotos perfil: `{player_id}/profile_{timestamp}.jpg`
- Contratos agencia: `contratos/{Tipo}_NFC_{Jugador}_{año}.pdf`
- Contratos club: `contratos/{Tipo}_Club_{Club}_{Jugador}_{año}.pdf`
- Fotos noticias: `noticias/noticia_{timestamp}.jpg`

## Módulo de Estadísticas
- **PlayerStats.jsx** — componente usado en PlayerDetail
- Con login: tabla completa (partidos, minutos, goles, asistencias, tarjetas, fuente)
- Sin login: solo campos definidos en `stats_campos_publicos` del jugador
- Cláusulas: progreso automático, alerta al 75%+, activación automática al alcanzar umbral
- API-Football: botón sync en ficha, requiere `api_football_id` en players
- Plan gratuito solo cubre hasta temporada 2024

## Módulo de Pedidos de Botines
- Pedido múltiple (varios jugadores por compra)
- Estado: pendiente → entregado (con fecha)
- Conversión automática UK → US/EU por marca al seleccionar jugador
- Alerta en Dashboard cuando quedan ≤30 días de botines (2 meses por par)
- Resumen anual en Dashboard: Elite vs Pro por jugador

## Historial de Contratos
- **Club:** tabla `club_contracts` con tipos Contrato/Renovación/Préstamo/Cesión
- **Agencia:** tabla `agency_contracts` con tipos Contrato/Renovación
- Vista colapsable por jugador en tab Contratos de PlayersAdmin
- `club_info` deprecated pero mantenida temporalmente

## Generador PDFs
- Logo: `logo_nfc_transparent.png` — usar formato PNG en addImage
- URL logo: `https://qgjdphqmwgrkwfbxbyhc.supabase.co/storage/v1/object/public/player-media/logo_nfc_transparent.png`
- Contratos: Art.10 o Art.11 según si tiene derechos de imagen

## Lecciones aprendidas — CRÍTICAS
- **NUNCA copiar src completo** — siempre archivos individuales
- **NUNCA eliminar desde `players`** — cascade borra todo
- La vista `players_full_info` usa LATERAL JOIN para traer último contrato activo de `club_contracts`
- Edge Function se llama `clever-task` en Supabase (no `crear-usuario`)
- Fotos perfil usan `profile_{timestamp}.jpg` para evitar cache
- `.env` no va a GitHub
- API Football: header es `x-apisports-key` (no x-rapidapi-key)
- Archivos se entregan organizados por carpeta: src/components/ y src/pages/

## Pendientes al 29-04-2026
- [ ] Campo `estado` en PlayerForm para editar desde la app ✅ YA INCLUIDO
- [ ] Logo NFC en header de PDFs ✅ RESUELTO
- [ ] Exportar Anexo A a Word (.docx)
- [ ] Limpieza fotos antiguas en Storage al cambiar foto perfil
- [ ] Imagen hero landing con foto real
- [ ] Plantillas RRSS con diseños distintos por evento
- [ ] HTML standalone generador RRSS
- [ ] Upgrade API-Football a plan Starter para temporadas 2025-2026
- [ ] Verificar funcionamiento historial contratos tras deploy