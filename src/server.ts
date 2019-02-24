import compression = require("compression");
import express from "express";
import { Server as HttpServer } from "http";
import { Cache } from "./cache";
import config from "./config";
import { log } from "./log";
import Renderer from "./renderer";
import { isValidURL } from "./util";

export class Server {
  private app: express.Express;
  private cache: Cache;
  private renderer: Renderer;
  private httpServer: HttpServer | undefined;
  private activeRequests = 0;
  private recentRequests = 0;

  constructor() {
    this.cache = new Cache();
    this.renderer = new Renderer();
    this.app = express();
    this.app.use(compression());
    this.app.use((req, res, next) => {
      let data = "";
      req.setEncoding("utf8");
      req.on("data", (chunk) => {
         data += chunk;
      });
      req.on("end", () => {
          req.body = data;
          next();
      });
    });

    this.app.get("/", (req, res) => {
      res.status(200).send("");
    });

    this.app.get("/-/health", async (req, res) => {
      try {
        const version = await this.renderer.version();
        res.status(200).send(`Healthy: Yes <br/> Version: ${version}`);
      } catch (err) {
        res.status(500).send(`Healthy: No <br/> Error: ${err.message}`);
      }
    });

    this.app.get("/render", this.handleRender);
    this.app.post("/render", this.handleRender);
  }

  public async start() {
    await this.renderer.initialize();
    this.httpServer = this.app.listen(config.port, () => {
      if (process.send) {
        process.send("ready");
      }
      log.http(`Rendergun started on port ${config.port}.`);
    });

    setInterval(() => {
      this.cache.stats();

      if (this.activeRequests === 0 && this.recentRequests > 50) {
        log.renderer(`Restarting renderer after ${this.recentRequests} requests.`);
        this.recentRequests = 0;
        this.renderer.close();
      }
    }, 30 * 1000);
  }

  public close() {
    log.http("Shutting down the HTTP server.");
    this.cache.prune();
    if (this.httpServer) {
      this.httpServer.close(() => {
        log.http("Server has been shutdown.");
        this.renderer.finalize().then(() => {
          process.exit(0);
        });
      });
    }
  }

  private handleRender = async (req: express.Request, res: express.Response) => {
    this.recentRequests++;
    this.activeRequests++;
    const url = decodeURIComponent(req.query.url);

    if (!isValidURL(url)) {
      return res.status(400).send("Invalid URL");
    }

    const cachedEntry = this.cache.get(url);
    if (cachedEntry) {
      return res.status(cachedEntry.code).send(cachedEntry.body);
    }

    try {
      const result = await this.renderer.render(url, {
        content: req.body,
        waitUntil: req.header("x-rendergun-wait-until"),
        timeout: asNumber(req.header("x-rendergun-timeout")),
        abortRequestRegexp: req.header("x-rendergun-abort-request"),
      });

      if (result.code >= 200 && result.code < 300) {
        this.cache.set(url, {
          code: result.code,
          body: result.body,
        });
      }

      return res.status(result.code).send(result.body);
    } catch (err) {
      log.error(err);
      return res.status(500).send(err.toString());
    } finally {
      this.activeRequests--;
    }
  }
}

const asNumber = (value: string | undefined): number | undefined => {
  return value ? parseInt(value, 10) : undefined;
};
