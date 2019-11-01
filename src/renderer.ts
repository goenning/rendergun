import puppeteer from "puppeteer";
import pptrErrors from "puppeteer/Errors";
import { isURLBlocked } from "./blocker";
import { log } from "./log";
import { delay, removeTags } from "./util";

export interface RenderResult {
  code: number;
  body: string;
}

export interface RenderOptions {
  content?: string;
  timeout?: number;
  waitUntil?: string;
  abortRequestRegexp?: string;
  blockAds?: boolean;
}

export default class Renderer {
  private interval?: NodeJS.Timeout;
  private logger: debug.Debugger;
  private browser: puppeteer.Browser | undefined;
  private browserWSEndpoint: string | undefined;
  private activeRequests = 0;
  private recentRequests = 0;

  constructor(public id: number) {
    this.logger = log.renderer.extend(this.id.toString());
  }

  public async initialize() {
    this.activeRequests = 0;
    this.recentRequests = 0;

    if (this.browser) {
      await this.browser.close();
    }

    this.browser = await puppeteer.launch({
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
      ],
      headless: true,
      ignoreHTTPSErrors: true,
      handleSIGINT: false,
      handleSIGTERM: false,
    });

    this.browser.process().on("exit", this.onChromeExit);
    this.browserWSEndpoint = await this.browser.wsEndpoint();
    this.logger(`Chrome instance started on '${this.browserWSEndpoint}'.`);

    this.interval = setInterval(() => {
      if (this.activeRequests === 0 && this.recentRequests > 50) {
        log.renderer(`Restarting renderer after ${this.recentRequests} requests.`);
        this.recentRequests = 0;
        this.close();
      }
    }, 30 * 1000);
  }

  public async isHealthy(): Promise<boolean> {
    try {
      await this.version();
      return true;
    } catch {
      return false;
    }
  }

  public async version(): Promise<string> {
    if (!!this.browser && !!this.browserWSEndpoint) {
      const process = this.browser.process();
      if (!!process && process.pid >= 0) {
        return this.browser.version();
      }
    }
    throw new Error("Chrome is not running.");
  }

  public async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  public async finalize() {
    this.logger("Shutting down the renderer.");
    if (this.browser) {
      this.browser.process().removeListener("exit", this.onChromeExit);
      await this.close();
      this.logger("Rendered has been shutdown.");
    }
  }

  public async render(url: string, opts: RenderOptions = {}): Promise<RenderResult> {
    const startTime = Date.now();
    this.logger(`Starting rendering process of '${url}'.`);
    this.recentRequests++;
    this.activeRequests++;
    const browser = await this.newBrowser();
    const page = await this.newPage(browser);

    let response: puppeteer.Response|null = null;
    page.on("request", async (req) => {
      if (req.resourceType() === "document" && opts.content) {
        return req.respond({
          status: 200,
          contentType: "text/html",
          body: opts.content,
        });
      }

      const blocked = await isURLBlocked(req, {
        abortRegExp: opts.abortRequestRegexp,
        blockAds: opts.blockAds,
      });

      if (blocked) {
        return req.abort();
      }
      return req.continue();
    });

    try {
      response = await page.goto(url, {
        timeout: opts.timeout || 10000,
        waitUntil: (opts.waitUntil || "load") as puppeteer.LoadEvent,
      });

      if (!response) {
        return { code: 400, body: "no response" };
      }

      await removeTags(page, ["script", "noscript"]);

      return {
        code: response.status(),
        body: await page.content(),
      };

    } catch (err) {
      if (err instanceof pptrErrors.TimeoutError) {
        return { code: 504, body: err.message };
      }
      throw err;
    } finally {
      const elapsedTime = Date.now() - startTime;
      this.logger(`Finished rendering process of '${url}', it took ${elapsedTime}ms.`);
      this.activeRequests--;
      await page.close();
      await browser.disconnect();
    }
  }

  private async newBrowser(): Promise<puppeteer.Browser> {
    if (!this.browserWSEndpoint) {
      await this.waitForChrome();
    }

    return await puppeteer.connect({
      browserWSEndpoint: this.browserWSEndpoint,
    });
  }

  private async newPage(browser: puppeteer.Browser): Promise<puppeteer.Page> {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.setUserAgent("rendergun (+http://github.com/goenning/rendergun)");
    return page;
  }

  private onChromeExit = async () => {
    if (this.interval) {
      clearInterval(this.interval);
    }

    this.browserWSEndpoint = undefined;
    this.logger(`Chrome instance has exited.`);
    await this.initialize();
  }

  private async waitForChrome() {
    let count = 0;
    while (count <= 10) {
      if (this.browserWSEndpoint) {
        return;
      }
      count++;
      await delay(200);
    }
  }
}
