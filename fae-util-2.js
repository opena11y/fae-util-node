'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const configOptions = require('./config.json');

async function crawl(urlRoot) {
  console.log('Entered crawl()');
  var numPagesEvaluated = 0, currentDepth = 0, index = 0;
  var currentQueue = [urlRoot];
  var traversed = Array();
  var tempUrl;

  while (numPagesEvaluated <= configOptions.maxPages && currentQueue.length) {
    console.log('Current Queue: ' + currentQueue);
    tempUrl = currentQueue.shift();
    console.log(tempUrl, currentQueue, currentDepth, index);
    evaluateSinglePage(tempUrl, currentQueue, currentDepth, index);
    index++;
    numPagesEvaluated++;
  }
}

function evaluateRules(passedRuleset) {
  console.log('Entered evaluateRules()');
  var doc = window.document;
  var ruleset = OpenAjax.a11y.RulesetManager.getRuleset(passedRuleset);
  var evaluator_factory = OpenAjax.a11y.EvaluatorFactory.newInstance();
  evaluator_factory.setParameter('ruleset', ruleset);
  evaluator_factory.setFeature('eventProcessing', 'fae-util');
  evaluator_factory.setFeature('groups', 7);
  var evaluator = evaluator_factory.newEvaluator();
  var evaluation = evaluator.evaluate(doc, doc.title, doc.location.href);
  var out = evaluation.toJSON(true);
  return out;
}

async function evaluateSinglePage(url, currentQueue, currentDepth, index) {
  try {
    console.log('Entered evaluateSinglePage()');

    var browser = await puppeteer.launch({
      args: ['--disable-web-security']
    });

    var page = await browser.newPage(); // new

    const millisecondsToSeconds = 1000;
    // console.log(browser.targets());
    console.log('line 48');
    // load page with/without delay and wait
    // var page = await browser.newPage(); new comment
    console.log('line 51');
    await page.goto(url, { timeout: configOptions.wait * millisecondsToSeconds, waitUntil: 'load' }); //wait
    // await page.goto(url);
    console.log('line 54');
    await page.waitFor(configOptions.delay * millisecondsToSeconds); //delay
    console.log('line 56');
    // HTTP authentication
    if (configOptions.authentication) {
      const credentialsObject = { username: configOptions.username, password: configOptions.password };
      await page.authenticate(credentialsObject);
    }
    console.log('line 62');
    // Import evaluation library into the page
    const evaluationFileOptions = { path: './oaa_a11y_evaluation.js' };
    const ruleFileOptions = { path: './oaa_a11y_rules.js' };
    const rulesetsFileOptions = { path: './oaa_a11y_rulesets.js' };

    const evaluationFileOptionsObject = Object.create(evaluationFileOptions);
    const ruleFileOptionsObject = Object.create(ruleFileOptions);
    const rulesetsFileOptionsObject = Object.create(rulesetsFileOptions);

    await page.addScriptTag(evaluationFileOptionsObject);
    await page.addScriptTag(ruleFileOptionsObject);
    await page.addScriptTag(rulesetsFileOptionsObject);
    console.log('line 75');
    //Run evaluation
    console.log('got to line 77:');
    var results = await page.evaluate(evaluateRules, configOptions.ruleset);
    console.log('got to line 79:');

    //Export results to file

    fs.writeFile(configOptions.outputDirectory + "/results_" + index.toString() + ".json", results, function (err) {
      if (err) {
        return console.log(err);
      }

      console.log("results_" + index.toString() + ".json was saved!");
      console.log('index: ' + index);
      // index++;
      // console.log('index after: ' + index);
    });
    console.log('line 93');
    if (currentDepth <= configOptions.depth) {
      // get all links and push at the end of currentQueue
      const links = await page.evaluate(() => {
        const anchors = document.querySelectorAll('a');
        return [].map.call(anchors, a => a.href);
      });
      console.log(links);
      console.log('97');
      // var links = page.evaluate(document.getElementsByTagName("a"));
      for (var i = 0, max = links.length; i < max; i++) {
        currentQueue.push(links[i]);
      }
      console.log(currentQueue);
      currentDepth++;
    }
    console.log('line 102');
    //Close headless Chrome tab / page
    await page.close();
    await browser.close();
  } catch (error) {
    console.log(error);
  }
}

(async () => {
  //number of URLs from configOptions.urls that have been worked on
  var numUrlsEvaluated;

  for (numUrlsEvaluated = 0; numUrlsEvaluated < configOptions.urls.length; numUrlsEvaluated++) {
    console.log("Run " + numUrlsEvaluated + ":");
    await crawl(configOptions.urls[numUrlsEvaluated]);
  }
})();
