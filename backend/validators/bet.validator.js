const RESULTS = ['pending', 'won', 'lost', 'void'];
const LIVE_STATUSES = ['upcoming', 'live'];
const BET_TYPES = [
  'match_winner', 'over_under', 'handicap', 'both_teams_score',
  'correct_score', 'double_chance', 'other',
];

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const str = (v) => (typeof v === 'string' ? v.trim() : '');

function isRealDate(ymd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function optionalScore(value, field, errors) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 999) { errors[field] = 'invalid'; return null; }
  return n;
}

/**
 * Validates a bet payload and derives the calculated fields.
 * Returns { errors, value }. `errors` is { field: code } — codes are translated on the client.
 */
function validateBet(body) {
  const b = body || {};
  const errors = {};

  const sportId = Number(b.sportId);
  if (!Number.isInteger(sportId) || sportId <= 0) errors.sportId = 'required';

  const categoryId = b.categoryId === '' || b.categoryId == null ? null : Number(b.categoryId);
  if (categoryId !== null && (!Number.isInteger(categoryId) || categoryId <= 0)) errors.categoryId = 'invalid';

  const league = str(b.league);
  if (league.length > 100) errors.league = 'max';

  const homeTeam = str(b.homeTeam);
  if (!homeTeam) errors.homeTeam = 'required';
  else if (homeTeam.length > 100) errors.homeTeam = 'max';

  const awayTeam = str(b.awayTeam);
  if (!awayTeam) errors.awayTeam = 'required';
  else if (awayTeam.length > 100) errors.awayTeam = 'max';

  const betType = str(b.betType);
  if (!BET_TYPES.includes(betType)) errors.betType = betType ? 'invalid' : 'required';

  const selection = str(b.selection);
  if (!selection) errors.selection = 'required';
  else if (selection.length > 150) errors.selection = 'max';

  const odds = Number(b.odds);
  if (b.odds === '' || b.odds == null || Number.isNaN(odds)) errors.odds = 'required';
  else if (odds <= 1) errors.odds = 'oddsMin';
  else if (odds > 99999) errors.odds = 'max';

  const stake = Number(b.stake);
  if (b.stake === '' || b.stake == null || Number.isNaN(stake)) errors.stake = 'required';
  else if (stake <= 0) errors.stake = 'stakeMin';
  else if (stake > 9999999999) errors.stake = 'max';

  const betDate = str(b.betDate);
  if (!betDate) errors.betDate = 'required';
  else if (!isRealDate(betDate)) errors.betDate = 'invalid';

  const result = b.result || 'pending';
  if (!RESULTS.includes(result)) errors.result = 'invalid';

  const homeScore = optionalScore(b.homeScore, 'homeScore', errors);
  const awayScore = optionalScore(b.awayScore, 'awayScore', errors);

  const notes = str(b.notes);
  if (notes.length > 2000) errors.notes = 'max';

  if (Object.keys(errors).length) return { errors, value: null };

  // Derived fields — always computed on the server, never trusted from the client.
  const potentialReturn = round2(stake * odds);
  let profitLoss = 0;
  if (result === 'won') profitLoss = round2(potentialReturn - stake);
  else if (result === 'lost') profitLoss = round2(-stake);

  // A settled result means the bet is settled; otherwise upcoming/live.
  const status = result === 'pending'
    ? (LIVE_STATUSES.includes(b.status) ? b.status : 'upcoming')
    : 'settled';

  return {
    errors: null,
    value: {
      sportId, categoryId, league: league || null,
      matchTitle: `${homeTeam} vs ${awayTeam}`,
      homeTeam, awayTeam, homeScore, awayScore,
      betType, selection,
      odds: round2(odds), stake: round2(stake),
      potentialReturn, result, profitLoss,
      betDate, status, notes: notes || null,
    },
  };
}

module.exports = { validateBet, BET_TYPES, RESULTS };
