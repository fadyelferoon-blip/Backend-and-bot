const signalAnalyzer = require('../services/signalAnalyzer');
const timezoneConverter = require('../services/timezoneConverter');

/**
 * POST /api/signals/mxn
 */
exports.generateMXNSignals = async (req, res) => {
  try {
    const { uid, deviceId, timezone } = req.body;

    if (!uid || !deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Missing uid or deviceId'
      });
    }

    const userTimezone = timezone ? parseInt(timezone) : 2;

    console.log(`🔥 Fetching MXN signals for ${uid} (UTC+${userTimezone})`);

    // 🛡️ Timeout function (120 seconds للبوت)
    const withTimeout = (promise, ms) => {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout exceeded')), ms)
      );
      return Promise.race([promise, timeout]);
    };

    let putSignals = [];
    let callSignals = [];

    // ✅ GET PUT (120 seconds timeout)
    try {
      console.log('🔴 Fetching PUT signals... (may take 60-90s)');
      putSignals = await withTimeout(
        signalAnalyzer.generateMXNSignals('PUT'),
        120000  // 120 seconds - البوت محتاج وقت!
      );
      console.log(`✅ PUT signals: ${putSignals?.length || 0}`);
    } catch (err) {
      console.error('❌ PUT ERROR:', err.message);
    }

    // ✅ GET CALL (120 seconds timeout)
    try {
      console.log('🟢 Fetching CALL signals... (may take 60-90s)');
      callSignals = await withTimeout(
        signalAnalyzer.generateMXNSignals('CALL'),
        120000  // 120 seconds - البوت محتاج وقت!
      );
      console.log(`✅ CALL signals: ${callSignals?.length || 0}`);
    } catch (err) {
      console.error('❌ CALL ERROR:', err.message);
    }

    // تأمين arrays
    putSignals = Array.isArray(putSignals) ? putSignals : [];
    callSignals = Array.isArray(callSignals) ? callSignals : [];

    console.log(`📊 Total signals: PUT=${putSignals.length}, CALL=${callSignals.length}`);

    if (!putSignals.length && !callSignals.length) {
      console.log('⚠️  No signals available');
      return res.status(200).json({
        success: false,
        message: 'No signals available'
      });
    }

    // تحويل التوقيت
    const convertedPutSignals =
      timezoneConverter.findNextSignal(putSignals, userTimezone) || [];

    const convertedCallSignals =
      timezoneConverter.findNextSignal(callSignals, userTimezone) || [];

    const nextPut = convertedPutSignals[0];
    const nextCall = convertedCallSignals[0];

    let nextSignal = null;
    let recommendedType = null;

    if (nextPut && nextCall) {
      if (nextPut.secondsUntil < nextCall.secondsUntil) {
        nextSignal = nextPut;
        recommendedType = 'PUT';
      } else {
        nextSignal = nextCall;
        recommendedType = 'CALL';
      }
    } else {
      nextSignal = nextPut || nextCall;
      recommendedType = nextPut ? 'PUT' : 'CALL';
    }

    if (!nextSignal) {
      console.log('⚠️  No valid signals after timezone conversion');
      return res.status(200).json({
        success: false,
        message: 'No valid signals'
      });
    }

    const safeSignal = {
      pair: nextSignal?.pair || 'USD/MXN OTC',
      type: nextSignal?.type || 'UNKNOWN',
      time: nextSignal?.localTime || '--:--',
      originalTime: nextSignal?.time || '--:--',
      winrate: nextSignal?.winrate || 0,
      secondsUntil: nextSignal?.secondsUntil || 0,
      minutesUntil: nextSignal?.minutesUntil || 0,
      countdown: timezoneConverter.formatCountdown(
        nextSignal?.secondsUntil || 0
      )
    };

    console.log(`🎯 NEXT SIGNAL: ${safeSignal.type} @ ${safeSignal.time} (${safeSignal.minutesUntil}min)`);

    res.json({
      success: true,
      nextSignal: safeSignal,
      recommendedType,
      upcomingPutSignals: convertedPutSignals.slice(0, 5),
      upcomingCallSignals: convertedCallSignals.slice(0, 5),
      userTimezone,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 FATAL ERROR:', error);

    res.status(500).json({
      success: false,
      message: 'Server crashed',
      error: error.message
    });
  }
};

/**
 * GET /api/signals/upcoming
 */
exports.getUpcomingSignals = async (req, res) => {
  try {
    const { timezone } = req.query;
    const userTimezone = timezone ? parseInt(timezone) : 2;

    const putSignals = await signalAnalyzer.generateMXNSignals('PUT');
    const callSignals = await signalAnalyzer.generateMXNSignals('CALL');

    const convertedPutSignals =
      timezoneConverter.findNextSignal(putSignals, userTimezone) || [];

    const convertedCallSignals =
      timezoneConverter.findNextSignal(callSignals, userTimezone) || [];

    const allSignals = [...convertedPutSignals, ...convertedCallSignals]
      .sort((a, b) => a.secondsUntil - b.secondsUntil);

    res.json({
      success: true,
      signals: allSignals.slice(0, 20),
      userTimezone,
      count: allSignals.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting upcoming signals:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to get signals',
      error: error.message
    });
  }
};

/**
 * POST /api/signals/clear-cache
 */
exports.clearCache = async (req, res) => {
  try {
    signalAnalyzer.cache.PUT = { signals: [], lastUpdate: null };
    signalAnalyzer.cache.CALL = { signals: [], lastUpdate: null };

    console.log('🧹 Cache cleared');

    res.json({
      success: true,
      message: 'Signal cache cleared successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: error.message
    });
  }
};
