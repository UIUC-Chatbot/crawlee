// For more information, see https://crawlee.dev/
import { Configuration, PlaywrightCrawler, downloadListOfUrls } from "crawlee";
import { Page } from "playwright";
import axios from 'axios';
// import { isWithinTokenLimit } from "gpt-tokenizer";

import { Config, configSchema } from "./configValidation.js";
import { ingestPdf, uploadPdfToS3 } from "./uploadToS3.js";

export async function crawl(config: Config) {
  configSchema.parse(config);
  let pageCounter = 0;
  // const results: Array<{ title: string; url: string; html: string }> = [];

  if (config.url) {
    console.log(`Crawling URL: ${config.url}`);
    if (process.env.NO_CRAWL !== "true") {
      // PlaywrightCrawler crawls the web using a headless
      // browser controlled by the Playwright library.
      const crawler = new PlaywrightCrawler({
        // Use the requestHandler to process each of the crawled pages.
        async requestHandler({ request, page, enqueueLinks, log, pushData }) {
          console.log(`Crawling: ${request.loadedUrl}...`);
          const title = await page.title();
          pageCounter++;
          log.info(
            `Crawling: Page ${pageCounter} / ${config.maxPagesToCrawl} - URL: ${request.loadedUrl}...`,
          );

          // Use custom handling for XPath selector
          if (config.selector) {
            if (config.selector.startsWith("/")) {
              await waitForXPath(
                page,
                config.selector,
                config.waitForSelectorTimeout ?? 1000,
              );
            } else {
              await page.waitForSelector(config.selector, {
                timeout: config.waitForSelectorTimeout ?? 1000,
              });
            }
          }
          // page.on('console', message => console.log(`Page log: ${message.text()}`)); // refactored for memory leaks
          const consoleListener = (message: { text: () => any; }) => console.log(`Page log: ${message.text()}`);
          page.on('console', consoleListener);
          const html = await getPageHtml(page, config.selector);

          // Grab results from the page
          if (request.loadedUrl) {
            // results.push({ title, url: request.loadedUrl, html });


            // TODO: handle all file types (this is probably better than the transform function below)
            // const validFiletypes = ['.html', '.py', '.vtt', '.pdf', '.txt', '.srt', '.docx', '.ppt', '.pptx']
            // if (validFiletypes.some(ext => req.url.endsWith(ext))) {
            //   // If URL is a file, send it to handleFile
            //   handleFile(req.url, config.courseName);
            //   return null; // Returning null will prevent the URL from being enqueued
            // }

            if (request.loadedUrl.endsWith('.pdf')) {
              // Download PDFs specially 
              console.log(`Downloading PDF: ${request.loadedUrl}`);
              handlePdf(request.loadedUrl, config.courseName);
            } else {
              // Asynchronously call the ingestWebscrape endpoint without awaiting the result
              axios.post('https://flask-production-751b.up.railway.app/ingest-web-text', {
                base_url: config.url,
                url: request.loadedUrl,
                title: title,
                content: html,
                courseName: config.courseName,
              }).then(() => {
                console.log(`Data ingested for URL: ${request.loadedUrl}`);
              }).catch(error => {
                console.error(`Failed to ingest data for URL: ${request.loadedUrl}`, error.name, error.message, error.data);
              });
            }
          } else {
            console.error('Error: URL is undefined. Title is: ', title);
          }

          if (config.onVisitPage) {
            await config.onVisitPage({ page, pushData });
          }
          page.off('console', consoleListener); // remove listener to avoid memory leak

          // Extract links from the current page and add them to the crawling queue.
          // Docs https://crawlee.dev/docs/introduction/adding-urls#filtering-links-to-same-domain
          // 1. scrape all -- wander the internet.
          // 2. scrape domain and all subdomains.
          // 3. scrape just equal and below the given URL -- match statement.
          if (config.scrapeStrategy == 'all' || config.scrapeStrategy == 'same-domain') {
            await enqueueLinks({
              strategy: config.scrapeStrategy
            })
          } else {
            // strategy: 'equal-and-below' == stay on the same domain and subdomains
            await enqueueLinks({
              globs:
                typeof config.match === "string" ? [config.match] : config.match,

              // `http?(s)://${config.url.domain}` idk....
              // strategy: 'same-hostname',

              // DEPRECATED
              // transformRequestFunction(req) {
              //   return req;
              // },
              exclude:
                typeof config.exclude === "string"
                  ? [config.exclude]
                  : config.exclude ?? [],
            });
          }
        },
        // Comment this option to scrape the full website.
        maxRequestsPerCrawl: config.maxPagesToCrawl,
        // Uncomment this option to see the browser window.
        // headless: false,
        preNavigationHooks: [
          // Abort requests for certain resource types
          async ({ request, page, log }) => {
            // If there are no resource exclusions, return
            const RESOURCE_EXCLUSTIONS = config.resourceExclusions ?? [];
            if (RESOURCE_EXCLUSTIONS.length === 0) {
              return;
            }
            if (config.cookie) {
              const cookies = (
                Array.isArray(config.cookie) ? config.cookie : [config.cookie]
              ).map((cookie: { name: any; value: any; }) => {
                return {
                  name: cookie.name,
                  value: cookie.value,
                  url: request.loadedUrl,
                };
              });
              await page.context().addCookies(cookies);
            }
            await page.route(`**\/*.{${RESOURCE_EXCLUSTIONS.join()}}`, (route) =>
              route.abort("aborted"),
            );
            log.info(
              `Aborting requests for as this is a resource excluded route`,
            );
          },
        ],
      },
        new Configuration({
          persistStorage: false,
        }));

      const isUrlASitemap = /sitemap.*\.xml$/.test(config.url);
      if (isUrlASitemap) {
        const listOfUrls = await downloadListOfUrls({ url: config.url });

        // Add the initial URL to the crawling queue.
        await crawler.addRequests(listOfUrls);

        await crawler.run();
      } else {
        // Add first URL to the queue and start the crawl.
        await crawler.run([config.url]);
      }
      if (crawler) {
        await crawler.teardown();
        // const store = await KeyValueStore.open();
        // await store.drop();
      }
    }
  }
  return pageCounter;
}

// ----- HELPERS -----

async function handlePdf(url: string, courseName: string) {
  const s3Key = await uploadPdfToS3(url, courseName);
  await new Promise(resolve => setTimeout(resolve, 3000));
  await ingestPdf(s3Key, courseName);
}

function getPageHtml(page: Page, selector = "body") {
  return page.evaluate((selector) => {
    // Exclude header, footer, nav from scraping
    const elementsToExclude = document.querySelectorAll('header, footer, nav');
    elementsToExclude.forEach(element => element.remove());
    // Check if the selector is an XPath
    if (selector.startsWith("/")) {
      console.log(`XPath: ${selector}`);
      const elements = document.evaluate(
        selector,
        document,
        null,
        XPathResult.ANY_TYPE,
        null,
      );
      const result = elements.iterateNext();
      return result ? result.textContent || "" : "";
    } else {
      // Handle as a CSS selector
      const el = document.querySelector(selector) as HTMLElement | null;
      return el?.innerText || "";
    }
  }, selector);
}

async function waitForXPath(page: Page, xpath: string, timeout: number) {
  await page.waitForFunction(
    (xpath) => {
      const elements = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.ANY_TYPE,
        null,
      );
      return elements.iterateNext() !== null;
    },
    xpath,
    { timeout },
  );
}
