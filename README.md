# Sports Bet Management

A personal sports-betting history & analytics dashboard for recording bets, tracking profit/loss, and visualizing performance over time. Built to feel like a sports analytics product, not a gambling site.

## Tech Stack
- **Frontend:** HTML5, Bootstrap 5, Vanilla JavaScript, CSS3
- **Backend:** ExpressJS (Node.js)
- **Database:** MySQL (local via Ampps)
- **Auth:** express-session with secure cookies
- **API:** REST

## Core Features
- Role-based auth (User / Admin / Super Admin)
- Bet history CRUD — search, filter, sort, pagination
- Live bet tracking
- Dashboard analytics (profit/loss trend, win/loss ratio, sport performance, odds distribution)
- Calendar view of betting activity
- Sports & bet-category management
- Khmer / English localization
- Light / Dark theme
- Subtle canvas-based animated background
- Admin panel (users, bets, reports, audit logs)
- Mobile-first responsive design

## Getting Started (local dev)
1. Install Ampps, start MySQL (password: `mysql`)
2. Copy `.env.example` → `.env`, fill in DB + session values
3. `npm install`
4. Run migrations in `database/migrations`
5. `npm run dev`
6. Visit `http://localhost:3000`

## Documentation
| File | Covers |
|---|---|
| `ARCHITECTURE.md` | System design, folder structure, request/auth flow |
| `DATABASE.md` | Schema, tables, relationships, indexes |
| `DESIGN_SYSTEM.md` | Colors, typography, spacing, components |
| `API.md` | REST endpoint reference |
| `ROADMAP.md` | Phased build plan & timeline |

## License
Private project.