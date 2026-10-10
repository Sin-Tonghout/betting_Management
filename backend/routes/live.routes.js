const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/live.controller');

const router = express.Router();
router.use(requireAuth);

router.get('/', ctrl.list);
router.post('/:id/start', ctrl.start);
router.patch('/:id', ctrl.update);
router.post('/:id/settle', ctrl.settle);

module.exports = router;