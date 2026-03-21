# Manzione Properties React

Standalone React + Vite + TypeScript website for **Manzione Properties** — specialists in architecture, design, and high-end residential development.

## Getting Started

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploying to Vercel as a New Project

This app is designed to be deployed as its own Vercel project, completely independent from the Scattolini Group website.

### Steps

1. **Create a new GitHub repository** (e.g. `manzione-properties-react`) and push this folder's contents as the root.

2. **Go to [vercel.com/new](https://vercel.com/new)** and click **Add New → Project**.

3. **Import** your new `manzione-properties-react` GitHub repository.

4. Vercel will auto-detect **Vite** as the framework. The `vercel.json` in this folder already configures the build correctly:
   - Framework: `vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`

5. Click **Deploy**. Your new Manzione Properties site will be live at a URL like `manzione-properties-react.vercel.app`.

> **Note**: Do NOT deploy this using the Scattolini Group repository root — that would overwrite the existing site.
