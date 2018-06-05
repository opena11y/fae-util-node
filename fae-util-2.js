'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');

function evaluateRules() {
  var doc = window.document;
  var ruleset = OpenAjax.a11y.RulesetManager.getRuleset("ARIA_STRICT");
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
  var page = await browser.newPage();
  await page.goto('http://google.com/', {waitUntil: 'load'});

  const evaluationFileOptions = {path: './oaa_a11y_evaluation.js'};
  const ruleFileOptions = {path: './oaa_a11y_rules.js'};
  const rulesetsFileOptions = {path: './oaa_a11y_rulesets.js'};

  const evaluationFileOptionsObject = Object.create(evaluationFileOptions);
  const ruleFileOptionsObject = Object.create(ruleFileOptions);
  const rulesetsFileOptionsObject = Object.create(rulesetsFileOptions);

  await page.addScriptTag(evaluationFileOptionsObject);
  await page.addScriptTag(ruleFileOptionsObject);
  await page.addScriptTag(rulesetsFileOptionsObject);

  var results = await page.evaluate(evaluateRules);

  fs.writeFile("./results.json", results, function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("The file was saved!");
  });

  await browser.close();
})();
