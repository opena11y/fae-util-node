const fs = require('fs');
const puppeteer = require('puppeteer');

const crawledPages = new Map();
const maxDepth = DEPTH; // Subpage depth to crawl site.


function collectAllSameOriginAnchorsDeep(sameOrigin = true) {
const allElements = [];

const findAllElements = function(nodes) {
    for (let i = 0, el; el = nodes[i]; ++i) {
    allElements.push(el);
    // If the element has a shadow root.
    if (el.shadowRoot) {
        findAllElements(el.shadowRoot.querySelectorAll('*'));
    }
    }
};

findAllElements(document.querySelectorAll('*'));

const filtered = allElements
    .filter(el => el.localName === 'a' && el.href) // element is an anchor with an href.
    .filter(el => el.href !== location.href) // link doesn't point to page's own URL.
    .filter(el => {
    if (sameOrigin) {
        return new URL(location).origin === new URL(el.href).origin;
    }
    return true;
    })
    .map(a => a.href);

return Array.from(new Set(filtered));
}

/**
 * Visit a url, then recursively visit any child subpages.
 */
async function crawl(browser, page, depth = 0) {
if (depth > maxDepth) {
    return;
}

// If we've already crawled the URL, we know its children.
if (crawledPages.has(page.url)) {
    console.log(`Reusing route: ${page.url}`);
    const item = crawledPages.get(page.url);
    page.title = item.title;
    page.img = item.img;
    page.children = item.children;
    // Fill in the children with details (if they already exist).
    page.children.forEach(c => {
    // Run evaluation
    });
    return;
} else {
    console.log(`Loading: ${page.url}`);

    const newPage = await browser.newPage();
    await newPage.goto(page.url, {waitUntil: 'networkidle2'});

    let anchors = await newPage.evaluate(collectAllSameOriginAnchorsDeep);
    anchors = anchors.filter(a => a !== URL) // link doesn't point to start url of crawl.

    page.title = await newPage.evaluate('document.title');
    page.children = anchors.map(url => ({url}));

    crawledPages.set(page.url, page); // cache it.

    await newPage.close();
}

// Crawl subpages.
for (const childPage of page.children) {
    await crawl(browser, childPage, depth + 1);
}
}

(async() => {

const browser = await puppeteer.launch();
const page = await browser.newPage();

const root = {url: URL};
await crawl(browser, root);

//fs writefile

await browser.close();

})();
