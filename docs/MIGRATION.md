# Migración a nueva PC

> Este archivo es la guía completa para que un Claude en una PC nueva ayude a
> Tomy a reconstruir su entorno de desarrollo.
>
> **Fecha:** 17 de mayo de 2026.
> **Origen:** notebook personal con OneDrive.
> **Destino:** PC de escritorio de la oficina (máquina principal de ahora en
> adelante).
> **Plan a futuro:** acceso remoto desde la notebook vía SSH + Tailscale + VS
> Code Remote.

---

## 0. Pre-requisitos (manual, antes de hablar con Claude)

Tomy ya debería haber instalado en la PC nueva:

- **Git for Windows** — `https://git-scm.com/download/win`
- **Node.js 22.x LTS** — `https://nodejs.org`
- **Python 3.11+** — `https://python.org`
- **Claude Code** — Lo que use Tomy (CLI, desktop o VS Code extension)
- (Opcional pero recomendado) **GitHub CLI (gh)** — `winget install GitHub.cli`

Verificar:
```powershell
git --version
node --version
python --version
gh --version  # opcional
```

Si falta algo, instalarlo antes de continuar.

---

## 1. Estructura objetivo

Todos los proyectos van a vivir en `C:\dev\<nombre>\`. **NO en OneDrive** (ya
nos dio dolor de cabeza con Jotaeme — OneDrive sincroniza `.next` y rompe builds).

```
C:\dev\
├── jotaeme\
├── central-commander\
├── gordis\              (era "Gordis" en la notebook)
├── nmh-solution\        (era "PAGINA NMH")
├── nmh-traders\         (era "PAGINA VENTAS")
├── backtester\          (sin git remoto)
├── presentaciones-inmobiliarias\  (sin git remoto)
├── trading-analytics\   (sin git remoto)
└── game\                (sin git remoto)
```

---

## 2. Configurar Git + GitHub

```powershell
git config --global user.name "Tomy"
git config --global user.email "tomymartino54@gmail.com"
git config --global init.defaultBranch main
```

Autenticarse contra GitHub:

```powershell
# Si tenés gh CLI (recomendado):
gh auth login
# Seguir el flujo: GitHub.com → HTTPS → Browser

# Si no, Git va a abrir un browser cuando intentes pushear y autenticás ahí.
```

---

## 3. Proyectos con Git remoto — clonar

Crear `C:\dev\` y clonar:

```powershell
New-Item -ItemType Directory -Force -Path "C:\dev" | Out-Null
Set-Location "C:\dev"

git clone https://github.com/Tomito-co54/Jotaeme.git jotaeme
git clone https://github.com/Tomito-co54/central-commander.git
git clone https://github.com/Tomito-co54/Organizaci-n-Meli.git gordis
git clone https://github.com/gruponmh-source/NMHSolution.git nmh-solution
git clone https://github.com/Tomito-co54/nmh-traders.git
```

---

## 4. Proyectos sin Git remoto

Estos no tienen repo en GitHub todavía. Hay dos opciones para cada uno:

### Opción A — Crear repo en GitHub y subir (recomendado)

Para cada proyecto que en la notebook NO tiene `.git`:

```powershell
# 1. En la NOTEBOOK (origen), antes de migrar:
cd "<path al proyecto en la notebook>"
git init
# Crear/verificar .gitignore que excluya node_modules/, .env*, __pycache__/, etc.
git add .
git commit -m "chore: initial commit (pre-migration)"

# 2. Crear repo en GitHub con gh:
gh repo create <nombre> --private --source=. --remote=origin --push

# (O hacerlo manualmente: github.com/new → crear → seguir las instrucciones)
```

Después en la PC nueva, clonar normal como en la sección 3.

### Opción B — Copiar por OneDrive/USB

- Asegurarse que la carpeta está en OneDrive sincronizado.
- En la PC nueva, instalar OneDrive y descargar.
- **MOVER la carpeta de OneDrive a `C:\dev\`** después de bajarla.

Proyectos en esta categoría:
- **Backtester** (Python, vectorbt — trading backtester)
- **Presentaciones inmobiliarias** (Vite + React + Supabase — JM Inmobiliarios)
- **trading-analytics** (Vite + React + Express — dashboard EURUSD)
- **Game** (Vite, cityforge — juego en estadio temprano)

---

## 5. Archivos `.env` — transferir manualmente

**Ninguno de los `.env*` está en Git** (están gitignored, así debe ser). Hay
que transferirlos por separado.

### Métodos posibles (de mejor a peor)

1. **Tailscale + SSH/SCP**: cuando esté configurado, copiar de la notebook a la
   PC.
2. **Gestor de contraseñas** (1Password, Bitwarden): copiar valores y reconstruir.
3. **OneDrive temporal** (riesgoso): ponerlo en una carpeta sincronizada con
   `~$` o `.local` que esté gitignored. Borrar después.
4. **USB encriptado** (BitLocker).

### Qué necesita cada `.env`

#### `jotaeme/.env.local`

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://cjnaxxidigdylnwlpyab.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (público)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (sensible)
DATABASE_URL=postgresql://postgres.cjnaxxidigdylnwlpyab:<PASSWORD>@aws-1-sa-east-1.pooler.supabase.com:6543/postgres

# Mercado Pago
MERCADOPAGO_PUBLIC_KEY=
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://...@oXXX.ingest.us.sentry.io/...
SENTRY_DSN=(igual al de arriba)
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=

# Scraping
SCRAPER_USER_AGENT=JotaemeBot/1.0
SCRAPER_PROXY_URL=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
INTERNAL_API_KEY=
```

