const puppeteer = require('puppeteer');

class BotScraper {
  constructor() {
    this.browser = null;
    this.botUrl = process.env.BOT_URL || 'https://fer3oon-bot.railway.app';
  }

  async initBrowser() {
    if (this.browser) return;

    console.log('🚀 Launching browser...');
    
    // Railway Chromium configuration
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    };

    // Add executablePath if Chromium is installed via buildpack
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      console.log('📍 Using Chromium from:', process.env.PUPPETEER_EXECUTABLE_PATH);
    }

    this.browser = await puppeteer.launch(launchOptions);

    console.log('✅ Browser launched successfully');
  }

  /**
   * Scrape signals from the bot
   * @param {string} orderType - 'PUT' or 'CALL'
   * @returns {Array} List of signals
   */
  async scrapeSignals(orderType = 'PUT') {
    try {
      await this.initBrowser();

      console.log(`📡 Scraping ${orderType} signals from bot...`);

      const page = await this.browser.newPage();
      
      await page.setViewport({ width: 1280, height: 800 });

      console.log(`🌐 Navigating to ${this.botUrl}...`);
      await page.goto(this.botUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      console.log('✅ Page loaded');
      await this.sleep(2000);

      // Fill form fields
      console.log('📝 Filling form fields...');
      
      // Select pair: USD/MXN OTC
      await page.select('#cbAtivo', 'USD_MXN_OTC_QTX');
      await this.sleep(500);
      
      // Min percentage: 100
      await page.select('#selPercentageMin', '100');
      await this.sleep(500);
      
      // Max percentage: 100
      await page.select('#selPercentageMax', '100');
      await this.sleep(500);
      
      // Candle time: M1
      await page.select('#selCandleTime', 'M1');
      await this.sleep(500);
      
      // Days: 20
      await page.select('#selDays', '20');
      await this.sleep(500);
      
      // Order type: PUT or CALL
      await page.select('#selOrderType', orderType);
      await this.sleep(500);

      console.log('✅ Form filled');

      // Click "PROCESS DATA" button
      console.log('🔄 Processing data...');
      await page.evaluate(() => {
        getHistoric(); // This is the function in the bot HTML
      });

      // Wait for processing to complete
      console.log('⏳ Waiting for analysis to complete...');
      await this.sleep(5000); // Give time for analysis

      // Extract signals from JavaScript variable
      console.log('📊 Extracting signals...');
      const signals = await page.evaluate(() => {
        // listBestPairTimes is the array in the bot HTML
        return listBestPairTimes.map(signal => ({
          time: signal.time,
          winrate: signal.winrate,
          hour: signal.hour,
          minute: signal.minute,
          second: signal.second || 0,
          type: signal.orderType || 'CALL'
        }));
      });

      console.log(`✅ Extracted ${signals.length} ${orderType} signals`);

      await page.close();

      return signals;

    } catch (error) {
      console.error('❌ Error scraping signals:', error);
      throw error;
    }
  }

  /**
   * Get all signals (PUT and CALL)
   * @returns {Object} { put: [], call: [] }
   */
  async getAllSignals() {
    try {
      console.log('🔄 Fetching all signals...');

      const putSignals = await this.scrapeSignals('PUT');
      const callSignals = await this.scrapeSignals('CALL');

      console.log(`✅ Total signals: ${putSignals.length} PUT, ${callSignals.length} CALL`);

      return {
        put: putSignals,
        call: callSignals,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error getting all signals:', error);
      throw error;
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('🔒 Browser closed');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new BotScraper();
