'use strict';

const fs = require('fs');

const args = process.argv;
var configOptions;

if (args[2] == '-c' && fs.existsSync(args[3] + '.json')){
  const filenameWithPath = args[3] + '.json';
  configOptions = require(filenameWithPath);
}
else {
  if (args[3] == undefined)
    console.log('Please specify a configuration file.');
  else
    console.log('Specified file at ' + args[3] + '.json is not a valid config file.');
  process.exit();
}

const puppeteer = require('puppeteer');
const validUrl = require('valid-url');
const parse = require('url-parse');

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

// Start of helper functions

function trimUrl(passedUrl) {
  var trimmedUrl = passedUrl;

  if (trimmedUrl.includes('#')){
    trimmedUrl = trimmedUrl.substr(0,trimmedUrl.indexOf('#'));
  }

  if (trimmedUrl.substr(-1,) == '/'){
    trimmedUrl = trimmedUrl.substr(0,trimmedUrl.length-1);
  }

  if (trimmedUrl.substr(0,7) == 'http://') {
    trimmedUrl = trimmedUrl.substr(7,);
  }
    
  else if (trimmedUrl.substr(0,8) == 'https://') {
    trimmedUrl = trimmedUrl.substr(8,);
  }

  return trimmedUrl;
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
  return flag;
}

async function getLinks(){
  var documentLinksObject = document.links;
  var links = Array();

  for (var i = 0; i < documentLinksObject.length; i++){
    // links[i] = trimUrl(documentLinksObject[i].href);
    links[i] = documentLinksObject[i].href;
  }

  return links;
}

async function getActualURL(){
  var temp = location.href;
  console.log('Actual URL:', temp);
  // if (temp.includes('#')){
  //   temp = temp.substr(0,temp.indexOf('#'));
  // }

  // if (temp.substr(0,11) == 'http://www.') {
  //     temp = temp.substr(11,);
  //   }
    
  // else if (temp.substr(0,12) == 'https://www.') {
  //   temp = temp.substr(12,);
  // }

  return temp;
}

