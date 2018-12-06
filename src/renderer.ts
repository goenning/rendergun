import puppeteer from "puppeteer";
import config from "./config";
import { log } from "./log";
import { delay, isURLBlackListed, isValidURL, removeTags } from "./util";

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
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
      executablePath: config.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    });

    this.browser.process().on("exit", async () => {
      this.browserWSEndpoint = undefined;
      log.renderer(`Chrome instance has exited.`);
      await this.initialize();
    });
    this.browserWSEndpoint = await this.browser.wsEndpoint();
    log.renderer(`Chrome instance started on '${this.browserWSEndpoint}'.`);
  }

  public async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  public async render(url: string): Promise<RenderResult> {
    if (!isValidURL(url)) {
      return {
        body: "Invalid URL",
        code: 400,
      };
    }

    if (!this.browserWSEndpoint) {
      await this.waitForChrome();
    }

    let response: puppeteer.Response|null = null;
    const browser = await puppeteer.connect({
      browserWSEndpoint: this.browserWSEndpoint,
    });
    const page = await browser.newPage();
    page.setUserAgent("rendergun (+http://github.com/goenning/rendergun)");
    page.addListener("response", (res) => {
      if (!response) {
        response = res;
      }
    });

    await page.setRequestInterception(true);

    page.on("request", (req) => {
      const blacklist = ["image"];
      if (blacklist.indexOf(req.resourceType()) >= 0) {
        return req.abort();
      }

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
    return { code: response.status(), body: html };
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
