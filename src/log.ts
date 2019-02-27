
import debug from "debug";

export const log = {
  cache: debug("cache"),
  error: debug("error"),
  http: debug("http"),
  renderer: debug("renderer"),
};

if (!process.env.DEBUG) {
  debug.enable("error,http,renderer:*");
}
