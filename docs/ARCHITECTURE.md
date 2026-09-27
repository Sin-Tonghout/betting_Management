# Architecture

## 1. System Overview

```
User Browser
     │ HTTPS
     ▼
ExpressJS (REST API + session auth)
     │
     ▼
MySQL
```

Frontend (Bootstrap/Vanilla JS) is a set of static pages served independently and talks to the Express API over REST. Auth state lives server-side in an express-session store, not in a JWT.

## 2. User Roles & Permissions

| Role | Access |
|---|---|
| User | Own bets, own dashboard/stats, profile, settings |
| Admin | All users' bet data (read), manage sports/leagues/categories, reports, audit logs, suspend users |
| Super Admin | Everything Admin has, plus managing admin roles and system settings |

## 3. Folder Structure

```
betting-management/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── validators/
│   ├── utils/
│   ├── app.js
│   └── server.js
├── frontend/
│   ├── pages/
│   ├── components/
│   ├── css/
│   ├── js/
│   └── assets/
├── database/
│   ├── migrations/
│   └── seeds/
├── translations/
│   ├── en.js
│   └── kh.js
├── .env
├── .env.example
└── package.json
```

## 4. Request Flow — example: creating a bet

```
Form submit
   → POST /api/bets
   → session auth middleware
   → validator
   → controller
   → service (calculates potential_return, profit_loss)
   → model (MySQL insert)
   → JSON response
   → frontend updates dashboard stats
```

## 5. Auth Flow

```
Login → validate input → find user → bcrypt.compare()
      → create session → redirect by role
```

## 6. Cross-Cutting Systems
- **Theme system** — `data-theme="light|dark"` on `<html>`, preference stored in `localStorage`, single CSS variable set overridden per theme (no duplicate stylesheets).
- **Language system** — `translations/en.js` and `translations/kh.js` key/value maps, active language stored in `localStorage`.
- **Animated background** — Canvas particles in `frontend/js/animation.js`; disabled/reduced when `prefers-reduced-motion: reduce`.

## 7. Responsive Breakpoints

| Name | Min width | Layout |
|---|---:|---|
| Mobile | 0 | Top navbar + offcanvas sidebar, tables → cards |
| Tablet | 768px | Same as mobile, more columns |
| Desktop | 992px | Sidebar + top navbar + content |
| Large Desktop | 1200px | Wider content grid |
| Extra Large | 1400px | Max-width container |

## 8. Security Requirements
bcrypt password hashing · express-session with secure/httpOnly cookies · helmet HTTP headers · input validation on every write endpoint · parameterized queries only · XSS output escaping · CSRF protection on state-changing requests · express-rate-limit on auth routes · role-based authorization middleware on every protected route · all secrets in `.env`, never in frontend code.