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

    console.log(`🔥 START for ${uid}`);

    const withTimeout = (promise, ms) => {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout exceeded')), ms)
      );
      return Promise.race([promise, timeout]);
    };

    let putSignals = [];
    let callSignals = [];

    try {
      putSignals = await withTimeout(
        signalAnalyzer.generateMXNSignals('PUT'),
        15000
      );
    } catch (err) {
      console.error('❌ PUT ERROR:', err.message);
    }

    try {
      callSignals = await withTimeout(
        signalAnalyzer.generateMXNSignals('CALL'),
        15000
      );
    } catch (err) {
      console.error('❌ CALL ERROR:', err.message);
    }

    putSignals = Array.isArray(putSignals) ? putSignals : [];
    callSignals = Array.isArray(callSignals) ? callSignals : [];

    if (!putSignals.length && !callSignals.length) {
      return res.status(200).json({
        success: false,
        message: 'No signals available'
      });
    }

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
      return res.status(200).json({
        success: false,
        message: 'No valid signals'
      });
    }

    const safe = {
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

    res.json({
      success: true,
      nextSignal: safe,
      recommendedType,
      upcomingPutSignals: convertedPutSignals.slice(0, 5),
      upcomingCallSignals: convertedCallSignals.slice(0, 5),
      userTimezone,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 FATAL:', error);

    res.status(500).json({
      success: false,
      message: 'Server crashed',
      error: error.message
    });
  }
};
