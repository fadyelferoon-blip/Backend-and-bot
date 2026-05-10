const signalAnalyzer = require('../services/signalAnalyzer');
const timezoneConverter = require('../services/timezoneConverter');

/**
 * Get MXN signals with timezone conversion
 * @route POST /api/signals/mxn
 */
exports.generateMXNSignals = async (req, res) => {
  try {
    const { uid, deviceId, timezone } = req.body;

    // Default to UTC+2 if not provided
    const userTimezone = timezone ? parseInt(timezone) : 2;

    console.log(`Getting MXN signals for user ${uid}, timezone: UTC+${userTimezone}`);

    // Get both PUT and CALL signals from bot
    const putSignals = await signalAnalyzer.generateMXNSignals('PUT');
    const callSignals = await signalAnalyzer.generateMXNSignals('CALL');

    // 🎯 LOG ALL SIGNALS
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║         📊 MXN SIGNALS ANALYSIS RESULTS                  ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    console.log(`🔴 PUT Signals Found: ${putSignals.length}`);
    putSignals.slice(0, 10).forEach((signal, idx) => {
      console.log(`   ${idx + 1}. ⏰ ${signal.time} | 📈 ${signal.winrate}% | 🎯 ${signal.pair}`);
    });
    
    console.log(`\n🟢 CALL Signals Found: ${callSignals.length}`);
    callSignals.slice(0, 10).forEach((signal, idx) => {
      console.log(`   ${idx + 1}. ⏰ ${signal.time} | 📈 ${signal.winrate}% | 🎯 ${signal.pair}`);
    });
    
    console.log('\n' + '═'.repeat(60) + '\n');

    // Convert to user's timezone and find next signals
    const convertedPutSignals = timezoneConverter.findNextSignal(putSignals, userTimezone);
    const convertedCallSignals = timezoneConverter.findNextSignal(callSignals, userTimezone);
    
    // 🎯 LOG CONVERTED SIGNALS
    console.log(`🌍 User Timezone: UTC+${userTimezone}\n`);
    console.log(`🔴 Next PUT Signals (User Time):`);
    convertedPutSignals.slice(0, 5).forEach((signal, idx) => {
      console.log(`   ${idx + 1}. ⏰ ${signal.localTime} | ⏳ ${signal.minutesUntil}min | 📈 ${signal.winrate}%`);
    });
    
    console.log(`\n🟢 Next CALL Signals (User Time):`);
    convertedCallSignals.slice(0, 5).forEach((signal, idx) => {
      console.log(`   ${idx + 1}. ⏰ ${signal.localTime} | ⏳ ${signal.minutesUntil}min | 📈 ${signal.winrate}%`);
    });
    console.log('\n' + '═'.repeat(60) + '\n');

    // Get the very next signal (closest one)
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
    } else if (nextPut) {
      nextSignal = nextPut;
      recommendedType = 'PUT';
    } else if (nextCall) {
      nextSignal = nextCall;
      recommendedType = 'CALL';
    }

    if (!nextSignal) {
      console.log('⚠️  No signals available for today');
      return res.json({
        success: false,
        message: 'No signals available for today'
      });
    }

    // 🎯 LOG SELECTED SIGNAL
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║         ⭐ RECOMMENDED SIGNAL                            ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    console.log(`   Type: ${nextSignal.type === 'PUT' ? '🔴 PUT' : '🟢 CALL'}`);
    console.log(`   Pair: ${nextSignal.pair}`);
    console.log(`   Time (User): ${nextSignal.localTime}`);
    console.log(`   Time (Bot): ${nextSignal.time}`);
    console.log(`   Winrate: 📈 ${nextSignal.winrate}%`);
    console.log(`   Countdown: ⏳ ${nextSignal.minutesUntil} minutes`);
    console.log(`   Seconds Until: ${nextSignal.secondsUntil}s`);
    console.log('\n' + '═'.repeat(60) + '\n');

    res.json({
      success: true,
      nextSignal: {
        pair: nextSignal.pair,
        type: nextSignal.type,
        time: nextSignal.localTime, // Time in user's timezone
        originalTime: nextSignal.time, // Original time from bot (UTC+6)
        winrate: nextSignal.winrate,
        secondsUntil: nextSignal.secondsUntil,
        minutesUntil: nextSignal.minutesUntil,
        countdown: timezoneConverter.formatCountdown(nextSignal.secondsUntil)
      },
      recommendedType: recommendedType,
      upcomingPutSignals: convertedPutSignals.slice(0, 5), // Next 5 PUT signals
      upcomingCallSignals: convertedCallSignals.slice(0, 5), // Next 5 CALL signals
      userTimezone: userTimezone,
      currentTime: new Date().toISOString(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating MXN signals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate signals',
      error: error.message
    });
  }
};

/**
 * Get all upcoming signals (both PUT and CALL) with timezone conversion
 * @route GET /api/signals/upcoming
 */
exports.getUpcomingSignals = async (req, res) => {
  try {
    const { timezone } = req.query;
    const userTimezone = timezone ? parseInt(timezone) : 2;

    const putSignals = await signalAnalyzer.generateMXNSignals('PUT');
    const callSignals = await signalAnalyzer.generateMXNSignals('CALL');

    const convertedPutSignals = timezoneConverter.findNextSignal(putSignals, userTimezone);
    const convertedCallSignals = timezoneConverter.findNextSignal(callSignals, userTimezone);

    // Combine and sort all signals
    const allSignals = [...convertedPutSignals, ...convertedCallSignals]
      .sort((a, b) => a.secondsUntil - b.secondsUntil);

    res.json({
      success: true,
      signals: allSignals.slice(0, 20), // Next 20 signals
      userTimezone: userTimezone,
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
 * Clear signal cache
 * @route POST /api/signals/clear-cache
 */
exports.clearCache = async (req, res) => {
  try {
    signalAnalyzer.cache.PUT = { signals: [], lastUpdate: null };
    signalAnalyzer.cache.CALL = { signals: [], lastUpdate: null };

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
