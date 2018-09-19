'use strict';

const puppeteer = require('puppeteer');

(async () => {
    var browser = await puppeteer.launch({
        args: ['--disable-web-security', '--no-sandbox', '--disable-setuid-sandbox']
      });
  

    await browser.close();
})();