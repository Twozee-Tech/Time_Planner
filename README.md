# Time Planner

Web application for team resource/capacity planning and project assignments. Replaces manual Excel spreadsheets for tracking who works on what, when, and at what capacity.

## Features

- **Dashboard** — weekly calendar view with all team members, auto-grayed weekends and Polish holidays
- **Individual calendar** — click a person to open a monthly calendar with drag-select on days
- **Project assignment** — side panel with fuzzy-searchable project list, checkboxes, primary project marker, workload color coding (red/yellow/green)
- **Project management** — create, edit, deactivate projects (ID, name, label)
- **People management** — create, edit, assign SDM, organize by sections
- **User management** — admin panel: create accounts, edit, reset passwords, delete
- **Password change** — any user can change their own password from the sidebar
- **Authentication** — NextAuth with JWT, ADMIN/USER roles
- **Amplitiv branding** — SVG logo, video background on login page

## Tech Stack

- **Frontend:** Next.js 16, React 19, TailwindCSS, shadcn/ui, TanStack Query
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL 16
- **Auth:** NextAuth.js (JWT)
- **Containerization:** Docker + Docker Compose

## Requirements

- Docker + Docker Compose
- Git

## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/Twozee-Tech/Time_Planner/main/install.sh | bash
```

This will clone the repo to `~/Time_Planner`, build the containers, and start the app on **port 3500**.

### Default credentials

- **Email:** `admin@amplitiv.com`
- **Password:** `admin123`

> Change the password after first login (key icon in the sidebar).

## Update

```bash
cd ~/Time_Planner
git pull
docker compose up --build -d
```

All data (users, assignments, projects) is stored in a Docker volume and **will not be overwritten** on update.

## Configuration

### Port

Default: `3500`. Change in `docker-compose.yml`:

```yaml
ports:
  - "3500:3000"  # change 3500 to desired port
```

### Domain (reverse proxy)

Example Caddy config:

```
planner.example.com {
    reverse_proxy localhost:3500 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
    }
}
```

Set `NEXTAUTH_URL` in `docker-compose.yml` to match:

```yaml
NEXTAUTH_URL: "https://planner.example.com"
```

### NEXTAUTH_SECRET

For production, replace the default secret in `docker-compose.yml`:

```bash
openssl rand -base64 32
```

## Stop

```bash
cd ~/Time_Planner
docker compose down
```

## Resource Usage

| Component | RAM | Image Size |
|-----------|-----|------------|
| App (Next.js) | ~55 MB | ~1.2 GB |
| DB (PostgreSQL) | ~55 MB | ~276 MB |
| **Total** | **~110 MB** | **~1.5 GB** |

Runs comfortably on a 1 GB RAM VPS.
