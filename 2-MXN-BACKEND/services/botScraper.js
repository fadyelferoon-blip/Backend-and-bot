const puppeteer = require('puppeteer-core');

class BotScraper {
  constructor() {
    this.browser = null;
    this.botUrl = process.env.BOT_URL || 'https://fer3oon-bot.railway.app';
    this.timeOffset = parseInt(process.env.TIME_OFFSET || '6');

    // ✅ Chromium path (Railway / Linux safe default)
    this.executablePath =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  '/usr/bin/chromium-browser';
  }

  async initBrowser() {
    if (this.browser) return;

    console.log('🚀 Launching browser...');

    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        executablePath: this.executablePath,
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
    } catch (err) {
      console.error('❌ Failed to launch browser:', err.message);
      throw err;
    }
  }

  async scrapeSignals(orderType = 'PUT') {
    try {
      await this.initBrowser();

      console.log(`🔄 Scraping ${orderType} signals...`);

      const page = await this.browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      await page.goto(this.botUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      await page.select('#cbAtivo', 'USD_MXN_OTC_QTX');
      await this.sleep(500);
      await page.select('#selPercentageMin', '100');
      await this.sleep(500);
      await page.select('#selPercentageMax', '100');
      await this.sleep(500);
      await page.select('#selCandleTime', 'M1');
      await this.sleep(500);
      await page.select('#selDays', '20');
      await this.sleep(500);
      await page.select('#selOrderType', orderType);
      await this.sleep(500);

      await page.evaluate(() => {
        if (typeof getHistoric === 'function') getHistoric();
      });

      await page.waitForFunction(
        () =>
          typeof listBestPairTimes !== 'undefined' &&
          listBestPairTimes.length > 0,
        { timeout: 90000 }
      );

      const signals = await page.evaluate((type) => {
        return listBestPairTimes.map((signal) => {
          const timeParts = signal.time.split(':');
          const hour = parseInt(timeParts[0]);
          const minute = parseInt(timeParts[1]);
          const second = parseInt(timeParts[2] || 0);

          return {
            pair: 'GOLD',
            hour,
            minute,
            second,
            time: `${hour.toString().padStart(2, '0')}:${minute
              .toString()
              .padStart(2, '0')}:${second.toString().padStart(2, '0')}`,
            type,
            winrate: signal.winrate || 100
          };
        });
      }, orderType);

      await page.close();

      return signals;
    } catch (error) {
      console.error('❌ Error scraping signals:', error);
      return []; // ✅ مهم: منع الكراش
    }
  }

  async getAllSignals() {
    try {
      const putSignals = await this.scrapeSignals('PUT');
      await this.sleep(2000);
      const callSignals = await this.scrapeSignals('CALL');

      return {
        PUT: putSignals,
        CALL: callSignals,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting signals:', error);
      return {
        PUT: [],
        CALL: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  async closeBrowser() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (err) {
      console.error('❌ Error closing browser:', err.message);
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new BotScraper();
