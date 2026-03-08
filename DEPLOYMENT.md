# Deployment Guide — Veterinary ERP SaaS

## Environment Architecture

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│   Dev        │     │   Staging     │     │  Production    │
│  (Local)     │────>│  (Render)     │────>│  (Render)      │
│              │     │               │     │                │
│ localhost    │     │ onrender.com  │     │ onrender.com   │
│ Neon (dev)   │     │ Neon (staging)│     │ Neon (prod)    │
│ Optional     │     │ Upstash       │     │ Upstash        │
│ Redis        │     │ Redis         │     │ Redis          │
│              │     │               │     │                │
│ feature/*    │     │ main branch   │     │ production     │
│ branches     │     │ auto-deploy   │     │ branch         │
└─────────────┘     └──────────────┘     └───────────────┘
```

## Deployment Flow

```
1. Developer pushes to feature/* branch
2. GitHub Actions runs:
   - Backend tests (unit + route)
   - Frontend tests (hooks + components)
   - TypeScript checks
3. PR merged to main
4. Auto-deploy to Staging (Render watches main branch)
5. Manual QA on Staging
6. Merge main → production branch
7. Auto-deploy to Production (Render watches production branch)
```

---

## Step 1: Neon PostgreSQL — 3 Projects

Go to https://console.neon.tech and create 3 separate projects:

| Project Name | Region | Purpose |
|-------------|--------|---------|
| `vetclinic-dev` | eu-central-1 (Frankfurt) | Local development |
| `vetclinic-staging` | eu-central-1 (Frankfurt) | Staging/QA |
| `vetclinic-prod` | eu-central-1 (Frankfurt) | Production |

**For each project:**

1. Copy the connection string (format: `postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`)
2. Run migrations:
   ```bash
   cd server
   DATABASE_URL="<connection_string>" npx drizzle-kit push
   ```
3. Run DPF seed:
   ```bash
   DATABASE_URL="<connection_string>" npx tsx src/db/seed/seedDPFStructure.ts
   ```

**Dev project:** Put the connection string in your local `.env` file as `DATABASE_URL`.

---

## Step 2: Upstash Redis — 2 Databases

Go to https://console.upstash.com and create 2 databases:

| Database Name | Region | Purpose |
|--------------|--------|---------|
| `vetclinic-staging` | eu-central-1 | Staging cache |
| `vetclinic-prod` | eu-central-1 | Production cache |

Copy the Redis URL for each (format: `redis://default:xxx@xxx.upstash.io:6379`).

> **Note:** Redis is optional for local dev — the app gracefully degrades to in-memory cache (L1 only).

---

## Step 3: Render — Blueprint Deploy

### Option A: Blueprint (Recommended)

1. Go to https://dashboard.render.com
2. Click **New** → **Blueprint**
3. Connect your GitHub repository
4. Render reads `render.yaml` and creates 4 services automatically:
   - `vetclinic-api-staging` (Node web service, main branch)
   - `vetclinic-app-staging` (Static site, main branch)
   - `vetclinic-api-production` (Node web service, production branch)
   - `vetclinic-app-production` (Static site, production branch)

### Option B: Manual Setup

Create each service manually following the specs in `render.yaml`.

### Environment Variables

After services are created, set these variables in the Render dashboard:

#### Staging Backend (`vetclinic-api-staging`)

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon **staging** connection string |
| `JWT_SECRET` | Generate: `openssl rand -base64 32` |
| `REDIS_URL` | Upstash **staging** Redis URL |
| `CLIENT_URL` | `https://vetclinic-app-staging.onrender.com` |
| `NODE_ENV` | `staging` (set in render.yaml) |
| `SERVER_PORT` | `5500` (set in render.yaml) |

#### Staging Frontend (`vetclinic-app-staging`)

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://vetclinic-api-staging.onrender.com` |

#### Production Backend (`vetclinic-api-production`)

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon **production** connection string |
| `JWT_SECRET` | Generate: `openssl rand -base64 32` (**different** from staging!) |
| `REDIS_URL` | Upstash **production** Redis URL |
| `CLIENT_URL` | `https://vetclinic-app-production.onrender.com` |
| `NODE_ENV` | `production` (set in render.yaml) |
| `SERVER_PORT` | `5500` (set in render.yaml) |

#### Production Frontend (`vetclinic-app-production`)

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://vetclinic-api-production.onrender.com` |

---

## Step 4: GitHub Actions Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret Name | Value | Used By |
|-------------|-------|---------|
| `DATABASE_URL_TEST` | Neon test DB connection string (or staging) | E2E tests in CI |
| `JWT_SECRET_TEST` | Any string 16+ chars (e.g., `ci-test-jwt-secret-32chars`) | E2E tests in CI |

---

## Step 5: Git Branch Setup

The `production` branch must exist for Render production auto-deploy:

```bash
git checkout -b production
git push -u origin production
git checkout main
```

**Promotion flow:**
```bash
# When staging is verified and ready for production:
git checkout production
git merge main
git push
git checkout main
```

---

## Verification Checklist

After completing all steps:

- [ ] **Neon:** 3 projects created (dev, staging, prod)
- [ ] **Neon:** Migrations applied to all 3 databases
- [ ] **Neon:** DPF seed run on all 3 databases
- [ ] **Upstash:** 2 Redis databases created (staging, prod)
- [ ] **Render:** 4 services visible in dashboard
- [ ] **Render:** All env vars set for each service
- [ ] **GitHub:** `DATABASE_URL_TEST` secret added
- [ ] **GitHub:** `JWT_SECRET_TEST` secret added
- [ ] **Git:** `production` branch exists on remote
- [ ] **Health check:** `https://vetclinic-api-staging.onrender.com/api/v1/health` returns 200
- [ ] **Frontend:** `https://vetclinic-app-staging.onrender.com` shows login page
- [ ] **CI/CD:** Push to main triggers GitHub Actions workflow

---

## Custom Domain (Optional)

To use custom domains instead of `*.onrender.com`:

1. In Render dashboard → service → **Settings** → **Custom Domains**
2. Add your domain (e.g., `api-staging.yourapp.com`)
3. Update DNS records as instructed by Render
4. Update `CLIENT_URL` and `VITE_API_URL` env vars to match

---

## Migration Strategy

**Rule: NEVER run migrations directly on production. Always test on staging first.**

```bash
# 1. Generate migration
cd server && npx drizzle-kit generate

# 2. Apply to dev (local)
npx drizzle-kit push

# 3. Test locally

# 4. Apply to staging
DATABASE_URL="<staging_connection_string>" npx drizzle-kit push

# 5. Test on staging

# 6. Apply to production
DATABASE_URL="<production_connection_string>" npx drizzle-kit push
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Render build fails | Check build logs → usually missing deps or TypeScript errors |
| Health check fails | Ensure `SERVER_PORT=5500` and `DATABASE_URL` is correct |
| Frontend shows blank page | Check `VITE_API_URL` points to correct backend URL |
| CORS errors | Ensure `CLIENT_URL` in backend matches frontend URL exactly |
| Redis connection refused | Check `REDIS_URL` format — app works without Redis (L1 cache fallback) |
| Free tier cold starts | Render free tier sleeps after 15min inactivity — first request takes ~30s |
