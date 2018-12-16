import compression from "compression";
import express from "express";
import { Server } from "http";
import config from "./config";
import { log } from "./log";
import Renderer, { RenderResult } from "./renderer";
import { isValidURL } from "./util";

const renderer = new Renderer();
let server: Server;
let activeRequests = 0;
let recentRequests = 0;

const app = express();
app.use(compression());
app.use((req, res, next) => {
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

app.get("/", (req, res) => {
  res.status(200).send("");
});

app.get("/-/health", (req, res) => {
  res.status(200).send("OK");
});

const handleRender = async (req: express.Request, res: express.Response) => {
  recentRequests++;
  activeRequests++;
  const url = decodeURIComponent(req.query.url);

  if (!isValidURL(url)) {
    return res.status(400).send("Invalid URL");
  }

  try {
    let result: RenderResult;
    if (req.method === "POST") {
      result = await renderer.renderString(url, req.body);
    } else {
      result = await renderer.render(url);
    }
    return res.status(result.code).send(result.body);
  } catch (err) {
    log.error(err);
    return res.status(500).send(err.toString());
  } finally {
    activeRequests--;
  }
};

app.get("/render", handleRender);
app.post("/render", handleRender);

setInterval(() => {
  if (activeRequests === 0 && recentRequests > 50) {
    log.renderer(`Restarting renderer after ${recentRequests} requests.`);
    recentRequests = 0;
    renderer.close();
  }
}, 30 * 1000);

(async () => {
  try {
    await renderer.initialize();
    server = app.listen(config.port, () => {
      if (process.send) {
        process.send("ready");
      }
      log.http(`Rendergun started on port ${config.port}.`);
    });
    server.setTimeout(config.timeout);
  } catch (err) {
    log.error(err);
    process.exit(1);
  }
})();

process.on("unhandledRejection", (reason, p) => {
  log.error("Unhandled Rejection at: Promise", p, "reason:", reason);
  process.exit(1);
});

process.on("SIGTERM", () => {
  server.close(() => {
    renderer.close().then(() => {
      process.exit(0);
    });
  });
});

process.on("SIGINT", () => {
  server.close(() => {
    renderer.close().then(() => {
      process.exit(0);
    });
  });
});
