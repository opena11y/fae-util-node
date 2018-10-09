'use strict';

const puppeteer = require('puppeteer');
const validUrl = require('valid-url');
const fs = require('fs');
const configOptions = require('./config.json');

class Url {
  constructor(url, depth, parentUrl) {
    this.url = url;
    this.depth = depth;
    this.parentUrl = parentUrl;
  }

  get getUrl() {
    return this.url;
  }

  get getDepth() {
    return this.depth;
  }

  get getParentUrl() {
    return this.parentUrl;
  }
}

function directoryIsEmpty(directory) {
  var flag = false;
  fs.readdir(directory, function(err, files) {
    if (err) {
      console.log(err);
      flag = false;
    }
    else {
      if (!files.length) {
        flag = true;
      }
    }
  });
  console.log('flag', flag);
  return flag;
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

async function validateLink (url) {
  var flag = false;
  var URL = url.url;
  if (validUrl.isUri(URL)){
    flag = true;
    for (var x = 0; x < configOptions.excluded_extensions.length && flag; x++){
      if (URL.substr(URL.length - 4) == '.' + configOptions.excluded_extensions[x]
          || URL.substr(0, 7) == 'mailto:'){
            flag = false;
            if (URL.substr(URL.length - 4) == '.' + configOptions.excluded_extensions[x])
            {
              fs.appendFile(configOptions.outputDirectory + '/excluded_urls.csv', [URL, url.parentUrl, URL.substr(URL.length - 4), '\n'], function (err) {
                if (err) throw err;
                console.log('Line 68');
              });

              fs.appendFile(configOptions.outputDirectory + '/excluded_urls.txt', [URL, '\n'], function (err) {
                if (err) throw err;
                console.log('Line 68');
              });
            }
      }
    }
  }
  return flag;
}

async function crawl(urlRoot, numUrlsEvaluated) {
  console.log('Entered crawl()\n');
  var numPagesEvaluated = 0, currentDepth = 0, index = 0;
  var traversed = Array();
  var excluded = Array();
  var tempUrl, evaluationStatus;

  var urlRootObject = new Url(urlRoot, currentDepth, '');
  var currentQueue = [urlRootObject];

  while (numPagesEvaluated < configOptions.maxPages && currentQueue.length) {
    console.log('\nStart of while loop: ');
    tempUrl = currentQueue.shift();
    console.log('Current Object:',tempUrl.getUrl,tempUrl.depth);

    if (!(tempUrl.url in traversed)){

      if (await validateLink(tempUrl)){
        console.log(tempUrl.url + ' is a valid URL');
        // traversed.push(tempUrl);
      } else {
        console.log(tempUrl.url + ' is a NOT a valid URL');
        excluded.push(tempUrl.url);
        continue;
      }
      
      evaluationStatus = await evaluateSinglePage(tempUrl, currentQueue, index, numUrlsEvaluated);

      if (evaluationStatus) {
        traversed.push(tempUrl.url);
      }
      else {
        excluded.push(tempUrl.url);
        continue;
      }

      index++;
      numPagesEvaluated++;
    }
    else {
      console.log(tempUrl, 'has already been traversed.');
    }
  }

  console.log('Loop end: Traversed:', traversed);
  console.log('Loop end: Excluded:', excluded);
}

async function evaluateSinglePage(url, currentQueue, index, numUrlsEvaluated) {
  try {
    console.log('Entered evaluateSinglePage()');

    var browser = await puppeteer.launch({
      args: ['--disable-web-security', '--no-sandbox', '--disable-setuid-sandbox']
    });
    var page = await browser.newPage();
    var flag = false;
    var newUrl;

    const millisecondsToSeconds = 1000;
    // load page with/without delay and wait
    await page.goto(url.getUrl, { timeout: configOptions.wait * millisecondsToSeconds, waitUntil: 'networkidle0' }); //wait
    console.log(url.getUrl, ' successfully navigated to.');
    await page.waitFor(configOptions.delay * millisecondsToSeconds); //delay

    // HTTP authentication
    if (configOptions.authentication) {
      const credentialsObject = { username: configOptions.username, password: configOptions.password };
      await page.authenticate(credentialsObject);
    }

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
    
    //Run evaluation
    var results = await page.evaluate(evaluateRules, configOptions.ruleset);

    if (results) {
      flag = true;
      console.log('Evaluation completed');
    }

    //Export results to file
    fs.writeFile(configOptions.outputDirectory + "/results_" + numUrlsEvaluated.toString() + '_' + index.toString() + ".json", results, function (err) {
      if (err) {
        return console.log(err);
      }

      console.log("results_" + url.getDepth.toString() + '_' + index.toString() + ".json was saved!");
    });

    if (url.getDepth < configOptions.depth) {
      // get all links and push at the end of currentQueue
      console.log('In adding area: ');
      const links = await page.evaluate(() => {
        const anchors = document.querySelectorAll('a');
        return [].map.call(anchors, a => a.href);
      });
      console.log('Passed links');
      for (var i = 0, max = links.length; i < max; i++) {
        newUrl = new Url(links[i], url.getDepth+1, url.getUrl);
        currentQueue.push(newUrl);
      }
    }

    //Close headless Chrome tab / page
    await page.close();
    await browser.close();
  } catch (error) {
    console.log(error);
  }

  return flag;
}

(async () => {
  
  if (directoryIsEmpty(configOptions.outputDirectory)){
    console.log('Specified directory not empty. Exiting.');
    process.exit();
  }

  else {
    try {
      fs.statSync(configOptions.outputDirectory);
    } catch(e) {
      fs.mkdirSync(configOptions.outputDirectory);
    }
  }

  var numUrlsEvaluated;
  //number of URLs from configOptions.urls that have been worked on
    
  for (numUrlsEvaluated = 0; numUrlsEvaluated < configOptions.urls.length; numUrlsEvaluated++) {
    console.log("Run " + numUrlsEvaluated + ":");
    await crawl(configOptions.urls[numUrlsEvaluated], numUrlsEvaluated);
  }

  process.exit(); //Quit entire node script
})();
