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

## Identidad visual
- **Colores:** Azul marino #1B2B5E + Dorado #C9A84C
- **Tipografía:** Bebas Neue (títulos) + Barlow (cuerpo)
- **Logo:** Supabase Storage → player-media/logo_nfc.JPG

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
│   ├── supabase.js              # Cliente Supabase con persistSession
│   ├── generarContrato.js       # PDF contrato representación (con Art.11 opcional)
│   ├── generarAnexoA.js         # PDF Anexo A
│   ├── generarAutorizacion.js   # PDF Autorización exclusiva + Poder especial
│   └── generarDocEspeciales.js  # PDF Nómina jugadores + Declaración conflicto interés
├── components/
│   ├── Navbar.jsx
│   ├── Cumpleanos.jsx
│   ├── ImageCropper.jsx         # Recortador rect 3/4 (perfil) y 16/9 (noticias)
│   ├── PlayerForm.jsx
│   ├── ClubContractForm.jsx     # Con upload PDF
│   ├── AgencyContractForm.jsx   # Con upload PDF
│   ├── TransactionForm.jsx
│   ├── MediaUploader.jsx
│   └── DocsEspeciales.jsx       # 3 sub-pestañas: Autorización/Poder, Nómina, Declaración
├── pages/
│   ├── Landing.jsx              # Cards 3/4 con foto
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── PlayersAdmin.jsx         # 4 tabs: Plantel, Contratos, Transacciones, Docs Especiales
│   ├── PlayerDetail.jsx         # Ficha pública sin datos sensibles
│   ├── Finanzas.jsx
│   ├── Noticias.jsx
│   ├── Documentos.jsx           # Contrato + Anexo A + Contrato Tipo
│   └── RRSS.jsx                 # Generador plantillas redes sociales
```

## Tablas Supabase
| Tabla | Descripción |
|-------|-------------|
| `players` | id, rut, name, birth_date, skill_foot, shoe_size, glove_size, height, weight, foto_url, gender (M/F), **estado** (Activo/Cadete/Libre) |
| `players_full_info` | Vista completa jugador |
| `club_info` | Contratos clubes (salary, commission_%, transfermarkt_profile, transfermarkt_valuation, contract_pdf_url) |
| `agency_contracts` | Contratos agencia (incorporation_date, contract_date, duration, contract_pdf_url) |
| `transactions` | Movimientos financieros (type, subtype, amount, moneda, documento_respaldo) |
| `player_financial_summary` | Vista resumen financiero |
| `player_media` | Fotos y videos (media_type, url, display_order) |
| `contact_info` | Datos contacto jugador |
| `user_roles` | Roles (admin/digitador/visor) |
| `noticias` | Noticias e hitos (tipo, jugador_id, visible, imagen_url, video_url) |
| `admin_users` | Usuarios administradores |

## Columnas importantes agregadas
- `players.gender` — text, default 'M' (agregado 18-04-2026)
- `players.estado` — text, default 'Activo' — valores: Activo / Cadete / Libre (agregado 23-04-2026)
- `club_info.contract_pdf_url` — text
- `agency_contracts.contract_pdf_url` — text

## Storage Supabase (bucket: player-media)
- Fotos perfil jugador: `{player_id}/profile_{timestamp}.jpg` ← timestamp para evitar cache
- Contratos agencia: `contratos/Contrato_NFC_{Jugador}_{año}.pdf`
- Contratos club: `contratos/Contrato_Club_{Club}_{Jugador}_{año}.pdf`
- Fotos noticias: `noticias/noticia_{timestamp}.jpg`
- Logo: `player-media/logo_nfc.JPG`

## Políticas RLS Storage relevantes
```sql
-- UPDATE necesaria para reemplazar fotos
create policy "allow_update_storage" on storage.objects
for update using (bucket_id = 'player-media')
with check (bucket_id = 'player-media');
```

## Generador de contratos PDF
- Párrafos justificados
- Art. 10: compensación Anexo A (default)
- Art. 11 (opcional): compensación fija USD 150.000 para jugadores con derechos de imagen
- Arts. 10 y 11 son excluyentes
- Contrato Tipo disponible desde cualquier página de Documentos

## Docs Especiales (PlayersAdmin tab 4)
3 sub-pestañas:
1. **Autorización / Poder** — Autorización Exclusiva de Gestión + Poder Especial (dos botones)
   - Agente externo con nombre y licencia FIFA
   - Jugadores desde BD con club actual automático
   - Clubes/ligas opcionales
   - Comisión configurable o sin comisión
   - Vigencia con cláusula exoneración (Poder Especial)
2. **Nómina de Jugadores** — PDF con tabla de jugadores representados
   - Selección manual con checkboxes (todos seleccionados por defecto)
   - Selector de columnas: RUT, Posición, Club, Estado (para entregar solo lo necesario)
   - Estado editable por jugador en el momento (sin afectar BD)
   - Colores: Activo=verde, Cadete=dorado, Libre=gris
3. **Declaración Conflicto de Interés** — Declaración jurada FIFA/AFUCH
   - Sugerencias predefinidas para "exigida por"
   - 6 declaraciones estándar + campo para agregar adicionales
   - Espacio para timbre notaría

## Generador RRSS (src/pages/RRSS.jsx)
- 5 plantillas: Bienvenida, Cumpleaños, 1er Contrato, 1er Gol, Renovación
- Formatos: 1:1 Feed y 9:16 Story
- Carga jugador desde BD (foto + nombre + club + gender)
- Género M/F adapta "Bienvenido/a", "representado/a", tag del documento
- Diseño: foto 3/4 con fade, texto anclado abajo, identidad NFC
- Descarga PNG 1080px

## Comandos frecuentes
```bash
# Local
cd /Volumes/Respaldos/Desarrollo/nfc-agency
npm run dev  # → http://localhost:5173

# Deploy — SIEMPRE archivos individuales
git add src/pages/Archivo.jsx
git commit -m "descripción"
git push
```

## Lecciones aprendidas — CRÍTICAS
- **NUNCA copiar src completo** — siempre archivos individuales
- **NUNCA `echo "" > archivo`** — borra contenido
- **NUNCA eliminar desde `players`** — cascade borra todo
- **NUNCA eliminar desde `club_info` sin verificar** — pueden ser duplicados legítimos
- `.env` no va a GitHub
- Fotos perfil usan `profile_{timestamp}.jpg` para evitar cache de Storage
- La vista `players_full_info` genera duplicados si un jugador tiene 2 agency_contracts
- Las vistas Supabase no admiten RLS
- `src/main.jsx` es el punto de entrada — si se borra el build falla

## Pendientes al 23-04-2026
- [ ] Fix tag RRSS: "NUEVO REPRESENTADA" → "NUEVA REPRESENTADA" (género femenino)
- [ ] Logo NFC en header de PDFs generados
- [ ] Plantillas RRSS con diseños distintos por evento
- [ ] Imagen hero landing con foto real
- [ ] Exportar Anexo A a Word (.docx)
- [ ] Historial contratos por jugador en ficha admin
- [ ] HTML standalone generador RRSS
- [ ] Vincular transacciones importadas por RUT
- [ ] Campo `estado` (Activo/Cadete/Libre) en PlayerForm para editar desde app
- [ ] Limpieza fotos antiguas en Storage al cambiar foto perfil
