# fae-util-2
Utility used by FAE technologies to spider and analyze web pages using OpenAjax evaluation library in Google Chromium browser.

## Overview 

* The utility is designed to support spidering a website or traversing a list of URLs and analyzing the content of each URL using JavaScript. 
* Utility accepts a configuration file identifying URLs for analysis and a list of JavaScript files to be used for analysis. 
* Using these inputs, it retrieves the DOM specified by the URL information, runs the code in the JavaScript files using the DOM as an input, and returns the output of the JavaScript. 
* The JavaScript files used for analysis must return text content (e.g. in some format like JSON or XML) for each URL and this content is saved to disk.
* The utility also provides additional information URL, such as the request and returned URL, and URLS that were filtered or could not be processed for some reason (i.e. broken link, invalid script)

## Installation and Usage

* Make sure you have a recent version of [Node.js](https://nodejs.org) installed.
* This tool relies on Node.js for full functionality. Please ensure your installed version of Node matches the requirements specified by [Puppeteer](https://github.com/GoogleChrome/puppeteer#usage).  
* Clone the repository.
* In the repository's directory, run ```npm install```. This will install the required Node.js packages for fae-util-2 to run.
* Create a new [configuration file](#configuration-file-format-and-options) or use one provided in the folder *testFiles*. 
* To run the script, run the following command in Command Prompt(on Windows) or Terminal(on Linux/Mac OS) 
```
node fae-util-2.js -c <./location_of_config_file/configuration_file_name>
```

For example, to use the *shaverscreek.json* configuration file in *testFiles* folder, you should use the command 

```
node fae-util-2.js -c ./testFiles/shaverscreek
```

## Specifying Configuration File

You need to specify a configuration file using the ```-c``` flag as a command line argument. Its usage its as follows

```
-c  <./location_of_config_file/configuration_file_name>
```

## Configuration File Format and Options 

A valid configuration file will have the following format

```
{
    "urls": <array of strings>,
    "maxPages": <number>,
    "wait": <number>,
    "delay": <number>,
    "ruleset": <aria_ruleset>,
    "outputDirectory": <string>,
    "version": <string>,
    "authorization": <boolean>,
    "credentials": {
        "username": <string>,
        "password": <string>
    },
    "path": <string>,
    "spanDomains": <array of strings>,
    "includeDomains": <array of strings>,
    "excludeDomains": <array of strings>,
    "depth": <number>,
    "exportOption": <string>,
    "debug": <string>,
    "excluded_extensions": <array of strings>,
    "excluded_prefixes": <array of strings>
}

```

An [example configuration file](https://github.com/opena11y/fae-util-2/blob/master/testFiles/shaverscreek.json) for Shaverscreek website.

## Running the Evaluation Library and getting Evaluation Results

* This code is used to run the evaluation library and return evaluation results and is part of the source code of fae-util-2

```
async function evaluateRules(passedRuleset) {
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
```

## Output Files

The script will output the following JSON files.

* status.txt: Contains information about the current status of the script. It updates constantly while the script is running.
* excluded_urls.csv: Each entry contains "[url excluded]","[url excluded resource found]", "[file extension]"
* excluded_urls.txt: Simple list of excluded URLs
* processed_urls.csv: Each entry contains "[url processed]","[url actual returned]","[url where resource found]", [status code], [processing time]
* processed_urls.txt: Simple list of processed URLs
* filtered_urls.csv: Each entry contains "[url filtered]","[url where filtered page found]"
* filtered_urls.txt: Simple list of filtered URLs
* unprocessed_urls.csv: Each entry contains "[url processed]","[url actual returned]","[url where resource found]", [status code], [processing time]
* unprocessed_urls.txt: Simple list of unprocessed URLs

[Example evaluation output](https://github.com/opena11y/fae-util-2/wiki#example-configurations).
