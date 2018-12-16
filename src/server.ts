import compression = require("compression");
import express from "express";
import { Server as HttpServer } from "http";
import config from "./config";
import { log } from "./log";
import Renderer, { RenderResult } from "./renderer";
import { isValidURL } from "./util";

export class Server {
  private app: express.Express;
  private renderer: Renderer;
  private httpServer: HttpServer | undefined;
  private activeRequests = 0;
  private recentRequests = 0;

  constructor() {
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
      const isHealthy = await this.renderer.isHealthy();
      if (isHealthy) {
        res.status(200).send("OK");
      } else {
        res.status(500).send("Renderer has crashed.");
      }
    });

    this.app.get("/render", this.handleRender);
    this.app.post("/render", this.handleRender);

    this.renderer = new Renderer();

    setInterval(() => {
      if (this.activeRequests === 0 && this.recentRequests > 50) {
        log.renderer(`Restarting renderer after ${this.recentRequests} requests.`);
        this.recentRequests = 0;
        this.renderer.close();
      }
    }, 30 * 1000);
  }

  public async start() {
    await this.renderer.initialize();
    this.httpServer = this.app.listen(config.port, () => {
      if (process.send) {
        process.send("ready");
      }
      log.http(`Rendergun started on port ${config.port}.`);
    });
    this.httpServer.setTimeout(config.timeout);
  }

  public async close() {
    log.http("Shutting down the HTTP server.");
    if (this.httpServer) {
      this.httpServer.close(() => {
        log.http("Server has been shutdown.");
        log.http("Shutting down the renderer.");
        this.renderer.close().then(() => {
          log.http("Rendered has been shutdown.");
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

    try {
      let result: RenderResult;
      if (req.method === "POST") {
        result = await this.renderer.renderString(url, req.body);
      } else {
        result = await this.renderer.render(url);
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
