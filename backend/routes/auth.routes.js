const express = require('express');
const controller = require('../controllers/auth.controller');
const { authLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', authLimiter, controller.register);
router.post('/login', authLimiter, controller.login);
router.post('/logout', requireAuth, controller.logout);
router.get('/me', requireAuth, controller.me);

module.exports = router;