# Food Delivery & Real-Time Tracking Platform

Production-shaped modular monolith — see `SETUP.md` for how to get this
running locally, and the project's design docs (Phase 0 deliverables, kept in
your chat history) for the schema, state machines, and API/socket contracts
this codebase implements.

## Structure

```
.
├── docker-compose.yml     # Postgres + Redis for local dev
├── SETUP.md               # start here
├── backend/                # Express + Prisma + BullMQ API
└── frontend/                # React (Vite) app
```

## Current phase: Phase 1 — Project Foundation

What exists right now: a runnable server skeleton (health check, structured
logging, centralized error handling, BullMQ wiring with one demo job), a
Prisma schema (no business logic reading/writing it yet), and a React routing
skeleton with four placeholder experiences. No authentication or business
modules yet — that starts Phase 2.
