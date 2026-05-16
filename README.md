# Jotaeme — Plataforma Inmobiliaria

Plataforma mobile-first para compradores de propiedades en Zona Sur GBA, Argentina.

## Stack

- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Hosting:** Vercel

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env.local
# (completar con tus credenciales)

# Correr en modo desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Documentación

- `CLAUDE.md` — Reglas técnicas y arquitectónicas
- `docs/PLAN_MAESTRO.md` — Documento estratégico completo
- `docs/PLAYBOOK_PROMPTS.md` — Prompts de construcción paso a paso
