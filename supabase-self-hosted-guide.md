# Self-Hosted Supabase on Hetzner VPS via Coolify — Full Production Guide

---

## Prompt Guide (use this to recreate the entire setup with Claude)

Paste this prompt at the start of a new session to have Claude guide you through the full setup:

```
I need to deploy a self-hosted Supabase stack on a Hetzner VPS using Coolify.
My VPS IP is [YOUR_IP]. Coolify is already installed and accessible at [YOUR_IP]:8000.

Please guide me through deploying the full Supabase stack (DB, Redis, Kong, Auth,
REST, Realtime, Storage, Meta, Studio) using Coolify's Docker Compose service.

After deployment, apply all production fixes for:
- supabase-realtime RLIMIT_NOFILE / APP_NAME boot errors
- _realtime schema missing in PostgreSQL 15
- supabase-studio HOSTNAME binding so the healthcheck passes
- Kong and Studio host port exposure (8001 and 3000)
- SUPABASE_PUBLIC_URL pointing to the correct Kong port

All compose file edits should be made via terminal directly on the deployable
compose file, NOT through the Coolify UI editor, to prevent overwrites on redeploy.
```

---

## Overview

| Component | Detail |
|-----------|--------|
| VPS Provider | Hetzner |
| VPS IP | 204.168.149.15 |
| Control Panel | Coolify v4.0.0-beta.468 |
| Coolify UI Port | :8000 |
| Supabase Stack | Docker Compose (9 containers) |
| Studio Access | http://[VPS_IP]:3000 |
| Kong API Gateway | http://[VPS_IP]:8001 |
| Compose file path | `/data/coolify/services/[UUID]/docker-compose.yml` |

---

## Prerequisites

- Hetzner VPS (Ubuntu 22.04) with root access
- Coolify installed (`curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`)
- Ports open in firewall: `8000` (Coolify UI), `8001` (Kong/API), `3000` (Studio), `5432` (optional DB access)
- Docker and Docker Compose installed (Coolify handles this)

---

## Step 1 — Deploy Supabase via Coolify

1. Log into Coolify at `http://[VPS_IP]:8000`
2. Go to **Projects** → create a new project (e.g. `exprs`)
3. Create a new **Environment** (e.g. `production`)
4. Click **+ New Resource** → **Docker Compose (Complex)**
5. Paste the official Supabase self-hosted `docker-compose.yml` from:
   `https://github.com/supabase/supabase/tree/master/docker`
6. Fill in required environment variables (see Supabase docs for full list):
   - `POSTGRES_PASSWORD`
   - `JWT_SECRET`
   - `ANON_KEY`
   - `SERVICE_ROLE_KEY`
   - `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD`
7. Click **Save** — Coolify will write the deployable compose file to:
   `/data/coolify/services/[UUID]/docker-compose.yml`
8. Click **Deploy**

> **Important:** All manual edits must be made to the deployable compose file via
> terminal, NOT through Coolify's "Edit Docker Compose" UI. If you edit via UI and
> redeploy, Coolify regenerates the deployable file from its template and overwrites
> all manual changes.

---

## Step 2 — Connect to the VPS Terminal

Use Coolify's built-in terminal:

1. Go to `http://[VPS_IP]:8000/terminal`
2. Select **localhost** from the dropdown
3. Click **Connect**

You now have a root shell on the VPS.

---

## Step 3 — Fix supabase-realtime (3 sequential boot errors)

The Realtime container (Elixir/Phoenix) fails to boot on a fresh Coolify deploy for
three reasons that must be fixed in order.

### 3a. Fix `RLIMIT_NOFILE: unbound variable`

Realtime's `/app/run.sh` uses `set -u` and references `$RLIMIT_NOFILE`. If it's not
set as an environment variable, the script exits immediately.

Find the last env var line in the realtime service block:

```bash
grep -n "SERVICE_NAME_REDIS\|realtime" /data/coolify/services/[UUID]/docker-compose.yml | head -20
```

Note the line number of `SERVICE_NAME_SUPABASE_REDIS: redis` inside the realtime
environment block, then append after it (replace `185` with your actual line number):

```bash
sed -i '185a\      RLIMIT_NOFILE: '"'"'1048576'"'"'' \
  /data/coolify/services/[UUID]/docker-compose.yml
```

### 3b. Fix `APP_NAME not available` (Elixir RuntimeError)

Realtime's `runtime.exs` reads `FLY_APP_NAME || APP_NAME` and raises if neither is
set. Add both after the RLIMIT_NOFILE line:

```bash
sed -i '186a\      APP_NAME: realtime' \
  /data/coolify/services/[UUID]/docker-compose.yml
sed -i '187a\      FLY_ALLOC_ID: fly123' \
  /data/coolify/services/[UUID]/docker-compose.yml
```

### 3c. Fix `ERROR 3F000 invalid_schema_name: _realtime`

PostgreSQL 15 changed behaviour — setting `search_path` to a non-existent schema
now raises an error instead of a warning. Realtime's migration script connects with
`SET search_path TO _realtime` as an after-connect hook, which fails if the schema
doesn't exist yet.

