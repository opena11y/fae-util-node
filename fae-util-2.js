'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const configOptions = require('./config.json');

async function crawl(browser, urlRoot) {
  console.log('Entered crawl()');
  var numPagesEvaluated = 0, currentDepth = 0, index = 0;
  var currentQueue = [urlRoot];
  var traversed = Array();
  var tempUrl;

  while (numPagesEvaluated <= configOptions.maxPages && currentQueue.length) {
    tempUrl = currentQueue.shift();
    console.log(tempUrl, currentQueue, currentDepth, index);
    evaluateSinglePage(browser, tempUrl, currentQueue, currentDepth, index);
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
  
async function evaluateSinglePage(browser, url, currentQueue, currentDepth, index) {
  try {
  console.log('Entered evaluateSinglePage()');
  const millisecondsToSeconds = 1000;
  console.log('line 38');
  console.log(browser.targets());
  // load page with/without delay and wait
  var page = await browser.newPage();
  console.log('line 41');
  await page.goto(url, {timeout: configOptions.wait*millisecondsToSeconds, waitUntil: 'load'}); //wait
  await page.waitFor(configOptions.delay*millisecondsToSeconds); //delay
  console.log('line 44');
  // HTTP authentication
  if (configOptions.authentication){
    const credentialsObject = {username: configOptions.username, password: configOptions.password};
    await page.authenticate(credentialsObject);
  }
  console.log('line 50');
  // Import evaluation library into the page
  const evaluationFileOptions = {path: './oaa_a11y_evaluation.js'};
  const ruleFileOptions = {path: './oaa_a11y_rules.js'};
  const rulesetsFileOptions = {path: './oaa_a11y_rulesets.js'};

  const evaluationFileOptionsObject = Object.create(evaluationFileOptions);
  const ruleFileOptionsObject = Object.create(ruleFileOptions);
  const rulesetsFileOptionsObject = Object.create(rulesetsFileOptions);

  await page.addScriptTag(evaluationFileOptionsObject);
  await page.addScriptTag(ruleFileOptionsObject);
  await page.addScriptTag(rulesetsFileOptionsObject);
  console.log('line 63');
  //Run evaluation
  console.log('got to line 54: ' + configOptions.urls[numPagesEvaluated]);
  var results = await page.evaluate(evaluateRules, configOptions.ruleset);
  console.log('got to line 56: ' + configOptions.urls[numPagesEvaluated]);
  console.log('line 68');
  //Export results to file

  fs.writeFile(configOptions.outputDirectory+ "/results_" + index.toString() + ".json", results, function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("results_" + result_index.toString() + ".json was saved!");
    index++;
  });
  console.log('line 79');
  if (currentDepth <= configOptions.depth) {
    // get all links and push at the end of currentQueue
    var links = document.getElementsByTagName("a");
    for(var i=0, max=links.length; i<max; i++) {
      currentQueue.push(links[i].href);
    }
    currentDepth++;
  }
  console.log('line 88');
  //Close headless Chrome tab / page
  await page.close();
  } catch (error) {
    console.log(error);
  }
  
}

(async() => {
  var browser = await puppeteer.launch({
    args: ['--disable-web-security']
  });
  
  //number of URLs from configOptions.urls that have been worked on
  var numUrlsEvaluated;
  
  for (numUrlsEvaluated = 0; numUrlsEvaluated < configOptions.urls.length; numUrlsEvaluated++) {
    await crawl(browser, configOptions.urls[numUrlsEvaluated]);
  }
  
  await browser.close();
})();
