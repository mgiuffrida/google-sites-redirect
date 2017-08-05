(function() {
'use strict';

let verbose = false;

let info;
if (verbose)
  info = console.info.bind(console);
else
  info = function() {};

// URLs to redirect, starting with the domain name. No trailing slash.
const alternatives = ['sites.google.com/a/chromium.org/dev',
                      'dev.chromium.org'];
const canonical = 'https://www.chromium.org';

function buildRegex() {
  let reString = 'https?://';
  // Escape '.' characters for regex.
  reString += '(?:' + alternatives.join('|').replace(/\./g, '\\.') + ')';

  // Allow sub-directories.
  reString += '(?=$|/.*)';

  return new RegExp(reString);
}

chrome.runtime.onInstalled.addListener(function() {
  let sitesRegex = buildRegex();

  let oldIds = new Set();

  let MAX_REDIRECTS = 10;
  let MAX_REDIRECT_INTERVAL = 1000;
  let timerId = null;
  let numRedirects = 0;

  let resetRedirects = function() {
    timerId = null;
    numRedirects = 0;
  };

  let beforeRequestCallback = function(details) {
    // Don't process the same request twice.
    if (oldIds.has(details.requestId)) {
      info('Already processed this request.');
      return;
    }

    let match = details.url.match(sitesRegex);
    if (!match)
      return;

    if (++numRedirects == MAX_REDIRECTS)
      throw new Error('Exceeded maximum number of redirects in interval');

    if (timerId === null)
      timerId = setTimeout(resetRedirects, MAX_REDIRECT_INTERVAL);

    oldIds.add(details.requestId);

    let newUrl = canonical + details.url.substring(match[0].length);
    return {redirectUrl: newUrl};
  };

  let filter = {
    urls: alternatives.map(url => '*://' + url + '/*'),
    types: ['main_frame'],
  };

  // Blocking so we can redirect.
  let extraInfoSpec = ['blocking'];

  // Register redirect rules.
  chrome.webRequest.onBeforeRequest.addListener(
      beforeRequestCallback, filter, extraInfoSpec);
});

})();
