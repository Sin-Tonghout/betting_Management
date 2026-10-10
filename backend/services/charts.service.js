const pool = require('../config/db');
const db = typeof pool.promise === 'function' ? pool.promise() : pool;

const DAYS = 30;

function toKey(d) {
  return new Date(d).toISOString().slice(0, 10);
}

async function getCharts(userId) {
  // 1. Daily profit/loss + stake for the last 30 days (settled bets only)
  const [dailyRows] = await db.query(
    `SELECT DATE(bet_date) AS day,
            COALESCE(SUM(profit_loss), 0) AS profit,
            COALESCE(SUM(stake), 0)       AS stake,
            COUNT(*)                      AS bets
       FROM bets
      WHERE user_id = ?
        AND result IN ('won','lost')
        AND bet_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(bet_date)`,
    [userId, DAYS - 1]
  );
  const byDay = new Map(dailyRows.map((r) => [toKey(r.day), r]));
  const trend = [];
  let cumulative = 0;
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = toKey(new Date(d.getTime() - d.getTimezoneOffset() * 60000));
    const row = byDay.get(key);
    const profit = row ? Number(row.profit) : 0;
    cumulative += profit;
    trend.push({
      date: key,
      profit,
      stake: row ? Number(row.stake) : 0,
      bets: row ? Number(row.bets) : 0,
      cumulative: Math.round(cumulative * 100) / 100,
    });
  }

  // 2. Outcome counts
  const [outcomeRows] = await db.query(
    `SELECT result, COUNT(*) AS total FROM bets WHERE user_id = ? GROUP BY result`,
    [userId]
  );
  const outcome = { won: 0, lost: 0, pending: 0, void: 0 };
  outcomeRows.forEach((r) => { outcome[r.result] = Number(r.total); });

  // 3. Sport performance
  const [sportRows] = await db.query(
    `SELECT s.name, s.slug,
            COUNT(b.id)                          AS bets,
            SUM(b.result = 'won')                AS wins,
            SUM(b.result = 'lost')               AS losses,
            COALESCE(SUM(b.profit_loss), 0)      AS profit
       FROM bets b
       JOIN sports s ON s.id = b.sport_id
      WHERE b.user_id = ?
      GROUP BY s.id, s.name, s.slug
      ORDER BY bets DESC`,
    [userId]
  );
  const sports = sportRows.map((r) => {
    const wins = Number(r.wins), losses = Number(r.losses);
    return {
      name: r.name,
      slug: r.slug,
      bets: Number(r.bets),
      wins,
      losses,
      winRate: wins + losses ? Math.round((wins / (wins + losses)) * 1000) / 10 : 0,
      profit: Number(r.profit),
    };
  });

  // 4. Odds distribution
  const [oddsRows] = await db.query(
    `SELECT CASE
              WHEN odds <= 1.50 THEN 'a'
              WHEN odds <= 2.00 THEN 'b'
              WHEN odds <= 3.00 THEN 'c'
              ELSE 'd'
            END AS bucket,
            COUNT(*) AS total
       FROM bets
      WHERE user_id = ?
      GROUP BY bucket`,
    [userId]
  );
  const labels = { a: '1.20–1.50', b: '1.51–2.00', c: '2.01–3.00', d: '3.01+' };
  const oddsMap = Object.fromEntries(oddsRows.map((r) => [r.bucket, Number(r.total)]));
  const odds = Object.keys(labels).map((k) => ({ label: labels[k], total: oddsMap[k] || 0 }));

  return { trend, outcome, sports, odds };
}

module.exports = { getCharts };