# API Reference

Base: `/api` · Auth: session cookie unless marked public · `*` = admin/superadmin only

## Auth
| Method | Path | Notes |
|---|---|---|
| POST | /auth/register | public |
| POST | /auth/login | public |
| POST | /auth/logout | |
| GET | /auth/me | current session user |

## Bets
| Method | Path | Notes |
|---|---|---|
| GET | /bets | filters: sport, league, status, date range, search, page |
| POST | /bets | auto-computes potential_return, profit_loss |
| GET | /bets/:id | |
| PUT | /bets/:id | |
| DELETE | /bets/:id | |

## Live Bets
| Method | Path |
|---|---|
| GET | /live-bets |
| POST | /live-bets |
| PUT | /live-bets/:id |

## Sports / Leagues / Categories
| Method | Path | Notes |
|---|---|---|
| GET | /sports | |
| GET | /sports/:id/stats | per-sport performance |
| GET | /leagues?sport_id= | |
| GET/POST/PUT/DELETE | /categories | * |

## Statistics
| Method | Path |
|---|---|
| GET | /stats/overview |
| GET | /stats/profit-loss?range= |
| GET | /stats/sport-performance |
| GET | /stats/odds-distribution |

## Calendar
| Method | Path |
|---|---|
| GET | /calendar?month=&year= |

## Admin *
| Method | Path |
|---|---|
| GET | /admin/users |
| PUT | /admin/users/:id | role/status |
| GET | /admin/bets |
| GET | /admin/reports |
| GET | /admin/audit-logs |