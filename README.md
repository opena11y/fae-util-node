# fae-util-2
Utility used by FAE technologies to spider and analyze web pages using OpenAjax evaluation library using the chrome browser

## Overview 

* The utility is designed to support spidering a website or traversing a list of URLs and analyzing the content of each URL using !JavaScript. 
* Utility accepts a set of URLs and a text file containing a list of JavaScript files to be used for analysis. 
* Using these inputs, it retrieves the DOM specified by the URL information, runs the code in the JavaScript files using the DOM as an input, and returns the output of the !JavaScript. 
* The !JavaScript files used for analysis must return text content (e.g. in some format like JSON or XML) for each URL and this content is saved to disk.
* The utility also provides additional information URL, such as the request and returned URL, and URLS that were filtered or could not be processed for some reason (i.e. broken link, invalid script)

## fae-util Command Line Options 

### Specifying URLs to Analyze 

* If -u or -- url is specified, its value is considered to be the starting URL of the analysis.
* If -m or --multipleUrls is specified, its value points to a file containing a list of URLs to traverse.
* If -m (or --multipleUrls) is specified along with -d, --depth, -s, --spanDomains, -i, --includeDomains or -e, --excludeDomains, exit with an error message: "Cannot specify <options> with --multipleUrls."
* If both -u (or --url) and -m (or --multipleUrls are specified, exit with an error message: "Cannot specify both starting URL and multiple URLs file."

```
-u, --url <arg>              Required (unless -m, --multipleUrls is specified): starting URL
# or
-m, --multipleUrls <arg>     Required (unless -u, --url is specified): filename containing URLs to evaluate
```

### Other Command Line Options ==

```
-o, --outputDirectory <arg>  Required: directory for results files

-p, --path                 Optional: path the URL must include to be included in the evaluation


-c, --config <arg>           Optional: filename of configuration parameters
-a, --authorization <arg>    Optional: filename of authorization information

-s, --spanDomains <arg>      Optional: traverse the subdomains of these domains (comma-separated list), in addition to the domain specified by the URL
-i, --includeDomains <arg>   Optional: traverse these domains (comma-separated list) in addition to the domain specified by the URL
-e, --excludeDomains <arg>   Optional: do not traverse these domains (comma-separated list; valid only if -s is specified; each domain must be a subdomain of an entry in spanDomains)

-d, --depth <arg>            Optional: maximium depth to traverse (number: 1 | 2 | 3, default = 1, which means no traversing)
-w, --wait <arg>             Optional: maximium time in milliseconds to wait when processing a page, default = 30000 msec. (30 seconds)

-r, --ruleset <arg>          Optional: OAA ruleset ID ('ARIA_TRANS' | 'ARIA_STRICT', default = 'ARIA_TRANS')
-xo, --exportOption <arg>    Optional: True | False, default = False 

-v, --version                Optional: output the fae-util version number
-h, --help                   Optional: output help for command-line syntax and options

-m, -maxPages <arg>          Optional: maximum number of pages to process, default is no limit

-j, --javaScript             Optional: HtmlUnit javascript option (true | false, default = true, which enables javascript)  
```

