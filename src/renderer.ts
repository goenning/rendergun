import puppeteer from "puppeteer";
import config from "./config";
import { log } from "./log";
import { delay, isURLBlackListed, removeTags } from "./util";

export interface RenderResult {
  code: number;
  body: string;
}

export default class Renderer {
  private browser: puppeteer.Browser | undefined;
  private browserWSEndpoint: string | undefined;

  public async initialize() {
    if (this.browser) {
      await this.browser.close();
    }

    this.browser = await puppeteer.launch({
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
      ],
      executablePath: config.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
      handleSIGINT: false,
      handleSIGTERM: false,
    });

    this.browser.process().on("exit", async () => {
      this.browserWSEndpoint = undefined;
      log.renderer(`Chrome instance has exited.`);
      await this.initialize();
    });
    this.browserWSEndpoint = await this.browser.wsEndpoint();
    log.renderer(`Chrome instance started on '${this.browserWSEndpoint}'.`);
  }

  public async isHealthy(): Promise<boolean> {
    if (!this.browser || !this.browserWSEndpoint) {
      return false;
    }
    const process = this.browser.process();
    return !!process && process.pid >= 0;
  }

  public async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  public async render(url: string): Promise<RenderResult> {
    const browser = await this.newBrowser();
    const page = await this.newPage(browser);
    let response: puppeteer.Response|null = null;
    page.addListener("response", (res) => {
      if (!response) {
        response = res;
      }
    });

    page.on("request", (req) => {
      if (isURLBlackListed(req.url())) {
        return req.abort();
      }

      req.continue();
    });

    response = await page.goto(url, {
      timeout: config.timeout,
      waitUntil: "networkidle0",
    });

    if (!response) {
      return { code: 400, body: "no response" };
    }

    await removeTags(page, ["script", "noscript"]);

    const html = await page.content();
    await page.close();
    await browser.disconnect();
    return { code: response.status(), body: html };
  }

  public async renderString(url: string, content: string): Promise<RenderResult> {
    const browser = await this.newBrowser();
    const page = await this.newPage(browser);

    page.on("request", (req) => {
      if (isURLBlackListed(req.url())) {
        return req.abort();
      }

      if (req.resourceType() === "document") {
        req.respond({
          status: 200,
          contentType: "text/html",
          body: content,
        });
      } else {
        req.continue();
      }
    });

    await page.goto(url, {
      timeout: config.timeout,
      waitUntil: "load",
    });
    await removeTags(page, ["script", "noscript"]);

    const html = await page.content();
    await page.close();
    await browser.disconnect();
    return { code: 200, body: html };
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
