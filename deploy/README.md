# Deploying ChibiDink (free): complete steps

One free Oracle Cloud server (Singapore) runs the API, the website, and Caddy (free automatic HTTPS).
The database is Supabase. Total cost: $0. Allow about 1 hour the first time.

**What you'll end up with:** `https://chibidink.duckdns.org` (or your own name), working on any phone.

---

## Part A: Database (Supabase, Singapore)

A fresh project for the live site keeps the development demo accounts out of it and puts the
database next to the server, which makes every page several times faster.

1. Go to <https://supabase.com/dashboard> → **New project**.
2. **Name:** `chibidink-live`. **Region:** **Southeast Asia (Singapore)**.
3. **Database password:** click *Generate*, then **copy it and save it somewhere safe** (you'll need it in Part E).
4. **Plan:** Free → **Create new project**. Wait 1–2 minutes until it's ready.
5. Turn off the Data API (ChibiDink doesn't use it): **Project Settings → Data API** → switch it **off**
   (or remove `public` from *Exposed schemas*) → Save.
6. Get the connection string: click **Connect** (top of the project page) → **Session pooler** → choose the **.NET** format.
   It looks like:
   ```
   User Id=postgres.abcdefgh;Password=[YOUR-PASSWORD];Server=aws-0-ap-southeast-1.pooler.supabase.com;Port=5432;Database=postgres
   ```
   Replace `[YOUR-PASSWORD]` with the password from step 3, and add this to the end:
   ```
   ;SSL Mode=Require;Trust Server Certificate=true
   ```
   Keep this whole line for Part E. **Don't share it**: it's the key to your database.

You don't create any tables: the app creates them itself the first time it starts.

---

## Part B: Server network (Oracle Cloud)

1. Sign in to <https://cloud.oracle.com>. Check the region at the top right says **Singapore**.
2. Menu ☰ → **Networking** → **Virtual cloud networks**.
3. **Actions → Start VCN Wizard** → choose **Create VCN with Internet Connectivity** → **Start VCN Wizard**.
4. **VCN name:** `chibidink-vcn`. Leave everything else as it is → **Next** → **Create**. Wait until every step shows done.
5. Open the ports for the website:
   1. Click **chibidink-vcn** → **Subnets** → **public subnet-chibidink-vcn**.
   2. **Security Lists** → **Default Security List for chibidink-vcn**.
   3. **Add Ingress Rules**: Source CIDR `0.0.0.0/0`, IP protocol **TCP**, Destination port range **80** → **Add Ingress Rules**.
   4. **Add Ingress Rules** again with port **443**.
   (Port 22 for SSH is already open. Don't open anything else.)

---

## Part C: The server (Oracle Cloud)

1. Menu ☰ → **Compute** → **Instances** → **Create instance**.
2. **Name:** `chibidink`. Leave *Placement* as is.
3. **Image and shape:**
   - **Image** → *Change image* → **Ubuntu** → **Canonical Ubuntu 24.04** (not "Minimal") → *Select image*.
   - **Shape** → *Change shape* → **Virtual machine** → **Ampere** → tick **VM.Standard.A1.Flex** →
     expand it (▸) → **OCPUs: 2**, **Memory: 12 GB** → *Select shape*. It should say **Always Free-eligible**.
4. **Networking:**
   - **Select existing virtual cloud network** → `chibidink-vcn`.
   - **Select existing subnet** → **public subnet-chibidink-vcn**.
   - **Automatically assign public IPv4 address** → **on**.
   - Leave the VNIC name, private IP and IPv6 as they are.
5. **Add SSH keys:** **Generate a key pair for me** → **Save private key**.
   Move the downloaded file to `C:\Users\kevin\.ssh\` and rename it `chibidink.key`.
   **Keep this file private**: anyone with it controls the server.
6. **Boot volume:** leave as is → **Create**.
7. Wait until the status is green **Running** (1–3 minutes). Copy the **Public IP address** (like `152.69.12.34`).

**"Out of host capacity"?** Common for free ARM servers. Try another *Availability domain*, a smaller size
(1 OCPU / 6 GB), or try again later in the day.

---

## Part D: Free web address (DuckDNS)

Phones only allow the camera (QR scanning) on `https://` sites, and HTTPS needs a name.

1. Go to <https://www.duckdns.org> → sign in (Google or GitHub).
2. Type a name, e.g. `chibidink`, → **add domain**. Your address is `chibidink.duckdns.org`.
3. In **current ip**, paste your server's public IP → **update ip**.

---

## Part E: Put ChibiDink on the server

Open **PowerShell** on your PC.

**1. Go to the project and make the key private** (Windows requires this once):
```powershell
cd "C:\Users\kevin\Documents\Kevin File\Portfolio\pickleball"
icacls C:\Users\kevin\.ssh\chibidink.key /inheritance:r /grant:r "$($env:USERNAME):R"
```

**2. Upload** (replace `YOUR.SERVER.IP`):
```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\upload.ps1 -Server ubuntu@YOUR.SERVER.IP -Key C:\Users\kevin\.ssh\chibidink.key
```
- If it asks *Are you sure you want to continue connecting (yes/no)?* → type `yes`.
- It packs the app, uploads it, installs Docker and opens the server's firewall.
- It then stops with **"Created deploy/.env. Fill in DOMAIN and the connection string"**. That's expected.

**3. Fill in the two settings on the server:**
```powershell
ssh -i C:\Users\kevin\.ssh\chibidink.key ubuntu@YOUR.SERVER.IP
nano ~/chibidink/deploy/.env
```
Change the two lines to yours (use the arrow keys to move):
```
DOMAIN=chibidink.duckdns.org
ConnectionStrings__DefaultConnection=User Id=postgres.abcdefgh;Password=YOUR-PASSWORD;Server=aws-0-ap-southeast-1.pooler.supabase.com;Port=5432;Database=postgres;SSL Mode=Require;Trust Server Certificate=true
```
Save: **Ctrl+O**, **Enter**, then exit: **Ctrl+X**.

**4. Start it** (still connected to the server):
```bash
cd ~/chibidink/deploy && bash setup.sh
```
The first build takes about 5–10 minutes. When it says **Done**, type `exit` to leave the server.

---

## Part F: Check it works

1. On your phone, open `https://chibidink.duckdns.org` (the certificate can take a minute the first time).
2. **Create account** (tick the Terms box). The development demo accounts can't sign in here.
3. Create a session, then join it from a second phone by scanning the QR code.

---

## Updating after you change the code

From PowerShell on your PC, in the project folder:
```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\upload.ps1 -Server ubuntu@YOUR.SERVER.IP -Key C:\Users\kevin\.ssh\chibidink.key
```
Your settings on the server are kept. Database updates apply automatically, and nobody is signed out.

---

## Useful commands

Connect first: `ssh -i C:\Users\kevin\.ssh\chibidink.key ubuntu@YOUR.SERVER.IP`, then `cd ~/chibidink/deploy`.

| What | Command |
|---|---|
| Is it running? | `sudo docker compose ps` |
| Live logs | `sudo docker compose logs -f app` (Ctrl+C to stop watching) |
| Restart the app | `sudo docker compose restart app` |
| Stop everything | `sudo docker compose down` |
| Start again | `sudo docker compose up -d` |
| Memory and CPU | `free -h` and `sudo docker stats` |

The app restarts by itself if it crashes or the server reboots.

---

## If something goes wrong

| Problem | Fix |
|---|---|
| Site doesn't open at all | Check Part B step 5 (ports 80 and 443), and that DuckDNS has the server's current IP. |
| "Your connection is not private" | Wait a minute and reload: Caddy is still getting the certificate. If it stays, the DuckDNS IP is wrong or port 80 is closed. |
| Site opens but shows "Our side tripped" | The database setting is wrong. Check `.env`, then `sudo docker compose logs app`. |
| `Permission denied (publickey)` | Wrong key file or user. The user is `ubuntu`, and redo the `icacls` line. |
| Upload script won't run | Use the `powershell -ExecutionPolicy Bypass -File ...` form shown above. |
| Out of host capacity (Part C) | Try another availability domain, 1 OCPU / 6 GB, or later in the day. |

---

## Good to know

- **Free, no upgrade needed.** Stay on Always Free and only create Always Free resources (the A1 shape).
- **Idle servers can be reclaimed** by Oracle on free accounts. Your data is in Supabase, so nothing is lost:
  repeat Parts C–E (about 20 minutes) and update the DuckDNS IP.
- **Monthly limits to watch:** Supabase → *Usage* → **Egress** (5 GB free a month). One busy club stays well under it.
- **Secrets:** the database password lives only in `.env` on the server and in user secrets on your PC.
  Never put it in the code, share `.env`, or share `chibidink.key`.
- **Cleanup runs daily:** closed sessions older than 30 days (except each player's latest 10) and guest accounts
  7 days after they last played.
