const botScraper = require('./botScraper');
const timezoneConverter = require('./timezoneConverter');

class SignalAnalyzer {
  constructor() {
    this.cache = {
      PUT:  { signals: [], fetchedAt: null },
      CALL: { signals: [], fetchedAt: null }
    };
    this.isRefreshing = false;
    this.CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 hours
  }

  isCacheValid(orderType) {
    const c = this.cache[orderType];
    if (!c.fetchedAt || c.signals.length === 0) return false;
    return (Date.now() - c.fetchedAt) < this.CACHE_DURATION;
  }

  isCacheReady() {
    return this.isCacheValid('PUT') && this.isCacheValid('CALL');
  }

  async generateSignals(orderType) {
    if (this.isCacheValid(orderType)) {
      console.log(`✅ Using cached ${orderType}`);
      return this.cache[orderType].signals;
    }
    console.log(`🔄 Fetching fresh ${orderType}...`);
    try {
      const signals = await botScraper.scrapeSignals(orderType);
      this.cache[orderType] = {
        signals: signals.map(s => ({ ...s, pairDisplay: 'GOLD' })),
        fetchedAt: Date.now()
      };
      console.log(`💾 Cached ${orderType}: ${signals.length} signals`);
      return this.cache[orderType].signals;
    } catch (e) {
      console.error(`❌ ${orderType}:`, e.message);
      return [];
    }
  }

  async refreshAll() {
    if (this.isRefreshing) return;
    this.isRefreshing = true;
    console.log('🔄 Refreshing all signals...');
    await this.generateSignals('PUT');
    await new Promise(r => setTimeout(r, 1000));
    await this.generateSignals('CALL');
    this.isRefreshing = false;
    console.log('✅ Refresh complete');
  }

  startBackgroundRefresh() {
    setTimeout(() => this.refreshAll(), 5000);
    setInterval(() => this.refreshAll(), this.CACHE_DURATION);
    console.log('⏰ Refresh every 3h');
  }

  // Get next signal - filters expired ones on every call
  getNextSignal(userTimezone = 2) {
    if (!this.isCacheReady()) return null;

    // Merge PUT and CALL signals
    const allSignals = [
      ...this.cache.PUT.signals,
      ...this.cache.CALL.signals
    ];

    // findNextSignal filters expired and returns only future signals
    const upcoming = timezoneConverter.findNextSignal(allSignals, userTimezone);

    if (!upcoming || upcoming.length === 0) return null;

    // Return the soonest one
    return upcoming[0];
  }

  getCacheStatus() {
    return {
      put:  this.cache.PUT.signals.length,
      call: this.cache.CALL.signals.length,
      fetchedAt: this.cache.PUT.fetchedAt
        ? new Date(this.cache.PUT.fetchedAt).toISOString() : null,
      isRefreshing: this.isRefreshing,
      ready: this.isCacheReady(),
      cacheExpiresIn: this.cache.PUT.fetchedAt
        ? Math.round((this.CACHE_DURATION - (Date.now() - this.cache.PUT.fetchedAt)) / 60000) + 'min'
        : 'N/A'
    };
  }

  clearCache() {
    this.cache.PUT  = { signals: [], fetchedAt: null };
    this.cache.CALL = { signals: [], fetchedAt: null };
    console.log('🗑️ Cache cleared');
  }
}

module.exports = new SignalAnalyzer();
