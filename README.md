# smbsec1

SMB Security Quick-Check MVP  
Structured security baseline tool for small and medium businesses.

---

# 🧭 Project Status

Current state:

- ✅ Phase 1 – Minimal tech foundation
- ✅ Checklist MVP (UI + local storage)
- ✅ CI (lint + build + Playwright)
- 🔄 Supabase authentication wiring in progress

Production:
https://smbsec1.vercel.app

Preview deployments:
Auto-created per Pull Request via Vercel.

---

# 🏗 Architecture

Frontend:
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Playwright (E2E tests)

Backend (planned):
- Supabase (Auth + Database)

Dev Environment:
- Docker (recommended)
- Native Node.js (supported)

CI/CD:
- GitHub Actions
- Vercel (Preview + Production)

---

# 📂 Repository Structure

frontend/
  app/                # Next.js routes
  components/         # UI components
  lib/                # Business logic
  tests/              # Playwright tests

backend/              # (Future backend logic)

docs/                 # Architecture + planning docs

.github/workflows/    # CI configuration

---

# 🖥 Development

## ✅ Recommended: Docker

From repository root:

docker compose up --build

App runs at:
http://localhost:3000

Stop:

Ctrl + C
docker compose down

---

## 💻 Native Development (Windows)

From repository root:

cd frontend
npm install
npm run dev

Important:
Always run npm commands inside `frontend/`, not in the repository root.

---

# 🧪 Testing

From `frontend/`:

Lint:

npm run lint

Build:

npm run build

Playwright E2E:

npm run test:e2e

All CI checks must pass before merging to `main`.

---

# 🔐 Environment Variables

Create:

frontend/.env.local

Add:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

Rules:
- Never commit secrets
- Never use Supabase service_role key in frontend
- Set the same variables in:
  Vercel → Project → Settings → Environment Variables
  (for Production + Preview)

If Vercel fails with:
"supabaseUrl is required"
→ Environment variables are missing in Vercel.

---

# 🚀 Deployment

Production:
- Triggered automatically on merge to `main`

Preview:
- Triggered automatically for each Pull Request

---

# 🔀 Git Workflow

1. Create branch:
   git checkout -b feat/feature-name

2. Commit changes
3. Push branch
4. Open Pull Request
5. Wait for CI (lint + build + tests)
6. Merge after checks pass

Branch protection:
- PR required
- Status checks required
- Approvals not required (solo maintainer setup)

---

# 🤖 Agent Operating Rules

For AI agents or automated contributors:

- No secrets in repository
- No Supabase service_role key in frontend
- All changes must pass CI
- Prefer small, scoped Pull Requests
- Propose plan before large refactors
- Do not introduce paid services
- Keep architecture consistent

Definition of Done:
- npm run lint passes
- npm run build passes
- npm run test:e2e passes
- CI green

---

# 🛠 Troubleshooting

If you accidentally run npm in repository root:

Error:
"Could not read package.json"

Fix:

cd frontend

If Next.js crashes with Turbopack errors on Windows:

npm run dev -- --turbo=false

---

# 📌 Next Steps

- Finish Supabase authentication wiring
- Replace localStorage checklist with database persistence
- Add company/workspace model
- Add role-based access (later phase)