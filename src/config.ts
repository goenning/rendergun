if (process.env.NODE_ENV === "development") {
  process.env.DEBUG = "http,renderer,error";
  process.env.RENDERGUN_RESTART_INTERVAL = "5000";
}

const executablePath = process.env.CHROMIUM_PATH;
const rrt = process.env.RENDERGUN_REQUEST_TIMEOUT || "10000";

export default {
  timeout: parseInt(rrt, 10),
  port: process.env.PORT || "3000",
  executablePath,
  blacklistRegexp: process.env.RENDERGUN_BLACKLIST_REGEXP,
};
