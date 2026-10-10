const db = require('../config/db');
const raw = db.pool || db;
// config/db.js uses mysql2's callback API, so use its promise wrapper
const pool = typeof raw.promise === 'function' ? raw.promise() : raw;

const RECENT_LIMIT = 6;

async function getSummary(userId) {
  const [statsResult, recentResult, userResult] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)                              AS total_bets,
              COALESCE(SUM(result = 'won'), 0)      AS won,
              COALESCE(SUM(result = 'lost'), 0)     AS lost,
              COALESCE(SUM(result = 'pending'), 0)  AS pending,
              COALESCE(SUM(result = 'void'), 0)     AS voided,
              COALESCE(SUM(stake), 0)               AS total_stake,
              COALESCE(SUM(profit_loss), 0)         AS profit_loss
         FROM bets
        WHERE user_id = ?`,
      [userId]
    ),
    pool.query(
      `SELECT b.id, s.slug AS sport_slug, s.name AS sport_name, b.league,
              b.home_team, b.away_team, b.home_score, b.away_score,
              b.selection, b.odds, b.stake, b.result, b.profit_loss,
              DATE_FORMAT(b.bet_date, '%Y-%m-%d') AS bet_date
         FROM bets b
         JOIN sports s ON s.id = b.sport_id
        WHERE b.user_id = ?
        ORDER BY b.bet_date DESC, b.id DESC
        LIMIT ?`,
      [userId, RECENT_LIMIT]
    ),
    pool.query('SELECT name, email, role FROM users WHERE id = ?', [userId]),
  ]);

  const s = statsResult[0][0];
  const won = Number(s.won);
  const lost = Number(s.lost);
  const settled = won + lost;

  return {
    user: userResult[0][0] || null,
    stats: {
      totalBets: Number(s.total_bets),
      won,
      lost,
      pending: Number(s.pending),
      void: Number(s.voided),
      // Win rate is won / (won + lost); pending and void bets are not counted.
      winRate: settled > 0 ? Math.round((won / settled) * 1000) / 10 : null,
      totalStake: Number(s.total_stake),
      profitLoss: Number(s.profit_loss),
    },
    recentBets: recentResult[0].map((r) => ({
      id: r.id,
      sportSlug: r.sport_slug,
      sportName: r.sport_name,
      league: r.league,
      homeTeam: r.home_team,
      awayTeam: r.away_team,
      homeScore: r.home_score,
      awayScore: r.away_score,
      selection: r.selection,
      odds: Number(r.odds),
      stake: Number(r.stake),
      result: r.result,
      profitLoss: Number(r.profit_loss),
      betDate: r.bet_date,
    })),
  };
}

module.exports = { getSummary };