Los valores de Sentry y Supabase los podés ver en sus respectivos dashboards.
El `DATABASE_URL` password está solo en `Supabase → Settings → Database`.

#### Otros proyectos

Cada uno tiene su `.env` propio. Pedirle a Tomy que los pase.

---

## 6. Instalar dependencias y verificar cada proyecto

Para cada proyecto Node.js:
```powershell
Set-Location "C:\dev\<nombre>"
npm install
npm run build  # verifica que compila
```

Para cada proyecto Python:
```powershell
Set-Location "C:\dev\<nombre>"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Específicos por proyecto

#### jotaeme

```powershell
Set-Location "C:\dev\jotaeme"
npm install
# Playwright Chromium para los scrapers:
npx playwright install chromium
# Verificar que arranca:
npm run dev
```

Abrir `http://localhost:3000` y confirmar que carga.

#### central-commander, presentaciones-inmobiliarias, trading-analytics

Igual que jotaeme pero sin Playwright.

#### gordis (Flask)

```powershell
Set-Location "C:\dev\gordis"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Mirar el README o CLAUDE.md para saber cómo correrlo
```

#### Backtester (Python)

```powershell
Set-Location "C:\dev\backtester"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

---

## 7. Acceso remoto desde la notebook (Tailscale + SSH + VS Code)

### Paso 1 — Tailscale en ambas máquinas

- Instalar [Tailscale](https://tailscale.com/download) en notebook Y PC nueva.
- Login con la misma cuenta en ambas.
- Verificar que se ven mutuamente: `tailscale status` en cada una.

### Paso 2 — Habilitar SSH server en la PC nueva (Windows)

```powershell
# Abrir PowerShell como administrador
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Start-Service sshd
Set-Service -Name sshd -StartupType 'Automatic'
# Firewall:
Get-NetFirewallRule -Name *ssh*
```

### Paso 3 — Copiar la public key de la notebook a la PC

Desde la notebook:
```powershell
# Si no existe, generar:
ssh-keygen -t ed25519
# Copiar al destino (usar la IP Tailscale del destino, p.ej. 100.x.y.z):
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh tomit@<IP-tailscale-PC> "mkdir .ssh; cat >> .ssh\authorized_keys"
```

### Paso 4 — VS Code Remote SSH

- En la notebook: instalar la extensión "Remote - SSH" de Microsoft.
- F1 → "Remote-SSH: Connect to Host..." → agregar:
  ```
  Host pc-oficina
    HostName <IP-Tailscale-PC>
    User tomit
  ```
- Conectar. VS Code abre como si estuvieras en la PC.

---

## 8. Estado actual de Jotaeme — para retomar

Ver `CLAUDE.md` → sección "Current Progress" para el detalle.

**Resumen ultra rápido:**

- ✅ Bloque 1 completo (Auth, admin, deploy Vercel, Sentry, Analytics).
- ✅ B2.1 Zonaprop scraper (27 props reales).
- ✅ B2.1b Trezza scraper (27 props reales).
- ✅ B2.2 Deduplicación entre fuentes.
- 🔄 **B2.4 en curso** (geocoding OSM). Migration `00005_geocoding_cache` aplicada. Falta:
  - Cliente Nominatim
  - `geocodeAddress()` con cache 90d
  - `ensurePropertyCoordinates(id)`
  - CLI para geocodificar los 54 properties actuales
- ⬜ B2.3 ARBA (después de B2.4 porque necesita coords).
- ⬜ B2.5 Vercel Cron.
- ⬜ B2.6 History helpers.

**Cuando retomes en la PC nueva, decile al nuevo Claude:**

> *"Seguimos con B2.4 — geocoding OSM. La migration ya está aplicada en
> Supabase, falta el cliente Nominatim y la función `ensurePropertyCoordinates`.
> Leé el `CLAUDE.md` para el contexto completo."*

---

## 9. Checklist final de verificación

Marcar cuando esté hecho:

- [ ] Git + Node + Python instalados en PC nueva
- [ ] `gh auth login` exitoso
- [ ] Todos los repos clonados en `C:\dev\`
- [ ] Todos los `.env*` copiados desde la notebook
- [ ] `npm install` corrido en cada proyecto Node
- [ ] `pip install -r requirements.txt` corrido en cada proyecto Python
- [ ] `playwright install chromium` corrido (solo para jotaeme)
- [ ] `npm run dev` arranca jotaeme sin errores
- [ ] Tailscale instalado en ambas máquinas
- [ ] SSH server activo en la PC nueva
- [ ] VS Code Remote SSH conecta desde la notebook

---

*Documento generado automáticamente desde la conversación de migración.
Si algo cambió desde entonces, actualizar.*
