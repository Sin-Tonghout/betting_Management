const chartsService = require('../services/charts.service');

function sessionUserId(req) {
  return req.session?.user?.id ?? req.session?.userId ?? req.user?.id;
}

exports.getCharts = async (req, res, next) => {
  try {
    const userId = sessionUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const data = await chartsService.getCharts(userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};