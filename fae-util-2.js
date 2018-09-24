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

async function validateLink (url) {
  var flag = false;

  if (validUrl.isUri(url)){

    flag = true;

    for (var x = 0; x < configOptions.excluded_extensions.length && flag; x++){
      if (url.substr(url.length - 4) == '.' + configOptions.excluded_extensions[x]
          || url.substr(0, 7) == 'mailto:')
        flag = false;
    }
  }

  return flag;
}

async function crawl(urlRoot, numUrlsEvaluated) {
  console.log('Entered crawl()');
  var numPagesEvaluated = 0, currentDepth = 0, index = 0;
  var currentQueue = [urlRoot];
  var traversed = Array();
  var excluded = Array();
  var tempUrl;

  while (numPagesEvaluated <= configOptions.maxPages && currentQueue.length) {

    console.log('Current Queue: ' + currentQueue);

    tempUrl = currentQueue.shift();

    if (!(tempUrl in traversed)){
      console.log('Current URL:', tempUrl, 'Current Depth:', currentDepth, 'Index:', index);

      if (await validateLink(tempUrl)){
        console.log(tempUrl + ' is a valid URL');
        traversed.push(tempUrl);
      } else {
        console.log(tempUrl + ' is a NOT a valid URL');
        excluded.push(tempUrl);
        continue;
      }
  
      await evaluateSinglePage(tempUrl, currentQueue, currentDepth, index, numUrlsEvaluated);

      index++;
      numPagesEvaluated++;
    }
    else {
      console.log(tempUrl, 'has already been traversed.');
    }
  }

  console.log('Loop end: Traversed:', traversed);
  console.log('Loop end: Excluded:', excluded);

  return;
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
    await page.goto(url, { timeout: configOptions.wait * millisecondsToSeconds, waitUntil: 'networkidle0' }); //wait
    console.log(url, ' successfully navigated to.');
    await page.waitFor(configOptions.delay * millisecondsToSeconds); //delay

    // HTTP authentication
    if (configOptions.authentication) {
      const credentialsObject = { username: configOptions.username, password: configOptions.password };
      await page.authenticate(credentialsObject);
    }
    console.log('HTTP auth passed.');

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
    console.log('Evaluation libs injected.');
    //Run evaluation

    var results = await page.evaluate(evaluateRules, configOptions.ruleset);
    console.log('Evaluations completed successfully.');
    //Export results to file

    fs.writeFile(configOptions.outputDirectory + "/results_" + numUrlsEvaluated.toString() + '_' + index.toString() + ".json", results, function (err) {
      if (err) {
        return console.log(err);
      }

      console.log("results_" + numUrlsEvaluated.toString() + '_' + index.toString() + ".json was saved!");
    });

    if (currentDepth <= configOptions.depth) {
      // get all links and push at the end of currentQueue
      const links = await page.evaluate(() => {
        const anchors = document.querySelectorAll('a');
        return [].map.call(anchors, a => a.href);
      });

      for (var i = 0, max = links.length; i < max; i++) {
        currentQueue.push(links[i]);
      }
      currentDepth++; 
    }

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
