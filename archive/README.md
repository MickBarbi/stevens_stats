# archive/

Code that isn't wired into the build but is kept for reference / possible revival.

`tsconfig.json` excludes this folder, and there are no route files under `app/`
pointing at it, so nothing here is compiled or deployed.

## What's here

| Path | What it was |
|---|---|
| `api/` | The read-only JSON API routes (`/api/roster`, `/api/events`, `/api/athlete/[athleteId]`, `/api/home/*`) that queried Prisma / SQL Server. The site now reads `data/*.json` at build time instead (see `lib/data.ts`), so these are unused. |
| `lib/prisma.ts` | The shared `PrismaClient` singleton those routes used. |

## Bringing it back

If you ever want a live database again (e.g. for an admin/edit flow):

```bash
git mv archive/api app/api
git mv archive/lib/prisma.ts lib/prisma.ts
```

Then restore `DATABASE_URL`, run `npx prisma generate`, and point the routes at
whatever store you choose. `prisma/schema.prisma` is still maintained as the
data-model reference, and `scraper/load.py --push` can still load a SQL Server
database directly.
