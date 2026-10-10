const pool = require('../config/db');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const num = (v) => Number(v) || 0;
const round2 = (v) => Math.round(num(v) * 100) / 100;
const rate = (w, l) => (w + l > 0 ? Math.round((w / (w + l)) * 1000) / 10 : 0);

function resolveRange(range, from, to) {
  if (range === 'custom') {
    if (!DATE_RE.test(from || '') || !DATE_RE.test(to || '')) return null;
    const a = new Date(from);
    const b = new Date(to);
    if (isNaN(a) || isNaN(b) || from > to) return null;
    if ((b - a) / 86400000 > 1830) return null; // max ~5 years
    return { from, to };
  }

  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);

  switch (range) {
    case 'today': break;
    case '7d': start.setDate(start.getDate() - 6); break;
    case '30d': start.setDate(start.getDate() - 29); break;
    case '3m': start.setMonth(start.getMonth() - 3); break;
    case '6m': start.setMonth(start.getMonth() - 6); break;
    case '1y': start.setFullYear(start.getFullYear() - 1); break;
    default: return null;
  }
  return { from: fmt(start), to: fmt(end) };
}

const WHERE = `b.user_id = ? AND b.bet_date >= ? AND b.bet_date < DATE_ADD(?, INTERVAL 1 DAY)`;

function shapeGroup(r) {
  const won = num(r.won);
  const lost = num(r.lost);
  return {
    name: r.name,
    slug: r.slug || null,
    bets: num(r.bets),
    won,
    lost,
    profit: round2(r.profit),
    winRate: rate(won, lost),
  };
}

async function getStatistics(userId, { from, to }) {
  const p = [userId, from, to];
  const q = (sql) => pool.query(sql, p).then(([rows]) => rows);

  const groupCols = `
    COUNT(*) AS bets,
    COALESCE(SUM(b.result = 'won'), 0) AS won,
    COALESCE(SUM(b.result = 'lost'), 0) AS lost,
    COALESCE(SUM(b.profit_loss), 0) AS profit`;

  const [summary, daily, monthly, sport, league, betType, odds] = await Promise.all([
    q(`SELECT COUNT(*) AS bets,
         COALESCE(SUM(b.result = 'won'), 0) AS won,
         COALESCE(SUM(b.result = 'lost'), 0) AS lost,
         COALESCE(SUM(b.result = 'void'), 0) AS voided,
         COALESCE(SUM(b.result = 'pending'), 0) AS pending,
         COALESCE(SUM(CASE WHEN b.result IN ('won','lost') THEN b.stake ELSE 0 END), 0) AS stake,
         COALESCE(SUM(CASE WHEN b.result = 'won' THEN b.potential_return ELSE 0 END), 0) AS returned,
         COALESCE(SUM(b.profit_loss), 0) AS profit,
         COALESCE(AVG(b.odds), 0) AS avg_odds
       FROM bets b WHERE ${WHERE}`),

    q(`SELECT DATE_FORMAT(b.bet_date, '%Y-%m-%d') AS d,
         COUNT(*) AS bets,
         COALESCE(SUM(b.stake), 0) AS stake,
         COALESCE(SUM(b.profit_loss), 0) AS profit
       FROM bets b WHERE ${WHERE} GROUP BY d ORDER BY d`),

    q(`SELECT DATE_FORMAT(b.bet_date, '%Y-%m') AS m,
         COUNT(*) AS bets,
         COALESCE(SUM(b.profit_loss), 0) AS profit
       FROM bets b WHERE ${WHERE} GROUP BY m ORDER BY m`),

    q(`SELECT s.name AS name, s.slug AS slug, ${groupCols}
       FROM bets b JOIN sports s ON s.id = b.sport_id
       WHERE ${WHERE} GROUP BY s.id, s.name, s.slug ORDER BY bets DESC`),

    q(`SELECT b.league AS name, ${groupCols}
       FROM bets b
       WHERE ${WHERE} AND b.league IS NOT NULL AND b.league <> ''
       GROUP BY b.league ORDER BY bets DESC LIMIT 8`),

    q(`SELECT b.bet_type AS name, ${groupCols}
       FROM bets b
       WHERE ${WHERE} AND b.bet_type IS NOT NULL AND b.bet_type <> ''
       GROUP BY b.bet_type ORDER BY bets DESC LIMIT 8`),

    q(`SELECT CASE WHEN b.odds <= 1.50 THEN 'b1'
                   WHEN b.odds <= 2.00 THEN 'b2'
                   WHEN b.odds <= 3.00 THEN 'b3'
                   ELSE 'b4' END AS bucket,
              COUNT(*) AS bets
       FROM bets b WHERE ${WHERE} GROUP BY bucket`),
  ]);

  const s = summary[0] || {};
  const won = num(s.won);
  const lost = num(s.lost);
  const stake = round2(s.stake);
  const profit = round2(s.profit);

  const oddsMap = Object.fromEntries(odds.map((r) => [r.bucket, num(r.bets)]));

  return {
    summary: {
      bets: num(s.bets),
      won,
      lost,
      void: num(s.voided),
      pending: num(s.pending),
      winRate: rate(won, lost),
      stake,
      returned: round2(s.returned),
      profit,
      roi: stake > 0 ? Math.round((profit / stake) * 1000) / 10 : 0,
      avgOdds: round2(s.avg_odds),
    },
    daily: daily.map((r) => ({
      date: r.d, bets: num(r.bets), stake: round2(r.stake), profit: round2(r.profit),
    })),
    monthly: monthly.map((r) => ({
      month: r.m, bets: num(r.bets), profit: round2(r.profit),
    })),
    sport: sport.map(shapeGroup),
    league: league.map(shapeGroup),
    betType: betType.map(shapeGroup),
    odds: ['b1', 'b2', 'b3', 'b4'].map((k) => ({ bucket: k, bets: oddsMap[k] || 0 })),
  };
}

module.exports = { resolveRange, getStatistics };