const botScraper = require('./botScraper');
const timezoneConverter = require('./timezoneConverter');

class SignalAnalyzer {
  constructor() {
    this.cache = {
      PUT: { signals: [], lastUpdate: null },
      CALL: { signals: [], lastUpdate: null }
    };
    this.CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
  }

  /**
   * Generate MXN signals by scraping the bot
   * @param {string} orderType - 'PUT' or 'CALL'
   * @returns {Promise<Array>} List of signals
   */
  async generateMXNSignals(orderType = 'PUT') {
    // Check cache first
    if (this.isCacheValid(orderType)) {
      console.log(`✅ Using cached ${orderType} signals`);
      return this.cache[orderType].signals;
    }

    console.log(`🔄 Generating fresh ${orderType} signals from bot...`);

    try {
      // Scrape signals from the bot
      const signals = await botScraper.scrapeSignals(orderType);

      if (!signals || signals.length === 0) {
        console.warn(`⚠️ No ${orderType} signals found`);
        return [];
      }

      // Add metadata
      const enrichedSignals = signals.map(signal => ({
        ...signal,
        pair: 'USD/MXN',
        winrate: 100,
        occurrences: 1 // We don't have this from scraping
      }));

      // Update cache
      this.updateCache(orderType, enrichedSignals);

      console.log(`✅ Generated ${enrichedSignals.length} ${orderType} signals`);

      return enrichedSignals;

    } catch (error) {
      console.error(`❌ Error generating ${orderType} signals:`, error);
      
      // Return cached signals if available, even if expired
      if (this.cache[orderType].signals.length > 0) {
        console.log(`⚠️ Returning expired cache due to error`);
        return this.cache[orderType].signals;
      }

      throw error;
    }
  }

  /**
   * Get next upcoming signal with timezone conversion
   * @param {string} orderType - 'PUT' or 'CALL'
   * @param {number} userTimezone - User's timezone offset (e.g., +2)
   * @returns {Promise<Object>} Next signal with countdown
   */
  async getNextSignal(orderType, userTimezone = 2) {
    const signals = await this.generateMXNSignals(orderType);
    
    if (!signals || signals.length === 0) {
      return null;
    }

    // Convert to user's timezone and find next signal
    const convertedSignals = timezoneConverter.findNextSignal(signals, userTimezone);

    return convertedSignals[0]; // Return the very next signal
  }

  /**
   * Get all upcoming signals (both PUT and CALL)
   * @param {number} userTimezone - User's timezone offset
   * @returns {Promise<Object>} Object with next PUT and CALL signals
   */
  async getAllUpcomingSignals(userTimezone = 2) {
    try {
      // Get both types of signals
      const putSignals = await this.generateMXNSignals('PUT');
      const callSignals = await this.generateMXNSignals('CALL');

      // Convert to user timezone
      const convertedPutSignals = timezoneConverter.findNextSignal(putSignals, userTimezone);
      const convertedCallSignals = timezoneConverter.findNextSignal(callSignals, userTimezone);

      // Get next signals
      const nextPut = convertedPutSignals[0];
      const nextCall = convertedCallSignals[0];

      // Determine which is closer
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

      return {
        nextSignal,
        recommendedType,
        upcomingPutSignals: convertedPutSignals.slice(0, 10),
        upcomingCallSignals: convertedCallSignals.slice(0, 10),
        userTimezone
      };

    } catch (error) {
      console.error('❌ Error getting all upcoming signals:', error);
      throw error;
    }
  }

  /**
   * Check if cache is still valid
   */
  isCacheValid(orderType) {
    const cache = this.cache[orderType];
    
    if (!cache.lastUpdate || cache.signals.length === 0) {
      return false;
    }

    const age = Date.now() - cache.lastUpdate;
    return age < this.CACHE_DURATION;
  }

  /**
   * Update cache
   */
  updateCache(orderType, signals) {
    this.cache[orderType] = {
      signals: signals,
      lastUpdate: Date.now()
    };
    console.log(`💾 Cache updated for ${orderType} (${signals.length} signals)`);
  }

  /**
   * Clear cache manually
   */
  clearCache() {
    this.cache.PUT = { signals: [], lastUpdate: null };
    this.cache.CALL = { signals: [], lastUpdate: null };
    console.log('🗑️ Cache cleared');
  }
}

module.exports = new SignalAnalyzer();
