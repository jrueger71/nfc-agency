# Nueva Fútbol Chile SpA — Agencia de Representación

Aplicación web React + Vite conectada a Supabase.

## Requisitos
- Node.js v18 o superior
- npm v9 o superior

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/jrueger71/nfc-agency.git
cd nfc-agency

# 2. Instalar dependencias
npm install

# 3. Crear archivo de variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# 4. Iniciar en modo desarrollo
npm run dev
```

Abre http://localhost:5173 en tu navegador.

## Variables de entorno (.env)

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## Estructura del proyecto

```
src/
├── lib/
│   └── supabase.js       # Cliente Supabase
├── components/
│   └── Navbar.jsx        # Navegación
├── pages/
│   ├── Landing.jsx       # Vista pública jugadores
│   ├── PlayerDetail.jsx  # Ficha individual
│   ├── Login.jsx         # Acceso admin
│   ├── Dashboard.jsx     # Panel financiero y contratos
│   └── PlayersAdmin.jsx  # Gestión del plantel
├── App.jsx               # Rutas y autenticación
├── main.jsx              # Entry point
└── index.css             # Estilos globales
```

## Tablas Supabase utilizadas
- `players` — datos básicos del jugador
- `players_full_info` — vista completa (vista, no tabla)
- `club_info` — contratos con clubes
- `agency_contracts` — contratos con la agencia
- `player_financial_summary` — resumen financiero (vista)
- `transactions` — movimientos de ingresos/gastos
- `player_media` — fotos e imágenes
- `contact_info` — datos de contacto

## Build para producción

```bash
npm run build
```

Los archivos quedan en `/dist` listos para subir a cualquier hosting.
