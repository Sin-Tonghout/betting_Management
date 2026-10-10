const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const controller = require('../controllers/bet.controller');

router.use(requireAuth);

router.get('/meta', controller.meta);   // keep before '/:id'
router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.get);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
