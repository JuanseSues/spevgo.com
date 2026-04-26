# Spevgo

Plataforma web progresiva (PWA) para descubrimiento, gestión y participación en eventos deportivos en Antioquia, Colombia.

**Eslogan:** _"Tu próxima aventura deportiva te espera"_

---

## Stack tecnológico

- React 18 + Vite + TypeScript
- Tailwind CSS + diseño responsive
- React Router DOM v6
- TanStack Query (estado y cache)
- Framer Motion (animaciones)
- React Leaflet + OpenStreetMap (mapas)
- Recharts (dashboard admin)
- Lucide React (íconos)
- Sonner (toasts)
- `vite-plugin-pwa` (manifest + service worker)

---

## Estado del proyecto

Este proyecto está optimizado para **demo funcional rápida**:

- Funcionalidades completas en frontend
- Persistencia en `localStorage` (sin backend real aún)
- Estructura preparada para migrar a Supabase (`src/lib/supabase.ts` + repositorio)

> Importante: para producción multiusuario se recomienda migrar auth/datos a Supabase con RLS.

---

## Funcionalidades incluidas

- Home pública con filtros, mapa y secciones destacadas
- Detalle de evento con CTA de registro
- Registro a eventos gratis y pago simulado
- Ticket digital por inscripción
- Crear evento (estado `pending_review`)
- Mis Eventos (inscripciones + eventos organizados)
- Panel Admin (KPIs, gráficas, aprobación/rechazo)
- Favoritos de eventos
- Perfil de organizador
- Dark mode opcional
- PWA instalable

---

## Credenciales demo

### Usuario
- Email: `user@spevgo.co`
- Contraseña: `User123*`

### Administrador
- Email: `admin@spevgo.co`
- Contraseña: `Admin123*`

---

## Ejecución local

```bash
npm install
npm run dev
```

App local: `http://localhost:5173`

Build producción:

```bash
npm run build
```

Preview local de build:

```bash
npm run preview
```

---

## Deploy en Render (Static Site)

Proyecto listo para deploy rápido con `render.yaml`.

Configuración recomendada:

- **Tipo:** Static Site
- **Build Command:** `npm ci && npm run build`
- **Publish Directory:** `dist`
- **Branch:** `main`

Si usas rutas SPA, mantener rewrite a `index.html` (ya contemplado).

---

## Variables de entorno

Archivo de referencia:

```bash
.env.example
```

Valores opcionales (solo cuando conectes Supabase real):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Estructura principal

- `src/features/pages-v2.tsx` → páginas principales y UX
- `src/components/layout/AppShell.tsx` → layout global y navbar
- `src/hooks/useStore.ts` → estado global + sesión
- `src/lib/repository.ts` → capa de acceso a datos
- `src/lib/supabase.ts` → cliente Supabase (preparado)
- `src/types/domain.ts` → tipos de dominio

---

## Nota de demo

Esta versión está pensada para demostración funcional.  
Los datos creados por usuarios se almacenan en el navegador y pueden reiniciarse.
