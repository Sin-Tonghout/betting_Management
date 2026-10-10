const pool = require('../config/db');

const BASE = `
  SELECT b.id, b.league, b.match_title, b.home_team, b.away_team,
         b.bet_type, b.selection, b.odds, b.stake, b.potential_return,
         b.home_score, b.away_score, b.live_minute, b.bet_date,
         s.name AS sport_name, s.slug AS sport_slug
  FROM bets b
  JOIN sports s ON s.id = b.sport_id`;

async function listLive(userId) {
  const [rows] = await pool.query(
    `${BASE} WHERE b.user_id = ? AND b.is_live = 1 AND b.result = 'pending'
     ORDER BY b.updated_at DESC`,
    [userId]
  );
  return rows;
}

async function listStartable(userId) {
  const [rows] = await pool.query(
    `${BASE} WHERE b.user_id = ? AND b.is_live = 0 AND b.result = 'pending'
     ORDER BY b.bet_date DESC LIMIT 50`,
    [userId]
  );
  return rows;
}

async function start(userId, id) {
  const [r] = await pool.query(
    `UPDATE bets
     SET is_live = 1,
         home_score = COALESCE(home_score, 0),
         away_score = COALESCE(away_score, 0)
     WHERE id = ? AND user_id = ? AND result = 'pending' AND is_live = 0`,
    [id, userId]
  );
  return r.affectedRows > 0;
}

async function updateScore(userId, id, { home_score, away_score, live_minute }) {
  const [r] = await pool.query(
    `UPDATE bets SET home_score = ?, away_score = ?, live_minute = ?
     WHERE id = ? AND user_id = ? AND is_live = 1 AND result = 'pending'`,
    [home_score, away_score, live_minute || null, id, userId]
  );
  return r.affectedRows > 0;
}

async function settle(userId, id, result) {
  const [rows] = await pool.query(
    `SELECT stake, odds FROM bets
     WHERE id = ? AND user_id = ? AND is_live = 1 AND result = 'pending'`,
    [id, userId]
  );
  if (!rows.length) return false;

  const stake = Number(rows[0].stake);
  const odds = Number(rows[0].odds);
  const potentialReturn = Math.round(stake * odds * 100) / 100;

  let profitLoss = 0;
  if (result === 'won') profitLoss = Math.round((potentialReturn - stake) * 100) / 100;
  if (result === 'lost') profitLoss = -stake;

  await pool.query(
    `UPDATE bets
     SET result = ?, profit_loss = ?, potential_return = ?, is_live = 0
     WHERE id = ? AND user_id = ?`,
    [result, profitLoss, potentialReturn, id, userId]
  );
  return true;
}

module.exports = { listLive, listStartable, start, updateScore, settle };