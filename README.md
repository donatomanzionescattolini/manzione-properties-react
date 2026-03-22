# Manzione Properties – Property Management Portal

A full-featured property management web app built with **React + Vite + TypeScript + Tailwind CSS**.  
Admin and tenant portals, payments, maintenance tracking, documents, escrow, and reporting.

---

## Table of Contents

1. [Local Development (Demo Mode)](#1-local-development-demo-mode)
2. [Production Setup](#2-production-setup)
   - [Step 1 – Supabase (Auth + Database + Storage)](#step-1--supabase-auth--database--storage)
   - [Step 2 – Stripe (Real Payments)](#step-2--stripe-real-payments)
   - [Step 3 – Vercel (Hosting)](#step-3--vercel-hosting)
   - [Step 4 – Custom Domain](#step-4--custom-domain)
3. [Environment Variables](#3-environment-variables)
4. [Architecture Overview](#4-architecture-overview)
5. [Remaining Manual Steps](#5-remaining-manual-steps)

---

## 1. Local Development (Demo Mode)

```bash
npm install
cp .env.example .env.local
# Edit .env.local: set VITE_DEMO_MODE=true (leave Supabase vars blank for local mode)
npm run dev
```

The app runs fully offline in **demo mode** using in-memory Zustand state and seed data.  
Demo credentials (shown on the login page only when `VITE_DEMO_MODE=true`):

| Role   | Email                    | Password  |
|--------|--------------------------|-----------|
| Admin  | admin@manzione.com       | admin123  |
| Tenant | john@example.com         | tenant123 |

> ⚠️  **These credentials are never shown in production** (when `VITE_DEMO_MODE` is absent or `false`).

---

## 2. Production Setup

### Step 1 – Supabase (Auth + Database + Storage)

1. **Create a free Supabase project** at <https://supabase.com/dashboard>.

2. **Run the database migration** — paste the contents of  
   `supabase/migrations/001_initial_schema.sql`  
   into **Supabase Dashboard → SQL Editor → New query** and click **Run**.

3. **Create the Storage bucket** for documents:
   - Go to **Storage → New bucket**.
   - Name: `documents`, toggle **Private** (not public).
   - Uncomment the storage RLS policies at the bottom of the migration file and run them.

4. **Configure Auth** in Supabase Dashboard → Authentication:
   - Set **Site URL** to your Vercel domain (e.g. `https://manzione-properties.vercel.app`).
   - Add the same URL to **Redirect URLs**.
   - Enable **Email** provider and configure SMTP (or use Supabase's built-in email for low volume).
   - Optionally enable **Password strength** and **MFA**.

5. **Create the first admin user**:
   - Go to **Authentication → Users → Invite user** (or **Add user**).
   - After the user signs up, run this SQL to promote them to admin:
     ```sql
     update profiles set role = 'admin' where email = 'your@email.com';
     ```

6. Copy your project URL and anon key from  
   **Settings → API → Project URL / Project API keys (anon/public)**.

---

### Step 2 – Stripe (Real Payments)

> **Note:** Stripe integration requires backend API routes to create Payment Intents server-side (never from the browser with your secret key). This frontend is wired up to accept a Stripe publishable key and show a payment form, but you will need a small backend (a Vercel Edge Function or Supabase Edge Function) to complete the Stripe flow.

1. **Create a Stripe account** at <https://stripe.com>.
2. Complete **business verification** in Stripe Dashboard.
3. Copy your **Publishable key** (starts with `pk_live_...`) from **Developers → API keys**.
4. Add it as `VITE_STRIPE_PUBLISHABLE_KEY` in your Vercel environment variables.
5. Create a Vercel/Supabase Edge Function that:
   - Receives amount + tenant/payment metadata
   - Creates a `PaymentIntent` using your Stripe **secret key** (stored only server-side)
   - Returns the `client_secret` to the frontend
   - Updates the `payments` table in Supabase on webhook confirmation

---

### Step 3 – Vercel (Hosting)

1. Push this repository to GitHub.
2. Go to <https://vercel.com/new> → **Import** the repository.
3. Vercel auto-detects Vite. Settings:
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Under **Environment Variables**, add:

   | Variable                    | Value                                      |
   |-----------------------------|---------------------------------------------|
   | `VITE_SUPABASE_URL`         | `https://<your-project>.supabase.co`       |
   | `VITE_SUPABASE_ANON_KEY`    | `eyJ...` (anon/public key)                 |
   | `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_...`                            |
   | `VITE_DEMO_MODE`            | `false`                                    |
   | `VITE_APP_URL`              | `https://your-domain.com`                  |

5. Click **Deploy**.

---

### Step 4 – Custom Domain

1. In Vercel Dashboard → your project → **Settings → Domains**.
2. Add your domain and follow the DNS instructions.
3. Update `VITE_APP_URL` in Vercel env vars and the **Site URL** in Supabase Auth settings.

---

## 3. Environment Variables

See `.env.example` for a full annotated list. Copy it to `.env.local` for local development.

| Variable                      | Required | Description                                           |
|-------------------------------|----------|-------------------------------------------------------|
| `VITE_SUPABASE_URL`           | Prod     | Supabase project URL                                  |
| `VITE_SUPABASE_ANON_KEY`      | Prod     | Supabase anon (public) key                            |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Prod     | Stripe publishable key for payment UI                 |
| `VITE_DEMO_MODE`              | Dev only | `true` to show demo login buttons and seed credentials |
| `VITE_APP_URL`                | Prod     | Public app URL (used in Supabase auth redirect URLs)  |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Vercel (Frontend)                   │
│  React + Vite + TypeScript + TailwindCSS             │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │  Admin Portal │  │ Tenant Portal│                 │
│  └──────────────┘  └──────────────┘                 │
│  src/store/authStore.ts  ← Supabase Auth (prod)      │
│  src/store/dataStore.ts  ← Zustand local state       │
│  src/lib/supabase.ts     ← Supabase client           │
└───────────────────┬─────────────────────────────────┘
                    │ HTTPS
┌───────────────────▼─────────────────────────────────┐
│               Supabase (Backend)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │   Auth   │  │ Postgres │  │  Storage (docs)  │  │
│  │  (JWT)   │  │  + RLS   │  │  (private bucket)│  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│                 Stripe (Payments)                    │
│  Payment Intent API + Webhooks                       │
└─────────────────────────────────────────────────────┘
```

**Auth flow (production):**
1. User signs in via `loginAsync()` → Supabase Auth issues a JWT.
2. On next page load, `rehydrateFromSupabase()` restores the session from Supabase.
3. Supabase RLS policies enforce that tenants can only see their own data.
4. Admins (role = `'admin'` in `profiles`) have full read/write access.

**Auth flow (demo/local):**
- Supabase env vars are absent → `isSupabaseConfigured = false`.
- Auth checks against in-memory seed users in `dataStore.ts`.
- All data lives in `localStorage` via Zustand `persist`.

---

## 5. Remaining Manual Steps

The following items require your action and cannot be automated:

- [ ] **Create Supabase project** and run `supabase/migrations/001_initial_schema.sql`
- [ ] **Create the first admin user** in Supabase Auth, then run the SQL to set `role = 'admin'`
- [ ] **Create Supabase Storage bucket** named `documents` (private)
- [ ] **Create Stripe account** and complete business verification
- [ ] **Add a backend route** (Vercel/Supabase Edge Function) to create Stripe PaymentIntents server-side
- [ ] **Deploy to Vercel** and configure all environment variables listed above
- [ ] **Connect your custom domain** and update redirect URLs in Supabase
- [ ] **Configure email provider** (Supabase Auth → SMTP settings) for password-reset emails
- [ ] **Review and customise** RLS policies in the migration SQL if access rules need adjusting
- [ ] **Set up Supabase database backups** (Supabase Pro plan includes daily backups)

---

## Scripts

```bash
npm run dev       # Start local dev server
npm run build     # TypeScript check + Vite production build
npm run preview   # Preview production build locally
npm run lint      # Run ESLint
```

