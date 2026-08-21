# Stevens Stats

A full-stack web app for tracking and visualizing a college track & field team's statistics — athlete rosters, event bests, ranking progressions, qualifying standards, and team news. Built with Next.js (App Router), TypeScript, Prisma, and SQL Server.

> Personal project. The live site connects to a private database of real athlete results; this repository contains the application code only (no data).

## Screenshots

> The screenshots below are rendered with seeded demo data (invented athletes and results), not real athlete records.

**Team roster**

![Roster page showing athlete cards with class year and profile links](public/screenshots/roster.png)

**Athlete profile — career bests and performance progression charts**

![Athlete profile page with a bests table and line charts of results over time](public/screenshots/athlete.png)

**Event leaderboards with conference qualifying standards**

![Events page with sortable per-event tables and MAC/AARTFC qualifying standards](public/screenshots/events.png)

**Home / team news**

![Home page showing team news posts](public/screenshots/home.png)

## Features

- **Roster** — browse athletes with photos, class year, and event specialties.
- **Athlete profiles** — per-athlete page with career bests, awards, and a performance-progression chart (Recharts), plus a searchable athlete picker.
- **Events** — season bests by event alongside MAC / AARTFC qualifying standards.
- **Home / news** — team blog posts with individual post pages.
- **Responsive UI** — mobile navigation and layouts via Tailwind CSS.

## Tech stack

| Area        | Choice |
|-------------|--------|
| Framework   | Next.js 15 (App Router, React 18, TypeScript) |
| Data access | Prisma ORM |
| Database    | Microsoft SQL Server (hosted on AWS RDS) |
| Images      | Cloudinary (`next-cloudinary`) |
| Charts      | Recharts |
| Styling     | Tailwind CSS, Bootstrap, CSS modules |
| Validation  | Zod |

## Architecture

```
Browser (React client components)
   │  fetch()
   ▼
Next.js Route Handlers  (app/api/**)
   │  Prisma Client
   ▼
SQL Server database  (Athletes, Events, Performances, Bests, Rankings, …)

Athlete photos are served from Cloudinary via public image URLs.
```

- Pages under `app/` are mostly client components that fetch from the JSON API routes under `app/api/`.
- API routes are **read-only** (`GET`) and use Prisma with typed, parameterized queries and basic input validation.
- The data model lives in [`prisma/schema.prisma`](prisma/schema.prisma).

## Project structure

```
app/
  api/            Route handlers (athlete, roster, events, home)
  athlete/        Athlete picker + individual athlete pages
  roster/         Team roster
  events/         Event bests & qualifying standards
  home/           News posts + post detail
  layout.tsx      Root layout + navbar
components/        Navbar and shared UI
prisma/            Prisma schema (SQL Server)
public/            Logo, favicons
```

## Getting started

### Prerequisites
- Node.js 18.18+ (Node 20 recommended)
- Access to a SQL Server database matching `prisma/schema.prisma`
- A Cloudinary account (for athlete images)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env      # then edit .env with your real values

# 3. Generate the Prisma client
npx prisma generate

# 4. Run the dev server
npm run dev
```

Open http://localhost:3000 (the root path redirects to `/home`).

### Environment variables

See [`.env.example`](.env.example). Copy it to `.env` (which is git-ignored) and fill in:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Prisma SQL Server connection string. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name used to build public image URLs (exposed to the browser by design). |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Deployment

Designed for deployment on Vercel. Set the environment variables above in the hosting dashboard and ensure the database is reachable from the deployment environment.

## Status & roadmap

Actively maintained personal project. Current data is read-only; possible future work includes an authenticated admin flow for editing results, automated data ingestion, and test coverage.

## Author

Built by [Mick Barbi](https://github.com/MickBarbi).

## License

Released under the [MIT License](LICENSE).