Pre-create the schema directly in the DB container:

```bash
docker exec -it supabase-db-[UUID] psql -U postgres -c "
  CREATE SCHEMA IF NOT EXISTS _realtime;
  ALTER SCHEMA _realtime OWNER TO supabase_admin;
  GRANT ALL ON SCHEMA _realtime TO supabase_admin;
"
```

### 3d. Recreate realtime

```bash
docker compose -f /data/coolify/services/[UUID]/docker-compose.yml \
  up -d --no-deps supabase-realtime
```

Verify it's stable (not restart-looping):

```bash
docker ps --filter "name=[UUID]" --format "table {{.Names}}\t{{.Status}}"
```

Look for `supabase-realtime-[UUID]` showing `Up X minutes` without `(Restarting)`.

---

## Step 4 — Fix supabase-studio healthcheck (ECONNREFUSED)

**Root cause:** Next.js 14 uses the `HOSTNAME` environment variable to determine
which network interface to bind to. Docker sets the container's `HOSTNAME` to the
short container ID, so Next.js binds to the container's `eth0` IP (e.g. `10.0.3.9`)
instead of all interfaces. The Docker healthcheck probes `localhost:3000`
(i.e. `127.0.0.1:3000`) which is not bound, causing `ECONNREFUSED`.

**Fix:** Add `HOSTNAME: 0.0.0.0` to studio's environment block.

Find the last env var line in the studio block (it will be near `SERVICE_NAME_REDIS: redis`):

```bash
grep -n "supabase-studio:\|SERVICE_NAME_REDIS" \
  /data/coolify/services/[UUID]/docker-compose.yml
```

Append `HOSTNAME: 0.0.0.0` after the `SERVICE_NAME_REDIS` line in the studio block
(replace `342` with your actual line number):

```bash
sed -i '342a\      HOSTNAME: '"'"'0.0.0.0'"'"'' \
  /data/coolify/services/[UUID]/docker-compose.yml
```

Recreate studio:

```bash
docker compose -f /data/coolify/services/[UUID]/docker-compose.yml \
  up -d --no-deps supabase-studio
```

Verify healthcheck passes — Coolify UI should show `Running (healthy)` for Studio.

---

## Step 5 — Expose Kong (API Gateway) on a host port

By default, Coolify's Supabase compose does not publish Kong's port to the host.
`SUPABASE_PUBLIC_URL` is set to `http://[VPS_IP]:8000` which conflicts with the
Coolify UI port.

Find the last line of the Kong service block (the `- .env` line just before `supabase-studio:`):

```bash
grep -n "supabase-studio:\|env_file:\|- \.env" \
  /data/coolify/services/[UUID]/docker-compose.yml
```

Take the line number of `- .env` immediately before `supabase-studio:` (e.g. `315`),
then insert the ports block after it:

```bash
sed -i '315a\    ports:\n      - "8001:8000"' \
  /data/coolify/services/[UUID]/docker-compose.yml
```

> **Note:** The `\n` in `sed` append works in this environment because the GNU sed
> on this system interprets it. If it doesn't insert a real newline, use two separate
> `sed -i 'Na\<content>'` commands — one for `ports:` and one for `- "8001:8000"`.

Update `SUPABASE_PUBLIC_URL` everywhere in the file:

```bash
sed -i 's|http://[VPS_IP]:8000|http://[VPS_IP]:8001|g' \
  /data/coolify/services/[UUID]/docker-compose.yml
```

Verify both occurrences updated:

```bash
grep -n "SUPABASE_PUBLIC_URL" /data/coolify/services/[UUID]/docker-compose.yml
```

Recreate Kong:

```bash
docker compose -f /data/coolify/services/[UUID]/docker-compose.yml \
  up -d --no-deps supabase-kong
```

Verify Kong is now listening on the host:

```bash
docker port supabase-kong-[UUID]
# Expected: 8000/tcp -> 0.0.0.0:8001
```

---

## Step 6 — Expose Studio on a host port

Same issue — Studio's port 3000 is not published to the host.

Find Studio's last `- .env` line (just before `supabase-meta:`):

```bash
grep -n "supabase-meta:\|supabase-studio:" \
  /data/coolify/services/[UUID]/docker-compose.yml | grep -v "coolify\|label\|SERVICE\|CONTAINER\|depends\|name:"
```

Studio ends one line before `supabase-meta:`. Insert the ports block (replace `361` with your line):

```bash
sed -i '361a\    ports:\n      - "3000:3000"' \
  /data/coolify/services/[UUID]/docker-compose.yml
```

Recreate Studio:

```bash
docker compose -f /data/coolify/services/[UUID]/docker-compose.yml \
  up -d --no-deps supabase-studio
```

Verify:

```bash
docker port supabase-studio-[UUID]
# Expected: 3000/tcp -> 0.0.0.0:3000
```

---

## Step 7 — Final verification

Run a full stack health check:

