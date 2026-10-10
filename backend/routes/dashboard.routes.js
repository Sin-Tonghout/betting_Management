const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const dashboardController = require('../controllers/dashboard.controller');
const chartsController = require('../controllers/charts.controller');

// alongside the existing GET /summary route:
router.get('/charts', requireAuth, chartsController.getCharts);

router.get('/summary', requireAuth, dashboardController.getSummary);

module.exports = router;