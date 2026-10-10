const statsService = require('../services/statistics.service');

exports.get = async (req, res) => {
  try {
    const range = String(req.query.range || '30d');
    const resolved = statsService.resolveRange(range, req.query.from, req.query.to);
    if (!resolved) {
      return res.status(400).json({ message: 'Invalid date range.' });
    }
    const data = await statsService.getStatistics(req.session.user.id, resolved);
    res.json({ data: { range: resolved, ...data } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};