```bash
docker ps --filter "name=[UUID]" \
  --format "table {{.Names}}\t{{.Status}}" | sort
```

Expected output (all 9 containers up):

```
NAMES                                          STATUS
redis-[UUID]                                   Up X minutes (healthy)
supabase-auth-[UUID]                           Up X minutes
supabase-db-[UUID]                             Up X minutes (healthy)
supabase-kong-[UUID]                           Up X minutes (healthy)
supabase-meta-[UUID]                           Up X minutes (healthy)
supabase-realtime-[UUID]                       Up X minutes
supabase-rest-[UUID]                           Up X minutes
supabase-storage-[UUID]                        Up X minutes
supabase-studio-[UUID]                         Up X minutes (healthy)
```

> Auth, REST, Storage, and Realtime show no `(healthy)` label because those
> containers don't define a Docker HEALTHCHECK — that is expected and not an error.

---

## Access URLs

| Service | URL |
|---------|-----|
| Supabase Studio (UI) | `http://[VPS_IP]:3000` |
| Kong API Gateway | `http://[VPS_IP]:8001` |
| Coolify UI | `http://[VPS_IP]:8000` |

Studio login uses the values you set for `DASHBOARD_USERNAME` and
`DASHBOARD_PASSWORD` in the environment variables.

---

## Key lessons learned / gotchas

### 1. Never edit via Coolify's "Edit Docker Compose" UI
Coolify stores a template compose file separately from the deployable one. Clicking
Save + Deploy in the UI regenerates the deployable file from the template and
**overwrites all manual edits**. Always edit the deployable file directly via
terminal at `/data/coolify/services/[UUID]/docker-compose.yml`.

### 2. PostgreSQL 15 `search_path` behaviour change
PostgreSQL 15 raises `ERROR 3F000 invalid_schema_name` if `search_path` is set to a
non-existent schema, instead of silently warning like earlier versions. Realtime's
migration system uses `SET search_path TO _realtime` as an after-connect hook, so
the `_realtime` schema **must exist before Realtime first runs**.

### 3. Next.js 14 `HOSTNAME` env var conflict with Docker
Next.js 14 uses the `HOSTNAME` environment variable to determine its bind address.
Docker sets the container's `HOSTNAME` to the short container ID by default, causing
Next.js to bind to the container's private IP rather than all interfaces. This makes
`localhost`-based healthchecks fail. Fix: set `HOSTNAME: 0.0.0.0` in the Studio
environment block.

### 4. Coolify terminal WebSocket timeout on long `sleep` commands
The Coolify browser-based terminal disconnects on long-running commands. Avoid
`sleep` waits longer than ~10s. If disconnected, reload the terminal page and
reconnect — prior work is preserved on the VPS.

### 5. `sed` append with `\n` in this environment
GNU sed's `Na\<text>` (append after line N) approach works reliably in the Coolify
terminal. The `\n` in replacement strings within `s/old/new/` does NOT reliably
produce a newline — use the append form instead.

### 6. Port conflict: Coolify UI and `SUPABASE_PUBLIC_URL` both on :8000
Coolify runs on port 8000 by default. The Supabase template sets `SUPABASE_PUBLIC_URL`
to `[VPS_IP]:8000`, which means Kong needs to also be on 8000 — but Kong has no
host port published at all by default. Expose Kong on **:8001** and update
`SUPABASE_PUBLIC_URL` to match.

---

## Compose file UUID reference

For this deployment the Coolify service UUID is: `amztebemui7wwpm3ryvx7muw`

Full compose file path:
```
/data/coolify/services/amztebemui7wwpm3ryvx7muw/docker-compose.yml
```

Coolify service URL:
```
http://204.168.149.15:8000/project/fzzwoz8qghrqgizaykct64f8/environment/y9u433d15vboclxbbxuciv25/service/amztebemui7wwpm3ryvx7muw
```

---

## Prompt Guide (end — use to continue or debug)

If the stack goes down or you need to debug in a future session, paste this:

```
I have a self-hosted Supabase stack deployed on a Hetzner VPS (IP: 204.168.149.15)
via Coolify. The service UUID is amztebemui7wwpm3ryvx7muw and the compose file is at:
/data/coolify/services/amztebemui7wwpm3ryvx7muw/docker-compose.yml

All manual fixes (RLIMIT_NOFILE, APP_NAME, HOSTNAME: 0.0.0.0, ports for Kong :8001
and Studio :3000, _realtime schema, SUPABASE_PUBLIC_URL pointing to :8001) are
already applied directly in the deployable compose file.

IMPORTANT: Do NOT use the Coolify UI "Edit Docker Compose" editor — it will
overwrite all manual changes. All edits must be done via the Coolify terminal
at http://204.168.149.15:8000/terminal (select "localhost" from the dropdown).

Supabase Studio is at http://204.168.149.15:3000
Kong API gateway is at http://204.168.149.15:8001
Coolify UI is at http://204.168.149.15:8000

Please help me [describe your issue here].
```