function singleToDoubleQuotes(input){
  return input.replace(/'/g, '"');
}

function filter(input){
  if (configOptions.spanDomains == [] && configOptions.excludeDomains == [])
    return true;

  for (var i=0; i<configOptions.spanDomains; i++){
    if (input.substr(-spanDomains[i].length) == spanDomains[i])
      return true;
  }

  for (var i=0; i<configOptions.excludeDomains; i++){
    if (input.substr(-excludeDomains[i].length) == excludeDomains[i])
      return false;
  }

  return false;
}

async function evaluateRules(passedRuleset) {
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
  
  var parsed = parse(URL);
  console.log(parsed['host']);

  if (filter(parsed['host'])){
    fs.appendFile(configOptions.outputDirectory + '/filtered_urls.csv', [singleToDoubleQuotes(URL), url.parentUrl, '\n'], function (err) {
      if (err) throw err;
      console.log('Line 68');
    });

    fs.appendFile(configOptions.outputDirectory + '/filtered_urls.txt', [URL + '\n'], function (err) {
      if (err) throw err;
      console.log('Line 68');
    });

    return flag;
  }

  if (true){
    flag = true;
    for (var x = 0; x < configOptions.excluded_extensions.length && flag; x++){
      if (URL.substr(URL.length - 4) == '.' + configOptions.excluded_extensions[x]
          || URL.substr(0, 7) == 'mailto:'){
            flag = false;
            if (URL.substr(URL.length - 4) == '.' + configOptions.excluded_extensions[x])
            {
              fs.appendFile(configOptions.outputDirectory + '/excluded_urls.csv', [singleToDoubleQuotes(URL), url.parentUrl, URL.substr(URL.length - 4), '\n'], function (err) {
                if (err) throw err;
                console.log('Line 68');
              });

              fs.appendFile(configOptions.outputDirectory + '/excluded_urls.txt', [URL + '\n'], function (err) {
                if (err) throw err;
                console.log('Line 68');
              });
            }
      }
    }
  }
  return flag;
}

// End of helper functions

var browser, page; // Global references to the browser and tab

async function crawl(urlRoot, numUrlsEvaluated) {
  console.log('Entered crawl()\n');
  var numPagesEvaluated = 0, currentDepth = 0, index = 0;
  var traversed = Array();
  var excluded = Array();
  var tempUrl, evaluationStatus;
  // var trimmedRoot = trimUrl(urlRoot);

  var urlRootObject = new Url(urlRoot, currentDepth, '');
  var currentQueue = [urlRootObject];

  while (numPagesEvaluated < configOptions.maxPages && currentQueue.length) {
    console.log('\nStart of while loop: ');
    tempUrl = currentQueue.shift();
    console.log('Current Object:',tempUrl.getUrl,tempUrl.depth);

    // console.log(traversed, 'right now.');

    if (!(traversed.includes(tempUrl.getUrl))){

      // console.log('182');
      // console.log(!(tempUrl.getUrl in traversed));
  
      if (await validateLink(tempUrl)){
        console.log(tempUrl.url + ' is a valid URL');
        // traversed.push(tempUrl);
      } else {
        console.log(tempUrl.url + ' is a NOT a valid URL');
        excluded.push(tempUrl.url);
        continue;
      }
      
      evaluationStatus = await evaluateSinglePage(tempUrl, currentQueue, index, numUrlsEvaluated, traversed);

      if (evaluationStatus[0]) {
        traversed.push(evaluationStatus[1]);

        fs.appendFile(configOptions.outputDirectory + '/processed_urls.csv', [singleToDoubleQuotes(evaluationStatus[1]), tempUrl.parentUrl, '\n'], function (err) {
          if (err) throw err;
          // console.log('Line 118');
        });

        fs.appendFile(configOptions.outputDirectory + '/processed_urls.txt', [evaluationStatus[1] + '\n'], function (err) {
          if (err) throw err;
          // console.log('Line 123');
        });
      }
      else {
        excluded.push(tempUrl.url);

        fs.appendFile(configOptions.outputDirectory + '/unprocessed_urls.csv', [singleToDoubleQuotes(evaluationStatus[1]), tempUrl.parentUrl, '\n'], function (err) {
          if (err) throw err;
          // console.log('Line 118');
        });

        fs.appendFile(configOptions.outputDirectory + '/unprocessed_urls.txt', [evaluationStatus[1] + '\n'], function (err) {
          if (err) throw err;
          // console.log('Line 123');
        });

        continue;
      }

      index++;
      numPagesEvaluated++;
    }
    else {
      console.log(tempUrl.getUrl, 'has already been traversed.');
    }
  }

  console.log('Loop end: Traversed:', traversed);
  console.log('Loop end: Excluded:', excluded);
}

async function evaluateSinglePage(url, currentQueue, index, numUrlsEvaluated, traversed) {
  try {
    console.log('Entered evaluateSinglePage()');
    
    var flag = false;
    var newUrl;

    const millisecondsToSeconds = 1000;
    // load page with/without delay and wait
    console.log('I am being told to open this:', url.getUrl);
    console.log(await page.goto(url.getUrl, { timeout: configOptions.wait * millisecondsToSeconds, waitUntil: 'networkidle0' })); //wait
    
    console.log(url.getUrl, ' successfully navigated to.');
    await page.waitFor(configOptions.delay * millisecondsToSeconds); //delay

    try {
      var actualURL = await page.evaluate(await getActualURL);
    } catch (error) {
      console.log(error);
      return [flag, undefined];
    }

    
    console.log('actualURL', actualURL);

    if (actualURL in traversed){
      console.log(actualURL, 'has already been processed.');
      traversed.push(actualURL);
      return [flag, actualURL];
    }
    
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
    var results = await page.evaluate(await evaluateRules, configOptions.ruleset);

    if (results) {
      flag = true;
      console.log('Evaluation completed');
    }

    //Export results to file
    fs.writeFile(configOptions.outputDirectory + "/results_" + url.getDepth.toString() + '_' + index.toString() + ".json", results, function (err) {
      if (err) {
        return console.log(err);
      }

      console.log("results_" + url.getDepth.toString() + '_' + index.toString() + ".json was saved!");
    });

    if (url.getDepth < configOptions.depth) {
      // get all links and push at the end of currentQueue
      console.log('In adding area: ');
      
      var links = await page.evaluate(await getLinks);

      // console.log('Links', links);
      
      console.log('Passed links');
      for (var i = 0; i < links.length; i++) {
        newUrl = new Url(links[i], url.getDepth+1, url.getUrl);
        currentQueue.push(newUrl);
      }
    }

  } catch (error) {
    console.log(error);
  }

  return [flag, actualURL];
}

(async () => {

  browser = await puppeteer.launch({
    args: ['--disable-web-security', '--no-sandbox', '--disable-setuid-sandbox']
  });

  page = await browser.newPage();

  page.on('requestfailed', request => {
    console.log(request.url() + ' ' + request.failure().errorText);
  });

  // await page.setRequestInterception(true);
  // page.on('request', request => {
  // if (request.isNavigationRequest() && request.redirectChain().length > 1)
  //   request.abort();
  // else
  //   request.continue();
  // });

  if (fs.existsSync(configOptions.outputDirectory)){
    console.log('Specified directory', configOptions.outputDirectory, 'exists.');
    if (!directoryIsEmpty(configOptions.outputDirectory)){
      console.log('Specified directory', configOptions.outputDirectory, 'not empty. Exiting.');
      process.exit();
    }
  }
  else {
    fs.mkdirSync(configOptions.outputDirectory);
  }

  var numUrlsEvaluated;
  //number of URLs from configOptions.urls that have been worked on

  for (numUrlsEvaluated = 0; numUrlsEvaluated < configOptions.urls.length; numUrlsEvaluated++) {
    console.log("Run " + numUrlsEvaluated + ":");
    await crawl(configOptions.urls[numUrlsEvaluated], numUrlsEvaluated);
  }

  //Close headless Chrome tab / page
  await page.close();

  //Close headless Chrome browser
  await browser.close();

  process.exit(); //Quit entire node script
})();
