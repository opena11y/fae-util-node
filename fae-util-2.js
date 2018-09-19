'use strict';

const puppeteer = require('puppeteer');
const validUrl = require('valid-url');
const fs = require('fs');
const configOptions = require('./config.json');

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

async function crawl(urlRoot, numUrlsEvaluated) {
  console.log('Entered crawl()');
  var numPagesEvaluated = 0, currentDepth = 0, index = 0;
  var currentQueue = [urlRoot];
  var traversed = Array();
  var notTraversed = Array();
  var tempUrl;
  var pageWasEvaluated;

  while (numPagesEvaluated <= configOptions.maxPages && currentQueue.length) {
    pageWasEvaluated = false;

    console.log('Current Queue: ' + currentQueue);

    tempUrl = currentQueue.shift();

    if (!(tempUrl in traversed)){
      console.log('Current URL:', tempUrl, 'Current Depth:', currentDepth, 'Index:', index);

      if (validUrl.isUri(tempUrl)){
        console.log(tempUrl + ' is a valid URL');
      } else {
        console.log(tempUrl + ' is a NOT a valid URL');
      }
  
      pageWasEvaluated = await evaluateSinglePage(tempUrl, currentQueue, currentDepth, index, numUrlsEvaluated);
  
      if (pageWasEvaluated) {
        traversed.push(tempUrl);
      }
      else {
        notTraversed.push(tempUrl);
      }

      index++;
      numPagesEvaluated++;
    }
    else {
      console.log(tempUrl, 'has already been traversed.');
    }

    console.log('Traversed:', traversed);
    console.log('Not traversed:', notTraversed);
  }

  console.log('Traversed:', traversed);
  console.log('Not traversed:', notTraversed);
}

async function evaluateSinglePage(url, currentQueue, currentDepth, index, numUrlsEvaluated) {
  try {
    console.log('Entered evaluateSinglePage()');

    var browser = await puppeteer.launch({
      args: ['--disable-web-security', '--no-sandbox', '--disable-setuid-sandbox']
    });

    var page = await browser.newPage();

    const millisecondsToSeconds = 1000;
    // load page with/without delay and wait
    console.log('line 51');
    await page.goto(url, { timeout: configOptions.wait * millisecondsToSeconds, waitUntil: 'networkidle0' }); //wait
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
    console.log('line 65');
    const evaluationFileOptionsObject = Object.create(evaluationFileOptions);
    const ruleFileOptionsObject = Object.create(ruleFileOptions);
    const rulesetsFileOptionsObject = Object.create(rulesetsFileOptions);
    console.log('line 69');
    await page.addScriptTag(evaluationFileOptionsObject);
    await page.addScriptTag(ruleFileOptionsObject);
    await page.addScriptTag(rulesetsFileOptionsObject);
    console.log('line 75');
    //Run evaluation
    console.log('got to line 77:');
    var results = await page.evaluate(evaluateRules, configOptions.ruleset);
    console.log('got to line 79:');

    //Export results to file

    fs.writeFile(configOptions.outputDirectory + "/results_" + numUrlsEvaluated.toString() + '_' + index.toString() + ".json", results, function (err) {
      if (err) {
        return console.log(err);
      }

      console.log("results_" + numUrlsEvaluated.toString() + '_' + index.toString() + ".json was saved!");
    });
    console.log('line 93');
    if (currentDepth <= configOptions.depth) {
      // get all links and push at the end of currentQueue
      const links = await page.evaluate(() => {
        const anchors = document.querySelectorAll('a');
        return [].map.call(anchors, a => a.href);
      });
      
      console.log('97');

      for (var i = 0, max = links.length; i < max; i++) {
        currentQueue.push(links[i]);
      }
      
      currentDepth++;
    }
    console.log('line 102');
    //Close headless Chrome tab / page
    await page.close();
    await browser.close();
  } catch (error) {
    console.log(error);
  }

  return true;
}

(async () => {
  //number of URLs from configOptions.urls that have been worked on
  var numUrlsEvaluated;

  for (numUrlsEvaluated = 0; numUrlsEvaluated < configOptions.urls.length; numUrlsEvaluated++) {
    console.log("Run " + numUrlsEvaluated + ":");
    await crawl(configOptions.urls[numUrlsEvaluated], numUrlsEvaluated);
  }
})();
