export default {
  port: process.env.PORT || "3000",
  numOfWorkers: process.env.NUM_WORKERS  ? parseInt(process.env.NUM_WORKERS, 10) : 4,
  cacheMaxSize: process.env.CACHE_MAX_SIZE || "100", // in megabytes
  cacheMaxAge: process.env.CACHE_MAX_AGE || "1800", // in seconds
};
