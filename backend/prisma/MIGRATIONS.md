# Migration Conventions

Every schema change is its own named, reviewable migration — never hand-edited
SQL, never a single migration that tries to do everything.

## Expand → Migrate → Contract

For any **destructive** change (dropping a column, renaming a column, changing
a column's type in an incompatible way), we do it in three separate steps
across three separate migrations/deploys, never one:

1. **Expand** — add the new column/table alongside the old one. Both old and
   new exist at once. Nothing reads the new column yet.
2. **Migrate** — backfill the new column from the old one (a data migration,
   possibly a one-off script), then switch application code to read/write the
   new column while still keeping the old one populated for safety.
3. **Contract** — once you're confident nothing depends on the old column
   anymore, drop it in its own later migration.

This means a bad deploy never leaves the database in a state where old code
(still running on another server during a rolling deploy) suddenly can't find
a column it expects. It costs more migrations, but each one is safe to run
without downtime.

## Naming

Use `npx prisma migrate dev --name descriptive_name_here` — e.g.
`add_delivery_partner_vehicle_type`, not `update` or `fix`.
