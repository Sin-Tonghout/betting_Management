const db = require('../config/db');
const raw = db.pool || db;
// config/db.js may expose the callback pool; use the promise wrapper either way
const pool = typeof raw.promise === 'function' ? raw.promise() : raw;
const { BET_TYPES } = require('../validators/bet.validator');

const SORTS = {
  date: 'b.bet_date',
  odds: 'b.odds',
  stake: 'b.stake',
  profit: 'b.profit_loss',
  created: 'b.created_at',
};

const SELECT = `
  SELECT b.id, b.sport_id, s.slug AS sport_slug, s.name AS sport_name,
         b.category_id, b.league, b.match_title, b.home_team, b.away_team,
         b.home_score, b.away_score, b.bet_type, b.selection, b.odds, b.stake,
         b.potential_return, b.result, b.profit_loss, b.status, b.notes,
         DATE_FORMAT(b.bet_date, '%Y-%m-%d') AS bet_date
    FROM bets b
    JOIN sports s ON s.id = b.sport_id`;

function toBet(r) {
  return {
    id: r.id,
    sportId: r.sport_id,
    sportSlug: r.sport_slug,
    sportName: r.sport_name,
    categoryId: r.category_id,
    league: r.league,
    matchTitle: r.match_title,
    homeTeam: r.home_team,
    awayTeam: r.away_team,
    homeScore: r.home_score,
    awayScore: r.away_score,
    betType: r.bet_type,
    selection: r.selection,
    odds: Number(r.odds),
    stake: Number(r.stake),
    potentialReturn: Number(r.potential_return),
    result: r.result,
    profitLoss: Number(r.profit_loss),
    status: r.status,
    notes: r.notes,
    betDate: r.bet_date,
  };
}

const intOr = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : d; };
const numOrNull = (v) => { if (v === '' || v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const ymdOrNull = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/* ---------- List ---------- */

async function list(userId, q) {
  const where = ['b.user_id = ?'];
  const params = [userId];

  const search = (q.search || '').trim().slice(0, 100);
  if (search) {
    const like = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    where.push(`(b.match_title LIKE ? OR b.home_team LIKE ? OR b.away_team LIKE ?
                 OR b.league LIKE ? OR b.selection LIKE ?)`);
    params.push(like, like, like, like, like);
  }
  const sportId = intOr(q.sport, null);
  if (sportId) { where.push('b.sport_id = ?'); params.push(sportId); }
  if (q.league) { where.push('b.league = ?'); params.push(String(q.league).slice(0, 100)); }
  if (['pending', 'won', 'lost', 'void'].includes(q.result)) { where.push('b.result = ?'); params.push(q.result); }
  if (BET_TYPES.includes(q.betType)) { where.push('b.bet_type = ?'); params.push(q.betType); }
  const from = ymdOrNull(q.dateFrom);
  const to = ymdOrNull(q.dateTo);
  if (from) { where.push('b.bet_date >= ?'); params.push(`${from} 00:00:00`); }
  if (to) { where.push('b.bet_date <= ?'); params.push(`${to} 23:59:59`); }
  const minStake = numOrNull(q.minStake);
  const maxStake = numOrNull(q.maxStake);
  if (minStake !== null) { where.push('b.stake >= ?'); params.push(minStake); }
  if (maxStake !== null) { where.push('b.stake <= ?'); params.push(maxStake); }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const sortCol = SORTS[q.sort] || SORTS.date;
  const dir = q.dir === 'asc' ? 'ASC' : 'DESC';
  const pageSize = Math.min(intOr(q.pageSize, 10), 50);
  const page = intOr(q.page, 1);

  const [[totals]] = await pool.query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(b.stake), 0)       AS total_stake,
            COALESCE(SUM(b.profit_loss), 0) AS total_profit
       FROM bets b ${whereSql}`,
    params
  );

  const total = Number(totals.total);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages);

  const [rows] = await pool.query(
    `${SELECT} ${whereSql}
     ORDER BY ${sortCol} ${dir}, b.id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (safePage - 1) * pageSize]
  );

  return {
    items: rows.map(toBet),
    pagination: { page: safePage, pageSize, total, pages },
    summary: { totalStake: Number(totals.total_stake), totalProfit: Number(totals.total_profit) },
  };
}

/* ---------- Meta (form + filter options) ---------- */

async function meta(userId) {
  const [sports] = await pool.query(`SELECT id, name, slug FROM sports WHERE status = 'active' ORDER BY id`);
  const [leagues] = await pool.query(`SELECT id, sport_id, name FROM leagues WHERE status = 'active' ORDER BY name`);
  const [categories] = await pool.query(`SELECT id, name FROM bet_categories WHERE status = 'active' ORDER BY name`);
  // Leagues the user typed themselves also show up in the filter
  const [used] = await pool.query(
    `SELECT DISTINCT sport_id, league FROM bets WHERE user_id = ? AND league IS NOT NULL AND league <> ''`,
    [userId]
  );
  return {
    sports,
    leagues: leagues.map((l) => ({ id: l.id, sportId: l.sport_id, name: l.name })),
    usedLeagues: used.map((u) => ({ sportId: u.sport_id, name: u.league })),
    categories,
    betTypes: BET_TYPES,
  };
}

/* ---------- Single ---------- */

async function getById(userId, id) {
  const [rows] = await pool.query(`${SELECT} WHERE b.id = ? AND b.user_id = ?`, [id, userId]);
  return rows[0] ? toBet(rows[0]) : null;
}

async function sportExists(id) {
  const [rows] = await pool.query(`SELECT id FROM sports WHERE id = ? AND status = 'active'`, [id]);
  return rows.length > 0;
}

async function categoryExists(id) {
  const [rows] = await pool.query(`SELECT id FROM bet_categories WHERE id = ?`, [id]);
  return rows.length > 0;
}

const COLS = [
  'sport_id', 'category_id', 'league', 'match_title', 'home_team', 'away_team',
  'home_score', 'away_score', 'bet_type', 'selection', 'odds', 'stake',
  'potential_return', 'result', 'profit_loss', 'bet_date', 'status', 'notes',
];

function values(v) {
  return [
    v.sportId, v.categoryId, v.league, v.matchTitle, v.homeTeam, v.awayTeam,
    v.homeScore, v.awayScore, v.betType, v.selection, v.odds, v.stake,
    v.potentialReturn, v.result, v.profitLoss, `${v.betDate} 00:00:00`, v.status, v.notes,
  ];
}

async function create(userId, v) {
  const [res] = await pool.query(
    `INSERT INTO bets (user_id, ${COLS.join(', ')}) VALUES (?, ${COLS.map(() => '?').join(', ')})`,
    [userId, ...values(v)]
  );
  return getById(userId, res.insertId);
}

async function update(userId, id, v) {
  const [res] = await pool.query(
    `UPDATE bets SET ${COLS.map((c) => `${c} = ?`).join(', ')} WHERE id = ? AND user_id = ?`,
    [...values(v), id, userId]
  );
  if (!res.affectedRows) return null;
  return getById(userId, id);
}

async function remove(userId, id) {
  const [res] = await pool.query('DELETE FROM bets WHERE id = ? AND user_id = ?', [id, userId]);
  return res.affectedRows > 0;
}

module.exports = { list, meta, getById, create, update, remove, sportExists, categoryExists };
