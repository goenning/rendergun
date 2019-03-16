import compression = require("compression");
import express, { Express, Request, Response} from "express";
import { Server as HttpServer } from "http";
import { Cache } from "./cache";
import config from "./config";
import { log } from "./log";
import Renderer from "./renderer";
import { asNumber, bodyParser, isValidURL } from "./util";

export class Server {
  private app: Express;
  private cache: Cache;
  private renderers: Renderer[] = [];
  private httpServer: HttpServer | undefined;
  private nextWorkerIdx: number = 0;

  constructor() {
    this.cache = new Cache();
    for (let i = 0; i < config.numOfWorkers; i++) {
      this.renderers.push(new Renderer(i));
    }

    this.app = express();
    this.app.use(compression());
    this.app.use(bodyParser());

    this.app.get("/", (req, res) => {
      res.status(200).send("");
    });

    this.app.get("/-/health", async (req, res) => {
      const response = {} as any;
      response.healthy = true;
      response.workers = [];
      for (const renderer of this.renderers) {
        const isHealthy = await renderer.isHealthy();
        if (!isHealthy) {
          response.healthy = false;
        }

        response.workers.push({
          id: renderer.id,
          healthy: isHealthy,
        });
      }

      res.status(response.healthy ? 200 : 500).send(response);
    });

    this.app.get("/render", this.handleRender);
    this.app.post("/render", this.handleRender);
  }

  public async start() {
    await Promise.all(this.renderers.map((r) => r.initialize()));

    this.httpServer = this.app.listen(config.port, () => {
      if (process.send) {
        process.send("ready");
      }
      log.http(`Rendergun started on port ${config.port}.`);
    });

    this.httpServer.keepAliveTimeout = this.httpServer.timeout - 15000; //15 seconds less than timeout
  }

  public close() {
    log.http("Shutting down the HTTP server.");
    this.cache.prune();
    if (this.httpServer) {
      this.httpServer.close(() => {
        log.http("Server has been shutdown.");
        Promise.all(this.renderers.map((r) => r.finalize())).then(() => {
          process.exit(0);
        });
      });
    }
  }

  private handleRender = async (req: Request, res: Response) => {
    try {
      const url = decodeURIComponent(req.query.url);

      if (!isValidURL(url)) {
        return res.status(400).send("Invalid URL");
      }

      log.http(`Request for render of '${url}'.`);

      const cachedEntry = this.cache.get(url);
      if (cachedEntry) {
        return res.status(cachedEntry.code).send(cachedEntry.body);
      }

      const renderer = await this.getHealthyWorker();
      const result = await renderer.render(url, {
        content: req.body,
        waitUntil: req.header("x-rendergun-wait-until"),
        timeout: asNumber(req.header("x-rendergun-timeout")),
        abortRequestRegexp: req.header("x-rendergun-abort-request"),
        blockAds: req.header("x-rendergun-block-ads") === "true",
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
    }
  }

  private async getHealthyWorker(): Promise<Renderer> {
    let counter = 0;
    let isHealthy = false;
    while (counter !== this.renderers.length) {
      const renderer = this.renderers[this.nextWorkerIdx];
      isHealthy = await renderer.isHealthy();

      this.nextWorkerIdx++;
      if (this.nextWorkerIdx >= this.renderers.length) {
        this.nextWorkerIdx = 0;
      }

      if (isHealthy) {
        return renderer;
      }

      counter++;
    }

    throw new Error("Could not find a healthy worker");
  }
}
