const puppeteer = require('puppeteer');

class BotScraper {
  constructor() {
    this.browser = null;
    this.botUrl = process.env.BOT_URL || 'https://fer3oon-bot.railway.app';
  }

  async initBrowser() {
    if (this.browser) return;

    console.log('🚀 Launching browser...');
    
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions'
      ]
    });

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

      console.log('📝 Filling form with correct selectors...');

      // ✅ الـ selectors الصحيحة من البوت الأصلي
      
      // 1. Pair: USD_MXN_OTC_QTX
      await page.select('#cbAtivo', 'USD_MXN_OTC_QTX');
      await this.sleep(500);

      // 2. Min Percentage: 100%
      await page.select('#selPercentageMin', '100');
      await this.sleep(500);

      // 3. Max Percentage: 100%
      await page.select('#selPercentageMax', '100');
      await this.sleep(500);

      // 4. Timeframe: M1
      await page.select('#selCandleTime', 'M1');
      await this.sleep(500);

      // 5. Days: 20
      await page.select('#selDays', '20');
      await this.sleep(500);

      // 6. Order Type: PUT or CALL
      await page.select('#selOrderType', orderType);
      await this.sleep(500);

      console.log(`✅ Form filled: USD_MXN_OTC_QTX, 100%, M1, 20 days, ${orderType}`);

      // ✅ Click the button - البوت بيستخدم onclick="getHistoric()"
      console.log('🔘 Clicking PROCESS DATA button...');
      await page.evaluate(() => {
        getHistoric(); // استدعي الـ function مباشرة
      });

      // ✅ انتظر حتى البوت يخلص تحليل
      console.log('⏳ Waiting for analysis to complete (may take 30-60 seconds)...');
      
      // ✅ استخرج البيانات من JavaScript variable مباشرة
      await page.waitForFunction(
        () => typeof listBestPairTimes !== 'undefined' && listBestPairTimes.length > 0,
        { timeout: 90000 }
      );

      console.log('✅ Analysis complete! Extracting signals...');

      // ✅ استخرج الإشارات من الـ JavaScript variable
      const signals = await page.evaluate((type) => {
        // listBestPairTimes موجودة في الـ page scope
        return listBestPairTimes.map(signal => {
          const timeParts = signal.time.split(':');
          return {
            pair: signal.pair.replace('_', '/'),
            hour: parseInt(timeParts[0]),
            minute: parseInt(timeParts[1]),
            second: parseInt(timeParts[2] || 0),
            time: signal.time,
            type: type,
            winrate: signal.winrate || 100
          };
        });
      }, orderType);

      console.log(`✅ Extracted ${signals.length} ${orderType} signals`);

      await page.close();

      return signals;

    } catch (error) {
      console.error('❌ Error scraping signals:', error);
      throw error;
    }
  }

  /**
   * Get both PUT and CALL signals
   */
  async getAllSignals() {
    try {
      console.log('📊 Getting all signals (PUT and CALL)...');

      const putSignals = await this.scrapeSignals('PUT');
      console.log(`✅ Got ${putSignals.length} PUT signals`);

      await this.sleep(2000);

      const callSignals = await this.scrapeSignals('CALL');
      console.log(`✅ Got ${callSignals.length} CALL signals`);

      return {
        PUT: putSignals,
        CALL: callSignals,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error getting all signals:', error);
      throw error;
    }
  }

  async closeBrowser() {
    if (this.browser) {
      console.log('🔒 Closing browser...');
      await this.browser.close();
      this.browser = null;
      console.log('✅ Browser closed');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new BotScraper();
