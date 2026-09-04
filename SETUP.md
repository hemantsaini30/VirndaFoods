# SETUP.md — Phase 1: Project Foundation

This guide assumes: you have **Node.js** and **Docker** installed, but nothing
else (no Postgres, no Redis installed directly on your machine — Docker will
run those for you). Every command below is meant to be copy-pasted exactly as
written, in order, into your terminal.

---

## 0. A few concepts you'll see below

- **Migration**: a versioned, named file that describes one change to your
  database's structure (e.g. "add a `users` table"). Instead of hand-editing
  the database, you run migrations, and Postgres applies them in order. This
  means anyone on the team (or you, on a new machine) can rebuild the exact
  same database structure by just running all the migrations in order.
- **Redis** (in this project, so far): the backing store for background jobs
  (BullMQ). Later phases also use it for caching, but that's not wired up yet.
- **Request ID**: a random ID generated for every incoming HTTP request, so
  every log line produced while handling that one request can be tied
  together — useful for debugging "what happened during this one request."
- **Graceful shutdown**: when you stop the server, it finishes in-flight work
  and closes its database/Redis connections cleanly instead of just dying
  mid-request.

---

## 1. Start Postgres and Redis via Docker

```bash
docker compose up -d
```
**What this does**: reads `docker-compose.yml` at the project root and starts
two containers in the background (`-d` = detached): Postgres on port 5432,
Redis on port 6379, both with named volumes so your data survives a restart.

**What success looks like**: you'll see output ending with something like
```
✔ Container food_delivery_postgres  Started
✔ Container food_delivery_redis     Started
```

Give them a few seconds to fully boot, then confirm both are healthy:

```bash
docker compose ps
```
You should see `STATUS` showing `Up ... (healthy)` for both containers. If it
still says `(health: starting)`, wait 5–10 seconds and run the command again.

---

## 2. Set up the backend

```bash
cd backend
cp .env.example .env
cp .env.test.example .env.test
```
**What this does**: copies the example environment files to real `.env` /
`.env.test` files. The values already match `docker-compose.yml`'s defaults,
so you don't need to edit anything.

```bash
npm install
```
**What this does**: downloads all backend dependencies (Express, Prisma,
Redis client, BullMQ, testing tools, etc.) into `node_modules/`.
**Success looks like**: a line near the end saying something like
`added 250 packages` with no red `npm error` lines above it.

```bash
npx prisma generate
```
**What this does**: reads `prisma/schema.prisma` and generates the actual
JavaScript database client code your app imports (`@prisma/client`). This
needs to reach Prisma's servers to download a small database-driver binary
the first time — this requires a normal internet connection.
**Success looks like**: `✔ Generated Prisma Client`.

> **This is the first real checkpoint of this project.** Everything up to
> this point I was able to fully test myself while building this. From here
> on, you're running these commands for real for the first time — if
> `prisma generate` fails, see the troubleshooting section below before
> continuing.

```bash
npx prisma migrate dev --name init
```
**What this does**: creates the very first migration from our schema and
applies it to your `food_delivery_dev` database inside the Postgres
container, creating every table (Users, Orders, Payments, etc.).
**Success looks like**: `Your database is now in sync with your schema` and
a new folder appears at `prisma/migrations/<timestamp>_init/`.

Now create the **separate test database** (tests never touch your dev data):

```bash
docker compose exec postgres psql -U fooduser -d food_delivery_dev -c "CREATE DATABASE food_delivery_test OWNER fooduser;"
```
**What this does**: runs a SQL command inside the running Postgres container
to create a second, empty database just for tests.
**Success looks like**: `CREATE DATABASE`.

Apply the same migrations to the test database:

```bash
DATABASE_URL="postgresql://fooduser:foodpass@localhost:5432/food_delivery_test?schema=public" npx prisma migrate deploy
```
**Success looks like**: `All migrations have been successfully applied.`

---

## 3. Run the seed stub

```bash
npm run seed
```
**What this does**: runs `prisma/seed.js`, which for Phase 1 just connects to
your database and prints a user count (real seed data starts Phase 3).
**Success looks like**: `Seed stub running...` followed by `Current user
count in database: 0`.

---

## 4. Start the backend dev server

```bash
npm run dev
```
**What this does**: starts the Express server with auto-restart on file
changes.
**Success looks like**: a JSON log line containing `"msg":"Server listening
on port 4000"`.

Open a **new terminal tab** (leave the server running) and check the health
endpoint:

```bash
curl http://localhost:4000/api/v1/health
```
**Success looks like**:
```json
{"status":"ok","timestamp":"...","dependencies":{"database":true,"redis":true}}
```

---

## 5. Run the backend test suite

In a terminal (can be the same one the server isn't running in, or stop the
server first with `Ctrl+C`):

```bash
npm test
```
**What this does**: runs every `*.test.js` file under `tests/` against your
real test database, truncating tables between tests.
**Success looks like**: all test suites passing, ending with something like
`Tests: 8 passed, 8 total`.

---

## 6. Set up and run the frontend

In a new terminal tab:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
**Success looks like**: `Local: http://localhost:5173/`. Open that URL in
your browser — you should see a "Food Delivery Platform" heading with four
placeholder links (Customer, Restaurant Dashboard, Driver Dashboard, Admin
Dashboard). Clicking each should navigate to a simple placeholder page.

---

## If something goes wrong

**"port is already allocated" when running `docker compose up -d`**
Something on your machine is already using port 5432 or 6379 (maybe a
Postgres/Redis install from a previous project). Either stop that other
process, or change the port mapping in `docker-compose.yml` (e.g.
`"5433:5432"`) AND update `DATABASE_URL` in both `.env` and `.env.test`
to match.

**`prisma migrate dev` fails with a connection error right after `docker
compose up -d`**
The containers take a few seconds to become ready to accept connections even
after Docker reports them as "started." Run `docker compose ps` and wait
until both show `(healthy)`, then retry the migrate command.

**`Environment variable not found: DATABASE_URL` or similar Zod validation
error on server start**
You likely forgot to copy the env file. Run `cp .env.example .env` inside
`backend/` and try again. Also double check you're running commands from
inside the `backend/` folder, not the project root.

**`prisma generate` or `prisma migrate dev` fails to download something /
times out**
This needs a working internet connection to reach Prisma's servers the first
time you run it (to download a small database driver binary). Check your
connection and firewall/VPN settings, then retry.

**Tests fail with a connection error to `food_delivery_test`**
Make sure you completed the "create the separate test database" step in
Section 2 above, and that `.env.test` was copied (not just `.env`).

---

## If a test fails and you want help debugging

Copy-paste into our chat:
1. The exact command you ran.
2. The full terminal output (especially the first error, not just the last
   line).
3. Output of `docker compose ps`.
4. Confirmation of whether `.env` and `.env.test` both exist in `backend/`
   (`ls backend/.env backend/.env.test`).

Don't move on to Phase 2 until `npm test` passes and the manual checklist
below is confirmed.
