'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

const configOptions = require('./config.json');

function evaluateRules(passedRuleset) {
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

(async() => {
  const browser = await puppeteer.launch();
  
  var numPagesEvaluated;

  for (numPagesEvaluated = 0; numPagesEvaluated < configOptions.urls.length && numPagesEvaluated < configOptions.maxPages; numPagesEvaluated++){

    const millisecondsToSeconds = 1000;

    var page = await browser.newPage();
    await page.goto(configOptions.urls[numPagesEvaluated], {timeout: configOptions.wait*millisecondsToSeconds, waitUntil: 'load'});
    await page.waitFor(configOptions.delay*millisecondsToSeconds);

    if (configOptions.authentication){
      const credentialsObject = {username: configOptions.username, password: configOptions.password};
      await page.authenticate(credentialsObject);
    }
  
    const evaluationFileOptions = {path: './oaa_a11y_evaluation.js'};
    const ruleFileOptions = {path: './oaa_a11y_rules.js'};
    const rulesetsFileOptions = {path: './oaa_a11y_rulesets.js'};
  
    const evaluationFileOptionsObject = Object.create(evaluationFileOptions);
    const ruleFileOptionsObject = Object.create(ruleFileOptions);
    const rulesetsFileOptionsObject = Object.create(rulesetsFileOptions);
  
    await page.addScriptTag(evaluationFileOptionsObject);
    await page.addScriptTag(ruleFileOptionsObject);
    await page.addScriptTag(rulesetsFileOptionsObject);
  
    var results = await page.evaluate(evaluateRules, configOptions.ruleset);
  
    var result_index = 0;
  
    fs.writeFile(configOptions.outputDirectory+ "/results_" + result_index.toString() + ".json", results, function(err) {
      if(err) {
          return console.log(err);
      }
  
      console.log("results_" + result_index.toString() + ".json was saved!");
      result_index++;
    });

    await page.close();
  }

  await browser.close();
})();
