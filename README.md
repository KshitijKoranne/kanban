# ◈ KanFlow

A bold, colorful Kanban board for side project & dev task tracking. Built with Next.js 14, Turso (SQLite at edge), and Tailwind CSS v4.

![KanFlow](https://img.shields.io/badge/KanFlow-Dev%20Task%20Board-6C5CE7?style=for-the-badge)

## Features

- **Drag & Drop** — Reorder cards and columns with smooth drag interactions
- **Multiple Boards** — Organize by project with customizable backgrounds
- **Labels & Priority** — 10 built-in dev labels (Bug, Feature, etc.) + 5 priority levels
- **Due Dates** — Track deadlines with overdue highlighting
- **Checklists** — Break tasks into subtasks with progress tracking
- **Card Covers** — Color-code cards for visual scanning
- **Activity Log** — Track all board changes
- **Fully Responsive** — Works on mobile, tablet, and desktop
- **Edge Database** — Turso for fast, globally distributed data

## Tech Stack

- **Framework**: Next.js 14 (App Router, Server Actions)
- **Database**: Turso (libsql — SQLite at the edge)
- **Drag & Drop**: @hello-pangea/dnd
- **Styling**: Tailwind CSS v4
- **Fonts**: Satoshi + Geist
- **Deploy**: Vercel

## Setup

### 1. Clone & Install

```bash
git clone <your-repo>
cd kanflow
npm install
```

### 2. Create Turso Database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Sign up / Login
turso auth signup   # or: turso auth login

# Create database
turso db create kanflow

# Get your credentials
turso db show kanflow --url
turso db tokens create kanflow
```

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Turso credentials:

```
TURSO_DATABASE_URL=libsql://kanflow-yourorg.turso.io
TURSO_AUTH_TOKEN=your-token-here
```

### 4. Run

```bash
npm run dev
```

The database tables are created automatically on first request.

## Deploy to Vercel

1. Push to GitHub
2. Import in [Vercel](https://vercel.com/new)
3. Add environment variables:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
4. Deploy

## Project Structure

```
src/
├── app/
│   ├── globals.css          # Tailwind v4 + design tokens
│   ├── layout.tsx           # Root layout with fonts
│   ├── page.tsx             # Home — board listing
│   └── board/[id]/page.tsx  # Board view (server component)
├── actions/
│   └── board-actions.ts     # All server actions (CRUD)
├── components/
│   ├── board-client.tsx     # Main kanban board (client)
│   └── home-client.tsx      # Home page interactions
└── lib/
    ├── db.ts                # Turso client + schema
    └── types.ts             # TypeScript types
```

## License

MIT
