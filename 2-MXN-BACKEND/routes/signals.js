const express = require('express');
const router = express.Router();
const signalsController = require('../controllers/signalsController');

router.post('/mxn',         signalsController.generateMXNSignals);
router.get('/upcoming',     signalsController.getUpcomingSignals);
router.post('/clear-cache', signalsController.clearCache);

// Only add status/refresh if controller supports them
if (signalsController.getCacheStatus) {
  router.get('/status', signalsController.getCacheStatus);
}
if (signalsController.forceRefresh) {
  router.post('/refresh', signalsController.forceRefresh);
}

module.exports = router;
