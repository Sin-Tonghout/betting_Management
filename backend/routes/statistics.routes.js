const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/statistics.controller');

const router = express.Router();
router.use(requireAuth);
router.get('/', ctrl.get);

module.exports = router;