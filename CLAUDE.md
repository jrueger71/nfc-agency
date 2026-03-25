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
- **URL:** https://qgjdphqmwgrkwfbxbyhc.supabase.co
- **Anon key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamRwaHFtd2dya3dmYnhieWhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTYzOTYsImV4cCI6MjA4NzUzMjM5Nn0.IIK7YBV8BKdkSEFPi4LrYRV7WBC_nZdEl-UtYIO65ps
- **Usuario admin:** jc.rueger@gmail.com

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
│   ├── supabase.js          # Cliente Supabase con persistSession
│   ├── generarContrato.js   # Generador PDF contrato (jsPDF)
│   └── generarAnexoA.js     # Generador PDF Anexo A (jsPDF)
├── components/
│   ├── Navbar.jsx           # Nav con hamburger mobile
│   ├── Cumpleanos.jsx       # Widget cumpleaños dashboard
│   ├── PlayerForm.jsx       # Form agregar/editar jugador
│   ├── ClubContractForm.jsx # Form contrato con club
│   ├── AgencyContractForm.jsx # Form contrato con agencia
│   ├── TransactionForm.jsx  # Form transacción financiera
│   └── MediaUploader.jsx    # Upload fotos/videos
├── pages/
│   ├── Landing.jsx          # Landing pública
│   ├── Login.jsx            # Login admin
│   ├── Dashboard.jsx        # Panel financiero admin
│   ├── PlayersAdmin.jsx     # Gestión plantel (tabs: jugadores/contratos/transacciones)
│   ├── PlayerDetail.jsx     # Ficha pública jugador
│   ├── Finanzas.jsx         # Gestión financiera (tabs: resumen/nueva/historial/anexo)
│   ├── Noticias.jsx         # Noticias e hitos (público + admin)
│   └── Documentos.jsx       # Generador PDF contratos y Anexo A
```

## Tablas Supabase
| Tabla | Descripción |
|-------|-------------|
| `players` | Datos básicos jugador (id, rut, name, birth_date, skill_foot, shoe_size, glove_size, height, weight, foto_url) |
| `players_full_info` | Vista completa jugador (JOIN de todas las tablas) |
| `club_info` | Contratos con clubes (salary, commission_%, transfermarkt_profile, transfermarkt_valuation) |
| `agency_contracts` | Contratos con la agencia (incorporation_date, contract_date, duration, pdf_url) |
| `transactions` | Movimientos financieros (type: income/expense, subtype, amount, moneda, documento_respaldo) |
| `player_financial_summary` | Vista resumen financiero por jugador |
| `player_media` | Fotos y videos (media_type: photo/video, url, display_order) |
| `contact_info` | Datos de contacto jugador |
| `user_roles` | Roles de usuario (admin/digitador/visor) |
| `noticias` | Noticias e hitos (tipo, jugador_id, visible, imagen_url, video_url) |
| `admin_users` | Usuarios administradores |

## Roles de usuario
- **admin** → acceso total
- **digitador** → puede registrar transacciones, no editar jugadores
- **visor** → solo lectura

## Categorías financieras
**Ingresos:**
- Comisión Sueldo (5% bruto anual ≤200K USD / 3% exceso)
- Comisión Traspaso
- Comisión Imagen / Marketing (10%)
- Comisión Otros

**Gastos (Anexo A):**
- Implementación Deportiva (Zapatos / Guantes / Equipamiento)
- Apoyo económico directo
- Vestuario / Indumentaria
- Accesorios deportivos
- Alimentación
- Gimnasio / Preparación física
- Arriendo / Alojamiento
- Traslados / Transporte
- Gestión legal
- Gestión comercial (Auspicio en especie)
- Pérdida patrimonial
- Gastos administrativos / Mantención / Otros

## Modelo de negocio clave
- El **Anexo A** documenta la inversión total en el jugador
- Se alimenta de las transacciones del sistema filtradas por jugador
- Es un instrumento legal ante cambios de representación
- El documento de respaldo (boleta/factura) es crítico para validar cada gasto

## Políticas RLS importantes
```sql
-- Todas las tablas tienen allow_all para autenticados
create policy "allow_all_X" on X for all using (true);
-- Noticias: público ve solo visible=true
create policy "public_read_noticias" on noticias for select using (visible = true);
-- Storage player-media: público puede leer
create policy "public_read_storage" on storage.objects for select using (bucket_id = 'player-media');
```

## Comandos frecuentes
```bash
# Correr localmente
cd /Volumes/Respaldos/Desarrollo/nfc-agency
npm run dev  # → http://localhost:5173

# Subir cambios (siempre archivos individuales, no src completo)
git add src/pages/Archivo.jsx
git commit -m "descripción"
git push
# Vercel redespliega automáticamente

# Instalar dependencias nuevas
npm install nombre-paquete
git add package.json package-lock.json
git commit -m "add nombre-paquete"
git push
```

## Lecciones aprendidas
- **NUNCA copiar src completo** — siempre reemplazar archivos individuales
- **NUNCA usar `echo "" > archivo`** — borra el contenido (usar `>>` para agregar)
- **NUNCA eliminar desde tabla `players`** — el cascade borra todo el historial
- El `.env` no se sube a GitHub — recrear manualmente con las credenciales de Supabase
- Vercel puede tener caché — forzar redeploy desde Deployments si los cambios no aparecen
- Las vistas de Supabase (players_full_info, player_financial_summary) no admiten políticas RLS
- jsPDF necesita `npm install` local y estar en `package.json`

## Pendientes al 25-03-2026
- [ ] Fotos de jugadores en grilla pública (fix RLS update players)
- [ ] Logo NFC en header de PDFs generados
- [ ] Recortador de imágenes (perfil circular + noticias rectangular)
- [ ] Exportar noticias/hitos a RRSS (Instagram, Facebook, Threads, X)
- [ ] Imagen hero landing con foto real de jugador en acción
- [ ] Vincular transacciones importadas a jugadores por RUT
- [ ] Generación de contratos con menores (tutor automático si birth_date < 18)
- [ ] Fecha incorporación agencia automática al renovar contrato
- [ ] Historial completo contratos por jugador en ficha
- [ ] Exportar Anexo A a Word (.docx) editable
