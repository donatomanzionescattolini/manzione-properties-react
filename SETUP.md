# Manzione Properties — Production Setup Guide

This application is now a fully live property management system powered by:
- **Supabase** — PostgreSQL database, authentication, and file storage
- **Stripe** — Secure credit/debit card payment processing for tenants
- **Resend** — Transactional email notifications
- **Vercel** — Hosting and deployment

---

## Prerequisites

- [Supabase account](https://supabase.com) (free tier works)
- [Stripe account](https://stripe.com) (free to create; test mode available)
- [Resend account](https://resend.com) (optional, for email notifications)
- [Vercel account](https://vercel.com) (or any static hosting)

---

## Step 1: Set Up Supabase

### 1.1 Create a Supabase Project
1. Go to [app.supabase.com](https://app.supabase.com) and create a new project
2. Choose a region close to your users
3. Save your database password somewhere safe

### 1.2 Run the Database Schema
1. In the Supabase Dashboard, go to **SQL Editor**
2. Paste the contents of `supabase/schema.sql` and click **Run**
3. This creates all tables, Row Level Security policies, and the storage bucket

> **Already have an existing database?** If the Appliances or Technicians pages show errors (404 from Supabase), the tables need to be created. Run the single combined migration in the SQL Editor:
> - `supabase/migrations/20260409_add_appliances_and_technicians.sql`
>
> After running it, clear the `missing-supabase-tables` key from your browser's **localStorage** (DevTools → Application → Local Storage) to force the app to retry immediately without waiting for the 5-minute cache to expire.

### 1.3 Seed Initial Data (optional)
1. In the SQL Editor, paste the contents of `supabase/seed.sql` and click **Run**
2. This adds sample properties, tenants, vendors, and transactions

### 1.4 Create the Admin User
1. Go to **Authentication** → **Users** → **Add User**
2. Enter email: `admin@manzione.com` (or your preferred admin email)
3. Set a strong password
4. In **User Metadata**, add: `{"name": "Admin", "role": "admin"}`
5. The trigger in `schema.sql` will automatically create the profile

### 1.5 Get Your API Keys
1. Go to **Settings** → **API**
2. Copy the **Project URL** and **anon/public** key
3. You'll need these for environment variables

---

## Step 2: Configure Environment Variables

### For Local Development
```bash
cp .env.example .env
```
Fill in `.env`:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key  # optional
```

### For Vercel
In your Vercel project settings → **Environment Variables**, add:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY` (optional)

---

## Step 3: Set Up Stripe (Optional — for card payments)

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Copy your **Publishable Key** (starts with `pk_test_` for testing)
3. Add it as `VITE_STRIPE_PUBLISHABLE_KEY` in your env file

### Deploy the Payment Edge Function
```bash
# Install Supabase CLI
npm install -g supabase

# Login and link your project
supabase login
supabase link --project-ref your-project-id

# Set Stripe secret key
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_secret_key

# Deploy the edge function
supabase functions deploy create-payment-intent
```

---

## Step 4: Set Up Email Notifications (Optional)

1. Create an account at [resend.com](https://resend.com)
2. Verify your sending domain
3. Get your API key

```bash
# Set Resend API key
supabase secrets set RESEND_API_KEY=re_your_api_key
supabase secrets set FROM_EMAIL=noreply@yourdomain.com
supabase secrets set FROM_NAME="Manzione Properties"
supabase secrets set SITE_URL=https://your-app.vercel.app

# Deploy the notification edge functions
supabase functions deploy send-notification
supabase functions deploy create-tenant-account
```

---

## Step 5: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments.

---

## Step 6: Create Tenant Accounts

Once deployed, you can invite tenants to the portal:

1. Log in as admin
2. Go to **Tenants** page
3. Add a tenant with their email address
4. Click the **Mail icon** (envelope) button next to their name
5. They'll receive an email invitation to set their password and access the portal

---

## Architecture Overview

```
Frontend (React + Vite)
  ├── Supabase Auth → JWT sessions, password reset
  ├── Supabase DB → All property management data
  ├── Supabase Storage → Document uploads (50MB max)
  └── Stripe.js → Secure card payments (client-side)

Supabase Edge Functions (Deno)
  ├── create-payment-intent → Creates Stripe Payment Intents
  ├── send-notification → Sends emails via Resend
  └── create-tenant-account → Invites tenants to the portal

Row Level Security
  ├── Admins → Full access to all data
  └── Tenants → Read/write access to their own records only
```

---

## Features Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Property management | ✅ Live | CRUD with Supabase |
| Tenant management | ✅ Live | CRUD with Supabase |
| Payments recording | ✅ Live | Stored in Supabase |
| Card payments (Stripe) | ✅ Live | Requires Stripe + Edge Function |
| Late fee management | ✅ Live | Auto-generation supported |
| Maintenance requests | ✅ Live | With notes and vendor assignment |
| Document storage | ✅ Live | Supabase Storage (50MB/file) |
| Email notifications | ✅ Live | Requires Resend API key |
| Tenant portal invites | ✅ Live | Supabase Auth invite emails |
| Password reset | ✅ Live | Via Supabase email |
| Escrow tracking | ✅ Live | Full audit trail |
| Reports | ✅ Live | With print support |
| CRM (Vendors/Owners) | ✅ Live | CRUD with Supabase |

---

## Security Notes

- All data access is protected by **Row Level Security** (RLS) policies
- Tenants can only see their own data (property, payments, maintenance, documents)
- Admins have full access to all data
- File uploads are restricted to authenticated users only
- Stripe card details are never stored — processed directly by Stripe
- Passwords are managed by Supabase Auth (bcrypt hashed)

---

## Development

```bash
# Install dependencies
npm install

# Start dev server (requires .env file)
npm run dev

# Build for production
npm run build
```
