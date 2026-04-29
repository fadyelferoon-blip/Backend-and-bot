const express = require('express');
const router = express.Router();
const signalsController = require('../controllers/signalsController');

router.post('/mxn',         signalsController.generateMXNSignals);
router.get('/upcoming',     signalsController.getUpcomingSignals);
router.get('/status',       signalsController.getCacheStatus);
router.post('/clear-cache', signalsController.clearCache);
router.post('/refresh',     signalsController.forceRefresh);

module.exports = router;
