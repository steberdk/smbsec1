# smbsec1

SMB Security Quick-Check MVP  
Structured security baseline tool for small and medium businesses.

Production:
https://smbsec1.vercel.app

---

# 🧭 Project Status

Current state:

- ✅ Phase 1 – Technical foundation
- ✅ Checklist MVP (UI)
- ✅ Local persistence (localStorage)
- ✅ Supabase authentication
- ✅ Per-user checklist persistence (Supabase + RLS)
- ✅ CI (lint + build + Playwright)
- ✅ Protected `main` branch (PR workflow)

Next phase:
- Workspace/company model
- Role-based access
- Agent-driven automation layer

---

# 🏗 Architecture

## Frontend
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Playwright (E2E tests)

## Backend
- Supabase
  - Authentication (Email)
  - Postgres database
  - Row Level Security (RLS)

## API Layer
- Next.js Route Handlers (`app/api/*`)
  - `/api/health`
  - `/api/checklist`

## Deployment
- Vercel (Preview + Production)
- GitHub Actions (CI)

---

# 📂 Repository Structure

```
frontend/
  app/                # Next.js App Router
    api/              # Route handlers
  components/         # UI components
  lib/                # Business logic
  tests/              # Playwright E2E

backend/              # (Reserved for future backend services)

docs/                 # Architecture + planning

.github/workflows/    # CI
```

Important:
All Node/npm commands must be run inside:

```
frontend/
```

---

# 🖥 Development

## 🐳 Docker (Recommended)

From repository root:

```
docker compose up --build
```

App runs at:

```
http://localhost:3000
```

Stop:

```
Ctrl + C
docker compose down
```

---

## 💻 Native Development (Windows / macOS / Linux)

From repository root:

```
cd frontend
npm install
npm run dev
```

Open:

```
http://localhost:3000
```

---

# 🧪 Testing

From `frontend/`:

Lint:

```
npm run lint
```

Build:

```
npm run build
```

Playwright E2E:

```
npm run test:e2e
```

Definition of Done:

- Lint passes
- Build passes
- E2E passes
- CI green

---

# 🔐 Environment Variables

Create:

```
frontend/.env.local
```

Add:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Rules:

- Never commit secrets
- Never use Supabase `service_role` key in frontend
- Only use `NEXT_PUBLIC_SUPABASE_ANON_KEY`

In Vercel:
Project → Settings → Environment Variables

Set both variables for:
- Production
- Preview

If Vercel fails with:
"supabaseUrl is required"
→ Environment variables are missing in Vercel.

---

# 🔒 Database (Supabase)

Table:

```
public.user_checklists
```

Security model:
- Row Level Security enabled
- Users can only read/update their own row
- Uses JWT from Supabase session
- No service role key in frontend

---

# 🚀 Deployment Model

Production:
- Triggered automatically on merge to `main`

Preview:
- Triggered automatically per Pull Request

Branch Protection:
- PR required for `main`
- Status checks required
- Direct push blocked

---

# 🔀 Git Workflow

1. Create branch:

```
git checkout -b feat/feature-name
```

2. Commit
3. Push
4. Open PR
5. Wait for CI
6. Merge when green

Never push directly to `main`.

---

# 🤖 Agent Operating Rules

For AI agents and automated contributors:

- No secrets in repository
- No Supabase service_role key in frontend
- All changes must pass CI
- Prefer small PRs
- Do not introduce paid services
- Do not bypass RLS
- Keep architecture consistent
- Run lint + build before committing

All npm commands must run inside:

```
frontend/
```

---

# 🛠 Troubleshooting

If you see:

```
Could not read package.json
```

You are in the wrong directory.

Fix:

```
cd frontend
```

If Turbopack crashes on Windows:

```
npm run dev -- --turbo=false
```

---

# 📌 Roadmap

- Workspace/company model
- Multi-user organizations
- Role-based access
- AI agent orchestration layer
- Automated security analysis
- Report generation

---

Maintainer:
Solo mode (PR workflow enforced)
