import LRUCache from "lru-cache";
import config from "./config";
import { log } from "./log";
import { niceBytes } from "./util";

interface CacheEntry {
  code: number;
  body: string;
}

export class Cache {
  private lru: LRUCache<string, CacheEntry>;

  constructor() {
    this.lru = new LRUCache<string, CacheEntry>({
      max: parseInt(config.cacheMaxSize, 10) * 1024 * 1024,
      length: (n, key) => {
        return Buffer.byteLength(n.body);
      },
      maxAge: parseInt(config.cacheMaxAge, 10) * 1000,
    });

    setInterval(() => {
      this.stats();
    }, 30 * 1000);
  }

  public stats() {
    log.cache(`Cache has ${this.lru.itemCount} items, a total of ${niceBytes(this.lru.length)} bytes.`);
  }

  public get(key: string): CacheEntry | undefined {
    const entry = this.lru.get(key);
    if (entry) {
      log.cache(`cache hit for '${key}'.`);
    } else {
      log.cache(`cache miss for '${key}'.`);
    }
    return entry;
  }

  public set(key: string, entry: CacheEntry) {
    log.cache(`'${key}' has been cached.`);
    this.lru.set(key, entry);
  }

  public prune() {
    log.cache(`Cache is being pruned.`);
    this.lru.prune();
    log.cache(`Cache has been pruned.`);
  }
}
