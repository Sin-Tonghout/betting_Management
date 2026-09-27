# Database Schema

Database: `betting_management` (MySQL)

## users
| Column | Type |
|---|---|
| id | PK, int |
| name | varchar |
| email | varchar, unique |
| password_hash | varchar |
| role | enum(user, admin, superadmin) |
| status | enum(active, suspended) |
| created_at / updated_at | datetime |

## sports
id · name · slug · status · created_at · updated_at

## leagues
id · sport_id (FK → sports) · name · created_at · updated_at

## bet_categories
id · name · created_at · updated_at

## bets
| Column | Type |
|---|---|
| id | PK |
| user_id | FK → users |
| sport_id | FK → sports |
| league_id | FK → leagues, nullable |
| category_id | FK → bet_categories, nullable |
| match_title, home_team, away_team | varchar |
| bet_type, selection | varchar |
| odds | decimal(6,2) |
| stake | decimal(10,2) |
| potential_return | decimal(10,2), computed |
| result | enum(pending, won, lost, void) |
| profit_loss | decimal(10,2), computed |
| bet_date | datetime |
| status | enum(pending, live, settled) |
| notes | text |
| created_at / updated_at | datetime |

## sessions
Standard express-session MySQL store table (session_id, data, expires).

## audit_logs
id · user_id (FK, nullable) · action · target_type · target_id · meta (json) · created_at

## Relationships
- users 1—N bets
- sports 1—N leagues, sports 1—N bets
- leagues 1—N bets (optional)
- bet_categories 1—N bets (optional)

## Indexes
`users.email` · `bets.user_id` · `bets.bet_date` · `bets.status` · `bets.sport_id` · `bets.category_id`