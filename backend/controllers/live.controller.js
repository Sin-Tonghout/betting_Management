const liveService = require('../services/live.service');

const fail = (res, err) => {
  console.error(err);
  return res.status(500).json({ message: 'Something went wrong.' });
};

const toScore = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 999 ? n : null;
};

exports.list = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const [live, startable] = await Promise.all([
      liveService.listLive(userId),
      liveService.listStartable(userId),
    ]);
    res.json({ data: { live, startable } });
  } catch (err) { fail(res, err); }
};

exports.start = async (req, res) => {
  try {
    const ok = await liveService.start(req.session.user.id, Number(req.params.id));
    if (!ok) return res.status(404).json({ message: 'Bet not found or not pending.' });
    res.json({ data: { id: Number(req.params.id) } });
  } catch (err) { fail(res, err); }
};

exports.update = async (req, res) => {
  try {
    const home = toScore(req.body.home_score);
    const away = toScore(req.body.away_score);
    const minute = String(req.body.live_minute || '').trim().slice(0, 10);
    if (home === null || away === null) {
      return res.status(400).json({ message: 'Scores must be whole numbers from 0 to 999.' });
    }
    const ok = await liveService.updateScore(
      req.session.user.id, Number(req.params.id),
      { home_score: home, away_score: away, live_minute: minute }
    );
    if (!ok) return res.status(404).json({ message: 'Live bet not found.' });
    res.json({ data: { id: Number(req.params.id) } });
  } catch (err) { fail(res, err); }
};

exports.settle = async (req, res) => {
  try {
    const { result } = req.body;
    if (!['won', 'lost', 'void'].includes(result)) {
      return res.status(400).json({ message: 'Result must be won, lost or void.' });
    }
    const ok = await liveService.settle(req.session.user.id, Number(req.params.id), result);
    if (!ok) return res.status(404).json({ message: 'Live bet not found.' });
    res.json({ data: { id: Number(req.params.id), result } });
  } catch (err) { fail(res, err); }
};