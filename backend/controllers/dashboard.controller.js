const dashboardService = require('../services/dashboard.service');

// Adjust this one helper if your login stores the user id differently.
function sessionUserId(req) {
  return req.session?.user?.id ?? req.session?.userId ?? req.user?.id;
}

exports.getSummary = async (req, res, next) => {
  try {
    const userId = sessionUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const data = await dashboardService.getSummary(userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};