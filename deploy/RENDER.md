# Deploying ChibiDink to Render (free): step by step

Render builds the app from GitHub and runs it in Singapore with free HTTPS.
You'll need about 30 minutes. Cost: $0.

---

## Step 1: Database (Supabase, Singapore)

1. <https://supabase.com/dashboard> → **New project** → Region **Southeast Asia (Singapore)** → save the database password.
2. **Project Settings → Data API** → turn it **off**.
3. **Connect** → **Session pooler** → **.NET** format → copy it, replace `[YOUR-PASSWORD]` with your password, and add
   `;SSL Mode=Require;Trust Server Certificate=true` at the end. Keep it for Step 4.

## Step 2: GitHub account and a private repository

1. Sign up at <https://github.com> (free).
2. Top right **+** → **New repository**.
   - **Name:** `chibidink`
   - **Private** (important)
   - Don't tick README, .gitignore or license.
   - **Create repository**. Copy the address shown, like `https://github.com/YOURNAME/chibidink.git`.

## Step 3: Upload the code (PowerShell on your PC)

```powershell
cd "C:\Users\kevin\Documents\Kevin File\Portfolio\pickleball"
git config --global user.name "Your Name"
git config --global user.email "the-email-you-use-on-github"
git add .
git commit -m "ChibiDink"
git branch -M main
git remote add origin https://github.com/YOURNAME/chibidink.git
git push -u origin main
```
A GitHub sign-in window opens the first time: sign in and allow it.
Secrets are excluded automatically (the database password, `.env` and key files are never uploaded).

## Step 4: Create the app on Render

1. Sign up at <https://render.com> with **GitHub**.
2. **New +** → **Blueprint** → choose the `chibidink` repository (allow Render to see it if asked).
3. Render reads `render.yaml`: a free web service named **chibidink** in **Singapore**.
4. It asks for **ConnectionStrings__DefaultConnection**: paste the Supabase string from Step 1.
5. **Apply / Deploy Blueprint**. The first build takes about 5–10 minutes (watch the **Logs**).
6. When it says **Live**, your address is at the top, like `https://chibidink.onrender.com`.

## Step 5: Keep it awake (free pinger)

Free Render apps sleep after 15 minutes without visitors, and then take about a minute to wake up.

1. Sign up at <https://cron-job.org> (free).
2. **Create cronjob** → URL `https://chibidink.onrender.com/health` (your address) → **every 10 minutes** → **Create**.

## Step 6: Check it

On your phone, open your Render address → **Create account** → create a session → join it from a second phone with the QR.

---

## Updating later

After changing the code:
```powershell
cd "C:\Users\kevin\Documents\Kevin File\Portfolio\pickleball"
git add .
git commit -m "What I changed"
git push
```
Render deploys the new version automatically (a few minutes). Nobody is signed out.

## If something goes wrong

| Problem | Fix |
|---|---|
| Build fails | Render → your service → **Logs**: send the red lines. |
| Site shows "Our side tripped" | The connection string is wrong: Render → **Environment** → fix `ConnectionStrings__DefaultConnection` → **Save** (it redeploys). |
| First visit takes about a minute | It was asleep: check the pinger in Step 5. |
| `git push` asks for a password | Use the sign-in window, or sign in with GitHub in the browser when asked. |
