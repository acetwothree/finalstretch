# Hosting FinalStretch

## TL;DR

FinalStretch is a **Next.js app with server API routes** that use your secret Anthropic
key. It needs a Node.js server — not plain static/PHP hosting.

- **Easiest:** deploy to **Vercel** (free), point your domain at it.
- **The in-app checkout is fake.** Until you wire real Stripe, protect the site
  with `SITE_PASSWORD` so strangers can't spend your API budget.

---

## 1. Which Hostinger plan can run this?

It needs to run a **Node.js process** (for the `/api/*` routes + your key). Plain
PHP/static hosting can't.

| Plan | Runs it? | How |
|---|---|---|
| Hostinger **Premium** web hosting | ❌ usually not | No Node.js app support on that tier. |
| Hostinger **Business** / **Cloud** web hosting | ✅ yes | hPanel → **Advanced → Node.js** ("Setup Node.js App"). See §3. |
| Hostinger **VPS** | ✅ yes | `npm start` under PM2 + Nginx. See §4. |
| **Vercel** (free Hobby) | ✅ easiest | Built for Next.js. See §2. |

**Business plan:** yes, you can host it there. The one real gotcha is the
`/api/execute` call — it can take 30–70s while Claude writes code. A self-hosted
Node process (Hostinger Business/VPS) has **no serverless timeout**, so this is
actually *better* there than on Vercel's free tier (60s function limit → execute
can 504). Downside vs Vercel: you redeploy manually and shared RAM is limited, so
**build locally and upload** rather than building on the server.

You can **buy the domain anywhere** (Namecheap, Hostinger, …) and point it at
whichever host you pick.

---

## 2. Deploy to Vercel (recommended)

1. Push this project to a **GitHub repo** (private is fine).
2. Go to [vercel.com](https://vercel.com) → **New Project** → import that repo.
   Framework preset: **Next.js** (auto-detected). No build settings to change.
3. **Environment Variables** (Settings → Environment Variables), add for
   *Production* + *Preview*:
   - `FINISHLINE_ANTHROPIC_API_KEY` = your `sk-ant-...` key
   - `SITE_PASSWORD` = any password you choose  ← **do this for now** (see §5)
   - *(optional)* `FINISHLINE_SCAN_MODEL`, `FINISHLINE_PLAN_MODEL`
4. **Deploy.** You get a `*.vercel.app` URL. Test it (you'll hit the password page).

### Point your Hostinger domain at Vercel

1. Vercel → your project → **Settings → Domains** → add `finalstretch.dev` and
   `www.finalstretch.dev`.
2. Vercel shows you the DNS records. In **Hostinger → Domains → DNS / Nameservers**:
   - Set an **A record** for `@` → the IP Vercel gives you (usually `76.76.21.21`).
   - Set a **CNAME** for `www` → `cname.vercel-dns.com`.
   *(Or switch the domain's nameservers to Vercel's — Vercel will offer this.)*
3. Wait for propagation (minutes to a couple hours). Vercel issues the HTTPS cert
   automatically.

---

## 3. Deploy to Hostinger Business / Cloud (Node.js App)

The project is configured with `output: "standalone"`, so it produces a
self-contained `server.js`.

**On your machine:**

```bash
npm ci
npm run build
```

This creates `.next/standalone/`. Assemble the folder to upload:

```bash
mkdir deploy
cp -r .next/standalone/* deploy/
cp -r .next/static deploy/.next/static
cp -r public deploy/public
```

**In hPanel:**

1. **Advanced → Node.js** → *Create application*.
   - Node.js version: **20** (or 22)
   - Application root: `finishline` (a folder in your hosting File Manager)
   - Application startup file: `server.js`
   - Application URL: your domain (or a subdomain)
2. Upload everything from `deploy/` into that `finishline` folder (File Manager
   or SFTP). `node_modules` is already bundled — you do **not** need "Run NPM
   Install".
3. Back in the Node.js panel, add **Environment variables**:
   - `FINISHLINE_ANTHROPIC_API_KEY` = your key
   - `SITE_PASSWORD` = your chosen password
   - `NODE_ENV` = `production`
   *(Passenger sets `PORT` / `HOSTNAME` itself — `server.js` reads them.)*
4. Click **Restart application**.
5. hPanel → **SSL** → issue the free certificate for the domain.

**Redeploying later:** re-run the build locally, re-upload the `deploy/` contents
(overwrite), hit **Restart**.

If execute requests time out, raise the proxy/Passenger timeout in hPanel (or
open a support ticket) — it needs to allow ~120s responses.

---

## 4. Deploy to a Hostinger VPS (alternative)

```bash
# on the VPS
git clone <your repo> && cd finishline
npm ci
printf 'FINISHLINE_ANTHROPIC_API_KEY=sk-ant-...\nSITE_PASSWORD=yourpass\n' > .env.local
npm run build
npm i -g pm2
pm2 start "npm start" --name finishline   # serves on :3000
pm2 save && pm2 startup
```

Then put **Nginx** in front (reverse-proxy `:3000` → 80/443) and run
`certbot --nginx` for HTTPS. Point the Hostinger domain's A record at the VPS IP.

---

## 5. About the paywall

**The checkout in the app is a simulation.** `completePurchase()` just flips a
flag in the browser — anyone can open dev tools and unlock everything, then run
unlimited scans / plans / **Execute** calls on *your* API key and *your* bill.
Execute is the pricey one (large generations).

### For now — password-gate the whole site

Set the `SITE_PASSWORD` env var on your host. Everything (pages **and** API
routes) then sits behind one password page (`/gate`). Share the password with the
people you want to try it. Your key is safe; your spend is bounded by who has the
password. Leave `SITE_PASSWORD` unset locally.

**Also:** set a hard cap in the [Anthropic console](https://console.anthropic.com)
→ Billing → Limits, as a backstop.

### Before a real public launch

You'd want, in rough order:

1. **Real Stripe Checkout** — a `/api/checkout` that creates a Checkout Session,
   a webhook that verifies payment and sets a signed cookie (or a row in a DB)
   that the server trusts instead of the client `plan` flag.
2. **Rate limiting** on `/api/*` (e.g. Upstash Ratelimit) — per IP and per
   session, especially for `/api/execute`.
3. Optionally, **per-user API keys** (users bring their own) so scans don't cost
   you anything.

Until then: `SITE_PASSWORD` + an Anthropic spend limit is a perfectly fine way to
get it in front of testers.
