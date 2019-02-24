#!/usr/bin/env node

import { log } from "./log";
import { Server } from "./server";

const server = new Server();

(async () => {
  try {
    await server.start();
  } catch (err) {
    log.error(err);
    process.exit(1);
  }
})();

process.on("SIGTERM", server.close.bind(server));
process.on("SIGINT", server.close.bind(server));
process.on("unhandledRejection", (reason, p) => {
  log.error("Unhandled Rejection at: Promise", p, "reason:", reason);
  process.exit(1);
});
